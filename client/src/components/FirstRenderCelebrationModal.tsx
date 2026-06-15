/**
 * FirstRenderCelebrationModal
 * 
 * Shown after a user's first successful render. Fires once per account
 * (tracked via localStorage key "wiz_first_render_celebrated").
 * 
 * Includes: premium success animation, download CTA, share CTA, create another CTA.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Sparkles, X, Star } from "@/lib/icons";

interface FirstRenderCelebrationModalProps {
  videoUrl: string | null;
  videoTitle?: string;
  onClose: () => void;
  onDownload?: () => void;
  onCreateAnother?: () => void;
}

const STORAGE_KEY = "wiz_first_render_celebrated";

export function hasSeenFirstRenderCelebration(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markFirstRenderCelebrationSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore
  }
}

export default function FirstRenderCelebrationModal({
  videoUrl,
  videoTitle,
  onClose,
  onDownload,
  onCreateAnother,
}: FirstRenderCelebrationModalProps) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Mark as seen when modal opens
    markFirstRenderCelebrationSeen();
  }, []);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleShare = async () => {
    const shareUrl = videoUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoTitle || "My WIZ AI Video",
          text: "I just created an AI music video with WIZ AI 🎬✨",
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden border-0"
        style={{
          background: "linear-gradient(145deg, #0c0a12, #14101e)",
          border: "1px solid rgba(201,168,76,0.35)",
          boxShadow: "0 0 60px rgba(201,168,76,0.15), 0 25px 50px rgba(0,0,0,0.8)",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gold glow header */}
        <div className="relative pt-10 pb-6 px-8 text-center overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(201,168,76,0.3) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          {/* Star burst icon */}
          <div className="relative mx-auto mb-5 w-20 h-20">
            {/* Outer pulse ring */}
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(201,168,76,0.15)", animationDuration: "2s" }}
            />
            {/* Inner circle */}
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.08))",
                border: "1px solid rgba(201,168,76,0.5)",
                boxShadow: "0 0 30px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <Star className="w-9 h-9" style={{ color: "#c9a84c", filter: "drop-shadow(0 0 8px #c9a84c)" }} />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
            Your first WIZ AI creation is complete
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {videoTitle
              ? `"${videoTitle}" is ready. `
              : "Your video is ready. "}
            You've just joined a new generation of AI creators.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px mx-8" style={{ background: "rgba(201,168,76,0.12)" }} />

        {/* Action buttons */}
        <div className="px-8 py-6 space-y-3">
          {/* Download — primary */}
          {videoUrl && onDownload && (
            <Button
              className="w-full h-12 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #b8892a, #4a3010)",
                boxShadow: "0 4px 20px rgba(184,137,42,0.35)",
              }}
              onClick={() => { onDownload(); }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Your Video
            </Button>
          )}

          {/* Share */}
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-semibold border-[--color-gold]/30 text-[--color-gold] hover:bg-[--color-gold]/10"
            style={{ background: "rgba(201,168,76,0.06)" }}
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? "Link Copied!" : "Share Your Creation"}
          </Button>

          {/* Create another */}
          <Button
            variant="ghost"
            className="w-full h-11 text-sm text-muted-foreground hover:text-white hover:bg-white/5"
            onClick={() => { handleClose(); onCreateAnother?.(); }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create Another Video
          </Button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-muted-foreground/50 text-xs">
            Share your creation and tag{" "}
            <span className="text-[--color-gold]/60">@wizai</span> — we'd love to feature it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
