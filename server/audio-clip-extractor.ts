/**
 * Audio Clip Extractor
 *
 * Extracts a time-windowed audio segment from a full song URL using ffmpeg.
 * Used to provide per-scene audio clips to Atlas Cloud reference-to-video
 * for phoneme-accurate lip sync — the model drives mouth movement from the
 * actual audio waveform, not from text prompts.
 *
 * Constraints (Atlas Cloud reference-to-video):
 *   - Each audio clip: 2–15 seconds, max 15MB
 *   - Total duration across all clips: ≤ 15 seconds
 *   - Format: mp3 or wav
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createRequire } from "module";
import { storagePut } from "./storage";

const execAsync = promisify(exec);

// Use bundled ffmpeg binary (works in Cloud Run production as well as sandbox)
const _require = createRequire(import.meta.url);
let FFMPEG_BIN = "ffmpeg";
try {
  const installer = _require("@ffmpeg-installer/ffmpeg");
  if (installer?.path) FFMPEG_BIN = installer.path;
} catch { /* fall back to system ffmpeg */ }

/**
 * Download a remote audio file to a temp path.
 */
async function downloadAudioToTemp(audioUrl: string, ext: string = "mp3"): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-audio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Failed to download audio: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

/**
 * Extract a time-windowed audio segment from a full song.
 *
 * @param audioUrl       S3 URL of the full song (mp3/wav/m4a)
 * @param startSeconds   Start time of the scene in the song (e.g. 16 for scene 3 at 8s/scene)
 * @param durationSeconds Duration to extract (must be 2–15s for Atlas Cloud)
 * @param sceneId        Used for S3 key naming
 * @returns S3 URL of the extracted audio clip (mp3)
 */
export async function extractSceneAudioClip(
  audioUrl: string,
  startSeconds: number,
  durationSeconds: number,
  sceneId: number
): Promise<string> {
  // Clamp duration to Atlas Cloud constraints (2–15s)
  const clampedDuration = Math.max(2, Math.min(15, durationSeconds));

  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Download the full song to a temp file
    inputPath = await downloadAudioToTemp(audioUrl, "mp3");

    // Output path for the extracted clip
    outputPath = path.join(
      os.tmpdir(),
      `wiz-scene-audio-${sceneId}-${Date.now()}.mp3`
    );

    // Use ffmpeg to extract the exact time window
    // -ss: start time, -t: duration, -acodec libmp3lame: re-encode to mp3
    // -ar 44100: standard sample rate, -ab 128k: reasonable bitrate for lip sync
    const cmd = [
      `"${FFMPEG_BIN}"`,
      "-y",                          // overwrite output
      "-ss", startSeconds.toString(), // seek to start
      "-i", `"${inputPath}"`,        // input file
      "-t", clampedDuration.toString(), // duration
      "-acodec", "libmp3lame",       // mp3 codec
      "-ar", "44100",                // sample rate
      "-ab", "128k",                 // bitrate
      "-ac", "2",                    // stereo
      `"${outputPath}"`,
    ].join(" ");

    await execAsync(cmd, { timeout: 30_000 });

    // Verify the output file exists and has content
    const stats = fs.statSync(outputPath);
    if (stats.size < 1000) {
      throw new Error(`Extracted audio clip is too small (${stats.size} bytes) — ffmpeg may have failed`);
    }

    // Upload to S3 for Atlas Cloud to fetch
    const buffer = fs.readFileSync(outputPath);
    const s3Key = `music-video-scene-audio/${sceneId}-${Date.now()}.mp3`;
    const { url } = await storagePut(s3Key, buffer, "audio/mpeg");

    console.log(`[AudioExtractor] Scene ${sceneId}: extracted ${clampedDuration}s clip from ${startSeconds}s → ${url.slice(0, 80)}...`);
    return url;
  } finally {
    // Clean up temp files
    if (inputPath && fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
    }
    if (outputPath && fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch {}
    }
  }
}

/**
 * Pre-extract audio clips for all scenes in a job.
 * Runs in parallel (up to 4 concurrent) to avoid blocking the render queue.
 *
 * @param audioUrl       Full song S3 URL
 * @param scenes         Array of { sceneId, startTime, duration }
 * @returns Map of sceneId → audio clip S3 URL
 */
export async function extractAllSceneAudioClips(
  audioUrl: string,
  scenes: Array<{ sceneId: number; startTime: number; duration: number }>
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const CONCURRENCY = 4;

  for (let i = 0; i < scenes.length; i += CONCURRENCY) {
    const batch = scenes.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (scene) => {
        const clipUrl = await extractSceneAudioClip(
          audioUrl,
          scene.startTime,
          scene.duration,
          scene.sceneId
        );
        return { sceneId: scene.sceneId, clipUrl };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.set(result.value.sceneId, result.value.clipUrl);
      } else {
        console.warn(`[AudioExtractor] Failed to extract clip for a scene:`, result.reason);
      }
    }
  }

  return results;
}
