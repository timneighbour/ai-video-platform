/**
 * HeyGen Photo Avatar Probe
 * Step 1: Create a Photo Avatar from masterPortraitUrl
 * Step 2: Generate talking head video with vocal stem 18s–24s
 */

import axios from "axios";
import { storagePut } from "../server/storage";
import https from "https";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const HEYGEN_BASE = "https://api.heygen.com";

const MASTER_PORTRAIT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1782158860646.png";

// Pre-trimmed 18s–24s vocal stem (already in S3)
const SCENE_AUDIO_KEY = "scene-audio/1140064-vocals-trimmed-18s-24s.mp3";

const headers = {
  "X-Api-Key": HEYGEN_API_KEY,
  "Content-Type": "application/json",
};

async function getAudioUrl(): Promise<string> {
  // Build the CloudFront URL for the pre-trimmed audio
  const cdnBase = process.env.VITE_CDN_URL || "https://d2xsxph8kpxj0f.cloudfront.net";
  const appId = process.env.VITE_APP_ID || "310519663500868908";
  // Try to get the S3 bucket prefix from env
  const s3Prefix = process.env.S3_BUCKET_PREFIX || "ALJHDNsuNA7bExFuoQZUsx";
  const audioUrl = `${cdnBase}/${appId}/${s3Prefix}/${SCENE_AUDIO_KEY}`;
  console.log("Audio URL:", audioUrl);
  return audioUrl;
}

async function uploadImageToHeyGen(imageUrl: string): Promise<string> {
  // HeyGen requires images uploaded via their asset upload endpoint
  // First download the image, then upload to HeyGen
  console.log("Downloading portrait from CloudFront...");
  const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  const imgBuffer = Buffer.from(imgResp.data);
  console.log(`Portrait downloaded: ${imgBuffer.length} bytes`);

  // Upload to HeyGen asset upload
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", imgBuffer, { filename: "zara-portrait.png", contentType: "image/png" });

  const uploadResp = await axios.post(
    `${HEYGEN_BASE}/v1/asset`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        "X-Api-Key": HEYGEN_API_KEY,
      },
      timeout: 60000,
    }
  );
  console.log("HeyGen asset upload response:", JSON.stringify(uploadResp.data));
  if (uploadResp.data?.data?.url) {
    return uploadResp.data.data.url;
  }
  throw new Error(`HeyGen asset upload failed: ${JSON.stringify(uploadResp.data)}`);
}

async function createPhotoAvatar(imageUrl: string): Promise<string> {
  console.log("\n=== STEP 1: Create Photo Avatar ===");
  // Use v2/photo_avatar endpoint
  const resp = await axios.post(
    `${HEYGEN_BASE}/v2/photo_avatar`,
    {
      image_url: imageUrl,
      name: "Zara-Probe-" + Date.now(),
    },
    { headers, timeout: 60000 }
  );
  console.log("Photo avatar response:", JSON.stringify(resp.data));
  if (resp.data?.data?.photo_avatar_id) {
    return resp.data.data.photo_avatar_id;
  }
  if (resp.data?.data?.avatar_id) {
    return resp.data.data.avatar_id;
  }
  throw new Error(`Photo avatar creation failed: ${JSON.stringify(resp.data)}`);
}

async function generateTalkingVideo(avatarId: string, audioUrl: string): Promise<string> {
  console.log("\n=== STEP 2: Generate Talking Head Video ===");
  console.log("Avatar ID:", avatarId);
  console.log("Audio URL:", audioUrl);

  // v2/video/generate with audio input
  const resp = await axios.post(
    `${HEYGEN_BASE}/v2/video/generate`,
    {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "audio",
            audio_url: audioUrl,
          },
        },
      ],
      dimension: { width: 1280, height: 720 },
      test: false,
    },
    { headers, timeout: 60000 }
  );
  console.log("Video generate response:", JSON.stringify(resp.data));
  if (resp.data?.data?.video_id) {
    return resp.data.data.video_id;
  }
  throw new Error(`Video generation failed: ${JSON.stringify(resp.data)}`);
}

async function pollVideoStatus(videoId: string): Promise<string> {
  console.log("\n=== STEP 3: Poll Video Status ===");
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const resp = await axios.get(
      `${HEYGEN_BASE}/v1/video_status.get?video_id=${videoId}`,
      { headers, timeout: 30000 }
    );
    const status = resp.data?.data?.status;
    const videoUrl = resp.data?.data?.video_url;
    console.log(`[${i + 1}] Status: ${status} | videoUrl: ${videoUrl || "—"}`);
    if (status === "completed" && videoUrl) {
      return videoUrl;
    }
    if (status === "failed") {
      throw new Error(`HeyGen video failed: ${JSON.stringify(resp.data)}`);
    }
  }
  throw new Error("HeyGen video timed out after 10 minutes");
}

async function main() {
  console.log("=== HeyGen Photo Avatar Probe ===");
  console.log("Portrait:", MASTER_PORTRAIT_URL);

  // Step 0: Upload portrait to HeyGen asset storage
  let heygenImageUrl: string;
  try {
    heygenImageUrl = await uploadImageToHeyGen(MASTER_PORTRAIT_URL);
    console.log("HeyGen image URL:", heygenImageUrl);
  } catch (e: any) {
    console.error("Asset upload failed, trying direct URL:", e.message);
    heygenImageUrl = MASTER_PORTRAIT_URL;
  }

  // Step 1: Create photo avatar
  const avatarId = await createPhotoAvatar(heygenImageUrl);
  console.log("Avatar ID:", avatarId);

  // Step 2: Get audio URL
  const audioUrl = await getAudioUrl();

  // Step 3: Generate talking head video
  const videoId = await generateTalkingVideo(avatarId, audioUrl);
  console.log("Video ID:", videoId);

  // Step 4: Poll for completion
  const heygenVideoUrl = await pollVideoStatus(videoId);
  console.log("\n✅ HeyGen video URL:", heygenVideoUrl);

  // Step 5: Download and upload to S3
  console.log("\nDownloading and uploading to S3...");
  const videoResp = await axios.get(heygenVideoUrl, { responseType: "arraybuffer", timeout: 120000 });
  const videoBuf = Buffer.from(videoResp.data);
  const { url: s3Url } = await storagePut(
    `music-video-scenes/1140064-heygen-probe-${Date.now()}.mp4`,
    videoBuf,
    "video/mp4"
  );
  console.log("\n✅ S3 URL:", s3Url);

  // Update DB
  const mysql2 = await import("mysql2/promise");
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
  await conn.execute(
    `UPDATE musicVideoScenes SET lipSyncVideoUrl = ?, lipSyncProvider = 'heygen', status = 'lipsync_complete', updatedAt = NOW() WHERE id = 1140064`,
    [s3Url]
  );
  await conn.end();
  console.log("DB updated: lipSyncVideoUrl written to scene 1140064");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
