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
    case "21:9":  return "landscape_16_9";   // closest available
    default:      return "landscape_16_9";
  }
}

export interface CinematicImageOptions {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
  /** S3 key prefix for storage (e.g. "music-video-storyboard/660001-scene-1") */
  storageKeyPrefix?: string;
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

  // Enhance the prompt for cinematic quality
  const cinematicPrompt = `${options.prompt}, cinematic widescreen composition, professional film lighting, photorealistic, 8K quality, dramatic depth of field, movie still`;

  let imageUrl: string | undefined;

  // Try Flux Pro first, fall back to Flux Dev
  const models = ["fal-ai/flux-pro/v1.1", "fal-ai/flux/dev"] as const;
  let lastError: Error | null = null;

  for (const modelId of models) {
    try {
      const result = await fal.subscribe(modelId, {
        input: {
          prompt: cinematicPrompt,
          image_size: imageSize as any,
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

  // Determine actual dimensions from the imageSize string
  const dimensionMap: Record<string, { width: number; height: number }> = {
    "landscape_16_9": { width: 1344, height: 768 },
    "portrait_16_9":  { width: 768, height: 1344 },
    "square_hd":      { width: 1024, height: 1024 },
    "landscape_4_3":  { width: 1365, height: 1024 },
    "portrait_4_3":   { width: 1024, height: 1365 },
  };
  const dims = dimensionMap[imageSize] ?? { width: 1344, height: 768 };

  console.log(`[CinematicImageGen] Generated ${imageSize} storyboard image → ${s3Url.slice(0, 80)}...`);
  return { url: s3Url, ...dims };
}
