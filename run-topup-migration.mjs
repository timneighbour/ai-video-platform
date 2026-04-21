import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const connection = await mysql.createConnection(DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`topupPurchases\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`packKey\` varchar(64) NOT NULL,
    \`packName\` varchar(128) NOT NULL,
    \`creditsAdded\` int NOT NULL,
    \`amountPaid\` int NOT NULL,
    \`currency\` varchar(8) NOT NULL DEFAULT 'gbp',
    \`stripeSessionId\` varchar(255) NOT NULL,
    \`stripePaymentIntentId\` varchar(255),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`topupPurchases_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`topupPurchases_stripeSessionId_unique\` UNIQUE(\`stripeSessionId\`)
  )`,
  "ALTER TABLE `credits` ADD COLUMN `monthlyCredits` int DEFAULT 0 NOT NULL",
  "ALTER TABLE `credits` ADD COLUMN `topupCredits` int DEFAULT 0 NOT NULL",
];

for (const sql of statements) {
  try {
    await connection.execute(sql);
    console.log("✓", sql.substring(0, 90));
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⚠ Already exists, skipping:", sql.substring(0, 90));
    } else {
      console.error("✗ Failed:", err.message);
    }
  }
}

await connection.end();
console.log("Topup migration complete.");
