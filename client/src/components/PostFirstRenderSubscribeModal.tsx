/**
 * PostFirstRenderSubscribeModal
 *
 * Shown after a user's first successful render (for free/unsubscribed users).
 * Presents Creator and Studio plans with direct Stripe checkout + Founding Creator offer.
 * Designed to convert first-time renders into paying subscribers.
 *
 * Trigger: after FirstRenderCelebrationModal is closed, or as a second step.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Crown, Sparkles, Zap, Check, ChevronRight, Clock } from "@/lib/icons";
import { trpc } from "@/lib/trpc";
import { PLANS as CANONICAL_PLANS } from "@/lib/plans";
import { mp } from "@/lib/mixpanel";
import { toast } from "sonner";

const DISMISS_KEY = "wiz_post_render_subscribe_dismissed_v1";

interface PostFirstRenderSubscribeModalProps {
  open: boolean;
  onClose: () => void;
}

const _creatorPlan = CANONICAL_PLANS.find((p) => p.id === "creator")!;
const _proPlan = CANONICAL_PLANS.find((p) => p.id === "pro")!;
const PLANS = [
  {
    id: "creator" as const,
    name: "Creator",
    price: _creatorPlan.monthlyPrice,
    annualPrice: _creatorPlan.annualTotal,
    badge: "Most Popular",
    badgeColor: "bg-[--color-gold] text-white",
    accentColor: "oklch(0.78 0.11 75)",
    borderColor: "rgba(196,164,100,0.45)",
    glowColor: "rgba(196,164,100,0.15)",
    tagline: "Best for regular creators",
    videosPerMonth: "15 videos/month",
    highlights: [
      "15 Build Credits per month",
      "HD & 4K quality exports",
      "No watermark on downloads",
      "WizSync™ character lock",
      "Priority build queue",
      "All 6 WIZ AI studios",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: _proPlan.monthlyPrice,
    annualPrice: _proPlan.annualTotal,
    badge: "Best Value",
    badgeColor: "bg-purple-500/80 text-white",
    accentColor: "oklch(0.72 0.12 300)",
    borderColor: "rgba(160,100,220,0.35)",
    glowColor: "rgba(160,100,220,0.12)",
    tagline: _proPlan.bestFor,
    videosPerMonth: `${_proPlan.buildsPerMonth} videos/month`,
    highlights: [
      `${_proPlan.buildsPerMonth} Build Credits per month`,
      "HD & 4K quality exports",
      "No watermark on downloads",
      "Fastest build speed",
      "Full API access",
      "Dedicated support",
    ],
  },
];

export default function PostFirstRenderSubscribeModal({
  open,
  onClose,
}: PostFirstRenderSubscribeModalProps) {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Fire analytics when modal opens
  useEffect(() => {
    if (open) {
      mp.postFirstRenderModalShown("post_first_render");
      mp.upgradeModalViewed("post_first_render_modal");
    }
  }, [open]);

  const checkoutMutation = trpc.billing.createSubscriptionCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        mp.track("PostFirstRender_CheckoutStarted", { plan: loadingPlan, billing: billingInterval });
        window.open(data.checkoutUrl, "_blank");
        toast.success("Redirecting to checkout…");
      }
      setLoadingPlan(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start checkout");
      setLoadingPlan(null);
    },
  });

  const handleSubscribe = (planId: "creator" | "pro") => {
    setLoadingPlan(planId);
    mp.upgradeCTAClicked("post_first_render_modal", "free", planId);
    checkoutMutation.mutate({
      plan: planId,
      origin: window.location.origin,
      billingInterval,
    });
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
    mp.track("PostFirstRender_SubscribeModalDismissed");
    onClose();
  };

  const handleTopUp = () => {
    mp.track("PostFirstRender_TopUpClicked");
    onClose();
    window.location.href = "/pricing#packs";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent
        className="max-w-2xl w-full p-0 overflow-hidden border-0"
        style={{
          background: "linear-gradient(145deg, #0a0812, #10091a)",
          border: "1px solid rgba(196,164,100,0.2)",
          boxShadow: "0 0 80px rgba(196,164,100,0.1), 0 30px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="relative px-6 pt-8 pb-5 text-center overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(196,164,100,0.2) 0%, transparent 70%)", filter: "blur(24px)" }}
          />
          <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-black tracking-widest uppercase"
            style={{ background: "rgba(196,164,100,0.12)", border: "1px solid rgba(196,164,100,0.3)", color: "oklch(0.88 0.10 75)" }}>
            <Crown className="w-3.5 h-3.5" />
            Founding Creator Offer
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            You've created your first WIZ AI video.
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
            Want to keep producing? Subscribe now and get <span className="text-[--color-gold] font-semibold">20% bonus credits free</span> as a Founding Creator — limited time.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-5 px-6">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["monthly", "annual"] as const).map((interval) => (
              <button
                key={interval}
                onClick={() => setBillingInterval(interval)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  billingInterval === interval
                    ? "bg-[--color-gold] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {interval === "monthly" ? "Monthly" : "Annual"}
                {interval === "annual" && (
                  <span className="ml-1.5 text-[10px] font-bold opacity-80">Save 2 months</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-6 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => {
            const displayPrice = billingInterval === "annual"
              ? Math.round(plan.annualPrice / 12)
              : plan.price;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl p-5 flex flex-col"
                style={{
                  background: `linear-gradient(145deg, ${plan.glowColor}, rgba(10,8,18,0.8))`,
                  border: `1px solid ${plan.borderColor}`,
                  boxShadow: `0 0 30px ${plan.glowColor}`,
                }}
              >
                {/* Badge */}
                <span className={`absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-black ${plan.badgeColor}`}>
                  {plan.badge}
                </span>

                {/* Plan name + price */}
                <div className="mb-4">
                  <p className="text-[11px] font-black tracking-widest uppercase mb-1" style={{ color: plan.accentColor }}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">£{displayPrice}</span>
                    <span className="text-zinc-500 text-sm">/mo</span>
                  </div>
                  {billingInterval === "annual" && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">Billed £{plan.annualPrice}/year</p>
                  )}
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: plan.accentColor }}>
                    {plan.videosPerMonth}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{plan.tagline}</p>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-xs text-zinc-300">
                      <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.accentColor }} />
                      {h}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading || !!loadingPlan}
                  className="w-full h-11 text-sm font-bold text-white rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${plan.accentColor}, oklch(0.40 0.08 75))`,
                    boxShadow: `0 4px 20px ${plan.glowColor}`,
                  }}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Opening checkout…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Get {plan.name} Plan
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Founding Creator offer note */}
        <div className="mx-6 mt-4 mb-4 px-4 py-3 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(196,164,100,0.06)", border: "1px solid rgba(196,164,100,0.15)" }}>
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.78 0.11 75 / 0.7)" }} />
          <div>
            <p className="text-xs font-semibold text-white">Founding Creator Status</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Subscribe now and you'll be recognised as a Founding Creator — early supporter status, 20% bonus credits on your first subscription, and priority access to new features.
            </p>
          </div>
        </div>

        {/* Alternative: top-up + trust strip */}
        <div className="px-6 pb-6 text-center">
          <button
            onClick={handleTopUp}
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors underline underline-offset-2"
          >
            Not ready? Buy a credit pack instead
          </button>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3">
            {["Cancel anytime", "You own all your content", "Secure checkout via Stripe"].map((t) => (
              <span key={t} className="text-[10px] text-zinc-600 flex items-center gap-1">
                <span className="text-[--color-gold]/40">✓</span> {t}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
