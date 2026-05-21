/**
 * Regenerate Scene 1 (6-12s) and Scene 3 (18-24s) 
 * Using the PROVEN tight-framing pipeline:
 * 1. fal.ai Flux Pro storyboard (tight face)
 * 2. WaveSpeed Seedance 2.0 (image-to-video)
 * 3. SyncLabs sync-3 lip sync
 */

import axios from "axios";
import { execSync } from "child_process";
import fs from "fs";
import { storagePut } from "../server/storage";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "../server/ai-apis/synclabs-lipsync";
import { submitWaveSpeedImageToVideo, pollWaveSpeedVideo } from "../server/ai-apis/wavespeed";

const FAL_API_KEY = process.env.FAL_AI_API_KEY!;
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY!;
const WORK_DIR = "/tmp/benchmark";

// Character: Zara - same as all approved clips
const CHARACTER_DESC = "Zara: slim white woman, long straight black hair, green eyes, black corset top, confident singer";

interface SceneConfig {
  sceneIndex: number;
  startSec: number;
  endSec: number;
  storyboardPrompt: string;
  motionPrompt: string;
}

const SCENES: SceneConfig[] = [
  {
    sceneIndex: 1,
    startSec: 6,
    endSec: 12,
    storyboardPrompt: `Extreme close-up portrait, chest-up composition, face fills 80% of frame. ${CHARACTER_DESC}. Face perfectly centered, looking directly at camera with emotional intensity, mouth slightly open as if beginning to sing. Warm amber studio lighting from the side, soft cinematic bokeh background of a grand recording studio. Clean jawline fully visible, no microphone, no obstructions, hair swept behind ears. Shallow depth of field, professional photography, 16:9 widescreen cinematic composition.`,
    motionPrompt: "Woman singing emotionally with subtle head movements, mouth opening and closing naturally, eyes maintaining direct contact with camera, gentle breathing motion, warm studio lighting creating soft shadows, stable locked camera, no zoom, cinematic performance"
  },
  {
    sceneIndex: 3,
    startSec: 18,
    endSec: 24,
    storyboardPrompt: `Extreme close-up portrait, chest-up composition, face fills 80% of frame. ${CHARACTER_DESC}. Passionate singing expression, eyes half-closed with deep emotion, mouth wide open mid-note. Dramatic warm amber lighting from below-left, golden highlights on cheekbones. Grand recording studio background blurred. Clean jawline, no microphone, no obstructions, hair flowing to sides. Shallow depth of field, professional photography, 16:9 widescreen cinematic composition.`,
    motionPrompt: "Woman singing passionately with eyes closing in emotion, mouth moving expressively, subtle swaying motion, warm golden lighting shifting gently, stable locked camera, no zoom, cinematic intimate performance"
  }
];

async function generateStoryboard(prompt: string): Promise<string> {
  console.log("  Generating storyboard with fal.ai Flux Pro...");
  const resp = await axios.post(
    "https://fal.run/fal-ai/flux-pro/v1.1",
    {
      prompt,
      image_size: { width: 1280, height: 720 },
      num_images: 1,
      enable_safety_checker: false,
    },
    {
      headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
      timeout: 120000,
    }
  );
  const imageUrl = resp.data.images[0].url;
  console.log("  Storyboard generated:", imageUrl.substring(0, 80));
  return imageUrl;
}

async function generateVideo(imageUrl: string, motionPrompt: string): Promise<string> {
  console.log("  Submitting to WaveSpeed Seedance 2.0 (full quality)...");
  const taskId = await submitWaveSpeedImageToVideo(
    {
      prompt: motionPrompt,
      image: imageUrl,
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    "bytedance/seedance-2.0/image-to-video"
  );
  console.log("  WaveSpeed task:", taskId);
  
  // Poll for completion
  let videoUrl = "";
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const result = await pollWaveSpeedVideo(taskId);
    if (result.status === "completed") {
      videoUrl = result.outputs?.[0] || result.video_url || "";
      break;
    } else if (result.status === "failed") {
      throw new Error(`WaveSpeed generation failed: ${result.error}`);
    }
    if (i % 3 === 0) console.log(`  WaveSpeed polling... (${i * 10}s, status: ${result.status})`);
  }
  
  if (!videoUrl) throw new Error("WaveSpeed timed out");
  console.log("  WaveSpeed completed:", videoUrl.substring(0, 80));
  return videoUrl;
}

