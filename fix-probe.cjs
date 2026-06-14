require('dotenv').config();
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

async function getVideoInfo(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length']
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.end();
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  const conn = await mysql.createConnection(url);
  
  // Get scene 990015 details
  const [rows] = await conn.execute(
    'SELECT id, sceneIndex, mvSceneStatus, videoUrl, lipSyncStatus, lipSyncTaskId, startTime, duration FROM musicVideoScenes WHERE id = ?',
    [990015]
  );
  
  if (!rows.length) {
    console.log('Scene 990015 not found');
    await conn.end();
    return;
  }
  
  const scene = rows[0];
  console.log('Scene 990015:', {
    status: scene.mvSceneStatus,
    lipSyncStatus: scene.lipSyncStatus,
    lipSyncTaskId: scene.lipSyncTaskId,
    startTime: scene.startTime,
    duration: scene.duration,
    videoUrl: scene.videoUrl ? scene.videoUrl.substring(0, 80) + '...' : null
  });
  
  if (scene.videoUrl) {
    console.log('\nChecking video URL accessibility...');
    const info = await getVideoInfo(scene.videoUrl);
    console.log('Video HEAD response:', info);
  }
  
  // Get job details for audio
  const [jobRows] = await conn.execute(
    'SELECT id, status, audioUrl, stemVocalsUrl, LEFT(probeVideoUrl, 80) as probeVideoUrl FROM musicVideoJobs WHERE id = 1080001',
    []
  );
  console.log('\nJob 1080001:', JSON.stringify(jobRows[0], null, 2));
  
  await conn.end();
}

main().catch(console.error);
