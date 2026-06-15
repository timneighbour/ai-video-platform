/**
 * Creates a new music video job for the Air Studios demo
 * Uses the same audio track as Job 630003
 * 11 scenes, 66 seconds, Air Studios aesthetic
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';

// Get the owner user ID from the existing job
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find the owner user
const [users] = await conn.query("SELECT id FROM users WHERE openId = ? LIMIT 1", [process.env.OWNER_OPEN_ID]);
if (!users.length) throw new Error('Owner user not found');
const userId = users[0].id;
console.log('Owner user ID:', userId);

// Get the character image from Job 630003 (Zara's reference)
const [existingJob] = await conn.query(
  "SELECT characterImageUrl FROM musicVideoJobs WHERE id = 630003 LIMIT 1"
);
const characterImageUrl = existingJob[0]?.characterImageUrl ?? null;
console.log('Character image:', characterImageUrl ? characterImageUrl.slice(-40) : 'not found');

// Create the new job
const [jobResult] = await conn.query(`
  INSERT INTO musicVideoJobs (
    userId, status, audioUrl, audioKey, audioDuration, totalScenes, 
    title, themePrompt, enableLipSync,
    createdAt, updatedAt
  ) VALUES (?, 'rendering', ?, 'air-studios-demo-audio', 70.87, 11, 'Beauty of the Wreckage - Air Studios', 'Air Studios recording hall, warm amber lighting, orchestra, grand piano, string section, intimate cinematic music video', 1, NOW(), NOW())
`, [userId, AUDIO_URL]);

const jobId = jobResult.insertId;
console.log('Created job ID:', jobId);

// Scene definitions
const SCENES = [
  // INTRO (0–13s)
  {
    sceneIndex: 0, startTime: 0, duration: 6, sceneType: "cinematic", lipSync: false,
    prompt: `Cinematic establishing shot inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Massive high-ceilinged room with warm amber and golden lighting, large arched windows with soft natural light filtering through. Polished wooden floors reflect the warm glow. A grand Steinway piano sits to the left, a string section of four violinists and two cellists are seated behind music stands in the background, tuning their instruments. A vintage Neumann U87 microphone on a stand is positioned centre-frame. The atmosphere is intimate and professional. No people in foreground yet. Cinematic 4K, shallow depth of field, film grain.`,
  },
  {
    sceneIndex: 1, startTime: 6000, duration: 6, sceneType: "cinematic", lipSync: false,
    prompt: `Close-up cinematic shot of a pianist's hands resting gently on the keys of a grand Steinway piano inside a warm recording studio. Soft amber studio lighting, shallow depth of field. The keys are ivory and ebony, beautifully lit. In the blurred background, a string section is visible, seated with bows ready. The atmosphere is quiet anticipation before the music begins. Air Studios aesthetic, warm golden tones, film grain, 4K.`,
  },
  // VERSE 1 (13–34s)
  {
    sceneIndex: 2, startTime: 12000, duration: 6, sceneType: "performance", lipSync: true,
    prompt: `Close-up performance shot of a young Black British woman in her late 20s with natural hair, wearing an elegant deep burgundy dress, singing into a vintage Neumann U87 microphone in a grand recording studio. Warm amber studio lighting illuminates her face. Her eyes are closed, expression deeply emotional and vulnerable. The studio hall is visible in soft focus behind her — grand piano, string musicians. Air Studios aesthetic, cinematic 4K, shallow depth of field, film grain.`,
  },
  {
    sceneIndex: 3, startTime: 18000, duration: 6, sceneType: "cinematic", lipSync: false,
    prompt: `Wide cinematic shot inside Air Studios-style recording hall. A young Black British woman in a burgundy dress stands at the microphone centre-frame, singing with eyes closed. To her left, a pianist plays the grand Steinway with focused intensity. Behind her, a string quartet of four violinists bow their instruments in unison, their movements fluid and expressive. Warm amber and golden studio lighting, high ceilings with exposed wooden beams, large windows. The musicians all appear to be playing in time together. Cinematic 4K, film grain.`,
  },
  {
    sceneIndex: 4, startTime: 24000, duration: 6, sceneType: "performance", lipSync: true,
    prompt: `Medium close-up of a young Black British woman in an elegant burgundy dress singing passionately at a vintage microphone in a grand recording studio. Her expression is raw and emotional, conveying vulnerability and truth. Warm amber studio lighting, slight bokeh on the background showing string musicians bowing. Air Studios aesthetic, cinematic 4K, shallow depth of field.`,
  },
  {
    sceneIndex: 5, startTime: 30000, duration: 6, sceneType: "cinematic", lipSync: false,
    prompt: `Cinematic side-angle shot of a violinist in a recording studio, bowing her violin with intense focus and expression. She is part of a string section visible in soft focus behind her. Warm amber studio lighting, the grand piano visible in the background. The musician appears deeply engaged, playing with emotion. Air Studios aesthetic, shallow depth of field, 4K, film grain.`,
  },
  // PRE-CHORUS (34–45s)
  {
    sceneIndex: 6, startTime: 36000, duration: 6, sceneType: "performance", lipSync: true,
    prompt: `Close-up performance shot of a young Black British woman at the microphone, her expression building with emotional intensity as the music swells. Eyes beginning to open, jaw slightly raised, conveying growing power and conviction. Warm amber lighting with a slight golden rim light on her natural hair. The string section is visible in soft focus behind, bows moving with increasing energy. Air Studios aesthetic, cinematic 4K.`,
  },
  {
    sceneIndex: 7, startTime: 42000, duration: 6, sceneType: "cinematic", lipSync: false,
    prompt: `Wide dramatic shot of the full recording studio ensemble at the moment before the chorus breaks. A young Black British woman in a burgundy dress stands at the microphone with arms slightly raised, the string section of six musicians behind her with bows raised, the pianist's hands poised over the keys. The room is bathed in warm golden studio light. High ceilings, large windows, polished wooden floors. A sense of collective anticipation and power. Air Studios Lindhurst Hall aesthetic, cinematic 4K, film grain.`,
  },
  // CHORUS (45–64s)
  {
    sceneIndex: 8, startTime: 48000, duration: 6, sceneType: "performance", lipSync: true,
    prompt: `Powerful close-up of a young Black British woman singing at full voice at the microphone, eyes open and blazing with emotion, jaw wide, expression triumphant and cathartic. Her burgundy dress catches the warm studio light. Behind her in soft focus, the string section bows vigorously and a drummer is now visible at a drum kit in the background. Air Studios aesthetic, warm amber lighting, cinematic 4K.`,
  },
  {
    sceneIndex: 9, startTime: 54000, duration: 6, sceneType: "cinematic", lipSync: false,
    prompt: `Wide cinematic shot of the full recording studio in full performance. A young Black British woman at the microphone, arms open, singing with full power. The string section behind her bows with vigour and expression. A drummer is visible at a drum kit in the background, playing with intensity. The grand piano player is visible to the left. Warm golden studio lighting fills the hall. Air Studios Lindhurst Hall, high ceilings, large windows, cinematic 4K, film grain.`,
  },
  {
    sceneIndex: 10, startTime: 60000, duration: 6, sceneType: "performance", lipSync: true,
    prompt: `Intimate close-up of a young Black British woman at the microphone, the final moments of the chorus, her expression shifting from triumph to quiet resolution. Eyes glistening, a slight smile. The warm amber studio light softens around her. In the blurred background, the string musicians hold their final notes, bows resting. Air Studios aesthetic, cinematic 4K, shallow depth of field, film grain.`,
  },
];

// Insert all scenes
for (const scene of SCENES) {
  await conn.query(`
    INSERT INTO musicVideoScenes (
      jobId, sceneIndex, mvSceneStatus, sceneType, lipSync,
      prompt, startTime, duration,
      lipSyncStatus,
      createdAt, updatedAt
    ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
  `, [
    jobId,
    scene.sceneIndex,
    scene.sceneType,
    scene.lipSync ? 1 : 0,
    scene.prompt,
    scene.startTime,
    scene.duration,
  ]);
}

console.log(`\n✅ Created job ${jobId} with ${SCENES.length} scenes`);
console.log(`   Audio: ${AUDIO_URL.slice(-50)}`);
console.log(`   Performance scenes (lip sync): ${SCENES.filter(s => s.lipSync).length}`);
console.log(`   Cinematic scenes: ${SCENES.filter(s => !s.lipSync).length}`);
console.log(`\nNow update job status to 'processing' to trigger the heartbeat:`);
console.log(`  UPDATE musicVideoJobs SET status='processing' WHERE id=${jobId};`);

await conn.end();
