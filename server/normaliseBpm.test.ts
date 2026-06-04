/**
 * normaliseBpm.test.ts
 * Tests for the BPM half-time normalisation function.
 */
import { describe, it, expect } from "vitest";
import { normaliseBpm } from "./instrument-analysis";

describe("normaliseBpm", () => {
  it("halves 152 BPM to 76 for orchestral genre", () => {
    expect(normaliseBpm(152, "orchestral cinematic")).toBe(76);
  });

  it("halves 152 BPM to 76 for null genre (non-dance default)", () => {
    expect(normaliseBpm(152, null)).toBe(76);
  });

  it("halves 152 BPM to 76 for empty genre string", () => {
    expect(normaliseBpm(152, "")).toBe(76);
  });

  it("does NOT halve 152 BPM for EDM genre", () => {
    expect(normaliseBpm(152, "edm")).toBe(152);
  });

  it("does NOT halve 128 BPM for house genre", () => {
    expect(normaliseBpm(128, "house")).toBe(128);
  });

  it("does NOT halve 140 BPM for techno genre", () => {
    expect(normaliseBpm(140, "techno")).toBe(140);
  });

  it("does NOT modify 76 BPM (already below 120)", () => {
    expect(normaliseBpm(76, "cinematic")).toBe(76);
  });

  it("does NOT modify 90 BPM (at boundary)", () => {
    expect(normaliseBpm(90, "pop ballad")).toBe(90);
  });

  it("does NOT modify 120 BPM (at boundary)", () => {
    expect(normaliseBpm(120, "pop")).toBe(120);
  });

  it("halves 240 BPM to 120 for classical genre (double halving stops at 120)", () => {
    // 240 → 120: the loop stops at exactly 120 (not > 120), so 120 is the normalised result.
    // 120 BPM is a valid felt tempo for a moderately-paced classical piece.
    expect(normaliseBpm(240, "classical")).toBe(120);
  });

  it("returns 0 for 0 BPM (no-op)", () => {
    expect(normaliseBpm(0, null)).toBe(0);
  });

  it("halves 160 BPM to 80 for rock genre (not dance)", () => {
    expect(normaliseBpm(160, "rock")).toBe(80);
  });

  it("halves 144 BPM to 72 for ballad genre", () => {
    expect(normaliseBpm(144, "ballad")).toBe(72);
  });
});
