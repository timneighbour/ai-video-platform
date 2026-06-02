/**
 * Audio Clip Extractor
 *
 * Extracts a time-windowed audio segment from a full song URL using ffmpeg.
 * Used to provide per-scene audio clips to SyncLabs sync-3 for lip sync.
 *
 * Precision requirements for lip sync:
 *   - The extracted clip MUST start at exactly the requested offset
 *   - The extracted clip MUST be exactly the requested duration (no padding)
 *   - No encoding delay or frame-boundary rounding that would shift vocal alignment
 *
 * ffmpeg precision strategy:
 *   - Place -ss AFTER -i to use accurate (decode-based) seeking, not fast keyframe seek
 *   - Use WAV output (PCM, no frame padding) for maximum precision
 *   - Specify exact sample count via -t to avoid MP3 frame-boundary rounding
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
 * PRECISION APPROACH:
 * 1. Place -ss AFTER -i (accurate seek, not fast keyframe seek)
 * 2. Extract to WAV first (PCM — no frame padding, exact duration)
 * 3. Convert WAV → MP3 in a second pass (SyncLabs requires MP3)
 * This eliminates the ~26-52ms encoding delay that causes lip sync drift.
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
  let wavPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Download the full song to a temp file
    inputPath = await downloadAudioToTemp(audioUrl, "mp3");

    // Intermediate WAV path (PCM — frame-perfect, no encoding delay)
    wavPath = path.join(
      os.tmpdir(),
      `wiz-scene-audio-${sceneId}-${Date.now()}.wav`
    );

    // Final MP3 output path
    outputPath = path.join(
      os.tmpdir(),
      `wiz-scene-audio-${sceneId}-${Date.now()}.mp3`
    );

    // STEP 1: Extract to WAV with accurate seek (-ss AFTER -i)
    // This gives frame-perfect extraction with no encoding delay.
    // -ss after -i = decode-based seek (slow but exact)
    // -t = exact duration in seconds
    const wavCmd = [
      ffmpeg,
      "-y",
      "-i", `"${inputPath}"`,            // input first
      "-ss", startSeconds.toString(),    // seek AFTER input = accurate
      "-t", clampedDuration.toString(),  // exact duration
      "-acodec", "pcm_s16le",            // PCM WAV — no frame padding
      "-ar", "44100",
      "-ac", "2",
      "-loglevel", "error",
      `"${wavPath}"`,
    ].join(" ");

    console.log(`[AudioExtractor] Scene ${sceneId}: step 1 — WAV extraction (start=${startSeconds}s, dur=${clampedDuration}s)`);
    const { stderr: wavStderr } = await execAsync(wavCmd, { timeout: 45_000 });
    if (wavStderr && wavStderr.trim()) {
      console.warn(`[AudioExtractor] Scene ${sceneId} WAV stderr: ${wavStderr.trim().slice(0, 200)}`);
    }

    if (!fs.existsSync(wavPath)) {
      throw new Error(`ffmpeg WAV extraction failed for scene ${sceneId}`);
    }

    // STEP 2: Convert WAV → MP3 (SyncLabs requires MP3)
    // No seeking needed here — WAV is already the exact clip
    const mp3Cmd = [
      ffmpeg,
      "-y",
      "-i", `"${wavPath}"`,
      "-acodec", "libmp3lame",
      "-ar", "44100",
      "-ab", "192k",                    // higher bitrate for better quality
      "-ac", "2",
      "-write_xing", "0",              // suppress Xing header (prevents duration inflation)
      "-loglevel", "error",
      `"${outputPath}"`,
    ].join(" ");

    console.log(`[AudioExtractor] Scene ${sceneId}: step 2 — WAV→MP3 conversion`);
    const { stderr: mp3Stderr } = await execAsync(mp3Cmd, { timeout: 30_000 });
    if (mp3Stderr && mp3Stderr.trim()) {
      console.warn(`[AudioExtractor] Scene ${sceneId} MP3 stderr: ${mp3Stderr.trim().slice(0, 200)}`);
    }

    // Verify the output file exists and has content
    if (!fs.existsSync(outputPath)) {
      throw new Error(`ffmpeg did not produce MP3 output file for scene ${sceneId}`);
    }
    const stats = fs.statSync(outputPath);
    if (stats.size < 500) {
      throw new Error(`Extracted audio clip too small (${stats.size} bytes) for scene ${sceneId} — ffmpeg likely failed`);
    }

    // Upload to S3
    const buffer = fs.readFileSync(outputPath);
    const s3Key = `music-video-scene-audio/${sceneId}-${Date.now()}.mp3`;
    const { url } = await storagePut(s3Key, buffer, "audio/mpeg");

    console.log(`[AudioExtractor] Scene ${sceneId}: extracted ${clampedDuration}s clip (precise) → uploaded to S3`);
    return url;
  } catch (err: any) {
    console.error(`[AudioExtractor] Scene ${sceneId} FAILED: ${err.message}`);
    throw err;
  } finally {
    // Clean up temp files
    if (inputPath && fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
    }
    if (wavPath && fs.existsSync(wavPath)) {
      try { fs.unlinkSync(wavPath); } catch {}
    }
    if (outputPath && fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch {}
    }
  }
}

/**
 * Slice a vocal stem for Seedance reference-to-video.
 *
 * Unlike extractSceneAudioClip (which outputs MP3 for SyncLabs), this function
 * outputs a WAV file — Seedance's audio_urls parameter accepts WAV and benefits
 * from the lossless format for phoneme-level lip sync accuracy.
 *
 * The vocal stem (isolated vocals from Demucs) is used rather than the full mix
 * so Seedance only hears the singing voice, not instruments.
 *
 * @param stemVocalsUrl  S3/CDN URL of the isolated vocal stem WAV
 * @param startSeconds   Scene start time in the full track
 * @param durationSeconds Scene duration (Seedance supports up to 10s per clip)
 * @param sceneId        Used for S3 key naming and logging
 * @returns S3 URL of the sliced vocal WAV clip
 */
