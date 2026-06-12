/**
 * wiz-quality-lock.ts — WIZ Quality Lock™
 *
 * Automated pre-flight and post-render validation gate.
 *
 * PURPOSE:
 *   Prevent wasted API spend by catching bad renders BEFORE they proceed to
 *   expensive downstream steps (HeyGen lip sync, assembly, etc.).
 *
 * TWO GATES:
 *
 *   GATE 1 — PRE-FLIGHT (before dispatch)
 *     Validates that all required inputs are present and correct before
 *     submitting a scene to a render provider. Issues are logged as warnings.
 *     Checks:
 *       ✓ Storyboard image is set (previewImageUrl not NULL)
 *       ✓ Storyboard image URL resolves (HTTP 200)
 *       ✓ Character portrait is set for performance scenes
 *       ✓ Vocal stem is set for lip-sync scenes
 *       ✓ Prompt is within provider limits
 *       ✓ Aspect ratio is valid
 *
 *   GATE 2 — POST-RENDER (after video URL received)
 *     Validates the returned video before proceeding to lip sync.
 *     Checks:
 *       ✓ Video URL resolves (HTTP 200)
 *       ✓ Content-Type is video/*
 *       ✓ AI vision check: no grey background, character visible, head not cropped
 *     On failure: scene is reset to pending (free retry, no charge for lip sync)
 *
 * COST PROTECTION:
 *   Each lip sync costs ~$0.10–0.50.
 *   Each scene render costs $0.64.
 *   Catching a bad render at Gate 2 saves the lip sync cost entirely.
 *   Catching at Gate 1 saves the full render + lip sync cost.
 *
 * FAIL-SAFE:
 *   Both gates default to PASS on any unexpected error (prefer false negatives
 *   over blocking good renders). Only clear, confident failures are rejected.
 */

import { invokeLLM } from "./_core/llm";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PreFlightCheck {
  passed: boolean;
  blockedReason?: string;
  warnings: string[];
  checks: {
    storyboardImageSet: boolean;
    storyboardImageReachable: boolean;
    characterPortraitSet: boolean;
    vocalStemSet: boolean;
    promptLengthOk: boolean;
    aspectRatioValid: boolean;
  };
}

