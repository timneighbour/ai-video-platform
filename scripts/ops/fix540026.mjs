import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);
console.log('Connected');

// Check actual column names first
const [scenes] = await db.execute(`SELECT id, sceneIndex, startTime, duration, mvSceneStatus, lipSync, lipSyncStatus FROM musicVideoScenes WHERE jobId = 540026 ORDER BY sceneIndex`);
console.log('Current scenes:');
for (const s of scenes) console.log(`  Scene ${s.sceneIndex} (id=${s.id}): mvSceneStatus=${s.mvSceneStatus}, lipSync=${s.lipSync}, lipSyncStatus=${s.lipSyncStatus}`);

// Fix scenes 0 and 1 — disable lip sync (instrumental intro 0-12s)
const [r1] = await db.execute(`UPDATE musicVideoScenes SET lipSync=0, lipSyncStatus='done', lipSyncVideoUrl=NULL, lipSyncTaskId=NULL, updatedAt=NOW() WHERE jobId=540026 AND sceneIndex IN (0,1)`);
console.log(`Scenes 0+1 fixed: ${r1.affectedRows} rows (lip sync disabled)`);

// Reset scene 2 for clean probe render (12-18s, first vocal scene)
const [r2] = await db.execute(`UPDATE musicVideoScenes SET mvSceneStatus='pending', videoUrl=NULL, taskId=NULL, lipSyncVideoUrl=NULL, lipSyncTaskId=NULL, lipSyncStatus='pending', lipSync=1, updatedAt=NOW() WHERE jobId=540026 AND sceneIndex=2`);
console.log(`Scene 2 reset: ${r2.affectedRows} rows (probe render)`);

// Check job columns
const [jcols] = await db.execute(`DESCRIBE musicVideoJobs`);
const jobCols = jcols.map(c => c.Field);
console.log('\nJob columns:', jobCols.filter(c => c.includes('probe') || c.includes('status') || c.includes('final')).join(', '));

// Reset job to rendering with probe gate active
const [r3] = await db.execute(`UPDATE musicVideoJobs SET status='rendering', probePassed=0, probeApprovedAt=NULL, probeVideoUrl=NULL, updatedAt=NOW() WHERE id=540026`);
console.log(`Job 540026 reset: ${r3.affectedRows} rows (status=rendering)`);

// Ensure probeSceneId is set to scene 2
const [s2] = await db.execute(`SELECT id FROM musicVideoScenes WHERE jobId=540026 AND sceneIndex=2`);
if (s2.length > 0) {
  const [j] = await db.execute(`SELECT probeSceneId FROM musicVideoJobs WHERE id=540026`);
  if (j[0].probeSceneId !== s2[0].id) {
    await db.execute(`UPDATE musicVideoJobs SET probeSceneId=? WHERE id=540026`, [s2[0].id]);
    console.log(`probeSceneId set to ${s2[0].id}`);
  } else console.log(`probeSceneId already ${j[0].probeSceneId} OK`);
}

// Final verification
const [fs] = await db.execute(`SELECT id, sceneIndex, startTime, duration, mvSceneStatus, lipSync, lipSyncStatus FROM musicVideoScenes WHERE jobId=540026 ORDER BY sceneIndex`);
console.log('\nFinal scene state:');
for (const s of fs) console.log(`  Scene ${s.sceneIndex} (${s.startTime}s-${(s.startTime??0)+(s.duration??6)}s): mvSceneStatus=${s.mvSceneStatus}, lipSync=${s.lipSync}, lipSyncStatus=${s.lipSyncStatus}`);

const [fj] = await db.execute(`SELECT id, status, probePassed, probeSceneId FROM musicVideoJobs WHERE id=540026`);
console.log('Job:', fj[0]);
await db.end();
console.log('Done!');
