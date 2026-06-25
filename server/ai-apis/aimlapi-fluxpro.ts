/**
 * aimlapi-fluxpro.ts
 *
 * Flux Pro 1.1 Ultra via AI/ML API (aimlapi.com)
 * Used for CHARACTER PORTRAIT GENERATION — photorealistic head+shoulders portraits.
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
 * MODEL: flux-pro/v1.1-ultra
 * ENDPOINT: POST https://api.aimlapi.com/v1/images/generations
 * OUTPUT: 1536×2752 (9:16) — high-resolution portrait
 * RESPONSE: Synchronous — data[0].url returned immediately, no polling needed
 *
 * IMPORTANT CONSTRAINTS (confirmed from API docs + testing):
 *   - TEXT-TO-IMAGE ONLY: Does NOT accept image_url or image_prompt_strength
 *   - raw parameter: Only accepts raw=false (or omit it — true causes HTTP 400)
 *   - safety_tolerance: Must be a string ("1" to "6"), not a number
 *   - Response: data[0].url is always present on success (synchronous)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const AIMLAPI_BASE = "https://api.aimlapi.com";
const FLUX_PRO_ULTRA_MODEL = "flux-pro/v1.1-ultra";

/**
 * Photorealistic portrait quality suffix injected into every portrait prompt.
 */
export const PHOTOREALISTIC_PORTRAIT_SUFFIX =
  "photorealistic portrait, professional studio photography, sharp eyes with natural iris detail, " +
  "realistic skin texture, natural lip texture, shot on Canon EOS R5, 85mm lens, " +
  "soft studio lighting, ultra-high detail, no illustration, no painting, " +
  "no anime, no cartoon, no digital art — real photograph quality";

/**
 * Head+shoulders framing directives.
 * OmniHuman 1.5 performs best on head+shoulders crops (not full body).
 */
export const HEAD_SHOULDERS_FRAMING =
  "HEAD AND SHOULDERS PORTRAIT. Tight portrait crop. " +
  "Face clearly visible, looking directly at camera, neutral or slight smile expression. " +
  "Subject centred in frame. NOT a full body shot. NOT waist up. Close portrait framing only.";

function getApiKey(): string {
  const key = process.env.AIML_API_KEY;
  if (!key) throw new Error("AIML_API_KEY environment variable is not set");
  return key;
}

export interface FluxProPortraitRequest {
  /** The full character prompt (visual description, name, style etc.) */
  characterPrompt: string;
  /**
   * Optional reference description — key visual traits from the reference photo
   * (face shape, eye colour, hair colour/style, skin tone) embedded in the prompt.
   * NOTE: This model is TEXT-TO-IMAGE ONLY — no image URLs are accepted.
   */
  referenceDescription?: string;
  /** Aspect ratio — defaults to 9:16 for portrait orientation */
  aspectRatio?: "1:1" | "9:16" | "16:9" | "3:4" | "2:3";
  /** Output format */
  outputFormat?: "jpeg" | "png";
  /** Safety tolerance 1-6 (default 2) */
  safetyTolerance?: number;
}

/**
 * Generate a Flux Pro 1.1 Ultra portrait.
 * This is a SYNCHRONOUS call — the API returns the image URL immediately.
 * Returns the final image URL from AI/ML API CDN.
 * IMPORTANT: Callers must download and re-upload to S3 for persistence.
 */
export async function generateFluxProPortrait(
  request: FluxProPortraitRequest
): Promise<string> {
  const apiKey = getApiKey();

  // Build the full prompt: framing + character description + photorealism suffix
  const promptParts = [HEAD_SHOULDERS_FRAMING, request.characterPrompt];
  if (request.referenceDescription) {
    promptParts.push(`Reference appearance: ${request.referenceDescription}`);
  }
  promptParts.push(PHOTOREALISTIC_PORTRAIT_SUFFIX);
  const fullPrompt = promptParts.join(". ");

  console.log(`[AimlFluxPro] Submitting portrait — model: ${FLUX_PRO_ULTRA_MODEL}`);
  console.log(`[AimlFluxPro] Prompt (first 150 chars): ${fullPrompt.slice(0, 150)}`);

  // Build request body — ONLY valid parameters for this model
  // DO NOT add: image_url, image_prompt_strength, raw=true (causes HTTP 400)
  const body: Record<string, unknown> = {
    model: FLUX_PRO_ULTRA_MODEL,
    prompt: fullPrompt,
    aspect_ratio: request.aspectRatio ?? "9:16",
    output_format: request.outputFormat ?? "jpeg",
    safety_tolerance: String(request.safetyTolerance ?? 2),
    num_images: 1,
    // raw is intentionally omitted — API only accepts raw=false, which is the default
  };

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
    throw new Error(`AimlFluxPro HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string | null }>;
    meta?: { usage?: { credits_used?: number } };
  };

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error(
      `AimlFluxPro: no image URL in response: ${JSON.stringify(data).slice(0, 300)}`
    );
  }

  const credits = data.meta?.usage?.credits_used;
  console.log(
    `[AimlFluxPro] Portrait generated — credits: ${credits ?? "unknown"} → ${imageUrl.slice(0, 80)}`
  );

  return imageUrl;
}
