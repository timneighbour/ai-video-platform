import { describe, it, expect } from "vitest";
import { validateHyperealKey } from "./ai-apis/hypereal";

describe("Hypereal AI API Key", () => {
  it("HYPEREAL_API_KEY should be set", () => {
    expect(process.env.HYPEREAL_API_KEY).toBeTruthy();
    expect(process.env.HYPEREAL_API_KEY!.length).toBeGreaterThan(10);
  });

  it("HYPEREAL_API_KEY should be valid (not rejected by API)", async () => {
    const isValid = await validateHyperealKey();
    expect(isValid).toBe(true);
  }, 20_000);
});
