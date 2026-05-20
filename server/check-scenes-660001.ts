/**
 * check-scenes-660001.ts
 * Checks the current state of all scenes for Job 660001.
 * Run: npx tsx server/check-scenes-660001.ts
 */
import "dotenv/config";
import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("DB unavailable"); process.exit(1); }

  const scenes = await db.select({
    id: musicVideoScenes.id,
    sceneIndex: musicVideoScenes.sceneIndex,
    status: musicVideoScenes.status,
    lipSyncStatus: musicVideoScenes.lipSyncStatus,
    lipSyncTaskId: musicVideoScenes.lipSyncTaskId,
    videoUrl: musicVideoScenes.videoUrl,
    lipSyncVideoUrl: musicVideoScenes.lipSyncVideoUrl,
    sceneType: musicVideoScenes.sceneType,
    lipSync: musicVideoScenes.lipSync,
    startTime: musicVideoScenes.startTime,
    duration: musicVideoScenes.duration,
    taskId: musicVideoScenes.taskId,
  }).from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 660001));

  console.log("=== Job 660001 Scenes ===");
  for (const s of scenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
    const videoStatus = s.videoUrl ? `✅ ${s.videoUrl.slice(0, 60)}...` : "❌ NULL";
    const lipSyncVideoStatus = s.lipSyncVideoUrl ? `✅ ${s.lipSyncVideoUrl.slice(0, 60)}...` : "NULL";
    console.log(`Scene ${s.sceneIndex} (id=${s.id}): status=${s.status} lipSync=${s.lipSyncStatus} type=${s.sceneType}`);
    console.log(`  videoUrl: ${videoStatus}`);
    console.log(`  lipSyncVideoUrl: ${lipSyncVideoStatus}`);
    console.log(`  startTime=${s.startTime}ms duration=${s.duration}s taskId=${s.taskId ?? 'NULL'}`);
  }

  const [job] = await db.select({
    status: musicVideoJobs.status,
    finalVideoUrl: musicVideoJobs.finalVideoUrl,
    vocalsUrl: musicVideoJobs.vocalsUrl,
    audioUrl: musicVideoJobs.audioUrl,
  }).from(musicVideoJobs).where(eq(musicVideoJobs.id, 660001));

  console.log(`\n=== Job Status ===`);
  console.log(`status: ${job.status}`);
  console.log(`finalVideoUrl: ${job.finalVideoUrl ? `✅ ${job.finalVideoUrl.slice(0, 80)}...` : "❌ NULL"}`);
  console.log(`vocalsUrl: ${job.vocalsUrl ? `✅ ${job.vocalsUrl.slice(0, 80)}...` : "❌ NULL"}`);
  console.log(`audioUrl: ${job.audioUrl ? `✅ ${job.audioUrl.slice(0, 80)}...` : "❌ NULL"}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
