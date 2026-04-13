import { useState } from "react";
import { mp } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft, Zap, Gift, Crown, Star, Loader2, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Plan data ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    name: "Free",
    icon: <Gift className="w-4 h-4" />,
    monthlyPrice: 0,
    annualMonthlyEquiv: 0,
    annualTotal: 0,
    annualSaving: 0,
    description: "Try WizVid with no commitment",
    badge: null as string | null,
    features: [
      "50 trial credits (one-time)",
      "Access to all AI tools",
      "Free storyboard generation",
      "Standard quality output",
      "Watermarked exports",
      "Community support",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    icon: <Zap className="w-4 h-4" />,
    monthlyPrice: 9,
    annualMonthlyEquiv: 6.58,
    annualTotal: 79,
    annualSaving: 29,
    description: "5 min/month · 720p · Watermark",
    badge: null as string | null,
    features: [
      "5 min/month video allowance",
      "720p export quality",
      "WizVid watermark on exports",
      "All AI video styles",
      "WizBeat music video maker",
      "WizPilot AI video creator",
      "Email support",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    id: "creator",
    name: "Creator",
    icon: <Star className="w-4 h-4" />,
    monthlyPrice: 29,
    annualMonthlyEquiv: 19.33,
    annualTotal: 232,
    annualSaving: 116,
    description: "20 min/month · 1080p · No watermark",
    badge: "⭐ Most Popular",
    features: [
      "15 min/month · 1080p quality",
      "No watermark on exports",
      "Lyric-sync scene generation",
      "2 cinematic scenes included",
      "Character consistency",
      "Priority support",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    id: "studio",
    name: "Studio",
    icon: <Crown className="w-4 h-4" />,
    monthlyPrice: 99,
    annualMonthlyEquiv: 66,
    annualTotal: 792,
    annualSaving: 396,
    description: "60 min/month · 4K · Full cinematic",
    badge: "Best Value" as string | null,
    features: [
      "60 minutes of video/month",
      "Up to 3 minutes per video",
      "4K quality",
      "Full cinematic control",
      "Priority rendering (2× faster)",
      "All premium styles",
      "API access",
      "Dedicated account support",
    ],
    cta: "Go Pro",
    highlight: false,
  },
];

export default function Subscribe() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  // Default to yearly
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const createSubscriptionCheckout = trpc.billing.createSubscriptionCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        toast.info("Redirecting to checkout...");
        window.open(data.checkoutUrl, "_blank");
      }
      setLoadingPlan(null);
    },
    onError: (err) => {
      toast.error(err.message || "Checkout failed. Please try again.");
      setLoadingPlan(null);
    },
  });

  const handlePlanSelect = (planId: string) => {
    // Track plan selection intent
    const planName = PLANS.find((p) => p.id === planId)?.name ?? planId;
    mp.planSelected(planName, billing);

    if (planId === "free") {
      if (!isAuthenticated) {
        window.location.href = getLoginUrl();
      } else {
        setLocation("/dashboard");
      }
      return;
    }

    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    setLoadingPlan(planId);
    createSubscriptionCheckout.mutate({
      plan: planId as "starter" | "creator" | "studio",
      origin: window.location.origin,
      billingInterval: billing,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-cropped_86dbad19.png"
              alt="WizVid"
              className="h-12 w-auto object-contain transition-all duration-300 hover:scale-105 hover:brightness-110"
            />
          </div>
          <div className="w-24" />
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="container">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-6">
            <Gift className="h-3.5 w-3.5" />
            Create for free. Only pay when you render.
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Create videos from <strong className="text-white">£1 per minute</strong>. Storyboard generation is always free.
          </p>
          <p className="text-sm text-violet-300/80 font-medium mb-6">Start free — upgrade only when you're ready</p>
          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#a1a1aa]/70 mb-8">
            <span>✓ Free storyboard preview on all plans</span>
            <span>✓ No credit card required to start</span>
            <span>✓ Cancel anytime</span>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-4">
              <button
                onClick={() => setBilling("monthly")}
                className={`text-sm font-semibold transition-colors ${billing === "monthly" ? "text-white" : "text-muted-foreground hover:text-white"}`}
              >
                Monthly
              </button>

              {/* Animated pill toggle */}
              <button
                onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
                role="switch"
                aria-checked={billing === "annual"}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${billing === "annual" ? "bg-purple-600" : "bg-white/15"}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${billing === "annual" ? "left-8 bg-white" : "left-1 bg-white"}`} />
              </button>

              <button
                onClick={() => setBilling("annual")}
                className={`text-sm font-semibold transition-colors flex items-center gap-2 ${billing === "annual" ? "text-white" : "text-muted-foreground hover:text-white"}`}
              >
                Yearly
                <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2.5 py-0.5 text-xs font-bold text-green-400">
                  2 months free
                </span>
              </button>
            </div>

            {/* Social proof */}
            <p className={`text-sm transition-all duration-300 ${billing === "annual" ? "text-green-400" : "text-muted-foreground"}`}>
              {billing === "annual"
                ? <><strong className="text-green-300">✓ Save £116/year</strong> — equivalent to 2 months completely free</>                : <>Switch to yearly and <strong className="text-green-400">save up to £116/year</strong></>}
            </p>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-24">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {PLANS.map((plan) => {
              const displayPrice = billing === "annual" && plan.annualMonthlyEquiv > 0
                ? plan.annualMonthlyEquiv
                : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                    plan.highlight
                      ? "border-purple-500/60 bg-gradient-to-b from-purple-950/60 to-background shadow-[0_0_40px_rgba(168,85,247,0.15)] scale-[1.02]"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-purple-500 text-white">
                        <Sparkles className="h-3 w-3" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${plan.highlight ? "bg-purple-500/20 text-purple-400" : "bg-white/8 text-muted-foreground"}`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">
                        {displayPrice === 0 ? "Free" : `£${Math.floor(displayPrice)}`}
                      </span>
                      {displayPrice > 0 && (
                        <span className="text-muted-foreground mb-1.5">/mo</span>
                      )}
                    </div>

                    {billing === "annual" && plan.annualSaving > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-xs text-[#a1a1aa]">
                          £{plan.annualTotal}/year{" "}
                          <span className="text-green-400 font-semibold">(save £{plan.annualSaving})</span>
                        </p>
                      </div>
                    )}
                    {billing === "monthly" && plan.annualSaving > 0 && (
                      <p className="mt-1 text-xs text-[#a1a1aa]">
                        or £{plan.annualTotal}/year{" "}
                        <span className="text-green-400 font-semibold">(save £{plan.annualSaving})</span>
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className={`w-full mb-6 font-semibold ${
                      plan.highlight
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
                        : plan.id === "free"
                        ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        : ""
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id
                      ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing...</>
                      : plan.cta}
                  </Button>

                  {/* Features */}
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check
                          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            plan.highlight ? "text-purple-400" : "text-green-400"
                          }`}
                        />
                        <span className="text-sm text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Annual savings callout */}
          {billing === "annual" && (
            <div className="mt-8 max-w-md mx-auto p-4 rounded-xl bg-green-500/8 border border-green-500/20 text-center">
              <p className="text-green-400 text-sm font-medium">
                🎉 Creator plan annual billing saves you <strong>£116/year</strong> — 2 months completely free
              </p>
            </div>
          )}

          {/* Free Storyboard Callout */}
          <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-green-400" />
              <h3 className="font-bold text-white text-lg">Storyboard Generation is Always Free</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Unlike other platforms that charge you every time you regenerate a storyboard, WizVid lets you refine your vision as many times as you want — completely free. Credits are only deducted when you're happy and ready to render your final video.
            </p>
          </div>

          {/* FAQ Row */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto text-center">
            {[
              { q: "Do credits expire?", a: "No — your credits roll over and never expire." },
              { q: "Can I switch plans?", a: "Yes, upgrade or downgrade anytime. Prorated instantly." },
              { q: "Is there a refund policy?", a: "Yes, we offer a 7-day money-back guarantee on all plans." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white text-sm mb-1">{q}</p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
