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
 * All other products (direct flow — homepage card → studio):
 *   WizVideo:   Homepage card → /music-video/create  (studio)
 *   WizAudio:   Homepage card → /music-creator       (studio)
 *   WizImage:   Homepage card → /wiz-image           (studio)
 *   WizShorts:  Homepage card → /wiz-shorts          (studio)
 *   WizScript:  Homepage card → /text-to-video       (studio)
 *
 * Rule: NEVER link a primary CTA backwards in the chain.
 * Nav/footer contextual links may point to any page in the chain.
 *
 * NOTE: WIZVIDEO_PRODUCT_PAGE references /music-video (WizVideoLandingPage).
 * WIZAUDIO_PRODUCT_PAGE references /products/wizsound (WizSoundPage).
 */

// ── WizAnimate ────────────────────────────────────────────────────────────────
/** Product info page — linked from homepage cards, nav, and cross-product links */
export const WIZANIMATE_PRODUCT_PAGE = "/products/wizanimate";
/** SEO landing page — linked from the product info page primary CTA */
export const WIZANIMATE_SEO_PAGE = "/ai-animation-maker";
/** Studio app — the final destination for all primary creation CTAs */
export const WIZANIMATE_STUDIO_PAGE = "/kids-video";

// ── WizVideo ──────────────────────────────────────────────────────────────────
/** Product landing page at /music-video (WizVideoLandingPage) */
export const WIZVIDEO_PRODUCT_PAGE = "/music-video";
/** Studio app at /music-video/create (MusicVideoAutopilot) — resumes last project from localStorage */
export const WIZVIDEO_STUDIO_PAGE = "/music-video/create";
/** Studio app with ?new=1 — always starts a completely fresh blank project, clearing all localStorage */
export const WIZVIDEO_NEW_PROJECT = "/music-video/create?new=1";

// ── WizAudio ──────────────────────────────────────────────────────────────────
/** Product info page at /products/wizsound (WizSoundPage) */
export const WIZAUDIO_PRODUCT_PAGE = "/products/wizsound";
/** Studio app at /music-creator (MusicCreator) */
export const WIZAUDIO_STUDIO_PAGE = "/music-creator";

// ── WizImage ──────────────────────────────────────────────────────────────────
/** Product info page at /products/wizimage (WizImageProductPage) */
export const WIZIMAGE_PRODUCT_PAGE = "/products/wizimage";
/** Studio app at /wiz-image (WizImage) */
export const WIZIMAGE_STUDIO_PAGE = "/wiz-image";

// ── WizShorts ─────────────────────────────────────────────────────────────────
/** Product info page at /products/wizshorts (WizShortsProductPage) */
export const WIZSHORTS_PRODUCT_PAGE = "/products/wizshorts";
/** Studio app at /wiz-shorts (WizShorts) */
export const WIZSHORTS_STUDIO_PAGE = "/wiz-shorts";

// ── WizScript ─────────────────────────────────────────────────────────────────
/** Product info page at /products/wizscript (WizScriptPage) */
export const WIZSCRIPT_PRODUCT_PAGE = "/products/wizscript";
/** Studio app at /text-to-video (TextToVideoCreator) */
export const WIZSCRIPT_STUDIO_PAGE = "/text-to-video";

// ── WizPilot ──────────────────────────────────────────────────────────────────
/** Product info page at /products/wizpilot (WizPilotPage) */
export const WIZPILOT_PRODUCT_PAGE = "/products/wizpilot";
/** Studio app at /wizpilot (Autopilot) */
export const WIZPILOT_STUDIO_PAGE = "/wizpilot";

// ── WizScore ──────────────────────────────────────────────────────────────────
/** Product info page at /products/wizscore (WizScoreInfoPage) */
export const WIZSCORE_PRODUCT_PAGE = "/products/wizscore";
/** Studio app at /wizscore (WizScore) */
export const WIZSCORE_STUDIO_PAGE = "/wizscore";

// ── WizSync ───────────────────────────────────────────────────────────────────
/** Product info page at /products/wizsync-info (WizSyncInfoPage) */
export const WIZSYNC_PRODUCT_PAGE = "/products/wizsync-info";
/** Studio app at /wizsync (WizSync) */
export const WIZSYNC_STUDIO_PAGE = "/wizsync";
