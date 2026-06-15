/**
 * CreditCostBanner — shown prominently at the top of every product tool
 * so users know exactly what they will spend BEFORE investing time in the workflow.
 *
 * Tone: premium, confident, "you get what you pay for — WIZ AI delivers"
 * Priority 5: Build conversion improvements — render time estimate, free re-render badge,
 * quality guarantee reassurance, preview-before-download reassurance.
 *
 * Usage:
 *   <CreditCostBanner credits={390} label="Music Video" breakdown="26 scenes × 15 cr/scene"
 *     sceneCount={26} showQualityGuarantee />
 */

import { Zap, Sparkles, Clock, ShieldCheck, RefreshCw, Eye } from "lucide-react";
import { Link } from "wouter";

interface CreditCostBannerProps {
  /** Total credits that will be charged */
  credits: number;
  /** Tool name, e.g. "Music Video" */
  label?: string;
  /** Optional breakdown line, e.g. "26 scenes × 15 cr/scene" */
  breakdown?: string;
  /** Optional footnote override */
  note?: string;
  /** Optional extra content (e.g. tier selector) rendered inside the banner */
  children?: React.ReactNode;
  /** If true, show a loading state */
  loading?: boolean;
  /** Number of scenes — used to estimate render time */
  sceneCount?: number;
  /** If true, show quality guarantee + preview reassurance badges */
  showQualityGuarantee?: boolean;
}

/** Estimate render time from scene count: ~45s per scene + 2min assembly */
function estimateRenderMinutes(sceneCount: number): string {
  const totalSeconds = sceneCount * 45 + 120;
  const minutes = Math.ceil(totalSeconds / 60);
  if (minutes < 5) return "~5 min";
  if (minutes <= 10) return `~${minutes} min`;
  const lower = Math.floor(minutes / 5) * 5;
  const upper = lower + 5;
  return `${lower}–${upper} min`;
}

export function CreditCostBanner({
  credits,
  label,
  breakdown,
  note,
  children,
  loading = false,
  sceneCount,
  showQualityGuarantee = false,
}: CreditCostBannerProps) {
  const renderEstimate = sceneCount ? estimateRenderMinutes(sceneCount) : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(10,7,16,0.97), rgba(16,12,24,0.97))",
        border: "1px solid rgba(201,168,76,0.35)",
        boxShadow: "0 0 32px rgba(201,168,76,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{
          background: "linear-gradient(90deg, rgba(201,168,76,0.14), rgba(201,168,76,0.04), transparent)",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
        }}
      >
        <Zap className="w-4 h-4 shrink-0" style={{ color: "#c9a84c" }} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold tracking-wide" style={{ color: "#c9a84c" }}>
            {label ? `${label} — ` : ""}Production Cost
          </span>
          <span className="ml-2 text-xs text-white/40 font-normal hidden sm:inline">
            Charged at build time · Storyboard is free
          </span>
        </div>
        {loading ? (
          <span className="text-sm text-white/40 animate-pulse">Calculating…</span>
        ) : (
          <span className="text-xl font-black tabular-nums" style={{ color: "#c9a84c" }}>
            {credits} <span className="text-sm font-semibold">cr</span>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">

        {/* Value proposition */}
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/80/60" />
          <p className="text-xs leading-relaxed text-white/55">
            <span className="text-white/80 font-medium">Longer video. More scenes. More AI compute.</span>{" "}
            Your credits reflect the quality you're getting — WIZ AI delivers every frame.
          </p>
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg"
            style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.1)" }}>
            <span className="text-white/60">{breakdown}</span>
            <span className="text-white font-bold tabular-nums">{credits} cr</span>
          </div>
        )}

        {/* Render time + quality guarantee badges */}
        {(renderEstimate || showQualityGuarantee) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {renderEstimate && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Clock className="w-3.5 h-3.5 shrink-0 text-blue-400/70" />
                <div>
                  <div className="text-xs font-semibold text-white/80">{renderEstimate}</div>
                  <div className="text-[10px] text-white/40">Estimated render time</div>
                </div>
              </div>
            )}
            {showQualityGuarantee && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0 text-green-400/80" />
                  <div>
                    <div className="text-xs font-semibold text-green-400/90">1 free re-render</div>
                    <div className="text-[10px] text-white/40">Per scene, before download</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <Eye className="w-3.5 h-3.5 shrink-0 text-indigo-400/80" />
                  <div>
                    <div className="text-xs font-semibold text-indigo-400/90">Preview first</div>
                    <div className="text-[10px] text-white/40">Confirm before download</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Quality guarantee reassurance text */}
        {showQualityGuarantee && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)" }}>
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-400/70" />
            <p className="text-xs text-white/50 leading-relaxed">
              <span className="text-green-400/80 font-medium">Quality Guarantee included.</span>{" "}
              Watch your full video before confirming. Re-direct any scene for free before you download.
              Once you download, your video is confirmed.
            </p>
          </div>
        )}

        {/* Slot for tier selector or other interactive content */}
        {children}

        {/* Footer */}
        <div className="pt-2 border-t border-[rgba(201,168,76,0.1)] flex items-center justify-between gap-2">
          <span className="text-xs text-white/35">
            {note || "Storyboard is free · credits deducted when you hit Build"}
          </span>
          <Link
            href="/credits/guide"
            className="text-xs underline underline-offset-2 shrink-0 whitespace-nowrap transition-colors hover:text-primary/80"
            style={{ color: "rgba(201,168,76,0.6)" }}
          >
            Pricing guide ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
