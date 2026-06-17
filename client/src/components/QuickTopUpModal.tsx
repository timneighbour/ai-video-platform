/**
 * QuickTopUpModal — Credit top-up with subscription upsell.
 *
 * Two tabs:
 *   1. "Top Up Credits" — six Option A packs (Spark → Elite)
 *   2. "Subscribe & Save" — Creator (£35/mo) and Studio (£99/mo) plans
 *
 * Smart auto-selection: highlights the smallest pack that covers the shortfall.
 * Subscription tab shows value comparison ("Best for one-off" vs "Best for regular creators").
 */
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { mp } from "@/lib/mixpanel";
import { Zap, Check, Loader2, ExternalLink, TrendingUp, AlertCircle, Crown, Sparkles, Star } from "@/lib/icons";
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
    scenesApprox: 3,
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
    scenesApprox: 10,
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
    scenesApprox: 23,
    badge: "Best value" as string | null,
    perCreditPence: 6.3,
  },
  {
    key: "studio" as const,
    name: "Pro",
    credits: 750,
    priceGbp: 44.99,
    priceDisplay: "£44.99",
    bestFor: "2 full videos",
    scenesApprox: 50,
    badge: null as string | null,
    perCreditPence: 6.0,
  },
  {
    key: "pro" as const,
    name: "Pro Plus",
    credits: 1500,
    priceGbp: 84.99,
    priceDisplay: "£84.99",
    bestFor: "4–5 videos",
    scenesApprox: 100,
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
    scenesApprox: 267,
    badge: "Best per-credit" as string | null,
    perCreditPence: 5.0,
  },
] as const;
type PackKey = typeof PACKS[number]["key"];

