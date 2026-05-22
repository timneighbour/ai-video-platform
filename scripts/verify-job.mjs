/**
 * Verify showcase job state
 * Usage: node scripts/verify-job.mjs
 */
import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, title, status, vocalsStatus, vocalsUrl, audioDuration, sceneSetting
   FROM musicVideoJobs WHERE id = 690005`
);
console.log("Job 690005:", JSON.stringify(rows[0], null, 2));
await conn.end();
