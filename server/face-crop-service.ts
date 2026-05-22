/**
 * Face Crop Service — Stage 2 Fix for WIZ AI 5-Stage Compositing Pipeline
 *
 * PROBLEM: InfiniteTalk receives Portrait B which is a full-body fashion photo.
 * When InfiniteTalk animates a full-body photo, Zara's head is at the top of the
 * frame and gets cut off when the output is cropped to 16:9.
 *
 * SOLUTION: Before submitting to InfiniteTalk, detect the face region in Portrait B
 * and crop to a tight head-and-shoulders frame:
 *   - Face centred horizontally
 *   - ~15% headroom above the top of the face bounding box
 *   - Shoulders visible below the chin (crop bottom ~30% below chin)
 *   - Output: square crop (1:1 aspect ratio) suitable for InfiniteTalk
 *
 * STRATEGY:
 * 1. Download Portrait B to /tmp
 * 2. Use fal.ai face detection OR a simple heuristic (top-40% crop) to find face
 * 3. Crop the image using ffmpeg/sharp
 * 4. Upload cropped image to S3
 * 5. Return CDN URL of cropped image
 *
 * The heuristic approach (top 40% of portrait) is used as primary strategy because:
 * - Portrait B is a known fashion photo with face at top
 * - Avoids additional fal.ai API cost for every render
 * - Simple, deterministic, and fast
 * - Can be overridden with face detection if portrait changes
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

// ── ffmpeg binary resolution (same pattern as audio-clip-extractor.ts) ────────
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
 * Download a remote image to a temp path.
 */
async function downloadImageToTemp(imageUrl: string): Promise<string> {
  const ext = imageUrl.includes(".png") ? "png" : "jpg";
  const tmpPath = path.join(os.tmpdir(), `wiz-portrait-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download portrait: HTTP ${response.status} from ${imageUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  console.log(`[FaceCrop] Downloaded portrait to ${tmpPath} (${buffer.length} bytes)`);
  return tmpPath;
}

/**
 * Get image dimensions using ffprobe.
 */
async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  const ffmpeg = getFFmpegBin();
  const ffprobeBin = ffmpeg.replace(/ffmpeg$/, "ffprobe");
  const ffprobeCmd = `"${ffprobeBin}" -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${imagePath}"`;
  try {
    const { stdout } = await execAsync(ffprobeCmd);
    const [w, h] = stdout.trim().split(",").map(Number);
    if (w && h) return { width: w, height: h };
  } catch { /* fallback */ }
  // Fallback: use ffmpeg to probe
  const { stdout } = await execAsync(`"${ffmpeg}" -i "${imagePath}" 2>&1 | grep "Stream" | grep "Video"`);
  const match = stdout.match(/(\d+)x(\d+)/);
  if (match) return { width: parseInt(match[1]), height: parseInt(match[2]) };
  throw new Error(`[FaceCrop] Could not determine image dimensions for ${imagePath}`);
}

/**
 * Crop portrait to head-and-shoulders using heuristic approach.
 *
 * HEURISTIC: For a typical fashion/portrait photo:
 * - Face is in the top 35-45% of the image
 * - We crop the top 55% of the image height, centred horizontally
 * - This gives a tight head-and-shoulders frame
 *
 * The output is a square crop (1:1) centred on the face region.
 * InfiniteTalk works best with square portrait inputs.
 *
 * @param imageUrl  CDN URL of the full-body portrait (Portrait B)
 * @param sceneId   Used for S3 key naming
 * @returns         CDN URL of the cropped head-and-shoulders image
 */
export async function cropPortraitToHeadAndShoulders(
  imageUrl: string,
  sceneId: number | string
): Promise<string> {
  const ffmpeg = getFFmpegBin();
  let inputPath: string | null = null;
  let croppedPath: string | null = null;

  try {
    // Step 1: Download portrait
    inputPath = await downloadImageToTemp(imageUrl);

    // Step 2: Get dimensions
    const { width, height } = await getImageDimensions(inputPath);
    console.log(`[FaceCrop] Portrait dimensions: ${width}x${height}`);

    // Step 3: Calculate crop region
    // Strategy: crop the top 55% of the image height, centred horizontally
    // This captures face + shoulders for most fashion/portrait photos
    // The crop is square (1:1) to match InfiniteTalk's preferred input format
    const cropHeight = Math.round(height * 0.55);
    const cropSize = Math.min(width, cropHeight); // square crop
    const cropX = Math.round((width - cropSize) / 2); // centre horizontally
    const cropY = 0; // start from top of image

    console.log(`[FaceCrop] Crop region: ${cropSize}x${cropSize} at (${cropX}, ${cropY}) from ${width}x${height}`);

    // Step 4: Apply crop using ffmpeg
    croppedPath = path.join(os.tmpdir(), `wiz-cropped-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    const cropCmd = `"${ffmpeg}" -y -i "${inputPath}" -vf "crop=${cropSize}:${cropSize}:${cropX}:${cropY}" -q:v 2 "${croppedPath}"`;
    const { stderr } = await execAsync(cropCmd);
    if (!fs.existsSync(croppedPath) || fs.statSync(croppedPath).size < 1000) {
      throw new Error(`[FaceCrop] Crop failed — output file missing or too small. ffmpeg stderr: ${stderr.slice(0, 300)}`);
    }
    console.log(`[FaceCrop] Cropped portrait: ${fs.statSync(croppedPath).size} bytes`);

    // Step 5: Upload to S3
    const croppedBuffer = fs.readFileSync(croppedPath);
    const key = `characters/face-crop-${sceneId}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, croppedBuffer, "image/jpeg");
    console.log(`[FaceCrop] Uploaded cropped portrait: ${url.slice(0, 80)}...`);

    return url;
  } finally {
    // Cleanup temp files
    if (inputPath && fs.existsSync(inputPath)) {
      try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    }
    if (croppedPath && fs.existsSync(croppedPath)) {
      try { fs.unlinkSync(croppedPath); } catch { /* ignore */ }
    }
  }
}

/**
 * Get or create a cached head-and-shoulders crop for a portrait URL.
 *
 * Uses a simple in-memory cache to avoid re-cropping the same portrait
 * multiple times within a single heartbeat tick.
 */
const _cropCache = new Map<string, string>();

export async function getCroppedPortraitForInfiniteTalk(
  portraitUrl: string,
  sceneId: number | string
): Promise<string> {
  const cached = _cropCache.get(portraitUrl);
  if (cached) {
    console.log(`[FaceCrop] Using cached crop for ${portraitUrl.slice(0, 60)}...`);
    return cached;
  }

  const croppedUrl = await cropPortraitToHeadAndShoulders(portraitUrl, sceneId);
  _cropCache.set(portraitUrl, croppedUrl);
  return croppedUrl;
}
