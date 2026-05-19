import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const mysql = require('mysql2/promise');

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Reset probePassed to NULL so the heartbeat will re-enter probe_only mode
// and dispatch the probe scene (Scene 1 = id 660002) fresh
const [r] = await conn.execute(
  'UPDATE musicVideoJobs SET probePassed = NULL, probeSceneId = NULL, updatedAt = NOW() WHERE id = 660001'
);
console.log('Reset probe gate:', r.affectedRows, 'row(s) updated');

// Verify
const [j] = await conn.execute(
  'SELECT id, status, probePassed, probeSceneId FROM musicVideoJobs WHERE id = 660001'
);
console.log('Job after reset:', JSON.stringify(j[0]));

await conn.end();
console.log('\nDone. The heartbeat will now dispatch the probe scene (Scene 1) on next tick.');
process.exit(0);
