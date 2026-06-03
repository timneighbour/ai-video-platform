/**
 * Dispatch scene 810006 via WaveSpeed Seedance 2.0 i2v — direct API call
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
const WAVESPEED_API_BASE = 'https://api.wavespeed.ai/api/v3';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get scene 810006 and Zara's environment portrait
const [scenes] = await conn.execute('SELECT id, prompt, startTime, duration, sceneType FROM musicVideoScenes WHERE id=810006');
const [chars] = await conn.execute('SELECT environmentRefUrl, masterPortraitUrl FROM videoCharacters WHERE jobId=930003 LIMIT 1');

const scene = scenes[0];
const char = chars[0];
const imageUrl = char?.environmentRefUrl || char?.masterPortraitUrl;

console.log('Scene type:', scene.sceneType, 'startTime:', scene.startTime);
console.log('Image URL (first 80):', imageUrl?.slice(0, 80));
console.log('Prompt (first 120):', scene.prompt?.slice(0, 120));

if (!imageUrl) {
  console.error('ERROR: No reference image found');
  process.exit(1);
}

// Cancel old Fal.ai task and reset scene
await conn.execute('UPDATE musicVideoScenes SET mvSceneStatus="pending", taskId=NULL, videoUrl=NULL, lipSyncStatus="pending", lipSyncTaskId=NULL, lipSyncVideoUrl=NULL, updatedAt=NOW() WHERE id=810006');
await conn.execute('UPDATE providerJobLogs SET pjlStatus="cancelled" WHERE sceneId=810006');
console.log('Scene 810006 reset, old tasks cancelled');

// Build prompt — ensure Air Studios is explicit
const prompt = scene.prompt ||
  'Zara, stunning female vocalist, performing passionately inside Air Studios Lyndhurst Hall, grand orchestral hall, warm wood panelling, vaulted ceilings, dramatic overhead lighting, orchestra in background, 152 BPM, cinematic close-up, photorealistic, 4K';

// Submit to WaveSpeed Seedance 2.0-fast i2v
const body = {
  prompt,
  image: imageUrl,
  aspect_ratio: '16:9',
  duration: 5,
  resolution: '720p',
};

console.log('\nSubmitting to WaveSpeed Seedance 2.0-fast i2v...');
const resp = await fetch(`${WAVESPEED_API_BASE}/bytedance/seedance-2.0-fast/image-to-video`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await resp.text();
console.log('HTTP', resp.status, text.slice(0, 400));

let data;
try { data = JSON.parse(text); } catch { console.error('Failed to parse response'); process.exit(1); }

// WaveSpeed wraps in { code, message, data: { id, status, ... } }
const taskData = data?.data ?? data;
const taskId = taskData?.id;

if (!taskId) {
  console.error('No task ID in response:', JSON.stringify(data));
  process.exit(1);
}

console.log('\nWaveSpeed task ID:', taskId, 'status:', taskData?.status);

// Persist to DB
const dbTaskId = `wavespeed:i2v:${taskId}`;
await conn.execute(
  'UPDATE musicVideoScenes SET mvSceneStatus="generating", taskId=?, providerUsed="wavespeed", updatedAt=NOW() WHERE id=810006',
  [dbTaskId]
);
await conn.execute(
  'INSERT INTO providerJobLogs (jobId, sceneId, provider, providerJobId, idempotencyKey, pjlStatus, submissionReason, submittedAt, createdAt) VALUES (930003, 810006, "wavespeed", ?, ?, "submitted", "wavespeed_probe_dispatch", NOW(), NOW())',
  [taskId, `wavespeed:810006:${Date.now()}`]
);

console.log(`\nScene 810006 dispatched to WaveSpeed — DB taskId: ${dbTaskId}`);
await conn.end();
