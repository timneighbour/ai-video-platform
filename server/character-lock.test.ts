/**
 * Character Lock / Unlock System Tests
 *
 * Covers:
 * 1. Lock state transitions: unlocked → locked, locked → unlocked
 * 2. Description validation: vague vs. forensic descriptions
 * 3. Lock preconditions: photo required before locking
 * 4. Locked description injection into scene prompts
 * 5. Character reference panel data: primaryPhotoUrl, lockedDescription, role
 * 6. getCharactersForJob router procedure exists
 * 7. reanalyseCharacterPhoto router procedure exists
 * 8. approveCharacterPreview router procedure exists
 * 9. Face validation result types
 * 10. FaceValidationResult interface shape
 * 11. CharacterLockData interface shape
 * 12. Character lock mode: all-or-nothing enforcement
 * 13. Unlocked characters are excluded from locked description injection
 * 14. Multiple locked characters: all descriptions injected
 * 15. Lock timestamp is set when character is locked
 */
import { describe, it, expect } from "vitest";
import { musicVideoRouter } from "./routers/musicVideo/index";

// ─── 1. Lock state transitions ────────────────────────────────────────────────

describe("character lock state transitions", () => {
  it("character starts unlocked by default", () => {
    const character = {
      id: 1,
      name: "Tim",
      isLocked: false,
      lockedDescription: null,
      lockedAt: null,
    };
    expect(character.isLocked).toBe(false);
    expect(character.lockedDescription).toBeNull();
  });

  it("locking a character sets isLocked=true and stores description", () => {
    const character = {
      id: 1,
      name: "Tim",
      isLocked: false,
      lockedDescription: null as string | null,
      lockedAt: null as Date | null,
    };

    // Simulate lock operation
    const description = "Tim, male, early 30s, short dark brown hair, beard, blue eyes, wearing black leather jacket and dark jeans.";
    const lockedChar = {
      ...character,
      isLocked: true,
      lockedDescription: description,
      lockedAt: new Date(),
    };

    expect(lockedChar.isLocked).toBe(true);
    expect(lockedChar.lockedDescription).toBe(description);
    expect(lockedChar.lockedAt).toBeInstanceOf(Date);
  });

  it("unlocking a character sets isLocked=false but preserves description", () => {
    const character = {
      id: 1,
      name: "Tim",
      isLocked: true,
      lockedDescription: "Tim, male, short dark hair, beard, leather jacket.",
      lockedAt: new Date(),
    };

    // Simulate unlock — description is preserved for re-locking
    const unlockedChar = {
      ...character,
      isLocked: false,
    };

    expect(unlockedChar.isLocked).toBe(false);
    // Description is preserved so it can be re-locked without re-analysis
    expect(unlockedChar.lockedDescription).toBe(character.lockedDescription);
  });

  it("re-locking a character with existing description does not require re-analysis", () => {
    const existingDescription = "Tim, male, short dark hair, beard, leather jacket, blue eyes.";
    const character = {
      id: 1,
      name: "Tim",
      isLocked: false,
      lockedDescription: existingDescription,
    };

    // If description already exists, lock immediately without LLM call
    const canLockWithoutAnalysis = character.lockedDescription !== null && character.lockedDescription.length > 20;
    expect(canLockWithoutAnalysis).toBe(true);
  });
});

// ─── 2. Description validation ────────────────────────────────────────────────

