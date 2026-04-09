/**
 * QuickTopUpModal — inline credit pack selector that opens from the low credit banner.
 *
 * Shows 3 standard packs with credits, price, and cost-per-video helper text.
 * Dispatches Stripe checkout in a new tab without navigating away.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Zap, Check, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pack {
  key: "starter" | "creator" | "pro";
  label: string;
  credits: number;
  price: string;
  priceGBP: number;
  videosApprox: number; // approx 1-min videos (30 credits each)
  badge?: string;
  highlight?: boolean;
}

const PACKS: Pack[] = [
  {
    key: "starter",
    label: "Starter Pack",
    credits: 300,
    price: "£9",
    priceGBP: 9,
    videosApprox: 10,
  },
  {
    key: "creator",
    label: "Creator Pack",
    credits: 900,
    price: "£24",
    priceGBP: 24,
    videosApprox: 30,
    badge: "Best value",
    highlight: true,
  },
  {
    key: "pro",
    label: "Pro Pack",
    credits: 2400,
    price: "£59",
    priceGBP: 59,
    videosApprox: 80,
  },
];

interface QuickTopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current balance — used to highlight the recommended pack */
  currentBalance?: number;
  /** Estimated cost of the next video — used to pre-select the right pack */
  estimatedCost?: number;
}

export function QuickTopUpModal({
  open,
  onOpenChange,
  currentBalance = 0,
  estimatedCost,
}: QuickTopUpModalProps) {
  // Pre-select the smallest pack that covers the shortfall, defaulting to creator
  const getDefaultPack = (): Pack["key"] => {
    if (!estimatedCost) return "creator";
    const shortfall = estimatedCost - currentBalance;
    if (shortfall <= 0) return "creator";
    const covering = PACKS.find(p => p.credits >= shortfall);
    return covering?.key ?? "pro";
  };

  const [selectedPack, setSelectedPack] = useState<Pack["key"]>(getDefaultPack);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const checkoutMutation = trpc.billing.createCreditCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        toast.info("Opening secure checkout…", {
          description: "Complete your purchase in the new tab, then return here.",
          duration: 5000,
        });
        window.open(data.checkoutUrl, "_blank");
      }
      setIsRedirecting(false);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Couldn't open checkout", {
        description: err.message || "Please try again or visit the Credits page.",
      });
      setIsRedirecting(false);
    },
  });

  const handlePurchase = () => {
    setIsRedirecting(true);
    checkoutMutation.mutate({
      pack: selectedPack,
      origin: window.location.origin,
    });
  };

  const selected = PACKS.find(p => p.key === selectedPack)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">Top up your Credits</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {estimatedCost && estimatedCost > currentBalance
              ? `You need ${estimatedCost - currentBalance} more Credits to create this video. Choose a pack to continue.`
              : "Choose a credit pack to keep creating without interruption."}
          </DialogDescription>
        </DialogHeader>

        {/* Balance indicator */}
        {currentBalance > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Current balance: <strong className="text-foreground">{currentBalance} Credits</strong></span>
          </div>
        )}

        {/* Pack selector */}
        <div className="space-y-2">
          {PACKS.map((pack) => (
            <button
              key={pack.key}
              onClick={() => setSelectedPack(pack.key)}
              className={cn(
                "w-full rounded-lg border p-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedPack === pack.key
                  ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Selection indicator */}
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    selectedPack === pack.key
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}>
                    {selectedPack === pack.key && (
                      <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{pack.label}</span>
                      {pack.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-amber-500/20">
                          {pack.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{pack.credits.toLocaleString()} Credits</span>
                      {" · "}≈ {pack.videosApprox} standard videos
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-foreground">{pack.price}</span>
                  <p className="text-[10px] text-muted-foreground">
                    £{(pack.priceGBP / pack.credits * 30).toFixed(2)}/video
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Cost-per-video helper */}
        <p className="text-[11px] text-muted-foreground text-center">
          Based on a standard 1-minute video (30 Credits). Longer videos or cinematic scenes use more Credits.
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isRedirecting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handlePurchase}
            disabled={isRedirecting || checkoutMutation.isPending}
          >
            {isRedirecting || checkoutMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening checkout…
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Get {selected.credits.toLocaleString()} Credits · {selected.price}
              </>
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center -mt-1">
          Secure checkout via Stripe · Credits added instantly after payment
        </p>
      </DialogContent>
    </Dialog>
  );
}
