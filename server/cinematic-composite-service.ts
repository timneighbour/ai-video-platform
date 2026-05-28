/**
 * Cinematic Composite Service — Stage 4 of WIZ AI 5-Stage Compositing Pipeline
 *
 * ARCHITECTURE (2026-05-28):
 * Compositing is now delegated to the persistent orchestration server at
 * ORCHESTRATION_SERVER_URL (http://34.24.150.95:4001) which runs ffmpeg 6.1.1
 * natively without Cloud Run's 180s timeout constraint.
 *
 * Flow:
 * 1. POST /composite to orchestration server → returns { jobId } immediately
 * 2. Orchestration server runs ffmpeg, uploads result to S3, POSTs callback
 * 3. Callback endpoint (/api/composite-callback) updates DB with compositeVideoUrl
 *
 * FALLBACK: If orchestration server is unreachable, falls back to local ffmpeg
 * (synchronous, subject to Cloud Run 180s timeout — use only for dev/emergency).
 *
 * CHROMAKEY PARAMETERS (calibrated 2026-05-28):
 * - color=0xadadad: InfiniteTalk grey background (sampled pixel-by-pixel)
 * - similarity=0.15: handles grey tone variation across renders (0.08 was too tight for scene 8)
 * - blend=0.02: minimal edge softening to avoid halo artefacts
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import { storagePut } from "./storage";

const execAsync = promisify(exec);
const _require = createRequire(import.meta.url);

// ── Orchestration server config ────────────────────────────────────────────────
const ORCHESTRATION_SERVER_URL = process.env.ORCHESTRATION_SERVER_URL || "";
const ORCHESTRATION_TIMEOUT_MS = 10000; // 10s to POST the job (not to wait for result)

/**
 * Check if the orchestration server is reachable and healthy.
 */
export async function isOrchestrationServerAvailable(): Promise<boolean> {
  if (!ORCHESTRATION_SERVER_URL) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ORCHESTRATION_TIMEOUT_MS);
    const res = await fetch(`${ORCHESTRATION_SERVER_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Delegate a composite job to the orchestration server (async — returns jobId immediately).
 * The orchestration server will POST the result to callbackUrl when done.
 *
 * @param lipSyncVideoUrl     CDN URL of InfiniteTalk output (Zara + grey background)
 * @param backgroundImageUrl  CDN URL of Air Studios background image
 * @param sceneId             Scene identifier for S3 key naming and callback routing
 * @param sceneDuration       Expected duration in seconds
 * @param callbackUrl         URL the orchestration server will POST the result to
 * @returns                   { jobId } — store this to correlate the callback
 */
export async function delegateCompositeToOrchestrationServer(
  lipSyncVideoUrl: string,
  backgroundImageUrl: string,
  sceneId: number | string,
  sceneDuration: number,
  callbackUrl: string
): Promise<{ jobId: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORCHESTRATION_TIMEOUT_MS);

  try {
    const res = await fetch(`${ORCHESTRATION_SERVER_URL}/composite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lipSyncVideoUrl,
        backgroundImageUrl,
        sceneId: String(sceneId),
        sceneDuration,
        callbackUrl,
        s3Key: `music-video-scenes/${sceneId}-composite-${Date.now()}.mp4`,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Orchestration server returned HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as { jobId: string; status: string };
    console.log(`[Composite] Scene ${sceneId}: delegated to orchestration server → jobId=${data.jobId}`);
    return { jobId: data.jobId };
  } finally {
    clearTimeout(timer);
  }
}

// ── Air Studios backgrounds ────────────────────────────────────────────────────

/**
 * Air Studios background images — static, guaranteed empty (no people).
 * Rotated per scene index to provide visual variety across performance scenes.
 */
export const AIR_STUDIOS_BACKGROUNDS = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/air-studios-backgrounds/air-studios-bg-1.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/air-studios-backgrounds/air-studios-bg-2.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/air-studios-backgrounds/air-studios-bg-3.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/air-studios-backgrounds/air-studios-bg-4.jpg",
];

// ── Local ffmpeg fallback (used when orchestration server is unreachable) ──────

