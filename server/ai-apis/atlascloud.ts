/**
 * Atlas Cloud AI — Video Generation Client
 * Docs: https://www.atlascloud.ai/docs
 * Endpoint: https://api.atlascloud.ai/api/v1/model/generateVideo
 *
 * Models:
 *   bytedance/seedance-2.0/text-to-video         — text only
 *   bytedance/seedance-2.0/image-to-video         — image anchor + text
 *   bytedance/seedance-2.0/reference-to-video     — reference_images + reference_audios (lip sync)
 */
import axios from "axios";

const ATLAS_BASE = "https://api.atlascloud.ai/api/v1";
const ATLAS_MODEL_T2V = "bytedance/seedance-2.0/text-to-video";
const ATLAS_MODEL_I2V = "bytedance/seedance-2.0/image-to-video";
const ATLAS_MODEL_R2V = "bytedance/seedance-2.0/reference-to-video";

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
      model: ATLAS_MODEL_T2V,
      prompt,
      duration: durationSeconds,
      resolution: "720p",
      generate_audio: false, // Suppress AI-generated audio to prevent ByteDance content-policy rejection on music/performance prompts
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
 * Submit an image-to-video job to Atlas Cloud.
 * Uses the character reference image as the first frame anchor for visual consistency.
 * NOTE: This model does NOT support audio lip sync — use submitAtlasReferenceToVideo for lip sync.
 */
export async function submitAtlasImageToVideo(
  prompt: string,
  imageUrl: string,
  durationSeconds: number = 5
): Promise<AtlasVideoJob> {
  const apiKey = getApiKey();

  const response = await axios.post(
    `${ATLAS_BASE}/model/generateVideo`,
    {
      model: ATLAS_MODEL_I2V,
      prompt,
      image: imageUrl,
      duration: durationSeconds,
      resolution: "720p",
      generate_audio: false,
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
      `Atlas Cloud image-to-video: no prediction ID in response: ${JSON.stringify(data)}`
    );
  }

  return { predictionId };
}

/**
 * Submit a reference-to-video job to Atlas Cloud.
 *
 * This is the CORRECT model for music videos with lip sync:
 *   - reference_images: up to 9 character reference photos (face/body anchor)
 *   - reference_audios: up to 3 audio clips (2–15s each) for phoneme-accurate lip sync
 *
 * The model drives mouth movement from the actual audio waveform — not from text prompts.
 * This is the only way to achieve frame-accurate lip sync.
 *
 * @param prompt         Scene description (camera, action, setting)
 * @param referenceImages Array of character reference image URLs (max 9)
 * @param referenceAudios Array of audio clip URLs for lip sync (max 3, each 2–15s, total ≤15s)
 * @param durationSeconds Clip duration (5 or 8 seconds)
 */
export async function submitAtlasReferenceToVideo(
  prompt: string,
  referenceImages: string[],
  referenceAudios: string[],
  durationSeconds: number = 8
): Promise<AtlasVideoJob> {
  const apiKey = getApiKey();

  // Validate constraints
  if (referenceImages.length === 0) {
    throw new Error("Atlas Cloud reference-to-video: at least one reference image is required");
  }
  if (referenceImages.length > 9) {
    throw new Error("Atlas Cloud reference-to-video: maximum 9 reference images allowed");
  }
  if (referenceAudios.length > 3) {
    throw new Error("Atlas Cloud reference-to-video: maximum 3 reference audio clips allowed");
  }

  const body: Record<string, unknown> = {
    model: ATLAS_MODEL_R2V,
    prompt,
    reference_images: referenceImages,
    duration: durationSeconds,
    resolution: "720p",
    // NOTE: Do NOT set generate_audio: false when passing reference_audios.
    // The model needs audio processing enabled to drive lip sync from the audio waveform.
    // We only suppress audio generation when there is NO reference audio (image-only mode).
  };

  if (referenceAudios.length > 0) {
    // Lip sync mode: pass audio clips and let the model process them for mouth movement
    body.reference_audios = referenceAudios;
  } else {
    // No audio: suppress AI-generated audio so the music track isn\'t replaced
    body.generate_audio = false;
  }

  const response = await axios.post(
    `${ATLAS_BASE}/model/generateVideo`,
    body,
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
      `Atlas Cloud reference-to-video: no prediction ID in response: ${JSON.stringify(data)}`
    );
  }

  console.log(`[AtlasCloud] reference-to-video submitted: predictionId=${predictionId}, images=${referenceImages.length}, audios=${referenceAudios.length}`);
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
      // Allow 5xx so we can inspect the body for content-policy errors vs transient infra errors
      validateStatus: (s) => s < 600,
    }
  );

  // Atlas Cloud wraps upstream errors (e.g. ByteDance content filter) as HTTP 500.
  // Parse the body to distinguish content-policy failures from transient infra errors.
  if (response.status >= 500) {
    const bodyStr = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data ?? '');
    // Known content-policy patterns from ByteDance Seedance
    const isCopyrightPolicy = bodyStr.includes('copyright restrictions') || bodyStr.includes('copyright restriction');
    const isContentPolicy =
      bodyStr.includes('real person') ||
      bodyStr.includes('real_person') ||
      bodyStr.includes('output audio may contain') ||
      bodyStr.includes('sensitive information') ||
      bodyStr.includes('content policy') ||
      bodyStr.includes('content_policy') ||
      bodyStr.includes('safety filter') ||
      bodyStr.includes('moderation') ||
      isCopyrightPolicy;
    if (isContentPolicy) {
      const rejectionType = isCopyrightPolicy ? 'copyright_restriction' : 'content_policy';
      // Treat as a hard failure so the caller can reset the scene and retry with sanitised prompt
      return { status: 'failed', error: `PROVIDER_REJECTED:${rejectionType}:${bodyStr.slice(0, 400)}` };
    }
    // Genuine 5xx infra error — throw so the poll catch block retries next cycle
    throw new Error(`Atlas Cloud poll HTTP ${response.status}: ${bodyStr.slice(0, 200)}`);
  }

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
