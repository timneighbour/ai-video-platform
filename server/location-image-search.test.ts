import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { searchLocationReferenceImage, validateImageUrl } = await import("./location-image-search");

describe("WizVision™ Location Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchLocationReferenceImage", () => {
    it("returns null for empty input", async () => {
      expect(await searchLocationReferenceImage("")).toBeNull();
    });

    it("returns null for very short input", async () => {
      expect(await searchLocationReferenceImage("ab")).toBeNull();
    });

    it("returns Wikimedia result when found", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            query: {
              search: [{ title: "File:AIR_Studios_London_2017.jpg", pageid: 12345 }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            query: {
              pages: {
                "12345": {
                  title: "File:AIR_Studios_London_2017.jpg",
                  imageinfo: [
                    {
                      url: "https://upload.wikimedia.org/wikipedia/commons/a/a8/AIR_Studios_London_2017.jpg",
                      thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/AIR_Studios_London_2017.jpg/1200px-AIR_Studios_London_2017.jpg",
                      mime: "image/jpeg",
                    },
                  ],
                },
              },
            },
          }),
        });

      const result = await searchLocationReferenceImage("Air Studios Lyndhurst Hall");

      expect(result).not.toBeNull();
      expect(result!.source).toBe("commons.wikimedia.org");
      expect(result!.url).toContain("wikimedia.org");
      expect(result!.title).toContain("AIR Studios");
    });

    it("falls back to SerpAPI when Wikimedia returns no results", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ query: { search: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            images_results: [
              {
                original: "https://www.airstudios.com/wp-content/uploads/2019/09/Hanz_Chellos_WIDE-306.jpg",
                title: "Lyndhurst Hall - AIR Studios",
                source: "airstudios.com",
                link: "https://www.airstudios.com/facilities/lyndhurst-hall/",
              },
            ],
          }),
        });

      const result = await searchLocationReferenceImage("Abbey Road Studios London");

      expect(result).not.toBeNull();
      expect(result!.source).toBe("airstudios.com");
      expect(result!.url).toContain("airstudios.com");
    });

    it("returns null when both sources fail", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 429 });

      const result = await searchLocationReferenceImage("Some Unknown Venue XYZ123");
      expect(result).toBeNull();
    });

    it("filters out blocked social media domains from SerpAPI results", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ query: { search: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            images_results: [
              {
                original: "https://i.pinimg.com/originals/abc123.jpg",
                title: "Some venue on Pinterest",
                source: "pinterest.com",
                link: "https://www.pinterest.com/pin/123",
              },
            ],
          }),
        });

      const result = await searchLocationReferenceImage("Some Venue");
      expect(result).toBeNull();
    });

    it("handles SerpAPI error response gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ query: { search: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ error: "Invalid API key" }),
        });

      const result = await searchLocationReferenceImage("Royal Albert Hall");
      expect(result).toBeNull();
    });
  });

  describe("validateImageUrl", () => {
    it("returns true for valid image URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: (h: string) => h === "content-type" ? "image/jpeg" : null },
      });

      const result = await validateImageUrl("https://example.com/image.jpg");
      expect(result).toBe(true);
    });

    it("returns false for non-image content type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: (h: string) => h === "content-type" ? "text/html" : null },
      });

      const result = await validateImageUrl("https://example.com/page.html");
      expect(result).toBe(false);
    });

    it("returns false for 404 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await validateImageUrl("https://example.com/missing.jpg");
      expect(result).toBe(false);
    });
  });
});
