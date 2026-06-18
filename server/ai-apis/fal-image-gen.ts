/**
 * Cinematic Storyboard Image Generator
 *
 * Provider priority:
 *   1. Grok (grok-imagine-image-quality) — primary, best cinematic quality, no fal.ai dependency
 *   2. fal.ai Flux Pro 1.1 Ultra (img2img with venue reference, if available)
 *   3. fal.ai Flux Pro 1.1 / Flux Dev (text-to-image fallback)
 *   4. Built-in Forge image API — final fallback, always available
 *
 * Output images match the target aspect ratio so WaveSpeed i2v / Seedance
 * inherits the correct frame dimensions natively.
 */

import { fal } from "@fal-ai/client";
import { storagePut } from "../storage";
import axios from "axios";

/** Map export aspect ratio to fal.ai Flux image_size */
function aspectRatioToFluxSize(
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9"
): string {
  switch (aspectRatio) {
    case "16:9":  return "landscape_16_9";   // 1344×768
    case "9:16":  return "portrait_16_9";    // 768×1344
    case "1:1":   return "square_hd";        // 1024×1024
    case "4:3":   return "landscape_4_3";    // 1365×1024
    case "3:4":   return "portrait_4_3";     // 1024×1365
    case "21:9":  return "custom_21_9";      // 2048×877 ultra-wide cinematic
    default:      return "landscape_16_9";
  }
}

export interface CinematicImageOptions {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
  /** S3 key prefix for storage (e.g. "music-video-storyboard/660001-scene-1") */
  storageKeyPrefix?: string;
  /**
   * Optional venue/environment reference image URL.
   * Used by fal.ai img2img path only — Grok generates from prompt alone.
   */
  venueReferenceUrl?: string;
  /** Scene index used to vary the seed and pick different venue reference angles */
  sceneIndex?: number;
}

export interface CinematicImageResult {
  url: string;
  width: number;
  height: number;
}

// Dimension map — used for aspect ratio guard and return value
const dimensionMap: Record<string, { width: number; height: number }> = {
  "landscape_16_9": { width: 1344, height: 768 },
  "portrait_16_9":  { width: 768, height: 1344 },
  "square_hd":      { width: 1024, height: 1024 },
  "landscape_4_3":  { width: 1365, height: 1024 },
  "portrait_4_3":   { width: 1024, height: 1365 },
  "custom_21_9":    { width: 2048, height: 877 },
};

/**
 * Sanitise a scene prompt — strip crop-inducing framing terms and append
 * the no-crop / full-head constraint that all providers must respect.
 */
function buildCinematicPrompt(rawPrompt: string): string {
  const safened = rawPrompt
    .replace(/\bextreme close[- ]?up\b/gi, "medium shot")
    .replace(/\bclose[- ]?up\b/gi, "medium shot")
    .replace(/\bhead[- ]and[- ]shoulders\b/gi, "medium wide shot")
    .replace(/\bMCU\b/g, "medium wide shot")
    .replace(/\bmedium close[- ]?up\b/gi, "medium wide shot")
    .replace(/\btight shot\b/gi, "medium shot")
    .replace(/\bface[- ]?only\b/gi, "medium shot");
  return `${safened}, FULL HEAD VISIBLE with generous headroom above the subject, entire head and hair fully within frame, subject NOT cropped at top, medium wide shot composition, cinematic widescreen, professional film lighting, photorealistic, 8K quality, dramatic depth of field, movie still`;
}

/**
 * ── Provider 1: Grok grok-imagine-image-quality ──────────────────────────────
 * Best cinematic quality. Returns a temporary URL that we download and re-upload.
 * Native output is 1280×720 (16:9) — we use it for all aspect ratios as it
 * consistently produces the best framing and venue accuracy.
 */
