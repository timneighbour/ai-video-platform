/**
 * Hedra Avatar Lip Sync Service
 *
 * VERIFIED WORKING — tested live 2026-05-19
 *
 * Hedra is the correct tool for Performance Mode scenes:
 *   - Takes a still portrait image + isolated vocal audio
 *   - Generates a fully animated talking/singing face video with accurate phoneme sync
 *   - Does NOT require pre-existing mouth movement in the input
 *   - Model: Hedra Character 3 (d1dd37a3-e39a-4854-a298-6510289f9cf2) — flagship lip sync
 *
 * API base: https://api.hedra.com/web-app/public
 * Auth: X-API-Key header
 *
 * VERIFIED Flow:
 *   1. POST /assets { name, type: "audio" } → get audio_asset_id
 *   2. POST /assets/{audio_asset_id}/upload (multipart/form-data with curl) → upload audio
 *   3. POST /assets { name, type: "image" } → get image_asset_id
 *   4. POST /assets/{image_asset_id}/upload (multipart/form-data with curl) → upload image
 *   5. POST /generations { type, ai_model_id, start_keyframe_id, audio_id, generated_video_inputs }
 *   6. Poll GET /generations (list) until data[0].status === "complete"
 *   7. Output URL: data[0].asset.asset.download_url (Mux MP4 download link)
 *
 * NOTE: GET /generations/{id} returns 404 — must use the list endpoint for polling
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const HEDRA_BASE_URL = "https://api.hedra.com/web-app/public";

// Hedra Character 3 — flagship model with effortless facial animation and synced lip-movement
const HEDRA_CHARACTER_3_MODEL_ID = "d1dd37a3-e39a-4854-a298-6510289f9cf2";
// Hedra Avatar — longform avatar model, up to 10 minutes
const HEDRA_AVATAR_MODEL_ID = "26f0fc66-152b-40ab-abed-76c43df99bc8";

const POLL_INTERVAL_MS = 8000;
const DEFAULT_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes

export interface HedraLipSyncOptions {
  /** URL of the portrait image (hero frame — chest-up close-up, face forward) */
  imageUrl: string;
  /** URL of the isolated vocals audio (from Demucs — NO instrumentals) */
  audioUrl: string;
  /** Scene ID for logging */
  sceneId?: number;
  /** Aspect ratio — default 9:16 for portrait performance shots */
  aspectRatio?: "9:16" | "16:9" | "1:1";
  /** Output resolution */
  resolution?: "720p" | "1080p";
  /** Text prompt to guide the animation style */
  textPrompt?: string;
}

export interface HedraLipSyncResult {
  generationId: string;
  outputUrl: string;
  provider: "hedra";
  sceneId?: number;
}

function getApiKey(): string {
  const key = process.env.HEDRA_API_KEY;
  if (!key) throw new Error("HEDRA_API_KEY not configured");
  return key;
}

