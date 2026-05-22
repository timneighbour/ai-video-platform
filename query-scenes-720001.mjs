import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await createConnection(url);

const [rows] = await conn.execute(
  `SELECT id, sceneIndex, sceneType, prompt, mvSceneStatus, lipSyncStatus, compositeStatus, videoUrl, lipSyncVideoUrl, compositeVideoUrl
   FROM musicVideoScenes WHERE jobId = 720001 ORDER BY sceneIndex`
);

for (const row of rows) {
  console.log(`\n--- Scene ${row.id} (idx=${row.sceneIndex}, ${row.sceneType}) ---`);
  console.log(`  Status: ${row.mvSceneStatus} | lipSync: ${row.lipSyncStatus} | composite: ${row.compositeStatus}`);
  console.log(`  Prompt: ${(row.prompt || '').slice(0, 200)}`);
  console.log(`  videoUrl: ${row.videoUrl ? row.videoUrl.slice(0, 80) + '...' : 'null'}`);
  console.log(`  lipSyncVideoUrl: ${row.lipSyncVideoUrl ? row.lipSyncVideoUrl.slice(0, 80) + '...' : 'null'}`);
  console.log(`  compositeVideoUrl: ${row.compositeVideoUrl ? row.compositeVideoUrl.slice(0, 80) + '...' : 'null'}`);
}

await conn.end();
