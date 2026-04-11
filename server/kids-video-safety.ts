/**
 * Kids Video Mode Safety Rules Engine
 * Validates and enforces family-friendly content generation
 * Blocks unsafe, violent, sexual, disturbing, or age-inappropriate outputs
 */

export type KidsVideoSafetyLevel = "strict" | "moderate" | "permissive";

/**
 * Blocked keywords and patterns for Kids Video Mode
 * These trigger content rejection or auto-correction
 */
const BLOCKED_KEYWORDS = {
  violence: [
    "blood", "gore", "kill", "death", "weapon", "gun", "knife", "stab", "shoot",
    "fight", "punch", "hit", "attack", "destroy", "explode", "crash", "burn",
    "torture", "mutilate", "dismember", "corpse", "skeleton", "skull", "grave"
  ],
  sexual: [
    "sex", "nude", "naked", "adult", "erotic", "sexual", "intercourse", "orgasm",
    "pornographic", "xxx", "explicit", "intimate", "seduction", "arousal"
  ],
  disturbing: [
    "scary", "horror", "creepy", "haunted", "ghost", "demon", "devil", "evil",
    "nightmare", "terrifying", "disturbing", "grotesque", "disgusting", "vomit",
    "decay", "rot", "disease", "infection", "parasite", "zombie", "undead"
  ],
  adult_themes: [
    "drugs", "alcohol", "smoking", "gambling", "crime", "prison", "jail",
    "abuse", "rape", "assault", "kidnap", "murder", "suicide", "depression",
    "anxiety", "trauma", "ptsd", "abuse", "bullying", "harassment"
  ],
  scary_distortions: [
    "distorted face", "twisted", "deformed", "mutated", "grotesque face",
    "creepy smile", "evil grin", "menacing", "threatening", "sinister"
  ],
  dark_themes: [
    "dark", "gloomy", "depressing", "sad", "lonely", "abandoned", "desolate",
    "wasteland", "apocalypse", "dystopian", "post-apocalyptic"
  ]
};

/**
 * Positive keywords encouraged in Kids Video Mode
 * These enhance family-friendly content
 */
const POSITIVE_KEYWORDS = [
  "bright", "colourful", "friendly", "happy", "joyful", "playful", "fun",
  "adventure", "explore", "discover", "learn", "grow", "help", "share",
  "kindness", "friendship", "teamwork", "celebrate", "magical", "wonder",
  "cheerful", "sunny", "vibrant", "energetic", "positive", "inspiring"
];

/**
 * Visual style guidelines for Kids Video Mode
 */
export const KIDS_VIDEO_VISUAL_RULES = {
  soft: {
    brightness: "high",
    saturation: "moderate",
    contrast: "soft",
    style: "pastel, gentle, soft edges",
    description: "Soft, gentle visuals with pastel colours and smooth edges"
  },
  moderate: {
    brightness: "normal",
    saturation: "vibrant",
    contrast: "normal",
    style: "colourful, friendly, clear",
    description: "Colourful, friendly visuals with clear character silhouettes"
  },
  vibrant: {
    brightness: "bright",
    saturation: "high",
    contrast: "high",
    style: "bright, energetic, bold colours",
    description: "Bright, energetic visuals with bold colours and high contrast"
  }
};

/**
 * Educational theme prompts for Kids Video Mode
 */
export const KIDS_EDUCATIONAL_THEMES = {
  counting: {
    name: "Counting Song",
    description: "Learn numbers through music and visual counting",
    prompt_addition: "Include clear visual counting elements. Show numbers 1-10 prominently. Make counting fun and engaging."
  },
  colours: {
    name: "Colours Song",
    description: "Learn colours through music and visual exploration",
    prompt_addition: "Highlight different colours in each scene. Use pure, bright colours. Teach colour names clearly."
  },
  animals: {
    name: "Animal Adventure",
    description: "Learn about different animals through music",
    prompt_addition: "Feature different friendly animals. Show animal characteristics. Include fun animal sounds or movements."
  },
  letters: {
    name: "Letter Song",
    description: "Learn alphabet letters through music",
    prompt_addition: "Display letters clearly. Show letter shapes visually. Include words that start with each letter."
  },
  friendship: {
    name: "Friendship Story",
    description: "Learn about friendship and cooperation",
    prompt_addition: "Show characters working together, helping each other, and being kind. Emphasize positive relationships."
  },
  feelings: {
    name: "Feelings Song",
    description: "Learn to identify and express emotions",
    prompt_addition: "Show different emotions clearly through character expressions. Teach healthy emotional responses."
  },
  routines: {
    name: "Daily Routines",
    description: "Learn about daily activities and routines",
    prompt_addition: "Show daily activities like brushing teeth, eating, playing, sleeping. Make routines fun and relatable."
  },
  adventure: {
    name: "Adventure Quest",
    description: "Exciting exploration and discovery",
    prompt_addition: "Include exploration, discovery, and wonder. Show characters overcoming challenges positively."
  },
  music_and_movement: {
    name: "Music & Movement",
    description: "Learn through dance and physical movement",
    prompt_addition: "Include dance moves, physical activities, and movement. Encourage participation and active engagement."
  }
};

