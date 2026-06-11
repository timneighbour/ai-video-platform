#!/usr/bin/env node
// Fix Scene 1 (mark done - instrumental, no vocals) and re-submit Scene 4 to HeyGen

import { createConnection } from 'mysql2/promise';
import axios from 'axios';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_BASE = 'https://api.heygen.com';

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
console.log('vocalsUrl:', job.vocalsUrl?.slice(0, 80));
console.log('stemVocalsUrl:', job.stemVocalsUrl);
console.log('audioUrl:', job.audioUrl?.slice(0, 80));

// Get scene details
const [sceneRows] = await conn.query(
  'SELECT id, sceneIndex, videoUrl, startTime, duration, lipSyncVideoUrl FROM musicVideoScenes WHERE id IN (900026, 900029) ORDER BY sceneIndex'
);

for (const scene of sceneRows) {
  console.log(`\nScene ${scene.sceneIndex} (id=${scene.id}): videoUrl=${scene.videoUrl?.slice(0, 60)}, start=${scene.startTime}s, dur=${scene.duration}s`);
}

// ── SCENE 1 (id=900026): Instrumental section — mark as done with original video ──
// Audio check confirmed: vocal stem at 6-12s is -74.9 dB (near-silent, no singing)
// This is an instrumental intro section — no lip-sync needed
const scene1 = sceneRows.find(s => s.id === 900026);
if (scene1) {
  console.log('\n=== SCENE 1: Marking as done (instrumental — no vocals at 6-12s) ===');
  if (!scene1.videoUrl) {
    console.log('ERROR: Scene 1 has no videoUrl!');
  } else {
    // Use the original rendered video as the final output (no lip-sync)
    await conn.query(
      `UPDATE musicVideoScenes SET 
        lipSyncStatus='done', 
        lipSyncVideoUrl=?,
        lipSync=0,
        lipSyncTaskId=NULL,
        updatedAt=NOW() 
       WHERE id=900026`,
      [scene1.videoUrl]
    );
    console.log('✅ Scene 1 marked as done (using original video, lipSync=false)');
    console.log('   videoUrl:', scene1.videoUrl?.slice(0, 80));
  }
}

// ── SCENE 4 (id=900029): Re-submit to HeyGen with vocal stem audio ──
// Audio check confirmed: vocal stem at 24-30s is -22.0 dB (strong vocals)
// Previous failure "No speaker detected" was likely due to face detection issue in video
// Re-submit with the full mix audio as fallback (HeyGen uses audio for timing reference)
const scene4 = sceneRows.find(s => s.id === 900029);
if (scene4 && HEYGEN_API_KEY) {
  console.log('\n=== SCENE 4: Re-submitting to HeyGen ===');
  
  if (!scene4.videoUrl) {
    console.log('ERROR: Scene 4 has no videoUrl!');
  } else {
    // Use vocal stem (has strong audio at 24-30s)
    const stemSource = job.vocalsUrl || job.audioUrl;
    console.log('Using audio source:', stemSource?.slice(0, 80));
    
    // Download vocal stem and extract scene 4 clip (24-30s)
    const tmpDir = '/tmp/scene4_fix';
    fs.mkdirSync(tmpDir, { recursive: true });
    
    // Download vocals
    console.log('Downloading vocal stem...');
    const vocalsFile = path.join(tmpDir, 'vocals.mp3');
    await downloadFile(stemSource, vocalsFile);
    console.log('Downloaded:', vocalsFile, fs.statSync(vocalsFile).size, 'bytes');
    
    // Extract scene 4 audio clip (24-30s)
    const audioClipFile = path.join(tmpDir, `scene4_audio_${Date.now()}.mp3`);
    console.log('Extracting audio clip (24-30s)...');
    execSync(`ffmpeg -y -i "${vocalsFile}" -ss 24 -t 6 -c:a libmp3lame -q:a 2 "${audioClipFile}" 2>/dev/null`);
    console.log('Audio clip:', audioClipFile, fs.statSync(audioClipFile).size, 'bytes');
    
    // Check audio level of extracted clip
    const levelOut = execSync(`ffmpeg -i "${audioClipFile}" -af "volumedetect" -f null /dev/null 2>&1 | grep -E "mean_volume|max_volume"`).toString();
    console.log('Audio levels:', levelOut.trim());
    
    // Upload audio clip to S3
    console.log('Uploading audio clip to S3...');
    const { storagePut } = await import('./server/storage.js');
    const audioKey = `music-video-scenes/900029-audio-retry3-${Date.now()}.mp3`;
    const audioBuf = fs.readFileSync(audioClipFile);
    const { url: audioClipUrl } = await storagePut(audioKey, audioBuf, 'audio/mpeg');
    console.log('Audio clip URL:', audioClipUrl?.slice(0, 80));
    
    // Download and mux audio into video
    console.log('Downloading scene 4 video...');
    const videoFile = path.join(tmpDir, `scene4_video_${Date.now()}.mp4`);
    await downloadFile(scene4.videoUrl, videoFile);
    console.log('Video:', videoFile, fs.statSync(videoFile).size, 'bytes');
    
    // Mux audio into video
    const muxedFile = path.join(tmpDir, `scene4_muxed_${Date.now()}.mp4`);
    console.log('Muxing audio into video...');
    execSync(`ffmpeg -y -i "${videoFile}" -i "${audioClipFile}" -c:v copy -c:a aac -shortest "${muxedFile}" 2>/dev/null`);
    console.log('Muxed:', muxedFile, fs.statSync(muxedFile).size, 'bytes');
    
    // Upload muxed video to S3
    console.log('Uploading muxed video to S3...');
    const videoKey = `music-video-scenes/900029-muxed-retry3-${Date.now()}.mp4`;
    const videoBuf = fs.readFileSync(muxedFile);
    const { url: muxedVideoUrl } = await storagePut(videoKey, videoBuf, 'video/mp4');
    console.log('Muxed video URL:', muxedVideoUrl?.slice(0, 80));
    
    // Submit to HeyGen
    console.log('Submitting to HeyGen Precision...');
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
      console.log('✅ HeyGen task submitted:', lipsyncId);
      
      // Update DB
      await conn.query(
        `UPDATE musicVideoScenes SET 
          lipSyncStatus='processing', 
          lipSyncTaskId=?,
          updatedAt=NOW() 
         WHERE id=900029`,
        [`heygen:${lipsyncId}`]
      );
      console.log('✅ DB updated: heygen:' + lipsyncId);
    } else {
      console.error('❌ HeyGen submission failed:', JSON.stringify(data));
    }
  }
} else if (!HEYGEN_API_KEY) {
  console.error('HEYGEN_API_KEY not set');
}

await conn.end();
console.log('\nDone.');

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
