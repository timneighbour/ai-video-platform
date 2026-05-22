/**
 * Matte Extraction Service — Stage 3 of WIZ AI 5-Stage Compositing Pipeline
 *
 * PROBLEM: InfiniteTalk outputs a performance video of Zara against a grey
 * studio background. We need to remove this background to get a clean
 * performance matte that can be composited onto the cinematic Seedance background.
 *
 * SOLUTION: Use ffmpeg chromakey to remove the grey background.
 * The InfiniteTalk grey background is consistently neutral grey (~#808080),
 * making chromakey a reliable and fast approach without external API costs.
 *
 * STRATEGY (in order of preference):
 * 1. ffmpeg chromakey with grey colour — fast, free, deterministic
 * 2. fal.ai BiRefNet — higher quality for complex edges (hair), used as fallback
 *
 * OUTPUT: Video with alpha channel (transparent background) in WebM/VP9 format
 * OR: PNG image sequence for compositing (if alpha video is not supported)
 *
 * ARCHITECTURE NOTE:
 * Since ffmpeg overlay with alpha channel requires the foreground to have an
 * alpha channel, and most video formats don't support alpha well, we use a
 * different approach for Stage 4:
 * - Extract the grey background colour from InfiniteTalk output
 * - Use ffmpeg's chromakey filter to remove it during compositing
 * - This avoids the need for a separate matte video file
 *
 * The Stage 4 compositing service handles this directly using ffmpeg's
 * [0:v]chromakey=color=0x808080:similarity=0.3:blend=0.05[fg] filter chain.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import { storagePut } from "./storage";
import { fal } from "@fal-ai/client";

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
async function downloadVideoToTemp(videoUrl: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `wiz-video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error(`Failed to download video: HTTP ${response.status} from ${videoUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  console.log(`[MatteExtraction] Downloaded video to ${tmpPath} (${buffer.length} bytes)`);
  return tmpPath;
}

/**
 * Detect the dominant background colour from the first frame of a video.
 * InfiniteTalk uses a consistent grey background — we sample the corners
 * to determine the exact grey value for chromakey.
 */
async function detectBackgroundColour(videoPath: string): Promise<string> {
  const ffmpeg = getFFmpegBin();
  const framePath = path.join(os.tmpdir(), `wiz-frame-${Date.now()}.png`);
  try {
    // Extract first frame
    await execAsync(`"${ffmpeg}" -y -i "${videoPath}" -vframes 1 -f image2 "${framePath}"`);
    if (!fs.existsSync(framePath)) return "0x808080"; // default grey

    // Sample top-left corner pixel (background region)
    // Use ffprobe/ffmpeg to get pixel colour at (10, 10)
    const { stdout } = await execAsync(
      `"${ffmpeg}" -y -i "${framePath}" -vf "crop=1:1:10:10,format=rgb24" -f rawvideo -`
    );
    if (stdout && stdout.length >= 3) {
      const r = stdout.charCodeAt(0).toString(16).padStart(2, "0");
      const g = stdout.charCodeAt(1).toString(16).padStart(2, "0");
      const b = stdout.charCodeAt(2).toString(16).padStart(2, "0");
      const colour = `0x${r}${g}${b}`;
      console.log(`[MatteExtraction] Detected background colour: ${colour}`);
      return colour;
    }
  } catch (err) {
    console.warn(`[MatteExtraction] Background colour detection failed: ${err}`);
  } finally {
    if (fs.existsSync(framePath)) try { fs.unlinkSync(framePath); } catch { /* ignore */ }
  }
  return "0x808080"; // default InfiniteTalk grey
}

/**
 * Extract matte from InfiniteTalk output video using ffmpeg chromakey.
 *
 * This produces a video with the grey background replaced by transparency.
 * The output is in WebM/VP9 format which supports alpha channel.
 *
 * @param lipSyncVideoUrl  CDN URL of the InfiniteTalk output video
 * @param sceneId          Used for S3 key naming
 * @returns                CDN URL of the matte video (WebM with alpha)
 */
