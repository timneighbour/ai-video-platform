import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  // Find all jobs with lip sync video URLs that are 1280x720 Air Studios style
  const [rows] = await conn.execute(
    `SELECT j.id as jobId, j.createdAt, j.title, s.sceneIndex, s.lipSyncVideoUrl, s.videoUrl, s.sceneType, s.prompt
     FROM musicVideoJobs j
     JOIN musicVideoScenes s ON s.jobId = j.id
     WHERE s.lipSyncVideoUrl IS NOT NULL AND s.lipSyncVideoUrl != ''
     AND j.id != 660001
     ORDER BY j.createdAt DESC
     LIMIT 30`
  ) as any[];
  for (const r of rows) {
    console.log(`Job ${r.jobId} (${r.createdAt}) S${r.sceneIndex} [${r.sceneType}]`);
    console.log(`  lipSync: ${r.lipSyncVideoUrl?.slice(0, 100)}`);
    console.log(`  prompt: ${(r.prompt || '').slice(0, 80)}`);
    console.log();
  }
  await conn.end();
  process.exit(0);
}
main();
