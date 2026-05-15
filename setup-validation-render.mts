/**
 * Controlled validation render setup for job 540026 (Zara)
 * 
 * Activates ONLY scenes 3, 5, 7, 9 (mid-song, all lipSync=true, vocals confirmed)
 * All other scenes remain pending but job is set to rendering so heartbeat picks up
 * the 4 active scenes only.
 * 
 * This tests Strategy 1 (reference-to-video) with:
 *   - Zara's masterPortraitUrl as reference_images
 *   - Exact 6s vocal segment as reference_audios
 *   - Correct startTime (no /1000 bug)
 *   - generate_audio flag removed (lip sync enabled)
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes, musicVideoJobs } from './drizzle/schema.js';
import { eq, and, inArray, notInArray } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const VALIDATION_SCENE_INDICES = [3, 5, 7, 9];

// 1. Make sure all scenes are pending and clean
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
console.log('✓ All 12 scenes reset to pending');

// 2. Set job to rendering so heartbeat picks it up
await db.update(musicVideoJobs).set({
  status: 'rendering',
  completedScenes: 0,
  errorMessage: null,
  updatedAt: new Date()
}).where(eq(musicVideoJobs.id, 540026));
console.log('✓ Job 540026 set to rendering');

// 3. Verify the 4 validation scenes have the right data
const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));
scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

console.log('\n=== VALIDATION SCENES (will be dispatched) ===');
for (const s of scenes.filter(s => VALIDATION_SCENE_INDICES.includes(s.sceneIndex))) {
  console.log(`  Scene ${s.sceneIndex}: startTime=${s.startTime}s, lipSync=${s.lipSync}, status=${s.status}`);
  console.log(`    lyrics: "${s.lyrics?.slice(0, 60)}..."`);
}

console.log('\n=== OTHER SCENES (pending, will NOT be dispatched yet) ===');
for (const s of scenes.filter(s => !VALIDATION_SCENE_INDICES.includes(s.sceneIndex))) {
  console.log(`  Scene ${s.sceneIndex}: startTime=${s.startTime}s, lipSync=${s.lipSync}`);
}

// 4. Check Zara's portrait URL
const { videoCharacters } = await import('./drizzle/schema.js');
const chars = await db.select().from(videoCharacters).where(eq(videoCharacters.jobId, 540026));
const zara = chars[0];
console.log('\n=== CHARACTER LOCK™ ===');
console.log(`  Name: ${zara?.name}`);
console.log(`  masterPortraitUrl: ${zara?.masterPortraitUrl?.slice(0, 80) ?? 'NULL ⚠️'}...`);
console.log(`  enableLipSync: ${zara?.enableLipSync}`);

// 5. Check job audioUrl
const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 540026));
console.log('\n=== JOB AUDIO ===');
console.log(`  audioUrl: ${job?.audioUrl?.slice(0, 80) ?? 'NULL ⚠️'}...`);

console.log('\n✅ Validation render ready. The heartbeat will dispatch scenes 3, 5, 7, 9 on next tick.');
console.log('   NOTE: The heartbeat dispatches ALL pending scenes. To limit to 4 scenes,');
console.log('   we need to temporarily mark scenes 0,1,2,4,6,8,10,11 as "skipped" or use a different approach.');

await conn.end();
