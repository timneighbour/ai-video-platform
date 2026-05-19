/**
 * Music Video Autopilot tRPC Router
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { musicVideoJobs, musicVideoScenes, videoCharacterPhotos, videoCharacters, renderJobs, kidsVideoJobs, wizShortsJobs, characterScenes, providerJobLogs, sceneActionLogs } from "../../drizzle/schema";
import { withQuotaGuard, QUOTA_EXHAUSTED_MESSAGE } from "../_core/quotaError";
import { eq, and, desc, inArray, gte, sql } from "drizzle-orm";

import { storagePut } from "../storage";
import {
  generateStoryboard,
  calculateSceneCount,
  calculateCreditCost,
  startSceneRender,
  pollSceneStatus,
  assembleMusicVideo,
  transcribeJobAudio,
  mapModelAssignmentToWaveSpeed,
  pollPerSceneLipSyncJobs,
} from "../music-video-service";
import { deductCredits, getUserCredits, refundCredits } from "../credit-service";
import { transcribeAudio } from "../_core/voiceTranscription";
import { generateImage } from "../_core/imageGeneration";
import { generateFaceConsistentImage } from "../_core/fluxPuLID";

import { validateSceneFaceConsistency, validateFaceConsistency, ensureReferencePhotoBase64, type CharacterLockData } from "../character-lock";
import { getUserSubscription, mapDbPlanToProductPlan, countVideosThisMonth } from "../db";
import { SUBSCRIPTION_PLANS, PLAN_COST_TARGETS, PLAN_SCENE_LIMITS, getPlanMaxScenesPerVideo } from "../products";
import { classifyScenes } from "../scene-classifier";
import { buildRoutingPlan, enforceHardStop } from "../renderer-router";
import { isAnyProviderAvailable, checkAllProviders, getBestProvider, recordProviderOutcome, checkJobSpendLimit, updateJobSpend, PROVIDER_COST_PER_SCENE_USD } from "../provider-health";
import { classifyFailure, isRetryableFailure, resetSceneAttempts } from "../spend-protection";
import {
  analyseAudioInstruments,
  assignInstrumentsToCharacters,
  buildPerformancePromptBlock,
  type InstrumentAnalysis,
  type CharacterInstrumentAssignment,
} from "../instrument-analysis";
import { getCharacterDefaults } from "../../shared/characterDefaults";

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
            // Second pass: extract structured visual lock fields (hair + instrument) from the same photo
            let structuredVisualDetails: Record<string, string> = {};
            try {
              const { invokeLLM: invokeLLM2 } = await import("../_core/llm");
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
        job.enableLipSync ?? false
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
        // Smart lip sync assignment — WizSync™ Vocal-Aware Orchestration:
        // Only enable lip sync when ALL THREE conditions are met:
        //   1. Close-up character scene (seedance-2.0 model) — face must be visible
        //   2. Character is assigned to this scene — someone to sync
        //   3. Scene time window overlaps with actual vocals in the transcription
        //      (prevents lip sync on instrumental intros, bridges, and outros)
        const sceneEnd = (scene.startTime ?? 0) + (scene.duration ?? 6);
        const sceneHasVocals = lyricsSegments && lyricsSegments.length > 0
          ? lyricsSegments.some(seg =>
              seg.text && seg.text.trim().length > 0 &&
              seg.start < sceneEnd &&
              seg.end > (scene.startTime ?? 0)
            )
          : true; // if no transcription available, default to enabled (safe fallback)
        const smartLipSync = scene.modelAssignment === "seedance-2.0" && assignedNames.length > 0 && sceneHasVocals;
        if (!sceneHasVocals && scene.modelAssignment === "seedance-2.0") {
          console.log(`[MusicVideo] Scene ${scene.sceneIndex} (${scene.startTime}s–${sceneEnd}s): no vocals detected — lip sync DISABLED (instrumental window)`);
        }
        // Classify scene as 'performance' if it's a close-up character scene with lip sync enabled.
        // Performance Mode scenes will use Hedra Avatar for phoneme-accurate lip sync.
        // Cinematic Mode scenes use WaveSpeed only (no lip sync required).
        const isPerformanceScene = smartLipSync && scene.modelAssignment === "seedance-2.0" && assignedNames.length > 0;
        const detectedSceneType: "cinematic" | "performance" = isPerformanceScene ? "performance" : "cinematic";
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

      return { scenes };
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
  startRender: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
      includeCaptions: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status !== "storyboard_ready" && job.status !== "failed") {
        // Guard against duplicate render submissions — if already rendering, return gracefully
        if (job.status === "rendering" || job.status === "assembling") {
          console.warn(`[MusicVideo] Duplicate render request for job ${input.jobId} (status: ${job.status}). Ignoring.`);
          return { success: true, creditCost: 0, duplicate: true };
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job must have a storyboard before rendering" });
      }
      // If job previously failed, reset it to storyboard_ready so it can be re-rendered
      if (job.status === "failed") {
        console.log(`[MusicVideo] Job ${input.jobId} was failed — resetting to storyboard_ready for retry render.`);
        await db.update(musicVideoJobs)
          .set({ status: "storyboard_ready", errorMessage: null, completedScenes: 0, updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, input.jobId));
        // Reset all failed/generating scenes back to pending so they re-render
        await db.update(musicVideoScenes)
          .set({ status: "pending", errorMessage: null, videoUrl: null, taskId: null, updatedAt: new Date() })
          .where(and(eq(musicVideoScenes.jobId, input.jobId), inArray(musicVideoScenes.status, ["failed", "generating"])));
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
            .set({ instrumentAnalysis: JSON.stringify(instrumentAnalysis), updatedAt: new Date() } as any)
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
              (input.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1", // Export format
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
                    (input.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
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
                  const { runHedraLipSyncForScene } = await import("../ai-apis/hedra-lipsync");
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
        // Per-scene status for real-time progress display
        sceneStatuses: updatedScenes.map((s) => ({
          id: s.id,
          index: s.sceneIndex,
          status: s.status, // "pending" | "generating" | "completed" | "failed"
          errorMessage: s.errorMessage ?? null,
          videoUrl: s.videoUrl ?? null,
          lipSyncVideoUrl: s.lipSyncVideoUrl ?? null, // Sync Labs per-scene lip sync output
          lipSyncStatus: s.lipSyncStatus ?? "pending", // "pending" | "processing" | "done" | "error"
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

      // ── CREDIT GUARD FOR PREVIEW REGENERATIONS ──────────────────────────
      // First full set of previews (one per scene, no existing image) = FREE.
      // Any forceRegenerate call (user explicitly re-rolling a scene) = 1 credit.
      const PREVIEW_REGEN_CREDIT_COST = 1;
      if (input.forceRegenerate && scene.previewImageUrl) {
        // Check user has at least 1 credit
        const balance = await getUserCredits(ctx.user.id);
        if (balance < PREVIEW_REGEN_CREDIT_COST) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `INSUFFICIENT_CREDITS:${PREVIEW_REGEN_CREDIT_COST}:${balance}:${PREVIEW_REGEN_CREDIT_COST - balance}`,
          });
        }
        // Deduct 1 credit and track it on the job
        await deductCredits(ctx.user.id, PREVIEW_REGEN_CREDIT_COST, `Scene preview regeneration (job ${input.jobId}, scene ${scene.sceneIndex + 1})`);
        await db.update(musicVideoJobs)
          .set({ previewCreditsUsed: (job.previewCreditsUsed ?? 0) + PREVIEW_REGEN_CREDIT_COST })
          .where(eq(musicVideoJobs.id, input.jobId));
        // Clear the cached preview so a fresh image is generated
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

      // If no characters are assigned (LLM omitted them for first/last scenes), fall back to all locked characters.
      // This prevents scenes 1 and 20 from failing with "Please assign characters".
      const resolvedSceneChars: typeof allJobCharacters = sceneChars.length > 0
        ? sceneChars
        : allJobCharacters.filter(c => c.isLocked);
      if (resolvedSceneChars.length === 0) {
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
      const sceneCharIds = new Set(resolvedSceneChars.map(c => c.id));

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
      const sceneHasLockedChar = resolvedSceneChars.some(c => c.isLocked && c.lockedDescription);

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
        // Strip the literal word "BRANDED" which AI models render as neon text
        s = s.replace(/\bBRANDED\b/g, "");
        // Strip quoted text that AI renders literally
        s = s.replace(/["\u201C\u201D][^"\u201C\u201D]{2,80}["\u201C\u201D]/g, "");
        // Strip neon sign / text references
        s = s.replace(/neon\s+sign\s+(?:reading|saying|with)\s+[^,.]+/gi, "");
        s = s.replace(/\s{2,}/g, " ").trim();
        return s;
      };

      const charCount = resolvedSceneChars.length;
      const primaryCharForScene = resolvedSceneChars[0] ?? null;
      const hasPhotos = referenceImages.length > 0;

      // ── BLOCK 1: Identity Block ───────────────────────────────────────────────
      const identityLines = resolvedSceneChars
        .filter(c => c.isLocked && c.lockedDescription)
        .map((c, idx) => {
          const cleanDesc = sanitiseDescription(c.lockedDescription!);
          const baseDescription = `${c.name} (${c.role || "musician"}): ${cleanDesc}`;
          if (resolvedSceneChars.length > 1) {
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
          ? `EXACTLY ${charCount} people in this image — ${resolvedSceneChars.map(c => c.name).join(", ")}. ` +
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
            if (resolvedSceneChars.length > 1) {
              // Build per-character distinguishing features for identity enforcement
              const charDistinguishers = resolvedSceneChars.map(c => {
                const defaults = getCharacterDefaults(c.name);
                const role = defaults?.lockedRules?.role ?? c.role ?? "musician";
                const keyOutfit = defaults?.lockedOutfit?.jacket || defaults?.lockedOutfit?.shirt || "";
                return `${c.name} is the ${role}${keyOutfit ? ` wearing ${keyOutfit}` : ""} — UNIQUE face, do NOT swap with other characters`;
              });
              return `${subjectLine} ${baseInstruction} CRITICAL: Each character MUST match their reference photo EXACTLY. ` +
                `Do NOT mix up faces between characters. Do NOT duplicate any person. ` +
                `${charDistinguishers.join(". ")}. ` +
                `${charCountConstraint}`;
            }
            return `${subjectLine} ${baseInstruction} ${charCountConstraint}`;
          })()
        : hasPhotos
          ? `Generate the SAME person shown in the reference photo(s). Preserve exact facial features, bone structure, and appearance. ${charCountConstraint}`
          : charCountConstraint;

      // ── BLOCK 2: Visual Block (CHARACTER VISUAL DETAILS — ABSOLUTE TRUTH) ────
      // DUAL-CONSTRAINT OUTFIT ENFORCEMENT: positive (WEARS) + negative (NEVER WEARS)
      // Repeated TWICE in the prompt to maximise model compliance.

      // Per-character outfit constraint definitions
      const OUTFIT_CONSTRAINTS: Record<string, { positive: string[]; negative: string[] }> = {
        tim: {
          positive: [
            "BLACK LEATHER JACKET — this is MANDATORY and the single most important outfit element",
            "dark t-shirt or shirt UNDERNEATH the leather jacket (jacket is ALWAYS on top)",
            "dark jeans or dark trousers with a key chain hanging from belt loop",
            "black boots or dark shoes",
          ],
          negative: [
            "ABSOLUTELY NO t-shirt without a jacket over it",
            "ABSOLUTELY NO hoodie",
            "ABSOLUTELY NO vest",
            "ABSOLUTELY NO blazer",
            "ABSOLUTELY NO suit jacket",
            "ABSOLUTELY NO coat",
            "ABSOLUTELY NO sleeveless top",
            "ABSOLUTELY NO open shirt without leather jacket",
          ],
        },
        greg: {
          positive: [
            "black short-sleeve torn t-shirt — SHORT SLEEVES MUST BE VISIBLE",
            "dark jeans or dark trousers",
            "trainers or boots",
          ],
          negative: [
            "ABSOLUTELY NO leather jacket",
            "ABSOLUTELY NO jacket of any kind",
            "ABSOLUTELY NO sleeveless top",
            "ABSOLUTELY NO tank top",
            "ABSOLUTELY NO vest",
            "ABSOLUTELY NO long-sleeve shirt",
            "ABSOLUTELY NO blazer",
            "ABSOLUTELY NO coat",
          ],
        },
        monica: {
          positive: [
            "form-fitting black leather trousers — MUST be visible from waist to ankle",
            "distressed charcoal grey V-neck t-shirt cut low",
            "black stiletto-heeled ankle boots — MUST be visible",
            "long silver chain necklace with prominent ornate silver cross pendant — MUST be visible",
            "full sleeve tattoos on both forearms — MUST be visible",
          ],
          negative: [
            "ABSOLUTELY NO leather jacket",
            "ABSOLUTELY NO jacket of any kind",
            "ABSOLUTELY NO generic plain clothing",
            "ABSOLUTELY NO hidden tattoos",
            "ABSOLUTELY NO hidden necklace",
            "ABSOLUTELY NO jeans",
            "ABSOLUTELY NO shorts",
            "ABSOLUTELY NO skirt",
          ],
        },
      };

      // Build dual-constraint outfit block for a character
      const buildOutfitConstraintBlock = (charName: string, storedOutfit?: string): string => {
        const key = charName.toLowerCase();
        const constraints = OUTFIT_CONSTRAINTS[key];
        if (!constraints) {
          return storedOutfit ? `${charName} is wearing: ${storedOutfit}. MUST wear this exact outfit. DO NOT change any garment.` : "";
        }
        const positiveList = constraints.positive.map(p => `  + ${p}`).join("\n");
        const negativeList = constraints.negative.map(n => `  ${n}`).join("\n");
        // First statement — detailed list
        const block1 = `${charName} is wearing:\n${positiveList}\n${charName} is ABSOLUTELY NOT wearing:\n${negativeList}`;
        // Second statement — reinforcement repetition
        const block2 = `CONFIRM: ${charName}'s outfit is EXACTLY: ${constraints.positive.join(", ")}. ${charName} is NEVER wearing: ${constraints.negative.join(", ")}.`;
        // Third statement — single-sentence override
        const block3 = `FINAL RULE: ${charName}'s outfit MUST match the above description in EVERY SINGLE SCENE. DO NOT deviate. DO NOT substitute any garment. The AI MUST comply with these outfit rules or the image is WRONG.`;
        return `${block1}\n\n${block2}\n\n${block3}`;
      };

      const visualLines = resolvedSceneChars
        .map(c => {
          let details: { instrument?: string; outfit?: string; props?: string; position?: string } = {};
          if (c.characterVisualDetails) {
            try { details = JSON.parse(c.characterVisualDetails!); } catch {}
          }
          // Fallback to canonical defaults if no visual details stored in DB
          const charDefaults = getCharacterDefaults(c.name);
          if (!details.instrument && !details.outfit && !details.position && charDefaults) {
            details = charDefaults.characterVisualDetails;
          }
          const parts: string[] = [];
          // Dual-constraint outfit block (positive + negative, repeated twice)
          const outfitConstraintBlock = buildOutfitConstraintBlock(c.name, details.outfit);
          if (outfitConstraintBlock) parts.push(outfitConstraintBlock);

          // ── HAIR LOCK ───────────────────────────────────────────────────────────────────────────────────────
          // Photo-driven (from structured extraction) or defaults — NEVER changes between scenes
          // For AI-generated characters: extract hair info from lockedDescription if not in structured details
          let hairColour = (details as any).hairColour || charDefaults?.characterVisualDetails?.hairColour;
          let hairLength = (details as any).hairLength || charDefaults?.characterVisualDetails?.hairLength;
          let hairStyle = (details as any).hairStyle || charDefaults?.characterVisualDetails?.hairStyle;

          // Fallback: parse hair from lockedDescription for AI-generated characters
          if (!hairColour && !hairLength && !hairStyle && c.lockedDescription) {
            const desc = c.lockedDescription.toLowerCase();
            // Extract hair colour from description
            const colourMatch = desc.match(/\b(black|dark brown|brown|auburn|red|blonde|blond|silver|grey|gray|white|platinum|copper|chestnut)\s+hair\b/);
            if (colourMatch) hairColour = colourMatch[1] + " hair";
            // Extract hair length from description
            const lengthMatch = desc.match(/\b(short|medium|long|shoulder.length|waist.length|close.cropped|buzz.cut|shaved)\s+hair\b/);
            if (lengthMatch) hairLength = lengthMatch[1] + " length";
            // Extract hair style from description
            const styleMatch = desc.match(/\b(straight|wavy|curly|messy|textured|slicked.back|tied.back|ponytail|bun|braided|dreadlocks)\s+hair\b/);
            if (styleMatch) hairStyle = styleMatch[1];
          }

          if (hairColour || hairLength || hairStyle) {
            const hairDesc = [hairColour, hairLength, hairStyle].filter(Boolean).join(", ");
            parts.push(
              `HAIR LOCK (ABSOLUTE — SAME IN EVERY SCENE): ${c.name}'s hair is EXACTLY: ${hairDesc}. ` +
              `DO NOT change the hair colour. DO NOT change the hair length. DO NOT change the hair style. ` +
              `SAME hair in every single scene. NEVER shorter. NEVER longer. NEVER different colour.`
            );
          }

          // ── INSTRUMENT LOCK ───────────────────────────────────────────────────────────────────────────────────────
          // Photo-driven (from structured extraction) or defaults — exact model + colour locked
          const instrumentModel = (details as any).instrumentModel || charDefaults?.characterVisualDetails?.instrumentModel;
          const instrumentColour = (details as any).instrumentColour || charDefaults?.characterVisualDetails?.instrumentColour;
          const instrumentFinish = (details as any).instrumentFinish || charDefaults?.characterVisualDetails?.instrumentFinish;
          if (details.instrument || instrumentModel) {
            const instrumentDesc = instrumentModel
              ? `${instrumentModel}${instrumentColour ? ` — ${instrumentColour}` : ""}${instrumentFinish ? `, ${instrumentFinish}` : ""}`
              : details.instrument!;
            parts.push(
              `INSTRUMENT LOCK (ABSOLUTE — SAME IN EVERY SCENE): ${c.name}'s instrument is EXACTLY: ${instrumentDesc}. ` +
              `SAME instrument model in every scene. SAME colour and finish. ` +
              `DO NOT change the instrument colour. DO NOT swap to a different model. ` +
              `Character MUST be actively playing or holding this exact instrument.`
            );
          } else if (details.instrument) {
            parts.push(`Instrument: ${details.instrument} -- MUST hold/play this instrument. NO other instruments.`);
          }

          if (details.position) parts.push(`Position: ${details.position}`);
          if (details.props) parts.push(`Props: ${details.props}`);

          // Inject lockedRules from DB or canonical defaults
          let rules: { role?: string; mustHave?: string[]; forbidden?: string[] } | null = null;
          if (c.lockedRules) {
            try { rules = typeof c.lockedRules === "string" ? JSON.parse(c.lockedRules) : c.lockedRules; } catch {}
          }
          if (!rules && charDefaults) {
            rules = charDefaults.lockedRules;
          }
          if (rules) {
            if (rules.mustHave && rules.mustHave.length > 0) {
              parts.push(`MUST HAVE: ${rules.mustHave.join(", ")}`);
            }
            if (rules.forbidden && rules.forbidden.length > 0) {
              parts.push(`FORBIDDEN: ${rules.forbidden.join(", ")}`);
            }
          }

          return parts.length > 0 ? `${c.name}:\n${parts.join("\n")}` : null;
        })
        .filter(Boolean);

      const visualBlock = visualLines.length > 0
        ? `CHARACTER VISUAL DETAILS (ABSOLUTE TRUTH — OVERRIDES ALL SCENE ASSUMPTIONS):\n\n` +
          `${visualLines.join("\n\n")}\n\n` +
          `OUTFIT CONSISTENCY RULE: Outfits must remain consistent across ALL scenes. ` +
          `DO NOT swap outfits between characters. DO NOT invent or replace props. ` +
          `These outfit definitions OVERRIDE any scene interpretation or style suggestion.`
        : "";

      // ── PERFORMANCE ENERGY BLOCK ──────────────────────────────────────────────────
      // Per-character performance states: energy, movement, expression in sync with music
      const PERFORMANCE_STATES: Record<string, string[]> = {
        tim: [
          "singing passionately with mouth wide open, leaning into microphone, intense expression, eyes closed",
          "belting out vocals, head thrown back, gripping microphone stand, raw emotion",
          "pointing at crowd, powerful vocal delivery, body swaying, electric energy",
          "crouching at microphone, intense focused expression, fist clenched, mid-chorus power",
          "stepping forward, commanding stage presence, voice projected, jaw set with conviction",
        ],
        greg: [
          "arms raised mid-strike, drumsticks blurred with speed, teeth clenched, explosive energy",
          "leaning forward over kit, both arms driving downward, sweat on brow, intense focus",
          "head nodding hard in rhythm, cymbal crash mid-strike, body fully committed to the beat",
          "standing slightly off seat, full-body drum strike, hair flying, raw power",
          "locked in the groove, steady powerful strokes, intense gaze, rhythmic body movement",
        ],
        monica: [
          "body swaying with the bass groove, eyes half-closed, bass guitar angled, deep in the music",
          "stepping forward, plucking bass strings hard, hair moving, focused and powerful",
          "head nodding to the rhythm, fingers working the bass neck, intense expression",
          "leaning back slightly, bass guitar low-slung, commanding stage right, locked in the pocket",
          "eyes closed, feeling the music, bass guitar vibrating, subtle smile of pure performance",
        ],
      };
      const performanceLines = resolvedSceneChars.map(c => {
        const states = PERFORMANCE_STATES[c.name.toLowerCase()];
        if (!states) return null;
        const state = states[scene.sceneIndex % states.length];
        return `${c.name}: ${state}`;
      }).filter(Boolean);
      const performanceBlock = performanceLines.length > 0
        ? `PERFORMANCE ENERGY (CAPTURED MID-PERFORMANCE):\n\n` +
          `${performanceLines.join("\n")}\n\n` +
          `STYLE: Dynamic action shot. Motion blur on instruments and drumsticks. ` +
          `Captured at peak of musical expression. High energy, visceral, authentic rock performance. ` +
          `NOT a static posed photo — MUST show movement, expression, and musical timing.`
        : "";

      // ── BLOCK 3: Role Block (role, defaultState, constraints) ─────────────────
      const roleLines = resolvedSceneChars.map(c => {
        const charDefs = getCharacterDefaults(c.name);
        const parts: string[] = [`${c.name}:`];
        const role = c.role || charDefs?.lockedRole;
        if (role) parts.push(`Role: ${role}`);
        const defaultState = c.characterDefaultState || charDefs?.characterDefaultState;
        if (defaultState) parts.push(`Default State: ${defaultState}`);
        const constraints = c.characterConstraints || charDefs?.characterConstraints;
        if (constraints) parts.push(`Constraints: ${constraints}`);
        return parts.join("\n");
      });

      const roleBlock = roleLines.length > 0
        ? `CHARACTER ROLE DEFINITIONS:\n\n${roleLines.join("\n\n")}`
        : "";

      // ── SCENE TYPE DETECTION ──────────────────────────────────────────────────
      // Determines whether character constraints (count prefix, stage orientation,
      // instrument positioning) should be injected. Non-character shots (crowd pans,
      // aerials, establishing shots, atmosphere) should honour the user's prompt
      // verbatim without character count overrides.
      type SceneType = "character_scene" | "crowd_scene" | "aerial_scene" | "atmosphere_scene" | "establishing_scene";
      const detectSceneType = (prompt: string): SceneType => {
        const p = prompt.toLowerCase();
        // Aerial / bird's eye
        if (/\baer(?:ial|ials?)\b|\bbird'?s.?eye\b|\boverhead\b|\bdrone\s+shot\b|\bfrom\s+above\b/.test(p)) return "aerial_scene";
        // Establishing / wide venue shots
        if (/\bestablishing\b|\bwide\s+(?:venue|shot|view|angle)\b|\bvenue\s+exterior\b|\bopening\s+shot\b|\bpanorama\b/.test(p)) return "establishing_scene";
        // Crowd / audience shots
        if (/\bcrowd\s+(?:pan|shot|view|cheering|waving|moshing)\b|\baudience\s+(?:pan|shot|view|cheering|waving)\b|\bfans?\s+(?:cheering|waving|moshing|screaming)\b|\bcrowd\s+only\b/.test(p)) return "crowd_scene";
        // Atmosphere / abstract / no people
        if (/\batmosphere\b|\bambient\b|\bno\s+people\b|\bno\s+performers\b|\bno\s+characters\b|\bbackground\s+only\b|\bstage\s+empty\b|\bempty\s+stage\b/.test(p)) return "atmosphere_scene";
        // Default: character scene
        return "character_scene";
      };
      const sceneType: SceneType = detectSceneType(scene.prompt);
      const isCharacterScene = sceneType === "character_scene";
      console.log(`[generateScenePreview] Scene ${input.sceneId}: sceneType=${sceneType}, userEditedPrompt=${scene.userEditedPrompt}`);

      // ── Clean scene prompt (BLOCK 4 source) ──────────────────────────────────
      // For user-edited prompts: use verbatim as DIRECTOR'S INSTRUCTION (skip name-stripping)
      // For system-generated prompts: apply normal cleaning pipeline
      let cleanScenePrompt: string;
      if (scene.userEditedPrompt) {
        // User-edited: honour verbatim, only strip band name from text/sign references
        cleanScenePrompt = scene.prompt;
        if (job.title) {
          const escapedTitle = job.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          cleanScenePrompt = cleanScenePrompt.replace(new RegExp(`${escapedTitle}\\s+(?:neon\\s+)?(?:sign|logo|banner|backdrop|screen|display|text|lettering|typography|name)`, "gi"), "");
          cleanScenePrompt = cleanScenePrompt.replace(/\s{2,}/g, " ").trim();
        }
      } else {
        cleanScenePrompt = scene.prompt;
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
      const sceneCharNamesStr = resolvedSceneChars.map(c => c.name).join(", ");
      const peopleCountRule = charCount === 1
        ? `ONLY ONE PERSON on stage — ${primaryCharForScene?.name ?? "the character"} ONLY. NO other people. NO background musicians. NO silhouettes.`
        : charCount === 3
          ? `ONLY three people on stage. ONLY: ${sceneCharNamesStr}. NO extra musicians. NO duplicates. NO background silhouettes.`
          : `EXACTLY ${charCount} people on stage — ${sceneCharNamesStr}. NO extra musicians. NO duplicates. NO background silhouettes.`;

      // ── STAGE ORIENTATION & INSTRUMENT POSITIONING LOCK (character scenes only) ───
      // Only inject these hard constraints for character_scene type.
      // Non-character shots (crowd pans, aerials, atmosphere) honour the user's prompt verbatim.
      const stagePositionLines: string[] = [];
      if (isCharacterScene) {
        for (const c of resolvedSceneChars) {
          const cDefaults = getCharacterDefaults(c.name);
          const lockedPos = cDefaults?.lockedPosition ?? null;
          const lockedRoleStr = (c.role || cDefaults?.lockedRole) ?? "";
          if (lockedPos) {
            stagePositionLines.push(`${c.name}: FIXED POSITION — ${lockedPos}. DO NOT move ${c.name} from this position.`);
          }
          // Instrument positioning hard rules per role
          if (lockedRoleStr.toLowerCase().includes("drummer") || cDefaults?.lockedRules?.role === "drummer") {
            stagePositionLines.push(`${c.name}: MUST be SEATED BEHIND the drum kit at ALL TIMES. NEVER standing. NEVER away from drums.`);
          } else if (lockedRoleStr.toLowerCase().includes("bassist") || cDefaults?.lockedRules?.role === "bassist") {
            stagePositionLines.push(`${c.name}: MUST be STANDING and HOLDING/PLAYING the bass guitar at ALL TIMES. NEVER empty-handed.`);
          } else if (lockedRoleStr.toLowerCase().includes("vocalist") || cDefaults?.lockedRules?.role === "lead vocalist") {
            stagePositionLines.push(`${c.name}: MUST be at the MICROPHONE or HOLDING GUITAR. ALWAYS centre stage front. NEVER in the background.`);
          }
        }
      }
      const stageOrientationBlock = isCharacterScene
        ? `STAGE ORIENTATION (ABSOLUTE — DO NOT VIOLATE):\n` +
          `- Camera ALWAYS faces the stage FROM the audience perspective (front-on or slight angle).\n` +
          `- NEVER shoot from behind the performers.\n` +
          `- NEVER show the backs of performers as the primary view.\n` +
          `- Performers face TOWARD the camera (toward the audience).\n` +
          (stagePositionLines.length > 0 ? stagePositionLines.map(l => `- ${l}`).join("\n") : "")
        : "";

      const constraintBlock = isCharacterScene
        ? `GLOBAL CONSTRAINTS:\n` +
          `- ${peopleCountRule}\n` +
          `- NO extra musicians\n` +
          `- NO duplicates or clones\n` +
          `- NO background silhouettes\n` +
          `- NO visible text, logos, or band names\n` +
          `- NO neon signs, banners, or typography\n` +
          `- Prefer medium or close shots — faces must be clearly visible\n\n` +
          stageOrientationBlock
        : `GLOBAL CONSTRAINTS:\n` +
          `- NO visible text, logos, or band names\n` +
          `- NO neon signs, banners, or typography`;

      // ── BLOCK 4: Scene Block ──────────────────────────────────────────────────
      // Camera angle rotation: cycle through varied angles based on scene index
      // Ensures visual diversity across the storyboard
      const CAMERA_ANGLES = [
        "medium close-up shot, waist-up framing, faces clearly visible, eye-level angle",
        "close-up shot, face and upper chest, dramatic lighting, eye-level",
        "wide shot, full stage visible, all performers in frame, low angle looking up at stage — NO audience visible",
        "medium shot, three-quarter angle, slight low angle, dynamic perspective",
        "close-up shot on vocalist, tight framing, faces clearly visible",
        "medium shot, full band on stage, stage-facing camera, NO crowd visible, low angle",
        "medium close-up, side angle (90 degrees), profile view, faces visible",
        "medium shot from front-of-stage, vocalist and bassist in frame, drummer visible behind",
        "low angle wide shot, looking up at performers from stage level, dramatic stage lighting — NO audience",
        "medium shot, front-facing, all characters waist-up, faces clearly visible",
      ];
      const cameraAngle = CAMERA_ANGLES[scene.sceneIndex % CAMERA_ANGLES.length];
      // For user-edited prompts: label as DIRECTOR'S INSTRUCTION (highest priority)
      // For non-character scenes: omit character list and face rule
      const sceneBlock = scene.userEditedPrompt
        ? `DIRECTOR'S INSTRUCTION (HIGHEST PRIORITY — USE VERBATIM):\n${cleanScenePrompt}\n\n` +
          (isCharacterScene ? `CHARACTERS IN SCENE: ${sceneCharNamesStr}\n\nCAMERA: ${cameraAngle}\nRULE: Faces of all characters MUST be clearly visible regardless of shot type` : `CAMERA: ${cameraAngle}`)
        : isCharacterScene
          ? `SCENE DESCRIPTION:\n${cleanScenePrompt}\n\n` +
            `CHARACTERS IN SCENE: ${sceneCharNamesStr}\n\n` +
            `CAMERA: ${cameraAngle}\n` +
            `RULE: Faces of all characters MUST be clearly visible regardless of shot type`
          : `SCENE DESCRIPTION:\n${cleanScenePrompt}\n\nCAMERA: ${cameraAngle}`;

      // ── Identity Anchor ───────────────────────────────────────────────────────
      // For AI-generated characters without uploaded photos, use previewImageUrl as masterPortraitUrl fallback
      // This ensures AI characters also get face-anchored generation (not just photo-mode characters)
      const masterPortraitUrl = primaryCharForScene?.masterPortraitUrl ?? primaryCharForScene?.previewImageUrl ?? null;
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
      // ── Per-character negative prompt injection ─────────────────────────────
      // Build dynamic per-character outfit exclusions from OUTFIT_CONSTRAINTS
      const perCharNegatives: string[] = [];
      for (const c of resolvedSceneChars) {
        const key = c.name.toLowerCase();
        const constraints = OUTFIT_CONSTRAINTS[key];
        if (constraints) {
          // Convert "NOT a leather jacket" → "leather jacket on CharName"
          for (const neg of constraints.negative) {
            const cleaned = neg.replace(/^NOT\s+(?:a\s+|any\s+)?/i, "").trim();
            if (cleaned) perCharNegatives.push(`${cleaned} on ${c.name}`);
          }
        }
      }

      // Build per-character hair + instrument negative entries from locked visual details
      const perCharHairInstrumentNegatives: string[] = [];
      for (const c of resolvedSceneChars) {
        let cDetails: Record<string, string> = {};
        if (c.characterVisualDetails) { try { cDetails = JSON.parse(c.characterVisualDetails); } catch {} }
        const cDefaults = getCharacterDefaults(c.name);
        const hColour = cDetails.hairColour || (cDefaults?.characterVisualDetails as any)?.hairColour;
        const hLength = cDetails.hairLength || (cDefaults?.characterVisualDetails as any)?.hairLength;
        const iModel = cDetails.instrumentModel || (cDefaults?.characterVisualDetails as any)?.instrumentModel;
        const iColour = cDetails.instrumentColour || (cDefaults?.characterVisualDetails as any)?.instrumentColour;
        if (hColour) perCharHairInstrumentNegatives.push(`different hair colour on ${c.name}`, `wrong hair colour on ${c.name}`);
        if (hLength) perCharHairInstrumentNegatives.push(`different hair length on ${c.name}`, `shorter hair on ${c.name}`, `longer hair on ${c.name}`);
        if (iModel) perCharHairInstrumentNegatives.push(`different instrument model for ${c.name}`, `wrong instrument for ${c.name}`);
        if (iColour) perCharHairInstrumentNegatives.push(`different instrument colour for ${c.name}`, `wrong colour instrument for ${c.name}`);
      }

      const negativePromptV2 = [
        "different face", "new person", "altered identity", "different person", "inconsistent character",
        "different hairstyle", "shorter hair", "longer hair", "different hair colour", "different hair color",
        "hair colour change", "hair length change", "hair dye", "wig", "bald",
        "variation in appearance", "different facial hair",
        // Per-character hair + instrument negatives (dynamic)
        ...perCharHairInstrumentNegatives,
        extraPeopleNegative,
        "nsfw", "lowres", "bad anatomy", "extra limbs", "blurry", "low quality", "cartoon", "anime",
        "deformed", "ugly", "disfigured",
        "static pose", "standing still", "no expression", "posed photo", "stiff pose", "lifeless", "mannequin",
        "bored expression", "neutral expression", "arms at sides", "hands in pockets",
        "text", "words", "caption", "subtitle", "lyrics text", "text overlay", "words in frame",
        "logo", "signage", "typography", "neon sign", "banner", "watermark",
        "band name", "venue name", "stage backdrop text", "neon text on backdrop", "BRANDED", "band name in lights",
        "text on backdrop", "illuminated band name", "glowing letters", "neon sign with words",
        "wrong outfit", "outfit swap", "different clothing", "mismatched outfits",
        // Per-character outfit exclusions (dynamic)
        ...perCharNegatives,
        // Hardcoded fallbacks for known characters
        "leather jacket on drummer", "leather jacket on Greg", "leather jacket on Monica",
        "jacket on Greg", "blazer on Greg", "coat on Greg", "hoodie on Greg",
        "tank top on drummer", "sleeveless shirt on Greg", "vest on Greg",
        "jacket on Monica", "plain clothing on Monica",
        // Duplicate person / clone prevention
        "duplicate person", "cloned character", "two identical people", "twin characters",
        "same face twice", "repeated character", "mirror image of person",
        // Crowd in BACKGROUND is allowed and looks great (like a real concert).
        // Only block crowd in FOREGROUND obscuring the band, or arena wide shots where band is tiny.
        "crowd in foreground blocking band", "audience obscuring performers", "crowd pushing in front of band",
        "arena wide shot with tiny band", "distant stage shot", "band barely visible",
        ...(charCount > 1 ? [
          "extra people on stage", "fourth person on stage", "fifth person on stage", "additional guitarist on stage",
          "extra band members on stage", "silhouette on stage",
          "aerial shot", "bird's eye view",
        ] : []),
        ...(charCount === 1 ? [
          "crowd in foreground", "audience in foreground", "crowd blocking performer",
        ] : []),
      ].join(", ");

      // ── Hard people-count prefix (FIRST in prompt for maximum model weight) ──
      // Only injected for character_scene type — non-character shots honour the user's prompt verbatim
      const hardCountPrefix = isCharacterScene
        ? (charCount > 1
          ? `CRITICAL SCENE RULE: ONLY ${charCount} people on stage. ` +
            `The ONLY people in this image are: ${sceneCharNamesStr}. ` +
            `NO additional musicians. NO background band members. NO extra performers. ` +
            `NO silhouettes. NO crowd on stage. EXACTLY ${charCount} people — not ${charCount + 1}, not ${charCount + 2}.`
          : charCount === 1
            ? `CRITICAL SCENE RULE: ONLY ONE PERSON in this image — ${primaryCharForScene?.name ?? "the character"}. ` +
              `NO other people. NO background musicians. NO silhouettes.`
            : "")
        : ""      // ── CONTINUITY BLOCK (scenes after the first) ──────────────────────────
      // When a previous scene image is provided, instruct the model to maintain
      // visual consistency: same lighting temperature, colour grading, stage setup,
      // and character positioning relative to the previous frame.
      const continuityBlock = input.previousSceneImageUrl
        ? `CONTINUITY RULES (maintain consistency with previous scene):\n` +
          `- The reference image from the previous scene is provided as an additional input.\n` +
          `- MAINTAIN the same lighting temperature, colour grading, and stage setup.\n` +
          `- MAINTAIN the same character outfits, hairstyles, and accessories — NO changes between scenes.\n` +
          `- MAINTAIN the same stage/set design, instrument placement, and prop positions.\n` +
          `- The camera angle may change, but the overall visual style MUST remain consistent.\n` +
          `- If the previous scene showed a specific background (e.g. red lighting, smoke), keep it unless the scene description explicitly changes it.`
        : "";

      // ── V3 Final Prompt Assembly: 7 blocks ───────────────────────────────────────────
      // Order: hardCount → identity → visual (OVERRIDE) → role → performance → scene → continuity → constraints → style
      const finalImagePrompt = [
        hardCountPrefix,
        characterBlock,
        visualBlock,
        roleBlock,
        performanceBlock,
        sceneBlock,
        continuityBlock,
        constraintBlock,
        styleDescriptor,
        styleLockSuffix ? `STYLE LOCK: ${styleLockSuffix}` : "",
        moodContext ? `Mood: ${moodContext}` : "",
        "16:9 widescreen, high quality, professional photography, concert photography",
      ].filter(Boolean).join("\n\n");  console.log(`[generateScenePreview] Scene ${input.sceneId}: ${referenceImages.length} ref photos, masterPortrait=${!!masterPortraitUrl}, seed=${masterSeed}, prompt length: ${finalImagePrompt.length}`);

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

      // ── Save prompt snapshots for debugging ──────────────────────────────────
      try {
        await db.update(musicVideoJobs)
          .set({
            promptSnapshot: finalImagePrompt.slice(0, 65000),
            negativePromptSnapshot: negativePromptV2.slice(0, 65000),
          })
          .where(eq(musicVideoJobs.id, input.jobId));
      } catch (snapErr) {
        console.warn(`[generateScenePreview] Could not save prompt snapshot:`, snapErr);
      }

       // ── generateWithRetry: retry up to 3 times if validation fails ────────
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let lastUrl: string | undefined;
      // Hoisted so outfit-retry block can access the face references used during generation
      let hoistedForgeRefs: Array<{ url: string; mimeType: string }> = [];
       try {
        let url: string | undefined;
        let bestScore = -1; // Face similarity score from variation system (0-100, -1 = not scored)
        let attemptCount = 0; // Number of variation generation attempts
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

          // Photo Mode V2: Use Forge API with reference photo for face-consistent generation
          // Photo Mode V3: Use Forge API with ALL scene characters' reference photos
          // CRITICAL FIX: include one portrait per scene character so ALL faces are anchored.
          // Previously only Tim's masterPortraitUrl was passed — Greg and Monica were invented.
          console.log(`[generateScenePreview] Using Forge API for scene ${input.sceneId} (${resolvedSceneChars.map(c => c.name).join(", ")})`);
          const forgeRefs: Array<{ url: string; mimeType: string }> = [];
          hoistedForgeRefs = forgeRefs; // hoist for outfit-retry block
          const seenRefUrls = new Set<string>(); // Deduplicate: one reference per unique URL
          for (const char of resolvedSceneChars) {
            // Prefer masterPortraitUrl (clean AI portrait), fall back to primary reference photo
            const charPrimaryPhoto = allPhotos.find(p => p.characterId === char.id && p.isPrimary) ??
                                     allPhotos.find(p => p.characterId === char.id);
            // For AI-generated characters: fall back to previewImageUrl if no masterPortraitUrl or photo
            const charRefUrl = char.masterPortraitUrl ?? charPrimaryPhoto?.photoUrl ?? char.previewImageUrl ?? null;
            if (charRefUrl && !seenRefUrls.has(charRefUrl)) {
              seenRefUrls.add(charRefUrl);
              const mime = charRefUrl.match(/\.png(\?|$)/i) ? "image/png" :
                           charRefUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
              forgeRefs.push({ url: charRefUrl, mimeType: mime });
              const refSource = char.masterPortraitUrl ? 'masterPortrait' : charPrimaryPhoto?.photoUrl ? 'primaryPhoto' : 'previewImageUrl';
              console.log(`[generateScenePreview] Face ref for ${char.name}: ${refSource}`);
            } else if (!charRefUrl) {
              console.warn(`[generateScenePreview] No face reference for ${char.name} — face will not be anchored`);
            } else {
              console.log(`[generateScenePreview] Skipping duplicate face ref for ${char.name} (already included)`);
            }
          }
          // Chained Reference — also include previous scene as secondary anchor (only if space)
          if (input.previousSceneImageUrl && forgeRefs.length < 4) {
            const prevMime = input.previousSceneImageUrl.match(/\.png(\?|$)/i) ? "image/png" :
                             input.previousSceneImageUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
            forgeRefs.push({ url: input.previousSceneImageUrl, mimeType: prevMime });
          }
          // ── 3-VARIATION FACE SCORING SYSTEM ─────────────────────────────────
          // For photo-mode characters: generate 3 parallel variations, score each
          // by face similarity vs masterPortraitUrl, pick the best match.
          // If best score < 0.65 (65/100), auto-regenerate once more (max 2 retries).
          const VARIATION_COUNT = 3;
          const FACE_SIMILARITY_THRESHOLD = 65; // 0-100 scale (65 = 0.65)
          const MAX_RETRIES = 2;

          // Build face reference data for scoring (primary character only for scoring)
          const primaryCharForScoring = resolvedSceneChars.find(c => c.isLocked && (c.masterPortraitUrl ?? allPhotos.find(p => p.characterId === c.id)?.photoUrl));
          let refBase64ForScoring: string | null = null;
          if (primaryCharForScoring) {
            const primaryPhotoForScoring = allPhotos.find(p => p.characterId === primaryCharForScoring.id && p.isPrimary) ??
                                           allPhotos.find(p => p.characterId === primaryCharForScoring.id);
            const refUrlForScoring = primaryCharForScoring.masterPortraitUrl ?? primaryPhotoForScoring?.photoUrl ?? null;
            if (refUrlForScoring) {
              try {
                refBase64ForScoring = await ensureReferencePhotoBase64(primaryCharForScoring.id, refUrlForScoring);
              } catch (e) {
                console.warn(`[generateScenePreview] Could not load ref photo for scoring: ${e}`);
              }
            }
          }

          // Helper: generate one variation
          const generateOneVariation = async (): Promise<string | undefined> => {
            const { url: varUrl } = await withQuotaGuard(() => generateImage({
              prompt: finalImagePrompt,
              originalImages: forgeRefs.length > 0 ? forgeRefs : undefined,
            }));
            return varUrl;
          };

          // Helper: score a generated image URL against the reference
          const scoreVariation = async (imageUrl: string): Promise<number> => {
            if (!refBase64ForScoring) return 100; // No reference = assume pass
            try {
              const result = await validateFaceConsistency(refBase64ForScoring, imageUrl);
              return result.provider === "skipped" ? 100 : result.confidence;
            } catch {
              return 0;
            }
          };

          // Generate 3 variations in parallel
          console.log(`[generateScenePreview] Scene ${input.sceneId}: generating ${VARIATION_COUNT} variations for face scoring`);
          let bestUrl: string | undefined;
          let bestScore = -1;
          let attemptCount = 0;

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            attemptCount++;
            const variationResults = await Promise.allSettled(
              Array.from({ length: VARIATION_COUNT }, () => generateOneVariation())
            );
            const variationUrls = variationResults
              .filter((r): r is PromiseFulfilledResult<string | undefined> => r.status === "fulfilled")
              .map(r => r.value)
              .filter((v): v is string => !!v);

            if (variationUrls.length === 0) {
              console.warn(`[generateScenePreview] Scene ${input.sceneId}: all ${VARIATION_COUNT} variations failed on attempt ${attempt + 1}`);
              break;
            }

            // Score each variation (parallel)
            const scores = await Promise.all(variationUrls.map(u => scoreVariation(u)));
            console.log(`[generateScenePreview] Scene ${input.sceneId} attempt ${attempt + 1}: scores = [${scores.map(s => s.toFixed(1)).join(", ")}]`);

            // Pick best
            let localBestIdx = 0;
            for (let i = 1; i < scores.length; i++) {
              if (scores[i] > scores[localBestIdx]) localBestIdx = i;
            }
            const localBestScore = scores[localBestIdx];
            const localBestUrl = variationUrls[localBestIdx];

            if (localBestScore > bestScore) {
              bestScore = localBestScore;
              bestUrl = localBestUrl;
            }

            // If best score meets threshold, stop early
            if (bestScore >= FACE_SIMILARITY_THRESHOLD) {
              console.log(`[generateScenePreview] Scene ${input.sceneId}: face score ${bestScore.toFixed(1)} >= threshold ${FACE_SIMILARITY_THRESHOLD}. Stopping.`);
              break;
            }

            console.log(`[generateScenePreview] Scene ${input.sceneId}: best score ${bestScore.toFixed(1)} < threshold ${FACE_SIMILARITY_THRESHOLD}. Retrying (attempt ${attempt + 2}/${MAX_RETRIES})...`);
          }

          url = bestUrl;
          const finalFaceScore = bestScore >= 0 ? bestScore : null;
          console.log(`[generateScenePreview] Scene ${input.sceneId}: selected variation with face score ${finalFaceScore?.toFixed(1) ?? "N/A"} after ${attemptCount} attempt(s)`);
          console.log(`[generateScenePreview] Forge success for scene ${input.sceneId}: ${url}`);
        } else {
          // ── AI-Described Character Path: Flux PuLID Face Lock ────────────────
          // If the character has a masterPortraitUrl (AI-generated portrait), use Flux PuLID
          // to generate every storyboard frame with the SAME face locked in.
          // This eliminates character drift for AI-described characters (no uploaded photos).
          // Falls back to generic generation if Flux PuLID fails or no portrait exists.
          const aiPortraitUrl = masterPortraitUrl; // already resolved above (masterPortraitUrl ?? previewImageUrl)
          if (aiPortraitUrl && process.env.FAL_AI_API_KEY) {
            console.log(`[generateScenePreview] Scene ${input.sceneId}: AI character with portrait — using Flux PuLID face lock`);
            console.log(`[generateScenePreview] Portrait reference: ${aiPortraitUrl.slice(0, 80)}...`);
            try {
              const pulidResult = await generateFaceConsistentImage({
                prompt: finalImagePrompt,
                referenceImageUrl: aiPortraitUrl,
                idWeight: 1.2,           // Strong face preservation without ignoring scene prompt
                guidanceScale: 5,        // Slightly above default for better scene adherence
                imageSize: "landscape_16_9", // Widescreen for music video storyboards
                numInferenceSteps: 25,   // Slightly above default for better quality
                negativePrompt: [
                  "different person", "different face", "different hair colour", "different eye colour",
                  "inconsistent character", "face swap", "multiple people", "blurry face",
                  "distorted face", "low quality", "watermark", "text", "logo",
                ].join(", "),
              });
              url = pulidResult.url;
              console.log(`[generateScenePreview] Flux PuLID success for scene ${input.sceneId}: ${url?.slice(0, 80)}...`);
            } catch (pulidErr) {
              const pulidMsg = pulidErr instanceof Error ? pulidErr.message : String(pulidErr);
              console.warn(`[generateScenePreview] Flux PuLID failed for scene ${input.sceneId}, falling back to generic: ${pulidMsg}`);
              const { url: genericUrl } = await withQuotaGuard(() => generateImage({
                prompt: finalImagePrompt,
                originalImages: referenceImages.length > 0 ? referenceImages : undefined,
              }));
              url = genericUrl;
            }
          } else {
            // No portrait available or no FAL_AI_API_KEY — generic generation
            if (!aiPortraitUrl) console.warn(`[generateScenePreview] Scene ${input.sceneId}: AI character has no portrait — face will not be locked`);
            if (!process.env.FAL_AI_API_KEY) console.warn(`[generateScenePreview] Scene ${input.sceneId}: FAL_AI_API_KEY not set — cannot use Flux PuLID`);
            const { url: genericUrl } = await withQuotaGuard(() => generateImage({
              prompt: finalImagePrompt,
              originalImages: referenceImages.length > 0 ? referenceImages : undefined,
            }));
            url = genericUrl;
          }
        }

        // ── OUTFIT AUTO-RETRY ─────────────────────────────────────────────────────
        // After generation, use LLM vision to check if outfit constraints are violated.
        // If a violation is detected, regenerate up to 2 more times with a strengthened
        // outfit enforcement prefix in the prompt.
        const MAX_OUTFIT_RETRIES = 2;
        const charsWithOutfitConstraints = resolvedSceneChars.filter(c => {
          const key = c.name.toLowerCase();
          return OUTFIT_CONSTRAINTS[key] !== undefined;
        });
        if (url && charsWithOutfitConstraints.length > 0) {
          try {
            const { invokeLLM: invokeLLMOutfit } = await import("../_core/llm");
            // Build a concise checklist of what each character MUST and MUST NOT wear
            const outfitChecklist = charsWithOutfitConstraints.map(c => {
              const key = c.name.toLowerCase();
              const constraints = OUTFIT_CONSTRAINTS[key]!;
              return `${c.name}: MUST wear [${constraints.positive.join("; ")}]. MUST NOT wear [${constraints.negative.map(n => n.replace(/^ABSOLUTELY NO /i, "")).join("; ")}].`;
            }).join("\n");
            let outfitRetryCount = 0;
            let currentUrl = url;
            for (let outfitAttempt = 0; outfitAttempt < MAX_OUTFIT_RETRIES; outfitAttempt++) {
              const outfitCheckPrompt = [
                "You are a strict outfit compliance checker for AI-generated music video scenes.",
                "Examine the image carefully and check if each character's outfit matches the requirements below.",
                'Return JSON: { "compliant": boolean, "violations": string[] }',
                "violations should list each specific outfit rule that is broken (e.g. \"Tim is not wearing a leather jacket\").",
                "If the image is compliant, return { \"compliant\": true, \"violations\": [] }.",
                "",
                "OUTFIT REQUIREMENTS:",
                outfitChecklist,
              ].join("\n");
              const outfitCheckResult = await invokeLLMOutfit({
                messages: [
                  { role: "user" as const, content: [
                    { type: "text" as const, text: outfitCheckPrompt },
                    { type: "image_url" as const, image_url: { url: currentUrl, detail: "low" as const } },
                  ]},
                ],
                response_format: { type: "json_schema", json_schema: {
                  name: "outfit_check", strict: true,
                  schema: { type: "object", properties: {
                    compliant: { type: "boolean" },
                    violations: { type: "array", items: { type: "string" } },
                  }, required: ["compliant", "violations"], additionalProperties: false },
                }},
              });
              let outfitCheck: { compliant: boolean; violations: string[] } = { compliant: true, violations: [] };
              try {
                const rawContent = outfitCheckResult?.choices?.[0]?.message?.content;
                const raw = typeof rawContent === "string" ? rawContent :
                  Array.isArray(rawContent) ? rawContent.filter((p: any) => p.type === "text").map((p: any) => p.text).join("") : null;
                if (raw) outfitCheck = JSON.parse(raw);
              } catch { /* ignore parse error */ }
              if (outfitCheck.compliant) {
                console.log(`[generateScenePreview] Scene ${input.sceneId}: outfit check PASSED on attempt ${outfitAttempt + 1}`);
                break;
              }
              console.warn(`[generateScenePreview] Scene ${input.sceneId}: outfit VIOLATION detected (attempt ${outfitAttempt + 1}): ${outfitCheck.violations.join("; ")}. Retrying...`);
              outfitRetryCount++;
              // Strengthen the prompt with an explicit outfit enforcement prefix
              const outfitEnforcementPrefix = charsWithOutfitConstraints.map(c => {
                const key = c.name.toLowerCase();
                const constraints = OUTFIT_CONSTRAINTS[key]!;
                return `CRITICAL OUTFIT RULE FOR ${c.name.toUpperCase()}: ${c.name} MUST wear EXACTLY: ${constraints.positive.join(", ")}. ${c.name} MUST NOT wear: ${constraints.negative.map(n => n.replace(/^ABSOLUTELY NO /i, "")).join(", ")}. THIS IS NON-NEGOTIABLE.`;
              }).join("\n");
              const retryPrompt = `${outfitEnforcementPrefix}\n\n${finalImagePrompt}`;
              try {
                if (hasFaceReference) {
                  const { url: retryUrl } = await withQuotaGuard(() => generateImage({
                    prompt: retryPrompt,
                    originalImages: hoistedForgeRefs.length > 0 ? hoistedForgeRefs : undefined,
                  }));
                  if (retryUrl) { currentUrl = retryUrl; url = retryUrl; }
                } else {
                  const { url: retryUrl } = await withQuotaGuard(() => generateImage({
                    prompt: retryPrompt,
                    originalImages: referenceImages.length > 0 ? referenceImages : undefined,
                  }));
                  if (retryUrl) { currentUrl = retryUrl; url = retryUrl; }
                }
              } catch (retryErr) {
                console.warn(`[generateScenePreview] Scene ${input.sceneId}: outfit retry ${outfitAttempt + 1} generation failed:`, retryErr);
                break;
              }
            }
            if (outfitRetryCount > 0) {
              console.log(`[generateScenePreview] Scene ${input.sceneId}: outfit auto-retry completed (${outfitRetryCount} retries). Final url: ${url}`);
            }
          } catch (outfitErr) {
            console.warn(`[generateScenePreview] Scene ${input.sceneId}: outfit check error (non-blocking):`, outfitErr);
          }
        }
        // ── END OUTFIT AUTO-RETRY ─────────────────────────────────────────────────

        if (url) {
          const FACE_SIMILARITY_THRESHOLD_DB = 65;
          const finalScoreForDb = bestScore >= 0 ? bestScore : null;
          const faceStatusForDb: "matched" | "warning" | "regenerated" | "skipped" =
            finalScoreForDb === null ? "skipped" :
            finalScoreForDb >= FACE_SIMILARITY_THRESHOLD_DB ? "matched" :
            "warning";

          await db.update(musicVideoScenes)
            .set({
              previewImageUrl: url,
              faceValidationStatus: faceStatusForDb,
              faceValidationScores: finalScoreForDb !== null ? JSON.stringify({ _bestScore: finalScoreForDb }) : null,
              faceValidationAttempts: typeof attemptCount !== "undefined" ? attemptCount : 1,
            })
            .where(eq(musicVideoScenes.id, input.sceneId));

          // ─── Character Lock: full per-character validation ────────────────
          if (job.characterLockEnabled !== false && resolvedSceneChars.some(c => c.isLocked)) {
            try {
              const lockCharacters: CharacterLockData[] = [];
              for (const char of resolvedSceneChars) {
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
          (job.aspectRatio as "16:9" | "9:16" | "1:1") ?? "16:9",
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

      // Reset all failed scenes to pending
      await db.update(musicVideoScenes)
        .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, errorMessage: null, updatedAt: new Date() })
        .where(and(eq(musicVideoScenes.jobId, input.jobId), eq(musicVideoScenes.status, "failed")));

      // Reset spend-protection attempt counters for all failed scenes
      await Promise.all(failedScenes.map((s) => resetSceneAttempts(s.id)));

      // Ensure job is back in rendering state
      await db.update(musicVideoJobs)
        .set({ status: "rendering", updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));

      // Re-queue each failed scene with 3s stagger
      // STORYBOARD LOCK: each scene passes its approved preview image as visual anchor
      const STAGGER_MS = 3000;
      (async () => {
        for (let i = 0; i < failedScenes.length; i++) {
          const scene = failedScenes[i];
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

      // Second pass: extract structured visual lock fields (hair + instrument) from the same photo
      let structuredVisualDetails: Record<string, string> = {};
      try {
        const { invokeLLM: invokeLLM2 } = await import("../_core/llm");
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
        console.warn(`[reanalyseCharacterPhoto] Structured visual extraction failed for ${char.name}:`, structErr);
      }

      // Merge with any existing characterVisualDetails
      let existingVisual: Record<string, string> = {};
      if (char.characterVisualDetails) {
        try { existingVisual = JSON.parse(char.characterVisualDetails); } catch {}
      }
      const mergedVisual = { ...existingVisual, ...structuredVisualDetails };

      await db.update(videoCharacters)
        .set({ isLocked: true, lockedDescription: trimmedDescription, characterVisualDetails: JSON.stringify(mergedVisual), updatedAt: new Date() })
        .where(eq(videoCharacters.id, input.characterId));

      console.log(`[reanalyseCharacterPhoto] Updated ${char.name} description (${trimmedDescription.length} chars) + visual lock: ${JSON.stringify(structuredVisualDetails)}`);
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
      const charNameLower = char.name.toLowerCase();

      // Extract visual details (outfit, instrument, props) from stored JSON
      let visualOutfit = "";
      let visualInstrument = "";
      let visualProps = "";
      if (char.characterVisualDetails) {
        try {
          const vd = JSON.parse(char.characterVisualDetails) as { outfit?: string; instrument?: string; props?: string };
          visualOutfit = vd.outfit?.trim() ?? "";
          visualInstrument = vd.instrument?.trim() ?? "";
          visualProps = vd.props?.trim() ?? "";
        } catch { /* ignore parse errors */ }
      }

      // Per-character outfit enforcement — injected directly into the prompt
      const outfitBlock = charNameLower === "tim"
        ? `OUTFIT (MANDATORY): ${visualOutfit || "black leather jacket over dark t-shirt, black jeans, black boots"}. Tim MUST wear a BLACK LEATHER JACKET. The leather jacket is the most important outfit element. DO NOT replace the leather jacket with any other garment.`
        : charNameLower === "greg"
        ? `OUTFIT (MANDATORY): ${visualOutfit || "black short-sleeve torn t-shirt with visible sleeves, dark jeans, trainers"}. Greg MUST wear a SHORT-SLEEVE T-SHIRT WITH SLEEVES. ABSOLUTELY NO leather jacket. ABSOLUTELY NO jacket of any kind. ABSOLUTELY NO blazer. ABSOLUTELY NO coat. ABSOLUTELY NO tank top. ABSOLUTELY NO sleeveless shirt. ONLY a t-shirt with short sleeves.`
        : charNameLower === "monica"
        ? `OUTFIT (MANDATORY): ${visualOutfit || "form-fitting black leather trousers, distressed charcoal grey V-neck t-shirt, black stiletto-heeled ankle boots, silver cross necklace, full sleeve tattoos on both arms"}. Monica MUST wear LEATHER TROUSERS and ANKLE BOOTS. Both legs and feet must be fully visible showing the leather trousers and boots. ABSOLUTELY NO leather jacket.`
        : visualOutfit ? `OUTFIT: ${visualOutfit}.` : "";

      const instrumentBlock = visualInstrument ? `INSTRUMENT: ${visualInstrument}.` : "";
      const propsBlock = visualProps ? `PROPS: ${visualProps}.` : "";

      // Build a full-body portrait prompt — AGGRESSIVE full-length framing to override reference photo composition
      // The reference photo may be a bust/waist-up shot, so we must dominate the framing with explicit full-body language
      const fullBodyPrefix = `FULL BODY SHOT. FULL LENGTH. HEAD TO FEET. ENTIRE BODY VISIBLE. LEGS VISIBLE. FEET AND SHOES VISIBLE. Standing pose, full figure from top of head to bottom of feet. NOT a bust shot. NOT a portrait crop. NOT waist up. NOT chest up. The entire body must be in frame.`;
      const fullBodySuffix = `Show the complete outfit: top AND bottom clothing AND footwear AND accessories. Both legs fully visible. Both feet and shoes/boots fully visible. Camera framed to show full standing figure. Vertical composition. Full-length portrait. 9:16 aspect ratio. Neutral expression, soft studio lighting, plain neutral background, photorealistic, high detail, 8K. DO NOT crop. DO NOT cut off legs. DO NOT cut off feet.`;
      const descriptionBlock = description.length > 20 ? description : characterLabel;
      const previewPrompt = `${fullBodyPrefix} ${outfitBlock} ${instrumentBlock} ${propsBlock} ${descriptionBlock}. ${fullBodySuffix}`.replace(/\s+/g, " ").trim();

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
      // CRITICAL FIX: For AI-described characters (no uploaded photos), the preview image IS the
      // identity anchor. Write it to masterPortraitUrl so Character Lock™ has a face reference
      // to inject into WaveSpeed. Without this, masterPortraitUrl stays NULL and WaveSpeed
      // generates a different character in every scene.
      const isAiDescribedCharacter = photos.length === 0;
      await db.update(videoCharacters)
        .set({
          previewImageUrl: imageUrl,
          previewApproved: false,
          // For AI characters: set masterPortraitUrl immediately so Character Lock™ works
          ...(isAiDescribedCharacter ? { masterPortraitUrl: imageUrl } : {}),
          updatedAt: new Date(),
        })
        .where(eq(videoCharacters.id, input.characterId));

      if (isAiDescribedCharacter) {
        console.log(`[previewCharacter] AI character ${char.name}: masterPortraitUrl set to preview image for Character Lock™`);
      }
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

      // CRITICAL FIX: On approval, if this is an AI-described character (no photos),
      // ensure masterPortraitUrl is set to the approved previewImageUrl.
      // This is the definitive identity anchor for Character Lock™ in WaveSpeed.
      const photos = await db.select().from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.characterId, input.characterId));
      const isAiDescribedCharacter = photos.length === 0;
      const masterPortraitFix = isAiDescribedCharacter && char.previewImageUrl && !char.masterPortraitUrl
        ? { masterPortraitUrl: char.previewImageUrl }
        : {};

      await db.update(videoCharacters)
        .set({ previewApproved: true, ...masterPortraitFix, updatedAt: new Date() })
        .where(eq(videoCharacters.id, input.characterId));

      if (isAiDescribedCharacter && masterPortraitFix.masterPortraitUrl) {
        console.log(`[approveCharacterPreview] AI character ${char.name}: masterPortraitUrl locked from approved preview for Character Lock™`);
      }
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
      bodyBuild: z.enum(["slim", "lean", "average", "athletic", "stocky", "muscular"]).optional().default("average"),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");

      // Map bodyBuild to a natural-language phrase for the LLM brief and image prompt
      const bodyBuildPhrases: Record<string, string> = {
        slim:     "very slim, narrow frame, lean physique, slender build",
        lean:     "lean, toned physique, low body fat, athletic leanness",
        average:  "average build, typical physique",
        athletic: "athletic build, fit and muscular, well-defined physique",
        stocky:   "stocky build, broad frame, heavier-set physique",
        muscular: "very muscular, large frame, powerfully built physique",
      };
      const bodyBuildPhrase = bodyBuildPhrases[input.bodyBuild ?? "average"] ?? bodyBuildPhrases.average;

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
Expand the user's short character description into a detailed 80-120 word visual brief for a FULL-BODY STANDING SHOT.
Style: ${styleLabel} (${styleGuide[input.style]}).
Body build: ${bodyBuildPhrase}. The brief MUST reflect this body build accurately.
CRITICAL RULES — ALL MUST BE FOLLOWED:
- The brief MUST describe a FULL-BODY STANDING FIGURE visible from head to toe.
- MUST explicitly mention: legs, knees, calves, ankles, feet, and footwear (shoes/boots/trainers).
- MUST describe the bottom half of the outfit (trousers/jeans/skirt/shorts) AND the footwear.
- MUST include the phrase "full-length standing figure" or "full body from head to feet" in the brief.
- MUST describe the body build as: ${bodyBuildPhrase}.
- Be hyper-specific: exact colours, clothing details, hair style, body type, age, expression.
- NEVER describe only the face, head, or upper body. ALWAYS include the complete lower body.
- For animated styles: describe the character AS IF they are that animation style.
- For realistic: describe as a real person with precise physical details.
- Output: A single dense paragraph. No bullet points. No preamble.`,
          },
          {
            role: "user" as const,
            content: `Character name: ${input.name}${input.role ? `. Role: ${input.role}` : ""}.
Body build: ${bodyBuildPhrase}.
User description: "${input.description}"
Write the full visual brief now.`,
          },
        ],
      });

      const visualBrief = (briefResponse.choices[0]?.message?.content as string | undefined)?.trim() ?? input.description;

      // Step 2: Generate preview image — AGGRESSIVE full-body framing with embedded negative instructions
      // Forge API has no separate negative prompt field, so we embed DO NOT / NOT instructions directly
      const fbPrefix = `FULL BODY SHOT. FULL LENGTH. HEAD TO FEET. ENTIRE BODY VISIBLE. LEGS VISIBLE. FEET AND SHOES VISIBLE. Standing pose, full figure from top of head to bottom of feet. NOT a bust shot. NOT a portrait crop. NOT waist up. NOT chest up. The entire body must be in frame.`;
      const fbSuffix = `${bodyBuildPhrase}. Show the complete outfit: top AND bottom clothing AND footwear AND accessories. Both legs fully visible. Both feet and shoes/boots fully visible. Camera framed to show full standing figure. Vertical composition. Full-length portrait. 9:16 aspect ratio. DO NOT crop. DO NOT cut off legs. DO NOT cut off feet.`;
      const imagePrompt = input.style === "realistic"
        ? `${fbPrefix} Photorealistic full-body photo of ${input.name}${input.role ? `, ${input.role}` : ""}. ${visualBrief}. Neutral expression, soft studio lighting, plain neutral background, photorealistic, high detail, 8K. ${fbSuffix}`
        : `${fbPrefix} ${styleLabel} style full-body character art of ${input.name}${input.role ? `, ${input.role}` : ""}. ${visualBrief}. ${styleGuide[input.style]}. Centred composition, clean background, high quality render. ${fbSuffix}`;

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

  // Delete a job and all its scenes/characters (owner-only)
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
  analyseLyrics: protectedProcedure
    .input(z.object({
      lyrics: z.string(),
      genre: z.string().optional(),
      mood: z.string().optional(),
      style: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
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
  getInstrumentAssignments: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const characters = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)))
        .orderBy(videoCharacters.slotIndex);

      // Parse stored instrument analysis if available
      let instrumentAnalysis = null;
      const jobAny = job as Record<string, unknown>;
      if (jobAny.instrumentAnalysis) {
        try { instrumentAnalysis = JSON.parse(jobAny.instrumentAnalysis as string); } catch {}
      }

      // Build assignments from characters' lockedRole field (set during render)
      const assignments = characters.map(c => ({
        characterId: c.id,
        characterName: c.name,
        performanceRole: c.lockedRole ?? "Performer",
        slotIndex: c.slotIndex,
        isLocked: job.status === "rendering" || job.status === "assembling" || job.status === "completed",
      }));

      return {
        instrumentAnalysis,
        assignments,
        isLocked: job.status === "rendering" || job.status === "assembling" || job.status === "completed",
      };
    }),

  // Update a character's instrument role (only allowed before render starts)
  updateCharacterInstrument: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      characterId: z.number().int(),
      performanceRole: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Lock after render starts
      if (job.status === "rendering" || job.status === "assembling" || job.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Instrument roles are locked once rendering begins" });
      }

      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(videoCharacters)
        .set({ lockedRole: input.performanceRole, updatedAt: new Date() })
        .where(eq(videoCharacters.id, input.characterId));

      // Also clear cached instrument analysis so it gets re-run with new roles
      await db.update(musicVideoJobs)
        .set({ instrumentAnalysis: null, updatedAt: new Date() } as any)
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[MusicVideo] Character ${char.name} in job ${input.jobId} role updated to: ${input.performanceRole}`);
      return { success: true };
    }),

  // ── PUBLIC WATCH PAGE ──────────────────────────────────────────────────────
  // Toggle whether a completed video is publicly accessible/indexable by Google
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
      const { invokeLLM } = await import("../_core/llm");
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

  // Add a new blank scene to a job's storyboard
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
  providerHealth: protectedProcedure.query(async () => {
    const { checkAllProviders } = await import("../provider-health");
    return checkAllProviders();
  }),

  // List all jobs across all studios (for Projects page unified view)
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
        const { deductCredits } = await import("../credit-service");
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
        .set({ probePassed: true, probeApprovedAt: new Date(), updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, input.jobId));
      console.log(`[MusicVideo] Job ${input.jobId} probe APPROVED by user ${ctx.user.id} — full render released`);
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
          updatedAt: new Date(),
        })
        .where(eq(musicVideoJobs.id, input.jobId));
      console.log(`[MusicVideo] Job ${input.jobId} probe REJECTED by user ${ctx.user.id}. Reason: ${input.reason ?? "not specified"}. Probe will re-run on next heartbeat.`);
      return { success: true, message: "Probe rejected. A new probe scene will be dispatched on the next heartbeat tick." };
    }),

  // ─── Hedra Performance Mode Procedures ───────────────────────────────────────

  /**
   * Set a scene's type to 'cinematic' or 'performance'.
   * Performance scenes will use Hedra Avatar for lip sync instead of WaveSpeed + Sync Labs.
   */
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

      const { isHedraConfigured } = await import("../ai-apis/hedra-lipsync");
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
          const { waitForHedraLipSync } = await import("../ai-apis/hedra-lipsync");
          const { storagePut } = await import("../storage");
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
            aspectRatio: (job.aspectRatio === "9:16" ? "9:16" : job.aspectRatio === "1:1" ? "1:1" : "16:9") as "9:16" | "16:9" | "1:1",
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
});
