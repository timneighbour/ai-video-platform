/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  // Read body as text first to guard against plain-text rate-limit responses
  const rawText = await response.text().catch(() => "");
  const trimmed = rawText.trim();

  if (!response.ok) {
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${trimmed ? `: ${trimmed}` : ""}`
    );
  }

  // Detect plain-text rate-limit / quota responses (HTTP 200 but non-JSON body)
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("rate exceeded") ||
    lower.startsWith("rate limit") ||
    lower.startsWith("too many requests") ||
    lower.startsWith("usage exhausted") ||
    lower.startsWith("quota exceeded")
  ) {
    throw new Error(`Image generation failed: rate limited – ${trimmed}`);
  }

  let result: { image: { b64Json: string; mimeType: string } };
  try {
    result = JSON.parse(trimmed) as { image: { b64Json: string; mimeType: string } };
  } catch {
    throw new Error(`Image generation failed: invalid JSON response – ${trimmed.slice(0, 200)}`);
  }
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url,
  };
}
