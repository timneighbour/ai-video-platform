import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Job 690007 maps to id=690007 in musicVideoJobs
// musicVideoScenes uses jobId to reference musicVideoJobs.id

console.log('=== Checking job 690007 ===');
const [jobs] = await conn.execute(
  "SELECT id, status, probePassed FROM musicVideoJobs WHERE id=690007"
);
console.log('Job:', JSON.stringify(jobs[0]));

console.log('\n=== Resetting all failed scenes for job 690007 ===');
const [resetRes] = await conn.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus='pending', errorMessage=NULL, retryCount=0 WHERE jobId=690007 AND mvSceneStatus='failed'"
);
console.log('Reset failed scenes:', resetRes.affectedRows);

// Show current state
const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, retryCount, taskId FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
);
console.log('\n=== Current scene states ===');
scenes.forEach(s => {
  console.log(`  [${s.sceneIndex}] id=${s.id} ${s.mvSceneStatus} retry=${s.retryCount} taskId=${s.taskId || 'none'}`);
});

await conn.end();

// Now trigger the heartbeat
console.log('\n=== Triggering scene dispatch heartbeat ===');
try {
  const res = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const text = await res.text();
  console.log('Heartbeat response HTTP', res.status, ':', text.substring(0, 300));
} catch (e) {
  console.error('Heartbeat error:', e.message);
}

// Wait 5 seconds and check again
await new Promise(r => setTimeout(r, 5000));
console.log('\n=== Scene states after heartbeat ===');
const conn2 = await mysql.createConnection(process.env.DATABASE_URL);
const [scenes2] = await conn2.execute(
  "SELECT id, sceneIndex, mvSceneStatus, retryCount, taskId FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
);
scenes2.forEach(s => {
  console.log(`  [${s.sceneIndex}] id=${s.id} ${s.mvSceneStatus} retry=${s.retryCount} taskId=${s.taskId || 'none'}`);
});
await conn2.end();
