import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { sunoMusicTasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { handleStripeWebhook } from "../webhooks";
import Stripe from "stripe";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ── Rate limiters ────────────────────────────────────────────────────────────
// General API limiter: 300 requests per 15 minutes per IP
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "Too many requests. Please try again later." },
});

// AI generation limiter: 20 generation requests per 15 minutes per IP
// Prevents abuse of expensive AI calls
const aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "Too many generation requests. Please wait a few minutes before trying again." },
  skip: (req) => {
    // Skip rate limiting in test environments
    return process.env.NODE_ENV === "test";
  },
});

// Upload limiter: 30 uploads per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "Too many upload requests. Please try again later." },
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust the first proxy hop (required for accurate IP detection behind load balancers / CDNs)
  app.set("trust proxy", 1);

  // ── Stripe Webhook (MUST be before express.json() — needs raw body) ──────────
  // Stripe sends a raw body that must be verified with the webhook secret
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set");
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    let event: Stripe.Event;
    try {
      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      event = stripeClient.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      return;
    }

    // Test event detection — required for Stripe webhook verification
    if (event.id.startsWith('evt_test_')) {
      console.log("[Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    try {
      const result = await handleStripeWebhook(event);
      res.json({ received: true, ...result });
    } catch (err: any) {
      console.error("[Stripe Webhook] Handler error:", err);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Apply general rate limiting to all /api routes
  app.use("/api", generalApiLimiter);
  // File upload endpoint for video generation tools
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
  app.post("/api/video/upload", uploadLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const key = (req.query.key as string) || `uploads/${Date.now()}-${req.file.originalname}`;
      const contentType = (req.query.type as string) || req.file.mimetype;
      const { url } = await storagePut(key, req.file.buffer, contentType);
      res.json({ url, key });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Suno music generation callback endpoint
  // Suno POSTs here when a music generation task completes
  app.post("/api/suno/callback", async (req, res) => {
    try {
      const { code, msg, data } = req.body;
      const taskId = data?.task_id;
      const callbackType = data?.callbackType;

      console.log(`[Suno Callback] taskId=${taskId} type=${callbackType} code=${code} msg=${msg}`);

      if (!taskId) {
        res.status(400).json({ error: "Missing task_id" });
        return;
      }

      // Only process final completion events
      if (callbackType !== "complete" && callbackType !== "error") {
        res.status(200).json({ received: true });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "DB unavailable" });
        return;
      }

      if (code === 200 && callbackType === "complete") {
        const musicData: Array<{
          id?: string;
          audio_url?: string;
          image_url?: string;
          title?: string;
          tags?: string;
          duration?: number;
        }> = data?.data ?? [];

        const tracks = musicData.map((m) => ({
          id: m.id,
          audioUrl: m.audio_url ?? "",
          imageUrl: m.image_url,
          title: m.title ?? "Generated Track",
          tags: m.tags,
          duration: m.duration,
        }));

        await db.update(sunoMusicTasks)
          .set({ status: "complete", tracks: JSON.stringify(tracks), updatedAt: new Date() })
          .where(eq(sunoMusicTasks.taskId, taskId));

        console.log(`[Suno Callback] Task ${taskId} completed with ${tracks.length} tracks`);
      } else {
        // Failed
        await db.update(sunoMusicTasks)
          .set({ status: "failed", errorMessage: msg ?? "Unknown error", updatedAt: new Date() })
          .where(eq(sunoMusicTasks.taskId, taskId));

        console.error(`[Suno Callback] Task ${taskId} failed: ${msg}`);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[Suno Callback] Error processing callback:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // Audio proxy — allows browser to play Suno CDN audio without CORS issues
  // Usage: /api/audio/proxy?url=<encoded_audio_url>
  app.get("/api/audio/proxy", async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) { res.status(400).json({ error: "Missing url parameter" }); return; }
    let audioUrl: string;
    try { audioUrl = decodeURIComponent(rawUrl); } catch { res.status(400).json({ error: "Invalid url" }); return; }
    // Only allow proxying known audio CDN domains
    const allowed = ["cdn1.suno.ai", "cdn2.suno.ai", "audiopipe.suno.ai", "tempfile.aiquickdraw.com", "aiquickdraw.com", "d2xsxph8kpxj0f.cloudfront.net", "s3.amazonaws.com"];
    const urlHost = (() => { try { return new URL(audioUrl).hostname; } catch { return ""; } })();
    if (!allowed.some((h) => urlHost === h || urlHost.endsWith("." + h))) {
      res.status(403).json({ error: "Domain not allowed" }); return;
    }
    try {
      const upstream = await fetch(audioUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WizVid/1.0)", "Accept": "audio/mpeg, audio/*, */*" },
      });
      if (!upstream.ok) { res.status(upstream.status).json({ error: "Upstream error" }); return; }
      const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
      const contentLength = upstream.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[AudioProxy] Error:", err);
      res.status(500).json({ error: "Proxy error" });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API — apply AI generation limiter to generation-heavy procedures
  // The tRPC path includes the procedure name, e.g. /api/trpc/musicVideo.generate
  app.use("/api/trpc/musicVideo.generate", aiGenerationLimiter);
  app.use("/api/trpc/musicVideo.generateStoryboard", aiGenerationLimiter);
  app.use("/api/trpc/musicVideo.createJob", aiGenerationLimiter);
  app.use("/api/trpc/wizpilot.generate", aiGenerationLimiter);
  app.use("/api/trpc/suno.generate", aiGenerationLimiter);
  app.use("/api/trpc/suno.generateCustom", aiGenerationLimiter);
  app.use("/api/trpc/autopilot.start", aiGenerationLimiter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ path, error }) {
        if (error.code !== 'UNAUTHORIZED' && error.code !== 'NOT_FOUND') {
          console.error(`[tRPC Error] ${path}: ${error.code} — ${error.message}`);
          if (error.cause) console.error('[tRPC Cause]', String(error.cause));
        }
      },
    })
  );
  // ── Domain-based routing: redirect to the correct SPA path based on Host header ──
  // This allows wizvid.co.uk, wizvidapp.com, and wizvidstudio.com to serve
  // their dedicated landing pages without separate deployments.
  const DOMAIN_ROUTES: Record<string, string> = {
    "wizvid.co.uk": "/uk",
    "www.wizvid.co.uk": "/uk",
    "wizvidapp.com": "/app",
    "www.wizvidapp.com": "/app",
    "wizvidstudio.com": "/studio",
    "www.wizvidstudio.com": "/studio",
  };
  app.use((req, res, next) => {
    const host = (req.headers.host || "").split(":")[0].toLowerCase();
    const targetPath = DOMAIN_ROUTES[host];
    // Only redirect if we're at the root (/) — preserve direct path access
    if (targetPath && (req.path === "/" || req.path === "")) {
      res.redirect(302, targetPath);
      return;
    }
    next();
  });

  // Dynamic sitemap.xml — includes static pages + all public watch pages
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { musicVideoJobs: mvJobs } = await import("../../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const db = await getDb();
      const publicVideos = db ? await db.select({
        shareSlug: mvJobs.shareSlug,
        updatedAt: mvJobs.updatedAt,
      }).from(mvJobs).where(eqOp(mvJobs.isPublic, true)) : [];

      const base = "https://www.wizvid.ai";
      const staticUrls = [
        { loc: base, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/pricing`, priority: "0.9", changefreq: "monthly" },
        { loc: `${base}/music-video`, priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/how-it-works`, priority: "0.8", changefreq: "monthly" },
        { loc: `${base}/blog`, priority: "0.8", changefreq: "weekly" },
        { loc: `${base}/discover`, priority: "0.7", changefreq: "daily" },
        { loc: `${base}/privacy`, priority: "0.3", changefreq: "yearly" },
        { loc: `${base}/terms`, priority: "0.3", changefreq: "yearly" },
      ];

      const watchUrls = publicVideos
        .filter(v => v.shareSlug)
        .map(v => ({
          loc: `${base}/watch/${v.shareSlug}`,
          priority: "0.6",
          changefreq: "monthly",
          lastmod: v.updatedAt ? new Date(v.updatedAt).toISOString().split("T")[0] : undefined,
        }));

      const allUrls = [...staticUrls, ...watchUrls];
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...allUrls.map(u => [
          "  <url>",
          `    <loc>${u.loc}</loc>`,
          (u as any).lastmod ? `    <lastmod>${(u as any).lastmod}</lastmod>` : "",
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
          "  </url>",
        ].filter(Boolean).join("\n")),
        "</urlset>",
      ].join("\n");

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap] Error generating sitemap:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Increase timeout for long-running AI requests (storyboard generation, video rendering)
  server.timeout = 300_000; // 5 minutes
  server.keepAliveTimeout = 305_000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// Start re-engagement cron job (hourly check for incomplete renders → in-app reminders)
import { startReEngagementJob } from "../reEngagementJob";
startReEngagementJob();

// Start background audio trim worker (polls every 10s for tasks needing trim)
import { startTrimWorker } from "../trimWorker";
startTrimWorker();
