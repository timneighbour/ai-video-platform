import { describe, it, expect } from "vitest";

describe("Mixpanel token", () => {
  it("VITE_MIXPANEL_TOKEN should be set and non-empty", () => {
    const token = process.env.VITE_MIXPANEL_TOKEN;
    expect(token).toBeDefined();
    expect(token?.length).toBeGreaterThan(0);
  });

  it("VITE_MIXPANEL_TOKEN should look like a valid Mixpanel token (hex string)", () => {
    const token = process.env.VITE_MIXPANEL_TOKEN ?? "";
    // Mixpanel tokens are 32-char hex strings
    expect(token).toMatch(/^[0-9a-f]{32}$/i);
  });
});
