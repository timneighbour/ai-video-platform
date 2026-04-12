/**
 * promptBuilder.ts — Unified Scene Prompt Builder
 *
 * Single authoritative prompt builder for ALL scene generation.
 * Replaces scattered prompt blocks with a structured, priority-weighted system.
 *
 * Priority weights (higher = placed earlier in prompt):
 *   identity: 10
 *   outfit:    9
 *   props:     8
 *   role:      8
 *   scene:     5
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LockedRules {
  role: string;
  mustHave?: string[];
  allowedProps?: string[];
  forbidden?: string[];
}

export interface LockedOutfit {
  jacket?: string;
  shirt?: string;
  trousers?: string;
  shoes?: string;
  accessories?: string;
  [key: string]: string | undefined;
}

export interface LockedProps {
  instrument?: string;
  mic?: string;
  other?: string;
  [key: string]: string | undefined;
}

export interface UnifiedCharacter {
  name: string;
  lockedIdentity: string;      // Full visual description (face, hair, skin, build)
  lockedOutfit: LockedOutfit | string;   // Structured outfit data (or JSON string from DB)
  lockedProps: LockedProps | string;     // Structured props data (or JSON string from DB)
  lockedPosition: string;      // Default position (e.g. "at microphone", "behind drum kit")
  lockedRole: string;          // e.g. "Lead Singer and Guitarist"
  lockedRules: LockedRules | string;    // Strict behavioural rules (or JSON string from DB)
  isPrimary: boolean;          // Whether this is the primary focus character
  referenceImageUrl?: string;  // Face reference photo URL
  masterPortraitUrl?: string;  // Generated master portrait URL
  masterSeed?: number;         // Seed for deterministic generation
}

// --- Safe JSON parser for DB values (handles both objects and JSON strings) ---
function safeParseJSON<T>(val: T | string | null | undefined, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

/** Normalise a character's JSON fields from DB strings to typed objects */
function normaliseChar(c: UnifiedCharacter): {
  name: string;
  lockedIdentity: string;
  lockedOutfit: LockedOutfit;
  lockedProps: LockedProps;
  lockedPosition: string;
  lockedRole: string;
  lockedRules: LockedRules;
  isPrimary: boolean;
} {
  return {
    name: c.name,
    lockedIdentity: c.lockedIdentity,
    lockedOutfit: safeParseJSON<LockedOutfit>(c.lockedOutfit, {}),
    lockedProps: safeParseJSON<LockedProps>(c.lockedProps, {}),
    lockedPosition: c.lockedPosition || "",
    lockedRole: c.lockedRole || "",
    lockedRules: safeParseJSON<LockedRules>(c.lockedRules, { role: c.lockedRole || "" }),
    isPrimary: c.isPrimary ?? false,
  };
}

export interface SceneInput {
  scenePrompt: string;
  sceneType: string;
  strictCharacterCount?: number;
  durationSeconds?: number;
}

export interface PromptBuilderInput {
  scene: SceneInput;
  characters: UnifiedCharacter[];
  strictMode?: boolean;
}

// ─── Priority Constants ───────────────────────────────────────────────────────

export const PRIORITY = {
  identity: 10,
  outfit: 9,
  props: 8,
  role: 8,
  scene: 5,
} as const;

// ─── 1. buildSceneHeader ──────────────────────────────────────────────────────

export function buildSceneHeader(scene: SceneInput): string {
  return `
STRICT SCENE COMPOSITION:

- Exactly ${scene.strictCharacterCount || 3} people on stage
- No more, no less
- No background performers
- No audience visible in foreground

Scene type: ${scene.sceneType}
Camera: cinematic, medium to close-up (faces clearly visible)
Duration: ${scene.durationSeconds || 5} seconds
`.trim();
}

// ─── 2. buildCharacterBlock ───────────────────────────────────────────────────

