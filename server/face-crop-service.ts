/**
 * Face Crop Service — Stage 2 of WIZ AI 5-Stage Compositing Pipeline
 *
 * PURPOSE: Before submitting Portrait B to InfiniteTalk, detect Zara's face
 * using fal.ai face detection and crop to a head-and-shoulders frame that
 * guarantees the full head is visible with proper headroom above the crown.
 *
 * CROP GEOMETRY (face-detection anchored):
 *   - Detect face bounding box via fal.ai retinaface
 *   - headroom:   25% of face height above the top of the bounding box
 *   - chin pad:   50% of face height below the bottom of the bounding box (shoulders)
 *   - side pad:   40% of face width on each side (centred)
 *   - Output:     square crop (1:1), minimum 512px, uploaded to S3
 *
 * FALLBACK (if face detection fails):
 *   - Use top-40% of image height (NOT top-55% — safer for tall portraits)
 *   - Centre horizontally
 *   - Start from y=0 but add explicit 5% top padding via padding filter
 *
 * This replaces the previous heuristic that blindly took the top 55% and
 * clipped the crown when the face was near the top of the portrait.
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

// ── fal.ai client ──────────────────────────────────────────────────────────────
let _falClient: any = null;
function getFalClient() {
  if (_falClient) return _falClient;
  try {
    const falModule = _require("@fal-ai/client");
    const client = falModule.createFalClient
      ? falModule.createFalClient({ credentials: process.env.FAL_AI_API_KEY })
      : falModule.fal;
    if (process.env.FAL_AI_API_KEY && client?.config) {
      client.config({ credentials: process.env.FAL_AI_API_KEY });
    }
    _falClient = client;
    return _falClient;
  } catch {
    return null;
  }
}

interface FaceBox {
  x: number;   // left edge (pixels)
  y: number;   // top edge (pixels)
  w: number;   // width (pixels)
  h: number;   // height (pixels)
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
  try {
    const { stdout } = await execAsync(`"${ffprobeBin}" -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${imagePath}"`);
    const [w, h] = stdout.trim().split(",").map(Number);
    if (w && h) return { width: w, height: h };
  } catch { /* fallback */ }
  const { stdout } = await execAsync(`"${ffmpeg}" -i "${imagePath}" 2>&1 || true`);
  const match = stdout.match(/(\d+)x(\d+)/);
  if (match) return { width: parseInt(match[1]), height: parseInt(match[2]) };
  throw new Error(`[FaceCrop] Could not determine image dimensions for ${imagePath}`);
}

/**
 * Detect the largest face in the image using fal.ai retinaface.
 * Returns the face bounding box in pixels, or null if detection fails.
 */
async function detectFaceBox(imageUrl: string, imgW: number, imgH: number): Promise<FaceBox | null> {
  const fal = getFalClient();
  if (!fal) {
    console.warn("[FaceCrop] fal.ai client not available — skipping face detection");
    return null;
  }

  try {
    console.log("[FaceCrop] Running fal.ai face detection...");
    const result = await fal.subscribe("fal-ai/imageutils/retinaface", {
      input: { image_url: imageUrl },
    });

    const faces = result?.data?.faces ?? result?.faces ?? [];
    if (!faces || faces.length === 0) {
      console.warn("[FaceCrop] No faces detected — falling back to heuristic crop");
      return null;
    }

    // Pick the largest face (by bounding box area)
    let best: any = null;
    let bestArea = 0;
    for (const face of faces) {
      // fal retinaface returns bbox as [x1, y1, x2, y2] normalised 0-1 OR pixel coords
      const bbox = face.bbox ?? face.bounding_box ?? face.box;
      if (!bbox) continue;
      let x1: number, y1: number, x2: number, y2: number;
      if (Array.isArray(bbox)) {
        [x1, y1, x2, y2] = bbox;
      } else {
        x1 = bbox.x1 ?? bbox.left ?? 0;
        y1 = bbox.y1 ?? bbox.top ?? 0;
        x2 = bbox.x2 ?? bbox.right ?? 0;
        y2 = bbox.y2 ?? bbox.bottom ?? 0;
      }
      // Normalise to pixels if values are 0-1
      if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
        x1 *= imgW; y1 *= imgH; x2 *= imgW; y2 *= imgH;
      }
      const area = (x2 - x1) * (y2 - y1);
      if (area > bestArea) {
        bestArea = area;
        best = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      }
    }

    if (!best) {
      console.warn("[FaceCrop] Could not parse face bounding box — falling back to heuristic");
      return null;
    }

    console.log(`[FaceCrop] Face detected: x=${Math.round(best.x)} y=${Math.round(best.y)} w=${Math.round(best.w)} h=${Math.round(best.h)}`);
    return best;
  } catch (err: any) {
    console.warn(`[FaceCrop] Face detection failed: ${err?.message ?? err} — falling back to heuristic`);
    return null;
  }
}

