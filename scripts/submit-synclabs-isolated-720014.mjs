/**
 * Submit SyncLabs for probe scene 720014 using the uploaded isolated vocal clip
 */
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const SYNCLABS_API_KEY = process.env.SYNC_LABS_API_KEY;

const SCENE_ID = 720014;
const JOB_ID = 720001;

// Confirmed working URLs
const RAW_VIDEO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/720014-1779426252004.mp4';
// Isolated Demucs vocals, 6-12s window, uploaded to CDN
const ISOLATED_VOCAL_CLIP_URL = 'https://aivideoplatform-aljhdnsu.manus.space/manus-storage/probe-720014-isolated-vocals-1779427702816_1de11f16.mp3';

console.log('=== SyncLabs Submission: Scene 720014 — Isolated Vocals ===');
console.log('');
console.log('Payload:');
console.log('  Video (raw Seedance):', RAW_VIDEO_URL);
console.log('  Audio (isolated Demucs vocals, 6-12s):', ISOLATED_VOCAL_CLIP_URL);
console.log('  Model: sync-3');
console.log('  sync_mode: cut_off');
console.log('  temperature: 1.0');
console.log('  occlusion_detection: true');
console.log('');

// Verify audio URL is accessible
console.log('Verifying audio URL...');
const checkRes = await fetch(ISOLATED_VOCAL_CLIP_URL, { method: 'HEAD' });
console.log('  Audio URL HTTP status:', checkRes.status);
if (checkRes.status !== 200) {
  console.error('❌ Audio URL not accessible! Cannot proceed.');
  process.exit(1);
}
console.log('  ✅ Audio URL confirmed accessible');
console.log('');

// Verify video URL is accessible
const videoCheck = await fetch(RAW_VIDEO_URL, { method: 'HEAD' });
console.log('Video URL HTTP status:', videoCheck.status);
if (videoCheck.status !== 200) {
  console.error('❌ Video URL not accessible!');
  process.exit(1);
}
console.log('  ✅ Video URL confirmed accessible');
console.log('');

// Submit to SyncLabs
const payload = {
  model: 'sync-3',
  input: [
    { type: 'video', url: RAW_VIDEO_URL },
    { type: 'audio', url: ISOLATED_VOCAL_CLIP_URL },
  ],
  options: {
    sync_mode: 'cut_off',
    temperature: 1.0,
    occlusion_detection_enabled: true,
  },
  webhookUrl: null,
};

console.log('Submitting to SyncLabs...');
const res = await fetch('https://api.sync.so/v2/generate', {
  method: 'POST',
  headers: {
    'x-api-key': SYNCLABS_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

console.log('HTTP status:', res.status);
const data = await res.json();
console.log('Response:', JSON.stringify(data, null, 2));

if (res.ok && data.id) {
  console.log('');
  console.log('✅ SyncLabs submission SUCCEEDED');
  console.log('  Task ID:', data.id);
  console.log('  Status:', data.status);
  
  // Update database
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.execute(
    "UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, lipSyncVideoUrl=NULL, updatedAt=NOW() WHERE id=?",
    [data.id, SCENE_ID]
  );
  await conn.execute(
    "UPDATE musicVideoJobs SET probeVideoUrl=NULL WHERE id=?",
    [JOB_ID]
  );
  console.log('  Database updated: scene', SCENE_ID, 'lipSyncTaskId =', data.id);
  await conn.end();
  
  console.log('');
  console.log('=== Submission Summary ===');
  console.log('  SyncLabs Task ID:', data.id);
  console.log('  Audio source: ISOLATED DEMUCS VOCALS (6-12s window)');
  console.log('  Timing: startTimeSec=6 (no /1000 division — fix applied)');
  console.log('  Expected completion: ~2-5 minutes');
  console.log('  Poll URL: https://api.sync.so/v2/generate/' + data.id);
} else {
  console.error('❌ SyncLabs submission FAILED');
  process.exit(1);
}
