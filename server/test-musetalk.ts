/**
 * Test MuseTalk (via fal.ai) for lip sync on Scene 7.
 * 
 * MuseTalk claims "phonetically accurate lip movements" by modifying
 * only the mouth region of an existing video. This is fundamentally
 * different from SyncLabs (which failed on AI faces).
 * 
 * Input: source video + audio → Output: lip-synced video
 */
import { fal } from "@fal-ai/client";
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/musetalk-test";

// Configure fal.ai
fal.config({
  credentials: process.env.FAL_AI_API_KEY!,
});

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const scene7 = scenes.find(s => s.sceneIndex === 7)!;
  
  console.log("Scene 7 videoUrl:", scene7.videoUrl);
  console.log("Job vocalsUrl:", job.vocalsUrl);
  
  // Prepare: cut isolated vocals for scene 7 (42-48s)
  console.log("\n=== Preparing audio ===");
  execSync(`curl -sL "${job.vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/vox-42-48.mp3" 2>/dev/null`);
  
  // Upload vocals to S3 for fal.ai access
  const voxBuf = readFileSync(`${WORK}/vox-42-48.mp3`);
  const voxKey = `${job.userId}/music-video/${JOB_ID}/musetalk-vox-${Date.now()}.mp3`;
  const { url: voxUrl } = await storagePut(voxKey, voxBuf, "audio/mpeg");
  console.log("Vocals URL:", voxUrl);
  console.log("Video URL:", scene7.videoUrl);
  
  // Test 1: MuseTalk with isolated vocals
  console.log("\n=== TEST: MuseTalk with isolated vocals ===");
  try {
    console.log("Submitting to fal.ai/musetalk...");
    const result = await fal.subscribe("fal-ai/musetalk", {
      input: {
        source_video_url: scene7.videoUrl!,
        audio_url: voxUrl,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const logs = (update as any).logs || [];
          if (logs.length > 0) {
            console.log(`  [Progress] ${logs[logs.length - 1].message}`);
          }
        } else {
          console.log(`  [Status] ${update.status}`);
        }
      },
    });
    
    console.log("MuseTalk result:", JSON.stringify(result.data, null, 2));
    
    // Get the output video URL
    const outputUrl = (result.data as any)?.video?.url;
    if (outputUrl) {
      console.log("\n✅ MuseTalk output URL:", outputUrl);
      
      // Download and save to S3
      const resp = await fetch(outputUrl);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const key = `${job.userId}/music-video/${JOB_ID}/musetalk-ls7-${Date.now()}.mp4`;
        const { url: savedUrl } = await storagePut(key, buf, "video/mp4");
        console.log("Saved to S3:", savedUrl);
        
        // Also save locally for analysis
        const localPath = `${WORK}/musetalk-scene7.mp4`;
        require("fs").writeFileSync(localPath, buf);
        console.log("Saved locally:", localPath);
      } else {
        console.error("Failed to download output:", resp.status);
      }
    } else {
      console.log("No video URL in result");
    }
  } catch (err: any) {
    console.error("❌ MuseTalk failed:", err.message);
    if (err.body) console.error("Body:", JSON.stringify(err.body, null, 2));
  }
  
  // Test 2: MuseTalk with full mix audio
  console.log("\n=== TEST: MuseTalk with FULL MIX audio (42-48s) ===");
  try {
    execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/fullmix.mp3"`, { timeout: 30000 });
    execSync(`${FFMPEG} -y -i "${WORK}/fullmix.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/mix-42-48.mp3" 2>/dev/null`);
    const mixBuf = readFileSync(`${WORK}/mix-42-48.mp3`);
    const mixKey = `${job.userId}/music-video/${JOB_ID}/musetalk-mix-${Date.now()}.mp3`;
    const { url: mixUrl } = await storagePut(mixKey, mixBuf, "audio/mpeg");
    
    console.log("Submitting to fal.ai/musetalk with full mix...");
    const result2 = await fal.subscribe("fal-ai/musetalk", {
      input: {
        source_video_url: scene7.videoUrl!,
        audio_url: mixUrl,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const logs = (update as any).logs || [];
          if (logs.length > 0) {
            console.log(`  [Progress] ${logs[logs.length - 1].message}`);
          }
        }
      },
    });
    
    const outputUrl2 = (result2.data as any)?.video?.url;
    if (outputUrl2) {
      console.log("\n✅ MuseTalk full mix output:", outputUrl2);
      const resp2 = await fetch(outputUrl2);
      if (resp2.ok) {
        const buf2 = Buffer.from(await resp2.arrayBuffer());
        const key2 = `${job.userId}/music-video/${JOB_ID}/musetalk-mix-ls7-${Date.now()}.mp4`;
        const { url: savedUrl2 } = await storagePut(key2, buf2, "video/mp4");
        console.log("Saved to S3:", savedUrl2);
        require("fs").writeFileSync(`${WORK}/musetalk-mix-scene7.mp4`, buf2);
      }
    }
  } catch (err: any) {
    console.error("❌ MuseTalk full mix failed:", err.message);
  }
  
  console.log("\n=== DONE ===");
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
