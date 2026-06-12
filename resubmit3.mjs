import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { spawnSync } from 'child_process';
import fs from 'fs';
config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DB_URL = process.env.DATABASE_URL;

const conn = await createConnection(DB_URL);
const [scenes] = await conn.execute('SELECT videoUrl, startTime, duration FROM musicVideoScenes WHERE id = 990015');
const scene = scenes[0];
const [jobs] = await conn.execute('SELECT stemVocalsUrl, vocalsUrl FROM musicVideoJobs WHERE id = 1080001');
const job = jobs[0];

const videoUrl = scene.videoUrl;
const vocalUrl = job.stemVocalsUrl || job.vocalsUrl;
const startTime = Number(scene.startTime);
const duration = Number(scene.duration);

console.log('Video URL:', videoUrl);
console.log('Vocal URL:', vocalUrl);
console.log('startTime:', startTime, 'duration:', duration);

// The vocal stem is the FULL track. We need to upload a trimmed clip.
// But HeyGen takes a URL, not a file. We need to upload the trimmed clip to S3 first.
// Let's use the storagePut approach — but we're in a script, so let's upload to the Manus CDN.

// First, cut the audio
const cutResult = spawnSync('ffmpeg', [
  '-y',
  '-ss', String(startTime),
  '-t', String(duration),
  '-i', '/tmp/vocals-full.mp3',
  '-acodec', 'libmp3lame',
  '-ar', '44100',
  '-ac', '1',
  '-b:a', '128k',
  '/tmp/vocals-clip-v2.mp3'
], { encoding: 'utf8' });

if (cutResult.status !== 0) {
  console.error('ffmpeg error:', cutResult.stderr);
  process.exit(1);
}

const clipBuf = fs.readFileSync('/tmp/vocals-clip-v2.mp3');
console.log('Clip size:', clipBuf.length, 'bytes');

// Upload to Manus CDN using manus-upload-file
const uploadResult = spawnSync('manus-upload-file', ['/tmp/vocals-clip-v2.mp3'], { encoding: 'utf8' });
console.log('Upload stdout:', uploadResult.stdout);
console.log('Upload stderr:', uploadResult.stderr);

const audioUrl = uploadResult.stdout.trim().split('\n').pop();
console.log('Audio CDN URL:', audioUrl);

if (!audioUrl || !audioUrl.startsWith('http')) {
  console.error('Upload failed');
  process.exit(1);
}

// Now submit HeyGen V3 with the correct payload format
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
