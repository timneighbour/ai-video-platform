/**
 * Audio Clip Extractor
 *
 * Extracts a time-windowed audio segment from a full song URL using ffmpeg.
 * Used to provide per-scene audio clips to SyncLabs sync-3 for lip sync.
 *
 * Cloud Run compatibility:
 *   - Uses @ffmpeg-installer/ffmpeg bundled binary
 *   - Ensures the binary is executable (chmod +x) before first use
 *   - Falls back to system ffmpeg if bundled binary fails
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createRequire } from "module";
import { storagePut } from "./storage";

const execAsync = promisify(exec);

// Resolve ffmpeg binary — bundled binary works in Cloud Run (Node-only runtime)
const _require = createRequire(import.meta.url);
let FFMPEG_BIN = "ffmpeg"; // system fallback
let _ffmpegInitialized = false;

function getFFmpegBin(): string {
  if (_ffmpegInitialized) return FFMPEG_BIN;
  _ffmpegInitialized = true;

  try {
    const installer = _require("@ffmpeg-installer/ffmpeg");
    if (installer?.path && fs.existsSync(installer.path)) {
      // Ensure the binary is executable — critical for Cloud Run where
      // npm packages may be installed without execute permissions
      try {
        fs.chmodSync(installer.path, 0o755);
      } catch {
        // chmod may fail in read-only filesystems; proceed anyway
      }
      FFMPEG_BIN = installer.path;
      console.log(`[AudioExtractor] Using bundled ffmpeg: ${FFMPEG_BIN}`);
    }
  } catch {
    console.log(`[AudioExtractor] Bundled ffmpeg not found, using system ffmpeg`);
  }

  return FFMPEG_BIN;
}

/**
 * Download a remote audio file to a temp path.
 */
async function downloadAudioToTemp(audioUrl: string, ext: string = "mp3"): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-audio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Failed to download audio: HTTP ${response.status} from ${audioUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

/**
 * Extract a time-windowed audio segment from a full song.
 *
 * @param audioUrl       S3 URL of the full song (mp3/wav/m4a)
 * @param startSeconds   Start time of the scene in the song
 * @param durationSeconds Duration to extract (clamped to 2–15s for SyncLabs)
 * @param sceneId        Used for S3 key naming
 * @returns S3 URL of the extracted audio clip (mp3)
 */
export async function extractSceneAudioClip(
  audioUrl: string,
  startSeconds: number,
  durationSeconds: number,
  sceneId: number
): Promise<string> {
  // Clamp duration to SyncLabs constraints (2–15s)
  const clampedDuration = Math.max(2, Math.min(15, durationSeconds));
  const ffmpeg = getFFmpegBin();

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
    // Note: no quotes around paths — execAsync uses shell, but paths from os.tmpdir()
    // are safe. Quoting causes issues on some Cloud Run environments.
    const cmd = [
      ffmpeg,
      "-y",                             // overwrite output
      "-ss", startSeconds.toString(),   // seek to start
      "-i", inputPath,                  // input file
      "-t", clampedDuration.toString(), // duration
      "-acodec", "libmp3lame",          // mp3 codec
      "-ar", "44100",                   // sample rate
      "-ab", "128k",                    // bitrate
      "-ac", "2",                       // stereo
      "-loglevel", "error",             // suppress verbose output
      outputPath,
    ].join(" ");

    console.log(`[AudioExtractor] Scene ${sceneId}: running ffmpeg (start=${startSeconds}s, dur=${clampedDuration}s)`);
    const { stderr } = await execAsync(cmd, { timeout: 45_000 });
    if (stderr && stderr.trim()) {
      console.warn(`[AudioExtractor] Scene ${sceneId} ffmpeg stderr: ${stderr.trim().slice(0, 200)}`);
    }

    // Verify the output file exists and has content
    if (!fs.existsSync(outputPath)) {
      throw new Error(`ffmpeg did not produce output file for scene ${sceneId}`);
    }
    const stats = fs.statSync(outputPath);
    if (stats.size < 500) {
      throw new Error(`Extracted audio clip too small (${stats.size} bytes) for scene ${sceneId} — ffmpeg likely failed`);
    }

    // Upload to S3
    const buffer = fs.readFileSync(outputPath);
    const s3Key = `music-video-scene-audio/${sceneId}-${Date.now()}.mp3`;
    const { url } = await storagePut(s3Key, buffer, "audio/mpeg");

    console.log(`[AudioExtractor] Scene ${sceneId}: extracted ${clampedDuration}s clip → uploaded to S3`);
    return url;
  } catch (err: any) {
    console.error(`[AudioExtractor] Scene ${sceneId} FAILED: ${err.message}`);
    throw err;
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
 * Runs sequentially to avoid overwhelming the temp filesystem in Cloud Run.
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

  // Sequential — Cloud Run has limited /tmp space; parallel downloads risk exhausting it
  for (const scene of scenes) {
    try {
      const clipUrl = await extractSceneAudioClip(
        audioUrl,
        scene.startTime,
        scene.duration,
        scene.sceneId
      );
      results.set(scene.sceneId, clipUrl);
    } catch (err: any) {
      console.warn(`[AudioExtractor] Failed to extract clip for scene ${scene.sceneId}: ${err.message}`);
    }
  }

  return results;
}