export interface PostRenderCheck {
  passed: boolean;
  rejectedReason?: string;
  shouldRetry: boolean;
  checks: {
    videoUrlReachable: boolean;
    contentTypeOk: boolean;
    aiVisionPassed: boolean;
    aiVisionReason?: string;
    aiVisionConfidence?: "high" | "medium" | "low";
    failureCategory?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE 1: PRE-FLIGHT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run pre-flight checks before dispatching a scene to a render provider.
 *
 * @param params  All required inputs for the render
 * @returns PreFlightCheck — passed=true means safe to dispatch
 */
export async function runPreFlightCheck(params: {
  sceneId: number;
  sceneIndex: number;
  prompt: string;
  aspectRatio: string;
  previewImageUrl?: string | null;
  characterImageUrl?: string | null;
  stemVocalsUrl?: string | null;
  lipSync: boolean;
  isPerformanceScene: boolean;
  maxPromptChars?: number;
}): Promise<PreFlightCheck> {
  const {
    sceneId,
    sceneIndex,
    prompt,
    aspectRatio,
    previewImageUrl,
    characterImageUrl,
    stemVocalsUrl,
    lipSync,
    isPerformanceScene,
    maxPromptChars = 480,
  } = params;

  const warnings: string[] = [];
  const checks: PreFlightCheck["checks"] = {
    storyboardImageSet: false,
    storyboardImageReachable: false,
    characterPortraitSet: false,
    vocalStemSet: false,
    promptLengthOk: false,
    aspectRatioValid: false,
  };

  // ── Check 1: Storyboard image set ─────────────────────────────────────────
  checks.storyboardImageSet = !!(previewImageUrl && previewImageUrl.trim().length > 0);
  if (!checks.storyboardImageSet) {
    warnings.push(`Scene ${sceneId} (S${sceneIndex + 1}): storyboardImageUrl is NULL — will use text-to-video (no character lock)`);
  }

  // ── Check 2: Storyboard image reachable ───────────────────────────────────
  if (checks.storyboardImageSet && previewImageUrl) {
    try {
      const resp = await fetch(previewImageUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      checks.storyboardImageReachable = resp.ok;
      if (!resp.ok) {
        console.warn(`[QualityLock] Scene ${sceneId} PRE-FLIGHT: storyboard image returned HTTP ${resp.status} — ${previewImageUrl.slice(0, 80)}`);
        warnings.push(`Scene ${sceneId}: storyboard image URL returned HTTP ${resp.status}`);
      }
    } catch (err: any) {
      checks.storyboardImageReachable = false;
      warnings.push(`Scene ${sceneId}: storyboard image URL unreachable (${String(err?.message ?? err).slice(0, 60)})`);
    }
  } else {
    checks.storyboardImageReachable = false;
  }

  // ── Check 3: Character portrait set ───────────────────────────────────────
  checks.characterPortraitSet = !!(characterImageUrl && characterImageUrl.trim().length > 0);
  if (isPerformanceScene && !checks.characterPortraitSet) {
    warnings.push(`Scene ${sceneId} (S${sceneIndex + 1}): performance scene has no character portrait — rendering text-only`);
  }

  // ── Check 4: Vocal stem set for lip-sync scenes ────────────────────────────
  checks.vocalStemSet = !!(stemVocalsUrl && stemVocalsUrl.trim().length > 0);
  if (lipSync && isPerformanceScene && !checks.vocalStemSet) {
    warnings.push(`Scene ${sceneId} (S${sceneIndex + 1}): lip-sync scene has no vocal stem — will use full-mix fallback`);
  }

  // ── Check 5: Prompt length ─────────────────────────────────────────────────
  checks.promptLengthOk = prompt.length <= maxPromptChars;
  if (!checks.promptLengthOk) {
    warnings.push(`Scene ${sceneId}: prompt is ${prompt.length} chars (max ${maxPromptChars}) — will be truncated`);
  }

  // ── Check 6: Aspect ratio valid ────────────────────────────────────────────
  const validRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
  checks.aspectRatioValid = validRatios.includes(aspectRatio);
  if (!checks.aspectRatioValid) {
    warnings.push(`Scene ${sceneId}: invalid aspect ratio '${aspectRatio}' — will default to 16:9`);
  }

  // ── BLOCK DECISION ─────────────────────────────────────────────────────────
  // All checks are warnings only for now (prefer false negatives over blocking good renders).
  const passed = true;
  const blockedReason: string | undefined = undefined;

  if (warnings.length > 0) {
    console.warn(`[QualityLock] Scene ${sceneId} PRE-FLIGHT WARNINGS (${warnings.length}):\n  ${warnings.join("\n  ")}`);
  } else {
    console.log(`[QualityLock] Scene ${sceneId} PRE-FLIGHT PASSED ✓ (storyboard=${checks.storyboardImageSet ? "SET" : "NULL"}, portrait=${checks.characterPortraitSet ? "SET" : "NULL"}, stem=${checks.vocalStemSet ? "SET" : "NULL"})`);
  }

  return { passed, blockedReason, warnings, checks };
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE 2: POST-RENDER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run post-render checks after a video URL is received from the provider.
 * If this gate fails, the scene should be reset to pending (free retry).
 *
 * @param params  Video URL and scene context
 * @returns PostRenderCheck — passed=true means safe to proceed to lip sync
 */
export async function runPostRenderCheck(params: {
  sceneId: number;
  sceneIndex: number;
  videoUrl: string;
  isPerformanceScene: boolean;
  requiresPopulation?: boolean;
  storyboardImageUrl?: string | null;
  skipAiVision?: boolean; // set true for cinematic scenes (no character to check)
}): Promise<PostRenderCheck> {
  const {
    sceneId,
    sceneIndex,
    videoUrl,
    isPerformanceScene,
    requiresPopulation = false,
    skipAiVision = !isPerformanceScene,
  } = params;

  const checks: PostRenderCheck["checks"] = {
    videoUrlReachable: false,
    contentTypeOk: false,
    aiVisionPassed: false,
  };

  // ── Check 1: Video URL reachable ───────────────────────────────────────────
  try {
    const resp = await fetch(videoUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    checks.videoUrlReachable = resp.ok;
    if (!resp.ok) {
      console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER: video URL returned HTTP ${resp.status}`);
      return {
        passed: false,
        rejectedReason: `Video URL returned HTTP ${resp.status} — provider may have failed silently`,
        shouldRetry: true,
        checks,
      };
    }
    // ── Check 2: Content-Type is video ──────────────────────────────────────
    const contentType = resp.headers.get("content-type") ?? "";
    checks.contentTypeOk = contentType.startsWith("video/") || contentType.includes("octet-stream") || videoUrl.includes(".mp4");
    if (!checks.contentTypeOk) {
      console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER: unexpected content-type '${contentType}' — warning only`);
    }
  } catch (err: any) {
    checks.videoUrlReachable = false;
    console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER: video URL unreachable (${String(err?.message ?? err).slice(0, 80)})`);
    return {
      passed: false,
      rejectedReason: `Video URL unreachable: ${String(err?.message ?? err).slice(0, 120)}`,
      shouldRetry: true,
      checks,
    };
  }

  // ── Check 3: AI Vision check (performance scenes only) ────────────────────
  if (skipAiVision) {
    checks.aiVisionPassed = true;
    console.log(`[QualityLock] Scene ${sceneId} POST-RENDER PASSED ✓ (cinematic — AI vision skipped)`);
    return { passed: true, shouldRetry: false, checks };
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: `You are a quality control inspector for a professional AI music video platform.
Your job is to inspect rendered video clips and determine if they meet minimum quality standards.
You must be STRICT about grey/blank backgrounds and character visibility — these are the most common failure modes.
You must be LENIENT about artistic quality — do not reject clips for style, colour grading, or minor imperfections.
Always return valid JSON only.`,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `Inspect this music video clip (Scene ${sceneIndex + 1}) and check:

1. REAL BACKGROUND: Is there a real, detailed environment visible? (NOT grey, white, or solid colour)
2. CHARACTER VISIBLE: Is a human character clearly visible in the frame?
3. HEAD NOT CROPPED: Is the character's head fully visible (crown AND chin both in frame)?
4. FACE SIZE ADEQUATE: Does the character's face occupy at least 8% of the frame area?
${requiresPopulation ? "5. POPULATION PRESENT: Are orchestra/audience/musicians visible in the background?" : "5. POPULATION: Not required for this scene."}

FAIL if ANY of these are true:
- Grey, white, or solid-colour background (most common failure)
- No character visible
- Head cropped at top or bottom
- Face too small (character is a tiny figure in a wide shot)
${requiresPopulation ? "- Empty hall/studio when orchestra/audience was required" : ""}

Video URL: ${videoUrl}

Return JSON: { "passed": boolean, "reason": string (max 100 words), "confidence": "high"|"medium"|"low", "failureCategory": string|null, "hasRealBackground": boolean, "characterVisible": boolean, "headCropDetected": boolean, "faceSizeAdequate": boolean }`,
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
          name: "wiz_quality_lock_v1",
          strict: true,
          schema: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              reason: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              failureCategory: { type: ["string", "null"] },
              hasRealBackground: { type: "boolean" },
              characterVisible: { type: "boolean" },
              headCropDetected: { type: "boolean" },
              faceSizeAdequate: { type: "boolean" },
            },
            required: ["passed", "reason", "confidence", "failureCategory", "hasRealBackground", "characterVisible", "headCropDetected", "faceSizeAdequate"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      // LLM returned nothing — default to PASS (fail-safe)
      console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER: AI vision returned empty — defaulting to PASS`);
      checks.aiVisionPassed = true;
      return { passed: true, shouldRetry: false, checks };
    }

    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsed = JSON.parse(content);

    checks.aiVisionPassed = parsed.passed;
    checks.aiVisionReason = parsed.reason;
    checks.aiVisionConfidence = parsed.confidence;
    checks.failureCategory = parsed.failureCategory ?? undefined;

    if (!parsed.passed) {
      // Only reject on HIGH or MEDIUM confidence failures to avoid false positives
      const shouldReject = parsed.confidence === "high" || parsed.confidence === "medium";
      if (shouldReject) {
        console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER REJECTED ✗ (confidence=${parsed.confidence}): ${parsed.reason}`);
        console.warn(`[QualityLock] Scene ${sceneId} failure details: bg=${parsed.hasRealBackground}, char=${parsed.characterVisible}, headCrop=${parsed.headCropDetected}, faceSize=${parsed.faceSizeAdequate}`);
        return {
          passed: false,
          rejectedReason: `Quality check failed (${parsed.confidence} confidence): ${parsed.reason}`,
          shouldRetry: true,
          checks,
        };
      } else {
        // Low confidence failure — warn but pass (prefer false negatives)
        console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER: quality issue flagged (LOW confidence — passing): ${parsed.reason}`);
        checks.aiVisionPassed = true;
      }
    } else {
      console.log(`[QualityLock] Scene ${sceneId} POST-RENDER PASSED ✓ (${parsed.reason.slice(0, 80)})`);
    }

    return { passed: true, shouldRetry: false, checks };

  } catch (visionErr: any) {
    // AI vision failed — default to PASS (fail-safe)
    console.warn(`[QualityLock] Scene ${sceneId} POST-RENDER: AI vision error (defaulting to PASS): ${String(visionErr?.message ?? visionErr).slice(0, 120)}`);
    checks.aiVisionPassed = true;
    return { passed: true, shouldRetry: false, checks };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a quality lock rejection for DB storage (max 200 chars).
 */
export function formatQualityLockRejection(check: PostRenderCheck): string {
  return `QUALITY_LOCK_REJECTED: ${check.rejectedReason ?? "unknown reason"}`.slice(0, 200);
}
