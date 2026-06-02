import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query(
    `SELECT id, sceneIndex, sceneType, mvSceneStatus, lipSync, lipSyncStatus,
     videoUrl, lipSyncVideoUrl, previewImageUrl, prompt, startTime, duration
     FROM musicVideoScenes WHERE jobId = 720001 ORDER BY sceneIndex ASC`
  ) as any[];
  for (const r of rows) {
    console.log(`\n=== Scene index ${r.sceneIndex} (id=${r.id}) ===`);
    console.log(`type=${r.sceneType} status=${r.mvSceneStatus} lipSync=${r.lipSync} lipSyncStatus=${r.lipSyncStatus}`);
    console.log(`startTime=${r.startTime} duration=${r.duration}`);
    console.log(`prompt: ${(r.prompt||'').substring(0,250)}`);
    console.log(`videoUrl: ${r.videoUrl ? r.videoUrl.substring(0,150) : 'none'}`);
    console.log(`lipSyncVideoUrl: ${r.lipSyncVideoUrl ? r.lipSyncVideoUrl.substring(0,150) : 'none'}`);
    console.log(`previewImageUrl: ${r.previewImageUrl ? r.previewImageUrl.substring(0,150) : 'none'}`);
  }
  await conn.end();
}
main().catch(console.error);
