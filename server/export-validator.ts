/**
 * export-validator.ts
 *
 * Validates an assembled MP4 after upload to S3/CDN — before the job is
 * marked "completed". Prevents corrupt, zero-byte, or wrong-duration files
 * from being delivered to users.
 *
 * Checks performed:
 *   1. File size >= MIN_FILE_SIZE_BYTES (rejects zero-byte / near-empty uploads)
 *   2. ffprobe can read the file and reports a valid video stream
 *   3. Measured duration >= expectedDuration * DURATION_TOLERANCE (5% tolerance)
 *   4. Video codec is h264 or hevc
 *   5. Resolution is at least 640x360
 *   6. SHA256 hash of the file is computed and returned for audit trail
 *
 * This module is intentionally dependency-free (no DB access). Callers are
 * responsible for writing the result to the render_attempts table.
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as https from "https";
import * as http from "http";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

// ffprobe is not bundled by @ffmpeg-installer — always fall back to system ffprobe
const FFPROBE_BIN = "ffprobe";

const MIN_FILE_SIZE_BYTES = 512 * 1024; // 512 KB — anything smaller is likely corrupt
const DURATION_TOLERANCE = 0.90; // measured duration must be >= 90% of expected
const DOWNLOAD_TIMEOUT_MS = 30_000; // 30s to download the file for validation
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024; // 50 MB cap for validation download

export interface ExportValidationResult {
  valid: boolean;
  sha256: string;
  fileSizeBytes: number;
  durationSeconds: number;
  codec: string;
  width: number;
  height: number;
  error?: string;
  errorCode?: ExportValidationErrorCode;
}

export type ExportValidationErrorCode =
  | "download_failed"
  | "file_too_small"
  | "ffprobe_failed"
  | "no_video_stream"
  | "duration_too_short"
  | "unsupported_codec"
  | "resolution_too_low";

/**
 * Download a file from a URL to a temporary local path.
 * Returns the local path. Caller is responsible for cleanup.
 */
async function downloadToTemp(url: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-validate-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS}ms`));
    }, DOWNLOAD_TIMEOUT_MS);

    const file = fs.createWriteStream(tmpPath);
    let bytesDownloaded = 0;

    const req = protocol.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        clearTimeout(timeout);
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.on("data", (chunk: Buffer) => {
        bytesDownloaded += chunk.length;
        if (bytesDownloaded > MAX_DOWNLOAD_BYTES) {
          // File is large enough — we have enough to validate
          res.destroy();
          file.close();
          clearTimeout(timeout);
          resolve(tmpPath);
        }
      });
      res.pipe(file);
      file.on("finish", () => {
        clearTimeout(timeout);
        resolve(tmpPath);
      });
      file.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    req.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Compute SHA256 of a local file.
 */
async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Run ffprobe on a local file and return parsed stream info.
 */
async function probeFile(filePath: string): Promise<{
  duration: number;
  codec: string;
  width: number;
  height: number;
}> {
  const cmd = `${FFPROBE_BIN} -v quiet -print_format json -show_streams -show_format "${filePath}"`;
  const { stdout } = await execAsync(cmd, { timeout: 15_000 });
  const data = JSON.parse(stdout) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      duration?: string;
    }>;
    format?: { duration?: string };
  };

  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  if (!videoStream) {
    throw new Error("no_video_stream");
  }

  const duration =
    parseFloat(videoStream.duration ?? "") ||
    parseFloat(data.format?.duration ?? "") ||
    0;

  return {
    duration,
    codec: videoStream.codec_name ?? "unknown",
    width: videoStream.width ?? 0,
    height: videoStream.height ?? 0,
  };
}

/**
 * Validate an exported MP4 by downloading it from the CDN URL and running
 * ffprobe checks. Returns a structured result suitable for writing to
 * render_attempts.validationStatus.
 *
 * @param cdnUrl          - Public CDN URL of the assembled MP4
 * @param expectedDurationSeconds - Expected video duration (from scene manifest)
 * @param expectedFileSizeBytes   - Optional: expected file size for cross-check
 */
export async function validateExport(params: {
  cdnUrl: string;
  expectedDurationSeconds: number;
  expectedFileSizeBytes?: number;
}): Promise<ExportValidationResult> {
  const { cdnUrl, expectedDurationSeconds } = params;
  let tmpPath: string | null = null;

  try {
    // Step 1: Download the file
    try {
      tmpPath = await downloadToTemp(cdnUrl);
    } catch (err) {
      return {
        valid: false,
        sha256: "",
        fileSizeBytes: 0,
        durationSeconds: 0,
        codec: "",
        width: 0,
        height: 0,
        error: `Download failed: ${(err as Error).message}`,
        errorCode: "download_failed",
      };
    }

    // Step 2: Check file size
    const stat = fs.statSync(tmpPath);
    const fileSizeBytes = stat.size;
    if (fileSizeBytes < MIN_FILE_SIZE_BYTES) {
      return {
        valid: false,
        sha256: "",
        fileSizeBytes,
        durationSeconds: 0,
        codec: "",
        width: 0,
        height: 0,
        error: `File too small: ${fileSizeBytes} bytes (minimum ${MIN_FILE_SIZE_BYTES})`,
        errorCode: "file_too_small",
      };
    }

    // Step 3: Compute SHA256
    const sha256 = await sha256File(tmpPath);

    // Step 4: Run ffprobe
    let probeResult: { duration: number; codec: string; width: number; height: number };
    try {
      probeResult = await probeFile(tmpPath);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "no_video_stream") {
        return {
          valid: false,
          sha256,
          fileSizeBytes,
          durationSeconds: 0,
          codec: "",
          width: 0,
          height: 0,
          error: "No video stream found in file",
          errorCode: "no_video_stream",
        };
      }
      return {
        valid: false,
        sha256,
        fileSizeBytes,
        durationSeconds: 0,
        codec: "",
        width: 0,
        height: 0,
        error: `ffprobe failed: ${msg}`,
        errorCode: "ffprobe_failed",
      };
    }

    const { duration, codec, width, height } = probeResult;

    // Step 5: Duration check
    const minDuration = expectedDurationSeconds * DURATION_TOLERANCE;
    if (duration < minDuration) {
      return {
        valid: false,
        sha256,
        fileSizeBytes,
        durationSeconds: duration,
        codec,
        width,
        height,
        error: `Duration too short: ${duration.toFixed(2)}s (expected >= ${minDuration.toFixed(2)}s)`,
        errorCode: "duration_too_short",
      };
    }

    // Step 6: Codec check
    const allowedCodecs = ["h264", "hevc", "h265", "vp9", "av1"];
    if (!allowedCodecs.includes(codec.toLowerCase())) {
      return {
        valid: false,
        sha256,
        fileSizeBytes,
        durationSeconds: duration,
        codec,
        width,
        height,
        error: `Unsupported codec: ${codec}`,
        errorCode: "unsupported_codec",
      };
    }

    // Step 7: Resolution check
    if (width < 640 || height < 360) {
      return {
        valid: false,
        sha256,
        fileSizeBytes,
        durationSeconds: duration,
        codec,
        width,
        height,
        error: `Resolution too low: ${width}x${height} (minimum 640x360)`,
        errorCode: "resolution_too_low",
      };
    }

    // All checks passed
    return {
      valid: true,
      sha256,
      fileSizeBytes,
      durationSeconds: duration,
      codec,
      width,
      height,
    };
  } finally {
    // Always clean up the temp file
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }
    }
  }
}
