/**
 * Tempo Correction Utility
 * 
 * AI video generation models (Seedance, Atlas Cloud) generate motion at a "natural" speed
 * that does not match the song's BPM. This utility applies ffmpeg speed correction to
 * cinematic scene videos so that orchestra/instrument motion matches the song tempo.
 * 
 * Algorithm:
 *   speedFactor = referenceBPM / songBPM
 *   - referenceBPM = 120 (typical AI model "natural" generation tempo)
 *   - If song is 72 BPM: speedFactor = 1.667 → slow video to 60% speed
 *   - If song is 144 BPM: speedFactor = 0.833 → speed up video to 120% speed
 * 
 * ffmpeg filters:
 *   -vf "setpts=FACTOR*PTS"  → slows/speeds video frames
 *   -af "atempo=1/FACTOR"    → adjusts audio tempo (if audio present)
 *   atempo is clamped to [0.5, 2.0] per ffmpeg limit; for larger factors we chain filters.
 */
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { storagePut } from "../storage";

const REFERENCE_BPM = 120; // AI model "natural" generation tempo baseline

/**
 * Calculate the speed factor for tempo correction.
 * Clamped to [0.5, 2.0] to avoid extreme distortion.
 */
export function calcSpeedFactor(songBpm: number): number {
  const raw = REFERENCE_BPM / songBpm;
  return Math.max(0.5, Math.min(2.0, Math.round(raw * 1000) / 1000));
}

/**
 * Build atempo filter chain for ffmpeg.
 * atempo is limited to [0.5, 2.0] per filter instance, so we chain for extreme values.
 */
function buildAtempoChain(factor: number): string {
  // We need to apply 1/factor to audio (inverse of video setpts factor)
  const audioFactor = 1 / factor;
  if (audioFactor >= 0.5 && audioFactor <= 2.0) {
    return `atempo=${audioFactor.toFixed(4)}`;
  }
  // Chain two atempo filters for values outside [0.5, 2.0]
  const half = Math.sqrt(audioFactor);
  return `atempo=${half.toFixed(4)},atempo=${half.toFixed(4)}`;
}

/**
 * Apply tempo correction to a video URL using ffmpeg.
 * Downloads the video, applies setpts/atempo, uploads to CDN.
 * 
 * @param videoUrl - Source video URL (CDN or HeyGen)
 * @param songBpm - Song BPM (e.g. 72)
 * @param sceneId - Scene ID for CDN key naming
 * @returns New CDN URL of the tempo-corrected video, or original URL if correction fails
 */
export async function applyTempoCorrection(
  videoUrl: string,
  songBpm: number,
  sceneId: number
): Promise<string> {
  const speedFactor = calcSpeedFactor(songBpm);
  
  // Skip if factor is within 5% of 1.0 — no meaningful correction needed
  if (Math.abs(speedFactor - 1.0) < 0.05) {
    console.log(`[TempoCorrection] Scene ${sceneId}: BPM ${songBpm} → factor ${speedFactor} (within 5% of 1.0, skipping)`);
    return videoUrl;
  }

  console.log(`[TempoCorrection] Scene ${sceneId}: BPM ${songBpm} → factor ${speedFactor} (${speedFactor > 1 ? 'slowing' : 'speeding'} video)`);

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `tempo-input-${sceneId}.mp4`);
  const outputPath = path.join(tmpDir, `tempo-output-${sceneId}.mp4`);

  try {
    // 1. Download source video
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
    const buf = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(inputPath, buf);

    // 2. Probe input for audio streams (cinematic clips are often silent/video-only)
    const hasAudio = await new Promise<boolean>((resolve) => {
      const probe = spawn("ffprobe", [
        "-v", "quiet",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "csv=p=0",
        inputPath,
      ], { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      probe.stdout.on("data", (d: Buffer) => { out += d.toString(); });
      probe.on("close", () => resolve(out.trim().length > 0));
      probe.on("error", () => resolve(false));
    });
    console.log(`[TempoCorrection] Scene ${sceneId}: hasAudio=${hasAudio}`);

    // 3. Apply ffmpeg tempo correction
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-y",
        "-i", inputPath,
        "-vf", `setpts=${speedFactor.toFixed(4)}*PTS`,
      ];
      if (hasAudio) {
        const atempoChain = buildAtempoChain(speedFactor);
        args.push("-af", atempoChain, "-c:a", "aac", "-b:a", "192k");
      } else {
        args.push("-an"); // no audio in output
      }
      args.push("-c:v", "libx264", "-preset", "fast", "-crf", "18", outputPath);
      
      const ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
      const errChunks: Buffer[] = [];
      ff.stderr.on("data", (d: Buffer) => errChunks.push(d));
      ff.on("close", (code) => {
        if (code !== 0) {
          const errMsg = Buffer.concat(errChunks).toString().slice(-500);
          reject(new Error(`ffmpeg tempo correction failed (code ${code}): ${errMsg}`));
        } else {
          resolve();
        }
      });
      ff.on("error", reject);
    });

    // 3. Upload corrected video to CDN
    const correctedBuf = fs.readFileSync(outputPath);
    const fileKey = `music-video-scenes/${sceneId}-tempo-${Date.now()}.mp4`;
    const { url } = await storagePut(fileKey, correctedBuf, "video/mp4");

    console.log(`[TempoCorrection] Scene ${sceneId}: tempo-corrected video uploaded → ${url}`);
    return url;

  } catch (err) {
    console.error(`[TempoCorrection] Scene ${sceneId}: FAILED (using original URL):`, err);
    return videoUrl; // Fail-safe: return original URL so render continues
  } finally {
    // Clean up temp files
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}
