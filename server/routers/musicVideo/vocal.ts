/**
 * Music Video — Vocal sub-router
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

export const musicVideoVocalRouter = router({
  getVocalStems: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify ownership
      const [job] = await db.select({ id: musicVideoJobs.id })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const stems = await db.select().from(musicVideoVocalStems)
        .where(eq(musicVideoVocalStems.jobId, input.jobId));

      return stems.map((s) => ({
        id: s.id,
        stemIndex: s.stemIndex,
        stemUrl: s.stemUrl,
        voiceGender: s.voiceGender ?? "unknown",
        voiceLabel: s.voiceLabel ?? "Lead Vocal",
        isLeadVocal: s.isLeadVocal,
        characterName: s.characterName ?? null,
      }));
    }),

  /** Assign a vocal stem to a character (for duet/ensemble mode) */
  assignVocalStem: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      stemId: z.number().int(),
      characterName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify ownership
      const [job] = await db.select({ id: musicVideoJobs.id })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(musicVideoVocalStems)
        .set({ characterName: input.characterName })
        .where(and(
          eq(musicVideoVocalStems.id, input.stemId),
          eq(musicVideoVocalStems.jobId, input.jobId)
        ));

      return { success: true };
    }),

  /** Mark a stem as the lead vocal (used for single-vocalist jobs) */
  setLeadVocalStem: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      stemId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify ownership
      const [job] = await db.select({ id: musicVideoJobs.id })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Clear existing lead flag on all stems for this job
      await db.update(musicVideoVocalStems)
        .set({ isLeadVocal: false })
        .where(eq(musicVideoVocalStems.jobId, input.jobId));

      // Set the new lead stem
      await db.update(musicVideoVocalStems)
        .set({ isLeadVocal: true })
        .where(and(
          eq(musicVideoVocalStems.id, input.stemId),
          eq(musicVideoVocalStems.jobId, input.jobId)
        ));

      return { success: true };
    }),

  /** Activate Duet or Ensemble Mode — deducts credits and marks the job */
  activateMultiVocalMode: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      mode: z.enum(["duet", "ensemble"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership
      const [job] = await db.select({ id: musicVideoJobs.id, userId: musicVideoJobs.userId })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Credit cost
      const creditCost = input.mode === "duet" ? 25 : 50;
      const label = input.mode === "duet" ? "Duet Mode" : "Ensemble Mode";

      // Deduct credits
      const deducted = await deductCredits(
        ctx.user.id,
        creditCost,
        `${label} — multi-vocal lip sync for job ${input.jobId}`,
        input.jobId
      );
      if (!deducted) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `Insufficient credits. ${label} requires ${creditCost} credits.`,
        });
      }

      // Mark the job with the vocal mode
      await db.update(musicVideoJobs)
        .set({ multiVocalMode: input.mode } as any)
        .where(eq(musicVideoJobs.id, input.jobId));

      return { success: true, creditsDeducted: creditCost, mode: input.mode };
    }),

    // ── Phase 2: Unified Job Status ───────────────────────────────────────────
  // Returns a user-facing progress model with percentage and human-readable state.
  // The frontend polls this every 5 seconds instead of the raw status field.
  providerHealth: protectedProcedure.query(async () => {
    const { checkAllProviders } = await import("../../provider-health");
    return checkAllProviders();
  }),

  // ── Stem Separation (FAL Demucs htdemucs_6s) ──────────────────────────────
  // Submits a 6-stem separation job to FAL AI and stores the request ID.
  // The heartbeat polls for completion and populates stemVocalsUrl, stemDrumsUrl, etc.
  separateStems: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership and get audioUrl
      const [job] = await db
        .select({
          id: musicVideoJobs.id,
          audioUrl: musicVideoJobs.audioUrl,
          stemAnalysisStatus: sql<string>`${musicVideoJobs.stemAnalysisStatus}`,
        })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (!job.audioUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "No audio uploaded yet" });
      if (job.stemAnalysisStatus === "done") return { status: "already_done" as const };
      if (job.stemAnalysisStatus === "processing") return { status: "in_progress" as const };

      // Submit to FAL Demucs
      const { submitDemucsJob } = await import("../../ai-apis/fal-demucs-stems");
      const requestId = await submitDemucsJob(job.audioUrl, ["vocals", "drums", "bass", "other", "guitar", "piano"]);

      // Store request ID and mark as processing
      await db
        .update(musicVideoJobs)
        .set({
          stemAnalysisStatus: "processing",
          lalalTaskId: `demucs:${requestId}`,  // reuse lalalTaskId column for FAL request ID
        } as any)
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[SeparateStems] Job ${input.jobId}: submitted FAL Demucs request ${requestId}`);
      return { status: "submitted" as const, requestId };
    }),

  // ── Get Stem Analysis Status & URLs ──────────────────────────────────────
  getStemAnalysis: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [job] = await db
        .select({
          stemAnalysisStatus: sql<string>`${musicVideoJobs.stemAnalysisStatus}`,
          stemVocalsUrl: musicVideoJobs.stemVocalsUrl,
          stemDrumsUrl: musicVideoJobs.stemDrumsUrl,
          stemBassUrl: musicVideoJobs.stemBassUrl,
          stemPianoUrl: musicVideoJobs.stemPianoUrl,
          stemGuitarUrl: musicVideoJobs.stemGuitarUrl,
          stemOtherUrl: musicVideoJobs.stemOtherUrl,
        })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const stems = [
        { type: "vocals" as const, label: "Lead Vocal", url: job.stemVocalsUrl ?? null },
        { type: "drums" as const, label: "Drums", url: job.stemDrumsUrl ?? null },
        { type: "bass" as const, label: "Bass", url: job.stemBassUrl ?? null },
        { type: "piano" as const, label: "Piano / Keys", url: job.stemPianoUrl ?? null },
        { type: "guitar" as const, label: "Guitar", url: job.stemGuitarUrl ?? null },
        { type: "other" as const, label: "Other Instruments", url: job.stemOtherUrl ?? null },
      ].filter((s) => s.url !== null);

      return {
        status: job.stemAnalysisStatus ?? "pending",
        stems,
      };
    }),

  // List all jobs across all studios (for Projects page unified view)
});
