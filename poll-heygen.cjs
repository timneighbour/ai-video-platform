require('dotenv').config();
const mysql = require('mysql2/promise');
const https = require('https');

const HEYGEN_KEY = process.env.HEYGEN_API_KEY;
const TASK_ID = '866d198995b245f3874421ae438cef3f';

function pollHeyGen(taskId) {
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
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data.substring(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Update DB with new task ID
  await conn.execute(
    'UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncTaskId = ? WHERE id = ?',
    ['processing', `heygen:${TASK_ID}`, 990015]
  );
  console.log('DB updated: lipSyncTaskId = heygen:' + TASK_ID);
  
  // Poll until complete
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    await new Promise(r => setTimeout(r, 15000)); // wait 15s between polls
    
    const result = await pollHeyGen(TASK_ID);
    const state = result.data?.data?.status || result.data?.data?.state || 'unknown';
    const videoUrl = result.data?.data?.video_url;
    const error = result.data?.data?.error;
    
    console.log(`[${new Date().toISOString()}] Poll ${attempts}: status=${state}, videoUrl=${videoUrl ? 'SET' : 'null'}, error=${error || 'none'}`);
    
    if (state === 'completed' || state === 'success' || videoUrl) {
      console.log('\n✅ HeyGen COMPLETE!');
      console.log('Video URL:', videoUrl);
      
      // Update scene with lip sync video URL
      await conn.execute(
        'UPDATE musicVideoScenes SET lipSyncStatus = ?, lipSyncVideoUrl = ? WHERE id = ?',
        ['done', videoUrl, 990015]
      );
      
      // Update job with probe video URL and set to awaiting_probe_approval
      await conn.execute(
        'UPDATE musicVideoJobs SET probeVideoUrl = ?, status = ? WHERE id = ?',
        [videoUrl, 'awaiting_probe_approval', 1080001]
      );
      
      console.log('DB updated: probeVideoUrl set, job status = awaiting_probe_approval');
      console.log('\nProbe video is ready in the Screening Room!');
      break;
    }
    
    if (state === 'failed' || state === 'error') {
      console.error('\n❌ HeyGen FAILED:', error || JSON.stringify(result.data?.data));
      await conn.execute(
        'UPDATE musicVideoScenes SET lipSyncStatus = ? WHERE id = ?',
        ['error', 990015]
      );
      break;
    }
  }
  
  await conn.end();
}

main().catch(console.error);
