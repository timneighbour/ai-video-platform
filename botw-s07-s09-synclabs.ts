/**
 * BOTW V3 — SyncLabs lip-sync for S07 and S09 (sequential to avoid concurrency limit)
 */
import { waitForSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

const OUTPUT_DIR = "/home/ubuntu/zara-audit/botw-v3-synclabs-v4";
const LOG_FILE = "/tmp/botw-s07-s09-synclabs.log";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const doGet = (u: string) => {
      https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
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

const SCENES = [
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
];

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, "");

  log("=== BOTW V3 SyncLabs — S07 + S09 (sequential) ===");

  for (const scene of SCENES) {
    log(`[${scene.id}] Submitting: ${scene.name}`);
    try {
      const result = await waitForSyncLabsLipSync({
        videoUrl: scene.videoUrl,
        audioUrl: scene.audioUrl,
        syncMode: "cut_off",
        temperature: 1.0,
        occlusionDetection: true,
        outputFileName: `botw-v3-${scene.id}-synclabs`,
      }, 12 * 60 * 1000);

      log(`[${scene.id}] COMPLETED — output: ${result.outputUrl}`);
      const outputPath = path.join(OUTPUT_DIR, `${scene.id}-synclabs.mp4`);
      log(`[${scene.id}] Downloading...`);
      await downloadFile(result.outputUrl, outputPath);
      const size = fs.statSync(outputPath).size;
      log(`[${scene.id}] Downloaded: ${(size / 1024 / 1024).toFixed(1)}MB → ${outputPath}`);
    } catch (err: any) {
      log(`[${scene.id}] ERROR: ${err.message}`);
    }
  }

  log("=== Done ===");
  const files = fs.readdirSync(OUTPUT_DIR);
  log(`Output dir contents: ${files.join(", ")}`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
