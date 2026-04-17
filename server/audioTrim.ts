/**
 * audioTrim.ts
 * Server-side utility to trim an audio file to a target duration using ffmpeg.
 * Downloads the source audio, trims with a 1-second fade-out, uploads to S3, returns CDN URL.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";
import { storagePut } from "./storage";

// Use system ffmpeg/ffprobe (available in both dev and production)
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

const execAsync = promisify(exec);

/**
 * Trim an audio file to targetSeconds.
 * Uses a 1-second fade-out at the end for a clean finish.
 * @param sourceUrl  Public URL of the source audio (mp3/wav/ogg)
 * @param targetSeconds  Desired output duration in seconds
 * @param userId  Used to namespace the S3 key
 * @returns CDN URL of the trimmed audio file
 */
export async function trimAudioToLength(
  sourceUrl: string,
  targetSeconds: number,
  userId: number
): Promise<string> {
  const suffix = randomBytes(6).toString("hex");
  const inputPath = join(tmpdir(), `suno-in-${suffix}.mp3`);
  const outputPath = join(tmpdir(), `suno-out-${suffix}.mp3`);

  console.log(`[audioTrim] Starting trim: targetSeconds=${targetSeconds}, userId=${userId}, url=${sourceUrl.substring(0, 80)}...`);

  try {
    // 1. Download source audio with proper headers to handle CDN restrictions
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WizVid/1.0)",
        "Accept": "audio/mpeg, audio/*, */*",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download audio: HTTP ${response.status} from ${sourceUrl.substring(0, 80)}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    console.log(`[audioTrim] Downloaded audio: ${response.status}, content-type: ${contentType}, size: ${response.headers.get("content-length") ?? "unknown"} bytes`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) {
      throw new Error(`Downloaded audio is too small (${buffer.length} bytes) — likely an error response`);
    }
    await writeFile(inputPath, buffer);

    // 2. Get actual duration of the source file using ffprobe
    let sourceDuration = 0;
    try {
      const { stdout: probeOut } = await execAsync(
        `${FFPROBE} -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`
      );
      sourceDuration = parseFloat(probeOut.trim());
      console.log(`[audioTrim] Source duration: ${sourceDuration}s, target: ${targetSeconds}s`);
    } catch (probeErr) {
      console.error("[audioTrim] ffprobe failed:", probeErr);
      // Can't probe — attempt trim anyway
      sourceDuration = Infinity;
    }

    // If source is already shorter than or equal to target, upload as-is and return S3 URL
    // (don't return the original CDN URL — upload to S3 for consistent playback)
    if (!isNaN(sourceDuration) && sourceDuration <= targetSeconds) {
      console.log(`[audioTrim] Source (${sourceDuration}s) <= target (${targetSeconds}s), uploading as-is`);
      const s3Key = `suno-trimmed/${userId}/${suffix}-passthrough.mp3`;
      const { url } = await storagePut(s3Key, buffer, "audio/mpeg");
      return url;
    }

    // 3. Trim with fade-out (0.5s for short clips, 1s for longer)
    const fadeDuration = targetSeconds < 10 ? 0.5 : 1;
    const fadeStart = Math.max(0, targetSeconds - fadeDuration);
    const ffmpegCmd = `${FFMPEG} -y -i "${inputPath}" -t ${targetSeconds} -af "afade=t=out:st=${fadeStart}:d=${fadeDuration}" -acodec libmp3lame -q:a 2 "${outputPath}"`;
    console.log(`[audioTrim] Running ffmpeg: ${ffmpegCmd}`);

    try {
      const { stderr } = await execAsync(ffmpegCmd);
      if (stderr && stderr.includes("Error")) {
        console.warn("[audioTrim] ffmpeg stderr:", stderr.substring(0, 500));
      }
    } catch (ffmpegErr: any) {
      throw new Error(`ffmpeg trim failed: ${ffmpegErr?.message ?? ffmpegErr}`);
    }

    // 4. Upload trimmed file to S3
    const trimmedBuffer = await readFile(outputPath);
    console.log(`[audioTrim] Trimmed file size: ${trimmedBuffer.length} bytes`);

    const s3Key = `suno-trimmed/${userId}/${suffix}.mp3`;
    const { url } = await storagePut(s3Key, trimmedBuffer, "audio/mpeg");
    console.log(`[audioTrim] Uploaded trimmed audio to S3: ${url.substring(0, 80)}...`);

    return url;
  } finally {
    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
