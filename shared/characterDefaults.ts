/**
 * shared/characterDefaults.ts
 *
 * Canonical default lockedRules, lockedOutfit, lockedProps, and lockedPosition
 * for the three core band members: Tim, Greg, and Monica.
 *
 * These defaults are applied automatically when characters with matching names
 * are created, and are referenced by the prompt pipeline as a fallback when
 * the character record has no explicit lockedRules set.
 */

export interface LockedRules {
  role: string;
  mustHave: string[];
  allowedProps: string[];
  forbidden: string[];
}

export interface LockedOutfit {
  jacket?: string;
  shirt?: string;
  trousers?: string;
  shoes?: string;
  accessories?: string;
}

export interface LockedProps {
  instrument?: string;
  mic?: string;
  other?: string;
}

export interface CharacterDefaults {
  lockedRules: LockedRules;
  lockedOutfit: LockedOutfit;
  lockedProps: LockedProps;
  lockedPosition: string;
  lockedRole: string;
  characterDefaultState: string;
  characterConstraints: string;
  characterVisualDetails: {
    instrument?: string;
    outfit?: string;
    props?: string;
    position?: string;
    // Hair lock fields — extracted from photo or set as defaults
    hairColour?: string;
    hairLength?: string;
    hairStyle?: string;
    // Instrument lock fields — extracted from photo or set as defaults
    instrumentModel?: string;
    instrumentColour?: string;
    instrumentFinish?: string;
  };
}

// ─── Tim (Lead Vocalist) ─────────────────────────────────────────────────────

export const TIM_DEFAULTS: CharacterDefaults = {
  lockedRules: {
    role: "lead vocalist",
    mustHave: [
      "standing at microphone",
      "black leather jacket",
      "jeans with key chain",
    ],
    allowedProps: [
      "sunburst Gibson Les Paul",
      "microphone",
    ],
    forbidden: [
      "holding drumsticks",
      "wearing t-shirt only",
      "sleeveless",
      "hoodie",
      "vest",
      "being in background",
    ],
  },
  lockedOutfit: {
    jacket: "black leather jacket (MANDATORY - most important outfit element)",
    shirt: "dark t-shirt or shirt underneath the leather jacket",
    trousers: "dark jeans with a key chain hanging from belt loop",
    shoes: "black boots or dark shoes",
    accessories: "none",
  },
  lockedProps: {
    instrument: "sunburst Gibson Les Paul (when playing guitar)",
    mic: "microphone on stand (default)",
    other: "none",
  },
  lockedPosition: "centre stage, at microphone",
  lockedRole: "Lead Vocalist",
  characterDefaultState: "Standing at microphone, centre stage, singing with intensity",
  characterConstraints: "MUST always wear black leather jacket. MUST be at microphone unless explicitly playing guitar. NEVER in background. NEVER holding drumsticks. NEVER sleeveless.",
  characterVisualDetails: {
    instrument: "microphone on stand (default) / sunburst Gibson Les Paul electric guitar (when playing guitar)",
    outfit: "black leather jacket, dark t-shirt underneath, dark jeans with key chain, black boots",
    props: "microphone, key chain",
    position: "centre stage, front",
    // Hair lock
    hairColour: "dark brown, near-black",
    hairLength: "medium length, collar-length",
    hairStyle: "slightly messy, textured, natural wave",
    // Instrument lock
    instrumentModel: "Gibson Les Paul Standard",
    instrumentColour: "sunburst — honey amber centre fading to dark mahogany edges",
    instrumentFinish: "gloss finish, gold hardware, cream binding",
  },
};

// ─── Greg (Drummer) ──────────────────────────────────────────────────────────

export const GREG_DEFAULTS: CharacterDefaults = {
  lockedRules: {
    role: "drummer",
    mustHave: [
      "seated behind drum kit",
      "black torn short-sleeve t-shirt",
    ],
    allowedProps: [
      "drumsticks",
      "full drum kit",
    ],
    forbidden: [
      "leather jacket",
      "standing",
      "holding guitar",
      "sleeveless",
      "tank top",
      "vest",
      "long sleeve",
    ],
  },
  lockedOutfit: {
    jacket: "none",
    shirt: "black short-sleeve torn t-shirt with VISIBLE SHORT SLEEVES",
    trousers: "dark jeans or dark trousers",
    shoes: "trainers or boots",
    accessories: "none",
  },
  lockedProps: {
    instrument: "full drum kit with cymbals",
    mic: "none",
    other: "drumsticks (always in hands)",
  },
  lockedPosition: "rear centre, seated behind drum kit",
  lockedRole: "Drummer",
  characterDefaultState: "Seated behind drum kit, drumsticks in hands, playing with intensity",
  characterConstraints: "MUST always be seated behind drum kit. MUST wear short-sleeve torn t-shirt. NEVER leather jacket. NEVER standing. NEVER holding guitar. NEVER sleeveless or tank top.",
  characterVisualDetails: {
    instrument: "full drum kit with cymbals, drumsticks in hands",
    outfit: "black short-sleeve torn t-shirt, dark jeans, trainers or boots",
    props: "drumsticks, drum kit",
    position: "rear centre, behind drum kit",
    // Hair lock
    hairColour: "dark brown, near-black",
    hairLength: "short, close-cropped",
    hairStyle: "tight fade on sides, short on top",
    // Instrument lock
    instrumentModel: "Pearl Export drum kit",
    instrumentColour: "jet black wrap finish",
    instrumentFinish: "chrome hardware, 22-inch bass drum, hi-hat left side, crash cymbal right, ride cymbal far right",
  },
};

// ─── Monica (Bassist) ────────────────────────────────────────────────────────

