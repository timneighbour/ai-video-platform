/**
 * CheckoutSuccess — dedicated post-purchase confirmation page.
 * URL: /checkout/success?type=subscription|topup&plan=starter|creator|studio
 *
 * Shown after every Stripe checkout that is NOT a render paywall purchase
 * (render purchases use /render/success which confirms the render job).
 *
 * Flow:
 *  1. Parse URL params to know what was purchased
 *  2. Poll getLatestPurchase until the webhook has recorded the purchase
 *  3. Show order summary + credit balance + next steps
 *
 * Credits are NEVER granted here. They are granted exclusively by the Stripe
 * webhook (checkout.session.completed / customer.subscription.created) in
 * server/webhooks.ts. This page only reads the balance already recorded.
 *
 * Copy rules:
 *  - "Monthly credits reset each billing cycle" → subscription path ONLY
 *  - "Top-up credits never expire"              → topup path ONLY
 *  These are mutually exclusive; the wrong message must never appear.
 */
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TOPUP_PACKS, getPlan } from "@/lib/plans";
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

  // Poll until the Stripe webhook has recorded the purchase.
  // refetchInterval keeps retrying every 2 s while purchase is null so the
  // customer never sees a static "not found" message after a real payment.
  // After 30 s (15 retries) we stop polling and show a timeout message.
  const pollStartRef = useRef<number>(Date.now());
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const {
    data: purchase,
    isLoading: purchaseLoading,
    dataUpdatedAt,
  } = trpc.billing.getLatestPurchase.useQuery(
    { type: purchaseType },
    {
      enabled: Boolean(user) && !pollTimedOut,
      retry: 3,
      // Poll every 2 s until data arrives or timeout fires
      refetchInterval: (query) => {
        if (query.state.data) return false; // data arrived — stop
        if (Date.now() - pollStartRef.current >= 30_000) {
          setPollTimedOut(true);
          return false; // 30 s elapsed — stop
        }
        return 2000;
      },
      refetchIntervalInBackground: false,
    }
  );

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/subscribe");
    }
  }, [authLoading, user, navigate]);

  // Celebratory confetti burst — fires once when the page first loads
  const confettiFired = useRef(false);
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Short delay so the page has painted before the burst
    const t = setTimeout(() => {
      // Centre burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#a855f7", "#7c3aed", "#06b6d4", "#f59e0b", "#10b981", "#ffffff"],
        ticks: 200,
        gravity: 0.9,
        scalar: 1.1,
      });
      // Slight left cannon
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#a855f7", "#7c3aed", "#f59e0b", "#ffffff"],
        ticks: 180,
        gravity: 0.9,
      });
      // Slight right cannon
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#06b6d4", "#10b981", "#f59e0b", "#ffffff"],
        ticks: 180,
        gravity: 0.9,
      });
    }, 350);

    return () => clearTimeout(t);
  }, []);

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

  // Amount paid: real Stripe figure for both subscriptions (from invoice.paid webhook)
  // and top-ups (from topupPurchases row). Falls back to null if webhook hasn't fired yet.
  const amountPaid =
    purchase?.kind === "topup"
      ? formatCurrency(purchase.amountPaid, purchase.currency ?? "gbp")
      : purchase?.kind === "subscription" && purchase.amountPaid != null
      ? formatCurrency(purchase.amountPaid, purchase.currency ?? "gbp")
      : null;

  // Billing interval label for subscriptions ("month" → "Monthly", "year" → "Annual")
  const billingIntervalLabel =
    purchase?.kind === "subscription" && purchase.billingInterval
      ? purchase.billingInterval === "year" ? "Annual" : "Monthly"
      : null;

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

  // ── Webhook race state ───────────────────────────────────────────────────────
  // Stripe redirects the buyer here before the webhook has finished recording the
  // purchase. We poll every 2 s (see refetchInterval above). While waiting, show
  // a reassuring message — never "no purchase found", which reads as "payment failed".
  // After 30 s without data we surface a timeout message with a link to /account.
  if (!purchase && user) {
    if (pollTimedOut) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center space-y-5 max-w-sm px-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Taking longer than expected</h1>
            <p className="text-white/55 text-sm leading-relaxed">
              Your payment was received, but your credits are taking longer than usual to appear.
              Please check your dashboard — they may already be there.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild className="rounded-full bg-violet-600 hover:bg-violet-500 text-white">
                <Link href="/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Check Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/15 text-white/60 hover:bg-white/[0.05]">
                <Link href="/account">
                  Contact Support
                </Link>
              </Button>
            </div>
            <p className="text-white/25 text-[10px]">If the issue persists, email support@wiz-ai.io with your order reference.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-5 max-w-sm px-4">
          <div className="relative mx-auto w-14 h-14">
            <CheckCircle className="w-14 h-14 text-green-400" />
            <Loader2 className="absolute inset-0 w-14 h-14 animate-spin text-violet-400 opacity-40" />
          </div>
          <h1 className="text-2xl font-bold">Payment confirmed!</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Adding your credits — this usually takes a few seconds.
            <br />
            <span className="text-white/40 text-xs">This page will update automatically.</span>
          </p>
          <Button asChild variant="outline" className="mt-2 border-white/20 text-white/70 hover:bg-white/10 rounded-full">
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

            {/* Billing interval — subscriptions only */}
            {billingIntervalLabel && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm">Billing</span>
                </div>
                <span className="font-semibold text-white">{billingIntervalLabel}</span>
              </div>
            )}

            {/* Amount paid — real Stripe figure from webhook */}
            {amountPaid && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm">Amount charged</span>
                </div>
                <span className="font-semibold text-white">{amountPaid}</span>
              </div>
            )}

            {/* Renewal date — subscriptions only */}
            {renewalDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm">Next renewal</span>
                </div>
                <span className="font-semibold text-white">{renewalDate}</span>
              </div>
            )}

            {/* Confirmation note — copy is strictly conditional on purchase type */}
            <div className="mt-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white/50 leading-relaxed">
              A confirmation receipt has been sent to{" "}
              <span className="text-white/70 font-medium">{user?.email ?? "your email"}</span>.
              {/* SUBSCRIPTION ONLY: monthly allowance resets each cycle */}
              {purchaseType === "subscription" && (
                <> Your monthly credit allowance resets at the start of each billing cycle.</>
              )}
              {/* TOP-UP ONLY: purchased credits never expire */}
              {purchaseType === "topup" && (
                <> Credits you purchase never expire and are yours to keep.</>
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
