/**
 * Sync Labs Assets API — /v2/assets
 * ──────────────────────────────────
 * Provides pre-signed URL upload and reusable asset IDs.
 *
 * Workflow:
 *   1. Call createSyncLabsUploadUrl() → get { uploadUrl, url }
 *   2. PUT the file bytes to uploadUrl with the matching Content-Type
 *   3. Call registerSyncLabsAsset() with the returned url → get { id }
 *   4. Pass the asset id in generation input as { type, assetId } instead of { type, url }
 *
 * Benefits over raw URL passing:
 *   - Upload once, reuse across multiple generation jobs (no re-download cost)
 *   - Avoids re-uploading the same character image or audio stem for every scene
 *   - Reduces latency on job submission (SyncLabs already has the bytes)
 *   - Pre-signed URLs expire in 3600s — register the asset immediately after upload
 *
 * API reference: https://sync.so/docs/api-reference/api/assets-api/create-upload
 */

import axios from "axios";

const SYNCLABS_API_BASE = "https://api.sync.so/v2";

function getKey(): string {
  const key = process.env.SYNC_LABS_API_KEY;
  if (!key) throw new Error("[SyncLabsAssets] SYNC_LABS_API_KEY is not set");
  return key;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncLabsUploadUrlResponse {
  /** Pre-signed PUT URL — upload file bytes here with matching Content-Type */
  uploadUrl: string;
  /** Permanent asset URL — pass to registerSyncLabsAsset() after upload */
  url: string;
  /** Seconds until the uploadUrl expires (typically 3600) */
  expiresIn: number;
}

export interface SyncLabsAsset {
  id: string;
  name: string;
  type: "VIDEO" | "AUDIO" | "IMAGE";
  url: string;
  format: string;
  size: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Step 1: Request a pre-signed upload URL ─────────────────────────────────

/**
 * Request a pre-signed URL to upload a file directly to SyncLabs storage.
 * Single uploads are capped at 5 GB.
 *
 * @param fileName  Original filename (e.g. "scene-3-vocal.wav")
 * @param contentType  MIME type (e.g. "audio/wav", "video/mp4", "image/jpeg")
 * @param size  File size in bytes
 */
export async function createSyncLabsUploadUrl(
  fileName: string,
  contentType: string,
  size: number
): Promise<SyncLabsUploadUrlResponse> {
  const resp = await axios.post(
    `${SYNCLABS_API_BASE}/assets/upload`,
    { fileName, contentType, size },
    {
      headers: { "x-api-key": getKey(), "Content-Type": "application/json" },
      timeout: 15_000,
    }
  );

  const { uploadUrl, url, expiresIn } = resp.data;
  if (!uploadUrl || !url) {
    throw new Error(`[SyncLabsAssets] createUploadUrl failed — unexpected response: ${JSON.stringify(resp.data).slice(0, 200)}`);
  }

  console.log(`[SyncLabsAssets] Upload URL created for "${fileName}" (${Math.round(size / 1024)} KB) — expires in ${expiresIn}s`);
  return { uploadUrl, url, expiresIn };
}

// ─── Step 2: PUT file bytes to the pre-signed URL ────────────────────────────

/**
 * Upload raw file bytes to the pre-signed URL returned by createSyncLabsUploadUrl().
 * Must use the same Content-Type as provided to createSyncLabsUploadUrl().
 *
 * @param uploadUrl  The pre-signed PUT URL from createSyncLabsUploadUrl()
 * @param data  File bytes as Buffer or Uint8Array
 * @param contentType  MIME type — must match what was used to create the upload URL
 */
export async function uploadFileToSyncLabs(
  uploadUrl: string,
  data: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await axios.put(uploadUrl, data, {
    headers: { "Content-Type": contentType },
    maxBodyLength: 5 * 1024 * 1024 * 1024, // 5 GB
    timeout: 5 * 60 * 1000, // 5 minutes
  });
  console.log(`[SyncLabsAssets] File uploaded successfully (${Math.round(data.byteLength / 1024)} KB)`);
}

// ─── Step 3: Register the uploaded file as a named asset ─────────────────────

/**
 * Register the uploaded file as a reusable SyncLabs asset.
 * Call this immediately after uploadFileToSyncLabs() — the pre-signed URL expires in ~1 hour.
 *
 * @param url  The permanent asset URL returned by createSyncLabsUploadUrl()
 * @param name  Human-readable name for the asset (e.g. "Zara-vocal-stem-scene3")
 * @param type  Asset type: "VIDEO", "AUDIO", or "IMAGE"
 */
export async function registerSyncLabsAsset(
  url: string,
  name: string,
  type: "VIDEO" | "AUDIO" | "IMAGE"
): Promise<SyncLabsAsset> {
  const resp = await axios.post(
    `${SYNCLABS_API_BASE}/assets`,
    { url, name, type },
    {
      headers: { "x-api-key": getKey(), "Content-Type": "application/json" },
      timeout: 15_000,
    }
  );

  const asset: SyncLabsAsset = resp.data;
  if (!asset?.id) {
    throw new Error(`[SyncLabsAssets] registerAsset failed — no id in response: ${JSON.stringify(resp.data).slice(0, 200)}`);
  }

  console.log(`[SyncLabsAssets] Asset registered: id=${asset.id} name="${asset.name}" type=${asset.type}`);
  return asset;
}

// ─── Convenience: full upload + register in one call ─────────────────────────

/**
 * Upload a file buffer to SyncLabs and register it as a reusable asset.
 * Returns the asset ID which can be passed to generation jobs as { type, assetId }.
 *
 * Use this to upload a character image or audio stem once and reuse across all scenes.
 *
 * @example
 * const assetId = await uploadAndRegisterSyncLabsAsset(
 *   imageBuffer, "image/jpeg", "zara-character-v2.jpg", "IMAGE"
 * );
 * // Then in generation: input: [{ type: "video", assetId }, { type: "audio", url: audioUrl }]
 */
export async function uploadAndRegisterSyncLabsAsset(
  data: Buffer | Uint8Array,
  contentType: string,
  fileName: string,
  type: "VIDEO" | "AUDIO" | "IMAGE"
): Promise<string> {
  const { uploadUrl, url } = await createSyncLabsUploadUrl(fileName, contentType, data.byteLength);
  await uploadFileToSyncLabs(uploadUrl, data, contentType);
  const asset = await registerSyncLabsAsset(url, fileName, type);
  return asset.id;
}

// ─── Get asset by ID ──────────────────────────────────────────────────────────

/**
 * Retrieve a previously registered asset by its ID.
 * Useful to verify an asset still exists before referencing it in a generation job.
 */
export async function getSyncLabsAsset(assetId: string): Promise<SyncLabsAsset | null> {
  try {
    const resp = await axios.get(`${SYNCLABS_API_BASE}/assets/${assetId}`, {
      headers: { "x-api-key": getKey() },
      timeout: 10_000,
    });
    return resp.data as SyncLabsAsset;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

// ─── Delete asset ─────────────────────────────────────────────────────────────

/**
 * Delete a registered asset from SyncLabs storage.
 * Call this after all generation jobs using the asset are complete to free storage.
 */
export async function deleteSyncLabsAsset(assetId: string): Promise<void> {
  await axios.delete(`${SYNCLABS_API_BASE}/assets/${assetId}`, {
    headers: { "x-api-key": getKey() },
    timeout: 10_000,
  });
  console.log(`[SyncLabsAssets] Asset deleted: id=${assetId}`);
}
