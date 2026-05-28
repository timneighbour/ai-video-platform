// One-shot script: re-classify cinematic scenes in job 720001 as performance
// and reset them to pending so they go through InfiniteTalk → composite pipeline
// Run with: pnpm tsx scripts/reset-cinematic-scenes.ts

import { getDb } from "../server/db";
import { musicVideoJobs, musicVideoScenes } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const db = await getDb();
if (!db) { console.error("No DB"); process.exit(1); }

// First, update the job-level enableLipSync flag
await db.update(musicVideoJobs)
  .set({ enableLipSync: true, updatedAt: new Date() })
  .where(eq(musicVideoJobs.id, 720001));
console.log("✅ Job 720001: enableLipSync set to true");

// Get all cinematic scenes for this job
const scenes = await db.select().from(musicVideoScenes)
  .where(and(
    eq(musicVideoScenes.jobId, 720001),
    eq(musicVideoScenes.sceneType, "cinematic")
  ));

console.log(`\nFound ${scenes.length} cinematic scenes to re-classify:`);

for (const scene of scenes) {
  await db.update(musicVideoScenes)
    .set({
      sceneType: "performance",
      lipSync: true,
      // Reset composite status so it goes through the composite pipeline
      compositeStatus: "pending",
      compositeVideoUrl: null,
      compositeJobId: null,
      // Reset lip sync so InfiniteTalk re-runs
      lipSyncStatus: "pending",
      lipSyncVideoUrl: null,
      lipSyncVideoKey: null,
      lipSyncTaskId: null,
      // Reset scene status to pending so the heartbeat picks it up
      // NOTE: we keep the existing taskId/videoUrl — the Seedance video is already done,
      // we just need to re-run InfiniteTalk on it and then composite
      status: "completed", // scene video is done, just needs lip-sync + composite
      updatedAt: new Date(),
    })
    .where(eq(musicVideoScenes.id, scene.id));
  
  console.log(`  ✅ Scene ${scene.sceneIndex + 1} (id=${scene.id}): cinematic → performance, composite=pending, lipSync=pending`);
}

// Also reset the job status so it can be re-assembled
await db.update(musicVideoJobs)
  .set({ 
    status: "rendering",
    finalVideoUrl: null,
    finalVideoKey: null,
    updatedAt: new Date()
  })
  .where(eq(musicVideoJobs.id, 720001));

console.log("\n✅ Job 720001: status reset to 'rendering', finalVideoUrl cleared");
console.log("\n🚀 All 8 cinematic scenes re-classified as performance.");
console.log("   The scene dispatch heartbeat will pick them up and run:");
console.log("   1. WaveSpeed InfiniteTalk lip-sync (using existing Seedance video)");
console.log("   2. Chromakey composite onto Air Studios background");
console.log("   3. Re-assembly of final video once all composites are done");

process.exit(0);
