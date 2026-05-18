import axios from "axios";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

export type WaveSpeedModel =
  | "bytedance/seedance-2.0/text-to-video"
  | "bytedance/seedance-2.0-fast/text-to-video"
  | "bytedance/seedance-v1.5-pro/text-to-video";

/** Image-to-video model variants — use when a storyboard image is available */
export type WaveSpeedI2VModel =
  | "bytedance/seedance-2.0-fast/image-to-video"
  | "bytedance/seedance-2.0/image-to-video"
  | "bytedance/seedance-v1.5-pro/image-to-video";

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

export interface WaveSpeedI2VRequest {
  prompt: string;
  /** Primary storyboard image URL — used as the first frame anchor */
  image: string;
  aspect_ratio?: "16:9" | "9:16" | "4:3" | "3:4" | "1:1" | "21:9";
  duration?: 5 | 10 | 15;
  resolution?: "480p" | "720p" | "1080p";
}

export interface WaveSpeedVideoResponse {
  id: string;
  model?: string;
  status: "pending" | "processing" | "completed" | "failed" | "created";
  outputs?: string[]; // Array of output video URLs (when completed)
  video_url?: string; // Legacy compat field
  error?: string | null;
  created_at?: string;
}

/**
 * WaveSpeed v3 API wraps all responses in: { code, message, data: { ... } }
 * This helper extracts the inner data object.
 */
function extractWaveSpeedData(responseData: any): WaveSpeedVideoResponse {
  // v3 envelope: { code: 200, message: "success", data: { id, status, outputs, ... } }
  if (responseData?.data && typeof responseData.data === "object" && responseData.data.id) {
    return responseData.data as WaveSpeedVideoResponse;
  }
  // Fallback: response is already the inner object
  return responseData as WaveSpeedVideoResponse;
}

/**
 * Submit a text-to-video request to WaveSpeed AI (v3 API).
 * Use submitWaveSpeedImageToVideo when a storyboard image is available.
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
    const response = await axios.post(
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

    // v3 API: response is { code, message, data: { id, status, ... } }
    const inner = extractWaveSpeedData(response.data);
    const taskId = inner?.id;
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
 * Submit an image-to-video request to WaveSpeed AI (v3 API).
 * Uses the dedicated image-to-video endpoint with the `image` parameter
 * (NOT reference_images) — this is the correct way to anchor the first frame.
 * 
 * This is the PRIMARY render path for WIZ AI cinematic production:
 * storyboard image → WaveSpeed image-to-video → silent cinematic clip
 */
export async function submitWaveSpeedImageToVideo(
  request: WaveSpeedI2VRequest,
  model: WaveSpeedI2VModel = "bytedance/seedance-2.0-fast/image-to-video"
): Promise<string> {
  if (!WAVESPEED_API_KEY) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  const body: Record<string, unknown> = {
    prompt: request.prompt,
    image: request.image,
    duration: request.duration ?? 5,
    size: resolutionToSize(request.resolution ?? "720p", request.aspect_ratio ?? "16:9"),
  };

  try {
    const response = await axios.post(
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

    const responseData = response.data;
    // Check for API-level error in response body (WaveSpeed returns 200 with error in body)
    if (responseData?.code && responseData.code !== 200) {
      throw new Error(`WaveSpeed image-to-video error: ${responseData.message || JSON.stringify(responseData)}`);
    }

    const inner = extractWaveSpeedData(responseData);
    const taskId = inner?.id;
    if (!taskId) {
      throw new Error(
        `WaveSpeed image-to-video: no task id in response: ${JSON.stringify(responseData)}`
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
      throw new Error(`WaveSpeed image-to-video API error: ${status} ${detail}`);
    }
    throw error;
  }
}

/**
 * Convert resolution + aspect ratio to WaveSpeed's `size` parameter format (e.g. "1280:720").
 */
function resolutionToSize(resolution: string, aspectRatio: string): string {
  const isPortrait = aspectRatio === "9:16";
  switch (resolution) {
    case "1080p": return isPortrait ? "1080:1920" : "1920:1080";
    case "480p":  return isPortrait ? "480:854"   : "854:480";
    case "720p":
    default:      return isPortrait ? "720:1280"  : "1280:720";
  }
}

/**
 * Poll the status of a WaveSpeed prediction (v3 API).
 * Uses GET /api/v3/predictions/{id}/result — the only valid poll endpoint.
 * The status endpoint GET /api/v3/predictions/{id} (without /result) returns 404.
 */
export async function pollWaveSpeedVideo(
  taskId: string
): Promise<WaveSpeedVideoResponse> {
  if (!WAVESPEED_API_KEY) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  try {
    // v3 API: always use /result endpoint for polling — /predictions/{id} returns 404
    const resultResp = await axios.get(
      `${WAVESPEED_API_BASE}/predictions/${taskId}/result`,
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        timeout: 15000,
      }
    );

    // v3 API: response is { code, message, data: { id, status, outputs, ... } }
    const data = extractWaveSpeedData(resultResp.data);

    // Normalise: set video_url from outputs array for backward compat
    if (data.status === "completed" && data.outputs && data.outputs.length > 0 && !data.video_url) {
      data.video_url = data.outputs[0];
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
 * Validate the WaveSpeed API key by checking balance endpoint.
 */
export async function validateWaveSpeedKey(): Promise<boolean> {
  if (!WAVESPEED_API_KEY) {
    return false;
  }

  try {
    const response = await axios.get(`${WAVESPEED_API_BASE}/balance`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
      timeout: 10000,
      validateStatus: (s) => s < 500,
    });
    return response.status === 200 && response.data?.code === 200;
  } catch {
    return false;
  }
}

/**
 * Get the current WaveSpeed account balance in USD.
 */
export async function getWaveSpeedBalance(): Promise<number | null> {
  if (!WAVESPEED_API_KEY) return null;
  try {
    const response = await axios.get(`${WAVESPEED_API_BASE}/balance`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
      timeout: 10000,
      validateStatus: () => true,
    });
    // v3 envelope: { code: 200, data: { balance: 14 } }
    const inner = response.data?.data ?? response.data;
    return typeof inner?.balance === "number" ? inner.balance : null;
  } catch {
    return null;
  }
}
