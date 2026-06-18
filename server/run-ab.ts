import * as fs from "fs";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";

const WORK = "/tmp/ab-test";
const log = (msg: string) => { console.log(`[${new Date().toISOString()}] ${msg}`); };

const SOURCE_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630001-1779172682604.mp4";

async function runTest(label: string, audioPath: string): Promise<string> {
  log(`--- TEST ${label} ---`);
  // Upload audio
  const buf = fs.readFileSync(audioPath);
  const { url: audioUrl } = await storagePut(`music-video-ab-test/${label}-audio-${Date.now()}.mp3`, buf, "audio/mpeg");
  log(`Audio URL: ${audioUrl}`);
  
  const jobId = await submitSyncLabsLipSync({
    videoUrl: SOURCE_VIDEO,
    audioUrl,
    syncMode: "cut_off",
    outputFileName: `ab-${label}-${Date.now()}`,
    temperature: 1.0,
    occlusionDetection: true,
  });
  log(`SyncLabs job: ${jobId}`);

  const outputUrl = await pollSyncLabsLipSync(jobId, 10 * 60 * 1000);
  log(`Output: ${outputUrl}`);

  const resp = await fetch(outputUrl);
  const videoBuf = Buffer.from(await resp.arrayBuffer());
  const { url: s3Url } = await storagePut(`music-video-ab-test/result-${label}-${Date.now()}.mp4`, videoBuf, "video/mp4");
  log(`✅ ${label}: ${s3Url}`);
  return s3Url;
}

async function main() {
  log("=== A/B LIP SYNC TEST ===");
  log("Same source clip. Same SyncLabs settings. Only audio differs.");
  
  const resultA = await runTest("A-FULLMIX", `${WORK}/mix-seg.mp3`);
  const resultB = await runTest("B-VOCALS", `${WORK}/vox-seg.mp3`);

  log("\n=== RESULTS ===");
  log(`TEST A (Full Mix):        ${resultA}`);
  log(`TEST B (Isolated Vocals): ${resultB}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
