import { describe, it, expect } from "vitest";
import { validateWaveSpeedKey } from "./ai-apis/wavespeed";

describe("WaveSpeed API", () => {
  it("should validate WaveSpeed API key", async () => {
    const isValid = await validateWaveSpeedKey();
    expect(isValid).toBe(true);
  });
});
