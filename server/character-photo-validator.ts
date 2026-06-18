/**
 * Character Photo Validator — Phase 1.4
 *
 * Validates a subscriber's uploaded character photo before any rendering begins.
 * Uses LLM vision to check all nine quality gates. Returns a structured result
 * so the frontend can show a specific, actionable rejection message.
 *
 * Checks:
 *  1. Face detected
 *  2. One person only
 *  3. Minimum resolution (width and height ≥ 200px)
 *  4. Face occupies ≥ 10% of image area
 *  5. No sunglasses
 *  6. No mask / face covering
 *  7. No severe blur
 *  8. Face is frontal (not extreme profile)
 *  9. Adequate lighting (not severely under/overexposed)
 */

import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoValidationCheck =
  | "face_detected"
  | "single_person"
  | "min_resolution"
  | "face_size"
  | "no_sunglasses"
  | "no_mask"
  | "no_blur"
  | "frontal_face"
  | "adequate_lighting";

export interface PhotoValidationResult {
  /** true = photo is acceptable, false = photo must be rejected */
  passed: boolean;
  /** List of checks that failed (empty when passed = true) */
  failedChecks: PhotoValidationCheck[];
  /** Human-readable message to show the subscriber */
  message: string;
  /** Per-check detail for logging / admin dashboard */
  checks: Record<PhotoValidationCheck, boolean>;
  /** Estimated image width in pixels (0 if unknown) */
  estimatedWidth: number;
  /** Estimated image height in pixels (0 if unknown) */
  estimatedHeight: number;
}

// ─── User-facing messages per failed check ────────────────────────────────────

const REJECTION_MESSAGES: Record<PhotoValidationCheck, string> = {
  face_detected:
    "No face was detected in your photo. Please upload a clear photo where your face is visible.",
  single_person:
    "Your photo appears to contain more than one person. Please upload a photo with only you in the frame.",
  min_resolution:
    "Your photo is too small. Please upload a higher-resolution image (at least 512 × 512 pixels required for lip-sync quality).",
  face_size:
    "Your face is too small in the photo. Please upload a closer shot where your face fills more of the frame.",
  no_sunglasses:
    "Sunglasses were detected. Please upload a photo where your eyes are clearly visible.",
  no_mask:
    "A face covering or mask was detected. Please upload a photo with your full face visible.",
  no_blur:
    "Your photo appears blurry or out of focus. Please upload a sharper, clearer image.",
  frontal_face:
    "Your face is turned too far to the side. Please upload a photo where you are facing the camera directly.",
  adequate_lighting:
    "Your photo is too dark or too bright. Please upload a photo with clear, even lighting on your face.",
};

// ─── Core validator ───────────────────────────────────────────────────────────

/**
 * Validates a character photo before rendering.
 *
 * @param photoUrl  Publicly accessible URL of the uploaded photo (S3 CDN URL)
 * @param widthPx   Optional known width in pixels (from client-side FileReader)
 * @param heightPx  Optional known height in pixels
 */