async function hedraJsonPost(endpoint: string, body: object): Promise<any> {
  const key = getApiKey();
  const res = await fetch(`${HEDRA_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Hedra POST ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

/**
 * Upload a file to Hedra using curl (multipart/form-data).
 * The fetch + form-data approach fails with "error parsing body" — curl works reliably.
 */
function uploadFileWithCurl(assetId: string, filePath: string): void {
  const key = getApiKey();
  const result = execSync(
    `curl -s -X POST '${HEDRA_BASE_URL}/assets/${assetId}/upload' -H 'X-API-Key: ${key}' -F 'file=@${filePath}'`,
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(result);
  if (!parsed.id) {
    throw new Error(`Hedra upload failed for asset ${assetId}: ${result}`);
  }
}

/**
 * Download a file from a URL to a local temp path.
 */
async function downloadToTemp(url: string, ext: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `hedra-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

/**
 * Submit a Hedra lip sync generation job.
 * Returns the generation ID.
 */
export async function submitHedraLipSync(options: HedraLipSyncOptions): Promise<string> {
  const sceneLabel = options.sceneId ?? "unknown";
  console.log(`[HedraLipSync] Starting job for scene ${sceneLabel}`);

  // Download files to temp
  const [audioTmp, imageTmp] = await Promise.all([
    downloadToTemp(options.audioUrl, ".mp3"),
    downloadToTemp(options.imageUrl, ".jpg"),
  ]);

  try {
    // Create asset records
    const [audioAsset, imageAsset] = await Promise.all([
      hedraJsonPost("/assets", { name: `hedra-vocals-${sceneLabel}.mp3`, type: "audio" }),
      hedraJsonPost("/assets", { name: `hedra-portrait-${sceneLabel}.jpg`, type: "image" }),
    ]);

    console.log(`[HedraLipSync] Assets created: audio=${audioAsset.id} image=${imageAsset.id}`);

    // Upload files (must be sequential — curl-based)
    uploadFileWithCurl(audioAsset.id, audioTmp);
    uploadFileWithCurl(imageAsset.id, imageTmp);

    console.log(`[HedraLipSync] Files uploaded successfully`);

    // Submit generation
    const gen = await hedraJsonPost("/generations", {
      type: "video",
      ai_model_id: HEDRA_CHARACTER_3_MODEL_ID,
      start_keyframe_id: imageAsset.id,
      audio_id: audioAsset.id,
      generated_video_inputs: {
        text_prompt: options.textPrompt ??
          "A singer performing expressively to the camera, mouth moving naturally with the music, emotional vocal performance, realistic lip sync",
        aspect_ratio: options.aspectRatio ?? "9:16",
        resolution: options.resolution ?? "720p",
      },
    });

    console.log(`[HedraLipSync] Generation submitted: ${gen.id} (ETA: ${gen.eta_sec ?? "?"}s)`);
    return gen.id;
  } finally {
    try { fs.unlinkSync(audioTmp); } catch {}
    try { fs.unlinkSync(imageTmp); } catch {}
  }
}

/**
 * Poll Hedra for a generation result.
 * Uses GET /generations (list) because GET /generations/{id} returns 404.
 * Returns the MP4 download URL.
 */
export async function pollHedraLipSync(
  generationId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  const key = getApiKey();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${HEDRA_BASE_URL}/generations`, {
      headers: { "X-API-Key": key },
    });
    if (!res.ok) {
      console.warn(`[HedraLipSync] Poll failed: ${res.status}`);
      continue;
    }

    const data = await res.json() as any;
    const gen = (data.data as any[]).find((g: any) => g.id === generationId);

    if (!gen) {
      console.warn(`[HedraLipSync] Generation ${generationId} not found in list`);
      continue;
    }

    const pct = gen.progress !== undefined ? `${Math.round(gen.progress * 100)}%` : "N/A";
    console.log(`[HedraLipSync] ${generationId} — status: ${gen.status} progress: ${pct} eta: ${gen.eta_sec ?? "?"}s`);

    if (gen.status === "complete") {
      // Output URL is at gen.asset.asset.download_url (Mux MP4)
      const downloadUrl = gen?.asset?.asset?.download_url;
      if (!downloadUrl) {
        throw new Error(`[HedraLipSync] Generation ${generationId} complete but no download_url`);
      }
      console.log(`[HedraLipSync] COMPLETE — output: ${downloadUrl.slice(0, 80)}...`);
      return downloadUrl;
    }

    if (gen.status === "failed" || gen.status === "error") {
      throw new Error(`[HedraLipSync] Generation ${generationId} failed: ${gen.error_message ?? gen.error ?? "unknown"}`);
    }
  }

  throw new Error(`[HedraLipSync] Generation ${generationId} timed out after ${timeoutMs / 1000}s`);
}

/**
 * Submit and wait for a Hedra lip sync job.
 * Convenience wrapper combining submit + poll.
 */
export async function waitForHedraLipSync(
  options: HedraLipSyncOptions,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<HedraLipSyncResult> {
  const generationId = await submitHedraLipSync(options);
  const outputUrl = await pollHedraLipSync(generationId, timeoutMs);
  return {
    generationId,
    outputUrl,
    provider: "hedra",
    sceneId: options.sceneId,
  };
}

/**
 * Check if Hedra is configured and available.
 */
export function isHedraConfigured(): boolean {
  return !!process.env.HEDRA_API_KEY;
}

/**
 * Full pipeline: extract hero frame from WaveSpeed video, isolate vocals,
 * submit to Hedra Character 3, and save the result to the database.
 *
 * Called automatically after a Performance Mode scene's WaveSpeed render completes.
 */
export async function runHedraLipSyncForScene(
  sceneId: number,
  videoUrl: string,
  audioUrl: string,
  sceneStartTime: number,
): Promise<void> {
  const { execSync } = await import("child_process");
  const fs = await import("fs");
  const os = await import("os");
  const path = await import("path");
  const { getDb } = await import("../db");
  const { musicVideoScenes } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const { storagePut } = await import("../storage");

  const tmpDir = os.tmpdir();
  const videoTmp = path.join(tmpDir, `hedra-input-${sceneId}-${Date.now()}.mp4`);
  const frameTmp = path.join(tmpDir, `hedra-frame-${sceneId}-${Date.now()}.jpg`);
  const audioTmp = path.join(tmpDir, `hedra-audio-${sceneId}-${Date.now()}.mp3`);
  const vocalsTmp = path.join(tmpDir, `hedra-vocals-${sceneId}-${Date.now()}.mp3`);

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // Mark as processing
    await db.update(musicVideoScenes)
      .set({ hedraStatus: "processing", updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));

    // 1. Download the WaveSpeed video
    console.log(`[HedraAuto] Downloading WaveSpeed video for scene ${sceneId}`);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    fs.writeFileSync(videoTmp, Buffer.from(await videoRes.arrayBuffer()));

    // 2. Extract best frame (at 1s — usually a good singing pose)
    console.log(`[HedraAuto] Extracting hero frame for scene ${sceneId}`);
    execSync(`ffmpeg -y -i "${videoTmp}" -ss 1 -vframes 1 -q:v 2 "${frameTmp}"`, { stdio: "pipe" });

    // 3. Download and isolate vocals using Demucs
    console.log(`[HedraAuto] Downloading audio for scene ${sceneId}`);
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    fs.writeFileSync(audioTmp, Buffer.from(await audioRes.arrayBuffer()));

    // Trim audio to scene segment
    const sceneDuration = 6; // default 6s per scene
    const trimmedAudioTmp = path.join(tmpDir, `hedra-trimmed-${sceneId}-${Date.now()}.mp3`);
    execSync(
      `ffmpeg -y -i "${audioTmp}" -ss ${sceneStartTime} -t ${sceneDuration} -ar 44100 -ac 1 "${trimmedAudioTmp}"`,
      { stdio: "pipe" }
    );

    // Run Demucs vocal isolation
    console.log(`[HedraAuto] Isolating vocals for scene ${sceneId}`);
    const demucsOutDir = path.join(tmpDir, `demucs-${sceneId}-${Date.now()}`);
    fs.mkdirSync(demucsOutDir, { recursive: true });
    try {
      execSync(
        `python3 -m demucs --two-stems=vocals --mp3 --out "${demucsOutDir}" "${trimmedAudioTmp}"`,
        { stdio: "pipe", timeout: 120000 }
      );
      // Find the vocals file
      const modelDir = fs.readdirSync(demucsOutDir)[0];
      const songDir = fs.readdirSync(path.join(demucsOutDir, modelDir))[0];
      const vocalsPath = path.join(demucsOutDir, modelDir, songDir, "vocals.mp3");
      if (fs.existsSync(vocalsPath)) {
        fs.copyFileSync(vocalsPath, vocalsTmp);
        console.log(`[HedraAuto] Vocals isolated successfully for scene ${sceneId}`);
      } else {
        // Fall back to trimmed audio if Demucs fails
        fs.copyFileSync(trimmedAudioTmp, vocalsTmp);
        console.warn(`[HedraAuto] Demucs vocals not found — using trimmed audio for scene ${sceneId}`);
      }
    } catch (demucsErr) {
      // Demucs failed — use trimmed audio as fallback
      fs.copyFileSync(trimmedAudioTmp, vocalsTmp);
      console.warn(`[HedraAuto] Demucs failed for scene ${sceneId} — using trimmed audio:`, demucsErr);
    }

    // 4. Upload frame and vocals to S3 for Hedra
    const frameBuffer = fs.readFileSync(frameTmp);
    const vocalsBuffer = fs.readFileSync(vocalsTmp);
    const [{ url: frameUrl }, { url: vocalsUrl }] = await Promise.all([
      storagePut(`music-video-scenes/hedra-frame-${sceneId}-${Date.now()}.jpg`, frameBuffer, "image/jpeg"),
      storagePut(`music-video-scenes/hedra-vocals-${sceneId}-${Date.now()}.mp3`, vocalsBuffer, "audio/mpeg"),
    ]);

    // 5. Submit to Hedra and wait for result
    console.log(`[HedraAuto] Submitting to Hedra Character 3 for scene ${sceneId}`);
    const result = await waitForHedraLipSync({
      imageUrl: frameUrl,
      audioUrl: vocalsUrl,
      sceneId,
      aspectRatio: "9:16",
      resolution: "720p",
      textPrompt: "A singer performing expressively to the camera, mouth moving naturally with the music, emotional vocal performance, realistic lip sync",
    });

    // 6. Download and store Hedra output to S3
    const hedraRes = await fetch(result.outputUrl);
    if (!hedraRes.ok) throw new Error(`Failed to download Hedra output: ${hedraRes.status}`);
    const hedraBuffer = Buffer.from(await hedraRes.arrayBuffer());
    const hedraKey = `music-video-scenes/hedra-${sceneId}-${Date.now()}.mp4`;
    const { url: hedraVideoUrl } = await storagePut(hedraKey, hedraBuffer, "video/mp4");

    // 7. Save to DB
    await db.update(musicVideoScenes)
      .set({
        hedraVideoUrl,
        hedraStatus: "done",
        updatedAt: new Date(),
      })
      .where(eq(musicVideoScenes.id, sceneId));

    console.log(`[HedraAuto] Scene ${sceneId} Hedra complete — ${hedraVideoUrl.slice(0, 80)}...`);

  } catch (err) {
    console.error(`[HedraAuto] Scene ${sceneId} failed:`, err);
    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ hedraStatus: "error", updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    throw err;
  } finally {
    // Cleanup temp files
    for (const f of [videoTmp, frameTmp, audioTmp, vocalsTmp]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}
