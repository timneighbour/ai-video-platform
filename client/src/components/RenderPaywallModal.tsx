/**
 * RenderPaywallModal — Premium unlock moment for the render paywall.
 *
 * Shown when a user wants to download their completed video.
 * Lets them choose quality tier (Standard/HD/4K) and audio tier (Standard/Enhanced/Cinematic).
 * Shows dynamic total, subscription render status, and bundle options.
 * Triggers Stripe checkout for paid renders, or uses free subscription/bundle renders.
 */
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, Download, Zap, Crown, ChevronRight, Sparkles, Info, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Quality = "standard" | "hd" | "4k";
type AudioTier = "standard" | "enhanced" | "cinematic";
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
    badge: "RECOMMENDED",
    description: "Full professional mastering pipeline",
    features: ["Full mastering", "Dynamic range", "Immersive depth", "Streaming loudness"],
    tooltip: "WizSound Cinematic applies our full proprietary mastering pipeline: dynamic range compression, immersive spatial depth, stereo widening, and loudness normalisation to streaming standards. Makes your track sound like it was mixed in a professional studio.",
  },
];

export function RenderPaywallModal({
  open,
  onClose,
  jobId,
  jobType = "music_video",
  videoTitle,
  previewImageUrl,
}: RenderPaywallModalProps) {
  const [quality, setQuality] = useState<Quality>("hd");
  const [audioTier, setAudioTier] = useState<AudioTier>("cinematic");
  const [isLoading, setIsLoading] = useState(false);
  const [playingTier, setPlayingTier] = useState<AudioTier | null>(null);
  const [previewProgress, setPreviewProgress] = useState<Record<AudioTier, number>>({ standard: 0, enhanced: 0, cinematic: 0 });
  const [justListened, setJustListened] = useState<AudioTier | null>(null);
  const justListenedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewVolume, setPreviewVolume] = useState(0.8); // 0–1, default 80%
  const audioRefs = useRef<Record<AudioTier, HTMLAudioElement | null>>({ standard: null, enhanced: null, cinematic: null });
  // Subtle confirmation chime played when a tier is auto-selected after preview
  const selectChimeRef = useRef<HTMLAudioElement | null>(null);

  const wizSoundPreviews = trpc.render.getWizSoundPreviews.useQuery(undefined, {
    staleTime: Infinity, // CDN URLs never change
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

  // Sync volume to all audio elements whenever previewVolume changes
  useEffect(() => {
    Object.values(audioRefs.current).forEach((el) => {
      if (el) el.volume = previewVolume;
    });
    if (selectChimeRef.current) selectChimeRef.current.volume = Math.min(previewVolume, 0.5);
  }, [previewVolume]);

  function togglePreview(tier: AudioTier, url: string) {
    // Stop any other playing tier
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
      audio.volume = previewVolume;
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

  const selectedQuality = QUALITY_OPTIONS.find((q) => q.id === quality)!;
  const selectedAudio = AUDIO_OPTIONS.find((a) => a.id === audioTier)!;
  const totalPrice = selectedQuality.price + selectedAudio.price;

  const hasFreeRenders = (renderStatus.data?.total ?? 0) > 0;
  const subscriptionRemaining = renderStatus.data?.subscriptionRemaining ?? 0;
  const bundleRemaining = renderStatus.data?.bundleRemaining ?? 0;
  const isAdmin = renderStatus.data?.isAdmin ?? false;

  async function handleRender() {
    setIsLoading(true);
    try {
      if (hasFreeRenders || isAdmin) {
        // Use a free render (subscription or bundle)
        const result = await useFreeRender.mutateAsync({
          jobId,
          jobType,
          quality,
          audioTier,
        });
        if (result.used) {
      toast.success("Render started!", {
        description: `Your ${selectedQuality.label} render is processing. We'll notify you when it's ready.`,
      });
          onClose();
          return;
        }
      }

      // No free renders — go to Stripe checkout
      const result = await createRenderCheckout.mutateAsync({
        jobId,
        jobType,
        quality,
        audioTier,
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
          {/* Film grain overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
          />
          <DialogHeader className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Ready to render
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              {videoTitle ? `Render "${videoTitle}"` : "Render & Download Your Video"}
            </DialogTitle>
            <p className="text-sm text-white/55 mt-1">
              Choose your quality and audio settings below.
            </p>
          </DialogHeader>

          {/* Render balance indicator */}
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
                  {" — this render is free"}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  No free renders remaining — pay per render below
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Quality selection */}
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Video Quality</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setQuality(q.id)}
                  className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 text-center ${
                    quality === q.id
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
                  {quality === q.id && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Audio tier selection */}
          <div>
            {/* WizSound™ branding header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Powered by WizSound™</span>
                  <span className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[9px] font-bold tracking-wider">PROPRIETARY</span>
                </div>
                <p className="text-[10px] text-white/35 mt-0.5">Proprietary audio enhancement for richer, more immersive sound</p>
              </div>
              {/* Preview volume control */}
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
            {/* Hidden chime SFX for auto-select confirmation */}
            <audio
              ref={selectChimeRef}
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/select-chime_fba7f83d.mp3"
              preload="auto"
            />
            {/* Hidden audio elements for each tier */}
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
                  // Auto-select this tier, play chime, and show highlight nudge for 3s
                  setAudioTier(a.id);
                  setJustListened(a.id);
                  if (justListenedTimerRef.current) clearTimeout(justListenedTimerRef.current);
                  justListenedTimerRef.current = setTimeout(() => setJustListened(null), 3000);
                  // Play the subtle confirmation chime
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
                    onClick={() => { setAudioTier(a.id); setJustListened(null); if (justListenedTimerRef.current) clearTimeout(justListenedTimerRef.current); }}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 text-left ${
                      isJustListened
                        ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                        : audioTier === a.id
                        ? "border-violet-500 bg-violet-500/15 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
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
                        {/* Equalizer visualiser — only shown while this tier is playing */}
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
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[9px] font-bold tracking-wider">
                            {a.badge}
                          </span>
                        )}
                        {/* Info tooltip */}
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
                      {/* Preview player */}
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
                          {/* Progress bar */}
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
        </div>

        {/* Footer — total + CTA */}
        <div className="px-6 pb-6 pt-4 border-t border-white/8 bg-black/30">
          {/* Bundle upsell (only if no free renders) */}
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

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {hasFreeRenders || isAdmin ? "Free" : `£${totalPrice.toFixed(2)}`}
                </span>
                {!hasFreeRenders && !isAdmin && totalPrice > 0 && (
                  <span className="text-xs text-white/40">
                    {selectedQuality.label} + {selectedAudio.label} audio
                  </span>
                )}
              </div>
              {(hasFreeRenders || isAdmin) && (
                <p className="text-xs text-emerald-400 mt-0.5">
                  Using {isAdmin ? "admin" : subscriptionRemaining > 0 ? "subscription" : "bundle"} render
                </p>
              )}
            </div>
            <Button
              onClick={handleRender}
              disabled={isLoading}
              className="bg-white text-black hover:bg-white/90 font-bold px-6 py-2.5 rounded-xl text-sm shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-200 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {hasFreeRenders || isAdmin ? "Render & Download" : `Pay £${totalPrice.toFixed(2)} & Render`}
                </>
              )}
            </Button>
          </div>

          {/* Trust signals */}
          <div className="flex items-center gap-4 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-emerald-500/70" /> Secure payment</span>
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-emerald-500/70" /> Download in minutes</span>
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-emerald-500/70" /> No watermark</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RenderPaywallModal;
