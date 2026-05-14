import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

// Check current state
const [jobs] = await conn.query('SELECT id, status, title, audioDuration FROM musicVideoJobs WHERE id = 540020');
console.log('Job:', JSON.stringify(jobs[0], null, 2));

const [scenes] = await conn.query(
  'SELECT id, sceneIndex, mvSceneStatus FROM musicVideoScenes WHERE jobId = 540020 ORDER BY sceneIndex'
);
console.log(`Scenes (${scenes.length}):`, scenes.map(s => `#${s.sceneIndex} ${s.mvSceneStatus}`).join(', '));

// Cancel the job (job status enum supports 'cancelled')
const [updateJob] = await conn.query(
  "UPDATE musicVideoJobs SET status = 'cancelled', updatedAt = NOW() WHERE id = 540020 AND status NOT IN ('completed', 'cancelled')"
);
console.log('Job rows updated:', updateJob.affectedRows);

// Mark pending/generating scenes as 'failed' (scene enum doesn't have 'cancelled')
const [updateScenes] = await conn.query(
  "UPDATE musicVideoScenes SET mvSceneStatus = 'failed', updatedAt = NOW() WHERE jobId = 540020 AND mvSceneStatus IN ('pending', 'generating')"
);
console.log('Scene rows updated:', updateScenes.affectedRows);

// Final state
const [finalJob] = await conn.query('SELECT id, status FROM musicVideoJobs WHERE id = 540020');
const [finalScenes] = await conn.query(
  'SELECT sceneIndex, mvSceneStatus FROM musicVideoScenes WHERE jobId = 540020 ORDER BY sceneIndex'
);
console.log('Final job status:', finalJob[0]?.status);
console.log('Final scenes:', finalScenes.map(s => `#${s.sceneIndex} ${s.mvSceneStatus}`).join(', '));

await conn.end();
console.log('Done.');
