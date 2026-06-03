import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [[job]] = await conn.query('SELECT status, probePassed, probeSceneId, probeVideoUrl, stemVocalsUrl, transcriptionStatus, sceneSetting FROM musicVideoJobs WHERE id = 870022');
console.log('=== JOB 870022 ===');
console.log('status:', job.status);
console.log('probePassed:', job.probePassed);
console.log('probeSceneId:', job.probeSceneId);
console.log('probeVideoUrl:', job.probeVideoUrl ? 'SET (' + String(job.probeVideoUrl).slice(0,60) + '...)' : 'NULL');
console.log('stemVocalsUrl:', job.stemVocalsUrl ? 'SET' : 'NULL');
console.log('transcriptionStatus:', job.transcriptionStatus);
console.log('sceneSetting:', job.sceneSetting);


const [chars] = await conn.query('SELECT characterName, masterPortraitUrl, environmentRefUrl, autoPrepStatus FROM videoCharacters WHERE jobId = 870022');
console.log('\n=== CHARACTERS ===');
for (const c of chars) {
  console.log(`  ${c.characterName}: masterPortrait=${c.masterPortraitUrl ? 'SET' : 'NULL'}, envRef=${c.environmentRefUrl ? 'SET (' + String(c.environmentRefUrl).slice(0,60) + '...)' : 'NULL'}, autoPrepStatus=${c.autoPrepStatus}`);
}

const [scenes] = await conn.query('SELECT sceneIndex, sceneType, mvSceneStatus, taskId, lyrics, lipSync, startTime, duration FROM musicVideoScenes WHERE jobId = 870022 ORDER BY sceneIndex LIMIT 12');
console.log(`\n=== SCENES (${scenes.length} total) ===`);
for (const s of scenes) {
  const lyricsSnip = s.lyrics ? String(s.lyrics).slice(0, 50) + '...' : 'NULL';
  const taskSnip = s.taskId ? String(s.taskId).slice(0, 35) + '...' : 'NULL';
  console.log(`  [${s.sceneIndex}] ${s.sceneType} | ${s.startTime}s-${Number(s.startTime)+Number(s.duration)}s | status=${s.mvSceneStatus} | lipSync=${s.lipSync} | taskId=${taskSnip} | lyrics=${lyricsSnip}`);
}

await conn.end();
