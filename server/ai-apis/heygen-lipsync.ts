/**
 * HeyGen Lip Sync Integration — Hero-Shot Only
 *
 * Strategy: selective premium lip sync applied ONLY to hero shots (close-up
 * performance scenes where the artist is visibly singing). This avoids the
 * "AI avatar karaoke" problem of applying lip sync universally and keeps
 * costs proportionate.
 *
 * API: HeyGen v2 Video Translation / Lipsync
 * POST https://api.heygen.com/v2/video_translate
 * GET  https://api.heygen.com/v1/video_translate_status.get?video_translate_id=...
 *
 * Note: HeyGen's "video_translate" endpoint is the production-stable lipsync
 * endpoint. It accepts a video URL + audio URL and returns a lipsync job ID.
 * The v1 status endpoint is still the correct polling path as of 2026.
 */

import axios from "axios";

const HEYGEN_API_BASE = "https://api.heygen.com";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeyGenLipSyncRequest {
  /** Publicly accessible URL of the source video clip (the hero shot) */
  videoUrl: string;
  /** Publicly accessible URL of the audio segment (the song section for this scene) */
  audioUrl: string;
  /** Optional title for the lipsync job — used in HeyGen dashboard */
  title?: string;
  /** Start time in seconds for partial lipsync (optional) */
  startTime?: number;
  /** End time in seconds for partial lipsync (optional) */
  endTime?: number;
}

export interface HeyGenLipSyncJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  errorMessage?: string;
}

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * Submit a hero-shot lip sync job to HeyGen.
 * Returns the job ID for polling.
 */
export async function submitHeyGenLipSync(
  request: HeyGenLipSyncRequest
): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured. Cannot submit lip sync job.");
  }

  const payload: Record<string, unknown> = {
    video_url: request.videoUrl,
    audio_url: request.audioUrl,
    title: request.title ?? "WizAdora Hero Shot Lip Sync",
  };

  if (request.startTime !== undefined) payload.start_time = request.startTime;
  if (request.endTime !== undefined) payload.end_time = request.endTime;

  console.log(`[HeyGenLipSync] Submitting hero-shot lipsync job: ${request.title ?? "untitled"}`);
  console.log(`[HeyGenLipSync]   video: ${request.videoUrl.slice(0, 80)}...`);
  console.log(`[HeyGenLipSync]   audio: ${request.audioUrl.slice(0, 80)}...`);

  const response = await axios.post(
    `${HEYGEN_API_BASE}/v2/video_translate`,
    payload,
    {
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const data = response.data;

  // HeyGen v2 response: { code: 100, data: { video_translate_id: "..." } }
  if (data?.code !== 100 || !data?.data?.video_translate_id) {
    throw new Error(
      `HeyGen lipsync submission failed: code=${data?.code}, message=${data?.message ?? "unknown"}`
    );
  }

  const jobId: string = data.data.video_translate_id;
  console.log(`[HeyGenLipSync] Job submitted → ID: ${jobId}`);
  return jobId;
}

// ── Poll ──────────────────────────────────────────────────────────────────────

/**
 * Poll the status of a HeyGen lip sync job.
 * Returns the current status and video URL if completed.
 */
export async function pollHeyGenLipSync(jobId: string): Promise<HeyGenLipSyncJob> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured.");
  }

  const response = await axios.get(
    `${HEYGEN_API_BASE}/v1/video_translate_status.get`,
    {
      params: { video_translate_id: jobId },
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    }
  );

  const data = response.data;

  // HeyGen v1 status response:
  // { code: 100, data: { status: "completed", url: "https://..." } }
  if (data?.code !== 100) {
    throw new Error(
      `HeyGen lipsync poll failed: code=${data?.code}, message=${data?.message ?? "unknown"}`
    );
  }

  const statusData = data.data ?? {};
  const rawStatus: string = statusData.status ?? "pending";

  // Normalise status to our internal enum
  const status: HeyGenLipSyncJob["status"] =
    rawStatus === "completed" ? "completed"
    : rawStatus === "failed" || rawStatus === "error" ? "failed"
    : rawStatus === "processing" || rawStatus === "running" ? "processing"
    : "pending";

  return {
    jobId,
    status,
    videoUrl: statusData.url ?? statusData.video_url ?? undefined,
    errorMessage: statusData.error_message ?? statusData.message ?? undefined,
  };
}

// ── Wait (with timeout) ───────────────────────────────────────────────────────

/**
 * Wait for a HeyGen lip sync job to complete, polling every `intervalMs`.
 * Throws if the job fails or exceeds `timeoutMs`.
 *
 * Default timeout: 5 minutes (hero shots are typically 5–10s clips).
 */
export async function waitForHeyGenLipSync(
  jobId: string,
  timeoutMs = 5 * 60 * 1000,
  intervalMs = 8_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await pollHeyGenLipSync(jobId);

    if (job.status === "completed") {
      if (!job.videoUrl) {
        throw new Error(`HeyGen lipsync job ${jobId} completed but returned no video URL.`);
      }
      console.log(`[HeyGenLipSync] Job ${jobId} COMPLETED → ${job.videoUrl.slice(0, 80)}...`);
      return job.videoUrl;
    }

    if (job.status === "failed") {
      throw new Error(
        `HeyGen lipsync job ${jobId} FAILED: ${job.errorMessage ?? "unknown error"}`
      );
    }

    console.log(`[HeyGenLipSync] Job ${jobId} status: ${job.status} — waiting ${intervalMs}ms...`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `HeyGen lipsync job ${jobId} timed out after ${Math.round(timeoutMs / 1000)}s.`
  );
}

// ── Hero-Shot Detection ───────────────────────────────────────────────────────

/**
 * Determine whether a scene qualifies as a "hero shot" eligible for
 * premium HeyGen lip sync.
 *
 * Criteria:
 * - Scene index 0 (opening shot) always qualifies
 * - Scenes with lipSync=true AND a character close-up prompt keyword
 * - Scenes explicitly flagged as hero shots in the storyboard
 */
export function isHeroShot(
  sceneIndex: number,
  lipSync: boolean,
  prompt: string,
  isExplicitHeroShot?: boolean
): boolean {
  if (isExplicitHeroShot) return true;
  if (sceneIndex === 0 && lipSync) return true;

  // Close-up performance keywords in the prompt
  const heroKeywords = [
    "close-up", "closeup", "close up",
    "face", "portrait",
    "singing", "performing",
    "microphone", "mic",
    "hero shot", "hero_shot",
    "tight shot", "medium close",
  ];

  const promptLower = prompt.toLowerCase();
  const hasHeroKeyword = heroKeywords.some((kw) => promptLower.includes(kw));

  return lipSync && hasHeroKeyword;
}
