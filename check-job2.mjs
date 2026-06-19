import mysql2 from "mysql2/promise";
const url = process.env.DATABASE_URL;
const conn = await mysql2.createConnection(url);
try {
  // Get column names
  const [cols] = await conn.execute("DESCRIBE musicVideoJobs");
  console.log("Columns:", cols.map(c => c.Field).join(", "));
  
  // Get job data
  const [jobs] = await conn.execute("SELECT * FROM musicVideoJobs WHERE id = 1080001");
  const job = jobs[0];
  if (!job) { console.log("Job not found"); process.exit(0); }
  console.log("\n=== JOB 1080001 ===");
  for (const [k, v] of Object.entries(job)) {
    if (k === 'characterRoster') continue; // skip long JSON
    const val = typeof v === 'string' && v.length > 100 ? v.substring(0, 80) + '...' : v;
    console.log(`  ${k}: ${val}`);
  }

  // Active characters
  const [chars] = await conn.execute(
    "SELECT id, name, role, isLocked, enableLipSync, masterPortraitUrl, previewImageUrl, deletedAt FROM videoCharacters WHERE jobId = 1080001 ORDER BY slotIndex"
  );
  console.log("\n=== CHARACTERS ===");
  for (const c of chars) {
    const status = c.deletedAt ? "(SOFT-DELETED)" : "(ACTIVE)";
    const portrait = c.masterPortraitUrl ? "masterPortrait=YES" : (c.previewImageUrl ? "previewImg=YES" : "NO_PORTRAIT");
    console.log(`  ${status} id=${c.id} name="${c.name}" role="${c.role}" locked=${c.isLocked} lipSync=${c.enableLipSync} ${portrait}`);
  }

  // Scenes
  const [scenes] = await conn.execute(
    "SELECT id, sceneIndex, status, duration, videoUrl, previewImageUrl, lipSync, characterAssignments FROM musicVideoScenes WHERE jobId = 1080001 ORDER BY sceneIndex"
  );
  console.log(`\n=== SCENES (${scenes.length} total) ===`);
  for (const s of scenes) {
    const hasVideo = s.videoUrl ? "VIDEO=YES" : "VIDEO=NO";
    const hasPreview = s.previewImageUrl ? "PREVIEW=YES" : "PREVIEW=NO";
    let chars = "none";
    try { chars = s.characterAssignments ? JSON.parse(s.characterAssignments).join(",") : "none"; } catch {}
    console.log(`  Scene ${s.sceneIndex+1}: status=${s.status} dur=${s.duration}s lipSync=${s.lipSync} chars=[${chars}] ${hasVideo} ${hasPreview}`);
  }
} finally {
  await conn.end();
}
