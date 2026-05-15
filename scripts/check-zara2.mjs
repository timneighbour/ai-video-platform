import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1).split("?")[0],
  ssl: { rejectUnauthorized: true },
});

// Get Zara character data
const [chars] = await conn.query(
  `SELECT id, name, masterPortraitUrl, previewImageUrl, enableLipSync, characterDescription
   FROM videoCharacters WHERE jobId=540026`
);
console.log("=== CHARACTERS ===");
chars.forEach(c => {
  console.log("name:", c.name);
  console.log("masterPortraitUrl:", c.masterPortraitUrl);
  console.log("previewImageUrl:", c.previewImageUrl);
  console.log("enableLipSync:", c.enableLipSync);
  console.log("description:", c.characterDescription?.slice(0, 200));
});

// Get all scene prompts with lipSync flag
const [scenes] = await conn.query(
  `SELECT sceneIndex, LEFT(prompt,300) as prompt, lipSync, focusCharacter, sceneAudioUrl, duration
   FROM musicVideoScenes WHERE jobId=540026 ORDER BY sceneIndex`
);
console.log("\n=== SCENE PROMPTS ===");
scenes.forEach(s => {
  console.log(`scene ${s.sceneIndex}: lipSync=${s.lipSync} focus=${s.focusCharacter} duration=${s.duration}s`);
  console.log("  prompt:", s.prompt);
  console.log("  audioUrl:", s.sceneAudioUrl || "none");
});

// Check job characterImageUrl
const [jobs] = await conn.query(
  `SELECT characterImageUrl, characterRoster, enableLipSync FROM musicVideoJobs WHERE id=540026`
);
console.log("\n=== JOB CHARACTER CONFIG ===");
console.log("characterImageUrl:", jobs[0].characterImageUrl);
console.log("enableLipSync:", jobs[0].enableLipSync);
console.log("characterRoster:", jobs[0].characterRoster?.slice(0, 300));

await conn.end();
process.exit(0);