/**
 * Build the crop rectangle from a detected face bounding box.
 *
 * Padding rules (all relative to face height/width):
 *   headroom above crown:  30% of face height  (ensures full head + hair)
 *   chin pad below chin:   55% of face height  (shows shoulders)
 *   side pad each side:    45% of face width   (natural framing)
 *
 * The result is clamped to image bounds and made square.
 */
function buildCropFromFaceBox(
  face: FaceBox,
  imgW: number,
  imgH: number
): { x: number; y: number; size: number } {
  const headroom  = face.h * 0.30;
  const chinPad   = face.h * 0.55;
  const sidePad   = face.w * 0.45;

  let top    = face.y - headroom;
  let bottom = face.y + face.h + chinPad;
  let left   = face.x - sidePad;
  let right  = face.x + face.w + sidePad;

  // Make square — use the larger dimension
  const desiredW = right - left;
  const desiredH = bottom - top;
  const size = Math.round(Math.max(desiredW, desiredH));

  // Re-centre the square on the face centre
  const faceCentreX = face.x + face.w / 2;
  const faceCentreY = face.y + face.h / 2;

  let cropX = Math.round(faceCentreX - size / 2);
  let cropY = Math.round(faceCentreY - size / 2);

  // Clamp to image bounds — shift rather than shrink
  if (cropX < 0) cropX = 0;
  if (cropY < 0) cropY = 0;
  if (cropX + size > imgW) cropX = Math.max(0, imgW - size);
  if (cropY + size > imgH) cropY = Math.max(0, imgH - size);

  const clampedSize = Math.min(size, imgW - cropX, imgH - cropY);

  console.log(`[FaceCrop] Face-anchored crop: ${clampedSize}x${clampedSize} at (${cropX}, ${cropY}) — headroom=${Math.round(headroom)}px above crown`);
  return { x: cropX, y: cropY, size: clampedSize };
}

/**
 * Fallback heuristic crop when face detection is unavailable.
 *
 * Takes the top 45% of the image height (safer than 55% — less likely to
 * clip the crown), centred horizontally, as a square crop.
 */
function buildHeuristicCrop(
  imgW: number,
  imgH: number
): { x: number; y: number; size: number } {
  // Use top 45% of height — conservative enough to include full head
  const cropHeight = Math.round(imgH * 0.45);
  const size = Math.min(imgW, cropHeight);
  const x = Math.round((imgW - size) / 2);
  const y = 0;
  console.log(`[FaceCrop] Heuristic crop (no face detection): ${size}x${size} at (${x}, ${y})`);
  return { x, y, size };
}

/**
 * Crop portrait to head-and-shoulders with guaranteed full head visibility.
 *
 * Primary:  fal.ai face detection → face-anchored crop with 30% headroom
 * Fallback: top-45% heuristic crop centred horizontally
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

    // Step 3: Detect face and build crop region
    const faceBox = await detectFaceBox(imageUrl, width, height);
    const crop = faceBox
      ? buildCropFromFaceBox(faceBox, width, height)
      : buildHeuristicCrop(width, height);

    // Enforce minimum output size of 512px
    const finalSize = Math.max(crop.size, 512);

    // Step 4: Apply crop using ffmpeg
    croppedPath = path.join(os.tmpdir(), `wiz-cropped-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    // crop=w:h:x:y then scale to finalSize if needed
    const scaleFilter = crop.size < finalSize ? `,scale=${finalSize}:${finalSize}` : "";
    const cropCmd = `"${ffmpeg}" -y -i "${inputPath}" -vf "crop=${crop.size}:${crop.size}:${crop.x}:${crop.y}${scaleFilter}" -q:v 2 "${croppedPath}"`;
    const { stderr } = await execAsync(cropCmd);
    if (!fs.existsSync(croppedPath) || fs.statSync(croppedPath).size < 1000) {
      throw new Error(`[FaceCrop] Crop failed — output file missing or too small. ffmpeg stderr: ${stderr.slice(0, 300)}`);
    }
    console.log(`[FaceCrop] Cropped portrait: ${fs.statSync(croppedPath).size} bytes (${finalSize}x${finalSize})`);

    // Step 5: Upload to S3
    const croppedBuffer = fs.readFileSync(croppedPath);
    const key = `characters/face-crop-${sceneId}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, croppedBuffer, "image/jpeg");
    console.log(`[FaceCrop] Uploaded cropped portrait: ${url.slice(0, 80)}...`);

    return url;
  } finally {
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
 * Cache is per-process — cleared on server restart.
 */
const _cropCache = new Map<string, string>();

export function clearCropCache(): void {
  _cropCache.clear();
  console.log("[FaceCrop] Crop cache cleared");
}

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
