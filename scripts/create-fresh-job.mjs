/**
 * Creates a fresh music video job using the same assets as the cancelled job 540020.
 * This bypasses the HTTP API and calls the service layer directly via Node.
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

// Get the owner user ID
const [users] = await conn.query("SELECT id, email FROM users LIMIT 5");
console.log('Users:', JSON.stringify(users.map(u => ({ id: u.id, email: u.email }))));

// Use the owner user (first user / the one who created job 540020)
const [jobOwner] = await conn.query("SELECT userId FROM musicVideoJobs WHERE id = 540020");
const userId = jobOwner[0]?.userId;
console.log('Owner userId:', userId);

// Insert a fresh job with all the same settings
const characterRoster = JSON.stringify([{
  name: "Zara",
  role: "Lead Vocalist",
  isLocked: true,
  description: "Woman in her late 20s, Black African American, medium-dark skin tone. Long, dark brown hair, styled in voluminous, cascading curls that fall past her shoulders. Dark brown, almond-shaped eyes. Slender, athletic build, appearing around 5'7\"-5'8\". She consistently wears a signature black leather jacket, distressed skinny jeans, and black ankle boots. Adorned with prominent gold jewellery, including large hoop earrings and layered necklaces. Her overall look is confident and stylish, with a moody, soulful presence."
}]);

const themePrompt = `A cinematic music video with rich, visually stunning environments. Scene 1: Zara performing on a rooftop at golden hour, the city skyline glowing behind her, warm amber light catching her gold jewellery, lens flare, cinematic depth of field. Scene 2: A neon-lit urban alley at night, rain-soaked cobblestones reflecting pink and blue neon signs, Zara centre-frame, dramatic shadows, moody atmosphere. Scene 3: Inside a smoky jazz club with warm amber spotlights, Zara on a small stage, audience silhouettes in the background, vintage microphone, intimate and soulful. Scene 4: A rain-soaked city street at dusk, Zara walking towards camera, headlights streaking behind her, cinematic slow motion feel, deep contrast. Scene 5: A rooftop pool at night, city lights reflected in the water, Zara standing at the edge, cool blue and gold tones, luxury atmosphere. Consistent character throughout: Zara in her signature black leather jacket, gold jewellery, distressed skinny jeans, black ankle boots. Cinematic 16:9 widescreen, high production value, professional colour grading.`;

const [result] = await conn.query(`
  INSERT INTO musicVideoJobs (
    userId, title, audioUrl, audioKey, audioDuration,
    themePrompt, genre, mood,
    characterRoster, characterImageUrl, characterImageKey,
    enableLipSync, sceneSetting, aspectRatio, artistType,
    captionsEnabled, captionStyle,
    totalScenes, completedScenes, creditCost,
    status, createdAt, updatedAt
  ) VALUES (
    ?, 'Zara — Cinematic Demo (Fresh)',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778780558561.mp3',
    'music-video-audio/1-1778780558561.mp3',
    71,
    ?, 'R&B / Soul', 'Cinematic, Moody, Confident',
    ?,
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-characters/1-1778780558872.png',
    'music-video-characters/1-1778780558872.png',
    1,
    'Rooftop at golden hour, neon-lit urban alley, smoky jazz club, rain-soaked city street, rooftop pool at night',
    '16:9', 'solo_artist',
    0, 'bottom',
    12, 0, 120,
    'pending', NOW(), NOW()
  )
`, [userId, themePrompt, characterRoster]);

const newJobId = result.insertId;
console.log(`\n✅ Fresh job created: ID = ${newJobId}`);
console.log('Title: Zara — Cinematic Demo (Fresh)');
console.log('Audio: 71s, 12 scenes planned, lip sync ENABLED');
console.log('Character: Zara (locked) with portrait photo');

await conn.end();
