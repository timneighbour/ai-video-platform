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
// Use bundled ffmpeg binary for deployment compatibility
import ffmpegPath from "ffmpeg-static";
const FFMPEG = ffmpegPath ?? "ffmpeg"; // fallback to system ffmpeg

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

  try {
    // 1. Download source audio
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Failed to download audio: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(inputPath, buffer);

    // 2. Get actual duration of the source file
    const { stdout: probeOut } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`
    ).catch(() => ({ stdout: "0" }));
    const sourceDuration = parseFloat(probeOut.trim());

    // If source is already shorter than or equal to target, just return original URL
    if (isNaN(sourceDuration) || sourceDuration <= targetSeconds) {
      return sourceUrl;
    }

    // 3. Trim with 1-second fade-out
    const fadeStart = Math.max(0, targetSeconds - 1);
    await execAsync(
      `"${FFMPEG}" -y -i "${inputPath}" -t ${targetSeconds} -af "afade=t=out:st=${fadeStart}:d=1" -acodec libmp3lame -q:a 2 "${outputPath}"`
    );

    // 4. Upload trimmed file to S3
    const trimmedBuffer = await readFile(outputPath);
    const s3Key = `suno-trimmed/${userId}/${suffix}.mp3`;
    const { url } = await storagePut(s3Key, trimmedBuffer, "audio/mpeg");

    return url;
  } finally {
    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
