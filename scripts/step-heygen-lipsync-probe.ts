/**
 * HeyGen v3 Lipsync Precision Probe
 * 
 * Uses the cropped Zara headshot (768×768) as a static video input,
 * submits to HeyGen v3 Lipsync Precision with the pre-trimmed vocal stem (18s–24s).
 * 
 * Flow:
 * 1. Download cropped headshot
 * 2. Create 6-second static video from headshot via ffmpeg
 * 3. Submit to HeyGen v3 Lipsync Precision (uploadAssetToHeyGen + submit job)
 * 4. Poll for completion
 * 5. Upload result to S3
 * 6. Write lipSyncVideoUrl to DB for scene 1140064
 */

import { execSync, execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import axios from "axios";
import { storagePut } from "../server/storage";
import { submitHeyGenLipSyncV3, waitForHeyGenLipSyncV3 } from "../server/ai-apis/heygen-lipsync";

const CROPPED_HEADSHOT_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/character-refs/900002/zara-headshot-768-crop-1782397167398.png";

const SCENE_AUDIO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/scene-audio/1140064-vocals-trimmed-18s-24s.mp3";

const TMP = tmpdir();
const HEADSHOT_PATH = join(TMP, "zara-headshot-probe.png");
const STATIC_VIDEO_PATH = join(TMP, "zara-static-6s.mp4");

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`Downloading: ${url.slice(0, 80)}...`);
  const resp = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  writeFileSync(dest, Buffer.from(resp.data));
  console.log(`Saved: ${dest} (${resp.data.byteLength} bytes)`);
}

function createStaticVideo(imagePath: string, outputPath: string, durationSecs: number): void {
  console.log(`\nCreating ${durationSecs}s static video from headshot...`);
  // Use ffmpeg to create a static video from the image
  // -loop 1: loop the image, -t: duration, -vf scale: ensure 1280x720, -r: 25fps
  const cmd = [
    "ffmpeg", "-y",
    "-loop", "1",
    "-i", imagePath,
    "-t", String(durationSecs),
    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-r", "25",
    outputPath
  ];
  execFileSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
  console.log(`Static video created: ${outputPath}`);
}

async function main() {
  console.log("=== HeyGen v3 Lipsync Precision Probe ===");
  console.log("Input: Cropped Zara headshot (768×768)");
  console.log("Audio: Pre-trimmed vocal stem 18s–24s");

  // Step 1: Download cropped headshot
  await downloadFile(CROPPED_HEADSHOT_URL, HEADSHOT_PATH);

  // Step 2: Create 6-second static video
  createStaticVideo(HEADSHOT_PATH, STATIC_VIDEO_PATH, 6);

  // Step 3: Upload static video to S3 (HeyGen lipsync client needs a URL, not a local path)
  console.log("\n=== Uploading static video to S3 ===");
  const videoBuffer = readFileSync(STATIC_VIDEO_PATH);
  console.log(`Static video: ${videoBuffer.length} bytes`);
  const { url: staticVideoS3Url } = await storagePut(
    `music-video-scenes/1140064-static-headshot-${Date.now()}.mp4`,
    videoBuffer,
    "video/mp4"
  );
  console.log("Static video S3 URL:", staticVideoS3Url);

  // Step 4: Submit to HeyGen v3 Lipsync Precision
  console.log("\n=== Submitting to HeyGen v3 Lipsync Precision ===");
  const lipsyncId = await submitHeyGenLipSyncV3({
    videoUrl: staticVideoS3Url,
    audioUrl: SCENE_AUDIO_URL,
    title: "Zara-Probe-1140064",
  });
  console.log("Lipsync job ID:", lipsyncId);

  // Step 5: Poll for completion
  console.log("\n=== Polling for completion ===");
  const job = await waitForHeyGenLipSyncV3(lipsyncId, 10000, 60);
  console.log("Job completed. Video URL:", job.videoUrl);

  if (!job.videoUrl) {
    throw new Error("HeyGen returned no video URL");
  }

  // Step 6: Download and upload to S3
  console.log("\n=== Uploading to S3 ===");
  const videoResp = await axios.get(job.videoUrl, { responseType: "arraybuffer", timeout: 120000 });
  const videoBuf = Buffer.from(videoResp.data);
  const { url: s3Url } = await storagePut(
    `music-video-scenes/1140064-heygen-lipsync-probe-${Date.now()}.mp4`,
    videoBuf,
    "video/mp4"
  );
  console.log("\n✅ S3 URL:", s3Url);

  // Step 7: Update DB
  const mysql2 = await import("mysql2/promise");
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
  await conn.execute(
    `UPDATE musicVideoScenes SET lipSyncVideoUrl = ?, lipSyncProvider = 'heygen', status = 'lipsync_complete', updatedAt = NOW() WHERE id = 1140064`,
    [s3Url]
  );
  await conn.end();
  console.log("✅ DB updated: lipSyncVideoUrl written to scene 1140064");
  console.log("\n=== PROBE COMPLETE ===");
  console.log("Share this URL with Tim:", s3Url);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  if (e.response?.data) console.error("API response:", JSON.stringify(e.response.data));
  process.exit(1);
});
