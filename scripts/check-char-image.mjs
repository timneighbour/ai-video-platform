import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { musicVideoJobs } from "../drizzle/schema.ts";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);
const jobs = await db.select({ id: musicVideoJobs.id, characterImageUrl: musicVideoJobs.characterImageUrl }).from(musicVideoJobs);
for (const j of jobs) {
  console.log("Job", j.id, ":", j.characterImageUrl ? j.characterImageUrl.substring(0, 100) + "..." : "null");
}
await conn.end();