async function processScene(scene: SceneConfig): Promise<{ storyboardUrl: string; waveSpeedUrl: string; finalClipUrl: string }> {
  const ts = Date.now();
  console.log(`\n=== Processing Scene ${scene.sceneIndex} (${scene.startSec}-${scene.endSec}s) ===`);
  
  // Step 1: Generate storyboard
  const storyboardUrl = await generateStoryboard(scene.storyboardPrompt);
  
  // Upload storyboard to S3
  const sbResp = await axios.get(storyboardUrl, { responseType: "arraybuffer", timeout: 30000 });
  const sbKey = `benchmark/storyboard-${scene.startSec}-${scene.endSec}-${ts}.png`;
  const { url: sbS3Url } = await storagePut(sbKey, Buffer.from(sbResp.data), "image/png");
  console.log("  Storyboard on S3:", sbS3Url);
  
  // Step 2: Generate video
  const videoUrl = await generateVideo(storyboardUrl, scene.motionPrompt);
  
  // Upload video to S3
  const vidResp = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 60000 });
  const vidKey = `benchmark/wavespeed-${scene.startSec}-${scene.endSec}-${ts}.mp4`;
  const { url: vidS3Url } = await storagePut(vidKey, Buffer.from(vidResp.data), "video/mp4");
  console.log("  WaveSpeed on S3:", vidS3Url);
  
  // Step 3: Extract audio segment
  const segmentPath = `${WORK_DIR}/segment-${scene.startSec}-${scene.endSec}.mp3`;
  execSync(`ffmpeg -y -i "${WORK_DIR}/full-mix.mp3" -ss ${scene.startSec} -t 6 -c copy "${segmentPath}"`, { timeout: 15000 });
  const audioBuf = fs.readFileSync(segmentPath);
  const audioKey = `benchmark/audio-${scene.startSec}-${scene.endSec}-${ts}.mp3`;
  const { url: audioS3Url } = await storagePut(audioKey, audioBuf, "audio/mpeg");
  console.log("  Audio on S3:", audioS3Url);
  
  // Step 4: SyncLabs lip sync
  console.log("  Submitting to SyncLabs...");
  const jobId = await submitSyncLabsLipSync({
    videoUrl: vidS3Url,
    audioUrl: audioS3Url,
    syncMode: "cut_off",
    temperature: 1.0,
    occlusionDetection: true,
    outputFileName: `benchmark-${scene.startSec}-${scene.endSec}-${ts}`,
  });
  console.log("  SyncLabs job:", jobId);
  
  const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
  console.log("  SyncLabs completed:", outputUrl.substring(0, 80));
  
  // Upload final
  const finalResp = await axios.get(outputUrl, { responseType: "arraybuffer", timeout: 60000 });
  const finalKey = `benchmark/lipsync-${scene.startSec}-${scene.endSec}-${ts}.mp4`;
  const { url: finalUrl } = await storagePut(finalKey, Buffer.from(finalResp.data), "video/mp4");
  console.log("  FINAL CLIP:", finalUrl);
  
  return { storyboardUrl: sbS3Url, waveSpeedUrl: vidS3Url, finalClipUrl: finalUrl };
}

async function main() {
  // Process Scene 1 first
  const result1 = await processScene(SCENES[0]);
  fs.writeFileSync(`${WORK_DIR}/results-6-12.json`, JSON.stringify({
    section: "6-12",
    ...result1,
    timestamp: new Date().toISOString(),
  }, null, 2));
  
  console.log("\n\n========================================");
  console.log("SCENE 1 (6-12s) COMPLETE:");
  console.log("  Final clip:", result1.finalClipUrl);
  console.log("========================================");
  
  // Process Scene 3
  const result3 = await processScene(SCENES[1]);
  fs.writeFileSync(`${WORK_DIR}/results-18-24.json`, JSON.stringify({
    section: "18-24",
    ...result3,
    timestamp: new Date().toISOString(),
  }, null, 2));
  
  console.log("\n\n========================================");
  console.log("SCENE 3 (18-24s) COMPLETE:");
  console.log("  Final clip:", result3.finalClipUrl);
  console.log("========================================");
  
  console.log("\n\nALL DONE. Both scenes regenerated.");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