export async function validateCharacterPhoto(
  photoUrl: string,
  widthPx?: number,
  heightPx?: number
): Promise<PhotoValidationResult> {
  // ── Resolution check (client-side dimensions if available) ────────────────
  const knownWidth = widthPx ?? 0;
  const knownHeight = heightPx ?? 0;
  // ISS-037: Minimum 512×512 required for HeyGen/InfiniteTalk lip-sync quality
  const MIN_DIMENSION_PX = 512;
  const resolutionOk = knownWidth === 0 || knownHeight === 0
    ? true // unknown — defer to LLM
    : knownWidth >= MIN_DIMENSION_PX && knownHeight >= MIN_DIMENSION_PX;

  // ── LLM vision assessment ─────────────────────────────────────────────────
  let llmChecks: Partial<Record<PhotoValidationCheck, boolean>> = {};
  let estimatedWidth = knownWidth;
  let estimatedHeight = knownHeight;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: `You are a photo quality validator for an AI video generation platform. 
Analyse the provided image and return a JSON object with the following boolean fields.
Answer strictly based on what you can see. Do not guess or infer.

Required JSON fields:
- face_detected: true if at least one human face is clearly visible
- single_person: true if exactly one person is in the image (or only one face is visible)
- face_size_adequate: true if the face occupies at least 10% of the image area (i.e. not a tiny distant figure)
- no_sunglasses: true if the person is NOT wearing sunglasses or tinted glasses that obscure the eyes
- no_mask: true if the person is NOT wearing a face mask, balaclava, or any covering that hides the face
- no_severe_blur: true if the face is in focus and not severely blurred or motion-smeared
- frontal_face: true if the face is roughly facing the camera (not an extreme side profile where one eye is hidden)
- adequate_lighting: true if the face is adequately lit — not severely underexposed (too dark) or overexposed (washed out)
- estimated_width_px: your best estimate of the image width in pixels as an integer (0 if unknown)
- estimated_height_px: your best estimate of the image height in pixels as an integer (0 if unknown)

Return ONLY valid JSON. No explanation. No markdown.`,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "image_url" as const,
              image_url: { url: photoUrl, detail: "high" as const },
            },
            {
              type: "text" as const,
              text: "Validate this character photo and return the JSON assessment.",
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "photo_validation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              face_detected:         { type: "boolean" },
              single_person:         { type: "boolean" },
              face_size_adequate:    { type: "boolean" },
              no_sunglasses:         { type: "boolean" },
              no_mask:               { type: "boolean" },
              no_severe_blur:        { type: "boolean" },
              frontal_face:          { type: "boolean" },
              adequate_lighting:     { type: "boolean" },
              estimated_width_px:    { type: "integer" },
              estimated_height_px:   { type: "integer" },
            },
            required: [
              "face_detected", "single_person", "face_size_adequate",
              "no_sunglasses", "no_mask", "no_severe_blur",
              "frontal_face", "adequate_lighting",
              "estimated_width_px", "estimated_height_px",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (raw && typeof raw === "string") {
      const parsed = JSON.parse(raw);
      llmChecks = {
        face_detected:      !!parsed.face_detected,
        single_person:      !!parsed.single_person,
        face_size:          !!parsed.face_size_adequate,
        no_sunglasses:      !!parsed.no_sunglasses,
        no_mask:            !!parsed.no_mask,
        no_blur:            !!parsed.no_severe_blur,
        frontal_face:       !!parsed.frontal_face,
        adequate_lighting:  !!parsed.adequate_lighting,
      };
      if (parsed.estimated_width_px > 0)  estimatedWidth  = parsed.estimated_width_px;
      if (parsed.estimated_height_px > 0) estimatedHeight = parsed.estimated_height_px;
    }
  } catch (err) {
    // LLM unavailable — fail open on most checks but log the error
    console.error("[character-photo-validator] LLM assessment failed:", err);
    // Fail open: assume all LLM checks pass so we don't block on infra issues
    llmChecks = {
      face_detected:     true,
      single_person:     true,
      face_size:         true,
      no_sunglasses:     true,
      no_mask:           true,
      no_blur:           true,
      frontal_face:      true,
      adequate_lighting: true,
    };
  }

  // ── Merge resolution check ────────────────────────────────────────────────
  const effectiveWidth  = estimatedWidth  > 0 ? estimatedWidth  : knownWidth;
  const effectiveHeight = estimatedHeight > 0 ? estimatedHeight : knownHeight;
  const minResOk = effectiveWidth === 0 || effectiveHeight === 0
    ? true
    : effectiveWidth >= MIN_DIMENSION_PX && effectiveHeight >= MIN_DIMENSION_PX;

  const checks: Record<PhotoValidationCheck, boolean> = {
    face_detected:     llmChecks.face_detected     ?? true,
    single_person:     llmChecks.single_person     ?? true,
    min_resolution:    resolutionOk && minResOk,
    face_size:         llmChecks.face_size         ?? true,
    no_sunglasses:     llmChecks.no_sunglasses     ?? true,
    no_mask:           llmChecks.no_mask           ?? true,
    no_blur:           llmChecks.no_blur           ?? true,
    frontal_face:      llmChecks.frontal_face      ?? true,
    adequate_lighting: llmChecks.adequate_lighting ?? true,
  };

  // ── Determine failures ────────────────────────────────────────────────────
  const failedChecks = (Object.keys(checks) as PhotoValidationCheck[]).filter(k => !checks[k]);
  const passed = failedChecks.length === 0;

  // ── Build subscriber-facing message ───────────────────────────────────────
  let message: string;
  if (passed) {
    message = "Photo validated successfully.";
  } else {
    // Show the most critical failure first
    const priority: PhotoValidationCheck[] = [
      "face_detected", "single_person", "no_mask", "no_sunglasses",
      "frontal_face", "no_blur", "adequate_lighting", "face_size", "min_resolution",
    ];
    const firstFail = priority.find(c => failedChecks.includes(c)) ?? failedChecks[0];
    message = REJECTION_MESSAGES[firstFail];
  }

  console.log(
    `[character-photo-validator] ${passed ? "PASS" : "FAIL"} — checks: ${JSON.stringify(checks)} — failed: [${failedChecks.join(", ")}]`
  );

  return {
    passed,
    failedChecks,
    message,
    checks,
    estimatedWidth:  effectiveWidth,
    estimatedHeight: effectiveHeight,
  };
}
