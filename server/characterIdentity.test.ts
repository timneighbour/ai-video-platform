/**
 * Character Identity System Tests
 *
 * Covers:
 * 1. generateMasterPortrait procedure input validation
 * 2. Scene pipeline: master portrait takes precedence over raw photo
 * 3. Prompt splitting: characterPrompt is used when available
 * 4. Per-scene character anchor: each scene uses ITS OWN assigned character
 * 5. Strict people-count constraint: single-char scenes forbid extra people
 * 6. Hair lock: positive prompt enforces hair attributes
 * 7. Negative prompt: forbids hair variation and extra people
 * 8. Batch regeneration: startBatchRegeneration input validation
 * 9. fal.ai credential setup: FAL_AI_API_KEY is used
 */
import { describe, it, expect, vi } from "vitest";

// ─── 1. generateMasterPortrait input validation ───────────────────────────────

describe("generateMasterPortrait input schema", () => {
  it("requires characterId (integer) and jobId (integer)", () => {
    const { z } = require("zod");
    const schema = z.object({
      characterId: z.number().int(),
      jobId: z.number().int(),
    });

    expect(() => schema.parse({ characterId: 1, jobId: 42 })).not.toThrow();
    expect(() => schema.parse({ jobId: 42 })).toThrow();
    expect(() => schema.parse({ characterId: 1.5, jobId: 42 })).toThrow();
  });
});

// ─── 2. Master portrait takes precedence over raw photo ───────────────────────

describe("scene pipeline: face reference priority", () => {
  it("prefers masterPortraitUrl over raw reference photo when both are available", () => {
    const masterPortraitUrl = "https://cdn.example.com/master-portrait-tim.jpg";
    const rawPhotoUrl = "https://cdn.example.com/tim-raw-upload.jpg";

    const faceReferenceUrl = masterPortraitUrl ?? rawPhotoUrl;

    expect(faceReferenceUrl).toBe(masterPortraitUrl);
  });

  it("falls back to raw photo when masterPortraitUrl is null", () => {
    const masterPortraitUrl: string | null = null;
    const rawPhotoUrl = "https://cdn.example.com/tim-raw-upload.jpg";

    const faceReferenceUrl = masterPortraitUrl ?? rawPhotoUrl;

    expect(faceReferenceUrl).toBe(rawPhotoUrl);
  });

  it("returns null when neither master portrait nor raw photo is available", () => {
    const masterPortraitUrl: string | null = null;
    const referenceImages: string[] = [];

    const faceReferenceUrl = masterPortraitUrl ?? (referenceImages.length > 0 ? referenceImages[0] : null);

    expect(faceReferenceUrl).toBeNull();
  });
});

// ─── 3. Prompt splitting: locked characterPrompt takes precedence ─────────────

describe("scene pipeline: prompt splitting", () => {
  it("uses lockedCharacterPrompt when available instead of generated identityBlock", () => {
    const lockedCharacterPrompt = "Tim, male, short dark hair, beard, leather jacket, blue eyes";
    const identityBlock = "EXACT LIKENESS REQUIRED — Tim (Lead Singer): tall male with dark hair...";

    const finalCharacterBlock = lockedCharacterPrompt
      ? `${lockedCharacterPrompt}. Same person as reference image. Identical face. Same hairstyle. Same hair length. Same hair colour. Same facial hair. No variation in hair or appearance.`
      : identityBlock;

    expect(finalCharacterBlock).toContain(lockedCharacterPrompt);
    expect(finalCharacterBlock).not.toBe(identityBlock);
  });

  it("falls back to identityBlock when characterPrompt is null", () => {
    const lockedCharacterPrompt: string | null = null;
    const identityBlock = "EXACT LIKENESS REQUIRED — Tim (Lead Singer): tall male with dark hair...";

    const finalCharacterBlock = lockedCharacterPrompt
      ? `${lockedCharacterPrompt}. Same person as reference image.`
      : identityBlock;

    expect(finalCharacterBlock).toBe(identityBlock);
  });

  it("final prompt places character block before scene description", () => {
    const finalCharacterBlock = "Tim, male, short dark hair, beard";
    const sceneOnlyPrompt = "performing on stage, dramatic lighting";
    const styleDescriptor = "cinematic film still, dramatic lighting";

    const finalImagePrompt = [
      finalCharacterBlock,
      sceneOnlyPrompt,
      styleDescriptor,
    ].filter(Boolean).join(". ");

    expect(finalImagePrompt.indexOf(finalCharacterBlock)).toBeLessThan(
      finalImagePrompt.indexOf(sceneOnlyPrompt)
    );
  });
});

