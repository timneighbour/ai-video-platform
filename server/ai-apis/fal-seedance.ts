/**
 * Seedance 2.0 via fal.ai Integration
 * Uses the @fal-ai/client package for queue-based async video generation.
 *
 * Models:
 *   - bytedance/seedance-2.0/text-to-video       (no reference image)
 *   - bytedance/seedance-2.0/image-to-video      (reference image as first frame)
 *   - bytedance/seedance-2.0/reference-to-video  (up to 9 images + 3 audio clips, native lip sync)
 *
 * Cost: ~$0.05–0.10 per 5s clip (much cheaper than Kling)
 * Quality: Cinematic, real-world physics, native audio
 *
 * API Key: FAL_AI_API_KEY env var (format: uuid:hex)
 */

import { fal } from "@fal-ai/client";

const T2V_MODEL_ID = "bytedance/seedance-2.0/text-to-video";
const I2V_MODEL_ID = "bytedance/seedance-2.0/image-to-video";
const R2V_MODEL_ID = "bytedance/seedance-2.0/reference-to-video";

function configureFal() {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not set");
  fal.config({ credentials: apiKey });
}

export interface FalSeedanceRequest {
  prompt: string;
  /** If provided, uses image-to-video (character portrait as first frame). */
  image_url?: string;
  aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "auto";
  duration?: "auto" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13" | "14" | "15";
  resolution?: "480p" | "720p" | "1080p";
  generate_audio?: boolean;
  seed?: number;
}

/**
 * Reference-to-video request — supports up to 9 images + 3 audio files.
 * When audio_urls are provided alongside image_urls, Seedance performs
 * native phoneme-level lip sync in a single generation pass.
 *
 * PROMPT SYNTAX: Reference inputs using @Image1, @Image2, @Audio1, @Audio2, etc.
 * Example: "@Image1 sings @Audio1 in a music video. Medium close-up, warm stage lighting. Lyrics: 'I can feel the rhythm'"
 */
export interface FalSeedanceR2VRequest {
  /** Prompt must reference inputs as @Image1, @Image2, @Audio1, @Audio2, etc. */
  prompt: string;
  /** Up to 9 reference image URLs (JPEG/PNG/WebP, max 30MB each). Referenced as @Image1, @Image2, etc. */
  image_urls: string[];
  /** Up to 3 reference audio URLs (MP3/WAV, combined max 15s). Referenced as @Audio1, etc. */
  audio_urls?: string[];
  aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "auto";
  duration?: "auto" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13" | "14" | "15";
  resolution?: "480p" | "720p" | "1080p";
  /** Whether to generate native audio (lip-synced speech, SFX, ambient). Defaults to true when audio_urls provided. */
  generate_audio?: boolean;
  seed?: number;
}

export interface FalSeedanceResult {
  videoUrl: string;
  seed?: number;
  requestId: string;
}

/**
 * Submit a video generation request to Seedance 2.0 via fal.ai queue.
 * Automatically selects image-to-video when image_url is provided.
 * Returns a request ID for async polling.
 */
export async function submitFalSeedanceVideo(request: FalSeedanceRequest): Promise<string> {
  configureFal();
  const ts = new Date().toISOString();
  const modelId = request.image_url ? I2V_MODEL_ID : T2V_MODEL_ID;
  const mode = request.image_url ? "i2v" : "t2v";
  console.log(`[FalSeedance] ${ts} submit START (${mode}) — prompt="${request.prompt.slice(0, 80)}..."`);
  if (request.image_url) {
    console.log(`[FalSeedance] i2v image_url=${request.image_url.slice(0, 80)}...`);
  }

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    aspect_ratio: request.aspect_ratio || "16:9",
    duration: request.duration || "5",
    resolution: request.resolution || "720p",
    generate_audio: request.generate_audio ?? false, // music video — audio from track
    ...(request.seed !== undefined ? { seed: request.seed } : {}),
  };

  // image-to-video requires image_url
  if (request.image_url) {
    input.image_url = request.image_url;
  }

  const { request_id } = await fal.queue.submit(modelId, { input });

  console.log(`[FalSeedance] ${ts} submit OK (${mode}) — request_id=${request_id}`);
  return request_id;
}

/**
 * Poll the status of a Seedance video generation request.
 * Supports both t2v and i2v model IDs (auto-detected from requestId prefix is not needed
 * because fal.ai uses the same polling API for both models).
 * Returns null if still in progress, or the result if complete.
 * Throws if the job failed.
 */
