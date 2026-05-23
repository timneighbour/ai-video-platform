import { readFileSync, writeFileSync } from 'fs';

const filePath = 'server/routers/musicVideo.ts';
const content = readFileSync(filePath, 'utf8');

const insertBefore = `  // ── Phase 2: Get Render Attempts (audit trail) ────────────────────────────
  getRenderAttempts:`;

const newProcedure = `  // ── Scene Preview: Per-scene composited clip access ────────────────────────
  // Returns all scenes for a job with their preview-ready clip URLs.
  // Used by the Scene Preview panel to show scenes as they finish compositing.
  getScenePreviews: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify ownership
      const [job] = await db
        .select({ id: musicVideoJobs.id, status: musicVideoJobs.status })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const scenes = await db
        .select({
          id: musicVideoScenes.id,
          sceneIndex: musicVideoScenes.sceneIndex,
          sceneType: musicVideoScenes.sceneType,
          status: musicVideoScenes.status,
          lipSyncStatus: musicVideoScenes.lipSyncStatus,
          compositeStatus: musicVideoScenes.compositeStatus,
          compositeVideoUrl: musicVideoScenes.compositeVideoUrl,
          videoUrl: musicVideoScenes.videoUrl,
          lipSyncVideoUrl: musicVideoScenes.lipSyncVideoUrl,
          prompt: musicVideoScenes.prompt,
          startTime: musicVideoScenes.startTime,
          duration: musicVideoScenes.duration,
          updatedAt: musicVideoScenes.updatedAt,
        })
        .from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      return {
        jobStatus: job.status,
        scenes: scenes.map((s) => {
          const isPerformance = s.sceneType === "performance";
          const compositeDone = s.compositeStatus === "done" && !!s.compositeVideoUrl;
          const cinematicReady = !isPerformance && s.status === "completed" && !!s.videoUrl;

          let previewUrl: string | null = null;
          let previewState: "pending" | "waiting" | "compositing" | "ready" = "waiting";

          if (isPerformance) {
            if (compositeDone) {
              previewUrl = s.compositeVideoUrl!;
              previewState = "ready";
            } else if (
              s.status === "completed" ||
              s.lipSyncStatus === "processing" ||
              s.compositeStatus === "processing" ||
              s.compositeStatus === "pending"
            ) {
              previewState = "compositing";
            } else if (s.status === "pending") {
              previewState = "pending";
            }
          } else {
            if (cinematicReady) {
              previewUrl = s.videoUrl!;
              previewState = "ready";
            } else if (s.status === "pending") {
              previewState = "pending";
            } else if (s.status === "generating") {
              previewState = "waiting";
            }
          }

          return {
            id: s.id,
            sceneIndex: s.sceneIndex,
            sceneType: (s.sceneType ?? "cinematic") as "performance" | "cinematic",
            status: s.status,
            lipSyncStatus: s.lipSyncStatus,
            compositeStatus: s.compositeStatus,
            previewUrl,
            previewState,
            prompt: s.prompt ?? "",
            startTime: s.startTime ?? 0,
            duration: s.duration ?? 6,
            updatedAt: s.updatedAt,
          };
        }),
      };
    }),

  // ── Phase 2: Get Render Attempts (audit trail) ────────────────────────────
  getRenderAttempts:`;

if (!content.includes(insertBefore)) {
  console.error('ERROR: Could not find insertion point');
  process.exit(1);
}

const updated = content.replace(insertBefore, newProcedure);
writeFileSync(filePath, updated, 'utf8');
console.log('✅ getScenePreviews procedure inserted successfully');
