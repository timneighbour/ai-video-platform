/**
 * character-auto-prep.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated Character Preparation Layer
 *
 * When a user approves a generated or uploaded character, this service
 * automatically generates four reference images in the background:
 *
 * STAGE 1 — triggered immediately on previewApproved = true:
 *   A. performanceRefUrl  — Head-and-shoulders / MCU, optimised for lip-sync
 *   B. mediumShotRefUrl   — Waist-up, preserves wardrobe + body language
 *   C. cinematicRefUrl    — Wide / environmental, identity-consistent
 *
 * STAGE 2 — triggered when user selects a scene style / sceneSetting:
 *   D. environmentRefUrl  — Character placed into the chosen scene world
 *                           (e.g. Air Studios, Lyndhurst Hall, futuristic city)
 *
 * The user never sees this process. From their perspective:
 *   approve character → choose world → generate video
 *
 * Scene dispatch uses these references to select the best framing per scene:
 *   lip-sync scenes      → performanceRefUrl
 *   standard performance → mediumShotRefUrl
 *   wide / emotional     → cinematicRefUrl
 *   world-embedded       → environmentRefUrl
 *
 * Critical rules:
 *   - All generation is non-blocking (fire-and-forget from approval flow)
 *   - Grey backgrounds are strictly forbidden in all references
 *   - Face must be large enough for lip-sync readability in performanceRefUrl
 *   - Identity (hair, outfit, features) must be consistent across all refs
 *   - environmentRefUrl MUST match the actual job sceneSetting, not a generic env
 */

import { getDb } from "./db";
import { videoCharacters } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoPrepInput {
  characterId: number;
  /** Full identity brief: clothing, hair, colours, features, accessories */
  identityBrief: string;
  /** Character name (used in prompts for clarity) */
  characterName?: string;
  /** Master portrait URL — used as image anchor for all reference generations */
  masterPortraitUrl?: string | null;
  /** Scene style / setting chosen by user (e.g. "Air Studios", "Lyndhurst Hall") */
  sceneStyle?: string | null;
}

