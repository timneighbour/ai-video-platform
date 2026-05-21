/**
 * Canonical Pipeline v2 — Exact reproduction of Job 630002 success
 *
 * FORENSICALLY CONFIRMED: job 630002 S0 used full mix segment (no isolated vocals)
 * because vocalsUrl=NULL, sceneAudioUrl=NULL, vocalStems=0 → heartbeat fallback path
 *
 * Pipeline:
 * 1. Reuse canonical S0 lip sync
 * 2. Render 4 new performance scenes (rooftop golden-hour, 1:1, face-forward, no mic)
 * 3. For each: cut 6s full mix segment at startTime → SyncLabs sync-3 (temp=1.0, occlusion=true)
 * 4. Assemble all 11 scenes + original full mix audio
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as fs from "fs";
import { execSync } from "child_process";
import { submitWaveSpeedImageToVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";

const WORK = "/tmp/canonical-v2";
fs.mkdirSync(WORK, { recursive: true });

const LOG = `${WORK}/pipeline.log`;
const log = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + "\n");
};

const FULL_MIX_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";
const CANONICAL_S0_LIPSYNC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/lipsync-630001-1779173997099.mp4";
const CANONICAL_S0_RAW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630001-1779172682604.mp4";

const CINEMATIC: Record<number, string> = {
  1: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-0-16x9-1779244504125.mp4",
  3: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660003-1779235931604.mp4",
  5: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-4-16x9-1779244517785.mp4",
  7: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-6-16x9-1779244535307.mp4",
  9: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660009-1779235756466.mp4",
  10: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660011-1779235757413.mp4",
};

const PERF_SCENES: Record<number, { startMs: number; prompt: string }> = {
  2: { startMs: 12000, prompt: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing passionately on a rooftop at golden hour. Chest-up framing, face filling most of the frame, face-forward orientation. Warm amber sunlight from behind, city skyline softly blurred in background. Mouth open, emotional performance, strong facial expression. No microphone. Stable camera, cinematic depth of field." },
  4: { startMs: 24000, prompt: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing with eyes closed on a rooftop at golden hour. Chest-up framing, face filling most of the frame. Warm golden backlight creating a halo effect, city skyline in background. Lips parted in song, emotional and vulnerable expression. No microphone. Stable camera, cinematic." },
  6: { startMs: 36000, prompt: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing powerfully on a rooftop at dusk. Chest-up framing, face-forward, face filling majority of frame. Deep amber and orange sky behind her, city lights beginning to glow. Mouth open wide in powerful vocal moment, intense emotional expression. No microphone. Stable camera, cinematic." },
  8: { startMs: 48000, prompt: "Medium close-up of a young woman with dark wavy hair, wearing a black leather jacket, singing softly on a rooftop at golden hour. Chest-up framing, face-forward orientation, face filling most of the frame. Warm soft golden light, slight breeze in hair, city skyline blurred behind. Gentle emotional expression, lips forming words of song. No microphone. Stable camera, cinematic depth of field." },
};

async function download(url: string, dest: string): Promise<void> {
  execSync(`curl -sL "${url}" -o "${dest}"`, { timeout: 120000 });
}

async function renderScene(idx: number): Promise<string> {
  log(`=== Rendering performance scene ${idx} ===`);
  const { prompt } = PERF_SCENES[idx];

  const refFrame = `${WORK}/ref-frame.jpg`;
  if (!fs.existsSync(refFrame)) {
    log("Downloading canonical reference clip...");
    await download(CANONICAL_S0_RAW, `${WORK}/s0-raw.mp4`);
    execSync(`ffmpeg -y -i "${WORK}/s0-raw.mp4" -ss 3 -vframes 1 "${refFrame}" 2>/dev/null`);
    log("Reference frame extracted");
  }

  const imgBuf = fs.readFileSync(refFrame);
  const { url: refUrl } = await storagePut(`music-video-canonical/ref-${Date.now()}.jpg`, imgBuf, "image/jpeg");
  log(`Reference image: ${refUrl}`);

  const taskId = await submitWaveSpeedImageToVideo(
    { image: refUrl, prompt, duration: 5, aspect_ratio: "1:1", resolution: "720p" },
    "bytedance/seedance-2.0-fast/image-to-video"
  );
  log(`WaveSpeed task: ${taskId}`);

  // Poll until completed (WaveSpeed is async — single poll returns pending)
  const POLL_INTERVAL = 15000; // 15s
  const MAX_WAIT = 20 * 60 * 1000; // 20 min
  const start = Date.now();
  let videoUrl: string | undefined;
  while (Date.now() - start < MAX_WAIT) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    const result = await pollWaveSpeedVideo(taskId);
    log(`Scene ${idx} poll: status=${result.status}`);
    if (result.status === "completed") {
      videoUrl = result.outputs?.[0] ?? result.video_url;
      break;
    }
    if (result.status === "failed") {
      throw new Error(`WaveSpeed scene ${idx} failed: ${result.error ?? "unknown"}`);
    }
  }
  if (!videoUrl) throw new Error(`WaveSpeed scene ${idx}: timed out after 20 min`);
  log(`WaveSpeed done: ${videoUrl}`);
  return videoUrl;
}

async function applySyncLabs(videoUrl: string, idx: number, startMs: number): Promise<string> {
  log(`=== SyncLabs scene ${idx} (start=${startMs}ms) ===`);

  const startSec = startMs / 1000;
  const audioSeg = `${WORK}/mix-seg-${idx}.mp3`;
  execSync(`ffmpeg -y -i "${WORK}/full-mix.mp3" -ss ${startSec} -t 6 -ar 44100 -ac 2 -c:a libmp3lame -q:a 2 "${audioSeg}" 2>/dev/null`);
  log(`Audio segment: ${startSec}s–${startSec + 6}s`);

  const audioBuf = fs.readFileSync(audioSeg);
  const { url: audioUrl } = await storagePut(`music-video-canonical/mix-seg-${idx}-${Date.now()}.mp3`, audioBuf, "audio/mpeg");
  log(`Audio uploaded: ${audioUrl}`);

  const jobId = await submitSyncLabsLipSync({ videoUrl, audioUrl, syncMode: "cut_off", outputFileName: `canonical-s${idx}-${Date.now()}`, temperature: 1.0, occlusionDetection: true });
  log(`SyncLabs job: ${jobId}`);

  const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
  log(`SyncLabs output: ${outputUrl}`);

  const lsResp = await fetch(outputUrl);
  const lsBuf = Buffer.from(await lsResp.arrayBuffer());
  const { url: savedUrl } = await storagePut(`music-video-canonical/lipsync-s${idx}-${Date.now()}.mp4`, lsBuf, "video/mp4");
  log(`Saved: ${savedUrl}`);
  return savedUrl;
}

async function assemble(sceneMap: Record<number, string>): Promise<string> {
  log("=== Assembling final video ===");
  const dir = `${WORK}/assemble`;
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i <= 10; i++) {
    const url = sceneMap[i];
    if (!url) throw new Error(`Missing scene ${i}`);
    log(`Downloading scene ${i}...`);
    await download(url, `${dir}/clip-${i}.mp4`);
  }

  log("Normalizing clips to 1280x720 24fps...");
  for (let i = 0; i <= 10; i++) {
    const dur = i === 10 ? 11 : 6;
    execSync(
      `ffmpeg -y -i "${dir}/clip-${i}.mp4" ` +
      `-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" ` +
      `-r 24 -t ${dur} -an -c:v libx264 -preset fast -crf 20 "${dir}/norm-${i}.mp4" 2>/dev/null`
    );
  }

  log("Concatenating...");
  const concatTxt = `${dir}/concat.txt`;
  fs.writeFileSync(concatTxt, Array.from({ length: 11 }, (_, i) => `file '${dir}/norm-${i}.mp4'`).join("\n"));
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c copy "${dir}/concat.mp4" 2>/dev/null`);

  log("Adding full mix audio...");
  execSync(`ffmpeg -y -i "${dir}/concat.mp4" -i "${WORK}/full-mix.mp3" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${dir}/final.mp4" 2>/dev/null`);

  log("Uploading final video...");
  const finalBuf = fs.readFileSync(`${dir}/final.mp4`);
  const { url } = await storagePut(`music-videos/canonical-v2-final-${Date.now()}.mp4`, finalBuf, "video/mp4");
  log(`✅ FINAL VIDEO: ${url}`);
  return url;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  log("Downloading full mix audio...");
  await download(FULL_MIX_URL, `${WORK}/full-mix.mp3`);
  log("Full mix ready");

  const sceneMap: Record<number, string> = {};
  sceneMap[0] = CANONICAL_S0_LIPSYNC;
  for (const [idx, url] of Object.entries(CINEMATIC)) sceneMap[Number(idx)] = url;

  for (const idx of [2, 4, 6, 8]) {
    const { startMs } = PERF_SCENES[idx];
    log(`\n--- Performance scene ${idx} ---`);
    const rawUrl = await renderScene(idx);
    const lsUrl = await applySyncLabs(rawUrl, idx, startMs);
    sceneMap[idx] = lsUrl;
    log(`Scene ${idx} complete: ${lsUrl}`);
  }

  const finalUrl = await assemble(sceneMap);
  log("=== PIPELINE COMPLETE ===");
  console.log(`\n✅ FINAL VIDEO URL:\n${finalUrl}\n`);

  await conn.end();
}

main().catch(e => { log(`FATAL: ${e.message}\n${e.stack}`); process.exit(1); });
