import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { spawnSync } from 'child_process';
config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DB_URL = process.env.DATABASE_URL;

const conn = await createConnection(DB_URL);
const [scenes] = await conn.execute('SELECT videoUrl, startTime, duration FROM musicVideoScenes WHERE id = 990015');
const scene = scenes[0];

const videoUrl = scene.videoUrl;
// Use the CDN URL we just uploaded
const audioUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/tPvBCgRqfXpJzwEp.mp3';

console.log('Video URL:', videoUrl);
console.log('Audio URL:', audioUrl);

// Submit HeyGen V3 with the correct payload format
const payload = {
  video: { type: 'url', url: videoUrl },
  audio: { type: 'url', url: audioUrl },
  mode: 'precision',
  title: 'WizAI Scene 990015 Job 1080001 Retry3',
  enable_watermark: false,
  enable_caption: false,
  enable_dynamic_duration: false,
  keep_the_same_format: true,
  disable_music_track: false
};

console.log('Submitting to HeyGen V3...');
const submitResult = spawnSync('curl', [
  '-s',
  '-X', 'POST',
  'https://api.heygen.com/v3/lipsyncs',
  '-H', `X-Api-Key: ${HEYGEN_API_KEY}`,
  '-H', 'Content-Type: application/json',
  '-d', JSON.stringify(payload)
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
