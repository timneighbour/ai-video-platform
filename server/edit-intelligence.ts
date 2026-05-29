/**
 * edit-intelligence.ts
 * Phase 4 — Edit Intelligence System
 *
 * Provides beat-aware sequencing, emotional arc mapping, camera energy logic,
 * visual motif recurrence, and transition intelligence for music video production.
 *
 * Called after storyboard generation to produce an EditIntelligenceResult
 * that is stored in the DB and used by the assembly worker to sequence clips
 * with cinematic precision.
 */

import { getDb } from "./db";
import {
  editIntelligenceResults,
  InsertEditIntelligenceResult,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EmotionalIntensity = "low" | "medium" | "high" | "peak";
export type MotionType = "static" | "slow_drift" | "dolly" | "handheld" | "crane" | "whip";
export type TransitionType =
  | "hard_cut"
  | "smash_cut"
  | "match_cut"
  | "dissolve"
  | "fade"
  | "whip"
  | "light_flare"
  | "motion_continuation";

export interface BeatGridEntry {
  beatIndex: number;
  timestampMs: number;
  isMeasureStart: boolean;
  isDownbeat: boolean;
}

export interface EmotionalArcEntry {
  section: string;           // "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro"
  startMs: number;
  endMs: number;
  intensity: EmotionalIntensity;
  recommendedShotType: string;
}

export interface CameraEnergyEntry {
  sceneIndex: number;
  energyLevel: "low" | "medium" | "high";
  motionType: MotionType;
  justification: string;
}

export interface MotifEntry {
  motifName: string;
  sceneIndices: number[];
  recurrenceType: "bookend" | "chorus_lock" | "callback" | "escalation";
}

export interface TransitionPlanEntry {
  fromSceneIndex: number;
  toSceneIndex: number;
  transitionType: TransitionType;
  durationMs: number;
  justification: string;
}

export interface SequencingAdjustment {
  type: "reorder" | "remove" | "duplicate" | "pacing_hold";
  sceneIndex: number;
  targetIndex?: number;
  justification: string;
}

export interface EditIntelligencePlan {
  detectedBpm: number | null;
  beatGrid: BeatGridEntry[];
  emotionalArc: EmotionalArcEntry[];
  cameraEnergyProfile: CameraEnergyEntry[];
  motifPlan: MotifEntry[];
  transitionPlan: TransitionPlanEntry[];
  sequencingAdjustments: SequencingAdjustment[];
  editQualityScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat grid estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate a simple beat grid from BPM and total duration.
 * In production this would be replaced by an audio analysis pass.
 */
export function estimateBeatGrid(bpm: number, durationMs: number): BeatGridEntry[] {
  const beatIntervalMs = (60 / bpm) * 1000;
  const beats: BeatGridEntry[] = [];
  let t = 0;
  let beatIndex = 0;

  while (t <= durationMs) {
    beats.push({
      beatIndex,
      timestampMs: Math.round(t),
      isMeasureStart: beatIndex % 4 === 0,
      isDownbeat: beatIndex % 2 === 0,
    });
    t += beatIntervalMs;
    beatIndex++;
  }

  return beats;
}

/**
 * Find the nearest beat timestamp to a given time.
 */
export function snapToNearestBeat(
  timestampMs: number,
  beatGrid: BeatGridEntry[],
  toleranceMs = 200
): number {
  let nearest = timestampMs;
  let minDist = Infinity;

  for (const beat of beatGrid) {
    const dist = Math.abs(beat.timestampMs - timestampMs);
    if (dist < minDist) {
      minDist = dist;
      nearest = beat.timestampMs;
    }
  }

  return minDist <= toleranceMs ? nearest : timestampMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Emotional arc engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an emotional arc from a list of song sections.
 * Each section gets an intensity level and a recommended shot type.
 */
export function buildEmotionalArc(
  sections: Array<{ name: string; startMs: number; endMs: number }>,
  arcShape: "linear" | "peak-valley" | "escalating" | "flat" | "inverted-v" = "peak-valley"
): EmotionalArcEntry[] {
  const n = sections.length;

  return sections.map((section, i) => {
    let intensity: EmotionalIntensity;
    const progress = n > 1 ? i / (n - 1) : 0;

    switch (arcShape) {
      case "escalating":
        intensity = progress < 0.33 ? "low" : progress < 0.66 ? "medium" : progress < 0.85 ? "high" : "peak";
        break;
      case "flat":
        intensity = "high";
        break;
      case "inverted-v":
        intensity = progress < 0.25 ? "low" : progress < 0.5 ? "high" : progress < 0.75 ? "peak" : progress < 0.9 ? "high" : "medium";
        break;
      case "linear":
        intensity = progress < 0.25 ? "low" : progress < 0.5 ? "medium" : progress < 0.75 ? "high" : "peak";
        break;
      case "peak-valley":
      default: {
        // Intro low → verse medium → pre-chorus high → chorus peak → bridge medium → outro low
        const sectionName = section.name.toLowerCase();
        if (sectionName.includes("intro")) intensity = "low";
        else if (sectionName.includes("verse")) intensity = "medium";
        else if (sectionName.includes("pre")) intensity = "high";
        else if (sectionName.includes("chorus")) intensity = "peak";
        else if (sectionName.includes("bridge")) intensity = "medium";
        else if (sectionName.includes("outro")) intensity = "low";
        else intensity = progress < 0.5 ? "medium" : "high";
        break;
      }
    }

    const recommendedShotType =
      intensity === "peak" ? "extreme close-up, maximum camera energy" :
      intensity === "high" ? "tight close-up, dynamic camera movement" :
      intensity === "medium" ? "medium close-up, moderate camera drift" :
      "wide establishing or contemplative close-up, minimal movement";

    return {
      section: section.name,
      startMs: section.startMs,
      endMs: section.endMs,
      intensity,
      recommendedShotType,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera energy logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign camera energy levels to scenes based on their position in the arc.
 */
export function assignCameraEnergy(
  sceneCount: number,
  emotionalArc: EmotionalArcEntry[],
  energyBias: "low" | "medium" | "high" | "variable" = "medium"
): CameraEnergyEntry[] {
  return Array.from({ length: sceneCount }, (_, i) => {
    const progress = sceneCount > 1 ? i / (sceneCount - 1) : 0;

    // Find the matching arc section
    const arcEntry = emotionalArc.find((e, idx) => {
      const sectionProgress = emotionalArc.length > 1 ? idx / (emotionalArc.length - 1) : 0;
      const nextProgress = emotionalArc.length > 1 ? (idx + 1) / (emotionalArc.length - 1) : 1;
      return progress >= sectionProgress && progress < nextProgress;
    }) ?? emotionalArc[emotionalArc.length - 1];

    let energyLevel: "low" | "medium" | "high";
    let motionType: MotionType;

    if (energyBias === "low") {
      energyLevel = "low";
      motionType = "slow_drift";
    } else if (energyBias === "high") {
      energyLevel = "high";
      motionType = "handheld";
    } else if (energyBias === "medium") {
      energyLevel = "medium";
      motionType = "dolly";
    } else {
      // variable — follow the arc
      const intensity = arcEntry?.intensity ?? "medium";
      energyLevel = intensity === "peak" ? "high" : intensity === "high" ? "high" : intensity === "medium" ? "medium" : "low";
      motionType = energyLevel === "high" ? "handheld" : energyLevel === "medium" ? "dolly" : "slow_drift";
    }

    return {
      sceneIndex: i,
      energyLevel,
      motionType,
      justification: `Arc section: ${arcEntry?.section ?? "unknown"}, intensity: ${arcEntry?.intensity ?? "medium"}`,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual motif recurrence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identify recurring visual motifs from scene prompts and plan their recurrence.
 */
export function planMotifRecurrence(
  scenePrompts: string[]
): MotifEntry[] {
  // Extract motif keywords from prompts
  const motifKeywords = [
    "piano", "strings", "violin", "cello", "orchestra",
    "candle", "window", "door", "staircase", "corridor",
    "close-up hands", "close-up eyes", "close-up face",
    "hall wide", "audience", "conductor",
  ];

  const motifMap = new Map<string, number[]>();

  for (const keyword of motifKeywords) {
    const matchingIndices: number[] = [];
    for (let i = 0; i < scenePrompts.length; i++) {
      if (scenePrompts[i].toLowerCase().includes(keyword)) {
        matchingIndices.push(i);
      }
    }
    if (matchingIndices.length >= 2) {
      motifMap.set(keyword, matchingIndices);
    }
  }

  const plan: MotifEntry[] = [];
  for (const [motifName, sceneIndices] of Array.from(motifMap.entries())) {
    if (sceneIndices.length >= 2) {
      const recurrenceType: MotifEntry["recurrenceType"] =
        sceneIndices[0] === 0 && sceneIndices[sceneIndices.length - 1] === scenePrompts.length - 1
          ? "bookend"
          : sceneIndices.length >= 3
          ? "chorus_lock"
          : "callback";

      plan.push({ motifName, sceneIndices, recurrenceType });
    }
  }

  return plan;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition intelligence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plan transitions between scenes based on energy levels and director mode preferences.
 */
export function planTransitions(
  cameraEnergyProfile: CameraEnergyEntry[],
  preferredTransitions: TransitionType[] = ["hard_cut", "smash_cut", "match_cut"]
): TransitionPlanEntry[] {
  const plan: TransitionPlanEntry[] = [];

  for (let i = 0; i < cameraEnergyProfile.length - 1; i++) {
    const from = cameraEnergyProfile[i];
    const to = cameraEnergyProfile[i + 1];

    let transitionType: TransitionType;
    let durationMs: number;

    // Energy transition logic
    if (from.energyLevel === "high" && to.energyLevel === "high") {
      transitionType = preferredTransitions.includes("smash_cut") ? "smash_cut" : "hard_cut";
      durationMs = 0;
    } else if (from.energyLevel === "low" && to.energyLevel === "low") {
      transitionType = preferredTransitions.includes("dissolve") ? "dissolve" : "fade";
      durationMs = 800;
    } else if (from.energyLevel === "high" && to.energyLevel === "low") {
      transitionType = preferredTransitions.includes("dissolve") ? "dissolve" : "hard_cut";
      durationMs = 400;
    } else if (from.energyLevel === "low" && to.energyLevel === "high") {
      transitionType = preferredTransitions.includes("match_cut") ? "match_cut" : "hard_cut";
      durationMs = 0;
    } else {
      // Default to first preferred transition
      transitionType = preferredTransitions[0] ?? "hard_cut";
      durationMs = transitionType === "dissolve" ? 600 : transitionType === "fade" ? 800 : 0;
    }

    plan.push({
      fromSceneIndex: i,
      toSceneIndex: i + 1,
      transitionType,
      durationMs,
      justification: `${from.energyLevel} → ${to.energyLevel} energy transition`,
    });
  }

  return plan;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM-powered edit intelligence analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full Edit Intelligence analysis for a job using the LLM.
 * Returns a structured plan for sequencing, pacing, and transitions.
 */
export async function runEditIntelligenceAnalysis(params: {
  jobId: number;
  songTitle: string;
  genre: string;
  bpm?: number | null;
  durationMs: number;
  scenePrompts: string[];
  directorMode?: string | null;
  arcShape?: "linear" | "peak-valley" | "escalating" | "flat" | "inverted-v";
  energyBias?: "low" | "medium" | "high" | "variable";
  preferredTransitions?: TransitionType[];
}): Promise<EditIntelligencePlan> {
  const {
    songTitle,
    genre,
    bpm,
    durationMs,
    scenePrompts,
    arcShape = "peak-valley",
    energyBias = "medium",
    preferredTransitions = ["hard_cut", "smash_cut", "match_cut"],
  } = params;

  // Build beat grid if BPM is known
  const beatGrid = bpm ? estimateBeatGrid(bpm, durationMs) : [];

  // Build emotional arc from a simple section estimate
  const estimatedSections = estimateSectionsFromDuration(durationMs);
  const emotionalArc = buildEmotionalArc(estimatedSections, arcShape);

  // Assign camera energy
  const cameraEnergyProfile = assignCameraEnergy(scenePrompts.length, emotionalArc, energyBias);

  // Plan motif recurrence
  const motifPlan = planMotifRecurrence(scenePrompts);

  // Plan transitions
  const transitionPlan = planTransitions(cameraEnergyProfile, preferredTransitions);

  // Use LLM to refine sequencing decisions
  let sequencingAdjustments: SequencingAdjustment[] = [];
  let editQualityScore = 0.75;

  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional music video editor and director. Analyze the provided scene list and return sequencing adjustments as JSON.`,
        },
        {
          role: "user",
          content: `Song: "${songTitle}" (${genre}, ${bpm ? `${bpm} BPM, ` : ""}${Math.round(durationMs / 1000)}s)
Director mode: ${params.directorMode ?? "Balanced"}
Scene count: ${scenePrompts.length}
Emotional arc shape: ${arcShape}

Scene prompts:
${scenePrompts.map((p, i) => `${i + 1}. ${p.slice(0, 120)}`).join("\n")}

Return JSON with:
{
  "sequencingAdjustments": [{"type": "reorder|remove|duplicate|pacing_hold", "sceneIndex": 0, "targetIndex": 2, "justification": "..."}],
  "editQualityScore": 0.0-1.0,
  "notes": "..."
}

Only include adjustments that meaningfully improve the edit. Return empty array if the sequence is already good.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "edit_intelligence",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sequencingAdjustments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    sceneIndex: { type: "integer" },
                    targetIndex: { type: "integer" },
                    justification: { type: "string" },
                  },
                  required: ["type", "sceneIndex", "justification"],
                  additionalProperties: false,
                },
              },
              editQualityScore: { type: "number" },
              notes: { type: "string" },
            },
            required: ["sequencingAdjustments", "editQualityScore", "notes"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = llmResponse?.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (content) {
      const parsed = JSON.parse(content);
      sequencingAdjustments = parsed.sequencingAdjustments ?? [];
      editQualityScore = parsed.editQualityScore ?? 0.75;
    }
  } catch (err) {
    // LLM failure is non-fatal — use defaults
    console.warn("[EditIntelligence] LLM analysis failed, using defaults:", err);
  }

  return {
    detectedBpm: bpm ?? null,
    beatGrid,
    emotionalArc,
    cameraEnergyProfile,
    motifPlan,
    transitionPlan,
    sequencingAdjustments,
    editQualityScore,
  };
}

/**
 * Estimate song sections from total duration (simple heuristic).
 */
function estimateSectionsFromDuration(
  durationMs: number
): Array<{ name: string; startMs: number; endMs: number }> {
  const d = durationMs;
  // Standard pop structure: intro(10%) verse(20%) pre-chorus(10%) chorus(20%) verse(15%) chorus(20%) outro(5%)
  const structure = [
    { name: "intro", pct: 0.10 },
    { name: "verse 1", pct: 0.20 },
    { name: "pre-chorus", pct: 0.10 },
    { name: "chorus 1", pct: 0.20 },
    { name: "verse 2", pct: 0.15 },
    { name: "chorus 2", pct: 0.20 },
    { name: "outro", pct: 0.05 },
  ];

  const sections: Array<{ name: string; startMs: number; endMs: number }> = [];
  let cursor = 0;
  for (const s of structure) {
    const dur = Math.round(d * s.pct);
    sections.push({ name: s.name, startMs: cursor, endMs: cursor + dur });
    cursor += dur;
  }
  return sections;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB persistence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save an EditIntelligencePlan to the database.
 */
export async function saveEditIntelligenceResult(
  jobId: number,
  plan: EditIntelligencePlan
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const row: InsertEditIntelligenceResult = {
    jobId,
    detectedBpm: plan.detectedBpm != null ? String(plan.detectedBpm) : null,
    beatGridJson: plan.beatGrid.length > 0 ? JSON.stringify(plan.beatGrid) : null,
    emotionalArcJson: JSON.stringify(plan.emotionalArc),
    cameraEnergyProfileJson: JSON.stringify(plan.cameraEnergyProfile),
    motifPlanJson: plan.motifPlan.length > 0 ? JSON.stringify(plan.motifPlan) : null,
    transitionPlanJson: JSON.stringify(plan.transitionPlan),
    sequencingAdjustmentsJson: plan.sequencingAdjustments.length > 0
      ? JSON.stringify(plan.sequencingAdjustments)
      : null,
    editQualityScore: String(plan.editQualityScore),
  };

  await db
    .insert(editIntelligenceResults)
    .values(row)
    .onDuplicateKeyUpdate({ set: row });
}
