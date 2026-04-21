/**
 * experiments.ts — Deterministic A/B experiment bucketing utility
 *
 * Bucketing is deterministic: given the same userId + experimentId,
 * the same variant is always returned. No randomness at runtime.
 *
 * Architecture:
 *  1. Hash(userId + experimentId) → stable 0-99 bucket
 *  2. Map bucket to variant based on traffic split weights
 *  3. Persist assignment in localStorage (anonymous users) or DB (logged-in users)
 *
 * Tracking contract (Mixpanel):
 *  - "Experiment Impression"  → fired once per session per experiment
 *  - "Experiment CTA Clicked" → fired on CTA click
 *  Both events carry { experiment, variant } for Mixpanel funnel analysis.
 */

export type ExperimentVariant = "control" | "variant_b" | "variant_c";

export interface ExperimentConfig {
  /** Unique stable identifier for this experiment */
  id: string;
  /** Human-readable name for Mixpanel events */
  name: string;
  /** Traffic split weights — must sum to 100 */
  weights: Record<ExperimentVariant, number>;
}

/** Registry of all active experiments */
export const EXPERIMENTS = {
  CINEMATIC_CTA: {
    id: "cinematic_cta_v1",
    name: "Cinematic CTA",
    weights: {
      control: 34,    // "Upgrade to Cinematic Mode" (current)
      variant_b: 33,  // Urgency: "Unlock Cinematic Quality — Limited Offer"
      variant_c: 33,  // Social proof: "Join 1,000+ Creators — Go Cinematic"
    },
  } satisfies ExperimentConfig,
} as const;

export type ExperimentKey = keyof typeof EXPERIMENTS;

/**
 * Fast, non-cryptographic djb2 hash.
 * Produces a stable integer for any string input.
 */
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash;
}

/**
 * Deterministically assign a user to a variant bucket (0–99).
 * Same userId + experimentId always produces the same bucket.
 */
export function getBucket(userId: string, experimentId: string): number {
  return djb2Hash(`${userId}:${experimentId}`) % 100;
}

/**
 * Map a 0–99 bucket to a variant based on the experiment's weight config.
 */
export function bucketToVariant(
  bucket: number,
  weights: Record<ExperimentVariant, number>
): ExperimentVariant {
  const variants: ExperimentVariant[] = ["control", "variant_b", "variant_c"];
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += weights[variant];
    if (bucket < cumulative) return variant;
  }
  return "control"; // fallback
}

/**
 * Get a stable anonymous ID from localStorage.
 * Used for logged-out visitors to maintain consistent bucketing.
 */
export function getAnonymousId(): string {
  const key = "wiz_anon_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Get the localStorage key for a cached variant assignment.
 */
function cacheKey(experimentId: string): string {
  return `wiz_exp_${experimentId}`;
}

/**
 * Assign a variant for a given user + experiment.
 * Caches in localStorage to avoid re-computation and ensure session stability.
 */
export function assignVariant(
  userId: string | null | undefined,
  experiment: ExperimentConfig
): ExperimentVariant {
  const cached = localStorage.getItem(cacheKey(experiment.id));
  if (cached && isValidVariant(cached)) return cached as ExperimentVariant;

  const effectiveId = userId || getAnonymousId();
  const bucket = getBucket(effectiveId, experiment.id);
  const variant = bucketToVariant(bucket, experiment.weights);

  localStorage.setItem(cacheKey(experiment.id), variant);
  return variant;
}

function isValidVariant(v: string): v is ExperimentVariant {
  return ["control", "variant_b", "variant_c"].includes(v);
}

/**
 * Clear a cached variant (useful for testing / forcing re-assignment).
 */
export function clearVariantCache(experimentId: string): void {
  localStorage.removeItem(cacheKey(experimentId));
}
