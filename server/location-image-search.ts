/**
 * WizVision™ Location Engine
 *
 * Automatically finds a real-world reference photo for a given location string
 * (e.g. "Air Studios Lyndhurst Hall", "Wembley Stadium", "Times Square New York")
 * and returns a URL that can be injected into FLUX image generation as visual conditioning.
 *
 * Strategy (in order):
 *   1. DB cache — check venueImageCache first (30-day TTL), avoids burning SerpAPI quota
 *   2. SerpAPI Google Images — PRIMARY source, highest quality, most current photos
 *   3. Wikimedia Commons — free fallback if SerpAPI key is unavailable or quota exhausted
 *   4. null — graceful fallback, generation continues without reference image
 */

import { getDb } from "./db";
import { venueImageCache } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const CACHE_TTL_DAYS = 30;

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

/** Normalise a query string to a stable cache key */
function toCacheKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 200);
}

// ─── DB Cache ─────────────────────────────────────────────────────────────────

async function getCachedResult(queryKey: string): Promise<LocationImageResult | null> {
  try {
    const now = new Date();
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(venueImageCache)
      .where(and(eq(venueImageCache.queryKey, queryKey), gt(venueImageCache.expiresAt, now)))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    console.log(`[WizVision] Cache HIT for "${queryKey}" → ${row.imageUrl.slice(0, 80)}...`);
    return {
      url: row.imageUrl,
      title: row.imageTitle ?? queryKey,
      source: row.imageSource ?? "cache",
    };
  } catch (err) {
    console.warn(`[WizVision] Cache lookup failed: ${(err as Error).message}`);
    return null;
  }
}

async function setCachedResult(queryKey: string, result: LocationImageResult): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const db = await getDb();
    if (!db) return;
    await db
      .insert(venueImageCache)
      .values({
        queryKey,
        imageUrl: result.url,
        imageTitle: result.title.slice(0, 499),
        imageSource: result.source.slice(0, 254),
        expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          imageUrl: result.url,
          imageTitle: result.title.slice(0, 499),
          imageSource: result.source.slice(0, 254),
          expiresAt,
        },
      });
    console.log(`[WizVision] Cached result for "${queryKey}" (expires ${expiresAt.toISOString()})`);
  } catch (err) {
    console.warn(`[WizVision] Cache write failed: ${(err as Error).message}`);
    // Non-fatal — continue without caching
  }
}

// ─── Source 1: SerpAPI Google Images (PRIMARY) ───────────────────────────────

/**
 * Search Google Images via SerpAPI for a real photo of the location.
 * This is the PRIMARY source — Google Images provides the highest quality,
 * most current, and most comprehensive coverage of any venue worldwide.
 * Requires SERPAPI_API_KEY.
 */
