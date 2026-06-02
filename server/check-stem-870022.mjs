import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [jobs] = await conn.execute(
  'SELECT id, stemVocalsUrl, audioUrl FROM musicVideoJobs WHERE id = 870022'
);
console.log('JOB:', JSON.stringify(jobs, null, 2));

const [scenes] = await conn.execute(
  'SELECT id, sceneIndex, startTime, duration, sceneType, mvSceneStatus, taskId FROM musicVideoScenes WHERE jobId = 870022 ORDER BY sceneIndex LIMIT 6'
);
console.log('SCENES (first 6):', JSON.stringify(scenes, null, 2));

await conn.end();
