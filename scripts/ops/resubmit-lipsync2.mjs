import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { spawnSync } from 'child_process';
import fs from 'fs';
config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// The clip was already cut and verified: /tmp/vocals-clip.mp3 (6.03s, 97010 bytes)
// Try uploading using multipart/form-data with explicit boundary

const clipBuf = fs.readFileSync('/tmp/vocals-clip.mp3');
console.log('Clip size:', clipBuf.length, 'bytes');

// Try using curl to upload
const curlResult = spawnSync('curl', [
  '-s',
  '-X', 'POST',
  'https://upload.heygen.com/v1/asset',
  '-H', `X-Api-Key: ${HEYGEN_API_KEY}`,
  '-F', 'file=@/tmp/vocals-clip.mp3;type=audio/mpeg',
  '-F', 'type=audio'
], { encoding: 'utf8' });

console.log('Upload response:', curlResult.stdout);
console.log('Upload stderr:', curlResult.stderr);

const uploadData = JSON.parse(curlResult.stdout);
if (!uploadData.data?.url) {
  console.error('Upload failed:', uploadData);
  process.exit(1);
}

const audioAssetUrl = uploadData.data.url;
console.log('Audio asset URL:', audioAssetUrl);

// Get video URL from DB
const conn = await createConnection(DB_URL);
const [scenes] = await conn.execute('SELECT videoUrl FROM musicVideoScenes WHERE id = 990015');
const videoUrl = scenes[0].videoUrl;
console.log('Video URL:', videoUrl);

// Submit HeyGen V3 lip sync
console.log('Submitting HeyGen V3 lip sync...');
const submitResult = spawnSync('curl', [
  '-s',
  '-X', 'POST',
  'https://api.heygen.com/v3/lipsyncs',
  '-H', `X-Api-Key: ${HEYGEN_API_KEY}`,
  '-H', 'Content-Type: application/json',
  '-d', JSON.stringify({
    title: 'WizAI Scene 990015 Job 1080001 Retry2',
    video_url: videoUrl,
    audio_url: audioAssetUrl,
    enable_lip_sync: true
  })
], { encoding: 'utf8' });

console.log('Submit response:', submitResult.stdout);
const submitData = JSON.parse(submitResult.stdout);

const lipSyncId = submitData.data?.lipsync_id;
if (!lipSyncId) {
  console.error('No lipsync_id:', submitData);
  process.exit(1);
}

const taskId = `heygen:${lipSyncId}`;
console.log('HeyGen task ID:', taskId);

// Update DB
await conn.execute(
  `UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, lipSyncProvider='heygen' WHERE id=990015`,
  [taskId]
);
console.log('✅ DB updated');
await conn.end();
