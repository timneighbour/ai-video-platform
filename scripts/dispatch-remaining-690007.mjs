import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Reset all failed scenes (indices 4-11) back to pending
console.log('=== Resetting failed scenes for job 690007 ===');
const [resetRes] = await conn.execute(
  `UPDATE musicVideoScenes 
   SET mvSceneStatus='pending', errorMessage=NULL, retryCount=0, taskId=NULL
   WHERE jobId=690007 AND mvSceneStatus='failed'`
);
console.log('Reset failed scenes:', resetRes.affectedRows);

// Cancel their providerJobLogs so spend protection doesn't block
const [scenes] = await conn.execute(
  "SELECT id FROM musicVideoScenes WHERE jobId=690007 AND mvSceneStatus='pending'"
);
const pendingIds = scenes.map(s => s.id);
console.log('Pending scene IDs:', pendingIds);

if (pendingIds.length > 0) {
  const placeholders = pendingIds.map(() => '?').join(',');
  const [cancelRes] = await conn.execute(
    `UPDATE providerJobLogs SET pjlStatus='cancelled' WHERE sceneId IN (${placeholders}) AND pjlStatus != 'cancelled'`,
    pendingIds
  );
  console.log('Cancelled providerJobLogs:', cancelRes.affectedRows);
}

// Show current state
const [allScenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, taskId FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
);
console.log('\nCurrent scene states:');
allScenes.forEach(s => {
  const icon = s.mvSceneStatus === 'completed' ? '✅' : s.mvSceneStatus === 'generating' ? '🔄' : s.mvSceneStatus === 'pending' ? '⏳' : '❌';
  console.log(`  ${icon} [${s.sceneIndex}] id=${s.id} ${s.mvSceneStatus} taskId=${s.taskId || 'none'}`);
});

await conn.end();

// Trigger heartbeat to dispatch all pending scenes
console.log('\n=== Triggering heartbeat for full dispatch ===');
const hbRes = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-dev-bypass': 'scene-dispatch-2026'
  }
});
const hbData = await hbRes.json();
console.log('Heartbeat result:', JSON.stringify(hbData, null, 2));
