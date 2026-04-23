/**
 * Shared routing constants for WIZ AI product pages.
 *
 * ROUTING CHAINS:
 *
 * WizAnimate (Option A — forward flow):
 *   Homepage/Nav card  →  WIZANIMATE_PRODUCT_PAGE   (/products/wizanimate)
 *   Product info CTA   →  WIZANIMATE_SEO_PAGE        (/ai-animation-maker)
 *   SEO landing CTA    →  WIZANIMATE_STUDIO_PAGE     (/kids-video)
 *
 * Rule: NEVER link a primary CTA backwards in the chain.
 * Nav/footer contextual links may point to any page in the chain.
 */

// ── WizAnimate ────────────────────────────────────────────────────────────────
/** Product info page — linked from homepage cards, nav, and cross-product links */
export const WIZANIMATE_PRODUCT_PAGE = "/products/wizanimate";
/** SEO landing page — linked from the product info page primary CTA */
export const WIZANIMATE_SEO_PAGE = "/ai-animation-maker";
/** Studio app — the final destination for all primary creation CTAs */
export const WIZANIMATE_STUDIO_PAGE = "/kids-video";

// ── WizVideo ──────────────────────────────────────────────────────────────────
export const WIZVIDEO_PRODUCT_PAGE = "/products/wizvideo";
export const WIZVIDEO_STUDIO_PAGE = "/music-video/create";

// ── WizAudio ──────────────────────────────────────────────────────────────────
export const WIZAUDIO_PRODUCT_PAGE = "/products/wizaudio";
export const WIZAUDIO_STUDIO_PAGE = "/music-creator";

// ── WizImage ──────────────────────────────────────────────────────────────────
export const WIZIMAGE_PRODUCT_PAGE = "/products/wizimage";
export const WIZIMAGE_STUDIO_PAGE = "/wiz-image";

// ── WizShorts ─────────────────────────────────────────────────────────────────
export const WIZSHORTS_PRODUCT_PAGE = "/products/wizshorts";
export const WIZSHORTS_STUDIO_PAGE = "/wiz-shorts";

// ── WizScript ─────────────────────────────────────────────────────────────────
export const WIZSCRIPT_PRODUCT_PAGE = "/products/wizscript";
export const WIZSCRIPT_STUDIO_PAGE = "/text-to-video";

// ── WizPilot ──────────────────────────────────────────────────────────────────
export const WIZPILOT_STUDIO_PAGE = "/wizpilot";

// ── WizScore ──────────────────────────────────────────────────────────────────
export const WIZSCORE_STUDIO_PAGE = "/wiz-score";

// ── WizSync ───────────────────────────────────────────────────────────────────
export const WIZSYNC_STUDIO_PAGE = "/wizsync";
