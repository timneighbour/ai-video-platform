/**
 * Hypereal AI Video Generation Client
 * Unified API gateway for Seedance 2.0, Kling 3.0, Veo 3.1, and more.
 *
 * Base URL: https://api.hypereal.cloud/v1
 * Auth: Bearer ck_... API key (HYPEREAL_API_KEY env var)
 *
 * Docs: https://hypereal.cloud/docs
 */

import axios from "axios";

const HYPEREAL_BASE = "https://api.hypereal.cloud/v1";

// Model slugs — ordered by quality/cost preference for music video scenes
export const HYPEREAL_MODELS = {
  // Seedance 2.0 — best for character consistency and cinematic quality
  SEEDANCE_2_T2V: "seedance-2-0-t2v",         // 100 credits/5s — highest quality
  SEEDANCE_2_FAST_T2V: "seedance-2-0-fast-t2v", // 53 credits/5s — faster, slightly lower quality
  // Kling 3.0 — excellent character consistency
  KLING_3_PRO_T2V: "kling-3-0-pro-t2v",       // 57 credits — cinematic
  KLING_3_STD_T2V: "kling-3-0-std-t2v",       // 42 credits — standard
  // Hailuo 02 — cheapest option
  HAILUO_02_T2V: "hailuo-02-t2v",             // 10 credits — budget
} as const;

export type HyperealModel = typeof HYPEREAL_MODELS[keyof typeof HYPEREAL_MODELS];

export interface HyperealVideoRequest {
  model: HyperealModel;
  prompt: string;
  image?: string;         // URL for image-to-video models
  duration?: number;      // seconds
  mode?: "auto" | "fast";
}

export interface HyperealJobResponse {
  jobId: string;
  status: "processing" | "completed" | "failed";
  outputUrl?: string;
  creditsUsed?: number;
  message?: string;
}

function getHeaders() {
  const apiKey = process.env.HYPEREAL_API_KEY;
  if (!apiKey) throw new Error("HYPEREAL_API_KEY is not set");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Submit a video generation job to Hypereal AI.
 * Returns the jobId for async polling.
 */
export async function submitHyperealVideo(request: HyperealVideoRequest): Promise<string> {
  const ts = new Date().toISOString();
  console.log(`[Hypereal] ${ts} submit START — model=${request.model} prompt="${request.prompt.slice(0, 80)}..."`);

  const body: Record<string, unknown> = {
    model: request.model,
    mode: request.mode ?? "auto",
    input: {
      prompt: request.prompt,
      ...(request.duration ? { duration: request.duration } : {}),
      ...(request.image ? { image: request.image } : {}),
    },
  };

  const response = await axios.post<HyperealJobResponse>(
    `${HYPEREAL_BASE}/videos/generate`,
    body,
    { headers: getHeaders(), timeout: 60_000 }
  );

  const jobId = response.data.jobId;
  if (!jobId) throw new Error(`Hypereal API: no jobId returned — ${JSON.stringify(response.data)}`);

  console.log(`[Hypereal] ${ts} submit OK — jobId=${jobId} creditsUsed=${response.data.creditsUsed}`);
  return jobId;
}

/**
 * Poll the status of a Hypereal video generation job.
 * Returns null if still processing, or the video URL if complete.
 * Throws if the job failed.
 */
export async function pollHyperealVideo(
  jobId: string,
  model: HyperealModel
): Promise<string | null> {
  const response = await axios.get<HyperealJobResponse>(
    `${HYPEREAL_BASE}/jobs/${jobId}`,
    {
      params: { model, type: "video" },
      headers: getHeaders(),
      timeout: 30_000,
    }
  );

  const { status, outputUrl } = response.data;
  console.log(`[Hypereal] poll jobId=${jobId} status=${status}`);

  if (status === "completed" && outputUrl) {
    return outputUrl;
  }

  if (status === "failed") {
    throw new Error(`Hypereal video generation failed for job ${jobId}`);
  }

  // Still processing
  return null;
}

/**
 * Validate the HYPEREAL_API_KEY by making a lightweight API call.
 * Used in tests to confirm the key is active.
 */
export async function validateHyperealKey(): Promise<boolean> {
  try {
    // Use a minimal image generation call (cheapest) to validate auth
    const response = await axios.post(
      `${HYPEREAL_BASE}/images/generate`,
      { prompt: "test", model: "nano-banana-t2i", mode: "fast" },
      { headers: getHeaders(), timeout: 15_000 }
    );
    return response.status === 200 || response.status === 202;
  } catch (err: any) {
    if (err.response?.status === 401 || err.response?.status === 403) return false;
    // Other errors (rate limit, etc.) don't mean the key is invalid
    return true;
  }
}
