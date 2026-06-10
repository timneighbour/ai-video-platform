/**
 * Lip-Sync Quality Gate
 * =====================
 * Implements the LSE-D / LSE-C acceptance thresholds from the WIZ AI architecture spec.
 *
 * Thresholds (from Wav2Lip / SyncNet evaluation framework):
 *   GREEN  — LSE-D ≤ 8.0  AND  LSE-C ≥ 6.5  → approved, proceed to assembly
 *   AMBER  — LSE-D 8.0–10.0  OR  LSE-C 4.0–6.5  → review, may proceed with flag
 *   RED    — LSE-D > 10.0  OR  LSE-C < 4.0  → fail, retry correction or regenerate
 *
 * Temporal alignment thresholds:
 *   PASS   — absolute offset ≤ 40 ms
 *   REVIEW — offset 40–80 ms
 *   FAIL   — offset > 80 ms
 *
 * Implementation note:
 *   Full SyncNet/LSE-D/LSE-C computation requires Python ML inference (Wav2Lip SyncNet).
 *   This cannot run in the Cloud Run Node.js runtime. Two modes are supported:
 *
 *   1. LLM vision assessment (current, runs in Node.js):
 *      Uses the built-in LLM with a video frame to assess lip-sync quality perceptually.
 *      Returns a qualitative gate result (GREEN/AMBER/RED) with reasoning.
 *      This is the default mode for the current deployment.
 *
 *   2. SyncNet metrics (future, requires orchestration server):
 *      When the $30 orchestration server is provisioned, it can run SyncNet inference
 *      and POST the LSE-D/LSE-C values to /api/webhooks/lipsync-metrics.
 *      The gate then uses exact numeric thresholds.
 *
 * Usage:
 *   const result = await assessLipSyncQuality({ videoUrl, sceneId, jobId });
 *   if (result.gate === 'RED') { // retry }
 *   if (result.gate === 'GREEN') { // proceed to assembly }
 */

import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LipSyncGate = "GREEN" | "AMBER" | "RED";

export interface LipSyncAssessmentInput {
  videoUrl: string;
  sceneId: number;
  jobId: number;
  /** Optional: numeric LSE-D from SyncNet (if available from orchestration server) */
  lseD?: number;
  /** Optional: numeric LSE-C from SyncNet (if available from orchestration server) */
  lseC?: number;
  /** Optional: temporal offset in ms (if available) */
  temporalOffsetMs?: number;
  /** Scene prompt for context */
  scenePrompt?: string;
}

export interface LipSyncAssessmentResult {
  gate: LipSyncGate;
  /** Numeric LSE-D if available (lower is better, ≤8.0 = green) */
  lseD?: number;
  /** Numeric LSE-C if available (higher is better, ≥6.5 = green) */
  lseC?: number;
  /** Temporal offset in ms if available */
  temporalOffsetMs?: number;
  /** Qualitative assessment from LLM vision check */
  qualitativeAssessment?: string;
  /** Specific failure reason if gate = RED */
  failureReason?: string;
  /** Whether numeric SyncNet metrics were used (vs LLM vision) */
  usedSyncNetMetrics: boolean;
  /** Confidence in the assessment (0–1) */
  confidence: number;
  // ── 4 Quality Scores (0.000–1.000) ──
  /** Lip-sync accuracy score (0–1): how well mouth movement matches audio */
  lipSyncQualityScore?: number;
  /** Face/character consistency score (0–1): how consistent the character looks */
  faceConsistencyScore?: number;
  /** Mouth visibility score (0–1): how clearly the mouth is visible and framed */
  mouthVisibilityScore?: number;
  /** Overall composite scene quality score (0–1) */
  overallSceneScore?: number;
}

// ─── Numeric Gate (SyncNet metrics) ──────────────────────────────────────────

/**
 * Apply the LSE-D/LSE-C thresholds to numeric SyncNet metrics.
 * Used when the orchestration server provides exact values.
 */
