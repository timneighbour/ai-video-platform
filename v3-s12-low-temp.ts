/**
 * WIZ-SHOWCASE-001 — S12 Low-Temperature SyncLabs Resubmission
 * 
 * S12 failed with over-driven jaw at temperature=1.0 (even with vocal stem).
 * This resubmits at temperature=0.5 to reduce jaw amplitude while preserving
 * lip articulation. The close-up framing of S12 amplifies every mouth movement,
 * so a lower temperature is required for natural-looking sync.
 * 
 * Source: Seedance S12 clip (1280x720, 24fps, 5.042s)
 * Audio: Isolated vocal stem for t=33.126s–38.168s
 */

import { waitForSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import { execSync } from "child_process";
import * as fs from "fs";

const CDN = "https://wiz-ai.b-cdn.net";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-synclabs-vocal-corrected";

// Use the Seedance source clip (not the previous SyncLabs output)
// The Seedance clip has the correct baseline face
const S12_SEEDANCE_URL = `${CDN}/manus-storage/s12_face8160.mp4`;
const S12_VOCAL_URL    = `${CDN}/manus-storage/s12-vocals_60d2348e.mp3`;

function downloadDirect(url: string, dest: string): void {
  execSync(`curl -L -o "${dest}" "${url}" --max-time 120 --silent`);
  const size = fs.statSync(dest).size;
  if (size < 10000) throw new Error(`Download too small: ${size} bytes`);
  console.log(`Downloaded: ${dest} (${(size/1024/1024).toFixed(1)}MB)`);
}

async function main() {
  console.log("=== S12 Low-Temperature SyncLabs Resubmission ===");
  console.log("Temperature: 0.5 (reduced from 1.0 to fix over-driven jaw)");
  console.log("Source: Seedance S12 (baseline face, not previous SyncLabs output)");
  console.log("Audio: Isolated vocal stem (t=33.126s–38.168s)\n");

  const result = await waitForSyncLabsLipSync({
    videoUrl: S12_SEEDANCE_URL,
    audioUrl: S12_VOCAL_URL,
    model: "sync-3",
    temperature: 0.5,  // Reduced jaw drive for close-up framing
  });

  console.log(`\nS12 COMPLETE`);
  console.log(`Output URL: ${result.outputUrl}`);

  const outPath = `${OUTPUT_DIR}/s12-low-temp.mp4`;
  downloadDirect(result.outputUrl, outPath);

  const size = fs.statSync(outPath).size;
  console.log(`\nS12 low-temp saved: ${outPath} (${(size/1024/1024).toFixed(1)}MB)`);
  console.log("Ready for review.");
}

main().catch(console.error);
