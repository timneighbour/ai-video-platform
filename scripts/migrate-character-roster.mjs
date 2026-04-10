/**
 * Migration: Add characterRoster column to musicVideoJobs
 * Run with: node scripts/migrate-character-roster.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'musicVideoJobs' 
       AND COLUMN_NAME = 'characterRoster'`
  );

  if (rows.length > 0) {
    console.log("Column characterRoster already exists — skipping.");
  } else {
    await conn.execute("ALTER TABLE `musicVideoJobs` ADD `characterRoster` text;");
    console.log("✅ Added characterRoster column to musicVideoJobs.");
  }
} finally {
  await conn.end();
}
