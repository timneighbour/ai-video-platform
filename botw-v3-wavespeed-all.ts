/**
 * BOTW V3 — Full vocal scene regeneration via WaveSpeed Seedance 2.0 image-to-video
 * + S10 orchestral generation via WaveSpeed text-to-video
 * 
 * Architecture: ENG-001 Character-Preparation Pipeline
 * - Each vocal scene uses a scene-aware reference (character already in concert hall)
 * - No grey backgrounds, face 40-50% of frame, correct environment from frame 1
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Pre-load scene-aware reference as base64 data URI
// This avoids CDN 403 errors when WaveSpeed tries to fetch the image
const REF_IMAGE_PATH = "/home/ubuntu/zara-audit/zara-scene-ref-s03.png";
const REF_BASE64 = fs.readFileSync(REF_IMAGE_PATH).toString("base64");
const REF_DATA_URI = `data:image/png;base64,${REF_BASE64}`;

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY!;
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-wavespeed";
const LOG_FILE = "/tmp/botw-v3-wavespeed.log";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

async function wavespeedI2V(params: {
  imageUrl: string;
  prompt: string;
  duration: number;
  sceneId: string;
}): Promise<string> {
  const res = await fetch("https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: params.imageUrl,
      prompt: params.prompt,
      duration: params.duration,
      resolution: "720p",
      aspect_ratio: "16:9",
    }),
  });
  const data = await res.json() as any;
  if (data.code !== 200) throw new Error(`WaveSpeed error: ${JSON.stringify(data)}`);
  const jobId = data.data.id;
  const pollUrl = data.data.urls.get;
  log(`${params.sceneId}: submitted → jobId=${jobId}`);
  return pollUrl;
}

async function wavespeedT2V(params: {
  prompt: string;
  duration: number;
  sceneId: string;
}): Promise<string> {
  const res = await fetch("https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      duration: params.duration,
      resolution: "720p",
      aspect_ratio: "16:9",
    }),
  });
  const data = await res.json() as any;
  if (data.code !== 200) throw new Error(`WaveSpeed T2V error: ${JSON.stringify(data)}`);
  const jobId = data.data.id;
  const pollUrl = data.data.urls.get;
  log(`${params.sceneId}: submitted T2V → jobId=${jobId}`);
  return pollUrl;
}

async function pollUntilDone(pollUrl: string, sceneId: string, maxWaitMs = 600000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 15000));
    const res = await fetch(pollUrl, {
      headers: { "Authorization": `Bearer ${WAVESPEED_API_KEY}` },
    });
    const data = await res.json() as any;
    const status = data.data?.status || data.status;
    log(`${sceneId}: status=${status} elapsed=${Math.round((Date.now()-start)/1000)}s`);
    if (status === "completed" || status === "succeeded") {
      const outputs = data.data?.outputs || [];
      const url = outputs[0]?.url || outputs[0];
      if (!url) throw new Error(`${sceneId}: completed but no output URL`);
      log(`${sceneId}: DONE → ${url}`);
      return url;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`${sceneId}: FAILED → ${JSON.stringify(data)}`);
    }
  }
  throw new Error(`${sceneId}: TIMEOUT after ${maxWaitMs/1000}s`);
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  log(`Downloaded ${path.basename(outputPath)} (${size}MB)`);
}

// ============================================================
// Scene-aware reference URLs (already uploaded to CDN)
// S03 reference: concert hall, front-facing
// For S05-S11 we'll use the same base reference but with different prompts
// The scene-aware reference was uploaded earlier
// ============================================================

// Using base64 data URI instead of CDN URL (WaveSpeed blocks non-browser CDN requests)
const SCENE_REF_URL = REF_DATA_URI;

// Vocal scene definitions with scene-aware prompts
const VOCAL_SCENES = [
  {
    id: "s03",
    refUrl: SCENE_REF_URL,
    prompt: "Young woman with long straight black hair, black leather jacket and corset, singing with mouth open, front-facing, head and shoulders framing, inside baroque concert hall with warm amber golden lighting, orchestra musicians visible and blurred behind her, ornate gilded walls, chandelier light, shallow depth of field, cinematic music video, intimate emotional performance, slight head movement, 4K quality",
    duration: 5,
  },
  {
    id: "s05",
    refUrl: SCENE_REF_URL,
    prompt: "Young woman with long straight black hair, black leather jacket and corset, singing with mouth open, 3/4 profile angle facing slightly left, head and shoulders framing, inside baroque concert hall with warm amber golden lighting, orchestra musicians visible behind her in soft focus, ornate gilded walls with wall sconces, cinematic music video, pre-chorus emotional build, subtle hair movement, 4K quality",
    duration: 5,
  },
  {
    id: "s07",
    refUrl: SCENE_REF_URL,
    prompt: "Young woman with long straight black hair, black leather jacket and corset, singing powerfully with wide open mouth, side profile or slight 3/4 angle, head and shoulders framing, inside baroque concert hall with warm amber golden lighting, orchestra musicians visible behind her, cinematic tracking motion, chorus hero shot, hair flowing slightly, powerful emotional delivery, 4K quality",
    duration: 5,
  },
  {
    id: "s09",
    refUrl: SCENE_REF_URL,
    prompt: "Young woman with long straight black hair, black leather jacket and corset, singing with chin slightly raised, near-front angle, head and shoulders framing, inside baroque concert hall with warm amber golden lighting, full orchestra visible behind her on both sides, elevated emotional bridge performance, golden chandelier light from above, cinematic music video, 4K quality",
    duration: 5,
  },
  {
    id: "s11",
    refUrl: SCENE_REF_URL,
    prompt: "Young woman with long straight black hair, black leather jacket and corset, singing intimately with slight 3/4 turn toward camera, close-up head and shoulders framing with face filling 50% of frame, inside baroque concert hall with warm amber golden lighting, orchestra depth visible behind her in soft focus, final vocal moment before resolution, shallow depth of field, emotional close-up, cinematic music video, 4K quality",
    duration: 5,
  },
];

// S10 orchestral — text-to-video, no character reference needed
const S10_ORCHESTRAL = {
  id: "s10",
  prompt: "Full symphony orchestra performing in a grand baroque concert hall, wide establishing shot, warm amber golden lighting, ornate gilded walls and high ceilings, musicians playing strings and brass instruments, conductor leading, audience in background, cinematic camera slowly pushing in from wide to medium, Air Studios atmosphere, 4K quality, no visible looping, continuous fluid motion throughout",
  duration: 8,
};

async function main() {
  fs.writeFileSync(LOG_FILE, "");
  log("=== BOTW V3 WaveSpeed Generation Started ===");
  log(`Vocal scenes: ${VOCAL_SCENES.map(s => s.id).join(", ")}`);
  log(`S10 orchestral: text-to-video, 8s`);

  // Submit all jobs in parallel
  log("Submitting all jobs in parallel...");
  
  const vocalPollUrls: Record<string, string> = {};
  let s10PollUrl = "";

  // Submit vocal scenes
  for (const scene of VOCAL_SCENES) {
    try {
      const pollUrl = await wavespeedI2V({
        imageUrl: scene.refUrl,
        prompt: scene.prompt,
        duration: scene.duration,
        sceneId: scene.id,
      });
      vocalPollUrls[scene.id] = pollUrl;
    } catch (err) {
      log(`${scene.id}: SUBMISSION FAILED → ${err}`);
    }
    await new Promise(r => setTimeout(r, 1000)); // 1s between submissions
  }

  // Submit S10 orchestral
  try {
    s10PollUrl = await wavespeedT2V({
      prompt: S10_ORCHESTRAL.prompt,
      duration: S10_ORCHESTRAL.duration,
      sceneId: S10_ORCHESTRAL.id,
    });
  } catch (err) {
    log(`s10: SUBMISSION FAILED → ${err}`);
  }

  // Save job IDs for reference
  const jobData = { vocalPollUrls, s10PollUrl, submittedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(OUTPUT_DIR, "job-urls.json"), JSON.stringify(jobData, null, 2));
  log("All jobs submitted. Polling for completion...");

  // Poll all vocal scenes in parallel
  const vocalPromises = Object.entries(vocalPollUrls).map(async ([sceneId, pollUrl]) => {
    try {
      const videoUrl = await pollUntilDone(pollUrl, sceneId);
      const outputPath = path.join(OUTPUT_DIR, `${sceneId}-wavespeed.mp4`);
      await downloadVideo(videoUrl, outputPath);
      return { sceneId, success: true, path: outputPath };
    } catch (err) {
      log(`${sceneId}: ERROR → ${err}`);
      return { sceneId, success: false, error: String(err) };
    }
  });

  // Poll S10
  const s10Promise = s10PollUrl ? (async () => {
    try {
      const videoUrl = await pollUntilDone(s10PollUrl, "s10");
      const outputPath = path.join(OUTPUT_DIR, "s10-orchestral-wavespeed.mp4");
      await downloadVideo(videoUrl, outputPath);
      return { sceneId: "s10", success: true, path: outputPath };
    } catch (err) {
      log(`s10: ERROR → ${err}`);
      return { sceneId: "s10", success: false, error: String(err) };
    }
  })() : Promise.resolve({ sceneId: "s10", success: false, error: "Not submitted" });

  const results = await Promise.all([...vocalPromises, s10Promise]);
  
  log("=== Generation Complete ===");
  results.forEach(r => {
    if (r.success) {
      log(`✓ ${r.sceneId}: ${r.path}`);
    } else {
      log(`✗ ${r.sceneId}: FAILED`);
    }
  });

  const summary = {
    completed: results.filter(r => r.success).map(r => r.sceneId),
    failed: results.filter(r => !r.success).map(r => r.sceneId),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, "results.json"), JSON.stringify(summary, null, 2));
  log(`Summary: ${summary.completed.length} completed, ${summary.failed.length} failed`);
}

main().catch(err => {
  log(`FATAL: ${err}`);
  process.exit(1);
});
