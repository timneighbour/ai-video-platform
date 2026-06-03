/**
 * run-create-probe-job-v2.mjs
 *
 * Creates a fresh Zara music video job using:
 * - "Beauty of the Wreckage" vocal track (152 BPM, -14.3 dB, strong vocals confirmed)
 * - Zara character (570001) — locked description, Air Studios environment portrait
 * - 12 scenes with beat-aligned cuts at 152 BPM (beat interval 0.395s, 16-beat phrase ≈ 6.32s)
 * - Scene starts snapped to beat grid: 0, 5.92, 11.84, 18.16, 24.08, 30, 35.92, 41.84, 48.16, 54.08, 60, 65.92
 * - Every prompt includes BPM and Air Studios environment anchor
 * - NO grey backgrounds — Zara is INSIDE the environment from frame one
 * - Probe scene = scene index 2 (first strong vocal entry at t=11.84s)
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1779420561458.mp3";
const AUDIO_KEY = "music-video-audio/1-1779420561458.mp3";
const CHARACTER_IMAGE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-portrait-b-v2.jpg";
const ENV_REF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-env-ref-stage2-870022.png";
const CHARACTER_ID = 570001;
const USER_ID = 1;
const BPM = 152;
const BEAT_INTERVAL = 60.0 / BPM; // 0.395s

// Zara locked description (truncated for prompt use)
const ZARA_DESC = "Zara — woman in her late 20s, white European, fair skin, dark brown hair in soft flowing waves past shoulders, expressive hazel eyes, slender graceful build, elegant form-fitting black gown";

// Air Studios environment anchor (used in every prompt)
const AIR_STUDIOS = "Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background";

// Beat-snapped scene starts (seconds) — 152 BPM, 16-beat phrases ≈ 6.32s
// Rounded to nearest beat: 0.395s intervals
const SCENE_STARTS = [0, 5.92, 11.84, 18.16, 24.08, 30.0, 35.92, 41.84, 48.16, 54.08, 60.0, 65.92];

// Scene durations — each scene runs to the next beat-aligned cut
// Last scene runs to end of track (71s)
const SCENE_DURATIONS = SCENE_STARTS.map((s, i) => {
  const next = SCENE_STARTS[i + 1] ?? 71;
  return Math.round((next - s) * 100) / 100;
});

// Scene definitions — alternating cinematic/performance for emotional arc
// Performance scenes at vocal entry points: t=11.84s, t=24.08s, t=35.92s, t=48.16s, t=60.0s
const SCENES = [
  {
    sceneIndex: 0,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[0],
    duration: SCENE_DURATIONS[0],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Wide establishing shot from above looking down the full length of the hall. Packed audience in every seat. Full orchestra on stage, musicians in dark formal attire, bows poised. Slow imperceptible camera drift forward. Warm golden haze. Film grain. 152 BPM — orchestra movement synced to beat. Cinematic 16:9 widescreen.`,
  },
  {
    sceneIndex: 1,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[1],
    duration: SCENE_DURATIONS[1],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Orchestra strings section — violinists and cellists in dark formal attire, bows moving in slow graceful arcs in unison, 152 BPM rhythm. Medium wide angle slightly low camera looking up through music stands. Warm amber light, soft golden haze. Slow dolly movement. Cinematic 16:9 widescreen.`,
  },
  {
    sceneIndex: 2,
    sceneType: "performance",
    startTime: SCENE_STARTS[2],
    duration: SCENE_DURATIONS[2],
    lipSync: true,
    characterId: CHARACTER_ID,
    prompt: `${ZARA_DESC}. ${AIR_STUDIOS}. Zara stands centre stage facing the camera, singing with deep emotion. Medium close-up shot, warm amber spotlight on her face. Orchestra visible behind her. 152 BPM — her performance energy matches the beat. Slow push-in camera move. Cinematic 16:9 widescreen. NO grey background — she is INSIDE the hall.`,
  },
  {
    sceneIndex: 3,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[3],
    duration: SCENE_DURATIONS[3],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Wide shot of the full hall — ornate ceiling with chandeliers, tall arched windows with warm amber light. Full orchestra on stage, packed audience in the stalls. Soft golden haze in the air. Slow pan across the hall. 152 BPM — subtle camera movement on the beat. Cinematic 16:9 widescreen.`,
  },
  {
    sceneIndex: 4,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[4],
    duration: SCENE_DURATIONS[4],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Cellist in dark formal attire, medium shot from the side showing upper body and cello. Bow drawing across strings in slow graceful arc, 152 BPM rhythm. Warm amber light, soft haze. Slow camera movement. Atmospheric and cinematic. 16:9 widescreen.`,
  },
  {
    sceneIndex: 5,
    sceneType: "performance",
    startTime: SCENE_STARTS[5],
    duration: SCENE_DURATIONS[5],
    lipSync: true,
    characterId: CHARACTER_ID,
    prompt: `${ZARA_DESC}. ${AIR_STUDIOS}. Zara singing with eyes closed, head slightly tilted, deep in the music. Medium shot, warm amber spotlight. Orchestra strings visible behind her, bows moving in unison at 152 BPM. Slow orbit camera move. Cinematic 16:9 widescreen. NO grey background.`,
  },
  {
    sceneIndex: 6,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[6],
    duration: SCENE_DURATIONS[6],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. First violin section — close-medium shot of lead violinist in dark formal attire, bow moving with intensity at 152 BPM. Warm amber light from above. Blurred audience in background. Slow push-in camera. Cinematic 16:9 widescreen.`,
  },
  {
    sceneIndex: 7,
    sceneType: "performance",
    startTime: SCENE_STARTS[7],
    duration: SCENE_DURATIONS[7],
    lipSync: true,
    characterId: CHARACTER_ID,
    prompt: `${ZARA_DESC}. ${AIR_STUDIOS}. Zara singing, full body shot from slightly below looking up at her. She is centre stage, warm amber light, orchestra and audience behind her. 152 BPM — her movement and emotion match the beat. Slow tilt-up camera move. Cinematic 16:9 widescreen. NO grey background.`,
  },
  {
    sceneIndex: 8,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[8],
    duration: SCENE_DURATIONS[8],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Wide shot from the back of the hall looking towards the stage. Zara's silhouette visible centre stage in warm amber spotlight. Full orchestra surrounding her. Packed audience in foreground. 152 BPM — subtle camera drift forward. Cinematic 16:9 widescreen.`,
  },
  {
    sceneIndex: 9,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[9],
    duration: SCENE_DURATIONS[9],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Orchestra conductor from behind, baton raised, strings section visible ahead. 152 BPM — baton movement in time with the beat. Warm amber light, soft golden haze. Slow push-in camera. Cinematic 16:9 widescreen.`,
  },
  {
    sceneIndex: 10,
    sceneType: "performance",
    startTime: SCENE_STARTS[10],
    duration: SCENE_DURATIONS[10],
    lipSync: true,
    characterId: CHARACTER_ID,
    prompt: `${ZARA_DESC}. ${AIR_STUDIOS}. Zara in emotional climax, singing with full voice, eyes open looking directly into camera. Close-up shot, warm amber spotlight, tears of emotion. Orchestra swelling behind her at 152 BPM. Slow push-in camera. Cinematic 16:9 widescreen. NO grey background.`,
  },
  {
    sceneIndex: 11,
    sceneType: "cinematic",
    startTime: SCENE_STARTS[11],
    duration: SCENE_DURATIONS[11],
    lipSync: false,
    characterId: null,
    prompt: `${AIR_STUDIOS}. Final wide shot — Zara centre stage, orchestra and audience, warm amber light. Camera slowly pulls back revealing the full grandeur of the hall. 152 BPM — final beats. Cinematic 16:9 widescreen. Emotional resolution.`,
  },
];

async function main() {
  console.log(`=== Creating Zara Probe Job — Beauty of the Wreckage (152 BPM) ===\n`);
  console.log(`Beat interval: ${BEAT_INTERVAL.toFixed(3)}s`);
  console.log(`Scene starts: ${SCENE_STARTS.join(", ")}\n`);

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. Create the job
    const [jobResult] = await conn.execute(
      `INSERT INTO musicVideoJobs 
        (userId, title, status, audioUrl, audioKey, audioDuration, themePrompt,
         characterImageUrl, totalScenes, completedScenes, 
         aspectRatio, transcriptionStatus, vocalsStatus, songBpm, createdAt, updatedAt)
       VALUES (?, ?, 'rendering', ?, ?, ?, ?, ?, ?, 0, '16:9', 'done', 'done', ?, NOW(), NOW())`,
      [
        USER_ID,
        "Zara — Beauty of the Wreckage (Air Studios Probe)",
        AUDIO_URL,
        AUDIO_KEY,
        71,
        `Zara singing at Air Studios Lyndhurst Hall London. Orchestral performance. 152 BPM. Cinematic music video. Warm amber lighting. Full orchestra strings and cellos.`,
        CHARACTER_IMAGE_URL,
        SCENES.length,
        BPM,
      ]
    );
    const jobId = jobResult.insertId;
    console.log(`✓ Job created: ID ${jobId}`);

    // 2. Create scenes
    for (const scene of SCENES) {
      const startTimeInt = Math.round(scene.startTime);
      const durationInt = Math.round(scene.duration);
      const [sceneResult] = await conn.execute(
        `INSERT INTO musicVideoScenes 
          (jobId, sceneIndex, sceneType, startTime, duration, lipSync, prompt, 
           mvSceneStatus, lipSyncStatus, compositeStatus,
           characterAssignments, focusCharacter, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 'pending', ?, ?, NOW(), NOW())`,
        [
          jobId,
          scene.sceneIndex,
          scene.sceneType,
          startTimeInt,
          durationInt,
          scene.lipSync ? 1 : 0,
          scene.prompt,
          scene.characterId ? JSON.stringify([scene.characterId]) : JSON.stringify([]),
          scene.characterId ?? null,
        ]
      );
      console.log(`  ✓ Scene ${scene.sceneIndex} (${scene.sceneType}, t=${scene.startTime}s, ${durationInt}s, lipSync=${scene.lipSync}): ID ${sceneResult.insertId}`);
    }

    // 3. Set probe scene = scene index 2 (first vocal entry at t=11.84s)
    const [probeRows] = await conn.execute(
      "SELECT id FROM musicVideoScenes WHERE jobId = ? AND sceneIndex = 2",
      [jobId]
    );
    const probeSceneId = probeRows[0]?.id;
    if (probeSceneId) {
      await conn.execute(
        "UPDATE musicVideoJobs SET probeSceneId = ?, probePassed = 0, updatedAt = NOW() WHERE id = ?",
        [probeSceneId, jobId]
      );
      console.log(`\n✓ Probe scene: ${probeSceneId} (index 2, performance, t=11.84s, lip sync ON)`);
    }

    // 4. Verify
    const [verify] = await conn.execute(
      "SELECT id, status, probeSceneId, probePassed, totalScenes, songBpm FROM musicVideoJobs WHERE id = ?",
      [jobId]
    );
    console.log("\nJob state:", JSON.stringify(verify[0]));
    console.log("\n=== Ready — trigger heartbeat to dispatch probe ===");
    console.log("Job ID:", jobId);
    console.log("Probe scene ID:", probeSceneId);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
