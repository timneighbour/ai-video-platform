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

async function submitLipSync(videoAssetId, audioUrl, startTime, endTime) {
  const body = JSON.stringify({
    title: 'WizAI Scene 990015 Precision Final',
    video: { type: 'asset_id', asset_id: videoAssetId },
    audio: { type: 'url', url: audioUrl },
    mode: 'precision',
    start_time: startTime,
    end_time: endTime,
    enable_dynamic_duration: true
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
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, raw: data }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
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
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ error: data }); } });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get scene details
  const [rows] = await conn.execute('SELECT * FROM musicVideoScenes WHERE id = ?', [990015]);
  const [jobRows] = await conn.execute('SELECT stemVocalsUrl, audioUrl FROM musicVideoJobs WHERE id = ?', [1080001]);
  const scene = rows[0];
  const job = jobRows[0];
  
  const startTime = scene.startTime || 12;
  const endTime = startTime + (scene.duration || 6);
  const vocalsUrl = job.stemVocalsUrl;
  
  console.log('Scene startTime:', startTime, 'endTime:', endTime);
  console.log('Vocals URL:', vocalsUrl);
  
  // Upload trimmed video to HeyGen (already at /tmp/s990015_trimmed.mp4 - 6s, 1280x720)
  console.log('\nUploading trimmed 6s video to HeyGen...');
  const videoUp = await uploadToHeyGen('/tmp/s990015_trimmed.mp4', 'video/mp4');
  if (!videoUp.data?.data?.asset_id) { 
    console.error('Video upload failed:', JSON.stringify(videoUp)); 
    await conn.end(); return; 
  }
  const videoId = videoUp.data.data.asset_id;
  console.log('Video asset_id:', videoId);
  
  // Submit with full vocal stem URL + start_time/end_time + precision mode
  console.log('\nSubmitting with precision mode + start_time=' + startTime + ' end_time=' + endTime + '...');
  const sub = await submitLipSync(videoId, vocalsUrl, startTime, endTime);
  console.log('Submit status:', sub.status);
  console.log('Submit response:', JSON.stringify(sub.data || sub.raw).substring(0, 300));
  
  if (!sub.data?.data?.lipsync_id) { 
    console.error('Submit failed'); 
    await conn.end(); return; 
  }
  const taskId = sub.data.data.lipsync_id;
  console.log('\nTask ID:', taskId);
  
  await conn.execute(
    'UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncTaskId = ? WHERE id = ?',
    ['processing', `heygen:${taskId}`, 990015]
  );
  console.log('DB updated with task ID');
  
  // Poll
  console.log('\nPolling every 15s...');
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 15000));
    const res = await pollLipSync(taskId);
    const r = res.data || {};
    const state = r.status || r.state;
    console.log(`[${new Date().toISOString()}] status=${state} video=${r.video_url ? 'READY' : 'null'} error=${r.failure_message || 'none'}`);
    
    if (r.video_url || state === 'completed') {
      const videoUrl = r.video_url;
      console.log('\n✅ COMPLETE! Video URL:', videoUrl);
      await conn.execute('UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncVideoUrl = ? WHERE id = ?', ['done', videoUrl, 990015]);
      await conn.execute('UPDATE musicVideoJobs SET probeVideoUrl = ?, status = ? WHERE id = ?', [videoUrl, 'awaiting_probe_approval', 1080001]);
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
