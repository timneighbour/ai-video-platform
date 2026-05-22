import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await createConnection(url);

const [rows] = await conn.execute(
  `SELECT id, sceneIndex, sceneType, prompt FROM musicVideoScenes WHERE jobId = 720001 AND sceneType = 'performance' ORDER BY sceneIndex`
);

for (const row of rows) {
  console.log(`\n=== Scene ${row.id} (idx=${row.sceneIndex}) ===`);
  console.log(row.prompt);
}

await conn.end();
