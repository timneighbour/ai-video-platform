/**
 * Reset the 5 generating scenes that WaveSpeed lost (404) back to pending
 * so the heartbeat can re-submit them with fresh task IDs.
 * Also clears the old providerJobLogs so the idempotency check doesn't block.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Reset the 5 generating scenes back to pending
const [resetResult] = await conn.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus='pending', taskId=NULL, errorMessage=NULL, updatedAt=NOW() WHERE jobId=720001 AND mvSceneStatus='generating'"
);
console.log('Reset', resetResult.affectedRows, 'scenes back to pending');

// Delete the old submitted providerJobLogs for these scenes (idempotency keys)
const [sceneIds] = await conn.execute(
  "SELECT id FROM musicVideoScenes WHERE jobId=720001 AND sceneIndex IN (7,8,9,10,11)"
);
const ids = sceneIds.map(s => s.id);
console.log('Scene IDs to clear logs for:', ids);

if (ids.length > 0) {
  const placeholders = ids.map(() => '?').join(',');
  const [delResult] = await conn.execute(
    `DELETE FROM providerJobLogs WHERE sceneId IN (${placeholders}) AND pjlStatus IN ('submitted','pending')`,
    ids
  );
  console.log('Deleted', delResult.affectedRows, 'old providerJobLogs');
}

// Verify
const [check] = await conn.execute(
  "SELECT sceneIndex, mvSceneStatus as status, taskId FROM musicVideoScenes WHERE jobId=720001 ORDER BY sceneIndex"
);
console.log('\nScene status after reset:');
for (const s of check) {
  console.log(`  idx ${s.sceneIndex}: ${s.status} taskId=${s.taskId || 'null'}`);
}

await conn.end();
console.log('\nDone. Now trigger the heartbeat to re-submit these scenes.');
