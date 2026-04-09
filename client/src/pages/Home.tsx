import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import {
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
  ChevronRight,
  Users,
  Award,
  Clock,
} from "lucide-react";

const WIZVID_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/Wizvidlogowithneonmagicflair(1)_03506e50.png";

// CDN image URLs
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/hero-bg_0c544607.jpg";
const TOOL_TEXT_TO_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/tool-text-to-video_5badce81.jpg";
const TOOL_LIP_SYNC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/tool-lip-sync_77516052.jpg";
const TOOL_VIDEO_TRANSFORM = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/tool-video-transform_1fada77c.jpg";
const TOOL_VOICEOVER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/tool-voiceover_db8c4381.jpg";

// Gallery images — row 1 (left-scrolling)
const GALLERY_ROW1 = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-1_e7890e7b.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-3_c24095d7.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-6_1f16db7f.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-8_658aaaa2.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-10_5340263c.jpg",
];

// Gallery images — row 2 (right-scrolling)
const GALLERY_ROW2 = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-2_7645616e.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-4_7dce2c46.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-5_ff5ff8c2.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-7_017c9104.jpg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/gallery-9_b58416e8.jpg",
];

const aiTools = [
  {
    icon: Video,
    label: "Text-to-Video",
    tagline: "Powered by Kling AI 3.0 & Seedance 2.0",
    description: "Type a prompt. Watch it become a cinematic video in minutes. From fantasy landscapes to product demos — no camera required.",
    image: TOOL_TEXT_TO_VIDEO,
    href: "/tools/text-to-video",
    accent: "from-purple-600 to-blue-600",
    badge: "Most Popular",
  },
  {
    icon: Users,
    label: "Lip-Sync Avatars",
    tagline: "Powered by HeyGen Avatar IV",
    description: "Create a realistic talking avatar that delivers your message with perfect lip-sync in 160+ languages. Ideal for marketing and training.",
    image: TOOL_LIP_SYNC,
    href: "/tools/lip-sync",
    accent: "from-pink-600 to-purple-600",
    badge: "160+ Languages",
  },
  {
    icon: Wand2,
    label: "Video Transform",
    tagline: "Powered by Runway ML Gen-3",
    description: "Upload any footage and transform it with stunning artistic styles — anime, oil painting, cyberpunk, and more. Your content, reimagined.",
    image: TOOL_VIDEO_TRANSFORM,
    href: "/tools/video-to-video",
    accent: "from-cyan-600 to-blue-600",
    badge: "Style Transfer",
  },
  {
    icon: Mic,
    label: "AI Voiceover",
    tagline: "160+ Languages & Voice Styles",
    description: "Natural-sounding narration in any language with multiple tones — professional, casual, dramatic. Add voice to any video instantly.",
    image: TOOL_VOICEOVER,
    href: "/tools/voiceover",
    accent: "from-emerald-600 to-cyan-600",
    badge: "Natural Speech",
  },
];

