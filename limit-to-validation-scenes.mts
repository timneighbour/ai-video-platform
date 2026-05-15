/**
 * Temporarily mark non-validation scenes as 'skipped' so the heartbeat
 * only dispatches scenes 3, 5, 7, 9 for the controlled validation render.
 * 
 * After validation is approved, run reset-all-scenes.mts to restore all 12.
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes } from './drizzle/schema.js';
import { eq, and, notInArray } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const VALIDATION_SCENE_INDICES = [3, 5, 7, 9];

// Get all scenes for job 540026
const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));

// Mark non-validation scenes as 'skipped' (a status the heartbeat won't dispatch)
const nonValidationScenes = scenes.filter(s => !VALIDATION_SCENE_INDICES.includes(s.sceneIndex));

for (const s of nonValidationScenes) {
  await db.update(musicVideoScenes).set({
    status: 'skipped' as any, // temporarily hold these scenes
    updatedAt: new Date()
  }).where(eq(musicVideoScenes.id, s.id));
}

console.log(`✓ Marked ${nonValidationScenes.length} scenes as 'skipped' (held for later)`);
console.log(`✓ Scenes ${VALIDATION_SCENE_INDICES.join(', ')} remain 'pending' — heartbeat will dispatch these`);
console.log('\nValidation scenes ready:');
const validationScenes = scenes.filter(s => VALIDATION_SCENE_INDICES.includes(s.sceneIndex));
for (const s of validationScenes.sort((a, b) => a.sceneIndex - b.sceneIndex)) {
  console.log(`  Scene ${s.sceneIndex}: startTime=${s.startTime}s, lipSync=${s.lipSync}`);
}

await conn.end();
