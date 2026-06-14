require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  
  const conn = await mysql.createConnection(url);
  
  // Check job 1080001
  const [jobRows] = await conn.execute(
    'SELECT id, status, probePassed, probeSceneId, LEFT(probeVideoUrl, 100) as probeVideoUrl FROM musicVideoJobs WHERE id = ?',
    [1080001]
  );
  console.log('Job 1080001:', JSON.stringify(jobRows, null, 2));
  
  // Check scene 930003
  const [sceneRows] = await conn.execute(
    'SELECT id, mvSceneStatus, LEFT(videoUrl, 80) as videoUrl, LEFT(lipSyncVideoUrl, 80) as lipSyncVideoUrl, lipSyncStatus, sceneIndex FROM musicVideoScenes WHERE id = ?',
    [930003]
  );
  console.log('Scene 930003:', JSON.stringify(sceneRows, null, 2));
  
  // Check all scenes for job 1080001
  const [allScenes] = await conn.execute(
    'SELECT id, sceneIndex, mvSceneStatus, lipSyncStatus, LEFT(videoUrl, 50) as hasVideo FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex',
    [1080001]
  );
  console.log('All scenes for job 1080001:', JSON.stringify(allScenes, null, 2));
  
  await conn.end();
}

main().catch(console.error);
