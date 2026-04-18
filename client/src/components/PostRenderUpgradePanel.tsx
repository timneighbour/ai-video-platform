/**
 * PostRenderUpgradePanel
 *
 * Shown after a render completes. Lets the user upgrade their existing render
 * to a higher quality tier (HD / 4K) or add WizSound™ Cinematic audio,
 * paying only the price difference from what they already paid.
 */
import { useState } from "react";
import { ArrowUp, Music2, Sparkles, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Quality = "standard" | "hd" | "4k";
type AudioTier = "standard" | "enhanced" | "cinematic";

interface Props {
  renderJobId: number;
  currentQuality: Quality;
  currentAudioTier: AudioTier;
  /** Called after the user is redirected to Stripe checkout */
  onCheckoutStarted?: () => void;
}

const QUALITY_PRICES: Record<Quality, number> = { standard: 200, hd: 400, "4k": 600 };
const AUDIO_PRICES: Record<AudioTier, number> = { standard: 0, enhanced: 100, cinematic: 300 };
const QUALITY_ORDER: Quality[] = ["standard", "hd", "4k"];

const QUALITY_META: Record<Quality, { label: string; resolution: string; badge?: string }> = {
  standard: { label: "Standard",  resolution: "720p" },
  hd:       { label: "HD",        resolution: "1080p", badge: "Popular" },
  "4k":     { label: "4K Ultra",  resolution: "2160p", badge: "Best" },
};

const AUDIO_META: Record<AudioTier, { label: string; description: string; badge?: string }> = {
  standard:  { label: "Standard Audio",       description: "Original audio track" },
  enhanced:  { label: "WizSound Active",       description: "Stereo widening + EQ" },
  cinematic: { label: "WizSound Spatial",      description: "Spatial depth, −14 LUFS master", badge: "Recommended" },
};

export default function PostRenderUpgradePanel({
  renderJobId,
  currentQuality,
  currentAudioTier,
  onCheckoutStarted,
}: Props) {
  const [selectedQuality, setSelectedQuality] = useState<Quality>(currentQuality);
  const [selectedAudio, setSelectedAudio]     = useState<AudioTier>(currentAudioTier);

  const upgradeCheckout = trpc.render.createUpgradeCheckout.useMutation();

  // Compute differentials
  const qualityDiff = Math.max(0, QUALITY_PRICES[selectedQuality] - QUALITY_PRICES[currentQuality]);
  const audioDiff   = Math.max(0, AUDIO_PRICES[selectedAudio]   - AUDIO_PRICES[currentAudioTier]);
  const totalDiff   = qualityDiff + audioDiff;

  const hasUpgrade =
    QUALITY_ORDER.indexOf(selectedQuality) > QUALITY_ORDER.indexOf(currentQuality) ||
    AUDIO_PRICES[selectedAudio] > AUDIO_PRICES[currentAudioTier];

  async function handleUpgrade() {
    if (!hasUpgrade) return;
    try {
      const result = await upgradeCheckout.mutateAsync({
        renderJobId,
        upgradeQuality:   selectedQuality   !== currentQuality   ? selectedQuality   : undefined,
        upgradeAudioTier: selectedAudio     !== currentAudioTier ? selectedAudio     : undefined,
        origin: window.location.origin,
      });
      if (result.checkoutUrl) {
        toast.info("Redirecting to checkout…");
        onCheckoutStarted?.();
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(msg);
    }
  }

  // Available quality upgrades (only higher tiers)
  const availableQualities = QUALITY_ORDER.filter(
    (q) => QUALITY_ORDER.indexOf(q) >= QUALITY_ORDER.indexOf(currentQuality)
  );

  // Available audio upgrades (only higher tiers)
  const availableAudio: AudioTier[] = (["standard", "enhanced", "cinematic"] as AudioTier[]).filter(
    (a) => AUDIO_PRICES[a] >= AUDIO_PRICES[currentAudioTier]
  );

  return (
    <div className="rounded-2xl border border-[--color-gold]/30 bg-gradient-to-br from-[#b8892a]/30 via-black to-black p-5 mt-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[--color-gold]/15 flex items-center justify-center flex-shrink-0">
          <ArrowUp className="w-4 h-4 text-[--color-gold]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Upgrade your video</h3>
          <p className="text-[11px] text-white/45">Pay only the difference — no re-upload needed</p>
        </div>
      </div>

      {/* Quality selector */}
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Video Quality</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {availableQualities.map((q) => {
          const meta      = QUALITY_META[q];
          const isCurrent = q === currentQuality;
          const isSelected = q === selectedQuality;
          const diff      = Math.max(0, QUALITY_PRICES[q] - QUALITY_PRICES[currentQuality]);
          return (
            <button
              key={q}
              onClick={() => !isCurrent && setSelectedQuality(q)}
              disabled={isCurrent}
              className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                isCurrent
                  ? "border-white/8 bg-white/3 cursor-default opacity-60"
                  : isSelected
                  ? "border-[--color-gold]/30 bg-[--color-gold]/15 ring-1 ring-violet-500/30"
                  : "border-white/10 bg-white/3 hover:border-[--color-gold]/30 hover:bg-[--color-gold]/15"
              }`}
            >
              {meta.badge && !isCurrent && (
                <span className="absolute -top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[--color-gold] text-white">
                  {meta.badge}
                </span>
              )}
              <p className="text-xs font-semibold text-white">{meta.label}</p>
              <p className="text-[10px] text-white/40">{meta.resolution}</p>
              <p className="text-[10px] font-semibold mt-1 text-[--color-gold]">
                {isCurrent ? "Current" : diff === 0 ? "Included" : `+£${(diff / 100).toFixed(2)}`}
              </p>
              {isSelected && !isCurrent && (
                <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-[--color-gold]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Audio tier selector */}
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Audio Enhancement</p>
      <div className="space-y-2 mb-5">
        {availableAudio.map((a) => {
          const meta      = AUDIO_META[a];
          const isCurrent = a === currentAudioTier;
          const isSelected = a === selectedAudio;
          const diff      = Math.max(0, AUDIO_PRICES[a] - AUDIO_PRICES[currentAudioTier]);
          return (
            <button
              key={a}
              onClick={() => !isCurrent && setSelectedAudio(a)}
              disabled={isCurrent}
              className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                isCurrent
                  ? "border-white/8 bg-white/3 cursor-default opacity-60"
                  : isSelected
                  ? "border-fuchsia-500/60 bg-[--color-gold]/15 ring-1 ring-fuchsia-500/25"
                  : "border-white/10 bg-white/3 hover:border-fuchsia-500/30 hover:bg-[--color-gold]/15"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isSelected && !isCurrent ? "bg-[--color-gold]/15" : "bg-white/5"
              }`}>
                <Music2 className={`w-4 h-4 ${isSelected && !isCurrent ? "text-[--color-gold]" : "text-white/40"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{meta.label}</span>
                  {meta.badge && (
                    <span className="px-1.5 py-0.5 rounded bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-[9px] font-bold">
                      {meta.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">{meta.description}</p>
              </div>
              <span className="text-xs font-semibold text-[--color-gold] flex-shrink-0">
                {isCurrent ? "Current" : diff === 0 ? "Included" : `+£${(diff / 100).toFixed(2)}`}
              </span>
              {isSelected && !isCurrent && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[--color-gold] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Total + CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-white/8">
        <div>
          {hasUpgrade ? (
            <>
              <p className="text-lg font-bold text-white">£{(totalDiff / 100).toFixed(2)}</p>
              <p className="text-[10px] text-white/35">You pay only the difference</p>
            </>
          ) : (
            <p className="text-xs text-white/35">Select an upgrade above</p>
          )}
        </div>
        <Button
          onClick={handleUpgrade}
          disabled={!hasUpgrade || upgradeCheckout.isPending}
          className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-40 flex items-center gap-2"
        >
          {upgradeCheckout.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Upgrade your video
          {hasUpgrade && <ChevronRight className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Trust note */}
      <p className="text-[10px] text-white/25 text-center mt-3">
        Secure checkout via Stripe · No subscription required · Instant re-render
      </p>
    </div>
  );
}
