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
// Tim's vision for Zara: sleeveless black cocktail dress, black high heels with ankle straps,
// diamond necklace (ALWAYS visible), long straight jet-black hair, emerald green eyes.

export const ZARA_DEFAULTS: CharacterDefaults = {
  lockedRules: {
    role: "lead vocalist",
    mustHave: [
      "short sleeveless black cocktail dress — bare shoulders, NO sleeves",
      "black high heels with ankle straps — MUST be visible",
      "diamond necklace — MUST be visible around neck in EVERY scene",
      "long straight jet-black hair past shoulders worn LOOSE and DOWN",
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
      "sleeves of any kind",
      "knee-high boots",
      "flat shoes",
      "sneakers",
      "trainers",
      "trousers",
      "jeans",
      "leather jacket",
      "jacket of any kind",
      "coat",
      "blazer",
      "gloves of any kind",
      "hats",
      "glasses",
      "long gown",
      "floor-length dress",
      "different colour dress",
      "tied back hair",
      "ponytail",
      "bun",
      "updo",
      "hair pinned up",
    ],
  },
  lockedOutfit: {
    jacket: "none — sleeveless dress only, bare shoulders",
    shirt: "short sleeveless black cocktail dress — NO sleeves, bare shoulders, form-fitting",
    trousers: "none — dress only",
    shoes: "black high heels with ankle straps — MUST be visible, ankles and heels shown",
    accessories: "diamond necklace — MUST be visible around neck at all times in every scene",
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
    "MUST wear short sleeveless black cocktail dress — bare shoulders, NO sleeves. " +
    "MUST wear black high heels with ankle straps — heels and ankle straps MUST be visible. " +
    "MUST wear diamond necklace — necklace MUST be visible in EVERY scene. " +
    "NEVER long sleeves. NEVER knee-high boots. NEVER flat shoes. NEVER leather jacket. NEVER gloves.",
  characterVisualDetails: {
    outfit:
      "short sleeveless black cocktail dress, bare shoulders, form-fitting, no sleeves, diamond necklace visible around neck, black high heels with ankle straps visible",
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
