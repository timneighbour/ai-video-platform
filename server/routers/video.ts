/**
 * Video Router
 * Handles video generation jobs: file upload URLs, job submission, and status polling.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateVideo, checkVideoStatus, getUserProjects } from "../video-service";
import { randomUUID } from "crypto";

export const videoRouter = router({
  /**
   * Get a presigned S3 upload URL so the client can PUT a file directly to S3.
   * Returns { uploadUrl, fileUrl } — uploadUrl is the PUT target, fileUrl is the public CDN URL.
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // We generate a unique key so files don't collide
      const ext = input.fileName.split(".").pop() ?? "bin";
      const key = `uploads/${ctx.user.id}/${randomUUID()}.${ext}`;

      // Return a server-side upload endpoint — client POSTs the file there
      return {
        uploadUrl: `/api/video/upload?key=${encodeURIComponent(key)}&type=${encodeURIComponent(input.fileType)}`,
        fileUrl: key, // resolved to CDN URL after upload completes
        key,
      };
    }),

  /**
   * Submit a video generation job.
   */
  generate: protectedProcedure
    .input(
      z.object({
        toolType: z.enum([
          "text_to_video",
          "lip_sync",
          "video_to_video",
          "voiceover",
          "musetalk_lip_sync",
          "seedance_t2v",
          "seedance_i2v",
        ]),
        prompt: z.string().default(""),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        options: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generateVideo({
        userId: ctx.user.id,
        toolType: input.toolType,
        prompt: input.prompt,
        imageUrl: input.imageUrl,
        videoUrl: input.videoUrl,
        audioUrl: input.audioUrl,
        options: input.options,
        userPlan: "free", // TODO: fetch from subscriptions table if needed
      });

      return {
        projectId: result.projectId,
        taskId: result.taskId,
        status: result.status,
        creditCost: result.creditCost,
      };
    }),

  /**
   * Poll the status of a video generation job.
   */
  getStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const result = await checkVideoStatus(input.projectId);
      return {
        status: result.status,
        videoUrl: result.videoUrl,
        error: result.error,
      };
    }),

  /**
   * Get the current user's project history.
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      return getUserProjects(ctx.user.id, input.limit ?? 20);
    }),
});
