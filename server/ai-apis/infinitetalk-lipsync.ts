/**
 * WaveSpeed AI InfiniteTalk Lip Sync
 * ====================================
 * Wraps the WaveSpeed AI `wavespeed-ai/infinitetalk` endpoint.
 *
 * InfiniteTalk takes a **static character image** + **audio track** and produces
 * a lip-synced video of the character singing/speaking to that audio.
 *
 * This is used for PERFORMANCE scenes in the hybrid pipeline:
 *   character image + isolated vocal stem → InfiniteTalk → lip-synced video
 *
 * Cinematic scenes continue to use Seedance (no lip sync needed).
 *
 * API flow (identical to other WaveSpeed v3 models):
 *   1. POST /api/v3/wavespeed-ai/infinitetalk
 *      Body: { image: "<url>", audio: "<url>", prompt?: string, resolution?: "480p"|"720p", seed?: number }
 *      → returns { code, message, data: { id, status, ... } }
 *      → data.id is the prediction/task ID
 *
 *   2. GET /api/v3/predictions/{id}/result
 *      → returns { code, message, data: { id, status, outputs: [videoUrl] } }
 *      → status: "pending" | "processing" | "completed" | "failed" | "created"
 *      → when completed: outputs[0] = lip-synced video URL
 *
 * Pricing:
 *   480p: $0.03/second (minimum 5s = $0.15)
 *   720p: $0.06/second (minimum 5s = $0.30)
 *
 * Docs: https://www.wavespeed.ai/models/wavespeed-ai/infinitetalk
 */

import axios from "axios";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";
const INFINITETALK_MODEL = "wavespeed-ai/infinitetalk";

// Default resolution — 720p for quality; can be overridden per call
const DEFAULT_RESOLUTION: InfiniteTalkResolution = "720p";

// ─── Types ──────────────────────────────────────────────────────────────────

export type InfiniteTalkStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "created";

export type InfiniteTalkResolution = "480p" | "720p";

export interface InfiniteTalkSubmitParams {
  /** Publicly accessible URL of the character image (full headshot, 16:9 or portrait) */
  imageUrl: string;
  /** Publicly accessible URL of the isolated vocal stem audio file */
  audioUrl: string;
  /** Optional prompt to guide the visual style / expression */
  prompt?: string;
  /** Video resolution — 480p ($0.03/s) or 720p ($0.06/s). Defaults to 720p. */
  resolution?: InfiniteTalkResolution;
  /** Optional seed for reproducibility */
  seed?: number;
}

export interface InfiniteTalkSubmitResult {
  /** WaveSpeed prediction ID — store on the scene row as lipSyncTaskId */
  taskId: string;
}

export interface InfiniteTalkPollResult {
  status: InfiniteTalkStatus;
  /** Lip-synced video URL (available when status=completed) */
  videoUrl?: string;
  /** Error message (available when status=failed) */
  errorMessage?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("[InfiniteTalk] WAVESPEED_API_KEY is not set");
  return key;
}

/**
 * Extract the inner `data` object from the WaveSpeed v3 API envelope.
 * All v3 responses are wrapped in: { code, message, data: { ... } }
 */
function extractData(responseData: any): any {
  if (responseData?.data && typeof responseData.data === "object" && responseData.data.id) {
    return responseData.data;
  }
  return responseData;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Submit a lip sync job to WaveSpeed InfiniteTalk.
 *
 * Used for PERFORMANCE scenes: character image + isolated vocal stem → lip-synced video.
 * Skips Seedance entirely for performance scenes — InfiniteTalk generates the final clip.
 *
 * @param params - { imageUrl, audioUrl, prompt?, resolution?, seed? }
 * @returns InfiniteTalkSubmitResult with taskId to store as scene.lipSyncTaskId
 */
export async function submitInfiniteTalkLipSync(
  params: InfiniteTalkSubmitParams
): Promise<InfiniteTalkSubmitResult> {
  const key = getApiKey();
  const resolution = params.resolution ?? DEFAULT_RESOLUTION;

  console.log(
    `[InfiniteTalk] Submitting lip sync — image: ${params.imageUrl.slice(0, 80)}... audio: ${params.audioUrl.slice(0, 80)}... resolution: ${resolution}`
  );

  const body: Record<string, any> = {
    image: params.imageUrl,
    audio: params.audioUrl,
    resolution,
  };
  if (params.prompt) body.prompt = params.prompt;
  if (params.seed !== undefined) body.seed = params.seed;

  try {
    const response = await axios.post(
      `${WAVESPEED_API_BASE}/${INFINITETALK_MODEL}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const data = extractData(response.data);
    const taskId = data?.id;

    if (!taskId) {
      throw new Error(
        `[InfiniteTalk] No task ID in submit response: ${JSON.stringify(response.data)}`
      );
    }

    console.log(`[InfiniteTalk] Submitted → taskId=${taskId}, status=${data.status}`);
    return { taskId };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(`[InfiniteTalk] Submit error: ${status} ${detail}`);
    }
    throw error;
  }
}

/**
 * Poll the status of a WaveSpeed InfiniteTalk prediction.
 * Call repeatedly (every 10-15 seconds) until status is "completed" or "failed".
 *
 * @param taskId - The prediction ID returned by submitInfiniteTalkLipSync
 * @returns InfiniteTalkPollResult with status and videoUrl when done
 */
export async function pollInfiniteTalkLipSync(
  taskId: string
): Promise<InfiniteTalkPollResult> {
  const key = getApiKey();

  try {
    const response = await axios.get(
      `${WAVESPEED_API_BASE}/predictions/${taskId}/result`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
        },
        timeout: 15000,
      }
    );

    const data = extractData(response.data);
    const status: InfiniteTalkStatus = data?.status ?? "processing";

    if (status === "completed") {
      const outputs: string[] = data?.outputs ?? [];
      const videoUrl = outputs[0];

      if (!videoUrl) {
        return {
          status: "failed",
          errorMessage: `[InfiniteTalk] Completed but no video output URL found. outputs=${JSON.stringify(outputs)}`,
        };
      }

      console.log(`[InfiniteTalk] Task ${taskId} completed → video: ${videoUrl.slice(0, 80)}...`);
      return { status: "completed", videoUrl };
    }

    if (status === "failed") {
      const errMsg = data?.error || "Unknown error";
      console.error(`[InfiniteTalk] Task ${taskId} failed: ${errMsg}`);
      return { status: "failed", errorMessage: `[InfiniteTalk] Task failed: ${errMsg}` };
    }

    // Still pending or processing
    console.log(`[InfiniteTalk] Task ${taskId} status=${status} — still in progress`);
    return { status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const httpStatus = error.response?.status;
      const detail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(`[InfiniteTalk] Poll error: ${httpStatus} ${detail}`);
    }
    throw error;
  }
}
