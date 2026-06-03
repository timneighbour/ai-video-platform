const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query(
    'SELECT id, sceneIndex, sceneType, lipSync, startTime, duration, previewImageUrl, lyrics, prompt FROM musicVideoScenes WHERE jobId = 930003 ORDER BY sceneIndex'
  );
  const out = rows.map(r => ({
    id: r.id,
    idx: r.sceneIndex,
    type: r.sceneType,
    lipSync: r.lipSync,
    startTime: r.startTime,
    duration: r.duration,
    hasImage: !!r.previewImageUrl,
    imageUrl: r.previewImageUrl || null,
    lyrics: r.lyrics || null,
    prompt: (r.prompt || '').replace(/\n/g, ' ').slice(0, 200)
  }));
  console.log(JSON.stringify(out, null, 2));
  await conn.end();
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
