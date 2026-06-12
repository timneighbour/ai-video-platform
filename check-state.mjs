import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
config();

const conn = await createConnection(process.env.DATABASE_URL);
const [cols] = await conn.execute('SHOW COLUMNS FROM musicVideoJobs');
const colNames = cols.map(c => c.Field).filter(c => c.toLowerCase().includes('status') || c.toLowerCase().includes('probe'));
console.log('Job status/probe cols:', colNames.join(', '));

const [jobs] = await conn.execute('SELECT * FROM musicVideoJobs WHERE id = 1080001');
const job = jobs[0];
const relevant = {};
for (const k of Object.keys(job)) {
  if (k.toLowerCase().includes('status') || k.toLowerCase().includes('probe')) {
    relevant[k] = job[k];
  }
}
console.log('Job 1080001 relevant:', JSON.stringify(relevant, null, 2));
await conn.end();
