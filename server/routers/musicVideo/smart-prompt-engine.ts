/**
 * Smart Prompt Engine
 *
 * Takes raw scene intent, character details, venue DNA, and director's brief
 * and uses an LLM to synthesise a precise, cinematically directed image
 * generation prompt. This replaces the manual string-concatenation approach
 * with an intelligent, context-aware prompt writer.
 */

import { invokeLLM } from "../../_core/llm";

export interface SmartPromptInput {
  /** The scene's visual description from the storyboard */
  sceneDescription: string;
  /** The lyrics or narrative for this scene */
  lyricsSnippet?: string;
  /** The venue's full interior DNA text */
  venueDNA?: string;
  /** The venue display name (e.g. "Air Studios, Lyndhurst Hall") */
  venueDisplayName?: string;
  /** Character details for all characters in this scene */
  characters: Array<{
    name: string;
    description: string;
    outfit?: string;
    bodyBuild?: string;
    hairColour?: string;
    ethnicity?: string;
    age?: string;
    isMainArtist?: boolean;
  }>;
  /** Director's brief / overall creative vision */
  directorsBrief?: string;
  /** Music genre / mood */
  musicGenre?: string;
  /** Camera angle hint from scene */
  cameraAngle?: string;
  /** Whether this is a portrait/character-focused shot */
  isPortraitShot?: boolean;
}

export interface SmartPromptOutput {
  /** The synthesised, cinematically directed image generation prompt */
  prompt: string;
  /** Negative prompt to avoid common AI pitfalls */
  negativePrompt: string;
  /** Whether the LLM synthesis succeeded (falls back to raw concat if false) */
  synthesised: boolean;
}

const POP_STAR_BODY_LANGUAGE = `elegant, graceful, confident pop-star poise, radiant and healthy, 
poised and professional, natural elegant posture, flattering composition, 
beautiful proportions, photogenic stance, magazine-quality presentation`;

const BODY_BUILD_MAP: Record<string, string> = {
  slim: "slender, graceful figure, elegant slim silhouette, willowy and refined",
  lean: "lean, toned figure, athletic elegance, lithe and graceful",
  average: "graceful, healthy figure, natural elegance, beautiful proportions, radiant and poised — NOT generic or unflattering",
  athletic: "athletic, toned figure, strong and graceful, fit and elegant",
  stocky: "strong, confident figure, powerful and poised, commanding presence",
  muscular: "strong, muscular figure, powerful and confident, commanding physique",
  curvy: "curvaceous, confident figure, beautiful curves, glamorous and radiant",
  petite: "petite, delicate figure, graceful and refined, elegant small frame",
};

