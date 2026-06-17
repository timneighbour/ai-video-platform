import { useState, useEffect } from "react";
import { PAY_PER_VIDEO_TIERS, WIZSOUND_PAY_PER_VIDEO_TIERS } from "@/lib/pricing";
import { mp } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import {
 Check, Sparkles, ArrowLeft, Zap, Gift, Crown, Star, Loader2,
 Rocket, Gem, Volume2, Package, ChevronRight, Minus,
} from "@/lib/icons";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { PLANS as SHARED_PLANS, COMPARISON_ROWS } from "@/lib/plans";

// Plan icon overlay (UI-only, not in shared module) 
const PLAN_ICONS: Record<string, React.ReactNode> = {
 free: <Gift className="w-5 h-5" />,
 starter: <Zap className="w-5 h-5" />,
 basic: <Star className="w-5 h-5" />,
 creator: <Rocket className="w-5 h-5" />,
 pro: <Crown className="w-5 h-5" />,
 studio: <Gem className="w-5 h-5" />,
};
// Merge shared plan data with UI-only icon field
const SUBSCRIBE_PLAN_IDS = ["free", "starter", "creator", "studio"];
const PLANS = SHARED_PLANS.filter((p) => SUBSCRIBE_PLAN_IDS.includes(p.id)).map((p) => ({ ...p, icon: PLAN_ICONS[p.id] }));



