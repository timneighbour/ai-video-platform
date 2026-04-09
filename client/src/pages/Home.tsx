import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import {
  ChevronRight,
  Sparkles,
  Video,
  Mic,
  Wand2,
  Check,
  Zap,
  Shield,
  Globe,
  Star,
  ArrowRight,
  Play,
} from "lucide-react";
import VideoCarousel from "@/components/VideoCarousel";

const WIZVID_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/Wizvidlogowithneonmagicflair(1)_03506e50.png";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 19,
      annualPrice: 13,
      credits: 1000,
      description: "Perfect for getting started",
      features: [
        "1,000 credits/month",
        "HD quality exports",
        "Watermark-free",
        "Text-to-Video",
        "AI Voiceover",
        "Email support",
      ],
      cta: "Get Started",
      popular: false,
      accentColor: "#7c3aed",
    },
    {
      name: "Pro",
      monthlyPrice: 49,
      annualPrice: 33,
      credits: 3000,
      description: "For professional creators",
      features: [
        "3,000 credits/month",
        "4K quality exports",
        "Commercial license",
        "All 4 AI tools",
        "Lip-Sync & Avatars",
        "Priority queue",
        "Early access to new tools",
      ],
      cta: "Start Free Trial",
      popular: true,
      accentColor: "#a855f7",
    },
    {
      name: "Business",
      monthlyPrice: 149,
      annualPrice: 100,
      credits: 10000,
      description: "For teams and studios",
      features: [
        "10,000 credits/month",
        "4K quality exports",
        "API access & management",
        "Team collaboration",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      popular: false,
      accentColor: "#06b6d4",
    },
  ];

  const faqs = [
    {
      id: "1",
      question: "What are credits and how do they work?",
      answer:
        "Credits are the currency of WizVid. Each AI tool generation consumes credits based on complexity and duration. Your subscription includes monthly credits, and you can purchase additional top-up packs anytime. Purchased credits never expire.",
    },
    {
      id: "2",
      question: "Is storyboard generation really free?",
      answer:
        "Yes! With our Autopilot feature, you can generate and regenerate your storyboard as many times as you want — completely free. Credits are only charged when you click 'Render Final Video'. This is our key advantage over competitors like Neural Frames.",
    },
    {
      id: "3",
      question: "Can I upgrade or downgrade my subscription?",
      answer:
        "Yes, you can change your subscription tier at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle. No lock-in contracts.",
    },
    {
      id: "4",
      question: "Do my credits roll over each month?",
      answer:
        "Monthly subscription credits reset each billing cycle. However, credits purchased through top-up packs don't expire and can be used anytime — they're yours to keep.",
    },
    {
      id: "5",
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, Mastercard, American Express), as well as Apple Pay and Google Pay. Payments are processed securely through Stripe — all transactions are encrypted and PCI-compliant.",
    },
    {
      id: "6",
      question: "Can I cancel my subscription anytime?",
      answer:
        "Absolutely. You can cancel your subscription at any time from your account settings with no cancellation fees. You'll retain access until the end of your billing period.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src={WIZVID_LOGO}
              alt="WizVid"
              className="h-9 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              WizVid
            </span>
          </a>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="/tools/text-to-video" className="hover:text-white transition-colors">Tools</a>
            <a href="/subscribe" className="hover:text-white transition-colors">Pricing</a>
            <a href="/autopilot" className="hover:text-white transition-colors">Autopilot</a>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <a
                  href="/dashboard"
                  className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </a>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                  asChild
                >
                  <a href="/dashboard">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Create
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                  onClick={() => logout()}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <a
                  href={getLoginUrl()}
                  className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </a>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                  asChild
                >
                  <a href={getLoginUrl()}>
                    Get Started Free
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Autopilot Banner ── */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-green-950/80 to-emerald-950/80 border-b border-emerald-500/20 py-2.5 px-4 text-center">
        <p className="text-sm text-emerald-300">
          <span className="font-bold text-emerald-400">✨ WizVid Advantage:</span>{" "}
          Regenerate your storyboard unlimited times — completely free. Credits only charged on final render.{" "}
          <a href="/autopilot" className="underline hover:text-white transition-colors font-medium">
            Try Autopilot →
          </a>
        </p>
      </div>

      {/* ── Hero Section ── */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-pink-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-8">
            <Star className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
            <span>The AI Video Platform That Gives You More</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Create Stunning
            </span>
            <br />
            <span className="text-white">AI Videos</span>
            <br />
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              In Seconds
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform your ideas into professional-quality videos using cutting-edge AI.
            Text-to-video, lip-sync avatars, video transformation, and AI voiceover — all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 h-12 px-8 text-base font-semibold shadow-lg shadow-purple-500/25"
              asChild
            >
              <a href={getLoginUrl()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Creating Free
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white h-12 px-8 text-base font-semibold backdrop-blur"
              asChild
            >
              <a href="/subscribe">
                View Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-400">50 free credits on sign-up</span>
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-400">Free storyboard regeneration</span>
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-400">No credit card required</span>
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-400">Save 33% with annual billing</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Video Showcase Carousel ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              See What You Can Create
            </h2>
            <p className="text-gray-400 text-lg">
              Explore the power of each AI tool — from cinematic landscapes to talking avatars
            </p>
          </div>
          <VideoCarousel
            videos={[
              {
                id: "1",
                title: "Cinematic Landscape",
                description:
                  "A breathtaking journey through mountains and valleys — created entirely from a text prompt using Kling AI 3.0",
                tool: "text-to-video",
                duration: 15,
                tagline: "Powered by Kling AI 3.0 & Seedance 2.0",
              },
              {
                id: "2",
                title: "Professional Spokesperson",
                description:
                  "Realistic talking avatar delivering your message with perfect lip-sync in 160+ languages — powered by HeyGen Avatar IV",
                tool: "lip-sync",
                duration: 20,
                tagline: "Powered by HeyGen Avatar IV",
              },
              {
                id: "3",
                title: "Artistic Style Transfer",
                description:
                  "Original footage transformed with stunning artistic effects — anime, oil painting, cyberpunk, and more via Runway ML",
                tool: "video-to-video",
                duration: 18,
                tagline: "Powered by Runway ML Gen-3",
              },
              {
                id: "4",
                title: "Multilingual Narration",
                description:
                  "Natural-sounding AI voiceover in 160+ languages with multiple tones — from professional narration to casual storytelling",
                tool: "voiceover",
                duration: 12,
                tagline: "160+ Languages & Voice Styles",
              },
            ]}
            autoPlayInterval={6000}
          />
        </div>
      </section>

      {/* ── Why WizVid Section ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Creators Choose WizVid
            </h2>
            <p className="text-gray-400">Built differently from the competition</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: "🆓",
                title: "Free Storyboards",
                desc: "Regenerate your storyboard unlimited times at zero cost. Credits only charged on final render — unlike Neural Frames.",
                color: "from-emerald-500/20 to-emerald-900/20",
                border: "border-emerald-500/20",
              },
              {
                icon: "⚡",
                title: "4 AI Tools in One",
                desc: "Text-to-video, lip-sync avatars, video-to-video style transfer, and AI voiceover — all under one subscription.",
                color: "from-blue-500/20 to-blue-900/20",
                border: "border-blue-500/20",
              },
              {
                icon: "💰",
                title: "Best Value",
                desc: "Starting at £19/mo — 33% cheaper than competitors. Save even more with annual billing.",
                color: "from-yellow-500/20 to-yellow-900/20",
                border: "border-yellow-500/20",
              },
              {
                icon: "🌍",
                title: "160+ Languages",
                desc: "Create talking avatars and voiceovers in over 160 languages — a feature competitors simply don't offer.",
                color: "from-purple-500/20 to-purple-900/20",
                border: "border-purple-500/20",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border ${item.border} bg-gradient-to-br ${item.color} p-6 hover:scale-[1.02] transition-transform`}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-white text-base mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Tools Section ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Powerful AI Tools
            </h2>
            <p className="text-gray-400 text-lg">Everything you need to create professional AI videos</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Video,
                title: "Text-to-Video",
                description:
                  "Transform any text prompt into a cinematic video. Powered by Kling AI 3.0 and Seedance 2.0 for ultra-realistic results.",
                href: "/tools/text-to-video",
                gradient: "from-blue-500 to-purple-600",
                glow: "#7c3aed",
                credits: "From 100 credits",
                badge: "Most Popular",
              },
              {
                icon: Mic,
                title: "Lip-Sync & Avatars",
                description:
                  "Create realistic talking avatars with perfect audio synchronization in 160+ languages. Powered by HeyGen Avatar IV.",
                href: "/tools/lip-sync",
                gradient: "from-purple-500 to-pink-600",
                glow: "#ec4899",
                credits: "From 75 credits",
                badge: "Unique Feature",
              },
              {
                icon: Wand2,
                title: "Video-to-Video",
                description:
                  "Apply stunning artistic styles and transformations to existing videos. Anime, oil painting, cyberpunk, and more via Runway ML.",
                href: "/tools/video-to-video",
                gradient: "from-pink-500 to-orange-500",
                glow: "#f97316",
                credits: "From 150 credits",
                badge: null,
              },
              {
                icon: Sparkles,
                title: "AI Voiceover",
                description:
                  "Generate natural-sounding narration in multiple languages and voice styles. Perfect for explainers, ads, and documentaries.",
                href: "/tools/voiceover",
                gradient: "from-cyan-500 to-teal-500",
                glow: "#06b6d4",
                credits: "From 50 credits",
                badge: null,
              },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.title}
                  href={isAuthenticated ? tool.href : getLoginUrl()}
                  className="group relative rounded-2xl border border-white/10 bg-white/3 p-7 hover:border-white/20 transition-all hover:bg-white/5 overflow-hidden"
                  style={{ boxShadow: `0 0 0 0 ${tool.glow}00` }}
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                    style={{ background: `radial-gradient(circle at 30% 50%, ${tool.glow}15, transparent 70%)` }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}
                        style={{ boxShadow: `0 0 20px ${tool.glow}44` }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {tool.badge && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{tool.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">{tool.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{tool.credits}</span>
                      <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300 flex items-center gap-1 transition-colors">
                        Try it <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Autopilot CTA */}
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/50 to-green-950/50 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-white text-lg">Autopilot Quick Create</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FREE Storyboards
                </span>
              </div>
              <p className="text-gray-400 text-sm max-w-lg">
                Describe your vision, get a full storyboard instantly — regenerate as many times as you want for free.
                Credits only charged when you render the final video.
              </p>
            </div>
            <Button
              className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 px-6"
              asChild
            >
              <a href="/autopilot">
                <Play className="h-4 w-4 mr-2" />
                Try Autopilot
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-400 mb-6">Choose the perfect plan for your needs. No hidden fees.</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1.5">
              <button
                onClick={() => setBillingAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  !billingAnnual
                    ? "bg-white text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingAnnual
                    ? "bg-white text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Annual
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                  -33%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = billingAnnual ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-7 flex flex-col transition-all ${
                    plan.popular
                      ? "border-purple-500/60 bg-gradient-to-b from-purple-950/60 to-black shadow-xl shadow-purple-500/10 scale-[1.02]"
                      : "border-white/10 bg-white/3 hover:border-white/20"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-5">{plan.description}</p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-5xl font-bold text-white">£{price}</span>
                      <span className="text-gray-400 mb-2">/mo</span>
                    </div>
                    {billingAnnual && (
                      <p className="text-xs text-emerald-400">
                        Billed annually (£{price * 12}/yr) — save £{(plan.monthlyPrice - price) * 12}/yr
                      </p>
                    )}
                    <p className="text-sm font-medium mt-2" style={{ color: plan.accentColor }}>
                      {plan.credits.toLocaleString()} credits/month
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full font-semibold ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg shadow-purple-500/25"
                        : "bg-white/8 hover:bg-white/15 text-white border border-white/15"
                    }`}
                    asChild
                  >
                    <a href="/subscribe">{plan.cta}</a>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Credit packs */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Need More Credits?</h3>
              <p className="text-gray-400">One-time credit top-ups — never expire</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { name: "Small Pack", price: 10, credits: 500, popular: false },
                { name: "Medium Pack", price: 25, credits: 1500, popular: true },
                { name: "Large Pack", price: 60, credits: 4000, popular: false },
              ].map((pack) => (
                <div
                  key={pack.name}
                  className={`rounded-2xl border p-6 text-center transition-all ${
                    pack.popular
                      ? "border-purple-500/40 bg-purple-950/30"
                      : "border-white/10 bg-white/3 hover:border-white/20"
                  }`}
                >
                  {pack.popular && (
                    <span className="inline-block mb-3 text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Best Value
                    </span>
                  )}
                  <p className="text-gray-400 text-sm mb-2">{pack.name}</p>
                  <p className="text-3xl font-bold text-white mb-1">£{pack.price}</p>
                  <p className="text-purple-400 text-sm font-medium mb-4">
                    {pack.credits.toLocaleString()} credits
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-white/8 hover:bg-white/15 text-white border border-white/15"
                    asChild
                  >
                    <a href="/credits">Buy Credits</a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof / Stats ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "50K+", label: "Videos Created" },
              { value: "4", label: "AI Engines" },
              { value: "160+", label: "Languages" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/3 p-6">
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400">Everything you need to know about WizVid</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-xl border border-white/10 bg-white/3 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                >
                  <span className="font-medium text-white text-sm sm:text-base">{faq.question}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${
                      openFaq === faq.id ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {openFaq === faq.id && (
                  <div className="px-5 pb-5 border-t border-white/5">
                    <p className="text-gray-400 text-sm leading-relaxed pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10 rounded-3xl blur-3xl" />
          <div className="relative rounded-3xl border border-white/10 bg-white/3 p-12 backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-6">
              <Shield className="h-3.5 w-3.5" />
              No credit card required
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Ready to Create?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of creators using WizVid to bring their ideas to life.
              Start free — no credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 h-12 px-10 text-base font-semibold shadow-xl shadow-purple-500/30"
                asChild
              >
                <a href={getLoginUrl()}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Started Free
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white h-12 px-10 text-base"
                asChild
              >
                <a href="/subscribe">
                  <Globe className="h-4 w-4 mr-2" />
                  View All Plans
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-black py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 mb-10">
            {/* Brand column */}
            <div className="md:col-span-2">
              <a href="/" className="flex items-center gap-2.5 mb-4">
                <img
                  src={WIZVID_LOGO}
                  alt="WizVid"
                  className="h-8 w-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  WizVid
                </span>
              </a>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                The AI video platform that gives creators more — more tools, more value, and more creative freedom.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Tools</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="/tools/text-to-video" className="hover:text-gray-300 transition-colors">Text-to-Video</a></li>
                <li><a href="/tools/lip-sync" className="hover:text-gray-300 transition-colors">Lip-Sync</a></li>
                <li><a href="/tools/video-to-video" className="hover:text-gray-300 transition-colors">Video-to-Video</a></li>
                <li><a href="/tools/voiceover" className="hover:text-gray-300 transition-colors">AI Voiceover</a></li>
                <li><a href="/autopilot" className="hover:text-gray-300 transition-colors">Autopilot</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-300 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-gray-300 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-gray-300 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-gray-300 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gray-300 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>&copy; 2026 WizVid. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-gray-400 transition-colors">Twitter</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Discord</a>
              <a href="#" className="hover:text-gray-400 transition-colors">YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
