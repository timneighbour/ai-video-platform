/**
 * Grok Imagine API Integration
 * Handles image generation (grok-imagine-image-pro) and video generation (grok-imagine-video)
 *
 * Image generation: synchronous — returns URL directly
 * Video generation: asynchronous — submit request_id, then poll until status === "done"
 *
 * Pricing:
 *   Image: ~$0.02-0.05 per image
 *   Video: $0.05/s at 480p, $0.07/s at 720p
 *   A 10s 720p video with audio ≈ $0.70
 *
 * Docs: https://docs.x.ai/developers/model-capabilities/video/generation
 */

import axios from "axios";

const XAI_API_BASE = "https://api.x.ai/v1";

function getApiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not configured");
  return key;
}

// ─── IMAGE GENERATION ────────────────────────────────────────────────────────

export type GrokImageModel = "grok-imagine-image" | "grok-imagine-image-pro";
export type GrokImageSize =
  | "1024x1024"
  | "1024x1792"
  | "1792x1024"
  | "768x1344"
  | "1344x768"
  | "832x1248"
  | "1248x832";

export interface GrokImageRequest {
  prompt: string;
  model?: GrokImageModel;
  n?: number; // 1-4, default 1
  size?: GrokImageSize;
  response_format?: "url" | "b64_json";
}

export interface GrokImageResult {
  url: string;
  b64Json?: string;
  revisedPrompt?: string;
}

/**
 * Generate an image using Grok Imagine image-pro model.
 * Returns a temporary URL — download to S3 promptly.
 */
export async function generateGrokImage(
  request: GrokImageRequest
): Promise<GrokImageResult[]> {
  const apiKey = getApiKey();
  const model = request.model ?? "grok-imagine-image-pro";

  console.log(`[GrokImagine] Image generation START — model=${model} prompt="${request.prompt.slice(0, 80)}..."`);

  const response = await axios.post<{
    data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  }>(
    `${XAI_API_BASE}/images/generations`,
    {
      model,
      prompt: request.prompt,
      n: request.n ?? 1,
      size: request.size ?? "1024x1024",
      response_format: request.response_format ?? "url",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  const results = response.data.data.map((item) => ({
    url: item.url ?? "",
    b64Json: item.b64_json,
    revisedPrompt: item.revised_prompt,
  }));

  console.log(`[GrokImagine] Image generation OK — ${results.length} image(s) returned`);
  return results;
}

// ─── VIDEO GENERATION ────────────────────────────────────────────────────────

export type GrokVideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
export type GrokVideoResolution = "480p" | "720p";

export interface GrokVideoRequest {
  prompt: string;
  /** Animate a still image — provide public URL or base64 data URI */
  image_url?: string;
  /** Duration in seconds (1-10, default 5) */
  duration?: number;
  aspect_ratio?: GrokVideoAspectRatio;
  resolution?: GrokVideoResolution;
}

export interface GrokVideoSubmitResult {
  request_id: string;
}

export type GrokVideoStatus = "pending" | "processing" | "done" | "expired" | "failed";

export interface GrokVideoPollResult {
  status: GrokVideoStatus;
  videoUrl?: string;
  duration?: number;
}

/**
 * Submit a video generation request to Grok Imagine.
 * Returns a request_id for polling.
 */
export async function submitGrokVideo(
  request: GrokVideoRequest
): Promise<string> {
  const apiKey = getApiKey();

  const mode = request.image_url ? "image-to-video" : "text-to-video";
  console.log(`[GrokImagine] Video submit START — mode=${mode} duration=${request.duration ?? 5}s prompt="${request.prompt.slice(0, 80)}..."`);

  const body: Record<string, unknown> = {
    model: "grok-imagine-video",
    prompt: request.prompt,
    duration: request.duration ?? 5,
    aspect_ratio: request.aspect_ratio ?? "9:16",
    resolution: request.resolution ?? "720p",
  };

  if (request.image_url) {
    body.image_url = request.image_url;
  }

  const response = await axios.post<{ request_id: string }>(
    `${XAI_API_BASE}/videos/generations`,
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const { request_id } = response.data;
  if (!request_id) {
    throw new Error(`GrokImagine: no request_id in response: ${JSON.stringify(response.data)}`);
  }

  console.log(`[GrokImagine] Video submit OK — request_id=${request_id}`);
  return request_id;
}

/**
 * Poll the status of a Grok Imagine video generation request.
 */
export async function pollGrokVideo(requestId: string): Promise<GrokVideoPollResult> {
  const apiKey = getApiKey();

  const response = await axios.get<{
    status: GrokVideoStatus;
    video?: { url: string; duration: number };
    model?: string;
  }>(
    `${XAI_API_BASE}/videos/${requestId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  const { status, video } = response.data;

  return {
    status,
    videoUrl: video?.url,
    duration: video?.duration,
  };
}

/**
 * Submit a video and poll until done (with timeout).
 * Use this for synchronous workflows — returns the video URL directly.
 * For async workflows (music video scenes), use submitGrokVideo + pollGrokVideo separately.
 */
export async function generateGrokVideoSync(
  request: GrokVideoRequest,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<string> {
  const { timeoutMs = 300000, pollIntervalMs = 5000 } = options;

  const requestId = await submitGrokVideo(request);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const result = await pollGrokVideo(requestId);

    if (result.status === "done" && result.videoUrl) {
      console.log(`[GrokImagine] Video ready — request_id=${requestId} url=${result.videoUrl.slice(0, 80)}...`);
      return result.videoUrl;
    }

    if (result.status === "failed" || result.status === "expired") {
      throw new Error(`GrokImagine video generation ${result.status}: request_id=${requestId}`);
    }

    console.log(`[GrokImagine] Video polling — request_id=${requestId} status=${result.status}`);
  }

  throw new Error(`GrokImagine video generation timed out after ${timeoutMs / 1000}s: request_id=${requestId}`);
}
