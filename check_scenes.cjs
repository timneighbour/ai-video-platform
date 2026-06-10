const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check scene statuses - using correct column names (camelCase stored as-is in TiDB)
  const [scenes] = await conn.execute(
    "SELECT id, sceneIndex, mvSceneStatus, lipSyncStatus, lipSyncTaskId, retryCount, errorMessage, providerErrorCode FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex"
  );
  console.log('Scenes for job 1020003:');
  scenes.forEach(s => {
    console.log(`  Scene ${s.sceneIndex} (id ${s.id}): status=${s.mvSceneStatus} | lipSync=${s.lipSyncStatus} | retry=${s.retryCount} | error=${s.errorMessage || 'none'} | code=${s.providerErrorCode || 'none'}`);
  });
  
  // Check debug logs
  const [logs] = await conn.execute(
    "SELECT message, debugSeverity, createdAt FROM debugLogs WHERE jobId = 1020003 ORDER BY createdAt DESC LIMIT 15"
  );
  console.log('\nRecent debug logs:');
  logs.forEach(l => console.log(`  [${l.createdAt}] [${l.debugSeverity}] ${l.message}`));
  
  // Check job status
  const [jobs] = await conn.execute("SELECT id, status, errorMessage, updatedAt FROM musicVideoJobs WHERE id = 1020003");
  console.log('\nJob status:', jobs[0]?.status, '| error:', jobs[0]?.errorMessage, '| updated:', jobs[0]?.updatedAt);
  
  await conn.end();
}

main().catch(console.error);
