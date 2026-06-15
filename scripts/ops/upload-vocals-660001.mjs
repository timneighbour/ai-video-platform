/**
 * Upload Demucs-isolated vocals for Job 660001 to S3 via the Forge API,
 * then store the URL in sceneAudioUrl for all performance/lipSync scenes.
 */
import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';
// Node 22 has built-in FormData, Blob, and fetch

const VOCALS_PATH = '/tmp/demucs-660001-mv9o8fpc/separated/htdemucs/song/vocals.mp3';

if (!fs.existsSync(VOCALS_PATH)) {
  console.error('ERROR: vocals.mp3 not found at', VOCALS_PATH);
  process.exit(1);
}

const fileSize = fs.statSync(VOCALS_PATH).size;
console.log(`[Upload] Vocals file: ${VOCALS_PATH} (${fileSize} bytes)`);

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_URL || !FORGE_KEY) {
  console.error('ERROR: BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set');
  process.exit(1);
}

const key = `music-video-audio/660001-vocals-demucs-${Date.now()}.mp3`;
const uploadUrl = `${FORGE_URL}/v1/storage/upload?path=${encodeURIComponent(key)}`;

console.log('[Upload] Uploading to Forge storage:', uploadUrl.slice(0, 80));

const buf = fs.readFileSync(VOCALS_PATH);
const form = new FormData();
form.set('file', new Blob([buf], { type: 'audio/mpeg' }), 'vocals.mp3');

const resp = await fetch(uploadUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${FORGE_KEY}` },
  body: form,
});

if (!resp.ok) {
  const text = await resp.text().catch(() => resp.statusText);
  console.error(`[Upload] FAILED ${resp.status}: ${text}`);
  process.exit(1);
}

const json = await resp.json();
const vocalUrl = json.url;
console.log('[Upload] Vocals URL:', vocalUrl);

// Store in DB
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Update all performance/lipSync scenes for Job 660001
const [result1] = await conn.execute(
  "UPDATE musicVideoScenes SET sceneAudioUrl = ? WHERE jobId = 660001 AND (sceneType = 'performance' OR lipSync = 1)",
  [vocalUrl]
);
console.log(`[DB] Updated ${result1.affectedRows} scenes with vocal URL`);

// Reset Scene 1 lip sync to pending
const [result2] = await conn.execute(
  "UPDATE musicVideoScenes SET lipSyncStatus = 'pending', lipSyncTaskId = NULL, lipSyncVideoUrl = NULL, lipSyncVideoKey = NULL, updatedAt = NOW() WHERE id = 660002"
);
console.log(`[DB] Reset Scene 1 lip sync to pending: ${result2.affectedRows} rows`);

// Clear probe video URL so it gets updated with the new lip sync result
const [result3] = await conn.execute(
  "UPDATE musicVideoJobs SET probeVideoUrl = NULL, updatedAt = NOW() WHERE id = 660001"
);
console.log(`[DB] Cleared probe video URL: ${result3.affectedRows} rows`);

await conn.end();
console.log('[Done] Isolated vocals stored. Scene 1 will re-submit to SyncLabs on next heartbeat.');
console.log(`VOCAL_URL=${vocalUrl}`);
