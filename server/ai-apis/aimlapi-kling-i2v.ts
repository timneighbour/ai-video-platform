/**
 * aimlapi-kling-i2v.ts
 *
 * Kling 2.6 Pro Image-to-Video via AI/ML API (aimlapi.com)
 * Used in the IMAGE-DRIVEN pipeline (Stage 2) to animate the Flux Kontext scene portrait
 * into a cinematic 5–6s clip with camera movement.
 *
 * Model: kling-video/v2.6/pro/image-to-video
 * Endpoint: POST /v2/generate/video/kling/generation
 * Poll:     GET  /v2/generate/video/kling/generation?generation_id=<id>
 *
 * Kling 2.6 Pro is chosen for strong character identity preservation during animation —
 * it keeps the face and appearance from the input image consistent across all frames.
 */

const AIMLAPI_BASE = "https://api.aimlapi.com";
const KLING_I2V_MODEL = "kling-video/v2.6/pro/image-to-video";

function getApiKey(): string {
  const key = process.env.AIML_API_KEY;
  if (!key) throw new Error("AIML_API_KEY environment variable is not set");
  return key;
}

export interface KlingI2VRequest {
  /** Scene portrait URL (Flux Kontext output — Zara placed in venue) */
  image_url: string;
  /** Cinematic motion prompt — describe movement and atmosphere, NOT the character */
  prompt: string;
  /** Duration in seconds: 5 or 10 */
  duration?: 5 | 10;
  /** Aspect ratio */
  aspect_ratio?: "16:9" | "9:16" | "1:1";
}

export interface KlingI2VResult {
  generationId: string;
  videoUrl: string;
}

/**
 * Submit a Kling 2.6 Pro image-to-video job via AI/ML API.
 * Returns the generation ID for polling.
 */
export async function submitKlingI2V(request: KlingI2VRequest): Promise<string> {
  const apiKey = getApiKey();
  console.log(`[KlingI2V] Submitting — image: ${request.image_url.slice(0, 80)}`);

  const body: Record<string, unknown> = {
    model: KLING_I2V_MODEL,
    image_url: request.image_url,
    prompt: request.prompt,
    duration: String(request.duration ?? 5),
    aspect_ratio: request.aspect_ratio ?? "16:9",
  };

  const response = await fetch(`${AIMLAPI_BASE}/v2/generate/video/kling/generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`KlingI2V submit HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    error?: string;
  };

  if (!data.id) {
    throw new Error(`KlingI2V submit: no id in response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[KlingI2V] Task submitted: ${data.id} (status: ${data.status ?? "unknown"})`);
  return data.id;
}

/**
 * Poll a Kling I2V task. Returns the video URL when done.
 * Returns null if still processing.
 * Throws on hard failure.
 */
export async function pollKlingI2V(generationId: string): Promise<string | null> {
  const apiKey = getApiKey();
  const url = new URL(`${AIMLAPI_BASE}/v2/generate/video/kling/generation`);
  url.searchParams.set("generation_id", generationId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`KlingI2V poll HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    video?: { url?: string };
    error?: string | null;
  };

  const status = (data.status ?? "").toLowerCase();

  if (status === "completed" || status === "ready" || status === "done" || status === "succeeded") {
    const videoUrl = data.video?.url;
    if (!videoUrl) throw new Error(`KlingI2V: completed but no video URL in response: ${JSON.stringify(data).slice(0, 200)}`);
    console.log(`[KlingI2V] Done — video: ${videoUrl.slice(0, 80)}`);
    return videoUrl;
  }

  if (status === "error" || status === "failed") {
    throw new Error(`KlingI2V task ${generationId} failed: ${data.error ?? status}`);
  }

  // Still processing (queued / processing)
  return null;
}
