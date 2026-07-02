/**
 * aimlapi-fluxpro.ts
 *
 * Flux Pro 1.1 Ultra via AI/ML API (aimlapi.com)
 * Used for CHARACTER PORTRAIT GENERATION — photorealistic full-body portraits.
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
 *
 * PROMPT STRUCTURE (order matters — FLUX Pro weights earlier tokens more heavily):
 *   1. PHYSICAL TRAIT LOCKS (skin tone, eye colour, hair) — absolute top priority
 *   2. Framing + character description (outfit, pose, props)
 *   3. Photorealism quality suffix
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
  /** The full character prompt (framing + outfit + description) */
  characterPrompt: string;
  /**
   * Optional reference description — key visual traits from the reference photo.
   * NOTE: This model is TEXT-TO-IMAGE ONLY — no image URLs are accepted.
   */
  referenceDescription?: string;
  /** Aspect ratio — defaults to 9:16 for portrait orientation */
  aspectRatio?: "1:1" | "9:16" | "16:9" | "3:4" | "2:3";
  /** Output format */
  outputFormat?: "jpeg" | "png";
  /** Safety tolerance 1-6 (default 6) */
  safetyTolerance?: number;

  /**
   * Structured physical trait locks — injected as a numbered hard-constraint block at the
   * VERY START of the prompt, before any framing or description text.
   * FLUX Pro weights earlier tokens most heavily, so these must come first to prevent
   * the model from defaulting to its own interpretation of the character's appearance.
   */
  physicalTraits?: {
    skinTone?: string;    // e.g. "sun-kissed tan skin"
    eyeColour?: string;   // e.g. "emerald green"
    hairColour?: string;  // e.g. "jet black"
    hairLength?: string;  // e.g. "long straight past shoulders"
    hairStyle?: string;   // e.g. "sleek and straight"
  };
}

/**
 * Build the physical trait lock block — a numbered list of hard constraints
 * placed at the absolute start of the prompt so FLUX Pro cannot ignore them.
 *
 * Example output:
 *   PHYSICAL TRAITS (MANDATORY — DO NOT CHANGE ANY OF THESE):
 *   1. SKIN: sun-kissed tan skin — light-medium complexion, warm undertone. NOT dark. NOT brown. NOT Black African.
 *   2. EYES: emerald green eyes — bright green iris. NOT brown. NOT dark. NOT black.
 *   3. HAIR: jet black, long straight past shoulders, sleek and straight.
 */
function buildPhysicalTraitBlock(traits: FluxProPortraitRequest["physicalTraits"]): string {
  if (!traits) return "";
  const lines: string[] = [];

  if (traits.skinTone) {
    const tone = traits.skinTone.toLowerCase();
    const isMedium = /medium|olive|tan|golden|caramel|sun.kissed/i.test(tone);
    const isLight = /fair|pale|light|porcelain|ivory|peach|beige/i.test(tone);
    const forbid = isMedium
      ? " NOT dark brown. NOT ebony. NOT Black African. NOT dark-skinned."
      : isLight
      ? " NOT olive. NOT tan. NOT brown. NOT dark."
      : "";
    lines.push(`1. SKIN TONE: ${traits.skinTone}.${forbid} This is the character's exact complexion — do not change it.`);
  }

  if (traits.eyeColour) {
    const colour = traits.eyeColour.toLowerCase();
    const isGreen = /green|emerald|teal/i.test(colour);
    const isBlue = /blue|ice/i.test(colour);
    const forbid = isGreen
      ? " NOT brown eyes. NOT dark eyes. NOT black eyes. NOT hazel."
      : isBlue
      ? " NOT brown eyes. NOT dark eyes. NOT black eyes."
      : " NOT dark eyes. NOT black eyes.";
    lines.push(`2. EYE COLOUR: ${traits.eyeColour} eyes.${forbid} The iris must be clearly ${traits.eyeColour} in colour.`);
  }

  if (traits.hairColour || traits.hairLength || traits.hairStyle) {
    const hairParts = [traits.hairColour, traits.hairLength, traits.hairStyle].filter(Boolean).join(", ");
    lines.push(`3. HAIR: ${hairParts}. Do not change the hair colour, length, or style.`);
  }

  if (lines.length === 0) return "";

  return `PHYSICAL TRAITS (MANDATORY — DO NOT CHANGE ANY OF THESE):\n${lines.join("\n")}`;
}

/**
 * Generate a Flux Pro 1.1 Ultra portrait.
 * Returns the final image URL from AI/ML API CDN.
 * IMPORTANT: Callers must download and re-upload to S3 for persistence.
 */
export async function generateFluxProPortrait(
  request: FluxProPortraitRequest
): Promise<string> {
  const apiKey = getApiKey();

  // Sanitise the character prompt to remove words that trigger Flux Pro's safety filter.
  const sanitisedPrompt = request.characterPrompt
    .replace(/\b(sexy|sexiest|seductive|provocative|erotic|sensual)\b/gi, "confident")
    .replace(/\b(very attractive|extremely attractive|stunningly attractive)\b/gi, "beautiful")
    .replace(/\b(low body fat|body fat percentage|fat percentage)\b/gi, "fit")
    .replace(/\b(toned physique|lean physique|athletic leanness)\b/gi, "athletic build")
    .replace(/\b(revealing|skimpy|tight-fitting|form-fitting)\b/gi, "fitted")
    .trim();

  // Build prompt in strict priority order:
  // 1. Physical trait locks (MUST be first — FLUX Pro weights earlier tokens most heavily)
  // 2. Character description (framing + outfit + props)
  // 3. Reference description (if any)
  // 4. Photorealism quality suffix
  const physicalTraitBlock = buildPhysicalTraitBlock(request.physicalTraits);
  const promptParts: string[] = [];
  if (physicalTraitBlock) promptParts.push(physicalTraitBlock);
  promptParts.push(sanitisedPrompt);
  if (request.referenceDescription) {
    promptParts.push(`Reference appearance: ${request.referenceDescription}`);
  }
  promptParts.push(PHOTOREALISTIC_PORTRAIT_SUFFIX);
  const fullPrompt = promptParts.join("\n\n");

  console.log(`[AimlFluxPro] Submitting portrait — model: ${FLUX_PRO_ULTRA_MODEL}`);
  console.log(`[AimlFluxPro] Physical traits: ${JSON.stringify(request.physicalTraits ?? {})}`);
  console.log(`[AimlFluxPro] Prompt (first 400 chars): ${fullPrompt.slice(0, 400)}`);

  const body: Record<string, unknown> = {
    model: FLUX_PRO_ULTRA_MODEL,
    prompt: fullPrompt,
    aspect_ratio: request.aspectRatio ?? "9:16",
    output_format: request.outputFormat ?? "jpeg",
    safety_tolerance: String(request.safetyTolerance ?? 6),
    num_images: 1,
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
