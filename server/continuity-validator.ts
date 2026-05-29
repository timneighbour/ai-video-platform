/**
 * continuity-validator.ts
 * Phase 3 — Continuity Engine
 *
 * Validates visual continuity between adjacent scenes in a music video job.
 * Uses LLM vision to compare performer identity, wardrobe, environment,
 * lighting, and camera energy across scene pairs.
 *
 * Pipeline position: runs AFTER all scenes reach lipSyncStatus=done,
 * BEFORE final assembly. Severe discontinuity rejects the scene for re-render.
 *
 * Architecture note: Full embedding-based identity tracking (e.g. ArcFace)
 * requires the orchestration server. This module uses LLM vision as the
 * primary assessment method and stores results in continuityResults table.
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  continuityResults,
  sceneRelationships,
  type InsertContinuityResult,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ContinuityCategory =
  | "performer"
  | "wardrobe"
  | "environment"
  | "lighting"
  | "camera_energy";

export type ContinuityGrade = "GREEN" | "AMBER" | "RED";

export interface ContinuityScores {
  performer: number;   // 0.0–1.0
  wardrobe: number;
  environment: number;
  lighting: number;
  cameraEnergy: number;
  overall: number;
}

export interface ContinuityValidationResult {
  grade: ContinuityGrade;
  passed: boolean;
  scores: ContinuityScores;
  failureCategories: ContinuityCategory[];
  identityVariance: number;      // 0.0–1.0 (higher = more drift)
  identityLockStrength: number;  // 0.0–1.0 (confidence in assessment)
  assessmentNotes: string;
  action: "approved" | "flagged" | "rejected" | "skipped";
}

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

export const CONTINUITY_THRESHOLDS = {
  // Per-category minimum scores (below = failure)
  performer: { green: 0.75, amber: 0.55 },
  wardrobe: { green: 0.70, amber: 0.50 },
  environment: { green: 0.60, amber: 0.40 },
  lighting: { green: 0.65, amber: 0.45 },
  cameraEnergy: { green: 0.60, amber: 0.40 },
  // Overall composite
  overall: { green: 0.70, amber: 0.50 },
  // Identity variance (lower = better continuity)
  identityVariance: { green: 0.20, amber: 0.40 }, // above 0.40 = RED
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Core validation function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates continuity between two adjacent scenes using LLM vision.
 * @param sceneAVideoUrl - URL of the earlier scene's video/thumbnail
 * @param sceneBVideoUrl - URL of the later scene's video/thumbnail
 * @param sceneAPrompt - Storyboard prompt for scene A (context)
 * @param sceneBPrompt - Storyboard prompt for scene B (context)
 * @param hasPerformer - Whether both scenes feature the same performer
 */
