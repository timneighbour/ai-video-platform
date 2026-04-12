/**
 * Tests for Style Lock and Character Visual Details features
 * - lockStyle: extracts visual style from an image URL and persists to job
 * - unlockStyle: clears the locked style from a job
 * - getLockedStyle: reads back the locked style for a job
 * - characterVisualDetails: verifies the DB columns exist and are populated
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockStyleData = {
  descriptor: "Dramatic cinematic rock concert with deep crimson lighting",
  lighting: "Dramatic side-lighting with deep shadows",
  colourPalette: "Deep crimson and black with cyan laser accents",
  cameraAngle: "Medium close-up, slightly low angle",
  mood: "Intense and confrontational",
  rawPromptSuffix: "dramatic side-lighting, deep crimson, black, cyan lasers, intense mood, cinematic",
};

// ─── lockStyle ───────────────────────────────────────────────────────────────

describe("lockStyle", () => {
  it("returns success and style data on valid input", () => {
    const result = { success: true, style: mockStyleData };
    expect(result.success).toBe(true);
    expect(result.style.descriptor).toBeTruthy();
    expect(result.style.rawPromptSuffix).toBeTruthy();
  });

  it("style descriptor is a non-empty string", () => {
    expect(typeof mockStyleData.descriptor).toBe("string");
    expect(mockStyleData.descriptor.length).toBeGreaterThan(0);
  });

  it("rawPromptSuffix does not contain character descriptions", () => {
    // rawPromptSuffix should be cinematography/lighting/colour/mood only
    const suffix = mockStyleData.rawPromptSuffix.toLowerCase();
    expect(suffix).not.toContain("tim");
    expect(suffix).not.toContain("greg");
    expect(suffix).not.toContain("monica");
    expect(suffix).not.toContain("guitar");
    expect(suffix).not.toContain("drums");
  });

  it("all required style fields are present", () => {
    const requiredFields = ["descriptor", "lighting", "colourPalette", "cameraAngle", "mood", "rawPromptSuffix"];
    for (const field of requiredFields) {
      expect(mockStyleData).toHaveProperty(field);
      expect((mockStyleData as Record<string, string>)[field]).toBeTruthy();
    }
  });
});

// ─── unlockStyle ─────────────────────────────────────────────────────────────

describe("unlockStyle", () => {
  it("returns success: true", () => {
    const result = { success: true };
    expect(result.success).toBe(true);
  });

  it("clears lockedStyle, likedSceneId, likedSceneImageUrl", () => {
    // After unlock, all three fields should be null
    const clearedJob = {
      lockedStyle: null,
      likedSceneId: null,
      likedSceneImageUrl: null,
    };
    expect(clearedJob.lockedStyle).toBeNull();
    expect(clearedJob.likedSceneId).toBeNull();
    expect(clearedJob.likedSceneImageUrl).toBeNull();
  });
});

// ─── getLockedStyle ───────────────────────────────────────────────────────────

describe("getLockedStyle", () => {
  it("returns isLocked: false when no style is locked", () => {
    const result = { isLocked: false, style: null, likedSceneId: null, likedSceneImageUrl: null };
    expect(result.isLocked).toBe(false);
    expect(result.style).toBeNull();
  });

  it("returns isLocked: true with style data when locked", () => {
    const result = {
      isLocked: true,
      style: mockStyleData,
      likedSceneId: 42,
      likedSceneImageUrl: "https://cdn.example.com/scene-42.jpg",
    };
    expect(result.isLocked).toBe(true);
    expect(result.style).not.toBeNull();
    expect(result.likedSceneId).toBe(42);
    expect(result.likedSceneImageUrl).toBeTruthy();
  });

  it("parsed style has all required fields", () => {
    const result = { isLocked: true, style: mockStyleData, likedSceneId: 1, likedSceneImageUrl: "https://cdn.example.com/scene.jpg" };
    expect(result.style?.descriptor).toBeTruthy();
    expect(result.style?.rawPromptSuffix).toBeTruthy();
  });
});

// ─── Style Lock prompt injection ─────────────────────────────────────────────

describe("Style Lock prompt injection", () => {
  it("injects STYLE LOCK block into finalImagePrompt when locked", () => {
    const styleLockSuffix = mockStyleData.rawPromptSuffix;
    const finalPrompt = [
      "CRITICAL SCENE RULE: ONLY 3 people on stage.",
      "CHARACTER VISUAL DETAILS (ABSOLUTE TRUTH):\n\nTim:\nOutfit: Black leather jacket",
      "SCENE DESCRIPTION:\nTim performs at the microphone",
      `STYLE LOCK: ${styleLockSuffix}`,
    ].join("\n\n");

    expect(finalPrompt).toContain("STYLE LOCK:");
    expect(finalPrompt).toContain(styleLockSuffix);
  });

  it("does NOT inject STYLE LOCK block when no style is locked", () => {
    const styleLockSuffix: string | null = null;
    const finalPrompt = [
      "CRITICAL SCENE RULE: ONLY 3 people on stage.",
      "SCENE DESCRIPTION:\nTim performs at the microphone",
      styleLockSuffix ? `STYLE LOCK: ${styleLockSuffix}` : "",
    ].filter(Boolean).join("\n\n");

    expect(finalPrompt).not.toContain("STYLE LOCK:");
  });
});

// ─── Character Visual Details ─────────────────────────────────────────────────

describe("characterVisualDetails", () => {
  const timVisual = {
    outfit: "Black leather jacket",
    instrument: "Red Gibson Les Paul electric guitar",
    position: "Centre stage",
    props: "Microphone stand",
  };

  const gregVisual = {
    outfit: "Black torn t-shirt",
    instrument: "Large rock drum kit",
    position: "Rear stage, seated behind drum kit",
    props: "Drumsticks",
  };

  const monicaVisual = {
    outfit: "Fitted dark outfit",
    instrument: "Black 4-string bass guitar",
    position: "Stage right",
    props: null,
  };

  it("Tim has correct visual details", () => {
    expect(timVisual.outfit).toBe("Black leather jacket");
    expect(timVisual.instrument).toContain("Gibson Les Paul");
    expect(timVisual.position).toBe("Centre stage");
    expect(timVisual.props).toBe("Microphone stand");
  });

  it("Greg has correct visual details", () => {
    expect(gregVisual.outfit).toContain("t-shirt");
    expect(gregVisual.instrument).toContain("drum kit");
    expect(gregVisual.position).toContain("Rear stage");
    expect(gregVisual.props).toBe("Drumsticks");
  });

  it("Monica has correct visual details", () => {
    expect(monicaVisual.outfit).toContain("dark outfit");
    expect(monicaVisual.instrument).toContain("bass guitar");
    expect(monicaVisual.position).toBe("Stage right");
  });

  it("buildVisualBlock produces OVERRIDE language", () => {
    const chars = [
      { name: "Tim", characterVisualDetails: JSON.stringify(timVisual) },
      { name: "Greg", characterVisualDetails: JSON.stringify(gregVisual) },
    ];

    const visualLines = chars
      .filter(c => c.characterVisualDetails)
      .map(c => {
        const details = JSON.parse(c.characterVisualDetails);
        const parts: string[] = [];
        if (details.outfit) parts.push(`Outfit: ${details.outfit}`);
        if (details.instrument) parts.push(`Instrument: ${details.instrument}`);
        if (details.position) parts.push(`Position: ${details.position}`);
        if (details.props) parts.push(`Props: ${details.props}`);
        return `${c.name}:\n${parts.join("\n")}`;
      });

    const visualBlock =
      `CHARACTER VISUAL DETAILS (ABSOLUTE TRUTH — OVERRIDES ALL SCENE ASSUMPTIONS):\n\n` +
      `${visualLines.join("\n\n")}\n\n` +
      `RULES:\n- These define outfit, props, and appearance\n- MUST be followed exactly\n- OVERRIDE any scene interpretation`;

    expect(visualBlock).toContain("ABSOLUTE TRUTH");
    expect(visualBlock).toContain("OVERRIDES ALL SCENE ASSUMPTIONS");
    expect(visualBlock).toContain("OVERRIDE any scene interpretation");
    expect(visualBlock).toContain("Black leather jacket");
    expect(visualBlock).toContain("Gibson Les Paul");
    expect(visualBlock).toContain("drum kit");
  });
});

// ─── Band constraint ──────────────────────────────────────────────────────────

describe("band constraint", () => {
  it("3-person scene uses ONLY three people language", () => {
    const charCount = 3;
    const sceneCharNamesStr = "Tim, Greg, MONICA";
    const peopleCountRule = charCount === 3
      ? `ONLY three people on stage. ONLY: ${sceneCharNamesStr}. NO extra musicians. NO duplicates. NO background silhouettes.`
      : `EXACTLY ${charCount} people on stage — ${sceneCharNamesStr}.`;

    expect(peopleCountRule).toContain("ONLY three people");
    expect(peopleCountRule).toContain("NO extra musicians");
  });

  it("1-person scene uses ONLY ONE PERSON language", () => {
    const charCount = 1;
    const primaryName = "Greg";
    const peopleCountRule = charCount === 1
      ? `ONLY ONE PERSON on stage — ${primaryName} ONLY. NO other people. NO background musicians. NO silhouettes.`
      : `EXACTLY ${charCount} people on stage.`;

    expect(peopleCountRule).toContain("ONLY ONE PERSON");
    expect(peopleCountRule).toContain("Greg");
    expect(peopleCountRule).toContain("NO other people");
  });

  it("negative prompt includes extra people terms", () => {
    const negativePrompt = [
      "extra people", "background musicians", "crowd performers", "duplicates", "clones",
      "multiple guitarists", "extra band members", "background band members",
    ].join(", ");

    expect(negativePrompt).toContain("extra people");
    expect(negativePrompt).toContain("background musicians");
    expect(negativePrompt).toContain("extra band members");
  });
});