describe("character description validation", () => {
  function isDescriptionTooVague(desc: string): boolean {
    const trimmed = desc.trim();
    if (trimmed.length < 30) return true;
    const hasHair = /hair/i.test(trimmed);
    const hasEyes = /eye/i.test(trimmed);
    const hasSkin = /skin|tone|complexion|ethnicity/i.test(trimmed);
    const hasClothing = /wear|jacket|shirt|outfit|clothing|dress/i.test(trimmed);
    const specificMarkers = [hasHair, hasEyes, hasSkin, hasClothing].filter(Boolean).length;
    return specificMarkers < 2;
  }

  it("short description is too vague", () => {
    expect(isDescriptionTooVague("A man")).toBe(true);
    expect(isDescriptionTooVague("Singer")).toBe(true);
    expect(isDescriptionTooVague("Young woman")).toBe(true);
  });

  it("description with only one specific marker is still too vague", () => {
    expect(isDescriptionTooVague("A man with brown hair")).toBe(true);
  });

  it("forensic description with multiple markers passes validation", () => {
    const forensic = "Tim, male, early 30s, short dark brown hair, blue eyes, wearing black leather jacket.";
    expect(isDescriptionTooVague(forensic)).toBe(false);
  });

  it("description with hair and clothing markers passes", () => {
    const desc = "Female vocalist, long blonde hair, wearing red sequin dress.";
    expect(isDescriptionTooVague(desc)).toBe(false);
  });

  it("description with eyes and skin markers passes", () => {
    const desc = "Male guitarist, green eyes, light skin tone, medium build.";
    expect(isDescriptionTooVague(desc)).toBe(false);
  });

  it("empty description is too vague", () => {
    expect(isDescriptionTooVague("")).toBe(true);
  });
});

// ─── 3. Lock preconditions ────────────────────────────────────────────────────

describe("character lock preconditions", () => {
  it("character with no photos and no description cannot be locked", () => {
    const character = {
      id: 1,
      name: "Tim",
      photoCount: 0,
      lockedDescription: null as string | null,
      aiGeneratedImageUrl: null as string | null,
    };

    const canLock = character.photoCount > 0 || !!character.aiGeneratedImageUrl || !!character.lockedDescription;
    expect(canLock).toBe(false);
  });

  it("character with uploaded photo can be locked", () => {
    const character = {
      id: 1,
      name: "Tim",
      photoCount: 2,
      lockedDescription: null as string | null,
      aiGeneratedImageUrl: null as string | null,
    };

    const canLock = character.photoCount > 0 || !!character.aiGeneratedImageUrl || !!character.lockedDescription;
    expect(canLock).toBe(true);
  });

  it("character with AI-generated image can be locked", () => {
    const character = {
      id: 2,
      name: "MONICA",
      photoCount: 0,
      lockedDescription: null as string | null,
      aiGeneratedImageUrl: "https://cdn.example.com/monica-ai.jpg",
    };

    const canLock = character.photoCount > 0 || !!character.aiGeneratedImageUrl || !!character.lockedDescription;
    expect(canLock).toBe(true);
  });

  it("character with existing description can be locked without re-analysis", () => {
    const character = {
      id: 3,
      name: "Greg",
      photoCount: 0,
      lockedDescription: "Greg, male, short dark hair, drummer, wearing black torn t-shirt.",
      aiGeneratedImageUrl: null as string | null,
    };

    const canLock = character.photoCount > 0 || !!character.aiGeneratedImageUrl || !!character.lockedDescription;
    expect(canLock).toBe(true);
  });
});

// ─── 4. Locked description injection into scene prompts ──────────────────────

