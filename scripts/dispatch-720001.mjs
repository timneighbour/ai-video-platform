/**
 * dispatch-720001.mjs
 * Manually triggers the scene dispatch heartbeat for job 720001.
 * Calls the /api/heartbeat endpoint on the running dev server to kick off rendering.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function triggerHeartbeat() {
  console.log('[Dispatch] Triggering heartbeat for job 720001...');
  
  // Try the internal heartbeat endpoint
  const resp = await fetch(`${BASE_URL}/api/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: 720001 }),
  }).catch(e => ({ ok: false, status: 0, text: async () => e.message }));
  
  if (resp.ok) {
    const body = await resp.text();
    console.log('[Dispatch] Heartbeat response:', body.slice(0, 200));
  } else {
    const body = await resp.text().catch(() => '');
    console.log(`[Dispatch] Heartbeat returned ${resp.status}: ${body.slice(0, 200)}`);
  }
}

async function checkStatus() {
  const mysql2 = require('mysql2/promise');
  const db = await mysql2.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const [rows] = await db.execute(
    'SELECT sceneIndex, sceneType, mvSceneStatus, lipSyncStatus, taskId FROM musicVideoScenes WHERE jobId=720001 ORDER BY sceneIndex'
  );
  for (const r of rows) {
    console.log(`  Scene ${r.sceneIndex} (${r.sceneType}) mv=${r.mvSceneStatus} ls=${r.lipSyncStatus} task=${String(r.taskId||'none').slice(0,30)}`);
  }
  const [job] = await db.execute('SELECT status, finalVideoUrl FROM musicVideoJobs WHERE id=720001');
  console.log(`  Job: ${job[0]?.status} finalVideo=${job[0]?.finalVideoUrl ? 'YES' : 'NO'}`);
  await db.end();
}

console.log('\n=== Job 720001 Status Before Dispatch ===');
await checkStatus();

await triggerHeartbeat();

console.log('\n=== Waiting 10s then checking status again ===');
await new Promise(r => setTimeout(r, 10000));
await checkStatus();
