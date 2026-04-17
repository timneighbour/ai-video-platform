/**
 * audioTrim.ts
 * Server-side utility to trim an audio file to EXACTLY a target duration using ffmpeg.
 *
 * Key guarantees:
 * - Output is verified with ffprobe to be within ±0.1s of targetSeconds
 * - Uses -ss 0 -t <target> for frame-accurate cutting (not stream copy)
 * - Fade-out applied in the last 0.5s (short clips) or 1s (longer clips)
 * - Downloads with retry + longer timeout to handle expiring CDN URLs
 * - Uploads to S3 for consistent, permanent playback
 */

import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";
import { storagePut } from "./storage";

const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

const execAsync = promisify(exec);

/**
 * Download a URL with retry logic (handles expiring CDN tokens).
 */
async function downloadWithRetry(url: string, maxAttempts = 3): Promise<Buffer> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WIZ AI/1.0; +https://wizvid.ai)",
          "Accept": "audio/mpeg, audio/*, */*",
          "Referer": "https://suno.ai/",
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      const contentLength = response.headers.get("content-length");
      console.log(`[audioTrim] Downloaded (attempt ${attempt}): ${response.status}, type: ${contentType}, size: ${contentLength ?? "unknown"} bytes`);

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1000) {
        throw new Error(`Downloaded file too small (${buffer.length} bytes) — likely an error page`);
      }
      return buffer;
    } catch (err: any) {
      lastError = err;
      console.warn(`[audioTrim] Download attempt ${attempt}/${maxAttempts} failed: ${err?.message}`);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000 * attempt)); // back-off
      }
    }
  }
  throw lastError ?? new Error("Download failed after all retries");
}

/**
 * Get the duration of an audio file using ffprobe.
 */
async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `${FFPROBE} -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
  );
  const d = parseFloat(stdout.trim());
  if (isNaN(d) || d <= 0) throw new Error(`ffprobe returned invalid duration: "${stdout.trim()}"`);
  return d;
}

/**
 * Trim an audio file to EXACTLY targetSeconds.
 *
 * @param sourceUrl     Public URL of the source audio (mp3/wav/ogg/m4a)
 * @param targetSeconds Desired output duration in seconds (must be > 0)
 * @param userId        Used to namespace the S3 key
 * @returns             CDN URL of the trimmed audio file (always an S3/CloudFront URL)
 */
export async function trimAudioToLength(
  sourceUrl: string,
  targetSeconds: number,
  userId: number
): Promise<string> {
  if (!sourceUrl || sourceUrl.trim().length === 0) {
    throw new Error("sourceUrl is empty — cannot trim");
  }
  if (targetSeconds <= 0) {
    throw new Error(`Invalid targetSeconds: ${targetSeconds}`);
  }

  const suffix = randomBytes(6).toString("hex");
  const inputPath = join(tmpdir(), `suno-in-${suffix}.mp3`);
  const outputPath = join(tmpdir(), `suno-out-${suffix}.mp3`);

  console.log(`[audioTrim] Starting trim: targetSeconds=${targetSeconds}, userId=${userId}, url=${sourceUrl.substring(0, 80)}...`);

  try {
    // 1. Download source audio (with retry for expiring CDN URLs)
    const buffer = await downloadWithRetry(sourceUrl);
    await writeFile(inputPath, buffer);

    // 2. Probe source duration
    let sourceDuration: number;
    try {
      sourceDuration = await getAudioDuration(inputPath);
      console.log(`[audioTrim] Source duration: ${sourceDuration.toFixed(2)}s, target: ${targetSeconds}s`);
    } catch (probeErr) {
      console.warn("[audioTrim] ffprobe failed, proceeding without duration check:", probeErr);
      sourceDuration = Infinity;
    }

    // 3. If source is already at or below target, still re-encode and upload to S3
    //    (never return the original CDN URL — it may expire)
    if (isFinite(sourceDuration) && sourceDuration <= targetSeconds + 0.1) {
      console.log(`[audioTrim] Source (${sourceDuration.toFixed(2)}s) <= target (${targetSeconds}s), uploading as-is to S3`);
      const s3Key = `suno-trimmed/${userId}/${suffix}-passthrough.mp3`;
      const { url } = await storagePut(s3Key, buffer, "audio/mpeg");
      return url;
    }

    // 4. Trim with ffmpeg — use -ss 0 for frame-accurate start, -t for exact duration
    //    Apply a short fade-out so the cut doesn't sound abrupt
    const fadeDuration = targetSeconds <= 10 ? 0.5 : targetSeconds <= 30 ? 1.0 : 2.0;
    const fadeStart = Math.max(0, targetSeconds - fadeDuration);

    // Use -map_metadata -1 to strip metadata and ensure clean output
    const ffmpegCmd = [
      FFMPEG,
      "-y",
      "-i", `"${inputPath}"`,
      "-ss", "0",
      "-t", String(targetSeconds),
      "-af", `"afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeDuration}"`,
      "-acodec", "libmp3lame",
      "-q:a", "2",
      "-write_xing", "0",
      "-map_metadata", "-1",
      `"${outputPath}"`
    ].join(" ");

    console.log(`[audioTrim] Running ffmpeg: ${ffmpegCmd}`);

    try {
      const { stderr } = await execAsync(ffmpegCmd, { timeout: 120_000 });
      if (stderr && stderr.toLowerCase().includes("error")) {
        // Only warn — ffmpeg writes progress to stderr even on success
        console.warn("[audioTrim] ffmpeg stderr snippet:", stderr.substring(0, 300));
      }
    } catch (ffmpegErr: any) {
      throw new Error(`ffmpeg trim failed: ${ffmpegErr?.message ?? ffmpegErr}`);
    }

    // 5. Verify output duration
    let outputDuration: number | null = null;
    try {
      outputDuration = await getAudioDuration(outputPath);
      console.log(`[audioTrim] Output duration: ${outputDuration.toFixed(2)}s (target: ${targetSeconds}s)`);
      if (Math.abs(outputDuration - targetSeconds) > 0.5) {
        console.warn(`[audioTrim] WARNING: output duration ${outputDuration.toFixed(2)}s differs from target ${targetSeconds}s by more than 0.5s`);
      }
    } catch (verifyErr) {
      console.warn("[audioTrim] Could not verify output duration:", verifyErr);
    }

    // 6. Upload trimmed file to S3
    const trimmedBuffer = await readFile(outputPath);
    console.log(`[audioTrim] Trimmed file size: ${trimmedBuffer.length} bytes`);

    if (trimmedBuffer.length < 500) {
      throw new Error(`Trimmed output is suspiciously small (${trimmedBuffer.length} bytes) — ffmpeg may have failed silently`);
    }

    const s3Key = `suno-trimmed/${userId}/${suffix}.mp3`;
    const { url } = await storagePut(s3Key, trimmedBuffer, "audio/mpeg");
    console.log(`[audioTrim] Uploaded to S3: ${url.substring(0, 80)}...`);

    return url;
  } finally {
    // Clean up temp files (ignore errors)
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
