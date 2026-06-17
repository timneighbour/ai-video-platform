/**
 * HeyGen Direct Photo + Audio → Lip-Synced Video
 *
 * Uses HeyGen's v3 /videos endpoint with type="image" to generate a
 * lip-synced singing/talking video directly from a portrait photo + audio file.
 *
 * This is the PRIMARY pipeline for ALL performance scenes in music videos.
 * It REPLACES the broken Seedance → HeyGen Precision video-to-video path.
 *
 * Why this works better:
 *   - No Seedance render needed — HeyGen animates the photo directly
 *   - No "No speaker detected" errors — HeyGen controls the face from scratch
 *   - Optimised for singing/music (Avatar IV model)
 *   - One API call: photo URL + audio URL → lip-synced video
 *   - Consistent character identity (same photo = same face every time)
 *
 * API Reference:
 *   POST https://api.heygen.com/v3/videos   (type: "image")
 *   GET  https://api.heygen.com/v3/videos/{video_id}
 *   POST https://api.heygen.com/v3/assets   (upload image/audio)
 *
 * IMPORTANT: HeyGen cannot access private CloudFront/S3 URLs.
 * Both the image and audio must be uploaded to HeyGen's own /v3/assets
 * storage before submitting the job. Use audio_asset_id and
 * image: { type: "asset_id", asset_id: "..." } in the payload.
 *
 * Pricing: credits per second of output video.
 *
 * Fallback: Sync Labs (synclabs-direct.ts) if HeyGen fails or is out of credits.
 */

import axios from "axios";
import FormData from "form-data";
import { ENV } from "../_core/env";

const HEYGEN_API_BASE = "https://api.heygen.com";

function getKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("[HeyGenDirect] HEYGEN_API_KEY is not set");
  return key;
}