// ── Subscription plans shown in the upsell tab ──────────────────────────────
const SUB_PLANS = [
  {
    id: "creator" as const,
    name: "Creator",
    monthlyPrice: 35,
    priceDisplay: "£35/mo",
    annualDisplay: "£350/yr",
    creditsPerMonth: 990,
    buildsPerMonth: 15,
    tagline: "Best for regular creators",
    badge: "Most Popular" as string | null,
    highlight: true,
    perks: [
      "15 videos per month",
      "Up to 11 scenes per video",
      "4K quality included",
      "WizSync™ character lock",
      "Priority build queue",
      "20% WizSound™ discount",
    ],
    ctaLabel: "Subscribe — Creator",
  },
  {
    id: "studio" as const,
    name: "Pro",
    monthlyPrice: 99,
    priceDisplay: "£99/mo",
    annualDisplay: "£990/yr",
    creditsPerMonth: 2160,
    buildsPerMonth: 40,
    tagline: "Best for brands & agencies",
    badge: null as string | null,
    highlight: false,
    perks: [
      "40 videos per month",
      "Up to 12 scenes per video",
      "4K quality included",
      "Full API access",
      "Fastest build speed",
      "Dedicated support",
    ],
    ctaLabel: "Subscribe — Studio",
  },
];

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
  const [activeTab, setActiveTab] = useState<"packs" | "subscribe">("packs");
  const [selectedSubPlan, setSelectedSubPlan] = useState<"creator" | "studio">("creator");
  const [subBillingInterval, setSubBillingInterval] = useState<"monthly" | "annual">("monthly");

  const selectedPack = PACKS.find(p => p.key === selectedKey)!;
  const balanceAfter = currentBalance + selectedPack.credits;
  const coversShortfall = balanceAfter >= (estimatedCost ?? 0);

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

  const subscriptionMutation = trpc.billing.createSubscriptionCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        toast.info("Opening subscription checkout…", {
          description: "Complete your subscription in the new tab.",
          duration: 5000,
        });
        window.open(data.checkoutUrl, "_blank");
      }
      setIsRedirecting(false);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Couldn't open checkout", {
        description: err.message || "Please try again or visit the Pricing page.",
      });
      setIsRedirecting(false);
    },
  });

  const handlePurchase = useCallback(() => {
    const pack = PACKS.find((p) => p.key === selectedKey);
    if (pack) mp.checkoutStarted(`topup_${pack.key}`, pack.priceGbp);
    setIsRedirecting(true);
    checkoutMutation.mutate({
      pack: selectedKey,
      origin: window.location.origin,
    });
  }, [selectedKey, checkoutMutation]);

  const handleSubscribe = useCallback(() => {
    mp.checkoutStarted(`subscribe_${selectedSubPlan}_${subBillingInterval}`);
    setIsRedirecting(true);
    subscriptionMutation.mutate({
      plan: selectedSubPlan,
      billingInterval: subBillingInterval,
      origin: window.location.origin,
    });
  }, [selectedSubPlan, subBillingInterval, subscriptionMutation]);

  const isLoading = isRedirecting || checkoutMutation.isPending || subscriptionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[--color-gold]/15 flex items-center justify-center">
              <Zap className="h-4 w-4 text-[--color-gold]" />
            </div>
            <DialogTitle className="text-lg font-semibold">Get More Credits</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {shortfall > 0
              ? `You need ${shortfall.toLocaleString()} more credits to build this video.`
              : "Top up credits or subscribe for better value."}
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

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => { setActiveTab("packs"); mp.track("TopUp Modal Tab Changed", { tab: "packs" }); }}
            className={cn(
              "flex-1 py-2 text-xs font-semibold transition-colors",
              activeTab === "packs"
                ? "bg-[--color-gold]/15 text-[--color-gold]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Zap className="h-3 w-3 inline mr-1.5" />
            Top Up Credits
          </button>
          <button
            onClick={() => { setActiveTab("subscribe"); mp.track("TopUp Modal Tab Changed", { tab: "subscribe" }); }}
            className={cn(
              "flex-1 py-2 text-xs font-semibold transition-colors border-l border-border",
              activeTab === "subscribe"
                ? "bg-purple-500/15 text-purple-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Crown className="h-3 w-3 inline mr-1.5" />
            Subscribe & Save
          </button>
        </div>

        {/* ── TAB: Credit Packs ── */}
        {activeTab === "packs" && (
          <>
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
                      "w-full rounded-lg border p-3 text-left transition-all",
                      isSelected
                        ? "border-[--color-gold]/70 bg-[--color-gold]/8 ring-1 ring-[--color-gold]/30"
                        : isRecommended
                          ? "border-amber-500/50 bg-amber-500/5 hover:border-amber-500/70"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
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
                            <span className="text-sm font-bold text-[--color-gold]">{pack.credits.toLocaleString()} cr</span>
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
                            ~{pack.scenesApprox} scenes · {pack.bestFor}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-foreground">{pack.priceDisplay}</span>
                        <p className="text-[10px] text-muted-foreground">{pack.perCreditPence.toFixed(1)}p / credit</p>
                        {!covers && shortfall > 0 && (
                          <p className="text-[10px] text-amber-400/70 mt-0.5">
                            +{(shortfall - pack.credits).toLocaleString()} still short
                          </p>
                        )}
                        {covers && shortfall > 0 && (
                          <p className="text-[10px] text-green-400/80 mt-0.5">Covers shortfall ✓</p>
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

            <p className="text-[11px] text-muted-foreground text-center">
              1 scene ≈ 8 seconds of video · Short videos use 15 cr/scene · Longer videos use 18–20 cr/scene
            </p>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handlePurchase} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Opening checkout…</>
                ) : (
                  <><ExternalLink className="h-4 w-4" />Get {selectedPack.credits.toLocaleString()} Credits · {selectedPack.priceDisplay}</>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center -mt-1">
              Secure checkout via Stripe · Credits added instantly after payment
            </p>

            {/* Nudge to subscribe tab */}
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-purple-300">Regular creator?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">A Creator plan gives 990 credits/mo for just £35 — better value than packs.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-purple-400 border-purple-500/30 hover:bg-purple-500/10 text-xs"
                onClick={() => { setActiveTab("subscribe"); mp.track("TopUp Modal Tab Changed", { tab: "subscribe" }); }}
              >
                See plans
              </Button>
            </div>
          </>
        )}

        {/* ── TAB: Subscribe & Save ── */}
        {activeTab === "subscribe" && (
          <>
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setSubBillingInterval("monthly")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                  subBillingInterval === "monthly"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setSubBillingInterval("annual")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1",
                  subBillingInterval === "annual"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-green-500/15 text-green-400 border-green-500/30">
                  2 months free
                </Badge>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 gap-3">
              {SUB_PLANS.map((plan) => {
                const isSelected = selectedSubPlan === plan.id;
                const displayPrice = subBillingInterval === "annual"
                  ? `£${Math.round(plan.monthlyPrice * 10 / 12)}/mo`
                  : plan.priceDisplay;
                const billingNote = subBillingInterval === "annual"
                  ? `Billed ${plan.annualDisplay}`
                  : "Billed monthly";
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedSubPlan(plan.id)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      isSelected
                        ? plan.highlight
                          ? "border-purple-500/60 bg-purple-500/8 ring-1 ring-purple-500/30"
                          : "border-border bg-muted/20 ring-1 ring-border"
                        : "border-border bg-card hover:border-purple-500/30 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-foreground">{plan.name}</span>
                          {plan.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/15 text-purple-400 border-purple-500/30">
                              {plan.badge}
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{plan.tagline}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold text-foreground">{displayPrice}</span>
                        <p className="text-[10px] text-muted-foreground">{billingNote}</p>
                        <p className="text-[10px] text-purple-400 mt-0.5">{plan.creditsPerMonth.toLocaleString()} cr/mo</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {plan.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Star className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Value comparison callout */}
            <div className="rounded-lg border border-[--color-gold]/20 bg-[--color-gold]/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-[--color-gold] mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Why subscribe vs top up?
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Credit packs</p>
                  <p className="text-muted-foreground">5.0–8.0p per credit</p>
                  <p className="text-muted-foreground">Best for one-off projects</p>
                  <p className="text-muted-foreground">No monthly commitment</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-purple-300">Creator plan</p>
                  <p className="text-purple-400">3.5p per credit</p>
                  <p className="text-purple-400">Best for regular creators</p>
                  <p className="text-purple-400">990 credits every month</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Opening checkout…</>
                ) : (
                  <><ExternalLink className="h-4 w-4" />{SUB_PLANS.find(p => p.id === selectedSubPlan)?.ctaLabel}</>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center -mt-1">
              Secure checkout via Stripe · Cancel anytime
            </p>

            {/* Nudge back to packs */}
            <p className="text-[11px] text-muted-foreground text-center">
              Just need credits for one project?{" "}
              <button onClick={() => setActiveTab("packs")} className="text-[--color-gold] underline underline-offset-2">
                Top up instead
              </button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
