/**
 * Cloud Vocal Isolation Service
 * ==============================
 * Automatically isolates the lead vocal stem from a music video job's audio
 * using the WaveSpeed AI `wavespeed-ai/audio-vocal-isolator` endpoint.
 *
 * This is the Cloud Run-compatible replacement for the local Demucs (Python)
 * approach. No file upload step is needed — WaveSpeed accepts a public URL
 * directly, making the flow simpler than the previous Lalal.ai approach.
 *
 * Pipeline:
 *   1. Submit the job's audioUrl to WaveSpeed → get a prediction taskId
 *   2. Store taskId on the job row (lalalTaskId column, repurposed for WaveSpeed)
 *   3. On subsequent heartbeat ticks, poll the prediction until done
 *   4. When done: download the isolated vocals, upload to S3, insert into
 *      musicVideoVocalStems, and set vocalsStatus="done"
 *
 * Idempotency:
 *   - If vocalsStatus="done" → returns immediately (already isolated)
 *   - If lalalTaskId is set → polls the existing WaveSpeed prediction (no re-submit)
 *   - Otherwise → submit new prediction
 *
 * Usage in heartbeat:
 *   const result = await triggerCloudVocalIsolation(jobId, audioUrl, lalalTaskId);
 *   // result.status: "done" | "in_progress" | "failed" | "no_key"
 *   // When "done", vocalsStatus is updated and stem is in musicVideoVocalStems
 */

import { getDb } from "./db";
import { musicVideoJobs, musicVideoVocalStems } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import {
  submitWaveSpeedVocalIsolation,
  pollWaveSpeedVocalIsolation,
} from "./ai-apis/wavespeed-vocal-isolation";
import * as https from "https";
import * as http from "http";

// ─── Constants ──────────────────────────────────────────────────────────────

/** ISS-010b: If vocal isolation has been running for more than 20 minutes, fall back to the full mix. */
const VOCAL_ISOLATION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

// ─── Types ──────────────────────────────────────────────────────────────────

export type VocalIsolationStatus = "done" | "in_progress" | "failed" | "no_key" | "timed_out";

