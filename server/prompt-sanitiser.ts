/**
 * prompt-sanitiser.ts
 *
 * Sanitises AI provider prompts by replacing real-world branded venue names,
 * studio names, and copyrighted location references with safe, generic cinematic
 * descriptions before dispatch to video generation providers.
 *
 * DESIGN INTENT
 * ─────────────
 * User-facing UI may display emotionally resonant branded presets
 * (e.g. "Air Studios / Lyndhurst Hall") while provider calls receive
 * provider-safe generic descriptions that avoid copyright-filter triggers.
 *
 * Two values are maintained:
 *   userSelectedStyleLabel   — shown in UI, stored in DB for display
 *   providerSafeScenePrompt  — sent to Atlas Cloud / Kling / HeyGen
 *
 * REJECTION TYPES THIS PREVENTS
 * ──────────────────────────────
 * Atlas Cloud / ByteDance Seedance:
 *   "output video may be related to copyright restrictions"
 *   Triggered by: named real-world venues, studios, concert halls
 *
 * USAGE
 * ─────
 *   import { sanitisePromptForProvider } from "./prompt-sanitiser";
 *   const safePrompt = sanitisePromptForProvider(rawPrompt);
 */

// ---------------------------------------------------------------------------
// Venue / Studio / Location mapping
// ---------------------------------------------------------------------------

interface VenueMapping {
  /** Patterns to match (case-insensitive substring or regex) */
  patterns: (string | RegExp)[];
  /** Safe generic replacement phrase */
  safe: string;
}

