/**
 * Test HeyGen lip sync on Scene 7 as an alternative to SyncLabs.
 * SyncLabs sync-3 is producing generic mouth movement but not word-accurate sync.
 * HeyGen may produce better results on AI-generated faces.
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { submitHeyGenLipSyncV3, waitForHeyGenLipSyncV3 } from "./ai-apis/heygen-lipsync";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/heygen-test";

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const scene7 = scenes.find(s => s.sceneIndex === 7)!;
  
  console.log("Scene 7 videoUrl:", scene7.videoUrl);
  console.log("Job audioUrl:", job.audioUrl);
  console.log("Job vocalsUrl:", job.vocalsUrl);
  
  // Cut the full mix audio at 42-48s for scene 7
  console.log("\n=== Preparing audio ===");
  execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/fullmix.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/fullmix.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/mix-42-48.mp3" 2>/dev/null`);
  
  // Also prepare isolated vocals
  execSync(`curl -sL "${job.vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/vox-42-48.mp3" 2>/dev/null`);
  
  // Upload full mix clip
  const mixBuf = readFileSync(`${WORK}/mix-42-48.mp3`);
  const mixKey = `${job.userId}/music-video/${JOB_ID}/heygen-test-mix-${Date.now()}.mp3`;
  const { url: mixUrl } = await storagePut(mixKey, mixBuf, "audio/mpeg");
  console.log("Full mix audio uploaded:", mixUrl);
  
  // Upload isolated vocals clip
  const voxBuf = readFileSync(`${WORK}/vox-42-48.mp3`);
  const voxKey = `${job.userId}/music-video/${JOB_ID}/heygen-test-vox-${Date.now()}.mp3`;
  const { url: voxUrl } = await storagePut(voxKey, voxBuf, "audio/mpeg");
  console.log("Isolated vocals uploaded:", voxUrl);
  
  // Test 1: HeyGen with full mix
  console.log("\n=== TEST 1: HeyGen with FULL MIX ===");
  try {
    const jobId1 = await submitHeyGenLipSyncV3({
      videoUrl: scene7.videoUrl!,
      audioUrl: mixUrl,
      title: "WizAI Test - Scene 7 Full Mix",
    });
    console.log("HeyGen job submitted:", jobId1);
    const outputUrl1 = await waitForHeyGenLipSyncV3(jobId1, 8 * 60 * 1000);
    console.log("✅ HeyGen full mix result:", outputUrl1);
    
    // Download and save
    const resp1 = await fetch(outputUrl1);
    const buf1 = Buffer.from(await resp1.arrayBuffer());
    const key1 = `${job.userId}/music-video/${JOB_ID}/heygen-fullmix-ls7-${Date.now()}.mp4`;
    const { url: url1 } = await storagePut(key1, buf1, "video/mp4");
    console.log("Saved:", url1);
  } catch (err: any) {
    console.error("❌ HeyGen full mix failed:", err.message);
  }
  
  // Test 2: HeyGen with isolated vocals
  console.log("\n=== TEST 2: HeyGen with ISOLATED VOCALS ===");
  try {
    const jobId2 = await submitHeyGenLipSyncV3({
      videoUrl: scene7.videoUrl!,
      audioUrl: voxUrl,
      title: "WizAI Test - Scene 7 Vocals Only",
    });
    console.log("HeyGen job submitted:", jobId2);
    const outputUrl2 = await waitForHeyGenLipSyncV3(jobId2, 8 * 60 * 1000);
    console.log("✅ HeyGen vocals result:", outputUrl2);
    
    // Download and save
    const resp2 = await fetch(outputUrl2);
    const buf2 = Buffer.from(await resp2.arrayBuffer());
    const key2 = `${job.userId}/music-video/${JOB_ID}/heygen-vox-ls7-${Date.now()}.mp4`;
    const { url: url2 } = await storagePut(key2, buf2, "video/mp4");
    console.log("Saved:", url2);
  } catch (err: any) {
    console.error("❌ HeyGen vocals failed:", err.message);
  }
  
  console.log("\n=== DONE ===");
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
