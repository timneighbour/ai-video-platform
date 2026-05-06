import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

console.log('=== Unblocking Job 390001 ===\n');

// Step 1: Check scene 480046 (scene index 8) current state
const [sceneRows] = await conn.execute(
  'SELECT id, sceneIndex, mvSceneStatus, errorMessage, taskId FROM musicVideoScenes WHERE jobId = 390001 AND sceneIndex = 8'
);
const scene = sceneRows[0];
console.log('Scene 8 current state:', JSON.stringify(scene, null, 2));

// Step 2: Check how many provider attempts exist for this scene
const [attempts] = await conn.execute(
  'SELECT id, provider, pjlStatus, attemptNumber, errorMessage, submittedAt FROM providerJobLogs WHERE sceneId = ? ORDER BY attemptNumber',
  [scene.id]
);
console.log('\nProvider attempts for scene', scene.id, ':', JSON.stringify(attempts, null, 2));

// Step 3: Delete the provider job log entries for this scene so retry counter resets
console.log('\nDeleting provider job logs for scene', scene.id, 'to reset retry counter...');
const [deleteResult] = await conn.execute(
  'DELETE FROM providerJobLogs WHERE sceneId = ?',
  [scene.id]
);
console.log('Deleted', deleteResult.affectedRows, 'log entries');

// Step 4: Reset scene 8 status from 'failed' to 'pending'
const [resetScene] = await conn.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus = 'pending', errorMessage = NULL, taskId = NULL, updatedAt = NOW() WHERE jobId = 390001 AND sceneIndex = 8"
);
console.log('Reset scene 8 to pending:', resetScene.affectedRows, 'rows updated');

// Step 5: Reset job 390001 from 'assembling' back to 'rendering' so the render loop picks it up
const [resetJob] = await conn.execute(
  "UPDATE musicVideoJobs SET status = 'rendering', errorMessage = NULL, completedScenes = 36, updatedAt = NOW() WHERE id = 390001"
);
console.log('Reset job 390001 to rendering:', resetJob.affectedRows, 'rows updated');

// Step 6: Verify final state
const [finalJobRows] = await conn.execute(
  'SELECT id, status, totalScenes, completedScenes, errorMessage FROM musicVideoJobs WHERE id = 390001'
);
console.log('\nFinal job state:', JSON.stringify(finalJobRows[0], null, 2));

const [finalSceneRows] = await conn.execute(
  'SELECT sceneIndex, mvSceneStatus, errorMessage FROM musicVideoScenes WHERE jobId = 390001 AND sceneIndex = 8'
);
console.log('Final scene 8 state:', JSON.stringify(finalSceneRows[0], null, 2));

await conn.end();
console.log('\n✅ Job 390001 unblocked. The render loop will pick up scene 8 on the next pollProgress call.');
