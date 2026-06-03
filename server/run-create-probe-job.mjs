/**
 * run-create-probe-job.mjs
 *
 * Creates a fresh music video probe job using:
 * - "Beauty of the Wreckage" vocal track (confirmed -14.3 dB, 70s, strong vocals)
 * - Zara character (570001) with Air Studios environment
 * - Single performance scene at t=12s (first vocal entry) for lip sync validation
 *
 * This replaces Job 870022 which used an instrumental track (no vocals).
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1779420561458.mp3";
const CHARACTER_IMAGE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-portrait-b-v2.jpg";
const CHARACTER_ID = 570001;
const USER_ID = 1;

// 3-scene probe: 1 cinematic opener + 1 performance (lip sync) + 1 cinematic closer
// Scene at t=12s is the first strong vocal entry in Beauty of the Wreckage
const PROBE_SCENES = [
  {
    sceneIndex: 0,
    sceneType: "cinematic",
    startTime: 0,
    duration: 6,
    lipSync: false,
    prompt: "Grand concert hall interior, Lyndhurst Hall London, wide angle looking down the full length of the hall from above. Packed audience filling every seat, warm amber orchestral lighting, soft golden haze. Full orchestra on stage, musicians in dark formal attire. Slow imperceptible camera drift forward. Cinematic 16:9 widescreen, film grain, atmospheric.",
    characterId: null,
  },
  {
    sceneIndex: 1,
    sceneType: "performance",
    startTime: 12,
    duration: 6,
    lipSync: true,
    prompt: "Zara, a young woman with long black hair, standing centre stage at Air Studios Lyndhurst Hall London. She faces the camera directly, singing with emotion. Warm amber stage lighting, orchestra visible in background. Medium close-up shot. Cinematic 16:9 widescreen. Air Studios atmosphere.",
    characterId: CHARACTER_ID,
  },
  {
    sceneIndex: 2,
    sceneType: "cinematic",
    startTime: 18,
    duration: 6,
    lipSync: false,
    prompt: "Wide shot of Lyndhurst Hall concert hall interior, warm amber light flooding through tall arched windows. Ornate ceiling with chandeliers. Full orchestra on stage, musicians seated with instruments ready. Packed audience in the stalls. Soft golden haze in the air. Slow pan across the hall. Cinematic 16:9 widescreen.",
    characterId: null,
  },
];

async function main() {
  console.log("=== Creating Zara Probe Job — Beauty of the Wreckage ===\n");

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. Create the job
    const [jobResult] = await conn.execute(
      `INSERT INTO musicVideoJobs 
        (userId, title, status, audioUrl, audioKey, audioDuration, themePrompt,
         characterImageUrl, totalScenes, completedScenes, 
         aspectRatio, transcriptionStatus, vocalsStatus, createdAt, updatedAt)
       VALUES (?, ?, 'rendering', ?, ?, ?, ?, ?, ?, 0, '16:9', 'done', 'done', NOW(), NOW())`,
      [
        USER_ID,
        "Zara Probe — Beauty of the Wreckage (Lip Sync Validation)",
        AUDIO_URL,
        "music-video-audio/1-1779420561458.mp3", // audioKey
        71, // audioDuration in seconds
        "Zara singing at Air Studios Lyndhurst Hall, orchestral performance, cinematic music video", // themePrompt
        CHARACTER_IMAGE_URL,
        PROBE_SCENES.length,
      ]
    );
    const jobId = jobResult.insertId;
    console.log(`✓ Job created: ID ${jobId}`);

    // 2. Create scenes
    for (const scene of PROBE_SCENES) {
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
          scene.startTime,
          scene.duration,
          scene.lipSync ? 1 : 0,
          scene.prompt,
          // characterAssignments: JSON array of character IDs for this scene
          scene.characterId ? JSON.stringify([scene.characterId]) : JSON.stringify([]),
          // focusCharacter: primary character ID (null for cinematic)
          scene.characterId ?? null,
        ]
      );
      console.log(`  ✓ Scene ${scene.sceneIndex} (${scene.sceneType}, t=${scene.startTime}s): ID ${sceneResult.insertId}`);
    }

    // 3. Set the probe scene to the performance scene (index 1)
    const [sceneRows] = await conn.execute(
      "SELECT id FROM musicVideoScenes WHERE jobId = ? AND sceneIndex = 1",
      [jobId]
    );
    const probeSceneId = sceneRows[0]?.id;
    if (probeSceneId) {
      await conn.execute(
        "UPDATE musicVideoJobs SET probeSceneId = ?, probePassed = 0, updatedAt = NOW() WHERE id = ?",
        [probeSceneId, jobId]
      );
      console.log(`\n✓ Probe scene set: ${probeSceneId} (scene index 1, performance, t=12s)`);
    }

    // 4. Verify
    const [verify] = await conn.execute(
      "SELECT id, status, probeSceneId, probePassed, totalScenes FROM musicVideoJobs WHERE id = ?",
      [jobId]
    );
    console.log("\nJob state:", JSON.stringify(verify[0]));
    console.log("\n=== Done — trigger heartbeat to dispatch ===");
    console.log("Job ID:", jobId);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
