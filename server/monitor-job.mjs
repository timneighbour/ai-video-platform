/**
 * monitor-job.mjs — query job 540026 pipeline state
 * Run: node server/monitor-job.mjs
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";

const JOB_ID = 540026;

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);

  // Job overview
  const [jobRows] = await conn.execute(
    `SELECT id, status, probePassed, probeSceneId, probeVideoUrl, probeApprovedAt,
            finalVideoUrl, errorMessage, maxSpendLimitUsd, providerSpendUsd,
            fallbackProvider, updatedAt
     FROM musicVideoJobs WHERE id = ?`,
    [JOB_ID]
  );
  console.log("\n=== JOB", JOB_ID, "===");
  console.log(JSON.stringify(jobRows[0] ?? "NOT FOUND", null, 2));

  // Scene statuses
  const [sceneRows] = await conn.execute(
    `SELECT id, sceneIndex, mvSceneStatus as status, lipSync, lipSyncStatus, taskId,
            videoUrl IS NOT NULL as hasVideoUrl,
            lipSyncVideoUrl IS NOT NULL as hasLipSyncUrl,
            previewImageUrl IS NOT NULL as hasPreviewImage,
            startTime, duration, errorMessage, retryCount, updatedAt
     FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex`,
    [JOB_ID]
  );
  console.log("\n=== SCENES (" + sceneRows.length + " total) ===");
  sceneRows.forEach(s => console.log(JSON.stringify(s)));

  // Provider logs
  const [logRows] = await conn.execute(
    `SELECT id, sceneId, provider, pjlStatus as status, actualCostUsd as costUsd, errorMessage, submittedAt, completedAt
     FROM providerJobLogs WHERE jobId = ? ORDER BY createdAt DESC LIMIT 15`,
    [JOB_ID]
  );
  console.log("\n=== PROVIDER LOGS (last 15) ===");
  logRows.forEach(l => console.log(JSON.stringify(l)));

  // Spend summary
  const [spendRows] = await conn.execute(
    `SELECT provider, COUNT(*) as count, SUM(actualCostUsd) as total_cost,
            SUM(CASE WHEN pjlStatus='success' THEN 1 ELSE 0 END) as successes,
            SUM(CASE WHEN pjlStatus='failed' THEN 1 ELSE 0 END) as failures
     FROM providerJobLogs WHERE jobId = ? GROUP BY provider`,
    [JOB_ID]
  );
  console.log("\n=== SPEND SUMMARY ===");
  spendRows.forEach(r => console.log(JSON.stringify(r)));

  await conn.end();
}

main().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