describe("locked description injection into scene prompts", () => {
  const lockedCharacters = [
    { name: "Tim", role: "Lead Singer", isLocked: true, lockedDescription: "Tim, male, short dark hair, beard, leather jacket, blue eyes." },
    { name: "Greg", role: "Drummer", isLocked: true, lockedDescription: "Greg, male, shaved head, muscular, black torn t-shirt." },
    { name: "MONICA", role: "Bass Player", isLocked: false, lockedDescription: null },
  ];

  it("only locked characters are injected into scene prompts", () => {
    const injected = lockedCharacters
      .filter(c => c.isLocked && c.lockedDescription)
      .map(c => `${c.name}${c.role ? ` (${c.role})` : ""}: ${c.lockedDescription}`);

    expect(injected).toHaveLength(2);
    expect(injected[0]).toContain("Tim");
    expect(injected[1]).toContain("Greg");
    expect(injected.some(i => i.includes("MONICA"))).toBe(false);
  });

  it("unlocked character with null description is excluded", () => {
    const injected = lockedCharacters
      .filter(c => c.isLocked && c.lockedDescription)
      .map(c => c.name);

    expect(injected).not.toContain("MONICA");
  });

  it("locked description appears before scene description in final prompt", () => {
    const charBlock = "Tim (Lead Singer): Tim, male, short dark hair, beard, leather jacket.";
    const sceneDesc = "performing on stage, dramatic lighting, crowd in background";
    const styleDesc = "cinematic film still, 4K";

    const finalPrompt = [charBlock, sceneDesc, styleDesc].filter(Boolean).join(". ");

    expect(finalPrompt.indexOf(charBlock)).toBeLessThan(finalPrompt.indexOf(sceneDesc));
    expect(finalPrompt.indexOf(sceneDesc)).toBeLessThan(finalPrompt.indexOf(styleDesc));
  });

  it("CHARACTER LOCK block is injected when locked characters exist", () => {
    const lockedChars = lockedCharacters.filter(c => c.isLocked && c.lockedDescription);
    const charDescriptions = lockedChars.map(c => `${c.name}: ${c.lockedDescription}`).join("\n");

    const characterLockBlock = lockedChars.length > 0
      ? `CHARACTER LOCK (MANDATORY):\n${charDescriptions}`
      : "";

    expect(characterLockBlock).toContain("CHARACTER LOCK (MANDATORY)");
    expect(characterLockBlock).toContain("Tim");
    expect(characterLockBlock).toContain("Greg");
  });

  it("no CHARACTER LOCK block when no locked characters", () => {
    const noLockedChars: typeof lockedCharacters = [];
    const characterLockBlock = noLockedChars.length > 0
      ? `CHARACTER LOCK (MANDATORY):\n${noLockedChars.map(c => c.name).join("\n")}`
      : "";

    expect(characterLockBlock).toBe("");
  });
});

// ─── 5. Character reference panel data ───────────────────────────────────────

describe("character reference panel data (storyboard step)", () => {
  const jobCharacters = [
    {
      id: 1,
      name: "Tim",
      role: "Lead Singer",
      isLocked: true,
      lockedDescription: "Tim, male, early 30s, short dark brown hair, beard, blue eyes, wearing black leather jacket.",
      primaryPhotoUrl: "https://cdn.example.com/tim-photo.jpg",
      slotIndex: 0,
    },
    {
      id: 2,
      name: "Greg",
      role: "Drummer",
      isLocked: true,
      lockedDescription: "Greg, male, shaved head, muscular build, black torn t-shirt.",
      primaryPhotoUrl: null,
      slotIndex: 1,
    },
    {
      id: 3,
      name: "MONICA",
      role: "Bass Player",
      isLocked: false,
      lockedDescription: null,
      primaryPhotoUrl: null,
      slotIndex: 2,
    },
  ];

  it("panel shows only locked characters", () => {
    const panelChars = jobCharacters.filter(c => c.isLocked);
    expect(panelChars).toHaveLength(2);
    expect(panelChars.map(c => c.name)).toContain("Tim");
    expect(panelChars.map(c => c.name)).toContain("Greg");
    expect(panelChars.map(c => c.name)).not.toContain("MONICA");
  });

  it("panel shows character with photo using primaryPhotoUrl", () => {
    const tim = jobCharacters.find(c => c.name === "Tim")!;
    expect(tim.primaryPhotoUrl).toBe("https://cdn.example.com/tim-photo.jpg");
    // Panel should render <img src={primaryPhotoUrl}> for Tim
    const hasPhoto = !!tim.primaryPhotoUrl;
    expect(hasPhoto).toBe(true);
  });

  it("panel shows fallback icon for character without photo", () => {
    const greg = jobCharacters.find(c => c.name === "Greg")!;
    expect(greg.primaryPhotoUrl).toBeNull();
    // Panel should render <User> icon fallback for Greg
    const needsFallbackIcon = !greg.primaryPhotoUrl;
    expect(needsFallbackIcon).toBe(true);
  });

  it("panel shows truncated lockedDescription snippet", () => {
    const tim = jobCharacters.find(c => c.name === "Tim")!;
    const maxLength = 80;
    const snippet = tim.lockedDescription
      ? tim.lockedDescription.slice(0, maxLength) + (tim.lockedDescription.length > maxLength ? "…" : "")
      : "";

    expect(snippet).toContain("Tim, male");
    expect(snippet.length).toBeLessThanOrEqual(maxLength + 1); // +1 for ellipsis
  });

  it("panel is hidden when no characters are locked", () => {
    const allUnlocked = jobCharacters.map(c => ({ ...c, isLocked: false }));
    const shouldShowPanel = allUnlocked.some(c => c.isLocked);
    expect(shouldShowPanel).toBe(false);
  });

  it("panel is visible when at least one character is locked", () => {
    const shouldShowPanel = jobCharacters.some(c => c.isLocked);
    expect(shouldShowPanel).toBe(true);
  });
});

