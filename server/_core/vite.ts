import compression from "compression";
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

// ── Social crawler bot detection ──────────────────────────────────────────────
// Facebook, Instagram, WhatsApp, LinkedIn, Twitter/X, Slack, Telegram, iMessage,
// Discord, Pinterest, Google, Bing — all send a bot user-agent to scrape OG tags.
// Because this is a React SPA, the index.html shell has almost no content when
// rendered without JS. We detect these bots and return a lightweight pre-rendered
// HTML page with all OG meta tags baked in so link previews work correctly.
const SOCIAL_BOT_RE = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Applebot|Pinterest|Googlebot|bingbot|DuckDuckBot/i;

const OG_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wiz-ai-og-preview-5BfppFBqHYgzvQMYcartPf.png";
const OG_TITLE = "WIZ AI — The AI Creative Studio";
const OG_DESC = "Turn a simple idea into a cinematic music video in minutes. 10 AI Studios. One Platform. No editing experience needed.";
const OG_SITE_URL = "https://wiz-ai.io/";

function buildBotHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${OG_TITLE}</title>
<meta name="description" content="${OG_DESC}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${OG_SITE_URL}" />
<meta property="og:title" content="${OG_TITLE}" />
<meta property="og:description" content="${OG_DESC}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="WIZ AI — The AI Creative Studio" />
<meta property="og:site_name" content="WIZ AI" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${OG_TITLE}" />
<meta name="twitter:description" content="${OG_DESC}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta name="twitter:image:alt" content="WIZ AI — The AI Creative Studio" />
<link rel="canonical" href="${OG_SITE_URL}" />
</head>
<body>
<h1>${OG_TITLE}</h1>
<p>${OG_DESC}</p>
<a href="${OG_SITE_URL}">Visit WIZ AI</a>
</body>
</html>`;
}

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
  // Guard: never serve the SPA shell for /api/* routes — return 404 JSON instead
  // This prevents tRPC clients from receiving HTML when a route is unmatched or the
  // server is temporarily degraded (stale DB pool, mid-restart, etc.)
  app.use("/api/*", (req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ error: "API route not found", path: req.path });
    }
  });
  app.use("*", async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    // Serve pre-rendered OG page to social crawlers (dev mode)
    if (SOCIAL_BOT_RE.test(ua)) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildBotHtml());
    }

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

  // Guard: never serve the SPA shell for /api/* routes — return 404 JSON instead
  app.use("/api/*", (req, res, _next) => {
    if (!res.headersSent) {
      res.status(404).json({ error: "API route not found", path: req.path });
    }
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    const ua = req.headers["user-agent"] || "";
    // Serve pre-rendered OG page to social crawlers (production mode)
    if (SOCIAL_BOT_RE.test(ua)) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildBotHtml());
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    // Inject canonical header for known public routes
    const pathname = req.path.split("?")[0].replace(/\/+$/, "") || "/";
    if (CANONICAL_ROUTES.has(pathname)) {
      res.setHeader("Link", `<${BASE}${pathname}>; rel="canonical"`);
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
