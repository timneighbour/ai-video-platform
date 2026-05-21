/**
 * Hedra Character 3 Lip Sync Pipeline
 * ────────────────────────────────────
 * Replaces SyncLabs approach (which produces generic mouth movement on AI faces)
 * with Hedra Character 3 (which generates video WITH accurate phoneme sync).
 *
 * Flow per scene:
 * 1. Extract best frame from WaveSpeed video (at 1s mark)
 * 2. Cut isolated vocals for the scene's time window
 * 3. Upload frame + vocals to S3
 * 4. Submit to Hedra Character 3
 * 5. Poll until complete
 * 6. Download result, save to S3, update DB
 *
 * Then reassemble the final video using Hedra clips for performance scenes.
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { submitHedraLipSync, pollHedraLipSync } from "./ai-apis/hedra-lipsync";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/hedra-pipeline";
const PERFORMANCE_SCENES = [3, 5, 7, 9]; // Scene indices with lip sync

interface SceneData {
  sceneIndex: number;
  videoUrl: string;
  startTime: number;
  duration: number;
}

async function extractFrame(videoUrl: string, sceneIdx: number): Promise<string> {
  const videoPath = join(WORK, `raw-${sceneIdx}.mp4`);
  const framePath = join(WORK, `frame-${sceneIdx}.jpg`);
  
  execSync(`curl -sL "${videoUrl}" -o "${videoPath}" --max-time 30`, { timeout: 35000 });
  // Extract frame at 1s (good singing pose)
  execSync(`${FFMPEG} -y -i "${videoPath}" -ss 1 -vframes 1 -q:v 2 "${framePath}" 2>/dev/null`, { timeout: 10000 });
  
  return framePath;
}

async function cutVocals(vocalsUrl: string, startTime: number, duration: number, sceneIdx: number): Promise<string> {
  const vocalsPath = join(WORK, `vocals-full.mp3`);
  const cutPath = join(WORK, `vocals-${sceneIdx}.mp3`);
  
  // Download full vocals if not already present
  if (!existsSync(vocalsPath)) {
    execSync(`curl -sL "${vocalsUrl}" -o "${vocalsPath}" --max-time 30`, { timeout: 35000 });
  }
  
  execSync(`${FFMPEG} -y -i "${vocalsPath}" -ss ${startTime} -t ${duration} -c:a libmp3lame -q:a 2 "${cutPath}" 2>/dev/null`, { timeout: 10000 });
  return cutPath;
}

async function processScene(
  scene: SceneData,
  vocalsUrl: string,
  userId: string
): Promise<{ sceneIndex: number; hedraUrl: string }> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SCENE ${scene.sceneIndex} (${scene.startTime}-${scene.startTime + scene.duration}s)`);
  console.log(`${"=".repeat(60)}`);
  
  // 1. Extract hero frame
  console.log("  [1/5] Extracting hero frame...");
  const framePath = await extractFrame(scene.videoUrl, scene.sceneIndex);
  
  // 2. Cut isolated vocals
  console.log("  [2/5] Cutting isolated vocals...");
  const vocalsPath = await cutVocals(vocalsUrl, scene.startTime, scene.duration, scene.sceneIndex);
  
  // 3. Upload to S3
  console.log("  [3/5] Uploading to S3...");
  const frameBuf = readFileSync(framePath);
  const vocalsBuf = readFileSync(vocalsPath);
  
  const [{ url: frameUrl }, { url: voxUrl }] = await Promise.all([
    storagePut(`${userId}/music-video/${JOB_ID}/hedra-frame-${scene.sceneIndex}-${Date.now()}.jpg`, frameBuf, "image/jpeg"),
    storagePut(`${userId}/music-video/${JOB_ID}/hedra-vox-${scene.sceneIndex}-${Date.now()}.mp3`, vocalsBuf, "audio/mpeg"),
  ]);
  console.log(`    Frame: ${frameUrl.slice(0, 60)}...`);
  console.log(`    Vocals: ${voxUrl.slice(0, 60)}...`);
  
  // 4. Submit to Hedra Character 3
  console.log("  [4/5] Submitting to Hedra Character 3...");
  const genId = await submitHedraLipSync({
    imageUrl: frameUrl,
    audioUrl: voxUrl,
    sceneId: scene.sceneIndex,
    aspectRatio: "16:9",  // Landscape for music video
    resolution: "720p",
    textPrompt: "A beautiful female singer performing passionately to the camera, singing with emotion, mouth moving naturally forming words, cinematic lighting, recording studio atmosphere",
  });
  
  // 5. Poll until complete
  console.log("  [5/5] Waiting for Hedra to complete...");
  const outputUrl = await pollHedraLipSync(genId, 8 * 60 * 1000);
  console.log(`    Hedra output: ${outputUrl.slice(0, 80)}...`);
  
  // Download and save to S3
  const hedraRes = await fetch(outputUrl);
  if (!hedraRes.ok) throw new Error(`Failed to download Hedra output: ${hedraRes.status}`);
  const hedraBuf = Buffer.from(await hedraRes.arrayBuffer());
  const hedraKey = `${userId}/music-video/${JOB_ID}/hedra-ls-${scene.sceneIndex}-${Date.now()}.mp4`;
  const { url: hedraUrl } = await storagePut(hedraKey, hedraBuf, "video/mp4");
  
  console.log(`  ✅ DONE — Hedra clip saved: ${hedraUrl}`);
  return { sceneIndex: scene.sceneIndex, hedraUrl };
}

async function assembleVideo(
  scenes: Array<{ sceneIndex: number; videoUrl: string; hedraUrl?: string }>,
  audioUrl: string,
  totalDuration: number,
  userId: string
): Promise<string> {
  console.log("\n" + "=".repeat(60));
  console.log("ASSEMBLING FINAL VIDEO");
  console.log("=".repeat(60));
  
  const assemblyDir = join(WORK, "assembly");
  if (!existsSync(assemblyDir)) mkdirSync(assemblyDir, { recursive: true });
  
  // Download and normalize all clips
  const concatList: string[] = [];
  for (const scene of scenes) {
    const url = scene.hedraUrl || scene.videoUrl;
    const label = scene.hedraUrl ? "HEDRA" : "RAW";
    console.log(`  Downloading scene ${scene.sceneIndex} (${label})...`);
    
    const rawPath = join(assemblyDir, `raw-${scene.sceneIndex}.mp4`);
    const normPath = join(assemblyDir, `n${scene.sceneIndex}.mp4`);
    
    execSync(`curl -sL "${url}" -o "${rawPath}" --max-time 60`, { timeout: 65000 });
    
    // Normalize: 1280x720, 30fps, no audio
    execSync(
      `${FFMPEG} -y -i "${rawPath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 30 -c:v libx264 -preset medium -crf 18 -an "${normPath}" 2>/dev/null`,
      { timeout: 60000 }
    );
    
    concatList.push(`file '${normPath}'`);
  }
  
  // Write concat list
  const listPath = join(assemblyDir, "concat.txt");
  writeFileSync(listPath, concatList.join("\n") + "\n");
  
  // Concat video
  console.log("  Concatenating video clips...");
  const silentPath = join(assemblyDir, "silent.mp4");
  execSync(`${FFMPEG} -y -f concat -safe 0 -i "${listPath}" -c:v copy "${silentPath}" 2>/dev/null`, { timeout: 60000 });
  
  // Download full mix audio
  console.log("  Downloading full mix audio...");
  const audioPath = join(assemblyDir, "fullmix.mp3");
  execSync(`curl -sL "${audioUrl}" -o "${audioPath}" --max-time 30`, { timeout: 35000 });
  
  // Mux audio with video (trim to shorter of the two)
  console.log("  Muxing audio with video...");
  const finalPath = join(assemblyDir, "final.mp4");
  execSync(
    `${FFMPEG} -y -i "${silentPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath}" 2>/dev/null`,
    { timeout: 60000 }
  );
  
  // Get final info
  const info = execSync(`${FFMPEG} -i "${finalPath}" 2>&1 || true`).toString();
  const dur = info.match(/Duration:\s*([\d:\.]+)/);
  const size = execSync(`stat -c%s "${finalPath}"`).toString().trim();
  console.log(`  Final video: ${dur?.[1]} duration, ${(parseInt(size) / 1048576).toFixed(1)}MB`);
  
  // Upload to S3
  console.log("  Uploading final video to S3...");
  const finalBuf = readFileSync(finalPath);
  const finalKey = `${userId}/music-video/${JOB_ID}/final-hedra-${Date.now()}.mp4`;
  const { url: finalUrl } = await storagePut(finalKey, finalBuf, "video/mp4");
  
  console.log(`\n  ✅ FINAL VIDEO: ${finalUrl}`);
  return finalUrl;
}

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  const allScenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const sorted = allScenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
  
  console.log(`Job ${JOB_ID}: ${sorted.length} scenes`);
  console.log(`Vocals URL: ${job.vocalsUrl}`);
  console.log(`Audio URL: ${job.audioUrl}`);
  console.log(`Performance scenes: ${PERFORMANCE_SCENES.join(", ")}`);
  
  // Process each performance scene with Hedra
  const hedraResults: Map<number, string> = new Map();
  
  for (const sceneIdx of PERFORMANCE_SCENES) {
    const scene = sorted.find(s => s.sceneIndex === sceneIdx);
    if (!scene || !scene.videoUrl) {
      console.error(`  ❌ Scene ${sceneIdx} not found or has no video`);
      continue;
    }
    
    try {
      const result = await processScene(
        {
          sceneIndex: sceneIdx,
          videoUrl: scene.videoUrl,
          startTime: sceneIdx * 6, // Each scene is 6s
          duration: 6,
        },
        job.vocalsUrl!,
        job.userId!.toString()
      );
      hedraResults.set(result.sceneIndex, result.hedraUrl);
    } catch (err: any) {
      console.error(`  ❌ Scene ${sceneIdx} FAILED: ${err.message}`);
      // Continue with other scenes
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Hedra completed: ${hedraResults.size}/${PERFORMANCE_SCENES.length} scenes`);
  console.log(`${"=".repeat(60)}`);
  
  // Prepare assembly data
  const assemblyScenes = sorted.map(s => ({
    sceneIndex: s.sceneIndex!,
    videoUrl: s.videoUrl!,
    hedraUrl: hedraResults.get(s.sceneIndex!) || undefined,
  }));
  
  // Assemble final video
  const finalUrl = await assembleVideo(
    assemblyScenes,
    job.audioUrl!,
    71, // total duration
    job.userId!.toString()
  );
  
  // Update job with final URL
  await db.update(musicVideoJobs)
    .set({ finalVideoUrl: finalUrl, updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, JOB_ID));
  
  console.log("\n🎬 PIPELINE COMPLETE");
  console.log(`Final video: ${finalUrl}`);
  
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
