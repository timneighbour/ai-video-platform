/**
 * WizAI Lip-Sync Provider Abstraction Layer
 * ==========================================
 * Routes lip-sync jobs to the configured provider via WIZ_LIPSYNC_PROVIDER env variable.
 *
 * Supported providers:
 *   heygen      — HeyGen Precision v3 (video-in + audio-in → video-out)  [DEFAULT]
 *   infinitetalk — WaveSpeed InfiniteTalk (image-in + audio-in → video-out)
 *   latentsync  — Self-hosted LatentSync on RunPod (video-in + audio-in → video-out) [STUB]
 *
 * To switch providers: set WIZ_LIPSYNC_PROVIDER=latentsync in environment secrets.
 * No code changes required.
 *
 * Fallback chain (automatic):
 *   heygen → latentsync (when configured) → infinitetalk
 */

import { submitHeyGenLipSyncV3, pollHeyGenLipSyncV3, isHeyGenConfigured } from "./heygen-lipsync";
import { submitInfiniteTalkLipSync, pollInfiniteTalkLipSync } from "./infinitetalk-lipsync";

// ─── Provider type ────────────────────────────────────────────────────────────

export type LipSyncProvider = "heygen" | "infinitetalk" | "latentsync";

export interface LipSyncSubmitParams {
  /** Rendered video URL (Seedance output) — required for heygen and latentsync */
  videoUrl?: string;
  /** Character portrait image URL — required for infinitetalk fallback */
  imageUrl?: string;
  /** Isolated vocal stem URL for this scene window */
  audioUrl: string;
  /** Human-readable title for tracking */
  title?: string;
  /** Singing = use precision mode; speech = use standard mode */
  mode?: "precision" | "standard";
  /** Scene prompt for InfiniteTalk context */
  prompt?: string;
}

