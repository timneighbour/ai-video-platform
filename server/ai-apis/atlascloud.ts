/**
 * Atlas Cloud AI — Video Generation Client
 * Docs: https://www.atlascloud.ai/docs
 * Endpoint: https://api.atlascloud.ai/api/v1/model/generateVideo
 * Model: bytedance/seedance-2.0/text-to-video
 */
import axios from "axios";

const ATLAS_BASE = "https://api.atlascloud.ai/api/v1";
const ATLAS_MODEL = "bytedance/seedance-2.0/text-to-video";

function getApiKey(): string {
  const key = process.env.ATLAS_CLOUD_API_KEY;
  if (!key) throw new Error("ATLAS_CLOUD_API_KEY is not set");
  return key;
}

export interface AtlasVideoJob {
  predictionId: string;
}

export interface AtlasVideoResult {
  status: "completed" | "failed" | "processing" | "pending" | string;
  videoUrl?: string;
  error?: string;
}

/**
 * Submit a text-to-video generation job to Atlas Cloud.
 * Returns the prediction ID for polling.
 */
export async function submitAtlasVideo(
  prompt: string,
  durationSeconds: number = 5
): Promise<AtlasVideoJob> {
  const apiKey = getApiKey();

  const response = await axios.post(
    `${ATLAS_BASE}/model/generateVideo`,
    {
      model: ATLAS_MODEL,
      prompt,
      duration: durationSeconds,
      resolution: "720p",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const data = response.data;
  const predictionId = data?.data?.id;
  if (!predictionId) {
    throw new Error(
      `Atlas Cloud: no prediction ID in response: ${JSON.stringify(data)}`
    );
  }

  return { predictionId };
}

/**
 * Poll Atlas Cloud for the status of a video generation job.
 */
export async function pollAtlasVideo(
  predictionId: string
): Promise<AtlasVideoResult> {
  const apiKey = getApiKey();

  const response = await axios.get(
    `${ATLAS_BASE}/model/prediction/${predictionId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15_000,
    }
  );

  const data = response.data?.data;
  if (!data) {
    throw new Error(
      `Atlas Cloud: unexpected poll response: ${JSON.stringify(response.data)}`
    );
  }

  const status = data.status as string;

  if (status === "completed") {
    const videoUrl = data.outputs?.[0];
    if (!videoUrl) {
      throw new Error("Atlas Cloud: completed but no output URL found");
    }
    return { status: "completed", videoUrl };
  }

  if (status === "failed") {
    return {
      status: "failed",
      error: data.error ?? "Atlas Cloud generation failed",
    };
  }

  // pending / processing / running
  return { status };
}

/**
 * Validate the Atlas Cloud API key by making a lightweight status call.
 */
export async function validateAtlasKey(): Promise<boolean> {
  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${ATLAS_BASE}/model/prediction/test`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10_000,
      validateStatus: (s) => s < 500, // 404 is fine — key is valid
    });
    return response.status !== 401 && response.status !== 403;
  } catch {
    return false;
  }
}
