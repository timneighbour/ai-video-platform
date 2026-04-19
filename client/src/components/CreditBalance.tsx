/**
 * CreditBalance — reusable component showing the user's remaining credit balance.
 *
 * Usage variants:
 *   <CreditBalance />                  — compact pill badge with Buy Credits button (for navbars)
 *   <CreditBalance variant="card" />   — full card with cost breakdown (for sidebars)
 *   <CreditBalance variant="inline" /> — inline text with icon (for form sections)
 *
 * Language rules (per design spec):
 *   – Use: Credits, Video creation, Cinematic upgrades
 *   ❌ Never: tokens, cost, API, compute
 */
import { Zap, AlertCircle, Plus } from "@/lib/icons";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

/** Low credit warning threshold — matches server/products.ts LOW_CREDIT_THRESHOLD */
const LOW_CREDIT_THRESHOLD = 20;

interface CreditBalanceProps {
  /** Display variant */
  variant?: "badge" | "card" | "inline";
  /** Cost of the current operation in credits (optional — shows affordability check) */
  cost?: number;
  /** Extra CSS classes */
  className?: string;
  /** Refresh interval in ms — defaults to 30 s */
  refetchInterval?: number;
  /** Called when user clicks "Buy Credits" — if not provided, navigates to /credits */
  onBuyCredits?: () => void;
}

/** Reliable navigation button for credits page — uses window.location.href for guaranteed navigation */
function GoToCredits({ isEmpty, label }: { isEmpty: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => { window.location.href = "/credits"; }}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
        isEmpty
          ? "bg-red-600 border-red-500 text-white hover:bg-red-500"
          : "bg-[--color-gold]/20 border-violet-500/40 text-violet-300 hover:bg-[--color-gold]/20/30 hover:border-[--color-gold]/40"
      )}
    >
      <Plus className="w-3 h-3" />
      {label ?? (isEmpty ? "Get More Credits" : "Buy Credits")}
    </button>
  );
}

export default function CreditBalance({
  variant = "badge",
  cost,
  className,
  refetchInterval = 30_000,
  onBuyCredits,
}: CreditBalanceProps) {
  const { data, isLoading } = trpc.billing.getCredits.useQuery(undefined, {
    refetchInterval,
  });

  const balance = data?.balance ?? 0;
  const canAfford = cost === undefined || balance >= cost;
  const isLow = balance > 0 && balance < LOW_CREDIT_THRESHOLD;
  const isEmpty = balance === 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-full bg-zinc-800 h-7 w-28",
          variant === "card" && "h-20 rounded-xl w-full",
          className
        )}
      />
    );
  }

  /* ── Badge variant (nav top bar) ────────────────────────────────────── */
  if (variant === "badge") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Credit balance pill */}
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
            isEmpty
              ? "bg-red-950/60 border-red-800/50 text-red-300"
              : isLow
              ? "bg-[--color-gold]/60 border-amber-700/50 text-amber-300"
              : "bg-zinc-900 border-zinc-700 text-zinc-200"
          )}
        >
          <Zap
            className={cn(
              "w-3.5 h-3.5",
              isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-violet-400"
            )}
          />
          <span>{balance.toLocaleString()} Credits</span>
          {isLow && !isEmpty && (
            <span className="text-amber-400 font-bold ml-0.5">(Low)</span>
          )}
        </div>

        {/* Buy Credits button */}
        {onBuyCredits ? (
          <button
            onClick={onBuyCredits}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              isEmpty
                ? "bg-red-600 border-red-500 text-white hover:bg-red-500"
                : "bg-[--color-gold]/20 border-violet-500/40 text-violet-300 hover:bg-[--color-gold]/20/30 hover:border-[--color-gold]/40"
            )}
          >
            <Plus className="w-3 h-3" />
            {isEmpty ? "Get More Credits" : "Buy Credits"}
          </button>
        ) : (
          <GoToCredits isEmpty={isEmpty} />
        )}
      </div>
    );
  }

  /* ── Inline variant ─────────────────────────────────────────────────── */
  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium",
          isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-zinc-300",
          className
        )}
      >
        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
        {balance.toLocaleString()} Credits remaining
      </span>
    );
  }

  /* ── Card variant ───────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isEmpty
          ? "bg-red-950/30 border-red-800/40"
          : isLow
          ? "bg-[--color-gold]/30 border-amber-700/40"
          : "bg-zinc-900/80 border-zinc-700/60",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isEmpty
                ? "bg-red-900/50"
                : isLow
                ? "bg-[--color-gold]/50"
                : "bg-[--color-gold]/50"
            )}
          >
            <Zap
              className={cn(
                "w-3.5 h-3.5",
                isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-violet-400"
              )}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Your Credits
          </span>
        </div>
        <Link href="/credits">
          <span className="text-xs text-[--color-gold]/70 hover:text-[--color-gold] transition-colors font-medium flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" />
            Buy Credits
          </span>
        </Link>
      </div>

      {/* Balance */}
      <div>
        <div
          className={cn(
            "text-2xl font-bold tabular-nums",
            isEmpty ? "text-red-300" : isLow ? "text-amber-300" : "text-white"
          )}
        >
          {balance.toLocaleString()}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">Credits available</div>
      </div>

      {/* Microcopy */}
      <p className="text-xs text-zinc-600">
        Credits are only used when you create or upgrade videos
      </p>

      {/* Cost affordability check */}
      {cost !== undefined && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            canAfford
              ? "bg-[--color-silver]/10 border border-[--color-silver]/20 text-[--color-silver]"
              : "bg-red-950/40 border border-red-800/30 text-red-300"
          )}
        >
          {canAfford ? (
            <>
              <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[--color-silver]" />
              <span>
                This video uses <strong>{cost.toLocaleString()} Credits</strong>.
                You&apos;ll have{" "}
                <strong>{(balance - cost).toLocaleString()}</strong> remaining.
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-400" />
              <span>
                You need <strong>{cost.toLocaleString()} Credits</strong> to create this video.
                You have <strong>{balance.toLocaleString()}</strong>.{" "}
                <Link href="/credits">
                  <span className="underline hover:text-red-200 transition-colors cursor-pointer">
                    Get more Credits →
                  </span>
                </Link>
              </span>
            </>
          )}
        </div>
      )}

      {/* Low balance warning (no cost specified) */}
      {cost === undefined && (isEmpty || isLow) && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-[--color-gold]/40 border border-amber-700/30 text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {isEmpty
              ? "You're out of Credits."
              : "You're running low on Credits — top up to keep creating."}{" "}
            <Link href="/credits">
              <span className="underline hover:text-[--color-gold] transition-colors cursor-pointer">
                Buy Credits →
              </span>
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
