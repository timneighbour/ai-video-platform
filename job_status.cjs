const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [jobs] = await conn.execute("SELECT id, status, probePassed, completedScenes, totalScenes, updatedAt FROM musicVideoJobs WHERE id = 1020003");
  const job = jobs[0];
  console.log(`Job 1020003: status=${job.status} | probePassed=${job.probePassed} | progress=${job.completedScenes}/${job.totalScenes} | updated=${job.updatedAt}`);
  
  const [scenes] = await conn.execute(
    "SELECT id, sceneIndex, mvSceneStatus, lipSyncStatus, lipSyncTaskId, retryCount FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex"
  );
  console.log('\nScenes:');
  scenes.forEach(s => {
    console.log(`  Scene ${s.sceneIndex} (id ${s.id}): status=${s.mvSceneStatus} | lipSync=${s.lipSyncStatus} | taskId=${s.lipSyncTaskId || 'none'} | retry=${s.retryCount}`);
  });
  
  await conn.end();
}

main().catch(console.error);
