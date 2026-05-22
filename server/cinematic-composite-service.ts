/**
 * Cinematic Composite Service — Stage 4 of WIZ AI 5-Stage Compositing Pipeline
 *
 * PROBLEM: InfiniteTalk outputs Zara performing against a grey studio background.
 * We need to composite her onto the cinematic Seedance concert hall background.
 *
 * SOLUTION: Use ffmpeg to:
 * 1. Take the InfiniteTalk performance clip (Zara + grey background)
 * 2. Take the Seedance cinematic clip (Air Studios concert hall, no Zara)
 * 3. Use chromakey to remove the grey background from the performance clip
 * 4. Overlay the keyed Zara onto the cinematic background
 * 5. Apply warm colour grading to match the concert hall ambiance
 * 6. Output: final composited 1280x720 clip — Zara singing inside Air Studios
 *
 * COMPOSITING APPROACH:
 * The InfiniteTalk output is a square 960x960 clip. We:
 * 1. Scale the performance clip to fit within the 16:9 frame (height-based scaling)
 * 2. Position Zara in the lower-centre of the frame (concert hall perspective)
 * 3. Apply chromakey to remove the grey background
 * 4. Overlay onto the Seedance background
 *
 * COLOUR GRADING:
 * InfiniteTalk produces a neutral/cool colour tone.
 * Air Studios has warm golden/amber lighting.
 * We apply a warm colour grade to Zara to match the hall ambiance:
 * - Slight warm tone (increase red/yellow, reduce blue)
 * - Soft vignette to blend edges
 * - Slight brightness boost for stage lighting feel
 *
 * FFMPEG FILTER CHAIN:
 * [0:v] = Seedance background (cinematic clip)
 * [1:v] = InfiniteTalk performance (Zara + grey background)
 *
 * Filter chain:
 * [1:v]scale=W:H,chromakey=0x808080:0.25:0.05[fg];
 * [0:v][fg]overlay=x=(W-w)/2:y=H-h-50[composited];
 * [composited]curves=r='0/0 0.5/0.55 1/1':g='0/0 0.5/0.5 1/1':b='0/0 0.5/0.45 1/0.9'[graded]
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

// ── ffmpeg binary resolution ───────────────────────────────────────────────────
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

/**
 * Download a remote video to a temp path.
 */
async function downloadVideoToTemp(videoUrl: string, suffix: string = "mp4"): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-composite-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`Failed to download video: HTTP ${response.status} from ${videoUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  console.log(`[Composite] Downloaded ${suffix} video: ${buffer.length} bytes → ${tmpPath}`);
  return tmpPath;
}

/**
 * Get video dimensions using ffprobe.
 *
 * IMPORTANT: Stream-level duration (stream=duration) can return N/A for some MP4 files
 * (e.g. InfiniteTalk outputs) where duration is only stored in the container format header.
 * We always fall back to format-level duration probe to avoid the silent `|| 5` truncation
 * that was causing composited clips to be 5s instead of 5.96s.
 */
async function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  const ffmpeg = getFFmpegBin();
  const ffprobeBin = ffmpeg.replace(/ffmpeg$/, "ffprobe");

  let width = 960;
  let height = 960;
  let duration = 0;

  try {
    // Step 1: Get width and height from stream (reliable)
    const { stdout: dimOut } = await execAsync(
      `"${ffprobeBin}" -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`
    );
    const dimParts = dimOut.trim().split(",");
    if (dimParts.length >= 2) {
      width = parseInt(dimParts[0]) || 960;
      height = parseInt(dimParts[1]) || 960;
    }
  } catch { /* use defaults */ }

  try {
    // Step 2: Get duration from FORMAT level (reliable even when stream duration is N/A)
    const { stdout: durOut } = await execAsync(
      `"${ffprobeBin}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const parsed = parseFloat(durOut.trim());
    if (!isNaN(parsed) && parsed > 0) {
      duration = parsed;
    }
  } catch { /* use fallback */ }

  // Final fallback: if duration is still 0, use 5s as a safe default
  if (duration <= 0) {
    console.warn(`[Composite] getVideoDimensions: could not probe duration for ${videoPath} — using 5s fallback`);
    duration = 5;
  }

  return { width, height, duration };
}

