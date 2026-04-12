import { describe, it, expect } from "vitest";
import {
  buildScenePrompt,
  buildSceneHeader,
  buildCharacterBlock,
  buildRulesBlock,
  buildSceneDetails,
  buildNegativePrompt,
  buildPortraitPrompt,
  PRIORITY,
} from "./promptBuilder";

// ── Test Data ──────────────────────────────────────────────────────────────

const mockTim = {
  name: "Tim",
  lockedIdentity: "Tim, a male in his late 30s with fair skin, short brown hair, and green eyes.",
  lockedOutfit: JSON.stringify({
    jacket: "black leather jacket",
    shirt: "dark t-shirt underneath",
    trousers: "jeans with key chain",
    shoes: "black boots",
    accessories: "none",
  }),
  lockedProps: JSON.stringify({
    instrument: "sunburst Gibson Les Paul",
    mic: "standing microphone",
    other: "none",
  }),
  lockedPosition: "standing at microphone, centre stage",
  lockedRole: "lead vocalist and guitarist",
  lockedRules: JSON.stringify({
    role: "lead vocalist",
    mustHave: ["standing at microphone", "black leather jacket"],
    allowedProps: ["sunburst Gibson Les Paul"],
    forbidden: ["holding drumsticks", "wearing t-shirt only", "being in background"],
  }),
  isPrimary: true,
};

const mockGreg = {
  name: "Greg",
  lockedIdentity: "Greg, a male in his mid-20s with light skin, short wavy dark brown hair.",
  lockedOutfit: JSON.stringify({
    jacket: "none",
    shirt: "black torn short-sleeve t-shirt",
    trousers: "dark jeans",
    shoes: "black trainers",
    accessories: "none",
  }),
  lockedProps: JSON.stringify({
    instrument: "full drum kit",
    mic: "none",
    other: "drumsticks",
  }),
  lockedPosition: "seated behind drum kit",
  lockedRole: "drummer",
  lockedRules: JSON.stringify({
    role: "drummer",
    mustHave: ["seated behind drum kit", "black torn short-sleeve t-shirt"],
    forbidden: ["leather jacket", "standing", "holding guitar"],
  }),
  isPrimary: false,
};

const mockMonica = {
  name: "Monica",
  lockedIdentity: "Monica, a woman in her late 20s with pale skin, long raven-black hair, green eyes, tattoos on forearms.",
  lockedOutfit: JSON.stringify({
    jacket: "none",
    shirt: "distressed charcoal-grey V-neck t-shirt",
    trousers: "jet-black leather trousers",
    shoes: "glossy stiletto-heeled black leather ankle boots",
    accessories: "long silver chain necklace with ornate silver cross pendant",
  }),
  lockedProps: JSON.stringify({
    instrument: "bass guitar",
    mic: "none",
    other: "none",
  }),
  lockedPosition: "standing stage right, playing bass",
  lockedRole: "bass player",
  lockedRules: JSON.stringify({
    role: "bass player",
    mustHave: ["playing bass guitar", "boots", "tattoos visible", "cross necklace visible"],
    forbidden: ["leather jacket", "generic outfit", "plain clothing"],
  }),
  isPrimary: false,
};

