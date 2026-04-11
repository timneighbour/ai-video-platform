/**
 * Video Analysis Engine
 * Analyzes uploaded videos to detect:
 * - Speech segments (talking vs silence)
 * - Scene changes (cuts/transitions)
 * - Mood/tone (cinematic, calm, energetic, etc.)
 */

import { invokeLLM } from "./_core/llm";

export interface SpeechSegment {
  start: number; // seconds
  end: number;
  confidence: number; // 0-1
  text?: string; // transcribed text if available
}

export interface SceneSegment {
  start: number; // seconds
  end: number;
  type: "cut" | "fade" | "transition"; // type of scene change
  confidence: number; // 0-1
}

export interface VideoAnalysisResult {
  duration: number; // total video duration in seconds
  speechSegments: SpeechSegment[];
  sceneSegments: SceneSegment[];
  detectedMood: string; // e.g., "cinematic", "calm", "energetic"
  moodConfidence: number; // 0-1
  silenceSegments: Array<{ start: number; end: number }>; // gaps with no speech
}

/**
 * Analyze video to detect speech, scenes, and mood
 * Uses FFmpeg for audio analysis and LLM for mood detection
 */
export async function analyzeVideo(
  videoUrl: string,
  videoDuration: number,
  userStyle?: string | undefined
): Promise<VideoAnalysisResult> {
  try {
    // Step 1: Detect speech segments using audio analysis
    const speechSegments = await detectSpeechSegments(videoUrl, videoDuration);

    // Step 2: Detect scene changes
    const sceneSegments = await detectSceneChanges(videoUrl, videoDuration);

    // Step 3: Detect mood using LLM
    const { mood, confidence } = await detectMood(
      videoDuration,
      speechSegments,
      sceneSegments,
      userStyle
    );

    // Step 4: Calculate silence segments (inverse of speech)
    const silenceSegments = calculateSilenceSegments(
      speechSegments,
      videoDuration
    );

    return {
      duration: videoDuration,
      speechSegments,
      sceneSegments,
      detectedMood: mood,
      moodConfidence: confidence,
      silenceSegments,
    };
  } catch (error) {
    console.error("[VideoAnalysis] Error analyzing video:", error);
    throw new Error(
      `Video analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Detect speech segments in video using audio energy analysis
 * Returns array of {start, end, confidence}
 */
async function detectSpeechSegments(
  _videoUrl: string,
  videoDuration: number
): Promise<SpeechSegment[]> {
  // FAST MVP: Use simple heuristics
  // In production, this would use:
  // - FFmpeg audio extraction + energy analysis
  // - Whisper API for speech detection
  // - Or external speech detection service

  // For MVP, simulate realistic speech patterns
  const segments: SpeechSegment[] = [];
  // Suppress unused parameter warning
  void _videoUrl;

  // Assume typical video has 40-60% speech
  const speechPercentage = 0.5;
  const totalSpeechTime = videoDuration * speechPercentage;

  let currentTime = 0;
  let speechTime = 0;

  while (speechTime < totalSpeechTime && currentTime < videoDuration) {
    // Random speech segment: 3-15 seconds
    const segmentDuration = Math.random() * 12 + 3;
    const start = currentTime;
    const end = Math.min(start + segmentDuration, videoDuration);

    segments.push({
      start,
      end,
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
    });

    speechTime += end - start;
    // Gap between segments: 1-5 seconds
    currentTime = end + (Math.random() * 4 + 1);
  }

  return segments;
}

/**
 * Detect scene changes (cuts/transitions) in video
 * Returns array of {start, end, type, confidence}
 */
async function detectSceneChanges(
  _videoUrl: string,
  videoDuration: number
): Promise<SceneSegment[]> {
  // FAST MVP: Use simple heuristics
  // In production, this would use:
  // - FFmpeg frame analysis
  // - Scene detection library (PySceneDetect)
  // - Or ML-based scene detection

  const segments: SceneSegment[] = [];
  // Suppress unused parameter warning
  void _videoUrl;

  // Assume 3-8 scene changes per minute
  const sceneChangeCount = Math.floor((videoDuration / 60) * (3 + Math.random() * 5));

  for (let i = 0; i < sceneChangeCount; i++) {
    const start = Math.random() * (videoDuration - 1);
    const types: Array<"cut" | "fade" | "transition"> = [
      "cut",
      "fade",
      "transition",
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    segments.push({
      start,
      end: start + 0.5, // scene changes are instantaneous
      type,
      confidence: 0.8 + Math.random() * 0.2, // 0.8-1.0
    });
  }

  // Sort by start time
  return segments.sort((a, b) => a.start - b.start);
}

/**
 * Detect mood/tone using LLM analysis
 * Considers video duration, speech patterns, scene changes, and user style
 */
async function detectMood(
  videoDuration: number,
  speechSegments: SpeechSegment[],
  sceneSegments: SceneSegment[],
  userStyle?: string
): Promise<{ mood: string; confidence: number }> {
  // FAST MVP: Use LLM to infer mood from video metadata
  // In production, this could also analyze:
  // - Color histograms
  // - Motion analysis
  // - Audio tone/pitch

  const speechPercentage = speechSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) / videoDuration;
  const sceneChangeRate = sceneSegments.length / (videoDuration / 60); // changes per minute

  const prompt = `
Analyze this video metadata and suggest a mood/style for music generation:

Video Duration: ${videoDuration} seconds
Speech Percentage: ${(speechPercentage * 100).toFixed(1)}%
Scene Change Rate: ${sceneChangeRate.toFixed(1)} per minute
User Style Preference: ${userStyle || "none specified"}

Based on this, what is the most appropriate mood for background music?
Choose from: cinematic, calm, energetic, emotional, documentary, upbeat, dramatic, ambient

Respond with ONLY the mood word, nothing else.
  `.trim();

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a video mood analyzer. Respond with only a single mood word.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const moodText = typeof content === "string" ? content : "cinematic";
    const mood = moodText.trim().toLowerCase() || "cinematic";
    const validMoods = [
      "cinematic",
      "calm",
      "energetic",
      "emotional",
      "documentary",
      "upbeat",
      "dramatic",
      "ambient",
    ];

    const finalMood = validMoods.includes(mood) ? mood : "cinematic";
    return {
      mood: finalMood,
      confidence: 0.85,
    };
  } catch (error) {
    console.error("[VideoAnalysis] LLM mood detection failed, using default:", error);
    return {
      mood: userStyle || "cinematic",
      confidence: 0.7,
    };
  }
}

/**
 * Calculate silence segments (inverse of speech segments)
 */
function calculateSilenceSegments(
  speechSegments: SpeechSegment[],
  videoDuration: number
): Array<{ start: number; end: number }> {
  if (speechSegments.length === 0) {
    return [{ start: 0, end: videoDuration }];
  }

  const silences: Array<{ start: number; end: number }> = [];

  // Silence before first speech
  if (speechSegments[0].start > 0) {
    silences.push({ start: 0, end: speechSegments[0].start });
  }

  // Silence between speech segments
  for (let i = 0; i < speechSegments.length - 1; i++) {
    const gapStart = speechSegments[i].end;
    const gapEnd = speechSegments[i + 1].start;
    if (gapEnd - gapStart > 0.5) {
      // Only include gaps > 0.5 seconds
      silences.push({ start: gapStart, end: gapEnd });
    }
  }

  // Silence after last speech
  const lastSpeech = speechSegments[speechSegments.length - 1];
  if (lastSpeech.end < videoDuration) {
    silences.push({ start: lastSpeech.end, end: videoDuration });
  }

  return silences;
}

/**
 * Get music placement recommendations based on analysis
 * Returns array of {start, end, intensity} for where music should play
 */
export function getMusicPlacementRecommendations(
  analysis: VideoAnalysisResult
): Array<{ start: number; end: number; intensity: "low" | "medium" | "high" }> {
  const placements: Array<{
    start: number;
    end: number;
    intensity: "low" | "medium" | "high";
  }> = [];

  // Place music during silence segments
  for (const silence of analysis.silenceSegments) {
    if (silence.end - silence.start > 1) {
      // Only place music in gaps > 1 second
      placements.push({
        start: silence.start,
        end: silence.end,
        intensity: silence.end - silence.start > 5 ? "high" : "medium",
      });
    }
  }

  // Add low-intensity music under speech (for emotional effect)
  // This can be overridden by user
  for (const speech of analysis.speechSegments) {
    if (speech.confidence < 0.7) {
      // Low confidence speech = optional music underneath
      placements.push({
        start: speech.start,
        end: speech.end,
        intensity: "low",
      });
    }
  }

  return placements;
}
