import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [job] = await conn.query('SELECT id, characterImageUrl, audioUrl, vocalsUrl, title FROM musicVideoJobs WHERE id = 930003');
console.log('JOB:', JSON.stringify(job[0], null, 2));

const [scenes] = await conn.query(
  'SELECT id, sceneIndex, sceneType, lipSync, lyrics, startTime, duration, prompt, previewImageUrl FROM musicVideoScenes WHERE jobId = 930003 ORDER BY sceneIndex LIMIT 12'
);
scenes.forEach(s => {
  console.log(`SCENE ${s.sceneIndex}: type=${s.sceneType} lipSync=${s.lipSync} start=${s.startTime} dur=${s.duration} hasImg=${!!s.previewImageUrl} lyrics="${(s.lyrics||'').substring(0,60)}"`);
});

await conn.end();
