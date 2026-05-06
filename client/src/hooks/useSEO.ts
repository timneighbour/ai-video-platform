/**
 * useSEO — per-page SEO tag injection
 *
 * Injects canonical, og:url, og:title, og:description, og:image, and
 * twitter tags into the live DOM so that every page has its own
 * self-referencing canonical URL instead of the global fallback in
 * index.html (which always points to https://wiz-ai.io/).
 *
 * This fixes two Google Search Console issues:
 *   1. "Duplicate without user-selected canonical" — all pages were
 *      sharing the homepage canonical tag.
 *   2. "Page with redirect" — www.wiz-ai.io redirects to wiz-ai.io,
 *      so any page that had www in its canonical was flagged.
 *
 * Usage:
 *   useSEO({ title: "Pricing — WIZ AI", path: "/pricing" })
 *   useSEO({ title: "...", path: "/blog", description: "...", image: "..." })
 *   useSEO({ title: "Studio — WIZ AI", path: "/music-creator", noindex: true })
 */

import { useEffect } from "react";

const BASE_URL = "https://wiz-ai.io";
const DEFAULT_IMAGE =
  "https://wiz-ai.io/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";
const DEFAULT_DESCRIPTION =
  "WIZ AI is the premium AI creative platform. Generate videos, music, images, and animation from a single prompt. No editing experience needed.";

interface SEOOptions {
  /** Page title — will be set as document.title */
  title: string;
  /** Absolute path, e.g. "/pricing" or "/blog/my-post". Must start with /. */
  path: string;
  /** Optional override for meta description */
  description?: string;
  /** Optional override for og:image */
  image?: string;
  /** Optional og:type — defaults to "website" */
  type?: string;
  /**
   * When true, sets <meta name="robots" content="noindex, nofollow">.
   * Use for auth-gated pages, duplicate routes, and thin utility pages
   * that should not appear in search results.
   */
  noindex?: boolean;
}

function setMetaTag(
  name: string,
  content: string,
  useProperty = false
): void {
  const attr = useProperty ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSEO({
  title,
  path,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
}: SEOOptions): void {
  useEffect(() => {
    const canonicalUrl = `${BASE_URL}${path}`;

    // Document title
    document.title = title;

    // Robots — noindex for auth-gated / duplicate pages
    setMetaTag("robots", noindex ? "noindex, nofollow" : "index, follow");

    // Canonical
    setLinkTag("canonical", canonicalUrl);

    // Open Graph
    setMetaTag("og:type", type, true);
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:url", canonicalUrl, true);
    // Ensure OG image is always an absolute URL for social crawlers
    const absoluteImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;
    setMetaTag("og:image", absoluteImage, true);
    setMetaTag("og:site_name", "WIZ AI", true);

    // Twitter Card
    setMetaTag("twitter:url", canonicalUrl);
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    setMetaTag("twitter:image", absoluteImage);
  }, [title, path, description, image, type, noindex]);
}
