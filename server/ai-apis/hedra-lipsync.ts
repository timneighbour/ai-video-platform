/**
 * Hedra Avatar Lip Sync Service
 *
 * VERIFIED WORKING — tested live 2026-05-19
 *
 * Hedra is the correct tool for Performance Mode scenes:
 *   - Takes a still portrait image + isolated vocal audio
 *   - Generates a fully animated talking/singing face video with accurate phoneme sync
 *   - Does NOT require pre-existing mouth movement in the input
 *   - Model: Hedra Character 3 (d1dd37a3-e39a-4854-a298-6510289f9cf2) — flagship lip sync
 *
 * API base: https://api.hedra.com/web-app/public
 * Auth: X-API-Key header
 *
 * VERIFIED Flow:
 *   1. POST /assets { name, type: "audio" } → get audio_asset_id
 *   2. POST /assets/{audio_asset_id}/upload (multipart/form-data with curl) → upload audio
 *   3. POST /assets { name, type: "image" } → get image_asset_id
 *   4. POST /assets/{image_asset_id}/upload (multipart/form-data with curl) → upload image
 *   5. POST /generations { type, ai_model_id, start_keyframe_id, audio_id, generated_video_inputs }
 *   6. Poll GET /generations (list) until data[0].status === "complete"
 *   7. Output URL: data[0].asset.asset.download_url (Mux MP4 download link)
 *
 * NOTE: GET /generations/{id} returns 404 — must use the list endpoint for polling
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const HEDRA_BASE_URL = "https://api.hedra.com/web-app/public";

// Hedra Character 3 — flagship model with effortless facial animation and synced lip-movement
const HEDRA_CHARACTER_3_MODEL_ID = "d1dd37a3-e39a-4854-a298-6510289f9cf2";
// Hedra Avatar — longform avatar model, up to 10 minutes
const HEDRA_AVATAR_MODEL_ID = "26f0fc66-152b-40ab-abed-76c43df99bc8";

const POLL_INTERVAL_MS = 8000;
const DEFAULT_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes

export interface HedraLipSyncOptions {
  /** URL of the portrait image (hero frame — chest-up close-up, face forward) */
  imageUrl: string;
  /** URL of the isolated vocals audio (from Demucs — NO instrumentals) */
  audioUrl: string;
  /** Scene ID for logging */
  sceneId?: number;
  /** Aspect ratio — default 9:16 for portrait performance shots */
  aspectRatio?: "9:16" | "16:9" | "1:1";
  /** Output resolution */
  resolution?: "720p" | "1080p";
  /** Text prompt to guide the animation style */
  textPrompt?: string;
}

export interface HedraLipSyncResult {
  generationId: string;
  outputUrl: string;
  provider: "hedra";
  sceneId?: number;
}

function getApiKey(): string {
  const key = process.env.HEDRA_API_KEY;
  if (!key) throw new Error("HEDRA_API_KEY not configured");
  return key;
}

