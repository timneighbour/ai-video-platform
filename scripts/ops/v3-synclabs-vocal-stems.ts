/**
 * WIZ-SHOWCASE-001 — SyncLabs Vocal Stem Pass
 * 
 * Resubmits S07, S09, S12 with isolated vocal stems (not full mix).
 * S03 is SKIPPED — confirmed instrumental section, no vocals.
 * 
 * Vocal stems extracted via Demucs htdemucs_ft from mastered audio.
 * CDN URLs for vocal stems:
 *   S07: https://wiz-ai.b-cdn.net/manus-storage/s07-vocals_72a4defa.mp3
 *   S09: https://wiz-ai.b-cdn.net/manus-storage/s09-vocals_70ebe389.mp3
 *   S12: https://wiz-ai.b-cdn.net/manus-storage/s12-vocals_60d2348e.mp3
 */

import { waitForSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CDN = "https://wiz-ai.b-cdn.net";
const SYNC_API_KEY = process.env.SYNC_LABS_API_KEY || "";

const scenes = [
  {
    name: "s07",
    videoUrl: `${CDN}/manus-storage/s07_5551738c.mp4`,
    // Vocal stem — isolated vocals only, no orchestral bleed
    audioUrl: `${CDN}/manus-storage/s07-vocals_72a4defa.mp3`,
    assemblyStart: 17.042,
    assemblyEnd: 22.084,
    note: "Chorus — full vocals present throughout",
  },
  {
    name: "s09",
    videoUrl: `${CDN}/manus-storage/s09_3d02f6e6.mp4`,
    // Vocal stem — vocals start ~0.5s in, silent lead-in is now near-silence not orchestra
    audioUrl: `${CDN}/manus-storage/s09-vocals_70ebe389.mp3`,
    assemblyStart: 28.084,
    assemblyEnd: 33.126,
    note: "Bridge — vocals start ~0.5s in, stem is near-silent before that",
  },
  {
    name: "s12",
    videoUrl: `${CDN}/manus-storage/s12_face8160.mp4`,
    // Vocal stem — isolated vocals, no orchestral over-drive on jaw
    audioUrl: `${CDN}/manus-storage/s12-vocals_60d2348e.mp3`,
    assemblyStart: 33.126,
    assemblyEnd: 38.168,
    note: "Final chorus — vocal stem prevents over-driven jaw",
  },
];

const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-synclabs-vocal-corrected";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function downloadWithCurl(url: string, dest: string): void {
  execSync(
    `curl -L -o "${dest}" "${url}" -H "x-api-key: ${SYNC_API_KEY}" --max-time 120 --silent`,
    { stdio: "pipe" }
  );
  const size = fs.statSync(dest).size;
  if (size < 10000) {
    throw new Error(`Download too small (${size} bytes) — likely an error response`);
  }
  console.log(`Downloaded: ${dest} (${(size/1024/1024).toFixed(1)}MB)`);
}

// Also try direct download without API key (CloudFront URLs don't need it)
function downloadDirect(url: string, dest: string): void {
  execSync(
    `curl -L -o "${dest}" "${url}" --max-time 120 --silent`,
    { stdio: "pipe" }
  );
  const size = fs.statSync(dest).size;
  if (size < 10000) {
    throw new Error(`Download too small (${size} bytes) — likely an error response`);
  }
  console.log(`Downloaded: ${dest} (${(size/1024/1024).toFixed(1)}MB)`);
}

async function processScene(scene: typeof scenes[0]) {
  console.log(`\n[${scene.name}] Submitting SyncLabs with VOCAL STEM`);
  console.log(`  Note: ${scene.note}`);
  console.log(`  Assembly: t=${scene.assemblyStart}s–${scene.assemblyEnd}s`);

  const result = await waitForSyncLabsLipSync({
    videoUrl: scene.videoUrl,
    audioUrl: scene.audioUrl,
    model: "sync-3",
  });

  console.log(`[${scene.name}] COMPLETE`);
  console.log(`  Output URL: ${result.outputUrl}`);
  
  const outPath = path.join(OUTPUT_DIR, `${scene.name}.mp4`);
  
  // Try direct download first (CloudFront), then with API key
  try {
    downloadDirect(result.outputUrl, outPath);
  } catch (e) {
    console.log(`Direct download failed, trying with API key...`);
    downloadWithCurl(result.outputUrl, outPath);
  }
  
  return { scene: scene.name, status: "completed", outputUrl: result.outputUrl, localPath: outPath };
}

async function main() {
  console.log("=== WIZ-SHOWCASE-001 SyncLabs Vocal Stem Pass ===");
  console.log("S03: SKIPPED (instrumental section — no vocals)");
  console.log("S07, S09, S12: Submitting with isolated vocal stems\n");

  const results: any[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    try {
      const result = await processScene(scene);
      results.push(result);
    } catch (err: any) {
      console.error(`[${scene.name}] ERROR: ${err.message}`);
      results.push({ scene: scene.name, status: "failed", error: err.message });
    }

    if (i < scenes.length - 1) {
      console.log("\nWaiting 15s before next submission...");
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  console.log("\n=== FINAL RESULTS ===");
  for (const r of results) {
    console.log(`${r.scene}: ${r.status} ${r.localPath || r.error || ""}`);
  }

  const allDone = results.every(r => r.status === "completed");
  console.log(`\nAll scenes completed: ${allDone}`);
  process.exit(allDone ? 0 : 1);
}

main().catch(console.error);
