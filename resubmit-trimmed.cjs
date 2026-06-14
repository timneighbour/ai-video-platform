require('dotenv').config();
const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');

const HEYGEN_KEY = process.env.HEYGEN_API_KEY;

async function uploadToHeyGen(filePath, mimeType) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { contentType: mimeType });
  
  return new Promise((resolve, reject) => {
    const headers = { 'X-Api-Key': HEYGEN_KEY, ...form.getHeaders() };
    const options = { hostname: 'api.heygen.com', path: '/v3/assets', method: 'POST', headers };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

async function submitLipSync(videoAssetId, audioAssetId) {
  const body = JSON.stringify({
    title: 'WizAI Scene 990015 Job 1080001 Trimmed',
    video: { type: 'asset_id', asset_id: videoAssetId },
    audio: { type: 'asset_id', asset_id: audioAssetId }
  });
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.heygen.com',
      path: '/v3/lipsyncs',
      method: 'POST',
      headers: { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function pollLipSync(taskId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.heygen.com',
      path: `/v3/lipsyncs/${taskId}`,
      method: 'GET',
      headers: { 'X-Api-Key': HEYGEN_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ error: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Step 1: Upload trimmed video
  console.log('Uploading trimmed 6s video to HeyGen...');
  const videoUpload = await uploadToHeyGen('/tmp/s990015_trimmed.mp4', 'video/mp4');
  console.log('Video upload:', videoUpload.status, JSON.stringify(videoUpload.data).substring(0, 150));
  
  if (!videoUpload.data?.data?.asset_id) {
    console.error('Video upload failed'); await conn.end(); return;
  }
  const videoAssetId = videoUpload.data.data.asset_id;
  
  // Step 2: Upload audio (already extracted at /tmp/scene990015_audio.mp3)
  console.log('\nUploading audio clip to HeyGen...');
  const audioUpload = await uploadToHeyGen('/tmp/scene990015_audio.mp3', 'audio/mpeg');
  console.log('Audio upload:', audioUpload.status, JSON.stringify(audioUpload.data).substring(0, 150));
  
  if (!audioUpload.data?.data?.asset_id) {
    console.error('Audio upload failed'); await conn.end(); return;
  }
  const audioAssetId = audioUpload.data.data.asset_id;
  
  // Step 3: Submit lip sync
  console.log('\nSubmitting lip sync...');
  const submit = await submitLipSync(videoAssetId, audioAssetId);
  console.log('Submit:', submit.status, JSON.stringify(submit.data).substring(0, 200));
  
  if (!submit.data?.data?.lipsync_id) {
    console.error('Submission failed'); await conn.end(); return;
  }
  const taskId = submit.data.data.lipsync_id;
  console.log('Task ID:', taskId);
  
  // Update DB
  await conn.execute(
    'UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncTaskId = ? WHERE id = ?',
    ['processing', `heygen:${taskId}`, 990015]
  );
  
  // Step 4: Poll until complete
  console.log('\nPolling HeyGen every 15s...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const result = await pollLipSync(taskId);
    const r = result.data || {};
    const state = r.status || r.state;
    console.log(`[${new Date().toISOString()}] status=${state} video=${r.video_url ? 'READY' : 'null'} error=${r.failure_message || r.error || 'none'}`);
    
    if (r.video_url || state === 'completed' || state === 'success') {
      const videoUrl = r.video_url;
      console.log('\n✅ COMPLETE! Video URL:', videoUrl);
      
      await conn.execute(
        'UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncVideoUrl = ? WHERE id = ?',
        ['done', videoUrl, 990015]
      );
      await conn.execute(
        'UPDATE musicVideoJobs SET probeVideoUrl = ?, status = ? WHERE id = ?',
        [videoUrl, 'awaiting_probe_approval', 1080001]
      );
      console.log('✅ DB updated — probe video ready in Screening Room!');
      break;
    }
    
    if (state === 'failed' || state === 'error') {
      console.error('❌ FAILED:', r.failure_message || r.error);
      await conn.execute('UPDATE musicVideoScenes SET lipSyncStatus = ? WHERE id = ?', ['error', 990015]);
      break;
    }
  }
  
  await conn.end();
}

main().catch(console.error);
