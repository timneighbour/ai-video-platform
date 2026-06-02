/**
 * WIZ-SHOWCASE-001 Benchmark v3
 * Phase 2: Seedance image-to-video for all 4 performance scenes
 * Uses the production-tested submitWaveSpeedImageToVideo from wavespeed.ts
 */

import { submitWaveSpeedImageToVideo, pollWaveSpeedVideo } from "./server/ai-apis/wavespeed";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const CDN_BASE = "https://wiz-ai.b-cdn.net";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-seedance";

const scenes = [
  {
    id: "s03",
    label: "Scene 3 — Verse, medium shot",
    imageUrl: `${CDN_BASE}/manus-storage/s03_b3ee3a15.jpg`,
    prompt: "Female singer with long straight black hair performing with emotional intensity inside a baroque concert hall, god-ray light streaming through arched windows, orchestra audience in background, cinematic camera slowly pushing in, natural body movement, head tilting back on sustained note, no microphone, photorealistic music video",
  },
  {
    id: "s07",
    label: "Scene 7 — Chorus, medium shot, peak intensity",
    imageUrl: `${CDN_BASE}/manus-storage/s07_2b422773.jpg`,
    prompt: "Female singer with long straight black hair performing with peak emotional power inside a baroque concert hall, dramatic god-ray lighting, orchestra audience in background, cinematic camera movement, arms slightly raised, powerful sustained note, no microphone, photorealistic music video",
  },
  {
    id: "s09",
    label: "Scene 9 — Bridge, close-up",
    imageUrl: `${CDN_BASE}/manus-storage/s09_3cf99d90.jpg`,
    prompt: "Close-up of female singer with long straight black hair, emotional vulnerability, baroque hall windows softly blurred in background, warm amber bokeh, subtle head movement, eyes showing deep emotion, mouth opening on a note, no microphone, cinematic shallow depth of field music video close-up",
  },
  {
    id: "s12",
    label: "Scene 12 — Final chorus, close-up",
    imageUrl: `${CDN_BASE}/manus-storage/s12_25891937.jpg`,
    prompt: "Dramatic close-up of female singer with long straight black hair, god-ray halo behind her head, baroque hall, climactic final performance, maximum emotional intensity, eyes wide, mouth opening in powerful note, no microphone, cinematic music video close-up",
  },
];

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const jobIds: Record<string, string> = {};

  // Submit all 4 jobs
  for (const scene of scenes) {
    console.log(`\n[Phase 2] Submitting Seedance i2v for ${scene.id}: ${scene.label}`);
    const jobId = await submitWaveSpeedImageToVideo(
      {
        prompt: scene.prompt,
        image: scene.imageUrl,
        duration: 5,
        resolution: "720p",
        aspect_ratio: "16:9",
      },
      "bytedance/seedance-2.0-fast/image-to-video"
    );
    console.log(`  ✓ Job ID: ${jobId}`);
    jobIds[scene.id] = jobId;
    await new Promise(r => setTimeout(r, 1500));
  }

  fs.writeFileSync(`${OUTPUT_DIR}/jobs.json`, JSON.stringify(jobIds, null, 2));
  console.log(`\n✓ All 4 jobs submitted. Polling for results...`);

  // Poll all jobs sequentially
  const results: Record<string, string> = {};
  for (const scene of scenes) {
    const jobId = jobIds[scene.id];
    console.log(`\n[Phase 2] Polling ${scene.id} (${jobId})...`);
    
    let videoUrl: string | null = null;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 8000));
      const pollResult = await pollWaveSpeedVideo(jobId);
      console.log(`  Poll ${i + 1}: ${pollResult.status}`);
      if (pollResult.status === "completed" && pollResult.outputs?.[0]) {
        videoUrl = pollResult.outputs[0];
        break;
      }
      if (pollResult.status === "failed") {
        throw new Error(`Job ${jobId} failed for ${scene.id}`);
      }
    }

    if (!videoUrl) throw new Error(`Timeout for ${scene.id}`);
    console.log(`  ✓ Video URL: ${videoUrl}`);

    const localPath = `${OUTPUT_DIR}/${scene.id}.mp4`;
    await downloadFile(videoUrl, localPath);
    console.log(`  ✓ Downloaded: ${localPath}`);
    results[scene.id] = videoUrl;
  }

  fs.writeFileSync(`${OUTPUT_DIR}/results.json`, JSON.stringify(results, null, 2));
  console.log(`\n✓ All 4 Seedance clips complete.`);
}

main().catch(err => { console.error("FATAL:", err.message); process.exit(1); });
