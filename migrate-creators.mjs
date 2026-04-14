import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env" });

const sql = `CREATE TABLE IF NOT EXISTS \`creators\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int,
  \`name\` varchar(255) NOT NULL,
  \`creatorType\` enum('music_artist','youtuber','animator','kids_creator','content_creator') NOT NULL DEFAULT 'content_creator',
  \`bio\` text,
  \`videoUrl\` varchar(1024),
  \`thumbnailUrl\` varchar(1024),
  \`youtubeUrl\` varchar(512),
  \`instagramUrl\` varchar(512),
  \`tiktokUrl\` varchar(512),
  \`websiteUrl\` varchar(512),
  \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  \`isFeatured\` boolean NOT NULL DEFAULT false,
  \`isTrending\` boolean NOT NULL DEFAULT false,
  \`viewCount\` int NOT NULL DEFAULT 0,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`creators_id\` PRIMARY KEY(\`id\`)
)`;

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(sql);
  console.log("✅ creators table created successfully");
} catch (err) {
  if (err.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("✅ creators table already exists");
  } else {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
