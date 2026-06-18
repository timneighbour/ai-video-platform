/**
 * Music Video — Character sub-router
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

export const musicVideoCharacterRouter = router({
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
      // If no characters are resolved at all, generate a generic cinematic scene without a face anchor.
      // This prevents scenes from silently failing and showing 'No preview' when the LLM omitted
      // character assignments for purely instrumental or wide-shot scenes.
      const noCharacterFallback = resolvedSceneChars.length === 0;

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
      // For non-character scenes: honour the scene description's own camera direction verbatim
      // (do NOT inject a character-focused CAMERA_ANGLES entry — that overrides the wide/establishing shot)
      const sceneBlock = scene.userEditedPrompt
        ? `DIRECTOR'S INSTRUCTION (HIGHEST PRIORITY — USE VERBATIM):\n${cleanScenePrompt}\n\n` +
          (isCharacterScene ? `CHARACTERS IN SCENE: ${sceneCharNamesStr}\n\nCAMERA: ${cameraAngle}\nRULE: Faces of all characters MUST be clearly visible regardless of shot type` : ``)
        : isCharacterScene
          ? `SCENE DESCRIPTION:\n${cleanScenePrompt}\n\n` +
            `CHARACTERS IN SCENE: ${sceneCharNamesStr}\n\n` +
            `CAMERA: ${cameraAngle}\n` +
            `RULE: Faces of all characters MUST be clearly visible regardless of shot type`
          : `SCENE DESCRIPTION (follow camera direction EXACTLY as written):\n${cleanScenePrompt}`;

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
        "cropped head", "cut off head", "missing top of head", "head out of frame",
        "head cropped at top", "partial head", "truncated head", "forehead cut off",
        "top of skull missing", "hair cut off at top",
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
      // For non-character/environmental scenes: inject a strong negative to prevent AI adding figures
      const noCharacterNames = allJobCharacters.map(c => c.name).join(", ");
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
        : (allJobCharacters.length > 0
            ? `CRITICAL SCENE RULE: This is an ENVIRONMENTAL / ATMOSPHERIC shot — NO main characters appear in this scene. ` +
              `DO NOT include ${noCharacterNames} or any character resembling them. ` +
              `NO named performers. NO solo figures standing at a microphone. ` +
              `Show ONLY the environment, instruments, orchestra, or atmosphere as described.`
            : "");      // ── CONTINUITY BLOCK (scenes after the first) ──────────────────────────
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
        "FRAMING: full head and body visible within frame, generous headroom above subject, subject fully contained within shot, no cropped heads",
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
          assertSafeUrl(input.previousSceneImageUrl); // ISS-033: SSRF guard
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
                // Use the job's actual aspect ratio — never hardcode. Music videos are widescreen.
                exportAspectRatio: (job.aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9") ?? "16:9",
                numInferenceSteps: 25,   // Slightly above default for better quality
                negativePrompt: [
                  "different person", "different face", "different hair colour", "different eye colour",
                  "inconsistent character", "face swap", "multiple people", "blurry face",
                  "distorted face", "low quality", "watermark", "text", "logo",
                  "cropped head", "cut off head", "missing top of head", "head out of frame",
                  "head cropped", "partial head", "truncated",
                ].join(", "),
              });
              url = pulidResult.url;
              console.log(`[generateScenePreview] Flux PuLID success for scene ${input.sceneId}: ${url?.slice(0, 80)}...`);
            } catch (pulidErr) {
              const pulidMsg = pulidErr instanceof Error ? pulidErr.message : String(pulidErr);
              console.warn(`[generateScenePreview] Flux PuLID failed for scene ${input.sceneId}, falling back to Flux cinematic (aspect-ratio-correct): ${pulidMsg}`);
              // CRITICAL: use generateCinematicStoryboardImage so the fallback is also at the correct
              // aspect ratio (e.g. 16:9 = 1344×768). Forge generateImage does not enforce aspect ratio.
              const { generateCinematicStoryboardImage: genCinematicFallback } = await import("../../ai-apis/fal-image-gen");
              const fallbackResult = await withQuotaGuard(() => genCinematicFallback({
                prompt: finalImagePrompt,
                aspectRatio: (job.aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9") ?? "16:9",
                storageKeyPrefix: `music-video-storyboard/${input.jobId}-scene-${input.sceneId}-pulid-fallback`,
                venueReferenceUrl: referenceImages[0]?.url,
              }));
              url = fallbackResult.url;
            }
          } else {
            // No portrait available or no FAL_AI_API_KEY — use Flux for aspect-ratio-correct generation
            if (!aiPortraitUrl) console.warn(`[generateScenePreview] Scene ${input.sceneId}: AI character has no portrait — face will not be locked`);
            if (!process.env.FAL_AI_API_KEY) console.warn(`[generateScenePreview] Scene ${input.sceneId}: FAL_AI_API_KEY not set — cannot use Flux PuLID`);
            if (referenceImages.length > 0) {
              // Has reference photos — use Flux with the first reference as a visual anchor.
              // CRITICAL: must use generateCinematicStoryboardImage so the output is at the
              // correct aspect ratio (e.g. 16:9 = 1344×768). Forge does not enforce aspect ratio.
              const { generateCinematicStoryboardImage: genCinematic } = await import("../../ai-apis/fal-image-gen");
              const cinematicResult = await withQuotaGuard(() => genCinematic({
                prompt: finalImagePrompt,
                aspectRatio: (job.aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9") ?? "16:9",
                storageKeyPrefix: `music-video-storyboard/${input.jobId}-scene-${input.sceneId}-cinematic`,
                venueReferenceUrl: referenceImages[0]?.url, // anchor to first character reference
              }));
              url = cinematicResult.url;
            } else {
              // No reference images — use Flux for correct aspect ratio (no cropping)
              const { generateCinematicStoryboardImage: genCinematic } = await import("../../ai-apis/fal-image-gen");
              const cinematicResult = await withQuotaGuard(() => genCinematic({
                prompt: finalImagePrompt,
                aspectRatio: (job.aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9") ?? "16:9",
                storageKeyPrefix: `music-video-storyboard/${input.jobId}-scene-${input.sceneId}`,
              }));
              url = cinematicResult.url;
            }
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
            const { invokeLLM: invokeLLMOutfit } = await import("../../_core/llm");
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
                // CRITICAL: use generateCinematicStoryboardImage for outfit retries too —
                // Forge does not enforce aspect ratio, causing square/portrait images for 16:9 jobs.
                const { generateCinematicStoryboardImage: genOutfitRetry } = await import("../../ai-apis/fal-image-gen");
                const refUrl = hasFaceReference
                  ? (hoistedForgeRefs[0]?.url ?? referenceImages[0]?.url)
                  : referenceImages[0]?.url;
                const { url: retryUrl } = await withQuotaGuard(() => genOutfitRetry({
                  prompt: retryPrompt,
                  aspectRatio: (job.aspectRatio as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9") ?? "16:9",
                  storageKeyPrefix: `music-video-storyboard/${input.jobId}-scene-${input.sceneId}-outfit-retry`,
                  venueReferenceUrl: refUrl,
                }));
                if (retryUrl) { currentUrl = retryUrl; url = retryUrl; }
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

      const { invokeLLM } = await import("../../_core/llm");
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

      // ── Auto-Preparation Stage 1 (non-blocking, background) ─────────────────
      // Immediately kick off generation of performance, medium-shot, and cinematic
      // reference images. The user never waits for this — it runs silently in the
      // background and is ready by the time scene dispatch begins.
      const masterPortraitForPrep = masterPortraitFix.masterPortraitUrl ?? char.masterPortraitUrl;
      runStage1AutoPrep({
        characterId: input.characterId,
        identityBrief: char.lockedDescription ?? char.characterPrompt ?? char.name,
        characterName: char.name,
        masterPortraitUrl: masterPortraitForPrep ?? null,
      }).catch((err) => {
        console.error(`[approveCharacterPreview] Stage 1 auto-prep failed for char ${input.characterId}:`, err);
      });
      console.log(`[approveCharacterPreview] Stage 1 auto-prep triggered for char ${char.name} (${input.characterId})`);

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
      const { invokeLLM } = await import("../../_core/llm");

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
      const { invokeLLM } = await import("../../_core/llm");
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
});
