/**
 * Inject the Demucs vocal stem into the showcase job and trigger startRender
 * via the live production API.
 *
 * Usage: node scripts/inject-stem-and-start.mjs <jobId>
 */
import mysql from "mysql2/promise";

const JOB_ID = parseInt(process.argv[2] || "690005");
const VOCAL_STEM_URL =
  "https://manus-storage.s3.us-east-1.amazonaws.com/showcase-vocal-stem_c3b2a1d0.mp3";
const VOCAL_STEM_KEY = "showcase-vocal-stem_c3b2a1d0.mp3";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DB_URL);

// 1. Verify the job exists
const [jobs] = await conn.execute(
  "SELECT id, title, status, userId FROM musicVideoJobs WHERE id = ?",
  [JOB_ID]
);
if (!jobs.length) {
  console.error(`Job ${JOB_ID} not found`);
  await conn.end();
  process.exit(1);
}
const job = jobs[0];
console.log(`Job found: id=${job.id} title="${job.title}" status=${job.status}`);

// 2. Check if musicVideoVocalStems table exists and what columns it has
const [cols] = await conn.execute(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'musicVideoVocalStems' 
   ORDER BY ORDINAL_POSITION`
);
console.log(
  "musicVideoVocalStems columns:",
  cols.map((c) => c.COLUMN_NAME).join(", ")
);

// 3. Insert the vocal stem record
// Check if one already exists for this job
const [existing] = await conn.execute(
  "SELECT id FROM musicVideoVocalStems WHERE jobId = ? LIMIT 1",
  [JOB_ID]
);

if (existing.length) {
  console.log(`Vocal stem already exists for job ${JOB_ID}, updating...`);
  await conn.execute(
    `UPDATE musicVideoVocalStems 
     SET vocalsUrl = ?, vocalsKey = ?, status = 'done', updatedAt = NOW()
     WHERE jobId = ?`,
    [VOCAL_STEM_URL, VOCAL_STEM_KEY, JOB_ID]
  );
} else {
  console.log(`Inserting vocal stem for job ${JOB_ID}...`);
  // Build insert based on available columns
  const columnNames = cols.map((c) => c.COLUMN_NAME);
  
  if (columnNames.includes("characterId")) {
    // Has characterId column
    await conn.execute(
      `INSERT INTO musicVideoVocalStems 
       (jobId, characterId, vocalsUrl, vocalsKey, status, createdAt, updatedAt)
       VALUES (?, NULL, ?, ?, 'done', NOW(), NOW())`,
      [JOB_ID, VOCAL_STEM_URL, VOCAL_STEM_KEY]
    );
  } else {
    // Minimal insert
    await conn.execute(
      `INSERT INTO musicVideoVocalStems 
       (jobId, vocalsUrl, vocalsKey, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'done', NOW(), NOW())`,
      [JOB_ID, VOCAL_STEM_URL, VOCAL_STEM_KEY]
    );
  }
}

console.log("Vocal stem injected successfully.");

// 4. Update the job vocalsStatus to 'done'
await conn.execute(
  "UPDATE musicVideoJobs SET vocalsStatus = 'done' WHERE id = ?",
  [JOB_ID]
);
console.log("Job vocalsStatus updated to 'done'.");

// 5. Verify
const [verify] = await conn.execute(
  `SELECT j.id, j.status, j.vocalsStatus, s.vocalsUrl 
   FROM musicVideoJobs j
   LEFT JOIN musicVideoVocalStems s ON s.jobId = j.id
   WHERE j.id = ?`,
  [JOB_ID]
);
console.log("\nVerification:", JSON.stringify(verify[0], null, 2));

await conn.end();
console.log("\nStem injection complete. Ready to trigger startRender.");
console.log(`Job ID: ${JOB_ID}`);
