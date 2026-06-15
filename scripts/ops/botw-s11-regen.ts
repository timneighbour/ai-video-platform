import * as fs from "fs";
import * as path from "path";

const WS_KEY = process.env.WAVESPEED_API_KEY || "wsk_live_4hsxKOXmi4LY7MPoH0-p_j1BiMUW_BkEU2nmSRmBxdc";
const BASE_URL = "https://api.wavespeed.ai/api/v3";
const MODEL = "bytedance/seedance-2.0/image-to-video";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-wavespeed-v3";

async function toBase64DataUri(filePath: string): Promise<string> {
  const data = fs.readFileSync(filePath);
  const b64 = data.toString("base64");
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${b64}`;
}

async function submitJob(scene: string, refPath: string, prompt: string): Promise<string> {
  const imageUri = await toBase64DataUri(refPath);
  const body = {
    image: imageUri,
    prompt,
    duration: 5,
    size: "1280x720",
    seed: -1,
  };

  const resp = await fetch(`${BASE_URL}/${MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WS_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json() as any;
  if (!resp.ok) {
    throw new Error(`Submit failed for ${scene}: ${JSON.stringify(json)}`);
  }
  const jobId = json?.data?.id || json?.id;
  if (!jobId) throw new Error(`No job ID for ${scene}: ${JSON.stringify(json)}`);
  console.log(`[${scene}] Submitted: ${jobId}`);
  return jobId;
}

async function pollJob(scene: string, jobId: string): Promise<string> {
  const maxWait = 600_000;
  const interval = 10_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, interval));
    const resp = await fetch(`${BASE_URL}/predictions/${jobId}`, {
      headers: { Authorization: `Bearer ${WS_KEY}` },
    });
    const json = await resp.json() as any;
    const status = json?.data?.status || json?.status;
    console.log(`[${scene}] Status: ${status}`);

    if (status === "completed" || status === "succeeded") {
      const url = json?.data?.outputs?.[0] || json?.outputs?.[0] || json?.data?.output_url;
      if (!url) throw new Error(`No output URL for ${scene}`);
      return url;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`Job failed for ${scene}: ${JSON.stringify(json)}`);
    }
  }
  throw new Error(`Timeout waiting for ${scene}`);
}

async function downloadClip(scene: string, url: string): Promise<void> {
  const outPath = `${OUTPUT_DIR}/${scene}-v3.mp4`;
  console.log(`[${scene}] Downloading from ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed for ${scene}: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`[${scene}] Downloaded: ${outPath} (${sizeMB}MB)`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const scene = {
    name: "s11",
    ref: "/home/ubuntu/zara-audit/scene-refs/s11-ref-intimate-v2.png",
    prompt: "Intimate emotional close-up performance shot. Female vocalist with long straight black hair and black leather jacket, standing inside a warm amber baroque concert hall. Camera at eye level, face fills 55% of frame. She is singing with a calm, serene, emotionally resolved expression — eyes soft and glistening, gentle peaceful delivery of the final lyric. Subtle head movement, slight turn toward camera. Full orchestra visible and softly blurred behind her. Warm amber golden lighting. Shallow depth of field. Cinematic premium music video. No microphone.",
  };

  try {
    const jobId = await submitJob(scene.name, scene.ref, scene.prompt);
    const outputUrl = await pollJob(scene.name, jobId);
    await downloadClip(scene.name, outputUrl);
    console.log(`\n✓ S11 complete`);
  } catch (err) {
    console.error(`✗ S11 failed:`, err);
    process.exit(1);
  }
}

main();
