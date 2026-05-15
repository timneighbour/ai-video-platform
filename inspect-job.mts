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

// Storyboard preview images are stored on each scene as previewImageUrl

scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

console.log('=== JOB ===');
console.log(`  title: ${job?.title}`);
console.log(`  status: ${job?.status}`);
console.log(`  audioUrl: ${job?.audioUrl}`);

console.log('\n=== CHARACTER ===');
const zara = chars[0];
console.log(`  name: ${zara?.name}`);
console.log(`  masterPortraitUrl: ${zara?.masterPortraitUrl}`);
console.log(`  referencePhotoBase64 length: ${zara?.referencePhotoBase64?.length ?? 0} chars`);

console.log('\n=== SCENES (with video URLs) ===');
for (const s of scenes) {
  console.log(`\nScene ${s.sceneIndex} [${s.status}] startTime=${s.startTime}s lipSync=${s.lipSync}`);
  console.log(`  prompt: ${s.prompt?.slice(0, 120)}`);
  console.log(`  lyrics: ${s.lyrics?.slice(0, 80)}`);
  console.log(`  videoUrl: ${s.videoUrl ?? 'null'}`);
  console.log(`  lipSyncVideoUrl: ${s.lipSyncVideoUrl ?? 'null'}`);
  console.log(`  taskId: ${s.taskId ?? 'null'}`);
  console.log(`  errorMessage: ${s.errorMessage ?? 'none'}`);
}

console.log('\n=== STORYBOARD PREVIEW IMAGES ===');
for (const s of scenes) {
  console.log(`  Scene ${s.sceneIndex}: previewImageUrl=${s.previewImageUrl ?? 'null'}`);
}

await conn.end();