export function isHeyGenDirectConfigured(): boolean {
  return !!process.env.HEYGEN_API_KEY;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeyGenDirectInput {
  /** Manus storage key or full URL of the character portrait (JPEG/PNG, face clearly visible) */
  imageUrl: string;
  /** Manus storage key or full URL of the audio file (MP3/WAV, the vocal stem or full mix) */
  audioUrl: string;
  /** Scene identifier for logging */
  sceneId: number | string;
  /** Output aspect ratio — defaults to 16:9 for music videos */
  aspectRatio?: "16:9" | "9:16" | "1:1";
  /** Output resolution — defaults to 720p */
  resolution?: "360p" | "480p" | "720p" | "1080p";
  /** How to fit the image in the frame — "cover" fills, "contain" letterboxes */
  fit?: "cover" | "contain" | "crop";
  /** Optional idempotency key to prevent duplicate submissions */
  idempotencyKey?: string;
  /** Optional title for logging/audit */
  title?: string;
  /** Duration hint in seconds (used for cost estimation only, not passed to API) */
  durationSeconds?: number;
}

export interface HeyGenDirectResult {
  videoId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  duration?: number;
  errorMessage?: string;
}

// ─── Asset Upload ─────────────────────────────────────────────────────────────

/**
 * Download a file from Manus storage.
 * Gets the presigned URL and downloads it with auth headers.
 */
async function downloadFromManusStorage(
  storageKey: string,
  label: string
): Promise<Buffer> {
  console.log(
    `[HeyGenDirect] Downloading ${label}: ${storageKey.substring(0, 100)}`
  );

  // If the input is already a full URL (files.manuscdn.com, CloudFront, etc.),
  // download it directly — no storageGet presigning needed.
  if (storageKey.startsWith("https://") || storageKey.startsWith("http://")) {
    const dlResp = await fetch(storageKey, { method: "GET" });
    if (!dlResp.ok) {
      throw new Error(
        `[HeyGenDirect] Failed to download ${label} from URL: HTTP ${dlResp.status}`
      );
    }
    const buffer = Buffer.from(await dlResp.arrayBuffer());
    console.log(`[HeyGenDirect] Downloaded ${label} (direct URL): ${buffer.length} bytes`);
    return buffer;
  }

  // For relative storage keys, use storageGet to get a presigned URL
  const { storageGet } = await import("../storage");
  const { url: presignedUrl } = await storageGet(storageKey);
  const forgeApiKey = ENV.forgeApiKey;
  if (!forgeApiKey) {
    throw new Error(
      `[HeyGenDirect] Storage credentials missing for downloading ${label}`
    );
  }
  const dlResp = await fetch(presignedUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${forgeApiKey}` },
  });
  if (!dlResp.ok) {
    throw new Error(
      `[HeyGenDirect] Failed to download ${label} from storage: HTTP ${dlResp.status}`
    );
  }
  const buffer = Buffer.from(await dlResp.arrayBuffer());
  console.log(`[HeyGenDirect] Downloaded ${label}: ${buffer.length} bytes`);
  return buffer;
}

/**
 * Upload a file (image or audio) to HeyGen's /v3/assets storage.
 * HeyGen cannot access private CloudFront/S3 URLs — all media must be
 * uploaded to HeyGen's own storage before submitting jobs.
 *
 * Accepts either:
 * - A Manus storage key (e.g., "310519663500868908/ALJHDNsuNA7bExFuoQZUsx/image.png")
 * - A Buffer
 *
 * Returns the asset_id for use in job submission.
 */
async function uploadAssetToHeyGen(
  storageKeyOrBuffer: string | Buffer,
  mimeType: "image/jpeg" | "image/png" | "audio/mpeg" | "audio/wav",
  label: string
): Promise<string> {
  const key = getKey();

  let buffer: Buffer;
  if (typeof storageKeyOrBuffer === "string") {
    // Download from Manus storage using auth headers
    buffer = await downloadFromManusStorage(storageKeyOrBuffer, label);
  } else {
    console.log(
      `[HeyGenDirect] Uploading ${label} buffer (${storageKeyOrBuffer.length} bytes) to HeyGen asset storage...`
    );
    buffer = storageKeyOrBuffer;
  }

  const ext =
    mimeType === "image/jpeg" ? "jpg" :
    mimeType === "image/png"  ? "png" :
    mimeType === "audio/wav"  ? "wav" : "mp3";

  const form = new FormData();
  form.append("file", buffer, { filename: `asset.${ext}`, contentType: mimeType });

  const uploadResp = await axios.post(
    `${HEYGEN_API_BASE}/v3/assets`,
    form,
    {
      headers: {
        "X-Api-Key": key,
        ...form.getHeaders(),
      },
      timeout: 120_000, // 2 min for large files
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  const assetId: string = uploadResp.data?.data?.asset_id;
  if (!assetId) {
    throw new Error(
      `[HeyGenDirect] Asset upload failed for ${label}: ${JSON.stringify(uploadResp.data).slice(0, 300)}`
    );
  }

  console.log(`[HeyGenDirect] ${label} uploaded → asset_id: ${assetId}`);
  return assetId;
}

// ─── Submit ───────────────────────────────────────────────────────────────────

/**
 * Submit a HeyGen direct photo + audio job.
 *
 * Uploads both the image and audio to HeyGen's /v3/assets storage first,
 * then submits the job using asset_ids (not URLs) to avoid CloudFront 403 errors.
 *
 * Returns the video_id for polling.
 */
export async function submitHeyGenDirectPhoto(
  input: HeyGenDirectInput
): Promise<string> {
  const {
    imageUrl,
    audioUrl,
    sceneId,
    aspectRatio = "16:9",
    resolution = "720p",
    fit = "cover",
    idempotencyKey,
  } = input;

  console.log(
    `[HeyGenDirect] Scene ${sceneId} — uploading assets to HeyGen storage...`
  );

  // Determine MIME types from URL extension or assume defaults
  // Note: imageUrl and audioUrl are expected to be Manus storage keys
  // (e.g., "userId/jobId/image.png") or full CloudFront URLs
  const audioMime: "audio/mpeg" | "audio/wav" =
    audioUrl.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg";
  const imageMime: "image/jpeg" | "image/png" =
    imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  // Upload both assets in parallel
  // If imageUrl/audioUrl are Manus storage keys, they'll be downloaded with auth headers.
  // If they're full URLs, they'll be treated as buffers (not recommended for external URLs).
  const [imageAssetId, audioAssetId] = await Promise.all([
    uploadAssetToHeyGen(imageUrl, imageMime, `image[scene=${sceneId}]`),
    uploadAssetToHeyGen(audioUrl, audioMime, `audio[scene=${sceneId}]`),
  ]);

  console.log(
    `[HeyGenDirect] Scene ${sceneId} assets ready — ` +
    `imageAssetId: ${imageAssetId} | audioAssetId: ${audioAssetId}`
  );

  // Build the v3 video payload using asset_ids (not URLs)
  const payload: Record<string, unknown> = {
    type: "image",
    image: {
      type: "asset_id",
      asset_id: imageAssetId,
    },
    audio_asset_id: audioAssetId,
    resolution,
    aspect_ratio: aspectRatio,
    fit,
    output_format: "mp4",
  };

  const reqHeaders: Record<string, string> = {
    "x-api-key": getKey(),
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    reqHeaders["Idempotency-Key"] = idempotencyKey;
  }

  console.log(
    `[HeyGenDirect] Scene ${sceneId} submitting photo+audio job — ` +
    `ratio: ${aspectRatio} | res: ${resolution} | fit: ${fit}`
  );

  const resp = await axios.post(
    `${HEYGEN_API_BASE}/v3/videos`,
    payload,
    { headers: reqHeaders, timeout: 30_000 }
  );

  const videoId: string = resp.data?.data?.video_id ?? resp.data?.video_id;
  if (!videoId) {
    throw new Error(
      `[HeyGenDirect] Scene ${sceneId} submit failed — no video_id in response: ${JSON.stringify(resp.data).slice(0, 300)}`
    );
  }

  console.log(`[HeyGenDirect] Scene ${sceneId} submitted → video_id: ${videoId}`);
  return videoId;
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

/**
 * Poll a HeyGen direct photo job for its current status.
 */
export async function pollHeyGenDirectPhoto(
  videoId: string,
  sceneId: number | string
): Promise<HeyGenDirectResult> {
  const resp = await axios.get(
    `${HEYGEN_API_BASE}/v3/videos/${videoId}`,
    {
      headers: { "x-api-key": getKey() },
      timeout: 15_000,
    }
  );

  const data = resp.data?.data;
  const status: string = data?.status ?? "pending";

  if (status === "completed") {
    const videoUrl: string = data?.video_url ?? data?.output_url ?? data?.url ?? "";
    const duration: number = data?.duration ?? 0;
    console.log(
      `[HeyGenDirect] Scene ${sceneId} job ${videoId} COMPLETED — ` +
      `url: ${videoUrl.slice(0, 80)}... | duration: ${duration}s`
    );
    return { videoId, status: "completed", videoUrl, duration };
  }

  if (status === "failed" || status === "error") {
    const errorMessage: string =
      data?.failure_message ??
      data?.error?.message ??
      data?.error_message ??
      data?.message ??
      "Unknown error";
    console.error(
      `[HeyGenDirect] Scene ${sceneId} job ${videoId} FAILED — ${errorMessage}`
    );
    return { videoId, status: "failed", errorMessage };
  }

  // Still pending/processing/waiting
  return { videoId, status: status as "pending" | "processing" };
}

// ─── Poll with retry ──────────────────────────────────────────────────────────

/**
 * Poll until completed or failed, with exponential backoff.
 * Max wait: ~10 minutes (suitable for 5-30s clips).
 */
export async function pollHeyGenDirectPhotoUntilDone(
  videoId: string,
  sceneId: number | string,
  maxWaitMs = 10 * 60 * 1000
): Promise<HeyGenDirectResult> {
  const startMs = Date.now();
  let intervalMs = 5_000;

  while (Date.now() - startMs < maxWaitMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const result = await pollHeyGenDirectPhoto(videoId, sceneId);
    if (result.status === "completed" || result.status === "failed") {
      return result;
    }
    // Backoff: 5s → 10s → 15s → cap at 20s
    intervalMs = Math.min(intervalMs + 5_000, 20_000);
  }

  return {
    videoId,
    status: "failed",
    errorMessage: `[HeyGenDirect] Scene ${sceneId} job ${videoId} timed out after ${maxWaitMs / 1000}s`,
  };
}

// ─── Submit + poll (convenience) ─────────────────────────────────────────────

/**
 * Submit and poll in one call. Suitable for short clips where you want
 * to block until done (e.g., probe scenes, test runs).
 */
export async function generateHeyGenDirectPhoto(
  input: HeyGenDirectInput
): Promise<HeyGenDirectResult> {
  const videoId = await submitHeyGenDirectPhoto(input);
  return pollHeyGenDirectPhotoUntilDone(videoId, input.sceneId);
}

// ─── Cost estimate ────────────────────────────────────────────────────────────

/**
 * Rough cost estimate in USD for a HeyGen direct photo job.
 * Based on HeyGen's credit pricing (1 credit ≈ $0.01, ~10 credits/second for 720p).
 */
export function estimateHeyGenDirectCost(
  durationSeconds: number,
  resolution: "360p" | "480p" | "720p" | "1080p" = "720p"
): number {
  const creditsPerSecond: Record<string, number> = {
    "360p": 5,
    "480p": 8,
    "720p": 10,
    "1080p": 15,
  };
  const credits = (creditsPerSecond[resolution] ?? 10) * durationSeconds;
  return credits * 0.01; // $0.01 per credit
}
