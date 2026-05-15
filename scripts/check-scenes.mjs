import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/ai-video-platform/.env' });

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await createConnection(url);

// Check job status
const [jobRows] = await conn.execute(
  'SELECT id, `status`, updatedAt FROM musicVideoJobs WHERE id = 540026'
);
console.log('JOB:', JSON.stringify(jobRows));

// Check scene statuses using correct column name
const [sceneRows] = await conn.execute(
  'SELECT id, sceneIndex, mvSceneStatus, taskId, LEFT(errorMessage, 150) as error, updatedAt FROM musicVideoScenes WHERE jobId = 540026 ORDER BY sceneIndex'
);
console.log('SCENES:', JSON.stringify(sceneRows, null, 2));

await conn.end();
