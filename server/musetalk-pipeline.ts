/**
 * MuseTalk Lip Sync Pipeline — All Performance Scenes
 * ────────────────────────────────────────────────────
 * Uses fal.ai MuseTalk which modifies only the mouth region of existing video.
 * This preserves the original video quality while adding audio-driven lip movement.
 *
 * Flow per scene:
 * 1. Cut isolated vocals for the scene's time window
 * 2. Upload vocals to S3
 * 3. Submit source video + vocals to MuseTalk via fal.ai
 * 4. Download result, save to S3
 * 5. Reassemble final video with all scenes
 */
import { fal } from "@fal-ai/client";
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/musetalk-pipeline";
const PERFORMANCE_SCENES = [3, 5, 7, 9]; // Scene indices with singing

// Configure fal.ai
fal.config({
  credentials: process.env.FAL_AI_API_KEY!,
});

async function processScene(
  sceneIndex: number,
  videoUrl: string,
  vocalsUrl: string,
  startTime: number,
  duration: number,
  userId: string
): Promise<string | null> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SCENE ${sceneIndex} (${startTime}-${startTime + duration}s) — MuseTalk`);
  console.log(`${"=".repeat(60)}`);
  
  try {
    // 1. Cut isolated vocals for this scene
    console.log("  [1/4] Cutting isolated vocals...");
    const vocalsPath = join(WORK, `vocals-full.mp3`);
    if (!existsSync(vocalsPath)) {
      execSync(`curl -sL "${vocalsUrl}" -o "${vocalsPath}" --max-time 30`, { timeout: 35000 });
    }
    const cutPath = join(WORK, `vox-${sceneIndex}.mp3`);
    execSync(`${FFMPEG} -y -i "${vocalsPath}" -ss ${startTime} -t ${duration} -c:a libmp3lame -q:a 2 "${cutPath}" 2>/dev/null`);
    
    // 2. Upload vocals to S3
    console.log("  [2/4] Uploading vocals to S3...");
    const voxBuf = readFileSync(cutPath);
    const voxKey = `${userId}/music-video/${JOB_ID}/mt-vox-${sceneIndex}-${Date.now()}.mp3`;
    const { url: voxS3Url } = await storagePut(voxKey, voxBuf, "audio/mpeg");
    
    // 3. Submit to MuseTalk
    console.log("  [3/4] Submitting to MuseTalk (fal.ai)...");
    console.log(`    Video: ${videoUrl.slice(0, 70)}...`);
    console.log(`    Audio: ${voxS3Url.slice(0, 70)}...`);
    
    const result = await fal.subscribe("fal-ai/musetalk", {
      input: {
        source_video_url: videoUrl,
        audio_url: voxS3Url,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const logs = (update as any).logs || [];
          if (logs.length > 0) {
            const last = logs[logs.length - 1].message;
            if (last.includes("%|") || last.includes("FPS")) {
              process.stdout.write(".");
            }
          }
        }
      },
    });
    console.log(""); // newline after dots
    
    // 4. Get output and save to S3
    const outputUrl = (result.data as any)?.video?.url;
    if (!outputUrl) {
      console.error(`  ❌ No video URL in MuseTalk result`);
      return null;
    }
    
    console.log("  [4/4] Downloading and saving result...");
    const resp = await fetch(outputUrl);
    if (!resp.ok) {
      console.error(`  ❌ Failed to download MuseTalk output: ${resp.status}`);
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const key = `${userId}/music-video/${JOB_ID}/mt-ls-${sceneIndex}-${Date.now()}.mp4`;
    const { url: savedUrl } = await storagePut(key, buf, "video/mp4");
    
    console.log(`  ✅ Scene ${sceneIndex} DONE — ${savedUrl}`);
    return savedUrl;
  } catch (err: any) {
    console.error(`  ❌ Scene ${sceneIndex} FAILED: ${err.message}`);
    return null;
  }
}

async function assembleVideo(
  scenes: Array<{ sceneIndex: number; videoUrl: string; museTalkUrl?: string | null }>,
  audioUrl: string,
  userId: string
): Promise<string> {
  console.log("\n" + "=".repeat(60));
  console.log("ASSEMBLING FINAL VIDEO");
  console.log("=".repeat(60));
  
  const assemblyDir = join(WORK, "assembly");
  if (existsSync(assemblyDir)) {
    execSync(`rm -rf "${assemblyDir}"`);
  }
  mkdirSync(assemblyDir, { recursive: true });
  
  // Download and normalize all clips
  const concatList: string[] = [];
  for (const scene of scenes) {
    const url = scene.museTalkUrl || scene.videoUrl;
    const label = scene.museTalkUrl ? "MUSETALK" : "RAW";
    console.log(`  Scene ${scene.sceneIndex} (${label}): downloading...`);
    
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
  
  // Mux audio with video
  console.log("  Muxing audio with video...");
  const finalPath = join(assemblyDir, "final.mp4");
  execSync(
    `${FFMPEG} -y -i "${silentPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${finalPath}" 2>/dev/null`,
    { timeout: 60000 }
  );
  
  // Get final info
  const info = execSync(`ffprobe -v quiet -show_format "${finalPath}" 2>/dev/null`).toString();
  const dur = info.match(/duration=([\d.]+)/);
  const size = execSync(`stat -c%s "${finalPath}"`).toString().trim();
  console.log(`  Final: ${parseFloat(dur?.[1] || "0").toFixed(1)}s, ${(parseInt(size) / 1048576).toFixed(1)}MB`);
  
  // Upload to S3
  console.log("  Uploading final video to S3...");
  const finalBuf = readFileSync(finalPath);
  const finalKey = `${userId}/music-video/${JOB_ID}/final-musetalk-${Date.now()}.mp4`;
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
  console.log(`Performance scenes: ${PERFORMANCE_SCENES.join(", ")}`);
  
  // Process each performance scene with MuseTalk
  const museTalkResults: Map<number, string> = new Map();
  
  for (const sceneIdx of PERFORMANCE_SCENES) {
    const scene = sorted.find(s => s.sceneIndex === sceneIdx);
    if (!scene || !scene.videoUrl) {
      console.error(`  ❌ Scene ${sceneIdx} not found or has no video`);
      continue;
    }
    
    const result = await processScene(
      sceneIdx,
      scene.videoUrl,
      job.vocalsUrl!,
      sceneIdx * 6, // Each scene starts at index * 6s
      6,
      job.userId!.toString()
    );
    
    if (result) {
      museTalkResults.set(sceneIdx, result);
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`MuseTalk completed: ${museTalkResults.size}/${PERFORMANCE_SCENES.length} scenes`);
  console.log(`${"=".repeat(60)}`);
  
  // Prepare assembly data
  const assemblyScenes = sorted.map(s => ({
    sceneIndex: s.sceneIndex!,
    videoUrl: s.videoUrl!,
    museTalkUrl: museTalkResults.get(s.sceneIndex!) || null,
  }));
  
  // Assemble final video
  const finalUrl = await assembleVideo(assemblyScenes, job.audioUrl!, job.userId!.toString());
  
  // Update job
  await db.update(musicVideoJobs)
    .set({ finalVideoUrl: finalUrl, updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, JOB_ID));
  
  console.log("\n🎬 PIPELINE COMPLETE");
  console.log(`Final video: ${finalUrl}`);
  
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
