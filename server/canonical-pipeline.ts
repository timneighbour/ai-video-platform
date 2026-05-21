/**
 * Canonical Pipeline — based on Job 630002 success
 *
 * Proven conditions:
 * - WaveSpeed i2v: 960x960, rooftop golden-hour character, no mic, chest-up, face-forward
 * - SyncLabs sync-3: full mix audio (NOT isolated vocals), temp=1.0, occlusionDetection=true
 * - Assembly: strip SyncLabs audio, overlay original full mix
 *
 * Scene structure (71s total):
 *   S0  0–6s   performance (REUSE canonical lipsync-630001-1779173997099.mp4)
 *   S1  6–12s  cinematic   (from 660001)
 *   S2  12–18s performance (NEW render)
 *   S3  18–24s cinematic   (from 660001)
 *   S4  24–30s performance (NEW render)
 *   S5  30–36s cinematic   (from 660001)
 *   S6  36–42s performance (NEW render)
 *   S7  42–48s cinematic   (from 660001)
 *   S8  48–54s performance (NEW render)
 *   S9  54–60s cinematic   (from 660001)
 *   S10 60–71s cinematic   (from 660001)
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { generateWaveSpeedVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed-i2v";
import { submitSyncLabsJob, pollSyncLabsJob } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";

const WORK_DIR = "/tmp/canonical-pipeline";
fs.mkdirSync(WORK_DIR, { recursive: true });

const log = (msg: string) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
  fs.appendFileSync(`${WORK_DIR}/pipeline.log`, `[${ts}] ${msg}\n`);
};

// ─── Canonical assets ────────────────────────────────────────────────────────
const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";
const CANONICAL_S0_LIPSYNC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/lipsync-630001-1779173997099.mp4";
const CANONICAL_S0_RAW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630001-1779172682604.mp4";

// Cinematic scenes from job 660001 (keep untouched)
const CINEMATIC_SCENES: Record<number, string> = {
  1: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-0-16x9-1779244504125.mp4",
  3: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660003-1779235931604.mp4",
  5: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-4-16x9-1779244517785.mp4",
  7: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-6-16x9-1779244535307.mp4",
  9: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660009-1779235756466.mp4",
  10: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660011-1779235757413.mp4",
};

// Performance scene prompts — matching canonical S0 style exactly
// Dark wavy hair, black leather jacket, rooftop/golden-hour, no mic, chest-up, face-forward
const PERFORMANCE_PROMPTS: Record<number, string> = {
  2: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing passionately on a rooftop at golden hour. Chest-up framing, face filling most of the frame, face-forward orientation. Warm amber sunlight from behind, city skyline softly blurred in background. Mouth open, emotional performance, strong facial expression. No microphone. Stable camera, cinematic depth of field.",
  4: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing with eyes closed on a rooftop at golden hour. Chest-up framing, face filling most of the frame. Warm golden backlight creating a halo effect, city skyline in background. Lips parted in song, emotional and vulnerable expression. No microphone. Stable camera, cinematic.",
  6: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing powerfully on a rooftop at dusk. Chest-up framing, face-forward, face filling majority of frame. Deep amber and orange sky behind her, city lights beginning to glow. Mouth open wide in powerful vocal moment, intense emotional expression. No microphone. Stable camera, cinematic.",
  8: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing softly on a rooftop at golden hour. Chest-up framing, face-forward orientation, face filling most of the frame. Warm soft golden light, slight breeze in hair, city skyline blurred behind. Gentle emotional expression, lips forming words of song. No microphone. Stable camera, cinematic depth of field.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function downloadFile(url: string, dest: string): Promise<void> {
  execSync(`curl -sL "${url}" -o "${dest}"`, { timeout: 120000 });
}

async function renderPerformanceScene(sceneIndex: number): Promise<string> {
  log(`=== Rendering performance scene ${sceneIndex} ===`);
  const prompt = PERFORMANCE_PROMPTS[sceneIndex];
  
  // Use canonical S0 frame as reference image
  const refImagePath = `${WORK_DIR}/s0-frame.jpg`;
  if (!fs.existsSync(refImagePath)) {
    log("Downloading canonical reference frame...");
    await downloadFile(CANONICAL_S0_RAW, `${WORK_DIR}/s0-raw.mp4`);
    execSync(`ffmpeg -y -i "${WORK_DIR}/s0-raw.mp4" -ss 3 -vframes 1 "${refImagePath}" 2>/dev/null`);
  }
  
  // Upload reference image to S3 for WaveSpeed
  log(`Uploading reference image for scene ${sceneIndex}...`);
  const imgBuffer = fs.readFileSync(refImagePath);
  const { url: refImageUrl } = await storagePut(
    `music-video-canonical/ref-frame-${Date.now()}.jpg`,
    imgBuffer,
    "image/jpeg"
  );
  log(`Reference image URL: ${refImageUrl}`);
  
  // Generate with WaveSpeed — 960x960 matching canonical
  log(`Submitting to WaveSpeed (960x960)...`);
  const taskId = await generateWaveSpeedVideo({
    image: refImageUrl,
    prompt,
    duration: 6,
    resolution: "960*960",
  });
  log(`WaveSpeed task: ${taskId}`);
  
  const result = await pollWaveSpeedVideo(taskId);
  const videoUrl = (result as any).videoUrl || (result as any).url || result;
  log(`WaveSpeed done: ${videoUrl}`);
  
  return videoUrl as string;
}

async function applySyncLabs(videoUrl: string, sceneIndex: number, startMs: number): Promise<string> {
  log(`=== Applying SyncLabs to scene ${sceneIndex} (start=${startMs}ms) ===`);
  
  // Trim full mix audio to the scene window (6s)
  const audioSegment = `${WORK_DIR}/audio-s${sceneIndex}.mp3`;
  const startSec = startMs / 1000;
  execSync(`ffmpeg -y -i "${WORK_DIR}/full-mix.mp3" -ss ${startSec} -t 6 -ar 44100 -ac 2 "${audioSegment}" 2>/dev/null`);
  
  // Upload audio segment to S3
  const audioBuf = fs.readFileSync(audioSegment);
  const { url: audioUrl } = await storagePut(
    `music-video-canonical/audio-s${sceneIndex}-${Date.now()}.mp3`,
    audioBuf,
    "audio/mpeg"
  );
  log(`Audio segment URL: ${audioUrl}`);
  
  // Submit to SyncLabs sync-3 with full mix audio segment
  const jobId = await submitSyncLabsJob({
    videoUrl,
    audioUrl,
    model: "sync-3",
    temperature: 1.0,
    occlusionDetection: true,
  });
  log(`SyncLabs job: ${jobId}`);
  
  const lsResult = await pollSyncLabsJob(jobId);
  log(`SyncLabs done: ${lsResult}`);
  
  // Save to S3
  const lsBuffer = execSync(`curl -sL "${lsResult}"`) as Buffer;
  const { url: savedUrl } = await storagePut(
    `music-video-canonical/lipsync-s${sceneIndex}-${Date.now()}.mp4`,
    lsBuffer,
    "video/mp4"
  );
  log(`Saved lip sync: ${savedUrl}`);
  return savedUrl;
}

async function assembleVideo(
  sceneMap: Record<number, string>,
  audioUrl: string
): Promise<string> {
  log("=== Assembling final video ===");
  const assembleDir = `${WORK_DIR}/assemble`;
  fs.mkdirSync(assembleDir, { recursive: true });
  
  // Download all clips
  const clipPaths: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const url = sceneMap[i];
    if (!url) throw new Error(`Missing scene ${i}`);
    const dest = `${assembleDir}/clip-${i}.mp4`;
    log(`Downloading scene ${i}...`);
    await downloadFile(url, dest);
    clipPaths.push(dest);
  }
  
  // Normalize all clips to 1280x720 24fps
  log("Normalizing clips to 1280x720...");
  const normPaths: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const src = clipPaths[i];
    const dest = `${assembleDir}/norm-${i}.mp4`;
    // Scene 10 is 11s (60-71s), others are 6s
    const duration = i === 10 ? 11 : 6;
    execSync(
      `ffmpeg -y -i "${src}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 24 -t ${duration} -an -c:v libx264 -preset fast -crf 20 "${dest}" 2>/dev/null`
    );
    normPaths.push(dest);
  }
  
  // Concatenate
  log("Concatenating...");
  const concatList = `${assembleDir}/concat.txt`;
  fs.writeFileSync(concatList, normPaths.map(p => `file '${p}'`).join("\n"));
  const concatOut = `${assembleDir}/concat.mp4`;
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${concatOut}" 2>/dev/null`);
  
  // Add original full mix audio
  log("Adding full mix audio...");
  const finalPath = `${assembleDir}/final.mp4`;
  await downloadFile(audioUrl, `${assembleDir}/audio.mp3`);
  execSync(
    `ffmpeg -y -i "${concatOut}" -i "${assembleDir}/audio.mp3" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${finalPath}" 2>/dev/null`
  );
  
  // Upload to S3
  log("Uploading final video...");
  const finalBuf = fs.readFileSync(finalPath);
  const { url } = await storagePut(
    `music-videos/canonical-final-${Date.now()}.mp4`,
    finalBuf,
    "video/mp4"
  );
  log(`✅ FINAL VIDEO: ${url}`);
  return url;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  
  // Download full mix audio once
  log("Downloading full mix audio...");
  await downloadFile(AUDIO_URL, `${WORK_DIR}/full-mix.mp3`);
  log("Full mix downloaded");
  
  // Scene map: index → final URL to use in assembly
  const sceneMap: Record<number, string> = {};
  
  // S0: reuse canonical proven lip sync
  log("S0: Using canonical proven lip sync from job 630002");
  sceneMap[0] = CANONICAL_S0_LIPSYNC;
  
  // Cinematic scenes: reuse from 660001
  for (const [idx, url] of Object.entries(CINEMATIC_SCENES)) {
    sceneMap[Number(idx)] = url;
  }
  
  // Performance scenes 2, 4, 6, 8: render new + SyncLabs
  const performanceScenes = [2, 4, 6, 8];
  const startTimes: Record<number, number> = { 2: 12000, 4: 24000, 6: 36000, 8: 48000 };
  
  for (const idx of performanceScenes) {
    try {
      // Render new WaveSpeed clip
      const rawVideoUrl = await renderPerformanceScene(idx);
      
      // Apply SyncLabs with full mix audio
      const lsUrl = await applySyncLabs(rawVideoUrl, idx, startTimes[idx]);
      sceneMap[idx] = lsUrl;
      
      log(`✅ Scene ${idx} complete: ${lsUrl}`);
    } catch (err: any) {
      log(`❌ Scene ${idx} failed: ${err.message}`);
      throw err;
    }
  }
  
  // Assemble final video
  const finalUrl = await assembleVideo(sceneMap, AUDIO_URL);
  
  log("=== PIPELINE COMPLETE ===");
  log(`Final video: ${finalUrl}`);
  
  await conn.end();
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  console.error(e);
  process.exit(1);
});
