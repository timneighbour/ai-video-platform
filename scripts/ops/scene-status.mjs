import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const mysql = require('mysql2/promise');

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [s] = await conn.execute(
  'SELECT sceneIndex, mvSceneStatus, LEFT(taskId,25) as tid, videoUrl IS NOT NULL as hasVideo FROM musicVideoScenes WHERE jobId = 660001 ORDER BY sceneIndex'
);
let dispatched = 0;
for (const scene of s) {
  console.log(`Scene ${scene.sceneIndex} | ${scene.mvSceneStatus} | taskId: ${scene.tid || 'NULL'} | video: ${scene.hasVideo ? 'YES' : 'NO'}`);
  if (scene.tid) dispatched++;
}
console.log(`\n${dispatched}/11 dispatched`);
await conn.end();
process.exit(0);
