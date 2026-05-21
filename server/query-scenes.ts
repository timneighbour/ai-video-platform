import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const [rows] = await conn.execute(
    "SELECT sceneIndex, sceneType, videoUrl, lipSyncVideoUrl FROM musicVideoScenes WHERE jobId = 660001 ORDER BY sceneIndex"
  ) as any[];
  for (const r of rows) {
    const ls = r.lipSyncVideoUrl ? "HAS_LS" : "no_ls";
    console.log(`S${r.sceneIndex} | ${r.sceneType} | ${ls} | ${(r.videoUrl || "").substring(0, 90)}`);
  }
  await conn.end();
  process.exit(0);
}
main();