export async function pollFalSeedanceVideo(
  requestId: string,
  modelId: string = T2V_MODEL_ID
): Promise<FalSeedanceResult | null> {
  configureFal();

  const status = await fal.queue.status(modelId, {
    requestId,
    logs: false,
  });

  console.log(`[FalSeedance] poll request_id=${requestId} model=${modelId} status=${status.status}`);

  if (status.status === "COMPLETED") {
    const result = await fal.queue.result(modelId, { requestId });
    const data = result.data as { video: { url: string }; seed?: number };
    return {
      videoUrl: data.video.url,
      seed: data.seed,
      requestId,
    };
  }

  // Check for failure via error property or unexpected status
  const statusStr = status.status as string;
  if (statusStr === "FAILED" || statusStr === "ERROR") {
    throw new Error(`Seedance (fal.ai) generation failed for request ${requestId} (model=${modelId})`);
  }

  // IN_QUEUE or IN_PROGRESS — still running
  return null;
}

/**
 * Generate a video synchronously (blocking until complete or timeout).
 * Suitable for background jobs. Timeout: 5 minutes.
 */
export async function generateFalSeedanceVideoSync(
  request: FalSeedanceRequest,
  timeoutMs = 300_000
): Promise<FalSeedanceResult> {
  configureFal();
  const ts = new Date().toISOString();
  const modelId = request.image_url ? I2V_MODEL_ID : T2V_MODEL_ID;
  const mode = request.image_url ? "i2v" : "t2v";
  console.log(`[FalSeedance] ${ts} generateSync START (${mode}) — prompt="${request.prompt.slice(0, 80)}..."`);

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    aspect_ratio: request.aspect_ratio || "16:9",
    duration: request.duration || "5",
    resolution: request.resolution || "720p",
    generate_audio: request.generate_audio ?? false,
    ...(request.seed !== undefined ? { seed: request.seed } : {}),
  };

  if (request.image_url) {
    input.image_url = request.image_url;
  }

  const result = await fal.subscribe(modelId, {
    input,
    pollInterval: 5000,
    timeout: timeoutMs,
    logs: false,
  });

  const data = result.data as { video: { url: string }; seed?: number };
  console.log(`[FalSeedance] generateSync DONE (${mode}) — url=${data.video.url}`);

  return {
    videoUrl: data.video.url,
    seed: data.seed,
    requestId: result.requestId,
  };
}

/**
 * Submit a reference-to-video request to Seedance 2.0 via fal.ai queue.
 * This is the premium endpoint: accepts up to 9 images + 3 audio clips.
 * When audio is provided, Seedance performs native phoneme-level lip sync.
 *
 * IMPORTANT: The prompt must reference inputs using @Image1, @Audio1 syntax.
 * Example: "@Image1 sings @Audio1 in a music video. Medium close-up, warm stage lighting."
 *
 * Returns a request ID for async polling (use FAL_R2V_MODEL_ID when polling).
 */
export async function submitFalSeedanceR2V(request: FalSeedanceR2VRequest): Promise<string> {
  configureFal();
  const ts = new Date().toISOString();
  const hasAudio = (request.audio_urls?.length ?? 0) > 0;
  const mode = hasAudio ? "r2v+audio (native lip sync)" : "r2v";
  console.log(`[FalSeedance] ${ts} submit START (${mode}) — prompt="${request.prompt.slice(0, 100)}..."`);
  console.log(`[FalSeedance] r2v images=${request.image_urls.length} audios=${request.audio_urls?.length ?? 0}`);
  if (request.image_urls[0]) console.log(`[FalSeedance] r2v @Image1=${request.image_urls[0].slice(0, 80)}...`);
  if (request.audio_urls?.[0]) console.log(`[FalSeedance] r2v @Audio1=${request.audio_urls[0].slice(0, 80)}...`);

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    image_urls: request.image_urls,
    aspect_ratio: request.aspect_ratio || "16:9",
    duration: request.duration || "auto",
    resolution: request.resolution || "720p",
    // When audio is provided, generate_audio=true enables native lip sync
    generate_audio: request.generate_audio ?? (hasAudio ? true : false),
    ...(request.seed !== undefined ? { seed: request.seed } : {}),
  };
  if (hasAudio && request.audio_urls) {
    input.audio_urls = request.audio_urls;
  }

  const { request_id } = await fal.queue.submit(R2V_MODEL_ID, { input });
  console.log(`[FalSeedance] ${ts} submit OK (${mode}) — request_id=${request_id}`);
  return request_id;
}

/** Exported model IDs for use in polling logic */
export const FAL_T2V_MODEL_ID = T2V_MODEL_ID;
export const FAL_I2V_MODEL_ID = I2V_MODEL_ID;
export const FAL_R2V_MODEL_ID = R2V_MODEL_ID;
