/**
 * director-modes.ts
 * Phase 5 — Director Mode System
 *
 * 12 cinematic director modes that modify storyboard prompts, validation thresholds,
 * pacing, and edit sequencing. Each mode represents a distinct cinematic aesthetic
 * that transforms the same song into a completely different visual experience.
 *
 * Modes are injected into the storyboard LLM prompt via buildDirectorModePromptBlock().
 * Validation thresholds are retrieved via getDirectorModeThresholds().
 * Edit intelligence parameters are retrieved via getDirectorMode().
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DirectorModeName =
  | "Balanced"
  | "MTV Pop"
  | "Dark Cinematic"
  | "Emotional Ballad"
  | "Epic Cinematic"
  | "Neo-Noir"
  | "Dreamscape"
  | "Live Arena"
  | "Art House"
  | "Retro Film"
  | "Indie Film"
  | "Documentary";

export interface DirectorMode {
  name: DirectorModeName;
  tagline: string;
  description: string;
  // ── Storyboard prompt injections ──────────────────────────────────────────
  globalStyleSuffix: string;       // Appended to every scene prompt
  performanceShotStyle: string;    // Replaces default performance framing
  intercutStyle: string;           // Replaces default intercut framing
  forbiddenElements: string[];     // Tokens to avoid in all prompts
  requiredElements: string[];      // Tokens to include in all prompts
  // ── Scene distribution overrides ─────────────────────────────────────────
  performanceShotRatioOverride?: number;  // If set, overrides user's ratio setting
  maxConsecutiveIntercuts: number;        // Max intercuts before forcing a performance shot
  // ── Validation threshold adjustments ─────────────────────────────────────
  continuityThresholdMultiplier: number;  // 1.0 = standard, 0.8 = more lenient
  lipSyncThresholdMultiplier: number;     // 1.0 = standard, 0.9 = slightly lenient
  rawSceneValidationStrict: boolean;      // If true, reject grey/empty backgrounds harder
  // ── Edit intelligence overrides ───────────────────────────────────────────
  preferredTransitions: string[];         // Preferred transition types for this mode
  cameraEnergyBias: "low" | "medium" | "high" | "variable";
  emotionalArcShape: "linear" | "peak-valley" | "escalating" | "flat" | "inverted-v";
  // ── UI metadata ───────────────────────────────────────────────────────────
  icon: string;           // Emoji icon for UI display
  colorAccent: string;    // Hex colour for UI badge
  category: "mainstream" | "cinematic" | "artistic" | "live";
  premiumOnly: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// The 12 Director Modes
// ─────────────────────────────────────────────────────────────────────────────

export const DIRECTOR_MODES: Record<DirectorModeName, DirectorMode> = {
  "Balanced": {
    name: "Balanced",
    tagline: "Professional cinematic default",
    description: "A well-rounded cinematic style with warm amber lighting, natural camera movement, and a balanced mix of performance and atmosphere shots. The standard for premium music video production.",
    globalStyleSuffix: "warm amber cinematic lighting, professional music video production quality, natural camera movement",
    performanceShotStyle: "medium close-up, warm amber key light, subtle camera drift, natural body presence",
    intercutStyle: "atmospheric wide shot, orchestral depth, environmental storytelling",
    forbiddenElements: ["cartoon", "animation", "flat lighting", "grey background", "microphone stand"],
    requiredElements: ["cinematic", "professional lighting", "natural movement"],
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 1.0,
    lipSyncThresholdMultiplier: 1.0,
    rawSceneValidationStrict: true,
    preferredTransitions: ["hard_cut", "match_cut", "dissolve"],
    cameraEnergyBias: "medium",
    emotionalArcShape: "peak-valley",
    icon: "🎬",
    colorAccent: "#C9A84C",
    category: "mainstream",
    premiumOnly: false,
  },

  "MTV Pop": {
    name: "MTV Pop",
    tagline: "High-energy visual spectacle",
    description: "Fast cuts, bold colours, high contrast, and relentless energy. Inspired by peak-era MTV production — every frame is a visual event. Perfect for pop, dance, and urban tracks.",
    globalStyleSuffix: "high contrast, saturated colours, fast-paced energy, bold visual style, MTV production quality",
    performanceShotStyle: "extreme close-up, high contrast lighting, dynamic handheld camera, intense direct-to-camera",
    intercutStyle: "fast cut montage, bold colour splash, high-energy movement, crowd energy",
    forbiddenElements: ["grey background", "static camera", "slow dissolve", "muted colours", "microphone stand"],
    requiredElements: ["bold colour", "dynamic movement", "high energy", "visual impact"],
    performanceShotRatioOverride: 85,
    maxConsecutiveIntercuts: 1,
    continuityThresholdMultiplier: 0.9,
    lipSyncThresholdMultiplier: 1.0,
    rawSceneValidationStrict: true,
    preferredTransitions: ["smash_cut", "hard_cut", "whip"],
    cameraEnergyBias: "high",
    emotionalArcShape: "flat",
    icon: "⚡",
    colorAccent: "#FF3366",
    category: "mainstream",
    premiumOnly: false,
  },

  "Dark Cinematic": {
    name: "Dark Cinematic",
    tagline: "Moody, atmospheric, high contrast",
    description: "Deep shadows, dramatic contrast, and a brooding atmosphere. Inspired by prestige drama cinematography — Fincher, Villeneuve, Nolan. Every frame feels like a still from a feature film.",
    globalStyleSuffix: "deep shadow, high contrast, dramatic chiaroscuro lighting, cinematic colour grade, dark atmosphere",
    performanceShotStyle: "tight close-up, dramatic side lighting, deep shadow, intense expression, slow camera push",
    intercutStyle: "dark atmospheric wide, shadow-filled environment, dramatic silhouette, moody depth",
    forbiddenElements: ["bright cheerful", "pastel colour", "flat lighting", "grey background", "microphone stand", "happy crowd"],
    requiredElements: ["shadow", "contrast", "dramatic lighting", "cinematic depth"],
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 1.0,
    lipSyncThresholdMultiplier: 1.0,
    rawSceneValidationStrict: true,
    preferredTransitions: ["hard_cut", "smash_cut", "match_cut"],
    cameraEnergyBias: "variable",
    emotionalArcShape: "escalating",
    icon: "🌑",
    colorAccent: "#2D1B69",
    category: "cinematic",
    premiumOnly: false,
  },

  "Emotional Ballad": {
    name: "Emotional Ballad",
    tagline: "Intimate, vulnerable, tear-catching",
    description: "Soft light, intimate framing, and emotionally raw performances. Designed for ballads and slow-burn tracks where the human connection is everything. Every close-up should feel like a confession.",
    globalStyleSuffix: "soft natural light, intimate framing, emotional vulnerability, warm golden hour, gentle camera movement",
    performanceShotStyle: "extreme close-up face, soft diffused light, tears or emotion visible, minimal camera movement, intimate presence",
    intercutStyle: "gentle environmental detail, soft bokeh background, intimate object close-up, quiet atmosphere",
    forbiddenElements: ["fast cut", "high energy", "crowd", "stadium", "bold colour", "grey background", "microphone stand"],
    requiredElements: ["soft light", "intimate", "emotional", "close-up", "vulnerable"],
    performanceShotRatioOverride: 85,
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 1.0,
    lipSyncThresholdMultiplier: 0.9,
    rawSceneValidationStrict: true,
    preferredTransitions: ["dissolve", "fade", "match_cut"],
    cameraEnergyBias: "low",
    emotionalArcShape: "peak-valley",
    icon: "💧",
    colorAccent: "#4A90D9",
    category: "cinematic",
    premiumOnly: false,
  },

  "Epic Cinematic": {
    name: "Epic Cinematic",
    tagline: "Grand scale, orchestral sweep",
    description: "Sweeping crane shots, massive environments, and orchestral grandeur. Inspired by Hans Zimmer, Roger Deakins, and the language of epic cinema. Every frame should feel like it belongs on an IMAX screen.",
    globalStyleSuffix: "sweeping crane shot, epic scale, orchestral grandeur, massive environment, IMAX-quality cinematography",
    performanceShotStyle: "wide performance shot with epic environment behind, crane movement, character dwarfed by grandeur",
    intercutStyle: "sweeping landscape wide, dramatic sky, orchestral hall wide, epic architectural detail",
    forbiddenElements: ["small room", "grey background", "microphone stand", "flat lighting", "intimate close-up only"],
    requiredElements: ["epic scale", "grand environment", "sweeping camera", "orchestral", "cinematic grandeur"],
    maxConsecutiveIntercuts: 3,
    continuityThresholdMultiplier: 0.9,
    lipSyncThresholdMultiplier: 1.0,
    rawSceneValidationStrict: true,
    preferredTransitions: ["dissolve", "match_cut", "hard_cut"],
    cameraEnergyBias: "variable",
    emotionalArcShape: "escalating",
    icon: "🏔️",
    colorAccent: "#D4AF37",
    category: "cinematic",
    premiumOnly: true,
  },

  "Neo-Noir": {
    name: "Neo-Noir",
    tagline: "Rain, neon, shadow, and mystery",
    description: "Neon-drenched streets, rain-slicked surfaces, and femme fatale shadows. Inspired by Blade Runner, Drive, and Sin City. Every frame drips with urban mystery and moral ambiguity.",
    globalStyleSuffix: "neon light, rain-slicked surface, urban night, deep shadow, cinematic noir atmosphere",
    performanceShotStyle: "tight close-up, neon rim light, rain or smoke in background, mysterious expression, slow camera drift",
    intercutStyle: "neon-lit street wide, rain on glass, shadow silhouette, urban night atmosphere, reflective puddle",
    forbiddenElements: ["daylight", "bright cheerful", "grey background", "microphone stand", "pastoral nature"],
    requiredElements: ["neon", "shadow", "urban night", "rain or smoke", "mystery"],
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 0.9,
    lipSyncThresholdMultiplier: 1.0,
    rawSceneValidationStrict: true,
    preferredTransitions: ["hard_cut", "smash_cut", "light_flare"],
    cameraEnergyBias: "medium",
    emotionalArcShape: "linear",
    icon: "🌧️",
    colorAccent: "#7B2FBE",
    category: "cinematic",
    premiumOnly: true,
  },

  "Dreamscape": {
    name: "Dreamscape",
    tagline: "Surreal, ethereal, otherworldly",
    description: "Floating light, impossible geometry, and dreamlike transitions. Inspired by Terrence Malick, Wong Kar-wai, and the language of visual poetry. Reality is optional.",
    globalStyleSuffix: "ethereal light, dreamlike atmosphere, surreal visual poetry, soft lens flare, otherworldly beauty",
    performanceShotStyle: "soft-focus close-up, floating light particles, ethereal glow, dreamy expression, slow motion",
    intercutStyle: "surreal landscape, floating elements, soft light beam, ethereal nature detail, dreamlike abstraction",
    forbiddenElements: ["harsh lighting", "grey background", "microphone stand", "realistic documentary", "sharp hard edges"],
    requiredElements: ["ethereal", "dreamlike", "soft light", "surreal", "otherworldly"],
    maxConsecutiveIntercuts: 3,
    continuityThresholdMultiplier: 0.8,
    lipSyncThresholdMultiplier: 0.9,
    rawSceneValidationStrict: false,
    preferredTransitions: ["dissolve", "fade", "light_flare"],
    cameraEnergyBias: "low",
    emotionalArcShape: "inverted-v",
    icon: "✨",
    colorAccent: "#9B59B6",
    category: "artistic",
    premiumOnly: true,
  },

  "Live Arena": {
    name: "Live Arena",
    tagline: "Stadium energy, crowd, spectacle",
    description: "The energy of a sold-out stadium. Massive crowd shots, stage lighting rigs, and the raw electricity of a live performance. Every frame should feel like the best night of your life.",
    globalStyleSuffix: "stadium lighting rig, massive crowd, live performance energy, concert atmosphere, stage spectacle",
    performanceShotStyle: "wide performance shot, stage lighting behind, crowd visible, concert energy, dynamic movement",
    intercutStyle: "crowd wide shot, stage lighting rig, audience reaction, concert atmosphere, aerial stadium view",
    forbiddenElements: ["grey background", "microphone stand", "empty room", "intimate quiet", "studio recording"],
    requiredElements: ["crowd", "stage", "concert lighting", "live energy", "stadium"],
    performanceShotRatioOverride: 75,
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 0.9,
    lipSyncThresholdMultiplier: 1.0,
    rawSceneValidationStrict: true,
    preferredTransitions: ["hard_cut", "smash_cut", "match_cut"],
    cameraEnergyBias: "high",
    emotionalArcShape: "escalating",
    icon: "🎤",
    colorAccent: "#E74C3C",
    category: "live",
    premiumOnly: false,
  },

  "Art House": {
    name: "Art House",
    tagline: "Deliberate, symbolic, visually poetic",
    description: "Slow, deliberate compositions with deep symbolic meaning. Inspired by Bergman, Tarkovsky, and Godard. Every shot is a visual statement. Patience is rewarded with beauty.",
    globalStyleSuffix: "deliberate composition, symbolic visual language, slow cinema, poetic imagery, art house aesthetic",
    performanceShotStyle: "static or very slow camera, symbolic composition, deep focus, contemplative expression, meaningful framing",
    intercutStyle: "symbolic object close-up, poetic landscape, slow pan, meaningful visual metaphor, contemplative wide",
    forbiddenElements: ["fast cut", "high energy", "grey background", "microphone stand", "commercial aesthetic"],
    requiredElements: ["symbolic", "deliberate", "poetic", "contemplative", "meaningful composition"],
    performanceShotRatioOverride: 70,
    maxConsecutiveIntercuts: 3,
    continuityThresholdMultiplier: 0.8,
    lipSyncThresholdMultiplier: 0.9,
    rawSceneValidationStrict: false,
    preferredTransitions: ["dissolve", "fade", "match_cut"],
    cameraEnergyBias: "low",
    emotionalArcShape: "flat",
    icon: "🎭",
    colorAccent: "#1ABC9C",
    category: "artistic",
    premiumOnly: true,
  },

  "Retro Film": {
    name: "Retro Film",
    tagline: "Film grain, warm tones, vintage soul",
    description: "Super 8 grain, warm analogue tones, and the nostalgic beauty of film photography. Inspired by the golden age of cinema and the warmth of physical film stock.",
    globalStyleSuffix: "film grain, warm analogue colour grade, vintage film stock, soft vignette, nostalgic atmosphere",
    performanceShotStyle: "warm film grain close-up, soft focus edges, analogue colour, nostalgic lighting, gentle camera movement",
    intercutStyle: "vintage film stock wide, warm grain texture, nostalgic environment, analogue colour, soft vignette",
    forbiddenElements: ["digital clean", "grey background", "microphone stand", "modern sharp", "cold blue tone"],
    requiredElements: ["film grain", "warm tone", "vintage", "analogue", "nostalgic"],
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 0.9,
    lipSyncThresholdMultiplier: 0.9,
    rawSceneValidationStrict: false,
    preferredTransitions: ["dissolve", "fade", "hard_cut"],
    cameraEnergyBias: "medium",
    emotionalArcShape: "peak-valley",
    icon: "📽️",
    colorAccent: "#E67E22",
    category: "artistic",
    premiumOnly: false,
  },

  "Indie Film": {
    name: "Indie Film",
    tagline: "Authentic, raw, character-driven",
    description: "Handheld intimacy, natural light, and the raw authenticity of independent cinema. Inspired by A24, Sundance, and the directors who prioritise truth over spectacle.",
    globalStyleSuffix: "handheld intimacy, natural light, raw authenticity, indie film aesthetic, character-driven framing",
    performanceShotStyle: "handheld close-up, natural window light, raw authentic expression, intimate framing, documentary feel",
    intercutStyle: "natural environment detail, handheld observational wide, authentic location, raw texture",
    forbiddenElements: ["studio lighting", "grey background", "microphone stand", "polished commercial", "CGI environment"],
    requiredElements: ["natural light", "handheld", "authentic", "raw", "intimate"],
    maxConsecutiveIntercuts: 2,
    continuityThresholdMultiplier: 0.9,
    lipSyncThresholdMultiplier: 0.9,
    rawSceneValidationStrict: true,
    preferredTransitions: ["hard_cut", "match_cut", "dissolve"],
    cameraEnergyBias: "medium",
    emotionalArcShape: "linear",
    icon: "🎞️",
    colorAccent: "#27AE60",
    category: "artistic",
    premiumOnly: false,
  },

  "Documentary": {
    name: "Documentary",
    tagline: "Observational, real, behind-the-scenes",
    description: "The fly-on-the-wall aesthetic of observational documentary. Inspired by the making-of footage and behind-the-scenes access that reveals the human story behind the music.",
    globalStyleSuffix: "observational documentary style, natural light, behind-the-scenes feel, authentic moment, real environment",
    performanceShotStyle: "observational close-up, natural light, candid expression, documentary framing, real moment captured",
    intercutStyle: "behind-the-scenes wide, recording studio environment, authentic location, real people and spaces",
    forbiddenElements: ["staged", "grey background", "microphone stand", "polished commercial", "fantasy environment"],
    requiredElements: ["observational", "natural light", "authentic", "documentary", "real moment"],
    performanceShotRatioOverride: 65,
    maxConsecutiveIntercuts: 3,
    continuityThresholdMultiplier: 0.8,
    lipSyncThresholdMultiplier: 0.9,
    rawSceneValidationStrict: false,
    preferredTransitions: ["hard_cut", "dissolve", "match_cut"],
    cameraEnergyBias: "medium",
    emotionalArcShape: "linear",
    icon: "📹",
    colorAccent: "#95A5A6",
    category: "artistic",
    premiumOnly: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a director mode by name, falling back to Balanced if not found.
 */
