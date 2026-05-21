import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  // The original clips would have been overwritten. But the fix-and-assemble script
  // saved new clips as scene-{idx}-fixed-{ts}.mp4
  // Let me look for any 1280x720 clips in the S3 path
  const [rows] = await conn.execute(
    `SELECT sceneIndex, videoUrl, lipSyncVideoUrl, prompt FROM musicVideoScenes WHERE jobId = 660001 ORDER BY sceneIndex`
  ) as any[];
  for (const r of rows) {
    console.log(`S${r.sceneIndex}: video=${r.videoUrl?.slice(-50)} | ls=${r.lipSyncVideoUrl?.slice(-50)}`);
  }
  await conn.end();
  process.exit(0);
}
main();
