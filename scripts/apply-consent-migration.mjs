import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, "../drizzle/0059_odd_corsair.sql");
const sql = readFileSync(sqlFile, "utf-8");

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Split on statement-breakpoint comments
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("✅ Applied:", stmt.slice(0, 60).replace(/\n/g, " ") + "...");
  } catch (err) {
    if (err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⏭  Already exists, skipping:", stmt.slice(0, 60).replace(/\n/g, " "));
    } else {
      throw err;
    }
  }
}

await conn.end();
console.log("Migration complete.");
