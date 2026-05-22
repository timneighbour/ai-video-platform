import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all fields from previous job
const [prevJob] = await conn.execute(
  "SELECT audioUrl, audioKey, characterImageUrl, characterImageKey, themePrompt, audioDuration FROM musicVideoJobs WHERE id = 690005"
);
const prev = prevJob[0];
console.log("Audio key:", prev.audioKey);
console.log("Char key:", prev.characterImageKey);

const CORRECTED_SCENE_SETTING = "Lyndhurst Hall at Air Studios London — a converted church recording studio with white walls and high arched stained-glass windows flooding the space with cool natural daylight, modern acoustic ceiling baffles and wood slat sound panels, full orchestra on the studio floor with music stands and professional microphones, contemporary recording session atmosphere, camera circling the artist at floor level, cinematic depth of field, professional recording studio NOT a concert hall or cathedral";

const [insertResult] = await conn.execute(
  `INSERT INTO musicVideoJobs 
   (userId, title, audioUrl, audioKey, audioDuration, themePrompt, genre, mood, 
    totalScenes, completedScenes, status, sceneSetting, enableLipSync,
    characterImageUrl, characterImageKey, vocalsUrl, vocalsStatus, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    1, // Tim's user ID
    "Showcase — Air Studios / Lyndhurst Hall v2",
    prev.audioUrl,
    prev.audioKey || "showcase-fullmix",
    prev.audioDuration,
    "A cinematic recording session at Lyndhurst Hall, Air Studios London. Zara performs an emotional ballad surrounded by a full orchestra in the iconic converted church studio. Cool natural daylight streams through stained-glass windows. Premium film scoring atmosphere.",
    "cinematic ballad",
    "emotional, intimate, cinematic",
    12,
    0,
    "draft",
    CORRECTED_SCENE_SETTING,
    1,
    prev.characterImageUrl,
    prev.characterImageKey || "zara-showcase-portrait",
    "https://manus-storage.s3.us-east-1.amazonaws.com/zara-vocal-stem_demucs.mp3",
    "done",
  ]
);

const newJobId = insertResult.insertId;
console.log("\n✅ New showcase job created:", newJobId);
await conn.end();
