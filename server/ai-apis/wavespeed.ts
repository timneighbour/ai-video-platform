import axios from "axios";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

export type WaveSpeedModel =
  | "bytedance/seedance-2.0/text-to-video"
  | "bytedance/seedance-2.0-fast/text-to-video"
  | "bytedance/seedance-v1.5-pro/text-to-video";

export interface WaveSpeedVideoRequest {
  prompt: string;
  aspect_ratio?: "16:9" | "9:16" | "4:3" | "3:4" | "1:1" | "21:9";
  duration?: 5 | 10 | 15;
  resolution?: "480p" | "720p" | "1080p";
  reference_images?: string[];
  reference_videos?: string[];
  reference_audios?: string[];
  enable_web_search?: boolean;
}

export interface WaveSpeedVideoResponse {
  id: string;
  model?: string;
  status: "pending" | "processing" | "completed" | "failed";
  outputs?: string[]; // Array of output video URLs (when completed)
  video_url?: string; // Legacy compat field
  error?: string | null;
  created_at?: string;
}

/**
 * Submit a video generation request to WaveSpeed AI (v3 API)
 * Model is encoded in the URL path. Returns the prediction/task ID.
 */
export async function submitWaveSpeedVideo(
  request: WaveSpeedVideoRequest,
  model: WaveSpeedModel = "bytedance/seedance-2.0/text-to-video"
): Promise<string> {
  if (!WAVESPEED_API_KEY) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  const body: Record<string, unknown> = {
    prompt: request.prompt,
    aspect_ratio: request.aspect_ratio ?? "16:9",
    duration: request.duration ?? 5,
    resolution: request.resolution ?? "720p",
    enable_web_search: request.enable_web_search ?? false,
    reference_images: request.reference_images ?? [],
    reference_videos: request.reference_videos ?? [],
    reference_audios: request.reference_audios ?? [],
  };

  try {
    const response = await axios.post<{ id: string; status: string }>(
      `${WAVESPEED_API_BASE}/${model}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const taskId = response.data?.id;
    if (!taskId) {
      throw new Error(
        `WaveSpeed: no task id in response: ${JSON.stringify(response.data)}`
      );
    }
    return taskId;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(`WaveSpeed API error: ${status} ${detail}`);
    }
    throw error;
  }
}

/**
 * Poll the status of a WaveSpeed prediction (v3 API).
 * Uses GET /api/v3/predictions/{id} and /api/v3/predictions/{id}/result
 */
export async function pollWaveSpeedVideo(
  taskId: string
): Promise<WaveSpeedVideoResponse> {
  if (!WAVESPEED_API_KEY) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  try {
    // Check status first
    const statusResp = await axios.get<WaveSpeedVideoResponse>(
      `${WAVESPEED_API_BASE}/predictions/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        timeout: 15000,
      }
    );

    const data = statusResp.data;

    // If completed, fetch the result to get outputs array
    if (data.status === "completed") {
      try {
        const resultResp = await axios.get<WaveSpeedVideoResponse>(
          `${WAVESPEED_API_BASE}/predictions/${taskId}/result`,
          {
            headers: {
              Authorization: `Bearer ${WAVESPEED_API_KEY}`,
            },
            timeout: 15000,
          }
        );
        // Normalise: set video_url from outputs array for backward compat
        const result = resultResp.data;
        if (result.outputs && result.outputs.length > 0 && !result.video_url) {
          result.video_url = result.outputs[0];
        }
        return result;
      } catch {
        // Fall back to status response
        if (data.outputs && data.outputs.length > 0 && !data.video_url) {
          data.video_url = data.outputs[0];
        }
        return data;
      }
    }

    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(`WaveSpeed poll error: ${status} ${detail}`);
    }
    throw error;
  }
}

/**
 * Validate the WaveSpeed API key by checking if it's present and properly formatted
 */
export async function validateWaveSpeedKey(): Promise<boolean> {
  if (!WAVESPEED_API_KEY) {
    return false;
  }

  // WaveSpeed API key format: 64-character hex string
  // If the key is present and matches the expected format, it's valid
  const isValidFormat = /^[a-f0-9]{64}$/.test(WAVESPEED_API_KEY);
  return isValidFormat;
}
