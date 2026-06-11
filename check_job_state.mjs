#!/usr/bin/env node
// Check job 1020003 state and scene details

import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse mysql://user:pass@host:port/db?ssl=...
const url = new URL(dbUrl);
const sslParam = url.searchParams.get('ssl');
let ssl = undefined;
if (sslParam) {
  try {
    ssl = JSON.parse(sslParam);
  } catch {
    ssl = { rejectUnauthorized: true };
  }
}

const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl,
});

// Job details
const [jobRows] = await conn.query(
  'SELECT id, audioUrl, stemVocalsUrl, vocalsUrl, vocalsStatus, status FROM musicVideoJobs WHERE id=1020003'
);
console.log('\n=== JOB 1020003 ===');
for (const row of jobRows) {
  console.log('id:', row.id);
  console.log('status:', row.status);
  console.log('vocalsStatus:', row.vocalsStatus);
  console.log('audioUrl:', row.audioUrl ? row.audioUrl.slice(0, 80) + '...' : null);
  console.log('stemVocalsUrl:', row.stemVocalsUrl ? row.stemVocalsUrl.slice(0, 80) + '...' : null);
  console.log('vocalsUrl:', row.vocalsUrl ? row.vocalsUrl.slice(0, 80) + '...' : null);
}

// Scene details
const [sceneRows] = await conn.query(
  'SELECT id, sceneIndex, startTime, duration, lipSync, lipSyncStatus, lipSyncTaskId, mvSceneStatus, videoUrl FROM musicVideoScenes WHERE jobId=1020003 ORDER BY sceneIndex'
);
console.log('\n=== SCENES ===');
for (const row of sceneRows) {
  const videoShort = row.videoUrl ? '✓' : '✗';
  console.log(`Scene ${row.sceneIndex} (id=${row.id}): mvStatus=${row.mvSceneStatus}, lipSync=${row.lipSync}, lipSyncStatus=${row.lipSyncStatus}, taskId=${row.lipSyncTaskId ?? 'null'}, video=${videoShort}, start=${row.startTime}s, dur=${row.duration}s`);
}

await conn.end();
