/**
 * CreditCostBanner — shown prominently at the top of every product tool
 * so users know exactly what they will spend BEFORE investing time in the workflow.
 *
 * Usage:
 *   <CreditCostBanner credits={90} label="Music Video" breakdown="22 scenes × 15 cr/scene" note="Storyboard is free · credits charged at build time" />
 */

import { Zap } from "lucide-react";
import { Link } from "wouter";

interface CreditCostBannerProps {
  /** Total credits that will be charged */
  credits: number;
  /** Tool name, e.g. "Music Video" */
  label?: string;
  /** Optional breakdown line, e.g. "22 scenes × 15 cr/scene" */
  breakdown?: string;
  /** Optional footnote, e.g. "Storyboard is free · credits charged at build time" */
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
        background: "linear-gradient(135deg, rgba(12,9,18,0.95), rgba(18,14,26,0.95))",
        border: "1px solid rgba(201,168,76,0.3)",
        boxShadow: "0 0 24px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{
          background: "linear-gradient(90deg, rgba(201,168,76,0.1), transparent)",
          borderBottom: "1px solid rgba(201,168,76,0.12)",
        }}
      >
        <Zap className="w-4 h-4 shrink-0" style={{ color: "#c9a84c" }} />
        <span className="text-sm font-bold tracking-wide" style={{ color: "#c9a84c" }}>
          {label ? `${label} · ` : ""}Build Credits Required
        </span>
        <div className="flex-1" />
        {loading ? (
          <span className="text-sm text-white/40 animate-pulse">Calculating…</span>
        ) : (
          <span className="text-lg font-black" style={{ color: "#c9a84c" }}>
            {credits} credits
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {breakdown && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">{breakdown}</span>
            <span className="text-white font-semibold">{credits} credits</span>
          </div>
        )}

        {/* Slot for tier selector or other interactive content */}
        {children}

        {/* Footer note + pricing guide link */}
        <div className="pt-2 border-t border-[rgba(201,168,76,0.12)] flex items-center justify-between gap-2">
          {note && <span className="text-xs text-white/40">{note}</span>}
          <Link href="/credits/guide" className="text-xs underline underline-offset-2 shrink-0 ml-auto" style={{ color: "rgba(201,168,76,0.7)" }}>How credits work ↗</Link>
        </div>
      </div>
    </div>
  );
}
