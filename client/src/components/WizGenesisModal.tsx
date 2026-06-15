/**
 * WizGenesis™ — Premium pre-build upgrade experience.
 *
 * Shown when a user is about to build their video.
 * Presents Cinematic Mode (WizSound™ + WizLumina™), quality selection,
 * live price, and a strong CTA to make the user feel ownership of their video.
 */
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { mp } from "@/lib/mixpanel";
import {
  Sparkles, Film, Zap, Crown, Check, Download,
  Volume2, Star, Shield, RefreshCw, ChevronRight
} from "@/lib/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";

const WIZGENESIS_LOGO = "/manus-storage/wizgenesis-logo-new_9814b3d1_cabaf933.png";

type Quality = "standard" | "hd" | "4k";
type EnhanceTier = "standard" | "enhance" | "cinematic";
type JobType = "music_video" | "text_to_video" | "kids_video" | "wizpilot";

interface WizGenesisModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobType?: JobType;
  videoTitle?: string;
  previewImageUrl?: string;
  /** Number of scenes in the storyboard — used for the credit cost summary */
  sceneCount?: number;
  /** Total Build Credits required for this render — shown in the cost summary */
  creditCost?: number;
  /** Called after billing is confirmed — triggers the actual scene render pipeline */
  onRenderConfirmed?: () => void;
}

const QUALITY_OPTIONS: Array<{
  id: Quality;
  label: string;
  resolution: string;
  price: number;
  badge?: string;
  description: string;
}> = [
  { id: "standard", label: "Standard", resolution: "720p", price: 3, description: "Great for social media" },
  { id: "hd", label: "HD", resolution: "1080p", price: 6, badge: "MOST POPULAR", description: "Perfect for YouTube & streaming" },
  { id: "4k", label: "4K Ultra", resolution: "2160p", price: 10, badge: "BEST QUALITY", description: "Cinema-grade quality" },
];

const ENHANCE_TIERS: Array<{
  id: EnhanceTier;
  label: string;
  audioPrice: number;
  visualPrice: number;
  audioLabel: string;
  visualLabel: string;
  audioFeatures: string[];
  visualFeatures: string[];
  badge?: string;
  highlight?: boolean;
}> = [
  {
    id: "standard",
    label: "Standard",
    audioPrice: 0,
    visualPrice: 0,
    audioLabel: "Original audio",
    visualLabel: "Original visuals",
    audioFeatures: ["Original mix", "Stereo output"],
    visualFeatures: ["Original AI output", "Standard colour"],
  },
  {
    id: "enhance",
    label: "Enhance",
    audioPrice: 2,
    visualPrice: 2,
    audioLabel: "WizSound™ Enhance",
    visualLabel: "WizLumina™ Enhance",
    audioFeatures: ["Stereo widening", "Frequency EQ", "Noise reduction"],
    visualFeatures: ["Improved brightness & contrast", "Sharper image", "Vibrant colours"],
    badge: "POPULAR",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    audioPrice: 5,
    visualPrice: 5,
    audioLabel: "WizSound™ Cinematic",
    visualLabel: "WizLumina™ Cinematic",
    audioFeatures: ["Full mastering pipeline", "Immersive spatial depth", "Streaming loudness (−14 LUFS)"],
    visualFeatures: ["Advanced colour grading", "HDR tone mapping", "Film-level finish"],
    badge: "★ RECOMMENDED",
    highlight: true,
  },
];

const CINEMATIC_BUNDLE_PRICE = 8; // WizSound Cinematic + WizLumina Cinematic bundled (save £2 vs £10 individual)

function trackEvent(name: string, props?: Record<string, unknown>) {
  try { mp.track(name, props); } catch { /* never break UI */ }
}

