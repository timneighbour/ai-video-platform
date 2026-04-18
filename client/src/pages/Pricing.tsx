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
 *   6. Comparison table
 *   7. WizSound showcase
 *   8. FAQ
 *   9. Post-render explanation
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
  Check, X, Zap, Star, Crown, ChevronDown, ChevronUp, Sparkles, Download, Music, Music2, Film, Package,
  Clock, Bell, CheckCircle2, Wand2, Volume2, Headphones, ArrowRight, Image, FileText, Menu
} from "lucide-react";
import WizSoundShowcase from "@/components/WizSoundShowcase";

const WIZAI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";

const NAV_PRODUCTS = [
  { name: "WizAudio", label: "Create Audio", icon: <Music2 className="w-5 h-5" />, href: "/music-creator" },
  { name: "WizImage", label: "Create Images", icon: <Image className="w-5 h-5" />, href: "/wiz-image" },
  { name: "WizVideo", label: "Create Videos", icon: <Film className="w-5 h-5" />, href: "/music-video/create" },
  { name: "WizShorts", label: "Create Shorts", icon: <Zap className="w-5 h-5" />, href: "/wiz-shorts" },
  { name: "WizAnimate", label: "Create Animation", icon: <Wand2 className="w-5 h-5" />, href: "/kids-video" },
  { name: "WizScript", label: "Create from Text", icon: <FileText className="w-5 h-5" />, href: "/text-to-video" },
];

function PricingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#060606]/95 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.6)]"
            : "bg-[#040404]/90 backdrop-blur-xl border-b border-[--color-gold]/[0.06]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.8rem] w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <a href="/" className="nav-link">Home</a>
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="nav-link flex items-center gap-1">
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${productsOpen ? "rotate-180" : ""}`} />
              </button>
              {productsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#0a0a0a]/98 backdrop-blur-2xl border border-[--color-gold]/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-2 z-50">
                  {NAV_PRODUCTS.map((p) => (
                    <a
                      key={p.name}
                      href={p.href}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors group"
                    >
                      <span className="text-[--color-silver] opacity-60 group-hover:text-[--color-gold] group-hover:opacity-100 transition-all">{p.icon}</span>
                      <div>
                        <p className="text-[13px] font-semibold text-[--color-gold-light] group-hover:text-[--color-gold]">{p.name}</p>
                        <p className="text-[11px] text-[--color-silver-dark]/50 mt-0.5 leading-tight">{p.label}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <a href="/pricing" className="nav-link text-[--color-gold]">Pricing</a>
            <a href="/help" className="nav-link">Help</a>
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <a href="/dashboard" className="btn-primary-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Dashboard
              </a>
            ) : (
              <>
                <a href={getLoginUrl()} className="text-[13px] text-[--color-silver-dark] hover:text-[--color-silver-light] transition-colors font-medium px-3 py-2">
                  Sign in
                </a>
                <a href="/onboarding" className="btn-primary-sm">
                  Start Creating
                </a>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-[--color-silver]" /> : <Menu className="w-5 h-5 text-[--color-silver]" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="absolute top-[72px] left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_16px_60px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 flex flex-col gap-1">
              <a href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</a>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <p className="text-[10px] text-[--color-gold-dark]/40 font-bold uppercase tracking-[0.2em] px-4 py-2">Products</p>
                {NAV_PRODUCTS.map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-[--color-silver-dark]">{p.icon}</span>
                    <span className="text-[14px] font-semibold text-[--color-gold-light]">{p.name}</span>
                  </a>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <a href="/pricing" className="mobile-nav-link text-[--color-gold]" onClick={() => setMobileOpen(false)}>Pricing</a>
                <a href="/help" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Help</a>
              </div>
              <div className="mt-3 pt-3 border-t border-[--color-gold]/[0.08] flex flex-col gap-2">
                {isAuthenticated ? (
                  <a href="/dashboard" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}>
                    <Sparkles className="w-4 h-4" /> Dashboard
                  </a>
                ) : (
                  <>
                    <a href={getLoginUrl()} className="text-center text-sm text-[--color-silver-dark] hover:text-[--color-silver-light] py-2.5 transition-colors" onClick={() => setMobileOpen(false)}>Sign in</a>
                    <a href="/onboarding" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}>Start Creating</a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Subscription plans ───────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    icon: <Zap className="w-4 h-4" />,
    monthlyPrice: 9,
    label: "Try it out",
    desc: "2 renders/month included. 720p quality. Watermark on exports.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 2,
    perRender: "£4.50",
    annualPrice: 79,
    features: [
      { text: "2 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizScript AI creator", included: true },
      { text: "Standard & HD quality", included: true },
      { text: "Watermark on exports", included: false },
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
      { text: "WizScript AI creator", included: true },
      { text: "Standard & HD quality", included: true },
      { text: "No watermark", included: true },
      { text: "4K quality", included: false },
      { text: "Character consistency", included: false },
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
    desc: "15 renders/month, all qualities, character consistency, priority rendering.",
    popular: true,
    badge: "Most Popular",
    rendersPerMonth: 15,
    perRender: "£1.93",
    bestValue: true,
    annualPrice: 232,
    features: [
      { text: "15 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizScript AI creator", included: true },
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
    desc: "25 renders/month. 4K quality, priority rendering, character consistency.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 25,
    perRender: "£2.36",
    annualPrice: 590,
    features: [
      { text: "25 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizScript AI creator", included: true },
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
    desc: "40 renders/month. Full API access, priority everything, built for teams.",
    popular: false,
    badge: null as string | null,
    rendersPerMonth: 40,
    perRender: "£2.47",
    annualPrice: 990,
    features: [
      { text: "40 renders/month included", included: true },
      { text: "All video styles", included: true },
      { text: "Music video maker", included: true },
      { text: "WizScript AI creator", included: true },
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
  { id: "40" as const, renders: 40, price: 50, perRender: "£1.25", label: "Studio Pack", popular: false, bestValue: true },
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
    q: "What is WizSound Cinematic?",
    a: "WizSound Cinematic is our premium audio mastering tier inspired by Dolby Cinema spatial sound. It applies a full proprietary pipeline — immersive depth, dynamic range optimisation, stereo widening, and streaming-ready loudness — to make your video sound like it belongs in a cinema.",
  },
  {
    q: "Is there a free trial?",
    a: "Creating videos is always free — no credit card required. You only pay when you want to download. There's no time limit on the free creation tier.",
  },
];

// ── Comparison features ──────────────────────────────────────────────────────
const COMPARISON_FEATURES = [
  { label: "Renders included/month", starter: "2", basic: "5", creator: "15", pro: "25", studio: "40" },
  { label: "Video styles", starter: "All", basic: "All", creator: "All", pro: "All", studio: "All" },
  { label: "Music video maker", starter: "\u2713", basic: "\u2713", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "WizScript AI creator", starter: "\u2713", basic: "\u2713", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "HD quality (1080p)", starter: "\u2713", basic: "\u2713", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "4K quality (2160p)", starter: "\u2014", basic: "\u2014", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "No watermark", starter: "\u2014", basic: "\u2713", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "Character consistency", starter: "\u2014", basic: "\u2014", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "Priority rendering", starter: "\u2014", basic: "\u2014", creator: "\u2713", pro: "\u2713", studio: "\u2713" },
  { label: "API access", starter: "\u2014", basic: "\u2014", creator: "\u2014", pro: "\u2014", studio: "\u2713" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[--color-gold]/[0.06] last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-[--color-silver-light]">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[--color-silver-dark]/40 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[--color-silver-dark]/40 flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="text-sm text-[--color-silver-dark]/55 pb-4 leading-relaxed">{a}</p>
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
      setTimeout(() => {
        plansRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, []);

  const createSubscriptionCheckout = trpc.billing.createSubscriptionCheckout.useMutation();
  const createBundleCheckout = trpc.render.createBundleCheckout.useMutation();

  async function handleSubscribe(planId: "starter" | "basic" | "creator" | "pro" | "studio") {
    mp.planSelected(planId.charAt(0).toUpperCase() + planId.slice(1), billingCycle);
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
    <div className="min-h-screen bg-[#040404] text-white">
      {/* ── Nav (matches homepage) ── */}
      <PricingNav isAuthenticated={isAuthenticated} />

      <div className="pt-28 pb-24">
        {/* ── Hero ── */}
        <div className="text-center px-6 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
            Simple pricing.<br />
            <span className="metallic-gold">No surprises.</span>
          </h1>
          <p className="text-lg text-[--color-silver-dark]/50 max-w-xl mx-auto leading-relaxed">
            Create your video for free. Only pay when you're ready to render and download.
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-center text-xs font-semibold text-[--color-gold-dark]/50 uppercase tracking-widest mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: <Sparkles className="w-5 h-5 text-[--color-gold]" />,
                title: "Create for free",
                desc: "Upload your audio, generate your storyboard, and build your video. No credit card required to start creating.",
              },
              {
                step: "02",
                icon: <Film className="w-5 h-5 text-[--color-gold]" />,
                title: "Preview & refine",
                desc: "Review your scenes, adjust the style, and perfect every detail before committing.",
              },
              {
                step: "03",
                icon: <Download className="w-5 h-5 text-[--color-gold]" />,
                title: "Pay to render",
                desc: "Happy with the result? Choose your quality and download. Pay only for what you render.",
              },
            ].map((item) => (
              <div key={item.step} className="relative p-5 rounded-2xl glass-card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-[--color-silver-dark]/25">{item.step}</span>
                  <div className="w-8 h-8 rounded-lg bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.1] flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Per-render pricing ── */}
        <div className="max-w-5xl mx-auto px-6 mb-20" id="render-pricing">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Full Video Render</h2>
            <p className="text-sm text-[--color-silver-dark]/45">One price per full video. Save more with monthly plans.</p>
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
                    ? "border-[--color-gold]/[0.3] bg-[--color-gold]/[0.04] shadow-[0_0_30px_rgba(196,164,100,0.08)]"
                    : "border-[--color-gold]/[0.06] bg-[#0a0a0a]"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider">
                    {tier.badge}
                  </div>
                )}
                <div className="text-lg font-bold text-white mb-0.5">{tier.label}</div>
                <div className="text-xs text-[--color-silver-dark]/40 mb-3">{tier.resolution}</div>
                <div className="text-3xl font-extrabold text-white mb-1">&pound;{tier.price}</div>
                <div className="text-xs text-[--color-silver-dark]/35 mb-3">Full Video Render</div>
                <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>

          {/* Audio add-ons — WizSound */}
          <div className="rounded-2xl border border-[--color-gold]/[0.08] bg-gradient-to-br from-[#0a0a0a] to-transparent p-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.12] flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-[--color-gold]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">Powered by WizSound</h3>
                    <span className="px-1.5 py-0.5 rounded bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] text-[--color-gold-dark] text-[9px] font-bold tracking-wider">PROPRIETARY</span>
                  </div>
                  <p className="text-[11px] text-[--color-silver-dark]/40 mt-0.5">Spatial audio mastering engine — cinema-grade immersive sound for your video</p>
                </div>
              </div>
              <span className="text-xs text-[--color-silver-dark]/30">Optional — add to any render</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Standard Audio",
                  sublabel: "Included",
                  price: 0,
                  desc: "Original audio, used as-is",
                  features: ["Stereo output", "Original mix"],
                  badge: null,
                  gradient: "",
                  borderClass: "border-[--color-gold]/[0.06] bg-[#0a0a0a]",
                },
                {
                  label: "WizSound Active",
                  sublabel: "+£1",
                  price: 1,
                  desc: "Polished, fuller sound with spatial widening",
                  features: ["Stereo widening", "Frequency EQ", "Noise reduction", "Spatial depth"],
                  badge: null,
                  gradient: "",
                  borderClass: "border-[--color-gold]/[0.12] bg-[--color-gold]/[0.02]",
                },
                {
                  label: "WizSound Spatial",
                  sublabel: "+£3",
                  price: 3,
                  desc: "Full spatial mastering — cinema-grade immersive audio",
                  features: ["Full mastering pipeline", "Immersive spatial depth", "Dynamic range optimisation", "Streaming-ready loudness", "Cinema-grade output"],
                  badge: "RECOMMENDED",
                  gradient: "bg-gradient-to-br from-[--color-gold]/[0.06] to-transparent",
                  borderClass: "border-[--color-gold]/[0.25]",
                },
              ].map((audio) => (
                <div
                  key={audio.label}
                  className={`relative p-4 rounded-xl border ${audio.borderClass} ${audio.gradient}`}
                >
                  {audio.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[9px] font-bold tracking-wider whitespace-nowrap shadow-lg">
                      {audio.badge}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{audio.label}</span>
                    <span className={`text-sm font-bold ${audio.price === 0 ? "text-[--color-silver-dark]/50" : audio.price === 3 ? "text-[--color-gold]" : "text-[--color-gold-dark]"}`}>
                      {audio.price === 0 ? "Free" : `+\u00A3${audio.price}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[--color-silver-dark]/40 mb-2.5">{audio.desc}</p>
                  <div className="space-y-1">
                    {audio.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-[--color-silver-dark]/50">
                        <Check className="w-2.5 h-2.5 text-[--color-gold]/60 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                  {audio.price === 3 && (
                    <div className="mt-3 pt-2.5 border-t border-[--color-gold]/[0.1]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[--color-gold-dark]">
                        <Volume2 className="w-3 h-3" />
                        <span className="font-medium">Spatial sound — hear the difference in the demo below</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Subscription plans ── */}
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Subscription plans</h2>
            <p className="text-sm text-[--color-silver-dark]/45">Includes renders every month. Best value for regular creators.</p>
            {/* Billing toggle */}
            <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-full bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.08]">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`relative px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === "monthly"
                    ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-sm"
                    : "text-[--color-silver-dark]/55 hover:text-[--color-silver]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`relative flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === "annual"
                    ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-sm"
                    : "text-[--color-silver-dark]/55 hover:text-[--color-silver]"
                }`}
              >
                Yearly
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-200 ${
                  billingCycle === "annual"
                    ? "bg-[--color-silver] text-white"
                    : "bg-[--color-silver]/20 text-[--color-silver]"
                }`}>Save 20%</span>
              </button>
            </div>
            {billingCycle === "annual" && (
              <p className="text-xs text-[--color-silver] mt-3 font-medium">Save 20% with annual billing — billed as one payment</p>
            )}
          </div>

          {/* 5-column grid on XL, 3 on md, 2 on sm, 1 on mobile */}
          <div ref={plansRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-500 ${
                  highlightedPlan === plan.id
                    ? "border-[--color-gold]/[0.6] bg-gradient-to-b from-[--color-gold]/[0.08] to-[--color-gold]/[0.02] shadow-[0_0_60px_rgba(196,164,100,0.15)] ring-2 ring-[--color-gold]/[0.3]"
                    : plan.popular
                    ? "border-[--color-gold]/[0.4] bg-gradient-to-b from-[--color-gold]/[0.06] to-[--color-gold]/[0.01] shadow-[0_0_40px_rgba(196,164,100,0.08)] ring-1 ring-[--color-gold]/[0.2]"
                    : "border-[--color-gold]/[0.06] bg-[#0a0a0a] hover:border-[--color-gold]/[0.12]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider whitespace-nowrap shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    plan.popular ? "bg-[--color-gold]/[0.15] text-[--color-gold]" : "bg-[--color-gold]/[0.06] text-[--color-silver-dark]/60"
                  }`}>
                    {plan.icon}
                  </div>
                  <span className="font-semibold text-white text-sm">{plan.name}</span>
                </div>

                <div className="mb-4">
                  <div
                    key={billingCycle}
                    style={{ animation: "priceFadeIn 220ms ease-out" }}
                  >
                    {billingCycle === "monthly" ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-white">&pound;{plan.monthlyPrice}</span>
                          <span className="text-xs text-[--color-silver-dark]/40">/mo</span>
                        </div>
                        <p className="text-[11px] text-[--color-silver-dark]/30 mt-0.5">billed monthly</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-white">&pound;{plan.annualPrice}</span>
                          <span className="text-xs text-[--color-silver-dark]/40">/year</span>
                        </div>
                        <p className="text-[11px] text-[--color-silver] mt-0.5 font-medium">
                          &pound;{Math.round(plan.annualPrice / 12)}/mo · Save 20%
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[--color-silver]/12 border border-[--color-silver]/20 text-[--color-silver] text-[11px] font-semibold">
                    <Zap className="w-2.5 h-2.5" />
                    {plan.rendersPerMonth} renders/mo
                  </div>
                  {(plan as any).bestValue && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[--color-gold]">
                        {plan.perRender}/render
                        <span className="ml-1 px-1 py-0.5 rounded bg-[--color-gold]/[0.1] border border-[--color-gold]/[0.15] text-[--color-gold-dark] text-[9px] font-bold tracking-wider">BEST VALUE</span>
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[--color-silver-dark]/40 mb-4 leading-relaxed">{plan.desc}</p>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-1.5 text-[11px]">
                      {f.included ? (
                        <Check className="w-3 h-3 text-[--color-silver] flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3 h-3 text-[--color-silver-dark]/15 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "text-[--color-silver]/70" : "text-[--color-silver-dark]/25"}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full rounded-xl font-semibold text-xs h-9 px-3 ${
                    plan.popular
                      ? "btn-primary"
                      : "bg-[--color-gold]/[0.06] text-[--color-silver] hover:bg-[--color-gold]/[0.12] border border-[--color-gold]/[0.1]"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    billingCycle === "monthly"
                      ? `Get ${plan.name} \u2014 \u00A3${plan.monthlyPrice}/mo`
                      : `Get ${plan.name} \u2014 \u00A3${plan.annualPrice}/yr`
                  )}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[--color-silver-dark]/25 mt-6 tracking-wide">No hidden fees · Cancel anytime · Full control before checkout</p>
        </div>

        {/* ── Render bundles ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20" id="bundles">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Render bundles</h2>
            <p className="text-sm text-[--color-silver-dark]/45">Buy renders in bulk and save. Bundles never expire.</p>
            <p className="text-xs text-[--color-silver] mt-1 font-medium">Save up to 30% vs pay-per-render</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className={`relative flex flex-col p-5 rounded-2xl border ${
                  bundle.popular
                    ? "border-[--color-gold]/[0.3] bg-[--color-gold]/[0.04] shadow-[0_0_25px_rgba(196,164,100,0.08)]"
                    : bundle.bestValue
                    ? "border-[--color-gold]/[0.2] bg-[--color-gold]/[0.02]"
                    : "border-[--color-gold]/[0.06] bg-[#0a0a0a]"
                }`}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider">
                    MOST POPULAR
                  </div>
                )}
                {bundle.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider">
                    BEST VALUE
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-[--color-gold]" />
                  <span className="text-sm font-semibold text-white">{bundle.label}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold text-white">&pound;{bundle.price}</span>
                </div>
                <div className="text-xs text-[--color-silver-dark]/40 mb-3">
                  {bundle.renders} renders · {bundle.perRender} each
                </div>
                <div className="flex-1" />
                <Button
                  onClick={() => handleBundlePurchase(bundle.id)}
                  disabled={loadingBundle === bundle.id}
                  className={`w-full rounded-xl font-semibold text-sm h-9 mt-4 ${
                    bundle.popular
                      ? "btn-primary"
                      : "bg-[--color-gold]/[0.06] text-[--color-silver] hover:bg-[--color-gold]/[0.12] border border-[--color-gold]/[0.1]"
                  }`}
                >
                  {loadingBundle === bundle.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Buy ${bundle.renders} renders \u2014 \u00A3${bundle.price}`
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <h2 className="text-center text-2xl font-bold text-white mb-8">Full comparison</h2>
          <div className="rounded-2xl border border-[--color-gold]/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--color-gold]/[0.06] bg-[--color-gold]/[0.02]">
                    <th className="text-left px-4 py-3 text-[--color-silver-dark]/40 font-medium text-xs min-w-[160px]">Feature</th>
                    {["Starter", "Basic", "Creator", "Pro", "Studio"].map((h) => (
                      <th key={h} className={`text-center px-3 py-3 text-xs font-semibold min-w-[90px] ${
                        h === "Creator" ? "text-[--color-gold] bg-[--color-gold]/[0.03]" : "text-[--color-silver-dark]/60"
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row, i) => (
                    <tr key={row.label} className={`border-b border-[--color-gold]/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-[--color-gold]/[0.01]"}`}>
                      <td className="px-4 py-3 text-[--color-silver-dark]/50 text-xs">{row.label}</td>
                      {[row.starter, row.basic, row.creator, row.pro, row.studio].map((val, j) => (
                        <td key={j} className={`text-center px-3 py-3 text-xs ${
                          val === "\u2713" ? "text-[--color-silver]" :
                          val === "\u2014" ? "text-[--color-silver-dark]/15" :
                          j === 2 ? "text-[--color-gold] font-medium bg-[--color-gold]/[0.03]" :
                          "text-[--color-silver-dark]/50"
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

        {/* ── WizSound Technical Showcase ── */}
        <WizSoundShowcase />

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto px-6 mb-20">
          <h2 className="text-center text-2xl font-bold text-white mb-8">Frequently asked questions</h2>
          <div className="rounded-2xl border border-[--color-gold]/[0.08] bg-[#0a0a0a] px-5">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to create?</h2>
          <p className="text-sm text-[--color-silver-dark]/45 mb-6">Start building your video for free — no credit card required.</p>
          <a
            href={isAuthenticated ? "/music-video/create" : "/onboarding"}
            className="btn-primary inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Start Creating
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
      <section className="border-t border-[--color-gold]/[0.06] bg-[#080808] py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.1] mb-4">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">After you render</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">What happens after rendering?</h2>
            <p className="text-[--color-silver-dark]/45 text-sm max-w-lg mx-auto">Your video goes through four processing stages. You'll be notified when it's ready — no need to stay on the page.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: <Clock className="w-5 h-5" />, stage: "Queued", desc: "Your job enters the render queue. Higher-tier plans get priority processing.", color: "text-[--color-silver-dark]/50" },
              { icon: <Wand2 className="w-5 h-5" />, stage: "Building Your Video", desc: "AI animates each scene from your approved storyboard images — no new content is generated.", color: "text-[--color-gold]" },
              { icon: <Film className="w-5 h-5" />, stage: "Finalising", desc: "Scenes are assembled, audio is synced, and WizSound/WizLumina enhancements are applied.", color: "text-[--color-silver]" },
              { icon: <CheckCircle2 className="w-5 h-5" />, stage: "Complete", desc: "Your video is ready. Download instantly from your dashboard or share directly.", color: "text-[--color-silver]" },
            ].map((item) => (
              <div key={item.stage} className="flex gap-4 p-4 rounded-xl bg-[--color-gold]/[0.02] border border-[--color-gold]/[0.06]">
                <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${item.color}`}>{item.stage}</p>
                  <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-4 rounded-xl bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.1] flex items-start gap-3">
              <Bell className="w-4 h-4 text-[--color-gold] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[--color-silver-light] mb-1">Email notification</p>
                <p className="text-xs text-[--color-silver-dark]/45">We'll email you when your render is complete so you don't need to wait on the page.</p>
              </div>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-[--color-silver]/8 border border-[--color-silver]/20 flex items-start gap-3">
              <Download className="w-4 h-4 text-[--color-silver] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[--color-silver-light] mb-1">Instant download</p>
                <p className="text-xs text-[--color-silver-dark]/45">Your completed video appears in your dashboard. Download MP4 immediately — no waiting.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <NavLink href="/">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.2rem] w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" />
            </NavLink>
            <div className="flex items-center gap-5 text-xs text-[--color-silver-dark]/30">
              <Link href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</Link>
              <Link href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</Link>
              <Link href="/help" className="hover:text-[--color-gold-dark] transition-colors">Help</Link>
            </div>
          </div>
          <div className="luxury-divider" />
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[--color-silver-dark]/25">
            <p>&copy; 2026 WIZ AI. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[--color-silver-dark]/25 mr-1">Secure payments via</span>
              {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((m) => (
                <span key={m} className="text-[11px] text-[--color-silver-dark]/30 border border-[--color-gold]/[0.06] bg-[--color-gold]/[0.02] px-2.5 py-1 rounded-md font-medium">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
