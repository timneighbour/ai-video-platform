/**
 * BOTW V3 — SyncLabs lip-sync submission for all 5 vocal scenes
 * Using the new WaveSpeed-generated clips with scene-aware concert hall references
 * All clips start in concert hall from frame one — no grey backgrounds
 */

import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-synclabs-v4";
const LOG_FILE = "/tmp/botw-v3-synclabs-v4.log";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// Scene definitions — new WaveSpeed clips + existing vocal stems
const SCENES = [
  {
    id: "s03",
    name: "S03 — Front-facing emotional intro",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/PMObanQaGNpMceMP.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/fhxFQHZNTYdwIoCq.mp3",
  },
  {
    id: "s05",
    name: "S05 — 3/4 profile",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/OmcwWGtpfonxdXcW.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/clomVxPFjStdSYxg.mp3",
  },
  {
    id: "s07",
    name: "S07 — Side-tracking hero shot",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/MBpiDvxilavCGugD.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/NHubAGUhYyRqnbjL.mp3",
  },
  {
    id: "s09",
    name: "S09 — Elevated bridge angle",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/VlLyHILOnDlLQWTx.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/dtNoRUvwBZUXudrv.mp3",
  },
  {
    id: "s11",
    name: "S11 — Intimate close-up (calm resolved)",
    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/qZUnYjVIXOBYeHva.mp4",
    audioUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/lhcrMmJDpACGalfN.mp3",
  },
];

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location!;
        https.get(redirectUrl, (r2) => {
          r2.pipe(file);
          file.on("finish", () => { file.close(); resolve(); });
        }).on("error", reject);
      } else {
        response.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function processScene(scene: typeof SCENES[0]) {
  log(`[${scene.id}] Submitting to SyncLabs: ${scene.name}`);
  
  try {
    const jobId = await submitSyncLabsLipSync({
      videoUrl: scene.videoUrl,
      audioUrl: scene.audioUrl,
      syncMode: "cut_off",
      temperature: 1.0,
      occlusionDetection: true,
      outputFileName: `botw-v3-${scene.id}-synclabs`,
    });
    
    log(`[${scene.id}] Job submitted: ${jobId}`);
    
    // Poll with 12 minute timeout
    const outputUrl = await pollSyncLabsLipSync(jobId, 12 * 60 * 1000);
    log(`[${scene.id}] COMPLETED — output: ${outputUrl}`);
    
    // Download the result
    const outputPath = path.join(OUTPUT_DIR, `${scene.id}-synclabs.mp4`);
    log(`[${scene.id}] Downloading to ${outputPath}...`);
    await downloadFile(outputUrl, outputPath);
    const size = fs.statSync(outputPath).size;
    log(`[${scene.id}] Downloaded: ${(size / 1024 / 1024).toFixed(1)}MB`);
    
    return { id: scene.id, jobId, outputUrl, outputPath, success: true };
  } catch (err: any) {
    log(`[${scene.id}] ERROR: ${err.message}`);
    return { id: scene.id, success: false, error: err.message };
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, ""); // Reset log
  
  log("=== BOTW V3 SyncLabs Submission — V4 (Scene-Aware References) ===");
  log(`Submitting ${SCENES.length} scenes in parallel...`);
  
  // Submit all 5 in parallel
  const results = await Promise.all(SCENES.map(processScene));
  
  log("\n=== FINAL RESULTS ===");
  for (const r of results) {
    if (r.success) {
      log(`✓ ${r.id}: ${r.outputPath}`);
    } else {
      log(`✗ ${r.id}: FAILED — ${(r as any).error}`);
    }
  }
  
  const passed = results.filter(r => r.success).length;
  log(`\n${passed}/${SCENES.length} scenes completed successfully`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
