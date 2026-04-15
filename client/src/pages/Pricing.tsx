/**
 * Pricing page — render-based model.
 * Headline: "Simple pricing. No surprises."
 * Model: Create free → pay to render
 * Sections:
 *   1. Hero
 *   2. How it works (3 steps)
 *   3. Per-render pricing (Standard/HD/4K + audio add-ons)
 *   4. Subscription plans (included renders/month)
 *   5. Render bundles
 *   6. FAQ
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import { mp } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Check, X, Zap, Star, Crown, ChevronDown, ChevronUp, Sparkles, Download, Music, Film, Package,
  Clock, Bell, CheckCircle2, Wand2
} from "lucide-react";
import WizSoundShowcase from "@/components/WizSoundShowcase";

const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";

// ── Subscription plans ───────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    icon: <Zap className="w-4 h-4" />,
    monthlyPrice: 9,
    label: "Try it out",
    desc: "2 renders/month included. 720p quality, watermark on exports.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 2,
    perRender: "£4.50",
    annualPrice: 79,
    features: [
      { text: "2 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizPilot AI creator", included: true },
      { text: "Standard & HD quality", included: true },
      { text: "4K quality", included: false },
      { text: "Priority rendering", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "basic" as const,
    name: "Basic",
    icon: <Film className="w-4 h-4" />,
    monthlyPrice: 19,
    label: "Great value",
    desc: "5 renders/month included. 1080p HD quality, no watermark.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 5,
    perRender: "£3.80",
    annualPrice: 190,
    features: [
      { text: "5 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizPilot AI creator", included: true },
      { text: "Standard & HD quality", included: true },
      { text: "No watermark", included: true },
      { text: "4K quality", included: false },
      { text: "Priority rendering", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "creator" as const,
    name: "Creator",
    icon: <Star className="w-4 h-4" />,
    monthlyPrice: 29,
    label: "Most popular",
    desc: "20 min/month, 1080p quality, no watermark, character consistency.",
    popular: true,
    badge: "⭐ Most Popular",
    rendersPerMonth: 15,
    perRender: "£1.93",
    bestValue: true,
    annualPrice: 232,
    features: [
      { text: "15 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizPilot AI creator", included: true },
      { text: "Standard, HD & 4K quality", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    icon: <Sparkles className="w-4 h-4" />,
    monthlyPrice: 59,
    label: "Power creators",
    desc: "25 renders/month included. 4K quality, priority rendering, character consistency.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 25,
    perRender: "£2.36",
    annualPrice: 590,
    features: [
      { text: "25 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizPilot AI creator", included: true },
      { text: "Standard, HD & 4K quality", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "studio" as const,
    name: "Studio",
    icon: <Crown className="w-4 h-4" />,
    monthlyPrice: 99,
    label: "Professional",
    desc: "Create music videos, animations, and faceless content at scale. 40 renders included every month.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 40,
    perRender: "£2.47",
    annualPrice: 990,
    features: [
      { text: "40 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizPilot AI creator", included: true },
      { text: "Standard, HD & 4K quality", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "API access", included: true },
    ],
  },
];

// ── Render bundles ───────────────────────────────────────────────────────────
const BUNDLES = [
  { id: "6" as const, renders: 6, price: 10, perRender: "£1.67", label: "Starter Pack", popular: false, bestValue: false },
  { id: "15" as const, renders: 15, price: 20, perRender: "£1.33", label: "Creator Pack", popular: true, bestValue: false },
  { id: "40" as const, renders: 40, price: 50, perRender: "£1.25", label: "Studio Pack — Best Value", popular: false, bestValue: true },
];

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What does 'Create free, pay to render' mean?",
    a: "You can build your entire video — upload audio, generate scenes, edit your storyboard — completely free. You only pay when you're happy with the result and want to download the final rendered video.",
  },
  {
    q: "What's the difference between Standard, HD, and 4K?",
    a: "Standard (720p) is great for social media previews. HD (1080p) is perfect for YouTube, Instagram, and most streaming platforms. 4K (2160p) is cinema-grade quality for professional productions.",
  },
  {
    q: "What are render bundles?",
    a: "Render bundles are pre-purchased packs of render credits. Buy 6, 15, or 40 renders upfront and save compared to pay-per-render pricing. Bundles never expire.",
  },
  {
    q: "Do subscription renders roll over?",
    a: "Subscription renders reset each billing cycle and do not roll over. If you need more flexibility, render bundles are a better option as they never expire.",
  },
  {
    q: "Can I use a subscription and bundles together?",
    a: "Yes. Subscription renders are used first. Once they're exhausted, your bundle renders are used automatically. You can also pay per-render at any time.",
  },
  {
    q: "What audio tiers are available?",
    a: "Standard Audio is included free with every render. WizSound Enhance (+£1) adds stereo widening and frequency EQ for a polished, fuller sound. WizSound Cinematic (+£3) applies our full proprietary mastering pipeline with immersive depth and dynamic range — recommended for music videos.",
  },
  {
    q: "Is there a free trial?",
    a: "Creating videos is always free — no credit card required. You only pay when you want to download. There's no time limit on the free creation tier.",
  },
];

// ── Comparison features ──────────────────────────────────────────────────────
const COMPARISON_FEATURES = [
  { label: "Renders included/month", free: "0", starter: "5", creator: "15", studio: "40" },
  { label: "Video styles", free: "All", starter: "All", creator: "All", studio: "All" },
  { label: "Music video maker", free: "✓", starter: "✓", creator: "✓", studio: "✓" },
  { label: "WizPilot AI creator", free: "✓", starter: "✓", creator: "✓", studio: "✓" },
  { label: "HD quality (1080p)", free: "Pay per render", starter: "Included", creator: "Included", studio: "Included" },
  { label: "4K quality (2160p)", free: "Pay per render", starter: "Pay per render", creator: "Included", studio: "Included" },
  { label: "Character consistency", free: "✓", starter: "✓", creator: "✓", studio: "✓" },
  { label: "Priority rendering", free: "—", starter: "—", creator: "✓", studio: "✓" },
  { label: "API access", free: "—", starter: "—", creator: "—", studio: "✓" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8 last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-white/85">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="text-sm text-white/55 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);

  // Read ?plan= query param and scroll to + highlight that plan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam) {
      setHighlightedPlan(planParam);
      // Scroll to plans section after a short delay for render
      setTimeout(() => {
        plansRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, []);

  const createSubscriptionCheckout = trpc.billing.createSubscriptionCheckout.useMutation();
  const createBundleCheckout = trpc.render.createBundleCheckout.useMutation();

  async function handleSubscribe(planId: "starter" | "basic" | "creator" | "pro" | "studio") {
    mp.planSelected(planId.charAt(0).toUpperCase() + planId.slice(1), "monthly");
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setLoadingPlan(planId);
    try {
      const result = await createSubscriptionCheckout.mutateAsync({
        plan: planId,
        origin: window.location.origin,
      });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error("Couldn't start checkout", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleBundlePurchase(bundleId: "6" | "15" | "40") {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setLoadingBundle(bundleId);
    try {
      const result = await createBundleCheckout.mutateAsync({
        bundle: bundleId,
        origin: window.location.origin,
      });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error("Couldn't start checkout", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoadingBundle(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <NavLink href="/">
            <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-[9.1rem] w-auto object-contain drop-shadow-[0_0_16px_rgba(139,92,246,0.6)]" />
          </NavLink>
          <div className="flex items-center gap-4">
            <NavLink href="/" className="text-sm text-white/50 hover:text-white transition-colors">Home</NavLink>
            <NavLink href="/music-video" className="text-sm text-white/50 hover:text-white transition-colors">Create</NavLink>
            {isAuthenticated ? (
              <Button className="bg-white text-black hover:bg-white/90 text-sm px-4 h-8 rounded-lg font-semibold" asChild>
                <Link href="/dashboard"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Dashboard</Link>
              </Button>
            ) : (
              <Button className="bg-white text-black hover:bg-white/90 text-sm px-4 h-8 rounded-lg font-semibold" asChild>
                <a href={getLoginUrl()}><Sparkles className="w-3.5 h-3.5 mr-1.5" />Get Started Free</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-24">
        {/* ── Hero ── */}
        <div className="text-center px-6 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/25 bg-violet-500/8 text-violet-300 text-xs font-mono tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
            Simple pricing.<br />
            <span className="bg-gradient-to-r from-violet-300 via-purple-200 to-blue-300 bg-clip-text text-transparent">
              No surprises.
            </span>
          </h1>
          <p className="text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
            Create your video for free. Only pay when you're ready to render and download.
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-center text-xs font-semibold text-white/35 uppercase tracking-widest mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: <Sparkles className="w-5 h-5 text-violet-400" />,
                title: "Create for free",
                desc: "Upload your audio, generate your storyboard, and build your video. No credit card required to start creating.",
              },
              {
                step: "02",
                icon: <Film className="w-5 h-5 text-violet-400" />,
                title: "Preview & refine",
                desc: "Review your scenes, adjust the style, and perfect every detail before committing.",
              },
              {
                step: "03",
                icon: <Download className="w-5 h-5 text-violet-400" />,
                title: "Pay to render",
                desc: "Happy with the result? Choose your quality and download. Pay only for what you render.",
              },
            ].map((item) => (
              <div key={item.step} className="relative p-5 rounded-2xl bg-white/3 border border-white/8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-white/25">{item.step}</span>
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Per-render pricing ── */}
        <div className="max-w-5xl mx-auto px-6 mb-20" id="render-pricing">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pay per render</h2>
            <p className="text-sm text-white/45">Pay per render, or save with monthly plans.</p>
          </div>

          {/* Quality tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Standard", resolution: "720p", price: 2, desc: "Great for social media & previews", badge: null },
              { label: "HD", resolution: "1080p", price: 4, desc: "Perfect for YouTube & streaming", badge: "MOST POPULAR" },
              { label: "4K", resolution: "2160p", price: 6, desc: "Cinema-grade quality", badge: null },
            ].map((tier) => (
              <div
                key={tier.label}
                className={`relative p-5 rounded-2xl border text-center ${
                  tier.badge
                    ? "border-violet-500/50 bg-violet-500/8 shadow-[0_0_30px_rgba(139,92,246,0.12)]"
                    : "border-white/10 bg-white/3"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold tracking-wider">
                    {tier.badge}
                  </div>
                )}
                <div className="text-lg font-bold text-white mb-0.5">{tier.label}</div>
                <div className="text-xs text-white/40 mb-3">{tier.resolution}</div>
                <div className="text-3xl font-extrabold text-white mb-1">£{tier.price}</div>
                <div className="text-xs text-white/35 mb-3">per render</div>
                <p className="text-xs text-white/45 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>

          {/* Audio add-ons */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-violet-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Powered by WizSound™</h3>
                    <span className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[9px] font-bold tracking-wider">PROPRIETARY</span>
                  </div>
                  <p className="text-[10px] text-white/45 mt-0.5">Proprietary audio enhancement engine</p>
                </div>
              </div>
              <span className="text-xs text-white/35">Optional — add to any render</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Standard Audio (included)", price: 0, desc: "Original audio, used as-is", features: ["Stereo output", "Original mix"] },
                { label: "WizSound Enhance", price: 1, desc: "Polished, fuller sound", features: ["Stereo widening", "Frequency EQ", "Noise reduction"] },
                { label: "WizSound Cinematic", price: 3, desc: "Full proprietary mastering pipeline", features: ["Full mastering", "Immersive depth", "Dynamic range", "Streaming loudness"], badge: "RECOMMENDED" },
              ].map((audio) => (
                <div
                  key={audio.label}
                  className={`p-4 rounded-xl border ${
                    audio.badge
                      ? "border-amber-400/30 bg-amber-500/5"
                      : "border-white/8 bg-white/2"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{audio.label}</span>
                    <div className="flex items-center gap-2">
                      {audio.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[9px] font-bold tracking-wider">
                          {audio.badge}
                        </span>
                      )}
                      <span className="text-sm font-bold text-violet-300">
                        {audio.price === 0 ? "Free" : `+£${audio.price}`}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mb-2">{audio.desc}</p>
                  <div className="space-y-0.5">
                    {audio.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/35">
                        <Check className="w-2.5 h-2.5 text-violet-400/60 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Subscription plans ── */}
        <div className="max-w-5xl mx-auto px-6 mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Subscription plans</h2>
            <p className="text-sm text-white/45">Includes renders every month. Best value for regular creators.</p>
            {/* Billing toggle */}
            <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-full bg-white/6 border border-white/10">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`relative px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === "monthly"
                    ? "bg-white text-black shadow-sm"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`relative flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === "annual"
                    ? "bg-white text-black shadow-sm"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                Yearly
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-200 ${
                  billingCycle === "annual"
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}>Save 20%</span>
              </button>
            </div>
            {billingCycle === "annual" && (
              <p className="text-xs text-emerald-400/80 mt-3 font-medium">Save 20% with annual billing — billed as one payment</p>
            )}
          </div>

          <div ref={plansRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-500 ${
                  highlightedPlan === plan.id
                    ? "border-violet-400/80 bg-gradient-to-b from-violet-500/15 to-violet-900/8 shadow-[0_0_60px_rgba(139,92,246,0.3)] ring-2 ring-violet-400/40"
                    : plan.popular
                    ? "border-violet-500/60 bg-gradient-to-b from-violet-500/10 to-violet-900/5 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
                    : "border-white/10 bg-white/3"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold tracking-wider whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    plan.popular ? "bg-violet-500/25 text-violet-300" : "bg-white/8 text-white/60"
                  }`}>
                    {plan.icon}
                  </div>
                  <span className="font-semibold text-white">{plan.name}</span>
                </div>

                <div className="mb-4">
                  {/* Price block — fades between billing modes */}
                  <div
                    key={billingCycle}
                    style={{ animation: "priceFadeIn 220ms ease-out" }}
                  >
                    {billingCycle === "monthly" ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-white">£{plan.monthlyPrice}</span>
                          <span className="text-sm text-white/40">/mo</span>
                        </div>
                        <p className="text-xs text-white/35 mt-0.5">billed monthly</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-white">£{(plan as any).annualPrice}</span>
                          <span className="text-sm text-white/40">/year</span>
                        </div>
                        <p className="text-xs text-emerald-400/80 mt-0.5 font-medium">Save 20% vs monthly</p>
                      </>
                    )}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
                    <Zap className="w-3 h-3" />
                    {plan.rendersPerMonth} renders/month included
                  </div>
                  {(plan as any).bestValue && (
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      <div className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300">
                        {(plan as any).perRender} per render
                        <span className="ml-1 px-1 py-0.5 rounded bg-amber-500/15 border border-amber-400/20 text-amber-300 text-[9px] font-bold tracking-wider">BEST VALUE</span>
                      </div>
                      {billingCycle === "annual" && (
                        <div className="text-[10px] text-emerald-400 font-semibold">Save £78 per year vs monthly</div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-white/45 mb-5 leading-relaxed">{plan.desc}</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-xs">
                      {f.included ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-white/75" : "text-white/30"}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full rounded-xl font-semibold text-xs h-10 px-3 ${
                    plan.popular
                      ? "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/15"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    billingCycle === "monthly"
                      ? `Get ${plan.name} — £${plan.monthlyPrice}/mo`
                      : `Get ${plan.name} — £${(plan as any).annualPrice}/yr`
                  )}
                </Button>
              </div>
            ))}
          </div>
          {/* Trust messaging */}
          <p className="text-center text-xs text-white/30 mt-6 tracking-wide">No hidden fees • Full control before checkout</p>
        </div>

        {/* ── Render bundles ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20" id="bundles">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Render bundles</h2>
            <p className="text-sm text-white/45">Buy renders in bulk and save. Bundles never expire.</p>
            <p className="text-xs text-emerald-400/80 mt-1 font-medium">Save up to 30% vs pay-per-render</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className={`relative flex flex-col p-5 rounded-2xl border ${
                  bundle.popular
                    ? "border-violet-500/50 bg-violet-500/8 shadow-[0_0_25px_rgba(139,92,246,0.12)]"
                    : "border-white/10 bg-white/3"
                }`}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold tracking-wider">
                    MOST POPULAR
                  </div>
                )}
                {bundle.bestValue && (
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold tracking-wider">
                    BEST VALUE
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">{bundle.label}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold text-white">£{bundle.price}</span>
                </div>
                <div className="text-xs text-white/40 mb-3">
                  {bundle.renders} renders · {bundle.perRender} each
                </div>
                <div className="flex-1" />
                <Button
                  onClick={() => handleBundlePurchase(bundle.id)}
                  disabled={loadingBundle === bundle.id}
                  className={`w-full rounded-xl font-semibold text-sm h-9 mt-4 ${
                    bundle.popular
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/15"
                  }`}
                >
                  {loadingBundle === bundle.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    `Buy ${bundle.renders} renders — £${bundle.price}`
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div className="max-w-5xl mx-auto px-6 mb-20">
          <h2 className="text-center text-2xl font-bold text-white mb-8">Full comparison</h2>
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Feature</th>
                    {["Free", "Starter", "Creator", "Studio"].map((h) => (
                      <th key={h} className={`text-center px-4 py-3 text-xs font-semibold ${
                        h === "Creator" ? "text-violet-300" : "text-white/60"
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row, i) => (
                    <tr key={row.label} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/1"}`}>
                      <td className="px-4 py-3 text-white/55 text-xs">{row.label}</td>
                      {[row.free, row.starter, row.creator, row.studio].map((val, j) => (
                        <td key={j} className={`text-center px-4 py-3 text-xs ${
                          val === "✓" ? "text-emerald-400" :
                          val === "—" ? "text-white/20" :
                          j === 2 ? "text-violet-300 font-medium" :
                          "text-white/55"
                        }`}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── WizSound™ Technical Showcase ── */}
        <WizSoundShowcase />

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto px-6 mb-20">
          <h2 className="text-center text-2xl font-bold text-white mb-8">Frequently asked questions</h2>
          <div className="rounded-2xl border border-white/8 bg-white/2 px-5">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to create?</h2>
          <p className="text-sm text-white/45 mb-6">Start building your video for free — no credit card required.</p>
          <a
            href={isAuthenticated ? "/music-video/create" : "/onboarding"}
            className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:bg-white/95 transition-all duration-300 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            {isAuthenticated ? "Open Creator" : "Start Creating — Free"}
          </a>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes priceFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* ── Post-render explanation ── */}
      <section className="border-t border-white/8 bg-[#0d0d0d] py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-4">
              After you render
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">What happens after rendering?</h2>
            <p className="text-white/45 text-sm max-w-lg mx-auto">Your video goes through four processing stages. You'll be notified when it's ready — no need to stay on the page.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: <Clock className="w-5 h-5" />, stage: "Queued", desc: "Your job enters the render queue. Higher-tier plans get priority processing.", color: "text-white/50" },
              { icon: <Wand2 className="w-5 h-5" />, stage: "Rendering", desc: "AI animates each scene from your approved storyboard images — no new content is generated.", color: "text-violet-300" },
              { icon: <Film className="w-5 h-5" />, stage: "Finalising", desc: "Scenes are assembled, audio is synced, and WizSound/WizLumina enhancements are applied.", color: "text-blue-300" },
              { icon: <CheckCircle2 className="w-5 h-5" />, stage: "Complete", desc: "Your video is ready. Download instantly from your dashboard or share directly.", color: "text-emerald-300" },
            ].map((item) => (
              <div key={item.stage} className="flex gap-4 p-4 rounded-xl bg-white/4 border border-white/8">
                <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${item.color}`}>{item.stage}</p>
                  <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-4 rounded-xl bg-violet-500/8 border border-violet-500/20 flex items-start gap-3">
              <Bell className="w-4 h-4 text-violet-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white/80 mb-1">Email notification</p>
                <p className="text-xs text-white/45">We'll email you when your render is complete so you don't need to wait on the page.</p>
              </div>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-3">
              <Download className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white/80 mb-1">Instant download</p>
                <p className="text-xs text-white/45">Your completed video appears in your dashboard. Download MP4 immediately — no waiting.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 py-8 px-6 text-center text-xs text-white/25">
        <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-[6.5rem] w-auto object-contain mx-auto mb-4 opacity-60" />
        <p>© 2025 WizVid. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-white/50 transition-colors">Help</Link>
        </div>
      </footer>
    </div>
  );
}
