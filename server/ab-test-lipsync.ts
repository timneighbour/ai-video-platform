/**
 * Controlled A/B Lip Sync Test
 * 
 * ONE source clip: canonical S0 raw (630001-1779172682604.mp4) — the exact clip that produced the approved lip sync
 * TWO audio conditions:
 *   A: Full mix segment (0–6s of the full track)
 *   B: Isolated Demucs vocals segment (0–6s)
 * 
 * IDENTICAL SyncLabs settings for both:
 *   - sync-3 model (default)
 *   - temperature: 1.0
 *   - occlusionDetection: true
 *   - syncMode: "cut_off"
 * 
 * Output: two separate video files for visual comparison
 */

import * as fs from "fs";
import { execSync } from "child_process";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";

const WORK = "/tmp/ab-test";
fs.mkdirSync(WORK, { recursive: true });

const log = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(`${WORK}/ab.log`, line + "\n");
};

// Source clip: the EXACT raw clip that was lip-synced in the approved job 630002
const SOURCE_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630001-1779172682604.mp4";
// Full mix audio
const FULL_MIX = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";

async function download(url: string, dest: string): Promise<void> {
  execSync(`curl -sL "${url}" -o "${dest}"`, { timeout: 120000 });
}

async function runTest(label: string, audioUrl: string): Promise<string> {
  log(`--- TEST ${label} ---`);
  log(`Audio: ${audioUrl}`);
  log(`Video: ${SOURCE_VIDEO}`);

  const jobId = await submitSyncLabsLipSync({
    videoUrl: SOURCE_VIDEO,
    audioUrl,
    syncMode: "cut_off",
    outputFileName: `ab-test-${label.toLowerCase()}-${Date.now()}`,
    temperature: 1.0,
    occlusionDetection: true,
  });
  log(`SyncLabs job: ${jobId}`);

  const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
  log(`SyncLabs output: ${outputUrl}`);

  // Download and save
  const resp = await fetch(outputUrl);
  const buf = Buffer.from(await resp.arrayBuffer());
  const localPath = `${WORK}/result-${label.toLowerCase()}.mp4`;
  fs.writeFileSync(localPath, buf);
  log(`Saved locally: ${localPath} (${(buf.length / 1024 / 1024).toFixed(1)}MB)`);

  // Upload to S3
  const { url: s3Url } = await storagePut(
    `music-video-ab-test/result-${label.toLowerCase()}-${Date.now()}.mp4`,
    buf,
    "video/mp4"
  );
  log(`S3: ${s3Url}`);
  return s3Url;
}

async function main() {
  log("=== A/B LIP SYNC TEST ===");
  log("Source clip: canonical S0 raw (same clip that produced approved lip sync)");
  log("SyncLabs settings: sync-3, temp=1.0, occlusionDetection=true, syncMode=cut_off");
  log("");

  // Download full mix
  log("Downloading full mix...");
  await download(FULL_MIX, `${WORK}/full-mix.mp3`);

  // Cut 6s full mix segment (0–6s — same as scene 0 start time)
  log("Cutting 6s full mix segment (0–6s)...");
  execSync(`ffmpeg -y -i "${WORK}/full-mix.mp3" -ss 0 -t 6 -ar 44100 -ac 2 -c:a libmp3lame -q:a 2 "${WORK}/mix-seg.mp3" 2>/dev/null`);

  // Isolate vocals with Demucs
  log("Running Demucs vocal isolation...");
  execSync(`pip3 install demucs 2>/dev/null || true`, { timeout: 120000 });
  execSync(
    `python3 -m demucs --two-stems vocals -n htdemucs "${WORK}/full-mix.mp3" -o "${WORK}/demucs-out" 2>&1 | tail -5`,
    { timeout: 600000 }
  );
  // Cut 6s isolated vocals segment (0–6s)
  const vocalsPath = `${WORK}/demucs-out/htdemucs/full-mix/vocals.wav`;
  log("Cutting 6s isolated vocals segment (0–6s)...");
  execSync(`ffmpeg -y -i "${vocalsPath}" -ss 0 -t 6 -ar 44100 -ac 2 -c:a libmp3lame -q:a 2 "${WORK}/vox-seg.mp3" 2>/dev/null`);

  // Check volumes
  const mixVol = execSync(`ffmpeg -i "${WORK}/mix-seg.mp3" -af volumedetect -f null /dev/null 2>&1 | grep mean_volume || true`).toString().trim();
  const voxVol = execSync(`ffmpeg -i "${WORK}/vox-seg.mp3" -af volumedetect -f null /dev/null 2>&1 | grep mean_volume || true`).toString().trim();
  log(`Full mix volume: ${mixVol}`);
  log(`Isolated vocals volume: ${voxVol}`);

  // Upload both audio segments to S3 (SyncLabs needs URLs)
  log("Uploading audio segments...");
  const mixBuf = fs.readFileSync(`${WORK}/mix-seg.mp3`);
  const { url: mixUrl } = await storagePut(`music-video-ab-test/mix-seg-${Date.now()}.mp3`, mixBuf, "audio/mpeg");
  log(`Mix segment URL: ${mixUrl}`);

  const voxBuf = fs.readFileSync(`${WORK}/vox-seg.mp3`);
  const { url: voxUrl } = await storagePut(`music-video-ab-test/vox-seg-${Date.now()}.mp3`, voxBuf, "audio/mpeg");
  log(`Vocals segment URL: ${voxUrl}`);

  // Run both tests
  log("\n=== RUNNING TEST A: FULL MIX ===");
  const resultA = await runTest("A-FULLMIX", mixUrl);

  log("\n=== RUNNING TEST B: ISOLATED VOCALS ===");
  const resultB = await runTest("B-VOCALS", voxUrl);

  log("\n=== RESULTS ===");
  log(`TEST A (Full Mix):       ${resultA}`);
  log(`TEST B (Isolated Vocals): ${resultB}`);
  log("");
  log("Both clips use the SAME source video and SAME SyncLabs settings.");
  log("The ONLY difference is the audio sent to SyncLabs.");
  log("Compare visually to determine which produces better lip sync.");
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
