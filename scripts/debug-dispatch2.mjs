import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/ai-video-platform/.env' });

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await createConnection(url);

// Get key character fields (no binary blobs)
const [chars] = await conn.execute(
  `SELECT id, jobId, name, isLocked, masterPortraitUrl, characterMode, previewImageUrl, previewApproved, updatedAt 
   FROM videoCharacters WHERE jobId = 540026`
);
console.log('Characters:', JSON.stringify(chars, null, 2));

// Get key job fields (no binary blobs)
const [jobCols] = await conn.execute('DESCRIBE musicVideoJobs');
const safeJobCols = jobCols
  .map(c => c.Field)
  .filter(f => !['storyboardJson', 'transcriptionSegments', 'transcriptionText'].includes(f))
  .join(', ');

const [job] = await conn.execute(`SELECT ${safeJobCols} FROM musicVideoJobs WHERE id = 540026`);
console.log('Job 540026:', JSON.stringify(job, null, 2));

// Check debug logs for dispatch errors
const [debugRows] = await conn.execute(
  `SELECT id, debugCategory, debugSeverity, message, createdAt FROM debugLogs 
   WHERE jobId = 540026 ORDER BY createdAt DESC LIMIT 30`
);
console.log('debugLogs for job 540026 (', debugRows.length, '):', JSON.stringify(debugRows, null, 2));

await conn.end();