/**
 * Story structure guidelines for Kids Video Mode
 */
export const KIDS_STORY_STRUCTURE = {
  beginning: "Clear introduction of characters and setting",
  middle: "Simple conflict or challenge with positive resolution",
  end: "Happy, satisfying conclusion with positive message",
  pacing: "Shorter scenes (5-8 seconds), clear actions, visual repetition",
  transitions: "Smooth, gentle transitions between scenes",
  tone: "Emotionally safe, friendly, encouraging"
};

/**
 * Validate content for Kids Video Mode
 * Returns validation result with any violations found
 */
export function validateKidsVideoContent(
  content: string,
  safetyLevel: KidsVideoSafetyLevel = "strict"
): {
  isValid: boolean;
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check for blocked keywords
  for (const [category, keywords] of Object.entries(BLOCKED_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        violations.push(`Contains ${category} content: "${keyword}"`);
      }
    }
  }

  // Suggest positive keywords if none found
  const hasPositive = POSITIVE_KEYWORDS.some(kw => lowerContent.includes(kw));
  if (!hasPositive && violations.length === 0) {
    suggestions.push("Consider adding positive keywords like: bright, friendly, happy, adventure, learn, fun");
  }

  // Check for character consistency rules
  if (lowerContent.includes("new character") || lowerContent.includes("introduce character")) {
    suggestions.push("Ensure all characters are introduced early and remain consistent throughout");
  }

  // Check for appropriate length
  const words = content.split(/\s+/).length;
  if (words > 500) {
    suggestions.push("Scene description is quite long. Consider breaking into shorter, simpler scenes for kids.");
  }

  return {
    isValid: violations.length === 0,
    violations,
    suggestions
  };
}

/**
 * Auto-correct content for Kids Video Mode
 * Replaces or removes problematic content
 */
