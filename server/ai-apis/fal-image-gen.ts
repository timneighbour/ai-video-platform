/**
 * Cinematic Storyboard Image Generator
 * Uses fal.ai Flux Pro to generate storyboard reference images in the correct
 * aspect ratio for WaveSpeed image-to-video. WaveSpeed i2v inherits the input
 * image's aspect ratio, so storyboard images MUST match the target export format.
 *
 * Model: fal-ai/flux-pro/v1.1 (best quality for character consistency)
 * Fallback: fal-ai/flux/dev
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
   * When provided, uses fal-ai/flux-pro/v1.1-ultra with image_prompt_strength
   * to anchor the background to the real venue while keeping character freedom.
   */
  venueReferenceUrl?: string;
}

export interface CinematicImageResult {
  url: string;
  width: number;
  height: number;
}

/**
 * Generate a cinematic storyboard image using fal.ai Flux Pro.
 * The output image matches the target aspect ratio so WaveSpeed i2v
 * inherits the correct frame dimensions natively.
 */
export async function generateCinematicStoryboardImage(
  options: CinematicImageOptions
): Promise<CinematicImageResult> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not configured");

  fal.config({ credentials: apiKey });

  const imageSize = aspectRatioToFluxSize(options.aspectRatio ?? "16:9");

  // Enhance the prompt for cinematic quality.
  // CRITICAL FRAMING RULE: strip any crop-inducing framing terms from the scene prompt before
  // passing to the image model. Terms like "close-up", "head-and-shoulders", "medium close-up"
  // cause the model to zoom in and cut off the top of the subject's head.
  // We replace them with safe wide/medium framing language, then append a hard no-crop constraint.
  const safenedPrompt = (options.prompt ?? "")
    .replace(/\bextreme close[- ]?up\b/gi, "medium shot")
    .replace(/\bclose[- ]?up\b/gi, "medium shot")
    .replace(/\bhead[- ]and[- ]shoulders\b/gi, "medium wide shot")
    .replace(/\bMCU\b/g, "medium wide shot")
    .replace(/\bmedium close[- ]?up\b/gi, "medium wide shot")
    .replace(/\btight shot\b/gi, "medium shot")
    .replace(/\bface[- ]?only\b/gi, "medium shot");
  const cinematicPrompt = `${safenedPrompt}, FULL HEAD VISIBLE with generous headroom above the subject, entire head and hair fully within frame, subject NOT cropped at top, medium wide shot composition, cinematic widescreen, professional film lighting, photorealistic, 8K quality, dramatic depth of field, movie still`;

  let imageUrl: string | undefined;

  // If a venue reference image is provided, use flux-pro img2img to anchor the environment
  if (options.venueReferenceUrl) {
    try {
      const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
        input: {
          prompt: cinematicPrompt,
          image_url: options.venueReferenceUrl,
          image_prompt_strength: 0.35, // 35% venue anchor, 65% creative freedom for characters
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
        console.log(`[CinematicImageGen] Used venue reference (flux-pro-ultra img2img) → ${(imageUrl ?? "").slice(0, 80)}...`);
      }
    } catch (refErr: any) {
      console.warn(`[CinematicImageGen] Venue reference img2img failed, falling back to text-only: ${refErr?.message?.slice(0, 100)}`);
    }
  }

  // Dimension map — used both for aspect ratio guard and return value
  const dimensionMap: Record<string, { width: number; height: number }> = {
    "landscape_16_9": { width: 1344, height: 768 },
    "portrait_16_9":  { width: 768, height: 1344 },
    "square_hd":      { width: 1024, height: 1024 },
    "landscape_4_3":  { width: 1365, height: 1024 },
    "portrait_4_3":   { width: 1024, height: 1365 },
    "custom_21_9":    { width: 2048, height: 877 },  // True 21:9 cinematic ultra-wide
  };

  // Try Flux Pro first, fall back to Flux Dev
  // IMPORTANT: Both models MUST receive the correct image_size so WaveSpeed i2v
  // inherits the right aspect ratio. Flux Dev supports image_size identically.
  const models = ["fal-ai/flux-pro/v1.1", "fal-ai/flux/dev"] as const;
  let lastError: Error | null = null;

  for (const modelId of models) {
    if (imageUrl) break; // already got one from venue reference
    try {
      // For custom_21_9, Flux doesn't have a native size — use explicit width/height instead
      const isCustomSize = imageSize === "custom_21_9";
      const customDims = isCustomSize ? dimensionMap["custom_21_9"] : null;
      const result = await fal.subscribe(modelId, {
        input: {
          prompt: cinematicPrompt,
          ...(isCustomSize && customDims
            ? { image_size: { width: customDims.width, height: customDims.height } }
            : { image_size: imageSize as any }  // MUST match job aspectRatio — e.g. "landscape_16_9" for 16:9
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
        // ── ASPECT RATIO GUARD: verify the returned image matches the target ──────
        // Flux Dev sometimes ignores image_size and returns 1024×1024.
        // If the returned image dimensions don't match, skip and try next model.
        const returnedW = images[0].width ?? 0;
        const returnedH = images[0].height ?? 0;
        const expectedDims = dimensionMap[imageSize];
        if (returnedW > 0 && returnedH > 0 && expectedDims) {
          const expectedRatio = expectedDims.width / expectedDims.height;
          const actualRatio = returnedW / returnedH;
          const ratioDiff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
          if (ratioDiff > 0.05) {
            console.warn(`[CinematicImageGen] ${modelId} returned wrong aspect ratio: ${returnedW}×${returnedH} (expected ~${expectedDims.width}×${expectedDims.height} for ${imageSize}). Trying next model.`);
            continue; // skip this result, try next model
          }
        }
        imageUrl = images[0].url;
        console.log(`[CinematicImageGen] ${modelId} returned ${returnedW}×${returnedH} for ${imageSize} ✓`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[CinematicImageGen] ${modelId} failed: ${err?.message?.slice(0, 100)}`);
    }
  }

  if (!imageUrl) {
    throw lastError ?? new Error("All fal.ai image generation models failed");
  }

  // Download and re-upload to S3 for permanent storage
  const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  const buffer = Buffer.from(response.data);

  const keyPrefix = options.storageKeyPrefix ?? `music-video-storyboard/${Date.now()}`;
  const { url: s3Url } = await storagePut(`${keyPrefix}.jpg`, buffer, "image/jpeg");

  const dims = dimensionMap[imageSize] ?? { width: 1344, height: 768 };

  console.log(`[CinematicImageGen] Generated ${imageSize} storyboard image → ${s3Url.slice(0, 80)}...`);
  return { url: s3Url, ...dims };
}
