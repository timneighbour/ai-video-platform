/**
 * Pricing page — premium cinematic redesign.
 * Sections:
 *   1. Nav
 *   2. Hero — cinematic bg, animated badge, headline
 *   3. How it works — visual step cards with photography
 *   4. Per-video pricing — large visual tier cards
 *   5. Subscription plans — rich cinematic plan cards with bg imagery
 *   6. Product coverage strip — all 6 logos
 *   7. Extra Video Credit Packs — premium credit pack cards
 *   8. Social proof / testimonials
 *   9. Trust strip
 *  10. Comparison table — grouped, sticky header
 *  11. FAQ
 *  12. Bottom CTA
 *  13. Footer
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useSEO } from "@/hooks/useSEO";
import { mp } from "@/lib/mixpanel";
import { gtagSendEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Check, X, ChevronDown, ChevronUp, Sparkles, Download, Music2, Film, Package,
  Wand2, ArrowRight, Image, FileText, Menu, Shield, CreditCard, RefreshCcw,
  Users, Star, Crown, Zap, Play, Headphones, Globe, Layers
} from "@/lib/icons";
import WizSoundDemoPlayer from "@/components/WizSoundDemoPlayer";
import ShowcaseVideoSection from "@/components/ShowcaseVideoSection";

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
  // 1 scene ≈ 8 seconds of video (Atlas Cloud Seedance 2.0 Fast, 720p)
  {
    id: "starter" as const,
    name: "Starter",
    monthlyPrice: 19,
    annualPrice: 190,
    bestFor: "Best for first-time creators",
    tagline: "Start creating music videos today.",
    rendersPerMonth: 2,
    scenesPerVideo: 8,
    outputQuality: "720p",
    watermark: false,
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
      { text: "2 final videos per month", included: true },
      { text: "Up to 8 scenes per video", included: true },
      { text: "Around 64 seconds max", included: true },
      { text: "Standard 720p quality", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "HD & 4K quality", included: false },
      { text: "Character consistency", included: false },
    ],
  },
  {
    id: "creator" as const,
    name: "Creator",
    monthlyPrice: 49,
    annualPrice: 490,
    bestFor: "Best for active creators",
    tagline: "More videos, more scenes, more creative control.",
    rendersPerMonth: 6,
    scenesPerVideo: 11,
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
      { text: "6 final videos per month", included: true },
      { text: "Up to 11 scenes per video", included: true },
      { text: "Around 88 seconds max", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority video builds", included: true },
    ],
  },
  {
    id: "pro" as const,
    name: "Studio",
    monthlyPrice: 149,
    annualPrice: 1490,
    bestFor: "Best for brands, agencies and high-volume creators",
    tagline: "12 videos a month. Full cinematic control.",
    rendersPerMonth: 12,
    scenesPerVideo: 12,
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
      { text: "12 final videos per month", included: true },
      { text: "Up to 12 scenes per video", included: true },
      { text: "Around 96 seconds max", included: true },
      { text: "4K 2160p output", included: true },
      { text: "No watermark", included: true },
      { text: "WizSound audio mastering", included: true },
      { text: "Character consistency", included: true },
      { text: "Priority video builds", included: true },
    ],
  },
]

// ── Extra Video Credit Packs ────────────────────────────────────────────────────────
const BUNDLES = [
  {
    id: "6" as const,
    renders: 6,
    price: 10,
    perRender: "£1.67 per Video Credit",
    label: "Starter Pack",
    popular: false,
    bestValue: false,
    desc: "Perfect when you need a few extra final video builds.",
    bgImage: SHOWCASE_3,
    accentColor: "rgba(100,140,200,0.15)",
    borderColor: "rgba(100,140,200,0.2)",
  },
  {
    id: "15" as const,
    renders: 15,
    price: 20,
    perRender: "£1.33 per Video Credit",
    label: "Creator Pack",
    popular: true,
    bestValue: false,
    desc: "Best for busy months, extra campaigns or multiple video ideas.",
    bgImage: SHOWCASE_1,
    accentColor: "rgba(196,164,100,0.15)",
    borderColor: "rgba(196,164,100,0.4)",
  },
  {
    id: "40" as const,
    renders: 40,
    price: 50,
    perRender: "£1.25 per Video Credit",
    label: "Studio Pack",
    popular: false,
    bestValue: true,
    desc: "Best value for high-volume creators, agencies and regular production.",
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
      { label: "Videos per month", starter: "2", creator: "6", pro: "12" },
      { label: "Video Credits / month", starter: "2", creator: "6", pro: "12" },
      { label: "Max scenes per video", starter: "8 (≈64s)", creator: "11 (≈88s)", pro: "12 (≈96s)" },
      { label: "Max output quality", starter: "720p", creator: "4K 2160p", pro: "4K 2160p" },
      { label: "No watermark", starter: true, creator: true, pro: true, isCheck: true },
    ],
  },
  {
    group: "Features",
    rows: [
      { label: "All 6 WIZ AI products", starter: true, creator: true, pro: true, isCheck: true },
      { label: "WizSound audio mastering", starter: true, creator: true, pro: true, isCheck: true },
      { label: "Character consistency", starter: false, creator: true, pro: true, isCheck: true },
      { label: "Priority video builds", starter: false, creator: true, pro: true, isCheck: true },
    ],
  },
  {
    group: "Access",
    rows: [
      { label: "Extra Video Credit Packs", starter: true, creator: true, pro: true, isCheck: true },
      { label: "Pay-per-video", starter: true, creator: true, pro: true, isCheck: true },
      { label: "Daily video limit", starter: "3/day", creator: "3/day", pro: "3/day" },
    ],
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What does 'Create free, pay when your video is ready' mean?",
    a: "You can create your entire video — upload audio, generate your storyboard, and refine every scene — completely free. A Video Credit is only used when you choose to generate and download the final video. Failed renders do not use credits. There is no time limit on the free creation tier.",
  },
  {
    q: "What is the difference between Standard, HD, and 4K?",
    a: "Standard (720p) is great for social media previews. HD (1080p) is perfect for YouTube, Instagram, and most streaming platforms. 4K (2160p) is cinema-grade quality for professional productions. 4K is available on Pro and Business plans.",
  },
  {
    q: "What happens if I use all my monthly Video Credits?",
    a: "Your Video Credits reset on your next billing date. In the meantime, you can top up instantly with an Extra Video Credit Pack (6, 15, or 40 credits) or pay per video at £2–£6 depending on quality. Extra Video Credit Packs never expire and are used automatically once your monthly credits run out.",
  },
  {
    q: "What are Extra Video Credit Packs?",
    a: "Extra Video Credit Packs are pre-purchased packs of Video Credits. Buy 6, 15, or 40 credits upfront and save compared to pay-per-video pricing. Extra Video Credit Packs never expire and work alongside any subscription plan.",
  },
  {
    q: "Do monthly Video Credits roll over?",
    a: "Monthly Video Credits reset each billing cycle and do not roll over. If you need more flexibility, an Extra Video Credit Pack is a better option as the credits never expire.",
  },
  {
    q: "What is character consistency?",
    a: "Character consistency uses AI to maintain the same character appearance across multiple scenes in your video. Available on Pro and Business plans.",
  },
  {
    q: "What is priority video building?",
    a: "Priority video builds move your job to the front of the queue. On Pro and Business plans, your videos process faster — typically within minutes.",
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
    a: "Yes. Your monthly Video Credits and Extra Video Credit Packs work across all WIZ AI products — WizVideo, WizScript, WizShorts, WizAnimate, WizAudio, and WizImage. Each final video download uses one Video Credit regardless of which product you used.",
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

// ── Currency Selector ────────────────────────────────────────────────────────
function CurrencySelector({ currency, setCurrency, currencies, isLoading }: {
  currency: string;
  setCurrency: (code: string) => void;
  currencies: Array<{ code: string; symbol: string; name: string; flag: string }>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = currencies.find(c => c.code === currency) ?? currencies[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-[--color-gold]/[0.15] hover:border-[--color-gold]/[0.35] hover:bg-white/[0.07] transition-all duration-200 text-sm font-semibold text-white/80 hover:text-white"
        aria-label="Select currency"
      >
        <span className="text-base leading-none">{current?.flag}</span>
        <span className="text-xs font-bold tracking-wide">{currency}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 max-h-72 overflow-y-auto rounded-2xl bg-[#0c0c0c]/98 backdrop-blur-2xl border border-[--color-gold]/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 py-1.5">
          {currencies.map(c => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 text-left hover:bg-[--color-gold]/[0.06] transition-colors ${
                c.code === currency ? "bg-[--color-gold]/[0.08]" : ""
              }`}
            >
              <span className="text-base leading-none w-6 text-center">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-white/90">{c.code}</span>
                <span className="text-[10px] text-white/35 ml-1.5 truncate">{c.name}</span>
              </div>
              <span className="text-xs text-white/40 font-medium">{c.symbol}</span>
              {c.code === currency && <Check className="w-3 h-3 text-[--color-gold] flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Comparison cell helper ────────────────────────────────────────────────────
function CompCell({ value, isCheck }: { value: string | boolean; isCheck?: boolean }) {
  if (isCheck) {
    return value ? (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-[--color-gold]/[0.18] border border-[--color-gold]/50 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-[--color-gold]" />
        </div>
      </div>
    ) : (
      <div className="flex justify-center">
        <div className="w-5 h-5 rounded-full bg-white/[0.03] flex items-center justify-center">
          <X className="w-2.5 h-2.5 text-white/15" />
        </div>
      </div>
    );
  }
  return <span className="text-xs font-semibold text-white/85 text-center block">{value as string}</span>;
}

export default function Pricing() {
  useSEO({ title: "Pricing — WIZ AI", path: "/pricing", description: "Choose the WIZ AI plan that fits your creative workflow. Free to create, Starter (£19/mo), Creator (£49/mo), and Studio (£149/mo) plans available. One Video Credit = one final downloadable video. Only pay when you're ready." });
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null);
  const plansRef = useRef<HTMLDivElement>(null);

  // Currency conversion
  const { currency, setCurrency, currencies, currentMeta, formatPrice, isLoading: currencyLoading } = useCurrency();

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

  async function handleSubscribe(planId: "starter" | "creator" | "pro") {
    mp.planSelected(planId.charAt(0).toUpperCase() + planId.slice(1), billingCycle);
    mp.checkoutStarted(planId);
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setLoadingPlan(planId);
    try {
      const result = await createSubscriptionCheckout.mutateAsync({ plan: planId, origin: window.location.origin });
      // gtagSendEvent fires the conversion then navigates — waits up to 2s for the tag
      if (result.checkoutUrl) gtagSendEvent(result.checkoutUrl);
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
      if (result.checkoutUrl) gtagSendEvent(result.checkoutUrl);
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
          <img src={PRICING_HERO_BG} alt="" className="w-full h-full object-cover opacity-40 brightness-[1.1] saturate-[1.15]" loading="eager" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,4,4,0.2) 0%, rgba(4,4,4,0.55) 50%, #040404 100%)' }} />
          {/* Gold radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, rgba(196,164,100,0.4) 0%, transparent 70%)' }} />
        </div>

        {/* Floating showcase thumbnails — desktop only */}
        <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 w-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl opacity-60" style={{ animation: 'floatUp 6s ease-in-out infinite' }}>
          <img src={SHOWCASE_1} alt="" className="w-full h-32 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/30 flex items-center justify-center"><Play className="w-2.5 h-2.5 text-[--color-gold] fill-[--color-gold]" /></div>
            <span className="text-[10px] text-white/70 font-medium">WizVideo</span>
          </div>
        </div>
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl opacity-60" style={{ animation: 'floatUp 6s ease-in-out infinite 2s' }}>
          <img src={SHOWCASE_2} alt="" className="w-full h-32 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
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
            <span className="metallic-gold">Pay when your video is ready.</span>
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
            { step: "03", img: HIW_STEP4, title: "Your video is ready to download", desc: "Happy with the result? Choose your quality and download. You only pay when your video is ready." },
          ].map((item, i) => (
            <div key={item.step} className="relative rounded-2xl overflow-hidden border border-white/[0.07] group" style={{ animationDelay: `${i * 0.1}s` }}>
              {/* Background photo */}
              <div className="relative h-44 overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover brightness-[1.05] saturate-[1.1] transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.0) 0%, rgba(4,4,4,0.55) 100%)' }} />
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
      <section className="max-w-5xl mx-auto px-6 mb-24" id="pricing">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Pay As You Go</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Pay-per-video pricing</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">No subscription needed. One price per final video. Choose your quality.</p>
          <p className="text-xs text-[--color-gold]/50 mt-2 font-medium">Pay only when you are ready to export your final video.</p>
          {/* Currency selector */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="text-[11px] text-white/30 font-medium">Prices in</span>
            <CurrencySelector currency={currency} setCurrency={setCurrency} currencies={currencies} isLoading={currencyLoading} />
            {currency !== "GBP" && (
              <span className="text-[10px] text-white/20 italic">Approximate. Billed in GBP.</span>
            )}
          </div>
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
                <img src={tier.img} alt={tier.label} className="w-full h-full object-cover brightness-[1.05] saturate-[1.1]" loading="lazy" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(4,4,4,0.1) 0%, rgba(4,4,4,0.6) 100%)` }} />
                {/* Resolution badge */}
                <div className="absolute bottom-3 left-4 flex items-end gap-2">
                  <span className="text-4xl font-black text-white leading-none">{tier.label}</span>
                  <span className="text-sm text-white/50 mb-1">{tier.resolution}</span>
                </div>
              </div>
              {/* Price + features */}
              <div className="flex-1 p-5 bg-[#0c0c0c]">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-white" style={{ animation: "priceFadeIn 220ms ease-out" }}>{formatPrice(tier.price)}</span>
                  <span className="text-sm text-white/40">per video</span>
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

        {/* WizSound Audio Add-on — premium player + tier cards */}
        <div className="space-y-6">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-logo-v5_76ab5163.png"
                alt="WizSound™"
                className="h-10 w-auto object-contain"
                style={{ filter: "drop-shadow(0 0 12px rgba(16,185,129,0.3))" }}
                loading="lazy"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="text-base font-bold text-white">WizSound™ Audio Mastering</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold tracking-wider">OPTIONAL ADD-ON</span>
                </div>
                <p className="text-xs text-white/40">Spatial audio mastering — cinema-grade immersive sound. Press play to hear the difference.</p>
              </div>
            </div>
            <a
              href="/products/wizsound"
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Learn more about WizSound™
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
          {/* Live demo player */}
          <WizSoundDemoPlayer />
        </div>
      </section>

      {/* ── 4. SUBSCRIPTION PLANS ── */}
      <section className="max-w-7xl mx-auto px-6 mb-20" id="plans">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">Subscription Plans</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Monthly plans for regular creators</h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto mb-8">Video Credits included every month. Best value for consistent creators. Cancel anytime.</p>

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
          {/* Currency selector */}
          <div className="flex items-center justify-center gap-2.5 mt-5">
            <span className="text-[11px] text-white/30 font-medium">Show prices in</span>
            <CurrencySelector currency={currency} setCurrency={setCurrency} currencies={currencies} isLoading={currencyLoading} />
            {currency !== "GBP" && (
              <span className="text-[10px] text-white/20 italic">Approx. Billed in GBP.</span>
            )}
          </div>
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
                          <span className="text-4xl font-extrabold text-white">{formatPrice(plan.monthlyPrice)}</span>
                          <span className="text-xs text-white/35">/mo</span>
                        </div>
                        <p className="text-[10px] text-white/25 mt-0.5">billed monthly{currency !== "GBP" ? " · approx." : ""}</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white">{formatPrice(plan.annualPrice)}</span>
                          <span className="text-xs text-white/35">/yr</span>
                        </div>
                        <p className="text-[11px] mt-0.5 font-semibold" style={{ color: plan.accentColor }}>
                          {formatPrice(Math.round(plan.annualPrice / 12))}/mo · Save 20%
                        </p>
                      </>
                    )}
                  </div>

                  {/* Key stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl p-2.5 text-center" style={{ background: `${plan.glowColor}`, border: `1px solid ${plan.borderColor}` }}>
                      <div className="text-2xl font-black text-white">{plan.rendersPerMonth}</div>
                      <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-0.5">Video Credits/mo</div>
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
                        {plan.id === "starter" ? "Start Creating" : plan.id === "creator" ? "Choose Creator" : "Upgrade to Studio"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-white/30 mt-6">No hidden fees. Cancel anytime. Full control before checkout.</p>
      </section>

      {/* ── 5. PRODUCT COVERAGE STRIP ── */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <div className="rounded-2xl border border-[--color-gold]/[0.1] bg-gradient-to-br from-[--color-gold]/[0.03] to-transparent p-8">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-white mb-2">One subscription. Six powerful tools.</h3>
            <p className="text-sm text-white/40">Every plan includes access to all WIZ AI products. Your Video Credits work across every tool.</p>
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

      {/* ── 5b. HOW BUILD CREDITS WORK ── */}
      <section className="max-w-3xl mx-auto px-6 mb-16">
        <div className="rounded-2xl border border-[--color-gold]/[0.12] bg-gradient-to-br from-[--color-gold]/[0.04] to-transparent p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,164,100,0.12)', border: '1px solid rgba(196,164,100,0.25)' }}>
              <Zap className="w-5 h-5" style={{ color: 'var(--color-gold)' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4">How Video Credits work</h3>
              <div className="space-y-3 text-sm text-white/50 leading-relaxed">
                <p>One Video Credit creates one final downloadable video.</p>
                <p>Create and preview your project for free first — refine your storyboard, adjust scenes, and perfect the result before committing. A Video Credit is only used when you are ready to generate and download the final video.</p>
                <p>Failed renders do not use credits. Extra Video Credit Packs never expire and can be used alongside any active subscription.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. BUILD CREDIT PACKS ── */}
      <section className="max-w-5xl mx-auto px-6 mb-24" id="bundles">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold]/50 mb-3">EXTRA VIDEO CREDIT PACKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Need more final videos?</h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto">Buy extra Video Credits whenever you need them. Extra Video Credit Packs work alongside any WIZ AI subscription and never expire. Use them when you want to produce additional final videos beyond your monthly allowance.</p>
          <p className="text-xs text-white/25 max-w-md mx-auto mt-3">Each Video Credit creates one final downloadable video, subject to your plan&apos;s scene, length and quality limits.</p>
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
                <img src={bundle.bgImage} alt={bundle.label} className="w-full h-full object-cover brightness-[1.05] saturate-[1.1]" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.05) 0%, rgba(4,4,4,0.55) 100%)' }} />
                {/* Video Credit count display */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-white leading-none">{bundle.renders}</span>
                    <div className="mb-1">
                      <span className="text-sm text-white/60 font-semibold block">Video Credits</span>
                      <span className="text-xs text-white/40">{bundle.perRender}</span>
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
                  <span className="text-3xl font-extrabold text-white">{formatPrice(bundle.price)}</span>
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
                      Buy {bundle.label} — {formatPrice(bundle.price)}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6b. TRUST MICROCOPY ── */}
      <div className="text-center mb-8 -mt-10">
        <p className="text-xs text-white/30 tracking-wide">No hidden fees. Cancel anytime. Full control before checkout.</p>
      </div>

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
                <img src={cat.img} alt={cat.label} className="w-full h-full object-cover brightness-[1.05] saturate-[1.1] transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(4,4,4,0.0) 0%, rgba(4,4,4,0.5) 100%)` }} />
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
              quote: "I use WizShorts every week for my Reels. The pay-per-build model means I only pay when I'm happy.",
              plan: "Starter Plan",
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
              quote: "WizAnimate is incredible for stylised animation. Character consistency on the Pro plan is a game-changer.",
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

        <div className="rounded-2xl border border-white/[0.12] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 bg-[#0a0a0a] border-b border-white/[0.07]">
            <div className="col-span-1 p-4 flex items-center">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Feature</span>
            </div>
            {["Starter", "Creator", "Studio"].map((name, i) => (
              <div key={name} className={`p-4 text-center border-l border-white/[0.07] ${i === 1 ? "bg-gradient-to-b from-[--color-gold]/[0.08] to-[--color-gold]/[0.03]" : ""}`}>
                <p className={`text-xs font-bold ${i === 1 ? "text-[--color-gold]" : "text-white"}`}>{name}</p>
                {i === 1 && <p className="text-[9px] text-[--color-gold]/80 font-semibold mt-0.5 tracking-wide">★ Most Popular</p>}
              </div>
            ))}
          </div>

          {COMPARISON_GROUPS.map((group, gi) => (
            <div key={group.group}>
              {/* Group header */}
              <div className="grid grid-cols-4 bg-[#080808] border-b border-white/[0.07]">
                <div className="col-span-6 px-4 py-2.5 flex items-center gap-2">
                  <Layers className="w-3 h-3 text-[--color-gold]/50" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[--color-gold]/50">{group.group}</span>
                </div>
              </div>
              {group.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-4 border-b border-white/[0.07] last:border-0 transition-colors hover:bg-white/[0.02] ${
                    gi === COMPARISON_GROUPS.length - 1 && ri === group.rows.length - 1 ? "border-0" : ""
                  }`}
                >
                  <div className="col-span-1 px-4 py-3.5 flex items-center">
                    <span className="text-xs text-white/75">{row.label}</span>
                  </div>
                  {(["starter", "creator", "pro"] as const).map((planId, pi) => (
                    <div key={planId} className={`px-2 py-3.5 flex items-center justify-center border-l border-white/[0.06] ${pi === 1 ? "bg-[--color-gold]/[0.03]" : ""}`}>
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
                Build your first video completely free. Only pay when you're ready to produce and download your final video.
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

      {/* ── 11b. SHOWCASE ── */}
      <ShowcaseVideoSection
        title="See what you can create"
        subtitle="WIZ AI showcase"
        description="Every video on every plan is built from a prompt. No footage, no editing, no experience needed."
        ctaLabel="Start Creating Free"
        ctaHref="/onboarding"
        items={[
          { id: 1, title: "Midnight City — Cinematic Style", category: "Cinematic AI Video", posterUrl: SHOWCASE_1, videoUrl: null, description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt." },
          { id: 2, title: "Stage Performance — Music Video", category: "Music Video", posterUrl: SHOWCASE_2, videoUrl: null, description: "A full music video with synced visuals and cinematic effects. Created with WizVideo." },
          { id: 3, title: "Star Quest — Kids Channel Intro", category: "Animation", posterUrl: SHOWCASE_3, videoUrl: null, description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description." },
        ]}
      />

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
            <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
            <a href="/cookie-policy" className="hover:text-white/60 transition-colors">Cookies</a>
            <button onClick={() => window.dispatchEvent(new CustomEvent('wiz:open-cookie-settings'))} className="hover:text-white/60 transition-colors bg-transparent border-0 p-0 cursor-pointer text-xs text-white/30">Cookie Settings</button>
          </div>
          <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