export function applyNumericLipSyncGate(
  lseD: number,
  lseC: number,
  temporalOffsetMs?: number
): { gate: LipSyncGate; failureReason?: string } {
  // Temporal alignment check (takes priority if severely out of sync)
  if (temporalOffsetMs !== undefined && temporalOffsetMs > 80) {
    return {
      gate: "RED",
      failureReason: `Temporal offset ${temporalOffsetMs}ms exceeds 80ms threshold`,
    };
  }

  // RED: LSE-D > 10.0 OR LSE-C < 4.0
  if (lseD > 10.0 || lseC < 4.0) {
    return {
      gate: "RED",
      failureReason: `LSE-D=${lseD.toFixed(2)} (threshold: ≤10.0), LSE-C=${lseC.toFixed(2)} (threshold: ≥4.0)`,
    };
  }

  // AMBER: LSE-D 8.0–10.0 OR LSE-C 4.0–6.5
  if (lseD > 8.0 || lseC < 6.5) {
    return {
      gate: "AMBER",
      failureReason: `LSE-D=${lseD.toFixed(2)} or LSE-C=${lseC.toFixed(2)} in amber range`,
    };
  }

  // GREEN: LSE-D ≤ 8.0 AND LSE-C ≥ 6.5
  return { gate: "GREEN" };
}

// ─── LLM Vision Assessment ────────────────────────────────────────────────────

/**
 * Use the built-in LLM with vision to assess lip-sync quality from a full video clip.
 * This is the primary assessment method for the current Cloud Run deployment.
 *
 * IMPORTANT: This function sends the full video (not a single frame) using file_url
 * with mime_type "video/mp4". This allows the LLM to assess mouth movement across
 * the entire clip duration, not just a single frame.
 *
 * The LLM is asked to evaluate:
 * 1. Whether mouth movement is present and active throughout the clip (not just one frame)
 * 2. Whether the character's mouth is open and moving during vocal passages
 * 3. Whether there are obvious sync failures (mouth closed throughout, or static expression)
 * 4. Overall quality verdict: GREEN / AMBER / RED
 *
 * CRITICAL FAILURE MODES TO DETECT:
 * - Mouth closed or barely open for the entire clip duration (most common failure)
 * - Static facial expression with no visible articulation
 * - Mouth movement present in only one frame but absent in others
 */