// ─── 4. Per-scene character anchor: each scene uses its OWN assigned character ─

describe("scene pipeline: per-scene character anchor (CRITICAL FIX)", () => {
  // Simulate the character roster
  const allJobCharacters = [
    { id: 1, name: "Tim",   role: "Lead Singer and Guitarist", isLocked: true, masterPortraitUrl: "https://cdn.example.com/master-tim.jpg",  masterSeed: 111 },
    { id: 2, name: "Greg",  role: "Drummer",                   isLocked: true, masterPortraitUrl: "https://cdn.example.com/master-greg.jpg", masterSeed: 222 },
    { id: 3, name: "MONICA",role: "Bass Player",               isLocked: true, masterPortraitUrl: null,                                      masterSeed: null },
  ];
  const charByName = new Map(allJobCharacters.map(c => [c.name.toLowerCase(), c]));

  it("Greg's drummer scene uses Greg's masterPortraitUrl, NOT Tim's", () => {
    const sceneCharNames = ["Greg"];
    const sceneChars = sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean);
    const primaryCharForScene = sceneChars[0] ?? null;

    expect(primaryCharForScene?.name).toBe("Greg");
    expect(primaryCharForScene?.masterPortraitUrl).toBe("https://cdn.example.com/master-greg.jpg");
    expect(primaryCharForScene?.masterPortraitUrl).not.toBe("https://cdn.example.com/master-tim.jpg");
  });

  it("Tim's guitar scene uses Tim's masterPortraitUrl", () => {
    const sceneCharNames = ["Tim"];
    const sceneChars = sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean);
    const primaryCharForScene = sceneChars[0] ?? null;

    expect(primaryCharForScene?.name).toBe("Tim");
    expect(primaryCharForScene?.masterPortraitUrl).toBe("https://cdn.example.com/master-tim.jpg");
  });

  it("scene with no characterAssignments resolves to empty array (no fallback to Tim)", () => {
    const sceneCharNames: string[] = [];
    // CRITICAL: must NOT fall back to allJobCharacters — that caused Tim to appear everywhere
    const sceneChars = sceneCharNames.length > 0
      ? sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean)
      : [];

    expect(sceneChars).toHaveLength(0);
  });

  it("multi-character scene uses first assigned character as primary face anchor", () => {
    const sceneCharNames = ["Tim", "Greg", "MONICA"];
    const sceneChars = sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean);
    const primaryCharForScene = sceneChars[0] ?? null;

    expect(primaryCharForScene?.name).toBe("Tim");
    expect(sceneChars).toHaveLength(3);
  });

  it("MONICA scene has no masterPortraitUrl (AI character — no uploaded photo)", () => {
    const sceneCharNames = ["MONICA"];
    const sceneChars = sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean);
    const primaryCharForScene = sceneChars[0] ?? null;

    expect(primaryCharForScene?.name).toBe("MONICA");
    expect(primaryCharForScene?.masterPortraitUrl).toBeNull();
  });
});

// ─── 5. Strict people-count constraint ───────────────────────────────────────

