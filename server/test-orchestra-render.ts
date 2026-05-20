/**
 * Test render: Intro scene (0-6s) with pianist and string players at 76 BPM feel.
 * 
 * - Pianist seen from a distance (no finger close-ups)
 * - String ensemble (violins, cello) playing slowly and gracefully
 * - 76 BPM tempo guidance in the prompt
 * - Zara's character reference image included for consistency
 * 
 * Run: npx tsx server/test-orchestra-render.ts
 */
import "dotenv/config";
import { submitWaveSpeedVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";
import { storagePut } from "./storage";
import * as fs from "fs";

const CHARACTER_IMAGE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778788874216.png";

const ORCHESTRA_INTRO_PROMPT = `Cinematic wide establishing shot. Inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Massive high-ceilinged room with warm amber and golden lighting. A pianist sits at a grand piano in the mid-ground, seen from behind at a distance — their body sways gently with slow, deliberate movements at 76 BPM tempo. To the side, a small string ensemble (two violinists and a cellist) draw their bows in long, slow, graceful arcs — unhurried, deeply emotional, matching a slow ballad tempo of 76 BPM. The musicians move together with gentle, flowing rhythm. Polished hardwood floors reflect warm light. Large arched windows with soft golden light streaming in. Dust motes float in the air. The atmosphere is intimate yet grand. No fast movements, everything is slow and measured. Camera holds steady with a very subtle push forward. Cinematic, atmospheric, 16:9.`;

async function main() {
  console.log("[Orchestra Test] Submitting to WaveSpeed...");
  console.log(`  Prompt: ${ORCHESTRA_INTRO_PROMPT.slice(0, 100)}...`);
  console.log(`  Character ref: ${CHARACTER_IMAGE_URL.slice(0, 60)}...`);
  console.log(`  Model: bytedance/seedance-2.0-fast/text-to-video`);
  console.log(`  Duration: 5s | Aspect: 16:9 | Resolution: 720p`);

  const taskId = await submitWaveSpeedVideo({
    prompt: ORCHESTRA_INTRO_PROMPT,
    aspect_ratio: "16:9",
    duration: 5,
    resolution: "720p",
    reference_images: [CHARACTER_IMAGE_URL],
  }, "bytedance/seedance-2.0-fast/text-to-video");

  console.log(`\n  ✅ WaveSpeed task submitted: ${taskId}`);
  console.log("\n[Orchestra Test] Polling for completion (2-4 minutes)...");

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 10000));
    const result = await pollWaveSpeedVideo(taskId);
    console.log(`  Status: ${result.status}`);

    if (result.status === "completed") {
      const videoUrl = result.video_url || result.outputs?.[0];
      if (!videoUrl) throw new Error("Completed but no video URL");
      console.log(`\n  ✅ WaveSpeed render complete!`);
      console.log(`  Video URL: ${videoUrl}`);

      // Download and re-upload to our CDN for permanent access
      const resp = await fetch(videoUrl);
      if (!resp.ok) throw new Error(`Failed to download: ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      const { url: cdnUrl } = await storagePut(
        `music-video-preview/orchestra-test-intro-${Date.now()}.mp4`,
        buf, "video/mp4"
      );
      console.log(`\n${"=".repeat(60)}`);
      console.log(`✅ ORCHESTRA TEST CLIP READY`);
      console.log(`URL: ${cdnUrl}`);
      console.log(`${"=".repeat(60)}`);
      console.log(`Intro scene | 0-6s | Pianist + strings at 76 BPM`);
      process.exit(0);
    }

    if (result.status === "failed") {
      throw new Error(`WaveSpeed render failed: ${result.error}`);
    }
  }

  throw new Error("WaveSpeed render timed out after 5 minutes");
}

main().catch(err => { console.error("FAILED:", err.message); process.exit(1); });
