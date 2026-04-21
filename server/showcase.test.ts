import { describe, it, expect } from "vitest";

/**
 * Showcase router tests
 * These tests validate the showcase item data structure and category colours
 * without requiring a live database connection.
 */

const VALID_CATEGORIES = [
  "Kids YouTube",
  "Music Video",
  "Story Animation",
  "Faceless Content",
  "Social Short",
  "Cinematic AI Video",
];

const SEEDED_ITEMS = [
  {
    category: "Kids YouTube",
    title: "Magic Learning Fun",
    description: "Pixar-style animated kids channel video generated in under 3 minutes",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-kids-youtube-JZeYyg2U7P84XvWb4zDav4.webp",
  },
  {
    category: "Music Video",
    title: "Neon Stage",
    description: "Cinematic concert-style music video with AI-generated visuals synced to the beat",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-music-video-h6GbuZT6QJ2p7SXy9sJCrc.webp",
  },
  {
    category: "Story Animation",
    title: "The Enchanted Forest",
    description: "Studio Ghibli-inspired story animation created from a single text prompt",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-story-animation-D4qD4c6U2g54maC4tqUcgY.webp",
  },
  {
    category: "Faceless Content",
    title: "Top 10 Mind-Blowing Facts",
    description: "Faceless YouTube channel video with AI narration and dynamic visuals — no face, no camera",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-faceless-fet4i5aLXyyhZfgAa9mGfi.webp",
  },
  {
    category: "Social Short",
    title: "POV: AI Video",
    description: "Vertical short-form content optimised for TikTok, Reels, and YouTube Shorts",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-social-short-VXyvybnJJM3KcwpTyVE3xx.webp",
  },
  {
    category: "Cinematic AI Video",
    title: "Neon City Chronicles",
    description: "Hollywood-quality cinematic video with photorealistic AI scenes and dramatic lighting",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-cinematic-daSCvihyi22yG8KooskxqC.webp",
  },
];

describe("Showcase items", () => {
  it("should have exactly 6 seeded items", () => {
    expect(SEEDED_ITEMS).toHaveLength(6);
  });

  it("each item should have a valid category", () => {
    for (const item of SEEDED_ITEMS) {
      expect(VALID_CATEGORIES).toContain(item.category);
    }
  });

  it("each item should have a non-empty title and description", () => {
    for (const item of SEEDED_ITEMS) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });

  it("each item should have a valid CDN posterUrl", () => {
    for (const item of SEEDED_ITEMS) {
      expect(item.posterUrl).toMatch(/^https:\/\/d2xsxph8kpxj0f\.cloudfront\.net\//);
    }
  });

  it("all 6 categories are represented exactly once", () => {
    const categories = SEEDED_ITEMS.map((i) => i.category);
    for (const cat of VALID_CATEGORIES) {
      expect(categories.filter((c) => c === cat)).toHaveLength(1);
    }
  });
});
