/**
 * RenderPaywallModal — Unified enhancement tier system.
 *
 * One master toggle: Standard → Enhance → Cinematic
 * Selecting a tier auto-syncs BOTH WizSound™ and WizLumina™.
 * Cinematic Mode is the hero option — highlighted, recommended, bundled at £8 (save £2).
 *
 * Analytics events:
 *   CinematicPack_Offered  — fired when modal opens
 *   CinematicPack_Purchased — fired when user selects Cinematic and renders
 */
import { useState, useRef, useEffect } from "react";
import { mp } from "@/lib/mixpanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Check, Download, Crown, Sparkles, RefreshCw, Shield, Star
} from "@/lib/icons";

type Quality = "standard" | "hd" | "4k";
type EnhanceTier = "standard" | "enhance" | "cinematic";
type JobType = "music_video" | "text_to_video" | "kids_video" | "wizpilot";

interface RenderPaywallModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobType?: JobType;
  videoTitle?: string;
  previewImageUrl?: string;
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

/** Unified enhancement tiers — one selection syncs both WizSound™ and WizLumina™ */
const ENHANCE_TIERS: Array<{
  id: EnhanceTier;
  label: string;
  audioPrice: number;
  visualPrice: number;
  bundlePrice: number; // actual price charged (cinematic gets bundle discount)
  audioLabel: string;
  visualLabel: string;
  audioFeatures: string[];
  visualFeatures: string[];
  badge?: string;
  highlight?: boolean;
  microcopy?: string;
}> = [
  {
    id: "standard",
    label: "Standard",
    audioPrice: 0,
    visualPrice: 0,
    bundlePrice: 0,
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
    bundlePrice: 4,
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
    bundlePrice: 8, // bundle: save £2 vs £10 individual
    audioLabel: "WizSound™ Cinematic",
    visualLabel: "WizLumina™ Cinematic",
    audioFeatures: ["Full mastering pipeline", "Immersive spatial depth", "Streaming loudness (−14 LUFS)"],
    visualFeatures: ["Advanced colour grading", "HDR tone mapping", "Film-level finish"],
    badge: "★ RECOMMENDED",
    highlight: true,
    microcopy: "Studio-grade audio and cinematic visuals",
  },
];

function trackEvent(name: string, props?: Record<string, unknown>) {
  try { mp.track(name, props); } catch { /* never break UI */ }
}

