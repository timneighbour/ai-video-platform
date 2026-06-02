import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load env
try { dotenv.config({ path: '.env' }); } catch {}
const dbUrl = process.env.DATABASE_URL;

const conn = await mysql.createConnection(dbUrl);

// Check job lyrics and transcriptionSegments
const [jobs] = await conn.execute(
  'SELECT id, lyrics, transcriptionSegments, transcriptionStatus, lyricsStatus FROM musicVideoJobs WHERE id = 870022'
);
const job = jobs[0];
console.log('lyricsStatus:', job.lyricsStatus);
console.log('transcriptionStatus:', job.transcriptionStatus);

if (job.lyrics) {
  const lyr = JSON.parse(job.lyrics);
  console.log('\nlyricsField type:', Array.isArray(lyr) ? 'array' : typeof lyr);
  console.log('lyrics count:', Array.isArray(lyr) ? lyr.length : 'N/A');
  console.log('first 3 lyrics entries:', JSON.stringify(lyr.slice(0, 3), null, 2));
} else {
  console.log('\nNo job.lyrics set');
}

if (job.transcriptionSegments) {
  const segs = JSON.parse(job.transcriptionSegments);
  console.log('\ntranscriptionSegments count:', segs.length);
  console.log('first 3 segments:', JSON.stringify(segs.slice(0, 3), null, 2));
} else {
  console.log('\nNo transcriptionSegments set');
}

// Check scene lyrics
const [scenes] = await conn.execute(
  'SELECT id, sceneIndex, startTime, duration, lyrics FROM musicVideoScenes WHERE jobId = 870022 ORDER BY sceneIndex LIMIT 8'
);
console.log('\nScene lyrics:');
for (const s of scenes) {
  console.log(`  Scene ${s.id} idx=${s.sceneIndex} start=${s.startTime}s dur=${s.duration}s lyrics=${s.lyrics ? s.lyrics.slice(0, 100) : 'null'}`);
}

await conn.end();