export function getDirectorMode(name?: string | null): DirectorMode {
  if (!name) return DIRECTOR_MODES["Balanced"];
  return DIRECTOR_MODES[name as DirectorModeName] ?? DIRECTOR_MODES["Balanced"];
}

/**
 * Get all director modes as an array, sorted by category then name.
 */
export function getAllDirectorModes(): DirectorMode[] {
  const categoryOrder = ["mainstream", "cinematic", "live", "artistic"];
  return Object.values(DIRECTOR_MODES).sort((a, b) => {
    const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Build the Director Mode prompt block to inject into the storyboard LLM prompt.
 */
export function buildDirectorModePromptBlock(modeName?: string | null): string {
  const mode = getDirectorMode(modeName);

  return `
═══════════════════════════════════════════════════════
DIRECTOR MODE: ${mode.name.toUpperCase()} — "${mode.tagline}"
═══════════════════════════════════════════════════════
${mode.description}

VISUAL STYLE MANDATE (apply to EVERY scene):
• Global style: ${mode.globalStyleSuffix}
• Performance shots must use: ${mode.performanceShotStyle}
• Cinematic intercuts must use: ${mode.intercutStyle}

FORBIDDEN ELEMENTS (NEVER include in any scene prompt):
${mode.forbiddenElements.map(e => `• ${e}`).join("\n")}

REQUIRED ELEMENTS (MUST appear across the storyboard):
${mode.requiredElements.map(e => `• ${e}`).join("\n")}

PACING RULES:
• Maximum consecutive intercuts before a performance shot: ${mode.maxConsecutiveIntercuts}
${mode.performanceShotRatioOverride != null ? `• This director mode overrides the shot ratio to: ${mode.performanceShotRatioOverride}% performance / ${100 - mode.performanceShotRatioOverride}% intercuts` : "• Use the user's shot ratio setting"}

VALIDATION: ${mode.rawSceneValidationStrict ? "STRICT — grey backgrounds and empty environments will be rejected and re-generated" : "LENIENT — surreal or abstract environments are acceptable for this mode"}
═══════════════════════════════════════════════════════`;
}

/**
 * Get the validation threshold adjustments for a director mode.
 */
export function getDirectorModeThresholds(modeName?: string | null): {
  continuityMultiplier: number;
  lipSyncMultiplier: number;
  strictValidation: boolean;
} {
  const mode = getDirectorMode(modeName);
  return {
    continuityMultiplier: mode.continuityThresholdMultiplier,
    lipSyncMultiplier: mode.lipSyncThresholdMultiplier,
    strictValidation: mode.rawSceneValidationStrict,
  };
}

export const DIRECTOR_MODE_NAMES: DirectorModeName[] = Object.keys(DIRECTOR_MODES) as DirectorModeName[];

/**
 * Returns validation thresholds for a director mode, including lip-sync LseD and LseC scores.
 */
export function getDirectorModeValidationThresholds(modeName?: string | null): {
  lipSyncLseD: number;
  lipSyncLseC: number;
  continuity: number;
  strictRawValidation: boolean;
} {
  const base = getDirectorModeThresholds(modeName);
  return {
    lipSyncLseD: base.lipSyncMultiplier,
    lipSyncLseC: base.lipSyncMultiplier * 0.85,
    continuity: base.continuityMultiplier,
    strictRawValidation: base.strictValidation,
  };
}