// Component 
export default function Subscribe() {

 useSEO({ title: "Subscribe — WIZ AI Plans & Pricing", path: "/subscribe", description: "Choose your WIZ AI plan. Starter, Creator, and Pro tiers with full access to AI video, music, image, and animation tools. Start with a free trial." });
 const { isAuthenticated } = useAuth();
 // Track subscription page view
 useEffect(() => { mp.subscriptionViewed("direct"); }, []);
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
 const planName = PLANS.find((p) => p.id === planId)?.name ?? planId;
 mp.planSelected(planName, billing);
 if (planId === "free") {
 if (!isAuthenticated) { window.location.href = getLoginUrl(); }
 else { setLocation("/dashboard"); }
 return;
 }
 if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
 // Fire checkoutStarted before opening Stripe
 const planPrice = PLANS.find((p) => p.id === planId)?.[billing === "annual" ? "annualTotal" : "monthlyPrice"];
 mp.checkoutStarted(planName, typeof planPrice === "number" ? planPrice : undefined);
 setLoadingPlan(planId);
 createSubscriptionCheckout.mutate({
 plan: planId as "starter" | "basic" | "creator" | "pro" | "studio",
 origin: window.location.origin,
 billingInterval: billing,
 });
 };

 const renderCell = (val: string | boolean) => {
 if (val === true) return <Check className="h-4 w-4 text-[--color-silver] mx-auto" />;
 if (val === false) return <Minus className="h-3.5 w-3.5 text-white/20 mx-auto" />;
 return <span className="text-xs text-white/70">{val}</span>;
 };

 return (
 <div className="min-h-screen bg-background">

 {/* Header */}
 <div className="border-b border-white/10">
 <div className="container flex h-16 items-center justify-between">
 <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
 <ArrowLeft className="h-4 w-4" />Back to Home
 </a>
 <img src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png" alt="WIZ AI" className="h-[7.3rem] w-auto object-contain" />
 <div className="w-24" />
 </div>
 </div>

 {/* 1. Above the fold */}
 <section className="pt-16 pb-8 text-center px-4">
 <div className="inline-flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-1.5 text-xs text-[--color-gold] font-medium mb-6">
 <Sparkles className="h-3.5 w-3.5" />No credit card required · Storyboard preview always free
 </div>
 <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 max-w-2xl mx-auto leading-tight">Create for free.<br />
 <span className="metallic-gold">Only pay when you build your final video.
 </span>
 </h1>
 <p className="text-lg text-muted-foreground max-w-xl mx-auto">Start building your video today. Upgrade only when you're ready to download.
 </p>
 </section>

 {/* 2. Monthly / Annual toggle */}
 <div className="flex items-center justify-center gap-4 mb-10 px-4">
 <button onClick={() => setBilling("monthly")} className={`text-sm font-semibold transition-colors ${billing === "monthly" ? "text-white" : "text-muted-foreground hover:text-white"}`}>Monthly
 </button>
 <button
 role="switch" aria-checked={billing === "annual"}
 onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
 className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[--color-gold]/50 ${billing === "annual" ? "bg-[--color-gold]/70" : "bg-white/15"}`}
 >
 <div className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 bg-white ${billing === "annual" ? "left-8" : "left-1"}`} />
 </button>
 <button onClick={() => setBilling("annual")} className={`text-sm font-semibold transition-colors flex items-center gap-2 ${billing === "annual" ? "text-white" : "text-muted-foreground hover:text-white"}`}>Annual
 <span className="rounded-full bg-[--color-gold]/15 text-[--color-gold] text-xs px-2 py-0.5 font-semibold border border-[--color-gold]/30">Save 2 months
 </span>
 </button>
 </div>

 {/* 3. Plan cards */}
 <section className="pb-16 px-4">
 <div className="container max-w-7xl mx-auto">
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
 {PLANS.map((plan) => {
 const annualMonthlyEquiv = plan.annualTotal > 0 ? Math.round((plan.annualTotal / 12) * 10) / 10 : 0;
 const displayPrice = billing === "annual" && annualMonthlyEquiv > 0 ? annualMonthlyEquiv : plan.monthlyPrice;
 return (
 <div
 key={plan.id}
 className={`relative rounded-2xl border flex flex-col p-4 transition-all duration-300 ${
 plan.highlight
 ? "border-[--color-gold]/60 bg-gradient-to-b from-[#2a1f00]/60 to-background shadow-[0_0_40px_-8px_rgba(184,137,42,0.4)] scale-105 lg:scale-110 z-10"
 : "border-white/10 bg-white/[0.03] hover:border-white/20"
 }`}
 >
 {plan.badge && (
 <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
 plan.highlight
 ? "metallic-gold text-[#1a1000] border border-[--color-gold]/40"
 : "bg-[--color-silver]/10 text-[--color-silver] border border-[--color-silver]/30"
 }`}>
 {plan.badge}
 </div>
 )}
 <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${plan.highlight ? "bg-[--color-gold]/15 text-[--color-gold]" : "bg-white/8 text-muted-foreground"}`}>
 {plan.icon}
 </div>
 <h3 className="text-base font-bold text-white mb-1">{plan.name}</h3>
 <p className="text-xs text-muted-foreground mb-3 leading-snug">{plan.tagline}</p>
 <div className="flex items-end gap-1 mb-1">
 <span className="text-3xl font-extrabold text-white">
 {displayPrice === 0 ? "Free" : `£${displayPrice % 1 === 0 ? displayPrice : displayPrice.toFixed(2)}`}
 </span>
 {displayPrice > 0 && <span className="text-muted-foreground text-sm mb-1">/mo</span>}
 </div>
 {billing === "annual" && plan.annualSaving > 0 && (
 <p className="text-xs text-[#a1a1aa] mb-1">£{plan.annualTotal}/year <span className="text-[--color-gold] font-semibold">save £{plan.annualSaving}</span></p>
 )}
 {billing === "monthly" && plan.annualSaving > 0 && (
 <p className="text-xs text-[#a1a1aa] mb-1">or £{plan.annualTotal}/yr <span className="text-[--color-gold] font-semibold">save £{plan.annualSaving}</span></p>
 )}
 <Button
 className={`w-full mt-3 mb-4 font-semibold text-sm ${
 plan.highlight
 ? "btn-primary text-[#1a1000] border-0"
 : plan.id === "free"
 ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
 : ""
 }`}
 variant={plan.highlight ? "default" : "outline"}
 size="sm"
 onClick={() => handlePlanSelect(plan.id)}
 disabled={loadingPlan === plan.id}
 >
 {loadingPlan === plan.id ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processing...</> : plan.cta}
 </Button>
 <ul className="space-y-1.5 flex-1">
 {plan.outcomes.map((outcome) => (
 <li key={outcome} className="flex items-start gap-2">
 <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-[--color-gold]" : "text-[--color-silver]"}`} />
 <span className="text-xs text-foreground/75 leading-snug">{outcome}</span>
 </li>
 ))}
 </ul>
 </div>
 );
 })}
 </div>

 {/* Trust signals */}
 <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
 {[" Free storyboard preview on all plans", " No credit card required to start", " Cancel anytime", " 7-day money-back guarantee"].map((t) => (
 <span key={t}>{t}</span>
 ))}
 </div>
 </div>
 </section>

 {/* 4. Pay-per-video */}
 <section className="py-16 border-t border-white/10 px-4">
 <div className="container max-w-4xl mx-auto">
 <div className="text-center mb-10">
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Not ready for a plan? Pay as you go.</h2>
 <p className="text-muted-foreground">Buy individual Build Credits whenever you need them. No subscription required.</p>
 </div>
 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 ...PAY_PER_VIDEO_TIERS.map(q => ({ label: q.label, res: q.res, price: q.price, icon: "", highlight: q.highlight, badge: q.badge })),
 ].map((item) => (
 <div key={item.label} className={`rounded-2xl border p-5 text-center transition-all ${item.highlight ? "border-[--color-gold]/40 bg-[--color-gold]/5 shadow-[0_0_24px_-6px_rgba(184,137,42,0.3)]" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
 {item.badge && <div className="inline-block rounded-full bg-[--color-gold]/15 text-[--color-gold] text-xs font-bold px-3 py-0.5 mb-3 border border-[--color-gold]/30">{item.badge}</div>}
 <div className="text-3xl mb-2">{item.icon}</div>
 <h3 className="font-bold text-white text-sm mb-1">{item.label}</h3>
 <p className="text-xs text-muted-foreground mb-3">{item.res}</p>
 <p className="text-2xl font-extrabold text-white">{item.price}</p>
 <p className="text-xs text-muted-foreground mt-1">Full Video Build</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* 5. WizSound section */}
 <section className="py-16 border-t border-white/10 px-4">
 <div className="container max-w-4xl mx-auto">
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-1.5 text-xs text-[--color-gold] font-medium mb-4">
 <Volume2 className="h-3.5 w-3.5" />WizSound™ Audio Engine
 </div>
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Make your video cinematic</h2>
 <p className="text-muted-foreground max-w-lg mx-auto">WizSound™ transforms standard audio into a full cinematic experience — stereo widening, dynamic EQ, and spatial depth.</p>
 </div>
 <div className="grid sm:grid-cols-3 gap-4">
 {[
 ...WIZSOUND_PAY_PER_VIDEO_TIERS.map(t => ({ tier: t.tier, desc: t.desc, price: t.price, highlight: t.highlight, badge: t.badge })),
 ].map((item) => (
 <div key={item.tier} className={`rounded-2xl border p-5 transition-all ${item.highlight ? "border-[--color-gold]/50 bg-gradient-to-b from-[#2a1f00]/50 to-background shadow-[0_0_30px_-8px_rgba(184,137,42,0.35)]" : "border-white/10 bg-white/[0.03]"}`}>
 {item.badge && <div className="inline-block rounded-full bg-[--color-gold]/15 text-[--color-gold] text-xs font-bold px-3 py-0.5 mb-3 border border-[--color-gold]/30">{item.badge}</div>}
 <div className="flex items-center gap-2 mb-2">
 <Volume2 className={`h-4 w-4 ${item.highlight ? "text-[--color-gold]" : "text-muted-foreground"}`} />
 <h3 className="font-bold text-white text-sm">{item.tier}</h3>
 </div>
 <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{item.desc}</p>
 <p className={`text-lg font-extrabold ${item.highlight ? "text-[--color-gold]" : "text-white"}`}>{item.price}</p>
 </div>
 ))}
 </div>
 <p className="text-center text-xs text-muted-foreground mt-4">Subscription plans include WizSound™ discounts of up to 60%.</p>
 </div>
 </section>

 {/* 6. Build Credit Packs */}
 <section className="py-16 border-t border-white/10 px-4">
 <div className="container max-w-3xl mx-auto">
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs text-white/70 font-medium mb-4">
 <Package className="h-3.5 w-3.5" />Build Credit Packs
 </div>
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Save with build credit packs</h2>
 <p className="text-muted-foreground">Pre-purchase build credits at a discount. Use them anytime — they never expire.</p>
 </div>
 <div className="grid sm:grid-cols-3 gap-4">
 {[
 { label: "Quick Boost", builds: 3, price: "£12", perRender: "£4.00", saving: null, highlight: false, badge: null },
 { label: "Creator Boost", builds: 10, price: "£35", perRender: "£3.50", saving: "Save 13%", highlight: true, badge: "Best Value" },
 { label: "Studio Boost", builds: 25, price: "£89", perRender: "£3.56", saving: "Save 11%", highlight: false, badge: null },
 ].map((item) => (
 <div key={item.label} className={`rounded-2xl border p-5 text-center transition-all ${item.highlight ? "border-[--color-gold]/40 bg-[--color-gold]/5 shadow-[0_0_24px_-6px_rgba(184,137,42,0.25)]" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
 {item.badge && <div className="inline-block rounded-full bg-[--color-gold]/15 text-[--color-gold] text-xs font-bold px-3 py-0.5 mb-3 border border-[--color-gold]/30">{item.badge}</div>}
 <h3 className="font-bold text-white text-sm mb-1">{item.label}</h3>
 <p className="text-xs text-muted-foreground mb-3">{item.builds} builds</p>
 <p className="text-2xl font-extrabold text-white mb-1">{item.price}</p>
 <p className="text-xs text-muted-foreground">{item.perRender}/build</p>
 {item.saving && <p className="text-xs text-[--color-gold] font-semibold mt-1">{item.saving}</p>}
 </div>
 ))}
 </div>
 <p className="text-center text-xs text-muted-foreground mt-6">Bundles can be purchased from your dashboard at any time. Build credits never expire.</p>
 </div>
 </section>

 {/* 7. Comparison table */}
 <section className="py-16 border-t border-white/10 px-4">
 <div className="container max-w-5xl mx-auto">
 <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">Compare plans</h2>
 <div className="overflow-x-auto rounded-2xl border border-white/10">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-white/10">
 <th className="text-left p-4 text-muted-foreground font-medium w-40">Feature</th>
 {["Free", "Starter", "Basic", "Creator", "Pro", "Studio"].map((name) => (
 <th key={name} className={`p-4 text-center font-bold ${name === "Creator" ? "text-[--color-gold]" : "text-white"}`}>
 {name}
 {name === "Creator" && <div className="text-xs text-[--color-gold]/70 font-normal mt-0.5">Most Popular</div>}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {COMPARISON_ROWS.map((row, i) => (
 <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.015]" : ""}`}>
 <td className="p-4 text-muted-foreground text-xs font-medium">{row.feature}</td>
 {([row.free, row.starter, row.basic, row.creator, row.pro, row.studio] as (string | boolean)[]).map((val, j) => (
 <td key={j} className={`p-4 text-center ${j === 3 ? "bg-[--color-gold]/5" : ""}`}>{renderCell(val)}</td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </section>

 {/* 8. FAQ */}
 <section className="py-10 px-4">
 <div className="container max-w-3xl mx-auto">
 <div className="grid gap-4 sm:grid-cols-3 text-center">
 {[
 { q: "Do subscription build credits roll over?", a: "Subscription build credits reset each billing cycle. Build Credit Packs (bought separately) never expire." },
 { q: "Can I switch plans?", a: "Yes, upgrade or downgrade anytime. Prorated instantly." },
 { q: "Is there a refund policy?", a: "Yes, we offer a 7-day money-back guarantee on all plans." }, ].map(({ q, a }) => (
 <div key={q} className="rounded-xl border border-white/10 bg-white/5 p-4">
 <p className="font-semibold text-white text-sm mb-1">{q}</p>
 <p className="text-xs text-muted-foreground">{a}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* 9. Bottom CTA */}
 <section className="py-20 border-t border-white/10 px-4 text-center">
 <div className="container max-w-2xl mx-auto">
 <div className="inline-flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-1.5 text-xs text-[--color-gold] font-medium mb-6">
 <Sparkles className="h-3.5 w-3.5" />Free storyboard on every video
 </div>
 <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Start building your video for free</h2>
 <p className="text-muted-foreground mb-8 text-lg">No credit card required. See your storyboard before you spend a penny.</p>
 <Button
 size="lg"
 className="btn-primary btn-sheen btn-sheen font-bold px-10 py-4 text-base rounded-full"
 onClick={() => handlePlanSelect("free")}
 >Start Creating <ChevronRight className="ml-2 h-5 w-5" />
 </Button>
 <p className="mt-4 text-xs text-muted-foreground">Already have an account?{" "}
 <a href="/dashboard" className="text-[--color-gold] hover:text-[--color-gold]/80 underline underline-offset-2">Go to your dashboard →
 </a>
 </p>
 </div>
 </section>

 </div>
 );
}
