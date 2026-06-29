/**
 * CheckoutSuccess — dedicated post-purchase confirmation page.
 * URL: /checkout/success?type=subscription|topup&plan=starter|creator|studio
 *
 * Shown after every Stripe checkout that is NOT a render paywall purchase
 * (render purchases use /render/success which confirms the render job).
 *
 * Flow:
 *  1. Parse URL params to know what was purchased
 *  2. Fetch latest purchase details from the server
 *  3. Show order summary + credit balance + next steps
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PLANS, TOPUP_PACKS, getPlan } from "@/lib/plans";
import {
  CheckCircle,
  Loader2,
  Sparkles,
  Zap,
  Crown,
  CreditCard,
  ArrowRight,
  LayoutDashboard,
  Gift,
  Coins,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function useSearchParams() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return new URLSearchParams(search);
}

// ── Plan colour / icon mapping ────────────────────────────────────────────────
const PLAN_STYLE: Record<string, { gradient: string; icon: React.ReactNode; accent: string }> = {
  starter: {
    gradient: "from-violet-600 to-purple-700",
    icon: <Zap className="w-8 h-8 text-white" />,
    accent: "text-violet-400",
  },
  creator: {
    gradient: "from-blue-600 to-cyan-600",
    icon: <Sparkles className="w-8 h-8 text-white" />,
    accent: "text-blue-400",
  },
  studio: {
    gradient: "from-amber-500 to-orange-600",
    icon: <Crown className="w-8 h-8 text-white" />,
    accent: "text-amber-400",
  },
  topup: {
    gradient: "from-emerald-500 to-teal-600",
    icon: <Gift className="w-8 h-8 text-white" />,
    accent: "text-emerald-400",
  },
};

// ── Next-step cards per purchase type ────────────────────────────────────────
const NEXT_STEPS = {
  subscription: [
    {
      href: "/music-video/create",
      label: "Create a music video",
      description: "Turn your track into a cinematic visual story",
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      href: "/wiz-image",
      label: "Generate AI images",
      description: "Produce stunning stills from a text prompt",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      href: "/dashboard",
      label: "Go to dashboard",
      description: "See your credits, projects, and account",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
  ],
  topup: [
    {
      href: "/dashboard",
      label: "Go to dashboard",
      description: "Your new credits are ready to use",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: "/music-video/create",
      label: "Create a music video",
      description: "Put your credits to work right now",
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      href: "/pricing",
      label: "Explore plans",
      description: "Get monthly credits at a lower per-credit rate",
      icon: <CreditCard className="w-5 h-5" />,
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount: number | null | undefined, currency = "gbp") {
  if (amount == null) return null;
  const divisor = currency.toLowerCase() === "jpy" ? 1 : 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / divisor);
}

function formatDate(ts: Date | number | null | undefined) {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CheckoutSuccess() {
  const params = useSearchParams();
  const purchaseType = (params.get("type") ?? "subscription") as "subscription" | "topup";
  const planParam = params.get("plan") ?? undefined;

  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Fetch latest purchase details
  const { data: purchase, isLoading: purchaseLoading } = trpc.billing.getLatestPurchase.useQuery(
    { type: purchaseType },
    { enabled: Boolean(user), retry: 2 }
  );

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/subscribe");
    }
  }, [authLoading, user, navigate]);

  const isLoading = authLoading || purchaseLoading;

  // ── Derive display data ──────────────────────────────────────────────────────
  const planId =
    purchase?.kind === "subscription"
      ? purchase.plan
      : planParam ?? "starter";

  const planData = getPlan(planId as Parameters<typeof getPlan>[0]);
  const topupPack =
    purchase?.kind === "topup"
      ? TOPUP_PACKS.find((p) => p.key === purchase.packKey)
      : null;

  const style = PLAN_STYLE[purchaseType === "topup" ? "topup" : planId] ?? PLAN_STYLE.starter;
  const nextSteps = NEXT_STEPS[purchaseType];

  const orderTitle =
    purchase?.kind === "topup"
      ? `${topupPack?.label ?? purchase.packName} Top-Up`
      : planData
      ? `${planData.name} Plan`
      : "Your Purchase";

  const creditsAdded =
    purchase?.kind === "topup"
      ? purchase.creditsAdded
      : planData?.creditsPerMonth ?? null;

  const amountPaid =
    purchase?.kind === "topup"
      ? formatCurrency(purchase.amountPaid, purchase.currency ?? "gbp")
      : null; // subscription amount not available from server — omit rather than show wrong value

  const renewalDate =
    purchase?.kind === "subscription" && purchase.currentPeriodEnd
      ? formatDate(purchase.currentPeriodEnd as Date | null)
      : null;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto" />
          <p className="text-white/60 text-sm">Loading your order details…</p>
        </div>
      </div>
    );
  }

  // ── Empty / error state (authenticated but no purchase found) ─────────────
  if (!isLoading && !purchase && user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <h1 className="text-2xl font-bold">Payment received!</h1>
          <p className="text-white/60 text-sm">
            Your purchase is being processed. Your credits will appear in your account shortly.
          </p>
          <Button asChild className="mt-4 bg-white text-black hover:bg-white/90 font-semibold rounded-full">
            <Link href="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Subtle gradient backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-black to-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 sm:py-24">
        {/* ── Success badge ── */}
        <div className="flex flex-col items-center text-center mb-10">
          {/* Animated checkmark ring */}
          <div className="relative mb-6">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-2xl`}
            >
              {style.icon}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-black">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Payment confirmed!
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-md">
            {purchaseType === "topup"
              ? "Your credits have been added to your wallet and are ready to use."
              : "Your subscription is now active. Your credits refresh every billing cycle."}
          </p>
        </div>

        {/* ── Order summary card ── */}
        <Card className="bg-white/5 border border-white/10 rounded-2xl mb-6 overflow-hidden">
          {/* Card header */}
          <div className={`bg-gradient-to-r ${style.gradient} px-6 py-4`}>
            <p className="text-white/80 text-xs uppercase tracking-widest font-semibold mb-0.5">
              Order Summary
            </p>
            <h2 className="text-white text-xl font-bold">{orderTitle}</h2>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Credits row */}
            {creditsAdded != null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <Coins className="w-4 h-4" />
                  <span className="text-sm">
                    {purchaseType === "topup" ? "Credits added" : "Monthly credits"}
                  </span>
                </div>
                <span className={`font-bold text-lg ${style.accent}`}>
                  +{creditsAdded.toLocaleString()} cr
                </span>
              </div>
            )}

            {/* Current balance row */}
            {purchase?.creditBalance != null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Current balance</span>
                </div>
                <span className="font-semibold text-white">
                  {purchase.creditBalance.toLocaleString()} cr
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Amount paid */}
            {amountPaid && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm">Amount charged</span>
                </div>
                <span className="font-semibold text-white">{amountPaid}</span>
              </div>
            )}

            {/* Renewal date (subscriptions only) */}
            {renewalDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm">Next renewal</span>
                </div>
                <span className="font-semibold text-white">{renewalDate}</span>
              </div>
            )}

            {/* Confirmation note */}
            <div className="mt-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/50 leading-relaxed">
              A confirmation receipt has been sent to{" "}
              <span className="text-white/70 font-medium">{user?.email ?? "your email"}</span>.
              {purchaseType === "subscription" && (
                <> Your monthly credits reset each billing cycle.</>
              )}
              {purchaseType === "topup" && (
                <> Top-up credits never expire.</>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Next steps ── */}
        <div className="mb-8">
          <h3 className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-4 text-center">
            What would you like to do next?
          </h3>
          <div className="grid gap-3">
            {nextSteps.map((step, i) => (
              <Link key={step.href} href={step.href}>
                <div
                  className={`group flex items-center gap-4 rounded-xl border px-5 py-4 cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    i === 0
                      ? "border-violet-500/50 bg-violet-500/10 hover:border-violet-400/70"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      i === 0 ? "bg-violet-500/30 text-violet-300" : "bg-white/10 text-white/60"
                    } group-hover:scale-110 transition-transform`}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${i === 0 ? "text-white" : "text-white/80"}`}>
                      {step.label}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5 truncate">{step.description}</p>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1 ${
                      i === 0 ? "text-violet-400" : "text-white/30"
                    }`}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="text-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-black hover:bg-white/90 font-semibold px-8 rounded-full"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <p className="text-white/30 text-xs mt-4">
            Need help?{" "}
            <Link href="/help" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors">
              Visit our Help Centre
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
