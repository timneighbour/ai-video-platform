/**
 * useExperiment — React hook for A/B experiment assignment and tracking.
 *
 * Usage:
 *   const { variant, trackImpression, trackClick } = useExperiment("CINEMATIC_CTA");
 *
 * - variant: "control" | "variant_b" | "variant_c"
 * - trackImpression(): call once when the CTA becomes visible (use IntersectionObserver or mount)
 * - trackClick(): call when the user clicks the CTA button
 *
 * Impression is automatically deduplicated per session via sessionStorage.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { mp } from "@/lib/mixpanel";
import {
  EXPERIMENTS,
  type ExperimentKey,
  type ExperimentVariant,
  assignVariant,
} from "@/lib/experiments";

interface UseExperimentResult {
  /** The stable variant assigned to this user */
  variant: ExperimentVariant;
  /** Call when the CTA enters the viewport (fires once per session) */
  trackImpression: () => void;
  /** Call when the user clicks the CTA */
  trackClick: () => void;
  /** True once the variant has been resolved (avoids flash of wrong variant) */
  ready: boolean;
}

export function useExperiment(experimentKey: ExperimentKey): UseExperimentResult {
  const { user } = useAuth();
  const experiment = EXPERIMENTS[experimentKey];
  const impressionFiredRef = useRef(false);

  const [variant, setVariant] = useState<ExperimentVariant>("control");
  const [ready, setReady] = useState(false);

  // Resolve variant on mount (after auth state is available)
  useEffect(() => {
    // Use openId (stable Manus OAuth identifier) for bucketing; fall back to anonymous ID
  const userId = (user as { openId?: string } | null)?.openId ?? null;
    const resolved = assignVariant(userId, experiment);
    setVariant(resolved);
    setReady(true);
  }, [user?.id, experiment]);

  /** Fire "Experiment Impression" once per session per experiment */
  const trackImpression = useCallback(() => {
    if (impressionFiredRef.current) return;
    const sessionKey = `wiz_imp_${experiment.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    impressionFiredRef.current = true;
    sessionStorage.setItem(sessionKey, "1");

    mp.track("Experiment Impression", {
      experiment: experiment.name,
      experiment_id: experiment.id,
      variant,
    });
  }, [experiment, variant]);

  /** Fire "Experiment CTA Clicked" on button click */
  const trackClick = useCallback(() => {
    mp.track("Experiment CTA Clicked", {
      experiment: experiment.name,
      experiment_id: experiment.id,
      variant,
    });
  }, [experiment, variant]);

  return { variant, trackImpression, trackClick, ready };
}
