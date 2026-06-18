/**
 * InsufficientCreditsModal — shown when a user tries to create a video
 * but doesn't have enough Credits.
 *
 * Offers two paths:
 *  1. Get Credits → navigates to /credits
 *  2. Reduce Quality → calls onReduceQuality() to downgrade to standard render
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ArrowDownCircle, ExternalLink } from "@/lib/icons";
import { Link } from "wouter";

interface InsufficientCreditsModalProps {
  open: boolean;
  onClose: () => void;
  /** Credits required for the current operation */
  required: number;
  /** User's current credit balance */
  balance: number;
  /** Called when user chooses to reduce quality (removes cinematic scenes) */
  onReduceQuality?: () => void;
  /** Whether the "Reduce Quality" option is available (e.g. if cinematic scenes are selected) */
  canReduceQuality?: boolean;
}

export default function InsufficientCreditsModal({
  open,
  onClose,
  required,
  balance,
  onReduceQuality,
  canReduceQuality = false,
}: InsufficientCreditsModalProps) {
  const shortfall = required - balance;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-900/40 border border-red-800/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-white text-lg">Not enough Credits</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            This video needs <strong className="text-white">{required} Credits</strong> to create.
            You have <strong className="text-white">{balance} Credits</strong> — you&apos;re{" "}
            <strong className="text-red-300">{shortfall} Credits short</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Primary: Get Credits */}
          <Link href="/credits">
            <Button
              className="w-full bg-[--color-gold] hover:bg-[--color-gold]/80 text-white font-semibold gap-2"
              onClick={onClose}
            >
              <Zap className="w-4 h-4" />
              Get More Credits
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </Link>

          {/* Secondary: Reduce Quality (only if cinematic scenes are selected) */}
          {canReduceQuality && onReduceQuality && (
            <Button
              variant="outline"
              className="w-full border-border text-foreground/80 hover:bg-secondary bg-transparent gap-2"
              onClick={() => {
                onReduceQuality();
                onClose();
              }}
            >
              <ArrowDownCircle className="w-4 h-4 text-muted-foreground" />
              Reduce Quality (Standard only)
            </Button>
          )}

          {/* Dismiss */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground/70 hover:text-foreground/80 hover:bg-card"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/50 text-center mt-2">
          Credits never expire · Storyboard generation is always free
        </p>
      </DialogContent>
    </Dialog>
  );
}
