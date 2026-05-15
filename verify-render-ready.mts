import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes, musicVideoJobs, videoCharacters } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));
const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));
const chars = await db.select().from(videoCharacters).where(eq(videoCharacters.jobId, 540026));

scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

console.log('=== JOB STATUS ===');
console.log(`  status: ${job?.status}`);
console.log(`  audioUrl: ${job?.audioUrl ? '✅ SET' : '❌ MISSING'}`);
console.log(`  characterImageUrl: ${job?.characterImageUrl ? '✅ SET' : '(using character table)'}`);

console.log('\n=== CHARACTER LOCK™ ===');
const zara = chars[0];
console.log(`  name: ${zara?.name}`);
console.log(`  masterPortraitUrl: ${zara?.masterPortraitUrl ? '✅ SET' : '❌ MISSING'}`);

console.log('\n=== SCENES ===');
let allPending = true;
for (const s of scenes) {
  const strategy = (s.lipSync && job?.audioUrl && s.startTime !== null) ? 'STRATEGY-1 (ref-to-video)' : 'STRATEGY-2 (img-to-video)';
  if (s.status !== 'pending') allPending = false;
  console.log(`  Scene ${s.sceneIndex}: ${s.status} | ${strategy} | startTime=${s.startTime}s`);
}

console.log(`\n${allPending ? '✅ All scenes pending — ready to render' : '⚠️ Some scenes not pending'}`);
console.log(`${job?.status === 'rendering' ? '✅ Job in rendering state' : `⚠️ Job status: ${job?.status}`}`);

await conn.end();
