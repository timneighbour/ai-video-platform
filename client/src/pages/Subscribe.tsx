import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft, Zap, Gift } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 50,
    description: "Try WizVid with no commitment",
    badge: null,
    features: [
      "50 trial credits (one-time)",
      "Access to all 4 AI tools",
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
    monthlyPrice: 19,
    annualPrice: 13,
    credits: 1000,
    description: "Perfect for individual creators",
    badge: null,
    features: [
      "1,000 credits/month",
      "Access to all 4 AI tools",
      "Free storyboard regeneration",
      "Watermark-free exports",
      "Standard quality output",
      "Priority queue",
      "Email support",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 49,
    annualPrice: 33,
    credits: 3000,
    description: "For professional creators & studios",
    badge: "Most Popular",
    features: [
      "3,000 credits/month",
      "Access to all 4 AI tools",
      "Free storyboard regeneration",
      "Watermark-free exports",
      "4K upscaling included",
      "Commercial license",
      "Priority queue",
      "Early access to new models",
      "Priority support",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 149,
    annualPrice: 100,
    credits: 10000,
    description: "For teams, agencies & enterprises",
    badge: "Best Value",
    features: [
      "10,000 credits/month",
      "Access to all 4 AI tools",
      "Free storyboard regeneration",
      "Watermark-free exports",
      "4K upscaling included",
      "Commercial license",
      "API access & custom integrations",
      "Team collaboration tools",
      "Dedicated account manager",
      "SLA support",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function Subscribe() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
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
      plan: planId as "starter" | "pro" | "business",
      origin: window.location.origin,
      billingInterval: billing,
    });
  };

  const annualSavings = (monthly: number, annual: number) =>
    Math.round(((monthly - annual) / monthly) * 100);

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
              src="https://storage.googleapis.com/wizvid-assets/Wizvidlogowithneonmagicflair(1).png"
              alt="WizVid"
              className="h-8 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
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
            Start free — no credit card required
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Create stunning AI videos with credits that never expire. Storyboard generation is always free — you only pay when you render your final video.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-white text-black shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                billing === "annual"
                  ? "bg-white text-black shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Annual
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                Save 33%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-24">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {PLANS.map((plan) => {
              const price = billing === "annual" && plan.annualPrice > 0
                ? plan.annualPrice
                : plan.monthlyPrice;
              const savings = billing === "annual" && plan.monthlyPrice > 0
                ? annualSavings(plan.monthlyPrice, plan.annualPrice)
                : 0;

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
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.highlight
                            ? "bg-purple-500 text-white"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">
                        {price === 0 ? "Free" : `$${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-muted-foreground mb-1.5">/mo</span>
                      )}
                    </div>

                    {billing === "annual" && savings > 0 && (
                      <p className="mt-1 text-xs text-green-400">
                        Save {savings}% · billed ${plan.annualPrice * 12}/year
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-1.5 text-sm">
                      <Zap className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-muted-foreground">
                        {plan.credits.toLocaleString()}{" "}
                        {plan.id === "free" ? "trial credits" : "credits/month"}
                      </span>
                    </div>
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
                    {loadingPlan === plan.id ? "Processing..." : plan.cta}
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

          {/* Free Storyboard Callout */}
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
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
