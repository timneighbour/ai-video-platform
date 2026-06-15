/**
 * BOTW V3 — S10 Genuine Orchestral Clip Generation
 * Scene: S10 — Orchestral interlude (no Zara, no character)
 * Duration: 8.5s target (generate 5s clip, will be extended in assembly)
 * No loops, no speed changes, no visible reset point
 */
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

const WS_KEY = process.env.WAVESPEED_API_KEY!;
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-s10";
const LOG_FILE = "/tmp/botw-s10-orchestral.log";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const doGet = (u: string) => {
      https.get(u, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 120000
      }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          doGet(response.headers.location!);
        } else {
          response.pipe(file);
          file.on("finish", () => { file.close(); resolve(); });
        }
      }).on("error", (err) => { fs.unlink(destPath, () => {}); reject(err); });
    };
    doGet(url);
  });
}

async function submitJob(): Promise<string> {
  const prompt = `Cinematic orchestral performance inside a grand baroque concert hall. 
  Camera slowly pushes in toward the full orchestra — strings section in foreground, brass and woodwinds behind. 
  Conductor at podium, arms raised, baton moving. 
  Warm amber stage lighting, gilded baroque walls, ornate ceiling with chandeliers. 
  Musicians playing with intensity and passion. 
  Shallow depth of field, cinematic film grain. 
  No singer, no soloist — pure orchestral performance. 
  Air Studios atmosphere. 
  Slow cinematic camera movement, no cuts. 
  BPM: 72.`;

  const response = await fetch(
    `https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/text-to-video`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WS_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        size: "1280x720",
        duration: 5,
        seed: -1,
      }),
    }
  );

  const data = await response.json() as any;
  if (!response.ok) {
    throw new Error(`WaveSpeed submission failed: ${JSON.stringify(data)}`);
  }
  const jobId = data?.data?.id;
  if (!jobId) throw new Error(`No job ID in response: ${JSON.stringify(data)}`);
  return jobId;
}

async function pollJob(jobId: string): Promise<string> {
  const maxWait = 15 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 8000));

    const response = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${jobId}/result`,
      {
        headers: { "Authorization": `Bearer ${WS_KEY}` },
      }
    );

    const data = await response.json() as any;
    const status = data?.data?.status;
    log(`[s10] Status: ${status}`);

    if (status === "completed") {
      const outputs = data?.data?.outputs;
      if (outputs && outputs.length > 0) return outputs[0];
      throw new Error("Completed but no output URL");
    }
    if (status === "failed") {
      throw new Error(`Job failed: ${JSON.stringify(data?.data?.error)}`);
    }
  }
  throw new Error("Timeout waiting for S10 generation");
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, "");

  log("=== BOTW V3 — S10 Orchestral Generation ===");
  log("Submitting S10 text-to-video to WaveSpeed...");

  const jobId = await submitJob();
  log(`[s10] Job submitted: ${jobId}`);

  log("[s10] Polling for completion...");
  const outputUrl = await pollJob(jobId);
  log(`[s10] COMPLETED — output: ${outputUrl}`);

  const outputPath = path.join(OUTPUT_DIR, "s10-orchestral.mp4");
  log("[s10] Downloading...");
  await downloadFile(outputUrl, outputPath);
  const size = fs.statSync(outputPath).size;
  log(`[s10] Downloaded: ${(size / 1024 / 1024).toFixed(1)}MB → ${outputPath}`);
  log("=== Done ===");
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
