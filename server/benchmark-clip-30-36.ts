/**
 * Performance Clip #2 — 30–36s section (first vocal entry, -17.2dB)
 * 
 * EXACT same pipeline as the approved benchmark clip (42–48s):
 * - fal.ai Flux Pro v1.1 (synchronous, 1280x720)
 * - WaveSpeed Seedance 2.0 full quality (image-to-video)
 * - SyncLabs sync-3 (temp=1.0, occlusion=true, cut_off)
 * - Full mix audio segment
 * 
 * Same character: tight close-up, black leather jacket, golden hour rooftop, no mic
 */

import { submitWaveSpeedImageToVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";
import axios from "axios";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORK_DIR = "/tmp/benchmark";
const FULL_MIX_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";
const SECTION_START = 30;
const SECTION_END = 36;
const SECTION_LABEL = "30-36";

async function generateStoryboardImage(): Promise<string> {
  console.log(`[STEP 1] Generating storyboard image for ${SECTION_LABEL}s section...`);
  
  const FAL_API_KEY = process.env.FAL_AI_API_KEY;
  if (!FAL_API_KEY) throw new Error("FAL_AI_API_KEY not configured");

  // Same prompt structure as the approved benchmark — tight close-up, same character
  // Slight variation in emotion to differentiate from 42-48s (this is the first vocal entry, more vulnerable)
  const prompt = `Extreme tight close-up portrait of a beautiful woman beginning to sing with vulnerable emotion. Face fills 80% of the frame. Chest-up composition, face-dominant. Long straight black hair, dark brown eyes, black leather jacket. Golden hour rooftop setting, warm amber light illuminating her face from the side. City skyline completely blurred in background. Face-forward, looking directly at camera with emotional vulnerability transitioning to strength. Mouth open singing, visible teeth, strong jaw movement, clean jawline clearly visible. No microphone, no obstructions near face. Photorealistic, cinematic lighting, shallow depth of field, 16:9 aspect ratio.`;

  const response = await axios.post(
    "https://fal.run/fal-ai/flux-pro/v1.1",
    {
      prompt,
      image_size: { width: 1280, height: 720 },
      num_images: 1,
      enable_safety_checker: false,
      output_format: "png",
    },
    {
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    }
  );

  const imageUrl = response.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`No image URL in fal.ai response: ${JSON.stringify(response.data)}`);
  
  console.log(`[STEP 1] fal.ai image generated: ${imageUrl}`);
  
  const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  const key = `benchmark/storyboard-${SECTION_LABEL}-${Date.now()}.png`;
  const { url } = await storagePut(key, Buffer.from(imgResp.data), "image/png");
  console.log(`[STEP 1] Storyboard image uploaded: ${url}`);
  return url;
}

async function generateWaveSpeedClip(storyboardUrl: string): Promise<string> {
  console.log(`[STEP 2] Generating WaveSpeed clip for ${SECTION_LABEL}s...`);
  
  // Same motion prompt as approved benchmark
  const prompt = `Extreme tight close-up of a woman singing with deep emotion and vulnerability. Face fills 80% of the frame, chest-up only. Long straight black hair, black leather jacket. Golden hour rooftop, warm amber light on face. Face-forward, direct eye contact with camera. Mouth opening and closing naturally as she sings, visible teeth when mouth opens, strong jaw movement, clean jawline. Slow subtle head movements, stable camera, NO camera orbit or movement. Emotional intensity building in eyes. Photorealistic, cinematic, shallow depth of field. Slow motion feel, 76 BPM tempo. 16:9 aspect ratio.`;

  const taskId = await submitWaveSpeedImageToVideo(
    {
      prompt,
      image: storyboardUrl,
      aspect_ratio: "16:9",
      duration: 5,
      resolution: "720p",
    },
    "bytedance/seedance-2.0/image-to-video"
  );

  console.log(`[STEP 2] WaveSpeed task submitted: ${taskId}`);

  let videoUrl: string | null = null;
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const status = await pollWaveSpeedVideo(taskId);
    console.log(`  polling... (${i+1}/120) status: ${status.status}`);
    if (status.status === "completed") {
      videoUrl = status.video_url || status.outputs?.[0] || null;
      break;
    } else if (status.status === "failed") {
      throw new Error(`WaveSpeed failed: ${status.error}`);
    }
  }

  if (!videoUrl) throw new Error("WaveSpeed timed out");

  const vidResp = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 60000 });
  const key = `benchmark/wavespeed-${SECTION_LABEL}-${Date.now()}.mp4`;
  const { url } = await storagePut(key, Buffer.from(vidResp.data), "video/mp4");
  console.log(`[STEP 2] WaveSpeed clip uploaded: ${url}`);
  return url;
}

