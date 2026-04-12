/**
 * Music Video Autopilot Service
 * Handles audio transcription, lyrics-driven storyboard generation,
 * per-scene video rendering, and final assembly.
 */
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDb } from "./db";
import { musicVideoJobs, musicVideoScenes } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { initKlingAI } from "./ai-apis/kling";
import { initSeedance } from "./ai-apis/seedance";
import { submitFalSeedanceVideo, pollFalSeedanceVideo } from "./ai-apis/fal-seedance";
import { submitHyperealVideo, pollHyperealVideo, HYPEREAL_MODELS } from "./ai-apis/hypereal";
import { submitAtlasVideo, pollAtlasVideo } from "./ai-apis/atlascloud";
import { submitWaveSpeedVideo, pollWaveSpeedVideo, type WaveSpeedModel } from "./ai-apis/wavespeed";
import type { RendererType } from "./products";
import { RENDERER_COSTS } from "./products";
import { applyWizSound, type AudioTier } from "./wizsound";

const klingClient = initKlingAI();
const seedanceClient = initSeedance();

// Prefix used to distinguish fal.ai request IDs from Kling/Volcengine task IDs
const FAL_REQUEST_ID_PREFIX = "fal:";
// Prefix used to distinguish Hypereal job IDs
const HYPEREAL_JOB_ID_PREFIX = "hypereal:";
const ATLAS_JOB_ID_PREFIX = "atlas:";
const WAVESPEED_JOB_ID_PREFIX = "wavespeed:";
const WAVESPEED_SEEDANCE_PREFIX = "wavespeed:seedance:";
const WAVESPEED_HAILUO_PREFIX = "wavespeed:hailuo:";

const execAsync = promisify(exec);

const CREDITS_PER_SCENE = 10;
const SCENE_DURATION_SECONDS = 8; // each scene is 8 seconds

export function calculateSceneCount(audioDurationSeconds: number): number {
  // One scene every 8 seconds, minimum 3 scenes, maximum 45 scenes (~6 min)
  const count = Math.ceil(audioDurationSeconds / SCENE_DURATION_SECONDS);
  return Math.max(3, Math.min(45, count));
}

export function calculateCreditCost(sceneCount: number): number {
  return sceneCount * CREDITS_PER_SCENE;
}

/**
 * Transcribe audio from a URL using Whisper, returning full text + timestamped segments.
 * Saves the transcription to the job record in the database.
 */
export async function transcribeJobAudio(
  jobId: number,
  audioUrl: string
): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }> }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Mark as processing
  await db.update(musicVideoJobs)
    .set({ transcriptionStatus: "processing", updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, jobId));

  try {
    const result = await transcribeAudio({ audioUrl });

    // Type-narrow: check for error response
    if ('error' in result) {
      throw new Error(result.error);
    }

    const segments = (result.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    // Save transcription + timestamped segments to DB
    // Segments are stored as JSON so generateStoryboard can extract per-scene lyrics accurately
    await db.update(musicVideoJobs)
      .set({
        transcription: result.text,
        transcriptionSegments: JSON.stringify(segments),
        transcriptionStatus: "done",
        updatedAt: new Date(),
      })
      .where(eq(musicVideoJobs.id, jobId));

    return { text: result.text, segments };
  } catch (err) {
    await db.update(musicVideoJobs)
      .set({ transcriptionStatus: "failed", updatedAt: new Date() })
      .where(eq(musicVideoJobs.id, jobId));
    // Return empty transcription — storyboard will use theme only
    return { text: "", segments: [] };
  }
}

/**
 * Extract lyrics for a specific time window from Whisper segments.
 */
function extractLyricsForWindow(
  segments: Array<{ start: number; end: number; text: string }>,
  windowStart: number,
  windowEnd: number
): string {
  const relevant = segments.filter(
    (s) => s.end > windowStart && s.start < windowEnd
  );
  return relevant.map((s) => s.text).join(" ").trim();
}

/**
 * Generate a storyboard using LLM based on theme, lyrics, and song duration.
 * Uses a two-pass approach:
 *   Pass 1 — Build a complete character roster (locked characters + any AI-invented ones)
 *   Pass 2 — Generate scenes using that fixed roster so every character is visually consistent
 */
export interface StoryboardCharacter {
  name: string;
  role: string;
  isLocked: boolean;
  description: string;
}

export interface StoryboardResult {
  scenes: Array<{
    sceneIndex: number;
    startTime: number;
    duration: number;
    prompt: string;        // Full render prompt (with character descriptions prepended)
    cleanPrompt: string;   // Scene direction only (for UI display, no character descriptions)
    visualStyle: string;
    lyrics: string;
    characterAssignments: string[];
  }>;
  roster: StoryboardCharacter[]; // full character roster (locked + AI-invented)
}