export function WizGenesisModal({
  open,
  onClose,
  jobId,
  jobType = "music_video",
  videoTitle,
  previewImageUrl,
  sceneCount,
  creditCost,
  onRenderConfirmed,
}: WizGenesisModalProps) {
  const [quality, setQuality] = useState<Quality>("hd");
  const [enhanceTier, setEnhanceTier] = useState<EnhanceTier>("cinematic");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const offeredRef = useRef(false);

  // Reset confirmation checkbox whenever the modal opens
  useEffect(() => { if (open) setConfirmed(false); }, [open]);

  const renderStatus = trpc.render.getRenderStatus.useQuery(undefined, { enabled: open, staleTime: 30_000 });
  const creditsQuery = trpc.billing.getCredits.useQuery(undefined, { enabled: open, staleTime: 30_000 });
  const currentBalance = creditsQuery.data?.balance ?? null;
  const createRenderCheckout = trpc.render.createRenderCheckout.useMutation();
  const useFreeRender = trpc.render.useFreeRender.useMutation();

  const hasFreeRenders = (renderStatus.data?.total ?? 0) > 0;
  const isAdmin = renderStatus.data?.isAdmin ?? false;

  // Fire analytics once per open
  useEffect(() => {
    if (open && !offeredRef.current) {
      offeredRef.current = true;
      trackEvent("WizGenesis_Opened", { jobId, jobType });
    }
    if (!open) offeredRef.current = false;
  }, [open, jobId, jobType]);

  // Auto-sync: if user picks Cinematic tier, both audio and visual are cinematic
  const selectedTier = ENHANCE_TIERS.find((t) => t.id === enhanceTier)!;
  const selectedQuality = QUALITY_OPTIONS.find((q) => q.id === quality)!;

  // Price calculation
  const isCinematicBundle = enhanceTier === "cinematic";
  const enhanceAddOn = isCinematicBundle
    ? CINEMATIC_BUNDLE_PRICE // bundle discount
    : (selectedTier.audioPrice + selectedTier.visualPrice);
  const totalPrice = selectedQuality.price + enhanceAddOn;

  const isCinematicMode = enhanceTier === "cinematic";
  const ctaLabel = isCinematicMode ? "Build My Cinematic Video" : "Build My Video";

  async function handleRender() {
    trackEvent("WizGenesis_RenderClicked", { jobId, jobType, quality, enhanceTier, totalPrice });
    setIsLoading(true);
    try {
      const audioTier = enhanceTier === "enhance" ? "enhanced" : enhanceTier;
      const visualTier = enhanceTier;

      if (hasFreeRenders || isAdmin) {
        const result = await useFreeRender.mutateAsync({
          jobId,
          jobType,
          quality,
          audioTier: audioTier as "standard" | "enhanced" | "cinematic",
        });
        if (result.used) {
          toast.success("Build started!", { description: `Your ${selectedQuality.label} build is processing.` });
          onClose();
          // CRITICAL: trigger the actual scene render pipeline
          onRenderConfirmed?.();
          return;
        }
      }

      const result = await createRenderCheckout.mutateAsync({
        jobId,
        jobType,
        quality,
        audioTier: audioTier as "standard" | "enhanced" | "cinematic",
        origin: window.location.origin,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      toast.error("Something went wrong", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-background border border-white/10 text-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-primary/60 via-purple-950/30 to-black px-6 pt-6 pb-5 border-b border-white/8">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
          />

          {/* Video preview */}
          {previewImageUrl && (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 h-32 bg-black">
              <img src={previewImageUrl} alt="Video preview" className="w-full h-full object-cover blur-sm scale-105 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-semibold text-sm truncate">{videoTitle || "Your video"}</p>
                <p className="text-white/60 text-xs">Your video is ready</p>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--color-silver]/10 border border-rose-400/30 text-[--color-silver] text-xs font-mono tracking-wider uppercase">
                <img src={WIZGENESIS_LOGO} alt="WizGenesis" aria-hidden="true" className="w-4 h-4 rounded-full" />
                WizGenesis™
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Where your video comes to life</h2>
            <p className="text-sm text-white/50 mt-1">You're one step away from your finished video.</p>
          </div>

          {/* Free render badge */}
          {!renderStatus.isLoading && (hasFreeRenders || isAdmin) && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[--color-silver]/10 border border-[--color-silver]/25 text-[--color-silver] text-xs font-medium">
              <Check className="w-3.5 h-3.5" />
              {isAdmin ? "Admin — unlimited renders" : `${renderStatus.data?.total} free render${(renderStatus.data?.total ?? 0) !== 1 ? "s" : ""} available`}
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Cinematic Mode (Primary) ───────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Enhancement Mode</h3>
              {isCinematicBundle && (
                <span className="text-[10px] text-[--color-silver] font-medium">Save £2 with bundle</span>
              )}
            </div>

            <div className="space-y-2">
              {ENHANCE_TIERS.map((tier) => {
                const isSelected = enhanceTier === tier.id;
                const tierPrice = tier.id === "cinematic" ? CINEMATIC_BUNDLE_PRICE : (tier.audioPrice + tier.visualPrice);
                return (
                  <button
                    key={tier.id}
                    onClick={() => setEnhanceTier(tier.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? tier.highlight
                          ? "border-[--color-gold]/30 bg-gradient-to-br from-primary/40 to-primary/40/20 ring-1 ring-[--color-gold]/30 shadow-lg shadow-[#b8892a]/20"
                          : "border-[--color-gold]/30 bg-[--color-gold]/15"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "border-violet-400 bg-[--color-gold]" : "border-white/25"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${isSelected ? "text-white" : "text-foreground/80"}`}>
                              {tier.label}
                            </span>
                            {tier.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                tier.highlight
                                  ? "bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30"
                                  : "bg-white/10 text-muted-foreground"
                              }`}>
                                {tier.badge}
                              </span>
                            )}
                            {tier.id === "cinematic" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30">
                                BEST EXPERIENCE
                              </span>
                            )}
                          </div>

                          {/* Audio + Visual sub-labels */}
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-[--color-silver]">♪ {tier.audioLabel}</span>
                            <span className="text-[11px] text-[--color-gold]">◆ {tier.visualLabel}</span>
                          </div>

                          {/* Microcopy for cinematic */}
                          {tier.id === "cinematic" && (
                            <p className="text-[11px] text-muted-foreground mt-1">Studio-grade audio and cinematic visuals</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {tierPrice === 0 ? (
                          <span className="text-sm font-semibold text-[--color-silver]">Free</span>
                        ) : (
                          <div>
                            <span className="text-sm font-bold text-white">+£{tierPrice}</span>
                            {tier.id === "cinematic" && (
                              <p className="text-[10px] text-muted-foreground/70 line-through">£10</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Quality Options ────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Video Quality</h3>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = quality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setQuality(opt.id)}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-[--color-gold]/30 bg-[--color-gold]/15 ring-1 ring-violet-500/25"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    {opt.badge && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                        opt.badge === "MOST POPULAR"
                          ? "bg-[--color-gold] text-white"
                          : "bg-[--color-gold] text-white"
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                    <p className={`text-xs font-semibold ${isSelected ? "text-white" : "text-foreground/80"}`}>{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{opt.resolution}</p>
                    <p className={`text-sm font-bold mt-1 ${isSelected ? "text-[--color-gold]" : "text-white"}`}>£{opt.price}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Credit Cost Summary ────────────────────────────────────── */}
          {(sceneCount !== undefined || creditCost !== undefined) && (
            <div className="rounded-xl border border-[--color-gold]/20 bg-[--color-gold]/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[--color-gold]" />
                <span className="text-sm font-semibold text-white">Build Credits Required</span>
              </div>
              <div className="space-y-2">
                {sceneCount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Scenes to render</span>
                    <span className="text-sm text-white font-medium">{sceneCount} scenes</span>
                  </div>
                )}
                {creditCost !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Credits required</span>
                    <span className="text-sm font-bold text-[--color-gold]">{creditCost} credits</span>
                  </div>
                )}
                {currentBalance !== null && creditCost !== undefined && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Your balance</span>
                      <span className={`text-sm font-semibold ${
                        currentBalance >= creditCost ? "text-emerald-400" : "text-rose-400"
                      }`}>{currentBalance} credits</span>
                    </div>
                    <div className="border-t border-white/8 pt-2 mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground/70">After render</span>
                      <span className={`text-xs font-semibold ${
                        currentBalance - creditCost >= 0 ? "text-foreground/80" : "text-rose-400"
                      }`}>
                        {currentBalance - creditCost >= 0
                          ? `${currentBalance - creditCost} credits remaining`
                          : `${Math.abs(currentBalance - creditCost)} credits short — top up needed`
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Price Summary ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Quality ({selectedQuality.label})</span>
              <span className="text-sm text-white">£{selectedQuality.price}</span>
            </div>
            {enhanceAddOn > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isCinematicBundle ? "Cinematic Mode bundle" : `${selectedTier.label} enhancement`}
                </span>
                <span className="text-sm text-white">+£{enhanceAddOn}</span>
              </div>
            )}
            {isCinematicBundle && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[--color-silver]">Bundle saving</span>
                <span className="text-xs text-[--color-silver]">−£2</span>
              </div>
            )}
            <div className="border-t border-white/8 pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-xl font-bold text-white">£{totalPrice}</span>
            </div>
          </div>

          {/* ── Trust signals ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { icon: Shield, text: "No subscription" },
              { icon: Star, text: "Pay once" },
              { icon: Download, text: "Download forever" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                {text}
              </div>
            ))}
          </div>

          {/* ── Confirmation checkbox ─────────────────────────────── */}
          <label
            className={`flex items-start gap-3 cursor-pointer select-none rounded-xl border px-4 py-3 transition-colors ${
              confirmed
                ? "border-primary/50 bg-primary/5"
                : "border-white/25 bg-white/[0.04] hover:border-white/40 hover:bg-white/[0.07]"
            }`}
          >
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shadow-sm ${
                  confirmed
                    ? "border-primary bg-primary shadow-[0_0_8px_rgba(184,137,42,0.5)]"
                    : "border-white/70 bg-white/10 hover:border-white hover:bg-white/20"
                }`}
              >
                {confirmed && <Check className="w-3.5 h-3.5 text-black" style={{ strokeWidth: 3.5 }} />}
              </div>
            </div>
            <span className="text-sm text-foreground/80 leading-snug">
              I understand this will use{" "}
              <span className="font-semibold text-primary">
                {creditCost !== undefined ? `${creditCost} Build Credits` : "Build Credits"}
              </span>{" "}
              from my balance to start this render.
            </span>
          </label>

          {/* ── CTA ───────────────────────────────────────────────────── */}
          {/* Hard-block CTA when user cannot afford the render */}
          {currentBalance !== null && creditCost !== undefined && currentBalance < creditCost ? (
            <div className="space-y-2">
              <div className="w-full flex items-center justify-center rounded-md bg-secondary/60 border border-border/50 text-muted-foreground/70 text-sm font-medium cursor-not-allowed select-none py-3">
                <Zap className="w-4 h-4 mr-2 text-muted-foreground/50" />
                Not enough credits to render
              </div>
              <Link href="/credits">
                <Button
                  className="w-full bg-[--color-gold] hover:bg-[--color-gold]/80 text-black font-semibold gap-2"
                  onClick={onClose}
                >
                  <Zap className="w-4 h-4" />
                  Top Up Credits — {Math.abs(currentBalance - creditCost)} more needed
                </Button>
              </Link>
            </div>
          ) : (
          <Button
            onClick={handleRender}
            disabled={isLoading || !confirmed}
            className={`w-full h-13 text-base font-bold shadow-lg transition-all ${
              isCinematicMode
                ? "bg-gradient-to-r from-primary via-purple-600 to-primary/40 hover:from-primary hover:via-purple-700 hover:to-primary/40 shadow-violet-900/50 text-white"
                : "bg-gradient-to-r from-primary to-primary/40 hover:from-primary hover:to-primary/40 shadow-violet-900/40 text-white"
            }`}
          >
            {isLoading ? (
              <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
            ) : (
              <>{isCinematicMode ? <Sparkles className="w-5 h-5 mr-2" /> : <Film className="w-5 h-5 mr-2" />}{ctaLabel}</>
            )}
          </Button>
          )}

          <p className="text-center text-xs text-muted-foreground/50">
            Secure payment via Stripe · Instant download after building
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
