/**
 * Music Video Autopilot tRPC Router
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { musicVideoJobs, musicVideoScenes, videoCharacterPhotos, videoCharacters } from "../../drizzle/schema";
import { withQuotaGuard, QUOTA_EXHAUSTED_MESSAGE } from "../_core/quotaError";
import { eq, and, desc, inArray } from "drizzle-orm";

import { storagePut } from "../storage";
import {
  generateStoryboard,
  calculateSceneCount,
  calculateCreditCost,
  startSceneRender,
  pollSceneStatus,
  assembleMusicVideo,
  transcribeJobAudio,
} from "../music-video-service";
import { deductCredits, getUserCredits } from "../credit-service";
import { transcribeAudio } from "../_core/voiceTranscription";
import { generateImage } from "../_core/imageGeneration";

import { validateSceneFaceConsistency, ensureReferencePhotoBase64, type CharacterLockData } from "../character-lock";
import { getUserSubscription, mapDbPlanToProductPlan, countVideosThisMonth } from "../db";
import { SUBSCRIPTION_PLANS, PLAN_COST_TARGETS } from "../products";
import { classifyScenes } from "../scene-classifier";
import { buildRoutingPlan, enforceHardStop } from "../renderer-router";

export const musicVideoRouter = router({
  // Transcribe audio directly (no job required) — called as soon as user selects a file
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
        audioBase64: z.string(), // base64 encoded audio
        audioMimeType: z.enum(["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/m4a"]),
        audioDuration: z.number().int().min(10).max(360), // 10s to 6 minutes
        themePrompt: z.string().min(10).max(2000),
        genre: z.string().max(128).optional(),
        mood: z.string().max(128).optional(),
        characterImageBase64: z.string().optional(), // base64 encoded character photo
        characterImageMimeType: z.string().optional(), // e.g. "image/jpeg"
        enableLipSync: z.boolean().optional(),
        sceneSetting: z.string().max(512).optional(), // e.g. "concert venue", "desert", "rooftop"
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

      // Upload audio to S3
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.audioMimeType.split("/")[1].replace("mpeg", "mp3");
      const audioKey = `music-video-audio/${ctx.user.id}-${Date.now()}.${ext}`;
      const { url: audioUrl } = await storagePut(audioKey, audioBuffer, input.audioMimeType);

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
      const creditCost = calculateCreditCost(sceneCount);

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
        enableLipSync: input.enableLipSync ?? false,
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
    .mutation(async ({ ctx, input }) => {
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
        if (job.transcriptionStatus === "processing") {
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise((r) => setTimeout(r, 5000));
            const [refreshed] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
            if (refreshed?.transcriptionStatus === "done") return refreshed;
          }
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
            .split(/[.!?\n🎵]+/)
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
      const { invokeLLM } = await import("../_core/llm");
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
            await db.update(videoCharacters)
              .set({ isLocked: true, lockedDescription: description.trim(), updatedAt: new Date() })
              .where(eq(videoCharacters.id, char.id));
            console.log(`[MusicVideo] Auto-locked character ${char.name} with description (${description.trim().length} chars)`);
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

      const { scenes, roster } = await withQuotaGuard(() => generateStoryboard(
        enrichedThemePrompt,
        job.genre,
        job.mood,
        job.audioDuration,
        job.title,
        lyricsSegments,
        lockedCharacters.length > 0 ? lockedCharacters : undefined,
        job.sceneSetting ?? undefined
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

      // Delete existing scenes if regenerating
      await db.delete(musicVideoScenes).where(eq(musicVideoScenes.jobId, input.jobId));

      // Insert new scenes
      // Store the CLEAN prompt (scene direction only) in the DB — this is what users see.
      // The full render prompt (with character descriptions prepended) is built on-the-fly at render time.
      for (const scene of scenes) {
        await db.insert(musicVideoScenes).values({
          jobId: input.jobId,
          sceneIndex: scene.sceneIndex,
          startTime: scene.startTime,
          duration: scene.duration,
          prompt: scene.cleanPrompt || scene.prompt,
          lyrics: scene.lyrics || null,
          visualStyle: scene.visualStyle,
          characterAssignments: scene.characterAssignments && scene.characterAssignments.length > 0
            ? JSON.stringify(scene.characterAssignments)
            : null,
          status: "pending",
        });
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

      return { scenes };
    }),

  // Update a single scene prompt (user editing storyboard)
  updateScene: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      prompt: z.string().min(10).max(1000),
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
        .set({ prompt: input.prompt, visualStyle: input.visualStyle ?? scene.visualStyle, characterAssignments: charAssignmentsJson, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, input.sceneId));

      return { success: true };
    }),

  // Start rendering all scenes (deducts credits)
  startRender: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status !== "storyboard_ready") {
        // Guard against duplicate render submissions — if already rendering, return gracefully
        if (job.status === "rendering" || job.status === "assembling") {
          console.warn(`[MusicVideo] Duplicate render request for job ${input.jobId} (status: ${job.status}). Ignoring.`);
          return { success: true, creditCost: 0, duplicate: true };
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job must have a storyboard before rendering" });
      }

      // Check credits — admins bypass credit checks for testing
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const creditBalance = await getUserCredits(ctx.user.id);
        if (creditBalance < job.creditCost) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Insufficient credits. Need ${job.creditCost}, have ${creditBalance}`,
          });
        }
        await deductCredits(ctx.user.id, job.creditCost, `Music video: ${job.title}`);
      } else {
        console.log(`[MusicVideo] Admin ${ctx.user.id} bypassing credit check (cost: ${job.creditCost})`);
      }
       // Update job statuss
      await db.update(musicVideoJobs)
        .set({ status: "rendering", completedScenes: 0, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Start rendering all scenes asynchronously
      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

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

      // Fire-and-forget: start each scene render with 3s stagger to avoid 429 rate limits
      const SCENE_STAGGER_MS = 3000;
      (async () => {
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          if (i > 0) await new Promise((r) => setTimeout(r, SCENE_STAGGER_MS));
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
          const enrichedScenePrompt = compactTags.length > 0
            ? `${compactTags.join(" ")} ${scene.prompt} Maintain exact character appearance, same person in every scene, no variation in hair, face, or clothing.`
            : scene.prompt;
          try {
            // For now, always use WaveSpeed as primary renderer (via startSceneRender)
            // The renderer parameter is still used for fallback routing if WaveSpeed fails
            const taskId = await startSceneRender(
              scene.id,
              enrichedScenePrompt,
              scene.duration,
              scene.lipSync ?? true,
              (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
              "wavespeed" as any, // Route through WaveSpeed primary renderer
              rendererType as any
            );
            await db!.update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
            console.log(`[MusicVideo] Scene ${scene.id} (${i + 1}/${scenes.length}) queued via WaveSpeed (${rendererType}): ${taskId}`);
          } catch (err: unknown) {
            const httpStatus = (err as any)?.response?.status;
            console.error(`[MusicVideo] Scene ${scene.id} start failed (HTTP ${httpStatus ?? "?"})`, err);
            await db!.update(musicVideoScenes)
              .set({ status: "failed", errorMessage: String(err), updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
          }
        }
      })();

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

      const scenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

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
        if (scene.status === "generating" && scene.taskId) {
          try {
            const result = await pollSceneStatus(scene.id, scene.taskId);
            if (result.status === "completed") completedCount++;
            if (result.status === "failed") failedCount++;
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

      // If all scenes done, trigger assembly
      if (completedCount + failedCount >= scenes.length && job.status === "rendering") {
        if (completedCount > 0) {
          // Start assembly asynchronously
          await db.update(musicVideoJobs)
            .set({ status: "assembling", updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, input.jobId));

          assembleMusicVideo(input.jobId).catch(async (err) => {
            console.error(`[MusicVideo] Assembly failed for job ${input.jobId}:`, err);
            await db!.update(musicVideoJobs)
              .set({ status: "failed", errorMessage: String(err), updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, input.jobId));
          });
        } else {
          await db.update(musicVideoJobs)
            .set({ status: "failed", errorMessage: "All scenes failed to render", updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, input.jobId));
        }
      }

      const [updatedJob] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId));

      // Re-fetch scenes to get latest statuses for per-scene progress display
      const updatedScenes = await db.select().from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId));

      return {
        status: updatedJob?.status ?? job.status,
        totalScenes: scenes.length,
        completedScenes: completedCount,
        failedScenes: failedCount,
        finalVideoUrl: updatedJob?.finalVideoUrl ?? null,
        // Per-scene status for real-time progress display
        sceneStatuses: updatedScenes.map((s) => ({
          id: s.id,
          index: s.sceneIndex,
          status: s.status, // "pending" | "generating" | "completed" | "failed"
          errorMessage: s.errorMessage ?? null,
        })),
      };
    }),

  // Get a single job with its scenes
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
  generateScenePreview: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      previousSceneImageUrl: z.string().url().optional(), // V2: chained reference from previous scene
      forceRegenerate: z.boolean().optional(), // bypass cached previewImageUrl
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
      // If already has a preview image, return it immediately (unless forceRegenerate)
      if (scene.previewImageUrl && !input.forceRegenerate) return { imageUrl: scene.previewImageUrl };
      // Clear the cached preview so a fresh image is generated
      if (input.forceRegenerate && scene.previewImageUrl) {
        await db.update(musicVideoScenes)
          .set({ previewImageUrl: null })
          .where(eq(musicVideoScenes.id, input.sceneId));
      }

      // --- Gather ALL locked characters for this job ---
      const allJobCharacters = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));

      // --- Determine which characters are assigned to THIS scene ---
      let sceneCharNames: string[] = [];
      try {
        if (scene.characterAssignments) {
          sceneCharNames = JSON.parse(scene.characterAssignments);
        }
      } catch {}

      // Build a map of character name -> character record for quick lookup
      const charByName = new Map(allJobCharacters.map(c => [c.name.toLowerCase(), c]));

      // Get the specific characters assigned to THIS scene only.
      // CRITICAL: never fall back to "all locked characters" — that caused Tim's face
      // to appear in Greg's drummer scenes. If no assignments exist, generate with no
      // face anchor (generic scene) rather than using the wrong person.
      const sceneChars = sceneCharNames.length > 0
        ? sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean) as typeof allJobCharacters
        : [];

      // Log character resolution for debugging
      console.log(`[generateScenePreview] Scene ${input.sceneId}: assigned names=[${sceneCharNames.join(", ")}] resolved=[${sceneChars.map(c => `${c.name}(id=${c.id})`).join(", ")}]`);

      // BLOCK: if no characters are assigned, refuse to generate — do NOT fall back to generic
      if (sceneChars.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please assign characters before generating this scene preview.",
        });
      }

      // --- Gather reference photos for scene-assigned characters ONLY ---
      const allPhotos = await db.select().from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.jobId, input.jobId))
        .orderBy(desc(videoCharacterPhotos.isPrimary));

      // Build a set of character IDs that appear in this scene
      const sceneCharIds = new Set(sceneChars.map(c => c.id));

      // Collect ALL reference photos for scene-assigned characters (multiple angles help AI with likeness)
      // Primary photos come first (already sorted by isPrimary desc), then additional angles/styles
      const referenceImages: Array<{ url: string; mimeType: string }> = [];
      for (const photo of allPhotos) {
        if (sceneCharIds.has(photo.characterId)) {
          referenceImages.push({ url: photo.photoUrl, mimeType: "image/jpeg" });
        }
      }
      // REMOVED: legacy job.characterImageUrl fallback — it always pointed to Tim's photo
      // and caused Tim's face to appear in Greg/Monica scenes. No fallback: if a scene
      // has no assigned character with a photo, it generates without a face anchor.
      const sceneHasLockedChar = sceneChars.some(c => c.isLocked && c.lockedDescription);

      // ─── Prompt Builder V3: 5-Block Architecture ─────────────────────────────
      // Block order (highest weight first):
      //   1. identityBlock   — face anchor, likeness enforcement
      //   2. visualBlock     — CHARACTER VISUAL DETAILS (ABSOLUTE TRUTH, OVERRIDE)
      //   3. roleBlock       — role, defaultState, constraints per character
      //   4. sceneBlock      — scene description + camera direction
      //   5. constraintBlock — global rules (people count, no text, camera)

      // ── Helper: sanitise text before injecting into image prompt ──────────────
      // Strips band name, logos, quoted text that the AI model renders literally.
      const sanitiseDescription = (desc: string): string => {
        let s = desc;
        if (job.title) {
          const escapedTitle = job.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          s = s.replace(new RegExp(`(?:rock\\s+)?band\\s+${escapedTitle}`, "gi"), "rock band");
          s = s.replace(new RegExp(`(?:of|for)\\s+${escapedTitle}`, "gi"), "");
          s = s.replace(new RegExp(`\\b${escapedTitle}\\b`, "gi"), "");
        }
        s = s.replace(/["\u201C\u201D][^"\u201C\u201D]{2,80}["\u201C\u201D]/g, "");
        s = s.replace(/\s{2,}/g, " ").trim();
        return s;
      };

      const charCount = sceneChars.length;
      const primaryCharForScene = sceneChars[0] ?? null;
      const hasPhotos = referenceImages.length > 0;

      // ── BLOCK 1: Identity Block ───────────────────────────────────────────────
      const identityLines = sceneChars
        .filter(c => c.isLocked && c.lockedDescription)
        .map((c, idx) => {
          const cleanDesc = sanitiseDescription(c.lockedDescription!);
          const baseDescription = `${c.name} (${c.role || "musician"}): ${cleanDesc}`;
          if (sceneChars.length > 1) {
            const positions = ["LEFT", "CENTER", "RIGHT"];
            return `${baseDescription} [POSITION: ${positions[idx % positions.length]}]`;
          }
          return baseDescription;
        });

      const charCountConstraint = charCount === 1
        ? `ONLY ONE PERSON in frame — ${primaryCharForScene!.name} is the ONLY person visible. ` +
          `The main subject is ${primaryCharForScene!.name}. This person must be clearly visible and is the focus of the scene. ` +
          `No additional people. No background characters. No extra musicians. No other band members visible. No silhouettes.`
        : charCount > 1
          ? `EXACTLY ${charCount} people in this image — ${sceneChars.map(c => c.name).join(", ")}. ` +
            `No more than ${charCount} people. No additional musicians. No background performers. No silhouettes. No extra band members. ` +
            `Medium shot. Clear view of faces. Not wide angle. No distant silhouettes. ` +
            `Each person must be clearly identifiable by face.`
          : "";

      const identityBlock = identityLines.length > 0
        ? (() => {
            const subjectLine = primaryCharForScene
              ? `The main subject is ${primaryCharForScene.name}. This person must be clearly visible and is the focus of the scene.`
              : "";
            const baseInstruction =
              `EXACT LIKENESS REQUIRED — generate the SAME person shown in the reference photo(s). ` +
              `${identityLines.join(" | ")}. ` +
              `Preserve exact facial features, bone structure, eye colour, hairstyle, hair length, hair colour, ` +
              `facial hair, and skin tone from the reference photos. ` +
              `Same person as reference image. Identical face. Same hairstyle. Same hair length. ` +
              `Same hair colour. Same facial hair. No variation in hair or appearance. ` +
              `This is a real person — the generated face MUST be recognisable as the same individual.`;
            if (sceneChars.length > 1) {
              return `${subjectLine} ${baseInstruction} CRITICAL: Each character MUST match their reference photo EXACTLY. ` +
                `Do NOT mix up faces between characters. ` +
                `${sceneChars.map(c => `${c.name} has UNIQUE features that MUST be preserved`).join(". ")}. ` +
                `${charCountConstraint}`;
            }
            return `${subjectLine} ${baseInstruction} ${charCountConstraint}`;
          })()
        : hasPhotos
          ? `Generate the SAME person shown in the reference photo(s). Preserve exact facial features, bone structure, and appearance. ${charCountConstraint}`
          : charCountConstraint;

      // ── BLOCK 2: Visual Block (CHARACTER VISUAL DETAILS — ABSOLUTE TRUTH) ────
      // These OVERRIDE any scene assumptions. Injected after identity, before role.
      const visualLines = sceneChars
        .filter(c => c.characterVisualDetails)
        .map(c => {
          let details: { instrument?: string; outfit?: string; props?: string; position?: string } = {};
          try { details = JSON.parse(c.characterVisualDetails!); } catch {}
          const parts: string[] = [];
          if (details.outfit) parts.push(`Outfit: ${details.outfit}`);
          if (details.instrument) parts.push(`Instrument: ${details.instrument}`);
          if (details.position) parts.push(`Position: ${details.position}`);
          if (details.props) parts.push(`Props: ${details.props}`);
          return parts.length > 0 ? `${c.name}:\n${parts.join("\n")}` : null;
        })
        .filter(Boolean);

      const visualBlock = visualLines.length > 0
        ? `CHARACTER VISUAL DETAILS (ABSOLUTE TRUTH — OVERRIDES ALL SCENE ASSUMPTIONS):\n\n` +
          `${visualLines.join("\n\n")}\n\n` +
          `RULES:\n` +
          `- These define outfit, props, and appearance\n` +
          `- MUST be followed exactly\n` +
          `- OVERRIDE any scene interpretation\n` +
          `- DO NOT invent or replace props\n` +
          `- DO NOT change outfits between scenes`
        : "";

      // ── BLOCK 3: Role Block (role, defaultState, constraints) ─────────────────
      const roleLines = sceneChars.map(c => {
        const parts: string[] = [`${c.name}:`];
        if (c.role) parts.push(`Role: ${c.role}`);
        if (c.characterDefaultState) parts.push(`Default State: ${c.characterDefaultState}`);
        if (c.characterConstraints) parts.push(`Constraints: ${c.characterConstraints}`);
        return parts.join("\n");
      });

      const roleBlock = roleLines.length > 0
        ? `CHARACTER ROLE DEFINITIONS:\n\n${roleLines.join("\n\n")}`
        : "";

      // ── Clean scene prompt (BLOCK 4 source) ──────────────────────────────────
      let cleanScenePrompt = scene.prompt;
      for (const char of allJobCharacters) {
        const namePrefix = new RegExp(
          `${char.name}(?:,\\s*(?:Rock Star|Wears a|Woman in|Man in)[^.]*?\\.\\s*)?(?:${char.name})?`,
          "gi"
        );
        cleanScenePrompt = cleanScenePrompt.replace(namePrefix, char.name);
      }
      cleanScenePrompt = cleanScenePrompt.replace(/(\b\w{4,}\b[^.]{10,}?)\1+/g, "$1").trim();
      cleanScenePrompt = cleanScenePrompt.replace(/["\u201C\u201D][^"\u201C\u201D]{2,80}["\u201C\u201D]/g, "").trim();
      cleanScenePrompt = cleanScenePrompt.replace(/\blyrics?:\s*[^.\n]*/gi, "").trim();
      if (job.title) {
        const escapedTitle = job.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        cleanScenePrompt = cleanScenePrompt.replace(new RegExp(`${escapedTitle}\\s+(?:neon\\s+)?(?:sign|logo|banner|backdrop|screen|display|text|lettering|typography|name)`, "gi"), "");
        cleanScenePrompt = cleanScenePrompt.replace(new RegExp(`\\b${escapedTitle}\\b`, "gi"), "");
        cleanScenePrompt = cleanScenePrompt.replace(/\s{2,}/g, " ").trim();
      }

      // ── Style and mood ────────────────────────────────────────────────────────
      const styleMap: Record<string, string> = {
        cinematic: "cinematic film still, dramatic lighting, shallow depth of field",
        anime: "anime illustration, vibrant colors, detailed line art",
        "pixar 3d": "Pixar 3D animation style, warm lighting, expressive characters",
        documentary: "documentary photography, natural lighting, authentic raw footage",
        abstract: "abstract art, bold colors, surreal composition",
        vintage: "vintage film aesthetic, grain, warm tones, retro 35mm",
      };
      const styleKey = (scene.visualStyle || "").toLowerCase();
      const styleDescriptor = styleMap[styleKey] || styleMap["cinematic"];
      const moodContext = [job.genre, job.mood].filter(Boolean).join(", ");

      // ── Style Lock suffix ─────────────────────────────────────────────────────
      let styleLockSuffix: string | null = null;
      if (job.lockedStyle) {
        try {
          const parsedStyle = JSON.parse(job.lockedStyle) as { rawPromptSuffix?: string; descriptor?: string };
          if (parsedStyle.rawPromptSuffix) {
            styleLockSuffix = parsedStyle.rawPromptSuffix;
            console.log(`[generateScenePreview] Scene ${input.sceneId}: STYLE LOCK active — "${parsedStyle.descriptor ?? ""}", suffix: "${styleLockSuffix}"`);
          }
        } catch {
          console.warn(`[generateScenePreview] Scene ${input.sceneId}: failed to parse lockedStyle JSON`);
        }
      }

      // ── BLOCK 5: Constraint Block (global rules, adapts to scene char count) ──
      const sceneCharNamesStr = sceneChars.map(c => c.name).join(", ");
      const peopleCountRule = charCount === 1
        ? `ONLY ONE PERSON on stage — ${primaryCharForScene?.name ?? "the character"} ONLY. NO other people. NO background musicians. NO silhouettes.`
        : charCount === 3
          ? `ONLY three people on stage. ONLY: ${sceneCharNamesStr}. NO extra musicians. NO duplicates. NO background silhouettes.`
          : `EXACTLY ${charCount} people on stage — ${sceneCharNamesStr}. NO extra musicians. NO duplicates. NO background silhouettes.`;

      const constraintBlock =
        `GLOBAL CONSTRAINTS:\n` +
        `- ${peopleCountRule}\n` +
        `- NO extra musicians\n` +
        `- NO duplicates or clones\n` +
        `- NO background silhouettes\n` +
        `- NO visible text, logos, or band names\n` +
        `- NO neon signs, banners, or typography\n` +
        `- Prefer medium or close shots — faces must be clearly visible\n` +
        `- NO wide crowd shots unless explicitly stated`;

      // ── BLOCK 4: Scene Block ──────────────────────────────────────────────────
      const sceneBlock =
        `SCENE DESCRIPTION:\n${cleanScenePrompt}\n\n` +
        `CHARACTERS IN SCENE: ${sceneCharNamesStr}\n\n` +
        `CAMERA: medium close-up, faces clearly visible, waist-up framing`;

      // ── Identity Anchor ───────────────────────────────────────────────────────
      const masterPortraitUrl = primaryCharForScene?.masterPortraitUrl ?? null;
      const masterSeed = primaryCharForScene?.masterSeed ?? null;
      const lockedCharacterPrompt = primaryCharForScene?.characterPrompt ?? null;
      console.log(`[generateScenePreview] Scene ${input.sceneId}: PRIMARY CHARACTER = ${primaryCharForScene?.name ?? "none"} (id=${primaryCharForScene?.id ?? "none"}), masterPortrait=${!!masterPortraitUrl}, masterPortraitUrl=${masterPortraitUrl ?? "null"}, seed=${masterSeed ?? "null"}`);

      // ── Photo Mode Pipeline V2: Strict Prompt Split ────────────────────────
      const characterBlock = lockedCharacterPrompt
        ? `${lockedCharacterPrompt}. ` +
          `Same person as reference image. Identical face. Same hairstyle. Same hair length. ` +
          `Same hair colour. Same facial hair. No variation in hair or appearance.`
        : identityBlock
          ? `${identityBlock}. ` +
            `Same person as reference image. Identical face. Same hairstyle. Same hair length. ` +
            `Same hair colour. Same facial hair. No variation in hair or appearance.`
          : null;

      const sceneOnlyPrompt = cleanScenePrompt;

      // ── NEGATIVE PROMPT ───────────────────────────────────────────────────────
      const extraPeopleNegative = charCount === 1
        ? "extra person, additional people, background musician, background character, other band member, crowd member, second person, third person, multiple people"
        : `extra person, anonymous musician, unnamed character, crowd member, fourth person, fifth person, additional guitarist, background band members, silhouette, extra band member, ${charCount + 1} people, ${charCount + 2} people, wrong outfit, outfit swap, different clothing, background performers, crowd performers, duplicates, clones, multiple guitarists, extra band members`;
      const negativePromptV2 = [
        "different face", "new person", "altered identity", "different person", "inconsistent character",
        "different hairstyle", "shorter hair", "longer hair", "different hair colour", "different hair color",
        "variation in appearance", "different facial hair",
        extraPeopleNegative,
        "nsfw", "lowres", "bad anatomy", "extra limbs", "blurry", "low quality", "cartoon", "anime",
        "deformed", "ugly", "disfigured",
        "text", "words", "caption", "subtitle", "lyrics text", "text overlay", "words in frame",
        "logo", "signage", "typography", "neon sign", "banner", "watermark",
        "band name", "venue name", "stage backdrop text",
        "wrong outfit", "outfit swap", "different clothing",
        "leather jacket on drummer", "t-shirt on singer",
        ...(charCount > 1 ? [
          "extra people", "fourth person", "fifth person", "additional guitarist",
          "crowd", "background band members", "silhouette", "distant figures",
          "wide angle", "aerial shot", "bird's eye view",
        ] : []),
      ].join(", ");

      // ── Hard people-count prefix (FIRST in prompt for maximum model weight) ──
      const hardCountPrefix = charCount > 1
        ? `CRITICAL SCENE RULE: ONLY ${charCount} people on stage. ` +
          `The ONLY people in this image are: ${sceneCharNamesStr}. ` +
          `NO additional musicians. NO background band members. NO extra performers. ` +
          `NO silhouettes. NO crowd on stage. EXACTLY ${charCount} people — not ${charCount + 1}, not ${charCount + 2}.`
        : charCount === 1
          ? `CRITICAL SCENE RULE: ONLY ONE PERSON in this image — ${primaryCharForScene?.name ?? "the character"}. ` +
            `NO other people. NO background musicians. NO silhouettes.`
          : "";

      // ── V3 Final Prompt Assembly: 5 blocks ───────────────────────────────────
      // Order: hardCount → identity → visual (OVERRIDE) → role → scene → constraints → style
      const finalImagePrompt = [
        hardCountPrefix,
        characterBlock,
        visualBlock,
        roleBlock,
        sceneBlock,
        constraintBlock,
        styleDescriptor,
        styleLockSuffix ? `STYLE LOCK: ${styleLockSuffix}` : "",
        moodContext ? `Mood: ${moodContext}` : "",
        "16:9 widescreen, high quality, professional photography",
      ].filter(Boolean).join("\n\n");
      console.log(`[generateScenePreview] Scene ${input.sceneId}: ${referenceImages.length} ref photos, masterPortrait=${!!masterPortraitUrl}, seed=${masterSeed}, prompt length: ${finalImagePrompt.length}`);

      // V2: Choose face reference: master portrait > primary reference photo > none
      const faceReferenceUrl = masterPortraitUrl ?? (referenceImages.length > 0 ? referenceImages[0].url : null);
      const hasFaceReference = !!faceReferenceUrl && identityLines.length > 0;

      // V2 Step 6: Chained Reference
      // If a previous scene image was passed, fetch it as base64 to use as a secondary
      // reference alongside the master portrait. This reinforces identity across scenes.
      let previousSceneBase64: string | null = null;
      if (input.previousSceneImageUrl) {
        try {
          const prevResp = await fetch(input.previousSceneImageUrl);
          if (prevResp.ok) {
            const prevBuf = Buffer.from(await prevResp.arrayBuffer());
            previousSceneBase64 = `data:image/jpeg;base64,${prevBuf.toString("base64")}`;
          }
        } catch (prevErr) {
          console.warn(`[generateScenePreview] Could not fetch previous scene for chained reference:`, prevErr);
        }
      }

      try {
        let url: string | undefined;

        if (hasFaceReference) {
          // --- Photo Mode Pipeline V2: Identity-Anchored Generation ---
          // InstantID (primary) or Flux PuLID (fallback). 3 variations, pick best.
          const primaryCharName = primaryCharForScene?.name ?? "the character";
          // Use the V2 negative prompt (forbids face drift + hair variation + extra people)
          const negativePrompt = negativePromptV2;

          // Fetch the face reference as base64 for InstantID
          let faceBase64: string | null = null;
          try {
            const refResp = await fetch(faceReferenceUrl!);
            if (refResp.ok) {
              const refBuf = Buffer.from(await refResp.arrayBuffer());
              const refMime = faceReferenceUrl!.match(/\.png(\?|$)/i) ? "image/png" :
                              faceReferenceUrl!.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
              faceBase64 = `data:${refMime};base64,${refBuf.toString("base64")}`;
            }
          } catch (fetchErr) {
            console.warn(`[generateScenePreview] Could not fetch face reference for scene ${input.sceneId}:`, fetchErr);
          }

          // Photo Mode V2: Use Forge API with reference photo for face-anchored generation
          // (fal.ai / InstantID / Flux PuLID are unreachable from this server environment)
          console.log(`[generateScenePreview] Using Forge API for ${primaryCharName} (scene ${input.sceneId}, masterPortrait=${!!masterPortraitUrl})`);
          // Build reference images list: master portrait first (highest priority), then original photo
          const forgeRefs: Array<{ url: string; mimeType: string }> = [];
          if (masterPortraitUrl) {
            const masterMime = masterPortraitUrl.match(/\.png(\?|$)/i) ? "image/png" :
                               masterPortraitUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
            forgeRefs.push({ url: masterPortraitUrl, mimeType: masterMime });
          } else if (faceReferenceUrl) {
            const refMime = faceReferenceUrl.match(/\.png(\?|$)/i) ? "image/png" :
                            faceReferenceUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
            forgeRefs.push({ url: faceReferenceUrl, mimeType: refMime });
          }
          // V2 Step 6: Chained Reference — also include previous scene as secondary anchor
          if (input.previousSceneImageUrl && forgeRefs.length < 2) {
            const prevMime = input.previousSceneImageUrl.match(/\.png(\?|$)/i) ? "image/png" :
                             input.previousSceneImageUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
            forgeRefs.push({ url: input.previousSceneImageUrl, mimeType: prevMime });
          }
          const { url: forgeUrl } = await withQuotaGuard(() => generateImage({
            prompt: finalImagePrompt,
            originalImages: forgeRefs.length > 0 ? forgeRefs : undefined,
          }));
          url = forgeUrl;
          console.log(`[generateScenePreview] Forge success for scene ${input.sceneId}: ${url}`);
        } else {
          // For scenes without character photos (AI-invented characters), use generic image generation
          const { url: genericUrl } = await withQuotaGuard(() => generateImage({
            prompt: finalImagePrompt,
            originalImages: referenceImages.length > 0 ? referenceImages : undefined,
          }));
          url = genericUrl;
        }

        if (url) {
          await db.update(musicVideoScenes)
            .set({ previewImageUrl: url })
            .where(eq(musicVideoScenes.id, input.sceneId));

          // ─── Character Lock: validate face consistency ────────────────────
          if (job.characterLockEnabled !== false) {
            try {
              const lockCharacters: CharacterLockData[] = [];
              for (const char of sceneChars) {
                if (!char.isLocked || !char.lockedDescription) continue;
                const primaryPhoto = allPhotos.find(p => p.characterId === char.id);
                if (!primaryPhoto) continue;
                const refBase64 = await ensureReferencePhotoBase64(char.id, primaryPhoto.photoUrl);
                if (!refBase64) continue;
                lockCharacters.push({
                  characterId: char.id,
                  name: char.name,
                  referencePhotoBase64: refBase64,
                  lockedDescription: char.lockedDescription!,
                  faceValidationThreshold: char.faceValidationThreshold ?? 70,
                });
              }
              if (lockCharacters.length > 0) {
                const validationStatus = await validateSceneFaceConsistency(
                  input.sceneId,
                  url,
                  lockCharacters
                );
                console.log(`[generateScenePreview] Scene ${input.sceneId} face validation: ${validationStatus}`);
              }
            } catch (validationErr) {
              console.warn(`[generateScenePreview] Face validation error for scene ${input.sceneId}:`, validationErr);
            }
          }
        }
        return { imageUrl: url ?? null };
      } catch (err) {
        // Quota errors are re-thrown so the frontend can show a friendly message
        if (err instanceof TRPCError && err.code === "TOO_MANY_REQUESTS") throw err;
        console.error("[generateScenePreview] Image generation failed for scene", input.sceneId, err);
        return { imageUrl: null };
      }
    }),

  // Update lip sync setting for a single scene
  updateSceneLipSync: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      lipSync: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoScenes)
        .set({ lipSync: input.lipSync })
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      return { success: true, sceneId: input.sceneId, lipSync: input.lipSync };
    }),

  // Update lip sync for ALL scenes in a job (global override)
  updateAllScenesLipSync: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      lipSync: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoScenes)
        .set({ lipSync: input.lipSync })
        .where(eq(musicVideoScenes.jobId, input.jobId));
      return { success: true, jobId: input.jobId, lipSync: input.lipSync };
    }),

  // Update lip sync STYLE for a single scene
  updateSceneLipSyncStyle: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      lipSyncStyle: z.enum(["natural", "expressive", "subtle", "dramatic", "anime"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoScenes)
        .set({ lipSyncStyle: input.lipSyncStyle })
        .where(and(eq(musicVideoScenes.id, input.sceneId), eq(musicVideoScenes.jobId, input.jobId)));
      return { success: true, sceneId: input.sceneId, lipSyncStyle: input.lipSyncStyle };
    }),

  // Regenerate a single scene video (independent, does not affect other scenes)
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
        .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, errorMessage: null })
        .where(eq(musicVideoScenes.id, input.sceneId));

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
      try {
        const taskId = await startSceneRender(input.sceneId, enrichedPrompt, scene.duration);
        if (taskId) {
          await db.update(musicVideoScenes)
            .set({ status: "generating", taskId })
            .where(eq(musicVideoScenes.id, input.sceneId));
        }
        return { success: true, sceneId: input.sceneId, status: "generating" };
      } catch (err) {
        console.error("[regenerateScene] Failed to start scene render:", err);
        await db.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: String(err) })
          .where(eq(musicVideoScenes.id, input.sceneId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start scene regeneration" });
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

      // Ensure job is back in rendering state so polling continues
      if (job.status === "failed") {
        await db.update(musicVideoJobs)
          .set({ status: "rendering", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
      }

      // Re-queue the render asynchronously
      (async () => {
        try {
          const taskId = await startSceneRender(input.sceneId, scene.prompt, scene.duration);
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

      // Reset all failed scenes to pending
      await db.update(musicVideoScenes)
        .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, errorMessage: null, updatedAt: new Date() })
        .where(and(eq(musicVideoScenes.jobId, input.jobId), eq(musicVideoScenes.status, "failed")));

      // Ensure job is back in rendering state
      await db.update(musicVideoJobs)
        .set({ status: "rendering", updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Re-queue each failed scene with 3s stagger
      const STAGGER_MS = 3000;
      (async () => {
        for (let i = 0; i < failedScenes.length; i++) {
          const scene = failedScenes[i];
          if (i > 0) await new Promise((r) => setTimeout(r, STAGGER_MS));
          try {
            const taskId = await startSceneRender(scene.id, scene.prompt, scene.duration, scene.lipSync ?? true, (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime");
            await db!.update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
            console.log(`[MusicVideo] ${new Date().toISOString()} Bulk retry scene ${scene.id} (${i + 1}/${failedScenes.length}) → taskId ${taskId}`);
          } catch (err) {
            console.error(`[MusicVideo] ${new Date().toISOString()} Bulk retry failed for scene ${scene.id}:`, err);
            await db!.update(musicVideoScenes)
              .set({ status: "failed", errorMessage: String(err), updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
          }
        }
      })();

      return { success: true, retriedCount: failedScenes.length };
    }),

  // Update the visual prompt (and optionally lyrics) for a scene before retrying
  updateScenePrompt: protectedProcedure
    .input(z.object({
      sceneId: z.number().int(),
      jobId: z.number().int(),
      prompt: z.string().min(1).max(2000),
      lyrics: z.string().max(1000).optional(),
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

      console.log(`[MusicVideo] ${new Date().toISOString()} Scene ${input.sceneId} prompt updated by user ${ctx.user.id}`);
      return { success: true, sceneId: input.sceneId, prompt: input.prompt.trim() };
    }),

  // Cinematic Upgrade: re-render selected completed scenes with premium (Kling) quality
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
      const { VIDEO_CREDIT_COSTS } = await import("../../shared/const");
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
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const jobs = await db.select().from(musicVideoJobs)
      .where(eq(musicVideoJobs.userId, ctx.user.id))
      .orderBy(desc(musicVideoJobs.createdAt));

    // Attach scene stats to each job
    const jobsWithStats = await Promise.all(jobs.map(async (job) => {
      const scenes = await db.select({
        id: musicVideoScenes.id,
        status: musicVideoScenes.status,
        errorMessage: musicVideoScenes.errorMessage,
      }).from(musicVideoScenes).where(eq(musicVideoScenes.jobId, job.id));

      const totalScenes = scenes.length;
      const completedScenes = scenes.filter((s) => s.status === "completed").length;
      const failedScenes = scenes.filter((s) => s.status === "failed").length;
      const renderingScenes = scenes.filter((s) => s.status === "generating").length;

      return { ...job, totalScenes, completedScenes, failedScenes, renderingScenes };
    }));

    return jobsWithStats;
  }),

  // Get full job details including all scenes with status and error logs
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
  reanalyseCharacterPhoto: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      jobId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [char] = await db.select().from(videoCharacters)
        .where(and(
          eq(videoCharacters.id, input.characterId),
          eq(videoCharacters.jobId, input.jobId),
          eq(videoCharacters.userId, ctx.user.id)
        ));
      if (!char) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });

      // Fetch primary photo
      const photos = await db.select().from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.characterId, input.characterId))
        .orderBy(desc(videoCharacterPhotos.isPrimary));
      const primaryPhoto = photos.find(p => p.isPrimary) ?? photos[0];
      if (!primaryPhoto?.photoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No reference photo found for this character. Please upload a photo first." });
      }

      const { invokeLLM } = await import("../_core/llm");
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
              { type: "text" as const, text: `Analyse this photo and write a precise 80-120 word character appearance brief for ${char.name}. Include: ${char.role ? `Role: ${char.role}. ` : ""}Be forensically specific about hair colour/texture/style, exact skin tone, eye colour and shape, face structure, build, clothing, and any distinctive features.` },
            ],
          },
        ],
      });

      const description = analysisResponse.choices[0]?.message?.content;
      if (!description || typeof description !== "string" || description.trim().length < 20) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate description from photo. Please try again." });
      }

      const trimmedDescription = description.trim();
      await db.update(videoCharacters)
        .set({ isLocked: true, lockedDescription: trimmedDescription, updatedAt: new Date() })
        .where(eq(videoCharacters.id, input.characterId));

      console.log(`[reanalyseCharacterPhoto] Updated ${char.name} description (${trimmedDescription.length} chars)`);
      return { success: true, description: trimmedDescription };
    }),

  // Generate a test AI preview image for a locked character so the user can confirm likeness
  // before the full storyboard is generated. Uses Flux PuLID if photos are available.
  previewCharacter: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      jobId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [char] = await db.select().from(videoCharacters)
        .where(and(
          eq(videoCharacters.id, input.characterId),
          eq(videoCharacters.jobId, input.jobId),
          eq(videoCharacters.userId, ctx.user.id)
        ));
      if (!char) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });

      const description = char.lockedDescription?.trim() ?? "";
      const characterLabel = `${char.name}${char.role ? `, ${char.role}` : ""}`;

      // Build a neutral portrait prompt for the preview — always head-and-shoulders, face clearly visible
      const previewPrompt = description.length > 20
        ? `Close-up portrait photo of ${characterLabel}, head and shoulders, face clearly visible, looking directly at camera. ${description}. Neutral expression, soft studio lighting, photorealistic, high detail, 8K.`
        : `Close-up portrait photo of ${characterLabel}, head and shoulders, face clearly visible, looking directly at camera, neutral expression, soft studio lighting, photorealistic, high detail, 8K.`;

      // Fetch all photos for Flux PuLID
      const photos = await db.select().from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.characterId, input.characterId))
        .orderBy(desc(videoCharacterPhotos.isPrimary));

      let imageUrl: string;
      if (photos.length > 0) {
        // Use InstantID for near-exact face matching from uploaded reference photo.
        // InstantID accepts base64 data URIs directly as face_image_url.
        const primaryPhoto = photos.find(p => p.isPrimary) ?? photos[0];
        try {
          // Fetch the photo from our storage proxy (accessible from server)
          const photoResponse = await fetch(primaryPhoto.photoUrl);
          if (!photoResponse.ok) throw new Error(`Failed to fetch reference photo: ${photoResponse.status} ${photoResponse.statusText}`);
          const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
          const mimeType = primaryPhoto.photoUrl.match(/\.png(\?|$)/i) ? "image/png" :
                           primaryPhoto.photoUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
          // Convert to base64 data URL — InstantID accepts data: URIs as face_image_url
          const base64DataUrl = `data:${mimeType};base64,${photoBuffer.toString("base64")}`;

          // Use Forge API with reference photo for face-consistent portrait generation
          // (fal.ai / InstantID / Flux PuLID are unreachable from this server environment)
          console.log(`[previewCharacter] Using Forge API for ${char.name} (${Math.round(photoBuffer.length / 1024)}KB, ${mimeType})`);
          try {
            const forgeResult = await generateImage({
              prompt: previewPrompt,
              originalImages: [{ url: photos[0].photoUrl, mimeType }],
            });
            imageUrl = forgeResult.url ?? "";
            console.log(`[previewCharacter] Forge success for ${char.name}: ${imageUrl}`);
          } catch (forgeErr) {
            console.warn(`[previewCharacter] Forge failed for ${char.name}:`, forgeErr instanceof Error ? forgeErr.message : forgeErr);
            const fallback = await generateImage({ prompt: previewPrompt });
            imageUrl = fallback.url ?? "";
          }
        } catch (outerErr) {
          console.warn(`[previewCharacter] Photo fetch failed for ${char.name}:`, outerErr instanceof Error ? outerErr.message : outerErr);
          const fallback = await generateImage({ prompt: previewPrompt });
          imageUrl = fallback.url ?? "";
        }
      } else {
        // No photos — use generic image generation (AI-described character)
        const result = await generateImage({ prompt: previewPrompt });
        imageUrl = result.url ?? "";
      }

      // Store preview URL in DB (reset approval status)
      await db.update(videoCharacters)
        .set({ previewImageUrl: imageUrl, previewApproved: false, updatedAt: new Date() })
        .where(eq(videoCharacters.id, input.characterId));

      console.log(`[previewCharacter] Generated preview for ${char.name}: ${imageUrl}`);
      return { imageUrl, characterId: input.characterId, characterName: char.name };
    }),

  // Mark a character's preview image as approved by the user
  approveCharacterPreview: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      jobId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [char] = await db.select().from(videoCharacters)
        .where(and(
          eq(videoCharacters.id, input.characterId),
          eq(videoCharacters.jobId, input.jobId),
          eq(videoCharacters.userId, ctx.user.id)
        ));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(videoCharacters)
        .set({ previewApproved: true, updatedAt: new Date() })
        .where(eq(videoCharacters.id, input.characterId));

      return { success: true };
    }),

  // Fetch all characters for a job with their preview images and approval status
  getCharactersForJob: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify job ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const chars = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)))
        .orderBy(videoCharacters.slotIndex);

      // Attach photo count per character
      const charsWithPhotos = await Promise.all(chars.map(async (c) => {
        const photos = await db.select().from(videoCharacterPhotos)
          .where(eq(videoCharacterPhotos.characterId, c.id));
        return {
          ...c,
          photoCount: photos.length,
          primaryPhotoUrl: photos.find(p => p.isPrimary)?.photoUrl ?? photos[0]?.photoUrl ?? null,
        };
      }));

      return { characters: charsWithPhotos };
    }),

  // Generate a character visual brief + preview image from a plain-English description.
  // Supports both realistic and animated styles.
  // Does NOT require a saved job — can be called before job creation for instant preview.
  generateCharacterFromDescription: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      role: z.string().max(100).optional(),
      description: z.string().min(5).max(500),
      style: z.enum(["realistic", "pixar3d", "anime", "cartoon"]).default("realistic"),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");

      const styleGuide: Record<string, string> = {
        realistic: "photorealistic, real human, cinematic photography style, natural skin texture",
        pixar3d: "Pixar 3D animation style, vibrant colours, expressive face, smooth 3D render, Disney-Pixar aesthetic",
        anime: "Japanese anime style, cel-shaded, large expressive eyes, clean line art, vibrant colours",
        cartoon: "cartoon illustration style, bold outlines, flat colours, exaggerated proportions, fun and expressive",
      };

      const styleLabel = { realistic: "Realistic", pixar3d: "Pixar 3D", anime: "Anime", cartoon: "Cartoon" }[input.style];

      // Step 1: LLM expands the short description into a full visual brief
      const briefResponse = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: `You are a character designer writing precise visual briefs for AI video generation.
Expand the user's short character description into a detailed 80-120 word visual brief.
Style: ${styleLabel} (${styleGuide[input.style]}).
Rules:
- Be hyper-specific: exact colours, clothing details, hair style, body type, age, expression.
- For animated styles: describe the character AS IF they are that animation style (e.g. "Pixar-style character with large expressive eyes...").
- For realistic: describe as a real person with precise physical details.
- Output: A single dense paragraph. No bullet points. No preamble.`,
          },
          {
            role: "user" as const,
            content: `Character name: ${input.name}${input.role ? `. Role: ${input.role}` : ""}.
User description: "${input.description}"
Write the full visual brief now.`,
          },
        ],
      });

      const visualBrief = (briefResponse.choices[0]?.message?.content as string | undefined)?.trim() ?? input.description;

      // Step 2: Generate preview image — always portrait/head-and-shoulders so face is clearly visible
      const imagePrompt = input.style === "realistic"
        ? `Close-up portrait photo of ${input.name}${input.role ? `, ${input.role}` : ""}, head and shoulders, face clearly visible, looking directly at camera. ${visualBrief}. Neutral expression, soft studio lighting, photorealistic, high detail, 8K.`
        : `${styleLabel} style character portrait of ${input.name}${input.role ? `, ${input.role}` : ""}, head and shoulders, face clearly visible, looking directly at camera. ${visualBrief}. ${styleGuide[input.style]}. Centred composition, clean background, high quality render.`;

      const negativePrompt = input.style === "realistic"
        ? "distorted face, extra limbs, blurry, low quality, cartoon, anime, illustration, watermark, full body shot, wide shot, no face"
        : "photorealistic, photograph, ugly, distorted, low quality, watermark, full body shot, wide shot, no face";

      let imageUrl: string;
      try {
        const result = await generateImage({ prompt: imagePrompt });
        imageUrl = result.url ?? "";
      } catch (err) {
        console.warn("[generateCharacterFromDescription] Image generation failed:", err);
        imageUrl = "";
      }

      return {
        visualBrief,
        imageUrl,
        style: input.style,
      };
    }),

  // ─── Style Lock ───────────────────────────────────────────────────────────
  // Lock the visual style of a liked scene preview image so all subsequent
  // scene generations inherit the same lighting, colour palette, camera angle,
  // and mood.

  lockStyle: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneId: z.number().int(),
      imageUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Use vision LLM to extract a structured style descriptor from the liked image
      let styleData: {
        descriptor: string;
        lighting: string;
        colourPalette: string;
        cameraAngle: string;
        mood: string;
        rawPromptSuffix: string;
      };

      try {
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a cinematography expert. Analyse the provided image and extract its visual style as a structured JSON object. Be concise and specific — your output will be injected directly into image generation prompts to ensure visual consistency across multiple scenes.",
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url" as const,
                  image_url: { url: input.imageUrl, detail: "high" as const },
                },
                {
                  type: "text" as const,
                  text: `Analyse this image and return a JSON object with these exact fields:
- descriptor: a single sentence summarising the overall visual style (max 20 words)
- lighting: describe the lighting setup (e.g. "dramatic side-lighting with deep shadows", "soft diffused blue-tinted stage lighting")
- colourPalette: describe the dominant colours (e.g. "deep crimson and black with cyan laser accents")
- cameraAngle: describe the camera framing (e.g. "medium close-up, slightly low angle", "wide establishing shot")
- mood: the emotional atmosphere (e.g. "intense and confrontational", "ethereal and melancholic")
- rawPromptSuffix: a concise prompt suffix (max 30 words) that can be appended to any image generation prompt to reproduce this style. Do NOT include character descriptions, only cinematography/lighting/colour/mood terms.

Return ONLY valid JSON, no markdown.`,
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "style_descriptor",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  descriptor: { type: "string" },
                  lighting: { type: "string" },
                  colourPalette: { type: "string" },
                  cameraAngle: { type: "string" },
                  mood: { type: "string" },
                  rawPromptSuffix: { type: "string" },
                },
                required: ["descriptor", "lighting", "colourPalette", "cameraAngle", "mood", "rawPromptSuffix"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = llmResponse?.choices?.[0]?.message?.content ?? "{}";
        styleData = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (err) {
        console.error("[lockStyle] LLM style extraction failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Style extraction failed. Please try again." });
      }

      // Persist the locked style to the job record
      await db.update(musicVideoJobs)
        .set({
          lockedStyle: JSON.stringify(styleData),
          likedSceneId: input.sceneId,
          likedSceneImageUrl: input.imageUrl,
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[lockStyle] Job ${input.jobId}: style locked from scene ${input.sceneId} — "${styleData.descriptor}"`);
      return { success: true, style: styleData };
    }),

  unlockStyle: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(musicVideoJobs)
        .set({ lockedStyle: null, likedSceneId: null, likedSceneImageUrl: null })
        .where(eq(musicVideoJobs.id, input.jobId));
      console.log(`[unlockStyle] Job ${input.jobId}: style lock cleared`);
      return { success: true };
    }),

  getLockedStyle: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select({
        lockedStyle: musicVideoJobs.lockedStyle,
        likedSceneId: musicVideoJobs.likedSceneId,
        likedSceneImageUrl: musicVideoJobs.likedSceneImageUrl,
      }).from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const style = job.lockedStyle ? JSON.parse(job.lockedStyle) : null;
      return {
        isLocked: !!style,
        style,
        likedSceneId: job.likedSceneId ?? null,
        likedSceneImageUrl: job.likedSceneImageUrl ?? null,
      };
    }),

  // Update character visual details (instrument, outfit, position, props, constraints, defaultState)
  updateCharacterVisualDetails: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      jobId: z.number().int(),
      visualDetails: z.object({
        instrument: z.string().optional(),
        outfit: z.string().optional(),
        position: z.string().optional(),
        props: z.string().optional(),
      }).optional(),
      characterConstraints: z.string().optional(),
      characterDefaultState: z.string().optional(),
      rolePriority: z.enum(["primary", "secondary"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.jobId, input.jobId)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      const updateFields: Partial<typeof videoCharacters.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.visualDetails !== undefined) {
        updateFields.characterVisualDetails = JSON.stringify(input.visualDetails);
      }
      if (input.characterConstraints !== undefined) {
        updateFields.characterConstraints = input.characterConstraints;
      }
      if (input.characterDefaultState !== undefined) {
        updateFields.characterDefaultState = input.characterDefaultState;
      }
      if (input.rolePriority !== undefined) {
        updateFields.rolePriority = input.rolePriority;
      }

      await db.update(videoCharacters)
        .set(updateFields)
        .where(eq(videoCharacters.id, input.characterId));

      console.log(`[updateCharacterVisualDetails] Character ${input.characterId} (${char.name}) updated visual details`);
      return { success: true, characterId: input.characterId };
    }),

});
