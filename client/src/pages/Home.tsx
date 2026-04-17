import { useState, useEffect, useRef } from "react";
import { NavLink } from "@/components/NavLink";
import { mp } from "@/lib/mixpanel";
import { useProjectResume } from "@/hooks/useProjectResume";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Play, ArrowRight, Menu, X, ChevronDown,
  Music2, Image, Film, Zap, Wand2, FileText,
  Check, Star, Users, TrendingUp, Globe, Shield,
} from "lucide-react";

// ── Assets ───────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZAI_LOGO = `${CDN}/wizai-logo-v3_bd51f720.png`;
const HERO_BG_VIDEO = `${CDN}/hero-bg-v2_737633d7.mp4`;
const HERO_BG_POSTER = `${CDN}/wizvid-hero-bg-4k-GUBZqG8hsPmj5uDf256WGz.webp`;
const DEMO_POSTER = `${CDN}/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp`;

const WHO_IMAGES = [
  `${CDN}/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp`,
  `${CDN}/whos-it-for-youtubers-hVpTL9NRQkqFJoeEzGZYpN.webp`,
  `${CDN}/whos-it-for-ai-creators-iNKM9VvLTuKBigHPwZC3HS.webp`,
  `${CDN}/whos-it-for-kids-creators-V7CLZTheKBJ8dstLuLDWem.webp`,
];

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add("visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    name: "WizAudio",
    label: "Create Audio",
    desc: "Full songs, vocals and soundtracks — produced by AI in minutes.",
    icon: <Music2 className="w-5 h-5" />,
    href: "/music-creator",
  },
  {
    name: "WizImage",
    label: "Create Images",
    desc: "Thumbnails, characters and brand visuals — generated instantly.",
    icon: <Image className="w-5 h-5" />,
    href: "/wiz-image",
  },
  {
    name: "WizVideo",
    label: "Create Videos",
    desc: "Full cinematic music videos from any track — not just clips.",
    icon: <Film className="w-5 h-5" />,
    href: "/music-video/create",
  },
  {
    name: "WizShorts",
    label: "Create Shorts",
    desc: "Scroll-stopping Shorts, Reels and TikToks — created in seconds.",
    icon: <Zap className="w-5 h-5" />,
    href: "/wiz-shorts",
  },
  {
    name: "WizAnimate",
    label: "Create Animation",
    desc: "Animated stories and stylised visuals — from a single prompt.",
    icon: <Wand2 className="w-5 h-5" />,
    href: "/kids-video",
  },
  {
    name: "WizScript",
    label: "Create from Text",
    desc: "Any written idea becomes scenes and a full AI video.",
    icon: <FileText className="w-5 h-5" />,
    href: "/text-to-video",
  },
];

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#060606]/95 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.6)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.8rem] w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <a href="/" className="nav-link">Home</a>

            {/* Products dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="nav-link flex items-center gap-1">
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${productsOpen ? "rotate-180" : ""}`} />
              </button>
              {productsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#0a0a0a]/98 backdrop-blur-2xl border border-[--color-gold]/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-2 z-50">
                  {PRODUCTS.map((p) => (
                    <a
                      key={p.name}
                      href={p.href}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors group"
                    >
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

            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/help" className="nav-link">Help</a>
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <a href="/dashboard" className="btn-primary-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Dashboard
              </a>
            ) : (
              <>
                <a href={getLoginUrl()} className="text-[13px] text-[--color-silver-dark] hover:text-[--color-silver-light] transition-colors font-medium px-3 py-2">
                  Sign in
                </a>
                <a href="/onboarding" className="btn-primary-sm">
                  Start Creating
                </a>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-[--color-silver]" /> : <Menu className="w-5 h-5 text-[--color-silver]" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="absolute top-[72px] left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_16px_60px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 flex flex-col gap-1">
              <a href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</a>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <p className="text-[10px] text-[--color-gold-dark]/40 font-bold uppercase tracking-[0.2em] px-4 py-2">Products</p>
                {PRODUCTS.map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-[--color-silver-dark]">{p.icon}</span>
                    <span className="text-[14px] font-semibold text-[--color-gold-light]">{p.name}</span>
                  </a>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <a href="/pricing" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Pricing</a>
                <a href="/help" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Help</a>
              </div>
              <div className="mt-3 pt-3 border-t border-[--color-gold]/[0.08] flex flex-col gap-2">
                {isAuthenticated ? (
                  <a href="/dashboard" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}>
                    <Sparkles className="w-4 h-4" /> Dashboard
                  </a>
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

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [demoOpen, setDemoOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#030303]">
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-[0.10] blur-[4px] saturate-[0.4] brightness-[0.7]"
        src={HERO_BG_VIDEO}
        poster={HERO_BG_POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      {/* Gradient overlays — deep cinematic */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/95 via-[#030303]/75 to-[#030303] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#030303]/80 via-transparent to-[#030303]/60 pointer-events-none" />
      {/* Subtle gold ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.78 0.11 75), transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-[96px] pb-24 w-full">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] backdrop-blur-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[--color-gold-dark]">Premium Creative Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] tracking-tight text-white mb-6">
            Create anything.<br />
            <span className="metallic-gold">Instantly.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-[clamp(1rem,2vw,1.25rem)] text-[--color-silver]/70 leading-relaxed max-w-2xl mb-10">
            WIZ AI is the premium creative intelligence platform for audio, images, video, shorts, animation, and text-to-video.
          </p>

          {/* Supporting copy */}
          <p className="text-sm text-[--color-silver-dark]/50 mb-10 font-medium tracking-wide">
            No editing experience needed. Build faster with AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <a
              href="/onboarding"
              className="btn-primary inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base"
              onClick={() => mp.heroCTAClicked?.()}
            >
              <Sparkles className="w-5 h-5" />
              Start Creating
            </a>
            <a
              href="#products"
              className="btn-secondary inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base"
            >
              Explore Products
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2.5 text-[--color-silver-dark] hover:text-[--color-silver-light] font-medium text-sm transition-colors"
            >
              <span className="relative w-8 h-8 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-[--color-gold]/10 animate-ping" style={{ animationDuration: "2.5s" }} />
                <span className="absolute inset-0 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/5 flex items-center justify-center">
                  <Play className="w-3 h-3 text-[--color-gold] ml-0.5" fill="currentColor" />
                </span>
              </span>
              Watch Demo
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex -space-x-2">
              {WHO_IMAGES.map((src, i) => (
                <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-[#030303] object-cover" />
              ))}
            </div>
            <span className="text-[--color-silver-dark]/40 text-xs font-medium">Trusted by creators, musicians, and YouTubers</span>
            <div className="flex items-center gap-4 text-xs text-[--color-silver-dark]/30">
              <span className="flex items-center gap-1.5"><span className="text-[--color-silver]/60 font-semibold">5 min</span> avg. creation</span>
              <span className="w-px h-3 bg-[--color-gold]/10" />
              <span className="flex items-center gap-1.5"><span className="text-[--color-silver]/60 font-semibold">Full video</span> not just clips</span>
              <span className="w-px h-3 bg-[--color-gold]/10" />
              <span className="flex items-center gap-1.5"><span className="text-[--color-silver]/60 font-semibold">Free</span> to create</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mute toggle */}
      <button
        onClick={() => {
          if (videoRef.current) {
            videoRef.current.muted = !muted;
            setMuted(!muted);
          }
        }}
        className="absolute bottom-8 right-6 z-20 w-9 h-9 rounded-full border border-[--color-gold]/[0.1] bg-black/50 backdrop-blur-sm flex items-center justify-center text-[--color-silver-dark]/40 hover:text-[--color-silver-light] transition-colors"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        )}
      </button>

      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ── Choose What You Want to Create ────────────────────────────────────────────
