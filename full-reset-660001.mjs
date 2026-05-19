/**
 * Full reset of Job 660001 for re-render with cinematic 16:9 storyboard images.
 * Clears all scene statuses, video URLs, lip sync data, and idempotency records.
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  try {
    // 1. Reset all scenes to pending
    const [resetResult] = await conn.query(`
      UPDATE musicVideoScenes 
      SET 
        mvSceneStatus = 'pending',
        taskId = NULL,
        videoUrl = NULL,
        videoKey = NULL,
        errorMessage = NULL,
        lipSyncStatus = 'pending',
        lipSyncTaskId = NULL,
        lipSyncVideoUrl = NULL,
        lipSyncVideoKey = NULL,
        sceneAudioUrl = NULL,
        sceneAudioKey = NULL,
        updatedAt = NOW()
      WHERE jobId = 660001
    `);
    console.log(`✓ Reset ${resetResult.affectedRows} scenes to pending`);
    
    // 2. Clear all idempotency records for Job 660001
    const [idempResult] = await conn.query(`
      DELETE FROM providerJobLogs 
      WHERE jobId = 660001
    `);
    console.log(`✓ Cleared ${idempResult.affectedRows} idempotency records`);
    
    // 3. Reset the probe gate
    const [probeResult] = await conn.query(`
      UPDATE musicVideoJobs 
      SET 
        probePassed = NULL,
        probeSceneId = NULL,
        finalVideoUrl = NULL,
        status = 'rendering',
        updatedAt = NOW()
      WHERE id = 660001
    `);
    console.log(`✓ Reset probe gate and job status`);
    
    // 4. Verify scene storyboard images are set
    const [scenes] = await conn.query(`
      SELECT id, sceneIndex, 
        CASE WHEN previewImageUrl IS NOT NULL THEN 'HAS IMAGE' ELSE 'NO IMAGE' END as imageStatus,
        LEFT(previewImageUrl, 80) as imageUrl
      FROM musicVideoScenes 
      WHERE jobId = 660001 
      ORDER BY sceneIndex
    `);
    
    console.log("\n📋 Scene status after reset:");
    for (const s of scenes) {
      console.log(`  Scene ${s.sceneIndex}: ${s.imageStatus} — ${s.imageUrl || 'NULL'}`);
    }
    
    console.log("\n✓ Job 660001 fully reset — heartbeat will dispatch scenes with new 16:9 storyboard images");
    
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
