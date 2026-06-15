import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check Scene 1 (id=660002) using correct column names
const [scenes] = await conn.query(
  'SELECT id, jobId, mvSceneStatus, lipSyncStatus, lipSyncTaskId, videoUrl, lipSyncVideoUrl FROM musicVideoScenes WHERE id = 660002'
);
console.log('Scene 1:', JSON.stringify(scenes[0], null, 2));

// Check recent debug logs
const [logs] = await conn.query(
  'SELECT message, createdAt FROM debugLogs WHERE jobId = 660001 ORDER BY createdAt DESC LIMIT 8'
);
console.log('\nRecent logs:');
logs.forEach(l => console.log(`  [${l.createdAt}] ${l.message}`));

// Check job vocalsUrl
const [jobs] = await conn.query(
  'SELECT id, vocalsUrl, vocalsStatus, songBpm FROM musicVideoJobs WHERE id = 660001'
);
console.log('\nJob vocals:', JSON.stringify(jobs[0], null, 2));

await conn.end();
