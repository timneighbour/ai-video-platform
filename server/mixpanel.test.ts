/**
 * Mixpanel token validation test
 * Verifies VITE_MIXPANEL_TOKEN is set and is a valid 32-char hex token
 */
import { describe, it, expect } from "vitest";

describe("Mixpanel token", () => {
  it("VITE_MIXPANEL_TOKEN is set and is a valid 32-char hex token", () => {
    // In vitest, VITE_ vars are available via import.meta.env — but since this
    // runs in a Node context we read it from process.env (Vite exposes them there too)
    const token = process.env.VITE_MIXPANEL_TOKEN;
    expect(token, "VITE_MIXPANEL_TOKEN must be set").toBeTruthy();
    expect(token!.length, "Mixpanel token must be 32 characters").toBe(32);
    expect(/^[a-f0-9]+$/i.test(token!), "Mixpanel token must be a hex string").toBe(true);
  });
});