async function tryGrok(
  cinematicPrompt: string,
  imageSize: string
): Promise<string | undefined> {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) return undefined;

  try {
    const res = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${xaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-image-quality",
        prompt: cinematicPrompt,
        n: 1,
        response_format: "url",
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[CinematicImageGen] Grok HTTP ${res.status}: ${errText.slice(0, 120)}`);
      return undefined;
    }

    const json = (await res.json()) as { data?: Array<{ url?: string }> };
    const url = json?.data?.[0]?.url;
    if (url) {
      console.log(`[CinematicImageGen] Grok succeeded → ${url.slice(0, 80)}...`);
      return url;
    }
  } catch (err: any) {
    console.warn(`[CinematicImageGen] Grok failed: ${err?.message?.slice(0, 100)}`);
  }
  return undefined;
}

/**
 * Generate a cinematic storyboard image.
 * Provider priority: Grok → fal.ai (img2img + text) → Forge
 */
export async function generateCinematicStoryboardImage(
  options: CinematicImageOptions
): Promise<CinematicImageResult> {
  const imageSize = aspectRatioToFluxSize(options.aspectRatio ?? "16:9");
  const cinematicPrompt = buildCinematicPrompt(options.prompt ?? "");

  let imageUrl: string | undefined;
  let lastError: Error | null = null;

  // ── 1. Grok (primary — best quality) ────────────────────────────────────────
  imageUrl = await tryGrok(cinematicPrompt, imageSize);

  // ── 2. fal.ai img2img with venue reference (if Grok failed + reference available) ──
  if (!imageUrl && options.venueReferenceUrl) {
    const falKey = process.env.FAL_AI_API_KEY;
    if (falKey) {
      fal.config({ credentials: falKey });
      try {
        const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
          input: {
            prompt: cinematicPrompt,
            image_url: options.venueReferenceUrl,
            image_prompt_strength: 0.12, // 12% venue anchor — prompt must dominate
            aspect_ratio: imageSize === "landscape_16_9" ? "16:9" : imageSize === "portrait_16_9" ? "9:16" : "1:1",
            num_images: 1,
            enable_safety_checker: false,
            safety_tolerance: "5",
            output_format: "jpeg",
          },
          logs: false,
          pollInterval: 3000,
        }) as any;
        const images = result?.data?.images ?? result?.images;
        if (images?.[0]?.url) {
          imageUrl = images[0].url;
          console.log(`[CinematicImageGen] fal.ai img2img succeeded → ${(imageUrl ?? "").slice(0, 80)}...`);
        }
      } catch (refErr: any) {
        lastError = refErr;
        console.warn(`[CinematicImageGen] fal.ai img2img failed: ${refErr?.message?.slice(0, 100)}`);
      }
    }
  }

  // ── 3. fal.ai text-to-image fallback ────────────────────────────────────────
  if (!imageUrl) {
    const falKey = process.env.FAL_AI_API_KEY;
    if (falKey) {
      fal.config({ credentials: falKey });
      const models = ["fal-ai/flux-pro/v1.1", "fal-ai/flux/dev"] as const;
      for (const modelId of models) {
        if (imageUrl) break;
        try {
          const isCustomSize = imageSize === "custom_21_9";
          const customDims = isCustomSize ? dimensionMap["custom_21_9"] : null;
          const result = await fal.subscribe(modelId, {
            input: {
              prompt: cinematicPrompt,
              ...(isCustomSize && customDims
                ? { image_size: { width: customDims.width, height: customDims.height } }
                : { image_size: imageSize as any }
              ),
              num_images: 1,
              enable_safety_checker: false,
              safety_tolerance: "5",
              output_format: "jpeg",
            },
            logs: false,
            pollInterval: 3000,
          }) as any;
          const images = result?.data?.images ?? result?.images;
          if (images?.[0]?.url) {
            const returnedW = images[0].width ?? 0;
            const returnedH = images[0].height ?? 0;
            const expectedDims = dimensionMap[imageSize];
            if (returnedW > 0 && returnedH > 0 && expectedDims) {
              const expectedRatio = expectedDims.width / expectedDims.height;
              const actualRatio = returnedW / returnedH;
              const ratioDiff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
              if (ratioDiff > 0.05) {
                console.warn(`[CinematicImageGen] ${modelId} wrong aspect ratio ${returnedW}×${returnedH}. Trying next.`);
                continue;
              }
            }
            imageUrl = images[0].url;
            console.log(`[CinematicImageGen] fal.ai ${modelId} succeeded ${returnedW}×${returnedH} ✓`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[CinematicImageGen] fal.ai ${modelId} failed: ${err?.message?.slice(0, 100)}`);
        }
      }
    }
  }

  // ── 4. Built-in Forge fallback (always available) ───────────────────────────
  if (!imageUrl) {
    try {
      console.warn(`[CinematicImageGen] All external providers failed — falling back to built-in Forge`);
      const { generateImage } = await import("../_core/imageGeneration");
      const forgeResult = await generateImage({ prompt: cinematicPrompt });
      if (forgeResult.url) {
        console.log(`[CinematicImageGen] Forge fallback succeeded → ${forgeResult.url.slice(0, 80)}...`);
        const dims = dimensionMap[imageSize] ?? { width: 1344, height: 768 };
        return { url: forgeResult.url, ...dims };
      }
    } catch (forgeErr: any) {
      console.warn(`[CinematicImageGen] Forge fallback failed: ${forgeErr?.message?.slice(0, 100)}`);
    }
    throw lastError ?? new Error("All image generation providers failed (Grok + fal.ai + Forge)");
  }

  // Download and re-upload to S3 for permanent storage
  const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  const buffer = Buffer.from(response.data);

  const keyPrefix = options.storageKeyPrefix ?? `music-video-storyboard/${Date.now()}`;
  const { url: s3Url } = await storagePut(`${keyPrefix}.jpg`, buffer, "image/jpeg");

  const dims = dimensionMap[imageSize] ?? { width: 1344, height: 768 };
  console.log(`[CinematicImageGen] Saved ${imageSize} storyboard → ${s3Url.slice(0, 80)}...`);
  return { url: s3Url, ...dims };
}