export function buildCharacterBlock(characters: UnifiedCharacter[]): string {
  // Sort: primary characters first (highest priority in prompt)
  const sorted = [...characters].sort((a, b) => {
    const aPrimary = (typeof a.isPrimary === "boolean" ? a.isPrimary : false) ? 1 : 0;
    const bPrimary = (typeof b.isPrimary === "boolean" ? b.isPrimary : false) ? 1 : 0;
    return bPrimary - aPrimary;
  });

  return sorted
    .map((rawC, i) => {
      const c = normaliseChar(rawC);

      const outfitLines = Object.entries(c.lockedOutfit)
        .filter(([, v]) => v && v !== "none")
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n");

      const propLines = Object.entries(c.lockedProps)
        .filter(([, v]) => v && v !== "none")
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n");

      const mustHaveLines = c.lockedRules.mustHave?.map((r) => `  - ${r}`).join("\n") || "  (none)";
      const forbiddenLines = c.lockedRules.forbidden?.map((r) => `  - DO NOT: ${r}`).join("\n") || "  (none)";

      const outfitValues = Object.values(c.lockedOutfit).filter((v) => v && v !== "none");
      const propValues = Object.values(c.lockedProps).filter((v) => v && v !== "none");
      const outfitForbidden = c.lockedRules.forbidden?.filter((f) => {
        const fl = f.toLowerCase();
        return fl.includes("wearing") || fl.includes("jacket") || fl.includes("shirt") || fl.includes("sleeveless") || fl.includes("hoodie") || fl.includes("vest") || fl.includes("tank");
      }) || [];

      return `
Character ${i + 1}: ${c.name}

ROLE:
  ${c.lockedRules.role || c.lockedRole}

IDENTITY (LOCKED - DO NOT CHANGE):
  ${c.lockedIdentity}

OUTFIT (MANDATORY - DO NOT CHANGE):
${outfitLines}

PROPS (MANDATORY):
${propLines}

POSITION (MANDATORY):
  ${c.lockedPosition}

RULES (MUST FOLLOW):
${mustHaveLines}

FORBIDDEN (NEVER DO THIS):
${forbiddenLines}

--- REPEAT FOR REINFORCEMENT ---
${c.name} is wearing: ${outfitValues.join(", ")}.
${c.name} is NOT wearing: ${outfitForbidden.length > 0 ? outfitForbidden.join(", ") : "nothing forbidden"}.
${c.name} is holding: ${propValues.join(", ") || "nothing"}.
${c.name} position: ${c.lockedPosition}.
`.trim();
    })
    .join("\n\n");
}

// ─── 3. buildRulesBlock ───────────────────────────────────────────────────────

export function buildRulesBlock(characters: UnifiedCharacter[]): string {
  // Build per-character outfit cross-checks
  const crossChecks = characters
    .map((rawC) => {
      const c = normaliseChar(rawC);
      const forbidden = c.lockedRules.forbidden || [];
      return forbidden.length > 0
        ? `- ${c.name}: MUST NOT ${forbidden.join(", MUST NOT ")}`
        : "";
    })
    .filter(Boolean)
    .join("\n");

  return `
GLOBAL HARD RULES:

- Each character must match their identity EXACTLY
- No swapping roles between characters
- No changing outfits from what is specified above
- No missing characters — all ${characters.length} must be present
- No duplicate characters
- No extra people under ANY circumstances

- Vocalist MUST be at microphone
- Drummer MUST be behind drum kit
- Bassist MUST hold bass guitar

- If rules conflict → PRIORITISE CHARACTER RULES OVER SCENE

CHARACTER-SPECIFIC CROSS-CHECKS:
${crossChecks}

Outfits must remain consistent across all scenes.

STRICT MODE: ENABLED
`.trim();
}

// ─── 4. buildSceneDetails ─────────────────────────────────────────────────────

export function buildSceneDetails(scene: SceneInput): string {
  return `
SCENE DETAILS:

${scene.scenePrompt}

Lighting: cinematic stage lighting
Style: ultra-realistic, high detail, professional music video
`.trim();
}

// ─── 5. buildNegativePrompt ───────────────────────────────────────────────────

