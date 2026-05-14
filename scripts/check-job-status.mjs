import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check scenes
const [scenes] = await conn.execute(
  'SELECT sceneIndex, mvSceneStatus as status, taskId, updatedAt FROM musicVideoScenes WHERE jobId = 540026 ORDER BY sceneIndex'
);
const summary = {};
scenes.forEach(s => { summary[s.status] = (summary[s.status] || 0) + 1; });
console.log('Summary:', JSON.stringify(summary));
console.log('Detail:');
scenes.forEach(s => {
  console.log(`  Scene ${s.sceneIndex}: ${s.status} | taskId: ${s.taskId ? s.taskId.slice(0,25) : 'none'} | updated: ${s.updatedAt}`);
});

// Check job
const [jobs] = await conn.execute('SELECT id, status, updatedAt FROM musicVideoJobs WHERE id = 540026');
console.log('Job:', JSON.stringify(jobs[0]));

await conn.end();