async function assessLipSyncWithLLM(
  videoUrl: string,
  scenePrompt?: string
): Promise<{ gate: LipSyncGate; assessment: string; confidence: number; failureReason?: string; mouthOpenFrames?: number; articulationVisible?: boolean; lipSyncQualityScore?: number; faceConsistencyScore?: number; mouthVisibilityScore?: number; overallSceneScore?: number }> {
  try {
    const contextNote = scenePrompt
      ? `The scene prompt was: "${scenePrompt.slice(0, 200)}"`
      : "No scene prompt available.";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional music video quality control expert specialising in lip-sync assessment.
Your task is to evaluate whether a video clip shows convincing lip-sync between the character's mouth movements and the vocal performance.

You are being shown the FULL VIDEO CLIP, not a single frame. You must assess mouth movement ACROSS THE ENTIRE CLIP DURATION.

CRITICAL: The most common failure mode is a character whose mouth is CLOSED or barely open throughout the entire clip, or whose facial expression is STATIC with no visible articulation. This must be rated RED.

Assess the following across the full clip:
1. MOUTH ACTIVITY: Is the character's mouth visibly open and moving throughout the clip? A character with a closed mouth or a slight smile but no articulation = RED.
2. ARTICULATION: Does the mouth movement show distinct open/close cycles consistent with singing? Minimal or no movement = RED.
3. TEMPORAL CONSISTENCY: Is mouth movement present throughout the clip, or only in isolated frames? Movement in only 1-2 frames out of many = RED.
4. SYNC QUALITY: Does the timing of mouth movement appear to match the vocal performance rhythm?
5. FACE VISIBILITY: Is the character's face clearly visible and well-framed throughout?

Return a JSON object with:
- gate: "GREEN" (convincing lip-sync with clear mouth movement throughout), "AMBER" (some movement but inconsistent or weak), or "RED" (mouth closed/static, no visible articulation, or movement absent for majority of clip)
- assessment: 2-3 sentence explanation describing what you observed across the clip
- confidence: 0.0-1.0 (how confident you are in this assessment)
- failureReason: specific issue if gate is RED or AMBER (e.g. "mouth closed throughout clip", "static expression with no articulation"), null if GREEN
- mouthOpenFrames: estimated percentage of clip where mouth appears open (0-100)
- articulationVisible: boolean — true only if clear open/close mouth cycles are visible
- lipSyncQualityScore: 0.0-1.0 — how accurately mouth movement matches the audio timing (1.0 = perfect sync)
- faceConsistencyScore: 0.0-1.0 — how consistent and natural the character's face looks throughout (1.0 = perfect)
- mouthVisibilityScore: 0.0-1.0 — how clearly the mouth is visible and well-framed (1.0 = fully visible, well-lit, close-up)
- overallSceneScore: 0.0-1.0 — composite quality score for the whole scene (1.0 = broadcast quality)`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please assess the lip-sync quality of this music video clip. Evaluate mouth movement ACROSS THE ENTIRE CLIP, not just a single frame. ${contextNote}

Return your assessment as JSON with keys: gate, assessment, confidence, failureReason, mouthOpenFrames, articulationVisible, lipSyncQualityScore, faceConsistencyScore, mouthVisibilityScore, overallSceneScore.`,
            },
            {
              type: "file_url",
              file_url: {
                url: videoUrl,
                mime_type: "video/mp4",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lip_sync_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              gate: {
                type: "string",
                enum: ["GREEN", "AMBER", "RED"],
                description: "Overall lip-sync quality gate result",
              },
              assessment: {
                type: "string",
                description: "2-3 sentence explanation describing mouth movement observed across the full clip",
              },
              confidence: {
                type: "number",
                description: "Confidence in the assessment (0.0-1.0)",
              },
              failureReason: {
                type: ["string", "null"],
                description: "Specific failure reason if gate is RED or AMBER (e.g. mouth closed throughout clip)",
              },
              mouthOpenFrames: {
                type: "number",
                description: "Estimated percentage of clip (0-100) where mouth appears open",
              },
              articulationVisible: {
                type: "boolean",
                description: "True only if clear open/close mouth cycles are visible across the clip",
              },
              lipSyncQualityScore: {
                type: "number",
                description: "0.0-1.0 — lip-sync accuracy (how well mouth movement matches audio timing)",
              },
              faceConsistencyScore: {
                type: "number",
                description: "0.0-1.0 — face/character consistency throughout the clip",
              },
              mouthVisibilityScore: {
                type: "number",
                description: "0.0-1.0 — mouth visibility and framing quality",
              },
              overallSceneScore: {
                type: "number",
                description: "0.0-1.0 — composite overall scene quality score",
              },
            },
            required: ["gate", "assessment", "confidence", "failureReason", "mouthOpenFrames", "articulationVisible", "lipSyncQualityScore", "faceConsistencyScore", "mouthVisibilityScore", "overallSceneScore"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      return { gate: "AMBER", assessment: "LLM returned no content", confidence: 0.3 };
    }

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    const gate = (parsed.gate as LipSyncGate) ?? "AMBER";
    const mouthOpenFrames = typeof parsed.mouthOpenFrames === "number" ? parsed.mouthOpenFrames : null;
    const articulationVisible = typeof parsed.articulationVisible === "boolean" ? parsed.articulationVisible : null;

    // Enforce: if articulation is not visible and mouth is open <20% of clip, escalate AMBER to RED
    if (gate === "AMBER" && articulationVisible === false && mouthOpenFrames !== null && mouthOpenFrames < 20) {
      console.warn(
        `[LipSyncGate] AMBER escalated to RED — articulationVisible=false, mouthOpenFrames=${mouthOpenFrames}% (threshold: 20%)`
      );
      return {
        gate: "RED",
        assessment: parsed.assessment ?? "No assessment",
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
        failureReason: `Escalated from AMBER: no articulation visible, mouth open only ${mouthOpenFrames}% of clip`,
      };
    }

    const clamp = (v: unknown) => typeof v === "number" ? Math.min(1, Math.max(0, v)) : undefined;
    return {
      gate,
      assessment: parsed.assessment ?? "No assessment",
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      failureReason: parsed.failureReason ?? undefined,
      mouthOpenFrames: mouthOpenFrames ?? undefined,
      articulationVisible: articulationVisible ?? undefined,
      lipSyncQualityScore: clamp(parsed.lipSyncQualityScore),
      faceConsistencyScore: clamp(parsed.faceConsistencyScore),
      mouthVisibilityScore: clamp(parsed.mouthVisibilityScore),
      overallSceneScore: clamp(parsed.overallSceneScore),
    };
  } catch (err: any) {
    console.error(`[LipSyncGate] LLM assessment failed: ${err.message}`);
    // Fail open — don't block assembly on LLM errors
    return {
      gate: "AMBER",
      assessment: `LLM assessment failed: ${err.message}`,
      confidence: 0.2,
    };
  }
}

