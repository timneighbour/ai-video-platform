import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Fixing job 690007: setting fallbackProvider=wavespeed ===');
const [jobUpdate] = await conn.execute(
  "UPDATE musicVideoJobs SET fallbackProvider='wavespeed', probePassed=NULL, probeSceneId=NULL WHERE id=690007"
);
console.log('Job update affected rows:', jobUpdate.affectedRows);

// Check if there's a renderAttempts or idempotency table
console.log('\n=== Checking for idempotency/renderAttempts tables ===');
try {
  const [tables] = await conn.execute("SHOW TABLES LIKE '%attempt%'");
  console.log('Attempt tables:', tables.map(t => Object.values(t)[0]));
} catch (e) {
  console.log('Error checking tables:', e.message);
}

try {
  const [tables2] = await conn.execute("SHOW TABLES LIKE '%idempoten%'");
  console.log('Idempotency tables:', tables2.map(t => Object.values(t)[0]));
} catch (e) {
  console.log('Error:', e.message);
}

// Check renderAttempts table
try {
  const [attempts] = await conn.execute(
    "SELECT * FROM renderAttempts WHERE sceneId IN (SELECT id FROM musicVideoScenes WHERE jobId=690007) LIMIT 20"
  );
  console.log('\nrenderAttempts for job 690007:', attempts.length, 'records');
  attempts.forEach(a => console.log(' ', JSON.stringify(a)));
  
  if (attempts.length > 0) {
    // Delete idempotency records for this job's scenes
    const [del] = await conn.execute(
      "DELETE FROM renderAttempts WHERE sceneId IN (SELECT id FROM musicVideoScenes WHERE jobId=690007)"
    );
    console.log('Deleted renderAttempts:', del.affectedRows);
  }
} catch (e) {
  console.log('renderAttempts error:', e.message);
}

// Reset all scenes to pending with no taskId
console.log('\n=== Resetting all scenes for job 690007 to pending ===');
const [sceneReset] = await conn.execute(
  `UPDATE musicVideoScenes 
   SET mvSceneStatus='pending', taskId=NULL, errorMessage=NULL, retryCount=0,
       lipSyncStatus='pending', lipSyncTaskId=NULL, lipSyncVideoUrl=NULL, videoUrl=NULL
   WHERE jobId=690007`
);
console.log('Scenes reset:', sceneReset.affectedRows);

// Verify final state
const [job] = await conn.execute("SELECT id, status, fallbackProvider, probePassed, probeSceneId FROM musicVideoJobs WHERE id=690007");
console.log('\nJob state:', JSON.stringify(job[0]));

const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, taskId, retryCount FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
);
console.log('\nScene states:');
scenes.forEach(s => console.log(`  [${s.sceneIndex}] id=${s.id} ${s.mvSceneStatus} taskId=${s.taskId || 'none'}`));

await conn.end();
console.log('\nDone. Now trigger the heartbeat to start rendering.');
