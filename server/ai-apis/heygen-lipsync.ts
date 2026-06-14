/**
 * HeyGen Lipsync — Precision Mode (v3 API)
 *
 * Uses HeyGen's v3 /lipsyncs endpoint in "precision" mode for frame-accurate
 * mouth movements on music video performance scenes.
 *
 * This is a VIDEO-IN / VIDEO-OUT lip-sync provider:
 *   - Input: a rendered video clip (from Seedance) + isolated vocal stem audio
 *   - Output: the same video with corrected lip movements synced to the audio
 *
 * This is the SAME contract as WaveSpeed InfiniteTalk — it is a drop-in
 * alternative. The heartbeat uses `lipSyncProvider` on the job to route
 * between InfiniteTalk (WaveSpeed) and HeyGen.
 *
 * API Reference:
 *   POST https://api.heygen.com/v3/lipsyncs
 *   GET  https://api.heygen.com/v3/lipsyncs/{lipsync_id}
 *
 * Pricing: credits deducted per second of output video.
 * Account has 600 credits available as of 2026-06-02.
 *
 * Key differences from WaveSpeed InfiniteTalk:
 *   - Takes a VIDEO URL (not a portrait image) — the character is already in the scene
 *   - Audio is the isolated vocal stem (same as InfiniteTalk)
 *   - mode: "precision" gives frame-accurate lip sync (best for music videos)
 *   - No prompt parameter — HeyGen infers lip movement from the video + audio
 *   - Output: presigned video_url (download and re-upload to S3 for permanence)
 */

import axios from "axios";
import FormData from "form-data";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import ffmpegStatic from "ffmpeg-static";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

// ffmpeg-static ships a static binary that works in Cloud Run.
// Fall back to the system ffmpeg binary if the static binary is absent (dev sandbox).
const _staticPath = ffmpegStatic as string | null;
const ffmpegPath: string = (_staticPath && existsSync(_staticPath))
  ? _staticPath
  : "/usr/bin/ffmpeg";

const HEYGEN_API_BASE = "https://api.heygen.com";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

// ── Audio Mux Helper ─────────────────────────────────────────────────────────

/**
 * Mix an audio clip into a silent video file so HeyGen Precision has an audio
 * track to replace. HeyGen requires the input video to have an audio track —
 * silent videos cause "audio missing or corrupted" errors.
 *
 * Downloads both files, muxes them with ffmpeg-static, returns the muxed buffer.
 */
