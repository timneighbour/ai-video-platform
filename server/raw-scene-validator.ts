/**
 * raw-scene-validator.ts
 *
 * NEW PIPELINE GATE (2026-05-28) — Validate raw Seedance output before lip-sync.
 *
 * Purpose:
 *   Before submitting a raw Seedance clip to InfiniteTalk for lip-sync correction,
 *   visually confirm the clip already looks like a real music video shot.
 *
 * If the raw Seedance clip shows:
 *   ✓ Character present in a real environment (hall, studio, outdoor, etc.)
 *   ✓ Character face visible and forward-facing
 *   ✓ Real background (not grey, not blank, not solid colour)
 *   → PASS: proceed to InfiniteTalk lip-sync correction
 *
 * If the raw Seedance clip shows:
 *   ✗ Grey or blank background
 *   ✗ Character appears to be a cutout or pasted element
 *   ✗ No recognisable environment
 *   → FAIL: reset scene to pending for re-generation (do NOT proceed to lip-sync)
 *
 * This gate is ONLY applied to performance scenes (lipSync=true) where a character
 * image was provided. Cinematic intercut scenes (no character) bypass this gate.
 *
 * Implementation:
 *   Uses the LLM vision API to inspect the first frame of the video.
 *   Falls back to PASS if the LLM call fails (non-blocking — prefer false negatives).
 *
 * IMPORTANT: This is a soft gate. It catches obviously bad outputs (grey background,
 * blank room) but does NOT attempt to judge artistic quality. The goal is to prevent
 * the InfiniteTalk API cost being wasted on a clip that will never look good.
 */

import { invokeLLM } from "./_core/llm";

export interface RawSceneValidationResult {
  passed: boolean;
  reason: string;
  confidence: "high" | "medium" | "low";
  details?: {
    hasRealBackground: boolean;
    characterVisible: boolean;
    greyBackgroundDetected: boolean;
    environmentDescription: string;
  };
}

/**
 * Validate a raw Seedance video clip before lip-sync submission.
 *
 * @param videoUrl   S3 URL of the raw Seedance video clip
 * @param sceneId    Scene ID (for logging)
 * @param sceneIndex Scene index (for logging)
 * @returns Validation result — passed=true means proceed to lip-sync
 */
export async function validateRawSceneForLipSync(
  videoUrl: string,
  sceneId: number,
  sceneIndex: number
): Promise<RawSceneValidationResult> {
  // Fallback: if we can't validate, PASS (prefer false negatives over blocking good clips)
  const fallbackPass: RawSceneValidationResult = {
    passed: true,
    reason: "Validation skipped (LLM unavailable) — proceeding to lip-sync",
    confidence: "low",
  };

  try {
    console.log(`[RawSceneValidator] Scene ${sceneId} (index ${sceneIndex}): validating raw clip before lip-sync...`);

    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: `You are a quality control inspector for AI-generated music video clips.
Your job is to determine whether a raw video clip is suitable for lip-sync enhancement.

A clip PASSES if:
- The character is physically present INSIDE a real environment (recording studio, concert hall, outdoor location, etc.)
- The character's face is visible and forward-facing
- The background shows a real environment (not grey, not blank, not a solid colour)
- The clip looks like it belongs in a real music video

A clip FAILS if:
- The background is grey, white, or a solid colour (this means the character was generated on a grey studio background)
- The character appears to be floating or pasted on a background
- There is no recognisable environment behind the character
- The clip looks like a portrait photo against a plain background

Return ONLY valid JSON, no markdown, no explanation.`,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `Inspect this music video clip and determine if it is suitable for lip-sync enhancement.
The clip should show a character performing INSIDE a real environment (recording studio, concert hall, etc.).
If the background is grey, blank, or a solid colour, the clip FAILS.

Video URL: ${videoUrl}

Return a JSON object with:
- passed: boolean (true = proceed to lip-sync, false = reject and re-generate)
- reason: string (brief explanation, max 100 words)
- confidence: "high" | "medium" | "low"
- hasRealBackground: boolean (true = real environment visible, false = grey/blank/solid)
- characterVisible: boolean (true = character face visible, false = no character or face not visible)
- greyBackgroundDetected: boolean (true = grey/blank background detected)
- environmentDescription: string (describe what you see in the background, max 50 words)`,
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
          name: "raw_scene_validation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              reason: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              hasRealBackground: { type: "boolean" },
              characterVisible: { type: "boolean" },
              greyBackgroundDetected: { type: "boolean" },
              environmentDescription: { type: "string" },
            },
            required: ["passed", "reason", "confidence", "hasRealBackground", "characterVisible", "greyBackgroundDetected", "environmentDescription"],
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
      details: {
        hasRealBackground: parsed.hasRealBackground,
        characterVisible: parsed.characterVisible,
        greyBackgroundDetected: parsed.greyBackgroundDetected,
        environmentDescription: parsed.environmentDescription,
      },
    };

    if (result.passed) {
      console.log(`[RawSceneValidator] Scene ${sceneId} PASSED (${result.confidence} confidence): ${result.reason}`);
    } else {
      console.warn(`[RawSceneValidator] Scene ${sceneId} FAILED (${result.confidence} confidence): ${result.reason}`);
      console.warn(`[RawSceneValidator] Scene ${sceneId} environment: "${result.details?.environmentDescription}"`);
    }

    return result;
  } catch (err: any) {
    console.warn(`[RawSceneValidator] Scene ${sceneId}: validation error (${String(err?.message ?? err).slice(0, 100)}) — defaulting to PASS`);
    return fallbackPass;
  }
}
