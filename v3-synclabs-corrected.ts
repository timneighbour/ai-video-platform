/**
 * v3 SyncLabs Corrected Pass
 * Re-runs SyncLabs for all 4 performance scenes using audio segments
 * extracted from the CORRECT assembly-timeline positions (not storyboard positions).
 *
 * Assembly positions (locked):
 *   S03: mastered-audio t=6.000s  -> t=11.042s
 *   S07: mastered-audio t=17.042s -> t=22.084s
 *   S09: mastered-audio t=28.084s -> t=33.126s
 *   S12: mastered-audio t=33.126s -> t=38.168s
 */

import { waitForSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const CDN = "https://wiz-ai.b-cdn.net";

const scenes = [
  {
    name: "s03",
    videoUrl: `${CDN}/manus-storage/s03_00003404.mp4`,
    audioUrl: `${CDN}/manus-storage/s03-correct_8800cb4a.mp3`,
    assemblyStart: 6.000,
    assemblyEnd: 11.042,
  },
  {
    name: "s07",
    videoUrl: `${CDN}/manus-storage/s07_5551738c.mp4`,
    audioUrl: `${CDN}/manus-storage/s07-correct_6166effc.mp3`,
    assemblyStart: 17.042,
    assemblyEnd: 22.084,
  },
  {
    name: "s09",
    videoUrl: `${CDN}/manus-storage/s09_3d02f6e6.mp4`,
    audioUrl: `${CDN}/manus-storage/s09-correct_1506abd4.mp3`,
    assemblyStart: 28.084,
    assemblyEnd: 33.126,
  },
  {
    name: "s12",
    videoUrl: `${CDN}/manus-storage/s12_face8160.mp4`,
    audioUrl: `${CDN}/manus-storage/s12-correct_f9ddb807.mp3`,
    assemblyStart: 33.126,
    assemblyEnd: 38.168,
  },
];

const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-synclabs-corrected";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    function doGet(u: string) {
      https.get(u, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          return doGet(response.headers.location!);
        }
        if (response.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${response.statusCode} for ${u}`));
        }
        response.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
    }
    doGet(url);
  });
}

async function processScene(scene: typeof scenes[0]) {
  console.log(`\n[${scene.name}] Submitting SyncLabs — CORRECT audio at mastered t=${scene.assemblyStart}s–${scene.assemblyEnd}s`);

  // Use waitForSyncLabsLipSync which handles submit + poll internally
  // Default timeout is 10 minutes which is sufficient
  const result = await waitForSyncLabsLipSync({
    videoUrl: scene.videoUrl,
    audioUrl: scene.audioUrl,
    model: "sync-3",
  });

  console.log(`[${scene.name}] COMPLETE: ${result.outputUrl}`);
  const outPath = path.join(OUTPUT_DIR, `${scene.name}.mp4`);
  await downloadFile(result.outputUrl, outPath);
  const size = fs.statSync(outPath).size;
  console.log(`[${scene.name}] Downloaded: ${outPath} (${(size/1024/1024).toFixed(1)}MB)`);
  return { scene: scene.name, status: "completed", outputUrl: result.outputUrl, localPath: outPath };
}

async function main() {
  console.log("=== WIZ-SHOWCASE-001 SyncLabs CORRECTED PASS ===");
  console.log("Processing scenes sequentially to respect concurrency limits...\n");

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
