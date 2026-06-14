require('dotenv').config();
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

async function testUrl(url) {
  if (!url) return { error: 'null url' };
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({ status: res.statusCode, contentType: res.headers['content-type'], size: res.headers['content-length'] });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [rows] = await conn.execute(
    'SELECT id, sceneIndex, mvSceneStatus, videoUrl, lipSyncVideoUrl, lipSyncStatus, lipSyncTaskId FROM musicVideoScenes WHERE id = ?',
    [990015]
  );
  
  const scene = rows[0];
  console.log('Scene 990015 full details:');
  console.log('  status:', scene.mvSceneStatus);
  console.log('  videoUrl:', scene.videoUrl);
  console.log('  lipSyncStatus:', scene.lipSyncStatus);
  console.log('  lipSyncTaskId:', scene.lipSyncTaskId);
  
  if (scene.videoUrl) {
    console.log('\nTesting videoUrl...');
    const result = await testUrl(scene.videoUrl);
    console.log('  result:', JSON.stringify(result));
  }
  
  if (scene.lipSyncVideoUrl) {
    console.log('\nTesting lipSyncVideoUrl...');
    const result = await testUrl(scene.lipSyncVideoUrl);
    console.log('  result:', JSON.stringify(result));
  }
  
  await conn.end();
}

main().catch(console.error);
