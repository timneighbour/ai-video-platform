import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DB_URL = process.env.DATABASE_URL;

const conn = await createConnection(DB_URL);

// Get scene and job info
const [scenes] = await conn.execute('SELECT * FROM musicVideoScenes WHERE id = 990015');
const scene = scenes[0];
const startTime = scene.startTime; // 12
const duration = scene.duration;   // 6
const videoUrl = scene.videoUrl;

// Get vocal stem URL
const [jobs] = await conn.execute('SELECT stemVocalsUrl, audioUrl, vocalsUrl FROM musicVideoJobs WHERE id = 1080001');
const job = jobs[0];
const vocalUrl = job.stemVocalsUrl || job.vocalsUrl;
console.log('Vocal URL:', vocalUrl);
console.log('Scene startTime:', startTime, 'duration:', duration);
console.log('Video URL:', videoUrl);

// Download vocal stem
console.log('Downloading vocal stem...');
const vocalResp = await fetch(vocalUrl);
const vocalBuf = Buffer.from(await vocalResp.arrayBuffer());
fs.writeFileSync('/tmp/vocals-full.mp3', vocalBuf);
console.log('Downloaded:', vocalBuf.length, 'bytes');

// Check the audio file
const probeResult = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '/tmp/vocals-full.mp3'], { encoding: 'utf8' });
const probeData = JSON.parse(probeResult.stdout);
console.log('Audio format:', probeData.format?.format_name, 'duration:', probeData.format?.duration);

// Cut the clip using ffmpeg - use -ss before -i for accurate seeking, encode to proper mp3
const cutResult = spawnSync('ffmpeg', [
  '-y',
  '-ss', String(startTime),
  '-t', String(duration),
  '-i', '/tmp/vocals-full.mp3',
  '-acodec', 'libmp3lame',
  '-ar', '44100',
  '-ac', '1',
  '-b:a', '128k',
  '/tmp/vocals-clip.mp3'
], { encoding: 'utf8' });

if (cutResult.status !== 0) {
  console.error('ffmpeg error:', cutResult.stderr);
  process.exit(1);
}

const clipBuf = fs.readFileSync('/tmp/vocals-clip.mp3');
console.log('Cut audio clip:', clipBuf.length, 'bytes');

// Verify the clip
const clipProbe = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '/tmp/vocals-clip.mp3'], { encoding: 'utf8' });
const clipData = JSON.parse(clipProbe.stdout);
console.log('Clip duration:', clipData.format?.duration, 'size:', clipData.format?.size);

// Upload to HeyGen
console.log('Uploading audio clip to HeyGen...');
const formData = new FormData();
const blob = new Blob([clipBuf], { type: 'audio/mpeg' });
formData.append('file', blob, 'vocals-clip.mp3');
formData.append('type', 'audio');

const uploadResp = await fetch('https://upload.heygen.com/v1/asset', {
  method: 'POST',
  headers: { 'X-Api-Key': HEYGEN_API_KEY },
  body: formData
});
const uploadData = await uploadResp.json();
console.log('Upload response:', JSON.stringify(uploadData));

if (!uploadData.data?.url) {
  console.error('Upload failed');
  process.exit(1);
}

const audioAssetUrl = uploadData.data.url;
console.log('Audio asset URL:', audioAssetUrl);

// Submit HeyGen V3 lip sync
console.log('Submitting HeyGen V3 lip sync...');
const submitResp = await fetch('https://api.heygen.com/v3/lipsyncs', {
  method: 'POST',
  headers: {
    'X-Api-Key': HEYGEN_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: `WizAI Scene 990015 Job 1080001 Retry`,
    video_url: videoUrl,
    audio_url: audioAssetUrl,
    enable_lip_sync: true
  })
});
const submitData = await submitResp.json();
console.log('HeyGen response:', JSON.stringify(submitData, null, 2));

const lipSyncId = submitData.data?.lipsync_id;
if (!lipSyncId) {
  console.error('No lipsync_id in response');
  process.exit(1);
}

const taskId = `heygen:${lipSyncId}`;
console.log('HeyGen task ID:', taskId);

// Update DB
await conn.execute(
  `UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, lipSyncProvider='heygen' WHERE id=990015`,
  [taskId]
);
console.log('✅ DB updated — lip sync task submitted successfully');

await conn.end();
