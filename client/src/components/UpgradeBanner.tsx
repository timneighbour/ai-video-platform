import { useState } from "react";
import { Sparkles, X, ArrowRight, Rocket, PartyPopper } from "@/lib/icons";

interface UpgradeBannerProps {
  type?: "limit" | "milestone" | "watermark";
  videosCreated?: number;
  className?: string;
}

const BANNER_CONTENT = {
  limit: {
    icon: Rocket,
    text: "You've reached your video limit.",
    cta: "Unlock more Build Credits with Creator",
  },
  milestone: {
    icon: PartyPopper,
    text: "You're on a roll!",
    cta: "Upgrade to Creator — 15 Build Credits/month",
  },
  watermark: {
    icon: Sparkles,
    text: "Your video has a watermark.",
    cta: "Remove it with Creator — from £35/month",
  },
};

export default function UpgradeBanner({ type = "milestone", className = "" }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const content = BANNER_CONTENT[type];
  const Icon = content.icon;

  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-600/15 border border-[--color-gold]/30 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-5 h-5 text-[--color-gold] flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <span className="text-white/80 text-sm font-medium">{content.text} </span>
          <a
            href="/pricing"
            className="text-[--color-gold] hover:text-[--color-gold] text-sm font-bold underline-offset-2 hover:underline transition-colors inline-flex items-center gap-1"
          >
            {content.cta}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
