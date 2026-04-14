import { useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";

interface UpgradeBannerProps {
  type?: "limit" | "milestone" | "watermark";
  videosCreated?: number;
  className?: string;
}

const BANNER_CONTENT = {
  limit: {
    emoji: "🚀",
    text: "You've reached your video limit.",
    cta: "Unlock more renders with Creator",
  },
  milestone: {
    emoji: "🎉",
    text: "You're on a roll!",
    cta: "Upgrade to Creator — 15 renders/month",
  },
  watermark: {
    emoji: "✨",
    text: "Your video has a watermark.",
    cta: "Remove it with Creator — from £29/month",
  },
};

export default function UpgradeBanner({ type = "milestone", className = "" }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const content = BANNER_CONTENT[type];

  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-600/15 border border-purple-500/30 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl flex-shrink-0" aria-hidden="true">{content.emoji}</span>
        <div className="min-w-0">
          <span className="text-white/80 text-sm font-medium">{content.text} </span>
          <a
            href="/pricing"
            className="text-purple-300 hover:text-purple-200 text-sm font-bold underline-offset-2 hover:underline transition-colors inline-flex items-center gap-1"
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
