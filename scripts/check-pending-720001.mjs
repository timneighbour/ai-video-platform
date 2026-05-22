import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [scenes] = await conn.execute(
  'SELECT id, sceneIndex, mvSceneStatus as status, taskId FROM musicVideoScenes WHERE jobId=720001 ORDER BY sceneIndex'
);

const pending = scenes.filter(s => s.status === 'pending' && s.taskId === null);
const generating = scenes.filter(s => s.status === 'generating' && s.taskId !== null);

console.log('All scenes:', scenes.length);
console.log('Pending (status=pending AND taskId=null):', pending.length);
console.log('Generating:', generating.length);
for (const s of pending) console.log('  PENDING idx', s.sceneIndex, 'taskId:', s.taskId);

const [job] = await conn.execute(
  'SELECT id, status, probePassed, fallbackProvider FROM musicVideoJobs WHERE id=720001'
);
console.log('Job:', JSON.stringify(job[0]));

// Check activeJobs query - the heartbeat only processes jobs with status='rendering'
const [activeJobs] = await conn.execute(
  "SELECT id, status, probePassed FROM musicVideoJobs WHERE status='rendering'"
);
console.log('Active rendering jobs:', activeJobs.map(j => j.id + ':' + j.status + ':probePassed=' + j.probePassed));

await conn.end();
