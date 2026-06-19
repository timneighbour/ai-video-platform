import mysql2 from "mysql2/promise";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await mysql2.createConnection(url);
try {
  // Soft-delete the 5 orchestra musicians from job 1080001 (keep only Zara id=720001)
  const [result] = await conn.execute(
    "UPDATE videoCharacters SET deletedAt = NOW(), updatedAt = NOW() WHERE jobId = 1080001 AND id != 720001"
  );
  console.log(`Soft-deleted ${result.affectedRows} orchestra musicians from job 1080001`);
  
  // Verify
  const [rows] = await conn.execute(
    "SELECT id, name, role, deletedAt FROM videoCharacters WHERE jobId = 1080001 ORDER BY slotIndex"
  );
  console.log("Remaining active characters for job 1080001:");
  for (const r of rows) {
    const status = r.deletedAt ? "(SOFT-DELETED)" : "(ACTIVE)";
    console.log(`  id=${r.id} name="${r.name}" role="${r.role}" ${status}`);
  }
} finally {
  await conn.end();
}
