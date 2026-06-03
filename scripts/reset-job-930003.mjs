/**
 * Reset Job 930003 and all scenes for fresh dispatch with storyboard images.
 * Uses correct column names: mvSceneStatus (scenes), status (jobs)
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Reset all scenes to pending
const [r1] = await conn.execute(
  `UPDATE musicVideoScenes 
   SET mvSceneStatus = 'pending', taskId = NULL, videoUrl = NULL, videoKey = NULL,
       lipSyncTaskId = NULL, lipSyncVideoUrl = NULL,
       hedraGenerationId = NULL, hedraVideoUrl = NULL,
       compositeVideoUrl = NULL,
       errorMessage = NULL, providerErrorCode = NULL
   WHERE jobId = 930003`,
  []
);
console.log('Scenes reset:', r1.affectedRows, 'rows');

// Reset the job
const [r2] = await conn.execute(
  `UPDATE musicVideoJobs 
   SET status = 'rendering', finalVideoUrl = NULL, finalVideoKey = NULL,
       assemblyStartedAt = NULL, errorMessage = NULL
   WHERE id = 930003`,
  []
);
console.log('Job reset:', r2.affectedRows, 'rows');

// Verify
const [scenes] = await conn.query(
  'SELECT id, sceneIndex, mvSceneStatus, previewImageUrl IS NOT NULL as hasImage FROM musicVideoScenes WHERE jobId = 930003 ORDER BY sceneIndex'
);
console.log('\nScene status after reset:');
scenes.forEach(s => console.log(`  Scene ${s.sceneIndex} (${s.id}): ${s.mvSceneStatus}, hasImage=${s.hasImage}`));

const [jobs] = await conn.query('SELECT id, status, finalVideoUrl FROM musicVideoJobs WHERE id = 930003');
console.log('\nJob status:', jobs[0]?.status);

await conn.end();
console.log('\n✅ Reset complete — ready for dispatch');
