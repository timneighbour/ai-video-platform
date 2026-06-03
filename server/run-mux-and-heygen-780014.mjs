/**
 * run-mux-and-heygen-780014.mjs
 *
 * Scene 780014 (Job 870022) was rendered by Seedance i2v (no audio track).
 * HeyGen Precision v3 requires the input video to have an audio track.
 *
 * This script:
 * 1. Downloads the scene video (silent) and the original MP3 (6s window at t=6s)
 * 2. Muxes the audio into the video using ffmpeg
 * 3. Uploads the muxed video to S3
 * 4. Updates the scene's videoUrl to the muxed version
 * 5. Resets lipSyncStatus to 'pending' so the heartbeat re-submits to HeyGen
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SCENE_ID = 780014;
const JOB_ID = 870022;
const START_TIME = 6;    // seconds
const DURATION = 6;      // seconds

const VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/780014-1780433654995.mp4";
const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/benchmark/glass-on-the-water-1780418618919.mp3";

const WORK = tmpdir();
const videoPath = join(WORK, `scene-780014-silent.mp4`);
const audioPath = join(WORK, `scene-780014-audio.mp3`);
const muxedPath = join(WORK, `scene-780014-muxed.mp4`);

async function download(url, dest) {
  console.log(`  Downloading: ${url.slice(0, 80)}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${url}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const { writeFileSync } = await import("fs");
  writeFileSync(dest, buf);
  console.log(`  Saved: ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("Forge API not configured");

  const normalizedKey = relKey.replace(/^\/+/, "");
  const uploadUrl = new URL("v1/storage/upload", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  uploadUrl.searchParams.set("path", normalizedKey);

  const fileName = normalizedKey.split("/").pop() ?? normalizedKey;
  const blob = new Blob([data], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, fileName);

  const resp = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage upload failed (${resp.status}): ${msg.slice(0, 200)}`);
  }

  const result = await resp.json();
  return { key: normalizedKey, url: result.url };
}

async function main() {
  console.log(`=== Mux audio into Scene ${SCENE_ID} video (Job ${JOB_ID}) ===\n`);

  // 1. Download video and audio
  await download(VIDEO_URL, videoPath);
  await download(AUDIO_URL, audioPath);

  // 2. Cut 6s audio window at t=6s from the original MP3
  const audioCutPath = join(WORK, `scene-780014-audio-cut.mp3`);
  console.log(`\n  Cutting audio: t=${START_TIME}s, dur=${DURATION}s`);
  execSync(
    `ffmpeg -y -i "${audioPath}" -ss ${START_TIME} -t ${DURATION} -c:a libmp3lame -q:a 2 "${audioCutPath}" 2>/dev/null`,
    { timeout: 30000 }
  );
  const cutSize = readFileSync(audioCutPath).length;
  console.log(`  Audio cut: ${(cutSize / 1024).toFixed(0)} KB`);

  // 3. Mux audio into video
  console.log(`\n  Muxing audio into video...`);
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${audioCutPath}" -c:v copy -c:a aac -shortest "${muxedPath}" 2>/dev/null`,
    { timeout: 60000 }
  );
  const muxedBuf = readFileSync(muxedPath);
  console.log(`  Muxed video: ${(muxedBuf.length / 1024 / 1024).toFixed(2)} MB`);

  // 4. Upload muxed video to S3
  console.log(`\n  Uploading muxed video to S3...`);
  const key = `music-video-scenes/${SCENE_ID}-muxed-${Date.now()}.mp4`;
  const { url } = await storagePut(key, muxedBuf, "video/mp4");
  console.log(`  ✓ Uploaded: ${url.slice(0, 80)}...`);

  // 5. Update DB: set videoUrl to muxed version, reset lipSyncStatus to pending
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.execute(
    `UPDATE musicVideoScenes 
     SET videoUrl = ?, lipSyncStatus = 'pending', lipSyncTaskId = NULL, updatedAt = NOW()
     WHERE id = ?`,
    [url, SCENE_ID]
  );
  console.log(`\n  ✓ DB updated: videoUrl → muxed, lipSyncStatus → pending`);

  // Verify
  const [rows] = await conn.execute(
    "SELECT id, videoUrl, lipSyncStatus, lipSyncTaskId FROM musicVideoScenes WHERE id = ?",
    [SCENE_ID]
  );
  console.log("  Final state:", rows[0]);

  await conn.end();
  console.log("\n=== Done — heartbeat will re-submit to HeyGen on next tick ===");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