export function buildNegativePrompt(): string {
  return `
NEGATIVE PROMPT:

extra people,
duplicate people,
crowd,
audience,
background performers,

wrong character,
different face,
identity drift,

wrong outfit,
costume change,
leather jacket on wrong person,
missing jacket,

wrong instrument,
missing instrument,

text,
logo,
signage,
neon words,
watermark,

blurry faces,
small faces,
wide arena shots
`.trim();
}

// ─── Main: buildScenePrompt ──────────────────────────────────────────────────

export function buildScenePrompt({
  scene,
  characters,
  strictMode = true,
}: PromptBuilderInput): { prompt: string; negativePrompt: string } {
  if (!strictMode) {
    // Fallback: just use the scene prompt directly (no character enforcement)
    return {
      prompt: scene.scenePrompt,
      negativePrompt: "",
    };
  }

  // Build blocks in PRIORITY order: identity(10) > outfit(9) > props(8) > role(8) > scene(5)
  const prompt = `
${buildSceneHeader(scene)}

${buildCharacterBlock(characters)}

${buildRulesBlock(characters)}

${buildSceneDetails(scene)}
`.trim();

  const negativePrompt = buildNegativePrompt();

  return { prompt, negativePrompt };
}

// ─── Validation Helper ────────────────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean;
  faceCount: number;
  hasText: boolean;
  correctRoles: boolean;
  issues: string[];
}

/**
 * Build a vision-based validation prompt to check if a generated image
 * matches the character constraints. This prompt is sent to the LLM
 * with the generated image for analysis.
 */
export function buildValidationPrompt(characters: UnifiedCharacter[]): string {
  const charChecks = characters
    .map((rawC) => {
      const c = normaliseChar(rawC);
      return `
- ${c.name}: Should be ${c.lockedRules.role}. Wearing ${Object.values(c.lockedOutfit).filter((v) => v && v !== "none").join(", ")}. Holding ${Object.values(c.lockedProps).filter((v) => v && v !== "none").join(", ") || "nothing specific"}. Position: ${c.lockedPosition}.`;
    })
    .join("\n");

  return `
Analyse this image and check the following constraints. Return JSON only.

EXPECTED CHARACTERS (exactly ${characters.length}):
${charChecks}

CHECK:
1. faceCount: How many distinct people are visible? (number)
2. hasText: Is there any text, logo, signage, or watermark visible? (boolean)
3. correctRoles: Does each character match their expected role, outfit, and position? (boolean)
4. issues: List any violations found. (string array, empty if all good)

Return format:
{
  "faceCount": number,
  "hasText": boolean,
  "correctRoles": boolean,
  "issues": ["issue1", "issue2"]
}
`.trim();
}

// ─── Portrait Prompt Builder ──────────────────────────────────────────────────

/**
 * Build a portrait prompt for a single character.
 * Used for master portrait generation and character preview.
 */
export function buildPortraitPrompt(character: UnifiedCharacter): string {
  const c = normaliseChar(character);
  const outfitDesc = Object.values(c.lockedOutfit).filter((v) => v && v !== "none").join(", ");
  const propsDesc = Object.values(c.lockedProps).filter((v) => v && v !== "none").join(", ");
  const forbidden = c.lockedRules.forbidden?.join(", ") || "";

  return `
FULL-BODY PORTRAIT, head to toe, showing feet and shoes. Wide framing. Full standing pose.

${c.lockedIdentity}

OUTFIT (MANDATORY): ${outfitDesc}
PROPS: ${propsDesc}
POSITION: ${c.lockedPosition}

MUST SHOW: Full body from head to feet. Standing pose. Shoes visible.
MUST NOT: ${forbidden}. Close-up. Headshot. Bust shot. Cropped at waist. Cropped at chest.

Style: ultra-realistic, high detail, cinematic lighting, professional photography.
DO NOT crop. DO NOT zoom in. Show the COMPLETE person from head to toe.
`.trim();
}
