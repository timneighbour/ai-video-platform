import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const connection = await mysql.createConnection(DATABASE_URL);

const statements = [
  "ALTER TABLE `videoCharacters` ADD COLUMN `masterPortraitUrl` varchar(1024)",
  "ALTER TABLE `videoCharacters` ADD COLUMN `masterSeed` int",
  "ALTER TABLE `videoCharacters` ADD COLUMN `characterPrompt` text",
  "ALTER TABLE `videoCharacters` ADD COLUMN `masterPortraitGeneratedAt` timestamp NULL",
];

for (const sql of statements) {
  try {
    await connection.execute(sql);
    console.log("✓", sql.substring(0, 90));
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("⚠ Already exists, skipping:", sql.substring(0, 90));
    } else {
      console.error("✗ Failed:", err.message);
    }
  }
}

await connection.end();
console.log("Migration complete.");
