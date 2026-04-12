import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const connection = await mysql.createConnection(DATABASE_URL);

const statements = [
  "ALTER TABLE `musicVideoJobs` ADD COLUMN `enforceStrictMode` boolean DEFAULT true NOT NULL",
  "ALTER TABLE `musicVideoJobs` ADD COLUMN `promptSnapshot` longtext",
  "ALTER TABLE `musicVideoJobs` ADD COLUMN `negativePromptSnapshot` longtext",
  "ALTER TABLE `musicVideoScenes` ADD COLUMN `strictCharacterCount` int DEFAULT 3",
  "ALTER TABLE `videoCharacters` ADD COLUMN `lockedOutfit` longtext",
  "ALTER TABLE `videoCharacters` ADD COLUMN `lockedProps` longtext",
  "ALTER TABLE `videoCharacters` ADD COLUMN `lockedRole` text",
  "ALTER TABLE `videoCharacters` ADD COLUMN `lockedRules` longtext",
  "ALTER TABLE `videoCharacters` ADD COLUMN `normalisedAt` timestamp NULL",
  "ALTER TABLE `videoCharacters` ADD COLUMN `isRealPerson` boolean DEFAULT false",
  "ALTER TABLE `videoCharacters` ADD COLUMN `characterMode` enum('photo','ai_generated') DEFAULT 'photo'",
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