const mockScene = {
  scenePrompt: "The band performs an intense chorus on a dark stage with dramatic red and blue lighting.",
  sceneType: "performance",
  strictCharacterCount: 3,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("promptBuilder", () => {
  describe("PRIORITY", () => {
    it("should have correct priority weights", () => {
      expect(PRIORITY.identity).toBe(10);
      expect(PRIORITY.outfit).toBe(9);
      expect(PRIORITY.props).toBe(8);
      expect(PRIORITY.role).toBe(8);
      expect(PRIORITY.scene).toBe(5);
    });

    it("identity should be highest priority", () => {
      expect(PRIORITY.identity).toBeGreaterThan(PRIORITY.outfit);
      expect(PRIORITY.outfit).toBeGreaterThan(PRIORITY.scene);
    });
  });

  describe("buildSceneHeader", () => {
    it("should include strict character count", () => {
      const header = buildSceneHeader(mockScene);
      expect(header).toContain("Exactly 3 people on stage");
    });

    it("should include no extra people rule", () => {
      const header = buildSceneHeader(mockScene);
      expect(header).toContain("No more, no less");
      expect(header).toContain("No background performers");
    });

    it("should include scene type", () => {
      const header = buildSceneHeader(mockScene);
      expect(header).toContain("performance");
    });

    it("should default to 3 characters when not specified", () => {
      const header = buildSceneHeader({ ...mockScene, strictCharacterCount: undefined } as any);
      expect(header).toContain("Exactly 3 people on stage");
    });
  });

  describe("buildCharacterBlock", () => {
    it("should include all character names", () => {
      const block = buildCharacterBlock([mockTim, mockGreg, mockMonica]);
      expect(block).toContain("Tim");
      expect(block).toContain("Greg");
      expect(block).toContain("Monica");
    });

    it("should include LOCKED identity markers", () => {
      const block = buildCharacterBlock([mockTim]);
      expect(block).toContain("IDENTITY (LOCKED");
    });

    it("should include MANDATORY outfit markers", () => {
      const block = buildCharacterBlock([mockTim]);
      expect(block).toContain("OUTFIT (MANDATORY");
    });

    it("should include MANDATORY props markers", () => {
      const block = buildCharacterBlock([mockTim]);
      expect(block).toContain("PROPS (MANDATORY)");
    });

    it("should include FORBIDDEN section", () => {
      const block = buildCharacterBlock([mockTim]);
      expect(block).toContain("FORBIDDEN");
      expect(block).toContain("holding drumsticks");
    });

    it("should include mustHave rules", () => {
      const block = buildCharacterBlock([mockTim]);
      expect(block).toContain("standing at microphone");
      expect(block).toContain("black leather jacket");
    });

    it("should order characters by priority (primary first)", () => {
      const block = buildCharacterBlock([mockGreg, mockTim, mockMonica]);
      const timIndex = block.indexOf("Tim");
      const gregIndex = block.indexOf("Greg");
      // Tim should appear first since he's primary
      expect(timIndex).toBeLessThan(gregIndex);
    });
  });

  describe("buildRulesBlock", () => {
    it("should include global hard rules", () => {
      const rules = buildRulesBlock([mockTim, mockGreg, mockMonica]);
      expect(rules).toContain("GLOBAL HARD RULES");
    });

    it("should include identity matching rule", () => {
      const rules = buildRulesBlock([mockTim]);
      expect(rules).toContain("identity EXACTLY");
    });

    it("should include no swapping roles rule", () => {
      const rules = buildRulesBlock([mockTim]);
      expect(rules).toContain("No swapping roles");
    });

    it("should include no changing outfits rule", () => {
      const rules = buildRulesBlock([mockTim]);
      expect(rules).toContain("No changing outfits");
    });

    it("should include STRICT MODE: ENABLED", () => {
      const rules = buildRulesBlock([mockTim]);
      expect(rules).toContain("STRICT MODE: ENABLED");
    });

    it("should include vocalist at microphone rule", () => {
      const rules = buildRulesBlock([mockTim]);
      expect(rules).toContain("Vocalist MUST be at microphone");
    });
  });

  describe("buildSceneDetails", () => {
    it("should include the scene prompt", () => {
      const details = buildSceneDetails(mockScene);
      expect(details).toContain("intense chorus");
      expect(details).toContain("dramatic red and blue lighting");
    });

    it("should include cinematic style markers", () => {
      const details = buildSceneDetails(mockScene);
      expect(details).toContain("cinematic");
      expect(details).toContain("ultra-realistic");
    });
  });

  describe("buildNegativePrompt", () => {
    it("should include extra people", () => {
      const neg = buildNegativePrompt();
      expect(neg).toContain("extra people");
    });

    it("should include identity drift", () => {
      const neg = buildNegativePrompt();
      expect(neg).toContain("identity drift");
    });

    it("should include wrong outfit", () => {
      const neg = buildNegativePrompt();
      expect(neg).toContain("wrong outfit");
    });

    it("should include text/logo/watermark", () => {
      const neg = buildNegativePrompt();
      expect(neg).toContain("text");
      expect(neg).toContain("logo");
      expect(neg).toContain("watermark");
    });

    it("should include blurry faces", () => {
      const neg = buildNegativePrompt();
      expect(neg).toContain("blurry faces");
    });

    it("should include wide arena shots", () => {
      const neg = buildNegativePrompt();
      expect(neg).toContain("wide arena shots");
    });
  });

  describe("buildScenePrompt (full integration)", () => {
    it("should combine all blocks into a single prompt", () => {
      const result = buildScenePrompt({
        scene: mockScene,
        characters: [mockTim, mockGreg, mockMonica],
        strictMode: true,
      });

      // buildScenePrompt returns { prompt, negativePrompt }
      expect(result.prompt).toContain("STRICT SCENE COMPOSITION");
      expect(result.prompt).toContain("Tim");
      expect(result.prompt).toContain("Greg");
      expect(result.prompt).toContain("Monica");
      expect(result.prompt).toContain("GLOBAL HARD RULES");
      expect(result.prompt).toContain("SCENE DETAILS");
      expect(result.negativePrompt).toContain("NEGATIVE PROMPT");
    });

    it("should order blocks by priority: identity > outfit > scene", () => {
      const result = buildScenePrompt({
        scene: mockScene,
        characters: [mockTim],
        strictMode: true,
      });

      const identityIndex = result.prompt.indexOf("IDENTITY (LOCKED");
      const outfitIndex = result.prompt.indexOf("OUTFIT (MANDATORY");
      const sceneIndex = result.prompt.indexOf("SCENE DETAILS");

      expect(identityIndex).toBeLessThan(outfitIndex);
      expect(outfitIndex).toBeLessThan(sceneIndex);
    });

    it("should include Tim's leather jacket in the prompt", () => {
      const result = buildScenePrompt({
        scene: mockScene,
        characters: [mockTim],
        strictMode: true,
      });
      expect(result.prompt).toContain("black leather jacket");
    });

    it("should include Greg's forbidden items", () => {
      const result = buildScenePrompt({
        scene: mockScene,
        characters: [mockGreg],
        strictMode: true,
      });
      expect(result.prompt).toContain("leather jacket");
      expect(result.prompt).toContain("FORBIDDEN");
    });

    it("should include Monica's mandatory boots and tattoos", () => {
      const result = buildScenePrompt({
        scene: mockScene,
        characters: [mockMonica],
        strictMode: true,
      });
      expect(result.prompt).toContain("boots");
      expect(result.prompt).toContain("tattoos visible");
    });
  });

  describe("buildPortraitPrompt", () => {
    it("should include full-body framing keywords", () => {
      const portrait = buildPortraitPrompt(mockTim);
      expect(portrait).toContain("FULL-BODY PORTRAIT");
    });

    it("should include character identity", () => {
      const portrait = buildPortraitPrompt(mockTim);
      expect(portrait).toContain("Tim");
    });

    it("should include outfit details", () => {
      const portrait = buildPortraitPrompt(mockTim);
      expect(portrait).toContain("black leather jacket");
    });

    it("should include props", () => {
      const portrait = buildPortraitPrompt(mockTim);
      expect(portrait).toContain("Gibson Les Paul");
    });
  });
});
