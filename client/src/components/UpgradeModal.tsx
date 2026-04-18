import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Zap, Infinity, X, Rocket, Download, PartyPopper } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: "limit" | "download" | "milestone" | "watermark";
  videosCreated?: number;
}

const TRIGGER_CONTENT = {
  limit: {
    icon: Rocket,
    headline: "You've hit your video limit",
    subline: "Unlock unlimited videos with Creator",
    body: "You're on a roll! Upgrade to Creator for 15 renders/month, no watermarks, and faster rendering.",
  },
  download: {
    icon: Download,
    headline: "Remove the watermark",
    subline: "Download clean, watermark-free videos",
    body: "Upgrade to Creator or above to download your videos without the WIZ AI watermark and in higher quality.",
  },
  milestone: {
    icon: PartyPopper,
    headline: "You're on a roll!",
    subline: "Unlock more with Creator",
    body: "You've created multiple videos — you're clearly a creator! Upgrade to Creator for 15 renders/month and no watermark.",
  },
  watermark: {
    icon: Sparkles,
    headline: "Go watermark-free",
    subline: "Professional videos, no branding",
    body: "Upgrade to Creator or above to remove the WIZ AI watermark from all your videos and unlock 4K quality.",
  },
};

const CREATOR_FEATURES = [
  { icon: <Infinity className="w-4 h-4" />, text: "15 renders/month included" },
  { icon: <Sparkles className="w-4 h-4" />, text: "No watermark on exports" },
  { icon: <Zap className="w-4 h-4" />, text: "Standard, HD & 4K quality" },
  { icon: <Sparkles className="w-4 h-4" />, text: "Character consistency" },
];

export default function UpgradeModal({ open, onClose, trigger = "milestone" }: UpgradeModalProps) {
  const content = TRIGGER_CONTENT[trigger];
  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-[#0f0f1a] border border-white/10 text-white rounded-2xl p-0 overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-pink-500/20 via-purple-600/20 to-cyan-500/10 px-6 pt-6 pb-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="mb-3" aria-hidden="true">
            <Icon className="w-9 h-9 text-[--color-gold]" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white leading-tight">
              {content.headline}
            </DialogTitle>
            <p className="text-[--color-gold] font-semibold text-sm mt-1">{content.subline}</p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <p className="text-white/60 text-sm mb-5 leading-relaxed">{content.body}</p>

          {/* Creator features */}
          <div className="space-y-2.5 mb-6">
            {CREATOR_FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-[--color-gold]/15 text-[--color-gold] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <span className="text-white/80">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Pricing callout */}
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-[--color-gold]/30 rounded-xl p-4 mb-5 text-center">
            <span className="text-white/50 text-sm">Creator plan from </span>
            <span className="text-white font-black text-xl">£35</span>
            <span className="text-white/50 text-sm">/month</span>
            <div className="text-[--color-silver] text-xs mt-1 font-medium">Save 20% with annual billing</div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <a
              href="/pricing"
              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-bold py-3 px-4 transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" />Unlock more with Creator
            </a>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/60 text-sm transition-colors py-1"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
