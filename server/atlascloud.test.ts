import { describe, it, expect } from "vitest";
import { validateAtlasKey } from "./ai-apis/atlascloud";

describe("Atlas Cloud API Key Validation", () => {
  it("should have ATLAS_CLOUD_API_KEY set", () => {
    const key = process.env.ATLAS_CLOUD_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should validate Atlas Cloud API key successfully", async () => {
    const isValid = await validateAtlasKey();
    expect(isValid).toBe(true);
  }, 15_000);
});