async function extractAudioSegment(): Promise<string> {
  console.log(`[STEP 3] Extracting ${SECTION_LABEL}s audio segment...`);
  
  fs.mkdirSync(WORK_DIR, { recursive: true });
  const audioPath = path.join(WORK_DIR, "full-mix.mp3");
  const segmentPath = path.join(WORK_DIR, `segment-${SECTION_LABEL}.mp3`);

  if (!fs.existsSync(audioPath)) {
    execSync(`curl -sL "${FULL_MIX_URL}" -o "${audioPath}"`, { timeout: 30000 });
  }

  execSync(`ffmpeg -y -i "${audioPath}" -ss ${SECTION_START} -t ${SECTION_END - SECTION_START} -c copy "${segmentPath}"`, { timeout: 15000 });
  console.log(`  Segment extracted: ${segmentPath} (${fs.statSync(segmentPath).size} bytes)`);

  const buf = fs.readFileSync(segmentPath);
  const key = `benchmark/audio-${SECTION_LABEL}-${Date.now()}.mp3`;
  const { url } = await storagePut(key, buf, "audio/mpeg");
  console.log(`[STEP 3] Audio segment uploaded: ${url}`);
  return url;
}

async function runLipSync(videoUrl: string, audioUrl: string): Promise<string> {
  console.log(`[STEP 4] Running SyncLabs sync-3 for ${SECTION_LABEL}s...`);

  const jobId = await submitSyncLabsLipSync({
    videoUrl,
    audioUrl,
    syncMode: "cut_off",
    temperature: 1.0,
    occlusionDetection: true,
    outputFileName: `benchmark-${SECTION_LABEL}-${Date.now()}`,
  });

  console.log(`[STEP 4] SyncLabs job: ${jobId}`);
  const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
  console.log(`[STEP 4] SyncLabs completed: ${outputUrl}`);

  const vidResp = await axios.get(outputUrl, { responseType: "arraybuffer", timeout: 60000 });
  const key = `benchmark/lipsync-${SECTION_LABEL}-${Date.now()}.mp4`;
  const { url } = await storagePut(key, Buffer.from(vidResp.data), "video/mp4");
  console.log(`[STEP 4] Final clip uploaded: ${url}`);
  return url;
}

async function main() {
  console.log(`=== PERFORMANCE CLIP #2: ${SECTION_LABEL}s ===`);
  fs.mkdirSync(WORK_DIR, { recursive: true });

  const storyboardUrl = await generateStoryboardImage();
  const waveSpeedUrl = await generateWaveSpeedClip(storyboardUrl);
  const audioSegmentUrl = await extractAudioSegment();
  const finalClipUrl = await runLipSync(waveSpeedUrl, audioSegmentUrl);

  console.log("");
  console.log("=== CLIP #2 COMPLETE ===");
  console.log(`STORYBOARD: ${storyboardUrl}`);
  console.log(`RAW CLIP: ${waveSpeedUrl}`);
  console.log(`AUDIO: ${audioSegmentUrl}`);
  console.log(`FINAL LIP-SYNCED: ${finalClipUrl}`);
  
  fs.writeFileSync(path.join(WORK_DIR, `results-${SECTION_LABEL}.json`), JSON.stringify({
    section: SECTION_LABEL,
    storyboardUrl,
    waveSpeedUrl,
    audioSegmentUrl,
    finalClipUrl,
    timestamp: new Date().toISOString(),
  }, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
