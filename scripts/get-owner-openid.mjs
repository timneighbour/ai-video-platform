import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, openId, name, email FROM users WHERE id = 1"
);
console.log(JSON.stringify(rows[0]));
await conn.end();