async function hedraJsonPost(endpoint: string, body: object): Promise<any> {
  const key = getApiKey();
  const res = await fetch(`${HEDRA_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Hedra POST ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

/**
 * Upload a file to Hedra using curl (multipart/form-data).
 * The fetch + form-data approach fails with "error parsing body" — curl works reliably.
 */
function uploadFileWithCurl(assetId: string, filePath: string): void {
  const key = getApiKey();
  const result = execSync(
    `curl -s -X POST '${HEDRA_BASE_URL}/assets/${assetId}/upload' -H 'X-API-Key: ${key}' -F 'file=@${filePath}'`,
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(result);
  if (!parsed.id) {
    throw new Error(`Hedra upload failed for asset ${assetId}: ${result}`);
  }
}

/**
 * Download a file from a URL to a local temp path.
 */
async function downloadToTemp(url: string, ext: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `hedra-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

/**
 * Submit a Hedra lip sync generation job.
 * Returns the generation ID.
 */
export async function submitHedraLipSync(options: HedraLipSyncOptions): Promise<string> {
  const sceneLabel = options.sceneId ?? "unknown";
  console.log(`[HedraLipSync] Starting job for scene ${sceneLabel}`);

  // Download files to temp
  const [audioTmp, imageTmp] = await Promise.all([
    downloadToTemp(options.audioUrl, ".mp3"),
    downloadToTemp(options.imageUrl, ".jpg"),
  ]);

  try {
    // Create asset records
    const [audioAsset, imageAsset] = await Promise.all([
      hedraJsonPost("/assets", { name: `hedra-vocals-${sceneLabel}.mp3`, type: "audio" }),
      hedraJsonPost("/assets", { name: `hedra-portrait-${sceneLabel}.jpg`, type: "image" }),
    ]);

    console.log(`[HedraLipSync] Assets created: audio=${audioAsset.id} image=${imageAsset.id}`);

    // Upload files (must be sequential — curl-based)
    uploadFileWithCurl(audioAsset.id, audioTmp);
    uploadFileWithCurl(imageAsset.id, imageTmp);

    console.log(`[HedraLipSync] Files uploaded successfully`);

    // Submit generation
    const gen = await hedraJsonPost("/generations", {
      type: "video",
      ai_model_id: HEDRA_CHARACTER_3_MODEL_ID,
      start_keyframe_id: imageAsset.id,
      audio_id: audioAsset.id,
      generated_video_inputs: {
        text_prompt: options.textPrompt ??
          "A singer performing expressively to the camera, mouth moving naturally with the music, emotional vocal performance, realistic lip sync",
        aspect_ratio: options.aspectRatio ?? "9:16",
        resolution: options.resolution ?? "720p",
      },
    });

    console.log(`[HedraLipSync] Generation submitted: ${gen.id} (ETA: ${gen.eta_sec ?? "?"}s)`);
    return gen.id;
  } finally {
    try { fs.unlinkSync(audioTmp); } catch {}
    try { fs.unlinkSync(imageTmp); } catch {}
  }
}

/**
 * Poll Hedra for a generation result.
 * Uses GET /generations (list) because GET /generations/{id} returns 404.
 * Returns the MP4 download URL.
 */
export async function pollHedraLipSync(
  generationId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  const key = getApiKey();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${HEDRA_BASE_URL}/generations`, {
      headers: { "X-API-Key": key },
    });
    if (!res.ok) {
      console.warn(`[HedraLipSync] Poll failed: ${res.status}`);
      continue;
    }

    const data = await res.json() as any;
    const gen = (data.data as any[]).find((g: any) => g.id === generationId);

    if (!gen) {
      console.warn(`[HedraLipSync] Generation ${generationId} not found in list`);
      continue;
    }

    const pct = gen.progress !== undefined ? `${Math.round(gen.progress * 100)}%` : "N/A";
    console.log(`[HedraLipSync] ${generationId} — status: ${gen.status} progress: ${pct} eta: ${gen.eta_sec ?? "?"}s`);

    if (gen.status === "complete") {
      // Output URL is at gen.asset.asset.download_url (Mux MP4)
      const downloadUrl = gen?.asset?.asset?.download_url;
      if (!downloadUrl) {
        throw new Error(`[HedraLipSync] Generation ${generationId} complete but no download_url`);
      }
      console.log(`[HedraLipSync] COMPLETE — output: ${downloadUrl.slice(0, 80)}...`);
      return downloadUrl;
    }

    if (gen.status === "failed" || gen.status === "error") {
      throw new Error(`[HedraLipSync] Generation ${generationId} failed: ${gen.error_message ?? gen.error ?? "unknown"}`);
    }
  }

  throw new Error(`[HedraLipSync] Generation ${generationId} timed out after ${timeoutMs / 1000}s`);
}

/**
 * Submit and wait for a Hedra lip sync job.
 * Convenience wrapper combining submit + poll.
 */
export async function waitForHedraLipSync(
  options: HedraLipSyncOptions,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<HedraLipSyncResult> {
  const generationId = await submitHedraLipSync(options);
  const outputUrl = await pollHedraLipSync(generationId, timeoutMs);
  return {
    generationId,
    outputUrl,
    provider: "hedra",
    sceneId: options.sceneId,
  };
}

/**
 * Check if Hedra is configured and available.
 */
export function isHedraConfigured(): boolean {
  return !!process.env.HEDRA_API_KEY;
}
