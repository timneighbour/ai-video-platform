/**
 * Video Generation Service
 * Handles video generation, credit deduction, and job tracking
 */

import { getDb } from "./db";
import { projects, creditTransactions, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { initKlingAI } from "./ai-apis/kling";
import { initHeyGen } from "./ai-apis/heygen";
import { initSeedance } from "./ai-apis/seedance";
import { initRunway } from "./ai-apis/runway";
import { deductCredits, refundCredits } from "./credit-service";

export interface VideoGenerationRequest {
  userId: number;
  toolType: "text_to_video" | "lip_sync" | "video_to_video" | "voiceover";
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  options?: Record<string, unknown>;
  /** If true, request 4K output — only allowed for Pro/Business plan users */
  request4K?: boolean;
  /** User's current subscription plan for feature gating */
  userPlan?: string;
}

export interface VideoGenerationResult {
  projectId: number;
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  creditCost: number;
}

// Credit costs for each tool (in credits)
const CREDIT_COSTS = {
  "text_to_video": 100,
  "lip_sync": 75,
  "video_to_video": 150,
  voiceover: 50,
};

/**
 * Generate a video and deduct credits
 */
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // For text_to_video, credit cost scales with duration (10 credits/sec)
  const rawDuration = String(request.options?.duration || "10");
  const durationSeconds = parseInt(rawDuration, 10) || 10;
  const creditCost = request.toolType === "text_to_video"
    ? durationSeconds * 10
    : CREDIT_COSTS[request.toolType];

  // Enforce 4K gating — only Pro and Business plans can request 4K
  if (request.request4K) {
    const plan = request.userPlan || "free";
    const allowed4KPlans = ["pro", "business"];
    if (!allowed4KPlans.includes(plan)) {
      throw new Error("4K export is available on Pro and Business plans only. Please upgrade to access this feature.");
    }
  }

  // Check if user has enough credits
  const userCredits = await db
    .select()
    .from(users)
    .where(eq(users.id, request.userId))
    .limit(1);

  if (!userCredits.length) {
    throw new Error("User not found");
  }

  // TODO: Implement credit balance check from credits table
  // For now, we'll assume user has enough credits

  let taskId: string;
  let apiProvider: string;

  try {
    // Route to appropriate AI API based on tool type
    switch (request.toolType) {
      case "text_to_video": {
        // Use Kling AI for text-to-video
        const kling = initKlingAI();
        // Kling natively supports "5" and "10" second clips.
        // For longer durations (15s+) we use "10" as the clip length.
        const klingDuration = durationSeconds <= 5 ? "5" : "10";
        const aspectRatioRaw = String(request.options?.aspectRatio || "16:9");
        const aspectRatio = (["16:9", "9:16", "1:1"].includes(aspectRatioRaw)
          ? aspectRatioRaw
          : "16:9") as "16:9" | "9:16" | "1:1";
        taskId = await kling.createTextToVideo({
          prompt: request.prompt,
          duration: klingDuration,
          mode: "pro",
          aspect_ratio: aspectRatio,
        });
        apiProvider = "kling";
        break;
      }

      case "lip_sync": {
        // Use HeyGen for lip-sync
        const heygen = initHeyGen();
        taskId = await heygen.createVideo({
          input_text: request.prompt,
          title: `WizVid Lip-Sync - ${new Date().toISOString()}`,
        });
        apiProvider = "heygen";
        break;
      }

      case "video_to_video": {
        // Use Runway ML for video-to-video
        const runway = initRunway();
        if (!request.videoUrl) {
          throw new Error("Video URL required for video-to-video generation");
        }
        taskId = await runway.createVideoToVideo({
          model: "gen3a",
          video_url: request.videoUrl,
          prompt: request.prompt,
          style: "cinematic",
        });
        apiProvider = "runway";
        break;
      }

      case "voiceover": {
        // Use HeyGen for voiceover
        const heygen = initHeyGen();
        taskId = await heygen.createVideo({
          input_text: request.prompt,
          title: `WizVid Voiceover - ${new Date().toISOString()}`,
        });
        apiProvider = "heygen";
        break;
      }

      default:
        throw new Error(`Unknown tool type: ${request.toolType}`);
    }

    // Create project record in database
    const result = await db.insert(projects).values({
      userId: request.userId,
      title: `${request.toolType} - ${new Date().toLocaleString()}`,
      description: request.prompt,
      toolType: request.toolType,
      taskId: taskId,
      apiProvider: apiProvider,
      status: "processing",
      creditCost: creditCost,
      inputData: JSON.stringify({
        prompt: request.prompt,
        imageUrl: request.imageUrl,
        videoUrl: request.videoUrl,
        audioUrl: request.audioUrl,
        options: request.options,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Deduct credits from user account
    const projectId = result[0]?.insertId as number;
    const creditDeducted = await deductCredits(
      request.userId,
      creditCost,
      `${request.toolType} generation`,
      projectId
    );

    if (!creditDeducted) {
      throw new Error("Insufficient credits for video generation");
    }

    return {
      projectId: result[0]?.insertId as number,
      taskId: taskId,
      status: "processing",
      creditCost: creditCost,
    };
  } catch (error) {
    console.error("Video generation error:", error);
    throw error;
  }
}

/**
 * Check the status of a video generation task
 */
export async function checkVideoStatus(
  projectId: number
): Promise<{
  status: string;
  videoUrl?: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project.length) {
    throw new Error("Project not found");
  }

  const proj = project[0];

  try {
    let status: string;
    let videoUrl: string | undefined;

    // Check status with appropriate API provider
    switch (proj.apiProvider) {
      case "kling": {
        const kling = initKlingAI();
        const taskStatus = await kling.getTaskStatus(proj.taskId);
        status = taskStatus.task_status;
        if (taskStatus.task_result?.videos?.[0]?.url) {
          videoUrl = taskStatus.task_result.videos[0].url;
        }
        break;
      }

      case "heygen": {
        const heygen = initHeyGen();
        const taskStatus = await heygen.getVideoStatus(proj.taskId);
        status = taskStatus.status;
        videoUrl = taskStatus.video_url;
        break;
      }

      case "runway": {
        const runway = initRunway();
        const taskStatus = await runway.getTaskStatus(proj.taskId);
        status = taskStatus.status;
        videoUrl = taskStatus.output?.video_url;
        break;
      }

      case "seedance": {
        const seedance = initSeedance();
        const taskStatus = await seedance.getTaskStatus(proj.taskId);
        status = taskStatus.status;
        videoUrl = taskStatus.video_url;
        break;
      }

      default:
        throw new Error(`Unknown API provider: ${proj.apiProvider}`);
    }

    // Update project status in database
    if (status === "completed" || status === "succeed") {
      await db
        .update(projects)
        .set({
          status: "completed",
          outputUrl: videoUrl,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
    } else if (status === "failed") {
      await db
        .update(projects)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
    }

    return {
      status: status,
      videoUrl: videoUrl,
    };
  } catch (error) {
    console.error("Check video status error:", error);
    throw error;
  }
}

/**
 * Get user's project history
 */
export async function getUserProjects(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(projects.createdAt)
    .limit(limit);
}
