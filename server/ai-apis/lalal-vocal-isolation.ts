/**
 * Lalal.ai Cloud Vocal Isolation API Client
 * ==========================================
 * Provides cloud-based vocal stem separation via the Lalal.ai REST API.
 * This replaces the local Demucs (Python) approach which is not available
 * in Cloud Run (Node.js-only runtime).
 *
 * Flow:
 *   1. uploadAudioToLalal(audioUrl) → source_id
 *      Downloads the audio from S3/CDN and uploads binary to Lalal.ai.
 *   2. startLalalSplit(sourceId) → task_id
 *      Submits a stem separation job with stem="vocals" preset.
 *   3. pollLalalTask(taskId) → { status, vocalsUrl? }
 *      Polls /api/v1/check/ until status="success" or "error".
 *      On success, returns the URL of the isolated vocals track.
 *
 * Authentication: X-License-Key header (LALAL_AI_LICENSE_KEY env var)
 * Docs: https://www.lalal.ai/api/v1/docs/
 * OpenAPI: https://www.lalal.ai/api/v1/openapi.json
 */

import * as https from "https";
import * as http from "http";
import * as path from "path";

const LALAL_BASE_URL = "https://www.lalal.ai";
const LALAL_LICENSE_KEY = process.env.LALAL_AI_LICENSE_KEY;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LalalUploadResult {
  sourceId: string;
  duration: number; // seconds
  name: string;
}

export interface LalalSplitResult {
  taskId: string;
}

export type LalalPollStatus = "progress" | "success" | "error" | "cancelled" | "server_error";

export interface LalalPollResult {
  status: LalalPollStatus;
  progress?: number;        // 0-100 when status="progress"
  vocalsUrl?: string;       // download URL when status="success"
  instrumentalUrl?: string; // download URL for no_vocals track
  errorMessage?: string;    // when status="error" or "server_error"
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLicenseKey(): string {
  if (!LALAL_LICENSE_KEY) {
    throw new Error("[LalalAI] LALAL_AI_LICENSE_KEY environment variable is not set. Please add it via the platform secrets.");
  }
  return LALAL_LICENSE_KEY;
}

/**
 * Downloads a file from a URL and returns it as a Buffer.
 * Follows redirects (up to 5 hops).
 */
async function downloadBuffer(url: string, maxRedirects = 5): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, { timeout: 120_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error(`[LalalAI] Too many redirects downloading ${url}`));
          return;
        }
        downloadBuffer(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`[LalalAI] HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers["content-type"] ?? "audio/mpeg",
      }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`[LalalAI] Timeout downloading ${url}`));
    });
  });
}

/**
 * Makes a JSON POST request to the Lalal.ai API.
 */
async function lalalPost<T>(endpoint: string, body: object): Promise<T> {
  const licenseKey = getLicenseKey();
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.lalal.ai",
        path: endpoint,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "X-License-Key": licenseKey,
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`[LalalAI] POST ${endpoint} → HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(text) as T);
          } catch {
            reject(new Error(`[LalalAI] POST ${endpoint} → invalid JSON: ${text.slice(0, 200)}`));
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`[LalalAI] Timeout on POST ${endpoint}`));
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Makes a binary upload POST request to the Lalal.ai /api/v1/upload/ endpoint.
 * The API expects raw binary in the request body with Content-Disposition header.
 */