/**
 * Composite Zara's InfiniteTalk performance onto the Seedance cinematic background.
 *
 * This is the core Stage 4 operation:
 * 1. Seedance clip = Air Studios concert hall background (1280x720)
 * 2. InfiniteTalk clip = Zara performing (960x960, grey background)
 * 3. Chromakey removes grey background from InfiniteTalk clip
 * 4. Zara is overlaid onto the concert hall background
 * 5. Warm colour grade applied to match hall ambiance
 *
 * @param lipSyncVideoUrl   CDN URL of InfiniteTalk output (Zara + grey background)
 * @param seedanceVideoUrl  CDN URL of Seedance cinematic clip (concert hall background)
 * @param sceneId           Used for S3 key naming
 * @param sceneDuration     Expected duration in seconds (for output trimming)
 * @returns                 CDN URL of the final composited 1280x720 clip
 */
export async function compositeCinematicScene(
  lipSyncVideoUrl: string,
  seedanceVideoUrl: string,
  sceneId: number | string,
  sceneDuration: number = 5
): Promise<string> {
  const ffmpeg = getFFmpegBin();
  let fgPath: string | null = null;   // InfiniteTalk foreground (Zara)
  let bgPath: string | null = null;   // Seedance background (concert hall)
  let outputPath: string | null = null;

  try {
    // Step 1: Download both clips in parallel
    console.log(`[Composite] Scene ${sceneId}: downloading performance + background clips...`);
    [fgPath, bgPath] = await Promise.all([
      downloadVideoToTemp(lipSyncVideoUrl, "fg"),
      downloadVideoToTemp(seedanceVideoUrl, "bg"),
    ]);

    // Step 2: Get dimensions of both clips
    const fgDims = await getVideoDimensions(fgPath);
    const bgDims = await getVideoDimensions(bgPath);
    console.log(`[Composite] FG (InfiniteTalk): ${fgDims.width}x${fgDims.height}, probed=${fgDims.duration.toFixed(3)}s (target=${sceneDuration}s)`);
    console.log(`[Composite] BG (Seedance): ${bgDims.width}x${bgDims.height}, probed=${bgDims.duration.toFixed(3)}s`);

    // Step 3: Calculate compositing geometry
    // Target output: 1280x720 (16:9)
    const outW = 1280;
    const outH = 720;

    // Scale Zara to fill ~60% of the frame height (concert hall perspective)
    // For a 960x960 input, we scale to 432x432 (60% of 720)
    const zaraTargetH = Math.round(outH * 0.60); // 432px
    const zaraTargetW = zaraTargetH; // square input → square scaled output

    // Position: lower-centre of frame, 20px from bottom
    const zaraX = Math.round((outW - zaraTargetW) / 2); // centre horizontally
    const zaraY = outH - zaraTargetH - 20; // 20px from bottom

    console.log(`[Composite] Zara position: ${zaraTargetW}x${zaraTargetH} at (${zaraX}, ${zaraY})`);

    // Step 4: Build ffmpeg filter chain
    // [0:v] = background (Seedance)
    // [1:v] = foreground (InfiniteTalk, grey background)
    //
    // Filter chain:
    // 1. Normalise background to 1280x720 (in case Seedance output is different size)
    // 2. Scale Zara to target height
    // 3. Chromakey: remove grey background from Zara clip
    // 4. Overlay Zara onto background at calculated position
    // 5. Warm colour grade to match concert hall lighting
    //
    // Chromakey parameters:
    // - color=0x808080: target grey colour (InfiniteTalk background)
    // - similarity=0.30: tolerance (higher = more aggressive removal)
    // - blend=0.05: soft edge feathering for natural look
    //
    // Colour grade (curves):
    // - Red channel: slightly boosted (warm tone)
    // - Green channel: neutral
    // - Blue channel: slightly reduced (warm tone)

    const filterComplex = [
      // Normalise background to 1280x720
      `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},fps=24[bg]`,
      // Scale Zara + chromakey grey background removal
      // GATE 1 FIX (2026-05-23): InfiniteTalk background is #ADAEAE (RGB 173,174,174), NOT #808080.
      // Sampled from actual InfiniteTalk output — old value caused complete chromakey failure.
      // similarity=0.40 covers the slight gradient variation across the background.
      `[1:v]scale=${zaraTargetW}:${zaraTargetH},chromakey=0xADAEAE:similarity=0.40:blend=0.08[fg]`,
      // Overlay Zara onto background
      `[bg][fg]overlay=x=${zaraX}:y=${zaraY}[composited]`,
      // Warm colour grade to match Air Studios golden lighting
      `[composited]curves=r='0/0 0.5/0.55 1/1':g='0/0 0.5/0.5 1/1':b='0/0 0.5/0.45 1/0.9'[graded]`,
    ].join(";");

    outputPath = path.join(os.tmpdir(), `wiz-composite-out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);

    // CRITICAL FIX (2026-05-22): Always use sceneDuration as the output target.
    // Previously used Math.min(sceneDuration, fgDims.duration, bgDims.duration) which
    // truncated the output to 5s when InfiniteTalk returned 5.96s clips — causing
    // 1s drift per performance scene and lip sync timing errors in the final assembly.
    //
    // InfiniteTalk outputs are typically 5.96s for a 6s request (4 frames short at 24fps).
    // Using -t sceneDuration with the longer background clip means ffmpeg will freeze-extend
    // the last frame of the InfiniteTalk clip to fill the final ~40ms — imperceptible.
    //
    // The background (Seedance) is always ≥ sceneDuration (10s clips), so no issue there.
    const effectiveDuration = sceneDuration;

    const compositeCmd = [
      `"${ffmpeg}" -y`,
      `-i "${bgPath}"`,   // [0:v] background
      `-i "${fgPath}"`,   // [1:v] foreground
      `-filter_complex "${filterComplex}"`,
      `-map "[graded]"`,
      `-c:v libx264 -preset fast -crf 18`,
      `-pix_fmt yuv420p`,
      `-t ${effectiveDuration}`,
      `-vsync cfr -r 24`,
      `-an`, // no audio — Stage 5 adds the full mix
      `"${outputPath}"`
    ].join(" ");

    console.log(`[Composite] Scene ${sceneId}: running compositing...`);
    const { stderr } = await execAsync(compositeCmd, { timeout: 180000 });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
      console.error(`[Composite] Scene ${sceneId}: output missing or too small. stderr: ${stderr.slice(0, 500)}`);
      throw new Error(`Compositing failed for scene ${sceneId} — output file missing or too small`);
    }

    const outputSize = fs.statSync(outputPath).size;
    console.log(`[Composite] Scene ${sceneId}: composited clip: ${outputSize} bytes, ${effectiveDuration}s`);

    // Step 5: Upload to S3
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
 * Fallback compositing: if chromakey fails (e.g., background colour mismatch),
 * use a simple picture-in-picture overlay without background removal.
 * This is a degraded mode — Zara will appear in a box on the background.
 * Used only when chromakey produces poor results.
 *
 * @param lipSyncVideoUrl   CDN URL of InfiniteTalk output
 * @param seedanceVideoUrl  CDN URL of Seedance cinematic clip
 * @param sceneId           Used for S3 key naming
 * @param sceneDuration     Expected duration in seconds
 * @returns                 CDN URL of the fallback composited clip
 */
export async function compositeCinematicSceneFallback(
  lipSyncVideoUrl: string,
  seedanceVideoUrl: string,
  sceneId: number | string,
  sceneDuration: number = 5
): Promise<string> {
  const ffmpeg = getFFmpegBin();
  let fgPath: string | null = null;
  let bgPath: string | null = null;
  let outputPath: string | null = null;

  try {
    console.log(`[Composite] Scene ${sceneId}: FALLBACK mode (no chromakey)`);
    [fgPath, bgPath] = await Promise.all([
      downloadVideoToTemp(lipSyncVideoUrl, "fg-fallback"),
      downloadVideoToTemp(seedanceVideoUrl, "bg-fallback"),
    ]);

    const outW = 1280;
    const outH = 720;
    const zaraH = Math.round(outH * 0.60);
    const zaraW = zaraH;
    const zaraX = Math.round((outW - zaraW) / 2);
    const zaraY = outH - zaraH - 20;

    const filterComplex = [
      `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},fps=24[bg]`,
      `[1:v]scale=${zaraW}:${zaraH}[fg]`,
      `[bg][fg]overlay=x=${zaraX}:y=${zaraY}[out]`,
    ].join(";");

    outputPath = path.join(os.tmpdir(), `wiz-composite-fallback-${Date.now()}.mp4`);

    await execAsync([
      `"${ffmpeg}" -y`,
      `-i "${bgPath}"`,
      `-i "${fgPath}"`,
      `-filter_complex "${filterComplex}"`,
      `-map "[out]"`,
      `-c:v libx264 -preset fast -crf 18`,
      `-pix_fmt yuv420p`,
      `-t ${sceneDuration}`,
      `-vsync cfr -r 24`,
      `-an`,
      `"${outputPath}"`
    ].join(" "), { timeout: 180000 });

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
