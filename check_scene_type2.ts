import { createConnection } from 'mysql2/promise';
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL as string);
  const [rows] = await conn.query(`
    SELECT id, sceneIndex, mvSceneStatus, lipSync, sceneType, 
           startTime, duration, lyrics,
           videoUrl, lipSyncStatus, lipSyncTaskId
    FROM musicVideoScenes 
    WHERE jobId = 1020003 AND sceneIndex IN (0, 1, 11)
    ORDER BY sceneIndex
  `);
  for (const r of rows as any[]) {
    console.log(`S${r.sceneIndex}: type=${r.sceneType} lipSync=${r.lipSync} lyrics="${r.lyrics?.substring(0,50)}" start=${r.startTime} dur=${r.duration}`);
  }
  
  const [jobs] = await conn.query(`SELECT stemVocalsUrl, vocalsUrl FROM musicVideoJobs WHERE id = 1020003`);
  const j = (jobs as any[])[0];
  console.log('Stems:', { stemVocals: j.stemVocalsUrl?.substring(0,60), vocals: j.vocalsUrl?.substring(0,60) });
  
  await conn.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
