/**
 * Test different SyncLabs models on Scene 7 to find which produces
 * accurate word-level lip sync on AI-generated video.
 * 
 * Models to test:
 * - lipsync-2-pro (dedicated lip sync model)
 * - lipsync-2 (standard lip sync)
 * - sync-3 with temperature 0.5 (less expressive but maybe more accurate)
 */
import { SyncClient } from "@sync.so/sdk";
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/model-test";
const SYNC_LABS_API_KEY = process.env.SYNC_LABS_API_KEY!;

async function submitAndWait(
  sync: any,
  videoUrl: string,
  audioUrl: string,
  model: string,
  options: Record<string, any> = {}
): Promise<string> {
  console.log(`  Submitting with model=${model}, options=${JSON.stringify(options)}`);
  const response = await sync.generations.create({
    input: [
      { type: "video", url: videoUrl },
      { type: "audio", url: audioUrl },
    ],
    model,
    options: {
      sync_mode: "cut_off",
      ...options,
    },
  });
  
  const jobId = response.id;
  console.log(`  Job ID: ${jobId}`);
  
  // Poll
  const deadline = Date.now() + 10 * 60 * 1000;
  let gen = await sync.generations.get(jobId);
  while (!["COMPLETED", "FAILED", "REJECTED"].includes(gen.status)) {
    if (Date.now() > deadline) throw new Error(`Timeout for ${model}`);
    await new Promise(r => setTimeout(r, 5000));
    gen = await sync.generations.get(jobId);
    process.stdout.write(".");
  }
  console.log("");
  
  if (gen.status !== "COMPLETED") {
    throw new Error(`Job ${jobId} (${model}) ended with status: ${gen.status}`);
  }
  
  const outputUrl = (gen as any).outputUrl ?? (gen as any).output_url;
  if (!outputUrl) throw new Error(`No output URL for ${model}`);
  return outputUrl;
}

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const scene7 = scenes.find(s => s.sceneIndex === 7)!;
  
  const sync = new SyncClient({ apiKey: SYNC_LABS_API_KEY });
  
  // Prepare audio - use isolated vocals (cleaner signal for lip sync)
  execSync(`curl -sL "${job.vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss 42 -t 6 -c:a libmp3lame -q:a 2 "${WORK}/vox-42-48.mp3" 2>/dev/null`);
  const voxBuf = readFileSync(`${WORK}/vox-42-48.mp3`);
  const voxKey = `${job.userId}/music-video/${JOB_ID}/model-test-vox-${Date.now()}.mp3`;
  const { url: voxUrl } = await storagePut(voxKey, voxBuf, "audio/mpeg");
  console.log("Audio uploaded:", voxUrl);
  console.log("Video:", scene7.videoUrl);
  
  const results: Record<string, string> = {};
  
  // Test 1: lipsync-2-pro
  console.log("\n=== TEST: lipsync-2-pro ===");
  try {
    const url = await submitAndWait(sync, scene7.videoUrl!, voxUrl, "lipsync-2-pro", {
      temperature: 0.8,
    });
    results["lipsync-2-pro"] = url;
    console.log("  ✅ Result:", url);
  } catch (e: any) {
    console.log("  ❌ Failed:", e.message);
  }
  
  // Test 2: lipsync-2
  console.log("\n=== TEST: lipsync-2 ===");
  try {
    const url = await submitAndWait(sync, scene7.videoUrl!, voxUrl, "lipsync-2", {
      temperature: 0.8,
    });
    results["lipsync-2"] = url;
    console.log("  ✅ Result:", url);
  } catch (e: any) {
    console.log("  ❌ Failed:", e.message);
  }
  
  // Test 3: sync-3 with lower temperature (0.5)
  console.log("\n=== TEST: sync-3 temp=0.5 ===");
  try {
    const url = await submitAndWait(sync, scene7.videoUrl!, voxUrl, "sync-3", {
      temperature: 0.5,
      occlusion_detection_enabled: true,
    });
    results["sync-3-temp05"] = url;
    console.log("  ✅ Result:", url);
  } catch (e: any) {
    console.log("  ❌ Failed:", e.message);
  }
  
  // Download and save all results
  console.log("\n=== SAVING RESULTS ===");
  for (const [name, url] of Object.entries(results)) {
    try {
      const resp = await fetch(url);
      const buf = Buffer.from(await resp.arrayBuffer());
      const key = `${job.userId}/music-video/${JOB_ID}/model-${name}-${Date.now()}.mp4`;
      const { url: savedUrl } = await storagePut(key, buf, "video/mp4");
      console.log(`${name}: ${savedUrl}`);
    } catch (e: any) {
      console.log(`${name}: save failed - ${e.message}`);
    }
  }
  
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
