/**
 * WIZ-SHOWCASE-001 Benchmark v3
 * Phase 3: SyncLabs sync-3 correction pass on all 4 Seedance clips
 */

import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const CDN_BASE = "https://wiz-ai.b-cdn.net";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-synclabs";

const scenes = [
  {
    id: "s03",
    label: "Scene 3 — Verse",
    videoUrl: `${CDN_BASE}/manus-storage/s03_0e1b9029.mp4`,
    audioUrl: `${CDN_BASE}/manus-storage/scene2-s12-t18_37d33522.mp3`,
  },
  {
    id: "s07",
    label: "Scene 7 — Chorus",
    videoUrl: `${CDN_BASE}/manus-storage/s07_7a1acdf5.mp4`,
    audioUrl: `${CDN_BASE}/manus-storage/scene6-s36-t42_04753a83.mp3`,
  },
  {
    id: "s09",
    label: "Scene 9 — Bridge close-up",
    videoUrl: `${CDN_BASE}/manus-storage/s09_acf5b63d.mp4`,
    audioUrl: `${CDN_BASE}/manus-storage/scene8-s48-t54_ec9069c1.mp3`,
  },
  {
    id: "s12",
    label: "Scene 12 — Final chorus close-up",
    videoUrl: `${CDN_BASE}/manus-storage/s12_9574ebd4.mp4`,
    audioUrl: `${CDN_BASE}/manus-storage/scene10-s60-t66_267fe58a.mp3`,
  },
];

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const jobIds: Record<string, string> = {};

  // Submit all 4 SyncLabs jobs sequentially
  for (const scene of scenes) {
    console.log(`\n[Phase 3] Submitting SyncLabs sync-3 for ${scene.id}: ${scene.label}`);
    const jobId = await submitSyncLabsLipSync({
      videoUrl: scene.videoUrl,
      audioUrl: scene.audioUrl,
      syncMode: "cut_off",
      temperature: 1.0,
      occlusionDetection: false, // no microphone in these scenes
      outputFileName: `wiz-showcase-001-${scene.id}`,
    });
    console.log(`  ✓ Job ID: ${jobId}`);
    jobIds[scene.id] = jobId;
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync(`${OUTPUT_DIR}/jobs.json`, JSON.stringify(jobIds, null, 2));
  console.log(`\n✓ All 4 SyncLabs jobs submitted. Polling for results (timeout: 10 min each)...`);

  // Poll all jobs sequentially
  const results: Record<string, string> = {};
  for (const scene of scenes) {
    const jobId = jobIds[scene.id];
    console.log(`\n[Phase 3] Polling ${scene.id} (${jobId})...`);
    
    const outputUrl = await pollSyncLabsLipSync(jobId, 600000); // 10 min timeout
    console.log(`  ✓ Output URL: ${outputUrl}`);

    const localPath = `${OUTPUT_DIR}/${scene.id}.mp4`;
    await downloadFile(outputUrl, localPath);
    console.log(`  ✓ Downloaded: ${localPath}`);
    results[scene.id] = outputUrl;
  }

  fs.writeFileSync(`${OUTPUT_DIR}/results.json`, JSON.stringify(results, null, 2));
  console.log(`\n✓ All 4 SyncLabs correction clips complete.`);
}

main().catch(err => { console.error("FATAL:", err.message); process.exit(1); });
