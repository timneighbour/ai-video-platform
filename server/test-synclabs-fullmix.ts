/**
 * Test: Submit scene 7 to SyncLabs with FULL MIX audio (not isolated vocals)
 * to see if the lip sync quality improves.
 * 
 * If this works better, the pipeline should use full mix for SyncLabs input.
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/synclabs-test";

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const scene7 = scenes.find(s => s.sceneIndex === 7)!;
  
  console.log("Scene 7 videoUrl:", scene7.videoUrl);
  
  // Cut FULL MIX at 42-48s (not isolated vocals)
  console.log("\n=== TEST: SyncLabs with FULL MIX audio ===");
  execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/fullmix.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/fullmix.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/mix-42-48.mp3" 2>/dev/null`);
  
  // Upload full mix clip to S3
  const mixBuf = readFileSync(`${WORK}/mix-42-48.mp3`);
  const mixKey = `${job.userId}/music-video/${JOB_ID}/test-mix-42-48-${Date.now()}.mp3`;
  const { url: mixUrl } = await storagePut(mixKey, mixBuf, "audio/mpeg");
  console.log("Full mix clip uploaded:", mixUrl);
  
  // Submit to SyncLabs with FULL MIX
  console.log("Submitting to SyncLabs with FULL MIX...");
  const jobId1 = await submitSyncLabsLipSync({
    videoUrl: scene7.videoUrl!,
    audioUrl: mixUrl,
    temperature: 1.0,
    occlusionDetection: true,
  });
  console.log("Job ID (full mix):", jobId1);
  
  const output1 = await pollSyncLabsLipSync(jobId1, 5 * 60 * 1000);
  console.log("✅ Full mix result:", output1);
  
  // Download and save
  const resp1 = await fetch(output1);
  const buf1 = Buffer.from(await resp1.arrayBuffer());
  const key1 = `${job.userId}/music-video/${JOB_ID}/test-fullmix-ls7-${Date.now()}.mp4`;
  const { url: url1 } = await storagePut(key1, buf1, "video/mp4");
  console.log("Saved full mix lip sync:", url1);
  
  // Now also test with isolated vocals for comparison
  console.log("\n=== TEST: SyncLabs with ISOLATED VOCALS ===");
  execSync(`curl -sL "${job.vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/vox-42-48.mp3" 2>/dev/null`);
  
  const voxBuf = readFileSync(`${WORK}/vox-42-48.mp3`);
  const voxKey = `${job.userId}/music-video/${JOB_ID}/test-vox-42-48-${Date.now()}.mp3`;
  const { url: voxUrl } = await storagePut(voxKey, voxBuf, "audio/mpeg");
  console.log("Isolated vocals clip uploaded:", voxUrl);
  
  console.log("Submitting to SyncLabs with ISOLATED VOCALS...");
  const jobId2 = await submitSyncLabsLipSync({
    videoUrl: scene7.videoUrl!,
    audioUrl: voxUrl,
    temperature: 1.0,
    occlusionDetection: true,
  });
  console.log("Job ID (vocals):", jobId2);
  
  const output2 = await pollSyncLabsLipSync(jobId2, 5 * 60 * 1000);
  console.log("✅ Isolated vocals result:", output2);
  
  const resp2 = await fetch(output2);
  const buf2 = Buffer.from(await resp2.arrayBuffer());
  const key2 = `${job.userId}/music-video/${JOB_ID}/test-vox-ls7-${Date.now()}.mp4`;
  const { url: url2 } = await storagePut(key2, buf2, "video/mp4");
  console.log("Saved vocals lip sync:", url2);
  
  console.log("\n=== COMPARE ===");
  console.log("Full mix lip sync:", url1);
  console.log("Isolated vocals lip sync:", url2);
  console.log("\nWatch both and compare which has better lip sync to the lyrics.");
  
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
