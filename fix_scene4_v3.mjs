#!/usr/bin/env node
// Re-submit Scene 4 to HeyGen with correct audio (vocal stem at 24-30s)

import { createConnection } from 'mysql2/promise';
import axios from 'axios';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_BASE = 'https://api.heygen.com';
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!HEYGEN_API_KEY) { console.error('HEYGEN_API_KEY not set'); process.exit(1); }
if (!FORGE_API_URL || !FORGE_API_KEY) { console.error('FORGE credentials not set'); process.exit(1); }

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);
const sslParam = url.searchParams.get('ssl');
let ssl = undefined;
if (sslParam) {
  try { ssl = JSON.parse(sslParam); } catch { ssl = { rejectUnauthorized: true }; }
}

const conn = await createConnection({
  host: url.hostname, port: parseInt(url.port || '3306'),
  user: url.username, password: url.password,
  database: url.pathname.slice(1), ssl,
});

// Get job audio info
const [jobRows] = await conn.query('SELECT audioUrl, stemVocalsUrl, vocalsUrl FROM musicVideoJobs WHERE id=1020003');
const job = jobRows[0];

// Get scene 4 details
const [sceneRows] = await conn.query('SELECT id, sceneIndex, videoUrl, startTime, duration FROM musicVideoScenes WHERE id=900029');
const scene4 = sceneRows[0];
console.log('Scene 4:', scene4);

const stemSource = job.vocalsUrl || job.audioUrl;
console.log('Audio source:', stemSource?.slice(0, 80));

const tmpDir = '/tmp/scene4_fix_v3';
fs.mkdirSync(tmpDir, { recursive: true });

// Download vocal stem
console.log('\n1. Downloading vocal stem...');
const vocalsFile = path.join(tmpDir, 'vocals.mp3');
await downloadFile(stemSource, vocalsFile);
console.log('   Downloaded:', fs.statSync(vocalsFile).size, 'bytes');

// Extract scene 4 audio clip (24-30s)
const audioClipFile = path.join(tmpDir, `scene4_audio_${Date.now()}.mp3`);
console.log('\n2. Extracting audio clip (24-30s)...');
execSync(`ffmpeg -y -i "${vocalsFile}" -ss 24 -t 6 -c:a libmp3lame -q:a 2 "${audioClipFile}" 2>/dev/null`);
const levelOut = execSync(`ffmpeg -i "${audioClipFile}" -af "volumedetect" -f null /dev/null 2>&1 | grep -E "mean_volume|max_volume"`).toString().trim();
console.log('   Audio levels:', levelOut);

// Upload audio clip to Forge storage
console.log('\n3. Uploading audio clip to storage...');
const audioKey = `music-video-scenes/900029-audio-retry3-${Date.now()}.mp3`;
const audioClipUrl = await uploadToForge(audioClipFile, audioKey, 'audio/mpeg');
console.log('   Audio URL:', audioClipUrl?.slice(0, 80));

// Download scene 4 video
console.log('\n4. Downloading scene 4 video...');
const videoFile = path.join(tmpDir, `scene4_video_${Date.now()}.mp4`);
await downloadFile(scene4.videoUrl, videoFile);
console.log('   Downloaded:', fs.statSync(videoFile).size, 'bytes');

// Mux audio into video
const muxedFile = path.join(tmpDir, `scene4_muxed_${Date.now()}.mp4`);
console.log('\n5. Muxing audio into video...');
execSync(`ffmpeg -y -i "${videoFile}" -i "${audioClipFile}" -c:v copy -c:a aac -shortest "${muxedFile}" 2>/dev/null`);
console.log('   Muxed:', fs.statSync(muxedFile).size, 'bytes');

// Upload muxed video to Forge storage
console.log('\n6. Uploading muxed video to storage...');
const videoKey = `music-video-scenes/900029-muxed-retry3-${Date.now()}.mp4`;
const muxedVideoUrl = await uploadToForge(muxedFile, videoKey, 'video/mp4');
console.log('   Muxed video URL:', muxedVideoUrl?.slice(0, 80));

// Submit to HeyGen
console.log('\n7. Submitting to HeyGen Precision...');
const payload = {
  video: { type: 'url', url: muxedVideoUrl },
  audio: { type: 'url', url: audioClipUrl },
  mode: 'precision',
  title: `WizAI Scene 900029 Job 1020003 Retry3`,
  enable_watermark: false,
  enable_caption: false,
  enable_dynamic_duration: false,
  keep_the_same_format: true,
  disable_music_track: false,
};

const response = await axios.post(
  `${HEYGEN_API_BASE}/v3/lipsyncs`,
  payload,
  {
    headers: { 'X-Api-Key': HEYGEN_API_KEY, 'Content-Type': 'application/json' },
    timeout: 30_000,
  }
);

const data = response.data;
console.log('HeyGen response:', JSON.stringify(data, null, 2));

if (data?.data?.lipsync_id) {
  const lipsyncId = data.data.lipsync_id;
  console.log('\n✅ HeyGen task submitted:', lipsyncId);
  
  // Update DB
  await conn.query(
    `UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, updatedAt=NOW() WHERE id=900029`,
    [`heygen:${lipsyncId}`]
  );
  console.log('✅ DB updated: heygen:' + lipsyncId);
} else {
  console.error('❌ HeyGen submission failed:', JSON.stringify(data));
}

await conn.end();
console.log('\nDone.');

// ── Helpers ──────────────────────────────────────────────────────────────────

async function uploadToForge(filePath, key, contentType) {
  const baseUrl = FORGE_API_URL.replace(/\/+$/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', key);
  
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  // Use native FormData with Blob (same as storage.ts)
  const blob = new Blob([fileBuffer], { type: contentType });
  const form = new FormData();
  form.append('file', blob, fileName);
  
  const response = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${msg}`);
  }
  
  const result = await response.json();
  if (result?.url) return result.url;
  if (result?.data?.url) return result.data.url;
  
  throw new Error('Could not determine upload URL from response: ' + JSON.stringify(result));
}

async function downloadFile(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    const proto = fileUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(fileUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      try { fs.unlinkSync(dest); } catch {}
      reject(err);
    });
  });
}
