/**
 * raw-scene-validator.ts
 *
 * NEW PIPELINE GATE (2026-05-28) — Validate raw Seedance output before lip-sync.
 * UPGRADED (2026-05-28) — Added perception-level quality checks per architecture review.
 *
 * Purpose:
 *   Before submitting a raw Seedance clip to InfiniteTalk for lip-sync correction,
 *   visually confirm the clip already looks like a real music video shot.
 *
 * PASS conditions (ALL must be true for a performance scene to proceed):
 *   ✓ Real background — character is inside a real environment (not grey/blank/solid)
 *   ✓ Character face visible and forward-facing (essential for lip-sync)
 *   ✓ Head NOT cropped — crown and chin both visible (no head crop failure)
 *   ✓ Face large enough — face occupies sufficient frame area for believable singing
 *   ✓ Population present — if orchestra/audience was required, they are visible
 *   ✓ Framing adequate — character is the primary focus of the frame
 *   ✓ Environment real — not a flat, empty, or sterile AI room
 *
 * FAIL conditions (any one of these causes rejection):
 *   ✗ Grey or blank background
 *   ✗ Character appears to be a cutout or pasted element
 *   ✗ Head crop — crown or chin cut off by frame edge
 *   ✗ Face too small — face occupies less than 8% of frame area (too distant for singing)
 *   ✗ Missing population — empty hall/room when environment requires people
 *   ✗ Weak framing — character is not the primary subject
 *   ✗ Empty environment — sterile, flat, or AI-looking background
 *   → FAIL: reset scene to pending for re-generation (do NOT proceed to lip-sync)
 *
 * This gate is ONLY applied to performance scenes (lipSync=true) where a character
 * image was provided. Cinematic intercut scenes (no character) bypass this gate.
 *
 * Implementation:
 *   Uses the LLM vision API to inspect the video clip.
 *   Falls back to PASS if the LLM call fails (non-blocking — prefer false negatives).
 *
 * IMPORTANT: This is a soft gate. It catches obviously bad outputs but does NOT
 * attempt to judge artistic quality. The goal is to prevent InfiniteTalk API cost
 * being wasted on clips that will never look good.
 */

import { invokeLLM } from "./_core/llm";

export interface RawSceneValidationResult {
  passed: boolean;
  reason: string;
  confidence: "high" | "medium" | "low";
  failureCategory?: "grey_background" | "head_crop" | "face_too_small" | "missing_population" | "weak_framing" | "empty_environment" | "character_not_visible";
  details?: {
    hasRealBackground: boolean;
    characterVisible: boolean;
    greyBackgroundDetected: boolean;
    headCropDetected: boolean;
    faceSizeAdequate: boolean;
    populationPresent: boolean;
    framingAdequate: boolean;
    environmentDescription: string;
    populationDescription: string;
  };
}

/**
 * Validate a raw Seedance video clip before lip-sync submission.
 *
 * @param videoUrl            S3 URL of the raw Seedance video clip
 * @param sceneId             Scene ID (for logging)
 * @param sceneIndex          Scene index (for logging)
 * @param requiresPopulation  Whether the scene prompt required orchestra/audience (default: true for hall scenes)
 * @returns Validation result — passed=true means proceed to lip-sync
 */
