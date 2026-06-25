/**
 * aimlapi-fluxpro.ts
 *
 * Flux Pro 1.1 Ultra via AI/ML API (aimlapi.com)
 * Used for CHARACTER PORTRAIT GENERATION — photorealistic 8K head+shoulders portraits.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY FLUX PRO 1.1 ULTRA?
 * ═══════════════════════════════════════════════════════════════════════════
 * Flux Dev produces illustrated/painterly outputs — eyes and lips look "drawn".
 * Flux Pro 1.1 Ultra is specifically tuned for photorealistic portrait generation:
 *   - Sharp eyes with natural iris detail
 *   - Realistic skin texture
 *   - Natural lip texture
 *   - Professional studio photography quality
 *
 * This eliminates the need for post-processing enhancement steps.
 * Every character portrait generated on the platform will be 8K photorealistic
 * from the first generation.
 *
 * MODEL: flux-pro/v1.1-ultra
 * ENDPOINT: POST https://api.aimlapi.com/v1/images/generations
 * ═══════════════════════════════════════════════════════════════════════════
 */

const AIMLAPI_BASE = "https://api.aimlapi.com";
const FLUX_PRO_ULTRA_MODEL = "flux-pro/v1.1-ultra";

/**
 * Photorealistic portrait quality suffix injected into every portrait prompt.
 * These directives ensure OmniHuman-ready quality from the first generation.
 */
export const PHOTOREALISTIC_PORTRAIT_SUFFIX =
  "photorealistic portrait, professional studio photography, sharp eyes with natural iris detail, " +
  "realistic skin texture, natural lip texture, shot on Canon EOS R5, 85mm lens, " +
  "soft studio lighting, 8K resolution, ultra-high detail, no illustration, no painting, " +
  "no anime, no cartoon, no digital art — real photograph quality";

/**
 * Head+shoulders framing directives.
 * OmniHuman 1.5 performs best on head+shoulders crops (not full body).
 * These directives ensure the portrait is correctly framed for animation.
 */
export const HEAD_SHOULDERS_FRAMING =
  "HEAD AND SHOULDERS PORTRAIT. Tight crop from top of head to just below the collarbone/necklace. " +
  "Face clearly visible, looking directly at camera, neutral or slight smile expression. " +
  "NOT a full body shot. NOT waist up. Tight portrait framing only.";

function getApiKey(): string {
  const key = process.env.AIML_API_KEY;
  if (!key) throw new Error("AIML_API_KEY environment variable is not set");
  return key;
}

export interface FluxProPortraitRequest {
  /** The full character prompt (visual description, name, style etc.) */
  characterPrompt: string;
  /**
   * Optional reference photo URL — if provided, the model uses it as a visual anchor
   * for face consistency. Must be a publicly accessible URL.
   */
  referenceImageUrl?: string;
  /** Aspect ratio — always "1:1" for head+shoulders portrait crops */
  aspectRatio?: "1:1" | "9:16" | "16:9";
  /** Output format */
  outputFormat?: "jpeg" | "png";
  /** Safety tolerance 1-6 (default 2) */
  safetyTolerance?: number;
}

export interface FluxProPortraitResult {
  imageUrl: string;
  generationId: string;
}

/**
 * Submit a Flux Pro 1.1 Ultra portrait generation job.
 * Returns the generation ID (or "done:<url>" for synchronous results).
 */
