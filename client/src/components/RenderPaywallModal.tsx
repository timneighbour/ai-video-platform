/**
 * RenderPaywallModal — Premium unlock moment for the render paywall.
 *
 * Shown when a user wants to download their completed video.
 * Lets them choose quality tier (Standard/HD/4K) and audio tier (Standard/Enhanced/Cinematic).
 * Shows dynamic total, subscription render status, and bundle options.
 * Triggers Stripe checkout for paid renders, or uses free subscription/bundle renders.
 *
 * Analytics events:
 *   CinematicPack_Offered  — fired when modal opens
 *   CinematicPack_Purchased — fired when user clicks Render & Download with Cinematic Pack selected
 */
import { useState, useRef, useEffect } from "react";
import { mp } from "@/lib/mixpanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, Download, Zap, Crown, ChevronRight, Sparkles, Info, Play, Pause, Volume2, VolumeX, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGlobalAudio } from "@/contexts/AudioContext";
import { WizBrandBadge } from "@/components/WizBrand";
import SubscriptionUpgradeNudge from "@/components/SubscriptionUpgradeNudge";
import BundlePromoBanner from "@/components/BundlePromoBanner";

type Quality = "standard" | "hd" | "4k";
type AudioTier = "standard" | "enhanced" | "cinematic";
type JobType = "music_video" | "text_to_video" | "kids_video" | "wizpilot";

/** When true the user has selected the Cinematic Pack bundle (4K + WizSound Cinematic = £7) */
type SelectionMode = "custom" | "cinematic_pack";

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
  { id: "standard", label: "Standard", resolution: "720p", price: 2, description: "Great for social media" },
  { id: "hd", label: "HD", resolution: "1080p", price: 4, badge: "MOST POPULAR", description: "Perfect for YouTube & streaming" },
  { id: "4k", label: "4K", resolution: "2160p", price: 6, description: "Cinema-grade quality" },
];

const AUDIO_OPTIONS: Array<{
  id: AudioTier;
  label: string;
  price: number;
  badge?: string;
  description: string;
  features: string[];
  tooltip: string;
}> = [
  {
    id: "standard",
    label: "Standard Audio",
    price: 0,
    description: "Original audio, used as-is",
    features: ["Original mix", "Stereo output"],
    tooltip: "Your original audio track is used as-is — no processing applied. Best when your mix is already mastered or you prefer full control over the final sound.",
  },
  {
    id: "enhanced",
    label: "WizSound Enhance",
    price: 1,
    description: "Polished, fuller sound",
    features: ["Stereo widening", "Frequency EQ", "Noise reduction"],
    tooltip: "WizSound Enhance applies stereo widening to make your track feel bigger, frequency EQ to balance the mix, and light noise reduction to clean up background hiss. Great for tracks recorded at home or on mobile.",
  },
  {
    id: "cinematic",
    label: "WizSound Cinematic",
    price: 3,
    badge: "✦ RECOMMENDED",
    description: "Immersive, studio-quality mastered audio",
    features: ["Full mastering pipeline", "Immersive spatial depth", "Streaming loudness (−14 LUFS)", "Cinematic dynamic range"],
    tooltip: "WizSound Cinematic applies our full proprietary mastering pipeline: dynamic range compression, immersive spatial depth, stereo widening, and loudness normalisation to streaming standards. Makes your track sound like it was mixed in a professional studio.",
  },
];

/** Cinematic Pack bundle — fixed £7 for 4K + WizSound Cinematic + priority rendering */
const CINEMATIC_PACK = {
  price: 7,
  quality: "4k" as Quality,
  audioTier: "cinematic" as AudioTier,
  label: "Cinematic Pack",
  badge: "★ BEST VALUE",
  description: "4K video · WizSound Cinematic audio · Priority rendering",
  tooltip:
    "The Cinematic Pack bundles our highest-quality 4K render with the full WizSound Cinematic mastering pipeline and priority queue placement — all at a single £7 price. Individually these would cost £9 (£6 + £3), so you save £2 instantly.",
  features: [
    "4K / 2160p video output",
    "WizSound Cinematic mastering",
    "Immersive spatial depth",
    "Streaming loudness (−14 LUFS)",
    "Priority rendering queue",
    "Save £2 vs individual options",
  ],
};

