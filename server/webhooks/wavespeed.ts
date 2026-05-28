/**
 * WaveSpeed Webhook Handler
 * =========================
 * Receives async completion/failure events from WaveSpeed for:
 *   - Seedance 2.0 text-to-video / image-to-video (scene generation)
 *   - InfiniteTalk (lip-sync correction pass)
 *
 * Architecture notes:
 *   - Registered BEFORE express.json() so we receive the raw body for HMAC verification
 *   - Deduplication via sceneWebhookEvents (providerTaskId + eventType unique check)
 *   - On completed: copies video URL to S3 immediately (WaveSpeed 7-day retention window)
 *   - On failed: resets scene to pending for retry by heartbeat
 *   - Falls back to polling if webhook is not received within heartbeat timeout
 *
 * WaveSpeed webhook docs: https://wavespeed.ai/docs/webhooks
 * Signature: HMAC-SHA256(rawBody, WAVESPEED_API_KEY), hex-encoded
 */

import crypto from "crypto";
import { Request, Response } from "express";
import { getDb } from "../db";
import { musicVideoScenes, sceneWebhookEvents, sceneAuditLog } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaveSpeedWebhookPayload {
  id: string;            // Provider task ID
  status: "completed" | "failed" | "processing" | "created";
  outputs?: string[];    // Array of output video URLs (when completed)
  error?: string | null;
  model?: string;
  created_at?: string;
  completed_at?: string;
}

// ─── Signature Verification ───────────────────────────────────────────────────

/**
 * Verify WaveSpeed webhook signature.
 * WaveSpeed signs the raw request body with HMAC-SHA256 using the API key.
 * The signature is sent in the X-WaveSpeed-Signature header as hex.
 */
function verifyWaveSpeedSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) {
    console.warn("[WaveSpeed Webhook] WAVESPEED_API_KEY not set — skipping signature verification");
    return true; // Fail open in dev; tighten in prod
  }
  if (!signatureHeader) {
    console.warn("[WaveSpeed Webhook] No X-WaveSpeed-Signature header — rejecting");
    return false;
  }
  try {
    const expected = crypto
      .createHmac("sha256", apiKey)
      .update(rawBody)
      .digest("hex");
    const incoming = signatureHeader.replace(/^sha256=/, "");
    if (expected.length !== incoming.length) return false;
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(incoming, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Asset Copy ───────────────────────────────────────────────────────────────

/**
 * Immediately copy a WaveSpeed output URL to WIZ-controlled S3 storage.
 * WaveSpeed retains predictions for only 7 days — we must copy immediately.
 * Returns the S3 URL, or null if the copy fails (caller should log and continue).
 */
async function copyProviderAssetToS3(
  providerUrl: string,
  sceneId: number,
  assetType: "raw" | "lipsync"
): Promise<{ s3Url: string; s3Key: string } | null> {
  try {
    const response = await axios.get(providerUrl, {
      responseType: "arraybuffer",
      timeout: 120_000, // 2 minutes for large video files
      headers: { "User-Agent": "WizAI-AssetCopy/1.0" },
    });

    const buffer = Buffer.from(response.data as ArrayBuffer);
    const suffix = Math.random().toString(36).slice(2, 8);
    const s3Key = `scene-assets/${sceneId}-${assetType}-${suffix}.mp4`;

    const { url: s3Url } = await storagePut(s3Key, buffer, "video/mp4");
    console.log(
      `[WaveSpeed Webhook] Copied ${assetType} asset for scene ${sceneId} → ${s3Key} (${buffer.length} bytes)`
    );
    return { s3Url, s3Key };
  } catch (err: any) {
    console.error(
      `[WaveSpeed Webhook] Failed to copy ${assetType} asset for scene ${sceneId}: ${err.message}`
    );
    return null;
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Check if this webhook event has already been processed.
 * Returns true if the event is a duplicate (should be skipped).
 */
async function isDuplicateWebhookEvent(
  providerTaskId: string,
  eventType: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) { console.error("[WaveSpeed Webhook] DB not available"); return false; }
  const existing = await db
    .select({ id: sceneWebhookEvents.id })
    .from(sceneWebhookEvents)
    .where(
      and(
        eq(sceneWebhookEvents.providerTaskId, providerTaskId),
        eq(sceneWebhookEvents.eventType, eventType),
        eq(sceneWebhookEvents.processed, true)
      )
    )
    .limit(1);
  return existing.length > 0;
}

// ─── Scene Lookup ─────────────────────────────────────────────────────────────

/**
 * Find the scene associated with a WaveSpeed task ID.
 * Checks both taskId (Seedance) and lipSyncTaskId (InfiniteTalk).
 */
async function findSceneByTaskId(providerTaskId: string) {
  const db = await getDb();
  if (!db) { console.error("[WaveSpeed Webhook] DB not available"); return; }

  // Check Seedance task ID first
  const seedanceScene = await db
    .select()
    .from(musicVideoScenes)
    .where(eq(musicVideoScenes.taskId, providerTaskId))
    .limit(1);
  if (seedanceScene.length > 0) {
    return { scene: seedanceScene[0], taskType: "seedance" as const };
  }

  // Check InfiniteTalk task ID
  const lipSyncScene = await db
    .select()
    .from(musicVideoScenes)
    .where(eq(musicVideoScenes.lipSyncTaskId, providerTaskId))
    .limit(1);
  if (lipSyncScene.length > 0) {
    return { scene: lipSyncScene[0], taskType: "infinitetalk" as const };
  }

  return null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function handleWaveSpeedWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  const signatureHeader = req.headers["x-wavespeed-signature"] as string | undefined;

  // 1. Verify signature
  const signatureVerified = verifyWaveSpeedSignature(rawBody, signatureHeader);
  if (!signatureVerified) {
    console.warn("[WaveSpeed Webhook] Signature verification failed — rejecting");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 2. Parse payload
  let payload: WaveSpeedWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch (err) {
    console.error("[WaveSpeed Webhook] Failed to parse payload:", err);
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  const { id: providerTaskId, status, outputs, error: providerError } = payload;
  if (!providerTaskId || !status) {
    res.status(400).json({ error: "Missing id or status in payload" });
    return;
  }

  // Compute payload hash for deduplication
  const payloadHash = crypto
    .createHash("sha256")
    .update(rawBody)
    .digest("hex");

  // 3. Log the webhook event (idempotent insert)
  let webhookEventId: number | null = null;
  try {
    const isDuplicate = await isDuplicateWebhookEvent(providerTaskId, status);
    if (isDuplicate) {
      console.log(
        `[WaveSpeed Webhook] Duplicate event skipped: taskId=${providerTaskId} status=${status}`
      );
      res.json({ received: true, duplicate: true });
      return;
    }

    const db = await getDb();
    if (!db) { console.error("[WaveSpeed Webhook] DB not available"); return; }
    const inserted = await db.insert(sceneWebhookEvents).values({
      provider: "wavespeed",
      providerTaskId,
      eventType: status,
      payloadHash,
      processed: false,
      processingAttempts: 0,
      rawPayloadJson: rawBody.toString("utf-8"),
      signatureVerified,
    });
    webhookEventId = Number((inserted as any).insertId ?? 0);
  } catch (err: any) {
    console.error("[WaveSpeed Webhook] Failed to log event:", err.message);
    // Don't fail the webhook — continue processing
  }

  // 4. Respond to WaveSpeed immediately (before slow S3 copy)
  res.json({ received: true });

  // 5. Process the event asynchronously (after response sent)
  setImmediate(async () => {
    try {
      await processWaveSpeedEvent(
        providerTaskId,
        status,
        outputs ?? [],
        providerError ?? null,
        webhookEventId
      );
    } catch (err: any) {
      console.error(
        `[WaveSpeed Webhook] Async processing failed for taskId=${providerTaskId}: ${err.message}`
      );
      if (webhookEventId) {
        const db = await getDb();
        if (!db) { console.error("[WaveSpeed Webhook] DB not available"); return; }
        await db
          .update(sceneWebhookEvents)
          .set({ processingError: err.message, processingAttempts: 1 })
          .where(eq(sceneWebhookEvents.id, webhookEventId))
          .catch(() => {});
      }
    }
  });
}

// ─── Event Processing ─────────────────────────────────────────────────────────

async function processWaveSpeedEvent(
  providerTaskId: string,
  status: string,
  outputs: string[],
  providerError: string | null,
  webhookEventId: number | null
): Promise<void> {
  const db = await getDb();
  if (!db) { console.error("[WaveSpeed Webhook] DB not available"); return; }

  // Find the scene associated with this task
  const result = await findSceneByTaskId(providerTaskId);
  if (!result) {
    console.warn(
      `[WaveSpeed Webhook] No scene found for taskId=${providerTaskId} — may be a non-scene task`
    );
    if (webhookEventId) {
      await db
        .update(sceneWebhookEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(sceneWebhookEvents.id, webhookEventId))
        .catch(() => {});
    }
    return;
  }

  const { scene, taskType } = result;
  const sceneId = scene.id;
  const jobId = scene.jobId;
  const retryNumber = (scene as any).retryCount ?? 0;

  // Update webhook event with resolved scene/job
  if (webhookEventId) {
    await db
      .update(sceneWebhookEvents)
      .set({ resolvedSceneId: sceneId, resolvedJobId: jobId })
      .where(eq(sceneWebhookEvents.id, webhookEventId))
      .catch(() => {});
  }

  if (status === "completed") {
    const providerUrl = outputs[0];
    if (!providerUrl) {
      console.error(
        `[WaveSpeed Webhook] Completed event has no output URL for taskId=${providerTaskId}`
      );
      return;
    }

    if (taskType === "seedance") {
      // ── Seedance completed: copy to S3, mark scene as completed ──────────
      console.log(`[WaveSpeed Webhook] Seedance completed for scene ${sceneId} — copying to S3`);
      const copied = await copyProviderAssetToS3(providerUrl, sceneId, "raw");

      await db
        .update(musicVideoScenes)
        .set({
          status: "completed",
          videoUrl: copied ? copied.s3Url : providerUrl,
          videoKey: copied ? copied.s3Key : null,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, sceneId));

      // Write audit log entry
      await db.insert(sceneAuditLog).values({
        sceneId,
        jobId,
        fromState: "generating",
        toState: "completed",
        triggeredBy: "webhook",
        provider: "wavespeed-seedance",
        providerTaskId,
        validationGate: "raw_scene",
        rawVideoUrl: copied ? copied.s3Url : providerUrl,
        retryNumber,
      }).catch(() => {});

      console.log(`[WaveSpeed Webhook] Scene ${sceneId} marked completed (Seedance)`);

    } else if (taskType === "infinitetalk") {
      // ── InfiniteTalk completed: copy to S3, mark lip sync done ──────────
      console.log(
        `[WaveSpeed Webhook] InfiniteTalk completed for scene ${sceneId} — copying to S3`
      );
      const copied = await copyProviderAssetToS3(providerUrl, sceneId, "lipsync");

      await db
        .update(musicVideoScenes)
        .set({
          lipSyncStatus: "done",
          lipSyncVideoUrl: copied ? copied.s3Url : providerUrl,
          lipSyncVideoKey: copied ? copied.s3Key : null,
          compositeStatus: "skipped", // New pipeline: no compositing
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, sceneId));

      // Write audit log entry
      await db.insert(sceneAuditLog).values({
        sceneId,
        jobId,
        fromState: "processing",
        toState: "corrected",
        triggeredBy: "webhook",
        provider: "wavespeed-infinitetalk",
        providerTaskId,
        validationGate: "lip_sync",
        correctedVideoUrl: copied ? copied.s3Url : providerUrl,
        retryNumber,
      }).catch(() => {});

      console.log(`[WaveSpeed Webhook] Scene ${sceneId} lip sync marked done (InfiniteTalk)`);
    }

  } else if (status === "failed") {
    // ── Provider failure: reset to pending for heartbeat retry ──────────
    console.warn(
      `[WaveSpeed Webhook] Provider failure for scene ${sceneId} taskType=${taskType}: ${providerError}`
    );

    if (taskType === "seedance") {
      await db
        .update(musicVideoScenes)
        .set({
          status: "pending",
          taskId: null,
          errorMessage: providerError ?? "WaveSpeed provider failure",
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, sceneId));
    } else if (taskType === "infinitetalk") {
      await db
        .update(musicVideoScenes)
        .set({
          lipSyncStatus: "pending",
          lipSyncTaskId: null,
          errorMessage: providerError ?? "InfiniteTalk provider failure",
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, sceneId));
    }

    // Write audit log entry
    await db.insert(sceneAuditLog).values({
      sceneId,
      jobId,
      fromState: taskType === "seedance" ? "generating" : "processing",
      toState: "pending",
      triggeredBy: "webhook",
      provider: taskType === "seedance" ? "wavespeed-seedance" : "wavespeed-infinitetalk",
      providerTaskId,
      validationPassed: false,
      errorMessage: providerError ?? "Provider failure",
      retryNumber,
    }).catch(() => {});
  }

  // Mark webhook event as processed
  if (webhookEventId) {
    await db
      .update(sceneWebhookEvents)
      .set({ processed: true, processedAt: new Date(), processingAttempts: 1 })
      .where(eq(sceneWebhookEvents.id, webhookEventId))
      .catch(() => {});
  }
}
