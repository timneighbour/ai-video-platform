/**
 * WIZ-SHOWCASE-001 Benchmark v3
 * Phase 3: Poll the 3 submitted SyncLabs jobs, then submit S12
 */

import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./server/ai-apis/synclabs-lipsync";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const CDN_BASE = "https://wiz-ai.b-cdn.net";
const OUTPUT_DIR = "/home/ubuntu/zara-audit/v3-synclabs";

// Already submitted jobs
const submittedJobs = [
  { id: "s03", jobId: "f5c319d9-1890-4067-885f-57c2732927fb", label: "Scene 3 — Verse" },
  { id: "s07", jobId: "ec3fdba8-6f09-473b-a018-b036bb5a812f", label: "Scene 7 — Chorus" },
  { id: "s09", jobId: "15fa22cf-ccca-4023-827c-ea99dd24260d", label: "Scene 9 — Bridge close-up" },
];

// S12 needs to be submitted after the others complete
const s12 = {
  id: "s12",
  label: "Scene 12 — Final chorus close-up",
  videoUrl: `${CDN_BASE}/manus-storage/s12_9574ebd4.mp4`,
  audioUrl: `${CDN_BASE}/manus-storage/scene10-s60-t66_267fe58a.mp3`,
};

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

  const results: Record<string, string> = {};

  // Poll the 3 already-submitted jobs
  for (const scene of submittedJobs) {
    console.log(`\n[Phase 3] Polling ${scene.id} (${scene.jobId})...`);
    const outputUrl = await pollSyncLabsLipSync(scene.jobId, 600000);
    console.log(`  ✓ Output URL: ${outputUrl}`);

    const localPath = `${OUTPUT_DIR}/${scene.id}.mp4`;
    await downloadFile(outputUrl, localPath);
    console.log(`  ✓ Downloaded: ${localPath}`);
    results[scene.id] = outputUrl;
  }

  console.log(`\n✓ S03, S07, S09 complete. Submitting S12...`);

  // Now submit S12 (slot should be free)
  const s12JobId = await submitSyncLabsLipSync({
    videoUrl: s12.videoUrl,
    audioUrl: s12.audioUrl,
    syncMode: "cut_off",
    temperature: 1.0,
    occlusionDetection: false,
    outputFileName: `wiz-showcase-001-s12`,
  });
  console.log(`  ✓ S12 Job ID: ${s12JobId}`);

  const s12OutputUrl = await pollSyncLabsLipSync(s12JobId, 600000);
  console.log(`  ✓ S12 Output URL: ${s12OutputUrl}`);

  const s12LocalPath = `${OUTPUT_DIR}/s12.mp4`;
  await downloadFile(s12OutputUrl, s12LocalPath);
  console.log(`  ✓ S12 Downloaded: ${s12LocalPath}`);
  results["s12"] = s12OutputUrl;

  fs.writeFileSync(`${OUTPUT_DIR}/results.json`, JSON.stringify(results, null, 2));
  console.log(`\n✓ All 4 SyncLabs correction clips complete.`);
}

main().catch(err => { console.error("FATAL:", err.message); process.exit(1); });
