/**
 * Benchmark Clip Generator — ONE optimised 6-second performance clip
 * 
 * Section: 42–48s (chorus peak, strongest vocals at -15.9dB)
 * Character: Zara — rooftop golden hour, black leather jacket, NO microphone
 * Framing: TIGHT face close-up, face fills 80%+ of frame
 * Pipeline: WaveSpeed Seedance 2.0 (image-to-video) → SyncLabs sync-3
 * 
 * This script:
 * 1. Generates a new storyboard image with tighter face framing via fal.ai
 * 2. Generates a 5-second video clip via WaveSpeed image-to-video
 * 3. Extracts 42–48s audio segment from the full mix
 * 4. Runs SyncLabs sync-3 lip sync
 * 5. Uploads final clip to S3
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

// The proven storyboard image from the successful scene 630001
// We'll use this as the reference for the new tighter-framed image
const REFERENCE_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1779172420992.png";

async function generateStoryboardImage(): Promise<string> {
  console.log("[STEP 1] Generating tighter-framed storyboard image via fal.ai Flux Pro...");
  
  const FAL_API_KEY = process.env.FAL_AI_API_KEY;
  if (!FAL_API_KEY) throw new Error("FAL_AI_API_KEY not configured");

  const prompt = `Extreme tight close-up portrait of a beautiful woman singing passionately. Face fills 80% of the frame. Chest-up composition, face-dominant. Long straight black hair, dark brown eyes, black leather jacket. Golden hour rooftop setting, warm amber light illuminating her face from the side. City skyline completely blurred in background. Face-forward, looking directly at camera with emotional intensity. Mouth wide open singing, visible teeth, strong jaw movement, clean jawline clearly visible. No microphone, no obstructions near face. Photorealistic, cinematic lighting, shallow depth of field, 16:9 aspect ratio.`;

  // Use synchronous fal.run endpoint (not queue.fal.run) — returns result directly
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
  
  // Download and upload to our S3
  const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  const key = `benchmark/storyboard-tight-${Date.now()}.png`;
  const { url } = await storagePut(key, Buffer.from(imgResp.data), "image/png");
  console.log(`[STEP 1] Storyboard image uploaded: ${url}`);
  return url;
}

async function generateWaveSpeedClip(storyboardUrl: string): Promise<string> {
  console.log("[STEP 2] Generating WaveSpeed video clip with tight face framing...");
  
  const prompt = `Extreme tight close-up of a woman singing with deep passion and emotion. Face fills 80% of the frame, chest-up only. Long straight black hair, black leather jacket. Golden hour rooftop, warm amber light on face. Face-forward, direct eye contact with camera. Mouth opening and closing naturally as she sings, visible teeth when mouth opens, strong jaw movement, clean jawline. Slow subtle head movements, stable camera, NO camera orbit or movement. Emotional intensity in eyes. Photorealistic, cinematic, shallow depth of field. Slow motion feel, 76 BPM tempo. 16:9 aspect ratio.`;

  const taskId = await submitWaveSpeedImageToVideo(
    {
      prompt,
      image: storyboardUrl,
      aspect_ratio: "16:9",
      duration: 5,
      resolution: "720p",
    },
    "bytedance/seedance-2.0/image-to-video" // Use the full quality model, not fast
  );

  console.log(`[STEP 2] WaveSpeed task submitted: ${taskId}`);

  // Poll until complete
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

  if (!videoUrl) throw new Error("WaveSpeed timed out after 10 minutes");

  // Download and upload to our S3
  const vidResp = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 60000 });
  const key = `benchmark/wavespeed-tight-${Date.now()}.mp4`;
  const { url } = await storagePut(key, Buffer.from(vidResp.data), "video/mp4");
  console.log(`[STEP 2] WaveSpeed clip uploaded: ${url}`);
  return url;
}

async function extractAudioSegment(): Promise<string> {
  console.log("[STEP 3] Extracting 42–48s audio segment from full mix...");
  
  fs.mkdirSync(WORK_DIR, { recursive: true });
  const audioPath = path.join(WORK_DIR, "full-mix.mp3");
  const segmentPath = path.join(WORK_DIR, "segment-42-48.mp3");

  // Download full mix if not already present
  if (!fs.existsSync(audioPath)) {
    execSync(`curl -sL "${FULL_MIX_URL}" -o "${audioPath}"`, { timeout: 30000 });
  }

  // Extract 42-48s segment
  execSync(`ffmpeg -y -i "${audioPath}" -ss 42 -t 6 -c copy "${segmentPath}"`, { timeout: 15000 });
  console.log(`  Segment extracted: ${segmentPath} (${fs.statSync(segmentPath).size} bytes)`);

  // Upload to S3
  const buf = fs.readFileSync(segmentPath);
  const key = `benchmark/audio-42-48-${Date.now()}.mp3`;
  const { url } = await storagePut(key, buf, "audio/mpeg");
  console.log(`[STEP 3] Audio segment uploaded: ${url}`);
  return url;
}

async function runLipSync(videoUrl: string, audioUrl: string): Promise<string> {
  console.log("[STEP 4] Running SyncLabs sync-3 lip sync...");
  console.log(`  Video: ${videoUrl}`);
  console.log(`  Audio: ${audioUrl}`);

  const jobId = await submitSyncLabsLipSync({
    videoUrl,
    audioUrl,
    syncMode: "cut_off",
    temperature: 1.0,
    occlusionDetection: true,
    outputFileName: `benchmark-42-48-${Date.now()}`,
  });

  console.log(`[STEP 4] SyncLabs job submitted: ${jobId}`);

  // Poll until complete
  const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
  console.log(`[STEP 4] SyncLabs completed: ${outputUrl}`);

  // Download and upload to our S3
  const vidResp = await axios.get(outputUrl, { responseType: "arraybuffer", timeout: 60000 });
  const key = `benchmark/lipsync-42-48-${Date.now()}.mp4`;
  const { url } = await storagePut(key, Buffer.from(vidResp.data), "video/mp4");
  console.log(`[STEP 4] Final lip-synced clip uploaded: ${url}`);
  return url;
}

async function main() {
  console.log("=== BENCHMARK CLIP GENERATION ===");
  console.log("Section: 42–48s (chorus peak)");
  console.log("Optimisation: tight face framing for maximum perceived singing realism");
  console.log("");

  fs.mkdirSync(WORK_DIR, { recursive: true });

  // Step 1: Generate tighter-framed storyboard image
  const storyboardUrl = await generateStoryboardImage();

  // Step 2: Generate WaveSpeed video clip
  const waveSpeedUrl = await generateWaveSpeedClip(storyboardUrl);

  // Step 3: Extract audio segment
  const audioSegmentUrl = await extractAudioSegment();

  // Step 4: Run SyncLabs lip sync
  const finalClipUrl = await runLipSync(waveSpeedUrl, audioSegmentUrl);

  console.log("");
  console.log("=== BENCHMARK COMPLETE ===");
  console.log(`STORYBOARD: ${storyboardUrl}`);
  console.log(`RAW CLIP: ${waveSpeedUrl}`);
  console.log(`AUDIO SEGMENT: ${audioSegmentUrl}`);
  console.log(`FINAL LIP-SYNCED CLIP: ${finalClipUrl}`);
  
  // Save results
  fs.writeFileSync(path.join(WORK_DIR, "results.json"), JSON.stringify({
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