export interface LipSyncPollResult {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

// ─── Provider selection ───────────────────────────────────────────────────────

/**
 * Returns the configured primary lip-sync provider.
 * Falls back to heygen if WIZ_LIPSYNC_PROVIDER is not set or unrecognised.
 */
export function getPrimaryLipSyncProvider(): LipSyncProvider {
  const env = process.env.WIZ_LIPSYNC_PROVIDER?.toLowerCase().trim();
  if (env === "infinitetalk") return "infinitetalk";
  if (env === "latentsync") return "latentsync";
  return "heygen"; // default
}

/**
 * Returns true if LatentSync is configured (RunPod endpoint + API key present).
 * Currently a stub — returns false until self-hosted deployment is complete.
 */
export function isLatentSyncConfigured(): boolean {
  return !!(process.env.LATENTSYNC_ENDPOINT && process.env.LATENTSYNC_API_KEY);
}

/**
 * Returns the full ordered fallback chain for the current configuration.
 * Example: ["heygen", "latentsync", "infinitetalk"]
 */
export function getLipSyncFallbackChain(): LipSyncProvider[] {
  const primary = getPrimaryLipSyncProvider();
  const chain: LipSyncProvider[] = [primary];

  // Add LatentSync to chain if configured and not already primary
  if (primary !== "latentsync" && isLatentSyncConfigured()) {
    chain.push("latentsync");
  }

  // InfiniteTalk is always last resort
  if (primary !== "infinitetalk") {
    chain.push("infinitetalk");
  }

  return chain;
}

// ─── Submit ───────────────────────────────────────────────────────────────────

/**
 * Submit a lip-sync job to the specified provider.
 * Returns a prefixed task ID: "heygen:<id>", "latentsync:<id>", or "<id>" for infinitetalk.
 */
export async function submitLipSync(
  provider: LipSyncProvider,
  params: LipSyncSubmitParams
): Promise<string> {
  switch (provider) {
    case "heygen": {
      if (!params.videoUrl) throw new Error("HeyGen Precision requires videoUrl");
      const id = await submitHeyGenLipSyncV3({
        videoUrl: params.videoUrl,
        audioUrl: params.audioUrl,
        title: params.title ?? "WizAI Scene",
        mode: params.mode === "standard" ? "speed" : "precision",
        keepSameFormat: true,
      });
      return `heygen:${id}`;
    }

    case "latentsync": {
      // ── STUB: LatentSync self-hosted (RunPod Serverless) ──────────────────
      // This will be implemented when the RunPod endpoint is deployed.
      // Expected API:
      //   POST ${LATENTSYNC_ENDPOINT}/predictions
      //   { "input": { "video": videoUrl, "audio": audioUrl } }
      //   Returns { "id": "<prediction_id>" }
      //
      // To activate: deploy LatentSync to RunPod, set LATENTSYNC_ENDPOINT and LATENTSYNC_API_KEY
      throw new Error("LatentSync provider not yet deployed. Set LATENTSYNC_ENDPOINT and LATENTSYNC_API_KEY to activate.");
    }

    case "infinitetalk": {
      if (!params.imageUrl && !params.videoUrl) {
        throw new Error("InfiniteTalk requires imageUrl or videoUrl");
      }
      const result = await submitInfiniteTalkLipSync({
        imageUrl: params.imageUrl ?? params.videoUrl!,
        audioUrl: params.audioUrl,
        prompt: params.prompt,
        resolution: "720p",
      });
      return result.taskId;
    }

    default:
      throw new Error(`Unknown lip-sync provider: ${provider}`);
  }
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

/**
 * Poll a lip-sync job by its prefixed task ID.
 * Automatically routes to the correct provider based on the prefix.
 */
export async function pollLipSync(taskId: string): Promise<LipSyncPollResult> {
  if (taskId.startsWith("heygen:")) {
    const id = taskId.slice(7);
    const result = await pollHeyGenLipSyncV3(id);
    return {
      status: result.status === "completed" ? "completed"
        : result.status === "failed" ? "failed"
        : "processing",
      videoUrl: result.videoUrl,
    };
  }

  if (taskId.startsWith("latentsync:")) {
    // ── STUB: LatentSync polling ──────────────────────────────────────────────
    // Expected API:
    //   GET ${LATENTSYNC_ENDPOINT}/predictions/<id>
    //   Returns { "status": "processing"|"succeeded"|"failed", "output": "<video_url>" }
    throw new Error("LatentSync polling not yet implemented.");
  }

  // Default: InfiniteTalk (no prefix)
  const result = await pollInfiniteTalkLipSync(taskId);
  return {
    status: result.status === "completed" ? "completed"
      : result.status === "failed" ? "failed"
      : "processing",
    videoUrl: result.videoUrl,
  };
}

// ─── Convenience: submit with automatic fallback chain ────────────────────────

/**
 * Submit a lip-sync job using the full fallback chain.
 * Tries each provider in order, falling back on error.
 * Returns { taskId, provider } so the caller can store which provider was used.
 */
export async function submitLipSyncWithFallback(
  params: LipSyncSubmitParams
): Promise<{ taskId: string; provider: LipSyncProvider }> {
  const chain = getLipSyncFallbackChain();
  const errors: string[] = [];

  for (const provider of chain) {
    // Skip HeyGen if not configured
    if (provider === "heygen" && !isHeyGenConfigured()) {
      errors.push(`heygen: not configured`);
      continue;
    }
    // Skip LatentSync if not configured
    if (provider === "latentsync" && !isLatentSyncConfigured()) {
      errors.push(`latentsync: not configured`);
      continue;
    }

    try {
      const taskId = await submitLipSync(provider, params);
      console.log(`[LipSyncProvider] Submitted via ${provider} → ${taskId}`);
      return { taskId, provider };
    } catch (err: any) {
      const msg = String(err?.message ?? err).slice(0, 200);
      console.warn(`[LipSyncProvider] ${provider} failed: ${msg}`);
      errors.push(`${provider}: ${msg}`);
    }
  }

  throw new Error(`All lip-sync providers failed:\n${errors.join("\n")}`);
}
