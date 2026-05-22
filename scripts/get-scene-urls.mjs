import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [scenes] = await conn.execute(
  `SELECT sceneIndex, mvSceneStatus as status, videoUrl, sceneType,
          startTime, duration, LEFT(prompt, 120) as prompt
   FROM musicVideoScenes WHERE jobId = 690005 ORDER BY sceneIndex`
);
scenes.forEach(s => {
  console.log(`Scene ${s.sceneIndex} [${s.sceneType}] ${s.startTime}s +${s.duration}s [${s.status}]`);
  if (s.videoUrl) console.log(`  URL: ${s.videoUrl}`);
  if (s.prompt) console.log(`  Prompt: ${s.prompt}`);
});
await conn.end();
