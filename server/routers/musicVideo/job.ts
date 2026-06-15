/**
 * Music Video — Job sub-router
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
  translateErrorMessage,
} from "./_shared";

export const musicVideoJobRouter = router({
  transcribeAudioDirect: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string(),
        audioMimeType: z.enum(["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/m4a"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upload audio to S3 so Whisper can fetch it via URL
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.audioMimeType.split("/")[1].replace("mpeg", "mp3");
      const audioKey = `music-video-transcribe-temp/${ctx.user.id}-${Date.now()}.${ext}`;
      const { url: audioUrl } = await storagePut(audioKey, audioBuffer, input.audioMimeType);

      const result = await withQuotaGuard(() => transcribeAudio({ audioUrl }));
      if ('error' in result) {
        // Check if the details indicate quota exhaustion
        const details = (result as any).details ?? "";
        if (/412|usage exhausted|quota|rate limit/i.test(details)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: QUOTA_EXHAUSTED_MESSAGE });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      }
      return {
        text: result.text ?? "",
        segments: (result.segments ?? []).map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        })),
      };
    }),

  // Upload audio and create a new job (draft state)
  createJob: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        audioBase64: z.string().optional(), // base64 encoded audio (mutually exclusive with audioUrl)
        audioUrl: z.string().url().optional(), // direct URL to audio (e.g. from Suno)
        audioMimeType: z.enum(["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/m4a"]).optional(),
        audioDuration: z.number().int().min(10).max(360), // 10s to 6 minutes
        themePrompt: z.string().min(10).max(2000),
        genre: z.string().max(128).optional(),
        mood: z.string().max(128).optional(),
        characterImageBase64: z.string().optional(), // base64 encoded character photo
        characterImageMimeType: z.string().optional(), // e.g. "image/jpeg"
        enableLipSync: z.boolean().optional(),
        sceneSetting: z.string().max(5000).optional(), // e.g. "concert venue", "desert", "rooftop" — high limit so users can paste full descriptions
        performanceShotRatio: z.number().int().min(0).max(100).optional(), // 0-100: % of scenes that should be character performance shots (default 75)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // ── Profitability Gate 1: Resolve user plan ────────────────────────────
      const isAdmin = ctx.user.role === "admin";
      const userSub = isAdmin ? null : await getUserSubscription(ctx.user.id);
      const productPlan = mapDbPlanToProductPlan(
        userSub?.status === "active" ? userSub.plan : null
      );
      const planConfig = SUBSCRIPTION_PLANS[productPlan];

      // ── Profitability Gate 2: Monthly video count limit ────────────────────
      if (!isAdmin) {
        const videosThisMonth = await countVideosThisMonth(ctx.user.id);
        if (videosThisMonth >= planConfig.maxVideosPerMonth) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Monthly video limit reached (${planConfig.maxVideosPerMonth} videos on ${planConfig.name} plan). Upgrade your plan or wait until next month.`,
          });
        }
      }

      // ── Profitability Gate 3: Video length limit ───────────────────────────
      if (!isAdmin && input.audioDuration > planConfig.maxVideoSeconds) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Video length exceeds your plan limit. ${planConfig.name} plan allows up to ${planConfig.maxVideoSeconds} seconds (${Math.floor(planConfig.maxVideoSeconds / 60)}m ${planConfig.maxVideoSeconds % 60}s). Your audio is ${input.audioDuration}s. Please trim your audio or upgrade your plan.`,
        });
      }

      // Upload audio to S3 (either from base64 or direct URL)
      let audioUrl: string;
      let audioKey: string;
      if (input.audioUrl) {
        // Suno path: fetch from URL and re-upload to our S3 for reliability
        assertSafeUrl(input.audioUrl); // ISS-033: SSRF guard
        const fetchRes = await fetch(input.audioUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuf);
        audioKey = `music-video-audio/${ctx.user.id}-${Date.now()}.mp3`;
        const uploaded = await storagePut(audioKey, audioBuffer, "audio/mpeg");
        audioUrl = uploaded.url;
      } else if (input.audioBase64) {
        const mimeType = input.audioMimeType ?? "audio/mpeg";
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        const ext = mimeType.split("/")[1].replace("mpeg", "mp3");
        audioKey = `music-video-audio/${ctx.user.id}-${Date.now()}.${ext}`;
        const uploaded = await storagePut(audioKey, audioBuffer, mimeType);
        audioUrl = uploaded.url;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either audioBase64 or audioUrl is required." });
      }

      // Upload character image to S3 if provided
      let characterImageUrl: string | null = null;
      let characterImageKey: string | null = null;
      if (input.characterImageBase64 && input.characterImageMimeType) {
        const imgBuffer = Buffer.from(input.characterImageBase64, "base64");
        const imgExt = input.characterImageMimeType.split("/")[1] || "jpg";
        characterImageKey = `music-video-characters/${ctx.user.id}-${Date.now()}.${imgExt}`;
        const { url } = await storagePut(characterImageKey, imgBuffer, input.characterImageMimeType);
        characterImageUrl = url;
      }

      const sceneCount = calculateSceneCount(input.audioDuration);
      const creditCost = calculateCreditCost(sceneCount, input.audioDuration);

      const [result] = await db.insert(musicVideoJobs).values({
        userId: ctx.user.id,
        title: input.title,
        audioUrl,
        audioKey,
        audioDuration: input.audioDuration,
        themePrompt: input.themePrompt,
        genre: input.genre ?? null,
        mood: input.mood ?? null,
        transcription: null,
        transcriptionStatus: "pending",
        characterImageUrl: characterImageUrl ?? null,
        characterImageKey: characterImageKey ?? null,
        // Auto-enable lip sync when a character image is provided — the user wants their character to perform.
        // Only disable if the caller explicitly passes enableLipSync: false.
        enableLipSync: input.enableLipSync ?? (characterImageUrl != null ? true : false),
        isKidsVideo: false,
        kidsTargetAge: null,
        kidsEducationalTheme: null,
        kidsEnableSingalong: true,
        kidsFriendlyIntensity: "vibrant",
        lyrics: null,
        lyricsStatus: "pending",
        captionsEnabled: true,
        captionStyle: "bottom",
        captionBackground: "soft_shadow",
        captionFontSize: 24,
        captionFontStyle: "sans-serif",
        captionTextColour: "#FFFFFF",
        captionHighlightColour: "#FFD700",
        captionKaraokeMode: false,
        captionSafeArea: "bottom_center",
        status: "draft",
        totalScenes: sceneCount,
        completedScenes: 0,
        finalVideoUrl: null,
        finalVideoKey: null,
        creditCost,
        characterRoster: null,
        sceneSetting: input.sceneSetting ?? null,
        performanceShotRatio: input.performanceShotRatio ?? 80,
        lyricsApproved: false,
        errorMessage: null,
      });

      const jobId = (result as any).insertId as number;

      // Kick off transcription asynchronously (non-blocking)
      // This runs in the background so the user can see the storyboard step immediately
      transcribeJobAudio(jobId, audioUrl).catch((err) => {
        console.error(`[MusicVideo] Transcription failed for job ${jobId}:`, err);
      });

      return { jobId, sceneCount, creditCost };
    }),

  // Get transcription status and lyrics for a job (for polling from frontend)
  getTranscription: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        status: job.transcriptionStatus ?? "pending",
        transcription: job.transcription ?? null,
      };
    }),

  // Generate storyboard for a job (free, unlimited)
  generateStoryboard: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => { try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Use stored Whisper segments (with real timestamps) for accurate per-scene lyrics.
      // Fall back to evenly-distributed text segments only if segments aren't available.
      let lyricsSegments: Array<{ start: number; end: number; text: string }> | undefined;

      const waitForTranscription = async (): Promise<typeof job | null> => {
        if (job.transcriptionStatus === "done") return job;
        // If still pending (transcription not yet started), kick it off now.
        // This handles the race condition where the user reaches storyboard generation
        // before the background transcription job has started.
        if (job.transcriptionStatus === "pending") {
          console.log(`[MusicVideo] Transcription still pending for job ${input.jobId} — triggering now`);
          transcribeJobAudio(job.id, job.audioUrl).catch((err) => {
            console.error(`[MusicVideo] Re-triggered transcription failed for job ${job.id}:`, err);
          });
        }
        // Wait up to 150s for transcription — songs can take 30-120s via Whisper.
        if (job.transcriptionStatus === "processing" || job.transcriptionStatus === "pending") {
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((r) => setTimeout(r, 5000));
            const [refreshed] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
            if (refreshed?.transcriptionStatus === "done") return refreshed;
            if (refreshed?.transcriptionStatus === "failed") {
              console.warn(`[MusicVideo] Transcription failed for job ${input.jobId} — proceeding without lyrics`);
              return null;
            }
          }
          console.warn(`[MusicVideo] Transcription timed out after 150s for job ${input.jobId} — proceeding without lyrics`);
        }
        return null;
      };

      const transcribedJob = await waitForTranscription();
      if (transcribedJob?.transcriptionStatus === "done") {
        // PREFERRED: use real Whisper timestamps stored as JSON
        if (transcribedJob.transcriptionSegments) {
          try {
            const parsed = JSON.parse(transcribedJob.transcriptionSegments) as Array<{ start: number; end: number; text: string }>;
            if (Array.isArray(parsed) && parsed.length > 0) {
              lyricsSegments = parsed;
              console.log(`[MusicVideo] Using ${parsed.length} real Whisper segments for job ${input.jobId}`);
            }
          } catch { /* fall through to text-based fallback */ }
        }
        // FALLBACK: evenly distribute text lines if no segments stored (older jobs)
        if (!lyricsSegments && transcribedJob.transcription) {
          const lines = transcribedJob.transcription
            .split(/[.!?\n]+/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          if (lines.length > 0) {
            const segDuration = job.audioDuration / lines.length;
            lyricsSegments = lines.map((text, i) => ({
              start: i * segDuration,
              end: (i + 1) * segDuration,
              text,
            }));
            console.log(`[MusicVideo] Using ${lines.length} text-split segments (fallback) for job ${input.jobId}`);
          }
        }
      }

      // Fetch ALL characters for this job — locked and unlocked
      const allCharacters = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));

      // Auto-analyse and lock any characters that have photos but no locked description yet.
      // Also re-analyse if the existing description is too short/vague to be useful for AI image generation.
      // A good AI-generated description is 150+ chars with specific visual details.
      // Short user-typed descriptions like "Rock Star, leather jacket" won't produce face likeness.
      const { invokeLLM } = await import("../../_core/llm");
      const isDescriptionTooVague = (desc: string | null | undefined): boolean => {
        if (!desc) return true;
        const trimmed = desc.trim();
        // Too short to be a proper forensic description
        if (trimmed.length < 150) return true;
        // Doesn't contain key forensic markers (hair, eyes, skin) — likely user-typed
        const hasHair = /hair/i.test(trimmed);
        const hasEyes = /eye/i.test(trimmed);
        const hasSkin = /skin|complexion|tone/i.test(trimmed);
        if (!hasHair && !hasEyes && !hasSkin) return true;
        return false;
      };
      for (const char of allCharacters) {
        // Skip if already has a good detailed description AND no photos to re-analyse from
        const needsAnalysis = !char.lockedDescription || isDescriptionTooVague(char.lockedDescription);
        if (!needsAnalysis) continue; // already has a detailed description — skip
        // Fetch primary photo for this character
        const photos = await db.select().from(videoCharacterPhotos)
          .where(eq(videoCharacterPhotos.characterId, char.id));
        const primaryPhoto = photos.find(p => p.isPrimary) ?? photos[0];
        if (!primaryPhoto?.photoUrl) continue; // no photo — skip
        try {
          console.log(`[MusicVideo] Auto-analysing character ${char.name} (id=${char.id}) for job ${input.jobId}`);
          const analysisResponse = await invokeLLM({
            messages: [
              {
                role: "system" as const,
                content: `You are a forensic visual analyst writing character appearance briefs for AI video generation.
Describe exactly what you see in the photo with maximum precision. This description will be used word-for-word in AI video prompts.
Rules:
- Describe ONLY what is visually observable. Do NOT guess or infer.
- Be hyper-specific: exact hair colour, eye colour, skin tone, clothing.
- Include: gender, apparent age range, ethnicity/skin tone, hair (colour, length, texture, style), eyes (colour and shape), face shape, build, clothing, distinctive features.
- Output: A single dense paragraph of 80-120 words. No bullet points.`,
              },
              {
                role: "user" as const,
                content: [
                  { type: "image_url" as const, image_url: { url: primaryPhoto.photoUrl, detail: "high" as const } },
                  { type: "text" as const, text: `Analyse this photo and write a precise 80-120 word character appearance brief. Include: ${char.role ? `Role: ${char.role}. ` : ""}Be forensically specific about hair colour/texture/style, exact skin tone, eye colour and shape, face structure, build, clothing, and any distinctive features.` },
                ],
              },
            ],
          });
          const description = analysisResponse.choices[0]?.message?.content;
          if (description && typeof description === "string" && description.trim().length > 20) {
            // Second pass: extract structured visual lock fields (hair + instrument) from the same photo
            let structuredVisualDetails: Record<string, string> = {};
            try {
              const { invokeLLM: invokeLLM2 } = await import("../../_core/llm");
              const structuredResponse = await invokeLLM2({
                messages: [
                  {
                    role: "system" as const,
                    content: `You are a forensic visual analyst. Extract precise visual lock data from the photo for AI video generation. Output ONLY valid JSON, no markdown, no explanation.`,
                  },
                  {
                    role: "user" as const,
                    content: [
                      { type: "image_url" as const, image_url: { url: primaryPhoto.photoUrl, detail: "high" as const } },
                      { type: "text" as const, text: `Extract the following fields from this photo as a JSON object. If a field is not visible or not applicable, use null.\n{\n  "hairColour": "exact hair colour (e.g. jet black, dark brown, platinum blonde, auburn red)",\n  "hairLength": "exact length (e.g. shaved, close-cropped, short, medium/collar-length, shoulder-length, long/past shoulders, very long/waist-length)",\n  "hairStyle": "style description (e.g. straight, wavy, curly, messy, slicked back, braided, afro)",\n  "instrumentModel": "exact instrument model if visible (e.g. Gibson Les Paul Standard, Fender Stratocaster, Pearl Export drum kit, Fender Precision Bass) or null",\n  "instrumentColour": "exact instrument colour/finish if visible (e.g. sunburst, gloss black, natural wood, cherry red) or null",\n  "instrumentFinish": "hardware and finish details if visible (e.g. gold hardware, chrome tuners, white pickguard) or null"\n}` },
                    ],
                  },
                ],
              });
              const raw = structuredResponse.choices[0]?.message?.content;
              if (raw && typeof raw === "string") {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  for (const [k, v] of Object.entries(parsed)) {
                    if (v && typeof v === "string") structuredVisualDetails[k] = v;
                  }
                }
              }
            } catch (structErr) {
              console.warn(`[MusicVideo] Structured visual extraction failed for ${char.name}:`, structErr);
            }
            // ── Role-derived instrument fallback ──────────────────────────────────
            // If the photo analysis returned null for instrumentModel (headshot with no instrument),
            // derive the instrument from the character's role field so it's always injected into prompts.
            if (!structuredVisualDetails.instrumentModel && char.role) {
              const roleLower = char.role.toLowerCase();
              if (roleLower.includes("guitar") || roleLower.includes("guitarist")) {
                structuredVisualDetails.instrumentModel = "Gibson Les Paul Standard electric guitar";
                if (!structuredVisualDetails.instrumentColour) structuredVisualDetails.instrumentColour = "sunburst";
                if (!structuredVisualDetails.instrumentFinish) structuredVisualDetails.instrumentFinish = "gold hardware";
              } else if (roleLower.includes("bass")) {
                structuredVisualDetails.instrumentModel = "Fender Precision Bass";
                if (!structuredVisualDetails.instrumentColour) structuredVisualDetails.instrumentColour = "sunburst";
                if (!structuredVisualDetails.instrumentFinish) structuredVisualDetails.instrumentFinish = "chrome hardware";
              } else if (roleLower.includes("drum") || roleLower.includes("percus")) {
                structuredVisualDetails.instrumentModel = "Pearl Export drum kit";
                if (!structuredVisualDetails.instrumentColour) structuredVisualDetails.instrumentColour = "black";
                if (!structuredVisualDetails.instrumentFinish) structuredVisualDetails.instrumentFinish = "chrome hardware";
              } else if (roleLower.includes("piano") || roleLower.includes("keyboard") || roleLower.includes("keys")) {
                structuredVisualDetails.instrumentModel = "Roland stage piano keyboard";
                if (!structuredVisualDetails.instrumentColour) structuredVisualDetails.instrumentColour = "black";
                if (!structuredVisualDetails.instrumentFinish) structuredVisualDetails.instrumentFinish = "gloss black";
              } else if (roleLower.includes("violin") || roleLower.includes("fiddle")) {
                structuredVisualDetails.instrumentModel = "acoustic violin";
                if (!structuredVisualDetails.instrumentColour) structuredVisualDetails.instrumentColour = "natural wood";
                if (!structuredVisualDetails.instrumentFinish) structuredVisualDetails.instrumentFinish = "varnished";
              }
              if (structuredVisualDetails.instrumentModel) {
                console.log(`[MusicVideo] Role-derived instrument for ${char.name}: ${structuredVisualDetails.instrumentModel} (from role: "${char.role}")`);
              }
            }
            // Merge with any existing characterVisualDetails
            // Existing visual details (user-set) take precedence over photo-derived ones
            let existingVisual: Record<string, string> = {};
            if (char.characterVisualDetails) {
              try { existingVisual = JSON.parse(char.characterVisualDetails); } catch {}
            }
            const mergedVisual = { ...structuredVisualDetails, ...existingVisual };
            await db.update(videoCharacters)
              .set({ isLocked: true, lockedDescription: description.trim(), characterVisualDetails: JSON.stringify(mergedVisual), updatedAt: new Date() })
              .where(eq(videoCharacters.id, char.id));
            console.log(`[MusicVideo] Auto-locked character ${char.name} with description (${description.trim().length} chars) + visual lock: ${JSON.stringify(structuredVisualDetails)}`);
          }
        } catch (err) {
          console.warn(`[MusicVideo] Failed to auto-analyse character ${char.name}:`, err);
        }
      }

      // Re-fetch characters after auto-locking to get updated locked descriptions
      // This now includes any previously-frozen AI-invented characters (e.g. Mike the bassist)
      const refreshedCharacters = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));
      const lockedCharacters = refreshedCharacters
        .filter((c) => c.isLocked && c.lockedDescription)
        .map((c) => ({ name: c.name, role: c.role, lockedDescription: c.lockedDescription! }));
      console.log(`[MusicVideo] Locked characters for job ${input.jobId}: ${lockedCharacters.map(c => c.name).join(", ") || "none"} (includes AI-invented if previously frozen)`);

      // Generate scenes via LLM — lyrics-driven if available, theme-only otherwise
      // Include character image reference in theme prompt if provided
      let enrichedThemePrompt = job.themePrompt;
      if (job.characterImageUrl) {
        enrichedThemePrompt += `\n\nCharacter Reference: A specific character/person should appear in scenes. Use their visual appearance consistently throughout the video. Character image URL: ${job.characterImageUrl}`;
      }
      if (job.enableLipSync) {
        enrichedThemePrompt += "\n\nLip Sync: Include close-up shots of the character's face/mouth in scenes where lyrics are being sung, suitable for lip sync processing.";
      }
      // Include user-uploaded visual reference assets as context
      if (job.contextAssetUrls) {
        try {
          const assets: Array<{ url: string; mimeType: string; type: string }> = JSON.parse(job.contextAssetUrls);
          if (assets.length > 0) {
            const imageAssets = assets.filter(a => a.type === "image");
            const videoAssets = assets.filter(a => a.type === "video");
            if (imageAssets.length > 0) {
              enrichedThemePrompt += `\n\nVisual Reference Images: The user has uploaded ${imageAssets.length} reference image(s) to guide the visual style. Use these as inspiration for the aesthetic, colour palette, and mood of the scenes. Image URLs: ${imageAssets.map(a => a.url).join(", ")}`;
            }
            if (videoAssets.length > 0) {
              enrichedThemePrompt += `\n\nVisual Reference Videos: The user has uploaded ${videoAssets.length} reference video(s) to guide the visual style and pacing. Video URLs: ${videoAssets.map(a => a.url).join(", ")}`;
            }
          }
        } catch { /* ignore malformed JSON */ }
      }

      // ── Vocal Onset Time: fetch BEFORE generateStoryboard so it can be passed in ──
      // detectVocalOnset() uses ffmpeg silencedetect on the isolated vocal stem
      // to find the EXACT second when singing starts. Any scene whose midpoint
      // falls before this time will NEVER receive lipSync=true.
      const vocalOnsetTime = await getVocalOnsetTime(input.jobId);
      if (vocalOnsetTime !== null) {
        console.log(`[MusicVideo] Vocal onset gate for job ${input.jobId}: lipSync disabled for scenes before ${vocalOnsetTime.toFixed(2)}s`);
      }

      const { scenes, roster } = await withQuotaGuard(() => generateStoryboard(
        enrichedThemePrompt,
        job.genre,
        job.mood,
        job.audioDuration,
        job.title,
        lyricsSegments,
        lockedCharacters.length > 0 ? lockedCharacters : undefined,
        job.sceneSetting ?? undefined,
        undefined, // existingContentAnalysis
        job.enableLipSync ?? false,
        job.songBpm ?? null,
        job.performanceShotRatio ?? 75,
        undefined, // directorMode
        vocalOnsetTime // precise vocal start time — prevents lyric misassignment on instrumental intros
      ));

      console.log(`[MusicVideo] Roster for job ${input.jobId}: ${roster.map(c => c.name).join(", ")}`);

      // ── Persist AI-invented characters to videoCharacters so their descriptions are frozen ──
      // Invented characters (isLocked=false in roster) need a stable description stored in the DB.
      // On subsequent storyboard regenerations, we check if they already exist and reuse the frozen description.
      const inventedInRoster = roster.filter(c => !c.isLocked);
      for (const invented of inventedInRoster) {
        // Check if this invented character already exists in videoCharacters for this job
        const existing = await db.select().from(videoCharacters)
          .where(and(
            eq(videoCharacters.jobId, input.jobId),
            eq(videoCharacters.userId, ctx.user.id)
          ));
        const alreadyExists = existing.find(c => c.name.toLowerCase() === invented.name.toLowerCase());
        if (alreadyExists) {
          // Already exists — update the description only if not already locked
          if (!alreadyExists.isLocked) {
            await db.update(videoCharacters)
              .set({ lockedDescription: invented.description, isLocked: true, lockedAt: new Date(), updatedAt: new Date() })
              .where(eq(videoCharacters.id, alreadyExists.id));
            console.log(`[MusicVideo] Updated invented character ${invented.name} description in DB`);
          } else {
            console.log(`[MusicVideo] Invented character ${invented.name} already locked in DB — keeping frozen description`);
          }
        } else {
          // New invented character — insert with locked description so it's frozen for future runs
          const nextSlot = existing.length; // use next available slot index
          await db.insert(videoCharacters).values({
            jobId: input.jobId,
            userId: ctx.user.id,
            name: invented.name,
            role: invented.role,
            slotIndex: nextSlot,
            lockedDescription: invented.description,
            isLocked: true,
            lockedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`[MusicVideo] Persisted new invented character ${invented.name} (${invented.role}) to DB`);
        }
      }

      // ── Stem Intelligence: load section classification if available ────────────────
      // Prefer Demucs stem sections over transcription for vocal detection.
      // Falls back to lyricsSegments if stem analysis is not yet complete.
      const stemSections = await getStemSections(input.jobId);
      if (stemSections) {
        console.log(`[MusicVideo] Stem intelligence available for job ${input.jobId}: ${stemSections.sections.length} sections (${stemSections.total_duration.toFixed(1)}s total)`);
      } else {
        console.log(`[MusicVideo] Stem intelligence not yet available for job ${input.jobId} — using transcription fallback for vocal detection`);
      }

      // vocalOnsetTime already fetched above before generateStoryboard

       // Delete existing scenes if regenerating
      await db.delete(musicVideoScenes).where(eq(musicVideoScenes.jobId, input.jobId));
      // Also clear any existing characterScenes rows for this job's scenes (cascade-style)
      // We do this by fetching the old scene IDs first — but since we just deleted them, we
      // instead rely on the insert loop below to create fresh characterScenes rows.
      // Build a name→id map from refreshedCharacters for characterScenes population
      const charNameToId = new Map(refreshedCharacters.map(c => [c.name.toLowerCase(), c.id]));
      // Insert new scenes
      // Store the CLEAN prompt (scene direction only) in the DB — this is what users see.
      // The full render prompt (with character descriptions prepended) is built on-the-fly at render time.
      for (const scene of scenes) {
        // Determine character assignments for this scene
        const assignedNames: string[] = scene.characterAssignments && scene.characterAssignments.length > 0
          ? scene.characterAssignments
          : roster.length > 0
            ? [roster.find((c: { isLocked?: boolean }) => c.isLocked)?.name ?? roster[0].name]
            : [];
        // ── WizSync™ Vocal-Aware Orchestration ─────────────────────────────────────
        // Primary signal: Demucs stem section classification (if available)
        // Fallback signal: Whisper transcription segment overlap
        // A scene gets lip sync only when ALL THREE conditions are met:
        //   1. Close-up character scene (seedance-2.0) — face must be visible
        //   2. Character assigned to this scene
        //   3. Scene time window contains vocal content (stem or transcription)
        const sceneEnd = (scene.startTime ?? 0) + (scene.duration ?? 6);
        const sceneMidpoint = (scene.startTime ?? 0) + (scene.duration ?? 6) / 2;
        let sceneHasVocals: boolean;
        let stemDrivenSceneType: "cinematic" | "performance" | null = null;

        if (stemSections && stemSections.sections.length > 0) {
          // PRIMARY: use Demucs stem classification
          const sectionType = getSectionTypeAtTime(stemSections.sections, sceneMidpoint);
          if (sectionType) {
            const mappedType = stemSectionToSceneType(sectionType, assignedNames.length > 0);
            sceneHasVocals = sectionType === "vocal_performance" || sectionType === "climax";
            stemDrivenSceneType = mappedType === "performance" ? "performance" : "cinematic";
            console.log(`[MusicVideo] Scene ${scene.sceneIndex} @${sceneMidpoint.toFixed(1)}s: stem=${sectionType} → type=${stemDrivenSceneType}, hasVocals=${sceneHasVocals}`);
          } else {
            sceneHasVocals = false;
            stemDrivenSceneType = "cinematic";
          }
        } else {
          // FALLBACK: use Whisper transcription segments
          sceneHasVocals = lyricsSegments && lyricsSegments.length > 0
            ? lyricsSegments.some(seg =>
                seg.text && seg.text.trim().length > 0 &&
                seg.start < sceneEnd &&
                seg.end > (scene.startTime ?? 0)
              )
            : true; // if no transcription available, default to enabled (safe fallback)
        }

        // Apply vocal onset gate: if we have a precise vocal onset time, scenes whose
        // midpoint falls before it are in the instrumental intro and must not have lip sync.
        const sceneBeforeVocalOnset = vocalOnsetTime !== null && sceneMidpoint < vocalOnsetTime;
        if (sceneBeforeVocalOnset) {
          console.log(`[MusicVideo] Scene ${scene.sceneIndex} @${sceneMidpoint.toFixed(1)}s: before vocal onset (${vocalOnsetTime!.toFixed(2)}s) — lip sync DISABLED`);
        }
        const smartLipSync = scene.modelAssignment === "seedance-2.0" && assignedNames.length > 0 && sceneHasVocals && !sceneBeforeVocalOnset;
        if (!sceneHasVocals && scene.modelAssignment === "seedance-2.0") {
          console.log(`[MusicVideo] Scene ${scene.sceneIndex} (${(scene.startTime ?? 0).toFixed(1)}s–${sceneEnd.toFixed(1)}s): no vocals — lip sync DISABLED`);
        }
        // Use stem-driven scene type if available, otherwise derive from lip sync flag
        const isPerformanceScene = smartLipSync && scene.modelAssignment === "seedance-2.0" && assignedNames.length > 0;
        const detectedSceneType: "cinematic" | "performance" = stemDrivenSceneType ?? (isPerformanceScene ? "performance" : "cinematic");
        const [insertedScene] = await db.insert(musicVideoScenes).values({
          jobId: input.jobId,
          sceneIndex: scene.sceneIndex,
          startTime: scene.startTime,
          duration: scene.duration,
          prompt: scene.cleanPrompt || scene.prompt,
          lyrics: scene.lyrics || null,
          visualStyle: scene.visualStyle,
          characterAssignments: assignedNames.length > 0 ? JSON.stringify(assignedNames) : null,
          status: "pending",
          lipSync: smartLipSync,
          sceneType: detectedSceneType,
        });
        // Populate characterScenes junction table for this scene
        const newSceneId = (insertedScene as any).insertId as number;
        if (newSceneId && assignedNames.length > 0) {
          for (let i = 0; i < assignedNames.length; i++) {
            const charId = charNameToId.get(assignedNames[i].toLowerCase());
            if (charId) {
              await db.insert(characterScenes).values({
                sceneId: newSceneId,
                characterId: charId,
                isPrimary: i === 0, // first character is the primary/focus character
                positionOrder: i,
              }).catch(err => {
                // Non-blocking: log but don't fail the storyboard generation
                console.warn(`[MusicVideo] Could not insert characterScene for scene ${newSceneId}, char ${assignedNames[i]}:`, err);
              });
            }
          }
        }
      }

      // Save the full character roster (locked + AI-invented) to the job record
      // This is used at render time to inject the correct character description into each scene prompt
      await db.update(musicVideoJobs)
        .set({
          status: "storyboard_ready",
          totalScenes: scenes.length,
          characterRoster: JSON.stringify(roster),
          updatedAt: new Date(),
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Fetch the actual DB rows so the frontend gets real scene IDs (not sceneIndex values)
      const dbScenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));
      dbScenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
      return { scenes: dbScenes };
    } catch (err: any) {
      // Convert any unhandled error (including 503 JSON parse crashes) into a clean user-facing message
      if (err instanceof TRPCError) throw err;
      const msg = err?.message ?? String(err);
      // Detect transient service errors
      const isTransient = /503|502|service unavailable|bad gateway/i.test(msg);
      console.error(`[generateStoryboard] Unhandled error for job ${input.jobId}:`, msg);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: isTransient
          ? "The AI service is temporarily unavailable. Please try again in a few seconds."
          : `Storyboard generation failed: ${msg.slice(0, 200)}`,
      });
    }
    }),

  // Update a single scene prompt (user editing storyboard)
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const jobs = await db.select().from(musicVideoJobs)
      .where(eq(musicVideoJobs.userId, ctx.user.id))
      .orderBy(desc(musicVideoJobs.createdAt));

    // Attach scene stats + thumbnail to each job
    const jobsWithStats = await Promise.all(jobs.map(async (job) => {
      const scenes = await db.select({
        id: musicVideoScenes.id,
        status: musicVideoScenes.status,
        errorMessage: musicVideoScenes.errorMessage,
        previewImageUrl: musicVideoScenes.previewImageUrl,
        sceneIndex: musicVideoScenes.sceneIndex,
      }).from(musicVideoScenes).where(eq(musicVideoScenes.jobId, job.id));

      const totalScenes = scenes.length;
      const completedScenes = scenes.filter((s) => s.status === "completed").length;
      const failedScenes = scenes.filter((s) => s.status === "failed").length;
      const renderingScenes = scenes.filter((s) => s.status === "generating").length;
      // Pick first scene with a preview image as thumbnail
      const sortedScenes = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);
      const thumbnailUrl = sortedScenes.find((s) => s.previewImageUrl)?.previewImageUrl ?? null;

      return { ...job, totalScenes, completedScenes, failedScenes, renderingScenes, thumbnailUrl };
    }));

    return jobsWithStats;
  }),

  // Get full job details including all scenes with status and error logs
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

      return { job, scenes };
    }),

  // Generate a preview image for a single scene (called per-scene after storyboard loads)
  getJobDetails: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const scenes = await db.select({
        id: musicVideoScenes.id,
        sceneIndex: musicVideoScenes.sceneIndex,
        status: musicVideoScenes.status,
        prompt: musicVideoScenes.prompt,
        lyrics: musicVideoScenes.lyrics,
        errorMessage: musicVideoScenes.errorMessage,
        videoUrl: musicVideoScenes.videoUrl,
        startTime: musicVideoScenes.startTime,
        duration: musicVideoScenes.duration,
        lipSync: musicVideoScenes.lipSync,
        updatedAt: musicVideoScenes.updatedAt,
      }).from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      const totalScenes = scenes.length;
      const completedScenes = scenes.filter((s) => s.status === "completed").length;
      const failedScenes = scenes.filter((s) => s.status === "failed").length;

      return { job, scenes, totalScenes, completedScenes, failedScenes };
    }),

  // Re-analyse a character's reference photo to generate a detailed forensic description.
  // Useful when the existing lockedDescription is too short/vague (user-typed) and needs
  // to be replaced with a proper AI-generated appearance brief for better face likeness.
  deleteJob: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      // Delete in dependency order: photos → characters → scenes → job
      const jobChars = await db.select({ id: videoCharacters.id }).from(videoCharacters)
        .where(eq(videoCharacters.jobId, input.jobId));
      for (const char of jobChars) {
        await db.delete(videoCharacterPhotos).where(eq(videoCharacterPhotos.characterId, char.id));
      }
      await db.delete(videoCharacters).where(eq(videoCharacters.jobId, input.jobId));
      await db.delete(musicVideoScenes).where(eq(musicVideoScenes.jobId, input.jobId));
      await db.delete(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId));
      console.log(`[deleteJob] Job ${input.jobId} deleted by user ${ctx.user.id}`);
      return { success: true };
    }),

  // Analyse lyrics — break into blocks with emotion, scene type, visual cues
  listAllJobs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const [musicJobs, kidsJobs, shortsJobs] = await Promise.all([
      db.select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        status: musicVideoJobs.status,
        thumbnailUrl: musicVideoJobs.thumbnailUrl,
        finalVideoUrl: musicVideoJobs.finalVideoUrl,
        createdAt: musicVideoJobs.createdAt,
        creditCost: musicVideoJobs.creditCost,
        isKidsVideo: musicVideoJobs.isKidsVideo,
        aspectRatio: musicVideoJobs.aspectRatio,
        audioUrl: musicVideoJobs.audioUrl,
        audioDuration: musicVideoJobs.audioDuration,
        genre: musicVideoJobs.genre,
        mood: musicVideoJobs.mood,
        isPublic: musicVideoJobs.isPublic,
        shareSlug: musicVideoJobs.shareSlug,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
      }).from(musicVideoJobs)
        .where(eq(musicVideoJobs.userId, ctx.user.id))
        .orderBy(desc(musicVideoJobs.createdAt))
        .limit(100),
      db.select({
        id: kidsVideoJobs.id,
        storyPrompt: kidsVideoJobs.storyPrompt,
        renderStatus: kidsVideoJobs.renderStatus,
        videoUrl: kidsVideoJobs.videoUrl,
        createdAt: kidsVideoJobs.createdAt,
        creditsCharged: kidsVideoJobs.creditsCharged,
      }).from(kidsVideoJobs)
        .where(eq(kidsVideoJobs.userId, ctx.user.id))
        .orderBy(desc(kidsVideoJobs.createdAt))
        .limit(50),
      db.select({
        id: wizShortsJobs.id,
        topic: wizShortsJobs.topic,
        shortsStatus: wizShortsJobs.status,
        videoUrl: wizShortsJobs.videoUrl,
        createdAt: wizShortsJobs.createdAt,
        creditCost: wizShortsJobs.creditCost,
      }).from(wizShortsJobs)
        .where(eq(wizShortsJobs.userId, ctx.user.id))
        .orderBy(desc(wizShortsJobs.createdAt))
        .limit(50),
    ]);
    type StudioType = "music_video" | "wizanimate" | "wiz_shorts";
    type NormStatus = "draft" | "rendering" | "completed" | "failed" | "storyboard_ready";
    const normaliseKidsStatus = (s: string): NormStatus =>
      s === "completed" ? "completed" : s === "processing" ? "rendering" : s === "failed" ? "failed" : "draft";
    const normaliseShortsStatus = (s: string): NormStatus =>
      s === "complete" ? "completed" : s === "failed" ? "failed" : (s === "rendering" || s === "assembling") ? "rendering" : "draft";
    const result = [
      ...musicJobs.map(j => ({
        id: j.id,
        title: j.title,
        status: j.status as NormStatus,
        thumbnailUrl: j.thumbnailUrl,
        finalVideoUrl: j.finalVideoUrl,
        createdAt: j.createdAt,
        creditCost: j.creditCost,
        studioType: (j.isKidsVideo ? "wizanimate" : "music_video") as StudioType,
        studioUrl: j.isKidsVideo ? "/kids-video" : "/music-video/create",
        jobParam: `jobId=${j.id}`,
        audioUrl: j.audioUrl ?? null,
        audioDuration: j.audioDuration ?? null,
        genre: j.genre ?? null,
        mood: j.mood ?? null,
        isPublic: j.isPublic ?? false,
        shareSlug: j.shareSlug ?? null,
        totalScenes: j.totalScenes ?? 0,
        completedScenes: j.completedScenes ?? 0,
        failedScenes: 0,
      })),
      ...kidsJobs.map(j => ({
        id: j.id,
        title: j.storyPrompt.slice(0, 60) + (j.storyPrompt.length > 60 ? "…" : ""),
        status: normaliseKidsStatus(j.renderStatus),
        thumbnailUrl: j.videoUrl,
        finalVideoUrl: j.videoUrl,
        createdAt: j.createdAt,
        creditCost: j.creditsCharged,
        studioType: "wizanimate" as StudioType,
        studioUrl: "/kids-video",
        jobParam: `jobId=${j.id}`,
      })),
      ...shortsJobs.map(j => ({
        id: j.id,
        title: j.topic,
        status: normaliseShortsStatus(j.shortsStatus),
        thumbnailUrl: j.videoUrl,
        finalVideoUrl: j.videoUrl,
        createdAt: j.createdAt,
        creditCost: j.creditCost,
        studioType: "wiz_shorts" as StudioType,
        studioUrl: "/wiz-shorts",
        jobParam: `jobId=${j.id}`,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }),

  // List all public videos (for sitemap)
  getJobProgress: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      const completedCount = scenes.filter((s) => s.status === "completed").length;
      const failedCount = scenes.filter((s) => s.status === "failed").length;
      const totalCount = scenes.length;

      // Compute user-facing state and progress percentage
      type UserFacingState = "preparing" | "building_storyboard" | "ready_to_review" | "generating" | "finishing" | "done" | "error";
      let userState: UserFacingState;
      let progressPct: number;
      let userMessage: string;

      switch (job.status) {
        case "draft":
          userState = "preparing";
          progressPct = 5;
          userMessage = "Setting up your project...";
          break;
        case "storyboard_ready":
          userState = "ready_to_review";
          progressPct = 25;
          userMessage = "Storyboard ready — review and start render";
          break;
        case "rendering":
          userState = "generating";
          progressPct = totalCount > 0
            ? Math.round(25 + (completedCount / totalCount) * 60)
            : 30;
          userMessage = totalCount > 0
            ? `Generating scenes (${completedCount}/${totalCount})...`
            : "Starting scene generation...";
          break;
        case "assembling":
          userState = "finishing";
          progressPct = 90;
          userMessage = "Assembling your video...";
          break;
        case "completed":
          userState = "done";
          progressPct = 100;
          userMessage = "Your video is ready!";
          break;
        case "failed":
          userState = "error";
          progressPct = 0;
          // Translate internal error codes to user-friendly messages
          userMessage = translateErrorMessage(job.errorMessage ?? "");
          break;
        case "paused":
          userState = "generating";
          progressPct = totalCount > 0 ? Math.round(25 + (completedCount / totalCount) * 60) : 30;
          userMessage = "Render paused — will resume automatically";
          break;
        default:
          userState = "preparing";
          progressPct = 5;
          userMessage = "Preparing...";
      }

      return {
        jobId: job.id,
        status: job.status,
        userState,
        progressPct,
        userMessage,
        totalScenes: totalCount,
        completedScenes: completedCount,
        failedScenes: failedCount,
        finalVideoUrl: job.finalVideoUrl ?? null,
        canRetry: job.status === "failed" && failedCount > 0,
      };
    }),

  // ── Phase 2: Retry Failed Job ─────────────────────────────────────────────
  // Resets only the failed scenes to pending and re-queues the job.
  // Does NOT regenerate the storyboard or re-charge credits.
  getJobQualityStatus: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const scenes = await db.select({
        id: musicVideoScenes.id,
        sceneIndex: musicVideoScenes.sceneIndex,
        status: musicVideoScenes.status,
        videoUrl: musicVideoScenes.videoUrl,
        reRenderCount: musicVideoScenes.reRenderCount,
        freeReRenderUsed: musicVideoScenes.freeReRenderUsed,
        prompt: musicVideoScenes.prompt,
        lyrics: musicVideoScenes.lyrics,
        lipSync: musicVideoScenes.lipSync,
        lipSyncStyle: musicVideoScenes.lipSyncStyle,
      }).from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      const isDownloaded = !!job.downloadedAt;
      const canReRender = !isDownloaded && job.status === "completed";

      return {
        jobId: job.id,
        qualityStatus: job.qualityStatus ?? "pending",
        downloadedAt: job.downloadedAt ?? null,
        isDownloaded,
        canReRender,
        finalVideoUrl: job.finalVideoUrl,
        title: job.title,
        scenes: scenes.map(s => ({
          id: s.id,
          sceneIndex: s.sceneIndex,
          status: s.status,
          videoUrl: s.videoUrl,
          reRenderCount: s.reRenderCount ?? 0,
          freeReRenderUsed: s.freeReRenderUsed ?? false,
          creditCostForNextReRender: (s.freeReRenderUsed || (s.reRenderCount ?? 0) > 0) ? 1 : 0,
          prompt: s.prompt,
          lyrics: s.lyrics,
          lipSync: s.lipSync,
          lipSyncStyle: s.lipSyncStyle,
          canReRender: canReRender,
        })),
      };
    }),

  /**
   * Request a re-render for a single scene.
   * Option A policy:
   *   - First re-render per scene: FREE (no credit deduction)
   *   - Subsequent re-renders: 1 credit each
   *   - Not available after download (downloadedAt is set)
   *
   * Optionally accepts an updated prompt and/or lip sync settings.
   */
  togglePublic: protectedProcedure
    .input(z.object({ jobId: z.number().int(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed videos can be made public" });
      let shareSlug = job.shareSlug;
      if (input.isPublic && !shareSlug) {
        const { randomBytes } = await import("crypto");
        shareSlug = randomBytes(6).toString("hex");
      }
      await db.update(musicVideoJobs)
        .set({ isPublic: input.isPublic, shareSlug: input.isPublic ? shareSlug : job.shareSlug, updatedAt: new Date() } as any)
        .where(eq(musicVideoJobs.id, input.jobId));
      return { success: true, shareSlug: input.isPublic ? shareSlug : null, watchUrl: input.isPublic ? `/watch/${shareSlug}` : null };
    }),

  // Fetch a public video by its share slug (no auth required)
  getPublicVideo: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        genre: musicVideoJobs.genre,
        mood: musicVideoJobs.mood,
        finalVideoUrl: musicVideoJobs.finalVideoUrl,
        thumbnailUrl: musicVideoJobs.thumbnailUrl,
        audioDuration: musicVideoJobs.audioDuration,
        createdAt: musicVideoJobs.createdAt,
        shareSlug: musicVideoJobs.shareSlug,
        isPublic: musicVideoJobs.isPublic,
      }).from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.shareSlug, input.slug), eq(musicVideoJobs.isPublic, true)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found or is not public" });
      return job;
    }),

  // Upload audio file to S3 for standalone playback (MusicCreator upload mode)
  listPublicVideos: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      shareSlug: musicVideoJobs.shareSlug,
      title: musicVideoJobs.title,
      updatedAt: musicVideoJobs.updatedAt,
      thumbnailUrl: musicVideoJobs.thumbnailUrl,
      finalVideoUrl: musicVideoJobs.finalVideoUrl,
      audioDuration: musicVideoJobs.audioDuration,
    }).from(musicVideoJobs)
      .where(and(eq(musicVideoJobs.isPublic, true), eq(musicVideoJobs.status, "completed")))
      .orderBy(desc(musicVideoJobs.createdAt));
  }),

  // ───────────────────────────────────────────────────────────────
  // QUALITY GUARANTEE SYSTEM — Option A: 1 free re-render per scene before download
  // ───────────────────────────────────────────────────────────────

  /**
   * Get quality status for a job: qualityStatus, downloadedAt, per-scene re-render counts.
   * Used by the Preview & Direct page to determine what actions are available.
   */
  uploadAudio: protectedProcedure
    .input(z.object({
      bytes: z.array(z.number()),
      mimeType: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.bytes);
      const ext = input.filename.split(".").pop() || "mp3";
      const key = `audio-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),

  // ── Enhance Prompt ─────────────────────────────────────────────────────────
  enhancePrompt: protectedProcedure
    .input(z.object({
      prompt: z.string().min(3).max(2000),
      genre: z.string().optional(),
      mood: z.string().optional(),
      characters: z.array(z.string()).optional(), // character names in this scene
      productType: z.enum(["music_video", "kids_video", "shorts", "audio", "script", "lipsync", "general"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../../_core/llm");
      const productType = input.productType ?? "general";
      const charList = (input.characters ?? []).filter(Boolean);
      const charContext = charList.length > 0 ? `Characters in this scene: ${charList.join(", ")}.` : "";
      const genreContext = [input.genre, input.mood].filter(Boolean).join(", ");

      const systemPromptMap: Record<string, string> = {
        kids_video: `You are a professional children's animation director and AI prompt engineer for WIZ AI.
Take the user's plain-English scene description and rewrite it as a precise, vivid, production-ready prompt for an AI image/video generator.
The output must be safe for children, colourful, imaginative, and in the style of animated children's content.
KEEP the user's core intent EXACTLY — do not change what they asked for. Only make it more precise and visually descriptive.
Return ONLY the enhanced prompt text. No explanations, no preamble, no quotes.`,
        audio: `You are a professional music producer and AI prompt engineer for WIZ AI.
Take the user's plain-English audio/music description and rewrite it as a precise, production-ready prompt for an AI music generator.
KEEP the user's core intent EXACTLY — genre, mood, instruments, tempo, feel. Only add more precise musical vocabulary.
Return ONLY the enhanced prompt text. No explanations, no preamble, no quotes.`,
        shorts: `You are a professional social media video director and AI prompt engineer for WIZ AI.
Take the user's plain-English scene description and rewrite it as a precise, vivid, production-ready prompt for an AI short-form video generator.
KEEP the user's core intent EXACTLY. Add visual precision: camera angle, lighting, energy, pace, platform-appropriate style.
Return ONLY the enhanced prompt text. No explanations, no preamble, no quotes.`,
        lipsync: `You are a professional video director and AI prompt engineer for WIZ AI.
Take the user's plain-English scene description and rewrite it as a precise, vivid, production-ready prompt for an AI lip-sync video generator.
KEEP the user's core intent EXACTLY. Add visual precision: character expression, lighting, background, camera angle.
Return ONLY the enhanced prompt text. No explanations, no preamble, no quotes.`,
        script: `You are a professional screenwriter and AI prompt engineer for WIZ AI.
Take the user's plain-English scene description and rewrite it as a precise, vivid, production-ready visual scene description for an AI video generator.
KEEP the user's core intent EXACTLY. Add visual precision: setting, lighting, character actions, camera movement, mood.
Return ONLY the enhanced prompt text. No explanations, no preamble, no quotes.`,
      };

      const defaultSystemPrompt = `You are WizGenesis™ — the intelligence layer of WIZ AI, a cinematic AI video creation platform.
Your job is to take a rough, casual user prompt and transform it into a structured, detailed, AI-friendly video description that will produce a stunning cinematic result.

Rules:
1. PRESERVE the user's core intent, characters, and setting — NEVER change what they asked for
2. If the user describes a crowd shot, aerial shot, or atmosphere shot with no performers — honour that EXACTLY
3. ADD cinematic detail: camera angles, lighting, colour palette, mood, atmosphere
4. ADD character detail if characters are mentioned: clothing, expression, body language, positioning
5. ADD environment detail: time of day, weather, textures, depth
6. Keep it under 400 words — concise but rich
7. Write in present tense, descriptive prose (not bullet points)
8. Do NOT add music/audio instructions — WizSound handles that separately
9. Do NOT mention AI, generation, or rendering — write as if directing a real shoot
10. Match the genre and mood if provided

Return ONLY the enhanced prompt text. No explanations, no preamble, no quotes around it.`;

      const systemPrompt = systemPromptMap[productType] ?? defaultSystemPrompt;

      const userContent = [
        charContext,
        genreContext ? `Genre/mood: ${genreContext}.` : "",
        `User's description: "${input.prompt}"`,
        `Rewrite this as a precise, production-ready AI prompt.`,
      ].filter(Boolean).join(" ");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const enhanced = (typeof rawContent === "string" ? rawContent.trim() : "") || input.prompt;
      return { enhanced };
    }),

  // Upload a visual reference asset (photo/video) for storyboard context
  uploadContextAsset: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      assetBase64: z.string(), // base64-encoded file content
      mimeType: z.string(), // e.g. "image/jpeg", "video/mp4"
      assetType: z.enum(["image", "video"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Upload to S3
      const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
      const key = `music-video-context/${ctx.user.id}-${input.jobId}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(input.assetBase64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Append to existing contextAssetUrls
      const existing: Array<{ url: string; mimeType: string; type: string }> = [];
      if (job.contextAssetUrls) {
        try { existing.push(...JSON.parse(job.contextAssetUrls)); } catch { /* ignore */ }
      }
      // Limit to 3 assets
      if (existing.length >= 3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 3 visual references allowed" });
      }
      existing.push({ url, mimeType: input.mimeType, type: input.assetType });
      await db.update(musicVideoJobs)
        .set({ contextAssetUrls: JSON.stringify(existing) })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[MusicVideo] Context asset uploaded for job ${input.jobId}: ${url}`);
      return { url, total: existing.length };
    }),

  // Remove a visual reference asset from a job
  removeContextAsset: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      assetUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const existing: Array<{ url: string; mimeType: string; type: string }> = [];
      if (job.contextAssetUrls) {
        try { existing.push(...JSON.parse(job.contextAssetUrls)); } catch { /* ignore */ }
      }
      const filtered = existing.filter(a => a.url !== input.assetUrl);
      await db.update(musicVideoJobs)
        .set({ contextAssetUrls: JSON.stringify(filtered) })
        .where(eq(musicVideoJobs.id, input.jobId));
      return { success: true, total: filtered.length };
    }),

  // Update artist type for a job
  updateArtistType: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      artistType: z.enum(["band", "solo_artist", "animated_characters", "solo_animated"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoJobs)
        .set({ artistType: input.artistType })
        .where(eq(musicVideoJobs.id, input.jobId));
            return { success: true, artistType: input.artistType };
    }),
  // Update aspect ratio for a job (called when user selects format on upload step)
  updateAspectRatio: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoJobs)
        .set({ aspectRatio: input.aspectRatio })
        .where(eq(musicVideoJobs.id, input.jobId));
      return { success: true, aspectRatio: input.aspectRatio };
    }),
  // Add a new blank scene to a job's storyboard
  analyseLyrics: protectedProcedure
    .input(z.object({
      lyrics: z.string(),
      genre: z.string().optional(),
      mood: z.string().optional(),
      style: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../../_core/llm");
      const lines = input.lyrics.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("["));
      // Group short lines together (max 2 lines per block)
      const groupedLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length < 30 && i + 1 < lines.length && lines[i + 1].length < 30) {
          groupedLines.push(`${lines[i]} / ${lines[i + 1]}`);
          i++;
        } else {
          groupedLines.push(lines[i]);
        }
      }

      const systemPrompt = `You are a music video director analysing song lyrics for visual storytelling.
For each lyric line, provide:
- emotion: one word (e.g. intense, passionate, melancholic, energetic, dreamy, powerful, tender, dark, hopeful, triumphant)
- sceneType: short description of the visual scene (e.g. "Cinematic flames", "Rain-soaked street", "Neon-lit stage")
- visualCues: array of 2-4 specific visual elements (e.g. ["sparks", "heat distortion", "slow-motion fire"])
- intensity: number 1-10 representing emotional intensity

Genre: ${input.genre || "rock"}
Mood: ${input.mood || "energetic"}
Style: ${input.style || "cinematic"}

Return a JSON array of objects matching the lyric lines provided.`;

      const userPrompt = `Analyse these lyric lines:\n${groupedLines.map((l, i) => `${i + 1}. "${l}"`).join("\n")}`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "lyric_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        line: { type: "string" },
                        emotion: { type: "string" },
                        sceneType: { type: "string" },
                        visualCues: { type: "array", items: { type: "string" } },
                        intensity: { type: "number" },
                      },
                      required: ["line", "emotion", "sceneType", "visualCues", "intensity"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["blocks"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        if (!rawContent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No response from AI" });
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const parsed = JSON.parse(content);
        // Ensure each block has the original line text
        const blocks = parsed.blocks.map((b: any, i: number) => ({
          line: b.line || groupedLines[i] || "",
          emotion: b.emotion || "neutral",
          sceneType: b.sceneType || "General",
          visualCues: Array.isArray(b.visualCues) ? b.visualCues : [],
          intensity: typeof b.intensity === "number" ? b.intensity : 5,
        }));
        return { blocks };
      } catch (err: any) {
        console.error("[analyseLyrics] Error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err?.message ?? "Failed to analyse lyrics" });
      }
    }),

  // Delete a single scene from the storyboard
  confirmDownload: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (!job.finalVideoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video is not ready for download yet." });
      }

      // Idempotent: if already downloaded, just return the URL
      if (job.downloadedAt) {
        return { success: true, finalVideoUrl: job.finalVideoUrl, alreadyDownloaded: true };
      }

      await db.update(musicVideoJobs)
        .set({
          downloadedAt: new Date(),
          qualityStatus: "approved",
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[QualityGuarantee] Job ${input.jobId} confirmed as downloaded by user ${ctx.user.id}`);

      return {
        success: true,
        finalVideoUrl: job.finalVideoUrl,
        alreadyDownloaded: false,
        message: "Video confirmed. Enjoy your music video!",
      };
    }),

  // Returns the last 30 scene action log entries for the current user (retries + cancels)
  retryJob: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed jobs can be retried" });
      }

      // Reset failed scenes to pending (completed scenes stay completed)
      const failedScenes = await db.select({ id: musicVideoScenes.id })
        .from(musicVideoScenes)
        .where(and(
          eq(musicVideoScenes.jobId, input.jobId),
          eq(musicVideoScenes.status, "failed")
        ));

      if (failedScenes.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No failed scenes to retry" });
      }

      // Reset each failed scene to pending
      for (const scene of failedScenes) {
        await db.update(musicVideoScenes)
          .set({
            status: "pending",
            taskId: null,
            errorMessage: null,
            retryCount: 0,
            updatedAt: new Date(),
          } as any)
          .where(eq(musicVideoScenes.id, scene.id));
      }

      // Reset job to rendering state
      await db.update(musicVideoJobs)
        .set({
          status: "rendering",
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      return { success: true, resetScenes: failedScenes.length };
    }),

  // ── Scene Preview: Per-scene composited clip access ────────────────────────
  // Returns all scenes for a job with their preview-ready clip URLs.
  // Used by the Scene Preview panel to show scenes as they finish compositing.
  resetRender: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Block reset if a render is actively in progress
      if (job.status === "rendering" || job.status === "assembling") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reset while a render is in progress. Please wait for it to finish or cancel it first.",
        });
      }

      // Reset all scenes: clear video outputs, lip sync, hedra results
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
          isApproved: false,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoScenes.jobId, input.jobId));

      // Reset job render state back to storyboard_ready
      await db.update(musicVideoJobs)
        .set({
          status: "storyboard_ready",
          finalVideoUrl: null,
          finalVideoKey: null,
          errorMessage: null,
          completedScenes: 0,
          qualityStatus: "pending",
          downloadedAt: null,
          probePassed: null,
          probeSceneId: null,
          probeVideoUrl: null,
          probeApprovedAt: null,
          finalVideoProduced: false,
          storyboardLockedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[MusicVideo] Screening room reset for job ${input.jobId} by user ${ctx.user.id}`);
      return { success: true };
    }),

  /**
   * resetScene — clears a single scene's render output so it can be re-rendered
   * without touching the rest of the job.
   */

  /**
   * ISS-207: resumeProviderUnavailableJob — admin-only manual resume after top-up.
   * Transitions job from provider_unavailable back to rendering so the heartbeat
   * will re-dispatch the failed_retryable scenes.
   */
  resumeProviderUnavailableJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      // Verify job exists and is in provider_unavailable state
      const jobRows = await db.select({ id: musicVideoJobs.id, status: musicVideoJobs.status, userId: musicVideoJobs.userId })
        .from(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId)).limit(1);
      const job = jobRows[0];
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      if ((job.status as string) !== 'provider_unavailable') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Job is not in provider_unavailable state (current: ${job.status})` });
      }
      // Reset job to rendering and clear providerErrorAt on all failed_retryable scenes
      // so they are eligible for immediate retry (bypass the 30-min throttle on manual resume)
      await db.update(musicVideoJobs)
        .set({ status: 'rendering' as any, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));
      await db.update(musicVideoScenes)
        .set({ providerErrorAt: null, updatedAt: new Date() } as any)
        .where(and(
          eq(musicVideoScenes.jobId, input.jobId),
          inArray(musicVideoScenes.status as any, ['failed_retryable', 'failed'] as any)
        ));
      console.log(`[Admin] Job ${input.jobId} manually resumed by admin ${ctx.user.id} after provider_unavailable`);
      return { success: true };
    }),
});
