/**
 * Live test for HeyGen Direct Photo+Audio pipeline (v2).
 * Tests the full flow: download from Manus storage → upload to HeyGen → submit job → poll until done.
 */
import axios from "axios";
import FormData from "form-data";

const HEYGEN_API_BASE = "https://api.heygen.com";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!HEYGEN_API_KEY) {
  console.error("ERROR: HEYGEN_API_KEY not set");
  process.exit(1);
}

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("ERROR: BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set");
  process.exit(1);
}

// Manus storage keys for test assets
// Format: {uid}/{jobId}/{filePath}
const IMAGE_STORAGE_KEY = "310519663500868908/ALJHDNsuNA7bExFuoQZUsx/zara-closeup-lipsync-v2.png";
const AUDIO_STORAGE_KEY = "310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/990015-vocal-stem-slice-1749955283.mp3";

async function downloadFromManusStorage(storageKey, label) {
  const downloadUrl = new URL(
    "v1/storage/download",
    FORGE_API_URL.endsWith("/") ? FORGE_API_URL : `${FORGE_API_URL}/`
  );
  downloadUrl.searchParams.set("path", storageKey);

  console.log(`[Download] Downloading ${label} from Manus storage: ${storageKey}`);
  const dlResp = await fetch(downloadUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${FORGE_API_KEY}`,
    },
  });

  if (!dlResp.ok) {
    throw new Error(
      `[Download] Failed to download ${label}: HTTP ${dlResp.status}`
    );
  }

  const buffer = Buffer.from(await dlResp.arrayBuffer());
  console.log(`[Download] Downloaded ${label}: ${buffer.length} bytes`);
  return buffer;
}

async function uploadAsset(buffer, mimeType, label) {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("wav") ? "wav" : mimeType.includes("jpeg") ? "jpg" : "mp3";
  const form = new FormData();
  form.append("file", buffer, { filename: `asset.${ext}`, contentType: mimeType });

  console.log(`[Upload] Uploading ${label} to HeyGen /v3/assets...`);
  const uploadResp = await axios.post(
    `${HEYGEN_API_BASE}/v3/assets`,
    form,
    {
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        ...form.getHeaders(),
      },
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  const assetId = uploadResp.data?.data?.asset_id;
  if (!assetId) throw new Error(`Upload failed: ${JSON.stringify(uploadResp.data).slice(0, 300)}`);
  console.log(`[Upload] ${label} → asset_id: ${assetId}`);
  return assetId;
}

async function submitJob(imageAssetId, audioAssetId) {
  const payload = {
    type: "image",
    image: {
      type: "asset_id",
      asset_id: imageAssetId,
    },
    audio_asset_id: audioAssetId,
    resolution: "720p",
    aspect_ratio: "16:9",
    fit: "cover",
    output_format: "mp4",
  };

  console.log("\n[Submit] Submitting job to HeyGen /v3/videos...");
  console.log("[Submit] Payload:", JSON.stringify(payload, null, 2));

  const resp = await axios.post(
    `${HEYGEN_API_BASE}/v3/videos`,
    payload,
    {
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const videoId = resp.data?.data?.video_id ?? resp.data?.video_id;
  if (!videoId) throw new Error(`No video_id: ${JSON.stringify(resp.data).slice(0, 300)}`);
  console.log(`[Submit] Job submitted → video_id: ${videoId}`);
  return videoId;
}

async function pollJob(videoId, maxWaitMs = 5 * 60 * 1000) {
  const startMs = Date.now();
  let intervalMs = 5_000;
  let attempt = 0;

  while (Date.now() - startMs < maxWaitMs) {
    await new Promise(r => setTimeout(r, intervalMs));
    attempt++;

    const resp = await axios.get(
      `${HEYGEN_API_BASE}/v3/videos/${videoId}`,
      {
        headers: { "x-api-key": HEYGEN_API_KEY },
        timeout: 15_000,
      }
    );

    const data = resp.data?.data;
    const status = data?.status ?? "unknown";
    const elapsed = Math.round((Date.now() - startMs) / 1000);
    console.log(`[Poll] Attempt ${attempt} (${elapsed}s elapsed) — status: ${status}`);

    if (status === "completed") {
      const videoUrl = data?.video_url ?? data?.output_url ?? data?.url ?? "";
      const duration = data?.duration ?? 0;
      console.log(`\n✅ COMPLETED! video_url: ${videoUrl}`);
      console.log(`   Duration: ${duration}s`);
      return { status: "completed", videoUrl, duration };
    }

    if (status === "failed" || status === "error") {
      const errorMessage = data?.failure_message ?? data?.error?.message ?? data?.error_message ?? "Unknown error";
      console.error(`\n❌ FAILED: ${errorMessage}`);
      console.error("Full response:", JSON.stringify(data, null, 2));
      return { status: "failed", errorMessage };
    }

    // Backoff
    intervalMs = Math.min(intervalMs + 5_000, 20_000);
  }

  return { status: "timeout", errorMessage: `Timed out after ${maxWaitMs / 1000}s` };
}

async function main() {
  console.log("=== HeyGen Direct Photo+Audio Live Test (v2) ===\n");

  try {
    // Step 1: Download assets from Manus storage
    const [imageBuf, audioBuf] = await Promise.all([
      downloadFromManusStorage(IMAGE_STORAGE_KEY, "Zara portrait"),
      downloadFromManusStorage(AUDIO_STORAGE_KEY, "vocal stem"),
    ]);

    // Step 2: Upload to HeyGen assets storage
    const [imageAssetId, audioAssetId] = await Promise.all([
      uploadAsset(imageBuf, "image/png", "Zara portrait"),
      uploadAsset(audioBuf, "audio/mpeg", "vocal stem"),
    ]);

    // Step 3: Submit job
    const videoId = await submitJob(imageAssetId, audioAssetId);

    // Step 4: Poll until done
    console.log(`\n[Poll] Polling job ${videoId} (max 5 min)...`);
    const result = await pollJob(videoId, 5 * 60 * 1000);

    console.log("\n=== RESULT ===");
    console.log(JSON.stringify(result, null, 2));

    if (result.status === "completed") {
      console.log("\n✅ SUCCESS: HeyGen Direct Photo+Audio pipeline works!");
      console.log(`   Download the video: ${result.videoUrl}`);
    } else {
      console.log("\n❌ FAILED:", result.errorMessage);
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    if (err.response) {
      console.error("Response:", JSON.stringify(err.response.data).slice(0, 500));
    }
    process.exit(1);
  }
}

main();
