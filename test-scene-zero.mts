/**
 * Test script: dispatch ONLY scene 0 of job 540026 to Atlas Cloud image-to-video.
 * Used to verify the new pipeline (image-to-video + Sync Labs) before running all 12 scenes.
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes, musicVideoJobs } from './drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

// Get scene 0 for job 540026
const [scene] = await db.select().from(musicVideoScenes)
  .where(and(eq(musicVideoScenes.jobId, 540026), eq(musicVideoScenes.sceneIndex, 0)));

if (!scene) {
  console.error('Scene 0 not found for job 540026');
  await conn.end();
  process.exit(1);
}

const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));

console.log('Scene 0 status:', scene.status);
console.log('Scene 0 lipSyncStatus:', scene.lipSyncStatus);
console.log('Scene 0 startTime:', scene.startTime, 'seconds');
console.log('Scene 0 duration:', scene.duration, 'seconds');
console.log('Job audioUrl:', job?.audioUrl?.slice(0, 80) + '...');
console.log('Job characterImageUrl:', job?.characterImageUrl?.slice(0, 80) + '...');
console.log('');

// Only dispatch if pending
if (scene.status !== 'pending') {
  console.log(`Scene 0 is already in status: ${scene.status} — reset it first if you want to re-dispatch`);
  await conn.end();
  process.exit(0);
}

// Import the Atlas Cloud image-to-video function
const { submitAtlasImageToVideo } = await import('./server/ai-apis/atlascloud.js');
const { extractSceneAudioClip } = await import('./server/audio-clip-extractor.js');

// Extract the 6-second audio clip for scene 0 (startTime=0, duration=6)
console.log('Extracting audio clip for scene 0 (0s–6s)...');
let sceneAudioUrl: string | undefined;
try {
  if (job?.audioUrl) {
    sceneAudioUrl = await extractSceneAudioClip(job.audioUrl, scene.startTime, scene.duration, scene.id);
    console.log('Audio clip extracted:', sceneAudioUrl?.slice(0, 80) + '...');
  }
} catch (err: any) {
  console.warn('Audio clip extraction failed (non-fatal):', err?.message);
}

// Submit to Atlas Cloud image-to-video (Strategy 2 — no audio generation)
console.log('Submitting to Atlas Cloud image-to-video...');
console.log('Prompt:', scene.prompt?.slice(0, 120) + '...');
console.log('Character image:', job?.characterImageUrl ? 'yes' : 'none');

const taskId = await submitAtlasImageToVideo({
  prompt: scene.prompt ?? 'A person singing',
  imageUrl: job?.characterImageUrl ?? undefined,
  duration: scene.duration,
  aspectRatio: '9:16',
});

console.log('Atlas Cloud task submitted:', taskId);

// Update scene to generating
await db.update(musicVideoScenes).set({
  status: 'generating',
  taskId: `atlas:${taskId}`,
  updatedAt: new Date(),
}).where(eq(musicVideoScenes.id, scene.id));

console.log('Scene 0 updated to generating. Task ID: atlas:' + taskId);
console.log('');
console.log('Now wait for the heartbeat to poll Atlas Cloud and complete the scene.');
console.log('Once scene 0 completes, the heartbeat will automatically submit it to Sync Labs.');
console.log('Check scene status with: npx tsx check-scenes.mts');

await conn.end();
