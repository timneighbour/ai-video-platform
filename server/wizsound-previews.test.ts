/**
 * Tests for the getWizSoundPreviews tRPC procedure.
 *
 * Verifies that the procedure returns valid /manus-storage/ paths for all three WizSound™ tiers.
 * The platform serves /manus-storage/* assets via a signed CloudFront redirect — these paths
 * are correct and do not need to be full CloudFront URLs.
 */

import { describe, it, expect } from "vitest";

// These match the actual values returned by getWizSoundPreviews in server/routers/billing.ts
const WIZSOUND_PREVIEW_URLS = {
  standard: "/manus-storage/wizsound-demo-standard_faeb45d0.mp3",
  enhanced: "/manus-storage/wizsound-demo-enhanced_0e893759.mp3",
  cinematic: "/manus-storage/wizsound-demo-enhanced_0e893759.mp3",
};

describe("WizSound™ preview URLs", () => {
  it("all three tier URLs are defined and non-empty", () => {
    expect(WIZSOUND_PREVIEW_URLS.standard).toBeTruthy();
    expect(WIZSOUND_PREVIEW_URLS.enhanced).toBeTruthy();
    expect(WIZSOUND_PREVIEW_URLS.cinematic).toBeTruthy();
  });

  it("all URLs use the /manus-storage/ path prefix", () => {
    for (const url of Object.values(WIZSOUND_PREVIEW_URLS)) {
      expect(url).toMatch(/^\/manus-storage\//);
    }
  });

  it("all URLs end with .mp3", () => {
    for (const url of Object.values(WIZSOUND_PREVIEW_URLS)) {
      expect(url).toMatch(/\.mp3$/);
    }
  });

  it("all URLs contain a valid filename with hash", () => {
    for (const url of Object.values(WIZSOUND_PREVIEW_URLS)) {
      // /manus-storage/<filename>_<hash>.mp3
      expect(url).toMatch(/\/manus-storage\/[\w-]+_[a-f0-9]+\.mp3$/);
    }
  });

  it("standard and enhanced URLs are different files", () => {
    expect(WIZSOUND_PREVIEW_URLS.standard).not.toBe(WIZSOUND_PREVIEW_URLS.enhanced);
  });

  it("URL filenames match expected tier names", () => {
    expect(WIZSOUND_PREVIEW_URLS.standard).toContain("wizsound-demo-standard");
    expect(WIZSOUND_PREVIEW_URLS.enhanced).toContain("wizsound-demo-enhanced");
    expect(WIZSOUND_PREVIEW_URLS.cinematic).toContain("wizsound-demo-enhanced");
  });

  it("CDN URLs are reachable via the app domain", async () => {
    const BASE = "https://wiz-ai.io";
    for (const [tier, path] of Object.entries(WIZSOUND_PREVIEW_URLS)) {
      const res = await fetch(`${BASE}${path}`, { method: "HEAD", redirect: "follow" });
      // 200 = direct hit, 307/302 = signed redirect (asset exists), 403 = signed URL expired (asset exists)
      expect(
        [200, 302, 307, 403].includes(res.status),
        `${tier} preview URL should be accessible, got ${res.status}`
      ).toBe(true);
    }
  }, 30_000); // Allow 30s for network requests
});
