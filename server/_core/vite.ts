import compression from "compression";
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

// ── Bot detection ─────────────────────────────────────────────────────────────
// SOCIAL bots: scrape OG tags for link previews (Facebook, WhatsApp, Slack, etc.)
// These receive a lightweight pre-rendered HTML page with OG meta tags baked in.
// IMPORTANT: Googlebot and Bing are NOT social bots — they must receive the real
// SPA HTML so they can discover and index all pages correctly. Including them here
// was causing every page to return canonical=homepage, blocking indexing of 101 pages.
const SOCIAL_BOT_RE = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Applebot|Pinterest/i;

// SEARCH bots: Google, Bing, DuckDuckGo — receive the real SPA HTML but we inject
// a per-route canonical <link> tag directly into the HTML before serving so they
// don't have to wait for JS to run to discover the correct canonical URL.
const SEARCH_BOT_RE = /Googlebot|bingbot|DuckDuckBot|AhrefsBot|SemrushBot|MJ12bot/i;

const OG_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wiz-ai-og-preview-5BfppFBqHYgzvQMYcartPf.png";
const BASE_URL = "https://wiz-ai.io";

// ── Per-route SEO metadata ────────────────────────────────────────────────────
// Used by both social bot pre-render and search bot canonical injection.
interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
}

