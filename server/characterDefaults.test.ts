/**
 * Tests for shared/characterDefaults.ts
 * Verifies canonical defaults for Tim, Greg, and Monica band members.
 */
import { describe, it, expect } from "vitest";
import {
  getCharacterDefaults,
  isKnownBandMember,
  getKnownBandMembers,
  TIM_DEFAULTS,
  GREG_DEFAULTS,
  MONICA_DEFAULTS,
} from "../shared/characterDefaults";

describe("characterDefaults", () => {
  describe("getCharacterDefaults", () => {
    it("returns Tim defaults for 'Tim' (case-insensitive)", () => {
      expect(getCharacterDefaults("Tim")).toBe(TIM_DEFAULTS);
      expect(getCharacterDefaults("tim")).toBe(TIM_DEFAULTS);
      expect(getCharacterDefaults("TIM")).toBe(TIM_DEFAULTS);
      expect(getCharacterDefaults("  Tim  ")).toBe(TIM_DEFAULTS);
    });

    it("returns Greg defaults for 'Greg' (case-insensitive)", () => {
      expect(getCharacterDefaults("Greg")).toBe(GREG_DEFAULTS);
      expect(getCharacterDefaults("greg")).toBe(GREG_DEFAULTS);
    });

    it("returns Monica defaults for 'Monica' (case-insensitive)", () => {
      expect(getCharacterDefaults("Monica")).toBe(MONICA_DEFAULTS);
      expect(getCharacterDefaults("monica")).toBe(MONICA_DEFAULTS);
    });

    it("returns undefined for unknown characters", () => {
      expect(getCharacterDefaults("Alice")).toBeUndefined();
      expect(getCharacterDefaults("")).toBeUndefined();
      expect(getCharacterDefaults("Timothy")).toBeUndefined();
    });
  });

  describe("isKnownBandMember", () => {
    it("returns true for known band members", () => {
      expect(isKnownBandMember("Tim")).toBe(true);
      expect(isKnownBandMember("greg")).toBe(true);
      expect(isKnownBandMember("MONICA")).toBe(true);
    });

    it("returns false for unknown names", () => {
      expect(isKnownBandMember("Alice")).toBe(false);
      expect(isKnownBandMember("")).toBe(false);
    });
  });

  describe("getKnownBandMembers", () => {
    it("returns all three band member names", () => {
      const members = getKnownBandMembers();
      expect(members).toContain("tim");
      expect(members).toContain("greg");
      expect(members).toContain("monica");
      expect(members).toHaveLength(3);
    });
  });

  describe("Tim defaults structure", () => {
    it("has correct role", () => {
      expect(TIM_DEFAULTS.lockedRole).toBe("Lead Vocalist");
      expect(TIM_DEFAULTS.lockedRules.role).toBe("lead vocalist");
    });

    it("has mandatory leather jacket in mustHave", () => {
      expect(TIM_DEFAULTS.lockedRules.mustHave).toContain("black leather jacket");
    });

    it("has microphone position", () => {
      expect(TIM_DEFAULTS.lockedPosition).toContain("microphone");
    });

    it("forbids drumsticks", () => {
      expect(TIM_DEFAULTS.lockedRules.forbidden).toContain("holding drumsticks");
    });

    it("has locked outfit with jacket as mandatory", () => {
      expect(TIM_DEFAULTS.lockedOutfit.jacket).toContain("black leather jacket");
    });

    it("has character constraints string", () => {
      expect(TIM_DEFAULTS.characterConstraints).toContain("MUST always wear black leather jacket");
    });
  });

  describe("Greg defaults structure", () => {
    it("has correct role", () => {
      expect(GREG_DEFAULTS.lockedRole).toBe("Drummer");
      expect(GREG_DEFAULTS.lockedRules.role).toBe("drummer");
    });

    it("must be seated behind drum kit", () => {
      expect(GREG_DEFAULTS.lockedRules.mustHave).toContain("seated behind drum kit");
    });

    it("forbids leather jacket", () => {
      expect(GREG_DEFAULTS.lockedRules.forbidden).toContain("leather jacket");
    });

    it("forbids standing", () => {
      expect(GREG_DEFAULTS.lockedRules.forbidden).toContain("standing");
    });

    it("has drumsticks as allowed props", () => {
      expect(GREG_DEFAULTS.lockedRules.allowedProps).toContain("drumsticks");
    });
  });

  describe("Monica defaults structure", () => {
    it("has correct role", () => {
      expect(MONICA_DEFAULTS.lockedRole).toBe("Bassist");
      expect(MONICA_DEFAULTS.lockedRules.role).toBe("bassist");
    });

    it("must have bass guitar", () => {
      expect(MONICA_DEFAULTS.lockedRules.mustHave).toContain("playing bass guitar");
    });

    it("must have visible tattoos and cross necklace", () => {
      expect(MONICA_DEFAULTS.lockedRules.mustHave).toContain("tattoos visible");
      expect(MONICA_DEFAULTS.lockedRules.mustHave).toContain("cross necklace visible");
    });

    it("has cross necklace in accessories", () => {
      expect(MONICA_DEFAULTS.lockedOutfit.accessories).toContain("cross");
    });

    it("has stage right position", () => {
      expect(MONICA_DEFAULTS.lockedPosition).toContain("stage right");
    });
  });
});