export const MONICA_DEFAULTS: CharacterDefaults = {
  lockedRules: {
    role: "bassist",
    mustHave: [
      "playing bass guitar",
      "black outfit with boots",
      "tattoos visible",
      "cross necklace visible",
    ],
    allowedProps: [
      "bass guitar",
    ],
    forbidden: [
      "leather jacket",
      "plain clothing",
      "generic outfit",
    ],
  },
  lockedOutfit: {
    jacket: "none",
    shirt: "distressed charcoal grey V-neck t-shirt cut low",
    trousers: "form-fitting black leather trousers",
    shoes: "black stiletto-heeled ankle boots",
    accessories: "long silver chain necklace with prominent ornate silver cross pendant (VISIBLE), full sleeve tattoos on both forearms (VISIBLE)",
  },
  lockedProps: {
    instrument: "bass guitar (always held/played)",
    mic: "none",
    other: "none",
  },
  lockedPosition: "stage right, standing",
  lockedRole: "Bassist",
  characterDefaultState: "Standing stage right, playing bass guitar, body swaying with the groove",
  characterConstraints: "MUST always be playing bass guitar. MUST wear black outfit with boots. Tattoos and cross necklace MUST be visible. NEVER leather jacket. NEVER plain/generic clothing.",
  characterVisualDetails: {
    instrument: "Fender Precision Bass electric bass guitar (always held/played)",
    outfit: "distressed charcoal grey V-neck t-shirt, form-fitting black leather trousers, black stiletto-heeled ankle boots, silver cross necklace, sleeve tattoos",
    props: "bass guitar, cross necklace, sleeve tattoos",
    position: "stage right, standing",
    // Hair lock
    hairColour: "dark brown, near-black",
    hairLength: "long, past shoulders",
    hairStyle: "straight, sleek, worn loose",
    // Instrument lock
    instrumentModel: "Fender Precision Bass",
    instrumentColour: "gloss black body",
    instrumentFinish: "white pickguard, maple neck, chrome tuners and bridge",
  },
};

// ─── Zara (Lead Vocalist) ────────────────────────────────────────────────────

export const ZARA_DEFAULTS: CharacterDefaults = {
  lockedRules: {
    role: "lead vocalist",
    mustHave: [
      "simple short black mini dress — thin shoulder straps, MODEST conservative neckline (NOT low-cut, NOT revealing, NO cleavage)",
      "sleek pointed-toe black ankle boots",
      "long straight jet-black hair past shoulders",
      "emerald green eyes",
      "slim slender build",
    ],
    allowedProps: [
      "microphone",
      "stage lighting",
      "stage props",
    ],
    forbidden: [
      "long sleeves",
      "lace sleeves",
      "lace overlay",
      "sequins",
      "sequined dress",
      "embellished dress",
      "low-cut neckline",
      "deep neckline",
      "plunging neckline",
      "revealing neckline",
      "cleavage showing",
      "PVC dress",
      "vinyl dress",
      "latex dress",
      "shiny plastic dress",
      "gloves of any kind",
      "PVC gloves",
      "leather gloves",
      "opera gloves",
      "trousers",
      "jeans",
      "sneakers",
      "casual attire",
      "bulky clothing",
      "hats",
      "glasses",
      "long gown",
      "floor-length dress",
      "different colour dress",
    ],
  },
  lockedOutfit: {
    jacket: "none",
    shirt: "simple short black mini dress with thin shoulder straps and modest conservative neckline — NO low-cut, NO revealing",
    trousers: "none — dress only",
    shoes: "sleek pointed-toe black ankle boots",
    accessories: "minimal — small necklace only if visible in reference",
  },
  lockedProps: {
    instrument: "none (vocalist only)",
    mic: "microphone (optional — only if scene calls for it)",
    other: "none",
  },
  lockedPosition: "centre stage, front",
  lockedRole: "Lead Vocalist",
  characterDefaultState: "Standing centre stage, singing with emotion, facing camera",
  characterConstraints:
    "MUST wear simple short black mini dress with modest neckline. " +
    "MUST wear black ankle boots. " +
    "NEVER low-cut neckline. NEVER revealing dress. NEVER lace sleeves. NEVER sequins. NEVER gloves. " +
    "NEVER PVC or vinyl fabric. NEVER long gown. NEVER different colour dress.",
  characterVisualDetails: {
    outfit:
      "simple short black mini dress with thin shoulder straps and a modest conservative neckline, subtly ruched fabric, no sleeves, no gloves, no lace, no sequins",
    props: "none",
    position: "centre stage, front",
    // Hair lock
    hairColour: "jet black",
    hairLength: "long straight past shoulders",
    hairStyle: "straight sleek",
  },
};

// ─── Lookup Map ──────────────────────────────────────────────────────────────

const DEFAULTS_MAP: Record<string, CharacterDefaults> = {
  tim: TIM_DEFAULTS,
  greg: GREG_DEFAULTS,
  monica: MONICA_DEFAULTS,
  zara: ZARA_DEFAULTS,
};

/**
 * Get canonical defaults for a character by name.
 * Returns undefined if the name is not a known band member.
 */
export function getCharacterDefaults(name: string): CharacterDefaults | undefined {
  return DEFAULTS_MAP[name.toLowerCase().trim()];
}

/**
 * Check if a character name matches a known band member.
 */
export function isKnownBandMember(name: string): boolean {
  return name.toLowerCase().trim() in DEFAULTS_MAP;
}

/**
 * Get all known band member names.
 */
export function getKnownBandMembers(): string[] {
  return Object.keys(DEFAULTS_MAP);
}