async function searchSerpApiImages(query: string): Promise<LocationImageResult | null> {
  if (!SERPAPI_KEY) {
    console.warn("[WizVision] SERPAPI_API_KEY not set — skipping Google Images search");
    return null;
  }

  try {
    // tbs params: isz:l = large images, isc:color = colour only (excludes B&W)
    const params = new URLSearchParams({
      api_key: SERPAPI_KEY,
      engine: "google_images",
      q: query,
      num: "15",
      safe: "active",
      tbs: "isz:l,isc:color", // large images + colour only
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!response.ok) {
      console.warn(`[WizVision] SerpAPI HTTP ${response.status} for query: "${query}"`);
      return null;
    }

    const data = await response.json() as {
      error?: string;
      images_results?: Array<{
        original: string;
        title: string;
        source: string;
        link: string;
        original_width?: number;
        original_height?: number;
      }>;
    };

    if (data.error) {
      console.warn(`[WizVision] SerpAPI error: ${data.error}`);
      return null;
    }

    if (!data.images_results?.length) return null;

    // Filter out social media and low-quality sources
    const blockedDomains = ["pinterest", "facebook", "instagram", "twitter", "tiktok", "reddit", "tumblr", "flickr", "alamy", "shutterstock", "gettyimages", "istockphoto"];
    // Preferred high-quality press/architecture sources get a scoring boost
    const preferredDomains = ["dezeen", "architecturaldigest", "timeout", "bbc", "theguardian", "nytimes", "rollingstone", "billboard", "architectmagazine", "archdaily", "visitlondon", "visitlasvegas", "carnegiehal", "royalalberthall", "sydneyoperahouse", "o2", "madisonsg", "wembley", "msg"];
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

    // Score: prefer landscape orientation + larger size + preferred sources
    const scored = validItems.map(item => {
      const w = item.original_width ?? 0;
      const h = item.original_height ?? 0;
      const src = (item.source ?? "").toLowerCase();
      const link = (item.link ?? "").toLowerCase();
      const sizeScore = w * h;
      // Landscape images (wider than tall) are far more likely to be venue interiors
      const landscapeBonus = (w > h && h > 0) ? 1.5 : 1.0;
      // Preferred domain bonus
      const domainBonus = preferredDomains.some(d => src.includes(d) || link.includes(d)) ? 2.0 : 1.0;
      return { item, score: sizeScore * landscapeBonus * domainBonus };
    });
    const sorted = scored.sort((a, b) => b.score - a.score).map(s => s.item);

    const best = sorted[0];
    console.log(`[WizVision] Google Images (SerpAPI) found: "${best.title}" from ${best.source} — ${best.original_width ?? "?"}×${best.original_height ?? "?"}`);

    return {
      url: best.original,
      title: best.title,
      source: best.source ?? (() => { try { return new URL(best.original).hostname; } catch { return "google-images"; } })(),
    };
  } catch (err) {
    console.warn(`[WizVision] SerpAPI search failed: ${(err as Error).message}`);
    return null;
  }
}

// ─── Source 2: Wikimedia Commons (fallback only) ─────────────────────────────

/**
 * Search Wikimedia Commons for a real photo of the location.
 * Used as a fallback ONLY when SerpAPI is unavailable or returns no results.
 */
async function searchWikimediaCommons(query: string): Promise<LocationImageResult | null> {
  try {
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

    const queryLower = query.toLowerCase();
    const preferred = results.find(r =>
      r.title.toLowerCase().includes("interior") ||
      queryLower.split(" ").some(word => word.length > 4 && r.title.toLowerCase().includes(word))
    ) ?? results[0];

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

    const mime = info.mime ?? "";
    if (!mime.startsWith("image/")) return null;

    const imageUrl = info.thumburl ?? info.url;
    console.log(`[WizVision] Wikimedia fallback found: "${preferred.title}" → ${imageUrl.slice(0, 80)}...`);

    return {
      url: imageUrl,
      title: preferred.title.replace("File:", "").replace(/_/g, " "),
      source: "commons.wikimedia.org",
    };
  } catch (err) {
    console.warn(`[WizVision] Wikimedia fallback search failed: ${(err as Error).message}`);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search for a real-world reference image for the given location.
 * Checks the DB cache first (30-day TTL) to avoid burning SerpAPI quota.
 * Uses SerpAPI Google Images as the PRIMARY live source (highest quality),
 * with Wikimedia Commons as a fallback.
 * Returns null if no suitable image is found — generation continues without it.
 */
/**
 * Same as searchLocationReferenceImage but uses the query verbatim — no cleaning.
 * Use this when the caller already provides a curated, precise search query
 * (e.g. from the venue picker's thumbnailSearchQuery field).
 */
export async function searchLocationReferenceImageRaw(
  rawQuery: string
): Promise<LocationImageResult | null> {
  if (!rawQuery || rawQuery.trim().length < 3) return null;
  const query = rawQuery.trim().slice(0, 200);
  const cacheKey = toCacheKey(query);
  console.log(`[WizVision] Searching for venue reference (raw query): "${query}"`);
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached;
  const serpResult = await searchSerpApiImages(query);
  if (serpResult) { await setCachedResult(cacheKey, serpResult); return serpResult; }
  console.log(`[WizVision] SerpAPI returned no results for "${query}" — trying Wikimedia fallback`);
  const wikimediaResult = await searchWikimediaCommons(query);
  if (wikimediaResult) { await setCachedResult(cacheKey, wikimediaResult); return wikimediaResult; }
  console.log(`[WizVision] No reference image found for: "${query}" — continuing without`);
  return null;
}

export async function searchLocationReferenceImage(
  sceneSetting: string
): Promise<LocationImageResult | null> {
  if (!sceneSetting || sceneSetting.trim().length < 3) return null;

  const query = buildSearchQuery(sceneSetting);
  const cacheKey = toCacheKey(query);

  console.log(`[WizVision] Searching for location reference: "${query}" (primary: Google Images via SerpAPI)`);

  // STEP 1: Check DB cache — avoids burning SerpAPI quota for repeated venues
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached;

  // STEP 2: PRIMARY — SerpAPI Google Images (highest quality, most current)
  const serpResult = await searchSerpApiImages(query);
  if (serpResult) {
    await setCachedResult(cacheKey, serpResult);
    return serpResult;
  }

  // STEP 3: FALLBACK — Wikimedia Commons (free, no billing, good for famous landmarks)
  console.log(`[WizVision] SerpAPI returned no results for "${query}" — trying Wikimedia fallback`);
  const wikimediaResult = await searchWikimediaCommons(query);
  if (wikimediaResult) {
    await setCachedResult(cacheKey, wikimediaResult);
    return wikimediaResult;
  }

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
