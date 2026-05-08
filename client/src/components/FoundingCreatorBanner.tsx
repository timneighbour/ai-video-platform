/**
 * FoundingCreatorBanner
 *
 * A time-limited "Founding Creator" offer banner shown to free/unsubscribed users.
 * Displays a 7-day countdown from first visit. Dismissible per session.
 * Clicking the CTA opens the pricing page with a pre-selected Creator plan.
 *
 * Shown on: homepage, dashboard, pricing page (all public + authenticated pages)
 */
import { useState, useEffect } from "react";
import { X, Clock, Sparkles, Crown } from "@/lib/icons";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { mp } from "@/lib/mixpanel";

const DISMISS_KEY = "wiz_founding_banner_dismissed_v2";
const FIRST_SEEN_KEY = "wiz_founding_banner_first_seen_v2";
const OFFER_DURATION_DAYS = 7;

function useCountdown(expiresAt: number | null) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setRemaining({ days, hours, minutes, seconds });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

export default function FoundingCreatorBanner() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const { data: subData } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const countdown = useCountdown(expiresAt);

  useEffect(() => {
    setMounted(true);
    try {
      // Check if dismissed
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
        return;
      }
      // Set or retrieve first-seen timestamp
      const stored = localStorage.getItem(FIRST_SEEN_KEY);
      let firstSeen: number;
      if (stored) {
        firstSeen = parseInt(stored, 10);
      } else {
        firstSeen = Date.now();
        localStorage.setItem(FIRST_SEEN_KEY, firstSeen.toString());
      }
      const expires = firstSeen + OFFER_DURATION_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() < expires) {
        setExpiresAt(expires);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
    setDismissed(true);
    mp.track("FoundingCreatorBanner_Dismissed");
  };

  const handleCTA = () => {
    mp.track("FoundingCreatorBanner_CTAClicked", { source: "banner" });
    mp.upgradeCTAClicked("founding_creator_banner", subData?.plan ?? "free", "creator");
    window.location.href = "/pricing?ref=founding";
  };

  // Don't show if: not mounted, dismissed, offer expired, or already subscribed
  if (!mounted || dismissed || !expiresAt || !countdown) return null;
  if (isAuthenticated && subData && subData.plan !== "free" && subData.isActive) return null;

  const pad = (n: number) => n.toString().padStart(2, "0");

  // Set CSS variable for banner height so fixed navbars can offset themselves
  useEffect(() => {
    document.documentElement.style.setProperty("--founding-banner-h", "44px");
    return () => {
      document.documentElement.style.setProperty("--founding-banner-h", "0px");
    };
  }, []);

  return (
    <div
      role="banner"
      aria-label="Founding Creator limited-time offer"
      className="fixed left-0 right-0 w-full overflow-hidden"
      style={{
        top: 0,
        zIndex: 60,
        background: "linear-gradient(90deg, oklch(0.14 0.04 75) 0%, oklch(0.10 0.03 75) 50%, oklch(0.14 0.04 75) 100%)",
        borderBottom: "1px solid oklch(0.78 0.11 75 / 0.25)",
      }}
    >
      {/* Animated shimmer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.78 0.11 75 / 0.06) 50%, transparent 100%)",
          animation: "shimmer 3s ease-in-out infinite",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Left: badge + message */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex-shrink-0"
            style={{
              background: "oklch(0.78 0.11 75 / 0.15)",
              border: "1px solid oklch(0.78 0.11 75 / 0.4)",
              color: "oklch(0.88 0.10 75)",
            }}
          >
            <Crown className="w-3 h-3" />
            Founding Creator
          </div>
          <p className="text-[13px] font-medium" style={{ color: "oklch(0.88 0.08 75)" }}>
            <span className="font-bold text-white">Limited offer:</span> Join as a Founding Creator — bonus credits on your first subscription.
          </p>
        </div>

        {/* Centre: countdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.78 0.11 75 / 0.7)" }} />
          <div className="flex items-center gap-1 text-[12px] font-mono font-bold" style={{ color: "oklch(0.88 0.10 75)" }}>
            {countdown.days > 0 && (
              <><span>{countdown.days}d</span><span className="opacity-40 mx-0.5">:</span></>
            )}
            <span>{pad(countdown.hours)}h</span>
            <span className="opacity-40 mx-0.5">:</span>
            <span>{pad(countdown.minutes)}m</span>
            <span className="opacity-40 mx-0.5">:</span>
            <span>{pad(countdown.seconds)}s</span>
          </div>
        </div>

        {/* Right: CTA + dismiss */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCTA}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, oklch(0.78 0.11 75), oklch(0.60 0.10 65))",
              color: "oklch(0.10 0.02 75)",
              boxShadow: "0 0 16px oklch(0.78 0.11 75 / 0.35)",
            }}
          >
            <Sparkles className="w-3 h-3" />
            Claim Offer
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss founding creator offer"
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: "oklch(0.78 0.11 75 / 0.5)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
