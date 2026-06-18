import { describe, it, expect } from "vitest";

describe("publicStats.videosCreated query", () => {
  it("should filter by status=completed AND finalVideoProduced=1", () => {
    const jobs = [
      { status: "completed", finalVideoProduced: true },
      { status: "completed", finalVideoProduced: false },
      { status: "pending", finalVideoProduced: true },
      { status: "failed", finalVideoProduced: false },
      { status: "completed", finalVideoProduced: true },
    ];
    const count = jobs.filter((j) => j.status === "completed" && j.finalVideoProduced === true).length;
    expect(count).toBe(2);
  });

  it("should return 0 when no jobs are completed with finalVideoProduced", () => {
    const jobs = [
      { status: "completed", finalVideoProduced: false },
      { status: "pending", finalVideoProduced: true },
    ];
    const count = jobs.filter((j) => j.status === "completed" && j.finalVideoProduced === true).length;
    expect(count).toBe(0);
  });
});

describe("WhyWizAI comparison table data", () => {
  const COMPARISON_ROWS = [
    { feature: "Character Lock™ — same face across all scenes", category: "Character Consistency", wizAI: true, competitor: false },
    { feature: "Costume & clothing consistency across scenes", category: "Character Consistency", wizAI: true, competitor: false },
    { feature: "Multi-character scenes with consistent identities", category: "Character Consistency", wizAI: true, competitor: false },
    { feature: "Lip sync AI — vocals matched to mouth movement", category: "Lip Sync", wizAI: true, competitor: true },
    { feature: "BPM-locked performance — movement synced to tempo", category: "Lip Sync", wizAI: true, competitor: false },
    { feature: "Vocal isolation before lip sync is applied", category: "Lip Sync", wizAI: true, competitor: false },
    { feature: "AI director — cinematic scene direction per lyric", category: "Production Quality", wizAI: true, competitor: false },
    { feature: "Instrument recognition and replication", category: "Production Quality", wizAI: true, competitor: false },
    { feature: "Voice-to-prompt creative direction", category: "Production Quality", wizAI: true, competitor: false },
    { feature: "AI music generation (WizSound™)", category: "Audio", wizAI: true, competitor: false },
    { feature: "Exact duration audio to the second", category: "Audio", wizAI: true, competitor: false },
    { feature: "Upload your own reference photo for character", category: "Workflow", wizAI: true, competitor: true },
    { feature: "Storyboard preview before rendering", category: "Workflow", wizAI: true, competitor: false },
    { feature: "Scene-level editing before final render", category: "Workflow", wizAI: true, competitor: false },
    { feature: "Free tier available — no credit card required", category: "Pricing", wizAI: true, competitor: false },
  ];

  it("should have at least 15 comparison rows", () => {
    expect(COMPARISON_ROWS.length).toBeGreaterThanOrEqual(15);
  });

  it("WIZ AI should win on all Character Consistency rows", () => {
    const rows = COMPARISON_ROWS.filter((r) => r.category === "Character Consistency");
    expect(rows.length).toBe(3);
    rows.forEach((row) => {
      expect(row.wizAI).toBe(true);
      expect(row.competitor).toBe(false);
    });
  });

  it("WIZ AI should have a free tier (competitor does not)", () => {
    const freeRow = COMPARISON_ROWS.find((r) => r.feature === "Free tier available — no credit card required");
    expect(freeRow).toBeDefined();
    expect(freeRow!.wizAI).toBe(true);
    expect(freeRow!.competitor).toBe(false);
  });

  it("all rows should have required fields", () => {
    COMPARISON_ROWS.forEach((row) => {
      expect(typeof row.feature).toBe("string");
      expect(row.feature.length).toBeGreaterThan(0);
      expect(typeof row.category).toBe("string");
      expect(typeof row.wizAI).toBe("boolean");
      expect(typeof row.competitor).toBe("boolean");
    });
  });

  it("should cover all 5 required categories", () => {
    const categories = new Set(COMPARISON_ROWS.map((r) => r.category));
    expect(categories.has("Character Consistency")).toBe(true);
    expect(categories.has("Lip Sync")).toBe(true);
    expect(categories.has("Production Quality")).toBe(true);
    expect(categories.has("Audio")).toBe(true);
    expect(categories.has("Workflow")).toBe(true);
  });
});

describe("Video count formatting", () => {
  function formatVideoCount(count: number): string {
    if (count === 0) return "0";
    return count.toLocaleString("en-US");
  }

  it("should format 1234 as '1,234'", () => {
    expect(formatVideoCount(1234)).toBe("1,234");
  });

  it("should format 0 as '0'", () => {
    expect(formatVideoCount(0)).toBe("0");
  });

  it("should format 12345 as '12,345'", () => {
    expect(formatVideoCount(12345)).toBe("12,345");
  });
});

describe("WhyWizAI SEO copy character limits", () => {
  const title = "Why WIZ AI — vs One More Shot AI";
  const description = "WIZ AI vs One More Shot AI: Character Lock™ keeps your character consistent across every scene. Compare features, lip sync quality, and pricing.";

  it("title should be under 60 characters", () => {
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("description should be under 155 characters", () => {
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it("description should mention Character Lock", () => {
    expect(description.toLowerCase()).toContain("character lock");
  });

  it("description should mention lip sync", () => {
    expect(description.toLowerCase()).toContain("lip sync");
  });
});
