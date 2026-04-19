import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute("ALTER TABLE `musicVideoJobs` ADD COLUMN `storyboardLockedAt` timestamp NULL");
  console.log("✅ Added storyboardLockedAt column to musicVideoJobs");
} catch (err) {
  if (err.code === "ER_DUP_FIELDNAME") {
    console.log("ℹ️  Column storyboardLockedAt already exists — skipping");
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