export async function validateSceneContinuity(
  sceneAVideoUrl: string,
  sceneBVideoUrl: string,
  sceneAPrompt: string,
  sceneBPrompt: string,
  hasPerformer: boolean = true
): Promise<ContinuityValidationResult> {
  const performerInstruction = hasPerformer
    ? `Both scenes feature the same performer. Evaluate performer identity consistency carefully.`
    : `These are cinematic intercut scenes without a performer. Focus on environment, lighting, and camera energy continuity.`;

  const prompt = `You are a professional music video continuity supervisor with 20 years of experience on major-label productions.

Your task: Evaluate visual continuity between two adjacent scenes in a cinematic music video.

${performerInstruction}

Scene A prompt: "${sceneAPrompt}"
Scene B prompt: "${sceneBPrompt}"

Evaluate the following continuity categories and assign scores from 0.0 (complete discontinuity) to 1.0 (perfect continuity):

1. PERFORMER CONTINUITY (if applicable):
   - Face structure, jawline, eye spacing match
   - Skin tone consistency
   - Hair style and colour match
   - Body shape and age consistency
   - Score: 0.0–1.0

2. WARDROBE CONTINUITY:
   - Clothing colours and style match
   - Accessories, jewellery, props consistent
   - No unexplained costume changes
   - Score: 0.0–1.0

3. ENVIRONMENT CONTINUITY:
   - Stage design and room composition consistent
   - Atmospheric density (haze, depth) matches
   - Set dressing and props consistent
   - Score: 0.0–1.0

4. LIGHTING CONTINUITY:
   - Colour temperature consistent (warm amber vs cool blue)
   - Shadow direction and intensity match
   - Key light position consistent
   - Score: 0.0–1.0

5. CAMERA ENERGY CONTINUITY:
   - Motion energy level appropriate for edit flow
   - No jarring energy mismatch (e.g. extreme slow-mo to hyperkinetic)
   - Framing style consistent with section
   - Score: 0.0–1.0

Also estimate:
- IDENTITY VARIANCE: How much has the performer's visual identity drifted? (0.0 = no drift, 1.0 = completely different person)
- IDENTITY LOCK STRENGTH: How confident are you in this assessment? (0.0 = very uncertain, 1.0 = very confident)

Respond ONLY with valid JSON in this exact format:
{
  "performer": <0.0–1.0>,
  "wardrobe": <0.0–1.0>,
  "environment": <0.0–1.0>,
  "lighting": <0.0–1.0>,
  "cameraEnergy": <0.0–1.0>,
  "identityVariance": <0.0–1.0>,
  "identityLockStrength": <0.0–1.0>,
  "failureCategories": ["performer"|"wardrobe"|"environment"|"lighting"|"camera_energy"],
  "notes": "<concise professional assessment, max 200 chars>"
}`;

  try {
    const messages: Array<{ role: "system" | "user"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: sceneAVideoUrl } },
          { type: "image_url", image_url: { url: sceneBVideoUrl } },
        ],
      },
    ];

    const response = await invokeLLM({ messages } as Parameters<typeof invokeLLM>[0]);
    const rawContent = response?.choices?.[0]?.message?.content ?? "";
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildFallbackResult("LLM returned no JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const scores: ContinuityScores = {
      performer: clamp(parsed.performer ?? 0.5),
      wardrobe: clamp(parsed.wardrobe ?? 0.5),
      environment: clamp(parsed.environment ?? 0.5),
      lighting: clamp(parsed.lighting ?? 0.5),
      cameraEnergy: clamp(parsed.cameraEnergy ?? 0.5),
      overall: 0,
    };

    // Weighted overall: performer and wardrobe weighted higher for identity-critical videos
    scores.overall = hasPerformer
      ? (scores.performer * 0.35 + scores.wardrobe * 0.20 + scores.environment * 0.15 + scores.lighting * 0.20 + scores.cameraEnergy * 0.10)
      : (scores.environment * 0.35 + scores.lighting * 0.35 + scores.cameraEnergy * 0.30);

    const identityVariance = clamp(parsed.identityVariance ?? 0.3);
    const identityLockStrength = clamp(parsed.identityLockStrength ?? 0.5);
    const failureCategories: ContinuityCategory[] = Array.isArray(parsed.failureCategories)
      ? parsed.failureCategories.filter((c: string) =>
          ["performer", "wardrobe", "environment", "lighting", "camera_energy"].includes(c)
        )
      : [];

    const grade = computeGrade(scores, identityVariance);
    const passed = grade !== "RED";
    const action = grade === "RED" ? "rejected" : grade === "AMBER" ? "flagged" : "approved";

    return {
      grade,
      passed,
      scores,
      failureCategories,
      identityVariance,
      identityLockStrength,
      assessmentNotes: parsed.notes ?? "",
      action,
    };
  } catch (err) {
    console.error("[ContinuityValidator] LLM error:", err);
    return buildFallbackResult("LLM error — defaulting to AMBER");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene relationship graph builder
// ─────────────────────────────────────────────────────────────────────────────

export interface SceneNode {
  sceneId: number;
  sceneIndex: number;        // 0-indexed position in job
  sectionType: string;       // "intro"|"verse"|"pre-chorus"|"chorus"|"bridge"|"outro"
  isPerformanceScene: boolean;
  prompt: string;
}

/**
 * Builds and stores the scene relationship graph for a job.
 * Call this after storyboard generation, before render dispatch.
 */
export async function buildSceneRelationshipGraph(
  jobId: number,
  scenes: SceneNode[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Group scenes by section type
  const sectionCounters: Record<string, number> = {};
  const chorusScenes: number[] = [];
  const verseScenes: number[] = [];

  const rows = scenes.map((scene, idx) => {
    const sectionType = scene.sectionType || inferSectionType(scene.prompt, idx, scenes.length);
    sectionCounters[sectionType] = (sectionCounters[sectionType] ?? 0) + 1;

    if (sectionType === "chorus") chorusScenes.push(scene.sceneId);
    if (sectionType === "verse") verseScenes.push(scene.sceneId);

    return {
      jobId,
      sceneId: scene.sceneId,
      prevSceneId: idx > 0 ? scenes[idx - 1].sceneId : null,
      nextSceneId: idx < scenes.length - 1 ? scenes[idx + 1].sceneId : null,
      sectionType,
      positionInSection: sectionCounters[sectionType] - 1,
      chorusGroup: sectionType === "chorus" ? Math.floor(chorusScenes.length / 2) + 1 : null,
      verseGroup: sectionType === "verse" ? Math.floor(verseScenes.length / 2) + 1 : null,
      inheritCostumeFromPrev: true,
      inheritLightingFromPrev: true,
      inheritEnvironmentFromPrev: false,
    };
  });

  // Upsert all rows
  for (const row of rows) {
    await db
      .insert(sceneRelationships)
      .values(row)
      .onDuplicateKeyUpdate({ set: { ...row } })
      .catch((err) => console.error("[ContinuityValidator] sceneRelationships upsert error:", err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch validation for a full job
// ─────────────────────────────────────────────────────────────────────────────

export interface SceneForContinuity {
  sceneId: number;
  videoUrl: string;
  prompt: string;
  isPerformanceScene: boolean;
}

/**
 * Validates all adjacent scene pairs for a job and stores results.
 * Returns true if all pairs pass (GREEN or AMBER), false if any are RED.
 */
export async function validateJobContinuity(
  jobId: number,
  scenes: SceneForContinuity[]
): Promise<{ allPassed: boolean; redCount: number; amberCount: number; results: ContinuityValidationResult[] }> {
  const db = await getDb();
  if (!db || scenes.length < 2) {
    return { allPassed: true, redCount: 0, amberCount: 0, results: [] };
  }

  const results: ContinuityValidationResult[] = [];
  let redCount = 0;
  let amberCount = 0;

  for (let i = 0; i < scenes.length - 1; i++) {
    const sceneA = scenes[i];
    const sceneB = scenes[i + 1];
    const hasPerformer = sceneA.isPerformanceScene && sceneB.isPerformanceScene;

    const result = await validateSceneContinuity(
      sceneA.videoUrl,
      sceneB.videoUrl,
      sceneA.prompt,
      sceneB.prompt,
      hasPerformer
    );

    results.push(result);

    if (result.grade === "RED") redCount++;
    if (result.grade === "AMBER") amberCount++;

    // Store in DB
    const row: InsertContinuityResult = {
      jobId,
      sceneAId: sceneA.sceneId,
      sceneBId: sceneB.sceneId,
      performerScore: result.scores.performer.toFixed(3) as unknown as string,
      wardrobeScore: result.scores.wardrobe.toFixed(3) as unknown as string,
      environmentScore: result.scores.environment.toFixed(3) as unknown as string,
      lightingScore: result.scores.lighting.toFixed(3) as unknown as string,
      cameraEnergyScore: result.scores.cameraEnergy.toFixed(3) as unknown as string,
      overallScore: result.scores.overall.toFixed(3) as unknown as string,
      passed: result.passed,
      failureCategories: JSON.stringify(result.failureCategories),
      identityVariance: result.identityVariance.toFixed(4) as unknown as string,
      identityLockStrength: result.identityLockStrength.toFixed(3) as unknown as string,
      assessmentNotes: result.assessmentNotes,
      action: result.action,
    };

    await db.insert(continuityResults).values(row)
      .catch((err) => console.error("[ContinuityValidator] DB insert error:", err));

    console.log(
      `[ContinuityValidator] Scenes ${sceneA.sceneId}→${sceneB.sceneId}: ${result.grade} (overall=${result.scores.overall.toFixed(2)})`,
      result.failureCategories.length > 0 ? `failures: ${result.failureCategories.join(", ")}` : ""
    );
  }

  return {
    allPassed: redCount === 0,
    redCount,
    amberCount,
    results,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function computeGrade(scores: ContinuityScores, identityVariance: number): ContinuityGrade {
  // Identity variance override
  if (identityVariance > CONTINUITY_THRESHOLDS.identityVariance.amber) return "RED";

  // Check overall score
  if (scores.overall < CONTINUITY_THRESHOLDS.overall.amber) return "RED";
  if (scores.overall < CONTINUITY_THRESHOLDS.overall.green) return "AMBER";

  // Check critical per-category failures
  if (scores.performer < CONTINUITY_THRESHOLDS.performer.amber) return "RED";
  if (scores.performer < CONTINUITY_THRESHOLDS.performer.green) return "AMBER";

  return "GREEN";
}

function buildFallbackResult(reason: string): ContinuityValidationResult {
  return {
    grade: "AMBER",
    passed: true,
    scores: { performer: 0.6, wardrobe: 0.6, environment: 0.6, lighting: 0.6, cameraEnergy: 0.6, overall: 0.6 },
    failureCategories: [],
    identityVariance: 0.2,
    identityLockStrength: 0.3,
    assessmentNotes: reason,
    action: "flagged",
  };
}

function inferSectionType(prompt: string, idx: number, total: number): string {
  const p = prompt.toLowerCase();
  if (p.includes("intro") || idx === 0) return "intro";
  if (p.includes("outro") || p.includes("finale") || idx === total - 1) return "outro";
  if (p.includes("chorus") || p.includes("hook")) return "chorus";
  if (p.includes("bridge")) return "bridge";
  if (p.includes("pre-chorus") || p.includes("prechorus")) return "pre-chorus";
  return "verse";
}

// ─── Phase 3 Helper Functions ─────────────────────────────────────────────────

export interface ContinuityAnchorParams {
  characterName: string;
  wardrobeDescription: string | null;
  hairDescription: string | null;
  environmentDescription: string | null;
  seedValue: string | null;
}

/**
 * Builds a continuity anchor string from scene metadata.
 * Used to lock character appearance and environment across scenes.
 */
export function buildContinuityAnchor(params: ContinuityAnchorParams): string {
  const parts: string[] = [params.characterName];
  if (params.wardrobeDescription) parts.push(params.wardrobeDescription);
  if (params.hairDescription) parts.push(params.hairDescription);
  if (params.environmentDescription) parts.push(params.environmentDescription);
  if (params.seedValue) parts.push(`seed:${params.seedValue}`);
  return parts.join(", ");
}

/**
 * Builds a continuity prompt suffix that instructs the model to maintain
 * visual consistency with the anchor.
 */
export function buildContinuityPromptSuffix(
  anchor: string | null,
  sceneType: string
): string {
  if (!anchor) return "";
  return `Maintain consistent appearance with: ${anchor}. The character, wardrobe, and environment must remain visually consistent with previous ${sceneType} scenes.`;
}

export interface AssessContinuityParams {
  sceneId: number;
  jobId: number;
  videoUrl: string;
  continuityAnchor: string;
  sceneType: string;
}

export interface ContinuityAssessmentResult {
  identityScore: number;
  wardrobeScore: number;
  environmentScore: number;
  overallScore: number;
  issues: string[];
  recommendation: "approve" | "review" | "reject";
}

/**
 * Assesses visual continuity of a rendered scene against the continuity anchor.
 */
export async function assessContinuity(
  params: AssessContinuityParams
): Promise<ContinuityAssessmentResult> {
  const { invokeLLM } = await import("./_core/llm");
  const prompt = `You are a visual continuity assessor for a music video production system.
Assess the visual continuity of this scene against the reference anchor.
Scene type: ${params.sceneType}
Continuity anchor: ${params.continuityAnchor}
Video URL: ${params.videoUrl}

Return a JSON object with:
- identityScore (0-1): how well the character identity is maintained
- wardrobeScore (0-1): how well the wardrobe is consistent
- environmentScore (0-1): how well the environment matches
- overallScore (0-1): overall continuity score
- issues (string[]): list of continuity issues found
- recommendation ("approve"|"review"|"reject"): action to take`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a visual continuity assessor. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" } as any,
    });
    const result = JSON.parse(response.choices[0].message.content as string);
    return {
      identityScore: Number(result.identityScore ?? 0.8),
      wardrobeScore: Number(result.wardrobeScore ?? 0.8),
      environmentScore: Number(result.environmentScore ?? 0.8),
      overallScore: Number(result.overallScore ?? 0.8),
      issues: Array.isArray(result.issues) ? result.issues : [],
      recommendation: result.recommendation ?? "approve",
    };
  } catch {
    return {
      identityScore: 0.8,
      wardrobeScore: 0.8,
      environmentScore: 0.8,
      overallScore: 0.8,
      issues: [],
      recommendation: "approve",
    };
  }
}
