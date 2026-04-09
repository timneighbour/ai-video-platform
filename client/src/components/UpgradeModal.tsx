import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Infinity, X } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: "limit" | "download" | "milestone" | "watermark";
  videosCreated?: number;
}

const TRIGGER_CONTENT = {
  limit: {
    emoji: "🚀",
    headline: "You've hit your video limit",
    subline: "Unlock unlimited videos with Pro",
    body: "You're on a roll! Upgrade to Pro for unlimited video creation, no watermarks, and faster rendering.",
  },
  download: {
    emoji: "⬇️",
    headline: "Remove the watermark",
    subline: "Download clean, watermark-free videos",
    body: "Upgrade to Pro to download your videos without the WizVid watermark and in higher quality.",
  },
  milestone: {
    emoji: "🎉",
    headline: "You're on a roll!",
    subline: "Unlock unlimited videos with Pro",
    body: "You've created multiple videos — you're clearly a creator! Upgrade to Pro for unlimited creation.",
  },
  watermark: {
    emoji: "✨",
    headline: "Go watermark-free",
    subline: "Professional videos, no branding",
    body: "Upgrade to Pro to remove the WizVid watermark from all your videos and unlock 4K quality.",
  },
};

const PRO_FEATURES = [
  { icon: <Infinity className="w-4 h-4" />, text: "Unlimited videos per month" },
  { icon: <Sparkles className="w-4 h-4" />, text: "No watermark on exports" },
  { icon: <Zap className="w-4 h-4" />, text: "Faster generation speed" },
  { icon: <Sparkles className="w-4 h-4" />, text: "4K quality output" },
];

export default function UpgradeModal({ open, onClose, trigger = "milestone", videosCreated }: UpgradeModalProps) {
  const [, navigate] = useLocation();
  const content = TRIGGER_CONTENT[trigger];

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

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
          <div className="text-4xl mb-3" aria-hidden="true">{content.emoji}</div>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white leading-tight">
              {content.headline}
            </DialogTitle>
            <p className="text-purple-300 font-semibold text-sm mt-1">{content.subline}</p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <p className="text-white/60 text-sm mb-5 leading-relaxed">{content.body}</p>

          {/* Pro features */}
          <div className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <span className="text-white/80">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Pricing callout */}
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-4 mb-5 text-center">
            <span className="text-white/50 text-sm">Pro plan from </span>
            <span className="text-white font-black text-xl">£49</span>
            <span className="text-white/50 text-sm">/month</span>
            <div className="text-green-400 text-xs mt-1 font-medium">Save 33% with annual billing</div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-bold py-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />Unlock unlimited videos with Pro
            </Button>
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
