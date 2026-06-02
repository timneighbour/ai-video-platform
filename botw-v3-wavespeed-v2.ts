import * as fs from "fs";
import * as path from "path";

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY!;
const BASE_URL = "https://api.wavespeed.ai/api/v3";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-wavespeed-v2";
const LOG_FILE = "/tmp/botw-v3-wavespeed-v2.log";

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
    duration: 5,
  },
  {
    id: "s05",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s05-ref-3quarter.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. She is at a 3/4 profile angle facing left, chin slightly raised, mouth open singing a pre-chorus lyric. Orchestra musicians visible behind her on the right in soft focus. Warm amber golden lighting, ornate gilded walls. Cinematic music video, shallow depth of field.",
    duration: 5,
  },
  {
    id: "s07",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s07-ref-side.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. Side profile angle, she looks slightly forward, mouth wide open in a powerful chorus hero moment, hair moves with the performance energy. Orchestra conductor and musicians visible behind her. Warm amber golden lighting, gilded columns. Cinematic music video, dynamic energy.",
    duration: 5,
  },
  {
    id: "s09",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s09-ref-elevated.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. Camera positioned below looking upward, she gazes upward with chin raised, mouth open in an emotional bridge performance. Painted baroque ceiling visible above, full orchestra on both sides below in soft focus. Warm amber golden lighting. Cinematic music video, elevated dramatic angle.",
    duration: 5,
  },
  {
    id: "s11",
    refPath: "/home/ubuntu/zara-audit/scene-refs/s11-ref-intimate.png",
    prompt: "A female singer with long straight black hair and black leather jacket performs in a grand baroque concert hall. Intimate close-up, slight 3/4 turn toward camera, strong emotional eye contact, mouth slightly open in a tender final vocal moment. Orchestra depth visible in very soft focus behind her. Warm amber golden lighting. Cinematic music video, extremely shallow depth of field, intimate emotional close-up.",
    duration: 5,
  },
];

async function submitJob(scene: typeof scenes[0]): Promise<string> {
  // Read image as base64
  const imgBuffer = fs.readFileSync(scene.refPath);
  const base64 = imgBuffer.toString("base64");
  const ext = path.extname(scene.refPath).slice(1);
  const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  const dataUri = `data:${mimeType};base64,${base64}`;

  const payload = {
    model: "bytedance/seedance-2.0/image-to-video",
    input: {
      prompt: scene.prompt,
      image: dataUri,
      duration: scene.duration,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
  };

  const res = await fetch(`${BASE_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVESPEED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as any;
  if (!res.ok || data.status === "failed") {
    throw new Error(`Submit failed for ${scene.id}: ${JSON.stringify(data)}`);
  }

  const jobId = data.data?.id || data.id;
  log(`[${scene.id}] Submitted: jobId=${jobId} status=${data.data?.status || data.status}`);
  return jobId;
}

async function pollJob(scene: typeof scenes[0], jobId: string): Promise<string> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 15000));

    const res = await fetch(`${BASE_URL}/predictions/${jobId}`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    const data = await res.json() as any;
    const status = data.data?.status || data.status;
    log(`[${scene.id}] Poll ${i + 1}: status=${status}`);

    if (status === "completed" || status === "succeeded") {
      const videoUrl = data.data?.outputs?.[0] || data.data?.output?.[0] || data.output?.[0];
      if (!videoUrl) throw new Error(`No output URL for ${scene.id}`);
      log(`[${scene.id}] COMPLETED: ${videoUrl}`);
      return videoUrl;
    }

    if (status === "failed" || status === "error") {
      throw new Error(`Job failed for ${scene.id}: ${JSON.stringify(data)}`);
    }
  }
  throw new Error(`Timeout waiting for ${scene.id}`);
}

async function downloadVideo(scene: typeof scenes[0], url: string): Promise<string> {
  const outPath = path.join(OUTPUT_DIR, `${scene.id}-v2.mp4`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed for ${scene.id}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  log(`[${scene.id}] Downloaded: ${outPath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
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
  log("=== BOTW V3 WaveSpeed Generation V2 — 5 Dedicated Angle References ===");
  log(`API Key: ${WAVESPEED_API_KEY.slice(0, 20)}...`);

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
