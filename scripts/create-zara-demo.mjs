/**
 * Creates a fresh Zara cinematic demo job via the tRPC API.
 * Runs: createJob → generateStoryboard → startRender
 *
 * Usage: node scripts/create-zara-demo.mjs
 */
import { SignJWT } from "jose";
import { createHmac } from "crypto";

const BASE_URL = "http://localhost:3000";
const COOKIE_NAME = "app_session_id";

// Zara demo audio (same track used across all Zara jobs)
const DEMO_AUDIO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778695391908.mp3";

// Zara master portrait (from job 510099)
const ZARA_MASTER_PORTRAIT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778695377509.png";

// Zara's locked description
const ZARA_DESCRIPTION =
  "A full-length standing figure of Zara, a mixed-race British woman in her late 20s, with a very slim, narrow frame, lean physique, and slender build. Her warm medium-brown skin is natural, complementing her sharp cheekbones, almond-shaped dark brown eyes, and full lips. Her natural textured hair, shoulder-length, is worn loose. She holds a confident, direct gaze. She wears a form-fitting black leather jacket, layered gold necklaces, and several gold rings. Her lower half is clad in distressed dark-wash skinny jeans that accentuate her slender legs, narrow knees, and lean calves. She completes the look with black ankle boots, covering her feet and ankles, featuring a subtle heel. Her strong presence is effortlessly cool.";

// Cinematic theme prompt — rich environments for a compelling demo
const CINEMATIC_THEME =
  "A cinematic music video with rich, visually stunning environments. " +
  "Scene 1: Zara performing on a rooftop at golden hour, the city skyline glowing behind her, warm amber light catching her gold jewellery, lens flare, cinematic depth of field. " +
  "Scene 2: A neon-lit urban alley at night, rain-soaked cobblestones reflecting pink and blue neon signs, Zara centre-frame, dramatic shadows, moody atmosphere. " +
  "Scene 3: Inside a smoky jazz club with warm amber spotlights, Zara on a small stage, audience silhouettes in the background, vintage microphone, intimate and soulful. " +
  "Scene 4: A rain-soaked city street at dusk, Zara walking towards camera, headlights streaking behind her, cinematic slow motion feel, deep contrast. " +
  "Scene 5: A rooftop pool at night, city lights reflected in the water, Zara standing at the edge, cool blue and gold tones, luxury atmosphere. " +
  "Consistent character throughout: Zara in her signature black leather jacket, gold jewellery, distressed skinny jeans, black ankle boots. " +
  "Cinematic 16:9 widescreen, high production value, professional colour grading.";

async function createSessionToken() {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  const jwtSecret = process.env.JWT_SECRET;
  const appId = process.env.VITE_APP_ID;

  if (!ownerOpenId || !jwtSecret || !appId) {
    throw new Error(
      `Missing env vars: OWNER_OPEN_ID=${ownerOpenId}, JWT_SECRET=${!!jwtSecret}, VITE_APP_ID=${appId}`
    );
  }

  const secretKey = new TextEncoder().encode(jwtSecret);
  const expiresAt = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);

  const token = await new SignJWT({
    openId: ownerOpenId,
    appId,
    name: "Tim Neighbour",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secretKey);

  return token;
}

async function trpcCall(procedure, input, sessionToken) {
  const url = `${BASE_URL}/api/trpc/musicVideo.${procedure}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${COOKIE_NAME}=${sessionToken}`,
    },
    body: JSON.stringify({ json: input }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${procedure}: ${text.slice(0, 500)}`);
  }

  if (data?.error) {
    throw new Error(`tRPC error in ${procedure}: ${JSON.stringify(data.error)}`);
  }

  return data?.result?.data?.json ?? data?.result?.data;
}

async function getAudioDuration(url) {
  // The Zara demo track is 71 seconds (measured from actual audio file)
  // Previously this was incorrectly set to 180s which caused too many scenes to be generated
  return 71;
}

async function main() {
  console.log("🎬 Creating Zara Cinematic Demo Job...\n");

  const sessionToken = await createSessionToken();
  console.log("✅ Session token created\n");

  // Step 1: Fetch Zara portrait for Character Lock™
  console.log("📋 Step 1: Fetching Zara portrait for Character Lock™...");
  const portraitRes = await fetch(ZARA_MASTER_PORTRAIT);
  if (!portraitRes.ok) throw new Error(`Failed to fetch portrait: ${portraitRes.status}`);
  const portraitBuf = await portraitRes.arrayBuffer();
  const portraitBase64 = Buffer.from(portraitBuf).toString("base64");
  console.log(`✅ Portrait fetched (${Math.round(portraitBase64.length / 1024)}KB base64)\n`);

  // Step 1b: Create the job (with portrait for Character Lock™)
  console.log("📋 Step 1b: Creating job...");
  const audioDuration = await getAudioDuration(DEMO_AUDIO_URL);

  const job = await trpcCall(
    "createJob",
    {
      title: "Zara — Cinematic Demo",
      audioUrl: DEMO_AUDIO_URL,
      audioMimeType: "audio/mpeg",
      audioDuration,
      themePrompt: CINEMATIC_THEME,
      genre: "R&B / Soul",
      mood: "Cinematic, Moody, Confident",
      enableLipSync: true,
      sceneSetting:
        "Rooftop at golden hour, neon-lit urban alley, smoky jazz club, rain-soaked city street, rooftop pool at night",
      characterImageBase64: portraitBase64,
      characterImageMimeType: "image/png",
    },
    sessionToken
  );

  const jobId = job?.jobId ?? job?.id;
  if (!jobId) {
    throw new Error(`No jobId returned from createJob: ${JSON.stringify(job)}`);
  }
  console.log(`✅ Job created: ID ${jobId}\n`);

  // Step 2: Generate storyboard
  console.log("🎨 Step 2: Generating storyboard (this may take 30-60s)...");
  const storyboard = await trpcCall("generateStoryboard", { jobId }, sessionToken);
  console.log(`✅ Storyboard generated: ${storyboard?.scenes?.length ?? "?"} scenes\n`);

  // Step 3: Start render
  console.log("🎬 Step 3: Starting render...");
  const render = await trpcCall(
    "startRender",
    { jobId, aspectRatio: "16:9", includeCaptions: false },
    sessionToken
  );
  console.log(`✅ Render started! Credit cost: ${render?.creditCost ?? "?"}\n`);

  console.log("═══════════════════════════════════════════════════");
  console.log(`🚀 Zara Cinematic Demo Job is now rendering!`);
  console.log(`   Job ID: ${jobId}`);
   console.log(`   Track: Zara Demo Track (~71s)`);
  console.log(`   Environments: Rooftop → Neon Alley → Jazz Club → Rain Street → Pool`);
  console.log(`   Monitor at: https://wiz-ai.io/wizpilot (or dev server)`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
