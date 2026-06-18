import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [scenes] = await conn.execute(
    `SELECT sceneIndex, sceneType, videoUrl, lipSyncVideoUrl, startTime 
     FROM musicVideoScenes 
     WHERE jobId = 660001 
     ORDER BY sceneIndex`
  ) as any[];
  
  for (const s of scenes) {
    const url = s.lipSyncVideoUrl || s.videoUrl;
    console.log(`S${s.sceneIndex}|${s.sceneType}|${url}`);
  }
  await conn.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
