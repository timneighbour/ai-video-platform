import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config();
const mysql = require("mysql2/promise");

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get column names for musicVideoJobs
const [cols] = await conn.execute("SHOW COLUMNS FROM musicVideoJobs");
const colNames = cols.map(c => c.Field);
console.log("musicVideoJobs columns:", colNames.join(", "));

// Get job status
const [rows] = await conn.execute("SELECT * FROM musicVideoJobs WHERE id = 540026");
const job = rows[0];
console.log("\nJOB 540026:");
for (const [k, v] of Object.entries(job)) {
  if (v !== null && v !== undefined && v !== "") {
    console.log(`  ${k}: ${String(v).slice(0, 120)}`);
  }
}

// Check all scene statuses
const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, taskId, providerUsed FROM musicVideoScenes WHERE jobId = 540026 ORDER BY sceneIndex"
);
console.log("\nSCENES:");
for (const s of scenes) {
  const hasVideo = colNames.includes("videoUrl");
  console.log(`  Scene ${s.sceneIndex}: status=${s.mvSceneStatus}, taskId=${s.taskId ? s.taskId.slice(0,25) : "null"}, provider=${s.providerUsed}`);
}

await conn.end();
