/**
 * Continue from where fix-and-assemble left off:
 * - Scene 3 is already rendered at 16:9 ✅
 * - Scene 5 needs rendering
 * - Then lip sync ALL performance scenes (1, 3, 5, 7, 9) with isolated vocals
 * - Then assemble full video
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { submitWaveSpeedImageToVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "./ai-apis/synclabs-lipsync";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/fix660001";

async function main() {
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  if (!job) throw new Error("Job not found");
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });

  // Step 1: Render Scene 5 with padded character image
  console.log("=== STEP 1: Render Scene 5 at 16:9 (full quality Seedance 2.0) ===");
  
  // Get the padded character image (already uploaded previously)
  const charImg = job.characterImageUrl!;
  const paddedImg = `${WORK}/char-16x9.png`;
  execSync(`curl -sL "${charImg}" -o "${WORK}/char-orig.png"`, { timeout: 15000 });
  execSync(`${FFMPEG} -y -i "${WORK}/char-orig.png" -vf "scale=1280:1280*ih/iw,crop=1280:720:0:(ih-720)/2" "${paddedImg}" 2>/dev/null`);
  const paddedBuf = readFileSync(paddedImg);
  const paddedKey = `${job.userId}/music-video/${JOB_ID}/char-16x9-${Date.now()}.png`;
  const { url: paddedUrl } = await storagePut(paddedKey, paddedBuf, "image/png");
  console.log("  Character image padded to 1280x720");

  const allScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const scene5 = allScenes.find(s => s.sceneIndex === 5)!;
  const prompt5 = (scene5.prompt || "") + " Tempo: 76 BPM. All movement must be slow, graceful, flowing.";
  
  console.log("  Scene 5: submitting...");
  const taskId = await submitWaveSpeedImageToVideo(
    { prompt: prompt5, image: paddedUrl, duration: 5, aspect_ratio: "16:9", resolution: "720p" },
    "bytedance/seedance-2.0/image-to-video"
  );
  console.log(`  Scene 5: task=${taskId}`);
  
  // Poll
  const start = Date.now();
  let videoUrl5: string | undefined;
  while (Date.now() - start < 10 * 60 * 1000) {
    const result = await pollWaveSpeedVideo(taskId);
    if (result.status === "completed" && (result.video_url || (result.outputs && result.outputs.length > 0))) {
      videoUrl5 = result.video_url || result.outputs![0];
      break;
    } else if (result.status === "failed") {
      throw new Error("Scene 5 render FAILED");
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  
  if (!videoUrl5) throw new Error("Scene 5 render timed out");
  
  const info5 = execSync(`${FFMPEG} -i "${videoUrl5}" 2>&1 || true`).toString();
  const match5 = info5.match(/(\d{3,4})x(\d{3,4})/);
  console.log(`  Scene 5: ✅ ${match5 ? match5[0] : "?"} (${((Date.now()-start)/1000).toFixed(0)}s)`);
  
  // Upload to S3
  const resp5 = await fetch(videoUrl5);
  const buf5 = Buffer.from(await resp5.arrayBuffer());
  const key5 = `${job.userId}/music-video/${JOB_ID}/scene-5-fixed-${Date.now()}.mp4`;
  const { url: s3Url5 } = await storagePut(key5, buf5, "video/mp4");
  
  await db.update(musicVideoScenes)
    .set({ videoUrl: s3Url5, videoKey: key5, lipSyncStatus: "pending", lipSyncVideoUrl: null, lipSyncVideoKey: null, updatedAt: new Date() })
    .where(eq(musicVideoScenes.id, scene5.id));
  console.log("  Scene 5 saved to DB");

  // Step 2: Apply lip sync to ALL performance scenes with isolated vocals
  console.log("\n=== STEP 2: Lip sync ALL performance scenes (isolated vocals) ===");
  const vocalsUrl = job.vocalsUrl!;
  execSync(`curl -sL "${vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  
  // Refresh scene data
  const refreshed = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const perfScenes = [1, 3, 5, 7, 9];
  
  for (const sceneIndex of perfScenes) {
    const scene = refreshed.find(s => s.sceneIndex === sceneIndex)!;
    if (!scene.videoUrl) { console.warn(`  Scene ${sceneIndex}: no video, skip`); continue; }
    
    const startSec = (scene.startTime ?? (sceneIndex * 6000)) / 1000;
    const durSec = 6;
    console.log(`\n  Scene ${sceneIndex}: vocals ${startSec}s-${startSec + durSec}s`);
    
    // Cut isolated vocals
    const tmpAudio = `${WORK}/vox-${sceneIndex}.mp3`;
    execSync(`${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss ${startSec} -t ${durSec} -c:a libmp3lame -q:a 2 "${tmpAudio}" 2>/dev/null`);
    
    // Volume check
    const vc = execSync(`${FFMPEG} -i "${tmpAudio}" -af volumedetect -f null /dev/null 2>&1 || true`).toString();
    const mm = vc.match(/mean_volume:\s*([-\d.]+)/);
    const vol = mm ? parseFloat(mm[1]) : -99;
    console.log(`    Volume: ${vol} dB`);
    
    if (vol < -40) {
      console.log(`    Too quiet — no vocals here, skip lip sync`);
      await db.update(musicVideoScenes).set({ lipSyncStatus: "done", updatedAt: new Date() }).where(eq(musicVideoScenes.id, scene.id));
      continue;
    }
    
    // Upload vocals clip
    const audioBuf = readFileSync(tmpAudio);
    const audioKey = `${job.userId}/music-video/${JOB_ID}/vox-fix-${sceneIndex}-${Date.now()}.mp3`;
    const { url: audioS3 } = await storagePut(audioKey, audioBuf, "audio/mpeg");
    
    // Submit to SyncLabs
    console.log(`    Submitting to SyncLabs sync-3...`);
    const syncJobId = await submitSyncLabsLipSync({
      videoUrl: scene.videoUrl,
      audioUrl: audioS3,
      temperature: 1.0,
      occlusionDetection: true,
    });
    console.log(`    SyncLabs job: ${syncJobId}`);
    
    // Poll SyncLabs
    try {
      const outputUrl = await pollSyncLabsLipSync(syncJobId, 5 * 60 * 1000);
      console.log(`    ✅ Lip sync done`);
      
      // Download and upload to S3
      const lsResp = await fetch(outputUrl);
      const lsBuf = Buffer.from(await lsResp.arrayBuffer());
      const lsKey = `${job.userId}/music-video/${JOB_ID}/ls-fix-${sceneIndex}-${Date.now()}.mp4`;
      const { url: lsS3 } = await storagePut(lsKey, lsBuf, "video/mp4");
      
      await db.update(musicVideoScenes)
        .set({ lipSyncStatus: "done", lipSyncVideoUrl: lsS3, lipSyncVideoKey: lsKey, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));
    } catch (err: any) {
      console.error(`    ❌ ${err.message}`);
    }
  }

  // Step 3: Mark cinematic scenes as done
  console.log("\n=== STEP 3: Mark cinematic scenes ===");
  for (const sceneIndex of [0, 2, 4, 6, 8, 10]) {
    const scene = refreshed.find(s => s.sceneIndex === sceneIndex);
    if (scene && scene.lipSyncStatus !== "done") {
      await db.update(musicVideoScenes).set({ lipSyncStatus: "done", updatedAt: new Date() }).where(eq(musicVideoScenes.id, scene.id));
    }
  }

  // Step 4: Assemble
  console.log("\n=== STEP 4: ASSEMBLING FINAL VIDEO ===");
  const finalScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const sorted = finalScenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
  
  // Download all clips
  for (const s of sorted) {
    const url = s.lipSyncVideoUrl || s.videoUrl!;
    const path = `${WORK}/final-${s.sceneIndex}.mp4`;
    console.log(`  Downloading scene ${s.sceneIndex} (${s.lipSyncVideoUrl ? "LIP-SYNCED" : "raw"})...`);
    execSync(`curl -sL "${url}" -o "${path}"`, { timeout: 60000 });
  }
  
  // Normalize to 1280x720 @ 30fps, strip audio
  console.log("  Normalizing all clips to 1280x720...");
  for (let i = 0; i < 11; i++) {
    execSync(`${FFMPEG} -y -i "${WORK}/final-${i}.mp4" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 30 -c:v libx264 -preset ultrafast -crf 20 -an "${WORK}/n${i}.mp4" 2>/dev/null`, { timeout: 60000 });
  }
  
  // Concat
  console.log("  Concatenating 11 scenes...");
  const list = Array.from({ length: 11 }, (_, i) => `file '${WORK}/n${i}.mp4'`).join("\n");
  writeFileSync(`${WORK}/list.txt`, list);
  execSync(`${FFMPEG} -y -f concat -safe 0 -i "${WORK}/list.txt" -c:v copy "${WORK}/silent.mp4" 2>/dev/null`, { timeout: 60000 });
  
  // Add original full mix audio
  console.log("  Overlaying original full mix audio...");
  execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/mix.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK}/silent.mp4" -i "${WORK}/mix.mp3" -c:v copy -c:a aac -b:a 192k -shortest "${WORK}/done.mp4" 2>/dev/null`, { timeout: 60000 });
  
  // Upload final video
  console.log("  Uploading final video...");
  const finalBuf = readFileSync(`${WORK}/done.mp4`);
  const finalKey = `${job.userId}/music-video/${JOB_ID}/final-fixed-${Date.now()}.mp4`;
  const { url: finalUrl } = await storagePut(finalKey, finalBuf, "video/mp4");
  
  await db.update(musicVideoJobs)
    .set({ status: "completed", finalVideoUrl: finalUrl, finalVideoKey: finalKey, updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, JOB_ID));
  
  console.log(`\n✅ FINAL VIDEO: ${finalUrl}`);
  execSync(`rm -rf ${WORK}`);
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
