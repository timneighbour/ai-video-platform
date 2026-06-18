import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const [rows] = await conn.execute(
    'SELECT sceneIndex, startTime, lipSyncVideoUrl IS NOT NULL as hasLipSync FROM musicVideoScenes WHERE jobId = 660001 ORDER BY sceneIndex'
  ) as any[];
  for (const r of rows) {
    console.log(`Scene ${r.sceneIndex} | startTime: ${r.startTime}ms | hasLipSync: ${r.hasLipSync}`);
  }
  await conn.end();
  process.exit(0);
}
main();