// ─── Main Assessment Function ─────────────────────────────────────────────────

/**
 * Assess lip-sync quality for a completed scene.
 *
 * If numeric LSE-D/LSE-C values are provided (from orchestration server SyncNet),
 * uses exact numeric thresholds. Otherwise, falls back to LLM vision assessment.
 *
 * @param input - Assessment input with video URL and optional metrics
 * @returns Gate result with reasoning
 */
export async function assessLipSyncQuality(
  input: LipSyncAssessmentInput
): Promise<LipSyncAssessmentResult> {
  const { videoUrl, lseD, lseC, temporalOffsetMs, scenePrompt } = input;

  // Mode 1: Numeric SyncNet metrics available (orchestration server)
  if (lseD !== undefined && lseC !== undefined) {
    const { gate, failureReason } = applyNumericLipSyncGate(lseD, lseC, temporalOffsetMs);
    console.log(
      `[LipSyncGate] Scene ${input.sceneId} — SyncNet metrics: LSE-D=${lseD.toFixed(2)}, LSE-C=${lseC.toFixed(2)}, offset=${temporalOffsetMs ?? "N/A"}ms → ${gate}`
    );
    return {
      gate,
      lseD,
      lseC,
      temporalOffsetMs,
      failureReason,
      usedSyncNetMetrics: true,
      confidence: 0.95, // High confidence with numeric metrics
    };
  }

  // Mode 2: LLM vision assessment (current deployment) — full video via file_url
  console.log(`[LipSyncGate] Scene ${input.sceneId} — using LLM vision assessment (full video)`);
  const llmResult = await assessLipSyncWithLLM(videoUrl, scenePrompt);

  console.log(
    `[LipSyncGate] Scene ${input.sceneId} — LLM gate: ${llmResult.gate} (confidence: ${llmResult.confidence.toFixed(2)}, mouthOpen: ${llmResult.mouthOpenFrames ?? "N/A"}%, articulation: ${llmResult.articulationVisible ?? "N/A"})`
  );

  return {
    gate: llmResult.gate,
    qualitativeAssessment: llmResult.assessment,
    failureReason: llmResult.failureReason,
    usedSyncNetMetrics: false,
    confidence: llmResult.confidence,
    lipSyncQualityScore: llmResult.lipSyncQualityScore,
    faceConsistencyScore: llmResult.faceConsistencyScore,
    mouthVisibilityScore: llmResult.mouthVisibilityScore,
    overallSceneScore: llmResult.overallSceneScore,
  };
}

// ─── Gate Decision Helper ─────────────────────────────────────────────────────

/**
 * Determine whether a scene should proceed to assembly based on gate result.
 *
 * GREEN → proceed
 * AMBER → proceed with flag (logged in audit)
 * RED   → retry or fail
 */
export function shouldProceedToAssembly(result: LipSyncAssessmentResult): boolean {
  return result.gate === "GREEN" || result.gate === "AMBER";
}

/**
 * Determine whether a scene should be retried based on gate result.
 * Only RED gates trigger retry.
 */
export function shouldRetryLipSync(result: LipSyncAssessmentResult): boolean {
  return result.gate === "RED";
}

// ─── Threshold Reference ──────────────────────────────────────────────────────

export const LIP_SYNC_THRESHOLDS = {
  /** LSE-D (lower is better) */
  LSE_D: {
    GREEN_MAX: 8.0,
    AMBER_MAX: 10.0,
  },
  /** LSE-C (higher is better) */
  LSE_C: {
    GREEN_MIN: 6.5,
    AMBER_MIN: 4.0,
  },
  /** Temporal offset in ms */
  TEMPORAL_OFFSET_MS: {
    PASS_MAX: 40,
    REVIEW_MAX: 80,
  },
} as const;