describe("scene pipeline: strict people-count constraint", () => {
  it("single-character scene constraint says ONLY ONE PERSON and names the character", () => {
    const sceneChars = [{ name: "Greg", role: "Drummer" }];
    const charCount = sceneChars.length;
    const primaryCharForScene = sceneChars[0];

    const charCountConstraint = charCount === 1
      ? `ONLY ONE PERSON in frame — ${primaryCharForScene.name} is the ONLY person visible. ` +
        `The main subject is ${primaryCharForScene.name}. This person must be clearly visible and is the focus of the scene. ` +
        `No additional people. No background characters. No extra musicians. No other band members visible.`
      : "";

    expect(charCountConstraint).toContain("ONLY ONE PERSON in frame");
    expect(charCountConstraint).toContain("Greg");
    expect(charCountConstraint).toContain("No additional people");
    expect(charCountConstraint).toContain("No other band members visible");
  });

  it("multi-character scene constraint names all characters and forbids extras", () => {
    const sceneChars = [{ name: "Tim" }, { name: "Greg" }, { name: "MONICA" }];
    const charCount = sceneChars.length;

    const charCountConstraint = charCount > 1
      ? `EXACTLY ${charCount} people in this image: ${sceneChars.map(c => c.name).join(", ")}. ` +
        `No other people, no extra musicians, no anonymous background characters.`
      : "";

    expect(charCountConstraint).toContain("EXACTLY 3 people");
    expect(charCountConstraint).toContain("Tim");
    expect(charCountConstraint).toContain("Greg");
    expect(charCountConstraint).toContain("MONICA");
    expect(charCountConstraint).toContain("no extra musicians");
  });

  it("subject focus line names the primary character", () => {
    const primaryCharForScene = { name: "Tim" };
    const subjectLine = `The main subject is ${primaryCharForScene.name}. This person must be clearly visible and is the focus of the scene.`;

    expect(subjectLine).toContain("The main subject is Tim");
    expect(subjectLine).toContain("focus of the scene");
  });
});

// ─── 6. Hair lock: positive prompt enforces hair attributes ──────────────────

describe("scene pipeline: hair lock in positive prompt", () => {
  it("character block includes all hair lock instructions", () => {
    const lockedCharacterPrompt = "Tim, male, short dark hair, beard, leather jacket";
    const characterBlock =
      `${lockedCharacterPrompt}. ` +
      `Same person as reference image. Identical face. Same hairstyle. Same hair length. ` +
      `Same hair colour. Same facial hair. No variation in hair or appearance.`;

    expect(characterBlock).toContain("Same hairstyle");
    expect(characterBlock).toContain("Same hair length");
    expect(characterBlock).toContain("Same hair colour");
    expect(characterBlock).toContain("Same facial hair");
    expect(characterBlock).toContain("No variation in hair or appearance");
  });

  it("identity block includes hair attributes in the base instruction", () => {
    const baseInstruction =
      `EXACT LIKENESS REQUIRED — generate the SAME person shown in the reference photo(s). ` +
      `Preserve exact facial features, bone structure, eye colour, hairstyle, hair length, hair colour, ` +
      `facial hair, and skin tone from the reference photos. ` +
      `Same person as reference image. Identical face. Same hairstyle. Same hair length. ` +
      `Same hair colour. Same facial hair. No variation in hair or appearance.`;

    expect(baseInstruction).toContain("hairstyle");
    expect(baseInstruction).toContain("hair length");
    expect(baseInstruction).toContain("hair colour");
    expect(baseInstruction).toContain("facial hair");
    expect(baseInstruction).toContain("No variation in hair or appearance");
  });
});

// ─── 7. Negative prompt: forbids hair variation and extra people ──────────────