const VENUE_MAPPINGS: VenueMapping[] = [
  // Recording studios
  {
    patterns: [/air studios?/i, /lyndhurst hall/i],
    safe: "grand premium orchestral recording hall with warm amber studio lighting, polished wood, high ceiling, orchestra atmosphere, cinematic haze",
  },
  {
    patterns: [/abbey road/i, /emi studios?/i],
    safe: "classic professional recording studio with vintage equipment, warm lighting, and iconic atmosphere",
  },
  {
    patterns: [/electric lady(land)?( studios?)?/i],
    safe: "legendary underground recording studio with curved walls, psychedelic lighting, and vintage analogue equipment",
  },
  {
    patterns: [/capitol records? (tower|studios?)/i, /capitol studios?/i],
    safe: "iconic circular recording studio with natural reverb, warm wood panelling, and vintage microphones",
  },
  {
    patterns: [/sony music studios?/i, /columbia studios?/i],
    safe: "large professional music studio with modern production equipment and premium acoustic treatment",
  },
  {
    patterns: [/olympic studios?/i],
    safe: "spacious British recording studio with high ceilings, natural light, and warm analogue character",
  },
  {
    patterns: [/metropolis studios?/i],
    safe: "modern premium recording complex with state-of-the-art equipment and cinematic lighting",
  },
  {
    patterns: [/RAK studios?/i],
    safe: "intimate professional recording studio with warm lighting and vintage character",
  },
  {
    patterns: [/sarm (west )?studios?/i],
    safe: "professional recording studio with high-end equipment and warm ambient lighting",
  },
  {
    patterns: [/sun studio/i],
    safe: "historic Southern recording studio with vintage equipment, warm lighting, and raw authentic character",
  },

  // Concert halls and performance venues
  {
    patterns: [/royal albert hall/i],
    safe: "grand circular concert hall with ornate Victorian architecture, tiered balconies, and warm amber stage lighting",
  },
  {
    patterns: [/carnegie hall/i],
    safe: "prestigious concert hall with classical architecture, red velvet seats, and brilliant stage lighting",
  },
  {
    patterns: [/sydney opera house/i],
    safe: "iconic waterfront concert hall with dramatic architectural shells and premium stage lighting",
  },
  {
    patterns: [/la philharmonic|disney concert hall/i],
    safe: "contemporary concert hall with sweeping stainless steel architecture and warm interior lighting",
  },
  {
    patterns: [/hollywood bowl/i],
    safe: "open-air amphitheatre with tiered seating, natural hillside setting, and dramatic stage lighting",
  },
  {
    patterns: [/madison square garden/i],
    safe: "large indoor arena with circular seating, dramatic overhead lighting rigs, and energetic atmosphere",
  },
  {
    patterns: [/o2 arena|the o2/i],
    safe: "large indoor concert arena with dramatic stage lighting, circular seating, and modern production design",
  },
  {
    patterns: [/wembley (arena|stadium)/i],
    safe: "iconic large-scale concert venue with sweeping arch, dramatic lighting, and massive crowd energy",
  },
  {
    patterns: [/royal festival hall/i],
    safe: "modern concert hall with clean lines, warm wood interior, and elegant stage lighting",
  },
  {
    patterns: [/barbican (centre|hall)/i],
    safe: "brutalist concert hall with dramatic concrete architecture, warm stage lighting, and intimate acoustic design",
  },
  {
    patterns: [/wigmore hall/i],
    safe: "intimate recital hall with ornate plasterwork, warm amber lighting, and exceptional acoustic character",
  },
  {
    patterns: [/ronnie scott'?s?/i],
    safe: "intimate jazz club with low amber lighting, brick walls, small stage, and intimate audience atmosphere",
  },

  // Film / TV / Production locations
  {
    patterns: [/pinewood studios?/i],
    safe: "large professional film production studio with high-ceiling sound stages and professional lighting rigs",
  },
  {
    patterns: [/shepperton studios?/i],
    safe: "historic British film studio with large sound stages and professional production facilities",
  },
  {
    patterns: [/elstree studios?/i],
    safe: "classic British film studio with large sound stages and cinematic production atmosphere",
  },
  {
    patterns: [/universal studios?/i, /universal city/i],
    safe: "large-scale film production lot with professional sound stages and cinematic production facilities",
  },
  {
    patterns: [/warner bros\.? (studios?|lot)/i],
    safe: "major film production lot with professional sound stages and cinematic back-lot atmosphere",
  },
  {
    patterns: [/paramount (pictures|studios?|lot)/i],
    safe: "classic Hollywood film production lot with iconic studio gates and cinematic atmosphere",
  },

  // Orchestras (by name)
  {
    patterns: [/london symphony orchestra|lso\b/i],
    safe: "world-class symphony orchestra",
  },
  {
    patterns: [/berlin philharmonic/i],
    safe: "elite European symphony orchestra",
  },
  {
    patterns: [/new york philharmonic/i],
    safe: "prestigious American symphony orchestra",
  },
  {
    patterns: [/royal philharmonic/i],
    safe: "distinguished British symphony orchestra",
  },
  {
    patterns: [/bbc symphony/i],
    safe: "acclaimed broadcast symphony orchestra",
  },
  {
    patterns: [/chicago symphony/i],
    safe: "celebrated American symphony orchestra",
  },
  {
    patterns: [/vienna philharmonic/i],
    safe: "legendary European symphony orchestra",
  },
];

// ---------------------------------------------------------------------------
// Core sanitisation function
// ---------------------------------------------------------------------------

/**
 * Replaces all real-world venue, studio, and location references in a prompt
 * with safe generic cinematic descriptions.
 *
 * @param prompt  Raw prompt that may contain branded venue references
 * @returns       Sanitised prompt safe for provider dispatch
 */
export function sanitisePromptForProvider(prompt: string): string {
  if (!prompt) return prompt;

  let sanitised = prompt;

  for (const mapping of VENUE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (typeof pattern === "string") {
        // Case-insensitive substring replacement
        const regex = new RegExp(escapeRegex(pattern), "gi");
        sanitised = sanitised.replace(regex, mapping.safe);
      } else {
        sanitised = sanitised.replace(pattern, mapping.safe);
      }
    }
  }

  return sanitised;
}

/**
 * Returns true if the prompt contains any real-world venue references
 * that would trigger a copyright filter.
 */
export function promptContainsVenueReference(prompt: string): boolean {
  if (!prompt) return false;

  for (const mapping of VENUE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (typeof pattern === "string") {
        if (prompt.toLowerCase().includes(pattern.toLowerCase())) return true;
      } else {
        if (pattern.test(prompt)) return true;
      }
    }
  }

  return false;
}

/**
 * Returns a list of all venue references found in the prompt.
 * Useful for logging and debugging.
 */
export function findVenueReferences(prompt: string): string[] {
  if (!prompt) return [];

  const found: string[] = [];

  for (const mapping of VENUE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (typeof pattern === "string") {
        const regex = new RegExp(escapeRegex(pattern), "gi");
        const matches = prompt.match(regex);
        if (matches) found.push(...matches);
      } else {
        const matches = prompt.match(pattern);
        if (matches) found.push(...matches);
      }
    }
  }

  return Array.from(new Set(found));
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
