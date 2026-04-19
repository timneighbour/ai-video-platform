import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  // Check if column already exists
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'musicVideoScenes' 
     AND COLUMN_NAME = 'userEditedPrompt'`
  );
  if (rows.length > 0) {
    console.log("ℹ️  Column userEditedPrompt already exists — skipping");
  } else {
    await conn.execute(
      "ALTER TABLE `musicVideoScenes` ADD COLUMN `userEditedPrompt` boolean DEFAULT false NOT NULL"
    );
    console.log("✅ Column userEditedPrompt added to musicVideoScenes");
  }
} finally {
  await conn.end();
}
