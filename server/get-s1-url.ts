import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const [rows] = await conn.execute(
    "SELECT lipSyncVideoUrl, videoUrl FROM musicVideoScenes WHERE jobId = 660001 AND sceneIndex = 1"
  ) as any[];
  console.log("S1 lipSyncVideoUrl:", rows[0].lipSyncVideoUrl);
  console.log("S1 videoUrl:", rows[0].videoUrl);
  await conn.end();
  process.exit(0);
}
main();
