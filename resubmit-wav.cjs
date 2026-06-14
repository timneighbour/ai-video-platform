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
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, raw: data }); } });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

async function submitLipSync(videoAssetId, audioAssetId) {
  const body = JSON.stringify({ title: 'WizAI Scene 990015 WAV', video: { type: 'asset_id', asset_id: videoAssetId }, audio: { type: 'asset_id', asset_id: audioAssetId } });
  return new Promise((resolve, reject) => {
    const options = { hostname: 'api.heygen.com', path: '/v3/lipsyncs', method: 'POST', headers: { 'X-Api-Key': HEYGEN_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, raw: data }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function pollLipSync(taskId) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'api.heygen.com', path: `/v3/lipsyncs/${taskId}`, method: 'GET', headers: { 'X-Api-Key': HEYGEN_KEY } };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ error: data }); } });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Upload trimmed video (already at /tmp/s990015_trimmed.mp4 - 6s, 1280x720)
  console.log('Uploading trimmed video...');
  const videoUp = await uploadToHeyGen('/tmp/s990015_trimmed.mp4', 'video/mp4');
  if (!videoUp.data?.data?.asset_id) { console.error('Video upload failed:', JSON.stringify(videoUp)); await conn.end(); return; }
  const videoId = videoUp.data.data.asset_id;
  console.log('Video asset_id:', videoId);
  
  // Upload WAV audio
  console.log('Uploading WAV audio...');
  const audioUp = await uploadToHeyGen('/tmp/scene990015_audio.wav', 'audio/wav');
  if (!audioUp.data?.data?.asset_id) { console.error('Audio upload failed:', JSON.stringify(audioUp)); await conn.end(); return; }
  const audioId = audioUp.data.data.asset_id;
  console.log('Audio asset_id:', audioId);
  
  // Submit
  console.log('Submitting lip sync...');
  const sub = await submitLipSync(videoId, audioId);
  console.log('Submit response:', JSON.stringify(sub.data).substring(0, 200));
  
  if (!sub.data?.data?.lipsync_id) { console.error('Submit failed'); await conn.end(); return; }
  const taskId = sub.data.data.lipsync_id;
  console.log('Task ID:', taskId);
  
  await conn.execute('UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncTaskId = ? WHERE id = ?', ['processing', `heygen:${taskId}`, 990015]);
  
  // Poll
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const res = await pollLipSync(taskId);
    const r = res.data || {};
    const state = r.status || r.state;
    console.log(`[${new Date().toISOString()}] status=${state} video=${r.video_url ? 'READY' : 'null'} error=${r.failure_message || 'none'}`);
    
    if (r.video_url || state === 'completed' || state === 'success') {
      console.log('\n✅ COMPLETE! Video URL:', r.video_url);
      await conn.execute('UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncVideoUrl = ? WHERE id = ?', ['done', r.video_url, 990015]);
      await conn.execute('UPDATE musicVideoJobs SET probeVideoUrl = ?, status = ? WHERE id = ?', [r.video_url, 'awaiting_probe_approval', 1080001]);
      console.log('✅ Probe video ready in Screening Room!');
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
