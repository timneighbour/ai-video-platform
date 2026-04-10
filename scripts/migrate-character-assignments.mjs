/**
 * Migration: Add characterAssignments column to musicVideoScenes
 * Run with: node scripts/migrate-character-assignments.mjs
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
  // Check if column already exists
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'musicVideoScenes' 
       AND COLUMN_NAME = 'characterAssignments'`
  );

  if (rows.length > 0) {
    console.log("Column characterAssignments already exists — skipping.");
  } else {
    await conn.execute("ALTER TABLE `musicVideoScenes` ADD `characterAssignments` text;");
    console.log("✅ Added characterAssignments column to musicVideoScenes.");
  }
} finally {
  await conn.end();
}
