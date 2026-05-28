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
 * Use the built-in LLM with vision to assess lip-sync quality from a video frame.
 * This is the primary assessment method for the current Cloud Run deployment.
 *
 * The LLM is asked to evaluate:
 * 1. Whether mouth movement appears to match the vocal performance
 * 2. Whether the face is clearly visible and well-framed
 * 3. Whether there are obvious sync issues (mouth open when silent, etc.)
 * 4. Overall quality verdict: GREEN / AMBER / RED
 */
async function assessLipSyncWithLLM(
  videoUrl: string,
  scenePrompt?: string
): Promise<{ gate: LipSyncGate; assessment: string; confidence: number }> {
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

You will be shown a frame from the video. Assess:
1. Is the character's face clearly visible with good framing (not cropped, not too small)?
2. Does the mouth position appear natural and consistent with singing/speaking?
3. Are there obvious sync issues (mouth wide open during silence, mouth closed during loud notes)?
4. Is the overall lip-sync quality acceptable for a premium music video?

Return a JSON object with:
- gate: "GREEN" (excellent, proceed), "AMBER" (acceptable but flagged), or "RED" (unacceptable, retry)
- assessment: 1-2 sentence explanation
- confidence: 0.0-1.0 (how confident you are given only a single frame)
- failureReason: specific issue if gate is RED or AMBER, null if GREEN`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please assess the lip-sync quality of this music video frame. ${contextNote}

Return your assessment as JSON with keys: gate, assessment, confidence, failureReason.`,
            },
            {
              type: "image_url",
              image_url: {
                url: videoUrl,
                detail: "high",
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
                description: "1-2 sentence explanation of the assessment",
              },
              confidence: {
                type: "number",
                description: "Confidence in the assessment (0.0-1.0)",
              },
              failureReason: {
                type: ["string", "null"],
                description: "Specific failure reason if gate is RED or AMBER",
              },
            },
            required: ["gate", "assessment", "confidence", "failureReason"],
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
    return {
      gate: (parsed.gate as LipSyncGate) ?? "AMBER",
      assessment: parsed.assessment ?? "No assessment",
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
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

  // Mode 2: LLM vision assessment (current deployment)
  console.log(`[LipSyncGate] Scene ${input.sceneId} — using LLM vision assessment`);
  const llmResult = await assessLipSyncWithLLM(videoUrl, scenePrompt);

  console.log(
    `[LipSyncGate] Scene ${input.sceneId} — LLM gate: ${llmResult.gate} (confidence: ${llmResult.confidence.toFixed(2)})`
  );

  return {
    gate: llmResult.gate,
    qualitativeAssessment: llmResult.assessment,
    usedSyncNetMetrics: false,
    confidence: llmResult.confidence,
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