export async function generateStoryboard(
  themePrompt: string,
  genre: string | null | undefined,
  mood: string | null | undefined,
  audioDurationSeconds: number,
  title: string,
  lyricsSegments?: Array<{ start: number; end: number; text: string }>,
  lockedCharacters?: Array<{ name: string; role: string | null; lockedDescription: string }>,
  sceneSetting?: string | null
): Promise<StoryboardResult> {
  const sceneCount = calculateSceneCount(audioDurationSeconds);
  const minutes = Math.floor(audioDurationSeconds / 60);
  const seconds = audioDurationSeconds % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Build scene windows and extract lyrics for each
  const sceneWindows = Array.from({ length: sceneCount }, (_, i) => {
    const startTime = i * SCENE_DURATION_SECONDS;
    const endTime = Math.min(startTime + SCENE_DURATION_SECONDS, audioDurationSeconds);
    const duration = endTime - startTime;
    const lyrics = lyricsSegments
      ? extractLyricsForWindow(lyricsSegments, startTime, endTime)
      : "";
    return { sceneIndex: i, startTime, duration, lyrics };
  });

  // Build a lyrics-aware scene list for the LLM prompt
  const sceneList = sceneWindows.map((w) =>
    `Scene ${w.sceneIndex + 1} (${w.startTime}s–${w.startTime + w.duration}s)${w.lyrics ? `: "${w.lyrics}"` : ""}`
  ).join("\n");

  const hasLyrics = lyricsSegments && lyricsSegments.length > 0;
  const hasLockedCharacters = lockedCharacters && lockedCharacters.length > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // PASS 1: Build the complete character roster
  // Ask the LLM to list ALL characters that will appear in this video:
  //   • Locked characters (from user-uploaded photos) — descriptions are fixed
  //   • Additional characters the LLM wants to invent (e.g. bass player, crowd)
  // The roster is defined ONCE here and reused verbatim in every scene.
  // ─────────────────────────────────────────────────────────────────────────────

  const lockedBlock = hasLockedCharacters
    ? `The following characters are LOCKED — their appearance is fixed by the user and MUST NOT be changed:
${lockedCharacters!.map((c, i) =>
  `LOCKED CHARACTER ${i + 1}: "${c.name}"${c.role ? ` (${c.role})` : ""}
APPEARANCE: ${c.lockedDescription}`
).join("\n\n")}`
    : "No locked characters — you may invent all characters.";

  // Count locked characters to determine if we need any extras
  const lockedCount = lockedCharacters?.length ?? 0;
  const lockedRoleList = lockedCharacters?.map(c => `${c.name} (${c.role})`).join(", ") ?? "none";

  const rosterSystemPrompt = `You are a professional music video casting director.
Your job is to define the COMPLETE cast of characters for a music video.

⚠️ MOST IMPORTANT RULE — READ CAREFULLY:
The user has already defined ${lockedCount} character(s): ${lockedRoleList}.
These characters ALREADY COVER their roles. You MUST NOT invent any new character that performs a role already covered by a locked character.
If the theme mentions "3 piece rock band" but the user only uploaded 2 characters (e.g. singer and drummer), you should ONLY add a 3rd character for the missing role (e.g. bassist) — and ONLY if the theme explicitly requires it.
If all roles are covered by locked characters, return ONLY the locked characters — do NOT add anyone.

CRITICAL RULES — MUST FOLLOW:
1. Include ALL locked characters exactly as specified — copy their appearance descriptions VERBATIM, do NOT alter a single word
2. Each locked character has a FIXED ROLE — no other character may perform that same role in any scene
   Example: if a locked character is the "drummer", NO other character may play drums in any scene
3. Add additional characters ONLY if the video concept requires a role that is NOT covered by any locked character
4. For each additional character you invent, write a DETAILED, SPECIFIC visual description (60-80 words) covering:
   - Gender and approximate age (e.g. "man in his late 20s")
   - Ethnicity and skin tone (e.g. "white British, fair skin")
   - Hair: colour, length, style, texture (e.g. "short dark brown hair, slightly messy")
   - Eyes: colour and shape
   - Build and height impression
   - Clothing/costume specific to this video
   - Any distinctive features
5. This description will be copied VERBATIM into every scene — make it precise enough for an AI to reproduce the SAME person every time
6. Keep the total cast to a maximum of 4 characters
7. NEVER create a character whose role duplicates a locked character's role
8. NEVER create a character with unusual hair colours (blue, green, pink, purple) unless explicitly requested

Return ONLY valid JSON, no markdown, no explanation.`;

  const sceneSettingLine = sceneSetting ? `- Locations/Scene Setting: ${sceneSetting}` : "";

  const rosterUserPrompt = `Define the complete character roster for a music video called "${title}".

Video concept:
- Theme: ${themePrompt}
- Genre: ${genre || "not specified"}
- Mood: ${mood || "not specified"}
- Style: music video with ${sceneCount} scenes${sceneSettingLine ? `\n${sceneSettingLine}` : ""}

${lockedBlock}

Return a JSON object with a "characters" array. Each character must have:
- name: string (character name or role, e.g. "Lead Singer", "Bass Player", "Dancer")
- role: string (their role in the video, e.g. "vocalist", "musician", "background dancer")
- isLocked: boolean (true only for the locked characters listed above)
- description: string (full visual appearance — copy locked characters' descriptions exactly; write new detailed descriptions for invented characters)`;

  const rosterResponse = await invokeLLM({
    messages: [
      { role: "system" as const, content: rosterSystemPrompt },
      { role: "user" as const, content: rosterUserPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "character_roster",
        strict: true,
        schema: {
          type: "object",
          properties: {
            characters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  isLocked: { type: "boolean" },
                  description: { type: "string" },
                },
                required: ["name", "role", "isLocked", "description"],
                additionalProperties: false,
              },
            },
          },
          required: ["characters"],
          additionalProperties: false,
        },
      },
    },
  });

  const rosterRaw = rosterResponse.choices[0]?.message?.content;
  if (!rosterRaw) throw new Error("LLM returned empty roster response");
  const rosterContent = typeof rosterRaw === "string" ? rosterRaw : JSON.stringify(rosterRaw);
  const rosterParsed = JSON.parse(rosterContent);
  let fullRoster: Array<{ name: string; role: string; isLocked: boolean; description: string }> =
    rosterParsed.characters ?? [];

  // ─── SERVER-SIDE ROSTER VALIDATION ───────────────────────────────────────────
  // 1. Always start with the locked characters using their EXACT frozen descriptions
  //    (never trust the LLM to copy them correctly)
  if (hasLockedCharacters) {
    const lockedByName = new Map(lockedCharacters!.map(c => [c.name.toLowerCase(), c]));

    // Build a set of locked roles (normalised to lowercase) to detect duplicates
    const lockedRoleSet = new Set(
      lockedCharacters!.map(c => (c.role ?? "").toLowerCase().replace(/[^a-z]/g, ""))
    );

    // Filter the LLM roster:
    // - Replace locked characters with authoritative versions (exact frozen descriptions)
    // - Remove any invented character whose role duplicates a locked role
    const inventedCharacters = fullRoster
      .filter(c => !c.isLocked)
      .filter(c => {
        const normRole = (c.role ?? "").toLowerCase().replace(/[^a-z]/g, "");
        // Check if this invented character's role overlaps with any locked role
        for (const lockedRole of Array.from(lockedRoleSet)) {
          if (normRole.includes(lockedRole) || lockedRole.includes(normRole)) {
            console.log(`[Storyboard] Removing invented character "${c.name}" (${c.role}) — role duplicates locked character`);
            return false;
          }
        }
        return true;
      })
      .slice(0, 2); // max 2 invented characters

    // Build the authoritative roster: locked characters first (with exact descriptions), then invented
    const authorativeLockedChars = lockedCharacters!.map(c => ({
      name: c.name,
      role: c.role ?? "",
      isLocked: true,
      description: c.lockedDescription, // ALWAYS use the frozen description, never the LLM's version
    }));

    fullRoster = [...authorativeLockedChars, ...inventedCharacters];
  }

  console.log(`[Storyboard] Final roster (${fullRoster.length} chars): ${fullRoster.map(c => `${c.name} (${c.role})${c.isLocked ? " [LOCKED]" : ""}`).join(", ")}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PASS 2: Generate scenes using the fixed roster
  // Every character in the roster has a locked description — the LLM must:
  //   • Assign specific character(s) to each scene
  //   • Copy their description verbatim into the scene prompt
  // ─────────────────────────────────────────────────────────────────────────────

  // Build a clear role map so the LLM knows which roles are locked
  const lockedRoles = fullRoster
    .filter(c => c.isLocked)
    .map(c => `"${c.name}" is the ONLY ${c.role} — no other character may play this role`)
    .join("\n");

  const rosterBlock = `
⚠️ COMPLETE CHARACTER ROSTER — ALL DESCRIPTIONS ARE FIXED, DO NOT ALTER:

${fullRoster.map((c, i) =>
  `CHARACTER ${i + 1}: "${c.name}" (${c.role})${c.isLocked ? " [LOCKED — user-uploaded photo, MUST match exactly]" : " [AI-defined, keep consistent]"}
FIXED APPEARANCE (copy EXACTLY into prompt when this character appears):
${c.description}`
).join("\n\n")}

⚠️ LOCKED ROLE EXCLUSIVITY — NEVER VIOLATE:
${lockedRoles || "No locked roles."}

CHARACTER ASSIGNMENT RULES — STRICTLY ENFORCED:
1. For every scene, decide which character(s) from the roster above appear
2. List their exact names in "characterAssignments" — use ONLY names from the roster above
3. DO NOT include character appearance descriptions in the "prompt" field — character descriptions will be injected automatically by the system
4. The "prompt" field should contain ONLY the scene direction: camera angle, lighting, setting, action, atmosphere, mood
5. You may refer to characters by NAME (e.g. "Tim plays guitar centre stage") but do NOT describe their appearance
6. NEVER invent characters not in the roster above
7. NEVER put two characters in the same scene performing the same role (e.g. two guitarists, two singers)
8. Each character must appear in at least 2 scenes
9. Prefer solo scenes (one character) — they produce the most consistent results`;

  const systemPrompt = `You are a professional music video director.
Your job is to create detailed, cinematic scene descriptions for AI video generation.
Each scene description must be:
- Highly visual and specific (lighting, camera angle, movement, subjects, atmosphere)
- Consistent with the overall theme and mood
${hasLyrics ? "- Visually inspired by the EMOTION and THEME of the lyrics — translate feelings into imagery, do NOT include any text, words, or lyrics visually in the video frame" : ""}
- Optimised for AI video generation (clear, vivid, no abstract concepts)
- Varied in camera angles, settings, and visual styles
- Between 60-120 words each
- CRITICAL: NEVER include text, words, captions, subtitles, or lyrics as visual elements in the video frame
- CRITICAL: Do NOT include character appearance descriptions in the prompt — they are injected automatically by the system
- Refer to characters by NAME only in the prompt (e.g. "Tim plays guitar") — never describe their looks
- CRITICAL: Scene directions MUST NOT contradict a character's actual physical appearance from the roster. For example, if a character has SHORT hair, do NOT write "hair flying" or "long hair flowing". If a character is clean-shaven, do NOT write "stroking his beard". Always respect the character's real physical features when writing action descriptions.${rosterBlock}

Return ONLY valid JSON, no markdown, no explanation.`;

  const allCharacterNames = fullRoster.map(c => `"${c.name}"`).join(", ");

  const userPrompt = `Create a music video storyboard for a song called "${title}".

Song details:
- Duration: ${durationStr} (${audioDurationSeconds} seconds)
- Theme/Concept: ${themePrompt}
- Genre: ${genre || "not specified"}
- Mood: ${mood || "not specified"}
- Number of scenes: ${sceneCount} (one scene every ${SCENE_DURATION_SECONDS} seconds)${sceneSetting ? `\n- Locations/Scene Setting: ${sceneSetting} — USE THESE LOCATIONS as the primary visual environments for scenes. Vary between them naturally across the video.` : ""}

${hasLyrics ? `Lyrics by scene (use these to inspire each scene's visuals — make the imagery match what is being sung):
${sceneList}

` : `Scene timeline:
${sceneList}

`}Return a JSON object with a "scenes" array of exactly ${sceneCount} scene objects. Each object must have:
- sceneIndex: number (0-based)
- startTime: number (seconds)
- duration: number (seconds)
- prompt: string (60-120 words. Describe ONLY the scene direction: camera angle, lighting, setting, action, atmosphere. Refer to characters by NAME only — do NOT describe their appearance. NO text, captions, or lyrics in the frame.)
- visualStyle: string (e.g. "cinematic", "dark neon", "ethereal", "gritty realism", "anime")
- characterAssignments: array of character names from [${allCharacterNames}] who appear in this scene
- modelAssignment: string, either "seedance-2.0" or "hailuo-minimax"
  • Use "seedance-2.0" for scenes with close-up character faces, detailed facial expressions, or where character likeness is critical
  • Use "hailuo-minimax" for wide shots, atmospheric scenes, crowd shots, instrument cutaways, or scenes where character detail is less critical
  • When in doubt, prefer "seedance-2.0" for locked characters

Distribute characters thoughtfully — each must appear in at least 2 scenes. Solo scenes are encouraged.`

  const response = await invokeLLM({
    messages: [
      { role: "system" as const, content: systemPrompt as string },
      { role: "user" as const, content: userPrompt as string },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "storyboard",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sceneIndex: { type: "integer" },
                  startTime: { type: "integer" },
                  duration: { type: "integer" },
                  prompt: { type: "string" },
                  visualStyle: { type: "string" },
                  characterAssignments: {
                    type: "array",
                    items: { type: "string" },
                  },
                  modelAssignment: { type: "string", enum: ["seedance-2.0", "hailuo-minimax"] },
                },
                required: ["sceneIndex", "startTime", "duration", "prompt", "visualStyle", "characterAssignments", "modelAssignment"],
                additionalProperties: false,
              },
            },
          },
          required: ["scenes"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) throw new Error("LLM returned empty response");
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  const parsed = JSON.parse(content);

  // Build a lookup of the full roster by name (lowercase) for validation
  const rosterByName = new Map(fullRoster.map(c => [c.name.toLowerCase(), c]));

  // Merge lyrics, validate characterAssignments, and FORCIBLY INJECT character descriptions.
  // We do NOT trust the LLM to copy descriptions verbatim — we do it ourselves here.
  // This guarantees character consistency regardless of LLM paraphrasing.
  const scenes = parsed.scenes.map((scene: any) => {
    const assignments: string[] = scene.characterAssignments ?? [];
    // Validate assignments — remove any names not in the roster
    const validAssignments = assignments.filter(name =>
      rosterByName.has(name.toLowerCase())
    );

    // Build a character identity prefix for the prompt.
    // For each assigned character, prepend their EXACT description so the AI video model
    // always receives the correct appearance — even if the LLM paraphrased it.
    const characterPrefixes = validAssignments
      .map(name => {
        const char = rosterByName.get(name.toLowerCase());
        if (!char) return null;
        // No lock tag in the stored prompt — it's internal LLM guidance only, not user-visible
        return `${char.name} (${char.role}): ${char.description}`;
      })
      .filter(Boolean);

    // The LLM now writes ONLY scene direction (camera, lighting, action, setting).
    // We ALWAYS prepend the exact character descriptions mechanically — this guarantees
    // character consistency and avoids the duplication bug.
    let finalPrompt = scene.prompt as string;
    
    // Store the clean scene-direction-only prompt for UI display
    const cleanPrompt = finalPrompt;
    
    // Build the full render prompt with character descriptions prepended
    if (characterPrefixes.length > 0) {
      finalPrompt = `${characterPrefixes.join(" | ")}\n\n${finalPrompt}`;
    }

    return {
      ...scene,
      prompt: finalPrompt,       // Full prompt with character descriptions (for rendering)
      cleanPrompt: cleanPrompt,  // Scene direction only (for UI display)
      lyrics: sceneWindows[scene.sceneIndex]?.lyrics ?? "",
      characterAssignments: validAssignments,
    };
  });

  return { scenes, roster: fullRoster };
}

/**
 * Start rendering a single scene via Kling AI.
 * Returns the task ID for polling.
 * @param lipSync - If true, append a lip-sync hint to the prompt (for music-driven scenes).
 */
/** Prompt modifiers for each lip-sync style */
// Helper to map storyboard modelAssignment to WaveSpeed model enum
function mapModelAssignmentToWaveSpeed(modelAssignment: string): WaveSpeedModel {
  // hailuo-minimax scenes (wide/atmospheric) → use fast seedance for speed/cost
  if (modelAssignment === "hailuo-minimax") return "bytedance/seedance-2.0-fast/text-to-video";
  return "bytedance/seedance-2.0/text-to-video"; // default: full quality for character scenes
}

const LIP_SYNC_STYLE_PROMPTS: Record<string, string> = {
  natural: "Characters sing naturally with realistic, subtle mouth movements synced to the music.",
  expressive: "Characters sing with highly expressive, exaggerated mouth movements and energetic facial animation synced to the music.",
  subtle: "Characters sing with very subtle, minimal mouth movements, almost imperceptible, softly synced to the music.",
  dramatic: "Characters sing with dramatic, theatrical mouth movements and intense emotional facial expressions synced to the music.",
  anime: "Anime-style lip sync: stylized, exaggerated mouth flaps with wide open/close movements, expressive eyes, and vibrant character animation in the style of Japanese animation.",
};

/**
 * Estimate the render cost (GBP) for a set of scenes under a given renderer assignment.
 */
export function estimateRenderCost(
  sceneCount: number,
  premiumScenes: number
): number {
  const standardScenes = Math.max(0, sceneCount - premiumScenes);
  return (
    premiumScenes * RENDERER_COSTS.kling_standard +
    standardScenes * RENDERER_COSTS.seedance
  );
}

export async function startSceneRender(
  sceneId: number,
  prompt: string,
  duration: number,
  lipSync = true,
  lipSyncStyle: "natural" | "expressive" | "subtle" | "dramatic" | "anime" = "natural",
  renderer: RendererType | "wavespeed" = "fal_seedance",
  modelAssignment: WaveSpeedModel = "bytedance/seedance-2.0/text-to-video"
): Promise<string> {
  // Append lip-sync guidance to the prompt based on the per-scene setting
  const finalPrompt = lipSync
    ? `${prompt} ${LIP_SYNC_STYLE_PROMPTS[lipSyncStyle] ?? LIP_SYNC_STYLE_PROMPTS.natural}`
    : `${prompt} Cinematic movement only, no singing, no mouth animation.`;

  // Route to WaveSpeed first (primary renderer) with fallback chain
  if (renderer === "wavespeed") {
    try {
      return await startSceneRenderWaveSpeed(sceneId, finalPrompt, duration, modelAssignment);
    } catch (waveSpeedErr) {
      console.warn(`[MusicVideo] Scene ${sceneId} WaveSpeed failed, falling back to Hypereal:`, waveSpeedErr);
      try {
        return await startSceneRenderHypereal(sceneId, finalPrompt, duration);
      } catch (hyperealErr) {
        console.warn(`[MusicVideo] Scene ${sceneId} Hypereal failed, trying Atlas Cloud:`, hyperealErr);
        try {
          return await startSceneRenderAtlasCloud(sceneId, finalPrompt, duration);
        } catch (atlasErr) {
          console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud failed, falling back to fal.ai Seedance:`, atlasErr);
          return startSceneRenderFalSeedance(sceneId, finalPrompt, duration);
        }
      }
    }
  }

  // Route to the appropriate renderer
  // fal_seedance and seedance both now try Hypereal first, then fall back to fal.ai
  if (renderer === "fal_seedance" || renderer === "seedance") {
    try {
      return await startSceneRenderHypereal(sceneId, finalPrompt, duration);
    } catch (hyperealErr) {
      console.warn(`[MusicVideo] Scene ${sceneId} Hypereal failed, trying Atlas Cloud:`, hyperealErr);
      try {
        return await startSceneRenderAtlasCloud(sceneId, finalPrompt, duration);
      } catch (atlasErr) {
        console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud failed, falling back to fal.ai Seedance:`, atlasErr);
        return startSceneRenderFalSeedance(sceneId, finalPrompt, duration);
      }
    }
  }

  // Premium renderers (kling_standard, kling_pro, runway) — with single retry + Hypereal fallback
  try {
    const taskId = await startSceneRenderKling(finalPrompt, duration);
    console.log(`[MusicVideo] Scene ${sceneId} → Kling (${renderer}) taskId=${taskId}`);
    return taskId;
  } catch (err) {
    console.warn(`[MusicVideo] Scene ${sceneId} Kling failed, falling back to Hypereal Seedance:`, err);
    return startSceneRenderHypereal(sceneId, finalPrompt, duration);
  }
}

async function startSceneRenderKling(prompt: string, duration: number): Promise<string> {
  const taskId = await klingClient.createTextToVideo({
    prompt,
    duration: duration <= 5 ? "5" : "10",
    aspect_ratio: "16:9",
    mode: "standard",
  });
  if (!taskId) throw new Error("Kling: no task_id returned");
  return taskId;
}

async function startSceneRenderHypereal(sceneId: number, prompt: string, duration: number): Promise<string> {
  // Hypereal Seedance 2.0 has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  const trySubmit = async (p: string): Promise<string> => {
    const jobId = await submitHyperealVideo({
      model: HYPEREAL_MODELS.SEEDANCE_2_T2V,
      prompt: p,
      duration: duration <= 5 ? 5 : 8,
      mode: "auto",
    });
    if (!jobId) throw new Error(`Hypereal: no jobId returned for scene ${sceneId}`);
    return jobId;
  };

  let jobId: string;
  try {
    jobId = await trySubmit(safePrompt);
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    console.warn(`[MusicVideo] Scene ${sceneId} Hypereal first attempt failed (${errMsg}). Retrying with simplified prompt.`);
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic 16:9 video clip.";
    try {
      jobId = await trySubmit(fallbackPrompt);
    } catch (retryErr: any) {
      throw new Error(`Hypereal Seedance failed for scene ${sceneId} after retry: ${String(retryErr?.message ?? retryErr)}`);
    }
  }

  console.log(`[MusicVideo] Scene ${sceneId} → Hypereal Seedance 2.0 jobId=${jobId}`);
  return `${HYPEREAL_JOB_ID_PREFIX}${jobId}`;
}

async function startSceneRenderFalSeedance(sceneId: number, prompt: string, duration: number): Promise<string> {
  // fal.ai Seedance has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  const trySubmit = async (p: string): Promise<string> => {
    const requestId = await submitFalSeedanceVideo({
      prompt: p,
      aspect_ratio: "16:9",
      duration: duration <= 5 ? "5" : "8",
      resolution: "720p",
      generate_audio: false, // music video — audio comes from the track
    });
    if (!requestId) throw new Error(`fal.ai Seedance: no request_id returned for scene ${sceneId}`);
    return requestId;
  };

  let requestId: string;
  try {
    requestId = await trySubmit(safePrompt);
  } catch (err: any) {
    // If the first attempt fails (content policy / prompt too long), retry with a shorter fallback
    const errMsg = String(err?.message ?? err);
    console.warn(`[MusicVideo] Scene ${sceneId} fal.ai first attempt failed (${errMsg}). Retrying with simplified prompt.`);
    // Simplified fallback: first 200 chars of the original prompt
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic 16:9 video clip.";
    try {
      requestId = await trySubmit(fallbackPrompt);
    } catch (retryErr: any) {
      throw new Error(`fal.ai Seedance failed for scene ${sceneId} after retry: ${String(retryErr?.message ?? retryErr)}`);
    }
  }

  console.log(`[MusicVideo] Scene ${sceneId} → fal.ai Seedance requestId=${requestId}`);
  // Prefix the ID so pollSceneStatus knows which API to poll
  return `${FAL_REQUEST_ID_PREFIX}${requestId}`;
}

async function startSceneRenderAtlasCloud(sceneId: number, prompt: string, duration: number): Promise<string> {
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  const trySubmit = async (p: string): Promise<string> => {
    const { predictionId } = await submitAtlasVideo(p, duration <= 5 ? 5 : 8);
    if (!predictionId) throw new Error(`Atlas Cloud: no predictionId returned for scene ${sceneId}`);
    return predictionId;
  };

  let predictionId: string;
  try {
    predictionId = await trySubmit(safePrompt);
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud first attempt failed (${errMsg}). Retrying with simplified prompt.`);
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic 16:9 video clip.";
    try {
      predictionId = await trySubmit(fallbackPrompt);
    } catch (retryErr: any) {
      throw new Error(`Atlas Cloud failed for scene ${sceneId} after retry: ${String(retryErr?.message ?? retryErr)}`);
    }
  }

  console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud Seedance 2.0 predictionId=${predictionId}`);
  return `${ATLAS_JOB_ID_PREFIX}${predictionId}`;
}

async function startSceneRenderSeedance(sceneId: number, prompt: string, duration: number): Promise<string> {
  const taskId = await seedanceClient.createTextToVideo({
    prompt,
    duration: duration <= 5 ? 5 : 10,
    aspect_ratio: "16:9",
  });
  if (!taskId) throw new Error(`Seedance: no task_id returned for scene ${sceneId}`);
  return taskId;
}

/**
 * Poll an Atlas Cloud video generation job and update DB when complete.
 */
async function pollSceneStatusAtlasCloud(
  sceneId: number,
  predictionId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollAtlasVideo(predictionId);

    if (result.status === "completed" && result.videoUrl) {
      // Download and re-upload to S3 for permanent storage
      let buffer: Buffer | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(result.videoUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffer = Buffer.from(await response.arrayBuffer());
          break;
        } catch (fetchErr) {
          console.warn(`[AtlasCloud] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }

      if (!buffer) {
        const db2 = await getDb();
        if (db2) {
          await db2.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: "Failed to download Atlas Cloud video after 3 attempts", updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, sceneId));
        }
        return { status: "failed" };
      }

      const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
      const { url } = await storagePut(key, buffer, "video/mp4");

      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }

      return { status: "completed", videoUrl: url };
    }

    if (result.status === "failed") {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: result.error ?? "Atlas Cloud generation failed", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    return { status: "processing" };
  } catch (err: any) {
    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(err?.message ?? err), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }
}

