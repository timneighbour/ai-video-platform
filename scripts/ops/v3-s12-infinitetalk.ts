/**
 * WIZ-SHOWCASE-001 — S12 WaveSpeed InfiniteTalk Submission
 *
 * S12 failed with SyncLabs at all temperature settings due to close-up framing
 * amplifying jaw movement. Switching to WaveSpeed InfiniteTalk which is the
 * canonical lip-sync engine for WIZ AI music videos and handles close-up
 * portraits with natural jaw control.
 *
 * Audio routing contract:
 *   - input.audio = isolated Demucs vocal stem (lip-sync driver only)
 *   - assembly    = original mastered full mix overlaid at final assembly
 *
 * Scene: S12 — Final chorus close-up (t=33.126s–38.168s)
 * Duration: 5.042s
 */

import {
  submitWaveSpeedInfiniteTalk,
  pollWaveSpeedInfiniteTalk,
} from "./server/ai-apis/wavespeed";
import { execSync } from "child_process";
import * as fs from "fs";

const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-infinitetalk";
const OUTPUT_PATH = `${OUTPUT_DIR}/s12-infinitetalk.mp4`;

// Zara portrait — CloudFront, confirmed accessible
const ZARA_PORTRAIT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778695377509.png";

// S12 vocal stem — manuscdn, confirmed Content-Type: audio/mpeg
const S12_VOCAL_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/KOjdJJvJOYDsGgNs.mp3";

function downloadDirect(url: string, dest: string): void {
  execSync(`curl -L -o "${dest}" "${url}" --max-time 120 --silent`);
  const size = fs.statSync(dest).size;
  if (size < 10000) throw new Error(`Download too small: ${size} bytes`);
  console.log(`Downloaded: ${dest} (${(size / 1024 / 1024).toFixed(1)}MB)`);
}

async function main() {
  console.log("=== S12 WaveSpeed InfiniteTalk Submission ===");
  console.log("Provider: WaveSpeed InfiniteTalk (portrait-driven lip-sync)");
  console.log("Portrait: Zara (CloudFront)");
  console.log("Audio: S12 vocal stem t=33.126s–38.168s (manuscdn, audio/mpeg)");
  console.log("Duration: 5.042s\n");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const taskId = await submitWaveSpeedInfiniteTalk({
    image: ZARA_PORTRAIT,
    audio: S12_VOCAL_URL,
    prompt:
      "Zara, a dark-haired female singer in a black leather jacket, performing the final chorus of a cinematic music video in a baroque concert hall with warm golden light. Close-up face shot. Intense, emotional vocal performance. Natural lip movement synchronized to vocals. No microphone.",
    duration: 6, // round up from 5.042s — InfiniteTalk accepts 5 or 10
    resolution: "720p",
  });

  console.log(`Task submitted: ${taskId}`);
  console.log("Polling for completion...");

  let attempts = 0;
  const maxAttempts = 120; // 10 minutes max
  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000));
    attempts++;

    const result = await pollWaveSpeedInfiniteTalk(taskId);
    const status = result.status;
    console.log(
      `[${attempts * 5}s] Status: ${status}`
    );

    if (status === "completed") {
      const outputUrl = result.outputs?.[0] || result.videoUrl || result.videoUrl;
      if (!outputUrl) {
        throw new Error(`Completed but no output URL: ${JSON.stringify(result)}`);
      }
      console.log(`\nS12 InfiniteTalk COMPLETE`);
      console.log(`Output URL: ${outputUrl}`);
      downloadDirect(outputUrl, OUTPUT_PATH);
      const size = fs.statSync(OUTPUT_PATH).size;
      console.log(`\nS12 InfiniteTalk saved: ${OUTPUT_PATH} (${(size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    if (status === "failed") {
      throw new Error(`InfiniteTalk job failed: ${result.error || JSON.stringify(result)}`);
    }
  }

  throw new Error("Timeout: InfiniteTalk job did not complete within 10 minutes");
}

main().catch(console.error);
