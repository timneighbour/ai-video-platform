import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

const [jobs] = await conn.query(`
  SELECT id, status, title, audioUrl, audioKey, audioDuration,
         themePrompt, genre, mood, characterRoster, characterImageUrl, characterImageKey,
         enableLipSync, sceneSetting, aspectRatio, artistType,
         captionsEnabled, captionStyle, lyricsApproved
  FROM musicVideoJobs WHERE id = 540020
`);

const job = jobs[0];
console.log('=== JOB DETAILS ===');
console.log(JSON.stringify(job, null, 2));

// Also look for the most recent completed scenes to understand the storyboard quality
const [scenes] = await conn.query(`
  SELECT sceneIndex, mvSceneStatus, prompt, videoUrl, lipSyncVideoUrl, lipSyncStatus, lyrics, duration
  FROM musicVideoScenes WHERE jobId = 540020 ORDER BY sceneIndex
`);
console.log('\n=== SCENES ===');
console.log(JSON.stringify(scenes, null, 2));

await conn.end();
