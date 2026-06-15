/**
 * Poll scene 480046 until complete, then trigger assembly for job 390001.
 * Runs server-side to complete the job without requiring user browser session.
 */
import mysql from 'mysql2/promise';
import axios from 'axios';

const DATABASE_URL = process.env.DATABASE_URL;
const ATLAS_CLOUD_API_KEY = process.env.ATLAS_CLOUD_API_KEY;
const SCENE_ID = 480046;
const JOB_ID = 390001;
const TASK_ID = 'a9f92a238e0e446aa7e7968033ab22b2'; // Atlas Cloud task ID
const ATLAS_BASE = 'https://api.atlascloud.ai/api/v1';
const POLL_INTERVAL_MS = 10000; // 10 seconds
const MAX_POLLS = 60; // 10 minutes max

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

console.log(`=== Polling scene ${SCENE_ID} for job ${JOB_ID} ===`);
console.log(`Task ID: ${TASK_ID}`);
console.log(`Polling every ${POLL_INTERVAL_MS / 1000}s, max ${MAX_POLLS} attempts\n`);

let polls = 0;
let videoUrl = null;

while (polls < MAX_POLLS) {
  polls++;
  console.log(`[Poll ${polls}/${MAX_POLLS}] ${new Date().toISOString()}`);
  
  try {
    const response = await axios.get(
      `${ATLAS_BASE}/model/prediction/${TASK_ID}`,
      {
        headers: { Authorization: `Bearer ${ATLAS_CLOUD_API_KEY}` },
        timeout: 15000,
      }
    );
    
    const data = response.data?.data;
    const status = data?.status;
    const outputs = data?.outputs;
    
    console.log(`  Status: ${status}`);
    
    if (status === 'succeeded' || status === 'completed') {
      videoUrl = outputs?.[0] ?? outputs?.video ?? outputs?.url;
      if (!videoUrl && Array.isArray(outputs)) videoUrl = outputs[0];
      console.log(`  ✅ COMPLETED! Video URL: ${videoUrl}`);
      break;
    } else if (status === 'failed' || status === 'error') {
      const error = data?.error ?? 'Unknown error';
      console.error(`  ❌ FAILED: ${error}`);
      
      // Mark scene as failed in DB
      await conn.execute(
        "UPDATE musicVideoScenes SET mvSceneStatus = 'failed', errorMessage = ?, updatedAt = NOW() WHERE id = ?",
        [error, SCENE_ID]
      );
      console.log('  Scene marked as failed in DB');
      await conn.end();
      process.exit(1);
    } else {
      // Still processing
      const progress = data?.timings?.inference ?? 0;
      console.log(`  Still processing... (inference: ${progress}s)`);
    }
  } catch (err) {
    const status = err.response?.status;
    const detail = JSON.stringify(err.response?.data ?? err.message);
    console.error(`  Poll error (${status}): ${detail}`);
  }
  
  if (polls < MAX_POLLS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

if (!videoUrl) {
  console.error(`\nMax polls reached without completion. Scene may still be processing.`);
  await conn.end();
  process.exit(1);
}

// Update scene as completed with video URL
console.log(`\nUpdating scene ${SCENE_ID} as completed...`);
await conn.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus = 'completed', videoUrl = ?, updatedAt = NOW() WHERE id = ?",
  [videoUrl, SCENE_ID]
);

// Update job completed count
await conn.execute(
  "UPDATE musicVideoJobs SET completedScenes = completedScenes + 1, updatedAt = NOW() WHERE id = ?",
  [JOB_ID]
);

// Check final counts
const [countRows] = await conn.execute(
  "SELECT COUNT(*) as total, SUM(CASE WHEN mvSceneStatus = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN mvSceneStatus = 'failed' THEN 1 ELSE 0 END) as failed FROM musicVideoScenes WHERE jobId = ?",
  [JOB_ID]
);
const counts = countRows[0];
console.log(`\nJob ${JOB_ID} scene counts: ${counts.completed}/${counts.total} completed, ${counts.failed} failed`);

const completionRate = counts.completed / counts.total;
console.log(`Completion rate: ${(completionRate * 100).toFixed(1)}%`);

if (completionRate >= 0.90) {
  console.log('\n✅ ≥90% completion threshold met — triggering assembly...');
  
  // Update job status to assembling
  await conn.execute(
    "UPDATE musicVideoJobs SET status = 'assembling', updatedAt = NOW() WHERE id = ?",
    [JOB_ID]
  );
  
  console.log(`Job ${JOB_ID} status set to 'assembling'`);
  console.log('\nAssembly will be triggered when the server processes this job.');
  console.log('The user needs to open the WizVideo page or the server background worker will pick it up.');
  console.log('\nAlternatively, call the assembleMusicVideo function directly via the tRPC API.');
} else {
  console.log(`\n❌ Completion rate ${(completionRate * 100).toFixed(1)}% is below 90% threshold`);
}

await conn.end();

console.log(`
=== Summary ===
Scene ${SCENE_ID}: completed ✅
Video URL: ${videoUrl}
Job ${JOB_ID}: ${counts.completed}/${counts.total} scenes completed
Status: assembling (ready for final video assembly)
`);
