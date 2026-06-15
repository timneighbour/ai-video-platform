import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Migration 0067: add previewCreditsUsed to musicVideoJobs
try {
  await conn.execute('ALTER TABLE `musicVideoJobs` ADD `previewCreditsUsed` int DEFAULT 0 NOT NULL');
  console.log('✅ Migration 0067 applied: previewCreditsUsed column added');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log('⏭  Migration 0067 already applied');
  } else {
    console.error('❌ Migration 0067 failed:', e.message);
  }
}

// Migration 0068: create creditDisputes table
const createDisputesSQL = `
CREATE TABLE IF NOT EXISTS \`creditDisputes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`jobId\` int,
  \`jobType\` varchar(32),
  \`creditsCharged\` int NOT NULL,
  \`creditsRequested\` int,
  \`reason\` text NOT NULL,
  \`status\` enum('pending','approved','partial','rejected') NOT NULL DEFAULT 'pending',
  \`adminNote\` text,
  \`creditsRefunded\` int NOT NULL DEFAULT 0,
  \`resolvedBy\` int,
  \`resolvedAt\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`creditDisputes_id\` PRIMARY KEY(\`id\`)
)
`;

try {
  await conn.execute(createDisputesSQL);
  console.log('✅ Migration 0068 applied: creditDisputes table created');
} catch (e) {
  console.error('❌ Migration 0068 failed:', e.message);
}

await conn.end();
console.log('Done.');
