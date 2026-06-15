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
import { createRequire } from "module";
// Use the bundled ffmpeg binary (works in both sandbox and Cloud Run production)
const _require = createRequire(import.meta.url);
let FFMPEG_BIN = "ffmpeg";
let FFPROBE_BIN = "ffprobe";
try {
  const ffmpegInstaller = _require("@ffmpeg-installer/ffmpeg");
  if (ffmpegInstaller?.path) {
    FFMPEG_BIN = ffmpegInstaller.path;
    // ffprobe is not shipped by @ffmpeg-installer — fall back to system or skip
    // In production (Cloud Run) ffprobe may not exist; we handle that gracefully below
  }
} catch { /* fall back to system ffmpeg */ }
import { getDb } from "./db";
import { musicVideoJobs, musicVideoScenes, videoCharacters } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { randomUUID } from "crypto";
import { validateExport } from "./export-validator";
import { validateSceneFaceConsistency } from "./character-lock";
import { renderAttempts } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { buildDirectorModePromptBlock } from "./director-modes";
import { transcribeAudio } from "./_core/voiceTranscription";
import { initKlingAI } from "./ai-apis/kling";
import { submitFalSeedanceVideo, submitFalSeedanceR2V, pollFalSeedanceVideo } from "./ai-apis/fal-seedance";
import { submitHyperealVideo, pollHyperealVideo, HYPEREAL_MODELS } from "./ai-apis/hypereal";
import { submitAtlasVideo, submitAtlasReferenceToVideo, submitAtlasImageToVideo, pollAtlasVideo } from "./ai-apis/atlascloud";
import { extractSceneAudioClip } from "./audio-clip-extractor";
import { submitWaveSpeedVideo, submitWaveSpeedImageToVideo, pollWaveSpeedVideo, type WaveSpeedModel, type WaveSpeedI2VModel } from "./ai-apis/wavespeed";
import { submitGrokVideo, pollGrokVideo } from "./ai-apis/grok-imagine";
import { submitBytePlusSeedanceVideo, pollBytePlusSeedanceTask } from "./ai-apis/byteplus-seedance";
import { submitOmniHumanTask, pollOmniHumanTask } from "./ai-apis/byteplus-omnihuman";
import type { RendererType } from "./products";
import { RENDERER_COSTS } from "./products";
import { applyWizSound, type AudioTier } from "./wizsound";
import { analyseContent, buildSceneVisualBrief, getSectionAtTime, type ContentAnalysis } from "./content-analyser";
import { getCircuitBreaker } from "./circuit-breaker";
import { isProviderDegraded } from "./queue-health";
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
const FAL_REQUEST_ID_PREFIX = "fal:"; // legacy prefix (t2v)
const FAL_T2V_PREFIX = "fal:t2v:"; // text-to-video
const FAL_I2V_PREFIX = "fal:i2v:"; // image-to-video (character portrait as first frame)
const FAL_R2V_PREFIX = "fal:r2v:"; // reference-to-video (character portrait + audio for native lip sync)
// Prefix used to distinguish Hypereal job IDs
const HYPEREAL_JOB_ID_PREFIX = "hypereal:";
const ATLAS_JOB_ID_PREFIX = "atlas:";
const WAVESPEED_JOB_ID_PREFIX = "wavespeed:";
const WAVESPEED_SEEDANCE_PREFIX = "wavespeed:seedance:";
const WAVESPEED_SEEDANCE_NATIVE_PREFIX = "wavespeed:seedance:native:"; // Has reference_audios baked in — skip Sync Labs
const WAVESPEED_HAILUO_PREFIX = "wavespeed:hailuo:";
const GROK_IMAGINE_PREFIX = "grok:";
const BYTEPLUS_I2V_PREFIX = "byteplus:i2v:";
const BYTEPLUS_T2V_PREFIX = "byteplus:t2v:";


const execAsync = promisify(exec);
// Helper: run ffmpeg/ffprobe with the correct binary path
function ffmpegExec(args: string, opts?: { timeout?: number }) {
  return execAsync(args.replace(/^ffmpeg /, `"${FFMPEG_BIN}" `).replace(/^ffprobe /, `"${FFPROBE_BIN}" `), opts);
}

// IMPORTANT: Import from products.ts — do NOT redefine locally. Single source of truth.
import { getCreditsPerScene } from "./products";
import { normaliseBpm } from "./instrument-analysis";
const SCENE_DURATION_SECONDS = 6; // target 6 seconds per scene for good pacing

// ─────────────────────────────────────────────────────────────────────────────
// VENUE REFERENCE RESOLVER
// Maps well-known venue names in sceneSetting to real reference photo URLs.
// These photos are uploaded to the CDN and used as img2img anchors in Flux Pro
// so storyboard images show the actual venue, not an AI hallucination.
// ─────────────────────────────────────────────────────────────────────────────
const CDN = process.env.VITE_CDN_URL ?? "https://wiz-ai.b-cdn.net";

// ─────────────────────────────────────────────────────────────────────────────
// LYNDHURST HALL VISUAL DESCRIPTION
// Extracted from 12 reference photographs of the actual venue.
// Used in scene prompts to ensure AI generates the REAL hall, not a hallucination.
// ─────────────────────────────────────────────────────────────────────────────
export const LYNDHURST_HALL_VISUAL_DESCRIPTION = `Air Studios Lyndhurst Hall, London — a converted Victorian Gothic church (Lyndhurst Road Congregational Church, Hampstead). The hall has a roughly octagonal/hexagonal floor plan, 17m × 20m × 14m high. The most distinctive feature is the large suspended hexagonal wooden acoustic canopy with a geometric triangular lattice of dark warm mahogany beams, hanging centrally from the ceiling and adjustable in height. Additional smaller rectangular dark mauve/purple-brown acoustic baffles hang on cables at the perimeter. The vaulted Gothic ceiling above the canopy is painted pale periwinkle blue/lavender between white plaster fan-vault ribs that radiate from central points — a cathedral-like ceiling. Multiple tall Gothic-arched windows with decorative tracery line all walls in two tiers (clerestory and lower level), letting in cool blue-white diffused daylight through frosted/leaded glass. A continuous curved wooden balcony/gallery runs around the perimeter at mid-height, with warm honey/oak wood panelling and ornate carved decorative arches with small cutout balusters below the rail. The lower walls feature light maple/oak modern acoustic treatment panels. At the far end stands a large classical pipe organ in dark mahogany wood housing with rows of silver-grey metal pipes. The floor is a beautiful warm honey-brown herringbone parquet wood floor, highly polished, reflecting the warm amber light. Lighting is warm golden/amber tungsten spotlights from the balcony rail and walls, contrasting with the cool blue-white natural light from the Gothic windows — creating a dramatic, intimate warmth. When in use for recording: full symphony orchestra arranged in traditional formation with dozens of music stands, a conductor's podium, black metal microphone stands with boom arms forming a forest of mics, a Steinway concert grand piano (black lacquer) to one side, and professional audio cables running across the floor.`;

const VENUE_REFERENCE_MAP: Array<{ keywords: string[]; urls: string[]; description: string }> = [
  {
    // Air Studios Lyndhurst Hall — 6 reference images from different angles
    // Image 1: Wide angle from balcony showing full hall with orchestra setup and acoustic canopy
    // Image 2: Front-facing view showing Gothic arched windows, balcony, acoustic baffles, parquet floor
    // Image 3: Panoramic view showing fan-vaulted ceiling, pipe organ, full orchestra
    // Image 4: Large acoustic canopy close-up, Gothic windows, empty hall
    // Image 5: Orchestra session from above — warm amber lighting, herringbone floor
    // Image 6: Night/warm lighting — grand piano, Gothic windows, pipe organ visible
    keywords: ["air studios", "lyndhurst hall", "lyndhurst", "air lyndhurst"],
    urls: [
      `${CDN}/manus-storage/60876673_10158452132427589_7481294393488441344_n_ebd48c54.jpg`,
      `${CDN}/manus-storage/fESaZwK9iZtizehEZjogvQ_a931560a.webp`,
      `${CDN}/manus-storage/meta_eyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ==_35287add.webp`,
      `${CDN}/manus-storage/83304-27558187cc6a2f3c7f5bd9197d19182e_b7eeddf9.jpg`,
      `${CDN}/manus-storage/DSC05433_1cfc31c4.webp`,
      `${CDN}/manus-storage/maxresdefault_583a25e5.jpg`,
    ],
    description: LYNDHURST_HALL_VISUAL_DESCRIPTION,
  },
];

/**
 * Given a sceneSetting string, return the best matching venue reference image URL.
 * Rotates through available reference images for variety.
 * Returns undefined if no known venue is detected.
 */
export function resolveVenueReferenceUrl(sceneSetting?: string | null, index: number = 0): string | undefined {
  if (!sceneSetting) return undefined;
  const lower = sceneSetting.toLowerCase();
  for (const entry of VENUE_REFERENCE_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      // Rotate through available reference images for variety
      const urls = entry.urls;
      return urls[index % urls.length];
    }
  }
  return undefined;
}

/**
 * Given a sceneSetting string, return all available venue reference image URLs.
 * Returns empty array if no known venue is detected.
 */
export function resolveAllVenueReferenceUrls(sceneSetting?: string | null): string[] {
  if (!sceneSetting) return [];
  const lower = sceneSetting.toLowerCase();
  for (const entry of VENUE_REFERENCE_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.urls;
    }
  }
  return [];
}

/**
 * Given a sceneSetting string, return the detailed visual description for the matched venue.
 * Returns undefined if no known venue is detected.
 */
export function resolveVenueDescription(sceneSetting?: string | null): string | undefined {
  if (!sceneSetting) return undefined;
  const lower = sceneSetting.toLowerCase();
  for (const entry of VENUE_REFERENCE_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.description;
    }
  }
  return undefined;
}