/**
 * Poll a Hypereal AI video generation job and update DB when complete.
 */
async function pollSceneStatusHypereal(
  sceneId: number,
  jobId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const outputUrl = await pollHyperealVideo(jobId, HYPEREAL_MODELS.SEEDANCE_2_T2V);
    if (!outputUrl) return { status: "processing" };

    // Download and re-upload to S3 for permanent storage
    let buffer: Buffer | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(outputUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      } catch (fetchErr) {
        console.warn(`[Hypereal] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!buffer) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Failed to download Hypereal video after 3 attempts", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
    const { url } = await storagePut(key, buffer, "video/mp4");

    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }

    return { status: "completed", videoUrl: url };
  } catch (err: any) {
    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(err?.message ?? err), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }
}

/**
 * Poll a fal.ai Seedance scene and update DB when complete.
 */
async function pollSceneStatusFalSeedance(
  sceneId: number,
  requestId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollFalSeedanceVideo(requestId);
    if (!result) return { status: "processing" };

    // Download and re-upload to S3 for permanent storage
    let buffer: Buffer | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(result.videoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      } catch (fetchErr) {
        console.warn(`[FalSeedance] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!buffer) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Failed to download fal.ai video after 3 attempts", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
    const { url } = await storagePut(key, buffer, "video/mp4");

    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }

    return { status: "completed", videoUrl: url };
  } catch (err: any) {
    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(err?.message ?? err), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }
}

