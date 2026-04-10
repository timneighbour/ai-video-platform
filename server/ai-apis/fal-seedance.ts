/**
 * Seedance 2.0 via fal.ai Integration
 * Uses the @fal-ai/client package for queue-based async video generation.
 *
 * Model: bytedance/seedance-2.0/text-to-video
 * Cost: ~$0.05–0.10 per 5s clip (much cheaper than Kling)
 * Quality: Cinematic, real-world physics, native audio
 *
 * API Key: FAL_AI_API_KEY env var (format: uuid:hex)
 */

import { fal } from "@fal-ai/client";

const MODEL_ID = "bytedance/seedance-2.0/text-to-video";

function configureFal() {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not set");
  fal.config({ credentials: apiKey });
}

export interface FalSeedanceRequest {
  prompt: string;
  aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "auto";
  duration?: "auto" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13" | "14" | "15";
  resolution?: "480p" | "720p";
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
 * Returns a request ID for async polling.
 */
export async function submitFalSeedanceVideo(request: FalSeedanceRequest): Promise<string> {
  configureFal();
  const ts = new Date().toISOString();
  console.log(`[FalSeedance] ${ts} submit START — prompt="${request.prompt.slice(0, 80)}..."`);

  const { request_id } = await fal.queue.submit(MODEL_ID, {
    input: {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio || "16:9",
      duration: request.duration || "5",
      resolution: request.resolution || "720p",
      generate_audio: request.generate_audio ?? true,
      ...(request.seed !== undefined ? { seed: request.seed } : {}),
    },
  });

  console.log(`[FalSeedance] ${ts} submit OK — request_id=${request_id}`);
  return request_id;
}

/**
 * Poll the status of a Seedance video generation request.
 * Returns null if still in progress, or the result if complete.
 * Throws if the job failed.
 */
export async function pollFalSeedanceVideo(requestId: string): Promise<FalSeedanceResult | null> {
  configureFal();

  const status = await fal.queue.status(MODEL_ID, {
    requestId,
    logs: false,
  });

  console.log(`[FalSeedance] poll request_id=${requestId} status=${status.status}`);

  if (status.status === "COMPLETED") {
    const result = await fal.queue.result(MODEL_ID, { requestId });
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
    throw new Error(`Seedance (fal.ai) generation failed for request ${requestId}`);
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
  console.log(`[FalSeedance] ${ts} generateSync START — prompt="${request.prompt.slice(0, 80)}..."`);

  const result = await fal.subscribe(MODEL_ID, {
    input: {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio || "16:9",
      duration: request.duration || "5",
      resolution: request.resolution || "720p",
      generate_audio: request.generate_audio ?? true,
      ...(request.seed !== undefined ? { seed: request.seed } : {}),
    },
    pollInterval: 5000,
    timeout: timeoutMs,
    logs: false,
  });

  const data = result.data as { video: { url: string }; seed?: number };
  console.log(`[FalSeedance] generateSync DONE — url=${data.video.url}`);

  return {
    videoUrl: data.video.url,
    seed: data.seed,
    requestId: result.requestId,
  };
}
