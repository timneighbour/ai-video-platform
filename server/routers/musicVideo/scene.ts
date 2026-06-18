/**
 * Music Video — Scene sub-router
 * Auto-extracted from musicVideo.ts by split_router.py
 */
import {
  z,
  TRPCError,
  router,
  protectedProcedure,
  publicProcedure,
  getDb,
  musicVideoJobs,
  musicVideoScenes,
  videoCharacterPhotos,
  videoCharacters,
  renderJobs,
  kidsVideoJobs,
  wizShortsJobs,
  characterScenes,
  providerJobLogs,
  sceneActionLogs,
  musicVideoVocalStems,
  withQuotaGuard,
  QUOTA_EXHAUSTED_MESSAGE,
  eq, and, desc, inArray, gte, sql,
  storagePut,
  generateStoryboard,
  calculateSceneCount,
  calculateCreditCost,
  startSceneRender,
  pollSceneStatus,
  assembleMusicVideo,
  transcribeJobAudio,
  mapModelAssignmentToWaveSpeed,
  pollPerSceneLipSyncJobs,
  deductCredits,
  getUserCredits,
  refundCredits,
  transcribeAudio,
  generateImage,
  generateFaceConsistentImage,
  validateSceneFaceConsistency,
  validateFaceConsistency,
  ensureReferencePhotoBase64,
  type CharacterLockData,
  getVocalStemForCharacter,
  getUserSubscription,
  mapDbPlanToProductPlan,
  countVideosThisMonth,
  SUBSCRIPTION_PLANS,
  PLAN_COST_TARGETS,
  PLAN_SCENE_LIMITS,
  getPlanMaxScenesPerVideo,
  classifyScenes,
  assertSafeUrl,
  runStage1AutoPrep,
  runStage2EnvironmentPrep,
  selectReferenceForScene,
  sceneTypeToRefType,
  buildRoutingPlan,
  enforceHardStop,
  isAnyProviderAvailable,
  checkAllProviders,
  getBestProvider,
  recordProviderOutcome,
  checkJobSpendLimit,
  updateJobSpend,
  PROVIDER_COST_PER_SCENE_USD,
  classifyFailure,
  isRetryableFailure,
  resetSceneAttempts,
  analyseAudioInstruments,
  assignInstrumentsToCharacters,
  buildPerformancePromptBlock,
  type InstrumentAnalysis,
  type CharacterInstrumentAssignment,
  normaliseBpm,
  getCharacterDefaults,
  runStemIntelligence,
  getStemSections,
  getSectionTypeAtTime,
  stemSectionToSceneType,
  getVocalOnsetTime,
} from "./_shared";