export function RenderPaywallModal({
  open,
  onClose,
  jobId,
  jobType = "music_video",
  videoTitle,
  previewImageUrl,
}: RenderPaywallModalProps) {
  const [quality, setQuality] = useState<Quality>("hd");
  const [enhanceTier, setEnhanceTier] = useState<EnhanceTier>("cinematic");
  const [isLoading, setIsLoading] = useState(false);
  const offeredFiredRef = useRef(false);

  // Fire analytics once per modal open
  useEffect(() => {
    if (open && !offeredFiredRef.current) {
      offeredFiredRef.current = true;
      mp.cinematicPackOffered("paywall");
      trackEvent("CinematicPack_Offered", { jobId, jobType });
    }
    if (!open) offeredFiredRef.current = false;
  }, [open, jobId, jobType]);

  const renderStatus = trpc.render.getRenderStatus.useQuery(undefined, { enabled: open, staleTime: 30_000 });
  const createRenderCheckout = trpc.render.createRenderCheckout.useMutation();
  const useFreeRender = trpc.render.useFreeRender.useMutation();

  const hasFreeRenders = (renderStatus.data?.total ?? 0) > 0;
  const isAdmin = renderStatus.data?.isAdmin ?? false;

  const selectedTier = ENHANCE_TIERS.find((t) => t.id === enhanceTier)!;
  const selectedQuality = QUALITY_OPTIONS.find((q) => q.id === quality)!;

  // Cinematic tier uses bundle price (£8 instead of £10)
  const enhanceAddOn = selectedTier.bundlePrice;
  const totalPrice = selectedQuality.price + enhanceAddOn;

  const isCinematicMode = enhanceTier === "cinematic";
  const ctaLabel = isCinematicMode ? "Render My Cinematic Video" : "Render My Video";

  // Map enhance tier to audioTier expected by backend
  const backendAudioTier = enhanceTier === "enhance" ? "enhanced" : enhanceTier;

  async function handleRender() {
    if (isCinematicMode) {
      trackEvent("CinematicPack_Purchased", { jobId, jobType, price: totalPrice });
    }
    // Fire checkoutStarted before opening Stripe (only for paid renders)
    if (!hasFreeRenders && !isAdmin) {
      mp.checkoutStarted(`render_${selectedQuality.label}${isCinematicMode ? "_cinematic" : ""}`, totalPrice);
    }
    setIsLoading(true);
    try {
      if (hasFreeRenders || isAdmin) {
        const result = await useFreeRender.mutateAsync({
          jobId,
          jobType,
          quality,
          audioTier: backendAudioTier as "standard" | "enhanced" | "cinematic",
        });
        if (result.used) {
          toast.success("Render started!", { description: `Your ${selectedQuality.label} render is processing.` });
          onClose();
          return;
        }
      }

      const result = await createRenderCheckout.mutateAsync({
        jobId,
        jobType,
        quality,
        audioTier: backendAudioTier as "standard" | "enhanced" | "cinematic",
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
      <DialogContent className="max-w-xl bg-[#080808] border border-white/10 text-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#b8892a]/60 via-[#1a1a1a] to-black px-6 pt-6 pb-5 border-b border-white/8">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
          />

          {/* Video preview */}
          {previewImageUrl && (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 h-28 bg-black">
              <img src={previewImageUrl} alt="Video preview" className="w-full h-full object-cover blur-sm scale-105 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-white font-semibold text-sm truncate">{videoTitle || "Your video"}</p>
                <p className="text-white/60 text-xs">Your video is ready</p>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
                Ready to build
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">Make your video cinematic</DialogTitle>
            <p className="text-sm text-white/50 mt-1">Choose your enhancement — only pay when you build your final video.</p>
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

          {/* ── Unified Enhancement Mode ───────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Enhancement Mode</h3>
              {isCinematicMode && (
                <span className="text-[10px] text-[--color-silver] font-medium">Bundle — save £2</span>
              )}
            </div>

            <div className="space-y-2">
              {ENHANCE_TIERS.map((tier) => {
                const isSelected = enhanceTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setEnhanceTier(tier.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? tier.highlight
                          ? "border-[--color-gold]/30 bg-gradient-to-br from-[#b8892a]/40 to-[#4a3010]/20 ring-1 ring-[--color-gold]/30 shadow-lg shadow-[#b8892a]/20"
                          : "border-[--color-gold]/30 bg-[--color-gold]/15"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Radio dot */}
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "border-[--color-gold] bg-[--color-gold]" : "border-white/25"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${isSelected ? "text-white" : "text-zinc-300"}`}>
                              {tier.label}
                            </span>
                            {tier.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                tier.highlight
                                  ? "bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30"
                                  : "bg-white/10 text-zinc-400"
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

                          {/* Audio + Visual sub-labels — the key UI showing both are synced */}
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-zinc-600">♪</span>
                              <span className="text-[11px] text-[--color-silver] font-medium">{tier.audioLabel}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-zinc-600">◆</span>
                              <span className="text-[11px] text-[--color-gold] font-medium">{tier.visualLabel}</span>
                            </div>
                          </div>

                          {/* Microcopy for cinematic */}
                          {tier.microcopy && (
                            <p className="text-[11px] text-zinc-400 mt-1">{tier.microcopy}</p>
                          )}

                          {/* Feature list (expanded for cinematic) */}
                          {isSelected && tier.id !== "standard" && (
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                              {[...tier.audioFeatures, ...tier.visualFeatures].slice(0, 6).map((f) => (
                                <div key={f} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                  <Check className="w-2.5 h-2.5 text-[--color-gold] flex-shrink-0" />
                                  {f}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        {tier.bundlePrice === 0 ? (
                          <span className="text-sm font-semibold text-[--color-silver]">Free</span>
                        ) : (
                          <div>
                            <span className="text-sm font-bold text-white">+£{tier.bundlePrice}</span>
                            {tier.id === "cinematic" && (
                              <p className="text-[10px] text-zinc-500 line-through">£10</p>
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
                        ? "border-[--color-gold]/30 bg-[--color-gold]/15 ring-1 ring-[--color-gold]/25"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    {opt.badge && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                        opt.badge === "MOST POPULAR" ? "bg-[--color-gold] text-white" : "bg-[--color-gold] text-white"
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                    <p className={`text-xs font-semibold ${isSelected ? "text-white" : "text-zinc-300"}`}>{opt.label}</p>
                    <p className="text-[10px] text-zinc-500">{opt.resolution}</p>
                    <p className={`text-sm font-bold mt-1 ${isSelected ? "text-[--color-gold]" : "text-white"}`}>£{opt.price}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Price Summary ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Quality ({selectedQuality.label})</span>
              <span className="text-sm text-white">£{selectedQuality.price}</span>
            </div>
            {enhanceAddOn > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">
                  {isCinematicMode ? "Cinematic Mode bundle" : `${selectedTier.label} enhancement`}
                </span>
                <span className="text-sm text-white">+£{enhanceAddOn}</span>
              </div>
            )}
            {isCinematicMode && (
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
              <div key={text} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Icon className="w-3.5 h-3.5 text-zinc-600" />
                {text}
              </div>
            ))}
          </div>

          {/* ── CTA ───────────────────────────────────────────────────── */}
          <Button
            onClick={handleRender}
            disabled={isLoading}
            className={`w-full h-12 text-base font-bold shadow-lg transition-all ${
              isCinematicMode
                ? "bg-gradient-to-r from-[#b8892a] via-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:via-[#e8c878] hover:to-[#4a3010] shadow-[#b8892a]/50 text-white"
                : "bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] shadow-[#b8892a]/40 text-white"
            }`}
          >
            {isLoading ? (
              <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
            ) : (
              <>{isCinematicMode ? <Sparkles className="w-5 h-5 mr-2" /> : <Download className="w-5 h-5 mr-2" />}{ctaLabel}</>
            )}
          </Button>

          <p className="text-center text-xs text-zinc-600">
            Secure payment via Stripe · Instant download after building
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
