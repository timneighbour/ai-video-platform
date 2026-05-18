import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const conn = await createConnection(process.env.DATABASE_URL);
const [scenes] = await conn.execute(
  'SELECT id, mvSceneStatus as status, taskId, videoUrl, lipSyncStatus FROM musicVideoScenes WHERE jobId = 540026 ORDER BY id'
);
const [jobs] = await conn.execute(
  'SELECT id, status, probePassed, providerSpendUsd FROM musicVideoJobs WHERE id = 540026'
);
await conn.end();

const job = jobs[0];
console.log(`JOB 540026 | status=${job.status} | probePassed=${job.probePassed} | spend=$${job.providerSpendUsd}`);

const counts = { pending: 0, generating: 0, completed: 0, failed: 0 };
for (const s of scenes) {
  counts[s.status] = (counts[s.status] || 0) + 1;
  const taskShort = s.taskId ? String(s.taskId).slice(0, 38) : 'no-task';
  console.log(`  SCENE ${s.id} | ${s.status.padEnd(10)} | ${taskShort.padEnd(38)} | lip: ${s.lipSyncStatus}`);
}
console.log(`SUMMARY: pending=${counts.pending} generating=${counts.generating} completed=${counts.completed} failed=${counts.failed}`);
