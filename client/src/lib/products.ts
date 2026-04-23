/**
 * lib/products.ts — Canonical product registry
 *
 * Single source of truth for user-facing product display data.
 * All surfaces that render product cards, navigation items, or CTAs
 * should import from here rather than defining their own inline arrays.
 *
 * Routing constants are sourced from lib/routes.ts.
 * Pricing constants are sourced from lib/pricing.ts.
 */

import {
  WIZVIDEO_PRODUCT_PAGE,
  WIZVIDEO_STUDIO_PAGE,
  WIZAUDIO_PRODUCT_PAGE,
  WIZAUDIO_STUDIO_PAGE,
  WIZIMAGE_PRODUCT_PAGE,
  WIZIMAGE_STUDIO_PAGE,
  WIZSHORTS_PRODUCT_PAGE,
  WIZSHORTS_STUDIO_PAGE,
  WIZSCRIPT_PRODUCT_PAGE,
  WIZSCRIPT_STUDIO_PAGE,
  WIZPILOT_PRODUCT_PAGE,
  WIZPILOT_STUDIO_PAGE,
  WIZSCORE_PRODUCT_PAGE,
  WIZSCORE_STUDIO_PAGE,
  WIZSYNC_PRODUCT_PAGE,
  WIZSYNC_STUDIO_PAGE,
  WIZANIMATE_PRODUCT_PAGE,
  WIZANIMATE_STUDIO_PAGE,
  WIZANIMATE_SEO_PAGE,
} from "@/lib/routes";

export interface ProductEntry {
  /** Internal identifier — stable, lowercase, no spaces */
  id: string;
  /** Canonical brand name including ™ symbol */
  name: string;
  /** One-line product tagline shown in cards and nav */
  tagline: string;
  /** 1–2 sentence description for product cards */
  shortDesc: string;
  /** CTA button label used on product cards */
  ctaLabel: string;
  /** Route to the product marketing/info page */
  productPage: string;
  /** Route to the studio/creation tool */
  studioPage: string;
}

/**
 * Canonical product list.
 * Order reflects the primary user-facing display order (most prominent first).
 */
export const PRODUCTS: ProductEntry[] = [
  {
    id: "wizvideo",
    name: "WizVideo™",
    tagline: "AI Music Video Generator",
    shortDesc:
      "Upload your track and WIZ AI builds a full music video — storyboard, scenes, characters, and cinematic visuals synced to every beat and lyric.",
    ctaLabel: "Create Your Music Video",
    productPage: WIZVIDEO_PRODUCT_PAGE,
    studioPage: WIZVIDEO_STUDIO_PAGE,
  },
  {
    id: "wizanimate",
    name: "WizAnimate™",
    tagline: "AI Character Animation Engine",
    shortDesc:
      "Bring characters and scenes to life with AI-powered animation. Beat-matched motion, emotion-driven performance, and cinematic movement.",
    ctaLabel: "Animate Your Video",
    productPage: WIZANIMATE_PRODUCT_PAGE,
    studioPage: WIZANIMATE_STUDIO_PAGE,
  },
  {
    id: "wizsound",
    name: "WizSound™",
    tagline: "AI Music & Audio Studio",
    shortDesc:
      "Create original songs and cinematic audio. Choose style, mood, and genre — then generate full tracks with studio-grade mastering.",
    ctaLabel: "Create Music Now",
    productPage: WIZAUDIO_PRODUCT_PAGE,
    studioPage: WIZAUDIO_STUDIO_PAGE,
  },
  {
    id: "wizimage",
    name: "WizImage™",
    tagline: "AI Image & Artwork Creator",
    shortDesc:
      "Describe any image and WizImage renders it in seconds. Photorealistic, cinematic, anime, oil painting, and more across 8 art styles.",
    ctaLabel: "Generate an Image",
    productPage: WIZIMAGE_PRODUCT_PAGE,
    studioPage: WIZIMAGE_STUDIO_PAGE,
  },
  {
    id: "wizshorts",
    name: "WizShorts™",
    tagline: "AI Short-Form Video Creator",
    shortDesc:
      "Produce scroll-stopping vertical short-form videos for TikTok, Instagram Reels, and YouTube Shorts — with captions, pacing, and visual hooks built in.",
    ctaLabel: "Create a Short",
    productPage: WIZSHORTS_PRODUCT_PAGE,
    studioPage: WIZSHORTS_STUDIO_PAGE,
  },
  {
    id: "wizscript",
    name: "WizScript™",
    tagline: "AI Script & Storyboard Engine",
    shortDesc:
      "Write each scene yourself for full creative control. WIZ AI generates every scene individually, giving you complete creative direction from concept to final build.",
    ctaLabel: "Write Your First Script",
    productPage: WIZSCRIPT_PRODUCT_PAGE,
    studioPage: WIZSCRIPT_STUDIO_PAGE,
  },
  {
    id: "wizpilot",
    name: "WizPilot™",
    tagline: "AI Workflow Automation Engine",
    shortDesc:
      "Describe your idea in plain text and WizPilot builds the full video script and storyboard automatically — from concept to scenes in seconds.",
    ctaLabel: "Launch WizPilot™",
    productPage: WIZPILOT_PRODUCT_PAGE,
    studioPage: WIZPILOT_STUDIO_PAGE,
  },
  {
    id: "wizscore",
    name: "WizScore™",
    tagline: "AI Video-to-Music Engine",
    shortDesc:
      "Upload a video and WizScore generates an original music track perfectly matched to its mood, pacing, and visual energy.",
    ctaLabel: "Score Your Video",
    productPage: WIZSCORE_PRODUCT_PAGE,
    studioPage: WIZSCORE_STUDIO_PAGE,
  },
  {
    id: "wizsync",
    name: "WizSync™",
    tagline: "Audio-Visual Synchronisation Engine",
    shortDesc:
      "Upload audio and WizSync separates stems, detects speakers with timestamps, and maps each voice to a character ready for AI lip-sync generation.",
    ctaLabel: "Try WizSync™",
    productPage: WIZSYNC_PRODUCT_PAGE,
    studioPage: WIZSYNC_STUDIO_PAGE,
  },
];

/** Lookup a product entry by its id. Returns undefined if not found. */
export function getProduct(id: string): ProductEntry | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * The 6 primary products shown in the main product grid and pricing coverage strip.
 * These are the products with dedicated studio pages and full marketing pages.
 */
export const PRIMARY_PRODUCTS = PRODUCTS.filter((p) =>
  ["wizvideo", "wizanimate", "wizsound", "wizimage", "wizshorts", "wizscript"].includes(p.id)
);

/**
 * WizAnimate SEO landing page route (separate from the product page).
 * Exported here for convenience since it's used alongside the product registry.
 */
export { WIZANIMATE_SEO_PAGE };
