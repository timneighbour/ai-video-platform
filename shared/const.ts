export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Credit costs for video generation — shared between client and server.
 * Language rule: always say "Credits", never "tokens", "cost", or "API".
 *
 * TIERED PRICING — longer videos cost more credits per scene:
 *   Short  (≤3 min / ≤180s):  15 credits/scene  — base rate
 *   Medium (3–5 min / 181–300s): 18 credits/scene  — 20% premium
 *   Long   (>5 min / >300s):  20 credits/scene  — 33% premium
 */
export const VIDEO_CREDIT_COSTS = {
  byDuration: {
    short:  { maxSeconds: 60,  credits: 30  },
    medium: { maxSeconds: 120, credits: 60  },
    long:   { maxSeconds: 180, credits: 90  },
  },
  perCinematicScene: 20,
  lipSync: 30,
} as const;

/** Tiered credits-per-scene rates based on audio duration */
export const TIERED_CREDITS_PER_SCENE = {
  short:  { maxSeconds: 180, creditsPerScene: 15, label: "up to 3 min" },
  medium: { maxSeconds: 300, creditsPerScene: 18, label: "3–5 min" },
  long:   { maxSeconds: Infinity, creditsPerScene: 20, label: "5+ min" },
} as const;

/** Get the credits-per-scene rate for a given audio duration */
export function getCreditsPerScene(audioDurationSeconds: number): number {
  if (audioDurationSeconds <= TIERED_CREDITS_PER_SCENE.short.maxSeconds) return TIERED_CREDITS_PER_SCENE.short.creditsPerScene;
  if (audioDurationSeconds <= TIERED_CREDITS_PER_SCENE.medium.maxSeconds) return TIERED_CREDITS_PER_SCENE.medium.creditsPerScene;
  return TIERED_CREDITS_PER_SCENE.long.creditsPerScene;
}

/** Get the tier label for a given audio duration */
export function getDurationTierLabel(audioDurationSeconds: number): string {
  if (audioDurationSeconds <= TIERED_CREDITS_PER_SCENE.short.maxSeconds) return TIERED_CREDITS_PER_SCENE.short.label;
  if (audioDurationSeconds <= TIERED_CREDITS_PER_SCENE.medium.maxSeconds) return TIERED_CREDITS_PER_SCENE.medium.label;
  return TIERED_CREDITS_PER_SCENE.long.label;
}

/** Calculate scene count from audio duration (1 scene per 8s, min 3, max 45) */
export function calcSceneCount(audioDurationSeconds: number): number {
  return Math.max(3, Math.min(45, Math.ceil(audioDurationSeconds / 8)));
}

/**
 * Calculate total credit cost using tiered per-scene pricing.
 * Returns a full breakdown for display.
 */
export function calculateTieredCreditCost(options: {
  audioDurationSeconds: number;
  enableLipSync?: boolean;
}): {
  sceneCount: number;
  creditsPerScene: number;
  tierLabel: string;
  baseCredits: number;
  lipSyncCredits: number;
  total: number;
} {
  const { audioDurationSeconds, enableLipSync = false } = options;
  const sceneCount = calcSceneCount(audioDurationSeconds);
  const creditsPerScene = getCreditsPerScene(audioDurationSeconds);
  const tierLabel = getDurationTierLabel(audioDurationSeconds);
  const baseCredits = sceneCount * creditsPerScene;
  const lipSyncCredits = enableLipSync ? VIDEO_CREDIT_COSTS.lipSync : 0;
  return { sceneCount, creditsPerScene, tierLabel, baseCredits, lipSyncCredits, total: baseCredits + lipSyncCredits };
}

export function calculateVideoCreditCost(options: {
  audioDurationSeconds: number;
  cinematicSceneCount?: number;
  enableLipSync?: boolean;
}): { base: number; cinematic: number; lipSync: number; total: number } {
  const { audioDurationSeconds, cinematicSceneCount = 0, enableLipSync = false } = options;
  // Use tiered per-scene pricing for base cost
  const sceneCount = calcSceneCount(audioDurationSeconds);
  const creditsPerScene = getCreditsPerScene(audioDurationSeconds);
  const base = sceneCount * creditsPerScene;
  const cinematic = cinematicSceneCount * VIDEO_CREDIT_COSTS.perCinematicScene;
  const lipSync = enableLipSync ? VIDEO_CREDIT_COSTS.lipSync : 0;
  return { base, cinematic, lipSync, total: base + cinematic + lipSync };
}

/** Low credit warning threshold */
export const LOW_CREDIT_THRESHOLD = 20;
