export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Credit costs for video generation — shared between client and server.
 * Language rule: always say "Credits", never "tokens", "cost", or "API".
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

export function calculateVideoCreditCost(options: {
  audioDurationSeconds: number;
  cinematicSceneCount?: number;
  enableLipSync?: boolean;
}): { base: number; cinematic: number; lipSync: number; total: number } {
  const { audioDurationSeconds, cinematicSceneCount = 0, enableLipSync = false } = options;
  let base: number = VIDEO_CREDIT_COSTS.byDuration.long.credits;
  if (audioDurationSeconds <= VIDEO_CREDIT_COSTS.byDuration.short.maxSeconds) {
    base = VIDEO_CREDIT_COSTS.byDuration.short.credits;
  } else if (audioDurationSeconds <= VIDEO_CREDIT_COSTS.byDuration.medium.maxSeconds) {
    base = VIDEO_CREDIT_COSTS.byDuration.medium.credits;
  }
  const cinematic = cinematicSceneCount * VIDEO_CREDIT_COSTS.perCinematicScene;
  const lipSync = enableLipSync ? VIDEO_CREDIT_COSTS.lipSync : 0;
  return { base, cinematic, lipSync, total: base + cinematic + lipSync };
}

/** Low credit warning threshold */
export const LOW_CREDIT_THRESHOLD = 20;
