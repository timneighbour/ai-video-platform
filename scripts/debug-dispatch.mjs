import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/ai-video-platform/.env' });

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await createConnection(url);

// Get videoCharacters columns
const [charCols] = await conn.execute('DESCRIBE videoCharacters');
console.log('videoCharacters columns:', charCols.map(c => c.Field).join(', '));

// Get musicVideoJobs columns
const [jobCols] = await conn.execute('DESCRIBE musicVideoJobs');
console.log('musicVideoJobs columns:', jobCols.map(c => c.Field).join(', '));

// Get characters for job 540026
const [chars] = await conn.execute('SELECT * FROM videoCharacters WHERE jobId = 540026');
console.log('Characters for job 540026:', JSON.stringify(chars, null, 2));

// Get job details
const [job] = await conn.execute('SELECT * FROM musicVideoJobs WHERE id = 540026');
console.log('Job 540026 details:', JSON.stringify(job, null, 2));

// Check debugLogs for job 540026
const [debugRows] = await conn.execute(
  `SELECT id, debugCategory, debugSeverity, message, createdAt FROM debugLogs WHERE jobId = 540026 ORDER BY createdAt DESC LIMIT 20`
);
console.log('debugLogs for job 540026:', debugRows.length, JSON.stringify(debugRows, null, 2));

await conn.end();
