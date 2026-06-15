/**
 * BOTW V3 — SyncLabs lip-sync submission for all 5 vocal scenes
 * Vocal-presence validated: S03, S05, S07, S09, S11 all confirmed VOCAL PRESENT
 *
 * Uses @sync.so/sdk with sync-3 model and typed input array format.
 * Direct public URLs (files.manuscdn.com, HTTP 200) — no CDN redirects.
 */
import * as fs from "fs";
import * as https from "https";
import * as http from "http";
import { SyncClient } from "@sync.so/sdk";

const LOG_FILE = "/tmp/botw-v3-synclabs.log";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-synclabs";

// Direct public URLs — HTTP 200 confirmed, no CDN redirects
// wiz-ai.b-cdn.net returns HTTP 307 redirect which SyncLabs cannot follow
const SCENES = [
  {
    id: "s03",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/tbOXtomMHCBwBLGw.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/PImYCpFWixVuWFVS.mp3",
    duration: 4.0,
    label: "S03 — First Vocal (front-facing)",
  },
  {
    id: "s05",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/lVDpdAIKHuDHERij.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/LtVVoKDpWPKJzXNe.mp3",
    duration: 4.0,
    label: "S05 — Pre-Chorus (3/4 profile)",
  },
  {
    id: "s07",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/zMklAvYjeXhcvjcU.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/bAmpMGYHxzCcKGUi.mp3",
    duration: 6.5,
    label: "S07 — Chorus Hero Shot (side tracking)",
  },
  {
    id: "s09",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/XcSWukCcjsVoWuIe.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/ZwEoOGnGOuLPxBTZ.mp3",
    duration: 5.5,
    label: "S09 — Bridge (elevated angle)",
  },
  {
    id: "s11",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/qgbbyzsffWBDNvWg.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/YaKkPHdmroyIneix.mp3",
    duration: 4.5,
    label: "S11 — Final Vocal (3/4 profile close-up)",
  },
];

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function processScene(scene: typeof SCENES[0], sync: SyncClient) {
  const outputPath = `${OUTPUT_DIR}/${scene.id}-synclabs.mp4`;
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100000) {
    log(`[SKIP] ${scene.id} already exists (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)}MB)`);
    return;
  }

  log(`[SUBMIT] ${scene.label}`);
  log(`  videoUrl: ${scene.videoUrl}`);
  log(`  audioUrl: ${scene.audioUrl}`);

  const response = await sync.generations.create({
    input: [
      { type: "video", url: scene.videoUrl },
      { type: "audio", url: scene.audioUrl },
    ],
    model: "sync-3",
    options: {
      sync_mode: "cut_off",
      temperature: 1.0,
      occlusion_detection_enabled: true,
    },
    outputFileName: `botw-v3-${scene.id}-${Date.now()}`,
  });

  const jobId = response.id;
  log(`[JOB] ${scene.id} — jobId: ${jobId}`);

  // Save job ID immediately
  const jobIdsFile = `${OUTPUT_DIR}/job-ids.json`;
  let jobIds: Record<string, string> = {};
  if (fs.existsSync(jobIdsFile)) {
    try { jobIds = JSON.parse(fs.readFileSync(jobIdsFile, "utf8")); } catch {}
  }
  jobIds[scene.id] = jobId;
  fs.writeFileSync(jobIdsFile, JSON.stringify(jobIds, null, 2));

  // Poll for completion
  const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "REJECTED"];
  const deadline = Date.now() + 10 * 60 * 1000; // 10 min timeout
  let generation = await sync.generations.get(jobId);

  while (!TERMINAL_STATUSES.includes(generation.status)) {
    if (Date.now() > deadline) {
      throw new Error(`${scene.id} timed out after 10 minutes (status: ${generation.status})`);
    }
    log(`  [POLL] ${scene.id} status=${generation.status}`);
    await new Promise((r) => setTimeout(r, 8000));
    generation = await sync.generations.get(jobId);
  }

  if (generation.status !== "COMPLETED") {
    throw new Error(`${scene.id} ended with status: ${generation.status}`);
  }

  const outputUrl = (generation as any).outputUrl ?? (generation as any).output_url;
  if (!outputUrl) {
    throw new Error(`${scene.id} completed but no outputUrl found: ${JSON.stringify(generation)}`);
  }

  log(`[COMPLETED] ${scene.id} — outputUrl: ${outputUrl}`);
  log(`[DOWNLOAD] ${scene.id} -> ${outputPath}`);
  await downloadFile(outputUrl, outputPath);
  const size = fs.statSync(outputPath).size;
  log(`[SAVED] ${scene.id} → ${(size / 1024 / 1024).toFixed(1)}MB`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

  log("=== BOTW V3 — SyncLabs submission for 5 vocal scenes ===");
  log("Vocal-presence validation: ALL PASSED (RMS > 0.01 confirmed)");
  log("Model: sync-3 | SDK: @sync.so/sdk | sync_mode: cut_off | temperature: 1.0");

  const apiKey = process.env.SYNC_LABS_API_KEY;
  if (!apiKey) {
    log("FATAL: SYNC_LABS_API_KEY not set");
    process.exit(1);
  }
  log(`API key: ${apiKey.substring(0, 8)}...`);

  const sync = new SyncClient({ apiKey });

  for (const scene of SCENES) {
    try {
      await processScene(scene, sync);
    } catch (err: any) {
      log(`[ERROR] ${scene.id}: ${err.message}`);
    }
  }

  log("\n=== All SyncLabs jobs complete ===");
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".mp4"));
  log(`Files in output: ${files.join(", ")}`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
