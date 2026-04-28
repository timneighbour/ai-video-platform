import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

// =============================================================================
// React CJS Singleton Fix Plugin
// Vite pre-bundles @trpc/react-query (CJS) in a shared chunk that contains its
// own copy of React with a separate ReactSharedInternals. This causes hooks to
// fail with: "Cannot read properties of null (reading 'useState')"
//
// Fix: intercept the CJS React chunk at serve time and replace the
// require_react wrapper with a singleton that always returns the same object,
// so ReactSharedInternals is only initialised once across the entire app.
// =============================================================================
function vitePluginReactCjsSingletonFix(): Plugin {
  return {
    name: "react-cjs-singleton-fix",
    enforce: "pre" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";

        // Intercept stale browser-cached @trpc_react-query.js requests and serve
        // a redirect to the ESM entry so the browser loads the correct version.
        if (url.includes("@trpc_react-query.js") || url.includes("@trpc/react-query") && url.includes(".vite/deps")) {
          // Serve a JS shim that re-exports from the ESM entry
          const shim = `export * from "/@fs${path.resolve(import.meta.dirname, "node_modules/@trpc/react-query/dist/index.mjs")}";\nexport { default } from "/@fs${path.resolve(import.meta.dirname, "node_modules/@trpc/react-query/dist/index.mjs")}";\n`;
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-cache");
          res.end(shim);
          return;
        }

        // Match any pre-bundled chunk that might contain the CJS React copy
        const isDepChunk = url.includes("/.vite/deps/chunk-") || url.includes("@fs") && url.includes("/deps/chunk-");
        if (!isDepChunk) return next();

        // Resolve the file path from the URL (strip query string)
        const urlNoQuery = url.split("?")[0];
        const chunkName = path.basename(urlNoQuery);
        const chunkPath = path.resolve(import.meta.dirname, "node_modules/.vite/deps", chunkName);
        if (!fs.existsSync(chunkPath)) return next();

        const content = fs.readFileSync(chunkPath, "utf-8");
        // Only patch chunks that embed the full CJS React source
        if (!content.includes("require_react_development") || !content.includes("ReactSharedInternals")) {
          return next();
        }

        // Replace the outer require_react __commonJS wrapper with a true
        // singleton so every caller gets the same React object and therefore
        // the same ReactSharedInternals dispatcher.
        const patched = content.replace(
          /var require_react = __commonJS\(\{[\s\S]*?\}\);/,
          `var __react_singleton;
var require_react = () => {
  if (!__react_singleton) __react_singleton = require_react_development();
  return __react_singleton;
};`
        );

        if (patched === content) {
          // Regex didn't match — fall through so the browser at least gets the file
          return next();
        }

        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-cache");
        res.end(patched);
      });
    },
  };
}

/**
 * vitePluginSwVersionStamp
 * Injects a unique build-time timestamp into sw.js as __SW_VERSION__.
 * Every production build produces a new version string, so the service worker
 * cache name changes on every deploy — old caches are purged automatically.
 */
function vitePluginSwVersionStamp(): Plugin {
  const buildVersion = `${Date.now()}`;
  return {
    name: "vite-plugin-sw-version-stamp",
    // Replace __SW_VERSION__ in the sw.js source file during build
    transform(code, id) {
      if (id.includes("sw.js") && !id.includes("node_modules")) {
        return {
          code: code.replace(
            /typeof __SW_VERSION__ !== ["']undefined["']/g,
            `true`
          ).replace(
            /__SW_VERSION__/g,
            JSON.stringify(buildVersion)
          ),
          map: null,
        };
      }
      return null;
    },
    // Also handle sw.js when it is copied from publicDir during build
    generateBundle(_options, bundle) {
      const swAsset = bundle["sw.js"];
      if (swAsset && swAsset.type === "asset" && typeof swAsset.source === "string") {
        swAsset.source = swAsset.source
          .replace(/typeof __SW_VERSION__ !== ["']undefined["']/g, `true`)
          .replace(/__SW_VERSION__/g, JSON.stringify(buildVersion));
      }
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginReactCjsSingletonFix(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginSwVersionStamp()];

// In production, serve all hashed JS/CSS/image assets from Bunny CDN edge
// This means browsers load assets from the nearest of 114 global PoPs instead of the origin
const BUNNY_CDN_URL = process.env.VITE_CDN_URL || "";

export default defineConfig({
  plugins,
  // base: point all /assets/* references at Bunny CDN in production
  base: process.env.NODE_ENV === "production" && BUNNY_CDN_URL ? BUNNY_CDN_URL + "/" : "/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Force all packages to use the same React instance — prevents
      // "Cannot read properties of null (reading 'useState')" from tRPC
      "react": path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(import.meta.dirname, "node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(import.meta.dirname, "node_modules/react/jsx-dev-runtime.js"),
    },
    // Deduplicate React to guarantee a single copy across all packages
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "@trpc/react-query"],
  },
  // Fix for duplicate React / TRPCProvider useState crash:
  // @trpc/react-query v11 ships a CJS bundle that Vite wraps in its own React copy
  // (chunk-PLUGHXRK.js) with a separate ReactSharedInternals — causing hooks to fail.
  // Solution: exclude @trpc/react-query from pre-bundling so Vite uses its ESM entry
  // (index.mjs) which does `import * as React from 'react'` — sharing the same
  // React singleton as the rest of the app.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@trpc/client",
    ],
    // Exclude @trpc/react-query so Vite processes its ESM entry directly.
    // This prevents Vite from wrapping it in a CJS bundle with its own React copy.
    exclude: ["@trpc/react-query"],
    force: true,
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    // Never expose source maps in production — protects internal logic
    sourcemap: false,
    // Target modern browsers to eliminate legacy JS transpilation (saves ~18 KiB per PageSpeed audit)
    target: ["es2020", "chrome80", "firefox80", "safari14"],
    rollupOptions: {
      output: {
        // Manual chunk splitting — groups vendor libs while preserving React initialisation order.
        // IMPORTANT: @radix-ui MUST share the same chunk as react/react-dom (or be in a chunk
        // that explicitly imports vendor-react first) to avoid "forwardRef is undefined" errors.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // React core — must be first; all UI libs depend on it
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "vendor-react";
            // Radix UI MUST be in the same chunk as react or explicitly after it.
            // Grouping with react-dom avoids the forwardRef race condition.
            if (id.includes("@radix-ui") || id.includes("framer-motion")) return "vendor-react";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@stripe")) return "vendor-stripe";
            if (id.includes("@trpc") || id.includes("@tanstack")) return "vendor-trpc";
            if (id.includes("wouter")) return "vendor-router";
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
