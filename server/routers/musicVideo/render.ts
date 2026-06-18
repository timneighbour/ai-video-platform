/**
 * Music Video — Render sub-router
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

export const musicVideoRenderRouter = router({
  startRender: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]).optional().default("16:9"),
      includeCaptions: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status !== "storyboard_ready" && job.status !== "failed" && job.status !== "cancelled") {
        // Guard against duplicate render submissions — if already rendering, return gracefully
        if (job.status === "rendering" || job.status === "assembling") {
          console.warn(`[MusicVideo] Duplicate render request for job ${input.jobId} (status: ${job.status}). Ignoring.`);
          return { success: true, creditCost: 0, duplicate: true };
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job must have a storyboard before rendering" });
      }
      // If job previously failed or was cancelled, reset it to storyboard_ready so it can be re-rendered
      if (job.status === "failed" || job.status === "cancelled") {
        console.log(`[MusicVideo] Job ${input.jobId} was ${job.status} — resetting to storyboard_ready for retry render.`);
        await db.update(musicVideoJobs)
          .set({ status: "storyboard_ready", errorMessage: null, completedScenes: 0, updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
        // Reset all failed/generating/cancelled scenes back to pending so they re-render
        await db.update(musicVideoScenes)
          .set({ status: "pending", errorMessage: null, videoUrl: null, taskId: null, updatedAt: new Date() })
          .where(and(eq(musicVideoScenes.jobId, input.jobId), inArray(musicVideoScenes.status, ["failed", "generating", "cancelled"])));
      }

      // ── Per-user concurrent render throttle ──────────────────────────────────
      // Max 1 active render job per user to prevent API overload and ensure quality
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const activeJobs = await db.select({ id: musicVideoJobs.id })
          .from(musicVideoJobs)
          .where(
            and(
              eq(musicVideoJobs.userId, ctx.user.id),
              inArray(musicVideoJobs.status, ["rendering", "assembling"])
            )
          );
        if (activeJobs.length > 0) {
          // Auto-cancel stale rendering/assembling jobs — prevents credit waste from orphaned jobs
          console.warn(`[MusicVideo] User ${ctx.user.id} has ${activeJobs.length} stale active job(s) — auto-cancelling before starting new render`);
          for (const staleJob of activeJobs) {
            await db.update(musicVideoJobs)
              .set({ status: "cancelled", updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, staleJob.id));
            await db.update(musicVideoScenes)
              .set({ status: "failed", updatedAt: new Date() })
              .where(and(eq(musicVideoScenes.jobId, staleJob.id), inArray(musicVideoScenes.status, ["pending", "generating"])));
            console.warn(`[MusicVideo] Auto-cancelled stale job ${staleJob.id} for user ${ctx.user.id}`);
          }
        }

        // ── Daily render cap (3 renders/day per user) ──────────────────────────────
        // Prevents abuse and protects against runaway API costs.
        const DAILY_RENDER_CAP = 3;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const rendersToday = await db.select({ id: musicVideoJobs.id })
          .from(musicVideoJobs)
          .where(
            and(
              eq(musicVideoJobs.userId, ctx.user.id),
              inArray(musicVideoJobs.status, ["rendering", "assembling", "completed", "failed"]),
              gte(musicVideoJobs.updatedAt, todayStart)
            )
          );
        if (rendersToday.length >= DAILY_RENDER_CAP) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Daily render limit reached (${DAILY_RENDER_CAP} videos per day). Your limit resets at midnight. Upgrade your plan for higher limits.`,
          });
        }
      }
      // ── CHARACTER LOCK™ HARD GATE────────────────────────────────────────────────────
      // Character Lock™ is a HARD PLATFORM REQUIREMENT for artist-based videos.
      // Render is BLOCKED unless at least one character has a masterPortraitUrl or
      // previewImageUrl that can be injected as a reference image into every WaveSpeed call.
      // A raw photo upload alone is not sufficient — the portrait must have been generated.
      if (job.artistType === "solo_artist" || job.artistType === "band") {
        const jobCharsForGate = await db.select({
          id: videoCharacters.id,
          name: videoCharacters.name,
          masterPortraitUrl: videoCharacters.masterPortraitUrl,
          previewImageUrl: videoCharacters.previewImageUrl,
        }).from(videoCharacters).where(eq(videoCharacters.jobId, input.jobId));

        const hasPortrait = jobCharsForGate.some(
          c => !!(c.masterPortraitUrl ?? c.previewImageUrl)
        );

        // Fallback: accept job-level characterImageUrl (legacy single-character jobs)
        const hasLegacyPhoto = !!job.characterImageUrl;

        if (!hasPortrait && !hasLegacyPhoto) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Character Lock™ required — your character portrait has not been generated yet. " +
              "Please go to the Cast step, upload a photo of your artist, and click \"Generate Portrait\" " +
              "before rendering. This ensures your character looks consistent across every scene.",
          });
        }

        if (!hasPortrait && hasLegacyPhoto) {
          // Legacy job: has a raw photo but no AI portrait. Warn but allow.
          console.warn(`[MusicVideo] Job ${input.jobId} has legacy characterImageUrl but no masterPortraitUrl. Character consistency may be reduced.`);
        }

        if (hasPortrait) {
          console.log(`[MusicVideo] Job ${input.jobId} Character Lock™ ACTIVE: ${jobCharsForGate.filter(c => c.masterPortraitUrl ?? c.previewImageUrl).length} portrait(s) ready.`);
        }
      }

      // ── PROVIDER HEALTH GATE ─────────────────────────────────────────────────
      // Before deducting credits, verify at least one video provider is available.
      // This prevents users from losing credits when all providers are down.
      const providerAvailable = await isAnyProviderAvailable();
      if (!providerAvailable) {
        console.error(`[MusicVideo] All video providers unavailable — blocking render for job ${input.jobId}`);
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "We could not start your video build right now — our video generation service is temporarily unavailable. Your credits have not been used. Please try again in a few minutes or contact support.",
        });
      }

      // ── HARD CREDIT GATE ───────────────────────────────────────────────────────────────────────────
      // Blocks render if user does not have enough credits. Checked BEFORE any provider
      // is called so no API cost is incurred on insufficient-credit attempts.
      if (!isAdmin) {
        const creditBalance = await getUserCredits(ctx.user.id);
        if (creditBalance < job.creditCost) {
          const shortfall = job.creditCost - creditBalance;
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You need ${job.creditCost} credits to render this video, but you only have ${creditBalance}. Top up ${shortfall} more credits to continue.`,
          });
        }
        await deductCredits(ctx.user.id, job.creditCost, `Music video: ${job.title}`);
      } else {
        console.log(`[MusicVideo] Admin ${ctx.user.id} bypassing credit check (cost: ${job.creditCost})`);
      }
      // Update job status, persist the chosen aspect ratio and caption preference
      await db.update(musicVideoJobs)
        .set({ status: "rendering", completedScenes: 0, aspectRatio: input.aspectRatio, captionsEnabled: input.includeCaptions, storyboardLockedAt: new Date(), updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Start rendering all scenes asynchronously
      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      // ── STORYBOARD LOCK: Auto-generate missing previews ──────────────────────
      // If scenes are missing preview images, generate them automatically so the
      // user doesn't have to manually click "Generate Preview" for each scene.
      const scenesWithoutPreview = scenes.filter(s => !s.previewImageUrl);
      if (scenesWithoutPreview.length > 0) {
        console.log(`[MusicVideo] Auto-generating ${scenesWithoutPreview.length} missing scene previews for job ${input.jobId}...`);
        await Promise.allSettled(
          scenesWithoutPreview.map(async (scene) => {
            try {
              const { url } = await generateImage({ prompt: scene.prompt });
              if (url) {
                await db.update(musicVideoScenes)
                  .set({ previewImageUrl: url })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[MusicVideo] Auto-preview generated for scene ${scene.sceneIndex + 1}`);
              }
            } catch (previewErr) {
              // Non-fatal: if auto-preview fails, proceed without it
              console.warn(`[MusicVideo] Auto-preview failed for scene ${scene.sceneIndex + 1}:`, previewErr);
            }
          })
        );
        // Reload scenes with fresh preview URLs
        const refreshedScenes = await db.select().from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, input.jobId));
        scenes.splice(0, scenes.length, ...refreshedScenes);
      }
      console.log(`[MusicVideo] Storyboard check: ${scenes.filter(s => s.previewImageUrl).length}/${scenes.length} scenes have previews. Proceeding with render.`);

      // ── Profitability Gate 4: Scene classification + renderer routing ──────
      // Resolve user plan for renderer routing
      const renderUserSub = await getUserSubscription(ctx.user.id);
      const renderProductPlan = mapDbPlanToProductPlan(
        renderUserSub?.status === "active" ? renderUserSub.plan : null
      );

      // Classify scenes by importance (async LLM for 4+ scenes, heuristic otherwise)
      const classifiedScenes = await classifyScenes(
        scenes.map((s) => ({
          sceneIndex: s.sceneIndex,
          prompt: s.prompt,
          lyrics: s.lyrics,
          startTime: s.startTime,
          duration: s.duration,
        }))
      );

      // Build cost-aware routing plan and enforce hard stop
      let routingPlan = buildRoutingPlan(classifiedScenes, renderProductPlan);
      if (!routingPlan.withinBudget) {
        console.warn(`[MusicVideo] Job ${input.jobId} estimated cost £${routingPlan.totalEstimatedCostGBP.toFixed(2)} exceeds hard stop £${routingPlan.hardStopGBP} — downgrading scenes`);
        routingPlan = enforceHardStop(routingPlan);
      }

      // Build a map of sceneIndex -> renderer for fast lookup
      const rendererMap = new Map(
        routingPlan.decisions.map((d) => [d.sceneIndex, d.renderer])
      );

      console.log(`[MusicVideo] Job ${input.jobId} routing plan: estimated £${routingPlan.totalEstimatedCostGBP.toFixed(2)}, premium scenes: ${routingPlan.premiumScenesUsed}/${routingPlan.premiumScenesAllowed}, plan: ${renderProductPlan}`);

      // Build the full character map from the job's characterRoster (includes locked + AI-invented characters)
      // This ensures ALL characters — not just user-uploaded ones — are visually consistent across scenes
      const fullCharMap = new Map<string, { name: string; role: string; brief: string }>();

      // First: load the AI-generated roster saved during storyboard generation
      if (job.characterRoster) {
        try {
          const roster: Array<{ name: string; role: string; isLocked: boolean; description: string }> =
            JSON.parse(job.characterRoster);
          for (const c of roster) {
            fullCharMap.set(c.name.toLowerCase(), { name: c.name, role: c.role, brief: c.description });
          }
          console.log(`[MusicVideo] Loaded ${roster.length} characters from roster for job ${input.jobId}: ${roster.map(c => c.name).join(", ")}`);
        } catch (err) {
          console.warn(`[MusicVideo] Failed to parse characterRoster for job ${input.jobId}:`, err);
        }
      }

      // Second: override/supplement with locked character descriptions from videoCharacters table
      // (These are the user-uploaded photo descriptions — they take precedence over AI-generated ones)
      const allJobCharsForRender = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));
      for (const c of allJobCharsForRender) {
        if (c.isLocked && c.lockedDescription) {
          fullCharMap.set(c.name.toLowerCase(), { name: c.name, role: c.role ?? "", brief: c.lockedDescription });
        }
      }

      console.log(`[MusicVideo] Final character map for job ${input.jobId}: ${Array.from(fullCharMap.keys()).join(", ")}`);

      // ── REALISTIC MUSIC PERFORMANCE SYSTEM ──────────────────────────────────
      // Step 1: Get or generate instrument analysis for this job
      let instrumentAnalysis: InstrumentAnalysis | null = null;
      try {
        if ((job as any).instrumentAnalysis) {
          instrumentAnalysis = JSON.parse((job as any).instrumentAnalysis) as InstrumentAnalysis;
          console.log(`[MusicVideo] Loaded existing instrument analysis for job ${input.jobId}: ${instrumentAnalysis.instruments.map(i => i.label).join(", ")}`);
        } else {
          console.log(`[MusicVideo] Running instrument analysis for job ${input.jobId}...`);
          instrumentAnalysis = await analyseAudioInstruments({
            genre: job.genre,
            mood: job.mood,
            title: job.title,
            lyrics: job.transcription,
            audioDuration: job.audioDuration,
            themePrompt: job.themePrompt,
          });
          // Persist to DB for future renders
          await db!.update(musicVideoJobs)
            .set({
              instrumentAnalysis: JSON.stringify(instrumentAnalysis),
              songBpm: instrumentAnalysis.tempo != null ? normaliseBpm(instrumentAnalysis.tempo, job.genre) : (job.songBpm ?? null),
              updatedAt: new Date(),
            } as any)
            .where(eq(musicVideoJobs.id, input.jobId));
          console.log(`[MusicVideo] Instrument analysis complete for job ${input.jobId}: ${instrumentAnalysis.instruments.map(i => i.label).join(", ")} at ${instrumentAnalysis.tempo} BPM`);
        }
      } catch (err) {
        console.warn(`[MusicVideo] Instrument analysis failed for job ${input.jobId}, skipping performance directives:`, err);
      }

      // Step 2: Assign instruments to characters
      let performanceAssignments: CharacterInstrumentAssignment[] = [];
      if (instrumentAnalysis && allJobCharsForRender.length > 0) {
        try {
          performanceAssignments = assignInstrumentsToCharacters(
            allJobCharsForRender.map(c => ({ name: c.name, role: c.role, slotIndex: c.slotIndex })),
            instrumentAnalysis
          );
          console.log(`[MusicVideo] Performance assignments for job ${input.jobId}:`, performanceAssignments.map(a => `${a.characterName} → ${a.performanceRole}`).join(", "));

          // Persist instrument role back to each character's lockedRole field
          for (const assignment of performanceAssignments) {
            const char = allJobCharsForRender.find(c => c.name.toLowerCase() === assignment.characterName.toLowerCase());
            if (char) {
              await db!.update(videoCharacters)
                .set({ lockedRole: assignment.performanceRole, updatedAt: new Date() })
                .where(eq(videoCharacters.id, char.id));
            }
          }
        } catch (err) {
          console.warn(`[MusicVideo] Instrument assignment failed for job ${input.jobId}:`, err);
        }
      }

      // Fire-and-forget: start each scene render in batches to avoid API rate limits.
      // Strategy: dispatch BATCH_SIZE scenes at a time, wait INTER_BATCH_DELAY_MS between batches.
      // On transient failure (network/rate-limit/provider error), retry up to MAX_DISPATCH_RETRIES
      // times with exponential backoff before marking the scene as failed.
      const BATCH_SIZE = 5;               // scenes per batch
      const INTER_BATCH_DELAY_MS = 12_000; // 12s between batches (gives Atlas Cloud time to accept)
      const INTRA_BATCH_DELAY_MS = 2_000;  // 2s between scenes within a batch
      const MAX_DISPATCH_RETRIES = 3;      // max retries for transient failures
      (async () => {
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          // ── SPEND PROTECTION: Scene-level idempotency guard (Item 7) ─────────────────────
          // Skip scenes that are already generating or completed to prevent duplicate submissions
          if (scene.status === "generating" || scene.status === "completed") {
            console.log(`[SpendProtection] Scene ${scene.id} skipped — already ${scene.status} (idempotency guard)`);
            successCount++; // count as success so credit refund logic is not triggered
            continue;
          }
          // Intra-batch stagger: 2s between scenes within a batch
          if (i > 0 && i % BATCH_SIZE !== 0) await new Promise((r) => setTimeout(r, INTRA_BATCH_DELAY_MS));
          // Inter-batch pause: 12s between batches to let Atlas Cloud breathe
          if (i > 0 && i % BATCH_SIZE === 0) {
            console.log(`[MusicVideo] Batch ${Math.floor(i / BATCH_SIZE)} complete — waiting ${INTER_BATCH_DELAY_MS / 1000}s before next batch...`);
            await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
          }
          // Use modelAssignment from scene if available, otherwise fall back to router decision
          const rendererType = (scene.modelAssignment as string) ? "wavespeed" : (rendererMap.get(scene.sceneIndex) ?? "seedance");

          // Parse the per-scene character assignments stored by generateStoryboard
          let assignedNames: string[] = [];
          try {
            if (scene.characterAssignments) {
              assignedNames = JSON.parse(scene.characterAssignments);
            }
          } catch {}

          // Build brief block for ONLY the characters assigned to this scene
          // Uses the full character map (locked + AI-invented) for complete consistency
          let sceneBriefs: string[] = [];
          if (assignedNames.length > 0) {
            for (const name of assignedNames) {
              const charData = fullCharMap.get(name.toLowerCase());
              if (charData) {
                sceneBriefs.push(
                  `${charData.name}${charData.role ? ` (${charData.role})` : ""}: ${charData.brief}`
                );
              }
            }
          } else if (fullCharMap.size > 0) {
            // Legacy fallback: inject all characters
            sceneBriefs = Array.from(fullCharMap.values()).map(
              (c) => `${c.name}${c.role ? ` (${c.role})` : ""}: ${c.brief}`
            );
          }

          // Build a compact identity tag for each assigned character.
          // The Hypereal/Seedance APIs have a ~480 char prompt limit, so we must be concise.
          // Strategy: extract the first 2 sentences of the frozen description (most specific visual anchors)
          // and prepend them as a compact identity tag before the scene description.
          const buildCompactTag = (brief: string, name: string, role: string): string => {
            // Extract first 2 sentences — these contain the most critical visual anchors
            const sentences = brief.split(/(?<=[.!?])\s+/);
            const compactBrief = sentences.slice(0, 2).join(" ");
            // Truncate to 200 chars max to leave room for the scene description
            const truncated = compactBrief.length > 200
              ? compactBrief.slice(0, 197) + "..."
              : compactBrief;
            return `[${name}${role ? `, ${role}` : ""}: ${truncated}]`;
          };

          const compactTags = sceneBriefs.length > 0
            ? sceneBriefs.map(brief => {
                // brief format: "Name (role): description"
                const colonIdx = brief.indexOf(": ");
                const nameRole = colonIdx > 0 ? brief.slice(0, colonIdx) : "";
                const description = colonIdx > 0 ? brief.slice(colonIdx + 2) : brief;
                const parenIdx = nameRole.indexOf(" (");
                const charName = parenIdx > 0 ? nameRole.slice(0, parenIdx) : nameRole;
                const charRole = parenIdx > 0 ? nameRole.slice(parenIdx + 2, -1) : "";
                return buildCompactTag(description, charName, charRole);
              })
            : [];

          // Inject character identity tags at the VERY START of the prompt.
          // AI video models weight the beginning of the prompt most heavily —
          // character appearance must come before any scene/setting description.
          // The compact tag format [Name, Role: description] is understood by Seedance/Hailuo.

          // ── AUDIO-CHARACTER MAPPING ──────────────────────────────────────────────────
          // Determine which character is the primary vocalist for this scene.
          // The primary vocalist is the first assigned character that has a "singer" or "vocalist" role.
          // If no vocalist role is found, the first assigned character is used.
          // This ensures the correct character lip-syncs to the correct audio segment.
          let primaryVocalistName: string | null = null;
          if (assignedNames.length > 0) {
            for (const name of assignedNames) {
              const charData = fullCharMap.get(name.toLowerCase());
              if (charData) {
                const roleLower = (charData.role ?? "").toLowerCase();
                if (roleLower.includes("singer") || roleLower.includes("vocalist") || roleLower.includes("lead")) {
                  primaryVocalistName = charData.name;
                  break;
                }
              }
            }
            // Fallback: first assigned character is the vocalist
            if (!primaryVocalistName) {
              const firstCharData = fullCharMap.get(assignedNames[0].toLowerCase());
              if (firstCharData) primaryVocalistName = firstCharData.name;
            }
          }

          // Build the per-scene lyric context block
          // This tells the video generator exactly what lyrics are being sung in this scene
          // and which character is singing them — critical for correct lip sync alignment.
          let lyricContextBlock = "";
          if (scene.lyrics && scene.lyrics.trim()) {
            const cleanLyrics = scene.lyrics.trim().replace(/\n+/g, " ").slice(0, 200);
            if (primaryVocalistName && scene.lipSync !== false) {
              lyricContextBlock = `AUDIO SYNC: ${primaryVocalistName} is singing these lyrics at this moment: "${cleanLyrics}". ` +
                `${primaryVocalistName}'s mouth MUST be open and moving in sync with the vocals. ` +
                `Lip sync is ACTIVE for ${primaryVocalistName} only. Other characters are playing their instruments.`;
            } else if (scene.lipSync !== false) {
              lyricContextBlock = `AUDIO SYNC: The vocalist is singing: "${cleanLyrics}". Lip sync is active.`;
            }
          } else if (primaryVocalistName && scene.lipSync !== false) {
            lyricContextBlock = `AUDIO SYNC: ${primaryVocalistName} is the active vocalist in this scene. ` +
              `${primaryVocalistName}'s mouth MUST be open and moving in sync with the music.`;
          }

          // ── AUDIO-DRIVEN PERFORMANCE BLOCK ──────────────────────────────────────────
          // Each character is bound to their locked audio track.
          // No cross-over. No generic animations. No random movement.
          // Every directive is derived from the actual audio waveform.
          const performanceBlock = instrumentAnalysis && performanceAssignments.length > 0
            ? buildPerformancePromptBlock(
                performanceAssignments,
                assignedNames.length > 0 ? assignedNames : Array.from(fullCharMap.keys()),
                instrumentAnalysis.tempo,
                instrumentAnalysis.energyLevel
              )
            : "";

          // ── UNIFIED STORYBOARD-FAITHFUL PROMPT ──────────────────────────────────────
          // Assembles ALL locked storyboard attributes in the correct priority order:
          //   1. Character identity tags (appearance lock — highest priority)
          //   2. Scene description from storyboard (the approved visual)
          //   3. Visual style lock (e.g. "Cinematic", "Anime")
          //   4. Lyric context + lip sync directive (who is singing what)
          //   5. Audio-driven performance block (instrument + audio track binding)
          //   6. Appearance consistency reminder
          // The storyboard previewImageUrl is passed separately as reference_images.
          const styleBlock = scene.visualStyle
            ? `Visual style: ${scene.visualStyle}. Maintain this style throughout.`
            : "";

          // ── CHARACTER LOCK HARD CONSTRAINTS ───────────────────────────────────────
          // Per the master spec: same face, same clothing, same role, same instrument.
          // NO variation allowed. These are injected as explicit hard constraints.
          const characterLockBlock = compactTags.length > 0
            ? [
                "CHARACTER LOCK (MANDATORY): DO NOT change any character's face, hairstyle, skin tone, clothing, or instrument from the storyboard reference image.",
                "Every character MUST look IDENTICAL to their appearance in the reference image.",
                "NO new characters. NO substitutions. NO variations. Use ONLY the characters shown in the storyboard.",
              ].join(" ")
            : "";

          // ── PROP LOCK BLOCK ─────────────────────────────────────────────────
          // Per the master spec: same instrument model, same colour, same position.
          const propLockParts: string[] = [];
          for (const name of assignedNames) {
            const charData = fullCharMap.get(name.toLowerCase());
            if (charData) {
              const instrument = (charData as any).instrument as string | undefined;
              const outfit = (charData as any).outfit as string | undefined;
              if (instrument) {
                propLockParts.push(`${charData.name}'s ${instrument} MUST remain the SAME model, colour, and position as the storyboard.`);
              }
              if (outfit) {
                propLockParts.push(`${charData.name} is wearing: ${outfit}. DO NOT change outfit.`);
              }
            }
          }
          const propLockBlock = propLockParts.length > 0
            ? `PROP LOCK: ${propLockParts.join(" ")}`
            : "";

          const enrichedScenePrompt = compactTags.length > 0
            ? [
                compactTags.join(" "),
                scene.prompt,
                styleBlock,
                characterLockBlock,
                propLockBlock,
                lyricContextBlock,
                performanceBlock,
                "CONSISTENCY RULE: This scene is a direct animation of the approved storyboard frame. Maintain exact character appearance, same face, same clothing, same instrument in every scene."
              ].filter(Boolean).join(" ")
            : [scene.prompt, styleBlock, lyricContextBlock, performanceBlock].filter(Boolean).join(" ");

          // ── STORYBOARD LOCK ──────────────────────────────────────────────────
          // The approved storyboard preview image is passed as a reference to the
          // video generator. This is the ONLY way to guarantee "what you see is
          // what you get" — the generator uses it as a visual anchor, not just text.
          const storyboardImageUrl = scene.previewImageUrl ?? null;
          if (storyboardImageUrl) {
            console.log(`[MusicVideo] Scene ${scene.id} STORYBOARD LOCK active: ${storyboardImageUrl.slice(0, 80)}...`);
          } else {
            console.warn(`[MusicVideo] Scene ${scene.id} has no storyboard preview image — render will be text-only. Run storyboard preview generation first.`);
          }

          // ── CHARACTER IMAGE URL: Use the primary vocalist's master portrait for lip sync ──
          // Priority: 1) Primary vocalist's masterPortraitUrl from videoCharacters table
          //           2) Job-level characterImageUrl (legacy single-character jobs)
          //           3) null (text-to-video fallback)
          let sceneCharacterImageUrl: string | null = null;
          if (primaryVocalistName) {
            const vocalistChar = allJobCharsForRender.find(
              c => c.name.toLowerCase() === primaryVocalistName!.toLowerCase()
            );
            if (vocalistChar) {
              // Use masterPortraitUrl if available (FLUX-generated canonical portrait)
              // Fall back to previewImageUrl (AI-generated character preview) — no photoUrl on videoCharacters
              sceneCharacterImageUrl = vocalistChar.masterPortraitUrl ?? vocalistChar.previewImageUrl ?? null;
            }
          }
          // Fallback: job-level characterImageUrl
          if (!sceneCharacterImageUrl && job.characterImageUrl) {
            sceneCharacterImageUrl = job.characterImageUrl;
          }

          if (sceneCharacterImageUrl) {
            console.log(`[MusicVideo] Scene ${scene.id} character image URL: ${sceneCharacterImageUrl.slice(0, 80)}...`);
          } else {
            console.log(`[MusicVideo] Scene ${scene.id} no character image URL — will use text-to-video`);
          }

          try {
            // ── SPEND GUARD: check job spend limit before submitting ───────────────────────
            const spendCheck = await checkJobSpendLimit(input.jobId);
            if (spendCheck.exceeded) {
              console.warn(`[SpendGuard] Job ${input.jobId} spend limit exceeded ($${spendCheck.currentSpend.toFixed(2)} / $${spendCheck.limit.toFixed(2)}) — stopping render`);
              await db!.update(musicVideoJobs).set({ status: "failed", errorMessage: `Spend limit exceeded: $${spendCheck.currentSpend.toFixed(2)} spent (limit $${spendCheck.limit.toFixed(2)})`, updatedAt: new Date() }).where(eq(musicVideoJobs.id, input.jobId));
              break;
            }
            // ── PROVIDER HEALTH ROUTING: use best available provider ─────────────────────
            const providerCheck = await getBestProvider("wavespeed", scenes.length);
            if (providerCheck.blocked) {
              console.error(`[ProviderHealth] All providers blocked for job ${input.jobId}: ${providerCheck.reason}`);
              await db!.update(musicVideoJobs).set({ status: "failed", errorMessage: `All render providers are currently unavailable. Please try again later.`, updatedAt: new Date() }).where(eq(musicVideoJobs.id, input.jobId));
              break;
            }
            // Route through WaveSpeed primary renderer (with Hypereal/Atlas/fal.ai fallback chain)
            // mapModelAssignmentToWaveSpeed converts DB value (e.g. "seedance-2.0") to valid WaveSpeed model path
            const wsModel = mapModelAssignmentToWaveSpeed(scene.modelAssignment ?? "seedance-2.0");
            const taskId = await startSceneRender(
              scene.id,
              enrichedScenePrompt,
              scene.duration,
              scene.lipSync ?? true,
              (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
              "wavespeed" as any, // Route through WaveSpeed primary renderer
              wsModel, // Correctly mapped WaveSpeed model path
              storyboardImageUrl ?? undefined, // STORYBOARD LOCK: pass approved frame as reference
              (input.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "21:9", // Export format
              input.jobId, // ── SPEND PROTECTION: pass jobId for spend-cap and idempotency checks
              sceneCharacterImageUrl, // ── CHARACTER LOCK: master portrait for reference-to-video
              job.audioUrl,           // ── LIP SYNC: full song URL for audio clip extraction
              scene.startTime         // ── LIP SYNC: scene start time for audio clip extraction
            );
            await db!.update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
            console.log(`[MusicVideo] Scene ${scene.id} (${i + 1}/${scenes.length}) queued via WaveSpeed (${rendererType}): ${taskId}`);
            successCount++;
          } catch (err: unknown) {
            const httpStatus = (err as any)?.response?.status;
            const errMsg = String((err as any)?.message ?? err);
            const isTransient = isRetryableFailure(errMsg) || httpStatus === 429 || httpStatus === 503 || httpStatus === 502;
            if (isTransient) {
              // Transient failure — retry with exponential backoff before giving up
              let retrySuccess = false;
              for (let attempt = 1; attempt <= MAX_DISPATCH_RETRIES; attempt++) {
                const backoffMs = Math.min(5_000 * Math.pow(2, attempt - 1), 30_000); // 5s, 10s, 20s
                console.warn(`[MusicVideo] Scene ${scene.id} transient failure (HTTP ${httpStatus ?? "?"}) — retry ${attempt}/${MAX_DISPATCH_RETRIES} in ${backoffMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, backoffMs));
                try {
                  const retryTaskId = await startSceneRender(
                    scene.id, enrichedScenePrompt, scene.duration,
                    scene.lipSync ?? true,
                    (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
                    "wavespeed" as any,
                    mapModelAssignmentToWaveSpeed(scene.modelAssignment ?? "seedance-2.0"),
                    storyboardImageUrl ?? undefined,
                    (input.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "21:9",
                    input.jobId,
                    sceneCharacterImageUrl,
                    job.audioUrl,
                    scene.startTime
                  );
                  await db!.update(musicVideoScenes)
                    .set({ status: "generating", taskId: retryTaskId, updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                  console.log(`[MusicVideo] Scene ${scene.id} retry ${attempt} succeeded: ${retryTaskId}`);
                  successCount++;
                  retrySuccess = true;
                  break;
                } catch (retryErr: unknown) {
                  const retryHttpStatus = (retryErr as any)?.response?.status;
                  console.warn(`[MusicVideo] Scene ${scene.id} retry ${attempt} failed (HTTP ${retryHttpStatus ?? "?"})`);
                }
              }
              if (!retrySuccess) {
                console.error(`[MusicVideo] Scene ${scene.id} failed after ${MAX_DISPATCH_RETRIES} retries — marking failed.`);
                await db!.update(musicVideoScenes)
                  .set({ status: "failed", errorMessage: `Render failed after ${MAX_DISPATCH_RETRIES} retries. Please use 'Retry All Failed' to try again.`, updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
                failCount++;
              }
            } else {
              // Non-transient failure (content policy, bad prompt, etc.) — fail immediately
              console.error(`[MusicVideo] Scene ${scene.id} start failed (HTTP ${httpStatus ?? "?"}) — non-retryable:`, errMsg.slice(0, 200));
              await db!.update(musicVideoScenes)
                .set({ status: "failed", errorMessage: errMsg.slice(0, 500), updatedAt: new Date() })
                .where(eq(musicVideoScenes.id, scene.id));
              failCount++;
            }
          }
        }

        // ── CREDIT REFUND: If ALL scenes failed to start, refund credits ──────────
        // Credits are deducted upfront. If no scene could be dispatched to any provider,
        // the user gets a full refund and the job is marked failed.
        if (successCount === 0 && failCount > 0 && !isAdmin) {
          console.error(`[MusicVideo] ALL ${failCount} scenes failed to start for job ${job.id} — issuing full credit refund of ${job.creditCost}`);
          try {
            await deductCredits(ctx.user.id, -job.creditCost, `Refund: video build failed (all providers unavailable) — job #${job.id}`);
            await db!.update(musicVideoJobs)
              .set({ status: "failed", updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, job.id));
            console.log(`[MusicVideo] Refunded ${job.creditCost} credits to user ${ctx.user.id} for failed job ${job.id}`);
          } catch (refundErr) {
            console.error(`[MusicVideo] CRITICAL: Failed to refund credits for job ${job.id}:`, refundErr);
          }
        }
            })();
      // ── STEM INTELLIGENCE: fire-and-forget parallel to scene dispatch ──────────
      // Runs Demucs 8-stem separation + envelope extraction + section classification
      // + energy maps + subtitle timing + validation output.
      // Results stored on the job record and used by the heartbeat for:
      //   - vocal scene placement (lip-sync allocation)
      //   - scene type selection (performance vs cinematic)
      //   - subtitle timing (future)
      // Non-blocking: if this fails, render continues with BPM-only classification.
      if (job.audioUrl && (job as any).stemAnalysisStatus !== 'done') {
        runStemIntelligence(input.jobId, job.audioUrl).catch((stemErr: unknown) => {
          console.warn(`[MusicVideo] Stem intelligence failed for job ${input.jobId} (non-fatal):`, stemErr);
        });
        console.log(`[MusicVideo] Stem intelligence started for job ${input.jobId} (background)`);
      }
      return { success: true, creditCost: job.creditCost };
    }),
  // Poll render progress and trigger assembly when all scenes done
  pollProgress: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // ── STUCK JOB TIMEOUT GUARD ─────────────────────────────────────────────
      // Jobs that have been in 'rendering' or 'assembling' for more than 45 minutes
      // are considered stuck. Auto-fail them with a clear user message and credit refund.
      const STUCK_TIMEOUT_MS = 120 * 60 * 1000; // 120 minutes
      const SCENE_STUCK_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes per scene (cron reaper catches at 15min; this is the in-process fallback)
      if (job.status === "rendering" || job.status === "assembling") {
        const jobAge = Date.now() - new Date(job.updatedAt).getTime();
        if (jobAge > STUCK_TIMEOUT_MS) {
          console.error(`[MusicVideo] Job ${input.jobId} has been stuck in '${job.status}' for ${Math.round(jobAge / 60000)} minutes — auto-failing.`);
          // Fail any scenes still generating
          await db.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: "Scene timed out after 90 minutes — please retry", updatedAt: new Date() })
            .where(and(eq(musicVideoScenes.jobId, input.jobId), inArray(musicVideoScenes.status, ["generating", "pending"])));
          // Mark job as failed with a user-friendly message
          await db.update(musicVideoJobs)
            .set({
              status: "failed",
              errorMessage: "Your video took too long to render and has been stopped. This can happen when our video provider is under heavy load. Your credits have been refunded — please try again.",
              updatedAt: new Date(),
            })
            .where(eq(musicVideoJobs.id, input.jobId));
          // Refund credits for all users (including admin) when job times out
          if (job.creditCost > 0) { // Refund all users including admin
            try {
              await refundCredits(ctx.user.id, job.creditCost, `Refund: render timeout — job #${job.id}`, job.id);
              console.log(`[MusicVideo] Refunded ${job.creditCost} credits to user ${ctx.user.id} for timed-out job ${job.id}`);
            } catch (refundErr) {
              console.error(`[MusicVideo] CRITICAL: Failed to refund credits for timed-out job ${job.id}:`, refundErr);
            }
          }
          return {
            status: "failed" as const,
            totalScenes: 0,
            completedScenes: 0,
            failedScenes: 0,
            finalVideoUrl: null,
            sceneStatuses: [],
            timedOut: true,
          };
        }
      }

      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      // ── PER-SCENE STUCK TIMEOUT ─────────────────────────────────────────────
      // Individual scenes stuck in 'generating' for >40 minutes are auto-failed
      // so the job can proceed to assembly with whatever completed scenes exist.
      for (const scene of scenes) {
        if (scene.status === "generating" && scene.updatedAt) {
          const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();
          if (sceneAge > SCENE_STUCK_TIMEOUT_MS) {
            console.warn(`[MusicVideo] Scene ${scene.id} stuck in 'generating' for ${Math.round(sceneAge / 60000)} min — auto-failing.`);
            await db.update(musicVideoScenes)
              .set({ status: "failed", errorMessage: "Scene timed out after 90 minutes — please use Retry to regenerate this scene", updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
            // Mark any stuck 'submitted' providerJobLogs entries as 'failed' so
            // resetSceneAttempts() can cancel them on the next user retry.
            await db.update(providerJobLogs)
              .set({ status: "failed", failedAt: new Date() })
              .where(and(
                eq(providerJobLogs.sceneId, scene.id),
                sql`${providerJobLogs.status} = 'submitted'`
              ));
          }
        }
      }
      // Reload scenes after timeout checks
      const freshScenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));
      scenes.splice(0, scenes.length, ...freshScenes);

      // Poll each generating scene — isolate errors per-scene so one failure doesn't block others
      let completedCount = 0;
      let failedCount = 0;

      for (const scene of scenes) {
        if (scene.status === "completed") {
          completedCount++;
          continue;
        }
        if (scene.status === "failed") {
          failedCount++;
          continue;
        }
        // ── AUTO-SUBMIT PENDING SCENES ────────────────────────────────────────
        // Scenes reset to 'pending' (e.g. after retry counter reset or manual unblock)
        // are automatically re-submitted here so the job can resume without user action.
        // Skip dispatch if the job is paused or cancelled.
        if (scene.status === "pending" && !scene.taskId) {
          // Reload job status to check for pause/cancel
          const [currentJob] = await db.select({ status: musicVideoJobs.status }).from(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId));
          if (currentJob?.status === "paused" || currentJob?.status === "cancelled") {
            console.log(`[MusicVideo] Job ${input.jobId} is ${currentJob.status} — skipping scene ${scene.id} dispatch`);
            continue;
          }
          try {
            console.log(`[MusicVideo] ${new Date().toISOString()} Auto-submitting pending scene ${scene.id} (index ${scene.sceneIndex}) for job ${input.jobId}`);
            const taskId = await startSceneRender(
              scene.id,
              scene.prompt,
              scene.duration,
              scene.lipSync ?? true,
              (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
              "wavespeed" as any,
              (scene.modelAssignment ?? "bytedance/seedance-2.0/text-to-video") as any,
              scene.previewImageUrl ?? undefined,
              undefined,
              input.jobId
            );
            await db.update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
            console.log(`[MusicVideo] ${new Date().toISOString()} Auto-submitted pending scene ${scene.id} → taskId ${taskId}`);
          } catch (submitErr) {
            console.error(`[MusicVideo] ${new Date().toISOString()} Auto-submit failed for pending scene ${scene.id}:`, submitErr);
            // Don't fail the scene yet — let it retry on next poll cycle
          }
          continue;
        }
        if (scene.status === "generating" && scene.taskId) {
          try {
            const result = await pollSceneStatus(scene.id, scene.taskId);
            if (result.status === "completed") {
              // ── HEDRA AUTO-TRIGGER: Performance Mode scenes get Hedra lip sync automatically ──
              if (scene.sceneType === "performance" && result.videoUrl && !scene.hedraVideoUrl) {
                console.log(`[HedraAuto] Scene ${scene.id} is Performance Mode — auto-triggering Hedra lip sync`);
                try {
                  const { runHedraLipSyncForScene } = await import("../../ai-apis/hedra-lipsync");
                  const [jobRow] = await db.select({ audioUrl: musicVideoJobs.audioUrl })
                    .from(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId)).limit(1);
                  if (jobRow?.audioUrl) {
                    await runHedraLipSyncForScene(scene.id, result.videoUrl, jobRow.audioUrl, scene.startTime ?? 0);
                    console.log(`[HedraAuto] Scene ${scene.id} Hedra lip sync completed successfully`);
                  }
                } catch (hedraErr) {
                  console.error(`[HedraAuto] Scene ${scene.id} Hedra auto-trigger failed (non-blocking):`, hedraErr);
                  // Non-blocking — scene still counts as completed even if Hedra fails
                }
              }
              completedCount++;
              // Record successful outcome for provider health tracking
              recordProviderOutcome({
                jobId: input.jobId, sceneId: scene.id, provider: "wavespeed",
                status: "success",
              }).catch(() => {});
              updateJobSpend(input.jobId, "wavespeed", false).catch(() => {});
            }
            if (result.status === "failed") {
              failedCount++;
              // Record failure for provider health tracking
              const isTimeout = (result as any).errorMessage?.includes("timed out");
              recordProviderOutcome({
                jobId: input.jobId, sceneId: scene.id, provider: "wavespeed",
                status: isTimeout ? "timeout" : "failure",
                errorMessage: (result as any).errorMessage ?? undefined,
              }).catch(() => {});
              updateJobSpend(input.jobId, "wavespeed", true).catch(() => {});
            }
          } catch (pollErr: unknown) {
            const httpStatus = (pollErr as any)?.response?.status;
            if (httpStatus === 429) {
              // Rate limited during polling — skip this scene this round, will retry next poll
              console.warn(
                `[MusicVideo] ${new Date().toISOString()} 429 rate limit polling scene ${scene.id} (taskId=${scene.taskId}). Skipping this round.`
              );
            } else {
              console.error(
                `[MusicVideo] ${new Date().toISOString()} Error polling scene ${scene.id} (HTTP ${httpStatus ?? "?"})`,
                pollErr
              );
            }
            // Don't count as failed — let it retry on next poll cycle
          }
        }
      }

      // Update completed count on job
      await db.update(musicVideoJobs)
        .set({ completedScenes: completedCount, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

    // ── ZERO-FAILURE POLICY ──────────────────────────────────────────────────────
      // Failed scenes are NEVER accepted as permanent. Reset them to pending so
      // the sceneDispatchHeartbeat picks them up and retries automatically.
      // The job only proceeds to assembly when ALL scenes are completed.
      if (failedCount > 0 && job.status === "rendering") {
        const failedSceneIds = scenes
          .filter((s) => s.status === "failed")
          .map((s) => s.id);
        if (failedSceneIds.length > 0) {
          console.log(`[MusicVideo] Job ${input.jobId}: resetting ${failedSceneIds.length} failed scene(s) to pending for retry`);
          for (const sid of failedSceneIds) {
            await db.update(musicVideoScenes)
              .set({ status: "pending", taskId: null, errorMessage: null, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, sid));
          }
        }
      }

      // Only trigger assembly when ALL scenes are completed
      const allScenesSettled = completedCount >= scenes.length && failedCount === 0;

      if (allScenesSettled && job.status === "rendering") {
        await db.update(musicVideoJobs)
          .set({ status: "assembling", errorMessage: null, updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));

        const [latestRenderJob] = await db.select()
          .from(renderJobs)
          .where(and(
            eq(renderJobs.sourceJobId, input.jobId),
            eq(renderJobs.sourceJobType, "music_video")
          ))
          .orderBy(desc(renderJobs.createdAt))
          .limit(1);
        const audioTier = (latestRenderJob?.audioTier ?? "standard") as "standard" | "enhanced" | "cinematic";

        assembleMusicVideo(input.jobId, audioTier).catch(async (err) => {
          console.error(`[MusicVideo] Assembly failed for job ${input.jobId}:`, err);
          await db!.update(musicVideoJobs)
            .set({ status: "rendering", errorMessage: null, updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, input.jobId));
        });
      }

            const [updatedJob] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId));

      // Re-fetch scenes to get latest statuses for per-scene progress display
      const updatedScenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      // Poll any in-progress per-scene Sync Labs lip sync jobs (non-blocking)
      pollPerSceneLipSyncJobs().catch((e) =>
        console.warn("[pollProgress] pollPerSceneLipSyncJobs error:", e)
      );

      const finalJob = updatedJob ?? job;
      return {
        status: finalJob.status,
        totalScenes: scenes.length,
        completedScenes: completedCount,
        failedScenes: failedCount,
        finalVideoUrl: finalJob.finalVideoUrl ?? null,
        // Master audio URL — always returned so the scene preview modal can play it
        // even if the user navigated directly to the render step (bypassing the restore flow)
        jobAudioUrl: finalJob.audioUrl ?? null,
        // Timestamp when the job entered 'rendering' — used by the frontend elapsed timer
        // so the timer is accurate even after a page refresh.
        jobStartedAt: finalJob.updatedAt ? new Date(finalJob.updatedAt).getTime() : null,
        // ── PROBE GATE STATE ────────────────────────────────────────────────────
        // probePassed: null = not started, false = probe in progress/awaiting approval, true = approved
        probePassed: finalJob.probePassed,
        probeVideoUrl: finalJob.probeVideoUrl ?? null,
        probeSceneId: finalJob.probeSceneId ?? null,
        probeState: finalJob.probePassed === null ? "not_started"
          : (finalJob.probePassed === false || (finalJob.probePassed as any) === 0) ? (finalJob.probeVideoUrl ? "awaiting_approval" : "rendering")
          : "approved",
        // ── VOCAL ISOLATION STATE ──────────────────────────────────────────────
        vocalsStatus: (finalJob as any).vocalsStatus ?? null,
        songBpm: (finalJob as any).songBpm ?? null,
        // Per-scene status for real-time progress display
        sceneStatuses: updatedScenes.map((s) => ({
          id: s.id,
          index: s.sceneIndex,
          status: s.status, // "pending" | "generating" | "completed" | "failed"
          errorMessage: s.errorMessage ?? null,
          videoUrl: s.videoUrl ?? null,
          lipSyncVideoUrl: s.lipSyncVideoUrl ?? null, // Sync Labs per-scene lip sync output
          lipSyncStatus: s.lipSyncStatus ?? "pending", // "pending" | "processing" | "done" | "error"
          // ── WizSync™ composite output (Zara on Air Studios background) ──────────
          // For performance scenes, this is the FINAL quality output the user should see.
          // compositeVideoUrl is the fully composited clip — use this for preview, not videoUrl.
          compositeVideoUrl: (s as any).compositeVideoUrl ?? null,
          compositeStatus: (s as any).compositeStatus ?? "pending",
          sceneType: s.sceneType ?? "cinematic", // "cinematic" | "performance"
          hedraVideoUrl: s.hedraVideoUrl ?? null, // Hedra Avatar output for Performance Mode
          hedraStatus: s.hedraStatus ?? "pending", // "pending" | "processing" | "done" | "error"
          heroImageUrl: s.heroImageUrl ?? null, // Portrait image used as Hedra input
          prompt: s.prompt ?? null,
          lyrics: s.lyrics ?? null,
          isApproved: s.isApproved ?? false,
        })),
      };
    }),

  // Get a single job with its scenes
  regenerateScene: protectedProcedure
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
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });

      // Reset scene to pending so the render loop picks it up
      await db.update(musicVideoScenes)
        .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, errorMessage: null, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));

      // If the job is completed/failed, reset it to rendering so the heartbeat picks up the scene
      if (job.status === "completed" || job.status === "failed") {
        await db.update(musicVideoJobs)
          .set({ status: "rendering", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
      }

      // Reset spend-protection attempt counter so the re-render is not blocked
      await resetSceneAttempts(input.sceneId);

      // Fetch locked character briefs for this job
      const allJobCharacters = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));
      const lockedBriefs = allJobCharacters
        .filter((c) => c.isLocked && c.lockedDescription)
        .map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}: ${c.lockedDescription!}`);

      // Fetch character reference photos
      const characterPhotos = await db.select().from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.jobId, input.jobId))
        .orderBy(desc(videoCharacterPhotos.isPrimary));
      // Pass ALL photos for all characters (multiple angles/styles help AI with likeness)
      const referenceImages: Array<{ url: string; mimeType: string }> = [];
      if (characterPhotos.length > 0) {
        for (const photo of characterPhotos) {
          referenceImages.push({ url: photo.photoUrl, mimeType: "image/jpeg" });
        }
      } else if (job.characterImageUrl) {
        referenceImages.push({ url: job.characterImageUrl, mimeType: "image/jpeg" });
      }

      // Start the scene render (respects current lipSync flag on the scene)
      // Build a character-enriched prompt if locked briefs are available
      let enrichedPrompt = scene.prompt;
      if (lockedBriefs.length > 0) {
        enrichedPrompt = `${scene.prompt}. STRICT CHARACTER CONSISTENCY: ${lockedBriefs.join(" | ")}`;
      }
      // STORYBOARD LOCK: use the approved preview image as visual anchor
      const storyboardImageUrl = scene.previewImageUrl ?? undefined;
      if (storyboardImageUrl) {
        console.log(`[regenerateScene] Scene ${input.sceneId} STORYBOARD LOCK active: ${storyboardImageUrl.slice(0, 80)}...`);
      } else {
        console.warn(`[regenerateScene] Scene ${input.sceneId} has no storyboard preview image — render will be text-only`);
      }
      try {
        const taskId = await startSceneRender(
          input.sceneId,
          enrichedPrompt,
          scene.duration,
          scene.lipSync ?? true,
          (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
          "wavespeed" as any,
          (scene.modelAssignment ?? "bytedance/seedance-2.0/text-to-video") as any,
          storyboardImageUrl,
          (job.aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "21:9") ?? "16:9",
          input.jobId // ── SPEND PROTECTION
        );
        if (taskId) {
          await db.update(musicVideoScenes)
            .set({ status: "generating", taskId })
            .where(eq(musicVideoScenes.id, input.sceneId));
        }
        return { success: true, sceneId: input.sceneId, status: "generating" };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[regenerateScene] Failed to start scene render:", errMsg);
        await db.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: errMsg })
          .where(eq(musicVideoScenes.id, input.sceneId));
        // Surface a user-friendly message based on the error type
        const isApiKeyMissing = /not configured|API_KEY|api key/i.test(errMsg);
        const userMsg = isApiKeyMissing
          ? "Video rendering service is not configured. Please contact support."
          : `Scene render failed: ${errMsg.slice(0, 200)}`;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: userMsg });
      }
    }),

  // Retry a single failed scene — resets it to pending and re-queues the render
  retryFailedScene: protectedProcedure
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

      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });
      if (scene.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Scene is not in a failed state" });
      }

      // Reset scene
      await db.update(musicVideoScenes)
        .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, errorMessage: null, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));

      // Reset spend-protection attempt counter so the retry is not blocked by old failed attempts.
      await resetSceneAttempts(input.sceneId);

      // Ensure job is back in rendering state so polling continues
      if (job.status === "failed") {
        await db.update(musicVideoJobs)
          .set({ status: "rendering", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
      }

      // Log the retry action for the dashboard history
      await db.insert(sceneActionLogs).values({
        userId: ctx.user.id,
        jobId: input.jobId,
        sceneId: input.sceneId,
        action: "retry",
        sceneIndex: scene.sceneIndex ?? 0,
        jobTitle: job.title ?? null,
        errorMessageBefore: scene.errorMessage ?? null,
      }).catch(() => { /* non-fatal */ });

      // Re-queue the render asynchronously
      // STORYBOARD LOCK: pass the approved preview image as visual anchor
      const retryStoryboardUrl = scene.previewImageUrl ?? undefined;
      if (retryStoryboardUrl) {
        console.log(`[retryFailedScene] Scene ${input.sceneId} STORYBOARD LOCK active`);
      } else {
        console.warn(`[retryFailedScene] Scene ${input.sceneId} has no storyboard preview image — render will be text-only`);
      }
      (async () => {
        try {
          const taskId = await startSceneRender(
            input.sceneId,
            scene.prompt,
            scene.duration,
            scene.lipSync ?? true,
            (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
            "wavespeed" as any,
            (scene.modelAssignment ?? "bytedance/seedance-2.0/text-to-video") as any,
            retryStoryboardUrl,
            undefined, // aspectRatio default
            input.jobId // ── SPEND PROTECTION
          );
          await db!.update(musicVideoScenes)
            .set({ status: "generating", taskId, updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, input.sceneId));
          console.log(`[MusicVideo] ${new Date().toISOString()} Retried scene ${input.sceneId} → taskId ${taskId}`);
        } catch (err) {
          console.error(`[MusicVideo] ${new Date().toISOString()} Retry failed for scene ${input.sceneId}:`, err);
          await db!.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: String(err), updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, input.sceneId));
        }
      })();

      return { success: true, sceneId: input.sceneId };
    }),

  // Retry ALL failed scenes in a job at once
  retryAllFailedScenes: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const failedScenes = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.jobId, input.jobId), eq(musicVideoScenes.status, "failed")));

      if (failedScenes.length === 0) return { success: true, retriedCount: 0 };

      // ISS-009: Dead-letter queue — quarantine scenes that have been retried too many times
      const MAX_SCENE_RETRIES = 5;
      const toQuarantine = failedScenes.filter((s) => (s.retryCount ?? 0) >= MAX_SCENE_RETRIES);
      const toRetry = failedScenes.filter((s) => (s.retryCount ?? 0) < MAX_SCENE_RETRIES);

      if (toQuarantine.length > 0) {
        await db.update(musicVideoScenes)
          .set({ status: "dlq", errorMessage: `Quarantined after ${MAX_SCENE_RETRIES} retries`, updatedAt: new Date() })
          .where(inArray(musicVideoScenes.id, toQuarantine.map((s) => s.id)));
        console.warn(`[MusicVideo] Job ${input.jobId}: quarantined ${toQuarantine.length} scene(s) to DLQ (exceeded ${MAX_SCENE_RETRIES} retries)`);
      }

      if (toRetry.length === 0) return { success: true, retriedCount: 0, quarantinedCount: toQuarantine.length };

      // Reset retryable failed scenes to pending and increment retryCount
      for (const s of toRetry) {
        await db.update(musicVideoScenes)
          .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, errorMessage: null, retryCount: (s.retryCount ?? 0) + 1, updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, s.id));
      }

      // Reset spend-protection attempt counters for retryable scenes
      await Promise.all(toRetry.map((s) => resetSceneAttempts(s.id)));

      // Ensure job is back in rendering state
      await db.update(musicVideoJobs)
        .set({ status: "rendering", updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Re-queue each retryable scene with 3s stagger
      // STORYBOARD LOCK: each scene passes its approved preview image as visual anchor
      const STAGGER_MS = 3000;
      (async () => {
        for (let i = 0; i < toRetry.length; i++) {
          const scene = toRetry[i];
          if (i > 0) await new Promise((r) => setTimeout(r, STAGGER_MS));
          const bulkStoryboardUrl = scene.previewImageUrl ?? undefined;
          if (!bulkStoryboardUrl) {
            console.warn(`[retryAllFailedScenes] Scene ${scene.id} has no storyboard preview image — render will be text-only`);
          }
          try {
            const taskId = await startSceneRender(
              scene.id,
              scene.prompt,
              scene.duration,
              scene.lipSync ?? true,
              (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
              "wavespeed" as any,
              (scene.modelAssignment ?? "bytedance/seedance-2.0/text-to-video") as any,
              bulkStoryboardUrl,
              undefined, // aspectRatio default
              input.jobId // ── SPEND PROTECTION
            );
            await db!.update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
            console.log(`[MusicVideo] ${new Date().toISOString()} Bulk retry scene ${scene.id} (${i + 1}/${toRetry.length}) → taskId ${taskId} (retry #${(scene.retryCount ?? 0) + 1})`);
          } catch (err) {
            console.error(`[MusicVideo] ${new Date().toISOString()} Bulk retry failed for scene ${scene.id}:`, err);
            await db!.update(musicVideoScenes)
              .set({ status: "failed", errorMessage: String(err), updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
          }
        }
      })();

      return { success: true, retriedCount: toRetry.length, quarantinedCount: toQuarantine.length };
    }),

  // Cancel a scene that is currently pending/generating — used by the Undo action in the retry toast.
  // Marks the scene as failed with a user-cancelled error message so it shows up as retryable again.
  cancelScene: protectedProcedure
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
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });
      // Only allow cancellation of scenes that are pending or generating (i.e. just re-queued)
      if (scene.status !== "pending" && scene.status !== "generating") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Scene cannot be cancelled in its current state" });
      }
      // Mark scene as failed with a cancellation message so the user can retry again later
      await db.update(musicVideoScenes)
        .set({ status: "failed", taskId: null, errorMessage: "Cancelled by user", updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));
      // Cancel any open providerJobLogs entries for this scene
      await db.update(providerJobLogs)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(providerJobLogs.sceneId, input.sceneId),
            sql`${providerJobLogs.status} IN ('submitted', 'failed')`
          )
        );
      // Log the cancel action for the dashboard history
      await db.insert(sceneActionLogs).values({
        userId: ctx.user.id,
        jobId: input.jobId,
        sceneId: input.sceneId,
        action: "cancel",
        sceneIndex: scene.sceneIndex ?? 0,
        jobTitle: job.title ?? null,
        errorMessageBefore: null,
      }).catch(() => { /* non-fatal */ });
      console.log(`[MusicVideo] ${new Date().toISOString()} Scene ${input.sceneId} cancelled by user`);
      return { success: true };
    }),

  // Update the visual prompt (and optionally lyrics) for a scene before retrying
  cinematicUpgrade: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneIds: z.array(z.number().int()).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 1. Verify job belongs to user
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // 2. Verify all requested scenes belong to this job and are completed
      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));
      const sceneMap = new Map(scenes.map((s) => [s.id, s]));

      const validScenes = input.sceneIds.filter((id) => {
        const scene = sceneMap.get(id);
        return scene && scene.status === "completed";
      });

      if (validScenes.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid completed scenes selected for upgrade" });
      }

      // 3. Calculate credit cost
      const { VIDEO_CREDIT_COSTS } = await import("../../../shared/const");
      const totalCost = validScenes.length * VIDEO_CREDIT_COSTS.perCinematicScene;

      // 4. Check credit balance
      const balance = await getUserCredits(ctx.user.id);
      if (balance < totalCost) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Insufficient credits. Need ${totalCost}, have ${balance}.`,
        });
      }

      // 5. Deduct credits upfront
      await deductCredits(ctx.user.id, totalCost, `Cinematic upgrade: ${validScenes.length} scene(s) for job #${input.jobId}`);
      console.log(`[CinematicUpgrade] ${new Date().toISOString()} User ${ctx.user.id} upgrading ${validScenes.length} scenes for job ${input.jobId} (cost: ${totalCost} credits)`);

      // 6. Reset selected scenes to pending so they re-render with premium renderer
      for (const sceneId of validScenes) {
        await db.update(musicVideoScenes)
          .set({
            status: "pending",
            taskId: null,
            videoUrl: null,
            videoKey: null,
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(musicVideoScenes.id, sceneId));
      }

      // 7. Dispatch premium renders for each scene (kling forced)
      const scenesToRender = validScenes
        .map((id) => sceneMap.get(id)!)
        .filter(Boolean);

      const renderResults: Array<{ sceneId: number; success: boolean; error?: string }> = [];

      for (const scene of scenesToRender) {
        try {
          await db.update(musicVideoScenes)
            .set({ status: "generating", updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, scene.id));

          const taskId = await startSceneRender(
            scene.id,
            scene.prompt,
            scene.duration,
            scene.lipSync,
            scene.lipSyncStyle as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
            "kling_pro"
          );

          await db.update(musicVideoScenes)
            .set({ taskId, updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, scene.id));

          renderResults.push({ sceneId: scene.id, success: true });
          console.log(`[CinematicUpgrade] Scene ${scene.id} dispatched to Kling (taskId: ${taskId})`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[CinematicUpgrade] Scene ${scene.id} failed to dispatch: ${msg}`);
          await db.update(musicVideoScenes)
            .set({ status: "failed", errorMessage: `Cinematic upgrade failed: ${msg}`, updatedAt: new Date() })
            .where(eq(musicVideoScenes.id, scene.id));
          renderResults.push({ sceneId: scene.id, success: false, error: msg });
        }
      }

      const successCount = renderResults.filter((r) => r.success).length;
      const failCount = renderResults.filter((r) => !r.success).length;

      // Partial refund if some scenes failed to dispatch
      if (failCount > 0) {
        const refundAmount = failCount * VIDEO_CREDIT_COSTS.perCinematicScene;
        await deductCredits(ctx.user.id, -refundAmount, `Cinematic upgrade partial refund: ${failCount} scene(s) failed`);
        console.log(`[CinematicUpgrade] Refunded ${refundAmount} credits for ${failCount} failed scenes`);
      }

      return {
        success: true,
        dispatched: successCount,
        failed: failCount,
        creditsCharged: successCount * VIDEO_CREDIT_COSTS.perCinematicScene,
        creditsRefunded: failCount * VIDEO_CREDIT_COSTS.perCinematicScene,
        results: renderResults,
      };
    }),

  // List all jobs for the current user (with per-job scene stats)
  requestSceneReRender: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneId: z.number().int(),
      updatedPrompt: z.string().optional(),
      lipSync: z.boolean().optional(),
      lipSyncStyle: z.enum(["natural", "expressive", "subtle"]).optional(),
      cameraDirection: z.string().optional(), // e.g. "close-up", "wide shot", "tracking"
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify job ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Block re-renders after download
      if (job.downloadedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Re-renders are not available after you have downloaded and confirmed your video.",
        });
      }

      // Verify scene ownership
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

      // Determine credit cost: 0 if first re-render, 1 credit if subsequent
      const isFirstReRender = !scene.freeReRenderUsed && (scene.reRenderCount ?? 0) === 0;
      const creditCost = isFirstReRender ? 0 : 1;

      // Deduct credits if not free
      if (creditCost > 0) {
        const { deductCredits } = await import("../../credit-service");
        const deducted = await deductCredits(ctx.user.id, creditCost, `Scene re-render (scene ${scene.sceneIndex + 1})`).catch(() => false);
        if (!deducted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient credits. Scene re-renders after the first cost 1 credit each.`,
          });
        }
      }

      // Build updated prompt with camera direction if provided
      let finalPrompt = input.updatedPrompt ?? scene.prompt;
      if (input.cameraDirection) {
        finalPrompt = `${input.cameraDirection.toUpperCase()} SHOT: ${finalPrompt}`;
      }

      // Update scene: reset status to pending, increment re-render count, update prompt
      await db.update(musicVideoScenes)
        .set({
          status: "pending",
          videoUrl: null,
          taskId: null,
          prompt: finalPrompt,
          lipSync: input.lipSync ?? scene.lipSync,
          lipSyncStyle: input.lipSyncStyle ?? scene.lipSyncStyle,
          reRenderCount: (scene.reRenderCount ?? 0) + 1,
          freeReRenderUsed: isFirstReRender ? true : (scene.freeReRenderUsed ?? false),
        })
        .where(eq(musicVideoScenes.id, input.sceneId));

      // Update job quality status to indicate re-render in progress
      await db.update(musicVideoJobs)
        .set({ qualityStatus: "rerendering", status: "rendering" })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[QualityGuarantee] Scene ${scene.sceneIndex + 1} re-render requested for job ${input.jobId} by user ${ctx.user.id}. Free: ${isFirstReRender}, Credits deducted: ${creditCost}`);

      return {
        success: true,
        sceneId: input.sceneId,
        sceneIndex: scene.sceneIndex,
        creditCostCharged: creditCost,
        isFreeReRender: isFirstReRender,
        message: isFirstReRender
          ? "Your free re-render has been queued. The scene will be regenerated shortly."
          : `1 credit deducted. Your re-render has been queued.`,
      };
    }),

  /**
   * Confirm download — the user has watched the video and is happy with it.
   * This locks the video: no more re-renders are available.
   * Records downloadedAt timestamp and sets qualityStatus to 'approved'.
   */
  pauseRender: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      if (job.status !== "rendering") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot pause a job in '${job.status}' state.` });
      }

      // Mark job as paused — pollProgress will stop dispatching new scenes
      await db.update(musicVideoJobs)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Mark all pending scenes as paused (set back to pending so they can resume)
      // Scenes currently generating will finish naturally — we just stop new dispatches
      console.log(`[MusicVideo] Job ${input.jobId} paused by user ${ctx.user.id}`);
      return { success: true, message: "Render paused. Scenes currently generating will finish. New scenes will not start until you resume." };
    }),

  // ── Resume render — resumes a paused job ───────────────────────────────────
  resumeRender: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      if (job.status !== "paused") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot resume a job in '${job.status}' state.` });
      }

      await db.update(musicVideoJobs)
        .set({ status: "rendering", updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[MusicVideo] Job ${input.jobId} resumed by user ${ctx.user.id}`);
      return { success: true, message: "Render resumed." };
    }),

  // ── Cancel render — stops all rendering and refunds credits for unrendered scenes ──
  cancelRender: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      if (!["rendering", "paused", "assembling"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot cancel a job in '${job.status}' state.` });
      }

      // Count pending/generating scenes to calculate refund
      const allScenes = await db.select({
        id: musicVideoScenes.id,
        status: musicVideoScenes.status,
      }).from(musicVideoScenes).where(eq(musicVideoScenes.jobId, input.jobId));

      const unrenderedCount = allScenes.filter(s => s.status === "pending" || s.status === "generating").length;
      const completedCount = allScenes.filter(s => s.status === "completed").length;

      // Mark all pending/generating scenes as failed (cancelled)
      if (unrenderedCount > 0) {
        await db.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Cancelled by user", updatedAt: new Date() })
          .where(and(
            eq(musicVideoScenes.jobId, input.jobId),
            inArray(musicVideoScenes.status, ["pending", "generating"])
          ));
      }

      // Mark job as cancelled
      await db.update(musicVideoJobs)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Refund credits for unrendered scenes
      // Cost per scene = total creditCost / totalScenes
      let refundedCredits = 0;
      if (unrenderedCount > 0 && job.creditCost > 0 && job.totalScenes > 0) {
        const creditsPerScene = Math.floor(job.creditCost / job.totalScenes);
        refundedCredits = creditsPerScene * unrenderedCount;
        if (refundedCredits > 0) {
          try {
            await refundCredits(ctx.user.id, refundedCredits, `Refund: render cancelled — ${unrenderedCount} unrendered scenes in job #${job.id}`, job.id);
            console.log(`[MusicVideo] Refunded ${refundedCredits} credits to user ${ctx.user.id} for cancelled job ${job.id} (${unrenderedCount} unrendered scenes)`);
          } catch (refundErr) {
            console.error(`[MusicVideo] Failed to refund credits for cancelled job ${job.id}:`, refundErr);
          }
        }
      }

      console.log(`[MusicVideo] Job ${input.jobId} cancelled by user ${ctx.user.id}. Completed: ${completedCount}, Cancelled: ${unrenderedCount}, Refunded: ${refundedCredits} credits`);
      return {
        success: true,
        completedScenes: completedCount,
        cancelledScenes: unrenderedCount,
        refundedCredits,
        message: refundedCredits > 0
          ? `Render cancelled. ${refundedCredits} credits refunded for ${unrenderedCount} unrendered scenes.`
          : `Render cancelled. ${completedCount} scenes were already completed.`,
      };
    }),

  // ── PROBE APPROVAL GATE ──────────────────────────────────────────────────────
  // Owner reviews the single-scene probe clip and approves or rejects it.
  // Approval releases the full render; rejection resets the probe for a re-run.

  regenerateAllScenes: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      newDirection: z.string().max(2000).optional(), // optional new theme/direction
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Only allow regeneration if no scenes have completed rendering
      const completedScenes = await db.select({ id: musicVideoScenes.id })
        .from(musicVideoScenes)
        .where(and(
          eq(musicVideoScenes.jobId, input.jobId),
          eq(musicVideoScenes.status, "completed" as any)
        ));

      if (completedScenes.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot regenerate storyboard — ${completedScenes.length} scene(s) have already been rendered. Use per-scene editing instead.`,
        });
      }

      // Reset all scenes to pending
      // CRITICAL: also clear previewImageUrl so the heartbeat's storyboard-generation
      // logic does not skip scenes that already have a URL. Without this, the filter
      // at triggerMusicVideoRender sees existing URLs and skips regeneration entirely.
      await db.update(musicVideoScenes)
        .set({
          status: "pending" as any,
          taskId: null,
          videoUrl: null,
          videoKey: null,
          previewImageUrl: null,  // ← force fresh storyboard image generation
          errorMessage: null,
          retryCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.jobId, input.jobId));

      // If a new direction is provided, update the job's themePrompt
      if (input.newDirection?.trim()) {
        const updatedTheme = input.newDirection.trim();
        await db.update(musicVideoJobs)
          .set({ themePrompt: updatedTheme, updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
      }

      // Reset job to storyboard status so storyboard regeneration is triggered
      await db.update(musicVideoJobs)
        .set({ status: "storyboard" as any, probePassed: null, probeSceneId: null, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

            console.log(`[MusicVideo] Storyboard regeneration triggered for job ${input.jobId} by user ${ctx.user.id}`);
      return { success: true, scenesReset: completedScenes.length === 0 };
    }),

  /**
   * resetRender — clears all scene video outputs and resets the job back to
   * "storyboard_ready" so the user can start a fresh render after editing
   * the storyboard. Does NOT touch the storyboard prompts themselves.
   */
  resetScene: protectedProcedure
    .input(z.object({ jobId: z.number(), sceneId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.status === "rendering" || job.status === "assembling") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reset a scene while a render is in progress. Please wait or cancel first.",
        });
      }
      const [scene] = await db.select().from(musicVideoScenes)
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
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
          hedraStatus: "pending",
          hedraVideoUrl: null,
          hedraVideoKey: null,
          hedraGenerationId: null,
          compositeVideoUrl: null,
          compositeVideoKey: null,
          compositeStatus: "pending",
          isApproved: false,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.id, input.sceneId));
      // If job was completed, bump it back so it can be re-rendered
      if (job.status === "completed") {
        await db.update(musicVideoJobs)
          .set({ status: "storyboard_ready", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
      }
      console.log(`[MusicVideo] Scene ${input.sceneId} reset for job ${input.jobId} by user ${ctx.user.id}`);
      return { success: true };
    }),

  /**
   * launchProbeRender — renders a single selected scene as a "probe" to test quality
   * before spending credits on the full render. The scene is dispatched through the
   * same WaveSpeed pipeline as a normal render, but only that one scene is queued.
   * The job status is NOT changed to "rendering" — it stays at "storyboard_ready"
   * so the user can still edit the storyboard. The probe result is stored on the scene.
   */
  getRenderAttempts: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify ownership
      const [job] = await db.select({ id: musicVideoJobs.id })
        .from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const { renderAttempts } = await import("../../../drizzle/schema");
      const attempts = await db.select().from(renderAttempts)
        .where(eq(renderAttempts.jobId, input.jobId));

      return attempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        finalVideoUrl: a.finalVideoUrl,
        sha256: a.sha256,
        fileSizeBytes: a.fileSizeBytes,
        durationSeconds: a.durationSeconds ? parseFloat(String(a.durationSeconds)) : null,
        sceneCount: a.sceneCount,
        validationStatus: a.validationStatus,
        validationError: a.validationError,
        assembledAt: a.assembledAt,
            }));
    }),

  // ── Character Auto-Prep: Trigger Stage 2 Environment Reference ─────────────
  // Called when the user selects or changes the scene style / world setting.
  // Fires Stage 2 auto-prep (environment-aware reference) for all approved
  // characters on the job. Non-blocking — returns immediately.
  triggerEnvironmentRef: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneStyle: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify job ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Update job sceneSetting
      await db.update(musicVideoJobs)
        .set({ sceneSetting: input.sceneStyle })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Fetch all approved characters for this job
      const chars = await db.select().from(videoCharacters)
        .where(and(
          eq(videoCharacters.jobId, input.jobId),
          eq(videoCharacters.userId, ctx.user.id),
        ));

      const approvedChars = chars.filter((c) => c.previewApproved);
      console.log(
        `[triggerEnvironmentRef] Job ${input.jobId}: firing Stage 2 for ` +
        `${approvedChars.length} approved characters (style: "${input.sceneStyle}")`
      );

      // Fire Stage 2 for each approved character (non-blocking)
      for (const char of approvedChars) {
        runStage2EnvironmentPrep({
          characterId: char.id,
          identityBrief: char.lockedDescription ?? char.characterPrompt ?? char.name,
          characterName: char.name,
          masterPortraitUrl: char.masterPortraitUrl ?? null,
          sceneStyle: input.sceneStyle,
        }).catch((err) => {
          console.error(`[triggerEnvironmentRef] Stage 2 failed for char ${char.id}:`, err);
        });
      }

      return { success: true, charactersQueued: approvedChars.length };
    }),

  // ── Rewrite a scene prompt with AI assistance ─────────────────────────────
  // Takes the existing prompt + a plain-language direction and rewrites the
  // full scene prompt to incorporate the new direction while preserving context.
});
