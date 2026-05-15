import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoJobs, musicVideoScenes } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

// 1. Pause the job so heartbeat won't dispatch anything
await db.update(musicVideoJobs).set({
  status: 'paused',
  completedScenes: 0,
  errorMessage: null,
  syncLabsJobId: null,
  updatedAt: new Date()
}).where(eq(musicVideoJobs.id, 540026));
console.log('Job 540026 PAUSED');

// 2. Reset ALL scenes to pending with all video/lip sync cleared
await db.update(musicVideoScenes).set({
  status: 'pending',
  taskId: null,
  videoUrl: null,
  videoKey: null,
  errorMessage: null,
  lipSyncStatus: 'pending',
  lipSyncTaskId: null,
  lipSyncVideoUrl: null,
  lipSyncVideoKey: null,
  updatedAt: new Date()
}).where(eq(musicVideoScenes.jobId, 540026));
console.log('All 12 scenes reset to pending');

// 3. Show transcription segments so we know when vocals start
const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));
console.log('\n=== TRANSCRIPTION SEGMENTS ===');
if (job?.transcriptionSegments) {
  const segments = JSON.parse(job.transcriptionSegments) as Array<{start: number, end: number, text: string}>;
  console.log(`Total segments: ${segments.length}`);
  console.log('First vocal segment starts at:', segments[0]?.start, 'seconds');
  for (const s of segments) {
    console.log(`  ${s.start.toFixed(1)}s – ${s.end.toFixed(1)}s: "${s.text}"`);
  }
} else {
  console.log('No transcription segments found');
}

// 4. Show scenes with their lyrics
console.log('\n=== SCENES AND VOCALS ===');
const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));
scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
for (const s of scenes) {
  const hasLyrics = s.lyrics && s.lyrics.trim().length > 0;
  console.log(`  Scene ${s.sceneIndex} (${s.startTime}s–${(s.startTime ?? 0) + (s.duration ?? 6)}s): ${hasLyrics ? `"${s.lyrics}"` : '[no vocals / instrumental]'}`);
}

await conn.end();
