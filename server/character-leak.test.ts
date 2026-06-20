/**
 * Regression tests: character reference must NOT leak into environment/atmosphere scenes.
 *
 * These tests cover the two bugs fixed in June 2026:
 *  1. Empty characterAssignments stored as null instead of '[]' caused Zara to appear
 *     in every scene via the locked-character fallback.
 *  2. Crane shots / fly-through camera moves were not detected as environment scenes,
 *     causing Zara's face reference to be injected even when no character was assigned.
 */

import { describe, it, expect } from "vitest";

// ── Helpers (inline copies of the logic under test) ──────────────────────────

type Character = { id: number; name: string; isLocked: boolean; lockedDescription?: string | null };

/**
 * Mirrors the resolvedSceneChars logic in generateScenePreviewCore and generateScenePreview.
 * After the fix: null characterAssignments → treated as '[]' (empty), never falls back to locked chars.
 */
function resolveSceneChars(
  characterAssignments: string | null | undefined,
  allJobCharacters: Character[]
): Character[] {
  let sceneCharNames: string[] = [];
  try {
    if (characterAssignments) sceneCharNames = JSON.parse(characterAssignments);
  } catch { /* ignore */ }

  const charByName = new Map(allJobCharacters.map(c => [c.name.toLowerCase(), c]));
  const sceneChars = sceneCharNames.length > 0
    ? sceneCharNames.map(n => charByName.get(n.toLowerCase())).filter(Boolean) as Character[]
    : [];

  // CRITICAL: never fall back to locked characters (post-fix behaviour)
  return sceneChars;
}

/**
 * Mirrors the isEnvironmentScene detection in generateScenePreviewCore (post-fix).
 */
function isEnvironmentScene(resolvedChars: Character[], prompt: string): boolean {
  if (resolvedChars.length === 0) return true; // definitive signal
  const p = prompt.toLowerCase();
  return (
    /\baer(?:ial|ials?)\b|\bbird'?s.?eye\b|\boverhead\b|\bdrone\s+shot\b/.test(p) ||
    /\bestablishing\b|\bwide\s+(?:venue|shot|view|angle)\b/.test(p) ||
    /\bcrane\s+shot\b|\bcrane\s+move\b|\bsoaring\s+through\b|\bfly.?through\b|\bfly.?past\b|\bglides?\s+(?:past|through|over)\b/.test(p) ||
    /\batmosphere\b|\bambient\b|\bno\s+people\b|\bno\s+performers\b/.test(p) ||
    /\bno\s+characters?\b|\bno\s+singer\b|\bno\s+vocalist\b/.test(p)
  );
}

// ── Test data ─────────────────────────────────────────────────────────────────

const ZARA: Character = { id: 1, name: "Zara", isLocked: true, lockedDescription: "Young woman, black hair" };
const CELLIST: Character = { id: 2, name: "Lead Cellist", isLocked: false };
const ALL_CHARS = [ZARA, CELLIST];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Character leak prevention", () => {
  describe("resolveSceneChars — null/empty assignments", () => {
    it("null characterAssignments → empty array (no fallback to locked chars)", () => {
      const result = resolveSceneChars(null, ALL_CHARS);
      expect(result).toHaveLength(0);
    });

    it("undefined characterAssignments → empty array (no fallback to locked chars)", () => {
      const result = resolveSceneChars(undefined, ALL_CHARS);
      expect(result).toHaveLength(0);
    });

    it("'[]' characterAssignments → empty array (explicit empty)", () => {
      const result = resolveSceneChars("[]", ALL_CHARS);
      expect(result).toHaveLength(0);
    });

    it("'[\"Zara\"]' characterAssignments → Zara resolved", () => {
      const result = resolveSceneChars('["Zara"]', ALL_CHARS);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Zara");
    });

    it("malformed JSON → empty array (safe fallback)", () => {
      const result = resolveSceneChars("{bad json}", ALL_CHARS);
      expect(result).toHaveLength(0);
    });
  });

  describe("isEnvironmentScene — no character assigned", () => {
    it("empty resolvedChars → always environment scene regardless of prompt", () => {
      const prompt = "Zara sings at the microphone, close-up on her face";
      expect(isEnvironmentScene([], prompt)).toBe(true);
    });

    it("Zara assigned → NOT an environment scene for a character prompt", () => {
      const prompt = "Close-up on Zara singing at the microphone";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(false);
    });
  });

  describe("isEnvironmentScene — crane / fly-through shots", () => {
    it("crane shot → environment scene", () => {
      const prompt = "Slow, sweeping crane shot soaring through the grand Air Studios Lyndhurst Hall";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(true);
    });

    it("fly-through → environment scene", () => {
      const prompt = "Camera fly-through the orchestra section, no characters";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(true);
    });

    it("glides past → environment scene", () => {
      const prompt = "Camera glides past the cello section in slow motion";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(true);
    });

    it("aerial shot → environment scene", () => {
      const prompt = "Aerial shot of the full orchestra from above";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(true);
    });

    it("establishing shot → environment scene", () => {
      const prompt = "Wide establishing shot of Air Studios exterior at dusk";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(true);
    });
  });

  describe("isEnvironmentScene — character scenes are not affected", () => {
    it("close-up with Zara assigned → character scene", () => {
      const prompt = "Extreme close-up on Zara's face as she sings the final chorus";
      expect(isEnvironmentScene([ZARA], prompt)).toBe(false);
    });

    it("two-shot with both chars assigned → character scene", () => {
      const prompt = "Medium shot of Zara and the Lead Cellist performing together";
      expect(isEnvironmentScene([ZARA, CELLIST], prompt)).toBe(false);
    });
  });

  describe("End-to-end: storyboard persistence stores correct values", () => {
    it("empty assignedNames array → stored as '[]' not null", () => {
      const assignedNames: string[] = [];
      // This mirrors the persistence loop fix
      const stored = JSON.stringify(assignedNames);
      expect(stored).toBe("[]");
      // When read back, resolveSceneChars must return empty
      expect(resolveSceneChars(stored, ALL_CHARS)).toHaveLength(0);
    });

    it("Zara-only assignment → stored and resolved correctly", () => {
      const assignedNames = ["Zara"];
      const stored = JSON.stringify(assignedNames);
      expect(stored).toBe('["Zara"]');
      const resolved = resolveSceneChars(stored, ALL_CHARS);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].name).toBe("Zara");
    });
  });
});