/**
 * Poll a scene's render status and update DB when complete.
 * Returns the video URL if completed, null if still processing.
 */
export async function pollSceneStatus(
  sceneId: number,
  taskId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  // Route to the correct API based on the task ID prefix
  if (taskId.startsWith(WAVESPEED_SEEDANCE_PREFIX)) {
    return pollSceneStatusWaveSpeed(sceneId, taskId.slice(WAVESPEED_SEEDANCE_PREFIX.length));
  }

  if (taskId.startsWith(WAVESPEED_HAILUO_PREFIX)) {
    return pollSceneStatusWaveSpeed(sceneId, taskId.slice(WAVESPEED_HAILUO_PREFIX.length));
  }

  if (taskId.startsWith(HYPEREAL_JOB_ID_PREFIX)) {
    return pollSceneStatusHypereal(sceneId, taskId.slice(HYPEREAL_JOB_ID_PREFIX.length));
  }

  if (taskId.startsWith(ATLAS_JOB_ID_PREFIX)) {
    return pollSceneStatusAtlasCloud(sceneId, taskId.slice(ATLAS_JOB_ID_PREFIX.length));
  }

  if (taskId.startsWith(FAL_REQUEST_ID_PREFIX)) {
    return pollSceneStatusFalSeedance(sceneId, taskId.slice(FAL_REQUEST_ID_PREFIX.length));
  }

  // Legacy: Volcengine Seedance task IDs are handled by klingClient (wrong but kept for backward compat)
  // Kling task IDs are UUIDs without the fal: prefix
  const result = await klingClient.getTaskStatus(taskId);

  if (!result) return { status: "processing" };

  const taskStatus = result.task_status;

  // Kling API uses "succeed" as the success status
  if (taskStatus === "succeed") {
    const videoUrl = (result as any).task_result?.videos?.[0]?.url;
    if (!videoUrl) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Video generation succeeded but no video URL returned", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    // Download with retry (up to 3 attempts) in case of transient CDN errors
    let buffer: Buffer | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      } catch (fetchErr) {
        console.warn(`[MusicVideo] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!buffer) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Failed to download completed scene video after 3 attempts", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
    const { url } = await storagePut(key, buffer, "video/mp4");

    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }

    return { status: "completed", videoUrl: url };
  }

  if (taskStatus === "failed") {
    // Extract Kling's actual failure reason if available
    const failReason = (result as any).task_result?.fail_reason
      ?? (result as any).fail_reason
      ?? "Video generation failed";
    const db3 = await getDb();
    if (db3) {
      await db3.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(failReason), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }

  return { status: "processing" };
}

/**
 * Assemble all scene videos + audio into a final music video using ffmpeg.
 * Returns the S3 URL of the final video.
 */
export async function assembleMusicVideo(jobId: number, audioTier: AudioTier = "standard"): Promise<string> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const [job] = await dbConn.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} not found`);

  const scenes = await dbConn.select()
    .from(musicVideoScenes)
    .where(and(eq(musicVideoScenes.jobId, jobId), eq(musicVideoScenes.status, "completed")));

  if (scenes.length === 0) throw new Error("No completed scenes to assemble");

  scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wizvid-job-${jobId}-`));

  try {
    const sceneFiles: string[] = [];
    for (const scene of scenes) {
      if (!scene.videoUrl) continue;
      const sceneFile = path.join(tmpDir, `scene-${scene.sceneIndex.toString().padStart(3, "0")}.mp4`);
      const resp = await fetch(scene.videoUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(sceneFile, buf);
      sceneFiles.push(sceneFile);
    }

    // Download original audio
    const audioFileRaw = path.join(tmpDir, "audio-raw.mp3");
    const audioResp = await fetch(job.audioUrl);
    const audioBuf = Buffer.from(await audioResp.arrayBuffer());
    fs.writeFileSync(audioFileRaw, audioBuf);

    // Apply WizSound™ audio enhancement
    const audioFile = path.join(tmpDir, "audio.mp3");
    await applyWizSound(audioFileRaw, audioFile, audioTier);

    const concatFile = path.join(tmpDir, "concat.txt");
    const concatContent = sceneFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(concatFile, concatContent);

    // Concatenate all video clips
    const concatenatedVideo = path.join(tmpDir, "concatenated.mp4");
     await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -preset fast -crf 22 "${concatenatedVideo}"`,
      { timeout: 600000 } // 10 min — long videos with many scenes need more time
    );
    // Get the actual duration of the concatenated video and the audio
    const videoInfo = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${concatenatedVideo}"`);
    const videoDuration = parseFloat(videoInfo.stdout.trim()) || 0;
    const audioInfo = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`);
    const audioDuration = parseFloat(audioInfo.stdout.trim()) || 0;
    // Mix video with audio — loop video if shorter than audio to cover full track
    const finalVideo = path.join(tmpDir, "final.mp4");
    if (videoDuration > 0 && audioDuration > 0 && videoDuration < audioDuration) {
      // Loop the concatenated video to cover the full audio duration
      const loopedVideo = path.join(tmpDir, "looped.mp4");
      await execAsync(
        `ffmpeg -y -stream_loop -1 -i "${concatenatedVideo}" -t ${audioDuration} -c:v libx264 -preset fast -crf 22 "${loopedVideo}"`,
        { timeout: 600000 }
      );
      await execAsync(
        `ffmpeg -y -i "${loopedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -t ${audioDuration} "${finalVideo}"`,
        { timeout: 600000 }
      );
    } else {
      // Video is long enough — trim to exact audio duration
      await execAsync(
        `ffmpeg -y -i "${concatenatedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -t ${audioDuration} "${finalVideo}"`,
        { timeout: 600000 }
      );
    }

    const finalBuffer = fs.readFileSync(finalVideo);
    const finalKey = `music-videos/job-${jobId}-final-${Date.now()}.mp4`;
    const { url } = await storagePut(finalKey, finalBuffer, "video/mp4");

    await dbConn.update(musicVideoJobs)
      .set({ status: "completed", finalVideoUrl: url, finalVideoKey: finalKey, updatedAt: new Date() })
      .where(eq(musicVideoJobs.id, jobId));

    return url;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Submit a video generation request to WaveSpeed AI with the specified model.
 * Routes to either Seedance 2.0 (character-heavy) or Hailuo Minimax (wide/atmospheric).
 */
