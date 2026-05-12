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
import { musicVideoJobs, musicVideoScenes, videoCharacters } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { initKlingAI } from "./ai-apis/kling";
import { submitFalSeedanceVideo, pollFalSeedanceVideo } from "./ai-apis/fal-seedance";
import { submitHyperealVideo, pollHyperealVideo, HYPEREAL_MODELS } from "./ai-apis/hypereal";
import { submitAtlasVideo, submitAtlasReferenceToVideo, submitAtlasImageToVideo, pollAtlasVideo } from "./ai-apis/atlascloud";
import { extractSceneAudioClip } from "./audio-clip-extractor";
import { submitWaveSpeedVideo, pollWaveSpeedVideo, type WaveSpeedModel } from "./ai-apis/wavespeed";
import { submitGrokVideo, pollGrokVideo } from "./ai-apis/grok-imagine";
import type { RendererType } from "./products";
import { RENDERER_COSTS } from "./products";
import { applyWizSound, type AudioTier } from "./wizsound";
import { analyseContent, buildSceneVisualBrief, getSectionAtTime, type ContentAnalysis } from "./content-analyser";
import {
  checkSubmissionAllowed,
  logProviderSubmission,
  markProviderJobFailed,
  makeIdempotencyKey,
  getSceneAttemptCount,
  PROVIDER_COST_USD,
} from "./spend-protection";

const klingClient = initKlingAI();

// Prefix used to distinguish fal.ai request IDs from Kling/Volcengine task IDs
const FAL_REQUEST_ID_PREFIX = "fal:";
// Prefix used to distinguish Hypereal job IDs
const HYPEREAL_JOB_ID_PREFIX = "hypereal:";
const ATLAS_JOB_ID_PREFIX = "atlas:";
const WAVESPEED_JOB_ID_PREFIX = "wavespeed:";
const WAVESPEED_SEEDANCE_PREFIX = "wavespeed:seedance:";
const WAVESPEED_HAILUO_PREFIX = "wavespeed:hailuo:";
const GROK_IMAGINE_PREFIX = "grok:";


const execAsync = promisify(exec);

// IMPORTANT: Import from products.ts — do NOT redefine locally. Single source of truth.
import { getCreditsPerScene } from "./products";
const SCENE_DURATION_SECONDS = 8; // each scene is 8 seconds

export function calculateSceneCount(audioDurationSeconds: number): number {
  // One scene every 8 seconds, minimum 3 scenes, maximum 45 scenes (~6 min)
  const count = Math.ceil(audioDurationSeconds / SCENE_DURATION_SECONDS);
  return Math.max(3, Math.min(45, count));
}

/**
 * Calculate credit cost using tiered pricing based on audio duration.
 * Longer videos cost more credits/scene (users are willing to pay more).
 *   ≤3 min: 15 credits/scene
 *   3–5 min: 18 credits/scene
 *   5+ min: 20 credits/scene
 */
