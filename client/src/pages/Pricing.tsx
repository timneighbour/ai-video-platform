/**
 * Pricing page — premium cinematic redesign.
 * Sections:
 *   1. Nav
 *   2. Hero — cinematic bg, animated badge, headline
 *   3. How it works — visual step cards with photography
 *   4. Per-render pricing — large visual tier cards
 *   5. Subscription plans — rich cinematic plan cards with bg imagery
 *   6. Product coverage strip — all 6 logos
 *   7. Render bundles — premium bundle cards
 *   8. Social proof / testimonials
 *   9. Trust strip
 *  10. Comparison table — grouped, sticky header
 *  11. FAQ
 *  12. Bottom CTA
 *  13. Footer
 */
import { useState, useEffect, useRef } from "react";
import { mp } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Check, X, ChevronDown, ChevronUp, Sparkles, Download, Music2, Film, Package,
  Wand2, ArrowRight, Image, FileText, Menu, Shield, CreditCard, RefreshCcw,
  Users, Star, Crown, Zap, Play, Headphones, Globe, Layers
} from "lucide-react";

// ── CDN assets ────────────────────────────────────────────────────────────────
const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";
const PRICING_HERO_BG = "/manus-storage/pricing-hero-bg_7e23edd2.jpg";
const HIW_STEP1 = "/manus-storage/hiw-step1-choose_1102ddee.jpg";
const HIW_STEP2 = "/manus-storage/hiw-step2-storyboard_21e66052.jpg";
const HIW_STEP3 = "/manus-storage/hiw-step3-preview_e536f5b1.jpg";
const HIW_STEP4 = "/manus-storage/hiw-step4-export_68c87f9e.jpg";
const SHOWCASE_1 = "/manus-storage/showcase-midnight-city_d2b326c1.jpg";
const SHOWCASE_2 = "/manus-storage/showcase-stage-performance_3379ee75.jpg";
const SHOWCASE_3 = "/manus-storage/showcase-star-quest_c9d5cd00.jpg";
const CREATOR_MUSICIANS = "/manus-storage/creator-musicians_cc8c2a51.jpg";
const CREATOR_CONTENT = "/manus-storage/creator-content-creators_ae0d5147.jpg";
const CREATOR_YOUTUBERS = "/manus-storage/creator-youtubers-brands_088b54d8.jpg";
const CREATOR_ANIMATORS = "/manus-storage/creator-animators_d6999585.jpg";
const AVATAR_DANIEL = "/manus-storage/avatar-daniel_64a2beaf.jpg";
const AVATAR_MARCUS = "/manus-storage/avatar-marcus_5c70b009.jpg";
const AVATAR_PRIYA = "/manus-storage/avatar-priya_5975eaf5.jpg";
const AVATAR_SOPHIE = "/manus-storage/avatar-sophie_7b87260f.jpg";

// Product logos
const LOGO_WIZAUDIO = "/manus-storage/wizaudio-logo-v1_f428aad0.png";
const LOGO_WIZIMAGE = "/manus-storage/wizimage-logo-v1_83c86e5c.png";
const LOGO_WIZVIDEO = "/manus-storage/wizvideo-logo-v1_9ec37e45.png";
const LOGO_WIZSHORTS = "/manus-storage/wizshorts-logo-v1_533db978.png";
const LOGO_WIZANIMATE = "/manus-storage/wizanimate-logo-v3_f7af07e9.png";
const LOGO_WIZSCRIPT = "/manus-storage/wizscript-logo-v1_c6af5345.png";

// Plan background images (reuse product hero images for plan card atmospheres)
const PLAN_BG_STARTER = "/manus-storage/product-wizcreate-hero_6c3efa10.jpg";
const PLAN_BG_BASIC = "/manus-storage/product-wizgenesis-hero_0a9aa16b.jpg";
const PLAN_BG_CREATOR = "/manus-storage/product-wizlumina-hero_ed20683e.jpg";
const PLAN_BG_PRO = "/manus-storage/product-wizsound-hero_8219d2d2.jpg";
const PLAN_BG_STUDIO = "/manus-storage/product-wizboost-hero_9c11e1cc.jpg";