async function startSceneRenderWaveSpeed(
  sceneId: number,
  prompt: string,
  duration: number,
  model: WaveSpeedModel = "bytedance/seedance-2.0/text-to-video"
): Promise<string> {
  // WaveSpeed has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  // Map duration to WaveSpeed's allowed values: 5, 10, or 15
  const wsDuration: 5 | 10 | 15 = duration <= 5 ? 5 : duration <= 10 ? 10 : 15;

  const trySubmit = async (p: string): Promise<string> => {
    const taskId = await submitWaveSpeedVideo(
      {
        prompt: p,
        duration: wsDuration,
        aspect_ratio: "16:9",
        resolution: "720p",
      },
      model
    );
    if (!taskId) throw new Error(`WaveSpeed: no task_id returned for scene ${sceneId}`);
    return taskId;
  };

  let taskId: string;
  try {
    taskId = await trySubmit(safePrompt);
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    console.warn(`[MusicVideo] Scene ${sceneId} WaveSpeed ${model} first attempt failed (${errMsg}). Retrying with simplified prompt.`);
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic 16:9 video clip.";
    try {
      taskId = await trySubmit(fallbackPrompt);
    } catch (retryErr: any) {
      throw new Error(`WaveSpeed ${model} failed for scene ${sceneId} after retry: ${String(retryErr?.message ?? retryErr)}`);
    }
  }

  // Prefix the task ID with model info for routing during polling
  const isFast = model === "bytedance/seedance-2.0-fast/text-to-video";
  const prefix = isFast ? WAVESPEED_HAILUO_PREFIX : WAVESPEED_SEEDANCE_PREFIX;
  console.log(`[MusicVideo] Scene ${sceneId} → WaveSpeed ${model} taskId=${taskId}`);
  return `${prefix}${taskId}`;
}

/**
 * Poll a WaveSpeed video generation task and update DB when complete.
 */
async function pollSceneStatusWaveSpeed(
  sceneId: number,
  taskId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollWaveSpeedVideo(taskId);

    if (result.status === "completed" && result.video_url) {
      // Download and re-upload to S3 for permanent storage
      let buffer: Buffer | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(result.video_url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffer = Buffer.from(await response.arrayBuffer());
          break;
        } catch (fetchErr) {
          console.warn(`[WaveSpeed] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }

      if (!buffer) {
        const db2 = await getDb();
        if (db2) {
          await db2.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: "Failed to download WaveSpeed video after 3 attempts", updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, sceneId));
        }
        return { status: "failed" };
      }

      const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
      const { url } = await storagePut(key, buffer, "video/mp4");

      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }

      return { status: "completed", videoUrl: url };
    }

    if (result.status === "failed") {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: result.error ?? "WaveSpeed generation failed", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    return { status: "processing" };
  } catch (err: any) {
    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(err?.message ?? err), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }
}