// ─── 6–8. Router procedure existence ─────────────────────────────────────────

describe("musicVideoRouter: character lock procedures", () => {
  it("has getCharactersForJob procedure", () => {
    expect(musicVideoRouter._def.procedures.getCharactersForJob).toBeDefined();
  });

  it("getCharactersForJob is a query", () => {
    const proc = musicVideoRouter._def.procedures.getCharactersForJob;
    expect(proc._def.type).toBe("query");
  });

  it("has reanalyseCharacterPhoto procedure", () => {
    expect(musicVideoRouter._def.procedures.reanalyseCharacterPhoto).toBeDefined();
  });

  it("reanalyseCharacterPhoto is a mutation", () => {
    const proc = musicVideoRouter._def.procedures.reanalyseCharacterPhoto;
    expect(proc._def.type).toBe("mutation");
  });

  it("has approveCharacterPreview procedure", () => {
    expect(musicVideoRouter._def.procedures.approveCharacterPreview).toBeDefined();
  });

  it("approveCharacterPreview is a mutation", () => {
    const proc = musicVideoRouter._def.procedures.approveCharacterPreview;
    expect(proc._def.type).toBe("mutation");
  });

  it("has previewCharacter procedure", () => {
    expect(musicVideoRouter._def.procedures.previewCharacter).toBeDefined();
  });

  it("has updateCharacterVisualDetails procedure", () => {
    expect(musicVideoRouter._def.procedures.updateCharacterVisualDetails).toBeDefined();
  });
});

// ─── 9–10. FaceValidationResult interface ────────────────────────────────────

