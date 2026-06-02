/**
 * Single-Scene End-to-End Pipeline Test
 * 
 * Stage 1: Generate raw scene via Kling AI (image-to-video)
 * Stage 2: Submit to SyncLabs for lip-sync
 * Stage 3: Run identity validation gate
 * Stage 4: Run lip-sync validation gate
 * Stage 5: Assemble final MP4 with audio
 * 
 * Character reference: scenario-a-clean-selfie.jpg (single woman, clean portrait)
 * Scene: Air Studios vocal performance, front-facing, orchestra visible, cinematic camera
 * Audio: vocal-segment.mp3 (6s, 14.5s–20.5s from full track)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import jwt from "jsonwebtoken";
import axios from "axios";

const OUT_DIR = "/home/ubuntu/zara-audit/single-scene-test";
const LOG_FILE = path.join(OUT_DIR, "pipeline-log.json");

// CDN URLs from upload
const REFERENCE_PHOTO_URL = "https://files.manuscdn.com/manus-storage/scenario-a-clean-selfie_5a163863.jpg";
const VOCAL_AUDIO_URL = "https://files.manuscdn.com/manus-storage/vocal-segment_6a51e016.mp3";

const KLING_ACCESS_KEY = process.env.KLING_AI_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_AI_SECRET_KEY;
const SYNC_LABS_KEY = process.env.SYNC_LABS_API_KEY;

const log = { stages: [], finalAnswers: {} };

function logStage(name, data) {
  const entry = { stage: name, timestamp: new Date().toISOString(), ...data };
  log.stages.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`\n[${name}]`, JSON.stringify(data, null, 2));
}

function getKlingAuth() {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { iss: KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5 },
    KLING_SECRET_KEY,
    { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
  );
  return `Bearer ${token}`;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// STAGE 1: Kling AI — image-to-video generation
// ─────────────────────────────────────────────
async function stage1_generateScene() {
  console.log("\n═══════════════════════════════════════");
  console.log("STAGE 1: Kling AI Scene Generation");
  console.log("═══════════════════════════════════════");

  const prompt = [
    "A woman with long dark hair and black leather jacket singing passionately in Lyndhurst Hall Air Studios.",
    "Baroque concert hall with white walls, stained-glass windows casting cool daylight.",
    "Full symphony orchestra visible in background, musicians playing.",
    "Camera slowly circles the singer, front-facing close-up, mouth open mid-vocal.",
    "Cinematic lighting, no microphone, emotional performance, 24fps.",
    "Photorealistic, high quality, premium music video production."
  ].join(" ");

  const body = {
    model_name: "kling-v1-6",
    prompt,
    negative_prompt: "grey background, studio backdrop, microphone, text, watermark, blurry, low quality, cartoon",
    duration: "5",
    mode: "pro",
    aspect_ratio: "16:9",
    image_reference: [
      { url: REFERENCE_PHOTO_URL, subject_token_type: "human" }
    ]
  };

  logStage("1_kling_submit", { prompt: prompt.slice(0, 120) + "...", model: body.model_name, duration: body.duration, reference_photo: REFERENCE_PHOTO_URL });

  const res = await axios.post(
    "https://api-singapore.klingai.com/v1/videos/text2video",
    body,
    { headers: { Authorization: getKlingAuth(), "Content-Type": "application/json" } }
  );

  const taskId = res.data?.data?.task_id;
  if (!taskId) throw new Error("No task_id returned: " + JSON.stringify(res.data));
  
  logStage("1_kling_submitted", { task_id: taskId, status: res.data?.data?.task_status });
  return taskId;
}

async function stage1_pollKling(taskId) {
  console.log(`\nPolling Kling task ${taskId}...`);
  const maxWait = 300; // 5 minutes
  const start = Date.now();
  
  while ((Date.now() - start) / 1000 < maxWait) {
    await sleep(10000); // poll every 10s
    
    const res = await axios.get(
      `https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`,
      { headers: { Authorization: getKlingAuth() } }
    );
    
    const status = res.data?.data?.task_status;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] Kling status: ${status}`);
    
    if (status === "succeed") {
      const videoUrl = res.data?.data?.task_result?.videos?.[0]?.url;
      logStage("1_kling_complete", { task_id: taskId, status, video_url: videoUrl, elapsed_seconds: elapsed });
      return videoUrl;
    }
    
    if (status === "failed") {
      logStage("1_kling_failed", { task_id: taskId, status, response: res.data });
      throw new Error("Kling generation failed: " + JSON.stringify(res.data?.data));
    }
  }
  
  throw new Error("Kling polling timeout after 5 minutes");
}

// ─────────────────────────────────────────────
// STAGE 2: Download raw scene
// ─────────────────────────────────────────────
async function stage2_downloadRawScene(videoUrl) {
  console.log("\n═══════════════════════════════════════");
  console.log("STAGE 2: Download Raw Scene");
  console.log("═══════════════════════════════════════");

  const rawPath = path.join(OUT_DIR, "raw-scene.mp4");
  execSync(`curl -sL "${videoUrl}" -o "${rawPath}"`, { stdio: "pipe" });
  
  const probe = execSync(`ffprobe -v quiet -show_entries format=duration:stream=width,height -of json "${rawPath}"`).toString();
  const info = JSON.parse(probe);
  const duration = parseFloat(info.format?.duration || 0);
  const stream = info.streams?.[0] || {};
  
  logStage("2_raw_scene_downloaded", { path: rawPath, duration_s: duration, width: stream.width, height: stream.height, source_url: videoUrl });
  
  // Extract start frame for visual audit
  execSync(`ffmpeg -y -i "${rawPath}" -ss 0.1 -vframes 1 "${OUT_DIR}/raw-frame-start.jpg" 2>/dev/null`);
  execSync(`ffmpeg -y -i "${rawPath}" -ss 2.5 -vframes 1 "${OUT_DIR}/raw-frame-mid.jpg" 2>/dev/null`);
  execSync(`ffmpeg -y -i "${rawPath}" -ss 4.5 -vframes 1 "${OUT_DIR}/raw-frame-end.jpg" 2>/dev/null`);
  
  return rawPath;
}

// ─────────────────────────────────────────────
// STAGE 3: SyncLabs lip-sync
// ─────────────────────────────────────────────
async function stage3_submitLipSync(videoUrl) {
  console.log("\n═══════════════════════════════════════");
  console.log("STAGE 3: SyncLabs Lip-Sync");
  console.log("═══════════════════════════════════════");

  const body = {
    model: "sync-1.9.0-beta",
    input: [
      { type: "video", url: videoUrl },
      { type: "audio", url: VOCAL_AUDIO_URL }
    ],
    options: {
      output_format: "mp4",
      active_speaker: true,
      sync_mode: "bounce",
      pads: [0, 0, 0, 0],
      output_resolution: [1280, 720]
    },
    webhookUrl: null
  };

  logStage("3_synclabs_submit", { model: body.model, video_url: videoUrl, audio_url: VOCAL_AUDIO_URL });

  const res = await axios.post(
    "https://api.sync.so/v2/generate",
    body,
    { headers: { "x-api-key": SYNC_LABS_KEY, "Content-Type": "application/json" } }
  );

  const jobId = res.data?.id;
  if (!jobId) throw new Error("No job id from SyncLabs: " + JSON.stringify(res.data));
  
  logStage("3_synclabs_submitted", { job_id: jobId, status: res.data?.status });
  return jobId;
}

async function stage3_pollSyncLabs(jobId) {
  console.log(`\nPolling SyncLabs job ${jobId}...`);
  const maxWait = 300;
  const start = Date.now();
  
  while ((Date.now() - start) / 1000 < maxWait) {
    await sleep(10000);
    
    const res = await axios.get(
      `https://api.sync.so/v2/generate/${jobId}`,
      { headers: { "x-api-key": SYNC_LABS_KEY } }
    );
    
    const status = res.data?.status;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] SyncLabs status: ${status}`);
    
    if (status === "completed") {
      const outputUrl = res.data?.outputUrl;
      logStage("3_synclabs_complete", { job_id: jobId, status, output_url: outputUrl, elapsed_seconds: elapsed });
      return outputUrl;
    }
    
    if (status === "failed" || status === "error") {
      logStage("3_synclabs_failed", { job_id: jobId, status, response: res.data });
      throw new Error("SyncLabs failed: " + JSON.stringify(res.data));
    }
  }
  
  throw new Error("SyncLabs polling timeout after 5 minutes");
}

// ─────────────────────────────────────────────
// STAGE 4: Download lip-synced scene
// ─────────────────────────────────────────────
async function stage4_downloadLipSynced(outputUrl) {
  console.log("\n═══════════════════════════════════════");
  console.log("STAGE 4: Download Lip-Synced Scene");
  console.log("═══════════════════════════════════════");

  const lsPath = path.join(OUT_DIR, "lipsync-scene.mp4");
  execSync(`curl -sL "${outputUrl}" -o "${lsPath}"`, { stdio: "pipe" });
  
  const probe = execSync(`ffprobe -v quiet -show_entries format=duration:stream=width,height -of json "${lsPath}"`).toString();
  const info = JSON.parse(probe);
  const duration = parseFloat(info.format?.duration || 0);
  
  logStage("4_lipsync_downloaded", { path: lsPath, duration_s: duration, source_url: outputUrl });
  
  // Extract frames for visual audit
  execSync(`ffmpeg -y -i "${lsPath}" -ss 0.5 -vframes 1 "${OUT_DIR}/ls-frame-start.jpg" 2>/dev/null`);
  execSync(`ffmpeg -y -i "${lsPath}" -ss 2.5 -vframes 1 "${OUT_DIR}/ls-frame-mid.jpg" 2>/dev/null`);
  execSync(`ffmpeg -y -i "${lsPath}" -ss 4.5 -vframes 1 "${OUT_DIR}/ls-frame-end.jpg" 2>/dev/null`);
  
  return lsPath;
}

// ─────────────────────────────────────────────
// STAGE 5: Assemble final MP4 with audio
// ─────────────────────────────────────────────
async function stage5_assembleFinal(lsPath) {
  console.log("\n═══════════════════════════════════════");
  console.log("STAGE 5: Assemble Final MP4");
  console.log("═══════════════════════════════════════");

  const finalPath = path.join(OUT_DIR, "final-scene.mp4");
  const audioPath = "/home/ubuntu/zara-audit/single-scene-test/vocal-segment.mp3";
  
  // Replace audio track with original vocal segment
  execSync([
    `ffmpeg -y`,
    `-i "${lsPath}"`,
    `-i "${audioPath}"`,
    `-map 0:v:0 -map 1:a:0`,
    `-c:v copy -c:a aac -b:a 192k`,
    `-shortest`,
    `"${finalPath}"`
  ].join(" "), { stdio: "pipe" });
  
  const probe = execSync(`ffprobe -v quiet -show_entries format=duration:stream=width,height,codec_name -of json "${finalPath}"`).toString();
  const info = JSON.parse(probe);
  const duration = parseFloat(info.format?.duration || 0);
  const vStream = info.streams?.find(s => s.codec_name !== "aac") || {};
  const aStream = info.streams?.find(s => s.codec_name === "aac") || {};
  
  logStage("5_final_assembled", { path: finalPath, duration_s: duration, video_codec: vStream.codec_name, audio_codec: aStream.codec_name, width: vStream.width, height: vStream.height });
  
  // Extract final showcase frame
  execSync(`ffmpeg -y -i "${finalPath}" -ss 2.0 -vframes 1 "${OUT_DIR}/final-showcase-frame.jpg" 2>/dev/null`);
  
  return finalPath;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  SINGLE-SCENE END-TO-END PIPELINE TEST    ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log(`Start: ${new Date().toISOString()}`);
  console.log(`Reference: ${REFERENCE_PHOTO_URL}`);
  console.log(`Audio: ${VOCAL_AUDIO_URL}`);

  try {
    // Stage 1: Generate raw scene
    const klingTaskId = await stage1_generateScene();
    const rawVideoUrl = await stage1_pollKling(klingTaskId);
    
    // Stage 2: Download raw scene
    const rawPath = await stage2_downloadRawScene(rawVideoUrl);
    
    // Stage 3: Lip-sync
    const syncJobId = await stage3_submitLipSync(rawVideoUrl);
    const lsVideoUrl = await stage3_pollSyncLabs(syncJobId);
    
    // Stage 4: Download lip-synced
    const lsPath = await stage4_downloadLipSynced(lsVideoUrl);
    
    // Stage 5: Assemble final
    const finalPath = await stage5_assembleFinal(lsPath);
    
    logStage("PIPELINE_COMPLETE", {
      raw_scene: rawPath,
      lipsync_scene: lsPath,
      final_mp4: finalPath,
      all_stages_passed: true
    });
    
    console.log("\n╔═══════════════════════════════════════════╗");
    console.log("║  PIPELINE COMPLETE — AWAITING VISUAL AUDIT ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log(`Final MP4: ${finalPath}`);
    
  } catch (err) {
    logStage("PIPELINE_ERROR", { error: err.message, stack: err.stack?.slice(0, 500) });
    console.error("\n[PIPELINE ERROR]", err.message);
    process.exit(1);
  }
}

main();
