/**
 * WizAdora™ REST Router — Internal API Only
 * ──────────────────────────────────────────
 * Mounted at: /api/wizadora/v1
 *
 * SECURITY:
 * - All routes require a valid WizAdora API key (Bearer token).
 * - Admin routes additionally require isAdmin=true on the key.
 * - NOT linked from any public page or developer portal.
 * - Atlas Cloud is the ONLY permitted provider.
 * - Spend caps enforced before every job submission.
 * - Content moderation runs before every job submission.
 * - Idempotency enforced via Idempotency-Key header.
 *
 * ROUTES:
 *   POST   /api/wizadora/v1/videos          — Create a new video job
 *   GET    /api/wizadora/v1/videos           — List jobs (paginated)
 *   GET    /api/wizadora/v1/videos/:id       — Get job status
 *   DELETE /api/wizadora/v1/videos/:id       — Cancel a queued job
 *   GET    /api/wizadora/v1/account          — Account info + credit balance
 *   POST   /api/wizadora/v1/webhooks/test    — Send a test webhook event (admin)
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import {
  wizadoraJobs,
  wizadoraApiKeys,
  credits,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  WizadoraError,
  assertProviderAllowed,
  authenticateApiKey,
  moderatePrompt,
  checkIdempotency,
  storeIdempotencyKey,
  hashRequest,
  checkSpendCaps,
  reserveCredits,
  refundCredits,
  logProviderSubmission,
  logWebhookDelivery,
  generateWebhookSignature,
  ALLOWED_STYLES,
  POLLING_CAN_SUBMIT,
} from "./core";

export const wizadoraRouter = Router();

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization ?? "";
    const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const key = await authenticateApiKey(rawKey);
    (req as any).wizadoraKey = key;
    next();
  } catch (err) {
    if (err instanceof WizadoraError) {
      return res.status(err.statusCode).json({ error: err.code, message: err.message });
    }
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
  }
}

async function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const key = (req as any).wizadoraKey;
  if (!key?.isAdmin) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Admin API key required." });
  }
  next();
}

// Apply auth to all routes
wizadoraRouter.use(requireApiKey);

// ─── HELPER: send JSON error ──────────────────────────────────────────────────
function sendError(res: Response, err: unknown) {
  if (err instanceof WizadoraError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }
  console.error("[WizAdora] Unexpected error:", err);
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred." });
}

// ─── POST /videos — Create a new video job ────────────────────────────────────
wizadoraRouter.post("/videos", async (req: Request, res: Response) => {
  try {
    const key = (req as any).wizadoraKey;
    const userId: number = key.ownerId;

    // Validate provider (Atlas Cloud only)
    const provider = (req.body.provider ?? "atlas_cloud").toLowerCase();
    assertProviderAllowed(provider);

    // Validate required fields
    const { prompt, duration, resolution, aspectRatio, style, negativePrompt } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      throw new WizadoraError("INVALID_PROMPT", "prompt is required and must be at least 3 characters.", 400);
    }
    if (prompt.length > 2000) {
      throw new WizadoraError("PROMPT_TOO_LONG", "prompt must not exceed 2000 characters.", 400);
    }

    // Validate style
    const styleValue = style ?? "cinematic";
    if (!(ALLOWED_STYLES as readonly string[]).includes(styleValue)) {
      throw new WizadoraError(
        "INVALID_STYLE",
        `Style '${styleValue}' is not allowed. Permitted styles: ${ALLOWED_STYLES.join(", ")}.`,
        400
      );
    }

    // Content moderation — runs before any DB write
    const modResult = moderatePrompt(prompt, negativePrompt);
    if (modResult.blocked) {
      return res.status(451).json({
        error: "CONTENT_BLOCKED",
        message: "The prompt was blocked by content moderation.",
        reason: modResult.reason,
      });
    }

    // Idempotency check
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
    const requestHash = hashRequest({ prompt, duration, resolution, aspectRatio, style, negativePrompt, provider });

    if (idempotencyKey) {
      const existingJobId = await checkIdempotency(idempotencyKey, userId, requestHash);
      if (existingJobId) {
        // Return existing job — idempotent replay
        const db = await getDb();
        if (db) {
          const [existingJob] = await db
            .select()
            .from(wizadoraJobs)
            .where(eq(wizadoraJobs.id, existingJobId))
            .limit(1);
          if (existingJob) {
            return res.status(200).json({ job: serializeJob(existingJob), idempotent: true });
          }
        }
      }
    }

    // Estimate credits (1 credit per job, standard)
    const creditsRequired = 1;
    const estimatedCostGbp = 0.05; // £0.05 per job estimate

    // Spend cap check — hard stop
    const spendCheck = await checkSpendCaps(userId, estimatedCostGbp);
    if (!spendCheck.allowed) {
      return res.status(402).json({
        error: "SPEND_CAP_EXCEEDED",
        message: spendCheck.reason,
        caps: spendCheck.caps,
      });
    }

    // Reserve credits — throws INSUFFICIENT_CREDITS if balance too low
    await reserveCredits(userId, creditsRequired, "pending");

    // Create job record
    const jobId = crypto.randomUUID();
    const db = await getDb();
    if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

    await db.insert(wizadoraJobs).values({
      id: jobId,
      userId,
      apiKeyId: key.id,
      prompt: prompt.trim(),
      negativePrompt: negativePrompt ?? null,
      duration: Math.min(Math.max(Number(duration) || 5, 3), 30),
      resolution: ["720p", "1080p", "4k"].includes(resolution) ? resolution : "720p",
      aspectRatio: ["16:9", "9:16", "1:1", "4:3"].includes(aspectRatio) ? aspectRatio : "16:9",
      style: styleValue,
      provider: "atlas_cloud",
      idempotencyKey: idempotencyKey ?? null,
      status: "queued",
      creditsReserved: creditsRequired,
      estimatedCost: estimatedCostGbp.toString(),
    });

    // Update credit reservation with actual job ID
    // (credits were reserved with "pending" above — update the transaction description)
    await db.execute(
      sql`UPDATE creditTransactions SET relatedTransactionId = ${jobId} WHERE relatedTransactionId = 'pending' AND userId = ${userId} ORDER BY id DESC LIMIT 1`
    );

    // Log provider submission (no actual API call — job is queued)
    await logProviderSubmission({
      jobId,
      provider: "atlas_cloud",
      requestPayloadHash: requestHash,
      idempotencyKey,
      estimatedCost: estimatedCostGbp,
    });

    // Store idempotency key
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, userId, jobId, requestHash);
    }

    // Retrieve the created job
    const [job] = await db
      .select()
      .from(wizadoraJobs)
      .where(eq(wizadoraJobs.id, jobId))
      .limit(1);

    return res.status(202).json({ job: serializeJob(job) });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /videos — List jobs ──────────────────────────────────────────────────
wizadoraRouter.get("/videos", async (req: Request, res: Response) => {
  try {
    const key = (req as any).wizadoraKey;
    const userId: number = key.ownerId;

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const statusFilter = req.query.status as string | undefined;

    const db = await getDb();
    if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

    const whereClause = statusFilter
      ? and(
          eq(wizadoraJobs.userId, userId),
          eq(wizadoraJobs.status, statusFilter as any)
        )
      : eq(wizadoraJobs.userId, userId);

    const jobs = await db
      .select()
      .from(wizadoraJobs)
      .where(whereClause)
      .orderBy(desc(wizadoraJobs.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({
      jobs: jobs.map(serializeJob),
      pagination: { limit, offset, count: jobs.length },
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /videos/:id — Get job status ────────────────────────────────────────
wizadoraRouter.get("/videos/:id", async (req: Request, res: Response) => {
  try {
    const key = (req as any).wizadoraKey;
    const userId: number = key.ownerId;
    const jobId = req.params.id;

    // POLLING GUARD: this function only reads DB, never submits to provider
    if (POLLING_CAN_SUBMIT) {
      throw new WizadoraError("INTERNAL_ERROR", "Polling guard violated.", 500);
    }

    const db = await getDb();
    if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

    const [job] = await db
      .select()
      .from(wizadoraJobs)
      .where(and(eq(wizadoraJobs.id, jobId), eq(wizadoraJobs.userId, userId)))
      .limit(1);

    if (!job) {
      return res.status(404).json({ error: "JOB_NOT_FOUND", message: "Job not found." });
    }

    return res.json({ job: serializeJob(job) });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── DELETE /videos/:id — Cancel a queued job ────────────────────────────────
wizadoraRouter.delete("/videos/:id", async (req: Request, res: Response) => {
  try {
    const key = (req as any).wizadoraKey;
    const userId: number = key.ownerId;
    const jobId = req.params.id;

    const db = await getDb();
    if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

    const [job] = await db
      .select()
      .from(wizadoraJobs)
      .where(and(eq(wizadoraJobs.id, jobId), eq(wizadoraJobs.userId, userId)))
      .limit(1);

    if (!job) {
      return res.status(404).json({ error: "JOB_NOT_FOUND", message: "Job not found." });
    }

    if (!["queued", "processing"].includes(job.status)) {
      return res.status(409).json({
        error: "JOB_NOT_CANCELLABLE",
        message: `Job with status '${job.status}' cannot be cancelled.`,
      });
    }

    // Cancel job
    await db
      .update(wizadoraJobs)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(wizadoraJobs.id, jobId));

    // Refund reserved credits if job was only queued (not yet processing)
    if (job.status === "queued" && job.creditsReserved > 0) {
      await refundCredits(userId, job.creditsReserved, jobId);
    }

    return res.json({ success: true, jobId, status: "cancelled" });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── GET /account — Account info + credit balance ────────────────────────────
wizadoraRouter.get("/account", async (req: Request, res: Response) => {
  try {
    const key = (req as any).wizadoraKey;
    const userId: number = key.ownerId;

    const db = await getDb();
    if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

    const [creditRow] = await db
      .select()
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);

    // Job stats
    const [stats] = await db.execute(
      sql`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'queued' OR status = 'processing' THEN 1 ELSE 0 END) as active
      FROM wizadora_jobs WHERE user_id = ${userId}`
    ) as any;

    const row = Array.isArray(stats) ? stats[0] : stats;

    return res.json({
      userId,
      credits: {
        balance: creditRow?.balance ?? 0,
        totalEarned: creditRow?.totalEarned ?? 0,
        totalSpent: creditRow?.totalSpent ?? 0,
      },
      jobs: {
        total: Number(row?.total ?? 0),
        completed: Number(row?.completed ?? 0),
        failed: Number(row?.failed ?? 0),
        active: Number(row?.active ?? 0),
      },
      apiKey: {
        prefix: key.keyPrefix,
        label: key.label,
        isAdmin: key.isAdmin,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── POST /webhooks/test — Send a test webhook event (admin only) ─────────────
wizadoraRouter.post("/webhooks/test", requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { endpointUrl, eventType = "job.completed" } = req.body;
    if (!endpointUrl || typeof endpointUrl !== "string") {
      throw new WizadoraError("MISSING_ENDPOINT", "endpointUrl is required.", 400);
    }

    const payload = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: { jobId: "test-job-id", status: "completed", test: true },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payload, timestamp);
    const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");

    // Log the test delivery
    await logWebhookDelivery({
      jobId: "test-job-id",
      eventType,
      endpointUrl,
      payloadHash,
      signature,
      status: "skipped", // test mode — not actually sent
    });

    return res.json({
      success: true,
      signature,
      payload,
      note: "Test webhook logged. In production, this would POST to endpointUrl with X-WizAdora-Signature header.",
    });
  } catch (err) {
    return sendError(res, err);
  }
});

// ─── SERIALIZER ───────────────────────────────────────────────────────────────
function serializeJob(job: any) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    prompt: job.prompt,
    negativePrompt: job.negativePrompt,
    duration: job.duration,
    resolution: job.resolution,
    aspectRatio: job.aspectRatio,
    style: job.style,
    provider: job.provider,
    outputVideoUrl: job.outputVideoUrl ?? null,
    thumbnailUrl: job.thumbnailUrl ?? null,
    creditsReserved: job.creditsReserved,
    creditsCharged: job.creditsCharged,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    moderationBlocked: job.moderationBlocked,
    createdAt: job.createdAt,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    failedAt: job.failedAt ?? null,
    cancelledAt: job.cancelledAt ?? null,
  };
}
