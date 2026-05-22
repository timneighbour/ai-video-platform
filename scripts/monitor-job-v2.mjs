import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [jobs] = await conn.execute(
  "SELECT id, status, completedScenes, totalScenes, probePassed, finalVideoUrl FROM musicVideoJobs WHERE id = 690007"
);
const job = jobs[0];
console.log("=== JOB 690007 STATUS ===");
console.log("Status:", job.status);
console.log("Progress:", job.completedScenes + "/" + job.totalScenes, "scenes");
console.log("Probe passed:", job.probePassed);
console.log("Final video:", job.finalVideoUrl ? "READY" : "not yet");

const [scenes] = await conn.execute(
  `SELECT id, sceneIndex, mvSceneStatus as status, sceneType, startTime, duration, videoUrl, errorMessage
   FROM musicVideoScenes WHERE jobId = 690007 ORDER BY sceneIndex`
);

console.log("\n=== SCENES ===");
scenes.forEach(s => {
  const url = s.videoUrl ? "✅ " + s.videoUrl.substring(0, 60) + "..." : "";
  const err = s.errorMessage ? "❌ " + s.errorMessage.substring(0, 60) : "";
  console.log(`  [${s.sceneIndex}] ${s.status.padEnd(12)} | ${s.startTime}s-${s.startTime + s.duration}s | ${url || err || "pending"}`);
});

await conn.end();