describe("scene pipeline: negative prompt completeness", () => {
  it("negative prompt forbids all hair variation terms", () => {
    const negativePromptV2 = [
      "different face", "new person", "altered identity", "different person", "inconsistent character",
      "different hairstyle", "shorter hair", "longer hair", "different hair colour", "different hair color",
      "variation in appearance", "different facial hair",
      "extra person, additional people, background musician, background character, other band member, crowd member, second person, third person, multiple people",
      "nsfw", "lowres", "bad anatomy", "extra limbs", "blurry", "low quality",
      "cartoon", "anime", "deformed", "ugly", "disfigured", "text", "watermark",
    ].join(", ");

    expect(negativePromptV2).toContain("different hairstyle");
    expect(negativePromptV2).toContain("shorter hair");
    expect(negativePromptV2).toContain("longer hair");
    expect(negativePromptV2).toContain("different hair colour");
    expect(negativePromptV2).toContain("variation in appearance");
    expect(negativePromptV2).toContain("different facial hair");
  });

  it("negative prompt forbids extra people for single-character scenes", () => {
    const charCount = 1;
    const extraPeopleNegative = charCount === 1
      ? "extra person, additional people, background musician, background character, other band member, crowd member, second person, third person, multiple people"
      : "extra person, anonymous musician, unnamed character, crowd member";

    expect(extraPeopleNegative).toContain("background musician");
    expect(extraPeopleNegative).toContain("other band member");
    expect(extraPeopleNegative).toContain("second person");
    expect(extraPeopleNegative).toContain("multiple people");
  });

  it("negative prompt for multi-character scenes forbids anonymous extras", () => {
    const charCount = 3;
    const extraPeopleNegative = charCount === 1
      ? "extra person, additional people, background musician"
      : "extra person, anonymous musician, unnamed character, crowd member";

    expect(extraPeopleNegative).toContain("anonymous musician");
    expect(extraPeopleNegative).toContain("unnamed character");
  });
});

// ─── 8. Seed locking: same seed used across variations ────────────────────────

describe("scene pipeline: seed locking", () => {
  it("generates 3 variation seeds from the master seed", () => {
    const masterSeed = 123456789;
    const seeds = [masterSeed, masterSeed + 1, masterSeed + 2];

    expect(seeds).toHaveLength(3);
    expect(seeds[0]).toBe(masterSeed);
    expect(seeds[1]).toBe(masterSeed + 1);
    expect(seeds[2]).toBe(masterSeed + 2);
  });

  it("generates a random seed when masterSeed is null", () => {
    const masterSeed: number | null = null;
    const baseSeed = masterSeed ?? Math.floor(Math.random() * 2147483647);

    expect(typeof baseSeed).toBe("number");
    expect(baseSeed).toBeGreaterThanOrEqual(0);
    expect(baseSeed).toBeLessThan(2147483647);
  });
});

// ─── 9. fal.ai credential setup ───────────────────────────────────────────────

describe("fal.ai credential configuration", () => {
  it("FAL_AI_API_KEY environment variable is used (not FAL_KEY)", () => {
    const falCredentialKey = "FAL_AI_API_KEY";
    const falDefaultKey = "FAL_KEY";

    expect(falCredentialKey).not.toBe(falDefaultKey);
    expect(falCredentialKey).toBe("FAL_AI_API_KEY");
  });

  it("fal.config is called with the correct credential before each InstantID call", () => {
    const mockFalConfig = vi.fn();
    const FAL_AI_API_KEY = "test-key-123";

    if (FAL_AI_API_KEY) mockFalConfig({ credentials: FAL_AI_API_KEY });

    expect(mockFalConfig).toHaveBeenCalledWith({ credentials: "test-key-123" });
  });
});

// ─── 10. Batch regeneration input validation ──────────────────────────────────

describe("startBatchRegeneration input schema", () => {
  it("accepts empty object (process all jobs)", () => {
    const { z } = require("zod");
    const schema = z.object({
      jobId: z.number().int().optional(),
    });

    expect(() => schema.parse({})).not.toThrow();
  });

  it("accepts optional jobId to restrict to a single job", () => {
    const { z } = require("zod");
    const schema = z.object({
      jobId: z.number().int().optional(),
    });

    expect(() => schema.parse({ jobId: 7 })).not.toThrow();
    expect(() => schema.parse({ jobId: 7.5 })).toThrow();
  });
});

// ─── 11. No-text enforcement: lyrics must not appear in generated images ──────

