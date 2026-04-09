/**
 * CreditBalance — reusable component showing the user's remaining credit balance.
 *
 * Usage variants:
 *   <CreditBalance />                  — compact pill badge (for navbars / headers)
 *   <CreditBalance variant="card" />   — full card with cost breakdown (for sidebars)
 *   <CreditBalance variant="inline" /> — inline text with icon (for form sections)
 */
import { Zap, AlertCircle, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
  /** Display variant */
  variant?: "badge" | "card" | "inline";
  /** Cost of the current operation (optional — shows affordability check) */
  cost?: number;
  /** Extra CSS classes */
  className?: string;
  /** Refresh interval in ms — defaults to 30 s */
  refetchInterval?: number;
}

export default function CreditBalance({
  variant = "badge",
  cost,
  className,
  refetchInterval = 30_000,
}: CreditBalanceProps) {
  const { data, isLoading } = trpc.billing.getCredits.useQuery(undefined, {
    refetchInterval,
  });

  const balance = data?.balance ?? 0;
  const canAfford = cost === undefined || balance >= cost;
  const isLow = balance < 100;
  const isEmpty = balance === 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-full bg-zinc-800 h-7 w-24",
          variant === "card" && "h-16 rounded-xl",
          className
        )}
      />
    );
  }

  /* ── Badge variant ──────────────────────────────────────────────────── */
  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
          isEmpty
            ? "bg-red-950/60 border-red-800/50 text-red-300"
            : isLow
            ? "bg-amber-950/60 border-amber-700/50 text-amber-300"
            : "bg-zinc-900 border-zinc-700 text-zinc-200",
          className
        )}
      >
        <Zap
          className={cn(
            "w-3.5 h-3.5",
            isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-violet-400"
          )}
        />
        <span>{balance.toLocaleString()} credits</span>
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
        {balance.toLocaleString()} credits remaining
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
          ? "bg-amber-950/30 border-amber-700/40"
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
                ? "bg-amber-900/50"
                : "bg-violet-900/50"
            )}
          >
            <Zap
              className={cn(
                "w-3.5 h-3.5",
                isEmpty
                  ? "text-red-400"
                  : isLow
                  ? "text-amber-400"
                  : "text-violet-400"
              )}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Your Credits
          </span>
        </div>
        <a
          href="/subscribe"
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium flex items-center gap-1"
        >
          <ShoppingCart className="w-3 h-3" />
          Top up
        </a>
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
        <div className="text-xs text-zinc-500 mt-0.5">credits available</div>
      </div>

      {/* Cost affordability check */}
      {cost !== undefined && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            canAfford
              ? "bg-green-950/40 border border-green-800/30 text-green-300"
              : "bg-red-950/40 border border-red-800/30 text-red-300"
          )}
        >
          {canAfford ? (
            <>
              <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-400" />
              <span>
                This video costs <strong>{cost.toLocaleString()} credits</strong>.
                You&apos;ll have{" "}
                <strong>{(balance - cost).toLocaleString()}</strong> remaining.
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-400" />
              <span>
                Not enough credits. Need{" "}
                <strong>{cost.toLocaleString()}</strong>, have{" "}
                <strong>{balance.toLocaleString()}</strong>.{" "}
                <a
                  href="/subscribe"
                  className="underline hover:text-red-200 transition-colors"
                >
                  Top up now →
                </a>
              </span>
            </>
          )}
        </div>
      )}

      {/* Low balance warning (no cost specified) */}
      {cost === undefined && (isEmpty || isLow) && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-amber-950/40 border border-amber-700/30 text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {isEmpty ? "No credits left." : "Credits running low."}{" "}
            <a
              href="/subscribe"
              className="underline hover:text-amber-200 transition-colors"
            >
              Top up →
            </a>
          </span>
        </div>
      )}
    </div>
  );
}
