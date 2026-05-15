import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const mysql = _require("mysql2/promise");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("No DATABASE_URL"); process.exit(1); }

const url = new URL(dbUrl);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1).split("?")[0],
  ssl: { rejectUnauthorized: true },
});

console.log("=== CHARACTERS for job 540026 ===");
const [chars] = await conn.query(
  "SELECT id, name, masterPortraitUrl, previewImageUrl, LEFT(lockedDescription,150) as lockedDesc, enableLipSync FROM videoCharacters WHERE jobId = 540026"
);
chars.forEach(r => {
  console.log("id=" + r.id + " name=" + r.name + " enableLipSync=" + r.enableLipSync);
  console.log("  masterPortraitUrl: " + (r.masterPortraitUrl ? r.masterPortraitUrl.slice(0,100) : "NULL"));
  console.log("  previewImageUrl: " + (r.previewImageUrl ? r.previewImageUrl.slice(0,100) : "NULL"));
  console.log("  lockedDesc: " + (r.lockedDesc || "NULL"));
});

console.log("\n=== SCENES for job 540026 ===");
const [scenes] = await conn.query(
  "SELECT id, sceneIndex, mvSceneStatus as status, taskId, videoUrl, lipSync, characterAssignments, LEFT(prompt,120) as prompt FROM musicVideoScenes WHERE jobId = 540026 ORDER BY sceneIndex"
);
scenes.forEach(r => {
  console.log("scene " + r.sceneIndex + ": status=" + r.status + " lipSync=" + r.lipSync + " taskId=" + (r.taskId || "none"));
  console.log("  videoUrl: " + (r.videoUrl ? "YES " + r.videoUrl.slice(0,60) : "none"));
  console.log("  assignments: " + (r.characterAssignments || "none"));
  console.log("  prompt: " + r.prompt);
});

console.log("\n=== JOB 540026 ===");
const [jobs] = await conn.query(
  "SELECT id, mvJobStatus as status, completedScenes, totalScenes, audioDuration, maxSpendLimitUsd, syncLabsJobId, finalVideoProduced, assemblyStartedAt FROM musicVideoJobs WHERE id = 540026"
);
console.log(jobs[0]);

await conn.end();
process.exit(0);
