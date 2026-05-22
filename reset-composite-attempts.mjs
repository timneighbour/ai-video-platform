import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await createConnection(url);

// Check current compositeAttempts
const [rows] = await conn.execute(
  `SELECT id, sceneIndex, sceneType, compositeAttempts, compositeStatus FROM musicVideoScenes WHERE jobId = 720001 AND sceneType = 'performance' ORDER BY sceneIndex`
);

console.log('Current compositeAttempts for performance scenes:');
for (const r of rows) {
  console.log(`  Scene ${r.id} (idx=${r.sceneIndex}): compositeAttempts=${r.compositeAttempts}, compositeStatus=${r.compositeStatus}`);
}

// Reset compositeAttempts to 0 so the scenes can be retried
const [result] = await conn.execute(
  `UPDATE musicVideoScenes SET compositeAttempts = 0, updatedAt = NOW() WHERE jobId = 720001 AND sceneType = 'performance'`
);

console.log(`\nReset compositeAttempts to 0 for ${result.affectedRows} performance scenes.`);

await conn.end();