export async function extractPerformanceMatte(
  lipSyncVideoUrl: string,
  sceneId: number | string
): Promise<string> {
  const ffmpeg = getFFmpegBin();
  let inputPath: string | null = null;
  let mattePath: string | null = null;

  try {
    // Step 1: Download InfiniteTalk output
    inputPath = await downloadVideoToTemp(lipSyncVideoUrl);

    // Step 2: Detect background colour
    const bgColour = await detectBackgroundColour(inputPath);

    // Step 3: Apply chromakey to remove grey background
    // Output: WebM/VP9 with alpha channel for transparency
    mattePath = path.join(os.tmpdir(), `wiz-matte-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);

    // Chromakey parameters:
    // - color: the grey background colour to remove
    // - similarity: how close to the target colour to remove (0.0-1.0, higher = more aggressive)
    // - blend: soft edge feathering (0.0-1.0)
    const chromakeyFilter = `chromakey=${bgColour}:similarity=0.25:blend=0.05`;
    const matteCmd = [
      `"${ffmpeg}" -y -i "${inputPath}"`,
      `-vf "${chromakeyFilter}"`,
      `-c:v libvpx-vp9 -pix_fmt yuva420p`,
      `-b:v 2M -crf 18`,
      `-an`, // no audio in matte
      `"${mattePath}"`
    ].join(" ");

    console.log(`[MatteExtraction] Running chromakey: ${chromakeyFilter}`);
    const { stderr } = await execAsync(matteCmd, { timeout: 120000 });

    if (!fs.existsSync(mattePath) || fs.statSync(mattePath).size < 1000) {
      console.warn(`[MatteExtraction] WebM matte failed, stderr: ${stderr.slice(0, 300)}`);
      throw new Error("Matte extraction produced empty output");
    }

    console.log(`[MatteExtraction] Matte extracted: ${fs.statSync(mattePath).size} bytes`);

    // Step 4: Upload to S3
    const matteBuffer = fs.readFileSync(mattePath);
    const key = `music-video-scenes/${sceneId}-matte-${Date.now()}.webm`;
    const { url } = await storagePut(key, matteBuffer, "video/webm");
    console.log(`[MatteExtraction] Matte uploaded: ${url.slice(0, 80)}...`);

    return url;
  } finally {
    if (inputPath && fs.existsSync(inputPath)) try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    if (mattePath && fs.existsSync(mattePath)) try { fs.unlinkSync(mattePath); } catch { /* ignore */ }
  }
}

/**
 * Use fal.ai BiRefNet for high-quality background removal on a single frame.
 * This is used as a quality check / alternative to chromakey for complex hair edges.
 *
 * NOTE: BiRefNet works on images, not videos. For video matte extraction,
 * we use chromakey (above). BiRefNet can be used for the portrait crop
 * quality check or for generating a clean reference matte image.
 *
 * @param imageUrl  CDN URL of the image to remove background from
 * @returns         CDN URL of the background-removed image (PNG with transparency)
 */
export async function removeBackgroundWithBiRefNet(
  imageUrl: string,
  sceneId: number | string
): Promise<string> {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new Error("FAL_AI_API_KEY is not configured");

  fal.config({ credentials: apiKey });

  console.log(`[MatteExtraction] BiRefNet: removing background from ${imageUrl.slice(0, 80)}...`);

  const result = await fal.subscribe("fal-ai/birefnet", {
    input: {
      image_url: imageUrl,
      model: "General Use (Light)",
      operating_resolution: "1024x1024",
      output_format: "png",
    },
    logs: false,
    pollInterval: 3000,
  }) as any;

  const outputUrl = result?.data?.image?.url ?? result?.image?.url;
  if (!outputUrl) {
    throw new Error(`[MatteExtraction] BiRefNet returned no output URL. Response: ${JSON.stringify(result).slice(0, 200)}`);
  }

  // Download and re-upload to S3 for permanent storage
  const response = await fetch(outputUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const key = `music-video-scenes/${sceneId}-birefnet-${Date.now()}.png`;
  const { url } = await storagePut(key, buffer, "image/png");

  console.log(`[MatteExtraction] BiRefNet output uploaded: ${url.slice(0, 80)}...`);
  return url;
}