export interface AutoPrepResult {
  performanceRefUrl?: string;
  mediumShotRefUrl?: string;
  cinematicRefUrl?: string;
  environmentRefUrl?: string;
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

/**
 * Builds the performance reference prompt.
 * Head-and-shoulders framing, clear face, mouth visible, optimised for lip-sync.
 */
function buildPerformancePrompt(brief: string, name?: string): string {
  const who = name ? `${name}, ` : "";
  return (
    `Professional studio portrait photograph, ${who}${brief}. ` +
    `Head-and-shoulders framing, medium close-up shot. ` +
    `Face clearly visible, eyes open, mouth relaxed and natural. ` +
    `Soft cinematic studio lighting, warm key light from left, subtle fill. ` +
    `Sharp focus on face and eyes. ` +
    `Rich, detailed background — cinematic recording studio interior with warm bokeh, ` +
    `NOT grey, NOT white, NOT plain. ` +
    `Photorealistic, 8K, cinematic colour grade, no watermark.`
  );
}

/**
 * Builds the medium-shot reference prompt.
 * Waist-up framing, full wardrobe and body language visible.
 */
function buildMediumShotPrompt(brief: string, name?: string): string {
  const who = name ? `${name}, ` : "";
  return (
    `Full-body performance photograph, ${who}${brief}. ` +
    `Medium shot, waist-up framing. ` +
    `Complete outfit clearly visible: jacket, top, trousers, shoes, accessories. ` +
    `Natural confident posture, standing or performing. ` +
    `Cinematic stage lighting with dramatic shadows and warm highlights. ` +
    `Rich detailed background — concert stage or studio environment with atmosphere, ` +
    `NOT grey, NOT white, NOT plain. ` +
    `Photorealistic, 8K, cinematic colour grade, no watermark.`
  );
}

/**
 * Builds the cinematic reference prompt.
 * Wide / environmental framing, identity-consistent, non-lip-sync shots.
 */
function buildCinematicPrompt(brief: string, name?: string): string {
  const who = name ? `${name}, ` : "";
  return (
    `Cinematic wide-angle photograph, ${who}${brief}. ` +
    `Three-quarter or full-body shot with environmental context. ` +
    `Character positioned naturally within a dramatic scene. ` +
    `Cinematic anamorphic lens, shallow depth of field, atmospheric lighting. ` +
    `Rich immersive background — concert hall, studio, or dramatic environment, ` +
    `NOT grey, NOT white, NOT plain. ` +
    `Epic cinematic mood, 8K, film grain, no watermark.`
  );
}

/**
 * Builds the environment-aware reference prompt.
 * Character placed into the user's chosen scene world.
 * MUST use the actual sceneStyle — not a generic environment.
 */
function buildEnvironmentPrompt(
  brief: string,
  sceneStyle: string,
  name?: string
): string {
  const who = name ? `${name}, ` : "";

  // Normalise common scene style aliases to rich descriptors
  const envDescriptor = normaliseSceneStyle(sceneStyle);

  return (
    `Cinematic photograph of ${who}${brief}, ` +
    `standing inside ${envDescriptor}. ` +
    `The character is the clear focal point, fully embedded in the environment. ` +
    `Dramatic cinematic lighting matching the venue atmosphere. ` +
    `Rich detailed background showing the full environment — NOT grey, NOT white, NOT plain. ` +
    `The environment and character feel like they belong together. ` +
    `Photorealistic, 8K, cinematic colour grade, no watermark.`
  );
}

/**
 * Normalises common scene style shorthand to rich descriptive text
 * so the image model renders the correct environment.
 */
function normaliseSceneStyle(style: string): string {
  const s = style.toLowerCase().trim();

  if (s.includes("air studio") || s.includes("lyndhurst")) {
    return (
      "Air Studios Lyndhurst Hall — a grand orchestral recording studio with " +
      "soaring vaulted ceilings, warm wood panelling, dramatic overhead lighting, " +
      "and an orchestra in the background"
    );
  }
  if (s.includes("orchestral hall") || s.includes("concert hall")) {
    return (
      "a grand orchestral concert hall with ornate architecture, " +
      "rows of musicians, warm amber stage lighting, and a dramatic vaulted ceiling"
    );
  }
  if (s.includes("recording studio") || s.includes("studio")) {
    return (
      "a premium cinematic recording studio with warm lighting, " +
      "professional equipment visible, acoustic panels, and an intimate atmosphere"
    );
  }
  if (s.includes("futuristic") || s.includes("sci-fi") || s.includes("cyber")) {
    return (
      "a futuristic neon-lit cityscape with holographic displays, " +
      "rain-slicked streets, and dramatic blue-purple atmospheric lighting"
    );
  }
  if (s.includes("fantasy") || s.includes("forest") || s.includes("magical")) {
    return (
      "an enchanted fantasy forest with glowing bioluminescent plants, " +
      "dappled magical light filtering through ancient trees, and a mystical atmosphere"
    );
  }
  if (s.includes("children") || s.includes("animation") || s.includes("cartoon")) {
    return (
      "a bright colourful animated world with cheerful pastel backgrounds, " +
      "friendly shapes, and warm inviting lighting"
    );
  }
  if (s.includes("rooftop") || s.includes("urban") || s.includes("city")) {
    return (
      "a dramatic urban rooftop at golden hour with city skyline in the background, " +
      "warm sunset lighting, and cinematic atmosphere"
    );
  }
  if (s.includes("beach") || s.includes("ocean") || s.includes("sunset")) {
    return (
      "a cinematic beach at golden hour with warm ocean light, " +
      "dramatic sky, and soft atmospheric haze"
    );
  }

  // Fallback: use the user's text directly, enriched with quality descriptors
  return `${style} — a rich, detailed, cinematic environment with dramatic lighting`;
}

// ─── Reference Generation ────────────────────────────────────────────────────

async function generateAndUploadRef(
  prompt: string,
  characterId: number,
  refType: "performance" | "mediumshot" | "cinematic" | "environment",
  masterPortraitUrl?: string | null
): Promise<string | null> {
  try {
    const result = await generateImage({
      prompt,
      originalImages: masterPortraitUrl
        ? [{ url: masterPortraitUrl, mimeType: "image/jpeg" }]
        : undefined,
    });

    if (!result.url) {
      console.error(`[AutoPrep] No URL returned for ${refType} ref (char ${characterId})`);
      return null;
    }

    // Fetch the generated image and re-upload to our own S3 bucket
    // so we have a stable URL that doesn't expire
    const imgResponse = await fetch(result.url);
    if (!imgResponse.ok) {
      console.error(`[AutoPrep] Failed to fetch generated ${refType} image: ${imgResponse.status}`);
      return null;
    }
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const suffix = Date.now().toString(36);
    const key = `character-refs/${characterId}/${refType}-${suffix}.jpg`;
    const { url: s3Url } = await storagePut(key, imgBuffer, "image/jpeg");

    console.log(`[AutoPrep] ✓ ${refType} ref generated for char ${characterId}: ${s3Url}`);
    return s3Url;
  } catch (err) {
    console.error(`[AutoPrep] Error generating ${refType} ref for char ${characterId}:`, err);
    return null;
  }
}

// ─── Stage 1: Identity References ────────────────────────────────────────────

/**
 * Generates performance, medium-shot, and cinematic references.
 * Called immediately after character approval (previewApproved = true).
 * Non-blocking — caller should not await this in the approval flow.
 */
export async function runStage1AutoPrep(input: AutoPrepInput): Promise<void> {
  const { characterId, identityBrief, characterName, masterPortraitUrl } = input;

  console.log(`[AutoPrep] Stage 1 starting for character ${characterId} (${characterName ?? "unnamed"})`);

  const db = await getDb();
  if (!db) {
    console.error("[AutoPrep] No database connection — Stage 1 aborted");
    return;
  }

  // Mark as processing
  await db
    .update(videoCharacters)
    .set({ autoPrepStatus: "stage1_processing", autoPrepStartedAt: new Date() })
    .where(eq(videoCharacters.id, characterId));

  try {
    const [perfUrl, mediumUrl, cinematicUrl] = await Promise.allSettled([
      generateAndUploadRef(
        buildPerformancePrompt(identityBrief, characterName),
        characterId,
        "performance",
        masterPortraitUrl
      ),
      generateAndUploadRef(
        buildMediumShotPrompt(identityBrief, characterName),
        characterId,
        "mediumshot",
        masterPortraitUrl
      ),
      generateAndUploadRef(
        buildCinematicPrompt(identityBrief, characterName),
        characterId,
        "cinematic",
        masterPortraitUrl
      ),
    ]);

    const updates: Partial<typeof videoCharacters.$inferInsert> = {
      autoPrepStatus: "stage1_done",
    };

    if (perfUrl.status === "fulfilled" && perfUrl.value) {
      updates.performanceRefUrl = perfUrl.value;
    }
    if (mediumUrl.status === "fulfilled" && mediumUrl.value) {
      updates.mediumShotRefUrl = mediumUrl.value;
    }
    if (cinematicUrl.status === "fulfilled" && cinematicUrl.value) {
      updates.cinematicRefUrl = cinematicUrl.value;
    }

    // If all three failed, mark as failed so we can retry
    const anySucceeded =
      (perfUrl.status === "fulfilled" && perfUrl.value) ||
      (mediumUrl.status === "fulfilled" && mediumUrl.value) ||
      (cinematicUrl.status === "fulfilled" && cinematicUrl.value);

    if (!anySucceeded) {
      updates.autoPrepStatus = "failed";
    }

    const dbForUpdate = await getDb();
    if (dbForUpdate) {
      await dbForUpdate
        .update(videoCharacters)
        .set(updates)
        .where(eq(videoCharacters.id, characterId));
    }

    console.log(
      `[AutoPrep] Stage 1 complete for char ${characterId}: ` +
      `performance=${!!updates.performanceRefUrl}, ` +
      `mediumShot=${!!updates.mediumShotRefUrl}, ` +
      `cinematic=${!!updates.cinematicRefUrl}`
    );
  } catch (err) {
    console.error(`[AutoPrep] Stage 1 fatal error for char ${characterId}:`, err);
    const dbForErr = await getDb();
    if (dbForErr) {
      await dbForErr
        .update(videoCharacters)
        .set({ autoPrepStatus: "failed" })
        .where(eq(videoCharacters.id, characterId));
    }
  }
}

// ─── Stage 2: Environment-Aware Reference ────────────────────────────────────

/**
 * Generates the environment-aware reference using the user's chosen scene style.
 * Called when the user selects a scene style / sceneSetting for their job.
 *
 * If environmentRefStyle already matches the requested style, this is a no-op
 * (cache hit — avoids unnecessary regeneration).
 *
 * Non-blocking — caller should not await this.
 */
export async function runStage2EnvironmentPrep(
  input: AutoPrepInput & { sceneStyle: string }
): Promise<void> {
  const { characterId, identityBrief, characterName, masterPortraitUrl, sceneStyle } = input;

  if (!sceneStyle?.trim()) {
    console.warn(`[AutoPrep] Stage 2 called with empty sceneStyle for char ${characterId} — skipping`);
    return;
  }

  console.log(
    `[AutoPrep] Stage 2 starting for char ${characterId} — style: "${sceneStyle}"`
  );

  const db = await getDb();
  if (!db) {
    console.error("[AutoPrep] No database connection — Stage 2 aborted");
    return;
  }

  // Cache check: if we already have a ref for this exact style, skip
  const [existing] = await db
    .select({
      environmentRefUrl: videoCharacters.environmentRefUrl,
      environmentRefStyle: videoCharacters.environmentRefStyle,
      autoPrepStatus: videoCharacters.autoPrepStatus,
    })
    .from(videoCharacters)
    .where(eq(videoCharacters.id, characterId))
    .limit(1);

  if (
    existing?.environmentRefUrl &&
    existing?.environmentRefStyle?.toLowerCase().trim() === sceneStyle.toLowerCase().trim()
  ) {
    console.log(
      `[AutoPrep] Stage 2 cache hit for char ${characterId} — style "${sceneStyle}" already prepared`
    );
    return;
  }

  // Mark as processing
  await db
    .update(videoCharacters)
    .set({ autoPrepStatus: "stage2_processing" })
    .where(eq(videoCharacters.id, characterId));

  try {
    const envUrl = await generateAndUploadRef(
      buildEnvironmentPrompt(identityBrief, sceneStyle, characterName),
      characterId,
      "environment",
      masterPortraitUrl
    );

    const dbForUpdate = await getDb();
    if (dbForUpdate) {
      await dbForUpdate
        .update(videoCharacters)
        .set({
          environmentRefUrl: envUrl ?? undefined,
          environmentRefStyle: sceneStyle,
          autoPrepStatus: envUrl ? "complete" : "stage1_done", // fall back to stage1_done if env fails
          autoPrepCompletedAt: envUrl ? new Date() : undefined,
        })
        .where(eq(videoCharacters.id, characterId));
    }

    console.log(
      `[AutoPrep] Stage 2 complete for char ${characterId}: ` +
      `environmentRef=${envUrl ? "✓" : "✗"} (style: "${sceneStyle}")`
    );
  } catch (err) {
    console.error(`[AutoPrep] Stage 2 fatal error for char ${characterId}:`, err);
    const dbForErr = await getDb();
    if (dbForErr) {
      await dbForErr
        .update(videoCharacters)
        .set({ autoPrepStatus: "stage1_done" }) // revert to stage1_done, not failed
        .where(eq(videoCharacters.id, characterId));
    }
  }
}

// ─── Reference Selector ──────────────────────────────────────────────────────

export type SceneRefType = "performance" | "mediumshot" | "cinematic" | "environment";

export interface CharacterRefs {
  performanceRefUrl?: string | null;
  mediumShotRefUrl?: string | null;
  cinematicRefUrl?: string | null;
  environmentRefUrl?: string | null;
  masterPortraitUrl?: string | null;
}

/**
 * Selects the best reference URL for a given scene type.
 * Falls back to masterPortraitUrl if the specific ref is not yet available.
 *
 * Usage in scene dispatch:
 *   const ref = selectReferenceForScene(character, "performance");
 */
export function selectReferenceForScene(
  refs: CharacterRefs,
  sceneType: SceneRefType
): string | null {
  switch (sceneType) {
    case "performance":
      // Lip-sync scenes: head-and-shoulders, face large and clear
      return refs.performanceRefUrl ?? refs.masterPortraitUrl ?? null;

    case "mediumshot":
      // Standard performance: waist-up, wardrobe visible
      return refs.mediumShotRefUrl ?? refs.masterPortraitUrl ?? null;

    case "cinematic":
      // Wide / emotional: environmental context, identity consistent
      return refs.cinematicRefUrl ?? refs.mediumShotRefUrl ?? refs.masterPortraitUrl ?? null;

    case "environment":
      // World-embedded: character in chosen scene world
      return (
        refs.environmentRefUrl ??
        refs.cinematicRefUrl ??
        refs.masterPortraitUrl ??
        null
      );

    default:
      return refs.masterPortraitUrl ?? null;
  }
}

/**
 * Maps a scene's lipSyncEnabled flag and scene type string to a SceneRefType.
 * Used by scene dispatch to automatically select the correct reference.
 */
export function sceneTypeToRefType(
  lipSyncEnabled: boolean,
  sceneTypeHint?: string | null
): SceneRefType {
  if (lipSyncEnabled) return "performance";

  const hint = (sceneTypeHint ?? "").toLowerCase();
  if (hint.includes("wide") || hint.includes("cinematic") || hint.includes("emotional")) {
    return "cinematic";
  }
  if (hint.includes("environment") || hint.includes("world") || hint.includes("establishing")) {
    return "environment";
  }

  // Default: medium shot for standard performance scenes
  return "mediumshot";
}