function ProductGrid() {
  return (
    <section id="products" className="relative bg-[#040404] py-28 px-6 scroll-mt-20">
      {/* Top gold divider */}
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WIZ AI Platform</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-4">
            Choose what you want to create
          </h2>
          <p className="text-[--color-silver-dark]/60 text-lg max-w-xl leading-relaxed">
            Six premium AI tools — one unified platform. No editing experience required.
          </p>
        </div>

        {/* 3-column grid — luxury cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[--color-gold]/[0.04] rounded-2xl overflow-hidden border border-[--color-gold]/[0.06]">
          {PRODUCTS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              className="group relative flex flex-col gap-5 p-8 bg-[#040404] hover:bg-[#0a0a0a] transition-all duration-500 reveal"
            >
              {/* Icon — metallic treatment */}
              <div className="w-12 h-12 rounded-xl border border-[--color-gold]/[0.1] bg-[--color-gold]/[0.03] flex items-center justify-center text-[--color-gold] group-hover:border-[--color-gold]/[0.25] group-hover:bg-[--color-gold]/[0.06] group-hover:shadow-[0_0_20px_rgba(196,164,100,0.08)] transition-all duration-500 group-hover:scale-110">
                {p.icon}
              </div>
              {/* Text */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-xl font-black tracking-tight text-[--color-gold]">{p.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[--color-silver-dark]/25">{p.label}</span>
                </div>
                <p className="text-[--color-silver-dark]/50 text-sm leading-relaxed">{p.desc}</p>
              </div>
              {/* CTA arrow */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[--color-gold-dark] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                Start with {p.name} <ArrowRight className="w-3 h-3" />
              </div>
              {/* Corner ambient glow */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at top right, oklch(0.78 0.11 75 / 0.06), transparent 70%)" }} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Welcome to WIZ AI (Demo Video) ────────────────────────────────────────────
function WelcomeSection() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-5">Welcome to WIZ AI</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-white leading-tight mb-6">
              A premium new world of AI-powered creation.
            </h2>
            <p className="text-[--color-silver-dark]/55 text-base leading-relaxed mb-8">
              See how WIZ AI turns any idea into a full video in minutes. No editing. No experience. Just describe your idea and watch it come to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/onboarding"
                className="btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Start Creating
              </a>
              <a href="/pricing" className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm">
                View Pricing
              </a>
            </div>
          </div>
          <div className="reveal">
            <button
              onClick={() => setDemoOpen(true)}
              className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-[--color-gold]/[0.08] bg-[#080808] hover:border-[--color-gold]/[0.2] transition-all duration-500 shadow-[0_16px_60px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(196,164,100,0.05)] focus:outline-none"
              aria-label="Watch WIZ AI demo"
            >
              <img
                src={DEMO_POSTER}
                alt="WIZ AI demo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.85]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="relative w-16 h-16">
                  <span className="absolute inset-0 rounded-full bg-[--color-gold]/15 animate-ping" style={{ animationDuration: "2.5s" }} />
                  <span className="absolute inset-0 rounded-full bg-[--color-gold]/10 border-2 border-[--color-gold]/40 group-hover:bg-[--color-gold]/15 group-hover:border-[--color-gold]/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                    <Play className="w-6 h-6 text-[--color-gold] ml-0.5" fill="currentColor" />
                  </span>
                </div>
                <span className="text-white font-semibold text-sm drop-shadow-lg">Watch 20-sec Demo</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-xs text-[--color-silver-dark]/50 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-[--color-gold]/[0.06]">Prompt → Storyboard → Final Video</span>
                <span className="text-xs text-[--color-silver-dark]/50 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-[--color-gold]/[0.06]">20 seconds</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", title: "Describe your idea", desc: "Tell WIZ AI what you want to create — a music video, animation, cinematic short, or anything else." },
    { num: "02", title: "AI builds your storyboard", desc: "WizCreate™ generates a full visual storyboard with scenes, characters, and direction — in seconds." },
    { num: "03", title: "Preview every scene", desc: "Review your full video before committing to render. Edit, swap, or refine any scene you want." },
    { num: "04", title: "Render your video", desc: "Building Your Video in HD or 4K with WizSound™ and WizLumina™ baked in. Download and share." },
  ];
  return (
    <section id="how-it-works" className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">How it works</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            From idea to finished video in minutes
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="reveal relative">
              {/* Connector line — gold gradient */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(100%_-_1rem)] w-full h-px" style={{ background: "linear-gradient(90deg, oklch(0.78 0.11 75 / 0.15), transparent)" }} />
              )}
              <div className="relative z-10">
                <div className="text-[3rem] font-black leading-none metallic-gold opacity-30 mb-4">{s.num}</div>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Why WIZ AI ────────────────────────────────────────────────────────────────
function WhyWizAI() {
  const reasons = [
    { icon: <Star className="w-5 h-5" />, title: "Full video, not just clips", desc: "WIZ AI produces complete, structured videos — not short clips or fragments. Full narrative. Full render." },
    { icon: <Shield className="w-5 h-5" />, title: "Preview before you pay", desc: "See your entire video — every scene, every frame — before spending a single credit on rendering." },
    { icon: <Zap className="w-5 h-5" />, title: "No editing experience needed", desc: "WIZ AI handles storyboarding, scene generation, audio enhancement, and visual grading automatically." },
    { icon: <Globe className="w-5 h-5" />, title: "Every creative format covered", desc: "Music videos, animations, shorts, images, audio tracks, and text-to-video — all in one platform." },
    { icon: <TrendingUp className="w-5 h-5" />, title: "Create more, publish faster", desc: "Solo creator or full team — produce weeks of content in a single session. WIZ AI keeps up with your ambition." },
    { icon: <Users className="w-5 h-5" />, title: "Trusted by real creators", desc: "Musicians, YouTubers, animators, and brands use WIZ AI to produce content that gets results." },
  ];
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Why WIZ AI is different</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight max-w-2xl">
            Not just another AI tool. A complete creative system.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r) => (
            <div key={r.title} className="reveal glass-card p-7 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl border border-[--color-gold]/[0.1] bg-[--color-gold]/[0.03] flex items-center justify-center text-[--color-gold]">
                {r.icon}
              </div>
              <h3 className="text-base font-bold text-white">{r.title}</h3>
              <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Showcase ──────────────────────────────────────────────────────────────────
function Showcase() {
  const { data: dbItems } = trpc.showcase.list.useQuery();
  const items = dbItems && dbItems.length > 0 ? dbItems : [
    { id: 1, title: "Midnight City — Cinematic Style", category: "Cinematic AI Video", posterUrl: `${CDN}/showcase-music-neon-stage-L43AthLEfiF5bt3wJUcHWB.webp`, description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt in under three minutes." },
    { id: 2, title: "Stage Performance — Music Video", category: "Music Video", posterUrl: `${CDN}/showcase-music-desert-sunset-gGWfEUTSjXNgKVCvSv5y85.webp`, description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created with WizVideo from an uploaded track." },
    { id: 3, title: "Star Quest — Kids Channel Intro", category: "Animation", posterUrl: `${CDN}/showcase-music-cyberpunk-band-mEMS5T6znt5Fqj3DwimTcK.webp`, description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description and theme prompt." },
  ];

  return (
    <section id="showcase" className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 reveal">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Created with WIZ AI</p>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
              See what's possible
            </h2>
          </div>
          <a href="/showcase" className="inline-flex items-center gap-2 text-sm font-semibold text-[--color-gold-dark] hover:text-[--color-gold] transition-colors">
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="reveal group glass-card overflow-hidden">
              <div className="aspect-video overflow-hidden">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.9]"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[--color-gold-dark] bg-[--color-gold]/[0.05] border border-[--color-gold]/[0.1] px-2.5 py-1 rounded-full mb-3">
                  {item.category}
                </span>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed">{item.description}</p>
              </div>
              <div className="px-5 pb-5">
                <a href="/onboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[--color-gold-dark]/60 hover:text-[--color-gold] transition-colors">
                  Create something like this <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Built For ─────────────────────────────────────────────────────────────────
function BuiltFor() {
  const audiences = [
    { title: "Musicians", desc: "Turn your track into a full music video — synced to lyrics, with animated characters and cinematic visuals.", cta: "Start with WizVideo", href: "/music-video/create", icon: <Music2 className="w-6 h-6" /> },
    { title: "Content Creators", desc: "Generate faceless YouTube videos, social shorts, and visual stories — no camera, no editing, no crew.", cta: "Start with WizScript", href: "/text-to-video", icon: <FileText className="w-6 h-6" /> },
    { title: "Animators & Storytellers", desc: "Create cinematic 3D animations, anime, and visual stories from a single prompt.", cta: "Start with WizAnimate", href: "/kids-video", icon: <Wand2 className="w-6 h-6" /> },
    { title: "YouTubers & Brands", desc: "Produce professional video content at scale — intros, explainers, and branded visuals, all AI-generated.", cta: "Start Creating", href: "/onboarding", icon: <TrendingUp className="w-6 h-6" /> },
  ];
  return (
    <section id="built-for" className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Built for creators</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            WIZ AI helps you create
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((a) => (
            <div key={a.title} className="reveal glass-card p-7 flex flex-col gap-5">
              <div className="text-[--color-gold]">{a.icon}</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{a.title}</h3>
                <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed">{a.desc}</p>
              </div>
              <a href={a.href} className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[--color-gold-dark] hover:text-[--color-gold] transition-colors">
                {a.cta} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative bg-[#040404] py-32 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.78 0.11 75), transparent 70%)" }} />
      <div className="relative z-10 max-w-3xl mx-auto text-center reveal">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[--color-gold]" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">No credit card required</span>
        </div>
        <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black tracking-tight text-white mb-6 leading-tight">
          Ready to start creating?
        </h2>
        <p className="text-[--color-silver-dark]/50 text-lg mb-10 leading-relaxed">
          Create audio, images, video, shorts, animation, and more — all from one platform. Pay only when you render.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/onboarding"
            className="btn-primary inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-base"
          >
            <Sparkles className="w-5 h-5" />
            Start Creating
          </a>
          <a href="/pricing" className="inline-flex items-center gap-2 text-sm text-[--color-silver-dark]/40 hover:text-[--color-silver] transition-colors font-medium">
            View Pricing <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <p className="mt-6 text-xs text-[--color-silver-dark]/25">No credit card required. 2 free videos included.</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative bg-[#030303] py-16 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.2rem] w-auto object-contain mb-5 drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" />
            <p className="text-[--color-silver-dark]/40 text-sm leading-relaxed mb-5 max-w-xs">
              The premium creative intelligence platform. Create audio, images, video, shorts, animation, and text-to-video — instantly.
            </p>
            <a href="mailto:support@wiz-ai.io" className="text-[--color-silver-dark]/30 text-xs hover:text-[--color-gold-dark] transition-colors">
              support@wiz-ai.io
            </a>
          </div>
          {/* Products */}
          <div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Products</h4>
            <div className="flex flex-col gap-3">
              {PRODUCTS.map((p) => (
                <a key={p.name} href={p.href} className="text-sm text-[--color-silver-dark]/40 hover:text-[--color-gold] transition-colors font-medium">{p.name}</a>
              ))}
            </div>
          </div>
          {/* Platform */}
          <div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Platform</h4>
            <div className="flex flex-col gap-3">
              {[
                { label: "How It Works", href: "/#how-it-works" },
                { label: "Showcase", href: "/#showcase" },
                { label: "For Creators", href: "/#built-for" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          {/* Support / Legal */}
          <div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Support</h4>
            <div className="flex flex-col gap-3 mb-8">
              <a href="/help" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Help Centre</a>
              <a href="mailto:support@wiz-ai.io" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Contact</a>
            </div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Legal</h4>
            <div className="flex flex-col gap-3">
              <a href="/privacy" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Terms of Service</a>
              <a href="/refunds" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[--color-gold]/[0.05] pt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[--color-silver-dark]/25 mr-1">Secure payments via</span>
            {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((m) => (
              <span key={m} className="text-[11px] text-[--color-silver-dark]/30 border border-[--color-gold]/[0.06] bg-[--color-gold]/[0.02] px-2.5 py-1 rounded-md font-medium">{m}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[--color-silver-dark]/25">
            <p>&copy; 2026 WIZ AI. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</a>
              <a href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Continue Project Banner ────────────────────────────────────────────────────
function ContinueProjectBanner() {
  const { resumeData, showResume } = useProjectResume();
  if (!showResume || !resumeData) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full mx-4">
      <div className="bg-[#0a0a0a] border border-[--color-gold]/[0.1] rounded-2xl px-5 py-4 shadow-[0_16px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[--color-silver-dark]/40 mb-0.5">Continue where you left off</p>
          <p className="text-sm font-semibold text-white truncate">{resumeData.title || "Untitled project"}</p>
        </div>
        <a href="/dashboard" className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors">
          Continue <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  useReveal();
  return (
    <div className="bg-[#030303] text-white min-h-screen overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <Nav />
      <main id="main-content">
        <Hero />
        <ProductGrid />
        <WelcomeSection />
        <HowItWorks />
        <WhyWizAI />
        <Showcase />
        <BuiltFor />
        <FinalCTA />
      </main>
      <Footer />
      <ContinueProjectBanner />
    </div>
  );
}