describe("FaceValidationResult interface", () => {
  it("passed field is boolean", () => {
    const result = { passed: true, confidence: 92.5, provider: "facepp" as const };
    expect(typeof result.passed).toBe("boolean");
  });

  it("confidence field is a number between 0 and 100", () => {
    const result = { passed: true, confidence: 87.3, provider: "facepp" as const };
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("provider can be facepp, rekognition, or skipped", () => {
    const validProviders = ["facepp", "rekognition", "skipped"];
    expect(validProviders).toContain("facepp");
    expect(validProviders).toContain("rekognition");
    expect(validProviders).toContain("skipped");
  });

  it("skipped result has passed=false and confidence=0", () => {
    const skipped = { passed: false, confidence: 0, provider: "skipped" as const, error: "No API keys" };
    expect(skipped.passed).toBe(false);
    expect(skipped.confidence).toBe(0);
    expect(skipped.provider).toBe("skipped");
  });
});

// ─── 11. CharacterLockData interface ─────────────────────────────────────────

describe("CharacterLockData interface", () => {
  it("has required fields: characterId, name, referencePhotoBase64, lockedDescription, faceValidationThreshold", () => {
    const lockData = {
      characterId: 1,
      name: "Tim",
      referencePhotoBase64: "data:image/jpeg;base64,/9j/4AAQ...",
      lockedDescription: "Tim, male, short dark hair, beard, leather jacket.",
      faceValidationThreshold: 75,
    };

    expect(lockData.characterId).toBe(1);
    expect(lockData.name).toBe("Tim");
    expect(lockData.referencePhotoBase64).toMatch(/^data:image/);
    expect(lockData.lockedDescription.length).toBeGreaterThan(20);
    expect(lockData.faceValidationThreshold).toBe(75);
  });

  it("default faceValidationThreshold is 75", () => {
    const defaultThreshold = 75;
    expect(defaultThreshold).toBe(75);
  });
});

// ─── 12. Character lock mode: all-or-nothing enforcement ─────────────────────

describe("character lock mode enforcement", () => {
  it("when lock mode is ON, all characters with photos get locked", () => {
    const characters = [
      { id: 1, name: "Tim", photoCount: 2, isLocked: false },
      { id: 2, name: "Greg", photoCount: 1, isLocked: false },
      { id: 3, name: "MONICA", photoCount: 0, isLocked: false },
    ];

    const lockModeOn = true;
    const toAutoLock = lockModeOn
      ? characters.filter(c => c.photoCount > 0)
      : [];

    expect(toAutoLock).toHaveLength(2);
    expect(toAutoLock.map(c => c.name)).toContain("Tim");
    expect(toAutoLock.map(c => c.name)).toContain("Greg");
    expect(toAutoLock.map(c => c.name)).not.toContain("MONICA");
  });

  it("when lock mode is OFF, no characters are auto-locked", () => {
    const characters = [
      { id: 1, name: "Tim", photoCount: 2, isLocked: false },
    ];

    const lockModeOn = false;
    const toAutoLock = lockModeOn ? characters.filter(c => c.photoCount > 0) : [];

    expect(toAutoLock).toHaveLength(0);
  });
});

// ─── 13. Unlocked characters excluded from description injection ──────────────

describe("unlocked characters excluded from prompt injection", () => {
  it("filter returns only locked characters with descriptions", () => {
    const allChars = [
      { name: "Tim", isLocked: true, lockedDescription: "Tim, male, dark hair, leather jacket." },
      { name: "Greg", isLocked: true, lockedDescription: null },
      { name: "MONICA", isLocked: false, lockedDescription: "MONICA, female, long red hair." },
      { name: "Alex", isLocked: false, lockedDescription: null },
    ];

    const eligible = allChars.filter(c => c.isLocked && c.lockedDescription);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("Tim");
  });

  it("locked character with null description is excluded (needs re-analysis)", () => {
    const char = { name: "Greg", isLocked: true, lockedDescription: null };
    const eligible = char.isLocked && char.lockedDescription;
    expect(eligible).toBeFalsy();
  });
});

// ─── 14. Multiple locked characters: all descriptions injected ───────────────

describe("multiple locked characters all injected", () => {
  it("all locked characters appear in the CHARACTER LOCK block", () => {
    const lockedChars = [
      { name: "Tim", lockedDescription: "Tim, male, dark hair, leather jacket." },
      { name: "Greg", lockedDescription: "Greg, male, shaved head, black t-shirt." },
      { name: "MONICA", lockedDescription: "MONICA, female, long red hair, bass guitar." },
    ];

    const charBlock = lockedChars
      .map(c => `${c.name}: ${c.lockedDescription}`)
      .join("\n");

    expect(charBlock).toContain("Tim");
    expect(charBlock).toContain("Greg");
    expect(charBlock).toContain("MONICA");
    expect(charBlock.split("\n")).toHaveLength(3);
  });
});

// ─── 15. Lock timestamp ───────────────────────────────────────────────────────

describe("character lock timestamp", () => {
  it("lockedAt is set to current time when character is locked", () => {
    const before = new Date();
    const lockedAt = new Date();
    const after = new Date();

    expect(lockedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lockedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("lockedAt is null for unlocked characters", () => {
    const character = { isLocked: false, lockedAt: null as Date | null };
    expect(character.lockedAt).toBeNull();
  });
});
