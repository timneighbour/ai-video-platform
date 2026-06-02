/**
 * Gate 2 — Seedance 1.5 Pro Image-to-Video
 * 
 * Uses Still 05 (god-ray backlit) as the first frame anchor.
 * Generates a 5-second performance clip with Zara already inside the baroque hall.
 * No compositing. No empty hall. No grey rectangle.
 */

import { fal } from "@fal-ai/client";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const FAL_API_KEY = process.env.FAL_AI_API_KEY;
if (!FAL_API_KEY) throw new Error("FAL_AI_API_KEY not set");

fal.config({ credentials: FAL_API_KEY });

const STILL_05_CDN_URL = "https://wiz-ai.b-cdn.net/manus-storage/still-05_cd76408a.jpg";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/gate2-video";

const PROMPT = "A young woman with long straight jet-black hair and pale skin, wearing a black leather corset and black leather trench coat, performing emotionally inside a grand baroque concert hall with dramatic god-ray lighting streaming through tall arched windows, she is singing with intense emotional expression, eyes forward, head tilting slightly, mouth opening and closing as she sings, subtle breathing movement in chest, natural body sway, cinematic camera slowly pushing in toward her face, shallow depth of field, warm amber atmospheric lighting, orchestra audience silhouettes visible in background, film grain, photorealistic, Air Studios atmosphere, music video performance, no microphone";

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  console.log("[Gate2] Submitting Seedance 1.5 Pro image-to-video job...");
  console.log("[Gate2] First frame (Still 05):", STILL_05_CDN_URL);
  console.log("[Gate2] This may take 60-180 seconds...");
  
  const result = await fal.subscribe("bytedance/seedance/v1.5/pro/image-to-video", {
    input: {
      prompt: PROMPT,
      image_url: STILL_05_CDN_URL,
      duration: 5,
      aspect_ratio: "9:16",  // Portrait for close-up performance
    },
    logs: true,
    pollInterval: 5000,
    onQueueUpdate: (update) => {
      console.log("[Gate2] Status:", update.status);
    },
  }) as any;
  
  const videoUrl = result.data?.video?.url;
  if (!videoUrl) {
    console.error("Full result:", JSON.stringify(result).slice(0, 500));
    throw new Error("No video URL in Seedance response");
  }
  
  console.log("[Gate2] Video generated:", videoUrl);
  
  // Download video
  const outputPath = path.join(OUTPUT_DIR, "gate2-performance-clip.mp4");
  const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(outputPath, response.data);
  console.log("[Gate2] Saved to:", outputPath);
  
  // Save manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify({
      videoUrl,
      localPath: outputPath,
      firstFrameUrl: STILL_05_CDN_URL,
      prompt: PROMPT,
      completedAt: new Date().toISOString(),
    }, null, 2)
  );
  
  console.log("[Gate2] === COMPLETE ===");
  console.log("[Gate2] Video URL:", videoUrl);
  console.log("[Gate2] Local path:", outputPath);
}

main().catch(e => {
  console.error("[Gate2] FATAL:", e.message);
  if (e.body) console.error("[Gate2] Body:", JSON.stringify(e.body).slice(0, 500));
  process.exit(1);
});
