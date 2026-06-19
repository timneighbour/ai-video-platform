import "dotenv/config";
// ISS-005: Sentry must be imported before all other modules
import "../sentry";
import * as Sentry from "@sentry/node";
import express from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { sunoMusicTasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { handleStripeWebhook } from "../webhooks";
import { handleWaveSpeedWebhook } from "../webhooks/wavespeed";
import { wizadoraRouter } from "../wizadora/router";
import Stripe from "stripe";
import { stuckSceneReaperHandler } from "../scheduled/stuckSceneReaper";
import { sceneDispatchHeartbeatHandler } from "../scheduled/sceneDispatchHeartbeat";
import { goldenValidationHandler } from "../scheduled/goldenValidationHandler";
import { processOrphanedAssemblyJobs } from "../assemblyWorker";
import { jobResurrectionReaperHandler } from "../scheduled/jobResurrectionReaper";
import { runProbeReminderHeartbeat } from "../scheduled/probeReminderHeartbeat";

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

  // ── ISS-032: Uptime monitoring health endpoint ─────────────────────────────────
  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok", ts: Date.now(), version: process.env.npm_package_version ?? "unknown" });
  });

  // ── WaveSpeed Webhook (MUST be before express.json() — needs raw body) ─────────
  // WaveSpeed sends a raw body that must be verified with HMAC-SHA256 signature
  app.post("/api/webhooks/wavespeed", express.raw({ type: "application/json" }), handleWaveSpeedWebhook);

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

    // Respond to Stripe within 30 seconds — run handler with a timeout guard
    const timeoutMs = 25_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Webhook handler timed out")), timeoutMs)
    );
    try {
      const result = await Promise.race([handleStripeWebhook(event), timeoutPromise]);
      res.json({ received: true, ...result });
    } catch (err: any) {
      console.error("[Stripe Webhook] Handler error:", err.message);
      // Still return 200 so Stripe doesn't keep retrying for non-fatal errors
      res.json({ received: true, warning: err.message });
    }
  });

  // ISS-015: Attach a unique request ID to every incoming request for structured logging
  // The ID is taken from the upstream x-request-id header (set by load balancers / CDNs)
  // or generated as a random hex string if absent. It is echoed back in the response header
  // so that client-side errors can be correlated with server-side logs.
  app.use((req, res, next) => {
    const existing = req.headers["x-request-id"] as string | undefined;
    const reqId = existing || `wiz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    // Attach to request object for downstream use
    (req as any).requestId = reqId;
    // Echo back so clients can correlate
    res.setHeader("x-request-id", reqId);
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Apply general rate limiting to all /api routes
  // NOTE: /api/stripe/webhook is intentionally excluded — Stripe's delivery IPs
  // share egress pools and can be rate-limited as a single IP, causing 429s that
  // Cloudflare surfaces as 503s. The webhook is protected by signature verification.
  app.use("/api", (req, res, next) => {
    if (req.path === "/stripe/webhook") return next();
    return generalApiLimiter(req, res, next);
  });
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
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WIZ AI/1.0)", "Accept": "audio/mpeg, audio/*, */*" },
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

  // Storage proxy — serves /manus-storage/* assets via signed Forge URLs
  registerStorageProxy(app);
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
  // Additional generation endpoints
  app.use("/api/trpc/musicVideo.startRender", aiGenerationLimiter);
  app.use("/api/trpc/musicVideo.generateMasterPortrait", aiGenerationLimiter);
  app.use("/api/trpc/musicVideo.generateCharacterFromDescription", aiGenerationLimiter);
  app.use("/api/trpc/batchRegen.generateMasterPortrait", aiGenerationLimiter);
  app.use("/api/trpc/kidsVideo.generate", aiGenerationLimiter);
  app.use("/api/trpc/kidsVideo.startRender", aiGenerationLimiter);
  app.use("/api/trpc/wizImage.generate", aiGenerationLimiter);
  app.use("/api/trpc/wizShorts.generate", aiGenerationLimiter);
  app.use("/api/trpc/lipSync.create", aiGenerationLimiter);
  app.use("/api/trpc/enhancement.enhance", aiGenerationLimiter);
  app.use("/api/trpc/textToVideo.generate", aiGenerationLimiter);
  // ── WizAdora internal API (admin-only, not publicly linked) ──────────────────
  app.use("/api/wizadora/v1", wizadoraRouter);

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

      const base = "https://wiz-ai.io";
      const today = new Date().toISOString().split("T")[0];
      const staticUrls = [
        { loc: base, priority: "1.0", changefreq: "weekly", lastmod: today },
        { loc: `${base}/pricing`, priority: "0.9", changefreq: "monthly", lastmod: today },
        { loc: `${base}/help`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/how-it-works`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/products/wizsound`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/products/wizimage`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/products/wizvideo`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/products/wizshorts`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/products/wizanimate`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/products/wizscript`, priority: "0.8", changefreq: "monthly", lastmod: today },
        { loc: `${base}/music-video`, priority: "0.9", changefreq: "weekly", lastmod: today },
        { loc: `${base}/music-video/create`, priority: "0.8", changefreq: "weekly", lastmod: today },
        { loc: `${base}/text-to-video`, priority: "0.8", changefreq: "weekly", lastmod: today },
        { loc: `${base}/ai-video-generator`, priority: "0.8", changefreq: "weekly", lastmod: today },
        { loc: `${base}/discover`, priority: "0.7", changefreq: "daily", lastmod: today },
        { loc: `${base}/privacy`, priority: "0.3", changefreq: "yearly" },
        { loc: `${base}/terms`, priority: "0.3", changefreq: "yearly" },
        { loc: `${base}/refund`, priority: "0.3", changefreq: "yearly" },
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

  // ── Scheduled: stuck-scene reaper (Manus Heartbeat cron) ───────────────────
  app.post("/api/scheduled/stuckSceneReaper", stuckSceneReaperHandler);

  // ── Scheduled: server-side scene dispatch heartbeat ──────────────────────
  // Dispatches pending scenes every 60s regardless of browser state.
  // This ensures renders complete even when users close their browser tab.
  app.post("/api/scheduled/sceneDispatchHeartbeat", sceneDispatchHeartbeatHandler);

  // ── Scheduled: Golden Validation (daily regression test) ─────────────────
  // Runs the frozen Golden Benchmark fixture end-to-end every day at 03:00 UTC.
  // Detects regressions before real users are affected.
  app.post("/api/scheduled/golden-validation", goldenValidationHandler);

  // ── Scheduled: Assembly Worker (Manus Heartbeat cron, every 2 min) ─────────
  // The assembly worker also runs as an in-process interval (startAssemblyWorker),
  // but Cloud Run scales to zero between requests so the in-process interval
  // doesn't survive. This HTTP endpoint ensures the heartbeat cron can trigger
  // assembly even after a cold start.
  app.post("/api/scheduled/assemblyWorker", async (_req, res) => {
    try {
      await processOrphanedAssemblyJobs();
      res.json({ ok: true, ts: new Date().toISOString() });
    } catch (err: any) {
      console.error("[assemblyWorker route] Error:", err?.message);
      res.status(500).json({ error: err?.message ?? "unknown" });
    }
  });

  // ── Scheduled: Probe Reminder Heartbeat (Manus Heartbeat cron, every 30 min) ──
  // Sends 1h and 6h reminder emails to subscribers whose probe clip is awaiting approval.
  // Auto-approval at 24h is handled by getProbeDecision() in pre-render-validator.ts.
  app.post("/api/scheduled/probeReminderHeartbeat", async (_req, res) => {
    try {
      await runProbeReminderHeartbeat();
      res.json({ ok: true, ts: new Date().toISOString() });
    } catch (err: any) {
      console.error("[probeReminderHeartbeat route] Error:", err?.message);
      res.status(500).json({ error: err?.message ?? "unknown" });
    }
  });
  // ── Scheduled: Job Resurrection Reaper (Manus Heartbeat cron, every 5 min) ───
  // Covers all failure modes NOT handled by the scene heartbeat or stuckSceneReaper:
  // zombie assembling jobs, stuck assembling jobs, permanently blocked composites,
  // dead rendering jobs, and SLA breach alerts.
  app.post("/api/scheduled/jobResurrectionReaper", jobResurrectionReaperHandler);

  // ── Debug: list all music video jobs (owner-only) ──────────────────────────
  app.get("/api/debug/list-jobs", async (req, res) => {
    try {
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 16)) {
        return res.status(403).json({ error: "forbidden" });
      }
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "db unavailable" });
      const { musicVideoJobs } = await import("../../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const jobs = await db.select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        status: musicVideoJobs.status,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
        sceneSetting: musicVideoJobs.sceneSetting,
        aspectRatio: musicVideoJobs.aspectRatio,
        characterImageUrl: musicVideoJobs.characterImageUrl,
        createdAt: musicVideoJobs.createdAt,
      }).from(musicVideoJobs).orderBy(desc(musicVideoJobs.createdAt)).limit(20);
      return res.json({ jobs });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── Debug: get scene details (prompts + images) for a specific job ─────────────
  app.get("/api/debug/job-scenes/:jobId", async (req, res) => {
    try {
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 16)) {
        return res.status(403).json({ error: "forbidden" });
      }
      const jobId = parseInt(req.params.jobId);
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "db unavailable" });
      const { musicVideoScenes } = await import("../../drizzle/schema");
      const { eq, asc } = await import("drizzle-orm");
      const scenes = await db.select({
        sceneIndex: musicVideoScenes.sceneIndex,
        sceneType: musicVideoScenes.sceneType,
        previewImageUrl: musicVideoScenes.previewImageUrl,
        prompt: musicVideoScenes.prompt,
        lipSync: musicVideoScenes.lipSync,
        lyrics: musicVideoScenes.lyrics,
      }).from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, jobId))
        .orderBy(asc(musicVideoScenes.sceneIndex));
      return res.json({ jobId, scenes });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── Debug: reset a job to storyboard stage (owner-only) ──────────────────────
  app.post("/api/debug/reset-job/:jobId", async (req, res) => {
    try {
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 16)) {
        return res.status(403).json({ error: "forbidden" });
      }
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "db unavailable" });
      const { musicVideoJobs, musicVideoScenes } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const jobId = parseInt(req.params.jobId, 10);
      if (isNaN(jobId)) return res.status(400).json({ error: "Invalid jobId" });
      // Reset all scenes: clear storyboard images, video URLs, lip sync, composite
      const { sql } = await import("drizzle-orm");
      await db.update(musicVideoScenes).set({
        previewImageUrl: null,
        videoUrl: null,
        lipSyncVideoUrl: null,
        compositeVideoUrl: null,
        compositeStatus: "pending" as const,
        lipSyncStatus: "pending" as const,
        status: "pending" as const,
        updatedAt: new Date(),
      }).where(eq(musicVideoScenes.jobId, jobId));
      // Reset job to storyboard stage (draft = start from character confirmation)
      await db.update(musicVideoJobs).set({
        status: "draft" as const,
        completedScenes: 0,
        finalVideoUrl: null,
        errorMessage: null,
        updatedAt: new Date(),
      }).where(eq(musicVideoJobs.id, jobId));
      console.log(`[Debug] Job ${jobId} reset to storyboard stage`);
      return res.json({ ok: true, jobId, message: "Job reset to storyboard stage — all scene images and videos cleared" });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── Debug: pre-render validation check (owner-only, temporary) ─────────────
  app.get("/api/debug/validate/:jobId", async (req, res) => {
    try {
      // Simple secret-based auth for debug endpoint
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 16)) {
        return res.status(403).json({ error: "forbidden" });
      }
      const { runPreRenderValidation, getProbeDecision } = await import("../pre-render-validator");
      const jobId = parseInt(req.params.jobId, 10);
      const validation = await runPreRenderValidation(jobId);
      const probe = await getProbeDecision(jobId);
      return res.json({ validation, probe });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── Debug: provider comparison (owner-only) ────────────────────────────────
  app.get("/api/debug/provider-comparison", async (req, res) => {
    try {
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 16)) {
        return res.status(403).json({ error: "forbidden" });
      }
      const provider = (req.query.provider as string) || "auto";
      const prompt = (req.query.prompt as string) || "Zara stands centre-stage at a grand piano in Lyndhurst Hall, Air Studios. She wears an elegant black gown with subtle gold accents. Warm amber spotlights illuminate her from above. The full orchestra is seated behind her. She faces the camera directly, singing with emotional intensity. Close-up cinematic framing, shallow depth of field, film grain.";
      const aspectRatio = (req.query.ar as string || "16:9") as "16:9" | "9:16" | "1:1";
      const { storagePut } = await import("../storage");

      console.log(`[ProviderComparison] Starting ${provider} comparison for prompt: ${prompt.slice(0, 60)}...`);
      const startTime = Date.now();

      if (provider === "gpt") {
        // GPT-Image-2 direct
        const { generateGptImage } = await import("../ai-apis/gpt-image");
        const results = await generateGptImage({ prompt, quality: "high", size: "1536x1024" });
        const result = results[0];
        if (!result) throw new Error("GPT-Image-2 returned no results");
        const buffer = Buffer.from(result.b64Json, "base64");
        const { url } = await storagePut(`debug/provider-comparison-gpt-${Date.now()}.png`, buffer, "image/png");
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[ProviderComparison] GPT-Image-2 done in ${elapsed}s: ${url.slice(0, 80)}`);
        return res.json({ success: true, provider: "gpt-image-2", url, width: 1536, height: 1024, elapsed });
      } else if (provider === "grok") {
        // Grok only
        const xaiKey = process.env.XAI_API_KEY;
        if (!xaiKey) return res.status(500).json({ error: "XAI_API_KEY not configured" });
        const LYNDHURST_DNA = `grand Victorian concert hall interior, soaring vaulted ceiling painted deep midnight blue with gold leaf star motifs, ornate Gothic arched clerestory windows with amber stained glass casting warm honeyed light, rich dark mahogany wood panelling on walls, tiered gallery balconies with carved wooden balustrades, a full symphony orchestra seated on a raised wooden stage, conductor's podium centre-stage, warm amber and gold stage lighting, polished parquet hardwood floor, massive pipe organ visible at the far end, atmospheric haze, cinematic depth of field`;
        const cinematicPrompt = `${prompt}\n\nVENUE: ${LYNDHURST_DNA}\n\nCINEMATOGRAPHY: cinematic 35mm film, anamorphic lens, shallow depth of field, warm golden-hour lighting, no text, no watermarks, photorealistic, ultra-detailed, 8K`;
        const grokRes = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: { "Authorization": `Bearer ${xaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "grok-imagine-image-quality", prompt: cinematicPrompt, n: 1, response_format: "url" }),
          signal: AbortSignal.timeout(90_000),
        });
        if (!grokRes.ok) {
          const errText = await grokRes.text().catch(() => "");
          return res.status(500).json({ error: `Grok HTTP ${grokRes.status}: ${errText.slice(0, 200)}` });
        }
        const grokJson = (await grokRes.json()) as { data?: Array<{ url?: string }> };
        const grokUrl = grokJson?.data?.[0]?.url;
        if (!grokUrl) return res.status(500).json({ error: "No URL from Grok" });
        // Download and re-upload to S3
        const grokImgRes = await fetch(grokUrl, { signal: AbortSignal.timeout(30_000) });
        const grokBuffer = Buffer.from(await grokImgRes.arrayBuffer());
        const { url } = await storagePut(`debug/provider-comparison-grok-${Date.now()}.jpg`, grokBuffer, "image/jpeg");
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[ProviderComparison] Grok done in ${elapsed}s: ${url.slice(0, 80)}`);
        return res.json({ success: true, provider: "grok-imagine-image-quality", url, width: 1344, height: 768, elapsed });
      } else {
        // Auto (BFL -> Grok -> Forge)
        const { generateCinematicStoryboardImage } = await import("../ai-apis/fal-image-gen");
        const result = await generateCinematicStoryboardImage({
          prompt,
          aspectRatio,
          storageKeyPrefix: `debug/provider-comparison-${Date.now()}`,
          sceneIndex: 0,
        });
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[ProviderComparison] Auto done in ${elapsed}s: ${result.url.slice(0, 80)}`);
        return res.json({ success: true, provider: "auto", url: result.url, width: result.width, height: result.height, elapsed });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── Debug: circuit breaker reset (owner-only, temporary) ──────────────────
  app.post("/api/debug/reset-circuit/:provider", async (req, res) => {
    try {
      const secret = req.query.secret as string;
      if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 16)) {
        return res.status(403).json({ error: "forbidden" });
      }
      const { resetCircuitBreaker, getCircuitBreaker } = await import("../circuit-breaker");
      const provider = req.params.provider;
      resetCircuitBreaker(provider);
      const status = getCircuitBreaker(provider).getStatus();
      console.log(`[Debug] Circuit breaker reset for provider: ${provider}`);
      return res.json({ ok: true, provider, state: status.state });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ── Orchestration Server Callback: composite job result ──────────────────────
  // The persistent orchestration server (34.24.150.95:4001) POSTs here when a
  // composite job completes. This endpoint updates the DB with the composited
  // video URL and advances the scene to compositeStatus=done.
  app.post("/api/composite-callback", async (req, res) => {
    try {
      const { jobId, sceneId, status, compositeVideoUrl, error } = req.body as {
        jobId: string;
        sceneId: string;
        status: "done" | "error";
        compositeVideoUrl?: string;
        error?: string;
      };

      if (!jobId || !sceneId || !status) {
        return res.status(400).json({ error: "Missing required fields: jobId, sceneId, status" });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });
      const { musicVideoScenes } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const sceneIdNum = parseInt(sceneId, 10);
      if (isNaN(sceneIdNum)) {
        return res.status(400).json({ error: `Invalid sceneId: ${sceneId}` });
      }

      if (status === "done" && compositeVideoUrl) {
        await db.update(musicVideoScenes)
          .set({
            compositeStatus: "done",
            compositeVideoUrl,
            updatedAt: new Date(),
          })
          .where(eq(musicVideoScenes.id, sceneIdNum));
        console.log(`[CompositeCallback] Scene ${sceneId}: composite done → ${compositeVideoUrl.slice(0, 80)}...`);
      } else if (status === "error") {
        await db.update(musicVideoScenes)
          .set({
            compositeStatus: "error",
            updatedAt: new Date(),
          })
          .where(eq(musicVideoScenes.id, sceneIdNum));
        console.error(`[CompositeCallback] Scene ${sceneId}: composite error — ${error ?? "unknown"}`);
      } else {
        return res.status(400).json({ error: `Invalid status or missing compositeVideoUrl` });
      }

      return res.json({ ok: true, sceneId, status });
    } catch (err: any) {
      console.error("[CompositeCallback] Error:", err?.message);
      return res.status(500).json({ error: err?.message ?? "unknown" });
    }
  });

  // ISS-005: Sentry error handler — must be registered AFTER all routes, BEFORE Vite/static
  // Captures unhandled Express errors and sends them to Sentry
  if (process.env.SENTRY_DSN) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use(Sentry.expressErrorHandler() as any);
  }

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

// Start assembly worker (re-triggers assembly for orphaned assembling jobs every 2 min)
import { startAssemblyWorker } from "../assemblyWorker";
startAssemblyWorker();
