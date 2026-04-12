/**
 * WizSound™ — Proprietary audio enhancement pipeline for WizVid.
 *
 * Three tiers:
 *   standard   — No processing. Original audio passed through as-is.
 *   enhanced   — WizSound Enhance: stereo widening, frequency EQ, noise reduction,
 *                dynamic compression, loudness normalisation to -16 LUFS.
 *   cinematic  — WizSound Cinematic: full mastering pipeline — Haas stereo widening,
 *                multi-band EQ, dynamic range compression, spatial depth, and
 *                loudness normalisation to -14 LUFS (streaming standard).
 *
 * All processing is done via FFmpeg audio filters running server-side.
 * Input/output are local file paths (temp directory managed by the caller).
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export type AudioTier = "standard" | "enhanced" | "cinematic";

/**
 * Build the FFmpeg audio filter chain for the given WizSound™ tier.
 * Returns null for "standard" (no processing needed).
 */
function buildFilterChain(tier: AudioTier): string | null {
  switch (tier) {
    case "standard":
      return null;

    case "enhanced":
      // WizSound Enhance:
      // 1. extrastereo — gentle stereo widening (m=2.5)
      // 2. equalizer — bass warmth boost at 200 Hz (+2 dB)
      // 3. equalizer — upper-mid presence at 3 kHz (+1.5 dB)
      // 4. equalizer — air/brightness at 10 kHz (+2 dB)
      // 5. compand — light dynamic compression (noise gate + gentle limiting)
      // 6. loudnorm — EBU R128 loudness normalisation to -16 LUFS (streaming standard)
      return [
        "extrastereo=m=2.5",
        "equalizer=f=200:width_type=o:width=2:g=2",
        "equalizer=f=3000:width_type=o:width=2:g=1.5",
        "equalizer=f=10000:width_type=o:width=2:g=2",
        "compand=attacks=0.01:decays=0.3:points=-90/-90|-70/-70|-20/-12|0/-6",
        "loudnorm=I=-16:TP=-1.5:LRA=11",
      ].join(",");

    case "cinematic":
      // WizSound Cinematic — full proprietary mastering pipeline:
      // 1. extrastereo — stronger stereo widening (m=3.5)
      // 2. haas — Haas stereo enhancer for immersive spatial depth
      //    (2.05 ms left delay, 2.12 ms right delay — classic Haas effect)
      // 3. equalizer — sub-bass foundation at 100 Hz (+3 dB)
      // 4. equalizer — low-mid warmth at 250 Hz (+1.5 dB)
      // 5. equalizer — upper-mid clarity at 3 kHz (+2 dB)
      // 6. equalizer — presence/air at 8 kHz (+3 dB)
      // 7. equalizer — ultra-high shimmer at 16 kHz (+2 dB)
      // 8. compand — professional dynamic range compression
      //    (fast attack 5ms, slow decay 500ms, gentle limiting at 0 dB)
      // 9. loudnorm — EBU R128 loudness normalisation to -14 LUFS
      //    (Spotify/Apple Music streaming standard, tighter LRA for cinematic feel)
      return [
        "extrastereo=m=3.5",
        "haas=level_in=1:level_out=1:side_gain=1:middle_source=mid:middle_phase=false:left_delay=2.05:left_balance=-1:right_delay=2.12:right_balance=1",
        "equalizer=f=100:width_type=o:width=2:g=3",
        "equalizer=f=250:width_type=o:width=2:g=1.5",
        "equalizer=f=3000:width_type=o:width=2:g=2",
        "equalizer=f=8000:width_type=o:width=2:g=3",
        "equalizer=f=16000:width_type=o:width=2:g=2",
        "compand=attacks=0.005:decays=0.5:points=-90/-90|-70/-70|-30/-15|-10/-8|0/-4",
        "loudnorm=I=-14:TP=-1:LRA=9",
      ].join(",");

    default:
      return null;
  }
}

/**
 * Apply WizSound™ audio enhancement to an audio file.
 *
 * @param inputPath  - Absolute path to the input audio file (mp3, aac, wav, etc.)
 * @param outputPath - Absolute path where the processed audio file will be written
 * @param tier       - WizSound™ tier: "standard" | "enhanced" | "cinematic"
 * @returns          - The outputPath (same as input if tier is "standard")
 */
export async function applyWizSound(
  inputPath: string,
  outputPath: string,
  tier: AudioTier
): Promise<string> {
  const filterChain = buildFilterChain(tier);

  if (!filterChain) {
    // Standard tier — copy the file as-is
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  const ext = path.extname(outputPath).toLowerCase();
  const codec = ext === ".mp3" ? "libmp3lame" : ext === ".aac" ? "aac" : "aac";
  const bitrate = tier === "cinematic" ? "320k" : "256k";

  const cmd = `ffmpeg -y -i "${inputPath}" -af "${filterChain}" -c:a ${codec} -b:a ${bitrate} "${outputPath}"`;

  console.log(`[WizSound™] Applying ${tier} tier to ${path.basename(inputPath)}`);
  const start = Date.now();

  await execAsync(cmd, { timeout: 300_000 }); // 5 min max for long tracks

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[WizSound™] ${tier} processing complete in ${elapsed}s → ${path.basename(outputPath)}`);

  return outputPath;
}

/**
 * Apply WizSound™ to an audio file downloaded from a URL.
 * Downloads the audio to a temp file, processes it, and returns the processed file path.
 * The caller is responsible for cleaning up the returned temp file.
 *
 * @param audioUrl  - URL of the source audio file
 * @param tier      - WizSound™ tier
 * @param tmpDir    - Optional temp directory (created automatically if not provided)
 * @returns         - { processedPath: string, tmpDir: string } — caller must clean up tmpDir
 */
export async function applyWizSoundFromUrl(
  audioUrl: string,
  tier: AudioTier,
  tmpDir?: string
): Promise<{ processedPath: string; tmpDir: string }> {
  const dir = tmpDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "wizsound-"));
  const inputPath = path.join(dir, "audio-input.mp3");
  const outputPath = path.join(dir, "audio-wizsound.mp3");

  // Download audio
  const resp = await fetch(audioUrl);
  if (!resp.ok) throw new Error(`[WizSound™] Failed to download audio: ${resp.status} ${audioUrl}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(inputPath, buf);

  await applyWizSound(inputPath, outputPath, tier);

  return { processedPath: outputPath, tmpDir: dir };
}
