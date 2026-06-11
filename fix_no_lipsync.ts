import { createConnection } from 'mysql2/promise';
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL as string);
  
  // Scenes 0 and 11 have lipSync=0 — mark them as done (skipped) so they don't block assembly
  const [result] = await conn.query(`
    UPDATE musicVideoScenes 
    SET lipSyncStatus = 'done', lipSyncTaskId = NULL, updatedAt = NOW()
    WHERE jobId = 1020003 
    AND sceneIndex IN (0, 11)
    AND lipSync = 0
    AND mvSceneStatus = 'completed'
  `);
  console.log('Marked no-lipsync scenes as done:', JSON.stringify(result));
  
  // Scene 1 needs lip-sync — make sure it's pending with no task ID so it gets submitted
  const [r2] = await conn.query(`
    UPDATE musicVideoScenes 
    SET lipSyncStatus = 'pending', lipSyncTaskId = NULL, updatedAt = NOW()
    WHERE jobId = 1020003 AND sceneIndex = 1 AND lipSync = 1
  `);
  console.log('Reset Scene 1 for lip-sync retry:', JSON.stringify(r2));
  
  // Verify
  const [rows] = await conn.query(`
    SELECT sceneIndex, mvSceneStatus, lipSync, lipSyncStatus, lipSyncTaskId
    FROM musicVideoScenes WHERE jobId = 1020003 AND sceneIndex IN (0, 1, 11)
    ORDER BY sceneIndex
  `);
  for (const r of rows as any[]) {
    console.log(`S${r.sceneIndex}: lipSync=${r.lipSync} status=${r.lipSyncStatus} taskId=${r.lipSyncTaskId}`);
  }
  
  await conn.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
