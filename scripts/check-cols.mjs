import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await conn.execute("DESCRIBE musicVideoScenes");
cols.forEach(c => console.log(c.Field, c.Type));
await conn.end();
