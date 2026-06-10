const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('Resetting job 1020003 for clean re-render with HeyGen Precision...');
  
  // Reset scenes 900025 and 900036 (completed video but retry limit hit)
  // Keep their videoUrl (already rendered) but reset lipSync and retry counter
  await conn.execute(`
    UPDATE musicVideoScenes 
    SET retryCount = 0, 
        providerErrorCode = NULL, 
        providerErrorAt = NULL,
        errorMessage = NULL,
        lipSyncStatus = 'pending',
        lipSyncTaskId = NULL,
        updatedAt = NOW()
    WHERE id IN (900025, 900036)
  `);
  console.log('Reset scenes 900025 and 900036 retry counters');
  
  // Reset scene 900026 (failed_retryable due to WaveSpeed balance)
  await conn.execute(`
    UPDATE musicVideoScenes 
    SET mvSceneStatus = 'pending',
        retryCount = 0,
        providerErrorCode = NULL,
        providerErrorAt = NULL,
        errorMessage = NULL,
        lipSyncStatus = 'pending',
        lipSyncTaskId = NULL,
        taskId = NULL,
        videoUrl = NULL,
        updatedAt = NOW()
    WHERE id = 900026
  `);
  console.log('Reset scene 900026 to pending');
  
  // Reset job to rendering
  await conn.execute(`
    UPDATE musicVideoJobs 
    SET status = 'rendering', updatedAt = NOW()
    WHERE id = 1020003
  `);
  console.log('Job 1020003 reset to rendering');
  
  // Verify
  const [scenes] = await conn.execute(
    "SELECT id, sceneIndex, mvSceneStatus, lipSyncStatus, retryCount, errorMessage FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex"
  );
  console.log('\nVerification:');
  scenes.forEach(s => {
    console.log(`  Scene ${s.sceneIndex} (id ${s.id}): status=${s.mvSceneStatus} | lipSync=${s.lipSyncStatus} | retry=${s.retryCount} | error=${s.errorMessage || 'none'}`);
  });
  
  const [jobs] = await conn.execute("SELECT id, status FROM musicVideoJobs WHERE id = 1020003");
  console.log('\nJob status:', jobs[0]?.status);
  
  await conn.end();
}

main().catch(console.error);