async function lalalUploadBinary(buffer: Buffer, filename: string, contentType: string): Promise<{ id: string; duration: number; name: string }> {
  const licenseKey = getLicenseKey();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.lalal.ai",
        path: "/api/v1/upload/",
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": buffer.length,
          "Content-Disposition": `attachment; filename=${filename}`,
          "X-License-Key": licenseKey,
        },
        timeout: 300_000, // 5 min for large files
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`[LalalAI] Upload → HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
            return;
          }
          try {
            const parsed = JSON.parse(text) as { id: string; duration: number; name: string };
            resolve(parsed);
          } catch {
            reject(new Error(`[LalalAI] Upload → invalid JSON: ${text.slice(0, 200)}`));
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("[LalalAI] Upload timeout (5 min exceeded)"));
    });
    req.write(buffer);
    req.end();
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Step 1: Upload audio to Lalal.ai and get a source_id.
 * Downloads the audio from the provided URL and streams it to Lalal.ai.
 *
 * @param audioUrl - S3/CDN URL of the full-mix audio file
 * @returns LalalUploadResult with sourceId, duration (seconds), and filename
 */
export async function uploadAudioToLalal(audioUrl: string): Promise<LalalUploadResult> {
  console.log(`[LalalAI] Downloading audio for upload: ${audioUrl.slice(0, 80)}...`);
  const { buffer, contentType } = await downloadBuffer(audioUrl);
  console.log(`[LalalAI] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB (${contentType})`);

  // Derive a clean filename from the URL
  const urlPath = new URL(audioUrl).pathname;
  const basename = path.basename(urlPath) || "audio.mp3";
  const filename = basename.includes(".") ? basename : `${basename}.mp3`;

  console.log(`[LalalAI] Uploading ${filename} to Lalal.ai...`);
  const result = await lalalUploadBinary(buffer, filename, contentType);

  console.log(`[LalalAI] Upload complete → source_id=${result.id}, duration=${result.duration}s`);
  return {
    sourceId: result.id,
    duration: result.duration,
    name: result.name,
  };
}

/**
 * Step 2: Start a vocal stem separation task on Lalal.ai.
 * Uses the "stem_separator" endpoint with stem="vocals" and splitter="auto"
 * (auto selects the best available model for vocals).
 *
 * @param sourceId - The source_id returned by uploadAudioToLalal
 * @returns LalalSplitResult with taskId
 */
export async function startLalalSplit(sourceId: string): Promise<LalalSplitResult> {
  console.log(`[LalalAI] Starting vocal split for source_id=${sourceId}...`);

  const result = await lalalPost<{ task_id: string }>("/api/v1/split/stem_separator/", {
    source_id: sourceId,
    presets: {
      stem: "vocals",
      splitter: "auto",           // Best available model for vocals
      dereverb_enabled: false,    // Preserve natural reverb for authenticity
      extraction_level: "deep_extraction", // Capture intricate vocal details
    },
  });

  console.log(`[LalalAI] Split started → task_id=${result.task_id}`);
  return { taskId: result.task_id };
}

/**
 * Step 3: Poll the status of a Lalal.ai split task.
 * Call repeatedly (every 10-15 seconds) until status is "success" or "error".
 *
 * @param taskId - The task_id returned by startLalalSplit
 * @returns LalalPollResult with status, progress, and vocalsUrl when done
 */
export async function pollLalalTask(taskId: string): Promise<LalalPollResult> {
  const response = await lalalPost<{
    result: Record<string, {
      status: string;
      progress?: number;
      result?: {
        tracks: Array<{ type: string; label: string; url: string }>;
      };
      error?: string | { code: string; detail: string };
    }>;
  }>("/api/v1/check/", { task_ids: [taskId] });

  const taskResult = response.result[taskId];
  if (!taskResult) {
    return { status: "error", errorMessage: `[LalalAI] No result for task_id=${taskId}` };
  }

  const status = taskResult.status as LalalPollStatus;

  if (status === "progress") {
    return { status: "progress", progress: taskResult.progress ?? 0 };
  }

  if (status === "success" && taskResult.result?.tracks) {
    // Find the vocals (stem) track and the instrumental (back) track
    const vocalsTrack = taskResult.result.tracks.find(
      (t) => t.type === "stem" && (t.label === "vocals" || t.label.startsWith("vocals@"))
    );
    const instrumentalTrack = taskResult.result.tracks.find(
      (t) => t.type === "back" && t.label === "no_vocals"
    );

    if (!vocalsTrack) {
      return {
        status: "error",
        errorMessage: "[LalalAI] Success but no vocals track found in result",
      };
    }

    console.log(`[LalalAI] Task ${taskId} complete → vocals URL: ${vocalsTrack.url.slice(0, 80)}...`);
    return {
      status: "success",
      vocalsUrl: vocalsTrack.url,
      instrumentalUrl: instrumentalTrack?.url,
    };
  }

  if (status === "error" || status === "server_error") {
    const errMsg = typeof taskResult.error === "string"
      ? taskResult.error
      : taskResult.error
        ? `${(taskResult.error as any).code}: ${(taskResult.error as any).detail}`
        : "Unknown error";
    return { status: "error", errorMessage: `[LalalAI] Task failed: ${errMsg}` };
  }

  if (status === "cancelled") {
    return { status: "cancelled", errorMessage: "[LalalAI] Task was cancelled" };
  }

  // Unknown status — treat as still in progress
  return { status: "progress", progress: 0 };
}