export const musicVideoSceneRouter = router({
  updateScene: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      prompt: z.string().min(10).max(5000),
      visualStyle: z.string().max(255).optional(),
      characterAssignments: z.array(z.string()).optional(), // Names of characters in this scene
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership via job
      const [scene] = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.id, input.sceneId));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, scene.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "FORBIDDEN" });

      const charAssignmentsJson = input.characterAssignments !== undefined
        ? JSON.stringify(input.characterAssignments)
        : scene.characterAssignments;

      await db.update(musicVideoScenes)
        .set({ prompt: input.prompt, visualStyle: input.visualStyle ?? scene.visualStyle, characterAssignments: charAssignmentsJson, userEditedPrompt: true, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));

      return { success: true };
    }),

  // Start rendering all scenes (deducts credits)
  updateScenePrompt: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      prompt: z.string().min(1).max(2000),
      lyrics: z.string().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });

      const updatePayload: Record<string, unknown> = {
        prompt: input.prompt.trim(),
        updatedAt: new Date(),
      };
      if (input.lyrics !== undefined) {
        updatePayload.lyrics = input.lyrics.trim() || null;
      }

      await db.update(musicVideoScenes)
        .set(updatePayload as any)
        .where(eq(musicVideoScenes.id, input.sceneId));

      // Reset spend-protection attempt counter so the user can retry after editing.
      // Old failed attempts are marked "cancelled" (not deleted) to preserve audit trail.
      await resetSceneAttempts(input.sceneId);

            console.log(`[MusicVideo] ${new Date().toISOString()} Scene ${input.sceneId} prompt updated by user ${ctx.user.id} — attempt counter reset`);
      return { success: true, sceneId: input.sceneId, prompt: input.prompt.trim() };
    }),

  /** Update only the lyrics for a scene (used by LyricsReviewModal pre-render gate) */
  updateSceneLyrics: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      lyrics: z.string().max(5000).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoScenes)
        .set({ lyrics: input.lyrics?.trim() ?? null, updatedAt: new Date() } as any)
        .where(eq(musicVideoScenes.id, input.sceneId));
      console.log(`[MusicVideo] Scene ${input.sceneId} lyrics updated by user ${ctx.user.id}`);
      return { success: true, sceneId: input.sceneId };
    }),

  // ── Scene Approval ────────────────────────────────────────────────────────
  // Users explicitly approve scenes they are satisfied with before the final
  // render. Approving a scene "locks it in"; editing or re-rendering auto-
  // revokes approval so the user must re-confirm after any changes.
  approveScene: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });
      if (scene.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed scenes can be approved" });
      }
      await db.update(musicVideoScenes)
        .set({ isApproved: true, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));
      return { success: true, sceneId: input.sceneId, isApproved: true };
    }),

  unapproveScene: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoScenes)
        .set({ isApproved: false, approvedAt: null, updatedAt: new Date() })
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      return { success: true, sceneId: input.sceneId, isApproved: false };
    }),

  // Cinematic Upgrade: re-render selected completed scenes with premium (Kling) quality
  deleteScene: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status === "rendering" || job.status === "assembling") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete scenes while rendering" });
      }

      await db.delete(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));

      // Re-index remaining scenes so sceneIndex stays contiguous
      const remaining = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].sceneIndex !== i) {
          await db.update(musicVideoScenes)
            .set({ sceneIndex: i })
            .where(eq(musicVideoScenes.id, remaining[i].id));
        }
      }

      // Update totalScenes on the job
      await db.update(musicVideoJobs)
        .set({ totalScenes: remaining.length })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[MusicVideo] Scene ${input.sceneId} deleted from job ${input.jobId} by user ${ctx.user.id}`);
      return { success: true, remainingCount: remaining.length };
    }),

  // Reorder scenes by moving one scene up or down
  reorderScene: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneId: z.number().int(),
      direction: z.enum(["up", "down"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status === "rendering" || job.status === "assembling") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reorder scenes while rendering" });
      }

      const allScenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      const currentIdx = allScenes.findIndex(s => s.id === input.sceneId);
      if (currentIdx === -1) throw new TRPCError({ code: "NOT_FOUND" });

      const swapIdx = input.direction === "up" ? currentIdx - 1 : currentIdx + 1;
      if (swapIdx < 0 || swapIdx >= allScenes.length) {
        return { success: false, message: "Already at boundary" };
      }

      const sceneA = allScenes[currentIdx];
      const sceneB = allScenes[swapIdx];

      // Swap sceneIndex values
      await db.update(musicVideoScenes)
        .set({ sceneIndex: swapIdx })
        .where(eq(musicVideoScenes.id, sceneA.id));
      await db.update(musicVideoScenes)
        .set({ sceneIndex: currentIdx })
        .where(eq(musicVideoScenes.id, sceneB.id));

      console.log(`[MusicVideo] Scene ${input.sceneId} moved ${input.direction} in job ${input.jobId} by user ${ctx.user.id}`);
      return { success: true };
    }),

  // ── INSTRUMENT ASSIGNMENT ENGINE ──────────────────────────────────────────
  // Returns the current instrument analysis + character assignments for a job.
  // Used by the storyboard UI to show instrument badges on character cards.
  addScene: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      afterSceneIndex: z.number().int().optional(), // insert after this index; defaults to end
      prompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status === "rendering" || job.status === "assembling") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add scenes while rendering" });
      }

      // Get existing scenes ordered by index
      const existing = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      const insertAt = input.afterSceneIndex !== undefined
        ? Math.min(input.afterSceneIndex + 1, existing.length)
        : existing.length;

      // Shift all scenes at or after insertAt up by 1
      for (let i = existing.length - 1; i >= insertAt; i--) {
        await db.update(musicVideoScenes)
          .set({ sceneIndex: i + 1 })
          .where(eq(musicVideoScenes.id, existing[i].id));
      }

      // Insert the new blank scene
      const newPrompt = input.prompt || "A new scene — describe what happens here";
      const [inserted] = await db.insert(musicVideoScenes).values({
        jobId: input.jobId,
        sceneIndex: insertAt,
        prompt: newPrompt,
        lyrics: null,
        visualStyle: "cinematic",
        startTime: 0,
        duration: 5,
        lipSync: false,
        lipSyncStyle: "natural",
        status: "pending",
      }).$returningId();

      // Update totalScenes on the job
      await db.update(musicVideoJobs)
        .set({ totalScenes: existing.length + 1 })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[MusicVideo] Scene added at index ${insertAt} in job ${input.jobId} by user ${ctx.user.id}`);
      return { success: true, sceneId: inserted.id, sceneIndex: insertAt, totalScenes: existing.length + 1 };
    }),

  // Provider health check — returns status of all video generation providers
  setSceneType: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      sceneType: z.enum(["cinematic", "performance"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify ownership
      const [scene] = await db.select({ id: musicVideoScenes.id, jobId: musicVideoScenes.jobId })
        .from(musicVideoScenes).where(eq(musicVideoScenes.id, input.sceneId));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });
      const [job] = await db.select({ userId: musicVideoJobs.userId })
        .from(musicVideoJobs).where(eq(musicVideoJobs.id, scene.jobId));
      if (!job || job.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await db.update(musicVideoScenes)
        .set({ sceneType: input.sceneType, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));
      return { success: true, sceneId: input.sceneId, sceneType: input.sceneType };
    }),

  /**
   * Run Hedra Avatar lip sync on a Performance Mode scene.
   * Requires heroImageUrl to be set on the scene (the portrait frame for Hedra input).
   * Uses isolated vocals from Demucs if available, otherwise falls back to full audio.
   */
  getScenePreviews: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify ownership
      const [job] = await db
        .select({ id: musicVideoJobs.id, status: musicVideoJobs.status, audioUrl: musicVideoJobs.audioUrl, title: musicVideoJobs.title })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const scenes = await db
        .select({
          id: musicVideoScenes.id,
          sceneIndex: musicVideoScenes.sceneIndex,
          sceneType: musicVideoScenes.sceneType,
          status: musicVideoScenes.status,
          lipSync: musicVideoScenes.lipSync,
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
        jobAudioUrl: job.audioUrl ?? null,
        scenes: scenes.map((s) => {
          const isPerformance = s.sceneType === "performance";
          // needsLipSync: performance scene that has lipSync enabled (lipSync column or inferred from sceneType)
          // For performance scenes with lipSync=off, the raw Seedance videoUrl IS the final clip.
          const needsLipSync = isPerformance && !!s.lipSync;

          // compositeDone:
          // - Old compositing pipeline: compositeStatus=done + compositeVideoUrl present
          // - New direct pipeline (lipSync on): compositeStatus=skipped + lipSyncStatus=done + lipSyncVideoUrl present
          // - New direct pipeline (lipSync off): compositeStatus=skipped + status=completed + videoUrl present
          const compositeDone =
            (s.compositeStatus === "done" && !!s.compositeVideoUrl) ||
            (s.compositeStatus === "skipped" && needsLipSync && s.lipSyncStatus === "done" && !!s.lipSyncVideoUrl) ||
            (s.compositeStatus === "skipped" && !needsLipSync && s.status === "completed" && !!s.videoUrl);

          const cinematicReady = !isPerformance && s.status === "completed" && !!s.videoUrl;

          let previewUrl: string | null = null;
          let previewState: "pending" | "waiting" | "compositing" | "ready" = "waiting";

          if (isPerformance) {
            if (compositeDone) {
              // New pipeline (lipSync on): lipSyncVideoUrl is the final clip
              // New pipeline (lipSync off): videoUrl is the final clip
              // Old pipeline: compositeVideoUrl is the final clip
              if (s.compositeStatus === "skipped") {
                previewUrl = needsLipSync ? s.lipSyncVideoUrl! : s.videoUrl!;
              } else {
                previewUrl = s.compositeVideoUrl!;
              }
              previewState = "ready";
            } else if (
              s.lipSyncStatus === "processing" ||
              s.compositeStatus === "processing" ||
              (s.status === "completed" && needsLipSync && s.lipSyncStatus !== "done") ||
              (s.compositeStatus === "pending" && s.status === "completed")
            ) {
              previewState = "compositing";
            } else if (s.status === "pending") {
              previewState = "pending";
            } else if (s.status === "generating") {
              previewState = "waiting";
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
  getSceneActionHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(sceneActionLogs)
        .where(eq(sceneActionLogs.userId, ctx.user.id))
        .orderBy(desc(sceneActionLogs.createdAt))
        .limit(30);
      return rows;
    }),

  // ── Pause render — stops new scenes from being dispatched ──────────────
  rewriteSceneWithAI: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      direction: z.string().min(3).max(1000), // e.g. "make it more dramatic", "change to outdoor"
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

      const { invokeLLM } = await import("../../_core/llm");

      const systemPrompt = `You are WizGenesis™ — the cinematic intelligence layer of WIZ AI.
You are helping a user rewrite a scene prompt for an AI music video generator.

Your task:
1. Take the EXISTING scene prompt and the user's DIRECTION for change
2. Rewrite the scene prompt to incorporate the direction while preserving the core context (character, venue, song section, timing)
3. Make the result more cinematic, detailed, and AI-friendly
4. Keep it under 400 words — concise but rich
5. Write in present tense, descriptive prose
6. Do NOT add music/audio instructions
7. Do NOT mention AI, generation, or rendering
8. Return ONLY the rewritten prompt text. No explanations, no preamble, no quotes.`;

      const userContent = [
        `Existing scene prompt: "${scene.prompt}"`,
        scene.lyrics ? `Lyrics for this scene: "${scene.lyrics}"` : "",
        `User's direction: "${input.direction}"`,
        `Rewrite the scene prompt to incorporate this direction.`,
      ].filter(Boolean).join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const rewritten = (typeof rawContent === "string" ? rawContent.trim() : "") || scene.prompt;
      return { rewritten, originalPrompt: scene.prompt };
    }),

  // ── Regenerate all scenes with optional new direction ─────────────────────
  // Regenerates the full storyboard for a job. Only allowed before rendering starts
  // (status = storyboard or awaiting_probe_approval with no completed scenes).
  generateMissingStoryboardImages: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      // Only scenes missing a storyboard image (or with a non-cinematic image)
      const scenesNeedingImage = scenes.filter(s => {
        if (!s.previewImageUrl) return true;
        if (s.previewImageUrl.includes("-cinematic") || s.previewImageUrl.includes("music-video-storyboard")) return false;
        return true; // non-storyboard image (e.g. character portrait)
      });

      if (scenesNeedingImage.length === 0) {
        return { success: true, generated: 0, message: "All scenes already have storyboard images" };
      }

      const jobAspectRatio = (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
      const { generateCinematicStoryboardImage } = await import("../../ai-apis/fal-image-gen");
      const { resolveVenueReferenceUrl } = await import("../../music-video-service");
      const venueRefUrl = resolveVenueReferenceUrl(job.sceneSetting);

      console.log(`[GenerateMissingPreviews] Generating ${scenesNeedingImage.length} missing storyboard images for job ${input.jobId}`);

      let generated = 0;
      const errors: string[] = [];

      await Promise.allSettled(
        scenesNeedingImage.map(async (scene) => {
          try {
            const { url } = await generateCinematicStoryboardImage({
              prompt: scene.prompt,
              aspectRatio: jobAspectRatio,
              storageKeyPrefix: `music-video-storyboard/${input.jobId}-scene-${scene.id}-cinematic`,
              venueReferenceUrl: venueRefUrl ?? undefined,
            });
            if (url) {
              await db!.update(musicVideoScenes)
                .set({ previewImageUrl: url, updatedAt: new Date() })
                .where(eq(musicVideoScenes.id, scene.id));
              generated++;
              console.log(`[GenerateMissingPreviews] Scene ${scene.id} (index ${scene.sceneIndex}) → ${url.slice(0, 80)}...`);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Scene ${scene.id}: ${msg.slice(0, 80)}`);
            console.warn(`[GenerateMissingPreviews] Scene ${scene.id} failed:`, msg);
          }
        })
      );

      return {
        success: errors.length === 0,
        generated,
        total: scenesNeedingImage.length,
        errors,
        message: `Generated ${generated}/${scenesNeedingImage.length} storyboard images${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
      };
    }),
});
