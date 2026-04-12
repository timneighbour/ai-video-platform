/**
 * SubscriptionUpgradeNudge
 *
 * A subtle, behaviour-triggered banner shown to active pay-per-render users
 * who have not yet subscribed. Triggered when the backend detects 2+ paid
 * renders or 1+ bundle purchase without an active subscription.
 *
 * Design: minimal dark pill/card, purple accent, single CTA, dismissible.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { X, TrendingDown, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const DISMISS_KEY = "wizvid_upgrade_nudge_dismissed_v1";

export default function SubscriptionUpgradeNudge() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const nudgeQuery = trpc.render.getUpgradeNudge.useQuery(undefined, {
    enabled: isAuthenticated && !dismissed,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (!isAuthenticated || dismissed || !nudgeQuery.data?.shouldNudge) return null;

  const { paidRenderCount, bundleCount, estimatedMonthlySavingPence, recommendedPlanPrice } = nudgeQuery.data;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
    setDismissed(true);
  };

  // Build contextual message
  let triggerLine = "";
  if (bundleCount >= 1 && paidRenderCount >= 2) {
    triggerLine = `You've purchased ${paidRenderCount} renders and ${bundleCount} bundle${bundleCount !== 1 ? "s" : ""}.`;
  } else if (bundleCount >= 1) {
    triggerLine = `You've purchased ${bundleCount} render bundle${bundleCount !== 1 ? "s" : ""}.`;
  } else {
    triggerLine = `You've completed ${paidRenderCount} pay-per-render purchases.`;
  }

  const savingsLine =
    estimatedMonthlySavingPence > 0
      ? `Save up to £${(estimatedMonthlySavingPence / 100).toFixed(0)}/mo with the Creator plan.`
      : `The Creator plan gives you 15 renders/mo for just £${recommendedPlanPrice}.`;

  return (
    <div
      className="relative flex items-start gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/60 to-purple-950/40 px-4 py-3 shadow-lg shadow-violet-900/20 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
        <TrendingDown className="h-4 w-4 text-violet-400" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug">
          You could save with a monthly plan
        </p>
        <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">
          {triggerLine} {savingsLine}
        </p>
      </div>

      {/* CTA */}
      <div className="flex shrink-0 items-center gap-2 ml-2">
        <Link href="/pricing">
          <Button
            size="sm"
            className="h-7 bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 gap-1.5"
          >
            <Sparkles className="h-3 w-3" />
            See Creator Plan
          </Button>
        </Link>
        <button
          onClick={handleDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
