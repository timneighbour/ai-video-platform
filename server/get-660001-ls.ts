import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const [rows] = await conn.execute(
    "SELECT sceneIndex, lipSyncVideoUrl, videoUrl FROM musicVideoScenes WHERE jobId = 660001 AND sceneType = 'performance' ORDER BY sceneIndex"
  ) as any[];
  for (const r of rows) {
    console.log(`S${r.sceneIndex}:`);
    console.log(`  lipSync: ${r.lipSyncVideoUrl}`);
    console.log(`  video:   ${r.videoUrl}`);
  }
  await conn.end();
  process.exit(0);
}
main();
