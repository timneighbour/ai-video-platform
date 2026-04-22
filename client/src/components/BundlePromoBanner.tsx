/**
 * BundlePromoBanner
 *
 * Shown when a user's render balance is low (0–2 Build Credits remaining).
 * Promotes build credit packs as the fastest way to top up.
 * Non-intrusive: dismissible per-session.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, Zap, Package } from "@/lib/icons";

const DISMISS_KEY = "wizvid_bundle_promo_dismissed";

interface BundlePromoBannerProps {
  /** Threshold below which the banner appears. Default: 2 */
  threshold?: number;
  className?: string;
}

export default function BundlePromoBanner({
  threshold = 2,
  className = "",
}: BundlePromoBannerProps) {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const { data: renderStatus } = trpc.render.getRenderStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: subData } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (dismissed) return null;
  if (!renderStatus) return null;

  // Only show when renders are low and user is not on a high-tier subscription
  const isHighTier = subData?.plan === "studio" || subData?.plan === "business";
  if (isHighTier) return null;
  if (renderStatus.total > threshold) return null;

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  const remaining = renderStatus.total;
  const isZero = remaining === 0;

  return (
    <div
      className={`relative flex items-center gap-3 rounded-lg border border-[--color-gold]/30 bg-[#2a1f00]/40 px-4 py-3 text-sm ${className}`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {isZero ? (
          <Zap className="h-4 w-4 text-[--color-gold]" />
        ) : (
          <Package className="h-4 w-4 text-[--color-silver]" />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        {isZero ? (
          <span className="text-[--color-gold] font-medium">
            You&apos;re out of Build Credits.{" "}
            <span className="text-white/70 font-normal">
              Buy a bundle to keep creating — no subscription needed.
            </span>
          </span>
        ) : (
          <span className="text-white/80">
            <span className="font-medium">
              {remaining} build{remaining !== 1 ? "s" : ""} left.
            </span>{" "}
            <span className="text-white/60">
              Save up to 30% with a build credit pack.
            </span>
          </span>
        )}
      </div>

      {/* CTA */}
      <a
        href="/pricing#bundles"
        className="flex-shrink-0 inline-flex items-center justify-center border border-[--color-gold]/50 text-[--color-gold] hover:bg-[--color-gold]/15 text-xs px-3 h-7 rounded-md transition-colors"
      >
        Get a bundle
      </a>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors ml-1"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
