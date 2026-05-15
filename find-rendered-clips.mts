import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 540026));
const withVideo = scenes.filter(s => s.videoUrl || s.lipSyncVideoUrl);

console.log(`Scenes with video URLs: ${withVideo.length}`);
for (const s of withVideo.sort((a,b) => a.sceneIndex - b.sceneIndex)) {
  console.log(`\nScene ${s.sceneIndex}:`);
  console.log(`  videoUrl: ${s.videoUrl ?? 'null'}`);
  console.log(`  lipSyncVideoUrl: ${s.lipSyncVideoUrl ?? 'null'}`);
  console.log(`  previewImageUrl: ${s.previewImageUrl ?? 'null'}`);
}

// Also show what image is being passed to Atlas Cloud
console.log('\n=== WHAT ATLAS CLOUD RECEIVES ===');
console.log('The heartbeat passes scene.previewImageUrl as the reference image to Atlas Cloud.');
console.log('Here are the storyboard images for all scenes:');
for (const s of scenes.sort((a,b) => a.sceneIndex - b.sceneIndex)) {
  console.log(`  Scene ${s.sceneIndex}: ${s.previewImageUrl ?? 'NULL - no storyboard image!'}`);
}

await conn.end();
