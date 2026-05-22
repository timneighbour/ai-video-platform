/**
 * Showcase Job Creator — runs inside the project directory so it has access
 * to node_modules (mysql2, drizzle-orm) and DATABASE_URL from the environment.
 *
 * Usage:  node scripts/create-showcase-job.mjs
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const AUDIO_URL =
  "https://manus-storage.s3.us-east-1.amazonaws.com/showcase-fullmix_bf2a7b2a.mp3";
const AUDIO_KEY = "showcase-fullmix_bf2a7b2a.mp3";
const AUDIO_DURATION = 71; // seconds

const CHARACTER_IMAGE_URL =
  "https://manus-storage.s3.us-east-1.amazonaws.com/zara-showcase-portrait_cae5f77a.png";
const CHARACTER_IMAGE_KEY = "zara-showcase-portrait_cae5f77a.png";

const SCENE_SETTING =
  "Lyndhurst Hall, Air Studios, London. Warm amber orchestral lighting. Grand hall with soaring arched windows. Orchestra visible in background. Premium recording session atmosphere. Camera moves slowly around the artist — dolly, crane, and arc shots. Cinematic depth of field. Rich wood panelling and ornate architecture. No plain backgrounds.";

const THEME_PROMPT =
  "A cinematic music video set in Lyndhurst Hall, Air Studios. Zara — a young Black British female vocalist in a black corset — performs at the centre of the grand hall. The video alternates between intimate performance close-ups and sweeping cinematic wides of the orchestra and hall. Warm amber light. Emotional, premium, world-class.";

const conn = await mysql.createConnection(DB_URL);

// 1. Find the admin/owner user
const [adminRows] = await conn.execute(
  "SELECT id, name, email FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
);
if (!adminRows.length) {
  console.error("No admin user found");
  await conn.end();
  process.exit(1);
}
const owner = adminRows[0];
console.log(`Owner: id=${owner.id} name=${owner.name} email=${owner.email}`);

// 2. Insert the job
const [result] = await conn.execute(
  `INSERT INTO musicVideoJobs
    (userId, title, audioUrl, audioKey, audioDuration,
     themePrompt, genre, mood,
     characterImageUrl, characterImageKey, enableLipSync,
     sceneSetting,
     status, totalScenes, completedScenes, creditCost,
     transcriptionStatus, lyricsStatus,
     captionsEnabled, captionStyle, captionBackground,
     captionFontSize, captionFontStyle, captionTextColour, captionHighlightColour,
     captionKaraokeMode, captionSafeArea,
     isKidsVideo, kidsEnableSingalong, kidsFriendlyIntensity)
   VALUES
    (?, ?, ?, ?, ?,
     ?, ?, ?,
     ?, ?, 1,
     ?,
     'draft', 0, 0, 0,
     'pending', 'pending',
     1, 'bottom', 'soft_shadow',
     24, 'sans-serif', '#FFFFFF', '#FFD700',
     0, 'bottom_center',
     0, 1, 'vibrant')`,
  [
    owner.id,
    "Zara — Air Studios Showcase",
    AUDIO_URL,
    AUDIO_KEY,
    AUDIO_DURATION,
    THEME_PROMPT,
    "soul",
    "emotional",
    CHARACTER_IMAGE_URL,
    CHARACTER_IMAGE_KEY,
    SCENE_SETTING,
  ]
);

const jobId = result.insertId;
console.log(`\nJob created: id=${jobId}`);
console.log(`Title: Zara — Air Studios Showcase`);
console.log(`Audio: ${AUDIO_DURATION}s`);
console.log(`Scene setting: Air Studios / Lyndhurst Hall`);
console.log(`Lip sync: enabled`);
console.log(`Status: draft`);
console.log(`\nNext step: inject vocal stem, then call startRender`);

await conn.end();