// ── Nav products ──────────────────────────────────────────────────────────────
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
          <button className="flex md:hidden w-10 h-10 items-center justify-center rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
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

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    monthlyPrice: 9,
    annualPrice: 79,
    bestFor: "First-time creators",
    tagline: "Try WIZ AI with no commitment.",
    rendersPerMonth: 2,
    outputQuality: "720p",
    watermark: true,
    priorityRendering: false,
    characterConsistency: false,
    apiAccess: false,
    popular: false,
    badge: null as string | null,
    accentColor: "oklch(0.65 0.08 240)",
    bgImage: PLAN_BG_STARTER,
    glowColor: "rgba(100,140,200,0.12)",
    borderColor: "rgba(100,140,200,0.2)",
    features: [
      { text: "2 renders/month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark", included: false },
      { text: "HD & 4K quality", included: false },
      { text: "Character consistency", included: false },
      { text: "Priority rendering", included: false },
    ],
  },
  {
    id: "basic" as const,
    name: "Basic",
    monthlyPrice: 19,
    annualPrice: 190,
    bestFor: "Casual creators",
    tagline: "Clean exports, no watermark.",
    rendersPerMonth: 5,
    outputQuality: "HD 1080p",
    watermark: false,
    priorityRendering: false,
    characterConsistency: false,
    apiAccess: false,
    popular: false,
    badge: null as string | null,
    accentColor: "oklch(0.70 0.10 160)",
    bgImage: PLAN_BG_BASIC,
    glowColor: "rgba(80,180,120,0.12)",
    borderColor: "rgba(80,180,120,0.2)",
    features: [
      { text: "5 renders/month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "720p & HD 1080p quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark", included: true },
      { text: "4K quality", included: false },
      { text: "Character consistency", included: false },
      { text: "Priority rendering", included: false },
    ],
  },
  {
    id: "creator" as const,
    name: "Creator",
    monthlyPrice: 35,
    annualPrice: 350,
    bestFor: "Active content creators",
    tagline: "The most popular plan for a reason.",
    rendersPerMonth: 15,
    outputQuality: "4K 2160p",
    watermark: false,
    priorityRendering: true,
    characterConsistency: true,
    apiAccess: false,
    popular: true,
    badge: "Most Popular",
    accentColor: "oklch(0.78 0.11 75)",
    bgImage: PLAN_BG_CREATOR,
    glowColor: "rgba(196,164,100,0.18)",
    borderColor: "rgba(196,164,100,0.45)",
    features: [
      { text: "15 renders/month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "720p, HD & 4K quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    monthlyPrice: 59,
    annualPrice: 590,
    bestFor: "Professional creators",
    tagline: "More renders, full quality, full control.",
    rendersPerMonth: 25,
    outputQuality: "4K 2160p",
    watermark: false,
    priorityRendering: true,
    characterConsistency: true,
    apiAccess: false,
    popular: false,
    badge: null as string | null,
    accentColor: "oklch(0.72 0.12 300)",
    bgImage: PLAN_BG_PRO,
    glowColor: "rgba(160,100,220,0.14)",
    borderColor: "rgba(160,100,220,0.25)",
    features: [
      { text: "25 renders/month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "720p, HD & 4K quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "studio" as const,
    name: "Studio",
    monthlyPrice: 99,
    annualPrice: 990,
    bestFor: "Teams & agencies",
    tagline: "Full API access. Built for scale.",
    rendersPerMonth: 40,
    outputQuality: "4K 2160p",
    watermark: false,
    priorityRendering: true,
    characterConsistency: true,
    apiAccess: true,
    popular: false,
    badge: null as string | null,
    accentColor: "oklch(0.75 0.09 30)",
    bgImage: PLAN_BG_STUDIO,
    glowColor: "rgba(220,140,80,0.14)",
    borderColor: "rgba(220,140,80,0.25)",
    features: [
      { text: "40 renders/month", included: true },
      { text: "All 6 WIZ AI products", included: true },
      { text: "720p, HD & 4K quality", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "No watermark", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority rendering", included: true },
      { text: "Full API access", included: true },
    ],
  },
];

// ── Render bundles ────────────────────────────────────────────────────────────
const BUNDLES = [
  {
    id: "6" as const,
    renders: 6,
    price: 10,
    perRender: "£1.67",
    label: "Starter Pack",
    popular: false,
    bestValue: false,
    desc: "Top up when you need a few extra renders.",
    bgImage: SHOWCASE_3,
    accentColor: "rgba(100,140,200,0.15)",
    borderColor: "rgba(100,140,200,0.2)",
  },
  {
    id: "15" as const,
    renders: 15,
    price: 20,
    perRender: "£1.33",
    label: "Creator Pack",
    popular: true,
    bestValue: false,
    desc: "The most popular bundle — great for busy months.",
    bgImage: SHOWCASE_1,
    accentColor: "rgba(196,164,100,0.15)",
    borderColor: "rgba(196,164,100,0.4)",
  },
  {
    id: "40" as const,
    renders: 40,
    price: 50,
    perRender: "£1.25",
    label: "Studio Pack",
    popular: false,
    bestValue: true,
    desc: "Best value per render. Ideal for high-volume production.",
    bgImage: SHOWCASE_2,
    accentColor: "rgba(160,100,220,0.15)",
    borderColor: "rgba(160,100,220,0.25)",
  },
];

// ── Comparison table ──────────────────────────────────────────────────────────
const COMPARISON_GROUPS = [
  {
    group: "Output",
    rows: [
      { label: "Renders included/month", starter: "2", basic: "5", creator: "15", pro: "25", studio: "40" },
      { label: "Max output quality", starter: "720p", basic: "HD 1080p", creator: "4K 2160p", pro: "4K 2160p", studio: "4K 2160p" },
      { label: "Watermark on exports", starter: false, basic: true, creator: true, pro: true, studio: true, isCheck: true },
    ],
  },
  {
    group: "Features",
    rows: [
      { label: "All 6 WIZ AI products", starter: true, basic: true, creator: true, pro: true, studio: true, isCheck: true },
      { label: "WizSound audio mastering", starter: true, basic: true, creator: true, pro: true, studio: true, isCheck: true },
      { label: "Character consistency", starter: false, basic: false, creator: true, pro: true, studio: true, isCheck: true },
      { label: "Priority rendering", starter: false, basic: false, creator: true, pro: true, studio: true, isCheck: true },
    ],
  },
  {
    group: "Access",
    rows: [
      { label: "API access", starter: false, basic: false, creator: false, pro: false, studio: true, isCheck: true },
      { label: "Render bundles", starter: true, basic: true, creator: true, pro: true, studio: true, isCheck: true },
      { label: "Pay-per-render", starter: true, basic: true, creator: true, pro: true, studio: true, isCheck: true },
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
    a: "Character consistency uses AI to maintain the same character appearance across multiple scenes in your video. Available on Creator, Pro, and Studio plans.",
  },
  {
    q: "What is priority rendering?",
    a: "Priority rendering moves your job to the front of the render queue. On Creator, Pro, and Studio plans, your videos process faster — typically within minutes.",
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
    q: "Does pricing cover all WIZ AI products?",
    a: "Yes. Your subscription renders and render bundles work across all WIZ AI products — WizVideo, WizScript, WizShorts, WizAnimate, WizAudio, and WizImage. Each render or export consumes one credit regardless of the product used.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button className="w-full flex items-center justify-between py-5 text-left gap-4" onClick={() => setOpen(!open)}>
        <span className="text-sm font-semibold text-white/80 leading-snug">{q}</span>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? "bg-[--color-gold]/20 text-[--color-gold]" : "bg-white/[0.04] text-white/30"}`}>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>
      {open && (
        <p className="text-sm text-white/45 pb-5 leading-relaxed pr-10">{a}</p>
      )}
    </div>
  );
}

// ── Comparison cell helper ────────────────────────────────────────────────────
function CompCell({ value, isCheck }: { value: string | boolean; isCheck?: boolean }) {
  if (isCheck) {
    return value ? (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-[--color-gold]/[0.12] border border-[--color-gold]/30 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-[--color-gold]" />
        </div>
      </div>
    ) : (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-white/[0.03] flex items-center justify-center">
          <X className="w-3 h-3 text-white/20" />
        </div>
      </div>
    );
  }
  return <span className="text-xs font-semibold text-white/70 text-center block">{value as string}</span>;
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
        plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <div className="min-h-screen bg-[#040404] text-white overflow-x-hidden">
      <style>{`
        @keyframes priceFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmerSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes floatUp { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes glowPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        .plan-card-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(196,164,100,0.06) 50%, transparent 60%);
          animation: shimmerSlide 3.5s ease-in-out infinite;
          pointer-events: none;
          border-radius: inherit;
        }
        .popular-glow { box-shadow: 0 0 60px rgba(196,164,100,0.18), 0 0 120px rgba(196,164,100,0.08), inset 0 1px 0 rgba(196,164,100,0.15); }
        .render-tier-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .render-tier-card:hover { transform: translateY(-4px); }
      `}</style>

      <PricingNav isAuthenticated={isAuthenticated} />

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[520px] flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 overflow-hidden">
        {/* Cinematic background */}
        <div className="absolute inset-0 pointer-events-none">
          <img src={PRICING_HERO_BG} alt="" className="w-full h-full object-cover opacity-25" loading="eager" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,4,4,0.2) 0%, rgba(4,4,4,0.55) 50%, #040404 100%)' }} />
          {/* Gold radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, rgba(196,164,100,0.4) 0%, transparent 70%)' }} />
        </div>

        {/* Floating showcase thumbnails — desktop only */}
        <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 w-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl opacity-60" style={{ animation: 'floatUp 6s ease-in-out infinite' }}>
          <img src={SHOWCASE_1} alt="" className="w-full h-32 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/30 flex items-center justify-center"><Play className="w-2.5 h-2.5 text-[--color-gold] fill-[--color-gold]" /></div>
            <span className="text-[10px] text-white/70 font-medium">WizVideo</span>
          </div>
        </div>
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl opacity-60" style={{ animation: 'floatUp 6s ease-in-out infinite 2s' }}>
          <img src={SHOWCASE_2} alt="" className="w-full h-32 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/30 flex items-center justify-center"><Play className="w-2.5 h-2.5 text-[--color-gold] fill-[--color-gold]" /></div>
            <span className="text-[10px] text-white/70 font-medium">WizAnimate</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/20 bg-[--color-gold]/[0.05] mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold]">Transparent Pricing</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-5 leading-[1.05]">
            Create free.<br />
            <span className="metallic-gold">Pay to render.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto leading-relaxed mb-8">
            Build your entire video at no cost. Only pay when you're ready to download your finished creation.
          </p>
          {/* Trust pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: <Check className="w-3.5 h-3.5" />, text: "No credit card to start" },
              { icon: <Check className="w-3.5 h-3.5" />, text: "Cancel anytime" },
              { icon: <Check className="w-3.5 h-3.5" />, text: "Secure checkout via Stripe" },
              { icon: <Globe className="w-3.5 h-3.5" />, text: "40+ countries supported" },
            ].map((pill) => (
              <span key={pill.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs text-white/50">
                <span className="text-[--color-gold]/70">{pill.icon}</span>
                {pill.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ── */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Three steps to your finished video</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { step: "01", img: HIW_STEP1, title: "Create for free", desc: "Upload your audio, generate your storyboard, and build your video. No credit card required." },
            { step: "02", img: HIW_STEP3, title: "Preview & refine", desc: "Review your scenes, adjust the style, and perfect every detail before committing." },
            { step: "03", img: HIW_STEP4, title: "Pay to render & download", desc: "Happy with the result? Choose your quality and download. Pay only for what you render." },
          ].map((item, i) => (
            <div key={item.step} className="relative rounded-2xl overflow-hidden border border-white/[0.07] group" style={{ animationDelay: `${i * 0.1}s` }}>
              {/* Background photo */}
              <div className="relative h-44 overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.1) 0%, rgba(4,4,4,0.85) 100%)' }} />
                {/* Step number */}
                <div className="absolute top-4 left-4">
                  <div className="w-10 h-10 rounded-full border-2 border-[--color-gold]/40 bg-[--color-gold]/10 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs font-black text-[--color-gold] tracking-wider">{item.step}</span>
                  </div>
                </div>
              </div>
              {/* Content */}
              <div className="p-5 bg-[#0a0a0a]">
                <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. PER-RENDER PRICING ── */}
      <section className="max-w-5xl mx-auto px-6 mb-24" id="render-pricing">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Pay As You Go</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Pay-per-render pricing</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">No subscription needed. One price per full video render. Choose your quality.</p>
        </div>

        {/* Quality tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            {
              label: "Standard",
              resolution: "720p",
              price: 2,
              desc: "Great for social media & previews",
              badge: null,
              img: SHOWCASE_3,
              features: ["YouTube Shorts", "Instagram Stories", "TikTok", "Twitter/X"],
              accentColor: "rgba(100,140,200,0.2)",
              borderColor: "rgba(100,140,200,0.2)",
            },
            {
              label: "HD",
              resolution: "1080p",
              price: 4,
              desc: "Perfect for YouTube & streaming",
              badge: "MOST POPULAR",
              img: SHOWCASE_1,
              features: ["YouTube", "Instagram Reels", "Vimeo", "Facebook Video"],
              accentColor: "rgba(196,164,100,0.15)",
              borderColor: "rgba(196,164,100,0.45)",
            },
            {
              label: "4K",
              resolution: "2160p",
              price: 6,
              desc: "Cinema-grade quality",
              badge: null,
              img: SHOWCASE_2,
              features: ["Cinema & broadcast", "Professional portfolio", "Premium streaming", "Large-screen display"],
              accentColor: "rgba(160,100,220,0.15)",
              borderColor: "rgba(160,100,220,0.25)",
            },
          ].map((tier) => (
            <div
              key={tier.label}
              className="render-tier-card relative flex flex-col rounded-2xl overflow-hidden border"
              style={{ borderColor: tier.borderColor, boxShadow: tier.badge ? `0 0 40px ${tier.accentColor}` : 'none' }}
            >
              {tier.badge && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider shadow-lg whitespace-nowrap">
                  {tier.badge}
                </div>
              )}
              {/* Background image */}
              <div className="relative h-36 overflow-hidden">
                <img src={tier.img} alt={tier.label} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(4,4,4,0.3) 0%, rgba(4,4,4,0.9) 100%)` }} />
                {/* Resolution badge */}
                <div className="absolute bottom-3 left-4 flex items-end gap-2">
                  <span className="text-4xl font-black text-white leading-none">{tier.label}</span>
                  <span className="text-sm text-white/50 mb-1">{tier.resolution}</span>
                </div>
              </div>
              {/* Price + features */}
              <div className="flex-1 p-5 bg-[#0c0c0c]">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-white">&pound;{tier.price}</span>
                  <span className="text-sm text-white/40">per render</span>
                </div>
                <p className="text-xs text-white/40 mb-4">{tier.desc}</p>
                <div className="space-y-1.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-white/50">
                      <Check className="w-3 h-3 text-[--color-gold]/60 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* WizSound Audio Add-on — premium card */}
        <div className="relative rounded-2xl overflow-hidden border border-[--color-gold]/[0.12]">
          {/* Subtle bg */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(196,164,100,0.04) 0%, transparent 60%)' }} />
          </div>
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[--color-gold]/20 to-[--color-gold]/5 border border-[--color-gold]/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-7 h-7 text-[--color-gold]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base font-bold text-white">WizSound Audio Mastering</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.2] text-[--color-gold] text-[9px] font-bold tracking-wider">OPTIONAL ADD-ON</span>
                </div>
                <p className="text-xs text-white/40">Spatial audio mastering — cinema-grade immersive sound added to any render</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Standard Audio",
                  sublabel: "Included free",
                  price: 0,
                  desc: "Original audio, used as-is",
                  features: ["Stereo output", "Original mix preserved"],
                  borderClass: "border-white/[0.07]",
                  bgClass: "bg-white/[0.02]",
                  priceColor: "text-white/30",
                },
                {
                  label: "WizSound Active",
                  sublabel: "+£1",
                  price: 1,
                  desc: "Polished, fuller sound with spatial widening",
                  features: ["Stereo widening", "Frequency EQ", "Noise reduction", "Spatial depth"],
                  borderClass: "border-[--color-gold]/[0.15]",
                  bgClass: "bg-[--color-gold]/[0.03]",
                  priceColor: "text-[--color-gold-dark]",
                },
                {
                  label: "WizSound Spatial",
                  sublabel: "+£3",
                  price: 3,
                  desc: "Full spatial mastering — cinema-grade immersive audio",
                  features: ["Full mastering pipeline", "Immersive spatial depth", "Dynamic range optimisation", "Streaming-ready loudness", "Cinema-grade output"],
                  borderClass: "border-[--color-gold]/[0.3]",
                  bgClass: "bg-gradient-to-br from-[--color-gold]/[0.07] to-transparent",
                  priceColor: "text-[--color-gold]",
                  badge: "RECOMMENDED",
                },
              ].map((audio) => (
                <div key={audio.label} className={`relative p-4 rounded-xl border ${audio.borderClass} ${audio.bgClass}`}>
                  {audio.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[9px] font-bold tracking-wider whitespace-nowrap shadow-lg">
                      {audio.badge}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{audio.label}</span>
                    <span className={`text-sm font-bold ${audio.priceColor}`}>
                      {audio.price === 0 ? "Free" : `+£${audio.price}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/35 mb-3">{audio.desc}</p>
                  <div className="space-y-1.5">
                    {audio.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/45">
                        <Check className="w-2.5 h-2.5 text-[--color-gold]/60 flex-shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SUBSCRIPTION PLANS ── */}
      <section className="max-w-7xl mx-auto px-6 mb-20" id="plans">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Subscription Plans</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Monthly plans for regular creators</h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto mb-8">Renders included every month. Best value for consistent creators. Cancel anytime.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                billingCycle === "monthly"
                  ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-[0_2px_12px_rgba(196,164,100,0.3)]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                billingCycle === "annual"
                  ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-[0_2px_12px_rgba(196,164,100,0.3)]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Yearly
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
                billingCycle === "annual" ? "bg-[#0a0a0a]/30 text-[#0a0a0a]" : "bg-[--color-gold]/15 text-[--color-gold]"
              }`}>Save 20%</span>
            </button>
          </div>
          {billingCycle === "annual" && (
            <p className="text-xs text-[--color-gold]/70 mt-3 font-medium">Billed as one annual payment — save 20% vs monthly</p>
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
                className={`plan-card-shimmer relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-500 ${
                  isPopular || isHighlighted ? "popular-glow" : "hover:border-white/[0.12]"
                }`}
                style={{
                  borderColor: isPopular || isHighlighted ? plan.borderColor : 'rgba(255,255,255,0.07)',
                }}
              >
                {/* Background image with overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <img src={plan.bgImage} alt="" className="w-full h-full object-cover opacity-20" loading="lazy" />
                  <div className="absolute inset-0" style={{
                    background: isPopular || isHighlighted
                      ? `linear-gradient(180deg, ${plan.glowColor} 0%, rgba(4,4,4,0.92) 40%, rgba(4,4,4,0.98) 100%)`
                      : 'linear-gradient(180deg, rgba(4,4,4,0.7) 0%, rgba(4,4,4,0.95) 40%, rgba(4,4,4,0.99) 100%)'
                  }} />
                </div>

                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[--color-gold] to-transparent" />
                )}
                {plan.badge && (
                  <div className="relative z-10 text-center pt-3 pb-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-black tracking-wider shadow-lg">
                      <Star className="w-2.5 h-2.5 fill-current" /> {plan.badge}
                    </span>
                  </div>
                )}

                {/* Card content */}
                <div className="relative z-10 flex flex-col flex-1 p-5">
                  {/* Plan name */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-black text-white tracking-tight">{plan.name}</span>
                      {isPopular && <Crown className="w-4 h-4 text-[--color-gold]" />}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-0.5">Best for</p>
                    <p className="text-[11px] font-semibold" style={{ color: plan.accentColor }}>{plan.bestFor}</p>
                  </div>

                  {/* Price */}
                  <div key={billingCycle} style={{ animation: "priceFadeIn 220ms ease-out" }} className="mb-4 pb-4 border-b border-white/[0.06]">
                    {billingCycle === "monthly" ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white">&pound;{plan.monthlyPrice}</span>
                          <span className="text-xs text-white/35">/mo</span>
                        </div>
                        <p className="text-[10px] text-white/25 mt-0.5">billed monthly</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white">&pound;{plan.annualPrice}</span>
                          <span className="text-xs text-white/35">/yr</span>
                        </div>
                        <p className="text-[11px] mt-0.5 font-semibold" style={{ color: plan.accentColor }}>
                          &pound;{Math.round(plan.annualPrice / 12)}/mo · Save 20%
                        </p>
                      </>
                    )}
                  </div>

                  {/* Key stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl p-2.5 text-center" style={{ background: `${plan.glowColor}`, border: `1px solid ${plan.borderColor}` }}>
                      <div className="text-2xl font-black text-white">{plan.rendersPerMonth}</div>
                      <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-0.5">renders/mo</div>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-[11px] font-bold text-white leading-tight">{plan.outputQuality}</div>
                      <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-0.5">max quality</div>
                    </div>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className={`flex items-start gap-2 text-[11px] leading-snug ${
                        f.included ? "text-white/65" : "text-white/20"
                      }`}>
                        {f.included ? (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${plan.glowColor}`, border: `1px solid ${plan.borderColor}` }}>
                            <Check className="w-2.5 h-2.5" style={{ color: plan.accentColor }} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-2.5 h-2.5 text-white/20" />
                          </div>
                        )}
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full rounded-xl font-bold text-sm h-11 transition-all duration-300 ${
                      isPopular || isHighlighted
                        ? "btn-primary shadow-[0_4px_20px_rgba(196,164,100,0.25)] hover:shadow-[0_4px_30px_rgba(196,164,100,0.4)]"
                        : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]"
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        Get {plan.name}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-white/20 mt-6">No hidden fees · Cancel anytime · Full control before checkout</p>
      </section>

      {/* ── 5. PRODUCT COVERAGE STRIP ── */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <div className="rounded-2xl border border-[--color-gold]/[0.1] bg-gradient-to-br from-[--color-gold]/[0.03] to-transparent p-8">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-white mb-2">One subscription. Six powerful tools.</h3>
            <p className="text-sm text-white/40">Every plan includes access to all WIZ AI products. Your renders work across every tool.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[
              { logo: LOGO_WIZAUDIO, name: "WizAudio", label: "AI Music", href: "/music-creator", color: "rgba(0,200,180,0.15)", border: "rgba(0,200,180,0.25)" },
              { logo: LOGO_WIZIMAGE, name: "WizImage", label: "AI Images", href: "/wiz-image", color: "rgba(196,164,100,0.15)", border: "rgba(196,164,100,0.3)" },
              { logo: LOGO_WIZVIDEO, name: "WizVideo", label: "Music Videos", href: "/music-video/create", color: "rgba(60,120,220,0.15)", border: "rgba(60,120,220,0.25)" },
              { logo: LOGO_WIZSHORTS, name: "WizShorts", label: "Short Videos", href: "/wiz-shorts", color: "rgba(220,100,40,0.15)", border: "rgba(220,100,40,0.25)" },
              { logo: LOGO_WIZANIMATE, name: "WizAnimate", label: "Animation", href: "/kids-video", color: "rgba(200,60,180,0.15)", border: "rgba(200,60,180,0.25)" },
              { logo: LOGO_WIZSCRIPT, name: "WizScript", label: "Text-to-Video", href: "/text-to-video", color: "rgba(0,200,220,0.15)", border: "rgba(0,200,220,0.25)" },
            ].map((product) => (
              <a
                key={product.name}
                href={product.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 hover:scale-105 group"
                style={{ background: product.color, borderColor: product.border }}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
                  <img src={product.logo} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold text-white group-hover:text-[--color-gold] transition-colors">{product.name}</p>
                  <p className="text-[9px] text-white/40 mt-0.5">{product.label}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. RENDER BUNDLES ── */}
      <section className="max-w-5xl mx-auto px-6 mb-24" id="bundles">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Render Bundles</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Buy renders in bulk. Save more.</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">Bundles never expire and work alongside any subscription plan. Top up whenever you need.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {BUNDLES.map((bundle) => (
            <div
              key={bundle.id}
              className="render-tier-card relative flex flex-col rounded-2xl overflow-hidden border"
              style={{
                borderColor: bundle.borderColor,
                boxShadow: bundle.popular ? `0 0 50px ${bundle.accentColor}` : 'none',
              }}
            >
              {(bundle.popular || bundle.bestValue) && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[--color-gold] to-transparent" />
              )}
              {bundle.popular && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider shadow-lg whitespace-nowrap">
                  MOST POPULAR
                </div>
              )}
              {bundle.bestValue && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider shadow-lg whitespace-nowrap">
                  BEST VALUE
                </div>
              )}

              {/* Background image */}
              <div className="relative h-40 overflow-hidden">
                <img src={bundle.bgImage} alt={bundle.label} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.2) 0%, rgba(4,4,4,0.85) 100%)' }} />
                {/* Render count display */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-white leading-none">{bundle.renders}</span>
                    <div className="mb-1">
                      <span className="text-sm text-white/60 font-semibold block">renders</span>
                      <span className="text-xs text-white/40">{bundle.perRender} each</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col p-5 bg-[#0c0c0c]">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4" style={{ color: bundle.popular ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)' }} />
                  <span className="text-sm font-bold text-white">{bundle.label}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-white">&pound;{bundle.price}</span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed mb-5 flex-1">{bundle.desc}</p>
                <Button
                  onClick={() => handleBundlePurchase(bundle.id)}
                  disabled={loadingBundle === bundle.id}
                  className={`w-full rounded-xl font-bold text-sm h-10 ${
                    bundle.popular
                      ? "btn-primary"
                      : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]"
                  }`}
                >
                  {loadingBundle === bundle.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Buy {bundle.renders} renders — &pound;{bundle.price}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. SOCIAL PROOF ── */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Trusted By Creators</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Creators love WIZ AI</h2>
          <p className="text-sm text-white/40">From musicians to studios — creators worldwide are choosing WIZ AI</p>
        </div>

        {/* Creator category visual cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { img: CREATOR_MUSICIANS, label: "Musicians", sub: "Music video creators", color: "rgba(196,164,100,0.2)" },
            { img: CREATOR_CONTENT, label: "Content Creators", sub: "YouTube & social", color: "rgba(60,120,220,0.2)" },
            { img: CREATOR_YOUTUBERS, label: "Brands", sub: "Marketing & ads", color: "rgba(0,200,180,0.2)" },
            { img: CREATOR_ANIMATORS, label: "Animators", sub: "Studios & artists", color: "rgba(200,60,180,0.2)" },
          ].map((cat) => (
            <div key={cat.label} className="relative rounded-2xl overflow-hidden border border-white/[0.07] group">
              <div className="relative h-36 sm:h-44 overflow-hidden">
                <img src={cat.img} alt={cat.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(4,4,4,0.1) 0%, rgba(4,4,4,0.8) 100%)` }} />
                <div className="absolute bottom-3 left-3">
                  <p className="text-sm font-bold text-white">{cat.label}</p>
                  <p className="text-[10px] text-white/50">{cat.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              avatar: AVATAR_MARCUS,
              name: "Marcus T.",
              role: "Music Producer",
              quote: "WIZ AI turned my track into a cinematic music video in under 10 minutes. The quality blew my mind.",
              plan: "Creator Plan",
              stars: 5,
            },
            {
              avatar: AVATAR_PRIYA,
              name: "Priya S.",
              role: "Content Creator",
              quote: "I use WizShorts every week for my Reels. The pay-per-render model means I only pay when I'm happy.",
              plan: "Basic Plan",
              stars: 5,
            },
            {
              avatar: AVATAR_SOPHIE,
              name: "Sophie L.",
              role: "Brand Director",
              quote: "The Studio plan gives our team full API access. We've automated our entire video production pipeline.",
              plan: "Studio Plan",
              stars: 5,
            },
            {
              avatar: AVATAR_DANIEL,
              name: "Daniel K.",
              role: "Animator",
              quote: "WizAnimate is incredible for stylised animation. Character consistency on the Creator plan is a game-changer.",
              plan: "Creator Plan",
              stars: 5,
            },
          ].map((t) => (
            <div key={t.name} className="relative p-5 rounded-2xl border border-white/[0.07] bg-[#0a0a0a] flex flex-col gap-3">
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-[--color-gold] fill-[--color-gold]" />
                ))}
              </div>
              {/* Quote */}
              <p className="text-xs text-white/55 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                <img src={t.avatar} alt={t.name} className="w-8 h-8 rounded-full object-cover border border-white/10" loading="lazy" />
                <div>
                  <p className="text-xs font-semibold text-white">{t.name}</p>
                  <p className="text-[10px] text-white/35">{t.role}</p>
                </div>
                <span className="ml-auto text-[9px] font-bold text-[--color-gold]/60 bg-[--color-gold]/[0.06] border border-[--color-gold]/[0.12] px-2 py-0.5 rounded-full whitespace-nowrap">{t.plan}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. TRUST STRIP ── */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <div className="rounded-2xl border border-[--color-gold]/[0.1] overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
            {[
              {
                icon: <Shield className="w-6 h-6 text-[--color-gold]" />,
                label: "Secure checkout",
                sub: "Powered by Stripe",
                bg: "from-[--color-gold]/[0.04]",
              },
              {
                icon: <CreditCard className="w-6 h-6 text-[--color-gold]" />,
                label: "No card to start",
                sub: "Create for free",
                bg: "from-blue-500/[0.04]",
              },
              {
                icon: <RefreshCcw className="w-6 h-6 text-[--color-gold]" />,
                label: "Cancel anytime",
                sub: "No lock-in",
                bg: "from-green-500/[0.04]",
              },
              {
                icon: <Globe className="w-6 h-6 text-[--color-gold]" />,
                label: "40+ countries",
                sub: "Global payments",
                bg: "from-purple-500/[0.04]",
              },
            ].map((item) => (
              <div key={item.label} className={`flex flex-col items-center gap-3 p-6 text-center bg-gradient-to-b ${item.bg} to-transparent`}>
                <div className="w-12 h-12 rounded-2xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.12] flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-xs text-white/35 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. COMPARISON TABLE ── */}
      <section className="max-w-6xl mx-auto px-6 mb-24" id="compare">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Compare Plans</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Full feature comparison</h2>
          <p className="text-sm text-white/40">Everything you need to choose the right plan</p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-6 bg-[#0a0a0a] border-b border-white/[0.07]">
            <div className="col-span-2 p-4 flex items-center">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Feature</span>
            </div>
            {["Starter", "Basic", "Creator", "Pro", "Studio"].map((name, i) => (
              <div key={name} className={`p-4 text-center border-l border-white/[0.05] ${i === 2 ? "bg-[--color-gold]/[0.04]" : ""}`}>
                <p className="text-xs font-bold text-white">{name}</p>
                {i === 2 && <p className="text-[9px] text-[--color-gold] font-semibold mt-0.5">Most Popular</p>}
              </div>
            ))}
          </div>

          {COMPARISON_GROUPS.map((group, gi) => (
            <div key={group.group}>
              {/* Group header */}
              <div className="grid grid-cols-6 bg-[#080808] border-b border-white/[0.04]">
                <div className="col-span-6 px-4 py-2.5 flex items-center gap-2">
                  <Layers className="w-3 h-3 text-[--color-gold]/50" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--color-gold]/50">{group.group}</span>
                </div>
              </div>
              {group.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-6 border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.01] ${
                    gi === COMPARISON_GROUPS.length - 1 && ri === group.rows.length - 1 ? "border-0" : ""
                  }`}
                >
                  <div className="col-span-2 px-4 py-3.5 flex items-center">
                    <span className="text-xs text-white/55">{row.label}</span>
                  </div>
                  {(["starter", "basic", "creator", "pro", "studio"] as const).map((planId, pi) => (
                    <div key={planId} className={`px-2 py-3.5 flex items-center justify-center border-l border-white/[0.04] ${pi === 2 ? "bg-[--color-gold]/[0.02]" : ""}`}>
                      <CompCell value={(row as Record<string, string | boolean>)[planId]} isCheck={row.isCheck} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── 10. FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Frequently asked questions</h2>
          <p className="text-sm text-white/40">Everything you need to know about pricing and plans</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] px-6 divide-y divide-white/[0.05]">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── 11. BOTTOM CTA ── */}
      <section className="relative max-w-5xl mx-auto px-6 mb-24">
        <div className="relative rounded-3xl overflow-hidden border border-[--color-gold]/[0.15]">
          {/* Background */}
          <div className="absolute inset-0">
            <img src={SHOWCASE_2} alt="" className="w-full h-full object-cover opacity-20" loading="lazy" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(4,4,4,0.85) 0%, rgba(4,4,4,0.75) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(196,164,100,0.12) 0%, transparent 60%)' }} />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 p-10 sm:p-12">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
                Start creating today.<br />
                <span className="metallic-gold">No card required.</span>
              </h2>
              <p className="text-sm text-white/45 max-w-md leading-relaxed">
                Build your first video completely free. Only pay when you're ready to render and download your masterpiece.
              </p>
              <div className="flex flex-wrap gap-3 mt-5 justify-center sm:justify-start">
                {["No credit card to start", "Cancel anytime", "All 6 tools included"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-xs text-white/50">
                    <Check className="w-3.5 h-3.5 text-[--color-gold]/60" /> {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0">
              <a href="/onboarding" className="btn-primary flex items-center gap-2 px-8 py-3.5 text-base font-bold rounded-xl whitespace-nowrap shadow-[0_4px_30px_rgba(196,164,100,0.3)]">
                <Sparkles className="w-5 h-5" />
                Start Creating Free
              </a>
              <a href="#plans" className="flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
                View all plans <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. FOOTER ── */}
      <footer className="border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-10 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
          </a>
          <div className="flex flex-wrap items-center gap-6 text-xs text-white/30">
            <a href="/" className="hover:text-white/60 transition-colors">Home</a>
            <a href="/pricing" className="hover:text-white/60 transition-colors text-[--color-gold]/60">Pricing</a>
            <a href="/help" className="hover:text-white/60 transition-colors">Help</a>
            <a href="/onboarding" className="hover:text-white/60 transition-colors">Get Started</a>
          </div>
          <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
