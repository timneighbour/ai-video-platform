import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [result] = await conn.execute(
  "UPDATE musicVideoJobs SET status = 'cancelled' WHERE id = 690005"
);
console.log("Job 690005 cancelled. Rows affected:", result.affectedRows);
await conn.end();
