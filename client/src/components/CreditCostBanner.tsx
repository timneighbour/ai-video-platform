/**
 * CreditCostBanner — shown prominently at the top of every product tool
 * so users know exactly what they will spend BEFORE investing time in the workflow.
 *
 * Tone: premium, confident, "you get what you pay for — WIZ AI delivers"
 *
 * Usage:
 *   <CreditCostBanner credits={390} label="Music Video" breakdown="26 scenes × 15 cr/scene" />
 */

import { Zap, Sparkles } from "lucide-react";
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
}

export function CreditCostBanner({
  credits,
  label,
  breakdown,
  note,
  children,
  loading = false,
}: CreditCostBannerProps) {
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
          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#c9a84c]/60" />
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

        {/* Slot for tier selector or other interactive content */}
        {children}

        {/* Footer */}
        <div className="pt-2 border-t border-[rgba(201,168,76,0.1)] flex items-center justify-between gap-2">
          <span className="text-xs text-white/35">
            {note || "Storyboard is free · credits deducted when you hit Build"}
          </span>
          <Link
            href="/credits/guide"
            className="text-xs underline underline-offset-2 shrink-0 whitespace-nowrap transition-colors hover:text-[#c9a84c]"
            style={{ color: "rgba(201,168,76,0.6)" }}
          >
            Pricing guide ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
