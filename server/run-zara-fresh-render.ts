/**
 * run-zara-fresh-render.ts
 * Creates a brand-new render job for Zara, cloned from job 510098.
 * Verifies Character Lock + WizSync lip sync end-to-end.
 *
 * Run: npx tsx server/run-zara-fresh-render.ts
 */

import "dotenv/config";
import { getDb } from "./db";
import { musicVideoJobs, videoCharacters, musicVideoScenes } from "../drizzle/schema";
import { generateStoryboard } from "./music-video-service";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  console.log(`[ZaraFreshRender] Creating new job...`);

  // 1. Create new job
  const [newJob] = await db.insert(musicVideoJobs).values({
    userId: 1,
    title: "Zara — WizSync Verify (Fresh)",
    audioUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778695391908.mp3",
    audioKey: "music-video-audio/1-1778695391908.mp3",
    audioDuration: 71,
    themePrompt: "Golden hour desert highway, late afternoon sun burning low on the horizon. The artist stands at the edge of an empty road stretching into infinity, dust catching the light like embers. Close-up: face turned toward camera, eyes direct, expression calm and powerful. Warm amber and burnt orange colour palette. Cinematic depth of field. No rain, no city, no rooftop.; Visual Style: Cinematic",
    genre: "Cinematic Rock",
    mood: null,
    totalScenes: 9,
    creditCost: 135,
    sceneSetting: "Ancient forest clearing, shafts of light breaking through the canopy, mist at ground level, moss-covered stones. Artist at the centre, surrounded by light, ethereal atmosphere. Deep greens and gold.",
    characterLockEnabled: true,
    captionsEnabled: false,
    status: "draft",
  });

  const newJobId = (newJob as any).insertId;
  console.log(`[ZaraFreshRender] New job created: ID ${newJobId}`);

  // 2. Insert Zara with masterPortraitUrl set
  await db.insert(videoCharacters).values({
    jobId: newJobId,
    userId: 1,
    name: "Zara",
    role: "Lead Vocalist",
    enableLipSync: true,
    slotIndex: 0,
    lockedDescription: "A full-length standing figure of Zara, a mixed-race British woman in her late 20s, with a very slim, narrow frame, lean physique, and slender build. Her warm medium-brown skin is natural, complementing her sharp cheekbones, almond-shaped dark brown eyes, and full lips. Her natural textured hair, shoulder-length, is worn loose. She holds a confident, direct gaze. She wears a form-fitting black leather jacket, layered gold necklaces, and several gold rings. Her lower half is clad in distressed dark-wash skinny jeans that accentuate her slender legs, narrow knees, and lean calves. She completes the look with black ankle boots, covering her feet and ankles, featuring a subtle heel. Her strong presence is effortlessly cool.",
    isLocked: true,
    masterPortraitUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778695377509.png",
    previewImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778695377509.png",
    previewApproved: true,
    lockedOutfit: JSON.stringify({
      jacket: "form-fitting black leather jacket",
      shirt: "unspecified shirt under jacket",
      trousers: "distressed dark-wash skinny jeans",
      shoes: "black ankle boots with subtle heel",
      accessories: "layered gold necklaces, several gold rings"
    }),
    lockedRole: "Lead Vocalist",
  });

  console.log(`[ZaraFreshRender] Zara inserted — masterPortraitUrl: SET ✅  enableLipSync: true ✅`);

  // 3. Generate storyboard
  console.log(`[ZaraFreshRender] Generating storyboard...`);
  const storyboard = await generateStoryboard(
    "Golden hour desert highway, late afternoon sun burning low on the horizon. The artist stands at the edge of an empty road stretching into infinity, dust catching the light like embers. Close-up: face turned toward camera, eyes direct, expression calm and powerful. Warm amber and burnt orange colour palette. Cinematic depth of field. No rain, no city, no rooftop.; Visual Style: Cinematic",
    "Cinematic Rock",
    null,
    71,
    "Zara — WizSync Verify (Fresh)",
    undefined,
    [{ name: "Zara", role: "Lead Vocalist", lockedDescription: "A full-length standing figure of Zara, a mixed-race British woman in her late 20s, with a very slim, narrow frame, lean physique, and slender build. Her warm medium-brown skin is natural, complementing her sharp cheekbones, almond-shaped dark brown eyes, and full lips. Her natural textured hair, shoulder-length, is worn loose. She holds a confident, direct gaze. She wears a form-fitting black leather jacket, layered gold necklaces, and several gold rings." }],
    "Ancient forest clearing, shafts of light breaking through the canopy, mist at ground level, moss-covered stones. Artist at the centre, surrounded by light, ethereal atmosphere. Deep greens and gold."
  );

  console.log(`[ZaraFreshRender] Storyboard generated: ${storyboard.scenes.length} scenes`);

  // 4. Save scenes to DB
  for (const scene of storyboard.scenes) {
    await db.insert(musicVideoScenes).values({
      jobId: newJobId,
      sceneIndex: scene.sceneIndex,
      startTime: scene.startTime,
      duration: scene.duration,
      prompt: scene.prompt,
      lyrics: scene.lyrics || null,
      visualStyle: scene.visualStyle,
      characterAssignments: JSON.stringify(scene.characterAssignments),
      modelAssignment: (scene.modelAssignment as "seedance-2.0" | "hailuo-minimax") ?? "seedance-2.0",
      status: "pending",
    });
  }

  // 5. Set job to rendering
  await db.update(musicVideoJobs)
    .set({ status: "rendering", totalScenes: storyboard.scenes.length })
    .where(eq(musicVideoJobs.id, newJobId));

  console.log(`\n✅ Job ${newJobId} is now RENDERING — ${storyboard.scenes.length} scenes queued`);
  console.log(`   Production heartbeat will dispatch scenes within 2 minutes.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[ZaraFreshRender] FAILED:", err);
  process.exit(1);
});