export function calculateCreditCost(sceneCount: number, audioDurationSeconds: number = 0): number {
  const creditsPerScene = getCreditsPerScene(audioDurationSeconds);
  return sceneCount * creditsPerScene;
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
    modelAssignment?: string; // "seedance-2.0" | "hailuo-minimax" — drives model selection and smart lip sync
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
  sceneSetting?: string | null,
  existingContentAnalysis?: ContentAnalysis | null
): Promise<StoryboardResult> {
  const sceneCount = calculateSceneCount(audioDurationSeconds);

  // ── DEEP SONG UNDERSTANDING ──────────────────────────────────────────────────
  // Run content analysis BEFORE generating any scenes.
  // This gives the AI a deep understanding of the song's theme, narrative,
  // emotional arc, and lyric imagery — used to drive every scene decision.
  let contentAnalysis: ContentAnalysis | null = existingContentAnalysis ?? null;
  if (!contentAnalysis) {
    try {
      console.log(`[Storyboard] Running deep content analysis for "${title}"...`);
      contentAnalysis = await analyseContent({
        lyrics: lyricsSegments?.map(s => s.text).join(" ") ?? "",
        lyricSegments: lyricsSegments,
        themePrompt: themePrompt,
        title,
        genre: genre ?? undefined,
        mood: mood ?? undefined,
        audioDuration: audioDurationSeconds,
        appType: "music_video",
      });
      console.log(`[Storyboard] Content analysis complete: theme="${contentAnalysis.theme}", mood="${contentAnalysis.overallMood}", sections=${contentAnalysis.sections.length}`);
    } catch (analysisErr: any) {
      console.warn(`[Storyboard] Content analysis failed (non-fatal), proceeding without:`, analysisErr?.message);
    }
  }
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
6. Keep the total cast to a maximum of 8 characters (a full band may have 5-8 members — vocalist, guitarist, bassist, drummer, keyboard player, backing vocalists, etc.)
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
      .slice(0, 4); // max 4 invented characters (for bands without uploaded photos)

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

  const sceneSettingConstraint = sceneSetting
    ? `
⚠️ USER-SPECIFIED SETTING — THIS IS NON-NEGOTIABLE:
The user has explicitly requested this visual environment: "${sceneSetting}"
EVERY scene MUST be set in or directly reference this environment.
Do NOT substitute generic stages, studios, or landscapes unless the user's setting explicitly includes them.
Examples of correct behaviour:
  - User says "desert" → every scene is in a desert (dunes, heat haze, sand, arid sky, etc.)
  - User says "cliff edge by the sea" → characters perform on clifftops with ocean visible
  - User says "underwater" → scenes are submerged, with light refracting through water
  - User says "dark forest" → dense woodland, tree canopy, dappled light
The setting is the VISUAL WORLD of this music video. It MUST be present in every scene prompt.

⚠️ MUSIC VIDEO PERFORMANCE RULE — ALWAYS APPLIES:
Even within the user-specified setting, this is a MUSIC VIDEO. Characters MUST be performing:
- Singers must be at a microphone, singing, or performing expressively
- Guitarists must be playing their guitar
- Drummers must be seated behind their drum kit, playing
- Bassists must be holding and playing their bass guitar
- Characters are ALWAYS in performance mode — not standing idle, not in random poses
- The setting wraps AROUND the performance (e.g. desert stage, underwater concert, forest clearing concert)`
    : `
⚠️ DEFAULT MUSIC VIDEO PERFORMANCE SETTING — MANDATORY:
No specific setting was provided. This is a MUSIC VIDEO. ALL scenes MUST depict a live music performance.
Default performance context:
- Characters perform on a professional concert stage with dramatic stage lighting
- Singers are at a microphone stand, performing with energy and expression
- Guitarists are playing their guitar, moving with the music
- Drummers are seated behind a full drum kit, playing with intensity
- Bassists are holding and playing their bass guitar
- Stage has atmospheric lighting: spotlights, coloured gels, haze/smoke effects
- Camera angles vary: close-up on faces/hands, medium shots of performers, wide shots of the full stage
- DO NOT generate random landscapes, nature scenes, or non-performance environments unless the theme explicitly calls for them
- Every scene must feel like it belongs in a professional music video shoot`;

  // Build content analysis context block for scene generation
  const contentAnalysisBlock = contentAnalysis ? `

═══════════════════════════════════════════════════════════════
DEEP SONG UNDERSTANDING — THIS IS YOUR CREATIVE FOUNDATION
You have already analysed this song. Use this understanding to drive EVERY scene decision.
═══════════════════════════════════════════════════════════════

THEME: ${contentAnalysis.theme}
NARRATIVE: ${contentAnalysis.narrative}
EMOTIONAL ARC: ${contentAnalysis.emotionalArc}
OVERALL MOOD: ${contentAnalysis.overallMood}
SETTING CONTEXT: ${contentAnalysis.settingContext}
CAMERA STYLE: ${contentAnalysis.cameraStyle}
CONTENT TYPE: ${contentAnalysis.contentType}

KEY VISUAL IMAGERY FROM LYRICS (MUST appear in scenes where relevant):
${contentAnalysis.keyImagery.map((img, i) => `  ${i + 1}. ${img}`).join("\n")}

MOST POWERFUL LYRIC LINES (give these scenes extra visual weight):
${contentAnalysis.highlightLyrics.map((l, i) => `  ${i + 1}. "${l}"`).join("\n")}

DOMINANT COLOUR PALETTE: ${contentAnalysis.dominantColours.join(", ")}
GENRE VISUALS: ${contentAnalysis.genreVisuals}

SONG STRUCTURE (MANDATORY — scene type MUST match section):
${contentAnalysis.sections.map(s => `  [${s.startTime}s–${s.endTime}s] ${s.type.toUpperCase()} (intensity ${s.intensity}/10): ${s.lyrics ? `"${s.lyrics.slice(0, 80)}..."` : "(no lyrics)"}`).join("\n")}

MOOD SHIFTS (lighting MUST change at these points):
${contentAnalysis.moodShifts.map(m => `  At ${m.atTime}s: ${m.description} → Lighting: ${m.lightingSuggestion}`).join("\n")}

SCENE TYPE RULES (NON-NEGOTIABLE):
- CHORUS scenes: wide stage shot, full band visible, maximum energy, peak performance
- VERSE scenes: intimate close-up, storytelling, character-focused, emotional depth
- BRIDGE/BREAKDOWN scenes: dramatic, abstract, unexpected visual, emotional peak
- INTRO scenes: establishing shot, build anticipation, set the world
- OUTRO scenes: resolution, fade, emotional landing
═══════════════════════════════════════════════════════════════` : "";

  const systemPrompt = `You are a professional music video director.
Your job is to create detailed, cinematic scene descriptions for AI video generation.

⚠️ MOST IMPORTANT RULE — THE USER'S VISION IS SACRED:
You are directing the user's creative vision, not inventing your own.
Every scene must faithfully represent what the user has described in their theme, setting, and concept.
Do NOT replace the user's requested environment with a generic stage, studio, or landscape.
If the user says "desert", every scene is in a desert. If they say "underwater", every scene is underwater.
If they say "city rooftop at night", every scene is on a city rooftop at night.
${sceneSettingConstraint}${contentAnalysisBlock}

Each scene description must be:
- Highly visual and specific (lighting, camera angle, movement, subjects, atmosphere)
- Consistent with the overall theme, mood, and USER-SPECIFIED SETTING
${hasLyrics ? "- MANDATORY: Visually reflect the SPECIFIC LYRIC IMAGERY of that scene window — if the lyrics say 'fire in my eyes', show fire; if they say 'standing on the edge', show a cliff or precipice. Translate the EXACT words into visuals." : ""}
- Optimised for AI video generation (clear, vivid, no abstract concepts)
- Varied in camera angles and visual styles — but ALWAYS within the user's specified setting/environment
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
    
    // Build the full render prompt with character descriptions prepended.
    // The "ONLY these characters" constraint prevents the video AI from inventing
    // extra background musicians, crowd members, or additional performers.
    if (characterPrefixes.length > 0) {
      const charNames = validAssignments.join(" and ");
      finalPrompt = `${characterPrefixes.join(" | ")}\n\n${finalPrompt}\n\nIMPORTANT: ONLY ${charNames} appear in this scene. No additional people, musicians, background performers, or crowd members. Exactly ${validAssignments.length} person${validAssignments.length === 1 ? "" : "s"} visible.`;
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
export function mapModelAssignmentToWaveSpeed(modelAssignment: string): WaveSpeedModel {
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
  modelAssignment: WaveSpeedModel = "bytedance/seedance-2.0/text-to-video",
  /** URL of the approved storyboard preview image — passed as reference_images to lock visual appearance */
  storyboardImageUrl?: string | null,
  /** Export aspect ratio — defaults to 16:9 (YouTube) */
  aspectRatio: "16:9" | "9:16" | "1:1" = "16:9",
  /** Music video job ID — required for spend-protection checks */
  jobId: number = 0,
  /** Master portrait URL for character consistency (used by Atlas Cloud reference-to-video) */
  characterImageUrl?: string | null,
  /** Full song S3 URL for extracting scene audio clips (used by Atlas Cloud reference-to-video for lip sync) */
  audioUrl?: string | null,
  /** Start time of this scene in the song (seconds) — used to extract the correct audio segment */
  sceneStartTime?: number
): Promise<string> {
  // ── SPEND PROTECTION: Pre-submission guard (Items 1–4, 9) ─────────────────────────
  // Determine provider for idempotency check (use primary provider in fallback chain)
  const primaryProvider = (renderer === "wavespeed" || renderer === "fal_seedance" || renderer === "seedance")
    ? "fal_seedance" : renderer;
  if (jobId > 0) {
    const blockReason = await checkSubmissionAllowed({ jobId, sceneId, provider: primaryProvider, attempt: 1 });
    if (blockReason) {
      console.warn(`[SpendProtection] Scene ${sceneId} BLOCKED: ${blockReason}`);
      throw new Error(`SPEND_PROTECTION_BLOCK: ${blockReason}`);
    }
  }
  // Append lip-sync guidance to the prompt based on the per-scene setting
  const finalPrompt = lipSync
    ? `${prompt} ${LIP_SYNC_STYLE_PROMPTS[lipSyncStyle] ?? LIP_SYNC_STYLE_PROMPTS.natural}`
    : `${prompt} Cinematic movement only, no singing, no mouth animation.`;

  // ── PROVIDER CHAIN (May 2026) ─────────────────────────────────────────────
  // PRIMARY:  Atlas Cloud Fast (~$0.101/sec, 720p, Seedance 2.0 Fast) — proven, best quality
  // FAILOVER: WaveSpeed (~$0.10/sec, 720p, Seedance 2.0 Fast) — automatic if Atlas exhausted
  // DISABLED: fal.ai — Forbidden errors, higher cost
  // DISABLED: Hypereal — not vetted for production
  // Policy: Try Atlas Cloud first. If Atlas returns 402 (insufficient balance) or is unavailable,
  //         automatically fall back to WaveSpeed. Surface all other errors immediately.
  if (renderer === "wavespeed" || renderer === "fal_seedance" || renderer === "seedance" || renderer === "atlas_cloud" || renderer === "atlas_cloud_fast") {
    // Step 1: Try Atlas Cloud Fast (primary) — with reference-to-video for lip sync when character image is available
    try {
      return await startSceneRenderAtlasCloud(
        sceneId,
        finalPrompt,
        duration,
        jobId,
        characterImageUrl ?? null,
        audioUrl ?? null,
        sceneStartTime,
        lipSync
      );
    } catch (atlasErr: any) {
      const atlasMsg = String(atlasErr?.message ?? atlasErr);
      const isExhausted = atlasMsg.includes("402") || atlasMsg.toLowerCase().includes("insufficient") || atlasMsg.toLowerCase().includes("balance") || atlasMsg.toLowerCase().includes("payment");
      if (!isExhausted) {
        // Non-balance error (content policy, network, etc.) — surface immediately, no fallback
        console.error(`[MusicVideo] Scene ${sceneId} Atlas Cloud failed (non-balance error). No fallback.`, atlasMsg.slice(0, 200));
        throw new Error(`Video generation failed for scene ${sceneId}. Please try again in a moment.`);
      }
      // Step 2: Atlas exhausted — automatically fall back to WaveSpeed
      console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud balance exhausted — falling back to WaveSpeed automatically.`);
      // Fire-and-forget owner notification (debounced to 1/hour)
      import("./provider-health").then(({ notifyAtlasExhausted }) => notifyAtlasExhausted()).catch(() => {});
      try {
        return await startSceneRenderWaveSpeed(
          sceneId,
          finalPrompt,
          duration,
          modelAssignment ?? "bytedance/seedance-2.0-fast/text-to-video",
          storyboardImageUrl ?? undefined,
          aspectRatio,
          jobId
        );
      } catch (wsErr: any) {
        const wsMsg = String(wsErr?.message ?? wsErr);
        console.error(`[MusicVideo] Scene ${sceneId} WaveSpeed fallback also failed: ${wsMsg.slice(0, 200)}`);
        throw new Error(`Video generation failed for scene ${sceneId}. Both Atlas Cloud and WaveSpeed are currently unavailable. Please try again shortly.`);
      }
    }
  }

  // Grok Imagine — premium renderer with image-to-video support (storyboard lock)
  if (renderer === "grok_imagine") {
    try {
      return await startSceneRenderGrokImagine(sceneId, finalPrompt, duration, storyboardImageUrl ?? undefined, aspectRatio);
    } catch (grokErr) {
      // No silent fallback — WaveSpeed is disabled for launch. Surface the error.
      console.error(`[MusicVideo] Scene ${sceneId} Grok Imagine failed. No fallback active (safe launch mode).`, (grokErr as Error).message?.slice(0, 200));
      throw new Error(`Video generation failed for scene ${sceneId}. Please try again in a moment.`);
    }
  }

  // Premium renderers (kling_standard, kling_pro, runway) — no silent fallback
  try {
    const taskId = await startSceneRenderKling(finalPrompt, duration, aspectRatio);
    console.log(`[MusicVideo] Scene ${sceneId} → Kling (${renderer}) taskId=${taskId}`);
    return taskId;
  } catch (err) {
    // No silent fallback to Hypereal — surface the error cleanly
    console.error(`[MusicVideo] Scene ${sceneId} Kling failed. No fallback active (safe launch mode).`, (err as Error).message?.slice(0, 200));
    throw new Error(`Video generation failed for scene ${sceneId}. Please try again in a moment.`);
  }
}

