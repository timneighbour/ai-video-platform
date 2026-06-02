import * as fs from "fs";
import * as path from "path";
import axios from "axios";

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY!;
const BASE_URL = "https://api.wavespeed.ai/api/v3";
const MODEL = "bytedance/seedance-2.0/image-to-video";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-wavespeed-v3";
const LOG_FILE = "/tmp/botw-v3-wavespeed-v3.log";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// Scene definitions with dedicated angle references
const scenes = [
  {
    id: "s03",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s03-ref-front.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. She faces directly toward the camera, front-facing emotional performance, mouth open singing, subtle head movement and hair movement. Warm amber golden lighting, full orchestra in soft focus behind her, ornate gilded walls. Cinematic music video, shallow depth of field, intimate performance energy.",
  },
  {
    id: "s05",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s05-ref-3quarter.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. She is at a 3/4 profile angle facing left, chin slightly raised, mouth open singing. Orchestra musicians visible behind her on the right in soft focus. Warm amber golden lighting, ornate gilded walls. Cinematic music video, shallow depth of field.",
  },
  {
    id: "s07",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s07-ref-side.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. Side profile angle, she looks slightly forward, mouth wide open in a powerful chorus hero moment, hair moves with the performance energy. Orchestra conductor and musicians visible behind her. Warm amber golden lighting, gilded columns. Cinematic music video, dynamic energy.",
  },
  {
    id: "s09",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s09-ref-elevated.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. Camera positioned below looking upward, she gazes upward with chin raised, mouth open in an emotional bridge performance. Painted baroque ceiling visible above, full orchestra on both sides below in soft focus. Warm amber golden lighting. Cinematic music video, elevated dramatic angle.",
  },
  {
    id: "s11",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s11-ref-intimate.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. Intimate close-up, slight 3/4 turn toward camera, strong emotional eye contact, mouth slightly open in a tender final vocal moment. Orchestra depth visible in very soft focus behind her. Warm amber golden lighting. Cinematic music video, extremely shallow depth of field, intimate emotional close-up.",
  },
];

async function submitJob(scene: typeof scenes[0]): Promise<string> {
  // Read image as base64 data URI
  const imgBuffer = fs.readFileSync(scene.refPath);
  const base64 = imgBuffer.toString("base64");
  const mimeType = scene.refPath.endsWith(".png") ? "image/png" : "image/jpeg";
  const dataUri = `data:${mimeType};base64,${base64}`;

  const body = {
    prompt: scene.prompt,
    image: dataUri,
    duration: 5,
    size: "1280x720",
  };

  const response = await axios.post(
    `${BASE_URL}/${MODEL}`,
    body,
    {
      headers: {
        Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  const data = response.data;
  // Check for API-level error
  if (data?.code && data.code !== 200) {
    throw new Error(`API error for ${scene.id}: code=${data.code} message=${data.message}`);
  }

  // v3 envelope: { code, message, data: { id, status, ... } }
  const inner = data?.data ?? data;
  const jobId = inner?.id;
  if (!jobId) {
    throw new Error(`No job ID returned for ${scene.id}: ${JSON.stringify(data)}`);
  }

  log(`[${scene.id}] Submitted: jobId=${jobId} status=${inner?.status}`);
  return jobId;
}

async function pollJob(scene: typeof scenes[0], jobId: string): Promise<string> {
  const maxAttempts = 80;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 15000));

    const response = await axios.get(
      `${BASE_URL}/predictions/${jobId}/result`,
      {
        headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
        timeout: 30000,
      }
    );

    const data = response.data;
    const inner = data?.data ?? data;
    const status = inner?.status;
    log(`[${scene.id}] Poll ${i + 1}: status=${status}`);

    if (status === "completed" || status === "succeeded") {
      const videoUrl = inner?.outputs?.[0] || inner?.output?.[0];
      if (!videoUrl) throw new Error(`No output URL for ${scene.id}: ${JSON.stringify(inner)}`);
      log(`[${scene.id}] COMPLETED: ${videoUrl}`);
      return videoUrl;
    }

    if (status === "failed" || status === "error") {
      throw new Error(`Job failed for ${scene.id}: ${JSON.stringify(inner)}`);
    }
  }
  throw new Error(`Timeout waiting for ${scene.id}`);
}

async function downloadVideo(scene: typeof scenes[0], url: string): Promise<string> {
  const outPath = path.join(OUTPUT_DIR, `${scene.id}-v3.mp4`);
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
  fs.writeFileSync(outPath, Buffer.from(response.data));
  const sizeMB = (response.data.byteLength / 1024 / 1024).toFixed(1);
  log(`[${scene.id}] Downloaded: ${outPath} (${sizeMB}MB)`);
  return outPath;
}

async function processScene(scene: typeof scenes[0]) {
  try {
    const jobId = await submitJob(scene);
    const videoUrl = await pollJob(scene, jobId);
    await downloadVideo(scene, videoUrl);
  } catch (err) {
    log(`[${scene.id}] ERROR: ${err}`);
  }
}

async function main() {
  log("=== BOTW V3 WaveSpeed Generation V3 — 5 Dedicated Angle References ===");
  log(`API Key: ${WAVESPEED_API_KEY.slice(0, 20)}...`);
  log(`Model: ${MODEL}`);

  // Submit all 5 in parallel
  await Promise.all(scenes.map(scene => processScene(scene)));

  log("=== All scenes complete ===");
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".mp4"));
  log(`Downloaded ${files.length}/5 clips`);
}

main().catch(err => {
  log(`FATAL: ${err}`);
  process.exit(1);
});
