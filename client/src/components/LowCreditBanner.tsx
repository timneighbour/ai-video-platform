import { Link } from "wouter";
import { AlertTriangle, Zap, ArrowRight, X } from "@/lib/icons";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { QuickTopUpModal } from "./QuickTopUpModal";

interface LowCreditBannerProps {
  /** Current credit balance */
  balance: number;
  /** Estimated cost of the next video (optional — shows cost breakdown if provided) */
  estimatedCost?: number;
  /** Where to show the banner — affects sizing and layout */
  variant?: "inline" | "sidebar" | "compact";
  /** Allow the user to dismiss the banner */
  dismissible?: boolean;
  className?: string;
}

/**
 * LowCreditBanner — appears when a user's credit balance is low or
 * insufficient for their next video generation.
 *
 * Severity levels:
 *  - "insufficient": balance < estimatedCost (or balance === 0)
 *  - "low":          balance > 0 and balance < LOW_CREDIT_THRESHOLD (20)
 *
 * CTA opens QuickTopUpModal inline — no page navigation required.
 */

const LOW_CREDIT_THRESHOLD = 20;

function getSeverity(balance: number, estimatedCost?: number): "insufficient" | "low" | null {
  if (balance === 0) return "insufficient";
  if (estimatedCost !== undefined && balance < estimatedCost) return "insufficient";
  if (balance < LOW_CREDIT_THRESHOLD) return "low";
  return null;
}

export function LowCreditBanner({
  balance,
  estimatedCost,
  variant = "inline",
  dismissible = false,
  className,
}: LowCreditBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const severity = getSeverity(balance, estimatedCost);

  if (!severity || dismissed) return null;

  const isInsufficient = severity === "insufficient";
  const shortfall = estimatedCost !== undefined ? Math.max(0, estimatedCost - balance) : 0;

  /* ── Colour tokens ── */
  const colours = isInsufficient
    ? {
        border: "border-red-500/30",
        bg: "bg-red-950/40",
        icon: "text-red-400",
        iconBg: "bg-red-500/15",
        title: "text-red-300",
        body: "text-red-200/70",
        badge: "bg-red-500/20 text-red-300 border-red-500/30",
        btn: "bg-red-500 hover:bg-red-400 text-white",
        btnSecondary: "text-red-300 hover:text-red-200",
      }
    : {
        border: "border-[--color-gold]/30",
        bg: "bg-[--color-gold]/15",
        icon: "text-[--color-gold]",
        iconBg: "bg-[--color-gold]/15",
        title: "text-[--color-gold]",
        body: "text-[--color-gold]/70",
        badge: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
        btn: "bg-[--color-gold] hover:bg-[--color-gold]/80 text-black font-semibold",
        btnSecondary: "text-[--color-gold] hover:text-[--color-gold]",
      };

  /* ── Compact variant (tight spaces) ── */
  if (variant === "compact") {
    return (
      <>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
            colours.bg,
            colours.border,
            className
          )}
        >
          <Zap className={cn("w-3.5 h-3.5 flex-shrink-0", colours.icon)} />
          <span className={cn("flex-1 leading-snug", colours.body)}>
            {isInsufficient ? "Not enough credits for next video." : `Only ${balance} Credits left.`}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex-shrink-0 text-xs font-semibold underline underline-offset-2",
              colours.btnSecondary
            )}
          >
            Top up
          </button>
        </div>
        <QuickTopUpModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentBalance={balance}
          estimatedCost={estimatedCost}
        />
      </>
    );
  }

  /* ── Sidebar variant ── */
  if (variant === "sidebar") {
    return (
      <>
        <div
          className={cn(
            "rounded-xl border p-3 space-y-2",
            colours.bg,
            colours.border,
            className
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", colours.iconBg)}>
              <AlertTriangle className={cn("w-3.5 h-3.5", colours.icon)} />
            </div>
            <p className={cn("text-xs font-semibold", colours.title)}>
              {isInsufficient ? "Insufficient credits" : "Running low on credits"}
            </p>
          </div>
          <p className={cn("text-xs leading-snug", colours.body)}>
            {isInsufficient
              ? shortfall > 0
                ? `You need ${shortfall} more Credits to generate your next video.`
                : "You don't have enough Credits to generate a video."
              : `You have ${balance} Credits left. Top up to keep creating without interruption.`}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold",
              colours.btnSecondary
            )}
          >
            Get more Credits <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <QuickTopUpModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentBalance={balance}
          estimatedCost={estimatedCost}
        />
      </>
    );
  }

  /* ── Inline variant (default — full-width banner in creation flow) ── */
  return (
    <>
      <div
        className={cn(
          "relative flex items-start gap-3 rounded-xl border px-4 py-3.5",
          colours.bg,
          colours.border,
          className
        )}
        role="alert"
      >
        {/* Icon */}
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", colours.iconBg)}>
          {isInsufficient ? (
            <AlertTriangle className={cn("w-4 h-4", colours.icon)} />
          ) : (
            <Zap className={cn("w-4 h-4", colours.icon)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className={cn("text-sm font-semibold", colours.title)}>
              {isInsufficient ? "Not enough credits for this video" : "You're running low on credits"}
            </p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", colours.badge)}>
              {balance} Credits remaining
            </span>
          </div>

          <p className={cn("text-sm leading-snug", colours.body)}>
            {isInsufficient
              ? estimatedCost !== undefined
                ? `This video costs ${estimatedCost} Credits — you need ${shortfall} more to proceed. Top up to keep creating.`
                : "You don't have enough Credits to generate this video. Top up to continue."
              : `You have ${balance} Credits left. Top up now to avoid interruptions during generation.`}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <button
              onClick={() => setModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                colours.btn
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              {isInsufficient ? "Get Credits to continue" : "Top up credits"}
            </button>
            {!isInsufficient && (
              <Link
                href="/pricing"
                className={cn("text-xs font-medium", colours.btnSecondary)}
              >
                Upgrade plan →
              </Link>
            )}
          </div>
        </div>

        {/* Dismiss */}
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className={cn("flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5", colours.icon)}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick top-up modal — opens inline without page navigation */}
      <QuickTopUpModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentBalance={balance}
        estimatedCost={estimatedCost}
      />
    </>
  );
}
