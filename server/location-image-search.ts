/**
 * WizVision™ Location Engine
 *
 * Automatically finds a real-world reference photo for a given location string
 * (e.g. "Air Studios Lyndhurst Hall", "Wembley Stadium", "Times Square New York")
 * and returns a URL that can be injected into FLUX image generation as visual conditioning.
 *
 * Strategy (in order):
 *   1. Wikimedia Commons — free, no key, excellent for famous venues worldwide
 *   2. SerpAPI Google Images — reliable fallback with 100 free searches/month
 *   3. null — graceful fallback, generation continues without reference image
 */

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

export interface LocationImageResult {
  url: string;
  title: string;
  source: string;
}

// ─── Query normalisation ──────────────────────────────────────────────────────

/**
 * Normalise a scene setting string into a focused search query.
 * Strips directorial language and keeps only the location name.
 */
function buildSearchQuery(sceneSetting: string): string {
  const cleaned = sceneSetting
    .replace(/\b(cinematic|dramatic|moody|atmospheric|warm|cool|golden|soft|harsh|beautiful|stunning|epic|intimate|grand|vast)\b/gi, "")
    .replace(/\b(lighting|light|lit|illuminated|glowing|bokeh|haze|fog|mist)\b/gi, "")
    .replace(/\b(camera|shot|angle|close.?up|wide|medium|tracking|dolly|pan|tilt)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const indoorKeywords = ["hall", "studio", "arena", "theatre", "theater", "church", "cathedral", "abbey", "palace", "ballroom", "auditorium", "stage", "room"];
  const isIndoor = indoorKeywords.some(kw => cleaned.toLowerCase().includes(kw));

  const query = isIndoor ? `${cleaned} interior` : cleaned;
  return query.slice(0, 120);
}

// ─── Source 1: Wikimedia Commons ─────────────────────────────────────────────

/**
 * Search Wikimedia Commons for a real photo of the location.
 * Completely free, no API key required.
 * Excellent coverage of famous venues, cities, landmarks worldwide.
 */
async function searchWikimediaCommons(query: string): Promise<LocationImageResult | null> {
  try {
    // Step 1: Search for matching files in Commons
    const searchParams = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "6", // File namespace
      format: "json",
      srlimit: "5",
      origin: "*",
    });

    const searchRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?${searchParams}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json() as {
      query?: { search?: Array<{ title: string; pageid: number }> };
    };

    const results = searchData.query?.search ?? [];
    if (results.length === 0) return null;

    // Prefer results with "interior" or the venue name in the title
    const queryLower = query.toLowerCase();
    const preferred = results.find(r =>
      r.title.toLowerCase().includes("interior") ||
      queryLower.split(" ").some(word => word.length > 4 && r.title.toLowerCase().includes(word))
    ) ?? results[0];

    // Step 2: Get the actual image URL for the chosen file
    const imageParams = new URLSearchParams({
      action: "query",
      titles: preferred.title,
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "1200",
      format: "json",
      origin: "*",
    });

    const imageRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?${imageParams}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!imageRes.ok) return null;

    const imageData = await imageRes.json() as {
      query?: {
        pages?: Record<string, {
          title: string;
          imageinfo?: Array<{ url: string; thumburl?: string; mime?: string }>;
        }>;
      };
    };

    const pages = imageData.query?.pages ?? {};
    const page = Object.values(pages)[0];
    const info = page?.imageinfo?.[0];

    if (!info?.url) return null;

    // Only accept image MIME types
    const mime = info.mime ?? "";
    if (!mime.startsWith("image/")) return null;

    // Prefer thumbnail URL (resized) if available, else full URL
    const imageUrl = info.thumburl ?? info.url;

    console.log(`[WizVision] Wikimedia found: "${preferred.title}" → ${imageUrl.slice(0, 80)}...`);

    return {
      url: imageUrl,
      title: preferred.title.replace("File:", "").replace(/_/g, " "),
      source: "commons.wikimedia.org",
    };
  } catch (err) {
    console.warn(`[WizVision] Wikimedia search failed: ${(err as Error).message}`);
    return null;
  }
}

// ─── Source 2: SerpAPI Google Images (reliable fallback) ─────────────────────

/**
 * Search Google Images via SerpAPI for a real photo of the location.
 * Requires SERPAPI_API_KEY. Free tier: 100 searches/month.
 * Excellent coverage of any location worldwide.
 */
async function searchSerpApiImages(query: string): Promise<LocationImageResult | null> {
  if (!SERPAPI_KEY) return null;

  try {
    const params = new URLSearchParams({
      api_key: SERPAPI_KEY,
      engine: "google_images",
      q: query,
      num: "10",
      safe: "active",
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!response.ok) return null;

    const data = await response.json() as {
      error?: string;
      images_results?: Array<{
        original: string;
        title: string;
        source: string;
        link: string;
      }>;
    };

    if (data.error) {
      console.warn(`[WizVision] SerpAPI error: ${data.error}`);
      return null;
    }

    if (!data.images_results?.length) return null;

    const blockedDomains = ["pinterest", "facebook", "instagram", "twitter", "tiktok", "reddit"];
    const validItems = data.images_results.filter(item => {
      const src = item.source?.toLowerCase() ?? "";
      const link = item.link?.toLowerCase() ?? "";
      return (
        !blockedDomains.some(blocked => src.includes(blocked) || link.includes(blocked)) &&
        item.original &&
        (item.original.startsWith("http://") || item.original.startsWith("https://"))
      );
    });

    if (!validItems.length) return null;

    const best = validItems[0];
    console.log(`[WizVision] SerpAPI found: "${best.title}" from ${best.source}`);

    return {
      url: best.original,
      title: best.title,
      source: best.source ?? (() => { try { return new URL(best.original).hostname; } catch { return "serpapi"; } })(),
    };
  } catch (err) {
    console.warn(`[WizVision] SerpAPI search failed: ${(err as Error).message}`);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search for a real-world reference image for the given location.
 * Tries Wikimedia Commons first, then SerpAPI Google Images as fallback.
 * Returns null if no suitable image is found — generation continues without it.
 */
export async function searchLocationReferenceImage(
  sceneSetting: string
): Promise<LocationImageResult | null> {
  if (!sceneSetting || sceneSetting.trim().length < 3) return null;

  const query = buildSearchQuery(sceneSetting);
  console.log(`[WizVision] Searching for location reference: "${query}"`);

  // Try Wikimedia Commons first (free, no billing required)
  const wikimediaResult = await searchWikimediaCommons(query);
  if (wikimediaResult) return wikimediaResult;

  // Fallback to SerpAPI Google Images
  const serpResult = await searchSerpApiImages(query);
  if (serpResult) return serpResult;

  console.log(`[WizVision] No reference image found for: "${query}" — continuing without`);
  return null;
}

/**
 * Validate that a reference image URL is accessible (returns 200 with image content-type).
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}
