import axios from "axios";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/v1";
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

export type WaveSpeedModel = "seedance-2.0" | "hailuo-minimax";

export interface WaveSpeedVideoRequest {
  model: WaveSpeedModel;
  prompt: string;
  duration?: number; // seconds, default 5
  width?: number; // default 1280
  height?: number; // default 720
}

export interface WaveSpeedVideoResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  error?: string;
}

/**
 * Submit a video generation request to WaveSpeed AI
 */
export async function submitWaveSpeedVideo(
  request: WaveSpeedVideoRequest
): Promise<string> {
  if (!WAVESPEED_API_KEY) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  try {
    const response = await axios.post<{ task_id: string }>(
      `${WAVESPEED_API_BASE}/video/generate`,
      {
        model: request.model,
        prompt: request.prompt,
        duration: request.duration || 5,
        width: request.width || 1280,
        height: request.height || 720,
      },
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return response.data.task_id;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `WaveSpeed API error: ${error.response?.status} ${error.response?.data?.error || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Poll the status of a video generation task
 */
export async function pollWaveSpeedVideo(
  taskId: string
): Promise<WaveSpeedVideoResponse> {
  if (!WAVESPEED_API_KEY) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  try {
    const response = await axios.get<WaveSpeedVideoResponse>(
      `${WAVESPEED_API_BASE}/video/status/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `WaveSpeed poll error: ${error.response?.status} ${error.response?.data?.error || error.message}`
      );
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
