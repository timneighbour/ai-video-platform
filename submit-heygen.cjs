require('dotenv').config();
const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const HEYGEN_KEY = process.env.HEYGEN_API_KEY;

function heygenRequest(method, path, body, isFormData) {
  return new Promise((resolve, reject) => {
    const headers = { 'X-Api-Key': HEYGEN_KEY };
    let postData;
    if (isFormData) {
      headers['Content-Type'] = body.getHeaders()['content-type'];
      postData = body;
    } else if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const options = { hostname: 'api.heygen.com', path, method, headers };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    if (isFormData) {
      postData.pipe(req);
    } else {
      if (postData) req.write(postData);
      req.end();
    }
  });
}

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

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get scene and job details
  const [sceneRows] = await conn.execute('SELECT * FROM musicVideoScenes WHERE id = ?', [990015]);
  const [jobRows] = await conn.execute('SELECT id, stemVocalsUrl, audioUrl FROM musicVideoJobs WHERE id = ?', [1080001]);
  
  const scene = sceneRows[0];
  const job = jobRows[0];
  
  console.log('Scene videoUrl:', scene.videoUrl);
  console.log('Job stemVocalsUrl:', job.stemVocalsUrl);
  console.log('startTime:', scene.startTime, 'duration:', scene.duration);
  
  // Step 1: Upload video to HeyGen
  console.log('\nStep 1: Uploading video to HeyGen...');
  const videoUpload = await uploadToHeyGen('/tmp/s990015.mp4', 'video/mp4');
  console.log('Video upload status:', videoUpload.status);
  console.log('Video upload response:', JSON.stringify(videoUpload.data).substring(0, 200));
  
  if (videoUpload.status !== 200 || !videoUpload.data?.data?.asset_id) {
    console.error('Video upload failed!');
    await conn.end();
    return;
  }
  const videoAssetId = videoUpload.data.data.asset_id;
  console.log('Video asset_id:', videoAssetId);
  
  // Step 2: Extract audio clip
  const startTime = scene.startTime || 12;
  const duration = scene.duration || 6;
  const audioClipPath = '/tmp/scene990015_audio.mp3';
  console.log(`\nStep 2: Extracting audio clip (${startTime}s - ${startTime + duration}s)...`);
  
  // Download vocal stem
  execSync(`curl -s -o /tmp/vocals.mp3 "${job.stemVocalsUrl}"`);
  execSync(`ffmpeg -y -i /tmp/vocals.mp3 -ss ${startTime} -t ${duration} -acodec libmp3lame -q:a 2 ${audioClipPath} 2>/dev/null`);
  
  const audioSize = fs.statSync(audioClipPath).size;
  console.log('Audio clip size:', audioSize, 'bytes');
  
  // Step 3: Upload audio to HeyGen
  console.log('\nStep 3: Uploading audio to HeyGen...');
  const audioUpload = await uploadToHeyGen(audioClipPath, 'audio/mpeg');
  console.log('Audio upload status:', audioUpload.status);
  console.log('Audio upload response:', JSON.stringify(audioUpload.data).substring(0, 200));
  
  if (audioUpload.status !== 200 || !audioUpload.data?.data?.asset_id) {
    console.error('Audio upload failed!');
    await conn.end();
    return;
  }
  const audioAssetId = audioUpload.data.data.asset_id;
  console.log('Audio asset_id:', audioAssetId);
  
  // Step 4: Submit lip sync job
  console.log('\nStep 4: Submitting HeyGen Precision lip sync...');
  const submitResult = await heygenRequest('POST', '/v3/lipsyncs', {
    title: `WizAI Scene 990015 Job 1080001 Final`,
    video: { type: 'asset_id', asset_id: videoAssetId },
    audio: { type: 'asset_id', asset_id: audioAssetId }
  });
  
  console.log('Submit status:', submitResult.status);
  console.log('Submit response:', JSON.stringify(submitResult.data).substring(0, 300));
  
  if (submitResult.status === 200 && submitResult.data?.data?.id) {
    const taskId = submitResult.data.data.id;
    console.log('\nHeyGen task submitted:', taskId);
    
    // Update DB
    await conn.execute(
      'UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncTaskId = ? WHERE id = ?',
      ['processing', `heygen:${taskId}`, 990015]
    );
    console.log('DB updated with new task ID: heygen:' + taskId);
  }
  
  await conn.end();
}

main().catch(console.error);
