/**
 * Cinematic Storyboard Image Generator
 *
 * Provider priority:
 *   1. Black Forest Labs FLUX.1 Pro Ultra (direct API — best quality, no restrictions)
 *   2. Grok grok-imagine-image-quality (fallback)
 *   3. Built-in Forge image API — final fallback, always available
 *
 * Venue DNA: Lyndhurst Hall, Air Studios — locked architectural description
 * injected into every prompt to ensure scene-to-scene consistency.
 *
 * Output images match the target aspect ratio so WaveSpeed i2v / Seedance
 * inherits the correct frame dimensions natively.
 */

import { storagePut } from "../storage";
import axios from "axios";

/** BFL API base URL — api.bfl.ai works from Manus hosting; api.bfl.ml is TLS-blocked */
const BFL_API_BASE = "https://api.bfl.ai/v1";

/**
 * Scene-type venue DNA variants.
 * Each entry is injected into the prompt to anchor the environment.
 * The default (concert_hall) is Lyndhurst Hall / Air Studios.
 */
export const VENUE_DNA: Record<string, string> = {
  concert_hall: `grand Victorian concert hall interior, soaring vaulted ceiling painted deep midnight blue with gold leaf star motifs, ornate Gothic arched clerestory windows with amber stained glass casting warm honeyed light, rich dark mahogany wood panelling on walls, tiered gallery balconies with carved wooden balustrades, a full symphony orchestra seated on a raised wooden stage, conductor's podium centre-stage, warm amber and gold stage lighting, polished parquet hardwood floor, massive pipe organ visible at the far end, atmospheric haze, cinematic depth of field`,
  live_arena: `massive indoor arena concert, sold-out crowd of tens of thousands, enormous LED video wall backdrop, dramatic overhead rig with moving lights and lasers, smoke machines, confetti cannons, stage monitors and speaker stacks, pyrotechnic bursts, high-energy atmosphere, cinematic wide shot`,
  music_video_studio: `sleek modern recording studio performance space, exposed brick walls, warm Edison bulb string lights, vintage microphone on stand, grand piano in background, moody directional lighting, intimate atmosphere, cinematic depth of field, photorealistic`,
  outdoor_festival: `outdoor music festival main stage, golden hour sunlight, vast open-air crowd, festival flags and banners, dramatic sky with clouds, wide stage with production lighting rig, natural landscape backdrop, cinematic widescreen`,
  recording_studio: `professional recording studio control room, mixing desk with glowing faders, acoustic foam panels, warm amber studio lighting, through-glass view of live room, vintage outboard gear, intimate professional atmosphere, cinematic depth of field`,
};

/**
 * Locked venue DNA — Lyndhurst Hall, Air Studios (default)
 * Also available as VENUE_DNA['concert_hall'] for explicit selection.
 */
const LYNDHURST_HALL_DNA = VENUE_DNA.concert_hall;

/** Map export aspect ratio to BFL width/height */
function aspectRatioToBflDimensions(
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9"
): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":  return { width: 1344, height: 768 };
    case "9:16":  return { width: 768, height: 1344 };
    case "1:1":   return { width: 1024, height: 1024 };
    case "4:3":   return { width: 1365, height: 1024 };
    case "3:4":   return { width: 1024, height: 1365 };
    case "21:9":  return { width: 2048, height: 877 };
    default:      return { width: 1344, height: 768 };
  }
}

/** Map aspect ratio to fal.ai image_size string (kept for reference) */
function aspectRatioToFluxSize(
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9"
): string {
  switch (aspectRatio) {
    case "16:9":  return "landscape_16_9";
    case "9:16":  return "portrait_16_9";
    case "1:1":   return "square_hd";
    case "4:3":   return "landscape_4_3";
    case "3:4":   return "portrait_4_3";
    case "21:9":  return "custom_21_9";
    default:      return "landscape_16_9";
  }
}

