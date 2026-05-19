/**
 * DB fix script for job 540026 (Zara cinematic demo)
 * 
 * Fixes:
 * 1. Scenes 0 and 1 (600001, 600002): disable lip sync (instrumental intro, 0-12s)
 * 2. Scene 2 (600003): reset for clean probe render (12-18s, first vocal scene)
 * 3. Job 540026: reset to rendering status with probe gate active
 */
import mysql from 'mysql2/promise';

const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Connected to database');

// Step 1: Check current state of all scenes for job 540026
const [scenes] = await db.execute(
  `SELECT id, jobId, sceneIndex, startTime, duration, status, lipSync, lipSyncStatus, 
   LEFT(videoUrl, 80) as videoUrl_short,
   LEFT(lipSyncVideoUrl, 80) as lipSyncVideoUrl_short,
   taskId, lipSyncTaskId
   FROM musicVideoScenes 
   WHERE jobId = 540026 
   ORDER BY sceneIndex`
);

console.log('\n=== Current scene state ===');
for (const s of scenes) {
  console.log(`Scene ${s.sceneIndex} (id=${s.id}): status=${s.status}, lipSync=${s.lipSync}, lipSyncStatus=${s.lipSyncStatus}`);
  console.log(`  videoUrl: ${s.videoUrl_short || 'NULL'}`);
  console.log(`  lipSyncVideoUrl: ${s.lipSyncVideoUrl_short || 'NULL'}`);
  console.log(`  taskId: ${s.taskId || 'NULL'}, lipSyncTaskId: ${s.lipSyncTaskId || 'NULL'}`);
}

// Step 2: Fix scenes 0 and 1 — disable lip sync (instrumental intro)
// These scenes already have completed renders — just mark lipSync=false and lipSyncStatus='done'
// so the heartbeat uses the raw WaveSpeed video instead of waiting for SyncLabs
console.log('\n=== Fixing scenes 0 and 1 (instrumental intro — no lip sync) ===');
const [fix01] = await db.execute(
  `UPDATE musicVideoScenes 
   SET lipSync = 0, lipSyncStatus = 'done', lipSyncVideoUrl = NULL, lipSyncTaskId = NULL, updatedAt = NOW()
   WHERE jobId = 540026 AND sceneIndex IN (0, 1)`
);
console.log(`Updated ${fix01.affectedRows} rows for scenes 0 and 1`);

// Step 3: Reset scene 2 (sceneIndex=2, id=600003) for clean probe render
// Clear all render artifacts so the heartbeat dispatches it fresh
console.log('\n=== Resetting scene 2 (probe scene, 12-18s) for clean render ===');
const [fix2] = await db.execute(
  `UPDATE musicVideoScenes 
   SET status = 'pending', 
       videoUrl = NULL, 
       taskId = NULL, 
       lipSyncVideoUrl = NULL, 
       lipSyncTaskId = NULL, 
       lipSyncStatus = 'pending',
       lipSync = 1,
       updatedAt = NOW()
   WHERE jobId = 540026 AND sceneIndex = 2`
);
console.log(`Updated ${fix2.affectedRows} rows for scene 2`);

// Step 4: Check current job state
const [jobs] = await db.execute(
  `SELECT id, status, probePassed, probeSceneId, probeApprovedAt, 
   LEFT(finalVideoUrl, 80) as finalVideoUrl_short
   FROM musicVideoJobs 
   WHERE id = 540026`
);
console.log('\n=== Current job state ===');
console.log(jobs[0]);

// Step 5: Reset job 540026 to rendering status with probe gate active
console.log('\n=== Resetting job 540026 to rendering status ===');
const [fixJob] = await db.execute(
  `UPDATE musicVideoJobs 
   SET status = 'rendering', 
       probePassed = 0, 
       probeApprovedAt = NULL,
       probeVideoUrl = NULL,
       updatedAt = NOW()
   WHERE id = 540026`
);
console.log(`Updated ${fixJob.affectedRows} rows for job 540026`);

// Step 6: Verify the probeSceneId is set to scene 2 (600003)
const [jobAfter] = await db.execute(
  `SELECT id, status, probePassed, probeSceneId, probeApprovedAt
   FROM musicVideoJobs 
   WHERE id = 540026`
);
console.log('\n=== Job state after fix ===');
console.log(jobAfter[0]);

if (!jobAfter[0].probeSceneId) {
  console.log('\nWARNING: probeSceneId is NULL — need to set it to scene 2 id');
  // Find scene 2 id
  const [scene2] = await db.execute(
    `SELECT id FROM musicVideoScenes WHERE jobId = 540026 AND sceneIndex = 2`
  );
  if (scene2.length > 0) {
    const scene2Id = scene2[0].id;
    console.log(`Setting probeSceneId to ${scene2Id}`);
    await db.execute(
      `UPDATE musicVideoJobs SET probeSceneId = ? WHERE id = 540026`,
      [scene2Id]
    );
    console.log('probeSceneId updated');
  }
}

// Final verification
const [finalScenes] = await db.execute(
  `SELECT id, sceneIndex, startTime, duration, status, lipSync, lipSyncStatus
   FROM musicVideoScenes 
   WHERE jobId = 540026 
   ORDER BY sceneIndex`
);
console.log('\n=== Final scene state ===');
for (const s of finalScenes) {
  console.log(`Scene ${s.sceneIndex} (id=${s.id}, ${s.startTime}s-${s.startTime+s.duration}s): status=${s.status}, lipSync=${s.lipSync}, lipSyncStatus=${s.lipSyncStatus}`);
}

await db.end();
console.log('\nDone!');