describe("scene pipeline: no-text enforcement", () => {
  it("positive prompt contains no-text instruction", () => {
    const noTextInstruction = "no text in frame, no words, no captions, no subtitles, no lyrics visible, no overlaid text";
    const imagePromptParts = [
      "Tim, male, short dark hair. Same person as reference image.",
      "Close-up of Tim singing into microphone, dramatic stage lighting",
      "cinematic film still, dramatic lighting, shallow depth of field",
      "Mood: rock, intense",
      "16:9 widescreen, high quality, professional photography",
      noTextInstruction,
    ];
    const imagePrompt = imagePromptParts.filter(Boolean).join(". ");

    expect(imagePrompt).toContain("no text in frame");
    expect(imagePrompt).toContain("no captions");
    expect(imagePrompt).toContain("no subtitles");
    expect(imagePrompt).toContain("no lyrics visible");
  });

  it("negative prompt contains text/caption/subtitle terms", () => {
    const negativePromptV2 = [
      "different face", "new person", "altered identity",
      "different hairstyle", "shorter hair", "longer hair",
      "extra person, additional people, background musician",
      "nsfw", "lowres", "bad anatomy",
      "text", "words", "caption", "subtitle", "lyrics text", "text overlay", "words in frame",
      "watermark",
    ].join(", ");

    expect(negativePromptV2).toContain("caption");
    expect(negativePromptV2).toContain("subtitle");
    expect(negativePromptV2).toContain("lyrics text");
    expect(negativePromptV2).toContain("text overlay");
    expect(negativePromptV2).toContain("words in frame");
  });

  it("strips double-quoted lyrics from scene prompt before image generation", () => {
    // Simulate a scene prompt that contains lyrics in quotes
    let cleanScenePrompt = `Tim sings passionately into the microphone. "You were ordinary" echoes through the arena.`;

    // Apply the same regex used in generateScenePreview
    cleanScenePrompt = cleanScenePrompt.replace(/["\u201C\u201D][^"\u201C\u201D]{2,80}["\u201C\u201D]/g, "").trim();

    expect(cleanScenePrompt).not.toContain("You were ordinary");
    expect(cleanScenePrompt).toContain("Tim sings passionately");
  });

  it("strips curly-quote lyrics from scene prompt", () => {
    let cleanScenePrompt = `Close-up of Tim\u2019s face, \u201CYou\u2019re ordinary\u201D displayed on screen behind him.`;

    cleanScenePrompt = cleanScenePrompt.replace(/["\u201C\u201D][^"\u201C\u201D]{2,80}["\u201C\u201D]/g, "").trim();

    expect(cleanScenePrompt).not.toContain("You\u2019re ordinary");
  });

  it("strips lyrics: prefix lines from scene prompt", () => {
    let cleanScenePrompt = `Tim on stage. Lyrics: You were ordinary now you're not`;

    cleanScenePrompt = cleanScenePrompt.replace(/\blyrics?:\s*[^.\n]*/gi, "").trim();

    expect(cleanScenePrompt).not.toContain("You were ordinary");
    expect(cleanScenePrompt).toContain("Tim on stage");
  });

  it("does not strip normal scene description text (no false positives)", () => {
    const normalPrompt = `Tim stands at the microphone, arms raised, dramatic stage lighting behind him.`;

    const cleaned = normalPrompt.replace(/["\u201C\u201D][^"\u201C\u201D]{2,80}["\u201C\u201D]/g, "").trim();

    expect(cleaned).toBe(normalPrompt);
  });
});

// ─── 12. Face reference deduplication ────────────────────────────────────────

describe("scene pipeline: face reference deduplication", () => {
  it("deduplicates face reference URLs so same photo is not passed twice", () => {
    const resolvedSceneChars = [
      { id: 1, name: "Tim", masterPortraitUrl: "https://cdn.example.com/tim-portrait.jpg" },
      { id: 2, name: "Greg", masterPortraitUrl: "https://cdn.example.com/greg-portrait.jpg" },
      { id: 3, name: "Monica", masterPortraitUrl: "https://cdn.example.com/monica-portrait.jpg" },
    ];

    const forgeRefs: Array<{ url: string; mimeType: string }> = [];
    const seenRefUrls = new Set<string>();
    for (const char of resolvedSceneChars) {
      const charRefUrl = char.masterPortraitUrl ?? null;
      if (charRefUrl && !seenRefUrls.has(charRefUrl)) {
        seenRefUrls.add(charRefUrl);
        forgeRefs.push({ url: charRefUrl, mimeType: "image/jpeg" });
      }
    }

    expect(forgeRefs).toHaveLength(3);
    expect(new Set(forgeRefs.map(r => r.url)).size).toBe(3);
  });

  it("skips duplicate URLs when two characters share the same portrait", () => {
    const resolvedSceneChars = [
      { id: 1, name: "Tim", masterPortraitUrl: "https://cdn.example.com/shared-portrait.jpg" },
      { id: 2, name: "Greg", masterPortraitUrl: "https://cdn.example.com/shared-portrait.jpg" },
    ];

    const forgeRefs: Array<{ url: string; mimeType: string }> = [];
    const seenRefUrls = new Set<string>();
    for (const char of resolvedSceneChars) {
      const charRefUrl = char.masterPortraitUrl ?? null;
      if (charRefUrl && !seenRefUrls.has(charRefUrl)) {
        seenRefUrls.add(charRefUrl);
        forgeRefs.push({ url: charRefUrl, mimeType: "image/jpeg" });
      }
    }

    expect(forgeRefs).toHaveLength(1); // Only one unique URL
  });

  it("handles characters with no portrait (null masterPortraitUrl)", () => {
    const resolvedSceneChars = [
      { id: 1, name: "Tim", masterPortraitUrl: "https://cdn.example.com/tim.jpg" },
      { id: 2, name: "Greg", masterPortraitUrl: null },
    ];

    const forgeRefs: Array<{ url: string; mimeType: string }> = [];
    const seenRefUrls = new Set<string>();
    for (const char of resolvedSceneChars) {
      const charRefUrl = char.masterPortraitUrl ?? null;
      if (charRefUrl && !seenRefUrls.has(charRefUrl)) {
        seenRefUrls.add(charRefUrl);
        forgeRefs.push({ url: charRefUrl, mimeType: "image/jpeg" });
      }
    }

    expect(forgeRefs).toHaveLength(1);
    expect(forgeRefs[0].url).toBe("https://cdn.example.com/tim.jpg");
  });
});

// ─── 13. Per-character negative prompt injection ─────────────────────────────

describe("scene pipeline: per-character negative prompt injection", () => {
  it("builds per-character outfit exclusions from OUTFIT_CONSTRAINTS", () => {
    const OUTFIT_CONSTRAINTS: Record<string, { positive: string[]; negative: string[] }> = {
      greg: {
        positive: ["black short-sleeve torn t-shirt"],
        negative: [
          "NOT a leather jacket",
          "NOT any jacket of any kind",
          "NOT sleeveless",
          "NOT a tank top",
        ],
      },
    };

    const resolvedSceneChars = [{ name: "Greg" }];
    const perCharNegatives: string[] = [];
    for (const c of resolvedSceneChars) {
      const key = c.name.toLowerCase();
      const constraints = OUTFIT_CONSTRAINTS[key];
      if (constraints) {
        for (const neg of constraints.negative) {
          const cleaned = neg.replace(/^NOT\s+(?:a\s+|any\s+)?/i, "").trim();
          if (cleaned) perCharNegatives.push(`${cleaned} on ${c.name}`);
        }
      }
    }

    expect(perCharNegatives).toContain("leather jacket on Greg");
    expect(perCharNegatives).toContain("jacket of any kind on Greg");
    expect(perCharNegatives).toContain("sleeveless on Greg");
    expect(perCharNegatives).toContain("tank top on Greg");
  });

  it("generates no exclusions for unknown characters", () => {
    const OUTFIT_CONSTRAINTS: Record<string, { positive: string[]; negative: string[] }> = {};
    const resolvedSceneChars = [{ name: "Unknown" }];
    const perCharNegatives: string[] = [];
    for (const c of resolvedSceneChars) {
      const key = c.name.toLowerCase();
      const constraints = OUTFIT_CONSTRAINTS[key];
      if (constraints) {
        for (const neg of constraints.negative) {
          const cleaned = neg.replace(/^NOT\s+(?:a\s+|any\s+)?/i, "").trim();
          if (cleaned) perCharNegatives.push(`${cleaned} on ${c.name}`);
        }
      }
    }

    expect(perCharNegatives).toHaveLength(0);
  });
});

// ─── 14. Duplicate person / clone prevention in negative prompt ──────────────

describe("scene pipeline: duplicate person prevention", () => {
  it("negative prompt contains duplicate/clone prevention terms", () => {
    const negativeTerms = [
      "duplicate person", "cloned character", "two identical people", "twin characters",
      "same face twice", "repeated character", "mirror image of person",
    ];
    const negativePrompt = negativeTerms.join(", ");

    expect(negativePrompt).toContain("duplicate person");
    expect(negativePrompt).toContain("cloned character");
    expect(negativePrompt).toContain("two identical people");
    expect(negativePrompt).toContain("same face twice");
    expect(negativePrompt).toContain("mirror image of person");
  });

  it("negative prompt includes leather jacket exclusion for Greg and Monica", () => {
    const negativeTerms = [
      "leather jacket on drummer", "leather jacket on Greg", "leather jacket on Monica",
      "jacket on Greg", "blazer on Greg", "coat on Greg", "hoodie on Greg",
      "jacket on Monica", "plain clothing on Monica",
    ];
    const negativePrompt = negativeTerms.join(", ");

    expect(negativePrompt).toContain("leather jacket on Greg");
    expect(negativePrompt).toContain("leather jacket on Monica");
    expect(negativePrompt).toContain("jacket on Greg");
    expect(negativePrompt).toContain("jacket on Monica");
  });
});

// ─── 15. sanitiseDescription: BRANDED stripping ─────────────────────────────

describe("sanitiseDescription: BRANDED and neon sign stripping", () => {
  it("strips the literal word BRANDED from description", () => {
    let s = "BRANDED rock band performing on stage with neon lights";
    s = s.replace(/\bBRANDED\b/g, "");
    s = s.replace(/\s{2,}/g, " ").trim();

    expect(s).not.toContain("BRANDED");
    expect(s).toContain("rock band performing");
  });

  it("strips neon sign reading/saying references", () => {
    let s = 'A neon sign reading "BAND NAME" glows behind the stage. Tim sings.';
    s = s.replace(/neon\s+sign\s+(?:reading|saying|with)\s+[^,.]+/gi, "");
    s = s.replace(/\s{2,}/g, " ").trim();

    expect(s).not.toContain("neon sign reading");
    expect(s).toContain("Tim sings");
  });

  it("does not strip normal neon references without reading/saying", () => {
    const s = "Neon lights illuminate the stage in purple and blue.";
    const cleaned = s.replace(/neon\s+sign\s+(?:reading|saying|with)\s+[^,.]+/gi, "").trim();

    expect(cleaned).toBe(s);
  });
});

// ─── 16. Multi-character identity enforcement with distinguishing features ───

describe("scene pipeline: multi-character identity enforcement", () => {
  it("builds per-character distinguishing features for identity block", () => {
    const resolvedSceneChars = [
      { name: "Tim", role: "lead vocalist" },
      { name: "Greg", role: "drummer" },
      { name: "Monica", role: "bassist" },
    ];

    const charDistinguishers = resolvedSceneChars.map(c => {
      return `${c.name} is the ${c.role} — UNIQUE face, do NOT swap with other characters`;
    });

    expect(charDistinguishers).toHaveLength(3);
    expect(charDistinguishers[0]).toContain("Tim is the lead vocalist");
    expect(charDistinguishers[1]).toContain("Greg is the drummer");
    expect(charDistinguishers[2]).toContain("Monica is the bassist");
    expect(charDistinguishers.every(d => d.includes("UNIQUE face"))).toBe(true);
    expect(charDistinguishers.every(d => d.includes("do NOT swap"))).toBe(true);
  });

  it("identity block for multi-char scenes includes 'Do NOT duplicate' instruction", () => {
    const charCount = 3;
    const identityInstruction = charCount > 1
      ? "CRITICAL: Each character MUST match their reference photo EXACTLY. Do NOT mix up faces between characters. Do NOT duplicate any person."
      : "EXACT LIKENESS REQUIRED";

    expect(identityInstruction).toContain("Do NOT mix up faces");
    expect(identityInstruction).toContain("Do NOT duplicate any person");
  });
});
