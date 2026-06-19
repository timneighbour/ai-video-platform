/**
 * GPT-Image-2 provider — WIZ Image primary engine
 * Uses OpenAI Images API (gpt-image-2 model)
 * Supports: text-to-image generation + image editing (inpainting / compositing)
 */
import OpenAI, { toFile } from "openai";

const MODEL = "gpt-image-2";

export type GptImageQuality = "low" | "medium" | "high" | "auto";
export type GptImageSize =
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";

export interface GptImageGenerateOptions {
  prompt: string;
  quality?: GptImageQuality;
  size?: GptImageSize;
  n?: number;
  /** Optional seed for reproducibility (not natively supported — used as prompt suffix) */
  seed?: number;
}

export interface GptImageEditOptions {
  prompt: string;
  /** Buffer of the source image (PNG, JPEG, WebP — max 20 MB) */
  imageBuffer: Buffer;
  imageMimeType?: "image/png" | "image/jpeg" | "image/webp";
  /** Optional mask buffer — transparent areas indicate where to edit */
  maskBuffer?: Buffer;
  quality?: GptImageQuality;
  size?: GptImageSize;
  n?: number;
}

export interface GptImageResult {
  /** base64-encoded PNG */
  b64Json: string;
  /** data URI for direct use */
  dataUri: string;
  revisedPrompt?: string;
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  // Explicitly set baseURL to OpenAI directly — bypasses any OPENAI_BASE_URL proxy
  // that may be set in the environment (e.g. Manus LLM proxy which doesn't support images API)
  return new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1" });
}

/**
 * Generate one or more images from a text prompt using GPT-Image-2.
 */
export async function generateGptImage(
  opts: GptImageGenerateOptions
): Promise<GptImageResult[]> {
  const client = getClient();

  const response = await client.images.generate({
    model: MODEL,
    prompt: opts.prompt,
    quality: opts.quality ?? "medium",
    size: opts.size ?? "1536x1024",
    n: opts.n ?? 1,
    response_format: "b64_json",
  });

  return (response.data ?? []).map((item) => {
    const b64 = item.b64_json ?? "";
    return {
      b64Json: b64,
      dataUri: `data:image/png;base64,${b64}`,
      revisedPrompt: (item as any).revised_prompt ?? undefined,
    };
  });
}

/**
 * Edit an existing image using GPT-Image-2 (inpainting / compositing).
 * The image must be a PNG, JPEG, or WebP ≤ 20 MB.
 */
export async function editGptImage(
  opts: GptImageEditOptions
): Promise<GptImageResult[]> {
  const client = getClient();

  const imageFile = await toFile(
    opts.imageBuffer,
    "image.png",
    { type: opts.imageMimeType ?? "image/png" }
  );

  const params: Parameters<typeof client.images.edit>[0] = {
    model: MODEL,
    image: imageFile,
    prompt: opts.prompt,
    quality: opts.quality ?? "medium",
    size: opts.size ?? "1536x1024",
    n: opts.n ?? 1,
    response_format: "b64_json",
  };

  if (opts.maskBuffer) {
    params.mask = await toFile(opts.maskBuffer, "mask.png", { type: "image/png" });
  }

  const rawResponse = await client.images.edit(params);
  const response = rawResponse as unknown as { data: Array<{ b64_json?: string; revised_prompt?: string }> };

  return (response.data ?? []).map((item) => {
    const b64 = item.b64_json ?? "";
    return {
      b64Json: b64,
      dataUri: `data:image/png;base64,${b64}`,
      revisedPrompt: (item as any).revised_prompt ?? undefined,
    };
  });
}

/**
 * Convert a base64 PNG string to a Buffer.
 */
export function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}
