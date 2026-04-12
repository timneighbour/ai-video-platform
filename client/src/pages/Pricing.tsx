import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import BackButton from "@/components/BackButton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Check, Sparkles, Zap, Crown, Star, ChevronDown, ChevronUp, X, Loader2
} from "lucide-react";

const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-cropped_86dbad19.png";

// ── Plan data ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Zap className="w-4 h-4" />,
    monthlyPrice: 9,
    annualMonthlyEquiv: 6.58, // £79/12
    annualTotal: 79,
    annualSaving: 29,         // £9×12=£108 − £79
    label: "Try it out",
    desc: "5 minutes of video per month. 720p. Great for testing your first ideas.",
    popular: false,
    badge: null as string | null,
    features: [
      { text: "5 minutes of video/month", included: true },
      { text: "Up to 60 seconds per video", included: true },
      { text: "720p quality", included: true },
      { text: "All AI video styles", included: true },
      { text: "WizBeat music video maker", included: true },
      { text: "WizPilot AI video creator", included: true },
      { text: "Watermark on videos", included: true },
      { text: "No watermark", included: false },
      { text: "Cinematic scene upgrades", included: false },
      { text: "Priority rendering", included: false },
    ],
  },
  {
    id: "creator",
    name: "Creator",
    icon: <Star className="w-4 h-4" />,
    monthlyPrice: 29,
    annualMonthlyEquiv: 19.33, // £232/12
    annualTotal: 232,
    annualSaving: 116,         // £29×12=£348 − £232
    label: "Most creators choose this",
    desc: "20 minutes of video per month. 1080p. Lyric-aware scenes and character consistency.",
    popular: true,
    badge: "Most creators choose this plan",
    features: [
      { text: "20 minutes of video/month", included: true },
      { text: "Up to 2 minutes per video", included: true },
      { text: "1080p quality", included: true },
      { text: "Lyric-aware scene generation", included: true },
      { text: "Character consistency across scenes", included: true },
      { text: "2 cinematic scenes included", included: true },
      { text: "No watermark", included: true },
      { text: "Priority support", included: true },
      { text: "4K quality", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    icon: <Crown className="w-4 h-4" />,
    monthlyPrice: 99,
    annualMonthlyEquiv: 66,    // £792/12
    annualTotal: 792,
    annualSaving: 396,         // £99×12=£1188 − £792
    label: "Serious production",
    desc: "60 minutes of video per month. 4K. Full cinematic control and priority rendering.",
    popular: false,
    badge: null as string | null,
    features: [
      { text: "60 minutes of video/month", included: true },
      { text: "Up to 3 minutes per video", included: true },
      { text: "4K quality", included: true },
      { text: "Full cinematic control", included: true },
      { text: "Priority rendering (2× faster)", included: true },
      { text: "All premium styles", included: true },
      { text: "API access for automation", included: true },
      { text: "Early access to new features", included: true },
      { text: "Dedicated account support", included: true },
      { text: "Cancel anytime", included: true },
    ],
  },
];

const COMPARISON_FEATURES = [
  { feature: "Video minutes/month", starter: "5 min", creator: "20 min", studio: "60 min" },
  { feature: "Max video length", starter: "60 sec", creator: "2 min", studio: "3 min" },
  { feature: "Quality", starter: "720p", creator: "1080p", studio: "4K" },
  { feature: "Watermark", starter: "Yes", creator: "No", studio: "No" },
  { feature: "Lyric-aware scenes", starter: "—", creator: "✓", studio: "✓" },
  { feature: "Character consistency", starter: "—", creator: "✓", studio: "✓" },
  { feature: "Cinematic scenes", starter: "—", creator: "2 per video", studio: "Full control" },
  { feature: "Generation speed", starter: "Standard", creator: "Fast", studio: "Priority (2×)" },
  { feature: "WizBeat music videos", starter: "✓", creator: "✓", studio: "✓" },
  { feature: "WizPilot AI creator", starter: "✓", creator: "✓", studio: "✓" },
  { feature: "API access", starter: "—", creator: "—", studio: "✓" },
  { feature: "Support", starter: "Email", creator: "Priority", studio: "Dedicated" },
  { feature: "Commercial licence", starter: "—", creator: "✓", studio: "✓" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your account settings at any time. No cancellation fees. You keep access until the end of your billing period." },
  { q: "Is there a free trial?", a: "New accounts receive 50 free trial credits — enough to create your first video. No credit card required." },
  { q: "What's the difference between Starter and Creator?", a: "Starter gives you 5 minutes of video per month at 720p with a watermark. Creator gives you 20 minutes at 1080p, no watermark, lyric-aware scenes, and character consistency. Most creators upgrade to Creator within the first week." },
  { q: "How does annual billing work?", a: "Annual billing gives you 2 months free — you pay for 10 months and get 12. The Creator plan saves you £116/year. You can cancel anytime and keep access until the end of your annual period." },
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
  // Default to yearly
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  useReveal();

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
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setLoadingPlan(planId);
    createSubscriptionCheckout.mutate({
      plan: planId as "starter" | "creator" | "studio",
      origin: window.location.origin,
      billingInterval: annual ? "annual" : "monthly",
    });
  };

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
      <div className="py-20 px-6 text-center reveal">
        <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-5">Pricing</p>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
          Simple pricing.<br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            No surprises.
          </span>
        </h1>
        <p className="text-[#a1a1aa] text-lg mb-4 max-w-lg mx-auto">
          Create videos from £1–£2 per minute. Start free — no credit card required.
        </p>

        {/* Billing toggle */}
        <div className="flex flex-col items-center gap-3 mb-12 mt-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAnnual(false)}
              className={`text-sm font-semibold transition-colors px-1 ${!annual ? "text-white" : "text-[#a1a1aa] hover:text-white"}`}
            >
              Monthly
            </button>

            {/* Animated pill toggle */}
            <button
              onClick={() => setAnnual(!annual)}
              role="switch"
              aria-checked={annual}
              aria-label={annual ? "Switch to monthly billing" : "Switch to annual billing"}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${annual ? "bg-violet-600" : "bg-white/15"}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${annual ? "left-8 bg-white" : "left-1 bg-white"}`}
              />
            </button>

            <button
              onClick={() => setAnnual(true)}
              className={`text-sm font-semibold transition-colors px-1 flex items-center gap-2 ${annual ? "text-white" : "text-[#a1a1aa] hover:text-white"}`}
            >
              Yearly
              <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                2 months free
              </span>
            </button>
          </div>

          {/* Social proof */}
          <p className={`text-sm transition-all duration-300 ${annual ? "text-green-400 opacity-100" : "text-[#a1a1aa] opacity-60"}`}>
            {annual
              ? "✓ Most creators choose annual to save £116"
              : "Switch to yearly and save up to £116/year"}
          </p>
        </div>

        {/* Plan cards */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan) => {
            const displayPrice = annual ? plan.annualMonthlyEquiv : plan.monthlyPrice;
            const isCreator = plan.id === "creator";

            return (
              <div
                key={plan.id}
                className={`relative p-7 rounded-2xl border transition-all duration-300 text-left ${
                  isCreator
                    ? "bg-[#171717] border-violet-500/50 shadow-xl shadow-violet-500/10 scale-[1.03]"
                    : "bg-[#171717] border-white/8 hover:border-white/15"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full tracking-wide whitespace-nowrap flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCreator ? "bg-violet-500/20 text-violet-400" : "bg-white/8 text-[#a1a1aa]"}`}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white leading-tight">{plan.name}</h3>
                    <p className="text-xs text-[#a1a1aa] leading-tight">{plan.label}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      £{annual ? Math.floor(displayPrice) : displayPrice}
                    </span>
                    <span className="text-[#a1a1aa] text-sm">/month</span>
                  </div>

                  {annual ? (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[#a1a1aa] text-xs">
                        £{plan.annualTotal}/year
                        <span className="ml-2 text-green-400 font-semibold">
                          (save £{plan.annualSaving})
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#a1a1aa] text-xs mt-1.5">
                      or £{plan.annualTotal}/year{" "}
                      <span className="text-green-400 font-semibold">
                        (save £{plan.annualSaving})
                      </span>
                    </p>
                  )}
                </div>

                <p className="text-[#a1a1aa] text-sm mb-6 leading-relaxed">{plan.desc}</p>

                <Button
                  disabled={loadingPlan === plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full rounded-xl py-2.5 font-semibold mb-6 h-auto text-sm ${
                    isCreator
                      ? "bg-white text-black hover:bg-white/90 shadow-md"
                      : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Redirecting...</>
                  ) : isCreator ? (
                    <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Get Creator</>
                  ) : (
                    `Get ${plan.name}`
                  )}
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
            );
          })}
        </div>

        {/* Annual savings callout */}
        {annual && (
          <div className="max-w-md mx-auto mb-10 p-4 rounded-xl bg-green-500/8 border border-green-500/20 text-center">
            <p className="text-green-400 text-sm font-medium">
              🎉 Annual billing saves Creator plan users <strong>£116/year</strong> — that's 2 months completely free
            </p>
          </div>
        )}
      </div>

      {/* Comparison table */}
      <section className="py-16 px-6 reveal">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Compare plans</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left p-4 text-[#a1a1aa] font-medium w-1/3">Feature</th>
                  <th className="text-center p-4 text-white font-semibold">Starter</th>
                  <th className="text-center p-4 text-violet-400 font-semibold">Creator ⭐</th>
                  <th className="text-center p-4 text-white font-semibold">Studio</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                    <td className="p-4 text-[#a1a1aa]">{row.feature}</td>
                    <td className="p-4 text-center text-white/70">{row.starter}</td>
                    <td className="p-4 text-center text-violet-300 font-medium">{row.creator}</td>
                    <td className="p-4 text-center text-white/70">{row.studio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 reveal">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 text-center reveal">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Start creating today</h2>
          <p className="text-[#a1a1aa] mb-8">50 free credits on sign-up. No credit card required.</p>
          <Button
            className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl font-semibold text-base h-auto"
            asChild
          >
            <a href={isAuthenticated ? "/dashboard" : "/onboarding"}>
              {isAuthenticated ? "Go to Dashboard" : "Create Your First Video →"}
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
