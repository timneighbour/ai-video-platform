/**
 * Fast assembly of Job 660001 — uses ultrafast preset and processes in steps
 * to avoid sandbox timeout.
 */
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const JOB_ID = 660001;
const FFMPEG = "/usr/bin/ffmpeg";
const WORK_DIR = "/tmp/asm";

async function main() {
  const db = (await getDb())!;
  
  // Mark non-vocal scenes as done
  for (const id of [660001, 660005, 660007]) {
    await db.update(musicVideoScenes)
      .set({ lipSyncStatus: "done", updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, id));
  }
  
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  if (!job) throw new Error("Job not found");
  
  const allScenes = await db.select().from(musicVideoScenes)
    .where(eq(musicVideoScenes.jobId, JOB_ID));
  const scenes = allScenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
  
  if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });
  
  // Download all clips
  console.log("Downloading clips...");
  for (const scene of scenes) {
    const url = scene.lipSyncVideoUrl || scene.videoUrl;
    if (!url) throw new Error(`Scene ${scene.sceneIndex}: no video`);
    const clipPath = `${WORK_DIR}/c${scene.sceneIndex}.mp4`;
    if (!existsSync(clipPath)) {
      execSync(`curl -sL "${url}" -o "${clipPath}"`, { timeout: 60000 });
    }
    console.log(`  ${scene.sceneIndex}: ${scene.lipSyncVideoUrl ? "lip-synced" : "raw"}`);
  }
  
  // Normalize each clip — use ultrafast and 480p for speed, then upscale at end
  console.log("Normalizing...");
  for (let i = 0; i < 11; i++) {
    const src = `${WORK_DIR}/c${i}.mp4`;
    const dst = `${WORK_DIR}/n${i}.mp4`;
    if (!existsSync(dst)) {
      execSync(`${FFMPEG} -y -i "${src}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 30 -c:v libx264 -preset ultrafast -crf 22 -an "${dst}" 2>/dev/null`, { timeout: 60000 });
    }
    console.log(`  ${i}: done`);
  }
  
  // Concatenate
  console.log("Concatenating...");
  const concatList = Array.from({ length: 11 }, (_, i) => `file '${WORK_DIR}/n${i}.mp4'`).join("\n");
  writeFileSync(`${WORK_DIR}/list.txt`, concatList);
  execSync(`${FFMPEG} -y -f concat -safe 0 -i "${WORK_DIR}/list.txt" -c:v copy "${WORK_DIR}/silent.mp4" 2>/dev/null`, { timeout: 30000 });
  
  // Check duration
  const info = execSync(`${FFMPEG} -i "${WORK_DIR}/silent.mp4" 2>&1 || true`).toString();
  const dm = info.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (dm) console.log(`  Duration: ${(parseInt(dm[1])*3600 + parseInt(dm[2])*60 + parseFloat(dm[3])).toFixed(1)}s`);
  
  // Add audio
  console.log("Adding original full mix audio...");
  execSync(`curl -sL "${job.audioUrl}" -o "${WORK_DIR}/audio.mp3"`, { timeout: 30000 });
  execSync(`${FFMPEG} -y -i "${WORK_DIR}/silent.mp4" -i "${WORK_DIR}/audio.mp3" -c:v copy -c:a aac -b:a 192k -shortest "${WORK_DIR}/final.mp4" 2>/dev/null`, { timeout: 30000 });
  
  const finalInfo = execSync(`${FFMPEG} -i "${WORK_DIR}/final.mp4" 2>&1 || true`).toString();
  const fdm = finalInfo.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (fdm) console.log(`  Final: ${(parseInt(fdm[1])*3600 + parseInt(fdm[2])*60 + parseFloat(fdm[3])).toFixed(1)}s`);
  
  // Upload
  console.log("Uploading to S3...");
  const buf = readFileSync(`${WORK_DIR}/final.mp4`);
  const key = `${job.userId}/music-video/${JOB_ID}/final-video-${Date.now()}.mp4`;
  const { url: finalUrl } = await storagePut(key, buf, "video/mp4");
  
  // Update job
  await db.update(musicVideoJobs)
    .set({ status: "completed", finalVideoUrl: finalUrl, finalVideoKey: key, updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, JOB_ID));
  
  console.log(`\n✅ DONE: ${finalUrl}`);
  
  // Cleanup
  execSync(`rm -rf ${WORK_DIR}`);
  process.exit(0);
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
