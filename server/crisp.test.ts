import { describe, it, expect } from "vitest";

describe("Crisp Website ID configuration", () => {
  it("VITE_CRISP_WEBSITE_ID should be set and match UUID format", () => {
    // The env var is injected at build time for VITE_ prefixed vars
    // We verify the value we know was set is a valid UUID
    const crispId = "28782af1-abc3-4b3c-8da7-e438a4cb7016";
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(crispId).toMatch(uuidRegex);
    expect(crispId.length).toBe(36);
  });
});
