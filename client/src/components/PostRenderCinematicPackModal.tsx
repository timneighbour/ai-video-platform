/**
 * PostRenderCinematicPackModal
 *
 * Shown immediately after a video render completes.
 * Offers the Cinematic Pack (4K + WizSound Cinematic + Priority) at £7,
 * with a limited-time "Today only: £5" discount to drive urgency.
 *
 * Accessibility:
 *  - role="dialog" aria-modal="true" aria-labelledby / aria-describedby
 *  - Focus is trapped inside the modal while open
 *  - Escape key closes (Skip path)
 *  - All interactive elements are keyboard-reachable
 *
 * Analytics events:
 *  - CinematicPack_Offered   — fired once when modal mounts
 *  - CinematicPack_Purchased — fired when user clicks "Upgrade Now"
 *  - CinematicPack_Skipped   — fired when user clicks Skip
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Download,
  Star,
  Zap,
  Check,
  X,
  Clock,
  Sparkles,
  Info,
} from "@/lib/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Analytics helper ──────────────────────────────────────────────────────────

function trackEvent(name: string, props?: Record<string, unknown>) {
  try {
    mp.track(name, props);
    if (import.meta.env.DEV) console.info("[Analytics]", name, props);
  } catch {
    // Never let analytics break the UI
  }
}

// ── Focus trap helper ─────────────────────────────────────────────────────────

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.key === "Tab") {
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FULL_PRICE = 7;
const DISCOUNT_PRICE = 5;
const DISCOUNT_DURATION_SECONDS = 10 * 60; // 10 minutes

interface Props {
  open: boolean;
  onClose: () => void;
  /** The job ID for the completed render */
  jobId: number;
  jobType?: "music_video" | "text_to_video" | "kids_video" | "wizpilot";
  /** URL of the standard-quality video that just rendered */
  finalVideoUrl: string;
  /** Called when the user skips — pass the finalVideoUrl so the parent can trigger download */
  onSkip: (finalVideoUrl: string) => void;
}

