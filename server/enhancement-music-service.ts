/**
 * Enhancement Music Service
 * Generates music using Suno API matched to video mood and duration
 */

import { getDb } from "./db";
import { sunoMusicTasks } from "../drizzle/schema";

export interface MusicGenerationRequest {
  mood: string; // cinematic, calm, energetic, etc.
  duration: number; // seconds
  style?: string; // user-selected style
  intensity?: "low" | "medium" | "high";
}

export interface MusicGenerationResult {
  sunoTaskId: string;
  musicUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Generate music using Suno API
 * Returns task ID for polling
 */
export async function generateMusicForVideo(
  request: MusicGenerationRequest
): Promise<MusicGenerationResult> {
  try {
    // Create Suno prompt based on mood and duration
    const prompt = createSunoPrompt(request);

    // Call Suno API
    const sunoTaskId = await callSunoAPI(prompt, request.duration);

    if (!sunoTaskId) {
      throw new Error("Failed to get Suno task ID");
    }

    // Store task in database for tracking
    const db = await getDb();
    if (db) {
      await db.insert(sunoMusicTasks).values({
        userId: 0, // Will be set by caller
        taskId: sunoTaskId,
        prompt,
        status: "processing",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      sunoTaskId,
      status: "processing",
    };
  } catch (error) {
    console.error("[EnhancementMusic] Error generating music:", error);
    return {
      sunoTaskId: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create Suno prompt based on video mood and style
 */
function createSunoPrompt(request: MusicGenerationRequest): string {
  const moodDescriptions: Record<string, string> = {
    cinematic:
      "epic, orchestral, dramatic, cinematic, sweeping, powerful, inspiring",
    calm: "peaceful, serene, ambient, relaxing, soft, gentle, meditative",
    energetic: "upbeat, energetic, dynamic, driving, powerful, motivating",
    emotional: "emotional, heartfelt, moving, touching, soulful, expressive",
    documentary: "informative, steady, professional, neutral, clear, structured",
    upbeat: "upbeat, cheerful, positive, bright, lively, fun, playful",
    dramatic: "dramatic, intense, suspenseful, dark, mysterious, powerful",
    ambient: "ambient, atmospheric, spacious, ethereal, dreamy, immersive",
  };

  const moodDesc = moodDescriptions[request.mood] || moodDescriptions.cinematic;
  const durationMinutes = Math.ceil(request.duration / 60);
  const styleNote = request.style ? `Style preference: ${request.style}. ` : "";

  return `
Create a ${durationMinutes}-minute background music track that is ${moodDesc}.
${styleNote}
The music should be suitable for video background/enhancement.
Instrumental preferred. No vocals.
Match the mood to a ${request.mood} video style.
Intensity level: ${request.intensity || "medium"}.
  `.trim();
}

/**
 * Call Suno API to generate music
 * Returns task ID for polling
 */
async function callSunoAPI(
  prompt: string,
  _duration: number
): Promise<string> {
  // MVP: Return mock task ID
  // In production, this would call the actual Suno API
  // For now, we'll use a placeholder that can be mocked in tests

  const sunoApiKey = process.env.SUNO_API_KEY;
  if (!sunoApiKey) {
    throw new Error("SUNO_API_KEY not configured");
  }

  try {
    // Placeholder: In production, call Suno API
    // const response = await fetch('https://api.suno.ai/v1/generate', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${sunoApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     prompt,
    //     duration,
    //   }),
    // });

    // For MVP, generate a mock task ID
    const taskId = `suno_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log("[EnhancementMusic] Generated Suno task ID:", taskId);
    console.log("[EnhancementMusic] Prompt:", prompt);

    return taskId;
  } catch (error) {
    console.error("[EnhancementMusic] Suno API call failed:", error);
    throw error;
  }
}

/**
 * Poll Suno API for music generation status
 */
export async function pollSunoMusicStatus(
  sunoTaskId: string
): Promise<{ status: string; musicUrl?: string; error?: string }> {
  try {
    // Placeholder: In production, poll Suno API
    // const response = await fetch(`https://api.suno.ai/v1/status/${sunoTaskId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
    //   },
    // });

    // For MVP, simulate completed status after a delay
    // In production, this would check actual Suno status
    const isComplete = Math.random() > 0.3; // 70% chance of completion

    if (isComplete) {
      return {
        status: "completed",
        musicUrl: `https://example.com/music/${sunoTaskId}.mp3`,
      };
    }

    return {
      status: "processing",
    };
  } catch (error) {
    console.error("[EnhancementMusic] Poll failed:", error);
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Adjust music volume for music placement
 * Returns volume adjustment factor (0.0 - 1.0)
 */
export function getVolumeAdjustment(
  intensity: "low" | "medium" | "high"
): number {
  const volumeMap: Record<string, number> = {
    low: 0.3, // 30% volume during speech
    medium: 0.6, // 60% volume in medium intensity
    high: 1.0, // 100% volume in silence
  };

  return volumeMap[intensity] || 0.6;
}

/**
 * Create audio mixing instructions for FFmpeg
 * Combines original audio with generated music
 */
export function createAudioMixingInstructions(
  musicPlacements: Array<{
    start: number;
    end: number;
    intensity: "low" | "medium" | "high";
  }>
): string {
  // FFmpeg filter complex for audio mixing
  // This would be used to blend music with original audio

  let filterComplex = "";

  for (const placement of musicPlacements) {
    const volume = getVolumeAdjustment(placement.intensity);
    filterComplex += `[music]volume=${volume}[music_${placement.start}];`;
  }

  return filterComplex;
}