let FFMPEG_BIN = "ffmpeg";
let _ffmpegInitialized = false;

function getFFmpegBin(): string {
  if (_ffmpegInitialized) return FFMPEG_BIN;
  _ffmpegInitialized = true;
  try {
    const installer = _require("@ffmpeg-installer/ffmpeg");
    if (installer?.path && fs.existsSync(installer.path)) {
      try { fs.chmodSync(installer.path, 0o755); } catch { /* ignore */ }
      FFMPEG_BIN = installer.path;
    }
  } catch { /* use system ffmpeg */ }
  return FFMPEG_BIN;
}

async function downloadVideoToTemp(videoUrl: string, suffix: string = "mp4"): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-composite-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`Failed to download video: HTTP ${response.status} from ${videoUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  console.log(`[Composite] Downloaded ${suffix} video: ${buffer.length} bytes → ${tmpPath}`);
  return tmpPath;
}

async function downloadImageToTemp(imageUrl: string, suffix: string = "img"): Promise<string> {
  const ext = imageUrl.includes(".webp") ? "webp" : imageUrl.includes(".png") ? "png" : "jpg";
  const tmpPath = path.join(os.tmpdir(), `wiz-composite-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download image: HTTP ${response.status} from ${imageUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  console.log(`[Composite] Downloaded ${suffix} image: ${buffer.length} bytes → ${tmpPath}`);
  return tmpPath;
}

async function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  const ffmpeg = getFFmpegBin();
  const ffprobeBin = ffmpeg.replace(/ffmpeg$/, "ffprobe");
  let width = 960, height = 960, duration = 0;

  try {
    const { stdout: dimOut } = await execAsync(
      `"${ffprobeBin}" -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`
    );
    const dimParts = dimOut.trim().split(",");
    if (dimParts.length >= 2) { width = parseInt(dimParts[0]) || 960; height = parseInt(dimParts[1]) || 960; }
  } catch { /* use defaults */ }

  try {
    const { stdout: durOut } = await execAsync(
      `"${ffprobeBin}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const parsed = parseFloat(durOut.trim());
    if (!isNaN(parsed) && parsed > 0) duration = parsed;
  } catch { /* use fallback */ }

  if (duration <= 0) {
    console.warn(`[Composite] getVideoDimensions: could not probe duration for ${videoPath} — using 5s fallback`);
    duration = 5;
  }
  return { width, height, duration };
}

/**
 * Local ffmpeg compositing — FALLBACK ONLY.
 * Prefer delegateCompositeToOrchestrationServer() for production use.
 * Subject to Cloud Run 180s timeout.
 */
export async function compositeCinematicScene(
  lipSyncVideoUrl: string,
  backgroundImageUrl: string,
  sceneId: number | string,
  sceneDuration: number = 5
): Promise<string> {
  const ffmpeg = getFFmpegBin();
  let fgPath: string | null = null;
  let bgPath: string | null = null;
  let outputPath: string | null = null;

  try {
    console.log(`[Composite] Scene ${sceneId}: LOCAL FFMPEG (fallback mode) — orchestration server not used`);
    [fgPath, bgPath] = await Promise.all([
      downloadVideoToTemp(lipSyncVideoUrl, "fg"),
      downloadImageToTemp(backgroundImageUrl, "bg"),
    ]);

    const fgDims = await getVideoDimensions(fgPath);
    console.log(`[Composite] FG: ${fgDims.width}x${fgDims.height}, ${fgDims.duration.toFixed(3)}s (target=${sceneDuration}s)`);

    const outW = 1280, outH = 720;
    const filterComplex = [
      `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}[bg]`,
      `[1:v]scale=720:720,colorkey=0xadadad:0.15:0.02[fg]`,
      `[bg][fg]overlay=x=280:y=0[composited]`,
      `[composited]eq=brightness=0.05:saturation=1.1:gamma_r=1.1:gamma_b=0.9[graded]`,
    ].join(";");

    outputPath = path.join(os.tmpdir(), `wiz-composite-out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);

    const compositeCmd = [
      `"${ffmpeg}" -y -threads 2`,
      `-loop 1 -i "${bgPath}"`,
      `-i "${fgPath}"`,
      `-filter_complex "${filterComplex}"`,
      `-map "[graded]"`,
      `-c:v libx264 -preset ultrafast -crf 23 -threads 2`,
      `-pix_fmt yuv420p -t ${sceneDuration} -vsync cfr -r 24 -an`,
      `"${outputPath}"`
    ].join(" ");

    console.log(`[Composite] Scene ${sceneId}: running local compositing...`);
    const { stderr } = await execAsync(compositeCmd, { timeout: 170000 });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
      console.error(`[Composite] Scene ${sceneId}: output missing or too small. stderr: ${stderr.slice(0, 500)}`);
      throw new Error(`Compositing failed for scene ${sceneId} — output file missing or too small`);
    }

    const compositeBuffer = fs.readFileSync(outputPath);
    const key = `music-video-scenes/${sceneId}-composite-${Date.now()}.mp4`;
    const { url } = await storagePut(key, compositeBuffer, "video/mp4");
    console.log(`[Composite] Scene ${sceneId}: uploaded → ${url.slice(0, 80)}...`);
    return url;
  } finally {
    if (fgPath && fs.existsSync(fgPath)) try { fs.unlinkSync(fgPath); } catch { /* ignore */ }
    if (bgPath && fs.existsSync(bgPath)) try { fs.unlinkSync(bgPath); } catch { /* ignore */ }
    if (outputPath && fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
  }
}