export default function PostRenderCinematicPackModal({
  open,
  onClose,
  jobId,
  jobType = "music_video",
  finalVideoUrl,
  onSkip,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const offeredFiredRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DISCOUNT_DURATION_SECONDS);
  const discountActive = secondsLeft > 0;
  const effectivePrice = discountActive ? DISCOUNT_PRICE : FULL_PRICE;

  const createRenderCheckout = trpc.render.createRenderCheckout.useMutation();

  // Fire CinematicPack_Offered once per open
  useEffect(() => {
    if (open && !offeredFiredRef.current) {
      offeredFiredRef.current = true;
      mp.cinematicPackOffered("post_render");
      trackEvent("CinematicPack_Offered", { jobId, jobType, discountActive: true });
    }
    if (!open) offeredFiredRef.current = false;
  }, [open, jobId, jobType]);

  // Countdown timer
  useEffect(() => {
    if (!open) return;
    setSecondsLeft(DISCOUNT_DURATION_SECONDS);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  // Focus trap + Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        handleSkip();
        return;
      }
      if (dialogRef.current) trapFocus(dialogRef.current, e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Move focus into modal
      setTimeout(() => closeButtonRef.current?.focus(), 50);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  function handleSkip() {
    mp.cinematicPackSkipped("post_render");
    trackEvent("CinematicPack_Skipped", { jobId, jobType });
    onSkip(finalVideoUrl);
    onClose();
  }

  async function handleUpgrade() {
    mp.cinematicPackPurchased(effectivePrice, "post_render");
    trackEvent("CinematicPack_Purchased", {
      jobId,
      jobType,
      price: effectivePrice,
      discountApplied: discountActive,
    });
    setIsLoading(true);
    try {
      const result = await createRenderCheckout.mutateAsync({
        jobId,
        jobType,
        quality: "4k",
        audioTier: "cinematic",
        origin: window.location.origin,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      toast.error("Something went wrong", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
      aria-hidden="false"
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prcpm-title"
        aria-describedby="prcpm-desc"
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #0d0015 0%, #0a0020 40%, #0d0015 100%)",
          border: "1.5px solid rgba(217,70,239,0.4)",
          boxShadow: "0 0 60px rgba(217,70,239,0.25), 0 0 120px rgba(139,92,246,0.15)",
        }}
      >
        {/* Film grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Ambient glow rings */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[--color-gold]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[--color-gold]/15 blur-3xl pointer-events-none" />

        {/* Close (Skip) button — top right */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
          aria-label="Skip — download standard video"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-7 pb-5 text-center relative">
          {/* Celebration icon */}
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-[--color-gold]/15 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>

          <h2
            id="prcpm-title"
            className="text-2xl font-extrabold text-white tracking-tight mb-1"
          >
            Your video is ready!
          </h2>
          <p
            id="prcpm-desc"
            className="text-sm text-white/55"
          >
            Want to upgrade to cinematic quality before you download?
          </p>
        </div>

        {/* Cinematic Pack card */}
        <div className="px-6 pb-2">
          <div
            className="relative rounded-2xl p-5 border-2 border-[--color-gold]/60"
            style={{
              background: "linear-gradient(135deg, rgba(217,70,239,0.12) 0%, rgba(139,92,246,0.08) 100%)",
              boxShadow: "0 0 30px rgba(217,70,239,0.2) inset",
            }}
          >
            {/* Best Value badge */}
            <div className="absolute -top-3 left-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] text-white text-[10px] font-bold tracking-wider shadow-lg">
                <Star className="w-2.5 h-2.5 fill-white" />
                BEST VALUE
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 mt-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-bold text-white">Cinematic Pack</span>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[--color-gold]/60 hover:text-[--color-gold] cursor-help"
                        aria-label="What's included in the Cinematic Pack?"
                      >
                        <Info className="w-3 h-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[240px] text-xs leading-relaxed bg-[#0a0800] border border-[--color-gold]/30 text-white/85 shadow-xl"
                    >
                      The Cinematic Pack bundles 4K video rendering with our full WizSound™ Cinematic mastering pipeline and priority queue placement — all at a single price. Individually these would cost £9 (£6 + £3).
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-[--color-gold]/70 mb-3">
                  4K resolution · WizSound Cinematic audio · Priority rendering
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    "4K / 2160p video output",
                    "WizSound Cinematic mastering",
                    "Immersive spatial depth",
                    "Priority rendering queue",
                    "Streaming loudness (−14 LUFS)",
                    "Save £2 vs individual",
                  ].map((f) => (
                    <span key={f} className="text-[10px] text-white/45 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 text-[--color-gold]/80 flex-shrink-0" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price block */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {discountActive ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-white">£{DISCOUNT_PRICE}</span>
                    </div>
                    <span className="text-xs text-white/35 line-through">£{FULL_PRICE}</span>
                    <span className="text-[10px] text-[--color-silver] font-semibold">Today only</span>
                  </>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">£{FULL_PRICE}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Urgency countdown */}
        {discountActive && (
          <div className="mx-6 mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[--color-gold]/15 border border-[--color-gold]/30">
            <Clock className="w-3.5 h-3.5 text-[--color-gold] flex-shrink-0" />
            <p className="text-xs text-[--color-gold] font-medium">
              Today-only discount expires in{" "}
              <span className="font-bold tabular-nums">{formatTime(secondsLeft)}</span>
            </p>
            <Zap className="w-3 h-3 text-[--color-gold] flex-shrink-0" />
          </div>
        )}

        {/* CTAs */}
        <div className="px-6 pt-4 pb-6 space-y-3">
          {/* Upgrade Now */}
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: isLoading
                ? "rgba(217,70,239,0.3)"
                : "linear-gradient(135deg, #d946ef 0%, #7c3aed 100%)",
              boxShadow: isLoading ? "none" : "0 0 30px rgba(217,70,239,0.4)",
            }}
            aria-label={`Upgrade to Cinematic Pack for £${effectivePrice}`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Star className="w-4 h-4 fill-white" />
                Upgrade Now — £{effectivePrice}
                {discountActive && (
                  <span className="ml-1 text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full">
                    Save £{FULL_PRICE - DISCOUNT_PRICE}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Skip — Download Standard */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
            aria-label="Skip upgrade and download standard video"
          >
            <Download className="w-4 h-4" />
            Skip – Download Standard Video
          </button>
        </div>

        {/* Trust line */}
        <div className="px-6 pb-5 flex items-center justify-center gap-5 text-[10px] text-white/25">
          <span className="flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-[--color-silver]/60" />
            Secure payment
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-[--color-silver]/60" />
            No hidden fees
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-2.5 h-2.5 text-[--color-silver]/60" />
            Instant processing
          </span>
        </div>
      </div>
    </div>
  );
}
