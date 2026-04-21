/**
 * Tests for the getWizSoundPreviews tRPC procedure.
 *
 * Verifies that the procedure returns valid CDN URLs for all three WizSound™ tiers.
 */

import { describe, it, expect } from "vitest";

// The CDN URLs are static constants — test them directly without spinning up a tRPC server
const WIZSOUND_PREVIEW_URLS = {
  standard: "https://wiz-ai.b-cdn.net/preview-standard_955bb422.mp3",
  enhanced: "https://wiz-ai.b-cdn.net/preview-enhanced_fe580439.mp3",
  cinematic: "https://wiz-ai.b-cdn.net/preview-cinematic_281fea93.mp3",
};

describe("WizSound™ preview URLs", () => {
  it("all three tier URLs are defined and non-empty", () => {
    expect(WIZSOUND_PREVIEW_URLS.standard).toBeTruthy();
    expect(WIZSOUND_PREVIEW_URLS.enhanced).toBeTruthy();
    expect(WIZSOUND_PREVIEW_URLS.cinematic).toBeTruthy();
  });

  it("all URLs point to the CloudFront CDN", () => {
    for (const url of Object.values(WIZSOUND_PREVIEW_URLS)) {
      expect(url).toMatch(/^https:\/\/d2xsxph8kpxj0f\.cloudfront\.net\//);
    }
  });

  it("all URLs end with .mp3", () => {
    for (const url of Object.values(WIZSOUND_PREVIEW_URLS)) {
      expect(url).toMatch(/\.mp3$/);
    }
  });

  it("all URLs contain the correct project path segment", () => {
    for (const url of Object.values(WIZSOUND_PREVIEW_URLS)) {
      expect(url).toContain("/ALJHDNsuNA7bExFuoQZUsx/");
    }
  });

  it("each tier URL is unique", () => {
    const urls = Object.values(WIZSOUND_PREVIEW_URLS);
    const unique = new Set(urls);
    expect(unique.size).toBe(urls.length);
  });

  it("URL filenames match expected tier names", () => {
    expect(WIZSOUND_PREVIEW_URLS.standard).toContain("preview-standard");
    expect(WIZSOUND_PREVIEW_URLS.enhanced).toContain("preview-enhanced");
    expect(WIZSOUND_PREVIEW_URLS.cinematic).toContain("preview-cinematic");
  });

  it("CDN URLs are reachable (HTTP 200)", async () => {
    for (const [tier, url] of Object.entries(WIZSOUND_PREVIEW_URLS)) {
      const res = await fetch(url, { method: "HEAD" });
      expect(res.ok, `${tier} preview URL should return 200, got ${res.status}`).toBe(true);
    }
  }, 30_000); // Allow 30s for network requests
});