export async function submitFluxProPortrait(request: FluxProPortraitRequest): Promise<string> {
  const apiKey = getApiKey();

  // Build the full prompt: character description + head+shoulders framing + photorealism suffix
  const fullPrompt = [
    HEAD_SHOULDERS_FRAMING,
    request.characterPrompt,
    PHOTOREALISTIC_PORTRAIT_SUFFIX,
  ].join(". ");

  console.log(`[AimlFluxPro] Submitting portrait — model: ${FLUX_PRO_ULTRA_MODEL}`);
  console.log(`[AimlFluxPro] Prompt (first 120 chars): ${fullPrompt.slice(0, 120)}`);
  if (request.referenceImageUrl) {
    console.log(`[AimlFluxPro] Reference image: ${request.referenceImageUrl.slice(0, 80)}`);
  }

  const body: Record<string, unknown> = {
    model: FLUX_PRO_ULTRA_MODEL,
    prompt: fullPrompt,
    aspect_ratio: request.aspectRatio ?? "1:1",
    output_format: request.outputFormat ?? "jpeg",
    safety_tolerance: String(request.safetyTolerance ?? 2),
  };

  // If a reference image is provided, pass it as image_prompt_strength for face anchoring
  // (Flux Pro Ultra supports image_url as a style/identity reference)
  if (request.referenceImageUrl) {
    body.image_url = request.referenceImageUrl;
    body.image_prompt_strength = 0.15; // Low strength — preserve photorealism, just anchor identity
  }

  const response = await fetch(`${AIMLAPI_BASE}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AimlFluxPro submit HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    data?: Array<{ url?: string }>;
    url?: string;
  };

  // Some AI/ML API image endpoints return the result synchronously in data[0].url
  if (data.data?.[0]?.url) {
    console.log(`[AimlFluxPro] Synchronous result: ${data.data[0].url.slice(0, 80)}`);
    return `done:${data.data[0].url}`;
  }

  if (!data.id) {
    throw new Error(`AimlFluxPro submit: no id in response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[AimlFluxPro] Task submitted: ${data.id}`);
  return data.id;
}

/**
 * Poll a Flux Pro portrait task. Returns the image URL when done.
 * Returns null if still processing.
 * Throws on hard failure.
 */
export async function pollFluxProPortrait(generationId: string): Promise<string | null> {
  // Handle synchronous "done:" prefix
  if (generationId.startsWith("done:")) {
    return generationId.slice("done:".length);
  }

  const apiKey = getApiKey();
  const url = new URL(`${AIMLAPI_BASE}/v1/images/generations`);
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
    throw new Error(`AimlFluxPro poll HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    data?: Array<{ url?: string }>;
    error?: { message?: string } | null;
  };

  const status = (data.status ?? "").toLowerCase();

  if (status === "completed" || status === "ready" || status === "done") {
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error(`AimlFluxPro: completed but no image URL in response`);
    return imageUrl;
  }

  if (status === "error" || status === "failed") {
    throw new Error(`AimlFluxPro task ${generationId} failed: ${data.error?.message ?? status}`);
  }

  // Still processing
  return null;
}

/**
 * Submit and synchronously wait for a Flux Pro portrait result.
 * Polls up to maxWaitMs (default 120s) with 4s intervals.
 * Throws if timed out or failed.
 *
 * Returns the final image URL from AI/ML API CDN.
 * IMPORTANT: Callers must download and re-upload to S3 for persistence.
 */
export async function generateFluxProPortrait(
  request: FluxProPortraitRequest,
  maxWaitMs = 120_000
): Promise<string> {
  const generationId = await submitFluxProPortrait(request);

  // Immediate result (synchronous API response)
  if (generationId.startsWith("done:")) {
    const url = generationId.slice("done:".length);
    console.log(`[AimlFluxPro] Immediate result → ${url.slice(0, 80)}`);
    return url;
  }

  const pollIntervalMs = 4_000;
  const maxAttempts = Math.ceil(maxWaitMs / pollIntervalMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const result = await pollFluxProPortrait(generationId);
    if (result) {
      console.log(`[AimlFluxPro] Done (attempt ${attempt + 1}) → ${result.slice(0, 80)}`);
      return result;
    }
    console.log(`[AimlFluxPro] Attempt ${attempt + 1}/${maxAttempts} — still processing`);
  }

  throw new Error(`AimlFluxPro portrait generation timed out after ${maxWaitMs}ms`);
}
