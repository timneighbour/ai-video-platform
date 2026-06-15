import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// Check DB state
const conn = await createConnection(DB_URL);
const [scenes] = await conn.execute(
  'SELECT id, sceneIndex, videoUrl, lipSyncStatus, lipSyncTaskId, lipSyncVideoUrl, compositeVideoUrl FROM musicVideoScenes WHERE id = 990015'
);
console.log('DB scene 990015:', JSON.stringify(scenes[0], null, 2));

const [jobs] = await conn.execute(
  'SELECT id, status, probePassed, probeSceneId, probeVideoUrl FROM musicVideoJobs WHERE id = 1080001'
);
console.log('DB job 1080001:', JSON.stringify(jobs[0], null, 2));
await conn.end();

// Check HeyGen status
const taskId = '76cf878b87354127a722b2128cbbcb1a';
const resp = await fetch(`https://api.heygen.com/v3/lipsyncs/${taskId}`, {
  headers: { 'X-Api-Key': HEYGEN_API_KEY }
});
const data = await resp.json();
console.log('HeyGen status:', JSON.stringify(data, null, 2));
