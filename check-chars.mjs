import mysql2 from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql2.createConnection(url);

try {
  // Show all characters for job 1080001
  const [rows] = await conn.execute(
    "SELECT id, name, role, isLocked, deletedAt FROM videoCharacters WHERE jobId = 1080001 ORDER BY slotIndex"
  );
  console.log("Characters for job 1080001:");
  for (const r of rows) {
    console.log(`  id=${r.id} name="${r.name}" role="${r.role}" isLocked=${r.isLocked} deletedAt=${r.deletedAt}`);
  }
} finally {
  await conn.end();
}