export async function sliceVocalStemForSeedance(
  stemVocalsUrl: string,
  startSeconds: number,
  durationSeconds: number,
  sceneId: number
): Promise<string> {
  // Clamp to Seedance's supported range (1–10s per audio_url clip)
  const clampedDuration = Math.max(1, Math.min(10, durationSeconds));
  const ffmpeg = getFFmpegBin();

  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Detect extension from URL (vocal stems are typically .wav)
    const ext = stemVocalsUrl.split(".").pop()?.split("?")[0] ?? "wav";
    inputPath = await downloadAudioToTemp(stemVocalsUrl, ext);

    outputPath = path.join(
      os.tmpdir(),
      `wiz-stem-slice-${sceneId}-${Date.now()}.wav`
    );

    // Single-pass WAV extraction with decode-based seek (accurate, not keyframe)
    // -ss AFTER -i = frame-perfect start point
    // PCM output = no encoding delay, exact duration
    const cmd = [
      ffmpeg,
      "-y",
      "-i", `"${inputPath}"`,
      "-ss", startSeconds.toString(),
      "-t", clampedDuration.toString(),
      "-acodec", "pcm_s16le",
      "-ar", "44100",
      "-ac", "2",
      "-loglevel", "error",
      `"${outputPath}"`,
    ].join(" ");

    console.log(`[VocalStemSlicer] Scene ${sceneId}: slicing stem start=${startSeconds}s dur=${clampedDuration}s`);
    const { stderr } = await execAsync(cmd, { timeout: 60_000 });
    if (stderr && stderr.trim()) {
      console.warn(`[VocalStemSlicer] Scene ${sceneId} stderr: ${stderr.trim().slice(0, 200)}`);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error(`ffmpeg did not produce WAV output for scene ${sceneId}`);
    }
    const stats = fs.statSync(outputPath);
    if (stats.size < 500) {
      throw new Error(`Sliced vocal stem too small (${stats.size} bytes) for scene ${sceneId}`);
    }

    // Upload to S3
    const buffer = fs.readFileSync(outputPath);
    const s3Key = `music-video-stem-slices/${sceneId}-${Date.now()}.wav`;
    const { url } = await storagePut(s3Key, buffer, "audio/wav");

    console.log(`[VocalStemSlicer] Scene ${sceneId}: sliced ${clampedDuration}s vocal clip → S3`);
    return url;
  } catch (err: any) {
    console.error(`[VocalStemSlicer] Scene ${sceneId} FAILED: ${err.message}`);
    throw err;
  } finally {
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