/** Fire a lightweight analytics event without blocking the UI */
function trackEvent(name: string, props?: Record<string, unknown>) {
  try {
    mp.track(name, props);
    if (import.meta.env.DEV) {
      console.info("[Analytics]", name, props);
    }
  } catch {
    // Never let analytics break the UI
  }
}

export function RenderPaywallModal({
  open,
  onClose,
  jobId,
  jobType = "music_video",
  videoTitle,
  previewImageUrl,
}: RenderPaywallModalProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("cinematic_pack");
  const [quality, setQuality] = useState<Quality>("hd");
  const [audioTier, setAudioTier] = useState<AudioTier>("cinematic");
  const [isLoading, setIsLoading] = useState(false);
  const [playingTier, setPlayingTier] = useState<AudioTier | null>(null);
  const [previewProgress, setPreviewProgress] = useState<Record<AudioTier, number>>({ standard: 0, enhanced: 0, cinematic: 0 });
  const [justListened, setJustListened] = useState<AudioTier | null>(null);
  const justListenedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewVolume, setPreviewVolume] = useState(0.8);
  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus } = useGlobalAudio();
  const audioRefs = useRef<Record<AudioTier, HTMLAudioElement | null>>({ standard: null, enhanced: null, cinematic: null });
  const selectChimeRef = useRef<HTMLAudioElement | null>(null);
  const offeredFiredRef = useRef(false);

  // Fire CinematicPack_Offered once per modal open
  useEffect(() => {
    if (open && !offeredFiredRef.current) {
      offeredFiredRef.current = true;
      mp.cinematicPackOffered("paywall");
      trackEvent("CinematicPack_Offered", { jobId, jobType });
    }
    if (!open) {
      offeredFiredRef.current = false;
    }
  }, [open, jobId, jobType]);

  const wizSoundPreviews = trpc.render.getWizSoundPreviews.useQuery(undefined, {
    staleTime: Infinity,
    enabled: open,
  });

  // Stop all preview audio when modal closes
  useEffect(() => {
    if (!open) {
      Object.values(audioRefs.current).forEach((el) => {
        if (el) { el.pause(); el.currentTime = 0; }
      });
      setPlayingTier(null);
      setPreviewProgress({ standard: 0, enhanced: 0, cinematic: 0 });
      setJustListened(null);
      if (justListenedTimerRef.current) clearTimeout(justListenedTimerRef.current);
    }
  }, [open]);

  // Sync volume + global mute to all audio elements
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : previewVolume;
    Object.values(audioRefs.current).forEach((el) => {
      if (el) { el.volume = effectiveVol; el.muted = isMuted; }
    });
    if (selectChimeRef.current) { selectChimeRef.current.volume = isMuted ? 0 : Math.min(previewVolume, 0.5); selectChimeRef.current.muted = isMuted; }
  }, [previewVolume, isMuted]);

  function togglePreview(tier: AudioTier, url: string) {
    Object.entries(audioRefs.current).forEach(([t, el]) => {
      if (t !== tier && el) { el.pause(); el.currentTime = 0; }
    });
    if (playingTier !== tier) {
      setPreviewProgress((p) => ({ ...p, ...Object.fromEntries(Object.keys(p).filter((k) => k !== tier).map((k) => [k, 0])) }));
    }
    const audio = audioRefs.current[tier];
    if (!audio) return;
    if (playingTier === tier) {
      audio.pause();
      setPlayingTier(null);
    } else {
      audio.src = url;
      audio.volume = isMuted ? 0 : previewVolume;
      audio.muted = isMuted;
      if (!isMuted) requestAudioFocus("render-paywall");
      audio.play().catch(() => {});
      setPlayingTier(tier);
    }
  }

  const renderStatus = trpc.render.getRenderStatus.useQuery(undefined, {
    enabled: open,
    staleTime: 30_000,
  });

  const createRenderCheckout = trpc.render.createRenderCheckout.useMutation();
  const useFreeRender = trpc.render.useFreeRender.useMutation();

  // Effective quality/audio based on mode
  const effectiveQuality: Quality = selectionMode === "cinematic_pack" ? CINEMATIC_PACK.quality : quality;
  const effectiveAudioTier: AudioTier = selectionMode === "cinematic_pack" ? CINEMATIC_PACK.audioTier : audioTier;
  const effectivePrice = selectionMode === "cinematic_pack"
    ? CINEMATIC_PACK.price
    : (QUALITY_OPTIONS.find((q) => q.id === quality)!.price + AUDIO_OPTIONS.find((a) => a.id === audioTier)!.price);

  const selectedQuality = QUALITY_OPTIONS.find((q) => q.id === effectiveQuality)!;
  const selectedAudio = AUDIO_OPTIONS.find((a) => a.id === effectiveAudioTier)!;
  const totalPrice = effectivePrice;

  const hasFreeRenders = (renderStatus.data?.total ?? 0) > 0;
  const subscriptionRemaining = renderStatus.data?.subscriptionRemaining ?? 0;
  const bundleRemaining = renderStatus.data?.bundleRemaining ?? 0;
  const isAdmin = renderStatus.data?.isAdmin ?? false;

  async function handleRender() {
    // Fire analytics for Cinematic Pack purchase
    if (selectionMode === "cinematic_pack") {
      trackEvent("CinematicPack_Purchased", { jobId, jobType, price: CINEMATIC_PACK.price });
    }

    setIsLoading(true);
    try {
      if (hasFreeRenders || isAdmin) {
        const result = await useFreeRender.mutateAsync({
          jobId,
          jobType,
          quality: effectiveQuality,
          audioTier: effectiveAudioTier,
        });
        if (result.used) {
          toast.success("Render started!", {
            description: `Your ${selectedQuality.label} render is processing. We'll notify you when it's ready.`,
          });
          onClose();
          return;
        }
      }

      const result = await createRenderCheckout.mutateAsync({
        jobId,
        jobType,
        quality: effectiveQuality,
        audioTier: effectiveAudioTier,
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0a0a0a] border border-white/10 text-white p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-900/40 via-purple-900/20 to-black px-6 pt-6 pb-5 border-b border-white/8">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
          />

          {previewImageUrl && (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 h-28 bg-black">
              <img
                src={previewImageUrl}
                alt="Video preview"
                className="w-full h-full object-cover blur-sm scale-105 opacity-70"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] text-white/70 font-medium tracking-wide">Your video is ready</span>
              </div>
            </div>
          )}

          <DialogHeader className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Ready to render
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Make your video cinematic
            </DialogTitle>
            <p className="text-sm text-white/55 mt-1">
              Choose your quality and audio — only pay when you render.
            </p>
          </DialogHeader>

          {!renderStatus.isLoading && (
            <div className="mt-4 flex items-center gap-3">
              {isAdmin ? (
                <div className="flex items-center gap-2 text-xs text-violet-300">
                  <Crown className="w-3.5 h-3.5" />
                  Admin — unlimited renders
                </div>
              ) : hasFreeRenders ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Zap className="w-3.5 h-3.5" />
                  {subscriptionRemaining > 0 && `${subscriptionRemaining} subscription render${subscriptionRemaining !== 1 ? "s" : ""} remaining`}
                  {subscriptionRemaining > 0 && bundleRemaining > 0 && " · "}
                  {bundleRemaining > 0 && `${bundleRemaining} bundle render${bundleRemaining !== 1 ? "s" : ""}`}
                  {" — included in your plan"}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-400/90">
                  <Sparkles className="w-3.5 h-3.5" />
                  One-time payment • No subscription required
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* ── Cinematic Pack bundle card (shown first / anchors price) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Render Options</h3>
              <WizBrandBadge layer="render" size="sm" />
            </div>

            {/* Cinematic Pack — visually dominant card */}
            <button
              onClick={() => setSelectionMode("cinematic_pack")}
              className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 mb-3 ${
                selectionMode === "cinematic_pack"
                  ? "border-fuchsia-500 bg-gradient-to-br from-fuchsia-950/60 via-violet-950/40 to-black shadow-[0_0_40px_rgba(217,70,239,0.3)] ring-1 ring-fuchsia-500/40"
                  : "border-fuchsia-500/40 bg-fuchsia-950/20 hover:border-fuchsia-500/70 hover:shadow-[0_0_20px_rgba(217,70,239,0.15)]"
              }`}
            >
              {/* Best Value badge */}
              <div className="absolute -top-3 left-4 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-[10px] font-bold tracking-wider shadow-lg">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  BEST VALUE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
                  Save £2
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 mt-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-white">{CINEMATIC_PACK.label}</span>
                    {/* Tooltip */}
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-fuchsia-400/60 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors cursor-help flex-shrink-0"
                          aria-label="What's included in the Cinematic Pack?"
                        >
                          <Info className="w-3 h-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[260px] text-xs leading-relaxed bg-[#1a0a2e] border border-fuchsia-500/30 text-white/85 shadow-xl"
                      >
                        {CINEMATIC_PACK.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-fuchsia-300/70 mt-0.5">{CINEMATIC_PACK.description}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                    {CINEMATIC_PACK.features.map((f) => (
                      <span key={f} className="text-[10px] text-white/45 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-fuchsia-400/80" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white">£{CINEMATIC_PACK.price}</span>
                  </div>
                  <span className="text-[10px] text-white/35 line-through">£9</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-1 ${
                    selectionMode === "cinematic_pack" ? "border-fuchsia-500 bg-fuchsia-500" : "border-white/30"
                  }`}>
                    {selectionMode === "cinematic_pack" && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
            </button>

            {/* Individual quality options */}
            <div className="grid grid-cols-3 gap-2.5">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { setSelectionMode("custom"); setQuality(q.id); }}
                  className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 text-center ${
                    selectionMode === "custom" && quality === q.id
                      ? "border-violet-500 bg-violet-500/15 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                      : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  {q.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-violet-500 text-white text-[9px] font-bold tracking-wider whitespace-nowrap">
                      {q.badge}
                    </span>
                  )}
                  <span className="text-base font-bold text-white">{q.label}</span>
                  <span className="text-xs text-white/50">{q.resolution}</span>
                  <span className="text-sm font-semibold text-violet-300">
                    {q.price === 0 ? "Free" : `£${q.price}`}
                  </span>
                  <span className="text-[10px] text-white/40 leading-tight">{q.description}</span>
                  {selectionMode === "custom" && quality === q.id && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Hint when custom mode is active */}
            {selectionMode === "custom" && (
              <p className="text-[10px] text-white/30 mt-2 text-center">
                Selecting individual options — or{" "}
                <button
                  type="button"
                  onClick={() => setSelectionMode("cinematic_pack")}
                  className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 transition-colors"
                >
                  switch to Cinematic Pack
                </button>{" "}
                and save £2.
              </p>
            )}
          </div>

          {/* Audio tier selection — only shown in custom mode */}
          {selectionMode === "custom" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Powered by WizSound™</span>
                    <span className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[9px] font-bold tracking-wider">PROPRIETARY</span>
                  </div>
                  <p className="text-[10px] text-white/35 mt-0.5">Proprietary audio enhancement for richer, more immersive sound</p>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <button
                    type="button"
                    onClick={() => setPreviewVolume((v) => v > 0 ? 0 : 0.8)}
                    className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
                    aria-label={previewVolume === 0 ? "Unmute preview" : "Mute preview"}
                  >
                    {previewVolume === 0
                      ? <VolumeX className="w-3.5 h-3.5" />
                      : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={previewVolume}
                    onChange={(e) => setPreviewVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-violet-400 cursor-pointer"
                    aria-label="Preview volume"
                  />
                  <span className="text-[9px] text-white/30 w-5 text-right tabular-nums">
                    {Math.round(previewVolume * 100)}%
                  </span>
                </div>
              </div>
              {/* Hidden chime SFX */}
              <audio
                ref={selectChimeRef}
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/select-chime_fba7f83d.mp3"
                preload="auto"
              />
              {/* Hidden audio elements */}
              {AUDIO_OPTIONS.map((a) => (
                <audio
                  key={`audio-${a.id}`}
                  ref={(el) => { audioRefs.current[a.id] = el; }}
                  preload="none"
                  onTimeUpdate={() => {
                    const el = audioRefs.current[a.id];
                    if (el && el.duration) {
                      setPreviewProgress((p) => ({ ...p, [a.id]: (el.currentTime / el.duration) * 100 }));
                    }
                  }}
                  onEnded={() => {
                    setPlayingTier(null);
                    setPreviewProgress((p) => ({ ...p, [a.id]: 0 }));
                    setAudioTier(a.id);
                    if (a.id !== "standard") mp.wizSoundUpgraded(a.id as "enhanced" | "cinematic");
                    setJustListened(a.id);
                    if (justListenedTimerRef.current) clearTimeout(justListenedTimerRef.current);
                    justListenedTimerRef.current = setTimeout(() => setJustListened(null), 3000);
                    if (selectChimeRef.current) {
                      selectChimeRef.current.currentTime = 0;
                      selectChimeRef.current.play().catch(() => {});
                    }
                  }}
                />
              ))}
              <div className="space-y-2">
                {AUDIO_OPTIONS.map((a) => {
                  const previewUrl = wizSoundPreviews.data?.[a.id as keyof typeof wizSoundPreviews.data];
                  const isPlaying = playingTier === a.id;
                  const progress = previewProgress[a.id];
                  const isJustListened = justListened === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setAudioTier(a.id); if (a.id !== "standard") mp.wizSoundUpgraded(a.id as "enhanced" | "cinematic"); setJustListened(null); if (justListenedTimerRef.current) clearTimeout(justListenedTimerRef.current); }}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 text-left ${
                        isJustListened
                          ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                          : audioTier === a.id && a.id === "cinematic"
                          ? "border-fuchsia-500 bg-fuchsia-500/12 shadow-[0_0_25px_rgba(217,70,239,0.25)] ring-1 ring-fuchsia-500/30"
                          : audioTier === a.id
                          ? "border-violet-500 bg-violet-500/15 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                          : a.id === "cinematic"
                          ? "border-fuchsia-500/30 bg-fuchsia-500/5 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10"
                          : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                        audioTier === a.id ? "border-violet-500 bg-violet-500" : "border-white/30"
                      }`}>
                        {audioTier === a.id && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{a.label}</span>
                          {isPlaying && (
                            <div className="flex items-end gap-[2px] h-4" aria-hidden="true">
                              <div className="wizsound-eq-bar-1 w-[3px] rounded-sm bg-violet-400 min-h-[3px]" />
                              <div className="wizsound-eq-bar-2 w-[3px] rounded-sm bg-violet-400 min-h-[3px]" />
                              <div className="wizsound-eq-bar-3 w-[3px] rounded-sm bg-violet-300 min-h-[3px]" />
                              <div className="wizsound-eq-bar-4 w-[3px] rounded-sm bg-violet-400 min-h-[3px]" />
                              <div className="wizsound-eq-bar-5 w-[3px] rounded-sm bg-violet-400 min-h-[3px]" />
                            </div>
                          )}
                          {a.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                              a.id === "cinematic"
                                ? "bg-fuchsia-500/25 border border-fuchsia-400/40 text-fuchsia-300"
                                : "bg-amber-500/20 border border-amber-400/30 text-amber-300"
                            }`}>
                              {a.badge}
                            </span>
                          )}
                          <Tooltip delayDuration={400}>
                            <TooltipTrigger asChild>
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors cursor-help flex-shrink-0"
                                aria-label={`Learn more about ${a.label} audio`}
                              >
                                <Info className="w-3 h-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[240px] text-xs leading-relaxed bg-[#1a1a2e] border border-violet-500/20 text-white/80 shadow-xl"
                            >
                              {a.tooltip}
                            </TooltipContent>
                          </Tooltip>
                          <span className="ml-auto text-sm font-semibold text-violet-300">
                            {a.price === 0 ? "Included" : `+£${a.price}`}
                          </span>
                        </div>
                        <p className="text-xs text-white/45 mt-0.5">{a.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                          {a.features.map((f) => (
                            <span key={f} className="text-[10px] text-white/35 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-violet-400/70" />
                              {f}
                            </span>
                          ))}
                        </div>
                        {previewUrl && (
                          <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => togglePreview(a.id, previewUrl)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 border ${
                                isPlaying
                                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                                  : "bg-white/5 border-white/15 text-white/50 hover:text-white/80 hover:bg-white/10 hover:border-white/25"
                              }`}
                              aria-label={isPlaying ? `Pause ${a.label} preview` : `Preview ${a.label} audio`}
                            >
                              {isPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                              <Volume2 className="w-2.5 h-2.5" />
                              {isPlaying ? "Pause" : "Preview"}
                            </button>
                            {isPlaying && (
                              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-violet-500 rounded-full transition-all duration-100"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                            {!isPlaying && progress === 0 && !isJustListened && (
                              <span className="text-[9px] text-white/25">10s sample</span>
                            )}
                            {isJustListened && (
                              <span className="text-[9px] text-emerald-400 font-semibold animate-pulse">
                                ✓ Selected
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer — order summary + CTA */}
        <div className="px-6 pb-6 pt-4 border-t border-white/8 bg-black/30">
          {!hasFreeRenders && !isAdmin && !renderStatus.isLoading && (
            <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-violet-500/8 border border-violet-500/20">
              <div>
                <p className="text-xs font-semibold text-violet-300">Save with a render bundle</p>
                <p className="text-[10px] text-white/45 mt-0.5">6 renders for £10 · 15 for £20 · 40 for £50</p>
              </div>
              <a
                href="/pricing#bundles"
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium whitespace-nowrap"
              >
                View bundles <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Order summary */}
          {!hasFreeRenders && !isAdmin && (
            <div className="mb-4 rounded-xl bg-white/3 border border-white/8 divide-y divide-white/6 overflow-hidden">
              {selectionMode === "cinematic_pack" ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-white/60 flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-fuchsia-400" />
                      Cinematic Pack (4K + WizSound Cinematic + Priority)
                    </span>
                    <span className="text-xs font-semibold text-white">£{CINEMATIC_PACK.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-emerald-400/80 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Bundle discount applied
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">−£2.00</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-white/60">{selectedQuality.label} Render ({selectedQuality.resolution})</span>
                    <span className="text-xs font-semibold text-white">£{selectedQuality.price.toFixed(2)}</span>
                  </div>
                  {selectedAudio.price > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-white/60">{selectedAudio.label}</span>
                      <span className="text-xs font-semibold text-white">£{selectedAudio.price.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/3">
                <span className="text-xs font-bold text-white">Total</span>
                <span className="text-sm font-extrabold text-white">£{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Total + CTA */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {hasFreeRenders || isAdmin ? "Free" : `£${totalPrice.toFixed(2)}`}
                </span>
              </div>
              {(hasFreeRenders || isAdmin) ? (
                <p className="text-xs text-emerald-400 mt-0.5">
                  Included in your {isAdmin ? "admin" : subscriptionRemaining > 0 ? "monthly plan" : "bundle"}
                </p>
              ) : selectionMode === "cinematic_pack" ? (
                <p className="text-[10px] text-fuchsia-400/70 mt-0.5">Best value · Cinematic Pack</p>
              ) : (
                <p className="text-[10px] text-white/35 mt-0.5">No hidden fees</p>
              )}
            </div>
            <Button
              onClick={handleRender}
              disabled={isLoading}
              className={`font-bold px-6 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 ${
                selectionMode === "cinematic_pack"
                  ? "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:from-fuchsia-400 hover:to-violet-500 shadow-[0_0_30px_rgba(217,70,239,0.4)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)]"
                  : "bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {selectionMode === "cinematic_pack" ? "Render Cinematic Pack" : "Render & Download"}
                </>
              )}
            </Button>
          </div>

          <p className="text-[10px] text-white/30 text-center mb-3">
            Your video will start rendering instantly after payment
          </p>

          <BundlePromoBanner threshold={2} className="mb-2" />
          <SubscriptionUpgradeNudge />
          <div className="flex items-center justify-center gap-5 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-emerald-500/70" /> Secure payment</span>
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-emerald-500/70" /> No hidden fees</span>
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-emerald-500/70" /> Instant processing</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RenderPaywallModal;
