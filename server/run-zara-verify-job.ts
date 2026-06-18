/**
 * run-zara-verify-job.ts
 *
 * Creates a new WizPilot render job for Zara, cloned from job 510098,
 * to verify that the masterPortraitUrl fix is working correctly.
 *
 * The new job will:
 * 1. Insert a new musicVideoJobs row with the same audio/theme/settings
 * 2. Insert Zara as a character with masterPortraitUrl correctly set
 * 3. Generate a storyboard (LLM)
 * 4. Trigger the render pipeline
 *
 * Usage: npx tsx server/run-zara-verify-job.ts
 */

import "dotenv/config";
import { getDb } from "./db";
import { musicVideoJobs, videoCharacters, musicVideoScenes } from "../drizzle/schema";
import { generateStoryboard } from "./music-video-service";
import { eq, and } from "drizzle-orm";

const SOURCE_JOB_ID = 510098;
const USER_ID = 1; // Tim's user ID

// ── Zara's character data from job 510098 ──────────────────────────────────
const ZARA = {
  name: "Zara",
  role: "Lead Vocalist",
  slotIndex: 0,
  characterMode: "ai_generated" as const,
  masterPortraitUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778695377509.png",
  previewImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778695377509.png",
  lockedDescription: "A full-length standing figure of Zara, a mixed-race British woman in her late 20s, with a very slim, narrow frame, lean physique, and slender build. Her warm medium-brown skin is natural, complementing her sharp cheekbones, almond-shaped dark brown eyes, and full lips. Her natural textured hair, shoulder-length, is worn loose. She holds a confident, direct gaze. She wears a form-fitting black leather jacket, layered gold necklaces, and several gold rings. Her lower half is clad in distressed dark-wash skinny jeans that accentuate her slender legs, narrow knees, and lean calves. She completes the look with black ankle boots, covering her feet and ankles, featuring a subtle heel. Her strong presence is effortlessly cool.",
  characterVisualDetails: "Mixed-race British woman, late 20s. Sharp cheekbones, almond-shaped dark brown eyes, full lips, warm medium-brown skin. Natural textured hair worn loose, shoulder length. Confident, direct gaze. Wearing a fitted black leather jacket, gold jewellery. Strong presence, effortlessly cool.",
  lockedOutfit: JSON.stringify({ jacket: "form-fitting black leather jacket", shirt: "unspecified shirt under jacket", trousers: "distressed dark-wash skinny jeans", shoes: "black ankle boots with subtle heel", accessories: "layered gold necklaces, several gold rings" }),
  lockedProps: JSON.stringify({ instrument: "none", mic: "none", other: "none" }),
  lockedRole: "Lead Vocalist",
  lockedRules: JSON.stringify({ role: "Lead Vocalist", mustHave: ["form-fitting black leather jacket", "distressed dark-wash skinny jeans", "black ankle boots", "layered gold necklaces", "several gold rings"], allowedProps: ["microphone", "mic stand"], forbidden: ["t-shirt only without jacket", "short skirts", "dresses", "athletic wear", "hats", "glasses", "heavy makeup"] }),
  isLocked: true,
  enableLipSync: true,
  bodyBuild: "slim" as const,
  previewApproved: true,
  isRealPerson: false,
};

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // ── Step 1: Fetch source job to copy settings ───────────────────────────
  console.log(`[VerifyJob] Fetching source job ${SOURCE_JOB_ID}...`);
  const [sourceJob] = await db.select().from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, SOURCE_JOB_ID));
  if (!sourceJob) throw new Error(`Source job ${SOURCE_JOB_ID} not found`);

  console.log(`[VerifyJob] Source job: "${sourceJob.title}" | audio: ${sourceJob.audioDuration}s`);

  // ── Step 2: Create new job ───────────────────────────────────────────────
  console.log(`[VerifyJob] Creating new job (clone of ${SOURCE_JOB_ID})...`);
  const [insertResult] = await db.insert(musicVideoJobs).values({
    userId: USER_ID,
    title: `Zara CharLock™ Verify — ${new Date().toISOString().slice(0, 16)}`,
    audioUrl: sourceJob.audioUrl,
    audioKey: sourceJob.audioKey,
    audioDuration: sourceJob.audioDuration,
    themePrompt: sourceJob.themePrompt,
    genre: sourceJob.genre,
    mood: sourceJob.mood,
    aspectRatio: sourceJob.aspectRatio,
    enableLipSync: false, // skip lip sync for speed — we're testing Character Lock™ only
    sceneSetting: sourceJob.sceneSetting,
    artistType: sourceJob.artistType,
    captionsEnabled: false,
    captionStyle: "bottom",
    enforceStrictMode: true,
    characterLockEnabled: true,
    status: "draft",
    transcription: sourceJob.transcription,
    transcriptionSegments: sourceJob.transcriptionSegments,
    transcriptionStatus: "done",
    lyricsStatus: "approved",
    lyricsApproved: true,
    lyrics: sourceJob.lyrics,
    totalScenes: 0,
    completedScenes: 0,
    creditCost: 0,
  });

  const newJobId = (insertResult as any).insertId as number;
  console.log(`[VerifyJob] ✅ New job created: ID ${newJobId}`);

  // ── Step 3: Insert Zara with masterPortraitUrl set ──────────────────────
  console.log(`[VerifyJob] Inserting Zara with masterPortraitUrl...`);
  await db.insert(videoCharacters).values({
    jobId: newJobId,
    userId: USER_ID,
    name: ZARA.name,
    role: ZARA.role,
    slotIndex: ZARA.slotIndex,
    characterMode: ZARA.characterMode,
    masterPortraitUrl: ZARA.masterPortraitUrl,
    previewImageUrl: ZARA.previewImageUrl,
    lockedDescription: ZARA.lockedDescription,
    characterVisualDetails: ZARA.characterVisualDetails,
    lockedOutfit: ZARA.lockedOutfit,
    lockedProps: ZARA.lockedProps,
    lockedRole: ZARA.lockedRole,
    lockedRules: ZARA.lockedRules,
    isLocked: ZARA.isLocked,
    enableLipSync: ZARA.enableLipSync,
    bodyBuild: ZARA.bodyBuild,
    previewApproved: ZARA.previewApproved,
    isRealPerson: ZARA.isRealPerson,
  });

  // Verify masterPortraitUrl was saved
  const [savedChar] = await db.select({
    id: videoCharacters.id,
    name: videoCharacters.name,
    masterPortraitUrl: videoCharacters.masterPortraitUrl,
  }).from(videoCharacters)
    .where(and(eq(videoCharacters.jobId, newJobId), eq(videoCharacters.name, "Zara")));

  if (!savedChar?.masterPortraitUrl) {
    throw new Error(`[VerifyJob] FAIL: masterPortraitUrl was NOT saved for Zara in new job ${newJobId}!`);
  }
  console.log(`[VerifyJob] ✅ Zara saved with masterPortraitUrl: ${savedChar.masterPortraitUrl.slice(0, 60)}...`);

  // ── Step 4: Generate storyboard ─────────────────────────────────────────
  console.log(`[VerifyJob] Generating storyboard for job ${newJobId}...`);

  let lyricsSegments: Array<{ start: number; end: number; text: string }> | undefined;
  if (sourceJob.transcriptionSegments) {
    try {
      lyricsSegments = JSON.parse(sourceJob.transcriptionSegments);
    } catch { /* ignore */ }
  }

  const { scenes, roster } = await generateStoryboard(
    sourceJob.themePrompt,
    sourceJob.genre,
    sourceJob.mood,
    sourceJob.audioDuration,
    `Zara CharLock™ Verify`,
    lyricsSegments,
    [{ name: ZARA.name, role: ZARA.role, lockedDescription: ZARA.lockedDescription }],
    sourceJob.sceneSetting,
  );

  console.log(`[VerifyJob] ✅ Storyboard generated: ${scenes.length} scenes`);

  // ── Step 5: Insert scenes into DB ───────────────────────────────────────
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    await db.insert(musicVideoScenes).values({
      jobId: newJobId,
      sceneIndex: i,
      prompt: scene.prompt,
      startTime: scene.startTime,
      duration: scene.duration,
      lyrics: scene.lyrics ?? null,
      characterAssignments: scene.characterAssignments ? JSON.stringify(scene.characterAssignments) : null,
      status: "pending",
    });
  }

  // Update job to storyboard_ready with roster
  await db.update(musicVideoJobs).set({
    status: "storyboard_ready",
    totalScenes: scenes.length,
    characterRoster: roster ? JSON.stringify(roster) : null,
    storyboardLockedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(musicVideoJobs.id, newJobId));

  console.log(`[VerifyJob] ✅ Job ${newJobId} is storyboard_ready with ${scenes.length} scenes`);

  // ── Step 6: Set status to rendering — sceneDispatchHeartbeat picks it up ──
  console.log(`[VerifyJob] Setting job ${newJobId} to rendering status...`);
  await db.update(musicVideoJobs).set({
    status: "rendering",
    storyboardLockedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(musicVideoJobs.id, newJobId));

  console.log(`[VerifyJob] ✅ Job ${newJobId} set to rendering — sceneDispatchHeartbeat will pick it up within 30s`);
  console.log(`[VerifyJob] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[VerifyJob] New job ID: ${newJobId}`);
  console.log(`[VerifyJob] Zara masterPortraitUrl: ✅ SET`);
  console.log(`[VerifyJob] Character Lock™: ACTIVE`);
  console.log(`[VerifyJob] Monitor at: /screening-room or check DB for job ${newJobId}`);
  console.log(`[VerifyJob] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(err => {
  console.error("[VerifyJob] FATAL ERROR:", err);
  process.exit(1);
});