export default function Home() {
  const { isAuthenticated, logout } = useAuth();
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
        "Commercial licence",
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
      answer: "Credits are the currency of WizVid. Each AI tool generation consumes credits based on complexity and duration. Your subscription includes monthly credits, and you can purchase additional top-up packs anytime. Purchased credits never expire.",
    },
    {
      id: "2",
      question: "Is storyboard generation really free?",
      answer: "Yes! With our WizPilot, you can generate and regenerate your storyboard as many times as you want — completely free. Credits are only charged when you click 'Render Final Video'. This is our key advantage over competitors like Neural Frames.",
    },
    {
      id: "3",
      question: "Can I upgrade or downgrade my subscription?",
      answer: "Yes, you can change your subscription tier at any time. Upgrades take effect immediately, and downgrades apply at the end of your billing cycle. No lock-in contracts.",
    },
    {
      id: "4",
      question: "Do my credits roll over each month?",
      answer: "Monthly subscription credits reset each billing cycle. However, credits purchased through top-up packs don't expire and can be used anytime — they're yours to keep.",
    },
    {
      id: "5",
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express), as well as Apple Pay and Google Pay. Payments are processed securely through Stripe — all transactions are encrypted and PCI-compliant.",
    },
    {
      id: "6",
      question: "Can I cancel my subscription anytime?",
      answer: "Absolutely. You can cancel your subscription at any time from your account settings with no cancellation fees. You'll retain access until the end of your billing period.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Announcement Banner ── */}
      <div className="bg-gradient-to-r from-purple-950/90 via-purple-900/90 to-blue-950/90 border-b border-purple-500/20 py-2.5 px-4 text-center">
        <p className="text-sm text-purple-200">
          <span className="font-bold text-purple-300">✨ WizVid Advantage:</span>{" "}
          Regenerate your storyboard unlimited times — completely free. Credits only charged on final render.{" "}
          <a href="/wizpilot" className="underline hover:text-white transition-colors font-medium">
            Try WizPilot →
          </a>
        </p>
      </div>

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <img src={WIZVID_LOGO} alt="WizVid" className="h-9 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              WizVid
            </span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="/tools/text-to-video" className="hover:text-white transition-colors">Tools</a>
            <a href="/subscribe" className="hover:text-white transition-colors">Pricing</a>
            <a href="/wizpilot" className="hover:text-white transition-colors">WizPilot</a>
            <a href="/music-video" className="hover:text-white transition-colors text-purple-300 hover:text-purple-100 font-medium">🎵 Music Video</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <a href="/dashboard" className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors">Dashboard</a>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0" asChild>
                  <a href="/dashboard"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Create</a>
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => logout()}>Logout</Button>
              </>
            ) : (
              <>
                <a href={getLoginUrl()} className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors">Sign In</a>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0" asChild>
                  <a href={getLoginUrl()}>Get Started Free</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO: Full-screen cinematic background ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden">
        {/* Cinematic background image */}
        <div className="absolute inset-0">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: "brightness(0.35) saturate(1.2)" }}
          />
          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-950/30 via-transparent to-blue-950/30" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">

          {/* LARGE BRAND LOGO — the centrepiece */}
          <div className="mb-8 flex flex-col items-center">
            <img
              src={WIZVID_LOGO}
              alt="WizVid"
              className="w-auto mb-4 drop-shadow-2xl"
              style={{ height: "clamp(80px, 14vw, 160px)", filter: "drop-shadow(0 0 40px rgba(168,85,247,0.6)) drop-shadow(0 0 80px rgba(59,130,246,0.4))" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/15 px-5 py-2 text-sm text-purple-200 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
              <span>The AI Video Platform That Gives You More</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-white">Prompt to</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #c084fc 0%, #818cf8 40%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Cinema
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform your ideas into professional-quality videos using cutting-edge AI.
            Text-to-video, lip-sync avatars, video transformation, and AI voiceover — all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button
              size="lg"
              className="h-14 px-10 text-base font-bold border-0 text-white shadow-2xl"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 0 40px rgba(124,58,237,0.5)" }}
              asChild
            >
              <a href={getLoginUrl()}>
                <Sparkles className="h-5 w-5 mr-2" />
                Start Creating Free
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-10 text-base font-semibold border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
              asChild
            >
              <a href="/subscribe">
                View Plans
                <ArrowRight className="h-5 w-5 ml-2" />
              </a>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            {["50 free credits on sign-up", "Free storyboard regeneration", "No credit card required", "Save 33% with annual billing"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent" />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="border-y border-white/5 bg-white/2 py-6 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "10,000+", label: "Creators", icon: Users },
            { value: "4 AI Tools", label: "In One Platform", icon: Zap },
            { value: "160+", label: "Languages", icon: Globe },
            { value: "4K", label: "Quality Output", icon: Award },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className="h-5 w-5 text-purple-400 mb-1" />
              <span className="text-2xl font-bold text-white">{value}</span>
              <span className="text-sm text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrolling Gallery Marquee ── */}
      <section className="py-20 overflow-hidden bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Get Inspired
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Every image below was created with AI — the same tools available to you on WizVid right now.
          </p>
        </div>

        {/* Row 1 — scrolls left */}
        <div className="relative mb-4 overflow-hidden">
          <div
            className="flex gap-4"
            style={{
              animation: "marquee-left 40s linear infinite",
              width: "max-content",
            }}
          >
            {[...GALLERY_ROW1, ...GALLERY_ROW1].map((src, i) => (
              <div
                key={i}
                className="relative shrink-0 rounded-2xl overflow-hidden"
                style={{ width: "380px", height: "214px" }}
              >
                <img
                  src={src}
                  alt={`AI generated video ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="relative overflow-hidden">
          <div
            className="flex gap-4"
            style={{
              animation: "marquee-right 50s linear infinite",
              width: "max-content",
            }}
          >
            {[...GALLERY_ROW2, ...GALLERY_ROW2].map((src, i) => (
              <div
                key={i}
                className="relative shrink-0 rounded-2xl overflow-hidden"
                style={{ width: "380px", height: "214px" }}
              >
                <img
                  src={src}
                  alt={`AI generated video ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 text-center">
          <Button
            size="lg"
            className="h-12 px-8 font-semibold border-0 text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            asChild
          >
            <a href={getLoginUrl()}>
              <Play className="h-4 w-4 mr-2" />
              Create Your First Video Free
            </a>
          </Button>
        </div>
      </section>

      {/* ── AI Tools Feature Sections (seeddance.io style: alternating large image + text) ── */}
      <section className="py-10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
              Four AI Tools. One Platform.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to create, transform, and narrate professional videos — powered by the world's leading AI models.
            </p>
          </div>

          <div className="space-y-24">
            {aiTools.map((tool, i) => {
              const Icon = tool.icon;
              const isEven = i % 2 === 0;
              return (
                <div
                  key={tool.label}
                  className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-12 lg:gap-16`}
                >
                  {/* Image */}
                  <div className="w-full lg:w-3/5 shrink-0">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: "16/9" }}>
                      <img
                        src={tool.image}
                        alt={tool.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                          <Play className="h-7 w-7 text-white fill-white ml-1" />
                        </div>
                      </div>
                      {/* Badge */}
                      <div className="absolute top-4 left-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r ${tool.accent}`}>
                          {tool.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="w-full lg:w-2/5">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.accent} mb-5`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-purple-400 mb-2 tracking-wide uppercase">{tool.tagline}</p>
                    <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">{tool.label}</h3>
                    <p className="text-gray-400 text-lg leading-relaxed mb-8">{tool.description}</p>
                    <Button
                      className={`bg-gradient-to-r ${tool.accent} text-white border-0 h-11 px-7 font-semibold`}
                      asChild
                    >
                      <a href={tool.href}>
                        Try {tool.label}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WizPilot Feature Highlight ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-black to-blue-950/40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300 mb-6">
            <Zap className="h-3.5 w-3.5" />
            WizVid Exclusive
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 leading-tight">
            Free Storyboard.<br />
            <span style={{ background: "linear-gradient(135deg, #34d399, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Pay Only to Render.
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Our WizPilot lets you generate and regenerate your entire video storyboard unlimited times — for free. Credits are only charged when you're happy and click Render. No other platform does this.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: Sparkles, title: "Generate Storyboard", desc: "Describe your video idea in plain English", color: "text-purple-400" },
              { icon: Wand2, title: "Refine for Free", desc: "Tweak and regenerate as many times as you like", color: "text-blue-400" },
              { icon: Zap, title: "Render When Ready", desc: "Credits only charged on final render", color: "text-emerald-400" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/3 p-6 text-left backdrop-blur">
                <Icon className={`h-7 w-7 ${color} mb-3`} />
                <h4 className="font-bold text-white mb-2">{title}</h4>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
          <Button
            size="lg"
            className="h-13 px-10 font-bold border-0 text-white"
            style={{ background: "linear-gradient(135deg, #059669, #0891b2)", boxShadow: "0 0 30px rgba(5,150,105,0.4)" }}
            asChild
          >
            <a href="/wizpilot">
              <Sparkles className="h-5 w-5 mr-2" />
              Try WizPilot Free
            </a>
          </Button>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg mb-8">No hidden fees. Cancel anytime. 7-day money-back guarantee.</p>
            {/* Toggle */}
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1.5">
              <button
                onClick={() => setBillingAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${!billingAnnual ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all flex items-center gap-2 ${billingAnnual ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"}`}
              >
                Annual
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 rounded-full px-2 py-0.5">Save 33%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl border p-8 flex flex-col ${
                  plan.popular
                    ? "border-purple-500/50 bg-gradient-to-b from-purple-950/50 to-black"
                    : "border-white/8 bg-white/3"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                      <Star className="h-3 w-3 fill-white" />
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">
                      £{billingAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-gray-500 mb-1">/month</span>
                  </div>
                  {billingAnnual && (
                    <p className="text-xs text-emerald-400 mt-1">Billed annually · Save £{(plan.monthlyPrice - plan.annualPrice) * 12}/yr</p>
                  )}
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 font-semibold border-0 text-white ${plan.popular ? "" : "bg-white/10 hover:bg-white/20"}`}
                  style={plan.popular ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)" } : {}}
                  asChild
                >
                  <a href="/subscribe">{plan.cta}</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Have another question? Reach us at <a href="mailto:support@wizvid.ai" className="text-purple-400 hover:text-purple-300">support@wizvid.ai</a></p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                >
                  <span className="font-semibold text-white text-sm sm:text-base">{faq.question}</span>
                  <ChevronRight className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${openFaq === faq.id ? "rotate-90" : ""}`} />
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

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10 blur-3xl" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="rounded-3xl border border-white/10 bg-white/3 p-12 backdrop-blur">
            <img
              src={WIZVID_LOGO}
              alt="WizVid"
              className="h-20 w-auto mx-auto mb-6 drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 0 20px rgba(168,85,247,0.5))" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Ready to Create?</h2>
            <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of creators using WizVid to bring their ideas to life. Start free — no credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-13 px-10 text-base font-bold border-0 text-white shadow-2xl"
                style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 0 40px rgba(124,58,237,0.4)" }}
                asChild
              >
                <a href={getLoginUrl()}>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Get Started Free
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-13 px-10 text-base border-white/20 bg-white/5 hover:bg-white/10 text-white" asChild>
                <a href="/subscribe"><Globe className="h-4 w-4 mr-2" />View All Plans</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-black py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 mb-10">
            <div className="md:col-span-2">
              <a href="/" className="flex items-center gap-2.5 mb-4">
                <img src={WIZVID_LOGO} alt="WizVid" className="h-10 w-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">WizVid</span>
              </a>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                The AI video platform that gives creators more — more tools, more value, and more creative freedom.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Tools</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="/tools/text-to-video" className="hover:text-gray-300 transition-colors">Text-to-Video</a></li>
                <li><a href="/tools/lip-sync" className="hover:text-gray-300 transition-colors">Lip-Sync</a></li>
                <li><a href="/tools/video-to-video" className="hover:text-gray-300 transition-colors">Video-to-Video</a></li>
                <li><a href="/tools/voiceover" className="hover:text-gray-300 transition-colors">AI Voiceover</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="/wizpilot" className="hover:text-gray-300 transition-colors">WizPilot</a></li>
                <li><a href="/subscribe" className="hover:text-gray-300 transition-colors">Pricing</a></li>
                <li><a href="/credits" className="hover:text-gray-300 transition-colors">Credits</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</a></li>
                <li><a href="mailto:support@wizvid.ai" className="hover:text-gray-300 transition-colors">support@wizvid.ai</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">© 2026 WizVid. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Shield className="h-3.5 w-3.5" />
              Secure payments via Stripe · PCI compliant
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
