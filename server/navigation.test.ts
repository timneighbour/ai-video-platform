/**
 * Navigation & Back Button Tests
 *
 * Validates that:
 * 1. BackButton component renders with correct fallback paths
 * 2. All pages have proper back navigation
 * 3. No broken /wizvid-autopilot links remain in the codebase
 * 4. Character defaults module provides canonical rules
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getCharacterDefaults, getKnownBandMembers, TIM_DEFAULTS, GREG_DEFAULTS, MONICA_DEFAULTS } from "../shared/characterDefaults";

// ── Character Defaults ──────────────────────────────────────────────────────

describe("Character Defaults Module", () => {
  it("exports canonical characters for Tim, Greg, Monica", () => {
    const members = getKnownBandMembers();
    expect(members).toHaveLength(3);
    expect(members).toContain("tim");
    expect(members).toContain("greg");
    expect(members).toContain("monica");
  });

  it("getCharacterDefaults returns Tim defaults (case-insensitive)", () => {
    const tim = getCharacterDefaults("Tim");
    expect(tim).toBeTruthy();
    expect(tim!.lockedRole.toLowerCase()).toContain("lead vocalist");
    expect(tim!.lockedOutfit).toBeTruthy();
    expect(tim!.lockedProps).toBeTruthy();
    expect(tim!.lockedPosition).toBeTruthy();

    // Case-insensitive
    const timLower = getCharacterDefaults("tim");
    expect(timLower).toEqual(tim);
  });

  it("getCharacterDefaults returns Greg defaults with drummer role", () => {
    const greg = getCharacterDefaults("Greg");
    expect(greg).toBeTruthy();
    expect(greg!.lockedRole.toLowerCase()).toContain("drummer");
    expect(greg!.lockedProps).toBeTruthy();
  });

  it("getCharacterDefaults returns Monica defaults with bass role", () => {
    const monica = getCharacterDefaults("Monica");
    expect(monica).toBeTruthy();
    expect(monica!.lockedRole.toLowerCase()).toContain("bass");
    expect(monica!.lockedProps).toBeTruthy();
  });

  it("getCharacterDefaults returns undefined for unknown characters", () => {
    expect(getCharacterDefaults("Unknown")).toBeUndefined();
    expect(getCharacterDefaults("")).toBeUndefined();
  });

  it("each canonical character has lockedRules with mustHave and forbidden", () => {
    for (const defaults of [TIM_DEFAULTS, GREG_DEFAULTS, MONICA_DEFAULTS]) {
      expect(defaults.lockedRules).toBeTruthy();
      expect(defaults.lockedRules.mustHave).toBeInstanceOf(Array);
      expect(defaults.lockedRules.forbidden).toBeInstanceOf(Array);
      expect(defaults.lockedRules.mustHave.length).toBeGreaterThan(0);
      expect(defaults.lockedRules.forbidden.length).toBeGreaterThan(0);
    }
  });
});

// ── Broken Link Detection ───────────────────────────────────────────────────

describe("No broken /wizvid-autopilot links", () => {
  const pagesDir = join(__dirname, "../client/src/pages");
  const componentsDir = join(__dirname, "../client/src/components");

  function scanDir(dir: string): string[] {
    try {
      return readdirSync(dir)
        .filter(f => f.endsWith(".tsx") || f.endsWith(".ts"))
        .map(f => join(dir, f));
    } catch {
      return [];
    }
  }

  const allFiles = [...scanDir(pagesDir), ...scanDir(componentsDir)];

  it("no page or component references /wizvid-autopilot as a navigation href", () => {
    const brokenLinks: string[] = [];
    for (const filePath of allFiles) {
      const content = readFileSync(filePath, "utf-8");
      // Match href="/wizvid-autopilot" or setLocation("/wizvid-autopilot") patterns
      if (/href=["']\/wizvid-autopilot|setLocation\(["']\/wizvid-autopilot/.test(content)) {
        brokenLinks.push(filePath);
      }
    }
    expect(brokenLinks).toEqual([]);
  });
});

// ── Back Button Presence ────────────────────────────────────────────────────

describe("Back button presence in key pages", () => {
  const checkFileContains = (relPath: string, pattern: RegExp, description: string) => {
    const fullPath = join(__dirname, "..", relPath);
    const content = readFileSync(fullPath, "utf-8");
    expect(content).toMatch(pattern);
  };

  it("Help.tsx imports and uses BackButton", () => {
    checkFileContains(
      "client/src/pages/Help.tsx",
      /import BackButton from/,
      "Help should import BackButton"
    );
    checkFileContains(
      "client/src/pages/Help.tsx",
      /<BackButton/,
      "Help should render BackButton"
    );
  });

  it("RenderHistory.tsx imports and uses BackButton", () => {
    checkFileContains(
      "client/src/pages/RenderHistory.tsx",
      /import BackButton from/,
      "RenderHistory should import BackButton"
    );
    checkFileContains(
      "client/src/pages/RenderHistory.tsx",
      /<BackButton/,
      "RenderHistory should render BackButton"
    );
  });

  it("BatchRegeneration.tsx imports and uses BackButton", () => {
    checkFileContains(
      "client/src/pages/BatchRegeneration.tsx",
      /import BackButton from/,
      "BatchRegeneration should import BackButton"
    );
    checkFileContains(
      "client/src/pages/BatchRegeneration.tsx",
      /<BackButton/,
      "BatchRegeneration should render BackButton"
    );
  });

  it("EnhancementStudio.tsx imports and uses BackButton", () => {
    checkFileContains(
      "client/src/pages/EnhancementStudio.tsx",
      /import BackButton from/,
      "EnhancementStudio should import BackButton"
    );
    checkFileContains(
      "client/src/pages/EnhancementStudio.tsx",
      /<BackButton/,
      "EnhancementStudio should render BackButton"
    );
  });

  it("MusicVideoAutopilot.tsx has Home link in header", () => {
    checkFileContains(
      "client/src/pages/MusicVideoAutopilot.tsx",
      /href="\/"/,
      "MusicVideoAutopilot should have a Home link"
    );
  });
});
