import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import BackButton from "@/components/BackButton";
import {
  Check, Sparkles, Zap, Crown, Star, ChevronDown, ChevronUp, X, ArrowRight
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-cropped_86dbad19.png";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Zap className="w-4 h-4" />,
    monthlyPrice: 29,
    annualPrice: 19,
    annualTotal: 228,
    label: "Perfect for trying ideas",
    desc: "Up to 10 videos/month, max 60 seconds each. Standard rendering.",
    popular: false,
    features: [
      { text: "Up to 10 videos per month", included: true },
      { text: "Max 60 seconds per video", included: true },
      { text: "All 6 AI video styles", included: true },
      { text: "WizBeat music video maker", included: true },
      { text: "WizPilot AI video creator", included: true },
      { text: "Standard rendering", included: true },
      { text: "No watermark", included: false },
      { text: "Cinematic scene upgrades", included: false },
      { text: "Priority rendering", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Star className="w-4 h-4" />,
    monthlyPrice: 69,
    annualPrice: 46,
    annualTotal: 552,
    label: "Best for regular creators",
    desc: "Up to 25 videos/month, max 2 minutes each. Includes enhanced cinematic scenes.",
    popular: true,
    features: [
      { text: "Up to 25 videos per month", included: true },
      { text: "Max 2 minutes per video", included: true },
      { text: "All 6 AI video styles", included: true },
      { text: "WizBeat music video maker", included: true },
      { text: "WizPilot AI video creator", included: true },
      { text: "No watermark", included: true },
      { text: "4K quality export", included: true },
      { text: "3–5 cinematic scenes per video", included: true },
      { text: "MuseTalk lip-sync for characters", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    id: "creator_plus",
    name: "Creator+",
    icon: <Crown className="w-4 h-4" />,
    monthlyPrice: 149,
    annualPrice: 99,
    annualTotal: 1188,
    label: "For serious video production",
    desc: "Up to 50 videos/month, max 3 minutes each. Priority rendering and more cinematic scenes.",
    popular: false,
    features: [
      { text: "Up to 50 videos per month", included: true },
      { text: "Max 3 minutes per video", included: true },
      { text: "Everything in Pro", included: true },
      { text: "6–10 cinematic scenes per video", included: true },
      { text: "Priority rendering (2× faster)", included: true },
      { text: "Premium exclusive styles", included: true },
      { text: "Early access to new features", included: true },
      { text: "API access for automation", included: true },
      { text: "Dedicated account support", included: true },
      { text: "Cancel anytime", included: true },
    ],
  },
];

const ADD_ONS = [
  { name: "Video Boost Pack", desc: "5 extra videos for Starter plan users", price: "£5", icon: "🎬" },
  { name: "Creator Pack", desc: "15 extra videos — best value for occasional overages", price: "£10", icon: "⚡" },
  { name: "Pro Pack", desc: "40 extra videos — for heavy production months", price: "£20", icon: "🚀" },
];

const COMPARISON_FEATURES = [
  { feature: "Videos per month", starter: "10", pro: "25", creator: "50" },
  { feature: "Max video length", starter: "60 seconds", pro: "2 minutes", creator: "3 minutes" },
  { feature: "Watermark", starter: "Yes", pro: "No", creator: "No" },
  { feature: "Video quality", starter: "HD 1080p", pro: "4K", creator: "4K (Max)" },
  { feature: "Cinematic scenes", starter: "—", pro: "3–5 per video", creator: "6–10 per video" },
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
  { q: "What payment methods do you accept?", a: "Visa, Mastercard, American Express, Apple Pay, Google Pay, and PayPal — all processed securely via Stripe." },
  { q: "Can I upgrade or downgrade?", a: "Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing cycle." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${open ? "border-white/15 bg-[#171717]" : "border-white/8 bg-[#0f0f0f] hover:border-white/12"}`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5 gap-4">
        <span className="font-medium text-white text-sm">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#a1a1aa] flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[#a1a1aa] flex-shrink-0" />}
      </div>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-[#a1a1aa] text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// Scroll reveal hook
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { isAuthenticated } = useAuth();
  useReveal();

  return (
    <div className="bg-[#0f0f0f] text-white min-h-screen overflow-x-hidden font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back to Home" />
            <a href="/" className="hidden md:flex items-center gap-3">
              <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-12 w-auto object-contain transition-all duration-300 hover:scale-105 hover:brightness-110" />
            </a>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Music Video", href: "/music-video" },
              { label: "WizPilot", href: "/wizpilot" },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 font-medium inline-block hover:scale-105 hover:-translate-y-0.5 ${link.href === "/pricing" ? "text-white" : "text-[#a1a1aa] hover:text-white"}`}
              >
                {link.label}
              </a>
            ))}
          </div>
          <Button className="bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9" asChild>
            <a href={isAuthenticated ? "/dashboard" : "/onboarding"}>
              {isAuthenticated ? "Dashboard" : "Get started"}
            </a>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="py-24 px-6 text-center reveal">
        <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-5">Pricing</p>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Simple pricing for creators<br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            who want to grow faster
          </span>
        </h1>
        <p className="text-[#a1a1aa] text-lg mb-6 max-w-lg mx-auto">
          Start free with 2 videos. Upgrade when you're ready to post daily.
        </p>
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-5 py-2 text-sm text-green-400 font-medium mb-10">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Start free — no credit card required
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <span className={`text-sm font-medium transition-colors ${!annual ? "text-white" : "text-[#a1a1aa]"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            role="switch"
            aria-checked={annual}
            aria-label={annual ? "Switch to monthly billing" : "Switch to annual billing (save 33%)"}
            className={`relative w-12 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/20 ${annual ? "bg-white" : "bg-white/15"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all ${annual ? "left-6 bg-black" : "left-0.5 bg-white"}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${annual ? "text-white" : "text-[#a1a1aa]"}`}>
            Annual
            <span className="ml-2 bg-green-500/15 text-green-400 border border-green-500/20 text-xs px-2 py-0.5 rounded-full font-medium">Save 33%</span>
          </span>
        </div>

        {/* Outcome framing */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "🎬", title: "10 videos/month", sub: "Starter — try ideas" },
            { icon: "⚡", title: "25 videos/month", sub: "Pro — most popular" },
            { icon: "🚀", title: "50 videos/month", sub: "Creator+ — serious production" },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl bg-white/3 border border-white/8 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-white font-semibold text-sm">{item.title}</p>
              <p className="text-[#a1a1aa] text-xs mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
        {/* Plan cards */}
        <h2 className="sr-only">Choose your plan</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-7 rounded-2xl border transition-all text-left ${
                plan.popular
                  ? "bg-[#171717] border-violet-500/50 shadow-xl shadow-violet-500/10 scale-[1.03]"
                  : "bg-[#171717] border-white/8 hover:border-white/15"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-4 py-1 rounded-full tracking-wide whitespace-nowrap">
                  Most Popular — Best for creators
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.popular ? "bg-violet-500/20 text-violet-400" : "bg-white/8 text-[#a1a1aa]"}`}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white leading-tight">{plan.name}</h3>
                  <p className="text-xs text-[#a1a1aa] leading-tight">{plan.label}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight">£{annual ? plan.annualPrice : plan.monthlyPrice}</span>
                  <span className="text-[#a1a1aa] text-sm">/month</span>
                </div>
                {annual && (
                  <p className="text-green-400 text-xs mt-1.5">£{plan.annualTotal} billed annually — save 33%</p>
                )}
              </div>
              <p className="text-[#a1a1aa] text-sm mb-6 leading-relaxed">{plan.desc}</p>

              <Button
                className={`w-full rounded-xl py-2.5 font-semibold mb-6 h-auto text-sm ${
                  plan.popular
                    ? "bg-white text-black hover:bg-white/90 shadow-md"
                    : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                }`}
                asChild
              >
                <a href={isAuthenticated ? "/subscribe" : "/onboarding"}>
                  {plan.popular ? <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Create Your First Video</> : (plan.name === "Creator+" ? "Go Creator+" : "Get started free")}
                </a>
              </Button>

              <div className="space-y-2.5">
                {plan.features.map((feat) => (
                  <div
                    key={feat.text}
                    className={`flex items-center gap-2.5 text-sm ${feat.included ? "text-white/80" : "text-white/25 line-through"}`}
                  >
                    {feat.included
                      ? <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      : <X className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />}
                    {feat.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[#a1a1aa] text-sm">
          All plans include: ✓ Free storyboard generation &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ Pay by card or PayPal
        </p>
      </div>

      {/* Add-on packs */}
      <div className="py-20 px-6 border-t border-white/6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Add-ons</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Need extra videos?</h2>
            <p className="text-[#a1a1aa]">Top up anytime with one-time packs. No subscription required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {ADD_ONS.map((addon, i) => (
              <div
                key={addon.name}
                className={`p-6 rounded-2xl bg-[#171717] border border-white/8 hover:border-white/15 transition-all card-hover reveal animate-delay-${(i + 1) * 100} text-center`}
              >
                <div className="text-3xl mb-3">{addon.icon}</div>
                <h3 className="font-semibold text-white mb-1.5">{addon.name}</h3>
                <p className="text-[#a1a1aa] text-sm mb-4 leading-relaxed">{addon.desc}</p>
                <div className="text-3xl font-extrabold text-white mb-5 tracking-tight">{addon.price}</div>
                <Button
                  className="w-full bg-white/8 hover:bg-white/12 text-white border border-white/10 rounded-xl text-sm font-medium h-9"
                  asChild
                >
                  <a href={isAuthenticated ? "/credits" : getLoginUrl()}>Buy pack</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="py-20 px-6 border-t border-white/6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Full feature comparison</h2>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/8">
            <div className="grid grid-cols-4 bg-[#171717] border-b border-white/8">
              <div className="p-4 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Feature</div>
              {["Starter", "Pro", "Creator+"].map((name, i) => (
                <div key={name} className={`p-4 text-center font-semibold text-sm ${i === 1 ? "text-violet-400" : "text-white"}`}>
                  {name}
                  {i === 1 && <div className="text-xs text-violet-400/60 font-normal mt-0.5">Most Popular</div>}
                </div>
              ))}
            </div>
            {COMPARISON_FEATURES.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-[#0f0f0f]" : "bg-[#171717]/50"}`}
              >
                <div className="p-4 text-sm text-[#a1a1aa]">{row.feature}</div>
                <div className="p-4 text-center text-sm text-white/70">{row.starter}</div>
                <div className="p-4 text-center text-sm text-violet-300 font-medium">{row.pro}</div>
                <div className="p-4 text-center text-sm text-white/80 font-medium">{row.creator}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-20 px-6 border-t border-white/6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Frequently asked questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 px-6 border-t border-white/6 text-center reveal">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">Ready to create AI videos?</h2>
          <p className="text-[#a1a1aa] text-lg mb-10">Start free. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a href={isAuthenticated ? "/dashboard" : "/onboarding"}>
                <Sparkles className="w-4 h-4 mr-2" />Create your first video free
              </a>
            </Button>
            <Button
              variant="outline"
              className="border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-8 py-3 rounded-xl font-medium h-auto"
              asChild
            >
              <a href="/help">View Help Centre <ArrowRight className="w-4 h-4 ml-2" /></a>
            </Button>
          </div>
        </div>
      </div>
      {/* Legal footer */}
      <div className="border-t border-white/8 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap gap-4 justify-center text-sm text-[#a1a1aa]">
          <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="/refunds" className="hover:text-white transition-colors">Refund Policy</a>
          <a href="mailto:support@wizvid.ai" className="hover:text-white transition-colors">support@wizvid.ai</a>
        </div>
      </div>
    </div>
  );
}
