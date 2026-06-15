import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const mysql = require('mysql2/promise');

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find all idempotency keys for Job 660001 scenes
const [keys] = await conn.execute(
  `SELECT idempotencyKey, sceneId, createdAt FROM providerJobLogs 
   WHERE idempotencyKey LIKE 'job:660001:%' 
   ORDER BY createdAt DESC`
);

console.log(`Found ${keys.length} idempotency records for Job 660001:`);
for (const k of keys) {
  console.log(`  Scene ${k.sceneId} | ${k.status} | Key: ${k.idempotencyKey}`);
}

if (keys.length > 0) {
  // Delete all idempotency records for Job 660001 so scenes can be re-dispatched
  const [del] = await conn.execute(
    `DELETE FROM providerJobLogs WHERE idempotencyKey LIKE 'job:660001:%'`
  );
  console.log(`\nDeleted ${del.affectedRows} idempotency record(s).`);
}

// Also reset probePassed to null so the probe gate re-enters probe_only mode
const [r] = await conn.execute(
  'UPDATE musicVideoJobs SET probePassed = NULL, probeSceneId = NULL, updatedAt = NOW() WHERE id = 660001'
);
console.log(`Reset probe gate: ${r.affectedRows} row(s) updated`);

// Verify
const [j] = await conn.execute(
  'SELECT id, status, probePassed, probeSceneId FROM musicVideoJobs WHERE id = 660001'
);
console.log('Job after reset:', JSON.stringify(j[0]));

await conn.end();
console.log('\nDone. The heartbeat will now dispatch the probe scene fresh on next tick.');
process.exit(0);