export async function synthesiseScenePrompt(input: SmartPromptInput): Promise<SmartPromptOutput> {
  // Build the character summary
  const characterSummary = input.characters.map(c => {
    const buildDesc = BODY_BUILD_MAP[c.bodyBuild ?? "average"] ?? BODY_BUILD_MAP.average;
    const parts = [
      `${c.name}${c.isMainArtist ? " (MAIN ARTIST — must be prominent and well-lit)" : ""}:`,
      c.description,
      c.outfit ? `Outfit: ${c.outfit}` : "",
      `Body: ${buildDesc}`,
      c.hairColour ? `Hair: ${c.hairColour}` : "",
      c.ethnicity ? `Ethnicity: ${c.ethnicity}` : "",
      c.age ? `Age: ${c.age}` : "",
    ].filter(Boolean);
    return parts.join(" | ");
  }).join("\n");

  const systemPrompt = `You are a world-class AI image prompt engineer specialising in music video storyboard photography. 
Your job is to take scene descriptions, character details, and venue information and write a single, precise, 
cinematically directed image generation prompt that will produce a stunning, professional, magazine-quality result.

CRITICAL RULES:
1. The venue/background MUST be described FIRST and in vivid architectural detail — it is the most important element
2. Characters must be described with pop-star quality: elegant, confident, beautifully lit, professionally presented
3. NEVER use vague terms like "average build" or "typical physique" — always use aspirational, flattering language
4. Camera angle, lighting, and composition must be explicitly specified
5. The prompt must be a single flowing paragraph of 150-250 words
6. End with technical quality markers: "ultra-detailed, 8K, professional photography, cinematic lighting, sharp focus"
7. DO NOT include any negative instructions in the main prompt — those go in the negative prompt only
8. The output must be JSON with fields: "prompt" (string) and "negativePrompt" (string)`;

  const userMessage = `Write a cinematic image generation prompt for this music video scene:

SCENE DESCRIPTION: ${input.sceneDescription}
${input.lyricsSnippet ? `LYRICS: "${input.lyricsSnippet}"` : ""}
${input.directorsBrief ? `DIRECTOR'S BRIEF: ${input.directorsBrief}` : ""}
${input.musicGenre ? `MUSIC GENRE/MOOD: ${input.musicGenre}` : ""}
${input.cameraAngle ? `CAMERA ANGLE: ${input.cameraAngle}` : ""}

VENUE (MUST appear prominently in background):
${input.venueDNA ?? "Professional music studio"}

CHARACTERS IN SCENE:
${characterSummary}

Write a prompt that:
1. Opens with the venue architecture (blue ceiling, Gothic arches, wooden canopy if Air Studios)
2. Places the character(s) naturally within that space
3. Uses flattering, pop-star quality language for all characters
4. Specifies warm golden lighting, professional photography quality
5. Ends with: "ultra-detailed, 8K resolution, professional music video photography, cinematic lighting, sharp focus, no watermarks"

Return JSON: { "prompt": "...", "negativePrompt": "..." }`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scene_prompt",
          strict: true,
          schema: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "The image generation prompt" },
              negativePrompt: { type: "string", description: "The negative prompt" },
            },
            required: ["prompt", "negativePrompt"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from LLM");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    if (!parsed?.prompt) throw new Error("No prompt in response");

    return {
      prompt: parsed.prompt,
      negativePrompt: parsed.negativePrompt || buildDefaultNegativePrompt(),
      synthesised: true,
    };
  } catch (err) {
    console.error("[SmartPromptEngine] LLM synthesis failed, using fallback:", err);
    return {
      prompt: buildFallbackPrompt(input),
      negativePrompt: buildDefaultNegativePrompt(),
      synthesised: false,
    };
  }
}

function buildFallbackPrompt(input: SmartPromptInput): string {
  const mainChar = input.characters.find(c => c.isMainArtist) ?? input.characters[0];
  const buildDesc = mainChar ? (BODY_BUILD_MAP[mainChar.bodyBuild ?? "average"] ?? BODY_BUILD_MAP.average) : "";
  const venueSummary = input.venueDNA
    ? `${input.venueDisplayName ?? "professional music studio"} — ${input.venueDNA.slice(0, 200)}`
    : "professional recording studio with warm cinematic lighting";

  return [
    venueSummary,
    input.sceneDescription,
    mainChar ? `${mainChar.name}: ${mainChar.description}, ${buildDesc}, ${mainChar.outfit ?? "elegant stage outfit"}` : "",
    "warm golden studio lighting, professional music video photography, cinematic composition",
    "ultra-detailed, 8K resolution, sharp focus, no watermarks",
  ].filter(Boolean).join(". ");
}

function buildDefaultNegativePrompt(): string {
  return [
    "ugly, deformed, disfigured, mutated, extra limbs, missing limbs, floating limbs",
    "bad anatomy, bad proportions, gross proportions, malformed hands, extra fingers",
    "blurry, out of focus, low quality, pixelated, grainy, noisy",
    "watermark, signature, text overlay, logo",
    "white background, grey background, plain background, studio backdrop, seamless background",
    "unflattering angle, bad lighting, harsh shadows, overexposed, underexposed",
    "microphone in hand, handheld microphone",
    "duplicate, clone, multiple copies of same person",
    "cartoon, anime, illustration, painting, drawing, sketch",
  ].join(", ");
}