async function muxAudioIntoVideoBuffer(
  videoUrl: string,
  audioUrl: string,
  sceneId: number | string
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const videoPath = path.join(tmpDir, `heygen_vid_${sceneId}_${Date.now()}.mp4`);
  const audioPath = path.join(tmpDir, `heygen_aud_${sceneId}_${Date.now()}.mp3`);
  const outPath   = path.join(tmpDir, `heygen_mux_${sceneId}_${Date.now()}.mp4`);

  try {
    // Download video
    const vResp = await fetch(videoUrl);
    if (!vResp.ok) throw new Error(`Failed to download video: HTTP ${vResp.status}`);
    fs.writeFileSync(videoPath, Buffer.from(await vResp.arrayBuffer()));

    // Download audio
    const aResp = await fetch(audioUrl);
    if (!aResp.ok) throw new Error(`Failed to download audio: HTTP ${aResp.status}`);
    fs.writeFileSync(audioPath, Buffer.from(await aResp.arrayBuffer()));

    // Mux: copy video stream, encode audio as AAC, trim to shortest stream
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      outPath,
    ]);

    const muxedBuffer = fs.readFileSync(outPath);
    console.log(`[HeyGenLipSyncV3] Muxed video+audio → ${muxedBuffer.length} bytes`);
    return muxedBuffer;
  } finally {
    // Clean up temp files
    for (const p of [videoPath, audioPath, outPath]) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

// ── Asset Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a file (video or audio) to HeyGen's asset storage.
 * HeyGen cannot access external CDN URLs (CloudFront, etc.) — all media must
 * be uploaded to HeyGen's own storage before submitting lip sync jobs.
 *
 * Returns the asset_id for use in lip sync job submission.
 */
async function uploadAssetToHeyGen(
  buffer: Buffer,
  mimeType: "video/mp4" | "audio/mpeg",
  label: string
): Promise<string>;
async function uploadAssetToHeyGen(
  url: string,
  mimeType: "video/mp4" | "audio/mpeg",
  label: string
): Promise<string>;
async function uploadAssetToHeyGen(
  urlOrBuffer: string | Buffer,
  mimeType: "video/mp4" | "audio/mpeg",
  label: string
): Promise<string> {
  if (!HEYGEN_API_KEY) throw new Error("HEYGEN_API_KEY not configured");

  let buffer: Buffer;
  if (typeof urlOrBuffer === "string") {
    console.log(`[HeyGenLipSyncV3] Uploading ${label} to HeyGen asset storage: ${urlOrBuffer.slice(0, 80)}...`);
    const dlResp = await fetch(urlOrBuffer);
    if (!dlResp.ok) throw new Error(`Failed to download ${label}: HTTP ${dlResp.status} from ${urlOrBuffer}`);
    buffer = Buffer.from(await dlResp.arrayBuffer());
  } else {
    console.log(`[HeyGenLipSyncV3] Uploading ${label} buffer (${urlOrBuffer.length} bytes) to HeyGen asset storage...`);
    buffer = urlOrBuffer;
  }

  // Upload to HeyGen /v3/assets
  const form = new FormData();
  const ext = mimeType === "video/mp4" ? "mp4" : "mp3";
  form.append("file", buffer, { filename: `asset.${ext}`, contentType: mimeType });

  const uploadResp = await axios.post(
    `${HEYGEN_API_BASE}/v3/assets`,
    form,
    {
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        ...form.getHeaders(),
      },
      timeout: 120_000, // 2 min for large files
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  const assetId: string = uploadResp.data?.data?.asset_id;
  if (!assetId) throw new Error(`HeyGen asset upload failed: ${JSON.stringify(uploadResp.data)}`);

  console.log(`[HeyGenLipSyncV3] ${label} uploaded → asset_id: ${assetId}`);
  return assetId;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeyGenLipSyncV3Request {
  /** Publicly accessible URL of the source video clip (the rendered Seedance scene) */
  videoUrl: string;
  /** Publicly accessible URL of the isolated vocal stem audio (NOT the full mix) */
  audioUrl: string;
  /** Optional title for the job — shown in HeyGen dashboard */
  title?: string;
  /**
   * mode: "precision" = frame-accurate avatar-inference lip sync (recommended for music videos)
   * mode: "speed"     = faster but lower fidelity
   */
  mode?: "precision" | "speed";
  /**
   * Start time in seconds for partial lipsync (optional).
   * Useful if only part of the video needs lip sync correction.
   */
  startTime?: number;
  /** End time in seconds for partial lipsync (optional) */
  endTime?: number;
  /**
   * Preserve the source video's resolution and bitrate.
   * Recommended: true — prevents HeyGen from downscaling the output.
   */
  keepSameFormat?: boolean;
  /**
   * Whether to strip background music from the source video before lip-syncing.
   * Default: false — the source clip is already a Seedance video with no separate audio track.
   */
  disableMusicTrack?: boolean;
}

export interface HeyGenLipSyncV3Job {
  lipsyncId: string;
  status: "pending" | "running" | "completed" | "failed";
  videoUrl?: string;
  duration?: number;
  failureMessage?: string;
}

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * Submit a lip sync job to HeyGen v3 Lipsync Precision API.
 * Returns the lipsync_id for polling.
 *
 * Audio routing contract (same as InfiniteTalk):
 *   - audioUrl = isolated Demucs vocal stem, scene time window (lip-sync driver)
 *   - assembly  = original mastered full mix overlaid on all clips (final playback)
 *
 * These two audio sources are NEVER interchangeable.
 */
export async function submitHeyGenLipSyncV3(
  request: HeyGenLipSyncV3Request
): Promise<string> {
  if (!HEYGEN_API_KEY) {
    throw new Error("HEYGEN_API_KEY is not configured. Cannot submit HeyGen lip sync job.");
  }

  // HeyGen Precision requires the input video to have an audio track.
  // Silent Seedance videos cause "audio missing or corrupted" errors.
  // Fix: mux the vocal stem audio into the video before uploading to HeyGen.
  // HeyGen Precision then replaces that audio with the lip-synced output.
  const sceneLabel = request.title ?? `scene_${Date.now()}`;
  console.log(`[HeyGenLipSyncV3] Muxing audio into video for HeyGen Precision...`);
  const muxedVideoBuffer = await muxAudioIntoVideoBuffer(
    request.videoUrl,
    request.audioUrl,
    sceneLabel
  );

  // Upload muxed video (with audio track) and the audio clip separately.
  // HeyGen cannot access external CDN URLs — all media must be uploaded to HeyGen's storage.
  const videoAssetId = await uploadAssetToHeyGen(muxedVideoBuffer, "video/mp4", "muxed-video");
  const audioAssetId = await uploadAssetToHeyGen(request.audioUrl, "audio/mpeg", "audio");

  const payload: Record<string, unknown> = {
    video: { type: "asset_id", asset_id: videoAssetId },
    audio: { type: "asset_id", asset_id: audioAssetId },
    mode: request.mode ?? "precision",
    title: request.title ?? `WizAI LipSync ${Date.now()}`,
    enable_watermark: false,
    enable_caption: false,
    enable_dynamic_duration: false, // Keep same duration as source clip
    keep_the_same_format: request.keepSameFormat ?? true,
    disable_music_track: request.disableMusicTrack ?? false,
  };

  if (request.startTime !== undefined) payload.start_time = request.startTime;
  if (request.endTime !== undefined) payload.end_time = request.endTime;

  console.log(`[HeyGenLipSyncV3] Submitting precision lipsync job: ${request.title ?? "untitled"}`);
  console.log(`[HeyGenLipSyncV3]   video: ${request.videoUrl.slice(0, 80)}...`);
  console.log(`[HeyGenLipSyncV3]   audio: ${request.audioUrl.slice(0, 80)}...`);

  const response = await axios.post(
    `${HEYGEN_API_BASE}/v3/lipsyncs`,
    payload,
    {
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const data = response.data;

  // HeyGen v3 response: { "data": { "lipsync_id": "ls_abc123" } }
  if (!data?.data?.lipsync_id) {
    throw new Error(
      `HeyGen lipsync v3 submission failed: ${JSON.stringify(data)}`
    );
  }

  const lipsyncId: string = data.data.lipsync_id;
  console.log(`[HeyGenLipSyncV3] Job submitted → ID: ${lipsyncId}`);
  return lipsyncId;
}

// ── Poll ──────────────────────────────────────────────────────────────────────

/**
 * Poll the status of a HeyGen v3 lipsync job.
 * Returns the current status and video URL if completed.
 */
export async function pollHeyGenLipSyncV3(lipsyncId: string): Promise<HeyGenLipSyncV3Job> {
  if (!HEYGEN_API_KEY) {
    throw new Error("HEYGEN_API_KEY is not configured.");
  }

  const response = await axios.get(
    `${HEYGEN_API_BASE}/v3/lipsyncs/${lipsyncId}`,
    {
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
      },
      timeout: 15_000,
    }
  );

  const data = response.data;
  const statusData = data?.data ?? {};

  // HeyGen v3 status response:
  // { "data": { "id": "ls_abc123", "status": "completed", "video_url": "https://...", "duration": 5.2 } }
  const rawStatus: string = statusData.status ?? "pending";

  // Normalise status to our internal enum
  const status: HeyGenLipSyncV3Job["status"] =
    rawStatus === "completed" ? "completed"
    : rawStatus === "failed" ? "failed"
    : rawStatus === "running" ? "running"
    : "pending";

  return {
    lipsyncId,
    status,
    videoUrl: statusData.video_url ?? undefined,
    duration: statusData.duration ?? undefined,
    failureMessage: statusData.failure_message ?? undefined,
  };
}

// ── Wait (with timeout) ───────────────────────────────────────────────────────

/**
 * Wait for a HeyGen v3 lipsync job to complete, polling every `intervalMs`.
 * Throws if the job fails or exceeds `timeoutMs`.
 *
 * Default timeout: 10 minutes (precision mode takes longer than speed mode).
 */
export async function waitForHeyGenLipSyncV3(
  lipsyncId: string,
  timeoutMs = 10 * 60 * 1000,
  intervalMs = 10_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const job = await pollHeyGenLipSyncV3(lipsyncId);

    if (job.status === "completed") {
      if (!job.videoUrl) {
        throw new Error(`HeyGen lipsync job ${lipsyncId} completed but returned no video URL.`);
      }
      console.log(`[HeyGenLipSyncV3] Job ${lipsyncId} COMPLETED → ${job.videoUrl.slice(0, 80)}...`);
      return job.videoUrl;
    }

    if (job.status === "failed") {
      throw new Error(
        `HeyGen lipsync job ${lipsyncId} FAILED: ${job.failureMessage ?? "unknown error"}`
      );
    }

    console.log(`[HeyGenLipSyncV3] Job ${lipsyncId} status: ${job.status} — waiting ${intervalMs}ms...`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `HeyGen lipsync job ${lipsyncId} timed out after ${Math.round(timeoutMs / 1000)}s.`
  );
}

// ── Health Check ──────────────────────────────────────────────────────────────

/**
 * Check if HeyGen is configured and verify API key + remaining credits.
 * Returns { configured, credits, error } for admin health dashboard.
 */
export async function checkHeyGenHealth(): Promise<{
  configured: boolean;
  credits?: number;
  planCredits?: number;
  apiCredits?: number;
  error?: string;
}> {
  if (!HEYGEN_API_KEY) {
    return { configured: false, error: "HEYGEN_API_KEY not set" };
  }

  try {
    const response = await axios.get(
      `${HEYGEN_API_BASE}/v2/user/remaining_quota`,
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
        },
        timeout: 10_000,
      }
    );

    const data = response.data?.data;
    const remaining = data?.remaining_quota ?? 0;
    const planCredits = data?.details?.plan_credit ?? 0;
    const apiCredits = data?.details?.api ?? 0;

    return {
      configured: true,
      credits: remaining,
      planCredits,
      apiCredits,
    };
  } catch (err: any) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.error?.message ?? err?.message ?? "unknown error";
    return {
      configured: true,
      error: `API error ${status}: ${msg}`,
    };
  }
}

/**
 * Check if HeyGen is configured and available.
 */
export function isHeyGenConfigured(): boolean {
  return !!HEYGEN_API_KEY;
}
