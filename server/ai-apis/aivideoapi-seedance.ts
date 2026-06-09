/**
 * aivideoapi.ai — Seedance 2.0 (full quality, 1080p capable)
 *
 * Used as a secondary provider for cinematic scenes that require 1080p output.
 * WaveSpeed is retained for Seedance 2.0 Fast and InfiniteTalk lip-sync.
 *
 * Pricing (pay-as-you-go credits, 1 cr = $0.005 USD):
 *   480p: 18 cr/s  (~$0.09/s)
 *   720p: 38 cr/s  (~$0.19/s)
 *  1080p: 95 cr/s  (~$0.475/s)
 *  With video reference: 12 / 25 / 62 cr/s respectively
 *
 * Docs: https://aivideoapi.ai/docs/video-generation/seedance-2
 */

const BASE_URL = "https://api.aivideoapi.ai";

export type AiVideoApiResolution = "480p" | "720p" | "1080p";
export type AiVideoApiAspectRatio =
  | "16:9"
  | "4:3"
  | "1:1"
  | "3:4"
  | "9:16"
  | "21:9"
  | "adaptive";

export interface AiVideoApiSubmitParams {
  prompt: string;
  duration?: number; // 4–15 seconds, default 5
  resolution?: AiVideoApiResolution; // default "720p"
  aspectRatio?: AiVideoApiAspectRatio; // default "16:9"
  imageUrls?: string[]; // up to 9 reference images (omni_reference mode)
  videoUrls?: string[]; // up to 3 reference videos
  audioUrls?: string[]; // up to 3 reference audio files
  generateAudio?: boolean; // default true — disable to avoid unwanted background audio
  seed?: number;
}

export interface AiVideoApiSubmitResult {
  taskId: string;
}

export interface AiVideoApiPollResult {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  errorMessage?: string;
}

function getApiKey(): string {
  const key = process.env.AIVIDEOAPI_API_KEY;
  if (!key) throw new Error("AIVIDEOAPI_API_KEY is not set");
  return key;
}

/**
 * Submit a Seedance 2.0 generation task to aivideoapi.ai.
 * Returns the taskId for subsequent polling.
 */
export async function submitAiVideoApiSeedance(
  params: AiVideoApiSubmitParams
): Promise<AiVideoApiSubmitResult> {
  const apiKey = getApiKey();

  const body: Record<string, unknown> = {
    model: "doubao-seedance-2.0",
    input: {
      prompt: params.prompt,
      duration: params.duration ?? 5,
      resolution: params.resolution ?? "720p",
      aspect_ratio: params.aspectRatio ?? "16:9",
      generate_audio: params.generateAudio ?? false, // default off — we handle audio separately
      watermark: false,
    },
  };

  const input = body.input as Record<string, unknown>;

  if (params.imageUrls && params.imageUrls.length > 0) {
    input.image_urls = params.imageUrls;
  }
  if (params.videoUrls && params.videoUrls.length > 0) {
    input.video_urls = params.videoUrls;
  }
  if (params.audioUrls && params.audioUrls.length > 0) {
    input.audio_urls = params.audioUrls;
  }
  if (params.seed !== undefined) {
    input.seed = params.seed;
  }

  const res = await fetch(`${BASE_URL}/v1/videos/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `aivideoapi.ai submit failed (${res.status}): ${text}`
    );
  }

  const json = (await res.json()) as {
    code: number;
    msg: string;
    data?: { taskId: string };
    error?: { code: string; message: string };
  };

  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(
      `aivideoapi.ai submit error: ${json.error?.message ?? json.msg}`
    );
  }

  return { taskId: json.data.taskId };
}

/**
 * Poll the status of a Seedance 2.0 task.
 * Returns status and videoUrl when completed.
 */
export async function pollAiVideoApiSeedance(
  taskId: string
): Promise<AiVideoApiPollResult> {
  const apiKey = getApiKey();

  const res = await fetch(`${BASE_URL}/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `aivideoapi.ai poll failed (${res.status}): ${text}`
    );
  }

  const json = (await res.json()) as {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    output?: {
      urls?: string[];
    };
    error?: { code: string; message: string };
  };

  if (json.status === "completed") {
    const videoUrl = json.output?.urls?.[0];
    if (!videoUrl) {
      return {
        status: "failed",
        errorMessage: "aivideoapi.ai completed but no video URL in output",
      };
    }
    return { status: "completed", videoUrl };
  }

  if (json.status === "failed") {
    return {
      status: "failed",
      errorMessage: json.error?.message ?? "aivideoapi.ai task failed",
    };
  }

  // pending or processing
  return { status: json.status };
}
