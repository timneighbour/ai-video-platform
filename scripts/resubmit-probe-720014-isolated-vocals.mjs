/**
 * Re-submit probe scene 720014 to SyncLabs with ISOLATED DEMUCS VOCALS
 * 
 * Corrects the audio routing bug where the previous submission used
 * a full-mix scene audio clip instead of the isolated vocal stem.
 * 
 * Payload:
 *   video: raw Seedance clip for scene 720014
 *   audio: 6-12s window cut from Demucs isolated vocals stem
 */
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
config();

const SYNCLABS_API_KEY = process.env.SYNC_LABS_API_KEY;
const BUILT_IN_FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const BUILT_IN_FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

// Scene 720014 data (confirmed from DB)
const SCENE_ID = 720014;
const JOB_ID = 720001;
const START_TIME_SEC = 6;   // seconds (NOT milliseconds — timing fix applied)
const DURATION_SEC = 6;
const RAW_VIDEO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/720014-1779426252004.mp4';
const ISOLATED_VOCALS_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/micetSvcmTnoavVM.mp3';

console.log('=== Probe Re-submission: Scene 720014 with Isolated Vocals ===');
console.log('Scene:', SCENE_ID, '| Job:', JOB_ID);
console.log('Start:', START_TIME_SEC + 's | Duration:', DURATION_SEC + 's');
console.log('Video:', RAW_VIDEO_URL);
console.log('Vocal stem:', ISOLATED_VOCALS_URL);
console.log('');

// Step 1: Download the isolated vocal stem
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-resubmit-'));
const stemPath = path.join(tmpDir, 'isolated-vocals.mp3');
const clippedPath = path.join(tmpDir, `scene-${SCENE_ID}-vocals-${START_TIME_SEC}s.mp3`);

console.log('Step 1: Downloading isolated vocal stem...');
execSync(`curl -L -o "${stemPath}" "${ISOLATED_VOCALS_URL}" -s`, { stdio: 'inherit' });
const stemSize = fs.statSync(stemPath).size;
console.log(`  Downloaded: ${(stemSize / 1024).toFixed(1)} KB`);

// Step 2: Cut the exact scene window (6-12s) from the stem
console.log(`Step 2: Cutting ${START_TIME_SEC}s–${START_TIME_SEC + DURATION_SEC}s from isolated vocals...`);
execSync(
  `ffmpeg -i "${stemPath}" -ss ${START_TIME_SEC} -t ${DURATION_SEC} -acodec libmp3lame -q:a 2 "${clippedPath}" -y`,
  { stdio: 'pipe' }
);
const clippedSize = fs.statSync(clippedPath).size;
console.log(`  Clipped audio: ${(clippedSize / 1024).toFixed(1)} KB`);

// Verify the clip duration
const durationOut = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${clippedPath}"`).toString().trim();
console.log(`  Confirmed duration: ${parseFloat(durationOut).toFixed(2)}s`);

// Step 3: Upload the clipped audio to S3 via Manus storage API
console.log('Step 3: Uploading clipped vocal audio to S3...');
const audioBuffer = fs.readFileSync(clippedPath);
const uploadKey = `music-video-scene-audio/${SCENE_ID}-isolated-vocals-resubmit-${Date.now()}.mp3`;

const uploadRes = await fetch(`${BUILT_IN_FORGE_API_URL}/storage/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BUILT_IN_FORGE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    key: uploadKey,
    data: audioBuffer.toString('base64'),
    contentType: 'audio/mpeg',
  }),
});

if (!uploadRes.ok) {
  // Try alternative: use presigned URL upload
  console.log('  Direct upload failed, trying presigned URL...');
  const presignRes = await fetch(`${BUILT_IN_FORGE_API_URL}/storage/presign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUILT_IN_FORGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: uploadKey, contentType: 'audio/mpeg' }),
  });
  
  if (presignRes.ok) {
    const { uploadUrl, publicUrl } = await presignRes.json();
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
      body: audioBuffer,
    });
    console.log('  Uploaded via presigned URL:', publicUrl);
    await submitToSyncLabs(publicUrl);
  } else {
    // Fall back to CDN URL approach — upload via manus-upload-file
    console.log('  Presign also failed. Using local file upload approach...');
    // Write the file to webdev-static-assets for upload
    const staticPath = `/home/ubuntu/webdev-static-assets/probe-720014-isolated-vocals-${Date.now()}.mp3`;
    fs.copyFileSync(clippedPath, staticPath);
    console.log('  Saved to:', staticPath);
    console.log('  Run: manus-upload-file --webdev', staticPath);
    console.log('  Then manually update the SyncLabs submission with the returned URL.');
    process.exit(1);
  }
} else {
  const uploadData = await uploadRes.json();
  const audioUrl = uploadData.url || uploadData.publicUrl;
  console.log('  Uploaded:', audioUrl);
  await submitToSyncLabs(audioUrl);
}

async function submitToSyncLabs(audioUrl) {
  console.log('');
  console.log('Step 4: Submitting to SyncLabs...');
  console.log('  Video URL:', RAW_VIDEO_URL);
  console.log('  Audio URL (isolated vocals 6-12s):', audioUrl);
  console.log('  Model: sync-3');
  console.log('  sync_mode: cut_off');
  console.log('  occlusion_detection: true');
  
  const payload = {
    model: 'sync-3',
    input: [
      { type: 'video', url: RAW_VIDEO_URL },
      { type: 'audio', url: audioUrl },
    ],
    options: {
      sync_mode: 'cut_off',
      temperature: 1.0,
      occlusion_detection_enabled: true,
    },
    webhookUrl: null,
  };
  
  console.log('');
  console.log('  Full payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  const res = await fetch('https://api.sync.so/v2/generate', {
    method: 'POST',
    headers: {
      'x-api-key': SYNCLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  console.log('  HTTP status:', res.status);
  const data = await res.json();
  console.log('  Response:', JSON.stringify(data, null, 2));
  
  if (res.ok && data.id) {
    console.log('');
    console.log('✅ SyncLabs submission SUCCEEDED');
    console.log('  Task ID:', data.id);
    console.log('  Status:', data.status);
    
    // Update the database
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Cancel the old SyncLabs task record and set new one
    await conn.execute(
      "UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, lipSyncVideoUrl=NULL, updatedAt=NOW() WHERE id=?",
      [data.id, SCENE_ID]
    );
    await conn.execute(
      "UPDATE musicVideoJobs SET probeVideoUrl=NULL WHERE id=?",
      [JOB_ID]
    );
    
    console.log('  Database updated: lipSyncTaskId =', data.id);
    console.log('');
    console.log('=== Summary ===');
    console.log('  SyncLabs Task ID:', data.id);
    console.log('  Audio source: ISOLATED DEMUCS VOCALS (6-12s window)');
    console.log('  Audio URL:', audioUrl);
    console.log('  Video URL:', RAW_VIDEO_URL);
    console.log('  Timing: startTime=6s (no /1000 division — fix applied)');
    console.log('  Expected completion: ~2-5 minutes');
    
    await conn.end();
  } else {
    console.error('❌ SyncLabs submission FAILED:', data);
    process.exit(1);
  }
}

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });
