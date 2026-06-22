/**
 * preview-core.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared core for storyboard preview image generation.
 * Used by generateScenePreview, regenerateSingleScenePreview, and
 * regenerateAllScenePreviews so ALL paths go through the same full
 * 7-block prompt builder (identity, costume lock, location lock, etc.)
 * and the same Forge API → BFL fallback chain.
 *
 * Previously, the split-router regeneration procedures called
 * generateCinematicStoryboardImage directly — bypassing costume lock,
 * identity block, and face reference injection — which caused Zara to
 * appear in the wrong outfit (sleeveless dress instead of long-sleeve
 * square-neckline dress).
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../db";
import { musicVideoJobs, musicVideoScenes, videoCharacterPhotos, videoCharacters } from "../../../drizzle/schema";
import { withQuotaGuard } from "../../_core/quotaError";
import { withSelfHeal } from "../../_core/selfHeal";
import { generateImage } from "../../_core/imageGeneration";

// ── CANONICAL OUTFIT CONSTRAINTS ─────────────────────────────────────────────
// These are the single source of truth for character costume locks.
// Used by generateScenePreviewCore and any other code that builds storyboard prompts.
export const OUTFIT_CONSTRAINTS: Record<string, { positive: string[]; negative: string[] }> = {
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
  zara: {
    positive: [
      "long-sleeve fitted black mini dress with a square neckline — full-length sleeves, body-hugging fit, SHORT (above knee)",
      "knee-high black patent leather boots — shiny, structured, reaching the knee",
      "simple and elegant — NO accessories, NO jewellery, NO bag",
    ],
    negative: [
      "ABSOLUTELY NO sleeveless dress or thin straps — dress MUST have full-length sleeves",
      "ABSOLUTELY NO ankle boots — boots MUST be knee-high",
      "ABSOLUTELY NO PVC, vinyl, or latex material on the dress itself",
      "ABSOLUTELY NO low-cut neckline, deep neckline, or plunging neckline — neckline is a SQUARE cut",
      "ABSOLUTELY NO cleavage or chest exposure",
      "ABSOLUTELY NO gloves of any kind",
      "ABSOLUTELY NO sequins, embellishments, beading, or sparkle on the dress",
      "ABSOLUTELY NO lace, lace overlay, or lace trim",
      "ABSOLUTELY NO long dress or gown — dress must be SHORT (above knee)",
      "ABSOLUTELY NO different colour dress — dress is BLACK only",
      "ABSOLUTELY NO microphone stand — Zara does NOT use a microphone stand",
    ],
  },
};

/**
 * Shared core for scene preview generation — used by generateScenePreview,
 * regenerateSingleScenePreview, and regenerateAllScenePreviews so all paths
 * go through the same full 7-block prompt builder.
 *
 * Returns the generated imageUrl (string) or null on failure.
 * Throws on hard errors (TRPC errors, quota exceeded).
 */
export async function generateScenePreviewCore(opts: {
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  userId: number;
  jobId: number;
  sceneId: number;
  forceRegenerate?: boolean;
  previousSceneImageUrl?: string;
}): Promise<string | null> {
  const { db, userId, jobId, sceneId, forceRegenerate } = opts;

  const [job] = await db.select().from(musicVideoJobs)
    .where(and(eq(musicVideoJobs.id, jobId), eq(musicVideoJobs.userId, userId)));
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  const [scene] = await db.select().from(musicVideoScenes)
    .where(and(eq(musicVideoScenes.id, sceneId), eq(musicVideoScenes.jobId, jobId)));
  if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

  if (scene.previewImageUrl && !forceRegenerate) return scene.previewImageUrl;

  // Clear cached preview so UI shows loading state
  await db.update(musicVideoScenes)
    .set({ previewImageUrl: null, updatedAt: new Date() })
    .where(eq(musicVideoScenes.id, sceneId));

  const allJobCharacters = await db.select().from(videoCharacters)
    .where(and(eq(videoCharacters.jobId, jobId), eq(videoCharacters.userId, userId), isNull(videoCharacters.deletedAt)));

  let sceneCharNames: string[] = [];
  try {
    if (scene.characterAssignments) sceneCharNames = JSON.parse(scene.characterAssignments);
  } catch { /* ignore */ }

  const charByName = new Map(allJobCharacters.map(c => [c.name.toLowerCase(), c]));
  const sceneChars = sceneCharNames.length > 0
    ? sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean) as typeof allJobCharacters
    : [];

  // CRITICAL: never fall back to locked characters.
  // null/empty assignments = environment/atmosphere scene (no named character).
  const resolvedSceneChars = sceneChars;

  // Gather reference photos for scene-assigned characters
  const allPhotos = await db.select().from(videoCharacterPhotos)
    .where(eq(videoCharacterPhotos.jobId, jobId))
    .orderBy(desc(videoCharacterPhotos.isPrimary));
  const sceneCharIds = new Set(resolvedSceneChars.map(c => c.id));
  const referenceImages: Array<{ url: string; mimeType: string }> = [];
  for (const photo of allPhotos) {
    if (sceneCharIds.has(photo.characterId)) {
      referenceImages.push({ url: photo.photoUrl, mimeType: "image/jpeg" });
    }
  }

  const primaryCharForScene = resolvedSceneChars[0] ?? null;
  const bflCharRefUrl = primaryCharForScene
    ? (primaryCharForScene.masterPortraitUrl ?? (primaryCharForScene as any).environmentRefUrl ?? (primaryCharForScene as any).performanceRefUrl ?? primaryCharForScene.previewImageUrl ?? null)
    : null;

  // Build the scene prompt (user-edited prompts are used verbatim)
  let cleanScenePrompt = scene.prompt;
  if (!scene.userEditedPrompt && job.title) {
    const escapedTitle = job.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanScenePrompt = cleanScenePrompt.replace(new RegExp(`\\b${escapedTitle}\\b`, "gi"), "").replace(/\s{2,}/g, " ").trim();
  }

  // Detect scene type for character vs environment handling
  const p = cleanScenePrompt.toLowerCase();
  const isEnvironmentScene =
    resolvedSceneChars.length === 0 ||
    /\baer(?:ial|ials?)\b|\bbird'?s.?eye\b|\boverhead\b|\bdrone\s+shot\b/.test(p) ||
    /\bestablishing\b|\bwide\s+(?:venue|shot|view|angle)\b/.test(p) ||
    /\bcrane\s+shot\b|\bcrane\s+move\b|\bsoaring\s+through\b|\bfly.?through\b|\bfly.?past\b/.test(p) ||
    /\batmosphere\b|\bambient\b|\bno\s+people\b|\bno\s+performers\b/.test(p) ||
    /\bno\s+characters?\b|\bno\s+singer\b|\bno\s+vocalist\b/.test(p);

  const charCount = resolvedSceneChars.length;
  const sceneCharNamesStr = resolvedSceneChars.map(c => c.name).join(", ");
  const noCharacterNames = allJobCharacters.map(c => c.name).join(", ");

  const hardCountPrefix = !isEnvironmentScene
    ? (charCount === 1
      ? `CRITICAL SCENE RULE: ONLY ONE PERSON in this image — ${primaryCharForScene?.name ?? "the character"}. NO other people. NO background musicians. NO silhouettes.`
      : charCount > 1
        ? `CRITICAL SCENE RULE: ONLY ${charCount} people on stage. The ONLY people in this image are: ${sceneCharNamesStr}. NO additional musicians. NO background band members. EXACTLY ${charCount} people.`
        : "")
    : (allJobCharacters.length > 0
        ? `CRITICAL SCENE RULE: This is an ENVIRONMENTAL / ATMOSPHERIC shot — NO main characters appear in this scene. DO NOT include ${noCharacterNames} or any character resembling them. Show ONLY the environment, instruments, orchestra, or atmosphere as described.`
        : "");

  const identityLines = resolvedSceneChars
    .filter(c => c.isLocked && c.lockedDescription)
    .map(c => `${c.name} (${c.role || "musician"}): ${c.lockedDescription}`);
  const identityBlock = identityLines.length > 0
    ? `EXACT LIKENESS REQUIRED — ${identityLines.join(" | ")}. Preserve exact facial features, bone structure, eye colour, hairstyle, hair length, hair colour, facial hair, and skin tone from the reference photos.`
    : "";

  // ── COSTUME LOCK BLOCK ────────────────────────────────────────────────────────
  // Priority order for outfit data:
  //   1. characterVisualDetails.outfit (user-entered in Character Lock form)
  //   2. lockedOutfit JSON (set by normaliseCharacter)
  //   3. OUTFIT_CONSTRAINTS hardcoded dictionary (fallback for named characters)
  //   4. lockedDescription free-text (last resort)
  const costumeLockLines = resolvedSceneChars
    .filter(c => c.isLocked)
    .map(c => {
      const key = c.name.toLowerCase();

      // ── 1. User-entered outfit from characterVisualDetails ──────────────────
      // characterVisualDetails can be either a JSON string {"outfit":"..."} or a plain string
      let userOutfit: string | null = null;
      if (c.characterVisualDetails) {
        try {
          const vd = JSON.parse(c.characterVisualDetails);
          if (vd?.outfit && typeof vd.outfit === "string" && vd.outfit.trim().length > 3) {
            userOutfit = vd.outfit.trim();
          }
        } catch {
          // Plain string stored directly — use as-is if it looks like an outfit description
          const plain = c.characterVisualDetails.trim();
          if (plain.length > 3) userOutfit = plain;
        }
      }

      // ── 2. lockedOutfit JSON (user-entered in Character Lock "Outfit" field) ──
      // CRITICAL: This takes priority over hardcoded OUTFIT_CONSTRAINTS.
      // When the user explicitly sets an outfit in Character Lock, it MUST win.
      let lockedOutfitStr: string | null = null;
      if (c.lockedOutfit) {
        try {
          const lo = JSON.parse(c.lockedOutfit);
          // The frontend stores the outfit as {jacket: "outfit description"}
          // Extract all non-empty values and join them
          const parts = Object.values(lo).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
          if (parts.length > 0) lockedOutfitStr = parts.join(", ");
        } catch { /* ignore */ }
      }

      // ── 3. Hardcoded OUTFIT_CONSTRAINTS dictionary (last resort for named chars) ──
      // Only used when the user has NOT set any outfit in Character Lock.
      const constraints = (!lockedOutfitStr && !userOutfit) ? OUTFIT_CONSTRAINTS[key] : null;

      // ── 4. lockedDescription free-text fallback ─────────────────────────────
      const descFallback = c.lockedDescription ?? null;

      // Build the costume lock block from the best available source
      // Priority: lockedOutfit (user-entered) > userOutfit (visual details) > hardcoded > description
      console.log(`[OUTFIT DEBUG preview-core] ${c.name}: lockedOutfit=${c.lockedOutfit?.slice(0,60)}, lockedOutfitStr=${lockedOutfitStr?.slice(0,60)}, userOutfit=${userOutfit?.slice(0,40)}, constraints=${constraints ? 'yes' : 'no'}`);
      const primaryOutfit = lockedOutfitStr || userOutfit;
      if (primaryOutfit) {
        // User explicitly entered outfit — highest priority, use verbatim with strong enforcement
        return [
          `COSTUME LOCK — ${c.name} (MANDATORY — DO NOT DEVIATE):`,
          `${c.name} is wearing EXACTLY: ${primaryOutfit}`,
          `FINAL RULE: ${c.name}'s outfit MUST be: ${primaryOutfit}. DO NOT change any garment. DO NOT substitute. DO NOT add or remove items. This is the ONLY acceptable outfit.`,
        ].join("\n");
      } else if (constraints) {
        // Hardcoded constraints for known characters (only when user has set no outfit)
        const positiveList = constraints.positive.map(pos => `  + ${pos}`).join("\n");
        const negativeList = constraints.negative.map(neg => `  ${neg}`).join("\n");
        return [
          `COSTUME LOCK — ${c.name} (MANDATORY — DO NOT DEVIATE):`,
          `${c.name} is wearing:\n${positiveList}`,
          `${c.name} is ABSOLUTELY NOT wearing:\n${negativeList}`,
          `FINAL RULE: ${c.name}'s outfit MUST match the above in EVERY SCENE. The reference photo shows the EXACT outfit. DO NOT substitute any garment. DO NOT add gloves. DO NOT make the neckline lower.`,
        ].join("\n");
      } else if (descFallback) {
        // Last resort: inject the full lockedDescription which usually contains outfit info
        return `COSTUME LOCK — ${c.name}: Appearance is LOCKED. ${c.name} MUST look exactly like: ${descFallback}. DO NOT change the outfit, hair, or any visual detail.`;
      }
      return null;
    })
    .filter(Boolean);
  const costumeLockBlock = costumeLockLines.length > 0
    ? costumeLockLines.join("\n\n")
    : "";

  // ── BODY BUILD BLOCK ─────────────────────────────────────────────────────────
  const bodyBuildDescriptions: Record<string, string> = {
    slim: "slender, graceful figure with elegant slim silhouette — willowy and refined, pop-star elegance",
    lean: "lean, toned figure with athletic elegance — lithe, graceful, and beautifully proportioned",
    average: "graceful, healthy figure with natural elegance and beautiful proportions — radiant, poised, and photogenic, NOT generic or unflattering",
    athletic: "athletic, toned figure — strong and graceful, fit and elegant, beautifully defined",
    stocky: "strong, confident figure with powerful and commanding presence — poised and professionally presented",
    muscular: "strong, muscular figure — powerful and confident, commanding physique, elegantly presented",
    curvy: "curvaceous, confident figure with beautiful curves — glamorous, radiant, and elegantly proportioned",
    petite: "petite, delicate figure — graceful and refined, elegant small frame, beautifully proportioned",
  };
  const bodyBuildLines = resolvedSceneChars
    .filter(c => c.isLocked && c.bodyBuild)
    .map(c => `${c.name} has a ${bodyBuildDescriptions[c.bodyBuild ?? "average"] ?? c.bodyBuild} body type. Maintain this physique consistently. Present with pop-star poise and confidence.`);
  const bodyBuildBlock = bodyBuildLines.length > 0 ? bodyBuildLines.join("\n") : "";

  // ── PROPS / INSTRUMENTS BLOCK ─────────────────────────────────────────────────
  const propsLines = resolvedSceneChars
    .filter(c => c.isLocked && c.lockedProps)
    .map(c => {
      try {
        const lp = JSON.parse(c.lockedProps!);
        const parts = Object.values(lp).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
        if (parts.length > 0) return `${c.name} is holding/using: ${parts.join(", ")}. These props MUST appear in every scene.`;
      } catch { /* ignore */ }
      return null;
    })
    .filter(Boolean);
  const propsBlock = propsLines.length > 0 ? `PROPS LOCK:\n${propsLines.join("\n")}` : "";

  // ── POSITION BLOCK (read from lockedRules.position or characterVisualDetails.position) ────────
  // lockedPosition is not a DB column — it's stored inside lockedRules or characterVisualDetails
  const positionLines = resolvedSceneChars
    .filter(c => c.isLocked)
    .map(c => {
      // Try lockedRules.position first
      let pos: string | null = null;
      if (c.lockedRules) {
        try { const lr = JSON.parse(c.lockedRules); pos = lr.position ?? null; } catch { /* ignore */ }
      }
      // Try characterVisualDetails.position as fallback
      if (!pos && c.characterVisualDetails) {
        try { const vd = JSON.parse(c.characterVisualDetails); pos = vd.position ?? null; } catch { /* ignore */ }
      }
      return pos && pos.trim().length > 0
        ? `${c.name}'s position: ${pos.trim()}. Maintain this position unless the scene description explicitly overrides it.`
        : null;
    })
    .filter(Boolean);
  const positionBlock = positionLines.length > 0 ? `POSITION LOCK:\n${positionLines.join("\n")}` : "";

  // ── MUST-HAVE BLOCK ───────────────────────────────────────────────────────────
  const mustHaveLines = resolvedSceneChars
    .filter(c => c.isLocked && c.lockedRules)
    .flatMap(c => {
      try {
        const lr = JSON.parse(c.lockedRules!);
        const items: string[] = lr.mustHave ?? [];
        if (items.length > 0) return [`MUST HAVE for ${c.name} (MANDATORY — MUST appear in EVERY scene): ${items.join(", ")}.`];
      } catch { /* ignore */ }
      return [];
    });
  const mustHaveBlock = mustHaveLines.length > 0 ? mustHaveLines.join("\n") : "";

  // ── FORBIDDEN ITEMS (for negative prompt) ─────────────────────────────────────
  const forbiddenItems = resolvedSceneChars
    .filter(c => c.isLocked && c.lockedRules)
    .flatMap(c => {
      try {
        const lr = JSON.parse(c.lockedRules!);
        return (lr.forbidden ?? []) as string[];
      } catch { return []; }
    });
  // Also add OUTFIT_CONSTRAINTS negatives for known characters
  const outfitNegatives = resolvedSceneChars
    .filter(c => c.isLocked)
    .flatMap(c => {
      const key = c.name.toLowerCase();
      return OUTFIT_CONSTRAINTS[key]?.negative ?? [];
    });
  const allForbidden = Array.from(new Set([...forbiddenItems, ...outfitNegatives]));
  const negativePromptExtra = allForbidden.length > 0 ? allForbidden.join(", ") : "";
  const forbiddenBlock = allForbidden.length > 0
    ? `FORBIDDEN (MUST NOT appear in this image — NEVER include these): ${allForbidden.join(", ")}.`
    : "";

  const sceneBlock = scene.userEditedPrompt
    ? `DIRECTOR'S INSTRUCTION (HIGHEST PRIORITY — USE VERBATIM):\n${cleanScenePrompt}`
    : !isEnvironmentScene
      ? `SCENE DESCRIPTION:\n${cleanScenePrompt}\n\nCHARACTERS IN SCENE: ${sceneCharNamesStr || "none"}`
      : `SCENE DESCRIPTION (follow camera direction EXACTLY as written):\n${cleanScenePrompt}`;

  const { resolveVenueReferenceUrl, sceneSettingToVenueType: sToVenueType } = await import("../../music-video-service");
  const venueType = sToVenueType(job.sceneSetting);

  // ── LOCATION LOCK ─────────────────────────────────────────────────────────────
  let locationLockBlock = "";
  let venueRefUrl: string | null = null;
  if (job.venueLockedKey) {
    let dna: string | undefined;
    if (job.venueLockedKey === "custom") {
      dna = (job as any).venueCustomDNA ?? undefined;
    } else {
      const { getVenueInteriorDNA, VENUE_LIBRARY } = await import("../../venue-library.js");
      dna = getVenueInteriorDNA(job.venueLockedKey);
      // Use the real reference photo from the venue library if available
      const venueEntry = VENUE_LIBRARY.find((v: any) => v.key === job.venueLockedKey);
      if (venueEntry?.referenceImageUrl) {
        // Build the full URL using the deployed domain so the image API can fetch it
        const deployedBase = process.env.VITE_FRONTEND_FORGE_API_URL
          ? new URL(process.env.VITE_FRONTEND_FORGE_API_URL).origin
          : "https://aivideoplatform-aljhdnsu.manus.space";
        venueRefUrl = venueEntry.referenceImageUrl.startsWith("http")
          ? venueEntry.referenceImageUrl
          : `${deployedBase}${venueEntry.referenceImageUrl}`;
        console.log(`[generateScenePreviewCore] Scene ${sceneId}: Venue reference image -> ${venueRefUrl}`);
      }
    }
    if (!venueRefUrl) {
      // Try the hardcoded map first (instant, no API call)
      venueRefUrl = resolveVenueReferenceUrl(job.sceneSetting) ?? null;
    }
    if (!venueRefUrl && job.venueLockedDisplayName) {
      // Live SerpAPI Google Images search for the locked venue
      try {
        const { searchLocationReferenceImage } = await import("../../location-image-search.js");
        const liveResult = await searchLocationReferenceImage(job.venueLockedDisplayName);
        if (liveResult) {
          venueRefUrl = liveResult.url;
          console.log(`[generateScenePreviewCore] Scene ${sceneId}: Live venue image from ${liveResult.source} — ${liveResult.title}`);
        }
      } catch (searchErr) {
        console.warn(`[generateScenePreviewCore] Scene ${sceneId}: Live venue search failed — ${(searchErr as Error).message}`);
      }
    }
    if (dna) {
      locationLockBlock = `LOCATION LOCK (MANDATORY — EVERY SCENE MUST BE SET HERE):\n${dna}\n\nThis location is LOCKED. Every image MUST show this specific interior. DO NOT substitute any other venue, stage, or setting.`;
      console.log(`[generateScenePreviewCore] Scene ${sceneId}: Location Lock active — ${job.venueLockedDisplayName ?? job.venueLockedKey}`);
    }
  } else if (job.sceneSetting && job.sceneSetting.trim().length > 20) {
    locationLockBlock = `ENVIRONMENT CONTEXT (MANDATORY):\nThis scene is set inside: ${job.sceneSetting.trim()}\nThe background MUST reflect this environment. DO NOT use a plain grey or white studio background. Place the character inside this specific setting.`;
    // Also try live search for free-text scene settings
    try {
      const { searchLocationReferenceImage } = await import("../../location-image-search.js");
      const liveResult = await searchLocationReferenceImage(job.sceneSetting);
      if (liveResult) {
        venueRefUrl = liveResult.url;
        console.log(`[generateScenePreviewCore] Scene ${sceneId}: Live scene setting image from ${liveResult.source} — ${liveResult.title}`);
      }
    } catch (searchErr) {
      console.warn(`[generateScenePreviewCore] Scene ${sceneId}: Live scene setting search failed — ${(searchErr as Error).message}`);
    }
    console.log(`[generateScenePreviewCore] Scene ${sceneId}: sceneSetting fallback venue context injected`);
  }

  const finalPrompt = [
    // LOCATION LOCK first — gives maximum model weight to the background/environment
    locationLockBlock,
    hardCountPrefix,
    identityBlock,
    bodyBuildBlock,
    costumeLockBlock,
    propsBlock,
    positionBlock,
    mustHaveBlock,
    sceneBlock,
    forbiddenBlock,
    "NO visible text, logos, or band names. NO neon signs, banners, or typography.",
    "16:9 widescreen, high quality, professional photography, concert photography",
    "FRAMING: full head and body visible within frame, generous headroom above subject",
  ].filter(Boolean).join("\n\n");

  const jobAspectRatio = (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

  // ── FORGE API REFERENCE LIST ──────────────────────────────────────────────────
  const forgeRefs: Array<{ url: string; mimeType: string }> = [];
  if (!isEnvironmentScene) {
    const seenUrls = new Set<string>();
    for (const char of resolvedSceneChars) {
      const charPrimaryPhoto = allPhotos.find(ph => ph.characterId === char.id && ph.isPrimary) ??
                               allPhotos.find(ph => ph.characterId === char.id);
      const charRefUrl = char.masterPortraitUrl ?? charPrimaryPhoto?.photoUrl ?? char.previewImageUrl ?? null;
      if (charRefUrl && !seenUrls.has(charRefUrl)) {
        seenUrls.add(charRefUrl);
        const mime = charRefUrl.match(/\.png(\?|$)/i) ? "image/png" :
                     charRefUrl.match(/\.webp(\?|$)/i) ? "image/webp" : "image/jpeg";
        forgeRefs.push({ url: charRefUrl, mimeType: mime });
        const refSource = char.masterPortraitUrl ? "masterPortrait" : charPrimaryPhoto?.photoUrl ? "primaryPhoto" : "previewImageUrl";
        console.log(`[generateScenePreviewCore] Scene ${sceneId}: face ref for ${char.name} via ${refSource}`);
      }
    }
  }

  const hasFaceReference = forgeRefs.length > 0;
  console.log(`[generateScenePreviewCore] Scene ${sceneId}: charCount=${charCount}, isEnv=${isEnvironmentScene}, hasFaceRef=${hasFaceReference}, promptLen=${finalPrompt.length}`);

  let url: string | undefined;

  if (hasFaceReference) {
    // Forge API (InstantID / face-consistent generation) — with self-healing retry
    try {
      const { url: forgeUrl } = await withSelfHeal(
        () => withQuotaGuard(() => generateImage({
          prompt: finalPrompt,
          originalImages: forgeRefs,
        })),
        { maxAttempts: 3, baseDelayMs: 2000, label: `ForgeAPI(scene=${sceneId})` }
      );
      url = forgeUrl;
      console.log(`[generateScenePreviewCore] Scene ${sceneId}: Forge API result -> ${url ? url.slice(0, 80) + "..." : "null"}`);
    } catch (forgeErr: any) {
      console.error(`[generateScenePreviewCore] Scene ${sceneId}: Forge API failed after retries (${forgeErr?.message ?? String(forgeErr)}), falling back to BFL cinematic`);
    }
  }

  if (!url) {
    // BFL cinematic path: no face reference, Forge failed, or AI-generated character — with self-healing retry
    const { generateCinematicStoryboardImage } = await import("../../ai-apis/fal-image-gen");
    const bflCostumeLockBlock = costumeLockBlock
      ? costumeLockBlock.split('\n\n').map(block =>
          block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
        ).join(' ')
      : undefined;
    const { url: bflUrl } = await withSelfHeal(
      () => generateCinematicStoryboardImage({
        prompt: finalPrompt,
        aspectRatio: jobAspectRatio,
        storageKeyPrefix: `music-video-storyboard/${jobId}-scene-${sceneId}-cinematic`,
        venueReferenceUrl: venueRefUrl ?? undefined,
        characterReferenceUrl: bflCharRefUrl ?? undefined,
        characterLockBlock: bflCostumeLockBlock,
        sceneIndex: scene.sceneIndex ?? 0,
        sceneType: venueType,
      }),
      { maxAttempts: 3, baseDelayMs: 2000, label: `BFL-cinematic(scene=${sceneId})` }
    );
    url = bflUrl;
    console.log(`[generateScenePreviewCore] Scene ${sceneId}: BFL result -> ${url ? url.slice(0, 80) + "..." : "null"}`);
  }

  if (url) {
    await db.update(musicVideoScenes)
      .set({ previewImageUrl: url, updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));
    console.log(`[generateScenePreviewCore] Scene ${sceneId} saved -> ${url.slice(0, 80)}...`);
  }

  return url ?? null;
}
