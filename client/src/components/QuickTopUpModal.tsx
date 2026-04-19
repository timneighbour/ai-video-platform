/**
 * QuickTopUpModal — credit pack selector with optional custom amount slider.
 *
 * Shows 3 standard packs + a custom slider (£5–£250) for flexible top-ups.
 * Dispatches Stripe checkout in a new tab without navigating away.
 */
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Zap, Check, Loader2, ExternalLink, SlidersHorizontal } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface Pack {
  key: "starter" | "creator" | "pro" | "custom";
  label: string;
  credits: number;
  price: string;
  priceGBP: number;
  videosApprox: number;
  badge?: string;
  highlight?: boolean;
}

const STANDARD_PACKS: Pack[] = [
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

/** Credits per £1 at each tier — higher spend = better rate */
function creditsForAmount(gbp: number): number {
  if (gbp >= 50) return Math.round(gbp * 40.7); // ~£59/2400cr rate
  if (gbp >= 20) return Math.round(gbp * 37.5); // ~£24/900cr rate
  return Math.round(gbp * 33.3);                // ~£9/300cr rate
}

interface QuickTopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance?: number;
  estimatedCost?: number;
}

export function QuickTopUpModal({
  open,
  onOpenChange,
  currentBalance = 0,
  estimatedCost,
}: QuickTopUpModalProps) {
  const getDefaultPack = (): Pack["key"] => {
    if (!estimatedCost) return "creator";
    const shortfall = estimatedCost - currentBalance;
    if (shortfall <= 0) return "creator";
    const covering = STANDARD_PACKS.find(p => p.credits >= shortfall);
    return covering?.key ?? "pro";
  };

  const [selectedPack, setSelectedPack] = useState<Pack["key"]>(getDefaultPack);
  const [customAmount, setCustomAmount] = useState(25);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const customCredits = creditsForAmount(customAmount);
  const customVideos = Math.floor(customCredits / 30);

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

  const handlePurchase = useCallback(() => {
    setIsRedirecting(true);
    // For custom amounts, pick the closest standard pack key by price tier
    let packKey: "starter" | "creator" | "pro" = "starter";
    if (customAmount >= 50) packKey = "pro";
    else if (customAmount >= 20) packKey = "creator";

    const packToUse = selectedPack === "custom" ? packKey : selectedPack as "starter" | "creator" | "pro";
    checkoutMutation.mutate({
      pack: packToUse,
      origin: window.location.origin,
    });
  }, [selectedPack, customAmount, checkoutMutation]);

  const selected = selectedPack === "custom"
    ? null
    : STANDARD_PACKS.find(p => p.key === selectedPack)!;

  const ctaCredits = selected ? selected.credits : customCredits;
  const ctaPrice = selected ? selected.price : `£${customAmount}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[--color-gold]/15 flex items-center justify-center">
              <Zap className="h-4 w-4 text-[--color-gold]" />
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
            <Zap className="h-3 w-3 text-[--color-gold]" />
            <span>Current balance: <strong className="text-foreground">{currentBalance} Credits</strong></span>
          </div>
        )}

        {/* Standard pack selector */}
        <div className="space-y-2">
          {STANDARD_PACKS.map((pack) => (
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
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    selectedPack === pack.key
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}>
                    {selectedPack === pack.key && (
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{pack.label}</span>
                      {pack.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30">
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

          {/* Custom amount option */}
          <button
            onClick={() => setSelectedPack("custom")}
            className={cn(
              "w-full rounded-lg border p-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedPack === "custom"
                ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={cn(
                "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                selectedPack === "custom"
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40"
              )}>
                {selectedPack === "custom" && (
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Custom Amount</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-foreground">£{customAmount}</span>
                <p className="text-[10px] text-muted-foreground">{customCredits.toLocaleString()} Credits</p>
              </div>
            </div>

            {selectedPack === "custom" && (
              <div className="mt-3 px-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                <Slider
                  min={5}
                  max={250}
                  step={5}
                  value={[customAmount]}
                  onValueChange={([v]) => setCustomAmount(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>£5</span>
                  <span className="text-foreground font-medium">≈ {customVideos} standard videos</span>
                  <span>£250</span>
                </div>
              </div>
            )}
          </button>
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
                Get {ctaCredits.toLocaleString()} Credits · {ctaPrice}
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
