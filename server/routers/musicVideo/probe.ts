/**
 * Music Video — Probe sub-router
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

export const musicVideoProbeRouter = router({
  approveProbe: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.probePassed !== false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No probe pending approval" });
      }
      await db.update(musicVideoJobs)
        .set({ probePassed: true, probeApprovedAt: new Date(), status: "rendering" as any, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));
      // Also mark the probe scene itself as approved so the probe gate doesn't block on it
      if (job.probeSceneId) {
        await db.update(musicVideoScenes)
          .set({ isApproved: true, approvedAt: new Date(), updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, job.probeSceneId));
        console.log(`[MusicVideo] Job ${input.jobId} probe scene ${job.probeSceneId} marked isApproved=true`);
      }
      console.log(`[MusicVideo] Job ${input.jobId} probe APPROVED by user ${ctx.user.id} — status → rendering, full render released`);
      return { success: true, message: "Probe approved. Full render will begin on the next heartbeat tick." };
    }),

  rejectProbe: protectedProcedure
    .input(z.object({ jobId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.probePassed !== false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No probe pending review" });
      }
      // Reset the probe scene back to pending and clear probe state
      if (job.probeSceneId) {
        await db.update(musicVideoScenes)
          .set({
            status: "pending",
            taskId: null,
            errorMessage: null,
            lipSyncStatus: "pending",
            lipSyncTaskId: null,
            lipSyncVideoUrl: null,
            updatedAt: new Date(),
          })
          .where(eq(musicVideoScenes.id, job.probeSceneId));
      }
      await db.update(musicVideoJobs)
        .set({
          probePassed: null,
          probeSceneId: null,
          probeVideoUrl: null,
          status: "rendering" as any,  // Resume so heartbeat re-dispatches the probe scene
          updatedAt: new Date(),
        })
        .where(eq(musicVideoJobs.id, input.jobId));
      console.log(`[MusicVideo] Job ${input.jobId} probe REJECTED by user ${ctx.user.id}. Reason: ${input.reason ?? "not specified"}. Status → rendering. Probe will re-run on next heartbeat.`);
      return { success: true, message: "Probe rejected. A new probe scene will be dispatched on the next heartbeat tick." };
    }),

  // ─── Hedra Performance Mode Procedures ───────────────────────────────────────

  /**
   * Set a scene's type to 'cinematic' or 'performance'.
   * Performance scenes will use Hedra Avatar for lip sync instead of WaveSpeed + Sync Labs.
   */
  getProbeStatus: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [job] = await db.select({
        probePassed: musicVideoJobs.probePassed,
        probeSceneId: musicVideoJobs.probeSceneId,
        probeVideoUrl: musicVideoJobs.probeVideoUrl,
        probeApprovedAt: musicVideoJobs.probeApprovedAt,
        status: musicVideoJobs.status,
      }).from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        probePassed: job.probePassed,
        probeSceneId: job.probeSceneId,
        probeVideoUrl: job.probeVideoUrl,
        probeApprovedAt: job.probeApprovedAt,
        jobStatus: job.status,
        // Derived state for UI
        probeState: job.probePassed === null ? "not_started"
          : (job.probePassed === false || (job.probePassed as any) === 0) ? (job.probeVideoUrl ? "awaiting_approval" : "rendering")
          : "approved",
      };
    }),

  // ── VOCAL STEMS ─────────────────────────────────────────────────────────────

  /** Return all vocal stems for a job (for the WizPerformer assignment UI) */
  launchProbeRender: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneId: z.number().int(),
      aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]).optional().default("16:9"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Block if job is actively rendering all scenes
      if (job.status === "rendering" || job.status === "assembling") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot launch a probe render while a full render is in progress. Wait for it to finish or cancel it first.",
        });
      }

      // Fetch the specific scene
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

      // ── ASYNC QUEUE: Reset scene to pending and let the heartbeat dispatch it ──────────
      // We do NOT call startSceneRender synchronously here — that call takes 5-30s
      // (audio extraction + WaveSpeed API) and causes Cloud Run cold-start timeouts.
      // Instead: reset the scene to pending, mark the job as rendering, and return
      // immediately. The sceneDispatchHeartbeat will pick it up on its next tick (~30s).
      // The heartbeat's probe gate (probePassed=false) ensures only this scene is dispatched.

      // Clear any previous idempotency records so the heartbeat can re-dispatch
      await resetSceneAttempts(input.sceneId);

      // Reset the scene to pending so the heartbeat dispatches it
      await db.update(musicVideoScenes)
        .set({
          status: "pending",
          taskId: null,
          videoUrl: null,
          videoKey: null,
          errorMessage: null,
          retryCount: 0,
          lipSyncStatus: "pending",
          lipSyncVideoUrl: null,
          lipSyncVideoKey: null,
          lipSyncTaskId: null,
          compositeVideoUrl: null,
          compositeVideoKey: null,
          compositeStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, input.sceneId));

      // Mark the job as rendering with this scene as the probe scene.
      // The heartbeat's probe gate (probePassed=false) will ensure only this scene
      // is dispatched — all other scenes remain blocked until the probe is approved.
      await db.update(musicVideoJobs)
        .set({
          status: "rendering",
          completedScenes: 0,
          aspectRatio: input.aspectRatio,
          probeSceneId: input.sceneId,
          probePassed: false,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[ProbeRender] Scene ${scene.id} queued for probe render — heartbeat will dispatch on next tick`);
      return { success: true, sceneId: scene.id };
    }),

  /**
   * Generate missing storyboard preview images for all scenes in a job that lack one.
   * Runs the cinematic image generation pipeline for each scene without a previewImageUrl.
   */
  runHedraLipSync: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      heroImageUrl: z.string().url().optional(), // Override portrait image URL
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership and get scene + job data
      const [scene] = await db.select()
        .from(musicVideoScenes).where(eq(musicVideoScenes.id, input.sceneId));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      const [job] = await db.select()
        .from(musicVideoJobs).where(eq(musicVideoJobs.id, scene.jobId));
      if (!job || job.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const { isHedraConfigured } = await import("../../ai-apis/hedra-lipsync");
      if (!isHedraConfigured()) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Hedra API key not configured" });
      }

      const imageUrl = input.heroImageUrl ?? scene.heroImageUrl;
      if (!imageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No hero image URL available. Please provide a portrait image for this scene." });
      }

      // Save the hero image URL if provided
      if (input.heroImageUrl && input.heroImageUrl !== scene.heroImageUrl) {
        await db.update(musicVideoScenes)
          .set({ heroImageUrl: input.heroImageUrl, updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, input.sceneId));
      }

      // Mark as processing
      await db.update(musicVideoScenes)
        .set({ hedraStatus: "processing", sceneType: "performance", updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));

      // Extract audio segment for this scene
      const startSec = scene.startTime;
      const durationSec = scene.duration;
      const audioUrl = job.audioUrl;

      // Run Hedra asynchronously — don't block the HTTP response
      (async () => {
        try {
          const { waitForHedraLipSync } = await import("../../ai-apis/hedra-lipsync");
          const { storagePut } = await import("../../storage");
          const os = await import("os");
          const path = await import("path");
          const fs = await import("fs");
          const { execSync } = await import("child_process");

          // Download and trim audio to scene duration
          const tmpDir = os.tmpdir();
          const rawAudioFile = path.join(tmpDir, `hedra-raw-${scene.id}-${Date.now()}.mp3`);
          const trimmedAudioFile = path.join(tmpDir, `hedra-trimmed-${scene.id}-${Date.now()}.mp3`);

          execSync(`curl -s -L -o "${rawAudioFile}" "${audioUrl}"`);
          execSync(`ffmpeg -y -i "${rawAudioFile}" -ss ${startSec} -t ${durationSec} -c:a libmp3lame -q:a 2 "${trimmedAudioFile}" 2>/dev/null`);

          // Upload trimmed audio to S3
          const trimmedAudioBuffer = fs.readFileSync(trimmedAudioFile);
          const trimmedAudioKey = `music-video-scenes/hedra-audio-${scene.id}-${Date.now()}.mp3`;
          const { url: trimmedAudioUrl } = await storagePut(trimmedAudioKey, trimmedAudioBuffer, "audio/mpeg");

          // Clean up temp files
          try { fs.unlinkSync(rawAudioFile); fs.unlinkSync(trimmedAudioFile); } catch {}

          // Run Hedra
          const result = await waitForHedraLipSync({
            imageUrl,
            audioUrl: trimmedAudioUrl,
            sceneId: scene.id,
            aspectRatio: (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "21:9",
            resolution: "720p",
            textPrompt: "A singer performing expressively to the camera, mouth moving naturally with the music, emotional vocal performance",
          });

          // Save output to S3
          const hedraVideoRes = await fetch(result.outputUrl);
          const hedraVideoBuffer = Buffer.from(await hedraVideoRes.arrayBuffer());
          const hedraVideoKey = `music-video-scenes/hedra-${scene.id}-${Date.now()}.mp4`;
          const { url: hedraVideoUrl } = await storagePut(hedraVideoKey, hedraVideoBuffer, "video/mp4");

          // Update scene with result
          const dbConn = await getDb();
          if (dbConn) {
            await dbConn.update(musicVideoScenes)
              .set({
                hedraVideoUrl,
                hedraVideoKey,
                hedraGenerationId: result.generationId,
                hedraStatus: "done",
                updatedAt: new Date(),
              })
              .where(eq(musicVideoScenes.id, scene.id));
          }
          console.log(`[HedraLipSync] Scene ${scene.id} complete — output: ${hedraVideoUrl}`);
        } catch (err) {
          console.error(`[HedraLipSync] Scene ${scene.id} failed:`, err);
          const dbConn = await getDb();
          if (dbConn) {
            await dbConn.update(musicVideoScenes)
              .set({ hedraStatus: "error", errorMessage: String(err), updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
          }
        }
      })();

      return { success: true, sceneId: input.sceneId, hedraStatus: "processing" };
    }),

  /**
   * Get the current Hedra status for a Performance Mode scene.
   * Poll this until hedraStatus === 'done' to get the output URL.
   */
  getHedraStatus: protectedProcedure
    .input(z.object({ sceneId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [scene] = await db.select({
        id: musicVideoScenes.id,
        jobId: musicVideoScenes.jobId,
        hedraStatus: musicVideoScenes.hedraStatus,
        hedraVideoUrl: musicVideoScenes.hedraVideoUrl,
        hedraGenerationId: musicVideoScenes.hedraGenerationId,
        heroImageUrl: musicVideoScenes.heroImageUrl,
        sceneType: musicVideoScenes.sceneType,
      }).from(musicVideoScenes).where(eq(musicVideoScenes.id, input.sceneId));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });
      const [job] = await db.select({ userId: musicVideoJobs.userId })
        .from(musicVideoJobs).where(eq(musicVideoJobs.id, scene.jobId));
      if (!job || job.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return {
        sceneId: scene.id,
        sceneType: scene.sceneType,
        hedraStatus: scene.hedraStatus,
        hedraVideoUrl: scene.hedraVideoUrl ?? null,
        hedraGenerationId: scene.hedraGenerationId ?? null,
        heroImageUrl: scene.heroImageUrl ?? null,
      };
    }),

  // Get probe status for a job (used by UI to poll for probe completion)
});