function getRouteMeta(pathname: string): RouteMeta {
  const url = `${BASE_URL}${pathname === "/" ? "" : pathname}`;
  const meta: Record<string, RouteMeta> = {
    "/": {
      title: "WIZ AI — The AI Creative Studio",
      description: "Turn a simple idea into a cinematic music video in minutes. 10 AI Studios. One Platform. No editing experience needed.",
      canonical: `${BASE_URL}/`,
    },
    "/pricing": {
      title: "Pricing — WIZ AI",
      description: "Simple, transparent pricing. Start free, upgrade when you're ready. Starter from £9/mo.",
      canonical: `${BASE_URL}/pricing`,
    },
    "/how-it-works": {
      title: "How It Works — WIZ AI",
      description: "See how WIZ AI turns your music into a cinematic video in 3 simple steps.",
      canonical: `${BASE_URL}/how-it-works`,
    },
    "/help": {
      title: "Help & Support — WIZ AI",
      description: "Get answers to your questions about WIZ AI products, billing, and technical issues.",
      canonical: `${BASE_URL}/help`,
    },
    "/music-video": {
      title: "AI Music Video Generator — WIZ AI",
      description: "Create stunning AI music videos from your songs in minutes. Upload your track and let WIZ AI do the rest.",
      canonical: `${BASE_URL}/music-video`,
    },
    "/music-video-ai": {
      title: "AI Music Video Maker — WIZ AI",
      description: "The most advanced AI music video maker. Turn any song into a cinematic visual experience.",
      canonical: `${BASE_URL}/music-video-ai`,
    },
    "/ai-video-generator": {
      title: "AI Video Generator — WIZ AI",
      description: "Generate professional AI videos from text, audio, or images. No editing skills required.",
      canonical: `${BASE_URL}/ai-video-generator`,
    },
    "/ai-animation-maker": {
      title: "AI Animation Maker — WIZ AI",
      description: "Create stunning AI animations for music videos, kids content, and more.",
      canonical: `${BASE_URL}/ai-animation-maker`,
    },
    "/text-to-video": {
      title: "Text to Video AI — WIZ AI",
      description: "Turn any script or text into a professional AI video in minutes.",
      canonical: `${BASE_URL}/text-to-video`,
    },
    "/kids-video": {
      title: "AI Kids Video Generator — WIZ AI",
      description: "Create safe, fun, and educational AI animated videos for children.",
      canonical: `${BASE_URL}/kids-video`,
    },
    "/music-video/create": {
      title: "Create Music Video — WIZ AI",
      description: "Start creating your AI music video now. Upload your track and customise your visual style.",
      canonical: `${BASE_URL}/music-video/create`,
    },
    "/products/wizvideo": {
      title: "WizVideo — AI Music Video Studio | WIZ AI",
      description: "WizVideo is WIZ AI's flagship music video creation studio. Turn any song into a cinematic masterpiece.",
      canonical: `${BASE_URL}/products/wizvideo`,
    },
    "/products/wizsound": {
      title: "WizSound™ — AI Audio Enhancement | WIZ AI",
      description: "WizSound™ enhances your audio to cinematic quality using AI. Richer, fuller, more immersive sound.",
      canonical: `${BASE_URL}/products/wizsound`,
    },
    "/products/wizscript": {
      title: "WizScript — AI Video Creator | WIZ AI",
      description: "Turn any script into a professional AI video with WizScript. No camera or editing required.",
      canonical: `${BASE_URL}/products/wizscript`,
    },
    "/products/wizanimate": {
      title: "WizAnimate — AI Animation Studio | WIZ AI",
      description: "Create stunning AI animations with WizAnimate. Perfect for music videos, kids content, and social media.",
      canonical: `${BASE_URL}/products/wizanimate`,
    },
    "/products/wizimage": {
      title: "WizImage — AI Image Creator | WIZ AI",
      description: "Generate stunning AI images for your videos, social media, and creative projects.",
      canonical: `${BASE_URL}/products/wizimage`,
    },
    "/products/wizshorts": {
      title: "WizShorts — AI Short-Form Video | WIZ AI",
      description: "Create viral short-form AI videos for TikTok, Reels, and YouTube Shorts in minutes.",
      canonical: `${BASE_URL}/products/wizshorts`,
    },
    "/products/wizgenesis": {
      title: "WizGenesis™ — AI Video Engine | WIZ AI",
      description: "WizGenesis™ is the core AI engine powering all WIZ AI video generation.",
      canonical: `${BASE_URL}/products/wizgenesis`,
    },
    "/products/wizboost": {
      title: "WizBoost™ — Creator Network | WIZ AI",
      description: "Amplify your content with WizBoost™. Reach more fans and grow your creative career.",
      canonical: `${BASE_URL}/products/wizboost`,
    },
    "/products/wizpilot": {
      title: "WizPilot™ — Autopilot Video Generation | WIZ AI",
      description: "Let WizPilot™ handle your entire video creation workflow automatically.",
      canonical: `${BASE_URL}/products/wizpilot`,
    },
    "/products/wizlumina": {
      title: "WizLumina™ — Visual Enhancement | WIZ AI",
      description: "WizLumina™ enhances your video visuals to cinematic 4K quality using AI.",
      canonical: `${BASE_URL}/products/wizlumina`,
    },
    "/products/wizcreate": {
      title: "WizCreate™ — AI Storyboard Engine | WIZ AI",
      description: "WizCreate™ builds your video storyboard automatically from your music and style preferences.",
      canonical: `${BASE_URL}/products/wizcreate`,
    },
    "/products/wizscore": {
      title: "WizScore — AI Music Scoring | WIZ AI",
      description: "Generate original AI music scores for your videos with WizScore.",
      canonical: `${BASE_URL}/products/wizscore`,
    },
    "/products/wizsync-info": {
      title: "WizSync — Audio-Visual Sync | WIZ AI",
      description: "WizSync ensures perfect audio-visual synchronisation in every AI video.",
      canonical: `${BASE_URL}/products/wizsync-info`,
    },
    "/discover": {
      title: "Discover — WIZ AI",
      description: "Explore the latest AI videos created by the WIZ AI community.",
      canonical: `${BASE_URL}/discover`,
    },
    "/showcase": {
      title: "Showcase — WIZ AI",
      description: "See what creators are making with WIZ AI. Real videos, real results.",
      canonical: `${BASE_URL}/showcase`,
    },
    "/uk": {
      title: "WIZ AI UK — AI Video Creator for UK Artists",
      description: "WIZ AI is the UK's leading AI video creation platform. Create stunning music videos from your songs.",
      canonical: `${BASE_URL}/uk`,
    },
    "/blog": {
      title: "Blog — WIZ AI",
      description: "Tips, tutorials, and news from the WIZ AI team.",
      canonical: `${BASE_URL}/blog`,
    },
    "/subscribe": {
      title: "Subscribe — WIZ AI",
      description: "Choose your WIZ AI plan. Start creating AI videos today.",
      canonical: `${BASE_URL}/subscribe`,
    },
    "/privacy": {
      title: "Privacy Policy — WIZ AI",
      description: "Read the WIZ AI Privacy Policy.",
      canonical: `${BASE_URL}/privacy`,
    },
    "/terms": {
      title: "Terms of Service — WIZ AI",
      description: "Read the WIZ AI Terms of Service.",
      canonical: `${BASE_URL}/terms`,
    },
    "/refunds": {
      title: "Refund Policy — WIZ AI",
      description: "Read the WIZ AI Refund Policy.",
      canonical: `${BASE_URL}/refunds`,
    },
    "/cookie-policy": {
      title: "Cookie Policy — WIZ AI",
      description: "Read the WIZ AI Cookie Policy.",
      canonical: `${BASE_URL}/cookie-policy`,
    },
  };

  // SEO landing pages — generate meta dynamically from slug
  if (pathname.startsWith("/seo/")) {
    const slug = pathname.replace("/seo/", "");
    const humanTitle = slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return {
      title: `${humanTitle} — WIZ AI`,
      description: `${humanTitle} — Create professional AI videos with WIZ AI. No editing skills required.`,
      canonical: `${BASE_URL}${pathname}`,
    };
  }

  // Technology pages
  if (pathname.startsWith("/technology/")) {
    const slug = pathname.replace("/technology/", "");
    const humanTitle = slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return {
      title: `${humanTitle} — WIZ AI Technology`,
      description: `Learn how WIZ AI uses ${humanTitle.toLowerCase()} to create stunning AI videos.`,
      canonical: `${BASE_URL}${pathname}`,
    };
  }

  return meta[pathname] ?? {
    title: "WIZ AI — The AI Creative Studio",
    description: "Turn a simple idea into a cinematic music video in minutes. 10 AI Studios. One Platform.",
    canonical: `${BASE_URL}${pathname}`,
  };
}

