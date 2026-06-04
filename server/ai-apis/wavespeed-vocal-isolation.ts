/**
 * WaveSpeed AI Audio Vocal Isolator
 * ===================================
 * Wraps the WaveSpeed AI `wavespeed-ai/audio-vocal-isolator` endpoint.
 *
 * API flow (identical to other WaveSpeed v3 models):
 *   1. POST /api/v3/wavespeed-ai/audio-vocal-isolator  { audio: "<url>" }
 *      → returns { code, message, data: { id, status, ... } }
 *      → data.id is the prediction/task ID
 *
 *   2. GET /api/v3/predictions/{id}/result
 *      → returns { code, message, data: { id, status, outputs: [vocalsUrl, instrumentalUrl] } }
 *      → status: "pending" | "processing" | "completed" | "failed"
 *      → when completed: outputs[0] = isolated vocal track, outputs[1] = instrumental track
 *
 * Pricing: $0.001 per second of input audio (~$0.09 per 90-second song)
 *
 * Docs: https://www.wavespeed.ai/models/wavespeed-ai/audio-vocal-isolator
 */

import axios from "axios";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";
const VOCAL_ISOLATOR_MODEL = "wavespeed-ai/audio-vocal-isolator";

// ─── Types ──────────────────────────────────────────────────────────────────

export type WaveSpeedVocalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "created";

export interface WaveSpeedVocalSubmitResult {
  /** WaveSpeed prediction ID — store on the job row for polling */
  taskId: string;
}

export interface WaveSpeedVocalPollResult {
  status: WaveSpeedVocalStatus;
  /** Isolated vocal track URL (available when status=completed) */
  vocalsUrl?: string;
  /** Instrumental (no-vocals) track URL (available when status=completed) */
  instrumentalUrl?: string;
  /** Error message (available when status=failed) */
  errorMessage?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("[WaveSpeedVocal] WAVESPEED_API_KEY is not set");
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
 * Submit a vocal isolation job to WaveSpeed AI.
 *
 * @param audioUrl - Publicly accessible URL of the full-mix audio file (S3/CDN)
 * @returns WaveSpeedVocalSubmitResult with taskId to store on the job row
 */
export async function submitWaveSpeedVocalIsolation(
  audioUrl: string
): Promise<WaveSpeedVocalSubmitResult> {
  const key = getApiKey();

  console.log(`[WaveSpeedVocal] Submitting vocal isolation for: ${audioUrl.slice(0, 80)}...`);

  try {
    const response = await axios.post(
      `${WAVESPEED_API_BASE}/${VOCAL_ISOLATOR_MODEL}`,
      { audio: audioUrl },
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
        `[WaveSpeedVocal] No task ID in submit response: ${JSON.stringify(response.data)}`
      );
    }

    console.log(`[WaveSpeedVocal] Submitted → taskId=${taskId}, status=${data.status}`);
    return { taskId };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(`[WaveSpeedVocal] Submit error: ${status} ${detail}`);
    }
    throw error;
  }
}

/**
 * Poll the status of a WaveSpeed vocal isolation prediction.
 * Call repeatedly (every 10-15 seconds) until status is "completed" or "failed".
 *
 * @param taskId - The prediction ID returned by submitWaveSpeedVocalIsolation
 * @returns WaveSpeedVocalPollResult with status and output URLs when done
 */
export async function pollWaveSpeedVocalIsolation(
  taskId: string
): Promise<WaveSpeedVocalPollResult> {
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
    const status: WaveSpeedVocalStatus = data?.status ?? "processing";

    if (status === "completed") {
      const outputs: string[] = data?.outputs ?? [];
      const vocalsUrl = outputs[0];
      const instrumentalUrl = outputs[1];

      if (!vocalsUrl) {
        return {
          status: "failed",
          errorMessage: `[WaveSpeedVocal] Completed but no vocal output URL found. outputs=${JSON.stringify(outputs)}`,
        };
      }

      console.log(`[WaveSpeedVocal] Task ${taskId} completed → vocals: ${vocalsUrl.slice(0, 80)}...`);
      return { status: "completed", vocalsUrl, instrumentalUrl };
    }

    if (status === "failed") {
      const errMsg = data?.error || "Unknown error";
      console.error(`[WaveSpeedVocal] Task ${taskId} failed: ${errMsg}`);
      return { status: "failed", errorMessage: `[WaveSpeedVocal] Task failed: ${errMsg}` };
    }

    // Still pending or processing
    console.log(`[WaveSpeedVocal] Task ${taskId} status=${status} — still in progress`);
    return { status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const httpStatus = error.response?.status;
      const detail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(`[WaveSpeedVocal] Poll error: ${httpStatus} ${detail}`);
    }
    throw error;
  }
}
