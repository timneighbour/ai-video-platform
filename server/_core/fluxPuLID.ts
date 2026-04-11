/**
 * Flux PuLID face-consistent image generation via fal.ai
 *
 * Uses FLUX.1 [dev] + PuLID for high-fidelity face preservation from reference photos.
 * Ideal for storyboard preview images where character likeness is critical.
 *
 * Example usage:
 *   const { url } = await generateFaceConsistentImage({
 *     prompt: "Tim playing guitar on stage, dramatic lighting",
 *     referenceImageUrl: "https://cdn.../tim-photo.jpg",
 *     idWeight: 1.2  // Higher = more faithful to face
 *   });
 */

import { fal } from "@fal-ai/client";

export interface FluxPuLIDOptions {
  /** Text prompt describing the scene */
  prompt: string;
  /** URL of reference image containing the face to preserve */
  referenceImageUrl: string;
  /** Weight of face ID preservation (0.5-3.0, default 1.0). Higher = more faithful to face */
  idWeight?: number;
  /** Guidance scale for prompt adherence (0-20, default 4) */
  guidanceScale?: number;
  /** Image size: square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9 */
  imageSize?: "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";
  /** Number of inference steps (higher = better quality but slower) */
  numInferenceSteps?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Negative prompt to exclude from generation */
  negativePrompt?: string;
}

export interface FluxPuLIDResponse {
  url: string;
  seed: number;
}

/**
 * Generate a face-consistent image using Flux PuLID.
 * Requires FAL_AI_API_KEY environment variable to be set.
 */
export async function generateFaceConsistentImage(
  options: FluxPuLIDOptions
): Promise<FluxPuLIDResponse> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) {
    throw new Error("FAL_AI_API_KEY is not configured");
  }

  // Configure fal client with the API key
  fal.config({ credentials: apiKey });

  try {
    const result = await fal.subscribe("fal-ai/flux-pulid", {
      input: {
        prompt: options.prompt,
        reference_image_url: options.referenceImageUrl,
        image_size: options.imageSize || "landscape_4_3",
        num_inference_steps: options.numInferenceSteps || 20,
        guidance_scale: options.guidanceScale || 4,
        id_weight: options.idWeight ?? 1.0,
        negative_prompt: options.negativePrompt || "",
        seed: options.seed ?? -1, // -1 = random
        enable_safety_checker: true,
      },
      logs: false,
    }) as {
      data: {
        images: Array<{ url: string }>;
        seed: number;
      };
    };

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error("Flux PuLID: no image URL in response");
    }

    return {
      url: imageUrl,
      seed: result.data.seed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Flux PuLID generation failed: ${errorMessage}`);
  }
}

/**
 * Generate face-consistent image with queue-based async polling.
 * Useful for longer timeouts or webhook-based workflows.
 */
export async function generateFaceConsistentImageAsync(
  options: FluxPuLIDOptions
): Promise<string> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) {
    throw new Error("FAL_AI_API_KEY is not configured");
  }

  fal.config({ credentials: apiKey });

  const { request_id } = await fal.queue.submit("fal-ai/flux-pulid", {
    input: {
      prompt: options.prompt,
      reference_image_url: options.referenceImageUrl,
      image_size: options.imageSize || "landscape_4_3",
      num_inference_steps: options.numInferenceSteps || 20,
      guidance_scale: options.guidanceScale || 4,
      id_weight: options.idWeight ?? 1.0,
      negative_prompt: options.negativePrompt || "",
      seed: options.seed ?? -1,
      enable_safety_checker: true,
    },
  });

  return request_id;
}

/**
 * Poll the status of an async Flux PuLID request.
 */
export async function pollFaceConsistentImageStatus(
  requestId: string
): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  seed?: number;
}> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) {
    throw new Error("FAL_AI_API_KEY is not configured");
  }

  fal.config({ credentials: apiKey });

  const status = await fal.queue.status("fal-ai/flux-pulid", {
    requestId,
    logs: false,
  });

  if (status.status === "COMPLETED") {
    const result = await fal.queue.result("fal-ai/flux-pulid", { requestId }) as {
      data: {
        images: Array<{ url: string }>;
        seed: number;
      };
    };

    return {
      status: "completed",
      imageUrl: result.data?.images?.[0]?.url,
      seed: result.data?.seed,
    };
  }

  const statusMap: Record<string, "pending" | "processing" | "completed" | "failed"> = {
    IN_QUEUE: "pending",
    IN_PROGRESS: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
  };

  return { status: statusMap[status.status] ?? "processing" };
}
