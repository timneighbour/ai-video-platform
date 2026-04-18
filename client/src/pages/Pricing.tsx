/**
 * Pricing page — rebuilt for premium clarity and conversion.
 * Model: Create free → pay to render
 * Sections:
 *   1. Nav
 *   2. Hero
 *   3. How it works (3 steps)
 *   4. Per-render pricing (Standard/HD/4K + audio add-ons)
 *   5. Subscription plans (with "best for" labels, key differentiators)
 *   6. Render bundles
 *   7. Trust strip
 *   8. Comparison table (grouped)
 *   9. FAQ
 *  10. Post-render explanation
 *  11. Bottom CTA
 *  12. Footer
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
  Check, X, Zap, Star, Crown, ChevronDown, ChevronUp, Sparkles, Download, Music2, Film, Package,
  Clock, Bell, CheckCircle2, Wand2, Volume2, Headphones, ArrowRight, Image, FileText, Menu,
  Shield, CreditCard, RefreshCcw, Users
} from "lucide-react";
import WizSoundShowcase from "@/components/WizSoundShowcase";

const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";

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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#060606]/95 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.6)]"
          : "bg-[#040404]/90 backdrop-blur-xl border-b border-[--color-gold]/[0.06]"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[4.275rem] w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" loading="eager" decoding="async" />
          </a>
          <div className="hidden md:flex items-center gap-1">
            <a href="/" className="nav-link">Home</a>
            <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
              <button className="nav-link flex items-center gap-1">
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${productsOpen ? "rotate-180" : ""}`} />
              </button>
              {productsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#0a0a0a]/98 backdrop-blur-2xl border border-[--color-gold]/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-2 z-50">
                  {NAV_PRODUCTS.map((p) => (
                    <a key={p.name} href={p.href} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors group">
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
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <a href="/dashboard" className="btn-primary-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Dashboard
              </a>
            ) : (
              <>
                <a href={getLoginUrl()} className="text-[13px] text-[--color-silver-dark] hover:text-[--color-silver-light] transition-colors font-medium px-3 py-2">Sign in</a>
                <a href="/onboarding" className="btn-primary-sm">Start Creating</a>
              </>
            )}
          </div>
          <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5 text-[--color-silver]" /> : <Menu className="w-5 h-5 text-[--color-silver]" />}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute top-[72px] left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_16px_60px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-5 flex flex-col gap-1">
              <a href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</a>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <p className="text-[10px] text-[--color-gold-dark]/40 font-bold uppercase tracking-[0.2em] px-4 py-2">Products</p>
                {NAV_PRODUCTS.map((p) => (
                  <a key={p.name} href={p.href} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors" onClick={() => setMobileOpen(false)}>
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
                  <a href="/dashboard" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}><Sparkles className="w-4 h-4" /> Dashboard</a>
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

// ── Canonical plan definitions ────────────────────────────────────────────────
// Single source of truth — all values here must match comparison table below.
const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    icon: <Zap className="w-4 h-4" />,
    monthlyPrice: 9,
    annualPrice: 79,
    bestFor: "First-time creators",
    tagline: "Try WIZ AI with no commitment.",
    rendersPerMonth: 2,
    outputQuality: "Standard 720p",
    watermark: true,
    priorityRendering: false,
    characterConsistency: false,
    apiAccess: false,
    popular: false,
    badge: null as string | null,
    features: [
      { text: "2 renders included per month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "Watermark on all exports", included: false },
      { text: "HD (1080p) quality", included: false },
      { text: "4K (2160p) quality", included: false },
      { text: "Character consistency", included: false },
      { text: "Priority rendering", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "basic" as const,
    name: "Basic",
    icon: <Film className="w-4 h-4" />,
    monthlyPrice: 19,
    annualPrice: 190,
    bestFor: "Casual creators",
    tagline: "Clean exports, no watermark.",
    rendersPerMonth: 5,
    outputQuality: "Up to HD (1080p)",
    watermark: false,
    priorityRendering: false,
    characterConsistency: false,
    apiAccess: false,
    popular: false,
    badge: null as string | null,
    features: [
      { text: "5 renders included per month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "Standard (720p) & HD (1080p) quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark on exports", included: true },
      { text: "4K (2160p) quality", included: false },
      { text: "Character consistency", included: false },
      { text: "Priority rendering", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "creator" as const,
    name: "Creator",
    icon: <Star className="w-4 h-4" />,
    monthlyPrice: 35,
    annualPrice: 350,
    bestFor: "Active content creators",
    tagline: "The most popular plan for a reason.",
    rendersPerMonth: 15,
    outputQuality: "Up to 4K (2160p)",
    watermark: false,
    priorityRendering: true,
    characterConsistency: true,
    apiAccess: false,
    popular: true,
    badge: "Most Popular",
    features: [
      { text: "15 renders included per month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "Standard, HD & 4K quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark on exports", included: true },
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
    annualPrice: 590,
    bestFor: "Professional creators",
    tagline: "More renders, full quality, full control.",
    rendersPerMonth: 25,
    outputQuality: "Up to 4K (2160p)",
    watermark: false,
    priorityRendering: true,
    characterConsistency: true,
    apiAccess: false,
    popular: false,
    badge: null as string | null,
    features: [
      { text: "25 renders included per month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "Standard, HD & 4K quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark on exports", included: true },
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
    annualPrice: 990,
    bestFor: "Teams & agencies",
    tagline: "Full API access. Built for scale.",
    rendersPerMonth: 40,
    outputQuality: "Up to 4K (2160p)",
    watermark: false,
    priorityRendering: true,
    characterConsistency: true,
    apiAccess: true,
    popular: false,
    badge: null as string | null,
    features: [
      { text: "40 renders included per month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "Standard, HD & 4K quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark on exports", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "Full API access", included: true },
    ],
  },
];

// ── Render bundles ────────────────────────────────────────────────────────────
const BUNDLES = [
  { id: "6" as const, renders: 6, price: 10, perRender: "£1.67", label: "Starter Pack", popular: false, bestValue: false, desc: "Top up when you need a few extra renders." },
  { id: "15" as const, renders: 15, price: 20, perRender: "£1.33", label: "Creator Pack", popular: true, bestValue: false, desc: "The most popular bundle — great for busy months." },
  { id: "40" as const, renders: 40, price: 50, perRender: "£1.25", label: "Studio Pack", popular: false, bestValue: true, desc: "Best value per render. Ideal for high-volume production." },
];

// ── Comparison table — grouped ────────────────────────────────────────────────
// Single source of truth — must match PLANS above exactly.
const COMPARISON_GROUPS = [
  {
    group: "Output",
    rows: [
      { label: "Renders included/month", starter: "2", basic: "5", creator: "15", pro: "25", studio: "40" },
      { label: "Max output quality", starter: "720p", basic: "HD (1080p)", creator: "4K (2160p)", pro: "4K (2160p)", studio: "4K (2160p)" },
      { label: "Watermark on exports", starter: "Watermark", basic: "Clean", creator: "Clean", pro: "Clean", studio: "Clean" },
    ],
  },
  {
    group: "Features",
    rows: [
      { label: "All 6 WIZ AI products", starter: "✓", basic: "✓", creator: "✓", pro: "✓", studio: "✓" },
      { label: "WizSound audio mastering", starter: "✓", basic: "✓", creator: "✓", pro: "✓", studio: "✓" },
      { label: "Character consistency", starter: "—", basic: "—", creator: "✓", pro: "✓", studio: "✓" },
      { label: "Priority rendering", starter: "—", basic: "—", creator: "✓", pro: "✓", studio: "✓" },
    ],
  },
  {
    group: "Access",
    rows: [
      { label: "API access", starter: "—", basic: "—", creator: "—", pro: "—", studio: "✓" },
      { label: "Render bundles", starter: "✓", basic: "✓", creator: "✓", pro: "✓", studio: "✓" },
      { label: "Pay-per-render", starter: "✓", basic: "✓", creator: "✓", pro: "✓", studio: "✓" },
    ],
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What does 'Create free, pay to render' mean?",
    a: "You can build your entire video — upload audio, generate scenes, edit your storyboard — completely free. You only pay when you're happy with the result and want to download the final rendered video. There is no time limit on the free creation tier.",
  },
  {
    q: "What is the difference between Standard, HD, and 4K?",
    a: "Standard (720p) is great for social media previews. HD (1080p) is perfect for YouTube, Instagram, and most streaming platforms. 4K (2160p) is cinema-grade quality for professional productions. 4K is available on Creator, Pro, and Studio plans.",
  },
  {
    q: "What happens if I use all my monthly renders?",
    a: "Your subscription renders reset on your next billing date. In the meantime, you can top up instantly with a render bundle (6, 15, or 40 renders) or pay per-render at £2–£6 depending on quality. Bundles never expire and are used automatically once your subscription renders run out.",
  },
  {
    q: "What are render bundles?",
    a: "Render bundles are pre-purchased packs of render credits. Buy 6, 15, or 40 renders upfront and save compared to pay-per-render pricing. Bundles never expire and work alongside any subscription plan.",
  },
  {
    q: "Do subscription renders roll over?",
    a: "Subscription renders reset each billing cycle and do not roll over. If you need more flexibility, render bundles are a better option as they never expire.",
  },
  {
    q: "What is character consistency?",
    a: "Character consistency uses AI to maintain the same character appearance across multiple scenes in your video. This is available on Creator, Pro, and Studio plans. It is especially useful for music videos and narrative content with recurring characters.",
  },
  {
    q: "What is priority rendering?",
    a: "Priority rendering moves your job to the front of the render queue. On Creator, Pro, and Studio plans, your videos process faster — typically within minutes rather than waiting in the standard queue.",
  },
  {
    q: "Is there a free trial?",
    a: "Creating videos is always free — no credit card required. You only pay when you want to download. There is no time limit on the free creation tier.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. Cancel anytime from your account settings. You keep access until the end of your current billing period. There are no cancellation fees.",
  },
  {
    q: "Does pricing cover WizAudio, WizImage, and WizShorts as well as video?",
    a: "Yes. Your subscription renders and render bundles work across all WIZ AI products — WizVideo (music videos), WizScript (text-to-video), WizShorts (short-form content), WizAnimate (animation), WizAudio (AI music and audio generation), and WizImage (AI image and artwork creation). Each render or export consumes one credit regardless of the product used.",
  },
  {
    q: "How does WizAudio pricing work?",
    a: "WizAudio lets you generate AI music tracks, stems, and sound effects. Each audio generation consumes one render credit. WizSound audio mastering add-ons are available at checkout for an additional £1 (WizSound Active) or £3 (WizSound Spatial) per track.",
  },
  {
    q: "How does WizImage pricing work?",
    a: "WizImage lets you generate AI images, character artwork, and visual assets. Each image generation consumes one render credit. You can generate multiple variations and download your favourites.",
  },
  {
    q: "How does WizShorts pricing work?",
    a: "WizShorts creates short-form vertical videos optimised for YouTube Shorts, Instagram Reels, and TikTok. Each WizShorts render consumes one render credit, the same as a full-length video render.",
  },
  {
    q: "How does WizAnimate pricing work?",
    a: "WizAnimate generates stylised animation — 3D, anime, and motion graphics. Each animation render consumes one render credit. Character consistency is available on Creator, Pro, and Studio plans.",
  },
  {
    q: "What is WizCreate™?",
    a: "WizCreate™ is the AI storyboard and scene-building engine at the heart of WIZ AI. When you describe your idea, WizCreate™ generates a full visual storyboard — scenes, characters, and direction — in seconds. It powers every product on the platform, from WizVideo to WizScript to WizShorts.",
  },
  {
    q: "What are the WIZ Engines?",
    a: "The WIZ Engines are the proprietary AI layers that enhance every creation. WizGenesis™ orchestrates the creative workflow. WizSound™ masters your audio to studio grade. WizLumina™ applies cinematic colour grading and HDR tone mapping to every frame. WizBoost™ optimises your final export for maximum quality on every platform. All engines run automatically — you do not need to configure anything.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[--color-gold]/[0.06] last:border-0">
      <button className="w-full flex items-center justify-between py-5 text-left gap-4" onClick={() => setOpen(!open)}>
        <span className="text-sm font-semibold text-[--color-silver-light] leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[--color-silver-dark]/40 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[--color-silver-dark]/40 flex-shrink-0" />
        }
      </button>
      {open && <p className="text-sm text-[--color-silver-dark]/55 pb-5 leading-relaxed">{a}</p>}
    </div>
  );
}

// ── Pill helper ───────────────────────────────────────────────────────────────
function StatusPill({ included, label }: { included: boolean; label: string }) {
  return included ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[--color-gold-dark] bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] px-2 py-0.5 rounded-full">
      <Check className="w-2.5 h-2.5 flex-shrink-0" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[--color-silver-dark]/30 bg-transparent border border-[--color-gold]/[0.04] px-2 py-0.5 rounded-full">
      <X className="w-2.5 h-2.5 flex-shrink-0" /> {label}
    </span>
  );
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mp.pricingPageViewed();
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
    mp.checkoutStarted(planId);
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setLoadingPlan(planId);
    try {
      const result = await createSubscriptionCheckout.mutateAsync({ plan: planId, origin: window.location.origin });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error("Couldn't start checkout", { description: err instanceof Error ? err.message : "Please try again." });
    } finally { setLoadingPlan(null); }
  }

  async function handleBundlePurchase(bundleId: "6" | "15" | "40") {
    mp.checkoutStarted(`bundle_${bundleId}`);
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setLoadingBundle(bundleId);
    try {
      const result = await createBundleCheckout.mutateAsync({ bundle: bundleId, origin: window.location.origin });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (err) {
      toast.error("Couldn't start checkout", { description: err instanceof Error ? err.message : "Please try again." });
    } finally { setLoadingBundle(null); }
  }

  return (
    <div className="min-h-screen bg-[#040404] text-white">
      <PricingNav isAuthenticated={isAuthenticated} />

      <div className="pt-28 pb-24">

        {/* ── 1. Hero ── */}
        <div className="relative text-center px-6 mb-20 overflow-hidden">
          {/* Premium hero background */}
          <div className="absolute inset-0 -top-28 pointer-events-none">
            <img src="/manus-storage/pricing-hero-bg_7e23edd2.jpg" alt="" className="w-full h-full object-cover opacity-[0.18]" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.3) 0%, rgba(4,4,4,0.7) 60%, #040404 100%)' }} />
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-[--color-silver-dark]/40">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[--color-gold]/60" /> No credit card to start</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[--color-gold]/60" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[--color-gold]/60" /> Secure checkout via Stripe</span>
          </div>
        </div>

        {/* ── 2. How it works ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-center text-xs font-semibold text-[--color-gold-dark]/50 uppercase tracking-widest mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", icon: <Sparkles className="w-5 h-5 text-[--color-gold]" />, title: "Create for free", desc: "Upload your audio, generate your storyboard, and build your video. No credit card required to start." },
              { step: "02", icon: <Film className="w-5 h-5 text-[--color-gold]" />, title: "Preview & refine", desc: "Review your scenes, adjust the style, and perfect every detail before committing." },
              { step: "03", icon: <Download className="w-5 h-5 text-[--color-gold]" />, title: "Pay to render", desc: "Happy with the result? Choose your quality and download. Pay only for what you render." },
            ].map((item) => (
              <div key={item.step} className="relative p-5 rounded-2xl glass-card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-[--color-silver-dark]/25">{item.step}</span>
                  <div className="w-8 h-8 rounded-lg bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.1] flex items-center justify-center">{item.icon}</div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Per-render pricing ── */}
        <div className="max-w-5xl mx-auto px-6 mb-20" id="render-pricing">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pay-per-render pricing</h2>
            <p className="text-sm text-[--color-silver-dark]/45">No subscription needed. One price per full video render.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Standard", resolution: "720p", price: 2, desc: "Great for social media & previews", badge: null },
              { label: "HD", resolution: "1080p", price: 4, desc: "Perfect for YouTube & streaming", badge: "MOST POPULAR" },
              { label: "4K", resolution: "2160p", price: 6, desc: "Cinema-grade quality", badge: null },
            ].map((tier) => (
              <div key={tier.label} className={`relative p-5 rounded-2xl border text-center ${
                tier.badge
                  ? "border-[--color-gold]/[0.3] bg-[--color-gold]/[0.04] shadow-[0_0_30px_rgba(196,164,100,0.08)]"
                  : "border-[--color-gold]/[0.06] bg-[#0a0a0a]"
              }`}>
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider">{tier.badge}</div>
                )}
                <div className="text-lg font-bold text-white mb-0.5">{tier.label}</div>
                <div className="text-xs text-[--color-silver-dark]/40 mb-3">{tier.resolution}</div>
                <div className="text-3xl font-extrabold text-white mb-1">&pound;{tier.price}</div>
                <div className="text-xs text-[--color-silver-dark]/35 mb-3">per render</div>
                <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>

          {/* Audio add-ons */}
          <div className="rounded-2xl border border-[--color-gold]/[0.08] bg-gradient-to-br from-[#0a0a0a] to-transparent p-6">
            <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.12] flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-[--color-gold]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">WizSound Audio Mastering</h3>
                    <span className="px-1.5 py-0.5 rounded bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] text-[--color-gold-dark] text-[9px] font-bold tracking-wider">OPTIONAL ADD-ON</span>
                  </div>
                  <p className="text-[11px] text-[--color-silver-dark]/40 mt-0.5">Spatial audio mastering — cinema-grade immersive sound for your video</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Standard Audio", sublabel: "Included free", price: 0, desc: "Original audio, used as-is", features: ["Stereo output", "Original mix"], badge: null, borderClass: "border-[--color-gold]/[0.06] bg-[#0a0a0a]", gradient: "" },
                { label: "WizSound Active", sublabel: "+£1", price: 1, desc: "Polished, fuller sound with spatial widening", features: ["Stereo widening", "Frequency EQ", "Noise reduction", "Spatial depth"], badge: null, borderClass: "border-[--color-gold]/[0.12] bg-[--color-gold]/[0.02]", gradient: "" },
                { label: "WizSound Spatial", sublabel: "+£3", price: 3, desc: "Full spatial mastering — cinema-grade immersive audio", features: ["Full mastering pipeline", "Immersive spatial depth", "Dynamic range optimisation", "Streaming-ready loudness", "Cinema-grade output"], badge: "RECOMMENDED", borderClass: "border-[--color-gold]/[0.25]", gradient: "bg-gradient-to-br from-[--color-gold]/[0.06] to-transparent" },
              ].map((audio) => (
                <div key={audio.label} className={`relative p-4 rounded-xl border ${audio.borderClass} ${audio.gradient}`}>
                  {audio.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[9px] font-bold tracking-wider whitespace-nowrap shadow-lg">{audio.badge}</div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{audio.label}</span>
                    <span className={`text-sm font-bold ${audio.price === 0 ? "text-[--color-silver-dark]/50" : audio.price === 3 ? "text-[--color-gold]" : "text-[--color-gold-dark]"}`}>
                      {audio.price === 0 ? "Free" : `+£${audio.price}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[--color-silver-dark]/40 mb-2.5">{audio.desc}</p>
                  <div className="space-y-1">
                    {audio.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-[--color-silver-dark]/50">
                        <Check className="w-2.5 h-2.5 text-[--color-gold]/60 flex-shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. Subscription plans ── */}
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Monthly subscription plans</h2>
            <p className="text-sm text-[--color-silver-dark]/45 max-w-lg mx-auto">Renders included every month. Best value for regular creators. Cancel anytime.</p>
            {/* Billing toggle */}
            <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-full bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.08]">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === "monthly"
                    ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-sm"
                    : "text-[--color-silver-dark]/55 hover:text-[--color-silver]"
                }`}
              >Monthly</button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingCycle === "annual"
                    ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-sm"
                    : "text-[--color-silver-dark]/55 hover:text-[--color-silver]"
                }`}
              >
                Yearly
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-200 ${
                  billingCycle === "annual" ? "bg-[--color-silver] text-white" : "bg-[--color-silver]/20 text-[--color-silver]"
                }`}>Save 20%</span>
              </button>
            </div>
            {billingCycle === "annual" && (
              <p className="text-xs text-[--color-silver] mt-3 font-medium">Billed as one annual payment — save 20% vs monthly</p>
            )}
          </div>

          {/* Plan cards */}
          <div ref={plansRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {PLANS.map((plan) => {
              const isHighlighted = highlightedPlan === plan.id;
              const isPopular = plan.popular;
              return (
                <div
                  key={plan.id}
                  id={`plan-${plan.id}`}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-500 ${
                    isHighlighted
                      ? "border-[--color-gold]/[0.6] bg-gradient-to-b from-[--color-gold]/[0.08] to-[--color-gold]/[0.02] shadow-[0_0_60px_rgba(196,164,100,0.15)] ring-2 ring-[--color-gold]/[0.3]"
                      : isPopular
                      ? "border-[--color-gold]/[0.4] bg-gradient-to-b from-[--color-gold]/[0.07] to-[--color-gold]/[0.01] shadow-[0_0_50px_rgba(196,164,100,0.10)] ring-1 ring-[--color-gold]/[0.2]"
                      : "border-[--color-gold]/[0.07] bg-[#0a0a0a] hover:border-[--color-gold]/[0.14] hover:bg-[--color-gold]/[0.01]"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider whitespace-nowrap shadow-lg">
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isPopular ? "bg-[--color-gold]/[0.15] text-[--color-gold]" : "bg-[--color-gold]/[0.06] text-[--color-silver-dark]/60"
                    }`}>{plan.icon}</div>
                    <span className="font-bold text-white text-base">{plan.name}</span>
                  </div>

                  {/* Best for */}
                  <p className="text-[11px] text-[--color-gold-dark]/70 font-semibold uppercase tracking-wider mb-1">Best for: {plan.bestFor}</p>
                  <p className="text-[12px] text-[--color-silver-dark]/45 mb-4 leading-snug">{plan.tagline}</p>

                  {/* Price */}
                  <div key={billingCycle} style={{ animation: "priceFadeIn 220ms ease-out" }} className="mb-4">
                    {billingCycle === "monthly" ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-white">&pound;{plan.monthlyPrice}</span>
                          <span className="text-xs text-[--color-silver-dark]/40">/mo</span>
                        </div>
                        <p className="text-[11px] text-[--color-silver-dark]/30 mt-0.5">billed monthly</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-white">&pound;{plan.annualPrice}</span>
                          <span className="text-xs text-[--color-silver-dark]/40">/year</span>
                        </div>
                        <p className="text-[11px] text-[--color-silver] mt-0.5 font-medium">
                          &pound;{Math.round(plan.annualPrice / 12)}/mo · Save 20%
                        </p>
                      </>
                    )}
                  </div>

                  {/* Key differentiators — scannable at a glance */}
                  <div className="mb-4 p-3 rounded-xl bg-[--color-gold]/[0.03] border border-[--color-gold]/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[--color-silver-dark]/40">Renders/month</span>
                      <span className="font-bold text-white">{plan.rendersPerMonth}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[--color-silver-dark]/40">Max quality</span>
                      <span className="font-semibold text-[--color-silver-light]">{plan.outputQuality}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[--color-silver-dark]/40">Watermark</span>
                      {plan.watermark
                        ? <span className="text-[--color-silver-dark]/40 font-medium">Yes</span>
                        : <span className="font-semibold text-[--color-gold-dark]">No watermark</span>
                      }
                    </div>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className={`flex items-start gap-2 text-[12px] leading-snug ${
                        f.included ? "text-[--color-silver-dark]/65" : "text-[--color-silver-dark]/25"
                      }`}>
                        {f.included
                          ? <Check className="w-3.5 h-3.5 text-[--color-gold]/70 flex-shrink-0 mt-0.5" />
                          : <X className="w-3.5 h-3.5 text-[--color-silver-dark]/20 flex-shrink-0 mt-0.5" />
                        }
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full rounded-xl font-semibold text-sm h-10 ${
                      isPopular || isHighlighted
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
                        ? `Get ${plan.name} — £${plan.monthlyPrice}/mo`
                        : `Get ${plan.name} — £${plan.annualPrice}/yr`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-[--color-silver-dark]/25 mt-6 tracking-wide">No hidden fees · Cancel anytime · Full control before checkout</p>
        </div>

        {/* ── 5. Render bundles ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20" id="bundles">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Render bundles</h2>
            <p className="text-sm text-[--color-silver-dark]/45 max-w-md mx-auto">Buy renders in bulk and save. Bundles never expire and work alongside any subscription plan.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {BUNDLES.map((bundle) => (
              <div key={bundle.id} className={`relative flex flex-col p-6 rounded-2xl border ${
                bundle.popular
                  ? "border-[--color-gold]/[0.35] bg-[--color-gold]/[0.04] shadow-[0_0_30px_rgba(196,164,100,0.08)]"
                  : bundle.bestValue
                  ? "border-[--color-gold]/[0.2] bg-[--color-gold]/[0.02]"
                  : "border-[--color-gold]/[0.07] bg-[#0a0a0a]"
              }`}>
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider">MOST POPULAR</div>
                )}
                {bundle.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider">BEST VALUE</div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[--color-gold]" />
                  <span className="text-sm font-bold text-white">{bundle.label}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-3xl font-extrabold text-white">&pound;{bundle.price}</span>
                </div>
                <div className="text-xs text-[--color-silver-dark]/40 mb-3">
                  {bundle.renders} renders · {bundle.perRender} each
                </div>
                <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed mb-4 flex-1">{bundle.desc}</p>
                <Button
                  onClick={() => handleBundlePurchase(bundle.id)}
                  disabled={loadingBundle === bundle.id}
                  className={`w-full rounded-xl font-semibold text-sm h-10 ${
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
                  ) : `Buy ${bundle.renders} renders — £${bundle.price}`}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6. Trust strip ── */}
        <div className="max-w-4xl mx-auto px-6 mb-20">
          <div className="rounded-2xl border border-[--color-gold]/[0.08] bg-[--color-gold]/[0.02] p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: <Shield className="w-5 h-5 text-[--color-gold]" />, label: "Secure checkout", sub: "Powered by Stripe" },
                { icon: <CreditCard className="w-5 h-5 text-[--color-gold]" />, label: "No card to start", sub: "Create for free" },
                { icon: <RefreshCcw className="w-5 h-5 text-[--color-gold]" />, label: "Cancel anytime", sub: "No lock-in" },
                { icon: <Users className="w-5 h-5 text-[--color-gold]" />, label: "40+ countries", sub: "Global payments" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.1] flex items-center justify-center">{item.icon}</div>
                  <p className="text-xs font-semibold text-[--color-silver-light]">{item.label}</p>
                  <p className="text-[11px] text-[--color-silver-dark]/40">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 7. Comparison table — grouped ── */}
        <div className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Full plan comparison</h2>
            <p className="text-sm text-[--color-silver-dark]/45">Every feature, clearly shown. No ambiguity.</p>
          </div>
          <div className="rounded-2xl border border-[--color-gold]/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--color-gold]/[0.08] bg-[--color-gold]/[0.03]">
                    <th className="text-left px-5 py-4 text-[--color-silver-dark]/40 font-medium text-xs min-w-[180px]">Feature</th>
                    {["Starter", "Basic", "Creator", "Pro", "Studio"].map((h) => (
                      <th key={h} className={`text-center px-4 py-4 text-xs font-bold min-w-[100px] ${
                        h === "Creator" ? "text-[--color-gold] bg-[--color-gold]/[0.04]" : "text-[--color-silver-dark]/60"
                      }`}>
                        {h}
                        {h === "Creator" && <div className="text-[9px] font-bold text-[--color-gold]/60 mt-0.5 tracking-wider">POPULAR</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_GROUPS.map((group) => (
                    <>
                      <tr key={group.group} className="bg-[--color-gold]/[0.015] border-t border-[--color-gold]/[0.06]">
                        <td colSpan={6} className="px-5 py-2.5 text-[10px] font-bold text-[--color-gold-dark]/60 uppercase tracking-[0.2em]">{group.group}</td>
                      </tr>
                      {group.rows.map((row, i) => (
                        <tr key={row.label} className={`border-b border-[--color-gold]/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-[--color-gold]/[0.008]"}`}>
                          <td className="px-5 py-3.5 text-[--color-silver-dark]/55 text-xs font-medium">{row.label}</td>
                          {[row.starter, row.basic, row.creator, row.pro, row.studio].map((val, j) => {
                            const isCreator = j === 2;
                                const isCheck = val === "✓";
                                const isDash = val === "—";
                                const isWatermark = val === "Watermark";
                                const isClean = val === "Clean";
                                return (
                                  <td key={j} className={`text-center px-4 py-3.5 text-xs ${isCreator ? "bg-[--color-gold]/[0.03]" : ""}`}>
                                    {isCheck ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[--color-gold]/[0.12]">
                                        <Check className="w-3 h-3 text-[--color-gold]" />
                                      </span>
                                    ) : isDash ? (
                                      <span className="text-[--color-silver-dark]/15 text-base">—</span>
                                    ) : isWatermark ? (
                                      <span className="text-[10px] font-medium text-[--color-silver-dark]/30 bg-[--color-silver-dark]/[0.04] px-2 py-0.5 rounded-full">Watermark</span>
                                    ) : isClean ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[--color-gold-dark]">
                                        <Check className="w-2.5 h-2.5" /> No watermark
                                      </span>
                                    ) : (
                                      <span className={`font-semibold ${isCreator ? "text-[--color-gold]" : "text-[--color-silver-dark]/60"}`}>{val}</span>
                                    )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-center text-xs text-[--color-silver-dark]/25 mt-4">All plans include access to all 6 WIZ AI products. Renders reset monthly. Bundles never expire.</p>
        </div>

        {/* ── 8. FAQ ── */}
        <div className="max-w-2xl mx-auto px-6 mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Frequently asked questions</h2>
            <p className="text-sm text-[--color-silver-dark]/45">Everything you need to know before you buy.</p>
          </div>
          <div className="rounded-2xl border border-[--color-gold]/[0.08] bg-[#0a0a0a] px-6">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-[--color-silver-dark]/40">Still have questions? <a href="/help" className="text-[--color-gold-dark] hover:text-[--color-gold] transition-colors font-medium">Visit the Help Centre</a></p>
          </div>
        </div>

        {/* ── 9. Post-render explanation ── */}
        <div className="max-w-3xl mx-auto px-6 mb-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.1] mb-4">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">After you render</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">What happens after rendering?</h2>
            <p className="text-[--color-silver-dark]/45 text-sm max-w-lg mx-auto">Your video goes through four processing stages. You'll be notified when it's ready.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: <Clock className="w-5 h-5" />, stage: "Queued", desc: "Your job enters the render queue. Creator, Pro, and Studio plans get priority processing.", color: "text-[--color-silver-dark]/50" },
              { icon: <Wand2 className="w-5 h-5" />, stage: "Building", desc: "AI animates each scene from your approved storyboard. No new content is generated at this stage.", color: "text-[--color-gold]" },
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
                <p className="text-xs text-[--color-silver-dark]/45">We'll email you when your render is complete — no need to stay on the page.</p>
              </div>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-[--color-silver]/8 border border-[--color-silver]/20 flex items-start gap-3">
              <Download className="w-4 h-4 text-[--color-silver] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[--color-silver-light] mb-1">Instant download</p>
                <p className="text-xs text-[--color-silver-dark]/45">Your completed video appears in your dashboard. Download MP4 immediately.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 10. WizSound Technical Showcase ── */}
        <WizSoundShowcase />

        {/* ── 11. Bottom CTA ── */}
        <div className="relative text-center px-6 mt-20 py-20 overflow-hidden rounded-2xl mx-6">
          <img src="/manus-storage/pricing-hero-bg_7e23edd2.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.15]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none" />
          <div className="absolute inset-0 border border-[--color-gold]/[0.15] rounded-2xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">Start Today</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Ready to create?</h2>
            <p className="text-sm text-[--color-silver-dark]/60 mb-8 max-w-sm mx-auto">Start building your video for free — no credit card required. Pay only when you render.</p>
            <a href={isAuthenticated ? "/music-video/create" : "/onboarding"} className="btn-primary btn-sheen inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-sm">
              <Sparkles className="w-4 h-4" />
              Start Creating
            </a>
            <p className="text-xs text-[--color-silver-dark]/30 mt-4">No credit card required · Cancel anytime</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes priceFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Footer ── */}
      <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-16 px-6 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <NavLink href="/"><img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.6rem] w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" /></NavLink>
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
