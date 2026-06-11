/**
 * Poll Scene 8 HeyGen task and trigger assembly when done
 */
import { createConnection } from 'mysql2/promise';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DB_URL = process.env.DATABASE_URL;
const DEV_SERVER = 'https://3000-irwasp9pffprgyamkwdll-e5be4540.us2.manus.computer';

const SCENE8_TASK_ID = 'heygen:e23776983fe842cbbf';
const HEYGEN_ID = SCENE8_TASK_ID.replace('heygen:', '');

const dbUrl = new URL(DB_URL);
const ssl = JSON.parse(dbUrl.searchParams.get('ssl') || '{}');
const conn = await createConnection({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '3306'),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl,
});

console.log(`Polling HeyGen task ${HEYGEN_ID} for Scene 8...`);

const maxWait = 15 * 60 * 1000; // 15 minutes
const interval = 15_000;
const deadline = Date.now() + maxWait;

while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, interval));
  
  try {
    const resp = await fetch(`https://api.heygen.com/v3/lipsyncs/${HEYGEN_ID}`, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });
    const data = await resp.json();
    const status = data?.data?.status;
    const videoUrl = data?.data?.output?.url;
    
    console.log(`  ${new Date().toISOString()} — status: ${status}${videoUrl ? ` | url: ${videoUrl.slice(0,60)}...` : ''}`);
    
    if (status === 'completed' && videoUrl) {
      console.log('\n✅ Scene 8 HeyGen complete!');
      
      // Update DB
      await conn.query(
        `UPDATE musicVideoScenes 
         SET lipSyncStatus = 'done', lipSyncVideoUrl = ?, updatedAt = NOW()
         WHERE jobId = 1020003 AND sceneIndex = 8`,
        [videoUrl]
      );
      console.log('  DB updated for Scene 8');
      
      // Trigger heartbeat to check if all scenes are done and start assembly
      console.log('  Triggering heartbeat...');
      const hbResp = await fetch(`${DEV_SERVER}/api/heartbeat/scene-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-bypass': 'true' },
      });
      const hbData = await hbResp.json().catch(() => ({}));
      console.log(`  Heartbeat response: ${JSON.stringify(hbData)}`);
      
      // Check job status
      const [jobs] = await conn.query('SELECT status, finalVideoUrl FROM musicVideoJobs WHERE id = 1020003');
      console.log(`  Job status: ${jobs[0]?.status} | finalVideoUrl: ${jobs[0]?.finalVideoUrl ? 'SET' : 'null'}`);
      
      break;
    }
    
    if (status === 'failed') {
      console.error('\n❌ Scene 8 HeyGen FAILED:', JSON.stringify(data?.data));
      break;
    }
  } catch (err) {
    console.error(`  Poll error: ${err.message}`);
  }
}

// Final scene status check
const [scenes] = await conn.query(
  `SELECT sceneIndex, lipSyncStatus, lipSyncVideoUrl IS NOT NULL as hasVideo 
   FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex`
);
console.log('\nFinal scene status:');
scenes.forEach(s => console.log(`  Scene ${s.sceneIndex}: ${s.lipSyncStatus} | hasVideo: ${s.hasVideo}`));

const [job] = await conn.query('SELECT status, finalVideoUrl FROM musicVideoJobs WHERE id = 1020003');
console.log(`\nJob status: ${job[0]?.status}`);

await conn.end();