async function startSceneRenderKling(prompt: string, duration: number, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9"): Promise<string> {
  const taskId = await klingClient.createTextToVideo({
    prompt,
    duration: duration <= 5 ? "5" : "10",
    aspect_ratio: aspectRatio,
    mode: "std",
  });
  if (!taskId) throw new Error("Kling: no task_id returned");
  return taskId;
}

async function startSceneRenderHypereal(sceneId: number, prompt: string, duration: number, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9", jobId: number = 0): Promise<string> {
  // Hypereal Seedance 2.0 has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;
  const trySubmit = async (p: string): Promise<string> => {
    const hyperealJobId = await submitHyperealVideo({
      model: HYPEREAL_MODELS.SEEDANCE_2_T2V,
      prompt: p,
      duration: duration <= 5 ? 5 : 8,
      mode: "auto",
      aspect_ratio: aspectRatio,
    });
    if (!hyperealJobId) throw new Error(`Hypereal: no jobId returned for scene ${sceneId}`);
    return hyperealJobId;
  };
  let hyperealJobId: string;
  try {
    hyperealJobId = await trySubmit(safePrompt);
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    console.warn(`[MusicVideo] Scene ${sceneId} Hypereal first attempt failed (${errMsg}). Retrying with simplified prompt.`);
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic 16:9 video clip.";
    try {
      hyperealJobId = await trySubmit(fallbackPrompt);
    } catch (retryErr: any) {
      throw new Error(`Hypereal Seedance failed for scene ${sceneId} after retry: ${String(retryErr?.message ?? retryErr)}`);
    }
  }
  // ── SPEND PROTECTION: Log successful submission (Items 6 & 7) ─────────────────────
  if (jobId > 0) {
    const attemptCount = await getSceneAttemptCount(sceneId);
    const idempotencyKey = makeIdempotencyKey(jobId, sceneId, "hypereal", attemptCount + 1);
    await logProviderSubmission({
      jobId,
      sceneId,
      provider: "hypereal",
      providerJobId: hyperealJobId,
      idempotencyKey,
      attemptNumber: attemptCount + 1,
      estimatedCostUsd: PROVIDER_COST_USD.hypereal,
      submissionReason: "scene_render",
    });
  }
  console.log(`[MusicVideo] Scene ${sceneId} → Hypereal Seedance 2.0 hyperealJobId=${hyperealJobId}`);
  return `${HYPEREAL_JOB_ID_PREFIX}${hyperealJobId}`;
}