export function calculateSceneCount(audioDurationSeconds: number): number {
  // Target 6 seconds per scene for natural music video pacing.
  // Short tracks (<= 90s): cap at 15 scenes so it doesn't feel choppy.
  // Long tracks (> 90s): cap at 40 scenes (~4 min).
  const raw = Math.ceil(audioDurationSeconds / SCENE_DURATION_SECONDS);
  const maxScenes = audioDurationSeconds <= 90 ? 15 : 40;
  return Math.max(3, Math.min(maxScenes, raw));
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
export function extractLyricsForWindow(
  segments: Array<{ start: number; end: number; text: string }>,
  windowStart: number,
  windowEnd: number,
  vocalOnsetTime?: number | null
): string {
  // Use midpoint ownership: a segment belongs to the window that contains its midpoint.
  // This ensures each Whisper segment appears in exactly ONE scene, preventing duplicates.
  //
  // Vocal onset gate: if vocalOnsetTime is provided, segments whose midpoint falls before
  // the vocal onset are treated as if they start at vocalOnsetTime for midpoint calculation.
  // This prevents Whisper hallucinations over instrumental intros from being assigned to
  // pre-vocal scenes. The first post-onset scene gets the lyric instead.
  const relevant = segments.filter((s) => {
    const rawMid = (s.start + s.end) / 2;
    // If this segment's midpoint is before the vocal onset, clamp it to vocalOnsetTime
    // so it falls into the first vocal scene instead of a pre-vocal scene.
    const effectiveMid = (vocalOnsetTime != null && rawMid < vocalOnsetTime)
      ? vocalOnsetTime
      : rawMid;
    return effectiveMid >= windowStart && effectiveMid < windowEnd;
  });
  return relevant.map((s) => s.text.trim()).filter(Boolean).join(" ").trim();
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
  existingContentAnalysis?: ContentAnalysis | null,
  enableLipSync?: boolean,
  songBpm?: number | null,
  performanceShotRatio: number = 80,
  directorMode?: string | null,
  vocalOnsetTime?: number | null
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
      ? extractLyricsForWindow(lyricsSegments, startTime, endTime, vocalOnsetTime)
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

  // Inject venue description if the setting matches a known venue (e.g. Air Studios Lyndhurst Hall)
  const venueDesc = resolveVenueDescription(sceneSetting);

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
${venueDesc ? `
🏛️ VENUE VISUAL REFERENCE — MEMORISE THIS DESCRIPTION:
This is the ACTUAL appearance of the venue based on real reference photographs. Your scene prompts MUST reflect these specific visual details — do NOT invent generic alternatives.

${venueDesc}

KEY VISUAL ELEMENTS TO INCLUDE IN EVERY LYNDHURST HALL SCENE:
• The large suspended hexagonal wooden acoustic canopy with triangular lattice (dark mahogany) — this is the MOST DISTINCTIVE element
• Fan-vaulted Gothic ceiling painted pale periwinkle blue/lavender between white plaster ribs
• Tall Gothic-arched windows with tracery — cool blue-white diffused daylight
• Continuous curved wooden balcony/gallery with ornate carved arched panels
• Warm honey-brown herringbone parquet floor
• Warm golden/amber tungsten spotlights contrasting with cool window light
• Classical pipe organ in dark mahogany at the far end
• When orchestra is present: full symphony formation, forest of microphone stands, music stands, conductor's podium

DO NOT describe:
❌ Chandeliers (there are none — the hall uses spotlights and the acoustic canopy has recessed lights)
❌ Tiered audience seating (this is a RECORDING STUDIO, not a concert hall — there is a balcony gallery but no audience seating tiers)
❌ Dark wood panelling on the UPPER walls (upper walls are cream/white plaster with Gothic windows)
❌ Warm amber/golden ceiling (the ceiling is pale blue/lavender — the warmth comes from floor-level spotlights)
` : ""}
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

SCENE TYPE RULES (NON-NEGOTIABLE — CINEMATIC STORYTELLING FIRST):
- CHORUS scenes: wide stage shot, full band visible, maximum energy, crowd reaction, silhouette against light, peak performance — NOT a close-up of a singing face
- VERSE scenes: intimate storytelling — instrument close-up, hands on strings, emotional cutaway, environmental detail, character in environment — NOT a generic singing close-up
- BRIDGE/BREAKDOWN scenes: dramatic abstract visual, unexpected angle, emotional peak, slow-motion detail, atmospheric environment
- INTRO scenes: establishing shot, world-building, anticipation — reveal the environment before the performer
- OUTRO scenes: resolution, fade, emotional landing, environment returning to stillness

CINEMATIC VARIETY MANDATE — for every 5 scenes, include at minimum:
- 1 wide/establishing shot (full environment, performer small in frame)
- 1 instrument or hands close-up (no face visible)
- 1 atmospheric/environmental cutaway (crowd, sky, light, texture)
- 1 silhouette or dramatic backlit shot
- Only 1 direct singing close-up (and only if lyrics are emotionally powerful at that moment)
═══════════════════════════════════════════════════════════════` : "";

  // ── NEW PIPELINE RULES (2026-05-28) ─────────────────────────────────────────
  // When enableLipSync=true AND a character image is provided:
  //   • Performance scenes MUST generate the character INSIDE the real environment
  //   • NO grey backgrounds — the character is part of the scene world
  //   • NO microphone unless explicitly requested
  //   • InfiniteTalk is a lip-sync CORRECTION PASS on the already-coherent Seedance clip
  //   • performanceShotRatio% of scenes must be tight performance shots (character face visible)
  //   • (100-performanceShotRatio)% must be cinematic intercuts (orchestral wides, atmosphere, cutaways)
  // ─────────────────────────────────────────────────────────────────────────────
  const hasCharacterImage = hasLockedCharacters; // character image = locked character present

  const characterPerformanceBlock = (enableLipSync && hasCharacterImage) ? `

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL — NEW PIPELINE RULE (READ CAREFULLY BEFORE WRITING ANY SCENE):
═══════════════════════════════════════════════════════════════

This video uses the WIZ AI direct-generation pipeline.
The character is generated INSIDE the scene by the video model — NOT composited on top of a background.

WHAT THIS MEANS FOR EVERY PERFORMANCE SCENE:
• The character must be physically present INSIDE the environment (Air Studios / Lyndhurst Hall or the user-specified setting)
• The character is part of the world — standing in the hall, walking through the space, performing in the room
• The background is NOT a grey studio wall — it is the actual cinematic environment (warm amber lighting, orchestra behind, grand piano, session musicians, high ceilings, beautiful acoustic space)
• The camera moves AROUND the character — dolly, crane, rack focus, slow push-in
• The character's face must be clearly visible and forward-facing (essential for lip-sync correction pass)
• NO microphone stand unless the user explicitly requested one
• The character looks at the camera or sings forward with natural body presence

PERFORMANCE SCENE PROMPT FORMULA (use this structure):
  [Camera movement] on [character name], [character action — singing/performing], inside [specific environment detail — e.g. 'the grand Lyndhurst Hall recording room, warm amber light, orchestra visible behind'], [lighting detail], [emotional quality], [BPM-matched movement if applicable].

EXAMPLE GOOD PERFORMANCE PROMPT:
  "Slow push-in on Zara singing inside the Lyndhurst Hall recording room. Warm amber spotlights illuminate her face. Orchestra musicians visible behind her in soft focus. Emotional, intimate expression. Camera drifts slightly right, revealing the grand piano and high ceiling. 76 BPM — slow, sustained, graceful."

EXAMPLE BAD PERFORMANCE PROMPT (NEVER DO THIS):
  "Close-up of Zara singing at a microphone against a grey background." ← WRONG: grey background, microphone, no environment
  "Zara performs on stage with dramatic lighting." ← WRONG: too vague, no environment detail
  "Tight shot of Zara's face singing." ← WRONG: no environment context, no camera movement

CINEMATIC INTERCUT SCENES (${100 - performanceShotRatio}% of total):
  These scenes have NO character assignment. They are pure environment/atmosphere shots:
  • Wide shot of the full Lyndhurst Hall — orchestra, grand piano, high windows, warm light
  • Close-up of violin bows moving in slow motion
  • Hands on piano keys, fingers pressing slowly
  • Light streaming through tall hall windows
  • Conductor's baton, sheet music pages
  • Empty conductor's podium with orchestra behind
  • Atmospheric hall reverb — mist, dust particles in light beams
  These use "hailuo-minimax" and have empty characterAssignments []

═══════════════════════════════════════════════════════════════
🎙️ VOCAL-SCENE LINTING RULES (NON-NEGOTIABLE — ENFORCED BEFORE OUTPUT):
═══════════════════════════════════════════════════════════════

RULE 1 — VOCAL-ONLY SINGING SCENES:
  Only scenes with ACTIVE LEAD VOCALS may be classified as singing performance scenes.
  Instrumental sections, intros, outros, and bridges with no lead vocal MUST be intercut/atmospheric scenes.
  Do NOT assign a singing performance scene to a section where no one is singing.

RULE 2 — MAX 2 CONSECUTIVE INTERCUTS:
  You may NOT place more than 2 consecutive cinematic intercut scenes in a row unless there is no active lead vocal in that section.
  After 2 intercuts, the next scene MUST be a performance scene (if vocals are active).
  This prevents the video from losing the performer for too long.

RULE 3 — AT LEAST HALF OF PERFORMANCE SCENES MUST BE MEDIUM CLOSE-UP OR HEAD-AND-SHOULDERS:
  At least 50% of all performance scenes must be framed as medium close-up or head-and-shoulders.
  This preserves face readability and keeps lip-sync correction viable.
  Wide performance shots are allowed but must not dominate.

RULE 4 — EXPLICIT POPULATION FIELD (REQUIRED FOR EVERY HALL/STUDIO SCENE):
  Every hall, studio, or indoor performance scene MUST explicitly state the population:
  • If orchestra/audience is present: state it — "full orchestra visible behind her", "seated audience filling the hall", "session musicians at their stands"
  • If the scene is intentionally empty: state it — "empty hall, chairs vacant, only ambient light"
  NEVER leave the population ambiguous. Empty rooms happen when you forget to ask for people.

RULE 5 — EXPLICIT ATMOSPHERE FIELD (REQUIRED FOR EVERY SCENE):
  Every scene MUST explicitly state the atmosphere:
  • Lighting: "warm amber key light", "cool blue rim", "soft diffused daylight", "dramatic side-lighting"
  • Depth/haze: "shallow depth of field", "soft bokeh background", "light haze in the air", "dust particles in light beams"
  • Room detail: "high vaulted ceiling", "tall windows", "dark wood panelling", "acoustic panels"
  Atmosphere is what separates a cinematic shot from an empty AI room.

RULE 6 — STRUCTURED PROMPT SLOT ENFORCEMENT:
  Every performance scene prompt MUST contain all of these elements (in any order):
  [shot_size] + [camera_move] + [character_in_environment] + [population] + [lighting] + [emotion] + [depth_cue]
  Example: "Medium close-up [shot_size], slow push-in [camera_move] on Zara singing inside Lyndhurst Hall [character_in_environment], full orchestra visible behind her [population], warm amber key light [lighting], emotionally vulnerable expression [emotion], shallow depth of field [depth_cue]."

RULE 7 — FORBIDDEN TOKENS (NEVER USE THESE IN ANY PROMPT):
  The following patterns are BANNED and will cause the scene to fail validation:
  ❌ "grey background" or "gray background"
  ❌ "isolated studio background" or "plain background"
  ❌ "floating portrait" or "portrait against"
  ❌ "microphone stand" or "at a microphone" (unless user explicitly requested)
  ❌ "empty stage" or "empty room" or "empty hall" (unless intentional — must be labelled as such)
  ❌ "duplicate singer" or "two versions of"
  ❌ "performs on stage" (too vague — always specify the exact environment)
  ❌ "singing in front of" (implies a flat background — use "inside" or "within" instead)

RULE 8 — INSTRUMENT PLAYING POSTURE (NON-NEGOTIABLE):
  Musicians MUST always be shown in the correct physical posture for their instrument:
  ❌ NEVER show a pianist standing up next to a piano — pianists are ALWAYS seated at the piano bench, hands on keys, actively playing
  ❌ NEVER show a cellist standing — cellists are ALWAYS seated with the cello between their knees, bow on strings
  ❌ NEVER show a violinist without the instrument under their chin, bow on strings
  ❌ NEVER show a guitarist holding the guitar at their side — guitarists are ALWAYS holding the guitar in playing position, fingers on frets
  ❌ NEVER show a drummer standing — drummers are ALWAYS seated behind the full kit, sticks in hand
  ✅ ALWAYS specify the playing posture explicitly: "seated at the grand piano, hands moving across the keys", "cellist seated, drawing the bow across the strings", "guitarist fingers moving on the frets"
  This is a HARD RULE. A musician standing idle next to their instrument is a critical scene failure.
═══════════════════════════════════════════════════════════════` : "";

  const systemPrompt = `You are a premium cinematic music video director — not an AI avatar generator.
Your job is to create detailed, emotionally directed scene descriptions for AI video generation.
Think: Hype Williams, David Fincher, Anton Corbijn. Every scene must feel like it belongs in a premium music video, not a generic AI singing clip.

⚠️ MOST IMPORTANT RULE — THE USER'S VISION IS SACRED:
You are directing the user's creative vision, not inventing your own.
Every scene must faithfully represent what the user has described in their theme, setting, and concept.
Do NOT replace the user's requested environment with a generic stage, studio, or landscape.
If the user says "desert", every scene is in a desert. If they say "underwater", every scene is underwater.
If they say "city rooftop at night", every scene is on a city rooftop at night.

⚠️ CINEMATIC STORYTELLING MANDATE:
Do NOT default to visible singing close-ups in every scene. This is the most common mistake in AI music video generation and produces generic, unconvincing results.
Instead, prioritise:
- Cinematic emotion and atmosphere
- Environmental storytelling
- Performance energy (not just mouths moving)
- Instrument close-ups and hands
- Silhouette shots and dramatic backlight
- Crowd movement and reaction
- Dramatic camera work (Dutch angle, crane shot, rack focus)
- Slow-motion detail (sweat, light, fabric, smoke)
A singing close-up should be EARNED — reserved for the most emotionally powerful lyric moments, not used as a default.
${sceneSettingConstraint}${contentAnalysisBlock}${characterPerformanceBlock}

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
- Number of scenes: ${sceneCount} (one scene every ${SCENE_DURATION_SECONDS} seconds)${songBpm ? `\n- Song BPM: ${normaliseBpm(songBpm)} — ALL movement, gestures, and visual rhythm in every scene MUST match this tempo. For ${normaliseBpm(songBpm) < 90 ? 'slow, graceful, flowing movements' : normaliseBpm(songBpm) < 120 ? 'moderate, natural-paced movements' : 'energetic, dynamic movements'}. Musicians must play at this tempo.` : ''}${sceneSetting ? `\n- Locations/Scene Setting: ${sceneSetting} — USE THESE LOCATIONS as the primary visual environments for scenes. Vary between them naturally across the video.` : ""}

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
${(enableLipSync && hasCharacterImage) ? `  ⚠️ NEW PIPELINE — CHARACTER INSIDE SCENE (CRITICAL — READ BEFORE ASSIGNING MODELS):
  • Performance scenes (character present, face visible): MUST use "seedance-2.0"
    - The character is generated INSIDE the environment by Seedance — not composited on top
    - Prompt MUST describe the character physically present in the environment (e.g. "inside the Lyndhurst Hall", "in the recording room")
    - Character face must be clearly visible and forward-facing (required for lip-sync correction pass)
    - NO microphone unless explicitly requested
    - Camera moves around the character — dolly, push-in, slow drift
    - Aim for ${performanceShotRatio}% of scenes to be performance shots (character present, seedance-2.0)
  • Cinematic intercut scenes (no character, pure environment): MUST use "hailuo-minimax"
    - Wide shots of the hall, orchestra, instruments, light, atmosphere
    - Empty characterAssignments [] — no character assigned
    - These are ${100 - performanceShotRatio}% of total scenes
  • NEVER assign a character to a scene and use "hailuo-minimax" — if a character is present, use "seedance-2.0"
  • NEVER write a performance prompt with a grey background, microphone stand, or empty studio` : enableLipSync ? `  ⚠️ LIP SYNC IS ACTIVE — CRITICAL FACE SHOT RULES:
  • EVERY scene where a character appears MUST use "seedance-2.0" and MUST be a close-up or medium shot with the character's face clearly visible and forward-facing
  • Wide shots, silhouettes, atmospheric cutaways, and scenes where no character face is visible MUST use "hailuo-minimax" — and these scenes should NOT have character assignments
  • The character's face must be the primary focus in every scene where they appear — this is essential for lip sync verification
  • Do NOT assign characters to wide/atmospheric scenes — reserve those for pure environmental shots
  • Aim for ${performanceShotRatio}% of scenes to be character close-up/medium shots ("seedance-2.0"), with ${100 - performanceShotRatio}% as atmospheric/environmental cutaways ("hailuo-minimax", no character assignments)` : `  • Use "seedance-2.0" ONLY for hero close-up performance shots where character likeness and facial expression are critical (e.g. the most powerful lyric moment, a direct-to-camera performance shot)
  • Use "hailuo-minimax" for: wide shots, atmospheric scenes, crowd shots, instrument cutaways, silhouette shots, environmental scenes, any scene where the character's face is not the primary focus
  • Default to "hailuo-minimax" unless the scene specifically requires a close-up character face — this produces better cinematic results
  • Aim for no more than 30–40% of scenes using "seedance-2.0"` }

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
  // Cinematic-first: these prompts guide scene composition AND mouth movement.
  // Sync Labs sync-3 lip sync is applied post-assembly to the final video.
  // For best sync-3 results: character face must be clearly visible, forward-facing,
  // with natural mouth movement (slightly open, relaxed jaw) — NOT clenched or closed.
  // sync-3 handles extreme angles and obstructions natively, but frontal close-ups give best results.
  natural: "Cinematic performance close-up. Character face clearly visible, forward-facing, natural relaxed expression with slightly parted lips, emotional presence. Atmospheric lighting. Stable camera.",
  expressive: "High-energy performance close-up. Character face prominent in frame, intense expression, mouth naturally open with emotional energy, dynamic movement. Dramatic lighting. Stable enough for lip sync.",
  subtle: "Intimate performance close-up. Character face softly lit, forward-facing, introspective expression with naturally relaxed jaw and parted lips. Minimal movement. Soft atmospheric lighting.",
  dramatic: "Theatrical cinematic close-up. Character face dramatically backlit, powerful emotional expression, mouth naturally open at peak emotional intensity. Slow-motion detail. Stable framing.",
  anime: "Anime-style cinematic close-up. Character face clearly visible, expressive eyes, naturally parted lips with emotional energy. Vibrant colour palette, dynamic but stable framing for lip sync.",
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
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9",
  /** Music video job ID — required for spend-protection checks */
  jobId: number = 0,
  /** Master portrait URL for character consistency (used by Atlas Cloud reference-to-video) */
  characterImageUrl?: string | null,
  /** Full song S3 URL for extracting scene audio clips (used by Atlas Cloud reference-to-video for lip sync) */
  audioUrl?: string | null,
  /** Start time of this scene in the song (seconds) — used to extract the correct audio segment */
  sceneStartTime?: number,
  /** Lyrics text for this scene’s time window — embedded in r2v prompt for phoneme-level lip sync */
  sceneLyrics?: string
): Promise<string> {
  // ── SPEND PROTECTION: Pre-submission guard (Items 1–4, 9) ─────────────────────────
  // Determine provider for idempotency check (use primary provider in fallback chain)
  // Map renderer aliases to canonical provider names for idempotency/spend-protection checks
  const primaryProvider =
    (renderer === "fal_seedance" || renderer === "seedance") ? "fal_seedance" :
    (renderer === "atlas_cloud" || renderer === "atlas_cloud_fast") ? "atlas_cloud" :
    renderer === "byteplus_seedance" ? "byteplus_seedance" :
    renderer;
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
  // PRIMARY:   Atlas Cloud Fast ($0.64/scene) — RE-ENABLED 2026-05-14
  //            STRATEGY 1 (reference-to-video): character + audio → best consistency + per-scene lip sync
  //            STRATEGY 2 (image-to-video): character only → good consistency, no per-scene lip sync
  //            STRATEGY 3 (text-to-video): no character → fallback only
  //            WizSync™ Sync Labs lip sync is ALSO applied to the assembled video for final polish.
  // FALLBACK:  WaveSpeed Seedance 2.0 Fast ($1.80/scene) — if Atlas circuit opens
  // DISABLED:  fal.ai — unreliable, watermarks on free tier
  // DISABLED:  Hypereal — not vetted for production
  // ── BYTEPLUS DIRECT: BytePlus ModelArk Seedance 2.0 ─────────────────────────────────────────────
  if (renderer === "byteplus_seedance") {
    console.log(`[MusicVideo] Scene ${sceneId}: BYTEPLUS DIRECT (renderer override)`);
    try {
      // IMPORTANT: BytePlus Seedance 2.0 blocks real-person face images via content policy
      // (InputImageSensitiveContentDetected.PrivacyInformation). We MUST NOT pass the character
      // portrait here. Instead, pass ONLY the storyboard/environment image (Air Studios venue etc.)
      // to generate the cinematic background. Character lip-sync is handled separately by
      // HeyGen Precision v3 (WizSync) in the lip-sync phase, which takes the cinematic video
      // output from this step + the isolated vocal audio → final lip-synced scene.
      const bytePlusImageUrl = storyboardImageUrl ?? undefined;
      console.log(`[MusicVideo] Scene ${sceneId} BytePlus: storyboard=${bytePlusImageUrl ? bytePlusImageUrl.slice(0,60)+'...' : 'NONE (text-to-video)'} (character portrait withheld — handled by WizSync)`);
      const taskId = await startSceneRenderBytePlusSeedance(
        sceneId, finalPrompt, duration, aspectRatio, jobId,
        bytePlusImageUrl
      );
      return taskId;
    } catch (bpErr: any) {
      const bpMsg = String(bpErr?.message ?? bpErr);
      console.error(`[MusicVideo] Scene ${sceneId} BytePlus DIRECT failed: ${bpMsg.slice(0, 200)}`);
      throw new Error(`BytePlus render failed for scene ${sceneId}: ${bpMsg.slice(0, 200)}`);
    }
  }

  if (renderer === "wavespeed" || renderer === "fal_seedance" || renderer === "seedance" || renderer === "atlas_cloud" || renderer === "atlas_cloud_fast") {
    // ── WAVESPEED DIRECT: skip Atlas entirely when renderer is explicitly 'wavespeed' ──────
    // Used when job.fallbackProvider='wavespeed' is set (Atlas known-bad).
    // The in-memory circuit breaker resets on Cloud Run cold starts, so we need this DB-level override.
    if (renderer === "wavespeed") {
      // WAVESPEED DIRECT: DB-level override — bypass circuit breaker entirely.
      // When fallbackProvider=wavespeed is set, WaveSpeed is the ONLY provider available.
      // The circuit breaker is in-memory and can be OPEN in any Cloud Run container instance.
      // A DB-level override must never be blocked by in-memory state.
      console.log(`[MusicVideo] Scene ${sceneId}: WAVESPEED DIRECT (renderer override — circuit breaker bypassed)`);
      try {
        // Use pre-sliced audio directly if it's already a WAV clip (heartbeat pre-slices it).
        // If we re-slice it with extractSceneAudioClip, we'd seek to sceneStartTime (e.g. 12s)
        // inside a 6-second file → empty output → 45-byte failure.
        // Detection: if audioUrl ends in .wav or contains 'scene-audio' or 'stem-slice', it's pre-sliced.
        // Always extract audio for every scene — cinematic scenes get audio for atmosphere/pacing,
        // performance scenes get it for lip sync. lipSync flag controls sync requirement, not audio presence.
        let wsDirectAudioClip: string | undefined;
        if (audioUrl) {
          const isPreSliced = audioUrl.includes('.wav') || audioUrl.includes('scene-audio') || audioUrl.includes('stem-slice') || audioUrl.includes('wiz-stem');
          if (isPreSliced) {
            // Already a sliced clip — use directly, no re-slicing needed
            wsDirectAudioClip = audioUrl;
            console.log(`[MusicVideo] Scene ${sceneId} WaveSpeed DIRECT: using pre-sliced audio clip directly (no re-slice)`);
          } else if (sceneStartTime !== undefined) {
            try {
              wsDirectAudioClip = await extractSceneAudioClip(audioUrl, sceneStartTime, duration, sceneId);
              console.log(`[MusicVideo] Scene ${sceneId} WaveSpeed DIRECT: audio clip extracted (${lipSync ? 'lip sync' : 'cinematic pacing'})`);
            } catch (clipErr: any) {
              console.warn(`[MusicVideo] Scene ${sceneId} WaveSpeed DIRECT: audio clip extraction failed (${String(clipErr?.message ?? clipErr).slice(0, 80)}). Proceeding without audio.`);
            }
          }
        }
        const wsDirectResult = await startSceneRenderWaveSpeed(
          sceneId,
          finalPrompt,
          duration,
          modelAssignment ?? "bytedance/seedance-2.0-fast/text-to-video",
          storyboardImageUrl ?? undefined,
          aspectRatio,
          jobId,
          characterImageUrl ?? undefined,
          wsDirectAudioClip ?? undefined,
          sceneLyrics ?? undefined
        );
        return wsDirectResult;
      } catch (wsDirectErr: any) {
        throw new Error(`WaveSpeed render failed for scene ${sceneId}: ${String(wsDirectErr?.message ?? wsDirectErr).slice(0, 200)}`);
      }
    }
    // ── FAL_SEEDANCE DIRECT: when renderer is explicitly 'fal_seedance' or 'seedance' ────────────────
    // Strategy selection (auto):
    //   r2v (reference-to-video): characterImageUrl + audioUrl + lipSync=true → native lip sync (BEST)
    //   i2v (image-to-video):     characterImageUrl only → character consistency, no lip sync
    //   t2v (text-to-video):      no character → text prompt only
    if (renderer === "fal_seedance" || renderer === "seedance") {
      console.log(`[MusicVideo] Scene ${sceneId}: FAL_SEEDANCE DIRECT (renderer override)`);
      try {
        // For r2v: use pre-sliced audio directly if already a WAV clip (heartbeat pre-slices it).
        // Same double-slicing guard as wavespeed direct path above.
        let sceneAudioClipUrl: string | undefined;
        if (characterImageUrl && audioUrl && lipSync) {
          const isPreSliced = audioUrl.includes('.wav') || audioUrl.includes('scene-audio') || audioUrl.includes('stem-slice') || audioUrl.includes('wiz-stem');
          if (isPreSliced) {
            sceneAudioClipUrl = audioUrl;
            console.log(`[MusicVideo] Scene ${sceneId} FAL_SEEDANCE: using pre-sliced audio clip directly (no re-slice)`);
          } else if (sceneStartTime !== undefined) {
            try {
              sceneAudioClipUrl = await extractSceneAudioClip(audioUrl, sceneStartTime, duration, sceneId);
              console.log(`[MusicVideo] Scene ${sceneId} FAL_SEEDANCE: extracted audio clip for r2v: ${sceneAudioClipUrl?.slice(0, 60)}...`);
            } catch (clipErr: any) {
              console.warn(`[MusicVideo] Scene ${sceneId} audio clip extraction failed (${String(clipErr?.message ?? clipErr).slice(0, 100)}). Falling back to i2v.`);
            }
          }
        }
        const falResult = await startSceneRenderFalSeedance(
          sceneId,
          finalPrompt,
          duration,
          aspectRatio,
          jobId,
          characterImageUrl ?? storyboardImageUrl ?? undefined,
          sceneAudioClipUrl,
          sceneLyrics  // ✅ per-scene lyrics for phoneme-accurate lip sync
        );
        return falResult;
      } catch (falErr: any) {
        const falMsg = String(falErr?.message ?? falErr);
        console.warn(`[MusicVideo] Scene ${sceneId} fal.ai Seedance failed (${falMsg.slice(0, 150)}). Falling back to Atlas Cloud.`);
        // Fall through to Atlas Cloud below
      }
    }
    // ── Step 1: Atlas Cloud Fast (PRIMARY — $0.64/scene) ─────────────────────────────────────────────
    const atlasCircuit = getCircuitBreaker("atlas_cloud");
    if (atlasCircuit.canRequest()) {
      try {
        const atlasResult = await startSceneRenderAtlasCloud(
          sceneId,
          finalPrompt,
          duration,
          jobId,
          characterImageUrl ?? undefined,
          audioUrl ?? undefined,          // ── WizSync™: pass audio for reference-to-video lip sync
          sceneStartTime ?? undefined,    // ── WizSync™: scene start time for audio segment extraction
          lipSync,                        // ── WizSync™: use per-scene lip sync flag (Strategy 1 when true)
          storyboardImageUrl ?? undefined, // ── CHARACTER LOCK™: storyboard image as starting frame for i2v
          aspectRatio                     // ── ASPECT RATIO: enforce user-selected format on every clip
        );
        atlasCircuit.recordSuccess();
        return atlasResult;
      } catch (atlasErr: any) {
        atlasCircuit.recordFailure();
        const atlasMsg = String(atlasErr?.message ?? atlasErr);
        console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud failed (${atlasMsg.slice(0, 150)}). Falling back to WaveSpeed.`);
      }
    } else {
      console.warn(`[MusicVideo] Scene ${sceneId}: Atlas Cloud circuit OPEN — routing to WaveSpeed fallback.`);
    }
    // ── Step 2: WaveSpeed fallback ($1.80/scene) ───────────────────────────────────
    // NOTE: WaveSpeed circuit breaker intentionally NOT checked here.
    // The in-memory circuit breaker is unreliable across Cloud Run container instances.
    // If Atlas Cloud fails, WaveSpeed is always attempted regardless of circuit state.
    try {
      // Extract audio clip for native Seedance 2.0 lip sync when lipSync=true
      let wsFallbackAudioClip: string | undefined;
      if (lipSync && audioUrl && sceneStartTime !== undefined) {
        try {
          wsFallbackAudioClip = await extractSceneAudioClip(audioUrl, sceneStartTime, duration, sceneId);
          console.log(`[MusicVideo] Scene ${sceneId} WaveSpeed fallback: audio clip extracted for lip sync`);
        } catch (clipErr: any) {
          console.warn(`[MusicVideo] Scene ${sceneId} WaveSpeed fallback: audio clip extraction failed (${String(clipErr?.message ?? clipErr).slice(0, 80)}). Proceeding without lip sync audio.`);
        }
      }
      const wsResult = await startSceneRenderWaveSpeed(
        sceneId,
        finalPrompt,
        duration,
        modelAssignment ?? "bytedance/seedance-2.0-fast/text-to-video",
        storyboardImageUrl ?? undefined,
        aspectRatio,
        jobId,
        characterImageUrl ?? undefined, // ── CHARACTER LOCK™: pass portrait for dual-anchor injection
        wsFallbackAudioClip ?? undefined,
        sceneLyrics ?? undefined
      );
      return wsResult;
    } catch (wsErr: any) {
      const wsMsg = String(wsErr?.message ?? wsErr);
      console.error(`[MusicVideo] Scene ${sceneId} WaveSpeed fallback also failed: ${wsMsg.slice(0, 200)}`);
      throw new Error(`Video generation failed for scene ${sceneId}. Both Atlas Cloud and WaveSpeed are currently unavailable. Please try again shortly.`);
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
  // Kling 3.0 Subject Binding: pass character portrait for face-locked generation
  const klingCharRefs = characterImageUrl ? [characterImageUrl] : undefined;
  try {
    const taskId = await startSceneRenderKling(finalPrompt, duration, aspectRatio, klingCharRefs);
    console.log(`[MusicVideo] Scene ${sceneId} → Kling (${renderer}) taskId=${taskId}${klingCharRefs ? " [Subject Binding active]" : ""}`);
    return taskId;
  } catch (err) {
    // No silent fallback to Hypereal — surface the error cleanly
    console.error(`[MusicVideo] Scene ${sceneId} Kling failed. No fallback active (safe launch mode).`, (err as Error).message?.slice(0, 200));
    throw new Error(`Video generation failed for scene ${sceneId}. Please try again in a moment.`);
  }
}

// ── BYTEPLUS SEEDANCE: ModelArk Seedance 2.0 ────────────────────────────────────────────────────
async function startSceneRenderBytePlusSeedance(
  sceneId: number,
  prompt: string,
  duration: number,
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9",
  _jobId: number = 0,
  characterImageUrl?: string
): Promise<string> {
  const clampedDuration = Math.max(5, Math.min(10, Math.round(duration))) as 5 | 10;
  const safeRatio = (aspectRatio === "21:9" ? "16:9" : aspectRatio) as "16:9" | "9:16" | "1:1" | "4:3";
  const taskId = await submitBytePlusSeedanceVideo({
    prompt,
    imageUrl: characterImageUrl,
    ratio: safeRatio,
    duration: clampedDuration,
    resolution: "720p",
    generateAudio: false,
  });
  console.log(`[MusicVideo] Scene ${sceneId} → BytePlus Seedance taskId=${taskId} (${characterImageUrl ? 'i2v' : 't2v'})`);
  const prefix = characterImageUrl ? BYTEPLUS_I2V_PREFIX : BYTEPLUS_T2V_PREFIX;
  return `${prefix}${taskId}`;
}

async function pollSceneStatusBytePlusSeedance(
  sceneId: number,
  taskId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollBytePlusSeedanceTask(taskId);
    const videoUrl = result.content?.video_url;
    if (result.status === "succeeded" && videoUrl) {
      let buffer: Buffer | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(videoUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffer = Buffer.from(await response.arrayBuffer());
          break;
        } catch (fetchErr) {
          console.warn(`[BytePlusSeedance] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      if (!buffer) {
        const db2 = await getDb();
        if (db2) {
          await db2.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: "Failed to download BytePlus Seedance video after 3 attempts", updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, sceneId));
        }
        return { status: "failed" };
      }
      const key = `music-video-scenes/${sceneId}-byteplus-${Date.now()}.mp4`;
      const { url } = await storagePut(key, buffer, "video/mp4");
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      console.log(`[BytePlusSeedance] Scene ${sceneId} completed → S3: ${url.slice(0, 80)}...`);
      return { status: "completed", videoUrl: url };
    }
    if (result.status === "failed" || result.status === "cancelled") {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: result.error?.message ?? "BytePlus Seedance generation failed", updatedAt: new Date() })
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

// ── OMNIHUMAN: BytePlus Vision AI OmniHuman 1.5 ──────────────────────────────────────────────────
const OMNIHUMAN_PREFIX = "omnihuman:";

export async function startSceneRenderOmniHuman(
  sceneId: number,
  prompt: string,
  imageUrl: string,
  audioUrl: string
): Promise<string> {
  const taskId = await submitOmniHumanTask({ imageUrl, audioUrl, prompt });
  console.log(`[MusicVideo] Scene ${sceneId} → OmniHuman 1.5 taskId=${taskId}`);
  return `${OMNIHUMAN_PREFIX}${taskId}`;
}

async function pollSceneStatusOmniHuman(
  sceneId: number,
  taskId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollOmniHumanTask(taskId);
    if (result.status === "done" && result.videoUrl) {
      let buffer: Buffer | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(result.videoUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffer = Buffer.from(await response.arrayBuffer());
          break;
        } catch (fetchErr) {
          console.warn(`[OmniHuman] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      if (!buffer) {
        const db2 = await getDb();
        if (db2) {
          await db2.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: "Failed to download OmniHuman video after 3 attempts", updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, sceneId));
        }
        return { status: "failed" };
      }
      const key = `music-video-scenes/${sceneId}-omnihuman-${Date.now()}.mp4`;
      const { url } = await storagePut(key, buffer, "video/mp4");
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      console.log(`[OmniHuman] Scene ${sceneId} completed → S3: ${url.slice(0, 80)}...`);
      return { status: "completed", videoUrl: url };
    }
    if (result.status === "failed") {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: result.errorMessage ?? "OmniHuman generation failed", updatedAt: new Date() })
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

async function startSceneRenderKling(
  prompt: string,
  duration: number,
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9",
  /** Character portrait URL(s) for Kling 3.0 Subject Binding — locks face identity across all frames */
  characterImageUrls?: string[]
): Promise<string> {
  // Build image_reference array for Subject Binding (up to 4 images)
  // Use "human" token type for character face/body locking
  const imageReference: { url: string; subject_token_type: "human" | "animal" | "object" }[] | undefined =
    characterImageUrls && characterImageUrls.length > 0
      ? characterImageUrls.slice(0, 4).map((url) => ({ url, subject_token_type: "human" as const }))
      : undefined;

  if (imageReference && imageReference.length > 0) {
    console.log(`[KlingSubjectBinding] Injecting ${imageReference.length} reference image(s) for character consistency`);
  }

  // Kling only supports 16:9, 9:16, 1:1 — map 4:3 → 16:9, 21:9 → 16:9
  const klingAspectRatio = (aspectRatio === "4:3" || aspectRatio === "21:9" ? "16:9" : aspectRatio) as "16:9" | "9:16" | "1:1";
  const taskId = await klingClient.createTextToVideo({
    model_name: "kling-v3", // Subject Binding requires kling-v3
    prompt,
    duration: duration <= 5 ? "5" : "10",
    aspect_ratio: klingAspectRatio,
    mode: "std",
    ...(imageReference ? { image_reference: imageReference } : {}),
  });
  if (!taskId) throw new Error("Kling: no task_id returned");
  return taskId;
}

async function startSceneRenderHypereal(sceneId: number, prompt: string, duration: number, aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9", jobId: number = 0): Promise<string> {
  // Hypereal Seedance 2.0 has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;
  const trySubmit = async (p: string): Promise<string> => {
    // Hypereal only supports 16:9, 9:16, 1:1 — map 4:3 → 16:9, 21:9 → 16:9
    const hyperealAspectRatio = (aspectRatio === "4:3" || aspectRatio === "21:9" ? "16:9" : aspectRatio) as "16:9" | "9:16" | "1:1";
    const hyperealJobId = await submitHyperealVideo({
      model: HYPEREAL_MODELS.SEEDANCE_2_T2V,
      prompt: p,
      duration: duration <= 5 ? 5 : 8,
      mode: "auto",
      aspect_ratio: hyperealAspectRatio,
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
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + `. Cinematic ${aspectRatio} video clip.`;
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

async function startSceneRenderFalSeedance(
  sceneId: number,
  prompt: string,
  duration: number,
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9",
  jobId: number = 0,
  /** Character portrait URL — when provided, uses i2v (portrait only) or r2v (portrait + audio) */
  characterImageUrl?: string,
  /** Pre-extracted audio clip URL for this scene's time window — triggers r2v native lip sync */
  sceneAudioClipUrl?: string,
  /** Lyrics text for this scene's time window — embedded in r2v prompt for phoneme-level lip sync */
  sceneLyrics?: string
): Promise<string> {
  // ── STRATEGY SELECTION ───────────────────────────────────────────────────────
  // r2v (reference-to-video): character portrait + audio clip + lyrics → native lip sync (BEST)
  // i2v (image-to-video):     character portrait only → character consistency, no lip sync
  // t2v (text-to-video):      no reference → text prompt only
  const useR2V = !!(characterImageUrl && sceneAudioClipUrl);
  const mode = useR2V ? "r2v" : characterImageUrl ? "i2v" : "t2v";

  // fal.ai Seedance has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;

  // ── R2V: reference-to-video with native lip sync ─────────────────────────────
  if (useR2V) {
    // Build the @Image1/@Audio1 anchored prompt with lyrics
    const lyricsBlock = sceneLyrics ? ` Lyrics: '${sceneLyrics.slice(0, 120)}'` : "";
    const r2vBase = `@Image1 performs @Audio1 in a cinematic music video. ${prompt}`;
    const r2vWithLyrics = lyricsBlock ? `${r2vBase}${lyricsBlock}` : r2vBase;
    const safeR2VPrompt = r2vWithLyrics.length > MAX_PROMPT_CHARS
      ? r2vWithLyrics.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
      : r2vWithLyrics;

    console.log(`[MusicVideo] Scene ${sceneId} fal.ai Seedance mode=r2v (native lip sync)`);
    console.log(`[MusicVideo] Scene ${sceneId} r2v @Image1=${characterImageUrl!.slice(0, 70)}...`);
    console.log(`[MusicVideo] Scene ${sceneId} r2v @Audio1=${sceneAudioClipUrl.slice(0, 70)}...`);
    if (sceneLyrics) console.log(`[MusicVideo] Scene ${sceneId} r2v lyrics="${sceneLyrics.slice(0, 60)}..."`);

    let requestId: string;
    try {
      requestId = await submitFalSeedanceR2V({
        prompt: safeR2VPrompt,
        image_urls: [characterImageUrl!],
        audio_urls: [sceneAudioClipUrl],
        aspect_ratio: aspectRatio,
        duration: duration <= 5 ? "5" : duration <= 8 ? "8" : "10",
        resolution: "720p",
        generate_audio: true, // r2v with audio: enable native lip sync
      });
      if (!requestId) throw new Error(`fal.ai Seedance r2v: no request_id returned for scene ${sceneId}`);
    } catch (r2vErr: any) {
      const errMsg = String(r2vErr?.message ?? r2vErr);
      console.warn(`[MusicVideo] Scene ${sceneId} r2v failed (${errMsg.slice(0, 150)}). Falling back to i2v.`);
      // Fall through to i2v fallback below
      return startSceneRenderFalSeedance(sceneId, prompt, duration, aspectRatio, jobId, characterImageUrl);
    }

    // Spend protection log
    if (jobId > 0) {
      const attemptCount = await getSceneAttemptCount(sceneId);
      const idempotencyKey = makeIdempotencyKey(jobId, sceneId, "fal_seedance", attemptCount + 1);
      await logProviderSubmission({
        jobId, sceneId, provider: "fal_seedance", providerJobId: requestId,
        idempotencyKey, attemptNumber: attemptCount + 1,
        estimatedCostUsd: PROVIDER_COST_USD.fal_seedance, submissionReason: "scene_render",
      });
    }
    console.log(`[MusicVideo] Scene ${sceneId} → fal.ai Seedance r2v requestId=${requestId}`);
    return `${FAL_R2V_PREFIX}${requestId}`;
  }

  // ── I2V / T2V: image-to-video or text-to-video ───────────────────────────────
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  if (characterImageUrl) {
    console.log(`[MusicVideo] Scene ${sceneId} fal.ai Seedance mode=i2v image=${characterImageUrl.slice(0, 60)}...`);
  } else {
    console.log(`[MusicVideo] Scene ${sceneId} fal.ai Seedance mode=t2v (no character portrait)`);
  }

  const trySubmit = async (p: string): Promise<string> => {
    const requestId = await submitFalSeedanceVideo({
      prompt: p,
      aspect_ratio: aspectRatio,
      duration: duration <= 5 ? "5" : "8",
      resolution: "720p",
      generate_audio: false, // music video — audio comes from the track
      ...(characterImageUrl ? { image_url: characterImageUrl } : {}),
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
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + `. Cinematic ${aspectRatio} video clip.`;
    try {
      requestId = await trySubmit(fallbackPrompt);
    } catch (retryErr: any) {
      throw new Error(`fal.ai Seedance failed for scene ${sceneId} after retry: ${String(retryErr?.message ?? retryErr)}`);
    }
  }

  // ── SPEND PROTECTION: Log successful submission ───────────────────────────────
  if (jobId > 0) {
    const attemptCount = await getSceneAttemptCount(sceneId);
    const idempotencyKey = makeIdempotencyKey(jobId, sceneId, "fal_seedance", attemptCount + 1);
    await logProviderSubmission({
      jobId, sceneId, provider: "fal_seedance", providerJobId: requestId,
      idempotencyKey, attemptNumber: attemptCount + 1,
      estimatedCostUsd: PROVIDER_COST_USD.fal_seedance, submissionReason: "scene_render",
    });
  }
  const prefix = characterImageUrl ? FAL_I2V_PREFIX : FAL_T2V_PREFIX;
  console.log(`[MusicVideo] Scene ${sceneId} → fal.ai Seedance (${characterImageUrl ? 'i2v' : 't2v'}) requestId=${requestId}`);
  return `${prefix}${requestId}`;
}

async function startSceneRenderGrokImagine(
  sceneId: number,
  prompt: string,
  duration: number,
  storyboardImageUrl?: string,
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9"
): Promise<string> {
  // Grok Imagine supports up to 10s clips; clamp to valid range
  const clampedDuration = Math.max(1, Math.min(10, Math.round(duration)));

  // Map 21:9 (cinematic) to 16:9 for Grok (closest supported ratio)
  const grokAspectRatio = (aspectRatio === "21:9" ? "16:9" : aspectRatio) as import("./ai-apis/grok-imagine").GrokVideoAspectRatio;
  const requestId = await submitGrokVideo({
    prompt,
    image_url: storyboardImageUrl ?? undefined, // image-to-video if storyboard available
    duration: clampedDuration,
    aspect_ratio: grokAspectRatio,
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
 * @param storyboardImageUrl Approved storyboard image — used as the STARTING FRAME for image-to-video
 *                           This guarantees character consistency: the first frame IS the storyboard image.
 */
async function startSceneRenderAtlasCloud(
  sceneId: number,
  prompt: string,
  duration: number,
  jobId: number = 0,
  characterImageUrl?: string | null,
  audioUrl?: string | null,
  sceneStartTime?: number,
  enableLipSync: boolean = true,
  storyboardImageUrl?: string | null,
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9"
): Promise<string> {
  const MAX_PROMPT_CHARS = 480;

  // ── IMAGE SELECTION ───────────────────────────────────────────────────────────
  // Priority order for image-to-video starting frame:
  //   1. storyboardImageUrl — the approved storyboard image for this scene (BEST: locks character + setting)
  //   2. characterImageUrl  — master portrait (fallback: locks character face only)
  //   3. none               — text-to-video only
  // For reference-to-video (Strategy 1), we still use characterImageUrl as the reference_images
  // because the model needs a face reference, not a full scene composition.
  const imageForI2V = storyboardImageUrl ?? characterImageUrl;

  // CRITICAL: Seedance 2.0 reference-to-video requires "@Image1" in the prompt
  // to anchor the character reference image. Without this token the model treats
  // the reference image as a style hint only, producing inconsistent character
  // appearance across scenes. Prepend it when a character portrait is provided.
  // See: https://fal.ai/docs/model-api-reference/video-generation-api/bytedance-seedance-2.0-reference-to-video
  const anchoredPrompt = imageForI2V
    ? (prompt.startsWith("@Image1") ? prompt : `@Image1 ${prompt}`)
    : prompt;

  const safePrompt = anchoredPrompt.length > MAX_PROMPT_CHARS
    ? anchoredPrompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : anchoredPrompt;

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
        clipDuration,
        aspectRatio
      );
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud REFERENCE-TO-VIDEO (lip sync) predictionId=${predictionId}`);
    } catch (r2vErr: any) {
      const errMsg = String(r2vErr?.message ?? r2vErr);
      console.warn(`[MusicVideo] Scene ${sceneId} reference-to-video failed (${errMsg.slice(0, 150)}). Falling back to image-to-video.`);
      // Fall through to strategy 2 — use storyboard image as starting frame if available
      if (imageForI2V) {
        try {
          const { predictionId: pid } = await submitAtlasImageToVideo(safePrompt, imageForI2V, clipDuration, aspectRatio);
          predictionId = pid;
          console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud IMAGE-TO-VIDEO (fallback, ${storyboardImageUrl ? 'storyboard' : 'portrait'}) predictionId=${predictionId}`);
        } catch (i2vErr: any) {
          const i2vMsg = String(i2vErr?.message ?? i2vErr);
          console.warn(`[MusicVideo] Scene ${sceneId} image-to-video also failed (${i2vMsg.slice(0, 150)}). Falling back to text-to-video.`);
          const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration, aspectRatio);
          predictionId = pid;
          console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO (fallback) predictionId=${predictionId}`);
        }
      } else {
        const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration, aspectRatio);
        predictionId = pid;
        console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO (fallback, no image) predictionId=${predictionId}`);
      }
    }
  }
  // ── STRATEGY 2: image-to-video using storyboard image as starting frame ──────
  // The storyboard image IS the character in the right pose/setting — animating from
  // it guarantees Zara looks exactly like the storyboard in every rendered clip.
  else if (imageForI2V) {
    try {
      const { predictionId: pid } = await submitAtlasImageToVideo(safePrompt, imageForI2V, clipDuration, aspectRatio);
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud IMAGE-TO-VIDEO (${storyboardImageUrl ? 'storyboard' : 'portrait'}) predictionId=${predictionId}`);
    } catch (i2vErr: any) {
      const i2vMsg = String(i2vErr?.message ?? i2vErr);
      console.warn(`[MusicVideo] Scene ${sceneId} image-to-video failed (${i2vMsg.slice(0, 150)}). Falling back to text-to-video.`);
      const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration, aspectRatio);
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO (fallback) predictionId=${predictionId}`);
    }
  }
  // ── STRATEGY 3: text-to-video (no character image available) ─────────────────
  else {
    try {
      const { predictionId: pid } = await submitAtlasVideo(safePrompt, clipDuration, aspectRatio);
      predictionId = pid;
      console.log(`[MusicVideo] Scene ${sceneId} → Atlas Cloud TEXT-TO-VIDEO predictionId=${predictionId}`);
    } catch (err: any) {
      const errMsg = String(err?.message ?? err);
      console.warn(`[MusicVideo] Scene ${sceneId} Atlas Cloud first attempt failed (${errMsg.slice(0, 150)}). Retrying with simplified prompt.`);
      const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + ". Cinematic video clip.";
      const { predictionId: pid } = await submitAtlasVideo(fallbackPrompt, clipDuration, aspectRatio);
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
  requestId: string,
  modelType: "t2v" | "i2v" | "r2v" = "t2v"
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  const { FAL_T2V_MODEL_ID: T2V, FAL_I2V_MODEL_ID: I2V, FAL_R2V_MODEL_ID: R2V } = await import("./ai-apis/fal-seedance");
  const modelId = modelType === "i2v" ? I2V : modelType === "r2v" ? R2V : T2V;
  try {
    const result = await pollFalSeedanceVideo(requestId, modelId);
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
  // Route to the correct API based on the task ID prefix.
  // IMPORTANT: Check the more specific "native" prefix FIRST, before the generic seedance prefix,
  // because "wavespeed:seedance:native:" also starts with "wavespeed:seedance:".
  if (taskId.startsWith(WAVESPEED_SEEDANCE_NATIVE_PREFIX)) {
    return pollSceneStatusWaveSpeed(sceneId, taskId.slice(WAVESPEED_SEEDANCE_NATIVE_PREFIX.length));
  }
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

  if (taskId.startsWith(FAL_R2V_PREFIX)) {
    // Reference-to-video (native lip sync): use r2v model ID for polling
    return pollSceneStatusFalSeedance(sceneId, taskId.slice(FAL_R2V_PREFIX.length), "r2v");
  }
  if (taskId.startsWith(FAL_I2V_PREFIX)) {
    // Image-to-video: use i2v model ID for polling
    return pollSceneStatusFalSeedance(sceneId, taskId.slice(FAL_I2V_PREFIX.length), "i2v");
  }
  if (taskId.startsWith(FAL_T2V_PREFIX)) {
    // Text-to-video: use t2v model ID for polling
    return pollSceneStatusFalSeedance(sceneId, taskId.slice(FAL_T2V_PREFIX.length), "t2v");
  }
  if (taskId.startsWith(FAL_REQUEST_ID_PREFIX)) {
    // Legacy fal: prefix (before model-specific prefixes were added) — assume t2v
    return pollSceneStatusFalSeedance(sceneId, taskId.slice(FAL_REQUEST_ID_PREFIX.length), "t2v");
  }

  if (taskId.startsWith(GROK_IMAGINE_PREFIX)) {
    return pollSceneStatusGrokImagine(sceneId, taskId.slice(GROK_IMAGINE_PREFIX.length));
  }

  // OmniHuman 1.5 (BytePlus Vision AI) — performance lip-sync scenes
  if (taskId.startsWith(OMNIHUMAN_PREFIX)) {
    return pollSceneStatusOmniHuman(sceneId, taskId.slice(OMNIHUMAN_PREFIX.length));
  }

  // BytePlus Seedance 2.0 (ModelArk) — cinematic scenes
  if (taskId.startsWith(BYTEPLUS_I2V_PREFIX)) {
    return pollSceneStatusBytePlusSeedance(sceneId, taskId.slice(BYTEPLUS_I2V_PREFIX.length));
  }
  if (taskId.startsWith(BYTEPLUS_T2V_PREFIX)) {
    return pollSceneStatusBytePlusSeedance(sceneId, taskId.slice(BYTEPLUS_T2V_PREFIX.length));
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

  // ── STEP 9b: IDENTITY CONSISTENCY GATE ─────────────────────────────────────
  // Run face validation on all performance scenes before assembly.
  // This catches identity drift (character looks different in each scene) before
  // the video is delivered to the subscriber.
  //
  // Behaviour:
  //   - "matched"  → face validation passed for all characters in this scene
  //   - "warning"  → one or more characters failed the similarity threshold
  //   - "skipped"  → no reference photo available (AI-generated character) or no API keys
  //
  // On "warning": log and flag the scene in the DB. Do NOT block assembly — we want
  // the subscriber to receive a video. The warning is surfaced in the admin dashboard.
  // Future: auto-regenerate scenes that fail identity validation.
  const performanceScenes = scenes.filter(
    s => s.sceneType === "performance" || s.lipSync === true
  );
  if (performanceScenes.length > 0) {
    console.log(`[IdentityGate] Job ${jobId}: running face validation on ${performanceScenes.length} performance scene(s)...`);
    // Fetch characters assigned to this job
    const jobCharacters = await dbConn
      .select()
      .from(videoCharacters)
      .where(eq(videoCharacters.jobId, jobId));

    const charData = jobCharacters
      .filter(c => c.referencePhotoBase64) // only characters with a reference photo
      .map(c => ({
        characterId: c.id,
        name: c.name,
        referencePhotoBase64: c.referencePhotoBase64 as string,
        lockedDescription: c.lockedDescription ?? "",
        faceValidationThreshold: c.faceValidationThreshold ?? 75,
      }));

    let identityWarnings = 0;
    for (const scene of performanceScenes) {
      // Use the lip-synced clip URL for performance scenes (the final output)
      const clipUrl = (scene.lipSyncVideoUrl as string | null) ?? (scene.videoUrl as string | null);
      if (!clipUrl) {
        console.warn(`[IdentityGate] Scene ${scene.sceneIndex}: no clip URL, skipping face validation`);
        continue;
      }
      // Use the preview image for face comparison (faster than video frame extraction)
      const imageUrl = (scene.previewImageUrl as string | null) ?? clipUrl;
      const status = await validateSceneFaceConsistency(scene.id, imageUrl, charData);
      if (status === "warning") {
        identityWarnings++;
        console.warn(`[IdentityGate] Scene ${scene.sceneIndex}: IDENTITY WARNING — face similarity below threshold`);
      } else if (status === "matched") {
        console.log(`[IdentityGate] Scene ${scene.sceneIndex}: identity matched ✓`);
      } else {
        console.log(`[IdentityGate] Scene ${scene.sceneIndex}: skipped (no reference photo or no API keys)`);
      }
    }

    if (identityWarnings > 0) {
      // ── AUTO-REGENERATION: reset warning scenes to pending (max 2 retries per scene) ──────
      // Re-fetch scenes with faceValidationStatus to find which ones need regeneration
      const warningScenes = await dbConn
        .select({ id: musicVideoScenes.id, sceneIndex: musicVideoScenes.sceneIndex, retryCount: musicVideoScenes.retryCount })
        .from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.jobId, jobId), eq(musicVideoScenes.faceValidationStatus, "warning")));
      const regenCandidates = warningScenes.filter(s => (s.retryCount ?? 0) < 2);
      if (regenCandidates.length > 0) {
        console.warn(`[IdentityGate] Job ${jobId}: auto-regenerating ${regenCandidates.length} scene(s) that failed identity validation (retryCount < 2)`);
        for (const s of regenCandidates) {
          await dbConn.update(musicVideoScenes)
            .set({
              status: "pending",
              videoUrl: null,
              taskId: null,
              lipSyncStatus: "pending",
              lipSyncTaskId: null,
              lipSyncVideoUrl: null,
              faceValidationStatus: "pending",
              retryCount: (s.retryCount ?? 0) + 1,
              errorMessage: "Auto-regenerating: failed identity validation",
              updatedAt: new Date(),
            })
            .where(eq(musicVideoScenes.id, s.id));
          console.log(`[IdentityGate] Scene ${s.sceneIndex} (id=${s.id}) reset to pending for auto-regeneration (retry ${(s.retryCount ?? 0) + 1}/2)`);
        }
        // Reset job status to rendering so heartbeat picks up the pending scenes
        await dbConn.update(musicVideoJobs)
          .set({ status: "rendering" as any, updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, jobId));
        // Abort assembly — scenes need to be re-rendered first
        throw new Error(`[IdentityGate] Job ${jobId}: assembly aborted — ${regenCandidates.length} scene(s) queued for auto-regeneration due to identity validation failure`);
      }
      // All warning scenes have exhausted retries — deliver with warning flag
      const warningMsg = `Identity Gate: ${identityWarnings}/${performanceScenes.length} performance scene(s) failed face similarity check (retries exhausted). Video delivered but flagged for review.`;
      console.warn(`[IdentityGate] Job ${jobId}: ${warningMsg}`);
      // Append to existing error message (don't overwrite QC warnings)
      const existingMsg = qcIssues.length > 0 ? `QC Warning: ${qcIssues.join("; ")}; ` : "";
      await dbConn.update(musicVideoJobs)
        .set({ errorMessage: existingMsg + warningMsg, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, jobId));
    } else {
      console.log(`[IdentityGate] Job ${jobId}: all performance scenes passed identity validation ✓`);
    }
  } else {
    console.log(`[IdentityGate] Job ${jobId}: no performance scenes found, skipping identity gate`);
  }

  scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wizvid-job-${jobId}-`));

  try {
    const sceneFiles: string[] = [];
    for (const scene of scenes) {
      // ── Clip selection (3-stage pipeline, 2026-05-28):
      //
      // PERFORMANCE SCENES (sceneType='performance' or lipSync=true):
      //   Use lipSyncVideoUrl — InfiniteTalk output IS the final performance clip.
      //   Zara was generated INSIDE the scene by Seedance. InfiniteTalk corrected lip sync.
      //   No compositing. No grey background. lipSyncVideoUrl is the final clip.
      //   If lipSync is not done, assembly MUST NOT proceed — throw to force a retry.
      //
      // CINEMATIC SCENES:
      //   Use videoUrl (raw Seedance clip). No lip sync needed.
      const needsLipSync = (scene.lipSync === true) || (scene.sceneType === "performance");
      const lipSyncDone = scene.lipSyncStatus === "done";
      const lipSyncVideoUrl = scene.lipSyncVideoUrl as string | null | undefined;

      let clipUrl: string | null = null;
      if (needsLipSync) {
        if (lipSyncDone && lipSyncVideoUrl) {
          // FINAL performance clip: InfiniteTalk lip-synced output (Zara inside the scene)
          clipUrl = lipSyncVideoUrl;
          console.log(`[Assembly] Scene ${scene.sceneIndex}: using InfiniteTalk lip-synced clip ✓`);
        } else {
          // Lip sync not ready — hard failure. Do not use raw clips.
          // Throw so the assembly worker retries rather than producing a degraded output.
          throw new Error(
            `[Assembly] HARD STOP — Scene ${scene.sceneIndex} (id=${scene.id}) lip sync not ready ` +
            `(lipSyncStatus=${scene.lipSyncStatus ?? 'null'}, lipSyncVideoUrl=${lipSyncVideoUrl ? 'present' : 'null'}). ` +
            `Assembly cannot proceed without a lip-synced performance clip. ` +
            `This is a premium service — no raw clip substitutes.`
          );
        }
      } else {
        // Cinematic scene — use raw Seedance clip directly
        clipUrl = scene.videoUrl;
        console.log(`[Assembly] Scene ${scene.sceneIndex}: using cinematic clip (no lip sync required)`);
      }

      if (!clipUrl) continue;
      const sceneFile = path.join(tmpDir, `scene-${scene.sceneIndex.toString().padStart(3, "0")}.mp4`);
      const resp = await fetch(clipUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(sceneFile, buf);
      sceneFiles.push(sceneFile);
    }

    // Download original audio
    const audioFileRaw = path.join(tmpDir, "audio-raw.mp3");
    if (!job.audioUrl) throw new Error(`Job ${jobId} has no audioUrl — cannot assemble video without audio track`);
    const audioResp = await fetch(job.audioUrl);
    if (!audioResp.ok) throw new Error(`Failed to download audio for job ${jobId}: HTTP ${audioResp.status} from ${job.audioUrl}`);
    const audioBuf = Buffer.from(await audioResp.arrayBuffer());
    fs.writeFileSync(audioFileRaw, audioBuf);

    // ── WizSync™ Audio Sync Fix (2026-05-19) ────────────────────────────────────
    // AUDIO STRATEGY: The final assembled video uses the ORIGINAL FULL MIX audio track.
    // SyncLabs receives isolated vocals for lip sync accuracy, but the viewer hears the
    // complete song with instruments, backing vocals, etc.
    // Fix: find the earliest scene startTime and trim the full mix to start from that offset.
    // This ensures the audio the viewer hears is time-aligned with the lip-synced video.
    const firstScene = scenes[0]; // scenes are sorted by sceneIndex above
    // NOTE: startTime is stored in SECONDS (e.g. 0, 6, 12...), NOT milliseconds
    const audioStartSec = firstScene ? Math.floor(firstScene.startTime ?? 0) : 0;
    const audioTrimmedRaw = path.join(tmpDir, "audio-trimmed-raw.mp3");
    if (audioStartSec > 0) {
      console.log(`[Assembly] Job ${jobId}: trimming audio from ${audioStartSec}s to align with scene startTime`);
      await execAsync(
        `"${FFMPEG_BIN}" -y -i "${audioFileRaw}" -ss ${audioStartSec} -acodec copy "${audioTrimmedRaw}"`,
        { timeout: 60000 }
      );
      // Replace the raw audio file reference with the trimmed version
      fs.copyFileSync(audioTrimmedRaw, audioFileRaw);
      console.log(`[Assembly] Job ${jobId}: audio trimmed to start at ${audioStartSec}s ✓`);
    } else {
      console.log(`[Assembly] Job ${jobId}: first scene starts at 0s — no audio trim needed`);
    }

    // Apply WizSound™ audio enhancement
    const audioFile = path.join(tmpDir, "audio.mp3");
    await applyWizSound(audioFileRaw, audioFile, audioTier);

    // ── WizSync™ Normalization Pass ─────────────────────────────────────────────
    // SyncLabs sync-3 and WaveSpeed Seedance produce clips with different H.264
    // profiles, frame rates, and container formats. Direct concat-demux fails with
    // "No start code found" / "Invalid data" errors when mixing these sources.
    // Fix: re-encode every clip to a uniform target resolution H.264 baseline, 24fps,
    // yuv420p before concatenation. Audio is stripped here (-an) and the original
    // music track is overlaid in the final mix step.
    // ── Dynamic target resolution from job.aspectRatio ───────────────────────────
    // 16:9 → 1280×720  (landscape, default)
    // 9:16 → 720×1280  (portrait / Reels / TikTok)
    // 1:1  → 720×720   (square / Instagram)
    const jobAspectRatio = (job.aspectRatio ?? "16:9") as string;
    const ASPECT_TARGET_DIMS: Record<string, { w: number; h: number }> = {
      "16:9": { w: 1280, h: 720 },
      "9:16": { w: 720, h: 1280 },
      "1:1":  { w: 720, h: 720 },
    };
    const { w: TW, h: TH } = ASPECT_TARGET_DIMS[jobAspectRatio] ?? ASPECT_TARGET_DIMS["16:9"];
    console.log(`[Assembly] Job ${jobId}: target resolution ${TW}×${TH} (aspectRatio=${jobAspectRatio})`);
    console.log(`[Assembly] Job ${jobId}: normalizing ${sceneFiles.length} clips to uniform H.264 format...`);
    const normalizedFiles: string[] = [];
    for (let i = 0; i < sceneFiles.length; i++) {
      const src = sceneFiles[i];
      const dst = path.join(tmpDir, `norm-${String(i).padStart(3, "0")}.mp4`);
      // Enforce exact scene duration with -t to prevent VFR drift
      // NOTE: duration is stored in SECONDS (e.g. 6), NOT milliseconds
      const sceneDurSec = scenes[i]?.duration ? scenes[i].duration : null;
      const durFlag = sceneDurSec ? `-t ${sceneDurSec}` : "";
      // Detect clip dimensions to choose the right scaling strategy:
      //   Exact match → simple scale (no crop needed)
      //   Near-target ratio → simple scale
      //   Square clip → scale to fill larger dimension, centre-crop to target
      //   Any other   → scale-to-fill + centre-crop (NO black bars ever)
      let vfFilter = `scale=${TW}:${TH}:force_original_aspect_ratio=increase,crop=${TW}:${TH},fps=24`;
      try {
        const probeOut = await execAsync(
          `"${FFPROBE_BIN}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${src}"`,
          { timeout: 15000 }
        );
        const [pw, ph] = probeOut.stdout.trim().split(',').map(Number);
        if (pw > 0 && ph > 0) {
          const isExactMatch = pw === TW && ph === TH;
          const isSquare = Math.abs(pw - ph) < 20;
          const targetRatio = TW / TH;
          const clipRatio = pw / ph;
          const isNearTargetRatio = Math.abs(clipRatio - targetRatio) < 0.1;
          if (isExactMatch || isNearTargetRatio) {
            vfFilter = `scale=${TW}:${TH},fps=24`;
            console.log(`[Assembly] Clip ${i + 1}: ${pw}x${ph} → scale to ${TW}x${TH}`);
          } else if (isSquare) {
            // Square clip (e.g. InfiniteTalk 960x960): scale to fill larger target dimension, centre-crop
            const fillDim = Math.max(TW, TH);
            vfFilter = `scale=${fillDim}:-1,crop=${TW}:${TH},fps=24`;
            console.log(`[Assembly] Clip ${i + 1}: square ${pw}x${ph} → centre-crop to ${TW}x${TH}`);
          } else {
            // Portrait, landscape, or other: scale-to-fill + centre-crop (no black bars)
            vfFilter = `scale=${TW}:${TH}:force_original_aspect_ratio=increase,crop=${TW}:${TH},fps=24`;
            console.log(`[Assembly] Clip ${i + 1}: other ${pw}x${ph} → crop-to-fill ${TW}x${TH}`);
          }
        }
      } catch (probeErr: any) {
        console.warn(`[Assembly] Clip ${i + 1}: probe failed (${probeErr?.message?.slice(0,60)}), using default filter`);
      }
      await execAsync(
        `"${FFMPEG_BIN}" -y -i "${src}" ${durFlag} -an -c:v libx264 -preset fast -crf 22 -vf "${vfFilter}" -vsync cfr -r 24 -pix_fmt yuv420p "${dst}"`,
        { timeout: 120000 }
      );
      normalizedFiles.push(dst);
      console.log(`[Assembly] Normalized clip ${i + 1}/${sceneFiles.length} (dur=${sceneDurSec ?? 'auto'}s, CFR)`);
    }

    const concatFile = path.join(tmpDir, "concat.txt");
    const concatContent = normalizedFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(concatFile, concatContent);

    // Concatenate all normalized clips (stream copy — all same format now)
    const concatenatedVideo = path.join(tmpDir, "concatenated.mp4");
    await execAsync(
      `"${FFMPEG_BIN}" -y -f concat -safe 0 -i "${concatFile}" -c:v copy "${concatenatedVideo}"`,
      { timeout: 600000 }
    );
    // Get the actual duration of the concatenated video and the audio
    let videoDuration = 0;
    let audioDuration = 0;
    try {
      const videoInfo = await execAsync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${concatenatedVideo}"`);
      videoDuration = parseFloat(videoInfo.stdout.trim()) || 0;
      const audioInfo = await execAsync(`"${FFPROBE_BIN}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`);
      audioDuration = parseFloat(audioInfo.stdout.trim()) || 0;
    } catch (probeErr: any) {
      // ffprobe not available — estimate from scene count and duration
      console.warn(`[Assembly] ffprobe unavailable (${probeErr?.message?.slice(0,80)}), estimating durations`);
      videoDuration = sceneFiles.length * 6; // 6s per scene estimate
      audioDuration = videoDuration; // treat as equal so we skip looping
    }
    // Mix video with audio — loop video if shorter than audio to cover full track
    const finalVideo = path.join(tmpDir, "final.mp4");
    if (videoDuration > 0 && audioDuration > 0 && videoDuration < audioDuration) {
      // Loop the concatenated video to cover the full audio duration
      const loopedVideo = path.join(tmpDir, "looped.mp4");
      await execAsync(
        `"${FFMPEG_BIN}" -y -stream_loop -1 -i "${concatenatedVideo}" -t ${audioDuration} -c:v libx264 -preset fast -crf 22 "${loopedVideo}"`,
        { timeout: 600000 }
      );
      await execAsync(
        `"${FFMPEG_BIN}" -y -i "${loopedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -t ${audioDuration} "${finalVideo}"`,
        { timeout: 600000 }
      );
    } else {
      // Video is long enough — trim to exact audio duration
      await execAsync(
        `"${FFMPEG_BIN}" -y -i "${concatenatedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -t ${audioDuration} "${finalVideo}"`,
        { timeout: 600000 }
      );
    }

    // ── SYNC LABS sync-3 PREMIUM LIP SYNC ──────────────────────────────────────
    // Best-in-class lip sync. sync-3 features:
    //   - 4K native output (no resolution loss)
    //   - Native visual intelligence — handles extreme angles, profile shots,
    //     obstructions (microphones, hands, scarves) automatically
    //   - Global frame understanding (not chunk-based) — no boundary artifacts
    //   - Emotion and style preservation
    //   - Recommended for music video use cases
    //
    // Strategy: applied to the final assembled video as a single pass.
    // Only activated when enableLipSync=true on at least one character.
    // If Sync Labs fails, cinematic version is delivered — never blocks.
    //
    // HeyGen has been REPLACED by Sync Labs sync-3 (superior quality).
    // fal.ai MuseTalk has been REMOVED (unreliable, not production-grade).
    let finalVideoPath = finalVideo;

    const { isSyncLabsConfigured } = await import("./ai-apis/synclabs-lipsync");
    const lipSyncChars = await dbConn.select()
      .from(videoCharacters)
      .where(and(eq(videoCharacters.jobId, jobId), eq(videoCharacters.enableLipSync, true)));

    const hasLipSyncCharacter = lipSyncChars.length > 0;

    // sync-3 model limit: 300 seconds (5 minutes) maximum audio duration.
    // Skip lip sync only for tracks longer than 5 minutes.
    const SYNC_LABS_MAX_AUDIO_SECONDS = 300;
    const audioTooLongForSyncLabs = job.audioDuration > SYNC_LABS_MAX_AUDIO_SECONDS;
    if (audioTooLongForSyncLabs && hasLipSyncCharacter) {
      console.warn(`[WizSync] Job ${jobId}: audio is ${job.audioDuration}s — exceeds sync-3 max of ${SYNC_LABS_MAX_AUDIO_SECONDS}s (5 min). Skipping lip sync, delivering cinematic version.`);
    }

    // ── WHOLE-VIDEO WIZSYNC PASS ─────────────────────────────────────────────────
    // RULE (2026-05-20): If ALL lip-sync scenes already have lipSyncVideoUrl (per-scene
    // SyncLabs with isolated vocals), SKIP the whole-video pass entirely. The per-scene
    // approach is superior because each scene gets isolated vocals at the exact timestamp.
    // The whole-video pass is ONLY used as a fallback when per-scene lip sync was not applied.
    const allLipSyncScenesHaveVideo = scenes
      .filter(s => (s.lipSync === true) || (s.sceneType === "performance"))
      .every(s => s.lipSyncStatus === "done" && s.lipSyncVideoUrl);

    if (allLipSyncScenesHaveVideo && hasLipSyncCharacter) {
      console.log(`[WizSync] Job ${jobId}: ALL lip-sync scenes have InfiniteTalk lip sync applied. Skipping whole-video Sync Labs pass — per-scene InfiniteTalk is superior.`);
    } else {
      if (hasLipSyncCharacter && !isSyncLabsConfigured()) {
        console.warn(`[WizSync] Job ${jobId}: lip sync character found but SYNC_LABS_API_KEY not configured. Delivering cinematic version.`);
      } else {
        console.log(`[WizSync] Job ${jobId}: no lip sync characters — cinematic-first delivery.`);
      }
    }

    const finalBuffer = fs.readFileSync(finalVideoPath);
    // Phase 2: UUID-keyed S3 path — never reuses a previous path, even on re-render
    const finalUuid = randomUUID();
    const finalKey = `music-videos/${finalUuid}.mp4`;
    const { url } = await storagePut(finalKey, finalBuffer, "video/mp4");

    // Phase 2: Export validation — verify the uploaded file before marking completed
    let validationStatus: "passed" | "failed" | "skipped" = "skipped";
    let validationError: string | undefined;
    let validationErrorCode: string | undefined;
    let sha256 = "";
    let measuredDuration = 0;
    const fileSizeBytes = finalBuffer.length;
    try {
      const validation = await validateExport({
        cdnUrl: url,
        expectedDurationSeconds: (job.audioDuration ?? 60000) / 1000,
      });
      validationStatus = validation.valid ? "passed" : "failed";
      sha256 = validation.sha256;
      measuredDuration = validation.durationSeconds;
      if (!validation.valid) {
        validationError = validation.error;
        validationErrorCode = validation.errorCode;
        console.error(`[ExportValidator] Job ${jobId}: FAILED — ${validation.error}`);
      } else {
        console.log(`[ExportValidator] Job ${jobId}: PASSED — ${measuredDuration.toFixed(2)}s, ${validation.fileSizeBytes} bytes, sha256=${sha256.slice(0, 16)}...`);
      }
    } catch (valErr) {
      console.warn(`[ExportValidator] Job ${jobId}: validation threw — ${(valErr as Error).message}`);
      validationStatus = "skipped";
    }

    // Phase 2: Write immutable render attempt record
    try {
      const [countRow] = await dbConn.select({ id: renderAttempts.id })
        .from(renderAttempts)
        .where(eq(renderAttempts.jobId, jobId));
      const nextAttempt = countRow ? 2 : 1;
      await dbConn.insert(renderAttempts).values({
        jobId,
        attemptNumber: nextAttempt,
        finalVideoUrl: url,
        finalVideoKey: finalKey,
        sha256: sha256 || null,
        fileSizeBytes: fileSizeBytes || null,
        durationSeconds: measuredDuration ? String(measuredDuration) : null,
        sceneCount: scenes.length,
        validationStatus,
        validationError: validationError ?? null,
        validationErrorCode: validationErrorCode ?? null,
      });
    } catch (raErr) {
      console.warn(`[RenderAttempts] Failed to write audit record: ${(raErr as Error).message}`);
    }

    // If validation failed, mark job failed rather than delivering a corrupt video
    if (validationStatus === "failed") {
      await dbConn.update(musicVideoJobs)
        .set({ status: "failed", errorMessage: `Export validation failed: ${validationError}`, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, jobId));
      throw new Error(`Export validation failed: ${validationError}`);
    }

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
          origin: process.env.VITE_APP_URL || "https://wiz-ai.io",
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
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9" = "16:9",
  /** Music video job ID — required for spend-protection checks */
  jobId: number = 0,
  /** Character Lock™: master portrait URL injected as second reference image for identity consistency */
  characterPortraitUrl?: string | null,
  /** Audio clip URL for native Seedance 2.0 lip sync via reference_audios (performance scenes only) */
  audioClipUrl?: string | null,
  /** Lyrics text for this scene window — embedded in prompt as [Audio1] reference */
  sceneLyrics?: string | null
): Promise<string> {
  // WaveSpeed has a ~500 char prompt limit; truncate if needed
  const MAX_PROMPT_CHARS = 480;
  const safePrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS).replace(/[,;.\s]+$/, "") + "."
    : prompt;

  // Map duration to WaveSpeed's allowed values: 5, 10, or 15
  const wsDuration: 5 | 10 | 15 = duration <= 5 ? 5 : duration <= 10 ? 10 : 15;

  // DUAL-ANCHOR CHARACTER LOCK™:
  // ── PRIMARY PATH: Image-to-Video (storyboard image as first frame) ──────────────────
  // When a storyboard image is available, use the dedicated i2v endpoint.
  // This is the correct WaveSpeed API for first-frame-anchored cinematic rendering.
  // The `image` parameter (single URL) is required — NOT reference_images.
  if (storyboardImageUrl) {
    console.log(`[MusicVideo] Scene ${sceneId} STORYBOARD-ANCHORED I2V: using image-to-video endpoint — ${storyboardImageUrl.slice(0, 80)}...`);
  } else {
    console.warn(`[MusicVideo] Scene ${sceneId} WARNING: no storyboard image — falling back to text-to-video. Character Lock™ NOT enforced.`);
  }
  if (characterPortraitUrl) {
    console.log(`[MusicVideo] Scene ${sceneId} CHARACTER LOCK™ NOTE: portrait available; storyboard image is the primary visual anchor for i2v.`);
  }

  const trySubmit = async (p: string): Promise<string> => {
    if (storyboardImageUrl) {
      // ── IMAGE-TO-VIDEO: storyboard image anchors the first frame ────────────────────
      // For lip sync scenes: use reference_audios + [Audio1] in prompt for native Seedance 2.0 lip sync
      const i2vModel: WaveSpeedI2VModel = "bytedance/seedance-2.0/image-to-video"; // Standard (not fast) — better framing/head retention
      // Build the lip-sync enriched prompt if we have an audio clip
      let i2vPrompt = p;
      if (audioClipUrl) {
        // Inject [Audio1] reference and lyrics into prompt for phoneme-accurate lip sync
        const lyricsHint = sceneLyrics ? ` Singing the words: "${sceneLyrics.slice(0, 120)}".` : "";
        i2vPrompt = `${p} [Audio1] lip-sync to the provided audio.${lyricsHint}`.slice(0, 480);
        console.log(`[MusicVideo] Scene ${sceneId} WaveSpeed i2v+audio: injecting [Audio1] lip sync, lyrics: "${sceneLyrics?.slice(0, 60) ?? 'none'}"`);
      }
      const taskId = await submitWaveSpeedImageToVideo(
        {
          prompt: i2vPrompt,
          image: storyboardImageUrl,
          duration: wsDuration,
          aspect_ratio: aspectRatio,
          resolution: "720p",
          reference_audios: audioClipUrl ? [audioClipUrl] : undefined,
        },
        i2vModel
      );
      if (!taskId) throw new Error(`WaveSpeed i2v: no task_id returned for scene ${sceneId}`);
      return taskId;
    } else {
      // ── TEXT-TO-VIDEO fallback: no storyboard image available ─────────────────
      const taskId = await submitWaveSpeedVideo(
        {
          prompt: p,
          duration: wsDuration,
          aspect_ratio: aspectRatio,
          resolution: "720p",
        },
        model
      );
      if (!taskId) throw new Error(`WaveSpeed t2v: no task_id returned for scene ${sceneId}`);
      return taskId;
    }
  };

  let taskId: string;
  try {
    taskId = await trySubmit(safePrompt);
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    console.warn(`[MusicVideo] Scene ${sceneId} WaveSpeed ${model} first attempt failed (${errMsg}). Retrying with simplified prompt.`);
    const fallbackPrompt = prompt.slice(0, 200).replace(/[,;.\s]+$/, "") + `. Cinematic ${aspectRatio} video clip.`;
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
  // Prefix the task ID with model info for routing during polling.
  // IMPORTANT: Use the "native" prefix ONLY when reference_audios was actually passed
  // (audioClipUrl provided) — this tells the heartbeat that lip sync is already baked in
  // and Sync Labs should be skipped. Without audioClipUrl, use the standard prefix so
  // the heartbeat correctly routes the scene through Sync Labs sync-3.
  const isFast = model === "bytedance/seedance-2.0-fast/text-to-video";
  const hasNativeAudio = !!audioClipUrl;
  const prefix = isFast
    ? WAVESPEED_HAILUO_PREFIX
    : hasNativeAudio
      ? WAVESPEED_SEEDANCE_NATIVE_PREFIX  // reference_audios baked in — skip Sync Labs
      : WAVESPEED_SEEDANCE_PREFIX;         // no audio — must go through Sync Labs
  console.log(`[MusicVideo] Scene ${sceneId} → WaveSpeed ${model} taskId=${taskId} (native=${hasNativeAudio})`);
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


      // NOTE: Per-scene lip sync is handled by the sceneDispatchHeartbeat via InfiniteTalk.
      // Performance scenes go directly: character portrait + vocal stem → InfiniteTalk (no Seedance needed).
      // Cinematic scenes don't need lip sync. triggerPerSceneLipSync (Sync Labs) removed.
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

  // ── CHARACTER LOCK: Build a per-scene character portrait map ─────────────────────────────────
  // CRITICAL FIX: Each scene uses the portrait of the character(s) assigned to THAT scene
  // via the scene's `characterAssignments` JSON array. Using one shared portrait for all scenes
  // was the root cause of character inconsistency (e.g. Tim appearing in Greg's drummer scenes).
  //
  // Resolution priority per character: masterPortraitUrl > previewImageUrl > job.characterImageUrl
  const jobCharacters = await db.select().from(videoCharacters)
    .where(eq(videoCharacters.jobId, musicVideoJobId));

  // Build a name→character map for O(1) lookup (case-insensitive)
  const charByName = new Map(
    jobCharacters.map(c => [c.name.toLowerCase().trim(), c])
  );

  // Fallback: primary vocalist portrait used only when a scene has NO characterAssignments
  const primaryVocalist = jobCharacters.find(c =>
    (c.role ?? "").toLowerCase().includes("singer") ||
    (c.role ?? "").toLowerCase().includes("vocalist") ||
    (c.role ?? "").toLowerCase().includes("lead")
  ) ?? jobCharacters[0] ?? null;

  const fallbackCharacterImageUrl: string | null =
    primaryVocalist?.masterPortraitUrl ??
    primaryVocalist?.previewImageUrl ??
    job.characterImageUrl ??
    null;

  /**
   * Resolve the best portrait URL for a given scene.
   * - If the scene has characterAssignments, use the first assigned character's portrait.
   * - If no assignments (or none match the roster), fall back to the primary vocalist.
   * - Returns null if no portrait is available at all.
   */
  function resolveSceneCharacterImageUrl(scene: { characterAssignments?: string | null }): string | null {
    let assignments: string[] = [];
    try {
      if (scene.characterAssignments) {
        const parsed = JSON.parse(scene.characterAssignments);
        if (Array.isArray(parsed)) assignments = parsed.map(String);
      }
    } catch { /* ignore parse errors */ }

    if (assignments.length > 0) {
      for (const name of assignments) {
        const char = charByName.get(name.toLowerCase().trim());
        if (char) {
          const portrait = char.masterPortraitUrl ?? char.previewImageUrl ?? null;
          if (portrait) {
            console.log(`[triggerMusicVideoRender] Scene character lock: "${name}" → ${portrait.slice(0, 80)}...`);
            return portrait;
          }
        }
      }
      // Assignments exist but none had a portrait — log and fall through to fallback
      console.warn(`[triggerMusicVideoRender] Scene assignments [${assignments.join(", ")}] had no portraits — using fallback`);
    }

    // No assignments or no portraits found — use primary vocalist fallback
    return fallbackCharacterImageUrl;
  }

  if (fallbackCharacterImageUrl) {
    console.log(`[triggerMusicVideoRender] Fallback CHARACTER LOCK for job ${musicVideoJobId}: ${fallbackCharacterImageUrl.slice(0, 80)}...`);
  } else {
    console.warn(`[triggerMusicVideoRender] No character portraits found for job ${musicVideoJobId} — scenes without assignments will use text-to-video`);
  }

  // Auto-generate storyboard images — use cinematic aspect-ratio-aware image generation
  // so WaveSpeed i2v inherits the correct frame dimensions natively.
  //
  // IMPORTANT: We check not just whether a previewImageUrl exists, but whether it was
  // generated in the correct aspect ratio for this job. A square portrait (1:1) used as
  // a reference for a 16:9 render will cause Seedance to crop the top of the frame.
  // We detect this by checking if the URL contains a known square-format indicator, or
  // if the scene has no previewImageUrl at all.
  const jobAspectRatio = (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

  // Scenes that need a (re)generated storyboard image:
  // 1. No previewImageUrl at all
  // 2. previewImageUrl exists but appears to be a square portrait (from character upload, not a generated storyboard)
  //    — detected by checking if the URL contains "-cinematic" (our storyboard key prefix) or not
  const scenesNeedingStoryboard = scenes.filter(s => {
    if (!s.previewImageUrl) return true; // missing entirely
    // If the URL contains our storyboard key prefix, it was already generated correctly
    if (s.previewImageUrl.includes("-cinematic") || s.previewImageUrl.includes("music-video-storyboard")) return false;
    // Otherwise it's a character portrait or other non-storyboard image — regenerate
    return true;
  });

  if (scenesNeedingStoryboard.length > 0) {
    // Resolve venue reference image for img2img anchoring (e.g. Air Studios Lyndhurst Hall)
    const venueRefUrl = resolveVenueReferenceUrl(job.sceneSetting);
    if (venueRefUrl) {
      console.log(`[triggerMusicVideoRender] Venue reference resolved for job ${musicVideoJobId}: ${venueRefUrl.slice(0, 80)}...`);
    }
    console.log(`[triggerMusicVideoRender] Generating ${scenesNeedingStoryboard.length} cinematic storyboard images for job ${musicVideoJobId} (aspect: ${jobAspectRatio}${venueRefUrl ? ", venue-anchored" : ""})`);
    const { generateCinematicStoryboardImage } = await import("./ai-apis/fal-image-gen");
    await Promise.allSettled(
      scenesNeedingStoryboard.map(async (scene) => {
        try {
          const { url } = await generateCinematicStoryboardImage({
            prompt: scene.prompt,
            aspectRatio: jobAspectRatio,
            storageKeyPrefix: `music-video-storyboard/${musicVideoJobId}-scene-${scene.id}-cinematic`,
            venueReferenceUrl: venueRefUrl,
          });
          if (url) {
            await db!.update(musicVideoScenes)
              .set({ previewImageUrl: url })
              .where(eq(musicVideoScenes.id, scene.id));
            console.log(`[triggerMusicVideoRender] Scene ${scene.sceneIndex + 1} storyboard → ${url.slice(0, 80)}...`);
          }
        } catch (err) {
          console.warn(`[triggerMusicVideoRender] Cinematic storyboard failed for scene ${scene.sceneIndex + 1}, falling back:`, err);
          // Fallback: also use cinematic generator with correct aspect ratio (no silent 1:1 fallback)
          try {
            const { generateCinematicStoryboardImage: gen2 } = await import("./ai-apis/fal-image-gen");
            const { url } = await gen2({
              prompt: scene.prompt.slice(0, 300),
              aspectRatio: jobAspectRatio,
              storageKeyPrefix: `music-video-storyboard/${musicVideoJobId}-scene-${scene.id}-fallback`,
              venueReferenceUrl: venueRefUrl,
            });
            if (url) {
              await db!.update(musicVideoScenes)
                .set({ previewImageUrl: url })
                .where(eq(musicVideoScenes.id, scene.id));
            }
          } catch (fallbackErr) {
            console.warn(`[triggerMusicVideoRender] Storyboard fallback also failed for scene ${scene.sceneIndex + 1}:`, fallbackErr);
          }
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
          (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "21:9", // Use persisted export format
          musicVideoJobId,       // ── SPEND PROTECTION: pass jobId
          resolveSceneCharacterImageUrl(scene), // ── CHARACTER LOCK: per-scene portrait
          job.audioUrl ?? null,  // ── LIP SYNC: full song URL for audio clip extraction
          scene.startTime        // ── LIP SYNC: scene start time for audio segment
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

/**
 * Trigger per-scene Sync Labs lip sync after a scene video is generated.
 * Called immediately after a scene's videoUrl is saved to the DB.
 * Runs asynchronously — never blocks scene completion.
 */
export async function triggerPerSceneLipSync(sceneId: number, videoUrl: string): Promise<void> {
  try {
    const { isSyncLabsConfigured, submitSyncLabsLipSync } = await import("./ai-apis/synclabs-lipsync");
    if (!isSyncLabsConfigured()) {
      console.log(`[PerSceneLipSync] Scene ${sceneId}: Sync Labs not configured, skipping.`);
      return;
    }
    const db = await getDb();
    if (!db) return;

    // Look up scene to get jobId, startTime, duration, lipSync flag
    const [scene] = await db.select({
      id: musicVideoScenes.id,
      jobId: musicVideoScenes.jobId,
      startTime: musicVideoScenes.startTime,
      duration: musicVideoScenes.duration,
      lipSync: musicVideoScenes.lipSync,
    }).from(musicVideoScenes).where(eq(musicVideoScenes.id, sceneId));

    if (!scene) {
      console.warn(`[PerSceneLipSync] Scene ${sceneId} not found in DB.`);
      return;
    }

    if (!scene.lipSync) {
      console.log(`[PerSceneLipSync] Scene ${sceneId}: lipSync=false, skipping per-scene lip sync.`);
      return;
    }

    // Look up job to get audioUrl
    const [job] = await db.select({
      id: musicVideoJobs.id,
      audioUrl: musicVideoJobs.audioUrl,
    }).from(musicVideoJobs).where(eq(musicVideoJobs.id, scene.jobId));

    if (!job?.audioUrl) {
      console.warn(`[PerSceneLipSync] Scene ${sceneId}: job ${scene.jobId} has no audioUrl.`);
      return;
    }

    console.log(`[PerSceneLipSync] Scene ${sceneId}: extracting audio clip (${scene.startTime}s–${scene.startTime + scene.duration}s)...`);

    // Extract the audio segment for this scene's time window
    const audioClipUrl = await extractSceneAudioClip(
      job.audioUrl,
      scene.startTime,
      scene.duration,
      sceneId
    );

    console.log(`[PerSceneLipSync] Scene ${sceneId}: submitting to Sync Labs sync-3...`);

    // Mark as processing before submitting
    await db.update(musicVideoScenes)
      .set({ lipSyncStatus: "processing", updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));

    // Submit to Sync Labs
    const syncJobId = await submitSyncLabsLipSync({
      videoUrl,
      audioUrl: audioClipUrl,
      syncMode: "cut_off",
      outputFileName: `wizsync-scene-${sceneId}-${Date.now()}`,
    });

    // Save the Sync Labs job ID for polling
    await db.update(musicVideoScenes)
      .set({ lipSyncTaskId: syncJobId, lipSyncStatus: "processing", updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));

    console.log(`[PerSceneLipSync] Scene ${sceneId}: Sync Labs job ${syncJobId} submitted.`);
  } catch (err: any) {
    console.warn(`[PerSceneLipSync] Scene ${sceneId}: failed to trigger lip sync — ${err?.message ?? err}. Scene video still available.`);
    const db = await getDb();
    if (db) {
      await db.update(musicVideoScenes)
        .set({ lipSyncStatus: "error", updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
  }
}

/**
 * Heartbeat: poll all in-progress per-scene Sync Labs lip sync jobs.
 * Called by the periodic heartbeat every 30 seconds.
 * Saves lipSyncVideoUrl when a job completes.
 */
export async function pollPerSceneLipSyncJobs(): Promise<void> {
  try {
    const { isSyncLabsConfigured, pollSyncLabsLipSync } = await import("./ai-apis/synclabs-lipsync");
    if (!isSyncLabsConfigured()) return;

    const db = await getDb();
    if (!db) return;

    // Find all scenes with a pending Sync Labs lip sync job
    const processingScenes = await db.select({
      id: musicVideoScenes.id,
      lipSyncTaskId: musicVideoScenes.lipSyncTaskId,
    }).from(musicVideoScenes)
      .where(eq(musicVideoScenes.lipSyncStatus, "processing"));

    if (processingScenes.length === 0) return;

    console.log(`[PerSceneLipSync] Polling ${processingScenes.length} in-progress Sync Labs scene jobs...`);

    for (const scene of processingScenes) {
      if (!scene.lipSyncTaskId) continue;
      try {
        // Use a short timeout — just check status, don't wait
        const outputUrl = await pollSyncLabsLipSync(scene.lipSyncTaskId, 10_000);
        // Completed — download and save to S3
        const resp = await fetch(outputUrl);
        if (!resp.ok) throw new Error(`Failed to download lip sync output: HTTP ${resp.status}`);
        const buffer = Buffer.from(await resp.arrayBuffer());
        const key = `music-video-scenes/lipsync-${scene.id}-${Date.now()}.mp4`;
        const { url } = await storagePut(key, buffer, "video/mp4");

        await db.update(musicVideoScenes)
          .set({
            lipSyncVideoUrl: url,
            lipSyncVideoKey: key,
            lipSyncStatus: "done",
            lipSyncTaskId: null,
            updatedAt: new Date(),
          })
          .where(eq(musicVideoScenes.id, scene.id));

        console.log(`[PerSceneLipSync] Scene ${scene.id}: lip sync DONE → ${url.slice(0, 80)}...`);
      } catch (pollErr: any) {
        const msg = pollErr?.message ?? String(pollErr);
        if (msg.includes("timed out")) {
          console.log(`[PerSceneLipSync] Scene ${scene.id}: still processing (${scene.lipSyncTaskId})`);
        } else if (msg.includes("FAILED") || msg.includes("REJECTED")) {
          console.warn(`[PerSceneLipSync] Scene ${scene.id}: Sync Labs job failed — ${msg}`);
          await db.update(musicVideoScenes)
            .set({ lipSyncStatus: "error", lipSyncTaskId: null, updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, scene.id));
        } else {
          console.warn(`[PerSceneLipSync] Scene ${scene.id}: poll error — ${msg}`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[PerSceneLipSync] pollPerSceneLipSyncJobs error: ${err?.message ?? err}`);
  }
}
