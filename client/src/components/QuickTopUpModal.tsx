/**
 * QuickTopUpModal — Option A credit pack selector.
 *
 * Six tiers: Spark / Boost / Creator / Studio / Pro / Elite
 * Pricing: 8.0p → 5.0p per credit (profitable at all tiers).
 * Smart auto-selection: highlights the smallest pack that covers the shortfall.
 * Transparent cost breakdown: shows scenes covered, cost per scene, and margin note.
 */
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Zap, Check, Loader2, ExternalLink, TrendingUp, AlertCircle } from "@/lib/icons";
import { cn } from "@/lib/utils";

// ── Option A pack definitions (must match server/products.ts TOPUP_PACKS) ──────
const PACKS = [
  {
    key: "spark" as const,
    name: "Spark",
    credits: 50,
    priceGbp: 3.99,
    priceDisplay: "£3.99",
    bestFor: "Quick top-up",
    scenesApprox: 3,        // 50 ÷ 15 cr/scene ≈ 3
    badge: null as string | null,
    perCreditPence: 8.0,
  },
  {
    key: "boost" as const,
    name: "Boost",
    credits: 150,
    priceGbp: 9.99,
    priceDisplay: "£9.99",
    bestFor: "Short video top-up",
    scenesApprox: 10,       // 150 ÷ 15 ≈ 10
    badge: null as string | null,
    perCreditPence: 6.7,
  },
  {
    key: "creator" as const,
    name: "Creator",
    credits: 350,
    priceGbp: 21.99,
    priceDisplay: "£21.99",
    bestFor: "Full short video",
    scenesApprox: 23,       // 350 ÷ 15 ≈ 23
    badge: "Best value" as string | null,
    perCreditPence: 6.3,
  },
  {
    key: "studio" as const,
    name: "Studio",
    credits: 750,
    priceGbp: 44.99,
    priceDisplay: "£44.99",
    bestFor: "2 full videos",
    scenesApprox: 50,       // 750 ÷ 15 = 50
    badge: null as string | null,
    perCreditPence: 6.0,
  },
  {
    key: "pro" as const,
    name: "Pro",
    credits: 1500,
    priceGbp: 84.99,
    priceDisplay: "£84.99",
    bestFor: "4–5 videos",
    scenesApprox: 100,      // 1500 ÷ 15 = 100
    badge: null as string | null,
    perCreditPence: 5.7,
  },
  {
    key: "elite" as const,
    name: "Elite",
    credits: 4000,
    priceGbp: 199.99,
    priceDisplay: "£199.99",
    bestFor: "10+ videos",
    scenesApprox: 267,      // 4000 ÷ 15 ≈ 267
    badge: "Best per-credit" as string | null,
    perCreditPence: 5.0,
  },
] as const;

type PackKey = typeof PACKS[number]["key"];

/** Returns the smallest pack that fully covers the shortfall, or "creator" as default. */
function getRecommendedPack(shortfall: number): PackKey {
  if (shortfall <= 0) return "creator";
  const covering = PACKS.find(p => p.credits >= shortfall);
  return covering?.key ?? "elite";
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
  const shortfall = estimatedCost ? Math.max(0, estimatedCost - currentBalance) : 0;
  const recommendedKey = getRecommendedPack(shortfall);

  const [selectedKey, setSelectedKey] = useState<PackKey>(recommendedKey);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const selectedPack = PACKS.find(p => p.key === selectedKey)!;

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
    checkoutMutation.mutate({
      pack: selectedKey,
      origin: window.location.origin,
    });
  }, [selectedKey, checkoutMutation]);

  // After purchase, how many credits will the user have?
  const balanceAfter = currentBalance + selectedPack.credits;
  const coversShortfall = balanceAfter >= (estimatedCost ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[--color-gold]/15 flex items-center justify-center">
              <Zap className="h-4 w-4 text-[--color-gold]" />
            </div>
            <DialogTitle className="text-lg font-semibold">Top up your Credits</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {shortfall > 0
              ? `You need ${shortfall.toLocaleString()} more credits to build this video. The highlighted pack covers your shortfall.`
              : "Choose a credit pack to keep creating without interruption."}
          </DialogDescription>
        </DialogHeader>

        {/* Balance + shortfall summary */}
        {estimatedCost && estimatedCost > 0 && (
          <div className={cn(
            "rounded-lg border px-4 py-3 text-sm space-y-1.5",
            shortfall > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-green-500/30 bg-green-500/5"
          )}>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your balance</span>
              <span className="font-medium text-foreground">{currentBalance.toLocaleString()} credits</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>This video costs</span>
              <span className="font-medium text-foreground">{estimatedCost.toLocaleString()} credits</span>
            </div>
            {shortfall > 0 && (
              <div className="flex justify-between text-xs border-t border-amber-500/20 pt-1.5">
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Shortfall
                </span>
                <span className="font-bold text-amber-400">{shortfall.toLocaleString()} credits</span>
              </div>
            )}
          </div>
        )}

        {/* Pack grid */}
        <div className="grid grid-cols-1 gap-2">
          {PACKS.map((pack) => {
            const isSelected = selectedKey === pack.key;
            const isRecommended = pack.key === recommendedKey && shortfall > 0;
            const covers = pack.credits >= shortfall;

            return (
              <button
                key={pack.key}
                onClick={() => setSelectedKey(pack.key)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                    : isRecommended
                      ? "border-[--color-gold]/50 bg-[--color-gold]/5 hover:border-[--color-gold]/70"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Radio + name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                    )}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{pack.name}</span>
                        {pack.badge && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30">
                            {pack.badge}
                          </Badge>
                        )}
                        {isRecommended && !isSelected && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-400 border-amber-500/30">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">{pack.credits.toLocaleString()} credits</span>
                        {" · "}~{pack.scenesApprox} scenes
                        {" · "}{pack.bestFor}
                      </p>
                    </div>
                  </div>

                  {/* Price + per-credit */}
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-foreground">{pack.priceDisplay}</span>
                    <p className="text-[10px] text-muted-foreground">{pack.perCreditPence.toFixed(1)}p / credit</p>
                    {!covers && shortfall > 0 && (
                      <p className="text-[10px] text-amber-400/70 mt-0.5">
                        +{(shortfall - pack.credits).toLocaleString()} still short
                      </p>
                    )}
                    {covers && shortfall > 0 && (
                      <p className="text-[10px] text-green-400/80 mt-0.5">
                        Covers shortfall ✓
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* After-purchase preview */}
        {estimatedCost && estimatedCost > 0 && (
          <div className={cn(
            "rounded-md border px-3 py-2 text-xs flex items-center justify-between",
            coversShortfall
              ? "border-green-500/25 bg-green-500/5 text-green-400"
              : "border-amber-500/25 bg-amber-500/5 text-amber-400"
          )}>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              After purchase: {balanceAfter.toLocaleString()} credits
            </span>
            <span className="font-medium">
              {coversShortfall ? "Ready to build ✓" : `Still ${(estimatedCost - balanceAfter).toLocaleString()} short`}
            </span>
          </div>
        )}

        {/* Cost transparency note */}
        <p className="text-[11px] text-muted-foreground text-center">
          1 scene ≈ 8 seconds of video · Short videos use 15 cr/scene · Longer videos use 18–20 cr/scene
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
                Get {selectedPack.credits.toLocaleString()} Credits · {selectedPack.priceDisplay}
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
