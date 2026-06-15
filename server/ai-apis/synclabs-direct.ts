/**
 * Sync Labs Direct — Photo + Audio → Lip-Synced Video (Fallback)
 *
 * Uses Sync Labs' lipsync API to generate a lip-synced video from a
 * portrait photo + audio file. This is the FALLBACK when HeyGen fails.
 *
 * API Reference: https://docs.sync.so/api-reference
 * SDK: @sync.so/sdk (already installed)
 */

import axios from "axios";

const SYNCLABS_API_BASE = "https://api.sync.so/v2";

function getKey(): string {
  const key = process.env.SYNC_LABS_API_KEY;
  if (!key) throw new Error("[SyncLabsDirect] SYNC_LABS_API_KEY is not set");
  return key;
}

export function isSyncLabsConfigured(): boolean {
  return !!process.env.SYNC_LABS_API_KEY;
}

export interface SyncLabsDirectInput {
  imageUrl: string;
  audioUrl: string;
  sceneId: number | string;
  model?: string;
}

export interface SyncLabsDirectResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  errorMessage?: string;
}

export async function submitSyncLabsDirect(input: SyncLabsDirectInput): Promise<string> {
  const { imageUrl, audioUrl, sceneId, model = "sync-1.9.0-beta" } = input;

  console.log(`[SyncLabsDirect] Scene ${sceneId} submitting — image: ${imageUrl.slice(0, 70)}... | audio: ${audioUrl.slice(0, 70)}...`);

  const resp = await axios.post(
    `${SYNCLABS_API_BASE}/generate`,
    {
      model,
      input: [
        { type: "video", url: imageUrl },
        { type: "audio", url: audioUrl },
      ],
      options: { output_format: "mp4" },
    },
    {
      headers: { "x-api-key": getKey(), "Content-Type": "application/json" },
      timeout: 30_000,
    }
  );

  const jobId: string = resp.data?.id ?? resp.data?.job_id;
  if (!jobId) {
    throw new Error(`[SyncLabsDirect] Scene ${sceneId} submit failed — no job id: ${JSON.stringify(resp.data).slice(0, 300)}`);
  }

  console.log(`[SyncLabsDirect] Scene ${sceneId} submitted → job_id: ${jobId}`);
  return jobId;
}

export async function pollSyncLabsDirect(jobId: string, sceneId: number | string): Promise<SyncLabsDirectResult> {
  const resp = await axios.get(
    `${SYNCLABS_API_BASE}/generate/${jobId}`,
    { headers: { "x-api-key": getKey() }, timeout: 15_000 }
  );

  const data = resp.data;
  const status: string = data?.status ?? "pending";

  if (status === "completed") {
    const videoUrl: string = data?.output_url ?? data?.video_url ?? data?.url ?? "";
    console.log(`[SyncLabsDirect] Scene ${sceneId} job ${jobId} COMPLETED — url: ${videoUrl.slice(0, 80)}...`);
    return { jobId, status: "completed", videoUrl };
  }

  if (status === "failed" || status === "error") {
    const errorMessage: string = data?.error ?? data?.message ?? "Unknown error";
    console.error(`[SyncLabsDirect] Scene ${sceneId} job ${jobId} FAILED — ${errorMessage}`);
    return { jobId, status: "failed", errorMessage };
  }

  return { jobId, status: status as "pending" | "processing" };
}

export async function pollSyncLabsDirectUntilDone(
  jobId: string,
  sceneId: number | string,
  maxWaitMs = 10 * 60 * 1000
): Promise<SyncLabsDirectResult> {
  const startMs = Date.now();
  let intervalMs = 5_000;

  while (Date.now() - startMs < maxWaitMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const result = await pollSyncLabsDirect(jobId, sceneId);
    if (result.status === "completed" || result.status === "failed") return result;
    intervalMs = Math.min(intervalMs + 5_000, 20_000);
  }

  return { jobId, status: "failed", errorMessage: `[SyncLabsDirect] Scene ${sceneId} job ${jobId} timed out after ${maxWaitMs / 1000}s` };
}
