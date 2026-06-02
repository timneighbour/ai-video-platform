/**
 * WIZ-SHOWCASE-001 — S12 SyncLabs Padded Submission (temperature=0.7)
 *
 * S12 failed at temperature=1.0 (over-driven jaw) and temperature=0.5 (still too much).
 * InfiniteTalk rejected due to identity drift and vocal contamination.
 *
 * Fix: 15% frame padding applied to Seedance clip to reduce face-to-frame dominance.
 * This reduces geometric jaw amplification while keeping Zara's identity intact.
 * Temperature=0.7 (midpoint between 0.5 and 1.0).
 *
 * Audio: isolated Demucs vocal stem (lead vocal only driver)
 * Scene: S12 — Final chorus close-up (t=33.126s–38.168s)
 */

import axios from "axios";
import { execSync } from "child_process";
import * as fs from "fs";

const SYNCLABS_API_KEY = process.env.SYNC_LABS_API_KEY;
const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-padded";
const OUTPUT_PATH = `${OUTPUT_DIR}/s12-padded-synclabs.mp4`;
const LOG_FILE = "/tmp/s12-padded-synclabs.log";

// Padded S12 Seedance clip (BunnyCDN — video URL, not audio, so Content-Type doesn't matter)
const S12_PADDED_VIDEO = "https://wiz-ai.b-cdn.net/manus-storage/s12-padded_1b3c2d5b.mp4";

// S12 vocal stem — manuscdn, confirmed Content-Type: audio/mpeg
const S12_VOCAL_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/KOjdJJvJOYDsGgNs.mp3";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function downloadDirect(url: string, dest: string): void {
  execSync(`curl -L -o "${dest}" "${url}" --max-time 120 --silent`);
  const size = fs.statSync(dest).size;
  if (size < 50000) throw new Error(`Download too small: ${size} bytes`);
  log(`Downloaded: ${dest} (${(size / 1024 / 1024).toFixed(1)}MB)`);
}

async function submitSyncLabs(videoUrl: string, audioUrl: string): Promise<string> {
  if (!SYNCLABS_API_KEY) throw new Error("SYNC_LABS_API_KEY not configured");

  const response = await axios.post(
    "https://api.sync.so/v2/generate",
    {
      model: "lipsync-2",
      input: [
        { type: "video", url: videoUrl },
        { type: "audio", url: audioUrl },
      ],
      options: {
        output_format: "mp4",
        sync_mode: "bounce",
        temperature: 0.7,
      },
    },
    {
      headers: {
        "x-api-key": SYNCLABS_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const jobId = response.data?.id;
  if (!jobId) throw new Error(`No job ID in response: ${JSON.stringify(response.data)}`);
  return jobId;
}

async function pollSyncLabs(jobId: string): Promise<string> {
  if (!SYNCLABS_API_KEY) throw new Error("SYNC_LABS_API_KEY not configured");

  let attempts = 0;
  const maxAttempts = 120;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000));
    attempts++;

    const response = await axios.get(`https://api.sync.so/v2/generate/${jobId}`, {
      headers: { "x-api-key": SYNCLABS_API_KEY },
      timeout: 15000,
    });

    const status = response.data?.status;
    log(`[${attempts * 5}s] Status: ${status}`);

    if (status === "completed") {
      const outputUrl =
        response.data?.outputUrl ||
        response.data?.output_url ||
        response.data?.outputMediaUrl ||
        response.data?.result?.url;
      if (!outputUrl) throw new Error(`Completed but no output URL: ${JSON.stringify(response.data)}`);
      return outputUrl;
    }

    if (status === "failed" || status === "error") {
      throw new Error(`SyncLabs job failed: ${response.data?.error || JSON.stringify(response.data)}`);
    }
  }

  throw new Error("Timeout: SyncLabs job did not complete within 10 minutes");
}

async function main() {
  fs.writeFileSync(LOG_FILE, "");
  log("=== S12 SyncLabs Padded Submission (temperature=0.7) ===");
  log(`Video: ${S12_PADDED_VIDEO}`);
  log(`Audio: ${S12_VOCAL_URL}`);

  const jobId = await submitSyncLabs(S12_PADDED_VIDEO, S12_VOCAL_URL);
  log(`Job submitted: ${jobId}`);
  log("Polling...");

  const outputUrl = await pollSyncLabs(jobId);
  log(`COMPLETE. Output: ${outputUrl}`);

  downloadDirect(outputUrl, OUTPUT_PATH);
  log(`Saved: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
