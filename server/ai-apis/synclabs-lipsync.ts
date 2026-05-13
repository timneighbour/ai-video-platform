/**
 * Sync Labs sync-3 Lip Sync Integration
 * ──────────────────────────────────────
 * Best-in-class lip sync for music videos.
 *
 * sync-3 is architecturally superior to all alternatives:
 *   - 4K native output (no resolution loss)
 *   - Native visual intelligence — handles extreme angles, profile shots,
 *     obstructions (microphones, hands, scarves) automatically
 *   - Global frame understanding (not chunk-based) — no boundary artifacts
 *   - Emotion and style preservation
 *   - Recommended for music video use cases
 *
 * Pricing: $0.133/sec at 25fps
 * For a 72-second music video: ~$9.60 per render
 *
 * API: https://api.sync.so/v2
 * SDK: @sync.so/sdk
 */

import { SyncClient, SyncError } from "@sync.so/sdk";

const SYNC_LABS_API_KEY = process.env.SYNC_LABS_API_KEY;
const POLL_INTERVAL_MS = 5000; // 5 seconds between polls
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max

export interface SyncLabsLipSyncOptions {
  videoUrl: string;
  audioUrl: string;
  /** sync_mode: "cut_off" trims to shorter, "loop" repeats shorter, "bounce" bounces */
  syncMode?: "cut_off" | "loop" | "bounce";
  outputFileName?: string;
}

export interface SyncLabsResult {
  jobId: string;
  outputUrl: string;
  status: string;
}

/**
 * Submit a lip sync job to Sync Labs sync-3.
 * Returns the job ID immediately (async processing).
 */
export async function submitSyncLabsLipSync(
  options: SyncLabsLipSyncOptions
): Promise<string> {
  if (!SYNC_LABS_API_KEY) {
    throw new Error("SYNC_LABS_API_KEY not configured");
  }

  const sync = new SyncClient({ apiKey: SYNC_LABS_API_KEY });

  const response = await sync.generations.create({
    input: [
      { type: "video", url: options.videoUrl },
      { type: "audio", url: options.audioUrl },
    ],
    model: "sync-3",
    options: {
      sync_mode: options.syncMode ?? "cut_off",
    },
    outputFileName: options.outputFileName ?? `wizsync-${Date.now()}`,
  });

  console.log(`[SyncLabsLipSync] Job submitted: ${response.id}`);
  return response.id;
}

/**
 * Poll a Sync Labs job until it completes or fails.
 * Returns the output video URL on success.
 */
export async function pollSyncLabsLipSync(
  jobId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  if (!SYNC_LABS_API_KEY) {
    throw new Error("SYNC_LABS_API_KEY not configured");
  }

  const sync = new SyncClient({ apiKey: SYNC_LABS_API_KEY });
  const deadline = Date.now() + timeoutMs;
  const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "REJECTED"];

  let generation = await sync.generations.get(jobId);

  while (!TERMINAL_STATUSES.includes(generation.status)) {
    if (Date.now() > deadline) {
      throw new Error(
        `[SyncLabsLipSync] Job ${jobId} timed out after ${timeoutMs / 1000}s (status: ${generation.status})`
      );
    }
    console.log(`[SyncLabsLipSync] Job ${jobId} status: ${generation.status} — polling in ${POLL_INTERVAL_MS / 1000}s`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    generation = await sync.generations.get(jobId);
  }

  if (generation.status !== "COMPLETED") {
    throw new Error(
      `[SyncLabsLipSync] Job ${jobId} ended with status: ${generation.status}`
    );
  }

  const outputUrl = (generation as any).outputUrl ?? (generation as any).output_url;
  if (!outputUrl) {
    throw new Error(`[SyncLabsLipSync] Job ${jobId} completed but no outputUrl found`);
  }

  console.log(`[SyncLabsLipSync] Job ${jobId} COMPLETED — output: ${outputUrl}`);
  return outputUrl as string;
}

/**
 * Submit and wait for a Sync Labs lip sync job.
 * Convenience wrapper combining submit + poll.
 */
export async function waitForSyncLabsLipSync(
  options: SyncLabsLipSyncOptions,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SyncLabsResult> {
  const jobId = await submitSyncLabsLipSync(options);
  const outputUrl = await pollSyncLabsLipSync(jobId, timeoutMs);
  return { jobId, outputUrl, status: "COMPLETED" };
}

/**
 * Check if Sync Labs is configured and available.
 */
export function isSyncLabsConfigured(): boolean {
  return !!SYNC_LABS_API_KEY;
}
