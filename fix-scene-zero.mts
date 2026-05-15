import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes, musicVideoJobs, videoCharacters } from './drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

// Fix the broken task ID for scene 0
const correctTaskId = 'atlas:05e13bcf80094acc924b85a21497a0a1';
await db.update(musicVideoScenes).set({
  taskId: correctTaskId,
  updatedAt: new Date(),
}).where(and(eq(musicVideoScenes.jobId, 540026), eq(musicVideoScenes.sceneIndex, 0)));
console.log('Fixed task ID for scene 0:', correctTaskId);

// Check the job for characterImageUrl
const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));
console.log('\nJob 540026 fields:');
console.log('  characterImageUrl:', job?.characterImageUrl ?? 'NULL');
console.log('  status:', job?.status);
console.log('  enableLipSync:', job?.enableLipSync);

// Check videoCharacters for this job
const chars = await db.select().from(videoCharacters).where(eq(videoCharacters.jobId, 540026));
console.log('\nVideoCharacters for job 540026:', chars.length);
for (const c of chars) {
  console.log(`  Character ${c.id}: name=${c.name}, imageUrl=${c.imageUrl?.slice(0, 80)}...`);
}

await conn.end();
