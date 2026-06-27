const mysql = require('mysql2/promise');
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const conn = await mysql.createConnection(url);
  // grokVideoStatus is enum('pending','processing','done','error') NOT NULL DEFAULT 'pending'
  const [r1] = await conn.execute("UPDATE musicVideoScenes SET mvSceneStatus='pending', taskId=NULL, errorMessage=NULL, heroImageUrl=NULL, grokVideoStatus='pending', grokVideoRequestId=NULL, grokVideoUrl=NULL, grokVideoFirstFrameUrl=NULL, lipSyncStatus='pending', lipSyncTaskId=NULL, lipSyncVideoUrl=NULL, compositeStatus='skipped', updatedAt=NOW() WHERE id=1140064");
  console.log('Scene reset:', JSON.stringify(r1));
  const [r2] = await conn.execute("UPDATE musicVideoJobs SET mvJobStatus='rendering', probePassed=NULL, updatedAt=NOW() WHERE id=1320002");
  console.log('Job reset:', JSON.stringify(r2));
  await conn.end();
  console.log('Done');
}
main().catch(e => { console.error(e.message); process.exit(1); });
