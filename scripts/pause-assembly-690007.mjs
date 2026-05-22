import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Pause the job by setting status back to 'rendering' (not 'assembling')
// This prevents the assemblyWorker from picking it up
const [res] = await conn.execute(
  "UPDATE musicVideoJobs SET status='rendering' WHERE id=690007 AND status='assembling'"
);
console.log('Assembly paused, updated rows:', res.affectedRows);

// Verify current state
const [jobs] = await conn.execute(
  "SELECT id, status, completedScenes, totalScenes, finalVideoUrl, assemblyStartedAt FROM musicVideoJobs WHERE id=690007"
);
console.log('Job state:', JSON.stringify(jobs[0]));

// Check which scenes are performance scenes (lipSync=true)
const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, lipSync, sceneType, lipSyncStatus, lipSyncVideoUrl, videoUrl FROM musicVideoScenes WHERE jobId=690007 ORDER BY sceneIndex"
);

console.log('\nAll scenes:');
scenes.forEach(s => {
  const lipSyncFlag = s.lipSync ? '🎤 PERF' : '🎬 CINE';
  const status = s.mvSceneStatus.padEnd(10);
  const lsStatus = (s.lipSyncStatus || 'none').padEnd(10);
  const hasVideo = s.videoUrl ? '✓raw' : '·raw';
  const hasLipSync = s.lipSyncVideoUrl ? '✓ls' : '·ls';
  console.log(`  [${s.sceneIndex}] ${lipSyncFlag} ${status} lipSync=${lsStatus} ${hasVideo} ${hasLipSync}`);
});

const performanceScenes = scenes.filter(s => s.lipSync);
console.log(`\nPerformance scenes (lipSync=true): ${performanceScenes.length}`);
performanceScenes.forEach(s => console.log(`  [${s.sceneIndex}] id=${s.id} lipSyncStatus=${s.lipSyncStatus} videoUrl=${s.videoUrl ? 'YES' : 'no'}`));

await conn.end();
