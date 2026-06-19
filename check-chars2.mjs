import mysql2 from "mysql2/promise";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await mysql2.createConnection(url);
try {
  const [rows] = await conn.execute(
    "SELECT id, jobId, name, role, isLocked, deletedAt FROM videoCharacters WHERE jobId >= 1050000 ORDER BY jobId, slotIndex"
  );
  console.log("Characters for recent jobs:");
  for (const r of rows) {
    console.log(`  jobId=${r.jobId} id=${r.id} name="${r.name}" role="${r.role}" isLocked=${r.isLocked} deletedAt=${r.deletedAt}`);
  }
} finally {
  await conn.end();
}