export interface CinematicImageOptions {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
  /** S3 key prefix for storage (e.g. "music-video-storyboard/660001-scene-1") */
  storageKeyPrefix?: string;
  /** Optional venue/environment reference image URL (used by fal.ai img2img path only) */
  venueReferenceUrl?: string;
  /** Scene index used to vary the seed for diversity across scenes */
  sceneIndex?: number;
  /**
   * Character reference image URL — passed to BFL as `image_prompt` with low strength (0.15)
   * to anchor the character's face/appearance without overriding the scene composition.
   * Use the character's masterPortraitUrl or primary uploaded photo.
   */
  characterReferenceUrl?: string;
  /**
   * Scene-type key for venue DNA selection.
   * One of: 'concert_hall' | 'live_arena' | 'music_video_studio' | 'outdoor_festival' | 'recording_studio'
   * Defaults to 'concert_hall' (Lyndhurst Hall / Air Studios).
   */
  sceneType?: string;
}

export interface CinematicImageResult {
  url: string;
  width: number;
  height: number;
}

/**
 * Sanitise a scene prompt — strip crop-inducing framing terms, inject
 * venue DNA (defaulting to Lyndhurst Hall), and append no-crop constraints.
 */
function buildCinematicPrompt(rawPrompt: string, sceneType?: string): string {
  const safened = rawPrompt
    .replace(/\bextreme close[- ]?up\b/gi, "medium shot")
    .replace(/\bclose[- ]?up\b/gi, "medium shot")
    .replace(/\bhead[- ]and[- ]shoulders\b/gi, "medium wide shot")
    .replace(/\bMCU\b/g, "medium wide shot")
    .replace(/\bmedium close[- ]?up\b/gi, "medium wide shot")
    .replace(/\btight shot\b/gi, "medium shot")
    .replace(/\bface[- ]?only\b/gi, "medium shot");

  const venueDna = (sceneType && VENUE_DNA[sceneType]) ? VENUE_DNA[sceneType] : LYNDHURST_HALL_DNA;
  return [
    safened,
    venueDna,
    "FULL HEAD VISIBLE with generous headroom above the subject, entire head and hair fully within frame, subject NOT cropped at top",
    "medium wide shot composition, cinematic widescreen, professional film lighting, photorealistic, 8K quality, dramatic depth of field, movie still",
  ].join(", ");
}

/**
 * ── Provider 1: Black Forest Labs FLUX.1 Pro Ultra ───────────────────────────
 * Direct API — no proxy, no middleman. Best photorealistic quality available.
 * Uses async polling: POST to /flux-pro-1.1-ultra → poll /get_result until ready.
 */
