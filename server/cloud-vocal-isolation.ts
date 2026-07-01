/**
 * Cloud Vocal Isolation Service
 * ==============================
 * Automatically isolates the lead vocal stem from a music video job's audio
 * using the MVSEP API with the BS Roformer ensemble model (SDR 11.93).
 *
 * MVSEP replaces WaveSpeed AI as the primary vocal isolation provider.
 * It accepts a public URL directly, runs async separation, and returns
 * clean WAV stems — no file upload step required.
 *
 * Pipeline:
 *   1. Submit the job's audioUrl to MVSEP → get a separation job ID
 *   2. Store job ID on the job row (lalalTaskId column, repurposed for MVSEP)
 *   3. On subsequent heartbeat ticks, poll the separation until done
 *   4. When done: download the isolated vocals, upload to S3, insert into
 *      musicVideoVocalStems, and set vocalsStatus="done"
 *
 * Idempotency:
 *   - If vocalsStatus="done" → returns immediately (already isolated)
 *   - If lalalTaskId is set → polls the existing MVSEP job (no re-submit)
 *   - Otherwise → submit new MVSEP separation job
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
  submitMvsepVocalIsolation,
  pollMvsepVocalIsolation,
} from "./ai-apis/mvsep-vocal-isolation";
import * as https from "https";
import * as http from "http";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VocalIsolationStatus = "done" | "in_progress" | "failed" | "no_key";

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
 * @param mvsepJobId  - Existing MVSEP separation job ID (stored in lalalTaskId column), or null to start fresh
 * @returns VocalIsolationResult indicating current status
 */
export async function triggerCloudVocalIsolation(
  jobId: number,
  audioUrl: string,
  mvsepJobId: string | null | undefined,
): Promise<VocalIsolationResult> {
  // Guard: MVSEP_API_KEY must be set
  if (!process.env.MVSEP_API_KEY) {
    console.warn(`[CloudVocalIsolation] Job ${jobId}: MVSEP_API_KEY not set — skipping vocal isolation`);
    return { status: "no_key", message: "MVSEP_API_KEY not configured" };
  }

  const db = (await getDb())!;

  try {
    // ── PHASE 1: Submit new MVSEP separation if not already started ─────────────────
    if (!mvsepJobId) {
      console.log(`[CloudVocalIsolation] Job ${jobId}: submitting vocal isolation to MVSEP...`);
      const submitResult = await submitMvsepVocalIsolation(audioUrl);
      const newJobId = submitResult.jobId;

      // Persist MVSEP job ID in lalalTaskId column (repurposed)
      await db.update(musicVideoJobs)
        .set({ lalalTaskId: newJobId, vocalsStatus: "processing" })
        .where(eq(musicVideoJobs.id, jobId));

      console.log(`[CloudVocalIsolation] Job ${jobId}: MVSEP separation submitted → mvsepJobId=${newJobId}`);
      return { status: "in_progress", message: `MVSEP separation submitted: ${newJobId}` };
    }

    // ── PHASE 2: Poll existing MVSEP separation ────────────────────────────────
    console.log(`[CloudVocalIsolation] Job ${jobId}: polling MVSEP mvsepJobId=${mvsepJobId}...`);
    const pollResult = await pollMvsepVocalIsolation(mvsepJobId);

    if (pollResult.status === "waiting" || pollResult.status === "processing") {
      console.log(`[CloudVocalIsolation] Job ${jobId}: MVSEP status=${pollResult.status} — still in progress`);
      return { status: "in_progress", message: `MVSEP status: ${pollResult.status}` };
    }

    if (pollResult.status === "error") {
      console.error(`[CloudVocalIsolation] Job ${jobId}: MVSEP separation failed — ${pollResult.errorMessage}`);
      // Clear the job ID so we can retry on next tick
      await db.update(musicVideoJobs)
        .set({ lalalTaskId: null, lalalSourceId: null, vocalsStatus: "failed" })
        .where(eq(musicVideoJobs.id, jobId));
      return { status: "failed", message: pollResult.errorMessage };
    }

    if (pollResult.status === "done" && pollResult.vocalsUrl) {
      // ── PHASE 3: Download isolated vocals and upload to S3 ─────────────────
      console.log(`[CloudVocalIsolation] Job ${jobId}: downloading isolated vocals from MVSEP...`);
      const vocalsBuffer = await downloadToBuffer(pollResult.vocalsUrl);
      console.log(`[CloudVocalIsolation] Job ${jobId}: downloaded ${(vocalsBuffer.length / 1024 / 1024).toFixed(1)} MB`);

      // MVSEP returns WAV — store with correct extension and MIME type
      const ext = pollResult.vocalsUrl.toLowerCase().includes(".wav") ? "wav" : "mp3";
      const mimeType = ext === "wav" ? "audio/wav" : "audio/mpeg";
      const s3Key = `vocal-stems/${jobId}-vocals-mvsep.${ext}`;
      const { url: s3VocalsUrl } = await storagePut(s3Key, vocalsBuffer, mimeType);
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

      console.log(`[CloudVocalIsolation] Job ${jobId}: ✅ MVSEP vocal isolation COMPLETE — vocalsStatus=done`);
      return { status: "done", vocalsUrl: s3VocalsUrl };
    }

    // Unexpected status
    return { status: "in_progress", message: `Unexpected MVSEP poll status: ${pollResult.status}` };

  } catch (err: any) {
    console.error(`[CloudVocalIsolation] Job ${jobId}: error — ${err.message}`);
    // Don't mark as failed on transient errors — let it retry next tick
    return { status: "failed", message: err.message };
  }
}