/**
 * Fallback compositing: chromakey failed — use simple picture-in-picture overlay.
 */
export async function compositeCinematicSceneFallback(
  lipSyncVideoUrl: string,
  backgroundImageUrl: string,
  sceneId: number | string,
  sceneDuration: number = 5
): Promise<string> {
  const ffmpeg = getFFmpegBin();
  let fgPath: string | null = null;
  let bgPath: string | null = null;
  let outputPath: string | null = null;

  try {
    console.log(`[Composite] Scene ${sceneId}: FALLBACK mode (no chromakey) with static Air Studios BG`);
    [fgPath, bgPath] = await Promise.all([
      downloadVideoToTemp(lipSyncVideoUrl, "fg-fallback"),
      downloadImageToTemp(backgroundImageUrl, "bg-fallback"),
    ]);

    const outW = 1280, outH = 720;
    const zaraH = Math.round(outH * 0.65);
    const zaraW = zaraH;
    const zaraX = Math.round((outW - zaraW) / 2);
    const zaraY = outH - zaraH - 10;

    const filterComplex = [
      `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}[bg]`,
      `[1:v]scale=${zaraW}:${zaraH}[fg]`,
      `[bg][fg]overlay=x=${zaraX}:y=${zaraY}[out]`,
    ].join(";");

    outputPath = path.join(os.tmpdir(), `wiz-composite-fallback-${Date.now()}.mp4`);

    await execAsync([
      `"${ffmpeg}" -y`,
      `-loop 1 -i "${bgPath}"`,
      `-i "${fgPath}"`,
      `-filter_complex "${filterComplex}"`,
      `-map "[out]"`,
      `-c:v libx264 -preset ultrafast -crf 23`,
      `-pix_fmt yuv420p -t ${sceneDuration} -vsync cfr -r 24 -an`,
      `"${outputPath}"`
    ].join(" "), { timeout: 170000 });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
      throw new Error(`Fallback compositing failed for scene ${sceneId}`);
    }

    const compositeBuffer = fs.readFileSync(outputPath);
    const key = `music-video-scenes/${sceneId}-composite-fallback-${Date.now()}.mp4`;
    const { url } = await storagePut(key, compositeBuffer, "video/mp4");
    console.log(`[Composite] Scene ${sceneId}: fallback composite uploaded → ${url.slice(0, 80)}...`);
    return url;
  } finally {
    if (fgPath && fs.existsSync(fgPath)) try { fs.unlinkSync(fgPath); } catch { /* ignore */ }
    if (bgPath && fs.existsSync(bgPath)) try { fs.unlinkSync(bgPath); } catch { /* ignore */ }
    if (outputPath && fs.existsSync(outputPath)) try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
  }
}