async function tryBfl(
  cinematicPrompt: string,
  dimensions: { width: number; height: number },
  sceneIndex: number,
  characterReferenceUrl?: string
): Promise<string | undefined> {
  const bflKey = process.env.BFL_API_KEY;
  if (!bflKey) return undefined;

  try {
    // Step 1: Submit the generation request
    const submitRes = await fetch(`${BFL_API_BASE}/flux-pro-1.1-ultra`, {
      method: "POST",
      headers: {
        "x-key": bflKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        prompt: cinematicPrompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: 40,
        guidance: 3.5,
        seed: 42 + sceneIndex * 7, // deterministic but varied per scene
        output_format: "jpeg",
        safety_tolerance: 6,
        raw: false,
        // Character reference injection: subtle face/appearance anchor (0.15 = minimal influence)
        // Keeps scene composition intact while nudging the model toward the character's likeness
        ...(characterReferenceUrl ? {
          image_prompt: characterReferenceUrl,
          image_prompt_strength: 0.15,
        } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => "");
      console.warn(`[CinematicImageGen] BFL submit HTTP ${submitRes.status}: ${errText.slice(0, 200)}`);
      return undefined;
    }

    const submitJson = (await submitRes.json()) as { id?: string; polling_url?: string };
    const taskId = submitJson?.id;
    // Use the returned polling_url if present (may point to regional endpoint like api.us3.bfl.ai)
    const pollBaseUrl = submitJson?.polling_url ?? `${BFL_API_BASE}/get_result?id=${taskId}`;
    if (!taskId) {
      console.warn(`[CinematicImageGen] BFL submit returned no task ID`);
      return undefined;
    }

    console.log(`[CinematicImageGen] BFL task submitted: ${taskId} (polling: ${pollBaseUrl.slice(0, 60)})`);
    console.log(`[CinematicImageGen] BFL prompt (first 300): ${cinematicPrompt.slice(0, 300)}`);

    // Step 2: Poll for result (max 120s, 3s intervals)
    const maxAttempts = 40;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));

      const pollRes = await fetch(pollBaseUrl, {
        headers: { "x-key": bflKey, "Accept": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!pollRes.ok) continue;

      const pollJson = (await pollRes.json()) as {
        status?: string;
        result?: { sample?: string; url?: string };
      };

      const status = pollJson?.status;
      if (status === "Ready") {
        const imageUrl = pollJson?.result?.sample ?? pollJson?.result?.url;
        if (imageUrl) {
          console.log(`[CinematicImageGen] BFL FLUX.1 Pro Ultra succeeded (attempt ${attempt + 1}) → ${imageUrl.slice(0, 80)}...`);
          return imageUrl;
        }
      } else if (status === "Error" || status === "Content Moderated" || status === "Request Moderated") {
        console.warn(`[CinematicImageGen] BFL task ${taskId} ended with status: ${status}`);
        return undefined;
      }
      // else: Pending / Processing — keep polling
    }

    console.warn(`[CinematicImageGen] BFL task ${taskId} timed out after ${maxAttempts} polls`);
    return undefined;
  } catch (err: any) {
    console.warn(`[CinematicImageGen] BFL failed: ${err?.message?.slice(0, 100)}`);
    return undefined;
  }
}

/**
 * ── Provider 2: Grok grok-imagine-image-quality ──────────────────────────────
 * Fallback if BFL is unavailable. Returns a temporary URL.
 */
async function tryGrok(
  cinematicPrompt: string
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
 * Provider priority: BFL FLUX.1 Pro Ultra → Grok → Forge
 */
export async function generateCinematicStoryboardImage(
  options: CinematicImageOptions
): Promise<CinematicImageResult> {
  const aspectRatio = options.aspectRatio ?? "16:9";
  const dimensions = aspectRatioToBflDimensions(aspectRatio);
  const imageSize = aspectRatioToFluxSize(aspectRatio);
    const cinematicPrompt = buildCinematicPrompt(options.prompt ?? "", options.sceneType);
  const sceneIndex = options.sceneIndex ?? 0;
  let imageUrl: string | undefined;
  let lastError: Error | null = null;
  if (options.characterReferenceUrl) {
    console.log(`[CinematicImageGen] Character reference injection active → ${options.characterReferenceUrl.slice(0, 80)}... (strength=0.15)`);
  }
  // ── 1. BFL FLUX.1 Pro Ultra (primary — best quality, no restrictions) ────────
  imageUrl = await tryBfl(cinematicPrompt, dimensions, sceneIndex, options.characterReferenceUrl);

  // ── 2. Grok (fallback) ───────────────────────────────────────────────────────
  if (!imageUrl) {
    console.warn(`[CinematicImageGen] BFL unavailable — trying Grok fallback`);
    imageUrl = await tryGrok(cinematicPrompt);
  }

  // ── 3. Built-in Forge fallback (always available) ───────────────────────────
  if (!imageUrl) {
    try {
      console.warn(`[CinematicImageGen] All external providers failed — falling back to built-in Forge`);
      const { generateImage } = await import("../_core/imageGeneration");
      const forgeResult = await generateImage({ prompt: cinematicPrompt });
      if (forgeResult.url) {
        console.log(`[CinematicImageGen] Forge fallback succeeded → ${forgeResult.url.slice(0, 80)}...`);
        return { url: forgeResult.url, ...dimensions };
      }
    } catch (forgeErr: any) {
      console.warn(`[CinematicImageGen] Forge fallback failed: ${forgeErr?.message?.slice(0, 100)}`);
    }
    throw lastError ?? new Error("All image generation providers failed (BFL + Grok + Forge)");
  }

  // Download and re-upload to S3 for permanent storage
  const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  const buffer = Buffer.from(response.data);

  const keyPrefix = options.storageKeyPrefix ?? `music-video-storyboard/${Date.now()}`;
  const { url: s3Url } = await storagePut(`${keyPrefix}.jpg`, buffer, "image/jpeg");

  console.log(`[CinematicImageGen] Saved ${imageSize} storyboard → ${s3Url.slice(0, 80)}...`);
  return { url: s3Url, ...dimensions };
}
