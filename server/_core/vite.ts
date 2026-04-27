import compression from "compression";
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Gzip/deflate compression for all responses
  app.use(compression({ level: 6, threshold: 1024 }));

  // Serve hashed JS/CSS/image chunks with long-lived immutable cache (1 year)
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      etag: true,
      lastModified: false,
    })
  );

  // Serve all other static files with a shorter cache (1 hour)
  app.use(
    express.static(distPath, {
      maxAge: "1h",
      etag: true,
      setHeaders(res, filePath) {
        // HTML must never be cached so users always get the latest app shell
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  // ── Server-side canonical Link headers ────────────────────────────────────
  // Injected as HTTP headers so crawlers (including those that don't execute JS)
  // receive the canonical URL before any client-side useSEO hook runs.
  // Only public, indexable routes are listed here. Auth-gated and duplicate
  // routes are intentionally omitted (they carry noindex via useSEO instead).
  const BASE = "https://wiz-ai.io";
  const CANONICAL_ROUTES = new Set([
    "/", "/pricing", "/how-it-works", "/help", "/discover",
    "/text-to-video", "/ai-video-generator",
    "/music-video", "/music-video/create",
    "/products/wizvideo", "/products/wizsound", "/products/wizscript",
    "/products/wizanimate", "/products/wizimage", "/products/wizshorts",
    "/privacy", "/terms", "/refund",
  ]);

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    // Inject canonical header for known public routes
    const pathname = req.path.split("?")[0].replace(/\/+$/, "") || "/";
    if (CANONICAL_ROUTES.has(pathname)) {
      res.setHeader("Link", `<${BASE}${pathname}>; rel="canonical"`);
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
