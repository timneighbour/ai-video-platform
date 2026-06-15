/**
 * Gate 2 — Seedance Image-to-Video Generation
 * 
 * Uses Still 05 (god-ray backlit) as the first frame anchor.
 * Generates a 5-second performance clip with Zara already inside the baroque hall.
 * No compositing. No empty hall. No grey rectangle.
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
if (!WAVESPEED_API_KEY) throw new Error("WAVESPEED_API_KEY not set");

const STILL_05_CDN_URL = "https://wiz-ai.b-cdn.net/manus-storage/still-05_cd76408a.jpg";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/gate2-video";

const SEEDANCE_PROMPT = "A young woman with long straight jet-black hair and pale skin, wearing a black leather corset and black leather trench coat, performing emotionally inside a grand baroque concert hall with dramatic god-ray lighting streaming through tall arched windows, she is singing with intense emotional expression, eyes forward, head tilting slightly, mouth opening and closing as she sings, subtle breathing movement in chest, natural body sway, cinematic camera slowly pushing in toward her face, shallow depth of field, warm amber atmospheric lighting, orchestra audience silhouettes visible in background, film grain, photorealistic, Air Studios atmosphere, music video performance";

const NEGATIVE_PROMPT = "microphone, pop filter, mic stand, grey background, empty room, green screen, cartoon, static, frozen, no movement, fringe, bangs, second person, duplicate character, watermark, blurry face";

interface SeedanceSubmitResponse {
  id: string;
  status: string;
}

interface SeedanceResultResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  outputs?: Array<{ url: string }>;
  error?: string;
}

async function submitSeedanceI2V(): Promise<string> {
  console.log("[Gate2] Submitting Seedance image-to-video job...");
  console.log("[Gate2] First frame:", STILL_05_CDN_URL);
  
  const response = await axios.post(
    "https://api.wavespeed.ai/api/v3/wavespeed-ai/seedance-1-lite-i2v-480p",
    {
      image: STILL_05_CDN_URL,
      prompt: SEEDANCE_PROMPT,
      negative_prompt: NEGATIVE_PROMPT,
      duration: 5,
      seed: -1,
      enable_safety_checker: false,
    },
    {
      headers: {
        Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const jobId = response.data?.data?.id;
  if (!jobId) {
    console.error("Response:", JSON.stringify(response.data).slice(0, 500));
    throw new Error("No job ID returned from Seedance");
  }
  
  console.log("[Gate2] Job submitted. ID:", jobId);
  return jobId;
}

async function pollSeedanceJob(jobId: string): Promise<string> {
  console.log("[Gate2] Polling for job completion...");
  
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s intervals
    
    const response = await axios.get(
      `https://api.wavespeed.ai/api/v3/predictions/${jobId}`,
      {
        headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
      }
    );
    
    const status = response.data?.data?.status;
    const outputs = response.data?.data?.outputs;
    
    console.log(`[Gate2] Attempt ${attempt + 1}: status=${status}`);
    
    if (status === "completed" && outputs?.length > 0) {
      const videoUrl = outputs[0];
      console.log("[Gate2] Completed! Video URL:", videoUrl);
      return videoUrl;
    }
    
    if (status === "failed") {
      const error = response.data?.data?.error || "Unknown error";
      throw new Error(`Seedance job failed: ${error}`);
    }
  }
  
  throw new Error("Seedance job timed out after 10 minutes");
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log("[Gate2] Downloading video...");
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(outputPath, response.data);
  console.log("[Gate2] Saved to:", outputPath);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Submit job
  const jobId = await submitSeedanceI2V();
  
  // Save job ID for recovery
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "job-id.txt"),
    JSON.stringify({ jobId, submittedAt: new Date().toISOString(), stillUrl: STILL_05_CDN_URL }, null, 2)
  );
  
  // Poll for completion
  const videoUrl = await pollSeedanceJob(jobId);
  
  // Download video
  const outputPath = path.join(OUTPUT_DIR, "gate2-performance-clip.mp4");
  await downloadVideo(videoUrl, outputPath);
  
  // Save manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify({
      jobId,
      videoUrl,
      localPath: outputPath,
      firstFrameUrl: STILL_05_CDN_URL,
      prompt: SEEDANCE_PROMPT,
      completedAt: new Date().toISOString(),
    }, null, 2)
  );
  
  console.log("[Gate2] === COMPLETE ===");
  console.log("[Gate2] Video saved to:", outputPath);
  console.log("[Gate2] Video URL:", videoUrl);
}

main().catch(e => {
  console.error("[Gate2] FATAL:", e.message);
  process.exit(1);
});
