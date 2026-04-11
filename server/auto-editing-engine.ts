/**
 * Auto-Editing Engine
 * Handles automatic video editing, music placement, transitions, and pacing
 */

import type { VideoAnalysisResult } from "./video-analysis-engine";

export interface EditingInstructions {
  cuts: Array<{ timeMs: number; type: "hard_cut" | "fade" }>;
  musicPlacements: Array<{
    start: number;
    end: number;
    intensity: "low" | "medium" | "high";
    fadeIn?: number;
    fadeOut?: number;
  }>;
  transitions: Array<{
    at: number;
    type: "fade" | "cross_dissolve" | "wipe";
    duration: number;
  }>;
  captions: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  pacing: {
    targetPaceScore: number; // 0-100, higher = faster
    recommendedCuts: number;
  };
}

/**
 * Generate auto-editing instructions based on video analysis
 */
export function generateEditingInstructions(
  analysis: VideoAnalysisResult,
  style: string,
  musicEnabled: boolean,
  captionsEnabled: boolean
): EditingInstructions {
  const instructions: EditingInstructions = {
    cuts: [],
    musicPlacements: [],
    transitions: [],
    captions: [],
    pacing: {
      targetPaceScore: getPaceScoreForStyle(style),
      recommendedCuts: 0,
    },
  };

  // Add scene-based cuts
  if (analysis.sceneSegments.length > 0) {
    instructions.cuts = analysis.sceneSegments.map((scene) => ({
      timeMs: Math.floor(scene.start * 1000),
      type: scene.type === "fade" ? "fade" : "hard_cut",
    }));
  }

  // Add music placements
  if (musicEnabled) {
    instructions.musicPlacements = generateMusicPlacements(analysis);
  }

  // Add transitions
  instructions.transitions = generateTransitions(analysis, style);

  // Add captions (if enabled)
  if (captionsEnabled) {
    instructions.captions = generateCaptions(analysis);
  }

  // Calculate pacing recommendations
  instructions.pacing.recommendedCuts = Math.max(
    3,
    Math.floor(analysis.duration / 30)
  ); // 1 cut per 30 seconds minimum

  return instructions;
}

/**
 * Get pace score based on video style
 */
function getPaceScoreForStyle(style: string): number {
  const paceMap: Record<string, number> = {
    cinematic: 40, // Slower, more dramatic
    calm: 20, // Very slow
    energetic: 80, // Fast-paced
    emotional: 35, // Moderate-slow
    documentary: 50, // Steady
    upbeat: 75, // Fast
    dramatic: 45, // Moderate-slow
    ambient: 15, // Very slow
  };

  return paceMap[style] || 50;
}

/**
 * Generate music placement instructions
 * Music plays during silence, lowers during speech
 */
function generateMusicPlacements(
  analysis: VideoAnalysisResult
): Array<{
  start: number;
  end: number;
  intensity: "low" | "medium" | "high";
  fadeIn?: number;
  fadeOut?: number;
}> {
  const placements: Array<{
    start: number;
    end: number;
    intensity: "low" | "medium" | "high";
    fadeIn?: number;
    fadeOut?: number;
  }> = [];

  // Place music during silence segments
  for (const silence of analysis.silenceSegments) {
    if (silence.end - silence.start > 1) {
      // Only place in gaps > 1 second
      const duration = silence.end - silence.start;
      const intensity =
        duration > 5 ? "high" : duration > 2 ? "medium" : "low";

      placements.push({
        start: silence.start,
        end: silence.end,
        intensity,
        fadeIn: 0.5, // 500ms fade in
        fadeOut: 0.5, // 500ms fade out
      });
    }
  }

  // Add low-intensity music under some speech (optional)
  // This creates emotional depth
  for (let i = 0; i < analysis.speechSegments.length; i++) {
    const speech = analysis.speechSegments[i];
    if (
      speech.confidence < 0.7 &&
      speech.end - speech.start > 3
    ) {
      // Low confidence + long speech = good for background music
      placements.push({
        start: speech.start,
        end: speech.end,
        intensity: "low",
        fadeIn: 0.3,
        fadeOut: 0.3,
      });
    }
  }

  return placements.sort((a, b) => a.start - b.start);
}

/**
 * Generate transition instructions
 */
function generateTransitions(
  analysis: VideoAnalysisResult,
  _style: string
): Array<{
  at: number;
  type: "fade" | "cross_dissolve" | "wipe";
  duration: number;
}> {
  const transitions: Array<{
    at: number;
    type: "fade" | "cross_dissolve" | "wipe";
    duration: number;
  }> = [];

  // Add transitions at scene changes
  for (const scene of analysis.sceneSegments) {
    const transitionTypes: Array<"fade" | "cross_dissolve" | "wipe"> = [
      "fade",
      "cross_dissolve",
      "wipe",
    ];
    const type =
      transitionTypes[Math.floor(Math.random() * transitionTypes.length)];

    transitions.push({
      at: scene.start,
      type,
      duration: 0.3, // 300ms transition
    });
  }

  return transitions;
}

/**
 * Generate caption instructions from speech segments
 */
function generateCaptions(
  analysis: VideoAnalysisResult
): Array<{
  start: number;
  end: number;
  text: string;
}> {
  // For MVP, generate placeholder captions
  // In production, this would use speech-to-text transcription

  const captions: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];

  for (const speech of analysis.speechSegments) {
    captions.push({
      start: speech.start,
      end: speech.end,
      text: "[Speech detected]", // Placeholder
    });
  }

  return captions;
}

/**
 * Generate FFmpeg filter complex for video editing
 * Combines all editing instructions into FFmpeg syntax
 */
export function generateFFmpegFilterComplex(
  instructions: EditingInstructions,
  _inputDuration: number
): string {
  // Build FFmpeg filter complex
  // This is a simplified version for MVP

  let filterComplex = "";

  // Add fade transitions
  for (const transition of instructions.transitions) {
    if (transition.type === "fade") {
      filterComplex += `fade=t=out:st=${transition.at}:d=${transition.duration},`;
      filterComplex += `fade=t=in:st=${transition.at + transition.duration}:d=${transition.duration},`;
    }
  }

  // Remove trailing comma
  filterComplex = filterComplex.replace(/,$/, "");

  return filterComplex;
}

/**
 * Estimate rendering time based on video duration and complexity
 */
export function estimateRenderTime(
  videoDuration: number,
  complexity: "low" | "medium" | "high"
): number {
  // Rough estimates (in seconds)
  // Actual time depends on hardware and codec

  const baseTime = videoDuration * 0.5; // 0.5x realtime base
  const complexityMultiplier = {
    low: 1.0,
    medium: 1.5,
    high: 2.5,
  };

  return Math.ceil(baseTime * complexityMultiplier[complexity]);
}

/**
 * Estimate credit cost based on video duration and features
 */
export function estimateCreditCost(
  videoDuration: number,
  features: {
    musicEnabled: boolean;
    captionsEnabled: boolean;
    export4K?: boolean;
  }
): number {
  // MVP: 1 credit per video, regardless of duration (up to 3 minutes)
  // In Phase 2, this will be more granular

  let cost = 1; // Base cost

  // Add cost for optional features
  if (features.musicEnabled) cost += 0; // Included in base
  if (features.captionsEnabled) cost += 0; // Included in base
  if (features.export4K) cost += 2; // 4K export = +2 credits

  return cost;
}
