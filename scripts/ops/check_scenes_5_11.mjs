import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname, port: parseInt(url.port), user: url.username,
  password: url.password, database: url.pathname.slice(1), ssl: {}
});

// Check scenes 5-11 details
const [rows] = await conn.query('SELECT sceneIndex, sceneType, lipSync, modelAssignment, sceneAudioUrl, heroImageUrl FROM musicVideoScenes WHERE jobId=1080001 AND sceneIndex >= 5 ORDER BY sceneIndex');
rows.forEach(r => {
  console.log(`Scene ${r.sceneIndex}: ${r.sceneType} lipSync=${r.lipSync} model=${r.modelAssignment} audio=${r.sceneAudioUrl ? 'SET' : 'NULL'} hero=${r.heroImageUrl ? 'SET' : 'NULL'}`);
});

// Also check what model scenes 0-4 used (the ones that worked)
const [working] = await conn.query('SELECT sceneIndex, modelAssignment, providerUsed, taskId FROM musicVideoScenes WHERE jobId=1080001 AND sceneIndex <= 4 ORDER BY sceneIndex');
console.log('\nWorking scenes (0-4):');
working.forEach(r => {
  console.log(`Scene ${r.sceneIndex}: model=${r.modelAssignment} provider=${r.providerUsed} task=${r.taskId ? r.taskId.slice(0,40) : 'none'}`);
});

await conn.end();
process.exit(0);
