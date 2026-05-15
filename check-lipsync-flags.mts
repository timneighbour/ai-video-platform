import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes, musicVideoJobs } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));
console.log('Job audioUrl:', job?.audioUrl?.slice(0, 80) ?? 'NULL');
console.log('Job enableLipSync:', job?.enableLipSync);
console.log('');

const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));
scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

console.log('Scene | startTime | lipSync | status | hasLyrics');
for (const s of scenes) {
  const hasLyrics = s.lyrics && s.lyrics.trim().length > 0;
  console.log(`  ${s.sceneIndex}   | ${s.startTime}s        | ${s.lipSync}    | ${s.status} | ${hasLyrics}`);
}

await conn.end();