export async function validateRawSceneForLipSync(
  videoUrl: string,
  sceneId: number,
  sceneIndex: number,
  requiresPopulation: boolean = false
): Promise<RawSceneValidationResult> {
  // Fallback: if we can't validate, PASS (prefer false negatives over blocking good clips)
  const fallbackPass: RawSceneValidationResult = {
    passed: true,
    reason: "Validation skipped (LLM unavailable) — proceeding to lip-sync",
    confidence: "low",
  };

  try {
    console.log(`[RawSceneValidator] Scene ${sceneId} (index ${sceneIndex}): validating raw clip before lip-sync (requiresPopulation=${requiresPopulation})...`);

    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: `You are a quality control inspector for AI-generated music video clips.
Your job is to determine whether a raw video clip is suitable for lip-sync enhancement.
You must check SEVEN quality criteria and return a structured assessment.

PASS criteria (ALL must be true for the clip to pass):
1. REAL BACKGROUND: The character is physically present INSIDE a real environment (recording studio, concert hall, outdoor location, etc.). The background shows a real environment — NOT grey, NOT blank, NOT a solid colour.
2. CHARACTER VISIBLE: The character's face is visible and forward-facing in the frame.
3. NO HEAD CROP: The character's head is NOT cropped — both the crown (top of head) and chin are fully visible within the frame. Cropped crown or chin = FAIL.
4. FACE SIZE ADEQUATE: The character's face occupies at least 8% of the total frame area. If the character is so small or distant that their face is barely visible, it FAILS (too small for believable singing).
5. POPULATION PRESENT (if required): If the scene was supposed to show an orchestra, audience, or session musicians, they must be visible. An empty hall when people were required = FAIL.
6. FRAMING ADEQUATE: The character is the primary subject of the frame. If the character is a tiny element in a wide landscape shot, it FAILS for a performance scene.
7. ENVIRONMENT REAL: The background shows a real, detailed environment — not a flat, empty, sterile, or AI-looking room. A plain white or grey wall is not an environment.

FAIL conditions (any single one causes rejection):
- Grey, white, or solid-colour background
- Character appears to be floating or composited (cutout look)
- Crown of head cut off by frame edge
- Chin cut off by frame edge
- Face too small (less than 8% of frame)
- Empty hall/studio when orchestra or audience was required
- Character is a tiny figure in a wide shot (not suitable for lip-sync)
- Flat, empty, sterile background with no environmental detail

Return ONLY valid JSON, no markdown, no explanation.`,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `Inspect this music video clip and determine if it passes all 7 quality checks.
${requiresPopulation ? "NOTE: This scene REQUIRES orchestra/audience/session musicians to be visible in the background. An empty hall = FAIL." : "NOTE: This scene does not require specific background population."}

Video URL: ${videoUrl}

Return a JSON object with:
- passed: boolean (true = ALL 7 checks pass, false = any check fails)
- reason: string (brief explanation of pass or failure, max 120 words)
- confidence: "high" | "medium" | "low"
- failureCategory: one of "grey_background" | "head_crop" | "face_too_small" | "missing_population" | "weak_framing" | "empty_environment" | "character_not_visible" | null (null if passed)
- hasRealBackground: boolean
- characterVisible: boolean
- greyBackgroundDetected: boolean
- headCropDetected: boolean (true if crown OR chin is cut off)
- faceSizeAdequate: boolean (true if face is large enough for lip-sync — at least 8% of frame)
- populationPresent: boolean (true if orchestra/audience/musicians visible OR if population was not required)
- framingAdequate: boolean (true if character is the primary subject)
- environmentDescription: string (describe what you see in the background, max 60 words)
- populationDescription: string (describe who/what is visible in the background beyond the main character, max 40 words)`,
            },
            {
              type: "file_url" as const,
              file_url: {
                url: videoUrl,
                mime_type: "video/mp4" as const,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "raw_scene_validation_v2",
          strict: true,
          schema: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              reason: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              failureCategory: {
                type: ["string", "null"],
                enum: ["grey_background", "head_crop", "face_too_small", "missing_population", "weak_framing", "empty_environment", "character_not_visible", null],
              },
              hasRealBackground: { type: "boolean" },
              characterVisible: { type: "boolean" },
              greyBackgroundDetected: { type: "boolean" },
              headCropDetected: { type: "boolean" },
              faceSizeAdequate: { type: "boolean" },
              populationPresent: { type: "boolean" },
              framingAdequate: { type: "boolean" },
              environmentDescription: { type: "string" },
              populationDescription: { type: "string" },
            },
            required: [
              "passed", "reason", "confidence", "failureCategory",
              "hasRealBackground", "characterVisible", "greyBackgroundDetected",
              "headCropDetected", "faceSizeAdequate", "populationPresent",
              "framingAdequate", "environmentDescription", "populationDescription",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      console.warn(`[RawSceneValidator] Scene ${sceneId}: LLM returned empty response — defaulting to PASS`);
      return fallbackPass;
    }

    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);

    const result: RawSceneValidationResult = {
      passed: parsed.passed,
      reason: parsed.reason,
      confidence: parsed.confidence,
      failureCategory: parsed.failureCategory ?? undefined,
      details: {
        hasRealBackground: parsed.hasRealBackground,
        characterVisible: parsed.characterVisible,
        greyBackgroundDetected: parsed.greyBackgroundDetected,
        headCropDetected: parsed.headCropDetected,
        faceSizeAdequate: parsed.faceSizeAdequate,
        populationPresent: parsed.populationPresent,
        framingAdequate: parsed.framingAdequate,
        environmentDescription: parsed.environmentDescription,
        populationDescription: parsed.populationDescription,
      },
    };

    if (result.passed) {
      console.log(`[RawSceneValidator] Scene ${sceneId} PASSED (${result.confidence} confidence): ${result.reason}`);
      console.log(`[RawSceneValidator] Scene ${sceneId} environment: "${result.details?.environmentDescription}"`);
    } else {
      console.warn(`[RawSceneValidator] Scene ${sceneId} FAILED [${result.failureCategory}] (${result.confidence} confidence): ${result.reason}`);
      console.warn(`[RawSceneValidator] Scene ${sceneId} environment: "${result.details?.environmentDescription}"`);
      console.warn(`[RawSceneValidator] Scene ${sceneId} population: "${result.details?.populationDescription}"`);
      // Log specific failure details
      if (result.details?.headCropDetected) console.warn(`[RawSceneValidator] Scene ${sceneId} ✗ HEAD CROP DETECTED`);
      if (!result.details?.faceSizeAdequate) console.warn(`[RawSceneValidator] Scene ${sceneId} ✗ FACE TOO SMALL`);
      if (!result.details?.populationPresent) console.warn(`[RawSceneValidator] Scene ${sceneId} ✗ MISSING POPULATION`);
      if (!result.details?.framingAdequate) console.warn(`[RawSceneValidator] Scene ${sceneId} ✗ WEAK FRAMING`);
      if (result.details?.greyBackgroundDetected) console.warn(`[RawSceneValidator] Scene ${sceneId} ✗ GREY BACKGROUND`);
    }

    return result;
  } catch (err: any) {
    console.warn(`[RawSceneValidator] Scene ${sceneId}: validation error (${String(err?.message ?? err).slice(0, 100)}) — defaulting to PASS`);
    return fallbackPass;
  }
}
