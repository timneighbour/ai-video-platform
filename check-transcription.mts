import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoJobs, musicVideoScenes } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));

console.log('=== TRANSCRIPTION SEGMENTS ===');
if (job?.transcriptionSegments) {
  const segments = JSON.parse(job.transcriptionSegments) as Array<{start: number, end: number, text: string}>;
  console.log(`Total segments: ${segments.length}`);
  console.log('First vocal segment starts at:', segments[0]?.start, 'seconds');
  console.log('\nAll segments:');
  for (const s of segments) {
    console.log(`  ${s.start.toFixed(1)}s – ${s.end.toFixed(1)}s: "${s.text}"`);
  }
} else {
  console.log('No transcription segments found');
}

console.log('\n=== SCENES WITH LYRICS ===');
const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));
scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
for (const s of scenes) {
  const hasLyrics = s.lyrics && s.lyrics.trim().length > 0;
  console.log(`  Scene ${s.sceneIndex} (${s.startTime}s–${(s.startTime ?? 0) + (s.duration ?? 6)}s): ${hasLyrics ? `"${s.lyrics}"` : '[no vocals]'}`);
}

await conn.end();
