import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check job status
const [jobs] = await conn.execute(
  "SELECT id, status, totalScenes FROM musicVideoJobs WHERE id = 690005"
);
console.log("Job:", JSON.stringify(jobs[0]));

// Check scenes
const [scenes] = await conn.execute(
  `SELECT id, sceneIndex, sceneType, startTime, endTime, status, 
          LEFT(description, 100) as description
   FROM musicVideoScenes WHERE jobId = 690005 ORDER BY sceneIndex`
);
console.log(`\nScenes (${scenes.length}):`);
scenes.forEach(s => {
  console.log(`  [${s.sceneIndex}] ${s.sceneType} ${s.startTime}s-${s.endTime}s [${s.status}] ${s.description}`);
});
await conn.end();
