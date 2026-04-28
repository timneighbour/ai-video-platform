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
  /**
   * Visual tokens used in nav dropdowns, product grids, and cards.
   * Defined once here so Home.tsx and PublicNavBar.tsx never diverge.
   */
  glowColor: string;
  bgGradient: string;
  borderColor: string;
}

/**
 * Canonical product list.
 * Order reflects the primary user-facing display order (most prominent first).
 *
 * ⚠️  To change the display order, edit this array only.
 *     Home.tsx and PublicNavBar.tsx both derive from PRIMARY_PRODUCTS below.
 */
export const PRODUCTS: ProductEntry[] = [
  // ── 1. WizAudio — music creation studio (flagship audio product) ──────────────
  {
    id: "wizsound",
    name: "WizAudio™",
    tagline: "AI Music & Audio Studio",
    shortDesc:
      "Create original songs and cinematic audio. Choose style, mood, and genre — then generate full tracks with studio-grade mastering.",
    ctaLabel: "Create Music Now",
    productPage: WIZAUDIO_PRODUCT_PAGE,
    studioPage: WIZAUDIO_STUDIO_PAGE,
    glowColor: "oklch(0.72 0.18 160)",
    bgGradient: "linear-gradient(135deg, oklch(0.25 0.06 160 / 0.9) 0%, oklch(0.18 0.04 160 / 0.95) 100%)",
    borderColor: "oklch(0.72 0.18 160 / 0.35)",
  },
  // ── 2. WizImage — image & artwork creator ────────────────────────────────────
  {
    id: "wizimage",
    name: "WizImage™",
    tagline: "AI Image & Artwork Creator",
    shortDesc:
      "Describe any image and WizImage renders it in seconds. Photorealistic, cinematic, anime, oil painting, and more across 8 art styles.",
    ctaLabel: "Generate an Image",
    productPage: WIZIMAGE_PRODUCT_PAGE,
    studioPage: WIZIMAGE_STUDIO_PAGE,
    glowColor: "oklch(0.78 0.11 75)",
    bgGradient: "linear-gradient(135deg, oklch(0.28 0.08 75 / 0.9) 0%, oklch(0.20 0.06 75 / 0.95) 100%)",
    borderColor: "oklch(0.78 0.11 75 / 0.35)",
  },
  // ── 3. WizVideo — flagship music video generator ─────────────────────────────
  {
    id: "wizvideo",
    name: "WizVideo™",
    tagline: "AI Music Video Generator",
    shortDesc:
      "Upload your track and WIZ AI builds a full music video — storyboard, scenes, characters, and cinematic visuals synced to every beat and lyric.",
    ctaLabel: "Create Your Music Video",
    productPage: WIZVIDEO_PRODUCT_PAGE,
    studioPage: WIZVIDEO_STUDIO_PAGE,
    glowColor: "oklch(0.70 0.18 260)",
    bgGradient: "linear-gradient(135deg, oklch(0.22 0.08 260 / 0.9) 0%, oklch(0.16 0.06 260 / 0.95) 100%)",
    borderColor: "oklch(0.70 0.18 260 / 0.35)",
  },
  // ── 4. WizAnimate — character animation engine ───────────────────────────────
  {
    id: "wizanimate",
    name: "WizAnimate™",
    tagline: "AI Character Animation Engine",
    shortDesc:
      "Bring characters and scenes to life with AI-powered animation. Beat-matched motion, emotion-driven performance, and cinematic movement.",
    ctaLabel: "Animate Your Video",
    productPage: WIZANIMATE_PRODUCT_PAGE,
    studioPage: WIZANIMATE_STUDIO_PAGE,
    glowColor: "oklch(0.68 0.18 330)",
    bgGradient: "linear-gradient(135deg, oklch(0.24 0.08 330 / 0.9) 0%, oklch(0.17 0.06 330 / 0.95) 100%)",
    borderColor: "oklch(0.68 0.18 330 / 0.35)",
  },
  // ── 5. WizScore — video-to-music engine ──────────────────────────────────────
  {
    id: "wizscore",
    name: "WizScore™",
    tagline: "AI Video-to-Music Engine",
    shortDesc:
      "Upload a video and WizScore generates an original music track perfectly matched to its mood, pacing, and visual energy.",
    ctaLabel: "Score Your Video",
    productPage: WIZSCORE_PRODUCT_PAGE,
    studioPage: WIZSCORE_STUDIO_PAGE,
    glowColor: "oklch(0.68 0.18 5)",
    bgGradient: "linear-gradient(135deg, oklch(0.26 0.09 5 / 0.9) 0%, oklch(0.18 0.06 5 / 0.95) 100%)",
    borderColor: "oklch(0.68 0.18 5 / 0.35)",
  },
  // ── 6. WizShorts — short-form video creator ───────────────────────────────────
  {
    id: "wizshorts",
    name: "WizShorts™",
    tagline: "AI Short-Form Video Creator",
    shortDesc:
      "Produce scroll-stopping vertical short-form videos for TikTok, Instagram Reels, and YouTube Shorts — with captions, pacing, and visual hooks built in.",
    ctaLabel: "Create a Short",
    productPage: WIZSHORTS_PRODUCT_PAGE,
    studioPage: WIZSHORTS_STUDIO_PAGE,
    glowColor: "oklch(0.72 0.18 30)",
    bgGradient: "linear-gradient(135deg, oklch(0.28 0.10 30 / 0.9) 0%, oklch(0.20 0.07 30 / 0.95) 100%)",
    borderColor: "oklch(0.72 0.18 30 / 0.35)",
  },
  // ── 7. WizScript — script & storyboard engine ────────────────────────────────
  {
    id: "wizscript",
    name: "WizScript™",
    tagline: "AI Script & Storyboard Engine",
    shortDesc:
      "Write each scene yourself for full creative control. WIZ AI generates every scene individually, giving you complete creative direction from concept to final build.",
    ctaLabel: "Write Your First Script",
    productPage: WIZSCRIPT_PRODUCT_PAGE,
    studioPage: WIZSCRIPT_STUDIO_PAGE,
    glowColor: "oklch(0.75 0.16 200)",
    bgGradient: "linear-gradient(135deg, oklch(0.24 0.08 200 / 0.9) 0%, oklch(0.17 0.06 200 / 0.95) 100%)",
    borderColor: "oklch(0.75 0.16 200 / 0.35)",
  },
  // ── 8. WizPilot — workflow automation ────────────────────────────────────────
  {
    id: "wizpilot",
    name: "WizPilot™",
    tagline: "AI Workflow Automation Engine",
    shortDesc:
      "Describe your idea in plain text and WizPilot builds the full video script and storyboard automatically — from concept to scenes in seconds.",
    ctaLabel: "Launch WizPilot™",
    productPage: WIZPILOT_PRODUCT_PAGE,
    studioPage: WIZPILOT_STUDIO_PAGE,
    glowColor: "oklch(0.78 0.11 75)",
    bgGradient: "linear-gradient(135deg, oklch(0.28 0.08 75 / 0.9) 0%, oklch(0.20 0.06 75 / 0.95) 100%)",
    borderColor: "oklch(0.78 0.11 75 / 0.35)",
  },
  // ── 9. WizSync — audio-visual sync engine ────────────────────────────────────
  {
    id: "wizsync",
    name: "WizSync™",
    tagline: "Audio-Visual Synchronisation Engine",
    shortDesc:
      "Upload audio and WizSync separates stems, detects speakers with timestamps, and maps each voice to a character ready for AI lip-sync generation.",
    ctaLabel: "Try WizSync™",
    productPage: WIZSYNC_PRODUCT_PAGE,
    studioPage: WIZSYNC_STUDIO_PAGE,
    glowColor: "oklch(0.68 0.18 310)",
    bgGradient: "linear-gradient(135deg, oklch(0.24 0.08 310 / 0.9) 0%, oklch(0.17 0.06 310 / 0.95) 100%)",
    borderColor: "oklch(0.68 0.18 310 / 0.35)",
  },
];

/** Lookup a product entry by its id. Returns undefined if not found. */
export function getProduct(id: string): ProductEntry | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * The 7 primary studio products shown in nav dropdowns, the footer Products
 * section, and the main product grid.
 *
 * ⚠️  This is the ONLY array that drives display order for both Home.tsx
 *     and PublicNavBar.tsx. Edit the PRODUCTS array above to change order.
 */
export const PRIMARY_PRODUCTS = PRODUCTS.filter((p) =>
  ["wizsound", "wizimage", "wizvideo", "wizanimate", "wizscore", "wizshorts", "wizscript"].includes(p.id)
);

/**
 * WizAnimate SEO landing page route (separate from the product page).
 * Exported here for convenience since it's used alongside the product registry.
 */
export { WIZANIMATE_SEO_PAGE };
