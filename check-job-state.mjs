import mysql2 from "mysql2/promise";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await mysql2.createConnection(url);
try {
  // Job status
  const [jobs] = await conn.execute(
    "SELECT id, status, title, audioUrl, theme, genre, mood, enableLipSync, aspectRatio, updatedAt FROM musicVideoJobs WHERE id = 1080001"
  );
  console.log("=== JOB 1080001 ===");
  const job = jobs[0];
  if (!job) { console.log("Job not found"); process.exit(0); }
  console.log(`Status: ${job.status}`);
  console.log(`Title: ${job.title}`);
  console.log(`Theme: ${job.theme}`);
  console.log(`Genre: ${job.genre}`);
  console.log(`Mood: ${job.mood}`);
  console.log(`LipSync: ${job.enableLipSync}`);
  console.log(`AspectRatio: ${job.aspectRatio}`);
  console.log(`AudioUrl: ${job.audioUrl ? 'SET' : 'MISSING'}`);
  console.log(`UpdatedAt: ${job.updatedAt}`);

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
    "SELECT id, sceneIndex, status, duration, prompt, videoUrl, previewImageUrl, lipSync, characterAssignments FROM musicVideoScenes WHERE jobId = 1080001 ORDER BY sceneIndex"
  );
  console.log(`\n=== SCENES (${scenes.length} total) ===`);
  for (const s of scenes) {
    const hasVideo = s.videoUrl ? "VIDEO=YES" : "VIDEO=NO";
    const hasPreview = s.previewImageUrl ? "PREVIEW=YES" : "PREVIEW=NO";
    const chars = s.characterAssignments ? JSON.parse(s.characterAssignments).join(",") : "none";
    console.log(`  Scene ${s.sceneIndex+1}: status=${s.status} dur=${s.duration}s lipSync=${s.lipSync} chars=[${chars}] ${hasVideo} ${hasPreview}`);
  }
} finally {
  await conn.end();
}
