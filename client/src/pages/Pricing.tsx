import {
 WIZANIMATE_PRODUCT_PAGE,
 WIZAUDIO_STUDIO_PAGE,
 WIZIMAGE_STUDIO_PAGE,
 WIZSHORTS_STUDIO_PAGE,
 WIZSCRIPT_STUDIO_PAGE,
} from "@/lib/routes";
/**
 * Pricing page — premium cinematic redesign.
 * Sections:
 * 1. Nav
 * 2. Hero — cinematic bg, animated badge, headline
 * 3. How it works — visual step cards with photography
 * 4. Per-video pricing — large visual tier cards
 * 5. Subscription plans — rich cinematic plan cards with bg imagery
 * 6. Product coverage strip — all 6 logos
 * 7. top-up packs — premium credit pack cards
 * 8. Social proof / testimonials
 * 9. Trust strip
 * 10. Comparison table — grouped, sticky header
 * 11. FAQ
 * 12. Bottom CTA
 * 13. Footer
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
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
 Check, X, ChevronDown, ChevronUp, Sparkles, Download, Package,
 ArrowRight, Shield, CreditCard, RefreshCcw,
 Users, Star, Crown, Zap, Play, Headphones, Globe, Loader2
} from "@/lib/icons";
import WizSoundDemoPlayer from "@/components/WizSoundDemoPlayer";
import ShowcaseVideoSection from "@/components/ShowcaseVideoSection";
import PublicNavBar from "@/components/PublicNavBar";
import { PLANS as SHARED_PLANS, TOPUP_PACKS } from "@/lib/plans";

// CDN assets 
const WIZAI_LOGO = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";
const PRICING_HERO_BG = "/manus-storage/pricing-hero-bg_7e23edd2.jpg";
const HIW_STEP1 = "/manus-storage/hiw-step1-choose_1102ddee.jpg";
const HIW_STEP2 = "/manus-storage/hiw-step2-storyboard_21e66052.jpg";
const HIW_STEP3 = "/manus-storage/hiw-step3-preview_e536f5b1.jpg";
const HIW_STEP4 = "/manus-storage/hiw-step4-export_68c87f9e.jpg";
const _SC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const SHOWCASE_1 = `${_SC}/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp`;
const SHOWCASE_2 = `${_SC}/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp`;
const SHOWCASE_3 = `${_SC}/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp`;
const SHOWCASE_1_VIDEO = `${_SC}/showcase-cinematic_13667434.mp4`;
const SHOWCASE_2_VIDEO = `${_SC}/showcase-music-video_19324f13.mp4`;
const SHOWCASE_3_VIDEO = `${_SC}/showcase-kids_d49d86f8.mp4`;
const CREATOR_MUSICIANS = "/manus-storage/rock-band-concert_b03279f3.jpg";
const CREATOR_CONTENT = "/manus-storage/creator-content-creators_ae0d5147.jpg";
const CREATOR_YOUTUBERS = "/manus-storage/creator-youtubers-brands_088b54d8.jpg";
const CREATOR_ANIMATORS = "/manus-storage/creator-animators_d6999585.jpg";
// Avatar constants removed — fictional testimonials replaced with honest use-case cards

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

// UI overlay: visual fields specific to the Pricing page 
// These fields are NOT in the shared plans module because they are purely visual.
// All canonical data (prices, features, outcomes) comes from @/lib/plans.
const PLAN_UI_OVERLAY: Record<string, {
 accentColor: string; bgImage: string; glowColor: string; borderColor: string;
 annualPrice: number; tagline: string;
}> = {
 starter: {
 accentColor: "oklch(0.65 0.08 240)", bgImage: PLAN_BG_STARTER,
 glowColor: "rgba(100,140,200,0.12)", borderColor: "rgba(100,140,200,0.2)",
 annualPrice: 350, tagline: "All 7 studios. 320 credits/month.",
 },
 creator: {
 accentColor: "oklch(0.78 0.11 75)", bgImage: PLAN_BG_CREATOR,
 glowColor: "rgba(196,164,100,0.18)", borderColor: "rgba(196,164,100,0.45)",
 annualPrice: 790, tagline: "800 credits/month. Character Lock™. 4K.",
 },
 studio: {
 accentColor: "oklch(0.72 0.12 300)", bgImage: PLAN_BG_PRO,
 glowColor: "rgba(160,100,220,0.14)", borderColor: "rgba(160,100,220,0.25)",
 annualPrice: 1650, tagline: "1,500 credits/month. API access.",
 },
};
// Merge shared plan data with Pricing-page UI overlay
// Only show the 3 plans relevant to this page (starter, creator, studio)
const PLANS = SHARED_PLANS
 .filter((p) => ["starter", "creator", "studio"].includes(p.id))
 .map((p) => ({ ...p, ...PLAN_UI_OVERLAY[p.id] }));

// top-up packs 
// Bundle UI overlay (visual fields only — prices/labels from @/lib/plans) 
const BUNDLE_UI_OVERLAY: Record<string, { bgImage: string; accentColor: string; borderColor: string }> = {
 spark: { bgImage: SHOWCASE_3, accentColor: "rgba(100,140,200,0.15)", borderColor: "rgba(100,140,200,0.2)" },
 boost: { bgImage: SHOWCASE_1, accentColor: "rgba(196,164,100,0.15)", borderColor: "rgba(196,164,100,0.4)" },
 boost_200: { bgImage: SHOWCASE_2, accentColor: "rgba(160,100,220,0.15)", borderColor: "rgba(160,100,220,0.25)" },
 pro_pack: { bgImage: SHOWCASE_2, accentColor: "rgba(160,100,220,0.15)", borderColor: "rgba(160,100,220,0.25)" },
 mega: { bgImage: SHOWCASE_3, accentColor: "rgba(100,200,140,0.15)", borderColor: "rgba(100,200,140,0.25)" },
};
const BUNDLES = TOPUP_PACKS.map((p) => ({ ...p, ...BUNDLE_UI_OVERLAY[p.key] }));

// Comparison table 
const COMPARISON_GROUPS = [
 {
 group: "Output",
 rows: [
 { label: "Credits / month", starter: "320", creator: "800", studio: "1,500" },
 { label: "Approx. WizVideos / month", starter: "~2", creator: "~5", studio: "~9" },
 { label: "Max scenes per WizVideo", starter: "8", creator: "11", studio: "12" },
 { label: "Max output quality", starter: "720p", creator: "4K 2160p", studio: "4K 2160p" },
 { label: "No watermark", starter: true, creator: true, studio: true, isCheck: true },
 ],
 },
 {
 group: "Features",
 rows: [
 { label: "All 7 WIZ AI studios", starter: true, creator: true, studio: true, isCheck: true },
 { label: "WizSound audio mastering", starter: true, creator: true, studio: true, isCheck: true },
 { label: "WizSync™ character lock", starter: false, creator: true, studio: true, isCheck: true },
 { label: "Priority video builds", starter: false, creator: true, studio: true, isCheck: true },
 ],
 },
 {
 group: "Access",
 rows: [
 { label: "Top-up packs", starter: true, creator: true, studio: true, isCheck: true },
 { label: "Pay-per-video", starter: true, creator: true, studio: true, isCheck: true },
 { label: "Monthly credits reset", starter: "Each cycle", creator: "Each cycle", studio: "Each cycle" },
 ],
 },
];

// FAQ 
const FAQS = [
 {
 q: "What does 'Create free, pay when your video is ready' mean?",
 a: "You can create your entire video — upload audio, generate your storyboard, and refine every scene — completely free. A credit is only used when you choose to generate and download the final video. Failed builds do not use credits. There is no time limit on the free creation tier.",
 },
 {
 q: "What is the difference between Standard, HD, and 4K?",
 a: "Standard (720p) is great for social media previews. HD (1080p) is perfect for YouTube, Instagram, and most streaming platforms. 4K (2160p) is cinema-grade quality for professional productions. 4K is available on Creator and Studio plans.",
 },
 {
 q: "What happens if I use all my monthly credits?",
 a: "Your Credits reset on your next billing date. In the meantime, you can top up instantly with a top-up pack (3, 10, or 25 credits) or pay per video at £2–£6 depending on quality. Top-up credits never expire and are used automatically once your monthly credits run out.",
 },
 {
 q: "What are top-up packs?",
 a: "top-up packs are pre-purchased packs of credits. Buy 3, 10, or 25 credits upfront and save compared to pay-per-video pricing. Top-up credits never expire and work alongside any subscription plan.",
 },
 {
 q: "Do monthly credits expire?",
 a: "Yes — plan credits reset at the end of each billing cycle and do not roll over. Top-up credits (purchased separately) never expire and are yours to keep.",
 },
 {
 q: "What is WizSync\u2122 character lock?",
 a: "WizSync\u2122 character lock uses AI to maintain the same character appearance across multiple scenes in your video. Available on Creator and Studio plans.",
 },
 {
 q: "What is priority video building?",
 a: "Priority video builds move your job to the front of the queue. On Creator and Studio plans, your videos process faster — typically within minutes.",
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
 a: "Yes. Your monthly credits and top-up packs work across all WIZ AI products — WizVideo, WizScript, WizShorts, WizAnimate, WizAudio, and WizImage. Each final video download uses one credit regardless of which product you used.",
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

// Currency Selector 
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
 <span className="text-xs font-bold tracking-wide">{current?.symbol}</span>
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
 <span className="text-xs font-bold text-white/60 w-6 text-center">{c.symbol}</span>
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

// Comparison cell helper 
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
  useSEO({ title: "Pricing — WIZ AI", path: "/pricing", description: "One subscription. Every studio. One credit wallet. Free · Starter £35 · Creator £79 · Studio £165. No card to start." });
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

 // Track scroll-to-bottom (strong abandonment signal)
 let scrolledToBottom = false;
 const handleScroll = () => {
 if (scrolledToBottom) return;
 const scrollPct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
 if (scrollPct >= 0.92) {
 scrolledToBottom = true;
 mp.pricingPageScrolledToBottom(isAuthenticated ? "authenticated" : "free");
 }
 };
 window.addEventListener("scroll", handleScroll, { passive: true });

 // Exit-intent: mouse leaves viewport toward top
 let exitIntentFired = false;
 const handleMouseLeave = (e: MouseEvent) => {
 if (exitIntentFired) return;
 if (e.clientY <= 5) {
 exitIntentFired = true;
 mp.exitIntentShown("pricing");
 }
 };
 document.addEventListener("mouseleave", handleMouseLeave);

 return () => {
 window.removeEventListener("scroll", handleScroll);
 document.removeEventListener("mouseleave", handleMouseLeave);
 };
 }, []);

 const createSubscriptionCheckout = trpc.billing.createSubscriptionCheckout.useMutation();
 const createTopupCheckout = trpc.billing.createTopupCheckout.useMutation();

 async function handleSubscribe(planId: "starter" | "creator" | "studio") {
 mp.planSelected(planId.charAt(0).toUpperCase() + planId.slice(1), billingCycle);
 mp.checkoutStarted(planId);
 if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
 setLoadingPlan(planId);
 try {
 const result = await createSubscriptionCheckout.mutateAsync({ plan: planId, origin: window.location.origin });
 if (result.checkoutUrl) {
 // Fire GA conversion in background, then navigate immediately
 try { gtagSendEvent(result.checkoutUrl); } catch (_) {}
 toast.loading("Redirecting to secure checkout…", { id: "checkout-redirect", duration: 12_000 });
 // Navigate immediately regardless of gtag callback
 setTimeout(() => { window.location.href = result.checkoutUrl!; }, 150);
 }
 } catch (err) {
 toast.dismiss("checkout-redirect");
 toast.error("Checkout failed", { description: err instanceof Error ? err.message : "Please try again or contact support." });
 } finally { setLoadingPlan(null); }
 }

 async function handleTopupPurchase(packKey: "spark" | "boost" | "boost_200" | "pro_pack" | "mega") {
 mp.checkoutStarted(`topup_${packKey}`);
 if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
 setLoadingBundle(packKey);
 try {
 const result = await createTopupCheckout.mutateAsync({ packKey, origin: window.location.origin });
 if (result.checkoutUrl) {
 toast.loading("Redirecting to secure checkout…", { id: "checkout-redirect", duration: 12_000 });
 // Use same-tab redirect — window.open() is blocked as a pop-up on most browsers
 window.location.href = result.checkoutUrl;
 }
 } catch (err) {
 toast.dismiss("checkout-redirect");
 toast.error("Checkout failed", { description: err instanceof Error ? err.message : "Please try again or contact support." });
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
 .quality-tier-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
 .quality-tier-card:hover { transform: translateY(-4px); }
 `}</style>

 <PublicNavBar />

 {/* 1. HERO */}
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
  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-5 leading-[1.05]">One subscription.<br />
  <span className="metallic-gold">Every studio. One wallet of credits.</span>
  </h1>
  <p className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto leading-relaxed mb-8">Create across all 7 WIZ AI studios at no cost — direct scenes, control characters, preview before you commit. Your credits work everywhere. Only pay when you're ready to download.
  </p>
 {/* Trust pills */}
 <div className="flex flex-wrap items-center justify-center gap-3">
 {[
 { icon: <Check className="w-3.5 h-3.5" />, text: "No credit card to start" },
 { icon: <Check className="w-3.5 h-3.5" />, text: "Cancel anytime" },
 { icon: <Check className="w-3.5 h-3.5" />, text: "Secure checkout via Stripe" },
 { icon: <Check className="w-3.5 h-3.5" />, text: "You own your content" },
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

 {/* 2. HOW IT WORKS */}
 <section className="max-w-6xl mx-auto px-6 mb-24">
 <div className="text-center mb-12">
 <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold] mb-3">How It Works</p>
 <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Three steps to your finished creation</h2>
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

 {/* 4. SUBSCRIPTION PLANS */}
 <section className="max-w-7xl mx-auto px-6 mb-20" id="plans">
 <div className="text-center mb-12">
 {/* Free tier lead — P0.2: must be impossible to miss */}
 <div
 className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-5"
 style={{
 background: "linear-gradient(135deg, rgba(34,197,94,0.20) 0%, rgba(16,185,129,0.12) 100%)",
 border: "1.5px solid rgba(34,197,94,0.50)",
 boxShadow: "0 0 20px rgba(34,197,94,0.22), 0 0 40px rgba(34,197,94,0.08)",
 }}
 >
 <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)] animate-pulse" />
 <span className="text-[14px] font-bold tracking-wide" style={{ color: "rgb(134,239,172)" }}>
 Start Free — No Credit Card Required
 </span>
 <span className="text-green-300/50 text-[12px] font-medium hidden sm:inline">· 30 credits to try every studio</span>
 </div>
 <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold] mb-3">Subscription Plans</p>
 <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">Subscription plans</h2>
 <p className="text-sm text-white/60 max-w-lg mx-auto mb-2">Credits included every month. Spend them across all 7 studios. Cancel anytime.</p>
 <p className="text-xs text-white/30 max-w-lg mx-auto mb-8">Annual billing = 2 months free (~17% off vs monthly).</p>

 {/* Billing toggle */}
 <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
 <button
 onClick={() => setBillingCycle("monthly")}
 className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
 billingCycle === "monthly"
 ? "text-[#0a0a0a] shadow-[0_2px_12px_rgba(196,164,100,0.3)]"
 : "text-white/40 hover:text-white/70"
 }`}
 style={billingCycle === "monthly" ? { background: 'linear-gradient(to right, oklch(0.50 0.13 55), oklch(0.72 0.14 70))' } : {}}
 >Monthly</button>
 <button
 onClick={() => setBillingCycle("annual")}
 className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
 billingCycle === "annual"
 ? "text-[#0a0a0a] shadow-[0_2px_12px_rgba(196,164,100,0.3)]"
 : "text-white/40 hover:text-white/70"
 }`}
 style={billingCycle === "annual" ? { background: 'linear-gradient(to right, oklch(0.50 0.13 55), oklch(0.72 0.14 70))' } : {}}
 >Yearly
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
 billingCycle === "annual" ? "bg-[#0a0a0a]/30 text-[#0a0a0a]" : "bg-[--color-gold]/15 text-[--color-gold]"
 }`}>2 months free</span>
 </button>
 </div>
 {billingCycle === "annual" && (
 <p className="text-xs text-[--color-gold]/70 mt-3 font-medium">Billed as one annual payment — 2 months free (~17% off vs monthly)</p>
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
 <div ref={plansRef} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
 {formatPrice(Math.round(plan.annualPrice / 12))}/mo · 2 months free
 </p>
 </>
 )}
 </div>

 {/* Key stats */}
 <div className="grid grid-cols-2 gap-2 mb-3">
 <div className="rounded-xl p-2.5 text-center" style={{ background: `${plan.glowColor}`, border: `1px solid ${plan.borderColor}` }}>
 <div className="text-2xl font-black text-white">{plan.approxVideosPerMonth}</div>
 <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-0.5">≈ videos/month*</div>
 </div>
 <div className="rounded-xl p-2.5 text-center bg-white/[0.03] border border-white/[0.06]">
 <div className="text-[11px] font-bold text-white leading-tight">{plan.outputQuality}</div>
 <div className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-0.5">max quality</div>
 </div>
 </div>
 {/* Cost per video vs pay-per-render */}
 {plan.monthlyPrice > 0 && (
 <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3 bg-white/[0.03] border border-white/[0.06]">
 <span className="text-[10px] text-white/40 font-medium">Cost per video</span>
 <div className="flex items-center gap-2">
 <span className="text-[10px] line-through text-white/20">£6 pay-per-render</span>
 <span className="text-[11px] font-black" style={{ color: plan.accentColor }}>
 {formatPrice(parseFloat((plan.monthlyPrice / plan.approxVideosPerMonth).toFixed(2)))}/video
 </span>
 </div>
 </div>
 )}

 {/* Feature list */}
 <ul className="space-y-2 mb-5 flex-1">
 {plan.features.map((f) => (
 <li key={f.text} className={`flex items-start gap-2 text-[11px] leading-snug ${
 f.included ? "text-white/65" : "text-white/65"
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
 onClick={() => handleSubscribe(plan.id as "starter" | "creator" | "studio")}
 disabled={loadingPlan === plan.id}
 className={`w-full rounded-xl font-bold text-sm h-11 transition-all duration-300 ${
 isPopular || isHighlighted
 ? "btn-primary shadow-[0_4px_20px_rgba(196,164,100,0.25)] hover:shadow-[0_4px_30px_rgba(196,164,100,0.4)]"
 : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]"
 }`}
 >
 {loadingPlan === plan.id ? (
 <span className="flex items-center gap-2">
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 Redirecting…
 </span>
 ) : (
 <span className="flex items-center justify-center gap-1.5">
 {plan.id === "starter" ? "Get Starter Plan" : plan.id === "creator" ? "Get Creator Plan" : "Get Studio Plan"}
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
 <p className="text-center text-[10px] text-white/25 mt-3">* Based on ~8-scene WizVideo projects. Shorter or longer videos will vary.</p>
 </section>

 {/* 9. COMPARISON TABLE */}
 <section className="max-w-6xl mx-auto px-6 mb-24" id="compare">
 <div className="text-center mb-14">
 <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold] mb-3">Compare Plans</p>
 <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Full feature comparison</h2>
 <p className="text-sm text-white/50 max-w-md mx-auto">Everything you need to choose the right plan</p>
 </div>

 {/* Premium comparison table */}
 <div className="relative rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(196,164,100,0.18)", boxShadow: "0 0 80px rgba(196,164,100,0.06), 0 2px 40px rgba(0,0,0,0.6)" }}>
 {/* Subtle radial glow behind Creator column */}
 <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 62% 0%, rgba(196,164,100,0.07) 0%, transparent 55%)" }} />

 {/* Column headers with plan background imagery */}
 <div className="relative grid grid-cols-4 border-b" style={{ borderColor: "rgba(196,164,100,0.12)", background: "rgba(6,6,6,0.98)" }}>
 {/* Feature label column */}
 <div className="col-span-1 p-6 flex items-end">
 <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Feature</span>
 </div>

 {/* Starter */}
 <div className="relative p-5 text-center border-l overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
 <div className="absolute inset-0 pointer-events-none">
 <img src={PLAN_BG_STARTER} alt="" className="w-full h-full object-cover opacity-[0.08]" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,6,6,0.3) 0%, rgba(6,6,6,0.92) 100%)" }} />
 </div>
 <div className="relative z-10">
 <p className="text-base font-black text-white mb-0.5">Starter</p>
 <p className="text-[10px] text-white/40 font-medium">£{PLANS.find(p => p.id === "starter")?.monthlyPrice ?? 19} / mo</p>
 </div>
 </div>

 {/* Creator — highlighted */}
 <div className="relative p-5 text-center border-l overflow-hidden" style={{ borderColor: "rgba(196,164,100,0.25)", background: "linear-gradient(to bottom, rgba(196,164,100,0.12) 0%, rgba(196,164,100,0.04) 100%)" }}>
 {/* Top gold line */}
 <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(196,164,100,0.9), transparent)" }} />
 <div className="absolute inset-0 pointer-events-none">
 <img src={PLAN_BG_CREATOR} alt="" className="w-full h-full object-cover opacity-[0.12]" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,6,6,0.2) 0%, rgba(6,6,6,0.88) 100%)" }} />
 </div>
 <div className="relative z-10">
 <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full mb-2" style={{ background: "rgba(196,164,100,0.15)", border: "1px solid rgba(196,164,100,0.3)" }}>
 <Star className="w-2.5 h-2.5 text-[--color-gold] fill-current" />
 <span className="text-[9px] font-black text-[--color-gold] tracking-wider">MOST POPULAR</span>
 </div>
 <p className="text-base font-black text-[--color-gold] mb-0.5">Creator</p>
 <p className="text-[10px] text-[--color-gold]/60 font-medium">£{PLANS.find(p => p.id === "creator")?.monthlyPrice ?? 49} / mo</p>
 </div>
 </div>

 {/* Studio */}
 <div className="relative p-5 text-center border-l overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
 <div className="absolute inset-0 pointer-events-none">
 <img src={PLAN_BG_STUDIO} alt="" className="w-full h-full object-cover opacity-[0.09]" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,6,6,0.3) 0%, rgba(6,6,6,0.92) 100%)" }} />
 </div>
 <div className="relative z-10">
 <p className="text-base font-black text-white mb-0.5">Studio</p>
 <p className="text-[10px] text-white/40 font-medium">£{PLANS.find(p => p.id === "studio")?.monthlyPrice ?? 99} / mo</p>
 </div>
 </div>
 </div>

 {/* Feature rows */}
 {COMPARISON_GROUPS.map((group, gi) => (
 <div key={group.group}>
 {/* Group header — full-width gold divider with label */}
 <div className="relative flex items-center gap-4 px-6 py-3" style={{ background: "rgba(196,164,100,0.04)", borderTop: gi > 0 ? "1px solid rgba(196,164,100,0.1)" : "none", borderBottom: "1px solid rgba(196,164,100,0.08)" }}>
 <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(196,164,100,0.5), transparent)" }} />
 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[--color-gold] whitespace-nowrap">{group.group}</span>
 <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(196,164,100,0.5))" }} />
 </div>

 {group.rows.map((row, ri) => (
 <div
 key={row.label}
 className={`grid grid-cols-4 transition-colors hover:bg-white/[0.025] ${
 !(gi === COMPARISON_GROUPS.length - 1 && ri === group.rows.length - 1) ? "border-b" : ""
 }`}
 style={{ borderColor: "rgba(255,255,255,0.05)" }}
 >
 <div className="col-span-1 px-6 py-4 flex items-center">
 <span className="text-sm text-white/80 font-medium">{row.label}</span>
 </div>
 {(["starter", "creator", "studio"] as const).map((planId, pi) => (
 <div
 key={planId}
 className="px-4 py-4 flex items-center justify-center border-l"
 style={{
 borderColor: pi === 1 ? "rgba(196,164,100,0.15)" : "rgba(255,255,255,0.05)",
 background: pi === 1 ? "rgba(196,164,100,0.03)" : "transparent",
 }}
 >
 <CompCell value={(row as Record<string, string | boolean>)[planId]} isCheck={row.isCheck} />
 </div>
 ))}
 </div>
 ))}
 </div>
 ))}

 {/* Bottom CTA row */}
 <div className="grid grid-cols-4 border-t" style={{ borderColor: "rgba(196,164,100,0.12)", background: "rgba(6,6,6,0.98)" }}>
 <div className="col-span-1 px-6 py-5 flex items-center">
 <span className="text-xs text-white/30 font-medium">Ready to start?</span>
 </div>
 {[
 { label: "Get Starter", style: "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] border border-white/[0.1]" },
 { label: "Get Creator", style: "btn-primary shadow-[0_4px_20px_rgba(196,164,100,0.3)]" },
 { label: "Get Studio", style: "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] border border-white/[0.1]" },
 ].map((btn, i) => (
 <div key={btn.label} className="px-4 py-5 flex items-center justify-center border-l" style={{ borderColor: i === 1 ? "rgba(196,164,100,0.15)" : "rgba(255,255,255,0.05)", background: i === 1 ? "rgba(196,164,100,0.04)" : "transparent" }}>
 <a href="#plans" className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${btn.style}`}>
 {btn.label}
 </a>
 </div>
 ))}
 </div>
 </div>
 </section>

  {/* 5.5 PAY-AS-YOU-GO */}
 <section className="max-w-5xl mx-auto px-6 mb-20" id="payg">
 <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
 <div className="px-6 py-5 border-b border-white/[0.06]">
 <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[--color-gold] mb-1">PAY AS YOU GO</p>
 <h3 className="text-xl font-bold text-white">Buy a finished output. No subscription needed.</h3>
 <p className="text-xs text-white/40 mt-1">Buy a finished output and download it instantly. Yours to use in your own projects — licensing terms apply.</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-white/[0.06]">
 <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Output type</th>
 <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[--color-gold]">Pay-as-you-go price</th>
 <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Notes</th>
 </tr>
 </thead>
 <tbody>
 {[
 { output: "Image", price: "£1.49", note: "Per image, any style" },
 { output: "Song / track", price: "£3.99", note: "AI-generated original music" },
 { output: "Soundtrack", price: "£4.99", note: "Bespoke scoring for your video" },
 { output: "Character video", price: "£3.99", note: "Short character animation" },
 { output: "30s short", price: "£7.99", note: "Vertical short-form video" },
 { output: "Music video (HD)", price: "£25", note: "Full WizVideo, 1080p", highlight: true },
 { output: "Music video (4K)", price: "£29", note: "Full WizVideo, 4K 2160p", highlight: true },
 ].map((row, i) => (
 <tr key={i} className={`border-b border-white/[0.04] last:border-0 ${
 row.highlight ? "bg-[rgba(196,164,100,0.04)]" : "hover:bg-white/[0.02]"
 } transition-colors`}>
 <td className="px-6 py-3.5">
 <span className={`text-sm font-medium ${row.highlight ? "text-white" : "text-white/70"}`}>{row.output}</span>
 </td>
 <td className={`text-center px-4 py-3.5 font-bold ${
 row.highlight ? "text-[--color-gold]" : "text-white/60"
 }`}>{row.price}</td>
 <td className="px-4 py-3.5 text-xs text-white/35">{row.note}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06]">
 <p className="text-[11px] text-white/40">Subscribe and the same outputs cost less in credits. Subscribers always get the best value per output.</p>
 </div>
 </div>
 </section>

  {/* 6. BUILD CREDIT PACKS */}
 <section className="max-w-5xl mx-auto px-6 mb-24" id="bundles">
 <div className="text-center mb-12">
 <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold] mb-3">TOP-UP CREDIT PACKS</p>
 <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Top up anytime. Never expire.</h2>
 <p className="text-sm text-white/40 max-w-lg mx-auto">Stack credits onto your balance and spend them across any studio. Top-up packs work alongside any subscription and never expire.</p>
 <p className="text-xs text-white/25 max-w-md mx-auto mt-3">Credits are spent across all 7 studios — a WizVideo scene is 20 credits, an image is 1 credit.</p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
 {BUNDLES.map((bundle) => (
 <div
 key={bundle.key}
 className="quality-tier-card relative flex flex-col rounded-2xl overflow-hidden border"
 style={{
 borderColor: bundle.borderColor,
 boxShadow: bundle.popular ? `0 0 50px ${bundle.accentColor}` : 'none',
 }}
 >
 {(bundle.popular || bundle.bestValue) && (
 <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[--color-gold] to-transparent" />
 )}
 {bundle.popular && (
 <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider shadow-lg whitespace-nowrap">MOST POPULAR
 </div>
 )}
 {bundle.bestValue && (
 <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] text-[10px] font-bold tracking-wider shadow-lg whitespace-nowrap">BEST VALUE
 </div>
 )}

 {/* Background image */}
 <div className="relative h-40 overflow-hidden">
 <img src={bundle.bgImage} alt={bundle.label} className="w-full h-full object-cover brightness-[1.05] saturate-[1.1]" loading="lazy" />
 <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.05) 0%, rgba(4,4,4,0.55) 100%)' }} />
 {/* credit count display */}
 <div className="absolute bottom-0 left-0 right-0 p-4">
 <div className="flex items-end gap-2">
 <span className="text-5xl font-black text-white leading-none">{bundle.credits}</span>
 <div className="mb-1">
 <span className="text-sm text-white/60 font-semibold block">credits</span>
 <span className="text-xs text-white/40">{bundle.perCredit}</span>
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
 onClick={() => handleTopupPurchase(bundle.key)}
 disabled={loadingBundle === bundle.key}
 className={`w-full rounded-xl font-bold text-sm h-10 ${
 bundle.popular
 ? "btn-primary"
 : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]"
 }`}
 >
 {loadingBundle === bundle.key ? (
 <span className="flex items-center gap-2">
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 Redirecting…
 </span>
 ) : (
 <span className="flex items-center justify-center gap-1.5">Buy {bundle.label} — {formatPrice(bundle.price)}
 <ArrowRight className="w-3.5 h-3.5" />
 </span>
 )}
 </Button>
 </div>
 </div>
 ))}
 </div>
 </section>

  {/* 3. HOW CREDITS WORK */}
 <section className="max-w-5xl mx-auto px-6 mb-24" id="credits">
 <div className="text-center mb-12">
 <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold] mb-3">HOW CREDITS WORK</p>
 <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">1 credit ≈ a few pence. Spend them however you like.</h2>
 <p className="text-sm text-white/40 max-w-md mx-auto">Credits are weighted by studio and output type. Here’s exactly what each studio costs.</p>
 </div>

 {/* Credit weights table */}
 <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-8">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-white/[0.06]">
 <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Studio</th>
 <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Output</th>
 <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[--color-gold]">Credits</th>
 </tr>
 </thead>
 <tbody>
 {[
 { studio: "WizVideo", output: "Per scene (HD)", credits: "20–22", highlight: false },
 { studio: "WizShorts", output: "30s short", credits: "30", highlight: false },
 { studio: "WizShorts", output: "60s short", credits: "60", highlight: false },
 { studio: "WizAnimate", output: "Per clip", credits: "4–5", highlight: false },
 { studio: "WizAudio", output: "Per min (music)", credits: "2", highlight: false },
 { studio: "WizAudio", output: "Per min (voice)", credits: "4", highlight: false },
 { studio: "WizImage", output: "Per image", credits: "1", highlight: false },
 { studio: "WizScore", output: "Per soundtrack", credits: "2", highlight: false },
 { studio: "WizScript", output: "Storyboard & script", credits: "0 — free", highlight: true },
 ].map((row, i) => (
 <tr key={i} className={`border-b border-white/[0.04] last:border-0 ${
 row.highlight ? "bg-[rgba(100,200,140,0.04)]" : "hover:bg-white/[0.02]"
 } transition-colors`}>
 <td className="px-6 py-3.5 text-sm font-semibold text-white/80">{row.studio}</td>
 <td className="px-4 py-3.5 text-xs text-white/45">{row.output}</td>
 <td className={`text-center px-4 py-3.5 font-bold ${
 row.highlight ? "text-emerald-400" : "text-[--color-gold]"
 }`}>{row.credits}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

  {/* WizSound Audio Add-on — premium player + tier cards */}
 <div className="space-y-6">
 {/* Section header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <img
 src="/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png"
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
 >Learn more about WizSound™
 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
 </a>
 </div>
 {/* Live demo player */}
 <WizSoundDemoPlayer />
 </div>
 </section>

 {/* 5. PRODUCT COVERAGE STRIP */}
 <section className="max-w-5xl mx-auto px-6 mb-24">
 <div className="rounded-2xl border border-[--color-gold]/[0.1] bg-gradient-to-br from-[--color-gold]/[0.03] to-transparent p-8">
 <div className="text-center mb-8">
 <h3 className="text-lg font-bold text-white mb-2">One subscription. All 7 studios.</h3>
 <p className="text-sm text-white/40">Every plan includes access to all 7 WIZ AI studios. Your credit balance is shared across all of them.</p>
 </div>
 <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
 {[
 { logo: LOGO_WIZAUDIO, name: "WizSound™", label: "AI Music", href: WIZAUDIO_STUDIO_PAGE, color: "rgba(0,200,180,0.15)", border: "rgba(0,200,180,0.25)" },
 { logo: LOGO_WIZIMAGE, name: "WizImage", label: "AI Images", href: WIZIMAGE_STUDIO_PAGE, color: "rgba(196,164,100,0.15)", border: "rgba(196,164,100,0.3)" },
 { logo: LOGO_WIZVIDEO, name: "WizVideo", label: "Music Videos", href: "/music-video", color: "rgba(60,120,220,0.15)", border: "rgba(60,120,220,0.25)" },
 { logo: LOGO_WIZSHORTS, name: "WizShorts", label: "Short Videos", href: WIZSHORTS_STUDIO_PAGE, color: "rgba(220,100,40,0.15)", border: "rgba(220,100,40,0.25)" },
 { logo: LOGO_WIZANIMATE, name: "WizAnimate", label: "Animation", href: WIZANIMATE_PRODUCT_PAGE, color: "rgba(200,60,180,0.15)", border: "rgba(200,60,180,0.25)" },
 { logo: LOGO_WIZSCRIPT, name: "WizScript", label: "Text-to-Video", href: WIZSCRIPT_STUDIO_PAGE, color: "rgba(0,200,220,0.15)", border: "rgba(0,200,220,0.25)" },
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

 {/* 5b. HOW BUILD CREDITS WORK */}
 <section className="max-w-3xl mx-auto px-6 mb-16">
 <div className="rounded-2xl border border-[--color-gold]/[0.12] bg-gradient-to-br from-[--color-gold]/[0.04] to-transparent p-8">
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,164,100,0.12)', border: '1px solid rgba(196,164,100,0.25)' }}>
 <Zap className="w-5 h-5" style={{ color: 'var(--color-gold)' }} />
 </div>
 <div>
 <h3 className="text-lg font-bold text-white mb-4">How credits work</h3>
 <div className="space-y-3 text-sm text-white/50 leading-relaxed">
 <p>One shared credit balance, spent across all 7 studios. Credits are weighted by output type — see the table above for exact costs.</p>
 <p>Plan credits reset at the end of each billing cycle and do not roll over. Top-up credits stack onto your balance and never expire.</p>
 <p>The free plan gives you 30 credits to try every studio. Watermarked previews only — download rights apply to paid plans and pay-as-you-go.</p>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* 6b. TRUST MICROCOPY */}
 <div className="text-center mb-8 -mt-10">
 <p className="text-xs text-white/30 tracking-wide">No hidden fees. Cancel anytime. Full control before checkout.</p>
 </div>

 {/* 7. SOCIAL PROOF */}
 <section className="max-w-6xl mx-auto px-6 mb-24">
 {/* Social proof bar */}
 <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-10 py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
 <span className="text-[11px] text-white/30 font-semibold tracking-wider uppercase">Used by</span>
 {[
 { icon: "🎵", label: "Musicians" },
 { icon: "🎬", label: "YouTubers" },
 { icon: "🎨", label: "Animators" },
 { icon: "💼", label: "Agencies" },
 { icon: "👶", label: "Kids Creators" },
 ].map((c, i) => (
 <React.Fragment key={c.label}>
 {i > 0 && <span className="w-px h-3 bg-white/[0.08] hidden sm:block" />}
 <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
 <span>{c.icon}</span> {c.label}
 </span>
 </React.Fragment>
 ))}
 </div>
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

 {/* Use cases by plan */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 {
 title: "For Musicians",
 desc: "Turn songs and creative ideas into cinematic music video concepts, scenes and final builds.",
 icon: "\ud83c\udfb5",
 plan: "Creator Plan",
 },
 {
 title: "For YouTubers",
 desc: "Create shorts, visual stories and thumbnails. Pay-per-build means you only pay when you're happy.",
 icon: "\ud83c\udfac",
 plan: "Starter Plan",
 },
 {
 title: "For Brands",
 desc: "Full API access to automate campaign visuals, product videos and social content at scale.",
 icon: "\ud83d\udcbc",
 plan: "Studio Plan",
 },
 {
 title: "For Storytellers",
 desc: "Transform scripts into animated scenes with consistent characters and cinematic visual styles.",
 icon: "\ud83d\udcd6",
 plan: "Creator Plan",
 },
 ].map((uc) => (
 <div key={uc.title} className="relative p-5 rounded-2xl border border-white/[0.07] bg-[#0a0a0a] flex flex-col gap-3">
 <span className="text-2xl">{uc.icon}</span>
 <h3 className="text-sm font-bold text-white">{uc.title}</h3>
 <p className="text-xs text-white/55 leading-relaxed flex-1">{uc.desc}</p>
 <div className="pt-2 border-t border-white/[0.06]">
 <span className="text-[9px] font-bold text-[--color-gold]/60 bg-[--color-gold]/[0.06] border border-[--color-gold]/[0.12] px-2 py-0.5 rounded-full whitespace-nowrap">Recommended: {uc.plan}</span>
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* 8. TRUST STRIP */}
 <section className="max-w-5xl mx-auto px-6 mb-24">
 <div className="rounded-2xl border border-[--color-gold]/[0.1] overflow-hidden">
 <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
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
 {
 icon: <Sparkles className="w-6 h-6 text-[--color-gold]" />,
 label: "Quality Guarantee",
 sub: "1 free re-render included",
 bg: "from-[--color-gold]/[0.06]",
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

 {/* 10. FAQ */}
 <section className="max-w-3xl mx-auto px-6 mb-24">
 <div className="text-center mb-12">
 <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[--color-gold] mb-3">FAQ</p>
 <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">Frequently asked questions</h2>
 <p className="text-sm text-white/40">Everything you need to know about pricing and plans</p>
 </div>
 <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] px-6 divide-y divide-white/[0.05]">
 {FAQS.map((faq) => (
 <FAQItem key={faq.q} q={faq.q} a={faq.a} />
 ))}
 </div>
 </section>

 {/* 11. BOTTOM CTA */}
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
 <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">Start creating today.<br />
 <span className="metallic-gold">No card required.</span>
 </h2>
 <p className="text-sm text-white/45 max-w-md leading-relaxed">Build your first video completely free. Only pay when you're ready to produce and download your final video.
 </p>
 <div className="flex flex-wrap gap-3 mt-5 justify-center sm:justify-start">
 {["No credit card to start", "Cancel anytime", "All 7 studios included"].map((item) => (
 <span key={item} className="flex items-center gap-1.5 text-xs text-white/50">
 <Check className="w-3.5 h-3.5 text-[--color-gold]/60" /> {item}
 </span>
 ))}
 </div>
 </div>
 <div className="flex flex-col gap-3 flex-shrink-0">
 <a href="/onboarding" className="btn-primary flex items-center gap-2 px-8 py-3.5 text-base font-bold rounded-xl whitespace-nowrap shadow-[0_4px_30px_rgba(196,164,100,0.3)]">
 <Sparkles className="w-5 h-5" />Start free — 30 credits
 </a>
 <a href="#plans" className="flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">View all plans <ArrowRight className="w-3.5 h-3.5" />
 </a>
 </div>
 </div>
 </div>
 </section>

 {/* 11b. SHOWCASE */}
 <ShowcaseVideoSection
 title="See what you can create"
 subtitle="WIZ AI showcase"
 description="Every video on every plan is built from a prompt. No footage, no editing, no experience needed."
 ctaLabel="Start Creating Free"
 ctaHref="/onboarding"
 items={[
 { id: 30001, title: "Midnight City — Cinematic Style", category: "Cinematic AI Video", posterUrl: SHOWCASE_1, videoUrl: SHOWCASE_1_VIDEO, description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt." },
 { id: 30002, title: "Stage Performance — Music Video Style", category: "Music Video", posterUrl: SHOWCASE_2, videoUrl: SHOWCASE_2_VIDEO, description: "A full music video with synced visuals and cinematic effects. Created with WizVideo." },
 { id: 30003, title: "Star Quest — Kids Channel Intro", category: "Animation", posterUrl: SHOWCASE_3, videoUrl: SHOWCASE_3_VIDEO, description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description." },
 ]}
 />

 {/* 12. FOOTER */}
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
