/**
 * Create a preview of Scene 1 (probe) with the original audio mixed in at the correct timecode.
 * This lets Tim hear the lip sync in context.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DB_URL) throw new Error("DATABASE_URL not set");

const TMP = "/tmp/scene1-preview";
fs.mkdirSync(TMP, { recursive: true });

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`  Downloaded ${path.basename(dest)} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

async function uploadToS3(filePath, filename) {
  const baseUrl = FORGE_API_URL.endsWith("/") ? FORGE_API_URL : `${FORGE_API_URL}/`;
  // Use the storage put endpoint
  const uploadUrl = `${baseUrl}storage.v1.StorageService/UploadFile`;
  
  const fileBuffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "video/mp4" });
  formData.append("file", blob, filename);
  formData.append("path", `music-video-previews/${filename}`);
  
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${FORGE_API_KEY}` },
    body: formData,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text.slice(0, 200)}`);
  }
  
  const data = await res.json();
  return data.url || data.fileUrl || data.publicUrl;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  try {
    // Get Scene 1 data
    const [scenes] = await conn.query(
      "SELECT sceneIndex, startTime, duration, lipSyncVideoUrl, videoUrl FROM musicVideoScenes WHERE jobId = 660001 AND sceneIndex = 1"
    );
    const scene = scenes[0];
    
    // Get job audio URL
    const [jobs] = await conn.query(
      "SELECT audioUrl FROM musicVideoJobs WHERE id = 660001"
    );
    const job = jobs[0];
    
    console.log("Scene 1 data:", {
      startTime: scene.startTime,
      duration: scene.duration,
      hasLipSync: !!scene.lipSyncVideoUrl,
      hasVideo: !!scene.videoUrl
    });
    
    // Use lip sync video if available, otherwise raw video
    const videoUrl = scene.lipSyncVideoUrl || scene.videoUrl;
    if (!videoUrl) throw new Error("No video URL for Scene 1");
    if (!job.audioUrl) throw new Error("No audio URL for Job 660001");
    
    // startTime is in milliseconds
    const startSec = (scene.startTime || 0) / 1000;
    const durationSec = (scene.duration || 6000) / 1000;
    
    console.log(`\nScene 1: startTime=${startSec}s, duration=${durationSec}s`);
    
    // Download files
    console.log("\nDownloading files...");
    const videoPath = path.join(TMP, "scene1-lipsync.mp4");
    const audioPath = path.join(TMP, "original-audio.mp3");
    const outputPath = path.join(TMP, "scene1-preview-with-audio.mp4");
    
    await download(videoUrl, videoPath);
    await download(job.audioUrl, audioPath);
    
    // Get actual video duration
    const probeDuration = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`
    ).toString().trim();
    console.log(`\nVideo duration: ${probeDuration}s`);
    
    // Mix: overlay original audio at the correct timecode offset
    // The video shows seconds [startSec, startSec+duration] of the song
    // So we cut the audio from startSec and overlay it on the video
    console.log("\nMixing audio with video...");
    const cmd = [
      "ffmpeg -y",
      `-i "${videoPath}"`,
      `-ss ${startSec} -i "${audioPath}"`,
      `-c:v copy`,
      `-c:a aac -b:a 192k`,
      `-t ${probeDuration}`,
      `-map 0:v:0 -map 1:a:0`,
      `-shortest`,
      `"${outputPath}"`
    ].join(" ");
    
    console.log("Running:", cmd.slice(0, 120) + "...");
    execSync(cmd, { stdio: "pipe" });
    
    const outputSize = fs.statSync(outputPath).size;
    console.log(`\n✓ Preview created: ${(outputSize / 1024 / 1024).toFixed(1)} MB`);
    
    // Upload to CDN
    console.log("\nUploading preview to CDN...");
    const filename = `scene1-preview-with-audio-${Date.now()}.mp4`;
    
    // Try S3 upload, fall back to local file
    let previewUrl;
    try {
      previewUrl = await uploadToS3(outputPath, filename);
      console.log(`\n✓ Preview URL: ${previewUrl}`);
    } catch (uploadErr) {
      console.warn(`S3 upload failed: ${uploadErr.message}`);
      // Use manus-upload-file as fallback
      console.log("Trying manus-upload-file...");
      const { execSync: exec2 } = await import("child_process");
      const uploadResult = exec2(`manus-upload-file --webdev "${outputPath}"`).toString().trim();
      previewUrl = uploadResult.split("\n").find(l => l.startsWith("http")) || uploadResult;
      console.log(`\n✓ Preview URL: ${previewUrl}`);
    }
    
    console.log("\n=== SCENE 1 PREVIEW WITH AUDIO ===");
    console.log(previewUrl);
    console.log("===================================");
    
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
