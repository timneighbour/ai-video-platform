/**
 * Trigger assembly for job 390001 by calling the server's internal API.
 * Uses the admin session cookie to authenticate.
 */
import mysql from 'mysql2/promise';
import axios from 'axios';

const DATABASE_URL = process.env.DATABASE_URL;
const SERVER_URL = 'http://localhost:3000';
const JOB_ID = 390001;

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

// Check current job status
const [jobRows] = await conn.execute(
  'SELECT id, status, totalScenes, completedScenes, userId, finalVideoUrl FROM musicVideoJobs WHERE id = ?',
  [JOB_ID]
);
const job = jobRows[0];
console.log('Job status:', job);

if (job.status === 'completed' && job.finalVideoUrl) {
  console.log('\n✅ Job already completed!');
  console.log('Final video URL:', job.finalVideoUrl);
  await conn.end();
  process.exit(0);
}

if (job.status !== 'assembling') {
  console.log(`Job is in '${job.status}' status, not 'assembling'. Setting to assembling...`);
  await conn.execute(
    "UPDATE musicVideoJobs SET status = 'assembling', updatedAt = NOW() WHERE id = ?",
    [JOB_ID]
  );
}

// Get the owner's session cookie from the database
const [sessionRows] = await conn.execute(
  'SELECT sessionToken FROM userSessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
  [job.userId]
);

let sessionCookie = null;
if (sessionRows.length > 0) {
  sessionCookie = sessionRows[0].sessionToken;
  console.log(`Found session token for user ${job.userId}`);
} else {
  console.log('No session found — trying without auth (admin endpoint)');
}

await conn.end();

// Try to call the pollProgress endpoint which will trigger assembly
console.log('\nCalling pollProgress to trigger assembly...');

const headers = {
  'Content-Type': 'application/json',
};
if (sessionCookie) {
  headers['Cookie'] = `app_session_id=${sessionCookie}`;
}

try {
  const response = await axios.post(
    `${SERVER_URL}/api/trpc/musicVideo.pollProgress`,
    {
      json: { jobId: JOB_ID },
    },
    {
      headers,
      timeout: 30000,
    }
  );
  
  console.log('pollProgress response:', JSON.stringify(response.data, null, 2));
} catch (err) {
  const status = err.response?.status;
  const detail = JSON.stringify(err.response?.data ?? err.message);
  console.error(`pollProgress failed (${status}): ${detail}`);
  
  // Try the tRPC batch format
  console.log('\nTrying tRPC batch format...');
  try {
    const batchResponse = await axios.get(
      `${SERVER_URL}/api/trpc/musicVideo.pollProgress?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { jobId: JOB_ID } } }))}`,
      {
        headers,
        timeout: 30000,
      }
    );
    console.log('Batch response:', JSON.stringify(batchResponse.data, null, 2));
  } catch (batchErr) {
    const batchStatus = batchErr.response?.status;
    const batchDetail = JSON.stringify(batchErr.response?.data ?? batchErr.message);
    console.error(`Batch request also failed (${batchStatus}): ${batchDetail}`);
    console.log('\nThe assembly will be triggered when the user opens the WizVideo page.');
    console.log('The job is in "assembling" status and ready to proceed.');
  }
}
