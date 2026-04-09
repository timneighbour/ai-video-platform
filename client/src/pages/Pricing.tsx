import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Check, Sparkles, Zap, Crown, Star, ChevronDown, ChevronUp,
  Music, Video, Wand2, ArrowRight, X
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO = `${CDN}/wizvid-logo_9bec645c.jpg`;

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Zap className="w-5 h-5" />,
    monthlyPrice: 19,
    annualPrice: 13, // 19 * 8/12 = ~12.67
    annualTotal: 152,
    desc: "Perfect for getting started with AI video creation.",
    popular: false,
    gradient: "from-white/5 to-white/3",
    border: "border-white/10 hover:border-white/20",
    cta: "Get Started",
    ctaStyle: "bg-white/10 hover:bg-white/15 text-white border border-white/20",
    features: [
      { text: "Up to 20 videos per month", included: true },
      { text: "All 6 AI video styles", included: true },
      { text: "WizBeat music video maker", included: true },
      { text: "WizPilot AI video creator", included: true },
      { text: "Standard generation speed", included: true },
      { text: "Watermark on videos", included: true },
      { text: "No watermark", included: false },
      { text: "4K export", included: false },
      { text: "Priority rendering", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Star className="w-5 h-5" />,
    monthlyPrice: 49,
    annualPrice: 33, // 49 * 8/12 = ~32.67
    annualTotal: 392,
    desc: "Unlimited videos, no watermark, and 4K export for serious creators.",
    popular: true,
    gradient: "from-pink-500/20 to-purple-500/20",
    border: "border-pink-500/40",
    cta: "Start Pro",
    ctaStyle: "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/20",
    features: [
      { text: "Unlimited videos per month", included: true },
      { text: "All 6 AI video styles", included: true },
      { text: "WizBeat music video maker", included: true },
      { text: "WizPilot AI video creator", included: true },
      { text: "Faster generation speed", included: true },
      { text: "No watermark", included: true },
      { text: "4K quality export", included: true },
      { text: "MuseTalk lip-sync for characters", included: true },
      { text: "Priority support", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    id: "creator_plus",
    name: "Creator+",
    icon: <Crown className="w-5 h-5" />,
    monthlyPrice: 99,
    annualPrice: 66, // 99 * 8/12 = ~66
    annualTotal: 792,
    desc: "Maximum speed, premium styles, and API access for power creators.",
    popular: false,
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/20 hover:border-amber-500/40",
    cta: "Go Creator+",
    ctaStyle: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Priority rendering (2× faster)", included: true },
      { text: "Premium exclusive styles", included: true },
      { text: "Early access to new features", included: true },
      { text: "Highest quality output", included: true },
      { text: "API access for automation", included: true },
      { text: "Dedicated account support", included: true },
      { text: "Cancel anytime", included: true },
    ],
  },
];

const ADD_ONS = [
  {
    name: "Video Boost Pack",
    desc: "5 extra videos for Starter plan users",
    price: "£5",
    icon: "🎬",
  },
  {
    name: "Creator Pack",
    desc: "15 extra videos — best value for occasional overages",
    price: "£10",
    icon: "⚡",
  },
  {
    name: "Pro Pack",
    desc: "40 extra videos — for heavy production months",
    price: "£20",
    icon: "🚀",
  },
];

const COMPARISON_FEATURES = [
  { feature: "Videos per month", starter: "20", pro: "Unlimited", creator: "Unlimited" },
  { feature: "Watermark", starter: "Yes", pro: "No", creator: "No" },
  { feature: "Video quality", starter: "HD 1080p", pro: "4K", creator: "4K (Max)" },
  { feature: "Generation speed", starter: "Standard", pro: "Fast", creator: "Priority (2×)" },
  { feature: "WizBeat music videos", starter: "✓", pro: "✓", creator: "✓" },
  { feature: "WizPilot AI creator", starter: "✓", pro: "✓", creator: "✓" },
  { feature: "MuseTalk lip-sync", starter: "—", pro: "✓", creator: "✓" },
  { feature: "Premium styles", starter: "—", pro: "—", creator: "✓" },
  { feature: "API access", starter: "—", pro: "—", creator: "✓" },
  { feature: "Support", starter: "Email", pro: "Priority", creator: "Dedicated" },
  { feature: "Commercial licence", starter: "—", pro: "✓", creator: "✓" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your account settings at any time. No cancellation fees. You keep access until the end of your billing period." },
  { q: "Is there a free trial?", a: "New accounts receive 50 free trial credits — enough to create your first video. No credit card required." },
  { q: "What's the difference between Starter and Pro?", a: "Starter gives you 20 videos/month with a watermark. Pro is unlimited videos, no watermark, 4K export, and faster generation. Most creators upgrade to Pro within the first month." },
  { q: "Do you offer annual billing?", a: "Yes! Annual billing saves you 33%. You pay for 8 months and get 12. Toggle the billing switch above to see annual prices." },
  { q: "What payment methods do you accept?", a: "Visa, Mastercard, American Express, Apple Pay, and Google Pay — all via Stripe." },
  { q: "Can I upgrade or downgrade?", a: "Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing cycle." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-all cursor-pointer ${open ? "border-purple-500/30 bg-white/8" : "border-white/10 bg-white/3 hover:bg-white/5"}`} onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between p-5 gap-4">
        <span className="font-semibold text-white/90 text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-purple-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />}
      </div>
      {open && <div className="px-5 pb-5"><p className="text-white/60 text-sm leading-relaxed">{a}</p></div>}
    </div>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-[#080810] text-white min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src={WIZVID_LOGO} alt="WizVid" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-black text-lg bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">WizVid</span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="/music-video" className="hover:text-white transition-colors">WizBeat</a>
            <a href="/wizpilot" className="hover:text-white transition-colors">WizPilot</a>
            <a href="/pricing" className="text-white font-semibold">Pricing</a>
            <a href="/help" className="hover:text-white transition-colors">Help</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm px-5 rounded-xl font-semibold" asChild>
                <a href="/dashboard">Dashboard</a>
              </Button>
            ) : (
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm px-5 rounded-xl font-semibold" asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="py-20 px-4 text-center">
        <Badge className="mb-6 bg-green-500/20 text-green-300 border-green-500/30 px-4 py-1.5">
          <Zap className="w-3.5 h-3.5 mr-1.5" />Simple Pricing
        </Badge>
        <h1 className="text-4xl md:text-6xl font-black mb-4">
          Create unlimited AI videos
          <br />
          <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            — no editing required
          </span>
        </h1>
        <p className="text-white/50 text-xl mb-10 max-w-xl mx-auto">
          Music videos, YouTube content, animations — all created by AI in minutes.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!annual ? "text-white" : "text-white/40"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-all ${annual ? "bg-green-500" : "bg-white/20"}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${annual ? "left-8" : "left-1"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-white" : "text-white/40"}`}>
            Annual
            <span className="ml-2 bg-green-500/20 text-green-300 border border-green-500/30 text-xs px-2 py-0.5 rounded-full">Save 33%</span>
          </span>
        </div>

        {/* Plans */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-8 rounded-3xl bg-gradient-to-b ${plan.gradient} border ${plan.border} transition-all ${
                plan.popular ? "scale-105 shadow-2xl shadow-pink-500/20" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${plan.popular ? "bg-pink-500/20 text-pink-400" : "bg-white/10 text-white/60"}`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
              </div>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">£{annual ? plan.annualPrice : plan.monthlyPrice}</span>
                  <span className="text-white/40">/month</span>
                </div>
                {annual && (
                  <p className="text-green-400 text-sm mt-1">£{plan.annualTotal} billed annually (save 33%)</p>
                )}
              </div>
              <p className="text-white/50 text-sm mb-6">{plan.desc}</p>

              <Button className={`w-full rounded-xl py-3 font-semibold mb-6 h-auto ${plan.ctaStyle}`} asChild>
                <a href={isAuthenticated ? "/subscribe" : getLoginUrl()}>{plan.cta}</a>
              </Button>

              <div className="space-y-3">
                {plan.features.map((feat) => (
                  <div key={feat.text} className={`flex items-center gap-3 text-sm ${feat.included ? "text-white/80" : "text-white/25 line-through"}`}>
                    {feat.included ? (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-white/20 flex-shrink-0" />
                    )}
                    {feat.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-sm">
          All plans include: ✓ Free storyboard generation &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ Secure Stripe payments
        </p>
      </div>

      {/* Add-on packs */}
      <div className="py-16 px-4 bg-gradient-to-b from-[#080810] to-[#0d0d1a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">Need extra videos?</h2>
            <p className="text-white/50">Top up anytime with one-time add-on packs. No subscription required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {ADD_ONS.map((addon) => (
              <div key={addon.name} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/20 transition-all text-center">
                <div className="text-4xl mb-3">{addon.icon}</div>
                <h3 className="font-bold text-lg mb-1">{addon.name}</h3>
                <p className="text-white/50 text-sm mb-4">{addon.desc}</p>
                <div className="text-3xl font-black mb-4">{addon.price}</div>
                <Button className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl" asChild>
                  <a href={isAuthenticated ? "/credits" : getLoginUrl()}>Buy Pack</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="py-16 px-4 bg-[#0d0d1a]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Full feature comparison</h2>
          <div className="rounded-3xl overflow-hidden border border-white/10">
            {/* Header */}
            <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
              <div className="p-4 text-sm font-semibold text-white/60">Feature</div>
              {["Starter", "Pro", "Creator+"].map((name, i) => (
                <div key={name} className={`p-4 text-center font-bold ${i === 1 ? "text-pink-400" : "text-white"}`}>
                  {name}
                  {i === 1 && <div className="text-xs text-pink-400/60 font-normal">Most Popular</div>}
                </div>
              ))}
            </div>
            {COMPARISON_FEATURES.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-4 border-b border-white/5 ${i % 2 === 0 ? "bg-white/2" : ""}`}>
                <div className="p-4 text-sm text-white/60">{row.feature}</div>
                <div className="p-4 text-center text-sm text-white/70">{row.starter}</div>
                <div className="p-4 text-center text-sm text-pink-300 font-medium">{row.pro}</div>
                <div className="p-4 text-center text-sm text-amber-300 font-medium">{row.creator}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-16 px-4 bg-[#080810]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-20 px-4 bg-gradient-to-b from-[#080810] to-black text-center">
        <div className="text-5xl mb-6">✨</div>
        <h2 className="text-4xl font-black mb-4">Ready to create AI videos?</h2>
        <p className="text-white/50 text-lg mb-8">Start free. No credit card required.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-lg px-10 py-4 rounded-2xl font-bold h-auto" asChild>
            <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
              <Sparkles className="w-5 h-5 mr-2" />Create Your First Video Free
            </a>
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent text-lg px-10 py-4 rounded-2xl font-semibold h-auto" asChild>
            <a href="/help">View Help Centre <ArrowRight className="w-4 h-4 ml-2" /></a>
          </Button>
        </div>
      </div>
    </div>
  );
}