function buildBotHtml(pathname: string): string {
  const meta = getRouteMeta(pathname);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${meta.title}</title>
<meta name="description" content="${meta.description}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${meta.canonical}" />
<meta property="og:title" content="${meta.title}" />
<meta property="og:description" content="${meta.description}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${meta.title}" />
<meta property="og:site_name" content="WIZ AI" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${meta.title}" />
<meta name="twitter:description" content="${meta.description}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta name="twitter:image:alt" content="${meta.title}" />
<link rel="canonical" href="${meta.canonical}" />
</head>
<body>
<h1>${meta.title}</h1>
<p>${meta.description}</p>
<a href="${BASE_URL}/">Visit WIZ AI</a>
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

  // Social bots and search crawlers must be intercepted BEFORE vite.middlewares,
  // otherwise Vite serves the SPA shell directly and our canonical injection never runs.
  app.use((req, res, next) => {
    // Skip API routes entirely
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/")) return next();
    const ua = req.headers["user-agent"] || "";
    const pathname = req.path.split("?")[0].replace(/\/+$/, "") || "/";
    if (SOCIAL_BOT_RE.test(ua)) {
      console.log(`[OG] Social crawler: ${ua.slice(0, 60)} → ${pathname}`);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildBotHtml(pathname));
    }
    next();
  });
  app.use(vite.middlewares);
  // Guard: never serve the SPA shell for /api/* routes — return 404 JSON instead
  app.use("/api/*", (req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ error: "API route not found", path: req.path });
    }
  });
  app.use("*", async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    const pathname = req.path.split("?")[0].replace(/\/+$/, "") || "/";
    // Search engine crawlers get the real SPA with canonical injected
    // (social bots already handled above before vite.middlewares)

    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // For search engine crawlers, inject the correct per-route canonical tag
      // directly into the HTML before serving so they don't need JS to discover it.
      if (SEARCH_BOT_RE.test(ua)) {
        const meta = getRouteMeta(pathname);
        template = template.replace(
          /<link rel="canonical"[^>]*>/,
          `<link rel="canonical" href="${meta.canonical}" />`
        );
        template = template.replace(
          /<meta property="og:url"[^>]*>/,
          `<meta property="og:url" content="${meta.canonical}" />`
        );
      }

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

  // ── Social crawler intercept (MUST be before express.static) ─────────────────
  // Social bots get a per-route pre-rendered OG page.
  // Search engine bots (Googlebot, Bing) are NOT intercepted here — they receive
  // the real SPA HTML with per-route canonical injected below.
  app.use((req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (SOCIAL_BOT_RE.test(ua)) {
      const pathname = req.path.split("?")[0].replace(/\/+$/, "") || "/";
      console.log(`[OG] Social crawler detected: ${ua.slice(0, 80)} → ${pathname}`);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildBotHtml(pathname));
    }
    next();
  });

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
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  // Guard: never serve the SPA shell for /api/* routes
  app.use("/api/*", (req, res, _next) => {
    if (!res.headersSent) {
      res.status(404).json({ error: "API route not found", path: req.path });
    }
  });

  // ── Wildcard SPA handler with per-route canonical injection ──────────────────
  // For search engine crawlers: inject the correct canonical <link> tag directly
  // into the served HTML so Google doesn't have to execute JS to find it.
  // This fixes the "101 pages not indexed — alternative page with canonical tag"
  // issue caused by every page returning canonical=homepage in the static HTML shell.
  app.use("*", async (req, res) => {
    const ua = req.headers["user-agent"] || "";
    const pathname = req.path.split("?")[0].replace(/\/+$/, "") || "/";

    // Social bots in production (belt-and-suspenders, should be caught above)
    if (SOCIAL_BOT_RE.test(ua)) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildBotHtml(pathname));
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    // For search engine crawlers: read the built index.html, inject per-route
    // canonical and og:url, then serve. This ensures Google sees the correct
    // canonical without needing JavaScript execution.
    if (SEARCH_BOT_RE.test(ua)) {
      try {
        const indexPath = path.resolve(distPath, "index.html");
        let html = await fs.promises.readFile(indexPath, "utf-8");
        const meta = getRouteMeta(pathname);
        // Replace the default homepage canonical with the correct per-route canonical
        html = html.replace(
          /<link rel="canonical"[^>]*>/,
          `<link rel="canonical" href="${meta.canonical}" />`
        );
        html = html.replace(
          /<meta property="og:url"[^>]*>/,
          `<meta property="og:url" content="${meta.canonical}" />`
        );
        // Also inject the correct title and description for better crawl quality
        html = html.replace(
          /<title>[^<]*<\/title>/,
          `<title>${meta.title}</title>`
        );
        html = html.replace(
          /<meta name="description"[^>]*>/,
          `<meta name="description" content="${meta.description}" />`
        );
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch {
        // Fall through to standard sendFile if read fails
      }
    }

    // Standard SPA fallback for regular users
    // Also inject Link header for canonical (belt-and-suspenders for all crawlers)
    const meta = getRouteMeta(pathname);
    res.setHeader("Link", `<${meta.canonical}>; rel="canonical"`);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