export interface VocalIsolationResult {
  status: VocalIsolationStatus;
  vocalsUrl?: string;
  message?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Downloads a remote URL and returns it as a Buffer (handles redirects).
 */
async function downloadToBuffer(url: string, maxRedirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, { timeout: 120_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error(`Too many redirects: ${url}`));
          return;
        }
        downloadToBuffer(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Trigger or poll cloud vocal isolation for a music video job.
 *
 * This function is designed to be called on every heartbeat tick.
 * It is idempotent — safe to call multiple times.
 *
 * @param jobId       - The music video job ID
 * @param audioUrl    - The full-mix audio URL (from musicVideoJobs.audioUrl)
 * @param wavespeedTaskId - Existing WaveSpeed prediction ID (stored in lalalTaskId column)
 * @returns VocalIsolationResult indicating current status
 */
export async function triggerCloudVocalIsolation(
  jobId: number,
  audioUrl: string,
  wavespeedTaskId: string | null | undefined,
): Promise<VocalIsolationResult> {
  // Guard: WAVESPEED_API_KEY must be set
  if (!process.env.WAVESPEED_API_KEY) {
    console.warn(`[CloudVocalIsolation] Job ${jobId}: WAVESPEED_API_KEY not set — skipping vocal isolation`);
    return { status: "no_key", message: "WAVESPEED_API_KEY not configured" };
  }

  const db = (await getDb())!;

  try {
    // ── PHASE 1: Submit new prediction if not already started ─────────────────
    if (!wavespeedTaskId) {
      console.log(`[CloudVocalIsolation] Job ${jobId}: submitting vocal isolation to WaveSpeed...`);
      const submitResult = await submitWaveSpeedVocalIsolation(audioUrl);
      const taskId = submitResult.taskId;

      // Persist taskId in lalalTaskId column (repurposed for WaveSpeed) and record submission time
      await db.update(musicVideoJobs)
        .set({ lalalTaskId: taskId, vocalsStatus: "processing", vocalsSubmittedAt: new Date() })
        .where(eq(musicVideoJobs.id, jobId));

      console.log(`[CloudVocalIsolation] Job ${jobId}: prediction submitted → taskId=${taskId}`);
      return { status: "in_progress", message: `WaveSpeed prediction submitted: ${taskId}` };
    }

    // ── ISS-010b: Hard timeout check — if stuck >20 min, fall back to full mix ──
    const [jobRow] = await db.select({ vocalsSubmittedAt: musicVideoJobs.vocalsSubmittedAt, audioUrl: musicVideoJobs.audioUrl })
      .from(musicVideoJobs).where(eq(musicVideoJobs.id, jobId)).limit(1);
    if (jobRow?.vocalsSubmittedAt) {
      const msSinceSubmit = Date.now() - new Date(jobRow.vocalsSubmittedAt).getTime();
      if (msSinceSubmit > VOCAL_ISOLATION_TIMEOUT_MS) {
        console.warn(
          `[CloudVocalIsolation] Job ${jobId}: vocal isolation timed out after ${Math.round(msSinceSubmit / 60000)} min ` +
          `— falling back to full mix (audioUrl) for lip sync`
        );
        // Fall back: use the original full-mix audio URL as the "vocals" URL
        const fallbackUrl = jobRow.audioUrl;
        await db.update(musicVideoJobs)
          .set({ vocalsStatus: "done", vocalsUrl: fallbackUrl, lalalTaskId: null })
          .where(eq(musicVideoJobs.id, jobId));
        return { status: "timed_out", vocalsUrl: fallbackUrl, message: "Timed out — using full mix as fallback" };
      }
    }

    // ── PHASE 2: Poll existing prediction ────────────────────────────────────
    console.log(`[CloudVocalIsolation] Job ${jobId}: polling WaveSpeed taskId=${wavespeedTaskId}...`);
    const pollResult = await pollWaveSpeedVocalIsolation(wavespeedTaskId);

    if (
      pollResult.status === "pending" ||
      pollResult.status === "processing" ||
      pollResult.status === "created"
    ) {
      console.log(`[CloudVocalIsolation] Job ${jobId}: prediction status=${pollResult.status} — still in progress`);
      return { status: "in_progress", message: `WaveSpeed status: ${pollResult.status}` };
    }

    if (pollResult.status === "failed") {
      console.error(`[CloudVocalIsolation] Job ${jobId}: prediction failed — ${pollResult.errorMessage}`);
      // Clear the task ID so we can retry on next tick
      await db.update(musicVideoJobs)
        .set({ lalalTaskId: null, lalalSourceId: null, vocalsStatus: "failed" })
        .where(eq(musicVideoJobs.id, jobId));
      return { status: "failed", message: pollResult.errorMessage };
    }

    if (pollResult.status === "completed" && pollResult.vocalsUrl) {
      // ── PHASE 3: Download isolated vocals and upload to S3 ─────────────────
      console.log(`[CloudVocalIsolation] Job ${jobId}: downloading isolated vocals from WaveSpeed CDN...`);
      const vocalsBuffer = await downloadToBuffer(pollResult.vocalsUrl);
      console.log(`[CloudVocalIsolation] Job ${jobId}: downloaded ${(vocalsBuffer.length / 1024 / 1024).toFixed(1)} MB`);

      // Upload to S3 with a deterministic key
      const s3Key = `vocal-stems/${jobId}-vocals-wavespeed.mp3`;
      const { url: s3VocalsUrl } = await storagePut(s3Key, vocalsBuffer, "audio/mpeg");
      console.log(`[CloudVocalIsolation] Job ${jobId}: uploaded to S3 → ${s3VocalsUrl.slice(0, 80)}...`);

      // ── PHASE 4: Insert into musicVideoVocalStems ──────────────────────────
      const existingStems = await db
        .select({ id: musicVideoVocalStems.id })
        .from(musicVideoVocalStems)
        .where(eq(musicVideoVocalStems.jobId, jobId));

      if (existingStems.length === 0) {
        await db.insert(musicVideoVocalStems).values({
          jobId,
          stemIndex: 0,
          stemUrl: s3VocalsUrl,
          stemKey: s3Key,
          characterName: null,
          voiceGender: "unknown",
          voiceLabel: "Lead Vocal",
          isLeadVocal: true,
          diarisationStatus: "done",
        });
        console.log(`[CloudVocalIsolation] Job ${jobId}: stem inserted into musicVideoVocalStems`);
      } else {
        await db.update(musicVideoVocalStems)
          .set({ stemUrl: s3VocalsUrl, stemKey: s3Key })
          .where(eq(musicVideoVocalStems.jobId, jobId));
        console.log(`[CloudVocalIsolation] Job ${jobId}: existing stem updated`);
      }

      // ── PHASE 5: Mark job as vocals done ──────────────────────────────────
      await db.update(musicVideoJobs)
        .set({
          vocalsStatus: "done",
          vocalsUrl: s3VocalsUrl,
          vocalsKey: s3Key,
        })
        .where(eq(musicVideoJobs.id, jobId));

      console.log(`[CloudVocalIsolation] Job ${jobId}: ✅ vocal isolation COMPLETE — vocalsStatus=done`);
      return { status: "done", vocalsUrl: s3VocalsUrl };
    }

    // Unexpected status
    return { status: "in_progress", message: `Unexpected poll status: ${pollResult.status}` };

  } catch (err: any) {
    console.error(`[CloudVocalIsolation] Job ${jobId}: error — ${err.message}`);
    // Don't mark as failed on transient errors — let it retry next tick
    return { status: "failed", message: err.message };
  }
}