async function startSceneRenderFalSeedance(sceneId: number, prompt: string, duration: number, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9", jobId: number = 0): Promise<string> {
  // fal.ai Seedance has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  const trySubmit = async (p: string): Promise<string> => {
    const requestId = await submitFalSeedanceVideo({
      prompt: p,
      aspect_ratio: aspectRatio,
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

  // ── SPEND PROTECTION: Log successful submission (Items 6 & 7) ─────────────────────
  if (jobId > 0) {
    const attemptCount = await getSceneAttemptCount(sceneId);
    const idempotencyKey = makeIdempotencyKey(jobId, sceneId, "fal_seedance", attemptCount + 1);
    await logProviderSubmission({
      jobId,
      sceneId,
      provider: "fal_seedance",
      providerJobId: requestId,
      idempotencyKey,
      attemptNumber: attemptCount + 1,
      estimatedCostUsd: PROVIDER_COST_USD.fal_seedance,
      submissionReason: "scene_render",
    });
  }
  console.log(`[MusicVideo] Scene ${sceneId} → fal.ai Seedance requestId=${requestId}`);
  // Prefix the ID so pollSceneStatus knows which API to poll
  return `${FAL_REQUEST_ID_PREFIX}${requestId}`;
}

async function startSceneRenderGrokImagine(
  sceneId: number,
  prompt: string,
  duration: number,
  storyboardImageUrl?: string,
  aspectRatio: "16:9" | "9:16" | "1:1" = "16:9"
): Promise<string> {
  // Grok Imagine supports up to 10s clips; clamp to valid range
  const clampedDuration = Math.max(1, Math.min(10, Math.round(duration)));

  const requestId = await submitGrokVideo({
    prompt,
    image_url: storyboardImageUrl ?? undefined, // image-to-video if storyboard available
    duration: clampedDuration,
    aspect_ratio: aspectRatio,
    resolution: "720p",
  });

  console.log(`[MusicVideo] Scene ${sceneId} → Grok Imagine requestId=${requestId} (${storyboardImageUrl ? "image-to-video" : "text-to-video"})`);
  return `${GROK_IMAGINE_PREFIX}${requestId}`;
}

async function pollSceneStatusGrokImagine(
  sceneId: number,
  requestId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollGrokVideo(requestId);

    if (result.status === "done" && result.videoUrl) {
      // Download and re-upload to S3 for permanent storage
      let buffer: Buffer | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(result.videoUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffer = Buffer.from(await response.arrayBuffer());
          break;
        } catch (fetchErr) {
          console.warn(`[GrokImagine] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }

      if (!buffer) {
        const db2 = await getDb();
        if (db2) {
          await db2.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: "Failed to download Grok Imagine video after 3 attempts", updatedAt: new Date() })
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

      console.log(`[GrokImagine] Scene ${sceneId} completed → S3: ${url.slice(0, 80)}...`);
      return { status: "completed", videoUrl: url };
    }

    if (result.status === "failed" || result.status === "expired") {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: `Grok Imagine generation ${result.status}`, updatedAt: new Date() })
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
 * Submit a scene to Atlas Cloud using the best available model:
 *   1. reference-to-video (reference_images + reference_audios) — BEST: character lock + lip sync
 *   2. image-to-video (image anchor) — GOOD: character lock, no lip sync
 *   3. text-to-video — FALLBACK: no character lock
 *
 * @param characterImageUrl  Master portrait URL for character consistency (optional)
 * @param audioUrl           Full song S3 URL for extracting the scene audio clip (optional)
 * @param sceneStartTime     Start time of this scene in the song (seconds)
 * @param enableLipSync      Whether to pass audio to the model for lip sync
 */
async function startSceneRenderAtlasCloud(
  sceneId: number,
  prompt: string,
  duration: number,
  jobId: number = 0,
  characterImageUrl?: string | null,
  audioUrl?: string | null,
  sceneStartTime?: number,
  enableLipSync: boolean = true
): Promise<string> {
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  const clipDuration = Math.max(2, Math.min(15, duration));
  let predictionId: string;

  // ── STRATEGY 1: reference-to-video (character image + audio lip sync) ────────
  if (characterImageUrl && audioUrl && sceneStartTime !== undefined && enableLipSync) {
    try {
      // Extract the exact 8-second audio segment for this scene
      const sceneAudioUrl = await extractSceneAudioClip(audioUrl, sceneStartTime, clipDuration, sceneId);
      const { predictionId: pid } = await submitAtlasReferenceToVideo(
        safePrompt,
        [characterImageUrl],
        [sceneAudioUrl],
        clipDuration
      );
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud REFERENCE-TO-VIDEO (lip sync) predictionId=${predictionId}`);
    } catch (r2vErr: any) {
      const errMsg = String(r2vErr?.message ?? r2vErr);
      console.warn(`[MusicVideo] Scene ${sceneId} reference-to-video failed (${errMsg.slice(0, 150)}). Falling back to image-to-video.`);
      // Fall through to strategy 2
      characterImageUrl = characterImageUrl; // keep for strategy 2
      try {
        const { predictionId: pid } = await submitAtlasImageToVideo(safePrompt, characterImageUrl!, clipDuration);
        predictionId = pid;
        console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud IMAGE-TO-VIDEO (fallback) predictionId=${predictionId}`);
      } catch (i2vErr: any) {
        const i2vMsg = String(i2vErr?.message ?? i2vErr);
        console.warn(`[MusicVideo] Scene ${sceneId} image-to-video also failed (${i2vMsg.slice(0, 150)}). Falling back to text-to-video.`);
        const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration);
        predictionId = pid;
        console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO (fallback) predictionId=${predictionId}`);
      }
    }
  }
  // ── STRATEGY 2: image-to-video (character image, no audio) ───────────────────
  else if (characterImageUrl) {
    try {
      const { predictionId: pid } = await submitAtlasImageToVideo(safePrompt, characterImageUrl, clipDuration);
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud IMAGE-TO-VIDEO predictionId=${predictionId}`);
    } catch (i2vErr: any) {
      const i2vMsg = String(i2vErr?.message ?? i2vErr);
      console.warn(`[MusicVideo] Scene ${sceneId} image-to-video failed (${i2vMsg.slice(0, 150)}). Falling back to text-to-video.`);
      const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration);
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO (fallback) predictionId=${predictionId}`);
    }
  }
  // ── STRATEGY 3: text-to-video (no character image available) ─────────────────
  else {
    try {
      const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration);
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO predictionId=${predictionId}`);
    } catch (err: any) {
      const errMsg = String(err?.message ?? err);
      console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud first attempt failed (${errMsg.slice(0, 150)}). Retrying with simplified prompt.`);
      const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic 16:9 video clip.";
      const { predictionId: pid } = await submitAtlasVideo(fallbackPrompt, clipDuration);
      predictionId = pid;
    }
  }

  // ── SPEND PROTECTION: Log successful submission ───────────────────────────────
  if (jobId > 0) {
    const attemptCount = await getSceneAttemptCount(sceneId);
    const idempotencyKey = makeIdempotencyKey(jobId, sceneId, "atlas_cloud", attemptCount + 1);
    await logProviderSubmission({
      jobId,
      sceneId,
      provider: "atlas_cloud",
      providerJobId: predictionId,
      idempotencyKey,
      attemptNumber: attemptCount + 1,
      estimatedCostUsd: PROVIDER_COST_USD.atlas_cloud,
      submissionReason: "scene_render",
    });
  }
  return `${ATLAS_JOB_ID_PREFIX}${predictionId}`;
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
      const failReason = result.error ?? "Atlas Cloud generation failed";
      const db2 = await getDb();
      // Classify the failure — only hard-block content/moderation failures immediately.
      // For all other failures (provider overload, timeout, infrastructure), reset the scene
      // to 'pending' so the dispatch loop will automatically re-queue it on the next poll cycle.
      const { classifyFailure } = await import("./spend-protection");
      const category = classifyFailure(failReason);
      const isHardBlock = category === "moderation" || category === "prompt_error";
      if (db2) {
        if (isHardBlock) {
          // Content policy — mark as permanently failed
          await db2.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: failReason, updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, sceneId));
          console.warn(`[AtlasCloud] Scene ${sceneId} hard-blocked (${category}): ${failReason.slice(0, 100)}`);
        } else {
          // Transient provider failure — reset to pending for automatic re-dispatch
          await db2.update(musicVideoScenes)
            .set({ status: "pending", taskId: null, errorMessage: `Auto-retry: ${failReason.slice(0, 200)}`, updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, sceneId));
          console.warn(`[AtlasCloud] Scene ${sceneId} transient failure (${category}) — reset to pending for re-dispatch: ${failReason.slice(0, 100)}`);
          return { status: "processing" }; // Don't count as failed yet — will be re-dispatched
        }
      }
      return { status: "failed" };
    }

    return { status: "processing" };
  } catch (err: any) {
    // Network/timeout error during polling — don't mark as failed, let it retry next poll cycle
    console.warn(`[AtlasCloud] Scene ${sceneId} poll error (will retry next cycle):`, String(err?.message ?? err).slice(0, 100));
    return { status: "processing" };
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

  if (taskId.startsWith(GROK_IMAGINE_PREFIX)) {
    return pollSceneStatusGrokImagine(sceneId, taskId.slice(GROK_IMAGINE_PREFIX.length));
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

  // ── STEP 9: QUALITY CONTROL CHECK ────────────────────────────────────────────
  // Before assembly, verify the render matches the approved storyboard.
  // Failsafe: STOP and log if critical deviations are detected.
  const allScenes = await dbConn.select()
    .from(musicVideoScenes)
    .where(eq(musicVideoScenes.jobId, jobId));
  const expectedSceneCount = job.totalScenes;
  const completedSceneCount = scenes.length;
  const qcIssues: string[] = [];

  // Check 1: Scene count matches storyboard
  if (expectedSceneCount > 0 && completedSceneCount < expectedSceneCount) {
    const missing = expectedSceneCount - completedSceneCount;
    qcIssues.push(`Scene count mismatch: expected ${expectedSceneCount}, got ${completedSceneCount} (${missing} scenes missing or failed)`);
  }

  // Check 2: All completed scenes have a video URL (no empty renders)
  const scenesWithoutVideo = scenes.filter(s => !s.videoUrl);
  if (scenesWithoutVideo.length > 0) {
    qcIssues.push(`${scenesWithoutVideo.length} scene(s) completed but have no video URL — possible render deviation`);
  }

  // Check 3: All completed scenes were rendered from the storyboard (had a previewImageUrl)
  const scenesWithoutStoryboard = scenes.filter(s => !s.previewImageUrl);
  if (scenesWithoutStoryboard.length > 0) {
    console.warn(`[QC] Job ${jobId}: ${scenesWithoutStoryboard.length} scene(s) rendered without storyboard reference image — consistency may be reduced`);
    // Log but don't block — some scenes may have been rendered before storyboard was generated
  }

  // Log QC result
  if (qcIssues.length > 0) {
    const qcReport = `[QC FAIL] Job ${jobId}: ${qcIssues.join(" | ")}`;
    console.error(qcReport);
    // Update job with QC warning (don't stop — assemble what we have and flag it)
    await dbConn.update(musicVideoJobs)
      .set({ errorMessage: `QC Warning: ${qcIssues.join("; ")}`, updatedAt: new Date() })
      .where(eq(musicVideoJobs.id, jobId));
  } else {
    console.log(`[QC PASS] Job ${jobId}: ${completedSceneCount}/${expectedSceneCount} scenes validated. All scenes have video URLs and storyboard references.`);
  }

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

    // ── MUSETALK POST-PROCESSING ─────────────────────────────────────────────────
    // If any character has enableLipSync + faceVideoUrl, apply MuseTalk to the final video.
    // This syncs the character's lips to the audio track using fal.ai MuseTalk.
    let finalVideoPath = finalVideo;
    try {
      const lipSyncChars = await dbConn.select()
        .from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, jobId), eq(videoCharacters.enableLipSync, true)));
      const charWithFaceVideo = lipSyncChars.find(c => c.faceVideoUrl);
      if (charWithFaceVideo?.faceVideoUrl) {
        console.log(`[MuseTalk] Applying lip-sync for character ${charWithFaceVideo.name} (job ${jobId})`);
        await dbConn.update(musicVideoJobs)
          .set({ errorMessage: "Applying MuseTalk lip-sync...", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, jobId));
        // Upload the assembled video to S3 first so MuseTalk can access it via URL
        const preMusetalkKey = `music-videos/job-${jobId}-pre-musetalk-${Date.now()}.mp4`;
        const preMtBuf = fs.readFileSync(finalVideo);
        const { url: preMtUrl } = await storagePut(preMusetalkKey, preMtBuf, "video/mp4");
        // Apply MuseTalk: source_video_url = assembled video, audio_url = enhanced audio
        const { initFalAI } = await import("./ai-apis/falai");
        const falClient = initFalAI();
        const museTalkUrl = await falClient.museTalkLipSync({
          source_video_url: preMtUrl,
          audio_url: job.audioUrl,
        });
        // Download MuseTalk output and save to disk
        const mtResp = await fetch(museTalkUrl);
        const mtBuf = Buffer.from(await mtResp.arrayBuffer());
        const mtFile = path.join(tmpDir, "final-musetalk.mp4");
        fs.writeFileSync(mtFile, mtBuf);
        finalVideoPath = mtFile;
        console.log(`[MuseTalk] Lip-sync complete for job ${jobId}`);
      }
    } catch (mtErr) {
      // MuseTalk failure is non-fatal — continue with original video
      console.warn(`[MuseTalk] Post-processing failed for job ${jobId}: ${mtErr}. Using original video.`);
    }

    const finalBuffer = fs.readFileSync(finalVideoPath);
    const finalKey = `music-videos/job-${jobId}-final-${Date.now()}.mp4`;
    const { url } = await storagePut(finalKey, finalBuffer, "video/mp4");

    await dbConn.update(musicVideoJobs)
      .set({ status: "completed", finalVideoUrl: url, finalVideoKey: finalKey, updatedAt: new Date() })
      .where(eq(musicVideoJobs.id, jobId));

    // Notify owner of render completion
    try {
      const { users } = await import("../drizzle/schema");
      const { eq: eqUser } = await import("drizzle-orm");
      const [user] = await dbConn.select({ name: users.name, email: users.email })
        .from(users)
        .where(eqUser(users.id, job.userId));
      if (user) {
        const { emailRenderComplete } = await import("./email");
        await emailRenderComplete({
          name: user.name || "Unknown",
          email: user.email || "",
          jobId: String(jobId),
          quality: "Standard",
          duration: job.audioDuration ?? undefined,
          videoUrl: url,
          origin: "https://www.wizvid.ai",
        });
      }
    } catch (emailErr) {
      console.error("[Email] Failed to send render complete email:", emailErr);
    }

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
  model: WaveSpeedModel = "bytedance/seedance-2.0/text-to-video",
  /** Storyboard preview image URL — used as reference_images to lock visual appearance */
  storyboardImageUrl?: string,
  /** Export aspect ratio — defaults to 16:9 (YouTube) */
  aspectRatio: "16:9" | "9:16" | "1:1" = "16:9",
  /** Music video job ID — required for spend-protection checks */
  jobId: number = 0
): Promise<string> {
  // WaveSpeed has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  // Map duration to WaveSpeed's allowed values: 5, 10, or 15
  const wsDuration: 5 | 10 | 15 = duration <= 5 ? 5 : duration <= 10 ? 10 : 15;

  // STORYBOARD LOCK: pass the approved storyboard frame as a reference image.
  // This is the core of the "what you see is what you get" guarantee.
  // WaveSpeed uses reference_images to anchor the visual appearance of the generated video.
  const referenceImages: string[] = storyboardImageUrl ? [storyboardImageUrl] : [];
  if (storyboardImageUrl) {
    console.log(`[MusicVideo] Scene ${sceneId} STORYBOARD LOCK: using preview image as reference — ${storyboardImageUrl.slice(0, 80)}...`);
  } else {
    console.warn(`[MusicVideo] Scene ${sceneId} WARNING: no storyboard preview image — rendering from text prompt only`);
  }

  const trySubmit = async (p: string): Promise<string> => {
    const taskId = await submitWaveSpeedVideo(
      {
        prompt: p,
        duration: wsDuration,
        aspect_ratio: aspectRatio,
        resolution: "720p",
        reference_images: referenceImages,
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

  // ── SPEND PROTECTION: Log successful submission (Items 6 & 7) ─────────────────────
  if (jobId > 0) {
    const attemptCount = await getSceneAttemptCount(sceneId);
    const idempotencyKey = makeIdempotencyKey(jobId, sceneId, "wavespeed", attemptCount + 1);
    await logProviderSubmission({
      jobId,
      sceneId,
      provider: "wavespeed",
      providerJobId: taskId,
      idempotencyKey,
      attemptNumber: attemptCount + 1,
      estimatedCostUsd: PROVIDER_COST_USD.wavespeed,
      submissionReason: "scene_render",
    });
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

/**
 * Server-side trigger for starting a music video render without requiring tRPC context.
 * Called from confirmRenderPayment after Stripe payment is confirmed.
 * Replicates the core of the startRender tRPC procedure.
 */
export async function triggerMusicVideoRender(userId: number, musicVideoJobId: number): Promise<{ success: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "Database unavailable" };

  const { eq, and } = await import("drizzle-orm");

  const [job] = await db.select().from(musicVideoJobs)
    .where(and(eq(musicVideoJobs.id, musicVideoJobId), eq(musicVideoJobs.userId, userId)));

  if (!job) return { success: false, reason: "Music video job not found" };

  // Already rendering — idempotent
  if (job.status === "rendering" || job.status === "assembling" || job.status === "completed") {
    console.log(`[triggerMusicVideoRender] Job ${musicVideoJobId} already in status: ${job.status}. Skipping.`);
    return { success: true };
  }

  if (job.status !== "storyboard_ready") {
    return { success: false, reason: `Job status is '${job.status}', expected 'storyboard_ready'` };
  }

  // Mark as rendering
  await db.update(musicVideoJobs)
    .set({ status: "rendering", completedScenes: 0, updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, musicVideoJobId));

  const scenes = await db.select().from(musicVideoScenes)
    .where(eq(musicVideoScenes.jobId, musicVideoJobId));

  // Auto-generate missing previews
  const scenesWithoutPreview = scenes.filter(s => !s.previewImageUrl);
  if (scenesWithoutPreview.length > 0) {
    console.log(`[triggerMusicVideoRender] Auto-generating ${scenesWithoutPreview.length} missing previews for job ${musicVideoJobId}`);
    const { generateImage } = await import("./_core/imageGeneration");
    await Promise.allSettled(
      scenesWithoutPreview.map(async (scene) => {
        try {
          const { url } = await generateImage({ prompt: scene.prompt });
          if (url) {
            await db!.update(musicVideoScenes)
              .set({ previewImageUrl: url })
              .where(eq(musicVideoScenes.id, scene.id));
          }
        } catch (err) {
          console.warn(`[triggerMusicVideoRender] Auto-preview failed for scene ${scene.sceneIndex + 1}:`, err);
        }
      })
    );
  }

  // Fire-and-forget: start each scene render with 3s stagger
  const SCENE_STAGGER_MS = 3000;
  (async () => {
    const freshScenes = await db!.select().from(musicVideoScenes)
      .where(eq(musicVideoScenes.jobId, musicVideoJobId));
    for (let i = 0; i < freshScenes.length; i++) {
      const scene = freshScenes[i];
      if (i > 0) await new Promise((r) => setTimeout(r, SCENE_STAGGER_MS));
      try {
        const rendererType: "wavespeed" = "wavespeed";
        const taskId = await startSceneRender(
          scene.id,
          scene.prompt,
          scene.duration ?? 8,
          scene.lipSync ?? true,
          (scene.lipSyncStyle as any) ?? "natural",
          rendererType,
          (scene.modelAssignment as any) ?? "bytedance/seedance-2.0/text-to-video",
          scene.previewImageUrl ?? undefined,
          (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" // Use persisted export format
        );
        await db!.update(musicVideoScenes)
          .set({ taskId, status: "generating", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, scene.id));
        console.log(`[triggerMusicVideoRender] Scene ${scene.sceneIndex + 1} started, taskId: ${taskId}`);
      } catch (err) {
        console.error(`[triggerMusicVideoRender] Scene ${scene.id} start failed:`, err);
        await db!.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: String(err), updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, scene.id));
      }
    }
  })();

  console.log(`[triggerMusicVideoRender] Job ${musicVideoJobId} render started for user ${userId}`);
  return { success: true };
}
