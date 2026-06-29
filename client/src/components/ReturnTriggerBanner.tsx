/**
 * ReturnTriggerBanner — contextual re-engagement nudge for returning users.
 *
 * Shown on the Dashboard for users who have previously created projects.
 * Cycles through messages based on user state (credits, last activity, plan).
 * Dismissible per session.
 */
import { useState, useEffect } from "react";
import { Zap, Sparkles, Film, Music, Star, ArrowRight, X, Gift, TrendingUp } from "@/lib/icons";
import { mp } from "@/lib/mixpanel";

interface ReturnTriggerBannerProps {
  creditBalance: number;
  totalProjects: number;
  lastProjectDaysAgo?: number; // days since last project
  isFreePlan: boolean;
  userName?: string;
}

interface Trigger {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  headline: string | ((props: ReturnTriggerBannerProps) => string);
  subline: string;
  ctaLabel: string;
  ctaHref: string;
  ctaStyle: string;
  condition: (props: ReturnTriggerBannerProps) => boolean;
}

const TRIGGERS: Trigger[] = [
  {
    id: "credits_waiting",
    icon: Zap,
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    bgColor: "bg-amber-500/[0.04]",
    headline: (props: ReturnTriggerBannerProps) =>
      `You have ${props.creditBalance} credits waiting`,
    subline: "Your credits don't expire. Pick up where you left off.",
    ctaLabel: "Continue creating →",
    ctaHref: "/music-video/create",
    ctaStyle: "text-amber-400 hover:text-amber-300",
    condition: (p) => p.creditBalance >= 10,
  },
  {
    id: "try_cinematic",
    icon: Film,
    iconColor: "text-[#b8892a]",
    borderColor: "border-[#b8892a]/20",
    bgColor: "bg-[#b8892a]/[0.04]",
    headline: "Try a new cinematic style",
    subline: "WizLumina™ Cinematic is now available — ultra-realistic lighting and depth.",
    ctaLabel: "Open WizVideo →",
    ctaHref: "/music-video/create",
    ctaStyle: "text-[#b8892a] hover:text-[#e8c878]",
    condition: (p) => p.totalProjects >= 1,
  },
  {
    id: "new_template",
    icon: Sparkles,
    iconColor: "text-purple-400",
    borderColor: "border-purple-500/20",
    bgColor: "bg-purple-500/[0.04]",
    headline: "New templates available",
    subline: "Cinematic Trailer, Social Short, Kids Adventure — ready to use in one click.",
    ctaLabel: "Browse templates →",
    ctaHref: "/music-video/create",
    ctaStyle: "text-purple-400 hover:text-purple-300",
    condition: (p) => p.totalProjects >= 1,
  },
  {
    id: "try_music",
    icon: Music,
    iconColor: "text-zinc-300",
    borderColor: "border-white/10",
    bgColor: "bg-white/[0.02]",
    headline: "Have you tried WizAudio™?",
    subline: "Generate original AI music for your next video — no royalties, ever.",
    ctaLabel: "Try WizAudio →",
    ctaHref: "/music-creator",
    ctaStyle: "text-zinc-300 hover:text-white",
    condition: (p) => p.totalProjects >= 2,
  },
  {
    id: "upgrade_unlock",
    icon: Star,
    iconColor: "text-[--color-gold]",
    borderColor: "border-[--color-gold]/20",
    bgColor: "bg-[--color-gold]/[0.04]",
    headline: "Unlock 4K exports and monthly credits",
    subline: "Pro plan from £19/mo — cancel anytime, no credit card required to try.",
    ctaLabel: "See plans →",
    ctaHref: "/pricing",
    ctaStyle: "text-[--color-gold] hover:text-[#e8c878]",
    condition: (p) => p.isFreePlan && p.totalProjects >= 1,
  },
  {
    id: "comeback_gift",
    icon: Gift,
    iconColor: "text-pink-400",
    borderColor: "border-pink-500/20",
    bgColor: "bg-pink-500/[0.04]",
    headline: "Welcome back! Your studio missed you.",
    subline: "Your saved projects and credits are right here — ready when you are.",
    ctaLabel: "Start creating →",
    ctaHref: "/music-video/create",
    ctaStyle: "text-pink-400 hover:text-pink-300",
    condition: (p) => (p.lastProjectDaysAgo ?? 0) >= 7,
  },
];

// Resolve headline (may be a function or string)
function resolveHeadline(trigger: Trigger, props: ReturnTriggerBannerProps): string {
  return typeof trigger.headline === "function"
    ? (trigger.headline as (p: ReturnTriggerBannerProps) => string)(props)
    : trigger.headline;
}

export function ReturnTriggerBanner(props: ReturnTriggerBannerProps) {
  const { totalProjects } = props;
  const [dismissed, setDismissed] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState<Trigger | null>(null);

  useEffect(() => {
    // Don't show for new users
    if (totalProjects === 0) return;

    // Check session dismissal
    const dismissedKey = "return_trigger_dismissed";
    if (sessionStorage.getItem(dismissedKey)) return;

    // Pick the first matching trigger (priority order)
    const match = TRIGGERS.find((t) => t.condition(props));
    if (match) {
      setActiveTrigger(match);
      mp.track("ReturnTrigger_Shown", { trigger: match.id });
    }
  }, [totalProjects, props.creditBalance, props.isFreePlan]);

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("return_trigger_dismissed", "1");
    if (activeTrigger) mp.track("ReturnTrigger_Dismissed", { trigger: activeTrigger.id });
  }

  function handleCTAClick() {
    if (activeTrigger) mp.track("ReturnTrigger_CTAClick", { trigger: activeTrigger.id });
  }

  if (dismissed || !activeTrigger) return null;

  const Icon = activeTrigger.icon;

  return (
    <div
      className={`rounded-xl border ${activeTrigger.borderColor} ${activeTrigger.bgColor} px-5 py-4 flex items-center gap-4 group`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${activeTrigger.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">
          {resolveHeadline(activeTrigger, props)}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{activeTrigger.subline}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3">
        <a
          href={activeTrigger.ctaHref}
          onClick={handleCTAClick}
          className={`text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${activeTrigger.ctaStyle}`}
        >
          {activeTrigger.ctaLabel}
        </a>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3 text-zinc-500" />
        </button>
      </div>
    </div>
  );
}
