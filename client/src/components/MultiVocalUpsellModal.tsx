/**
 * MultiVocalUpsellModal — Duet Mode / Ensemble Mode upgrade prompt
 *
 * Surfaces when 2+ vocal stems are detected in a music video job.
 * Allows the user to upgrade to Duet or Ensemble mode for per-character lip sync.
 * Credits are deducted from the user's balance (no Stripe checkout needed for add-ons).
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic2,
  Users,
  Sparkles,
  CheckCircle2,
  Coins,
  Star,
  Zap,
  Music,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface MultiVocalUpsellModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  stemCount: number;
  currentCredits: number;
  onUpgraded?: (mode: "duet" | "ensemble") => void;
}

const TIERS = [
  {
    key: "duet" as const,
    label: "Duet Mode",
    badge: "2 Vocalists",
    credits: 25,
    icon: <Users className="w-5 h-5 text-pink-400" />,
    color: "border-pink-500/40 bg-gradient-to-br from-pink-500/10 to-purple-500/10",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    description: "Perfect for duets, male/female vocal pairs, or any track with two distinct voices.",
    features: [
      "2 isolated vocal stems",
      "Each character lip syncs to their own voice",
      "Automatic gender detection",
      "Character-to-stem assignment UI",
    ],
    example: "e.g. Zara (female lead) + male backing vocalist",
  },
  {
    key: "ensemble" as const,
    label: "Ensemble Mode",
    badge: "Up to 6 Vocalists",
    credits: 50,
    icon: <Crown className="w-5 h-5 text-amber-400" />,
    color: "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/10",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    description: "For full bands, choirs, or complex multi-vocalist productions with up to 6 performers.",
    features: [
      "Up to 6 isolated vocal stems",
      "Full per-character lip sync accuracy",
      "Speaker diarisation via AI",
      "Manual stem reassignment",
    ],
    example: "e.g. Band with lead singer + 2 backing vocalists + harmonies",
  },
];

export function MultiVocalUpsellModal({
  open,
  onClose,
  jobId,
  stemCount,
  currentCredits,
  onUpgraded,
}: MultiVocalUpsellModalProps) {
  const [selected, setSelected] = useState<"duet" | "ensemble">(
    stemCount <= 2 ? "duet" : "ensemble"
  );

  const activateMutation = trpc.musicVideo.activateMultiVocalMode.useMutation({
    onSuccess: (data) => {
      toast.success(`${selected === "duet" ? "Duet" : "Ensemble"} Mode activated — vocal stems assigned`);
      onUpgraded?.(selected);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedTier = TIERS.find((t) => t.key === selected)!;
  const canAfford = currentCredits >= selectedTier.credits;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[rgba(12,8,20,0.98)] border border-purple-500/30 text-white rounded-2xl shadow-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Multi-Vocal Track Detected
              </DialogTitle>
              <DialogDescription className="text-xs text-white/40 mt-0.5">
                {stemCount} vocal stems found — upgrade for per-character lip sync
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Unique value proposition */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/70 leading-relaxed">
            <span className="text-white font-semibold">No other platform does this.</span>{" "}
            Each performer gets their own isolated vocal track. Zara lip syncs to Zara's voice.
            Your male vocalist lip syncs to his voice. The original full mix plays as the final audio.
          </p>
        </div>

        {/* Tier selector */}
        <div className="space-y-2 mb-4">
          {TIERS.map((tier) => (
            <button
              key={tier.key}
              onClick={() => setSelected(tier.key)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 ${
                selected === tier.key
                  ? tier.color + " ring-1 ring-purple-500/30"
                  : "border-white/10 bg-white/5 hover:bg-white/8"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selected === tier.key ? "bg-white/10" : "bg-white/5"
                }`}>
                  {tier.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{tier.label}</span>
                    <Badge className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0 border ${tier.badgeColor}`}>
                      {tier.badge}
                    </Badge>
                    <span className="ml-auto flex items-center gap-1 text-xs font-bold text-white/70">
                      <Coins className="w-3 h-3 text-amber-400" />
                      {tier.credits} credits
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-2">{tier.description}</p>
                  <p className="text-[10px] text-white/30 italic">{tier.example}</p>
                  {selected === tier.key && (
                    <ul className="mt-2 space-y-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-white/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Credit balance check */}
        {!canAfford && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
            <Coins className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">
              You need {selectedTier.credits} credits but have {currentCredits}.{" "}
              <span className="text-white/50">Top up to continue.</span>
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-1 text-white/50 hover:text-white/70 hover:bg-white/5"
          >
            Skip for now
          </Button>
          <Button
            size="sm"
            onClick={() => activateMutation.mutate({ jobId, mode: selected })}
            disabled={!canAfford || activateMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold border-0"
          >
            {activateMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                Activating…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Activate {selectedTier.label} — {selectedTier.credits} credits
              </span>
            )}
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-white/25 text-center mt-2">
          Credits are deducted from your balance. The original full mix is always used as the final audio track.
        </p>
      </DialogContent>
    </Dialog>
  );
}
