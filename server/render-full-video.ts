/**
 * Full Video Render Script for Job 660001
 * 
 * Updates scene prompts for maximum impact:
 * - Scene 0 (intro): Orchestra + pianist at Air Studios (approved test)
 * - Scene 3 (performance): Zara singing with intensity
 * - Scene 4 (cinematic): Orchestra close-up, strings
 * - Scene 5 (performance): Zara emotional close-up
 * - Scene 6 (cinematic): Wide shot, full ensemble
 * 
 * Also re-renders Scene 0 with the orchestra prompt.
 * Then triggers WaveSpeed renders for all pending scenes.
 */

import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const JOB_ID = 660001;

// The approved orchestra intro prompt (from the test render Tim approved)
const SCENE_PROMPTS: Record<number, string> = {
  // Scene 0 (intro, 0-6s): Orchestra + pianist — approved by Tim
  0: "Cinematic wide shot of Air Studios Lyndhurst Hall, warm amber lighting illuminating a grand Steinway piano in the foreground, a pianist in silhouette playing gentle keys at 76 BPM tempo, string ensemble visible in soft focus behind — violinists and cellist with slow graceful bow movements matching the emotional pace, golden light streaming through tall windows, dust particles floating in the air, film grain, shallow depth of field, 16:9 cinematic aspect ratio",

  // Scene 3 (performance, 18-24s): Zara singing with building intensity
  3: "Medium close-up of Zara singing passionately into a vintage Neumann U87 microphone at Air Studios, warm amber side lighting creating dramatic shadows on her face, eyes closed with deep emotion, subtle head movements in time with 76 BPM tempo, her breath visible in the warm studio air, bokeh lights in background, cinematic film grain, 16:9 aspect ratio",

  // Scene 4 (cinematic, 24-30s): Orchestra detail — strings close-up
  4: "Cinematic close-up of a cellist's bow gliding slowly across strings at 76 BPM, warm amber studio lighting reflecting off the polished wood of the cello, shallow depth of field with violinists visible in soft bokeh behind, Air Studios Lyndhurst Hall, slow graceful movements, emotional and contemplative atmosphere, golden hour warmth, film grain, 16:9 cinematic aspect ratio",

  // Scene 5 (performance, 30-36s): Zara tight emotional close-up
  5: "Tight close-up of Zara's face as she sings with raw emotion, tears glistening in her eyes, warm amber light catching the moisture, vintage microphone partially visible, Air Studios atmosphere, 76 BPM tempo guiding subtle movements, intimate and vulnerable performance moment, shallow depth of field, cinematic film grain, 16:9 aspect ratio",

  // Scene 6 (cinematic, 36-42s): Wide shot full ensemble
  6: "Cinematic wide rear shot from behind Zara looking out at the full string ensemble in Air Studios Lyndhurst Hall, her silhouette in foreground with the orchestra illuminated by warm amber light beyond, violinists and cellist playing with slow graceful bow movements at 76 BPM, grand piano visible stage left, atmospheric haze, golden light rays, film grain, 16:9 cinematic aspect ratio",
};

async function main() {
  const db = (await getDb())!;

  // Get all scenes for this job
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  console.log(`Found ${scenes.length} scenes for Job ${JOB_ID}`);

  // Check which scenes need updating
  const pendingScenes = scenes.filter(s => s.status === "pending" || s.videoUrl === null);
  console.log(`Pending scenes: ${pendingScenes.map(s => s.sceneIndex).join(", ")}`);

  // Also check Scene 0 — we want to re-render it with orchestra
  const scene0 = scenes.find(s => s.sceneIndex === 0);
  if (scene0 && scene0.videoUrl) {
    console.log(`Scene 0 already has a video — will reset to pending for orchestra re-render`);
  }

  // Update prompts for all target scenes
  for (const [indexStr, prompt] of Object.entries(SCENE_PROMPTS)) {
    const sceneIndex = parseInt(indexStr);
    const scene = scenes.find(s => s.sceneIndex === sceneIndex);
    if (!scene) {
      console.warn(`Scene ${sceneIndex} not found!`);
      continue;
    }

    // Update prompt and reset to pending for re-render
    await db.update(musicVideoScenes)
      .set({
        prompt,
        status: "pending",
        taskId: null,
        videoUrl: null,
        videoKey: null,
        lipSyncStatus: "pending",
        lipSyncTaskId: null,
        lipSyncVideoUrl: null,
        lipSyncVideoKey: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(musicVideoScenes.id, scene.id));
    console.log(`✓ Scene ${sceneIndex} (id=${scene.id}): prompt updated, reset to pending`);
  }

  // Make sure the job is in "rendering" status so the heartbeat picks it up
  await db.update(musicVideoJobs)
    .set({
      status: "rendering",
      finalVideoUrl: null,
      finalVideoKey: null,
      syncLabsJobId: null,
      updatedAt: new Date(),
    })
    .where(eq(musicVideoJobs.id, JOB_ID));
  console.log(`\n✓ Job ${JOB_ID} set to 'rendering' — heartbeat will pick up ${Object.keys(SCENE_PROMPTS).length} scenes`);

  // Summary
  console.log(`\n=== RENDER PLAN ===`);
  console.log(`Scene 0: Orchestra intro (pianist + strings) — NEW`);
  console.log(`Scene 3: Zara performance (building intensity)`);
  console.log(`Scene 4: Cello close-up (orchestra detail)`);
  console.log(`Scene 5: Zara tight close-up (raw emotion)`);
  console.log(`Scene 6: Wide rear shot (full ensemble)`);
  console.log(`\nScenes 1, 2, 7, 8, 9, 10 — already rendered with lip sync ✓`);
  console.log(`\nThe production heartbeat will:`);
  console.log(`1. Submit all 5 pending scenes to WaveSpeed (Seedance 2.0)`);
  console.log(`2. Poll until complete (~3-5 min per scene)`);
  console.log(`3. Submit scenes 0, 3, 5 to SyncLabs with isolated vocals`);
  console.log(`4. Assemble all 11 scenes + overlay original full mix audio`);
  console.log(`5. Deliver the final 71-second video`);

  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
