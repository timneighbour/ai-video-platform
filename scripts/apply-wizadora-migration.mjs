import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../drizzle/0060_useful_purifiers.sql"), "utf8");

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Split on statement-breakpoint comments and execute each statement
const statements = sql
  .split("--> statement-breakpoint")
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Applying ${statements.length} statements...`);
for (const stmt of statements) {
  try {
    await connection.execute(stmt);
    const tableName = stmt.match(/CREATE TABLE `([^`]+)`/)?.[1] ?? "unknown";
    console.log(`✓ Created table: ${tableName}`);
  } catch (err) {
    if (err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log(`⚠ Table already exists, skipping.`);
    } else {
      console.error(`✗ Error: ${err.message}`);
      throw err;
    }
  }
}

await connection.end();
console.log("Migration complete.");