export function autoCorrectKidsVideoContent(content: string): {
  corrected: string;
  changes: Array<{ original: string; replacement: string }>;
} {
  let corrected = content;
  const changes: Array<{ original: string; replacement: string }> = [];

  // Replace violent keywords
  const replacements: Record<string, string> = {
    "kill": "defeat",
    "death": "sleep",
    "blood": "paint",
    "weapon": "tool",
    "fight": "compete",
    "attack": "challenge",
    "scary": "surprising",
    "horror": "adventure",
    "dark": "mysterious",
    "evil": "mischievous",
    "demon": "character",
    "ghost": "friend",
    "zombie": "creature",
    "gore": "action"
  };

  for (const [original, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${original}\\b`, "gi");
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, replacement);
      changes.push({ original, replacement });
    }
  }

  return { corrected, changes };
}

/**
 * Generate Kids Video Mode prompt enhancement
 * Adds safety and educational constraints to scene prompts
 */
export function enhanceKidsVideoPrompt(
  basePrompt: string,
  options: {
    targetAge?: string;
    educationalTheme?: keyof typeof KIDS_EDUCATIONAL_THEMES;
    friendlyIntensity?: "soft" | "moderate" | "vibrant";
    enableSingalong?: boolean;
  }
): string {
  let enhanced = basePrompt;

  // Add visual style guidelines
  if (options.friendlyIntensity) {
    const style = KIDS_VIDEO_VISUAL_RULES[options.friendlyIntensity];
    enhanced += `\n\nVISUAL STYLE: ${style.description}. Use ${style.style} visuals.`;
  }

  // Add educational theme guidance
  if (options.educationalTheme && KIDS_EDUCATIONAL_THEMES[options.educationalTheme]) {
    const theme = KIDS_EDUCATIONAL_THEMES[options.educationalTheme];
    enhanced += `\n\nEDUCATIONAL THEME: ${theme.prompt_addition}`;
  }

  // Add safety constraints
  enhanced += `
\n\nKIDS VIDEO MODE SAFETY REQUIREMENTS:
- MUST be bright, friendly, and age-appropriate
- NO violence, blood, gore, weapons, or scary imagery
- NO disturbing facial distortions, creepy backgrounds, or threatening visuals
- NO adult humour, sexual content, or mature references
- Characters must be friendly and recognisable
- Keep expressions and body language positive and safe
- Use clear, simple visual design suitable for children
- Ensure all characters remain consistent throughout
- Include positive messages and friendly conflict resolution`;

  if (options.enableSingalong) {
    enhanced += `\n- SINGALONG MODE: Highlight lyrics visually, make movements match the music, encourage participation`;
  }

  return enhanced;
}

/**
 * Generate Kids Video Mode storyboard structure
 */
export function generateKidsStoryboardStructure(
  template: string,
  audioLengthSeconds: number
): Array<{
  sceneIndex: number;
  duration: number;
  guidedPrompt: string;
  learningObjective?: string;
}> {
  const scenes: Array<{
    sceneIndex: number;
    duration: number;
    guidedPrompt: string;
    learningObjective?: string;
  }> = [];

  // Calculate scene count (shorter scenes for kids, typically 5-8 seconds each)
  const sceneDuration = 6; // seconds per scene
  const sceneCount = Math.ceil(audioLengthSeconds / sceneDuration);

  const templates: Record<string, string[]> = {
    singalong_adventure: [
      "Bright opening scene with main character waving hello",
      "First verse: character explores a colourful environment",
      "Chorus: character dances or moves to the music",
      "Second verse: introduce a friend or companion",
      "Chorus: both characters dance together",
      "Bridge: adventure moment or discovery",
      "Final chorus: celebration with all characters",
      "Ending: happy goodbye wave"
    ],
    bedtime_story: [
      "Daytime scene with character playing",
      "Sun setting, character getting ready for bed",
      "Character snuggling into bed",
      "Dream sequence begins - magical adventure",
      "Dream continues - exploration and wonder",
      "Dream peaks - magical moment",
      "Character waking up refreshed",
      "Peaceful bedtime ending"
    ],
    learning_song: [
      "Introduction of learning topic",
      "First concept with visual examples",
      "Second concept with clear demonstration",
      "Repetition of first concept",
      "Repetition of second concept",
      "Combination of both concepts",
      "Celebration of learning",
      "Encouraging ending"
    ],
    animal_adventure: [
      "Introduction of first animal",
      "First animal in natural habitat",
      "Introduction of second animal",
      "Animals interact positively",
      "Adventure or exploration together",
      "Animals helping each other",
      "Group celebration",
      "Friendly goodbye"
    ],
    magical_journey: [
      "Ordinary world introduction",
      "Magic appears - wonder and discovery",
      "First magical location",
      "Second magical location",
      "Challenge or puzzle",
      "Positive resolution",
      "Return to ordinary world",
      "Magical memory remains"
    ],
    counting_song: [
      "Introduction with number 1",
      "Numbers 2-3 with visual counting",
      "Numbers 4-5 with objects",
      "Numbers 6-7 with more objects",
      "Numbers 8-10 celebration",
      "Counting backwards for fun",
      "Final count-up",
      "Counting success celebration"
    ],
    friendship_story: [
      "Character 1 alone",
      "Character 2 appears",
      "Characters meet and greet",
      "Characters play together",
      "Small conflict or challenge",
      "Characters help each other",
      "Friendship celebration",
      "Happy together ending"
    ],
    movement_and_dance: [
      "Warm-up movements",
      "First dance move introduction",
      "Second dance move introduction",
      "Combine moves together",
      "Speed up the movement",
      "Add jumping or spinning",
      "All moves together celebration",
      "Cool-down and happy ending"
    ]
  };

  const templateScenes = templates[template] || templates.singalong_adventure;
  const scenesPerTemplate = templateScenes.length;

  for (let i = 0; i < sceneCount; i++) {
    const templateIndex = i % scenesPerTemplate;
    const templatePrompt = templateScenes[templateIndex];

    scenes.push({
      sceneIndex: i,
      duration: sceneDuration,
      guidedPrompt: templatePrompt,
      learningObjective: `Scene ${i + 1}: ${templatePrompt}`
    });
  }

  return scenes;
}

/**
 * Check if content violates Kids Video Mode safety rules
 */
export function checkKidsVideoSafety(
  content: string,
  strict: boolean = true
): {
  safe: boolean;
  issues: string[];
  recommendation: "approve" | "correct" | "reject";
} {
  const validation = validateKidsVideoContent(content, strict ? "strict" : "permissive");

  if (validation.violations.length === 0) {
    return {
      safe: true,
      issues: [],
      recommendation: "approve"
    };
  }

  if (validation.violations.length <= 2) {
    return {
      safe: false,
      issues: validation.violations,
      recommendation: "correct"
    };
  }

  return {
    safe: false,
    issues: validation.violations,
    recommendation: "reject"
  };
}
