/**
 * Reset all performance scenes in job 720001 for a fresh re-run.
 *
 * This resets:
 * - status → 'pending' (so heartbeat picks them up again)
 * - lipSyncStatus → 'pending'
 * - compositeStatus → 'pending'
 * - taskId, lipSyncTaskId, compositeTaskId → null
 * - videoUrl, lipSyncVideoUrl, compositeVideoUrl → null (clear old AI singer backgrounds)
 *
 * The new empty stage prompts are already in the DB (from fix-performance-prompts.mjs).
 */

import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await createConnection(url);

// First, check current startTime values to verify the unit
const [scenes] = await conn.execute(
  `SELECT id, sceneIndex, sceneType, startTime, duration, mvSceneStatus, lipSyncStatus, compositeStatus 
   FROM musicVideoScenes WHERE jobId = 720001 ORDER BY sceneIndex`
);

console.log('Current scene state:');
for (const s of scenes) {
  console.log(`  Scene ${s.id} (idx=${s.sceneIndex}, ${s.sceneType}): startTime=${s.startTime}s, dur=${s.duration}s | status=${s.mvSceneStatus} | lipSync=${s.lipSyncStatus} | composite=${s.compositeStatus}`);
}

// Reset all performance scenes
console.log('\nResetting performance scenes to pending...');
const [result] = await conn.execute(
  `UPDATE musicVideoScenes 
   SET 
     mvSceneStatus = 'pending',
     lipSyncStatus = 'pending',
     compositeStatus = 'pending',
     taskId = NULL,
     lipSyncTaskId = NULL,
     videoUrl = NULL,
     lipSyncVideoUrl = NULL,
     compositeVideoUrl = NULL,
     updatedAt = NOW()
   WHERE jobId = 720001 AND sceneType = 'performance'`
);

console.log(`Reset ${result.affectedRows} performance scenes to pending.`);

// Also reset the job status so it re-enters the dispatch loop
const [jobResult] = await conn.execute(
  `UPDATE musicVideoJobs 
   SET 
     status = 'rendering',
     updatedAt = NOW()
   WHERE id = 720001`
);
console.log(`Job 720001 status reset to 'rendering' (${jobResult.affectedRows} row affected).`);

// Verify the reset
const [resetScenes] = await conn.execute(
  `SELECT id, sceneIndex, sceneType, mvSceneStatus, lipSyncStatus, compositeStatus, prompt
   FROM musicVideoScenes WHERE jobId = 720001 AND sceneType = 'performance' ORDER BY sceneIndex`
);

console.log('\nPost-reset state:');
for (const s of resetScenes) {
  console.log(`  Scene ${s.id} (idx=${s.sceneIndex}): status=${s.mvSceneStatus} | lipSync=${s.lipSyncStatus} | composite=${s.compositeStatus}`);
  console.log(`    Prompt: ${(s.prompt || '').slice(0, 100)}...`);
}

await conn.end();
console.log('\nDone. Heartbeat will pick up these scenes on next tick.');
