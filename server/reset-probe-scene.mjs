/**
 * Reset scene 780014 back to pending so the heartbeat re-dispatches it as text-to-video.
 * Also reset probePassed to null on job 870022 so the probe gate re-runs.
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);
try {
  // Reset the scene
  const [r1] = await conn.execute(
    "UPDATE `musicVideoScenes` SET status = 'pending', taskId = NULL, errorMessage = 'Reset: Atlas i2v real-person filter — retry as t2v', updatedAt = NOW() WHERE id = 780014"
  );
  console.log('Scene 780014 reset. Affected rows:', r1.affectedRows);

  // Reset probePassed on the job so probe gate re-runs from scratch
  const [r2] = await conn.execute(
    "UPDATE `musicVideoJobs` SET probePassed = NULL, probeSceneId = NULL, updatedAt = NOW() WHERE id = 870022"
  );
  console.log('Job 870022 probe reset. Affected rows:', r2.affectedRows);

  // Verify
  const [scenes] = await conn.execute(
    "SELECT id, status, taskId, sceneType FROM `musicVideoScenes` WHERE jobId = 870022 ORDER BY sceneIndex"
  );
  console.log('\nScene states after reset:');
  for (const s of scenes) {
    console.log(`  Scene id=${s.id} [${s.sceneType}] status=${s.status} taskId=${s.taskId || 'none'}`);
  }
} finally {
  await conn.end();
}
