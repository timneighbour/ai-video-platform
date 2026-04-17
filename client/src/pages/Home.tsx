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

const SHOWCASE_POSTERS = [
  { src: `${CDN}/showcase-music-neon-stage-L43AthLEfiF5bt3wJUcHWB.webp`, label: "WizVideo" },
  { src: `${CDN}/showcase-music-desert-sunset-gGWfEUTSjXNgKVCvSv5y85.webp`, label: "WizAnimate" },
  { src: `${CDN}/showcase-music-cyberpunk-band-mEMS5T6znt5Fqj3DwimTcK.webp`, label: "WizShorts" },
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
    desc: "Create full songs, vocals and soundtracks in minutes.",
    icon: <Music2 className="w-5 h-5" />,
    href: "/music-creator",
    accent: "#10b981",
    accentClass: "text-emerald-400",
    borderClass: "border-emerald-500/20 hover:border-emerald-400/50",
    bgClass: "bg-emerald-500/5",
    glowClass: "hover:shadow-emerald-500/10",
  },
  {
    name: "WizImage",
    label: "Create Images",
    desc: "Generate thumbnails, characters and visuals instantly.",
    icon: <Image className="w-5 h-5" />,
    href: "/wiz-image",
    accent: "#f59e0b",
    accentClass: "text-amber-400",
    borderClass: "border-amber-500/20 hover:border-amber-400/50",
    bgClass: "bg-amber-500/5",
    glowClass: "hover:shadow-amber-500/10",
  },
  {
    name: "WizVideo",
    label: "Create Videos",
    desc: "Turn songs into full cinematic videos, not just clips.",
    icon: <Film className="w-5 h-5" />,
    href: "/music-video/create",
    accent: "#8b5cf6",
    accentClass: "text-violet-400",
    borderClass: "border-violet-500/20 hover:border-violet-400/50",
    bgClass: "bg-violet-500/5",
    glowClass: "hover:shadow-violet-500/10",
  },
  {
    name: "WizShorts",
    label: "Create Shorts",
    desc: "Produce scroll-stopping Shorts, Reels and TikToks in seconds.",
    icon: <Zap className="w-5 h-5" />,
    href: "/wiz-shorts",
    accent: "#06b6d4",
    accentClass: "text-cyan-400",
    borderClass: "border-cyan-500/20 hover:border-cyan-400/50",
    bgClass: "bg-cyan-500/5",
    glowClass: "hover:shadow-cyan-500/10",
  },
  {
    name: "WizAnimate",
    label: "Create Animation",
    desc: "Create Pixar-style animations and stylised stories from a single prompt.",
    icon: <Wand2 className="w-5 h-5" />,
    href: "/kids-video",
    accent: "#f43f5e",
    accentClass: "text-rose-400",
    borderClass: "border-rose-500/20 hover:border-rose-400/50",
    bgClass: "bg-rose-500/5",
    glowClass: "hover:shadow-rose-500/10",
  },
  {
    name: "WizScript",
    label: "Create from Text",
    desc: "Turn any written idea into scenes and a full AI video.",
    icon: <FileText className="w-5 h-5" />,
    href: "/text-to-video",
    accent: "#f97316",
    accentClass: "text-orange-400",
    borderClass: "border-orange-500/20 hover:border-orange-400/50",
    bgClass: "bg-orange-500/5",
    glowClass: "hover:shadow-orange-500/10",
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
            ? "bg-black/90 backdrop-blur-2xl border-b border-white/[0.05] shadow-[0_1px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.8rem] w-auto object-contain" />
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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#0c0c0c]/98 backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-2 z-50">
                  {PRODUCTS.map((p) => (
                    <a
                      key={p.name}
                      href={p.href}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                    >
                      <span className={`${p.accentClass} opacity-80 group-hover:opacity-100 transition-opacity`}>{p.icon}</span>
                      <div>
                        <p className={`text-[13px] font-semibold ${p.accentClass}`}>{p.name}</p>
                        <p className="text-[11px] text-white/35 mt-0.5 leading-tight">{p.label}</p>
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
                <a href={getLoginUrl()} className="text-[13px] text-white/50 hover:text-white/90 transition-colors font-medium px-3 py-2">
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
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute top-[72px] left-0 right-0 bg-[#0c0c0c]/98 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 flex flex-col gap-1">
              <a href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</a>
              <div className="mt-2 pt-2 border-t border-white/[0.05]">
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-[0.2em] px-4 py-2">Products</p>
                {PRODUCTS.map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={p.accentClass}>{p.icon}</span>
                    <span className={`text-[14px] font-semibold ${p.accentClass}`}>{p.name}</span>
                  </a>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.05]">
                <a href="/pricing" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Pricing</a>
                <a href="/help" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Help</a>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.07] flex flex-col gap-2">
                {isAuthenticated ? (
                  <a href="/dashboard" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}>
                    <Sparkles className="w-4 h-4" /> Dashboard
                  </a>
                ) : (
                  <>
                    <a href={getLoginUrl()} className="text-center text-sm text-white/50 hover:text-white py-2.5 transition-colors" onClick={() => setMobileOpen(false)}>Sign in</a>
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
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black">
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]"
        src={HERO_BG_VIDEO}
        poster={HERO_BG_POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-[96px] pb-24 w-full">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/60">Premium Creative Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] tracking-tight text-white mb-6">
            Create anything.<br />
            <span className="text-amber-400">Instantly.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-[clamp(1rem,2vw,1.25rem)] text-white/60 leading-relaxed max-w-2xl mb-10">
            WIZ AI is the premium creative intelligence platform for audio, images, video, shorts, animation, and text-to-video.
          </p>

          {/* Supporting copy */}
          <p className="text-sm text-white/35 mb-10 font-medium tracking-wide">
            No editing experience needed. Build faster with AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-base transition-all duration-200 shadow-[0_0_40px_rgba(251,191,36,0.3)] hover:shadow-[0_0_60px_rgba(251,191,36,0.45)] hover:scale-[1.02]"
              onClick={() => mp.heroCTAClicked?.()}
            >
              <Sparkles className="w-5 h-5" />
              {isAuthenticated ? "Start Creating" : "Start Creating"}
            </a>
            <a
              href="#products"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all duration-200 backdrop-blur-sm"
            >
              Explore Products
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2.5 text-white/50 hover:text-white/80 font-medium text-sm transition-colors"
            >
              <span className="relative w-8 h-8 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: "2.5s" }} />
                <span className="absolute inset-0 rounded-full border border-white/30 bg-white/10 flex items-center justify-center">
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </span>
              </span>
              Watch Demo
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex -space-x-2">
              {WHO_IMAGES.map((src, i) => (
                <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-black object-cover" />
              ))}
            </div>
            <span className="text-white/35 text-xs font-medium">Trusted by creators, musicians, and YouTubers</span>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span className="flex items-center gap-1.5"><span className="text-white/60 font-semibold">5 min</span> avg. creation</span>
              <span className="w-px h-3 bg-white/15" />
              <span className="flex items-center gap-1.5"><span className="text-white/60 font-semibold">Full video</span> not just clips</span>
              <span className="w-px h-3 bg-white/15" />
              <span className="flex items-center gap-1.5"><span className="text-white/60 font-semibold">Free</span> to create</span>
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
        className="absolute bottom-8 right-6 z-20 w-9 h-9 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
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
    <section id="products" className="bg-[#050505] py-28 px-6 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-4">WIZ AI Platform</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-4">
            Choose what you want to create
          </h2>
          <p className="text-white/40 text-lg max-w-xl leading-relaxed">
            Six premium AI tools — one unified platform. No editing experience required.
          </p>
        </div>

        {/* 3-column grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.04]">
          {PRODUCTS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              className={`group relative flex flex-col gap-5 p-8 bg-[#050505] hover:bg-[#0d0d0d] transition-colors duration-300 reveal`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl border ${p.borderClass} ${p.bgClass} flex items-center justify-center ${p.accentClass} transition-all duration-300 group-hover:scale-110`}>
                {p.icon}
              </div>
              {/* Text */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className={`text-xl font-black tracking-tight ${p.accentClass}`}>{p.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{p.label}</span>
                </div>
                <p className="text-white/45 text-sm leading-relaxed">{p.desc}</p>
              </div>
              {/* CTA arrow */}
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${p.accentClass} opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0`}>
                Get started <ArrowRight className="w-3 h-3" />
              </div>
              {/* Corner accent */}
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} style={{ background: `radial-gradient(circle at top right, ${p.accent}15, transparent 70%)` }} />
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
    <section className="bg-black py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-5xl mx-auto">
        {/* Two-column: text left, video right */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-5">Welcome to WIZ AI</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-white leading-tight mb-6">
              A premium new world of AI-powered creation.
            </h2>
            <p className="text-white/45 text-base leading-relaxed mb-8">
              See how WIZ AI turns any idea into a full video in minutes. No editing. No experience. Just describe your idea and watch it come to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Start Creating
              </a>
              <a href="/pricing" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold text-sm transition-colors">
                View pricing
              </a>
            </div>
          </div>
          <div className="reveal">
            <button
              onClick={() => setDemoOpen(true)}
              className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-[#111] hover:border-amber-400/30 transition-all duration-300 shadow-2xl hover:shadow-amber-400/10 focus:outline-none"
              aria-label="Watch WIZ AI demo"
            >
              <img
                src={DEMO_POSTER}
                alt="WIZ AI demo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="relative w-16 h-16">
                  <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" style={{ animationDuration: "2.5s" }} />
                  <span className="absolute inset-0 rounded-full bg-amber-400/15 border-2 border-amber-400/60 group-hover:bg-amber-400/25 group-hover:border-amber-400 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                    <Play className="w-6 h-6 text-amber-400 ml-0.5" fill="currentColor" />
                  </span>
                </div>
                <span className="text-white font-semibold text-sm drop-shadow-lg">Watch 20-sec Demo</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-xs text-white/50 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">Prompt → Storyboard → Final Video</span>
                <span className="text-xs text-white/50 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">20 seconds</span>
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
    {
      num: "01",
      title: "Describe your idea",
      desc: "Tell WIZ AI what you want to create — a music video, animation, cinematic short, or anything else.",
      accent: "text-amber-400",
    },
    {
      num: "02",
      title: "AI builds your storyboard",
      desc: "WizCreate™ generates a full visual storyboard with scenes, characters, and direction — in seconds.",
      accent: "text-violet-400",
    },
    {
      num: "03",
      title: "Preview every scene",
      desc: "Review your full video before committing to render. Edit, swap, or refine any scene you want.",
      accent: "text-cyan-400",
    },
    {
      num: "04",
      title: "Render your video",
      desc: "Building Your Video in HD or 4K with WizSound™ and WizLumina™ baked in. Download and share.",
      accent: "text-emerald-400",
    },
  ];
  return (
    <section className="bg-[#050505] py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-4">How it works</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            From idea to finished video in minutes
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="reveal relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(100%_-_1rem)] w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
              )}
              <div className="relative z-10">
                <div className={`text-[3rem] font-black leading-none ${s.accent} opacity-20 mb-4`}>{s.num}</div>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
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
    {
      icon: <Star className="w-5 h-5" />,
      title: "Full video, not just clips",
      desc: "WIZ AI produces complete, structured videos — not short clips or fragments. Full narrative. Full render.",
      accent: "text-amber-400",
      border: "border-amber-500/15",
      bg: "bg-amber-500/5",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Preview before you pay",
      desc: "See your entire video — every scene, every frame — before spending a single credit on rendering.",
      accent: "text-violet-400",
      border: "border-violet-500/15",
      bg: "bg-violet-500/5",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "No editing experience needed",
      desc: "WIZ AI handles storyboarding, scene generation, audio enhancement, and visual grading automatically.",
      accent: "text-cyan-400",
      border: "border-cyan-500/15",
      bg: "bg-cyan-500/5",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Every creative format covered",
      desc: "Music videos, animations, shorts, images, audio tracks, and text-to-video — all in one platform.",
      accent: "text-emerald-400",
      border: "border-emerald-500/15",
      bg: "bg-emerald-500/5",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Create more, publish faster",
      desc: "Solo creator or full team — produce weeks of content in a single session. WIZ AI keeps up with your ambition.",
      accent: "text-rose-400",
      border: "border-rose-500/15",
      bg: "bg-rose-500/5",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Trusted by real creators",
      desc: "Musicians, YouTubers, animators, and brands use WIZ AI to produce content that gets results.",
      accent: "text-orange-400",
      border: "border-orange-500/15",
      bg: "bg-orange-500/5",
    },
  ];
  return (
    <section className="bg-black py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-4">Why WIZ AI is different</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight max-w-2xl">
            Not just another AI tool. A complete creative system.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r) => (
            <div key={r.title} className={`reveal rounded-2xl border ${r.border} ${r.bg} p-7 flex flex-col gap-4`}>
              <div className={`w-10 h-10 rounded-xl ${r.bg} border ${r.border} flex items-center justify-center ${r.accent}`}>
                {r.icon}
              </div>
              <h3 className="text-base font-bold text-white">{r.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{r.desc}</p>
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
    { id: 1, title: "Neon City — Cinematic Style", category: "Cinematic AI Video", posterUrl: `${CDN}/showcase-music-neon-stage-L43AthLEfiF5bt3wJUcHWB.webp`, description: "A lone figure walks rain-soaked streets under violet neon lights. Generated from a single text prompt." },
    { id: 2, title: "Stage Performance — Music Video", category: "Music Video", posterUrl: `${CDN}/showcase-music-desert-sunset-gGWfEUTSjXNgKVCvSv5y85.webp`, description: "A full music video with synced visuals, concert lighting, and smoke effects. Created with WizVideo." },
    { id: 3, title: "Cherry Blossom — Anime Style", category: "Animation", posterUrl: `${CDN}/showcase-music-cyberpunk-band-mEMS5T6znt5Fqj3DwimTcK.webp`, description: "A magical anime scene with flowing hair and glowing particles. Generated using WizAnimate." },
  ];

  return (
    <section className="bg-[#050505] py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 reveal">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-4">Created with WIZ AI</p>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
              See what's possible
            </h2>
          </div>
          <a href="/showcase" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors font-medium flex-shrink-0">
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="reveal group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a] hover:border-white/15 transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-400/80 bg-amber-400/8 border border-amber-400/15 px-2.5 py-1 rounded-full mb-3">
                  {item.category}
                </span>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.description}</p>
              </div>
              <div className="px-5 pb-5">
                <a href="/onboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors">
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
    {
      title: "Musicians",
      desc: "Turn your track into a full music video — synced to lyrics, with animated characters and cinematic visuals.",
      cta: "Start with WizVideo",
      href: "/music-video/create",
      icon: <Music2 className="w-6 h-6" />,
      accent: "text-violet-400",
      border: "border-violet-500/20",
    },
    {
      title: "Content Creators",
      desc: "Generate faceless YouTube videos, social shorts, and visual stories — no camera, no editing, no crew.",
      cta: "Start with WizScript",
      href: "/text-to-video",
      icon: <FileText className="w-6 h-6" />,
      accent: "text-cyan-400",
      border: "border-cyan-500/20",
    },
    {
      title: "Animators & Storytellers",
      desc: "Create Pixar-style animations, anime, and visual stories from a single prompt.",
      cta: "Create Animation",
      href: "/kids-video",
      icon: <Wand2 className="w-6 h-6" />,
      accent: "text-rose-400",
      border: "border-rose-500/20",
    },
    {
      title: "YouTubers & Brands",
      desc: "Produce professional video content at scale — intros, explainers, and branded visuals, all AI-generated.",
      cta: "Get Started Free",
      href: "/onboarding",
      icon: <TrendingUp className="w-6 h-6" />,
      accent: "text-amber-400",
      border: "border-amber-500/20",
    },
  ];
  return (
    <section className="bg-black py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-4">Built for creators</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            WIZ AI helps you create
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((a) => (
            <div key={a.title} className={`reveal flex flex-col gap-5 p-7 rounded-2xl border ${a.border} bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-300`}>
              <div className={`${a.accent}`}>{a.icon}</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{a.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{a.desc}</p>
              </div>
              <a href={a.href} className={`mt-auto inline-flex items-center gap-1.5 text-sm font-semibold ${a.accent} hover:opacity-80 transition-opacity`}>
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
    <section className="bg-[#050505] py-32 px-6 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto text-center reveal">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/5 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-amber-400">Start for free</span>
        </div>
        <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black tracking-tight text-white mb-6 leading-tight">
          Ready to start creating?
        </h2>
        <p className="text-white/40 text-lg mb-10 leading-relaxed">
          Start for free. Pay only when you render. No subscriptions, no hidden fees.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-base transition-all duration-200 shadow-[0_0_40px_rgba(251,191,36,0.25)] hover:shadow-[0_0_60px_rgba(251,191,36,0.4)] hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5" />
            Start Creating
          </a>
          <a href="/pricing" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors font-medium">
            View pricing <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <p className="mt-6 text-xs text-white/20">No credit card required. 2 free videos included.</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-black border-t border-white/[0.05] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.2rem] w-auto object-contain mb-5" />
            <p className="text-white/35 text-sm leading-relaxed mb-5 max-w-xs">
              WIZ AI — the premium creative intelligence platform. Create audio, images, video, shorts, animation, and text-to-video content instantly.
            </p>
            <a href="mailto:support@wiz-ai.io" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              support@wiz-ai.io
            </a>
          </div>
          {/* Products */}
          <div>
            <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-5">Products</h4>
            <div className="flex flex-col gap-3">
              {PRODUCTS.map((p) => (
                <a key={p.name} href={p.href} className={`text-sm ${p.accentClass} opacity-60 hover:opacity-100 transition-opacity font-medium`}>{p.name}</a>
              ))}
            </div>
          </div>
          {/* Platform */}
          <div>
            <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-5">Platform</h4>
            <div className="flex flex-col gap-3">
              {[
                { label: "WIZ AI Platform", href: "/" },
                { label: "WizSound", href: "/music-creator" },
                { label: "WizGenesis", href: "/dashboard" },
                { label: "WizLumina", href: "/dashboard" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="text-white/30 text-sm hover:text-white/60 transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          {/* Support / Legal */}
          <div>
            <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-5">Support</h4>
            <div className="flex flex-col gap-3 mb-8">
              <a href="/help" className="text-white/30 text-sm hover:text-white/60 transition-colors">Help Centre</a>
              <a href="mailto:support@wiz-ai.io" className="text-white/30 text-sm hover:text-white/60 transition-colors">Contact</a>
            </div>
            <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-5">Legal</h4>
            <div className="flex flex-col gap-3">
              <a href="/privacy" className="text-white/30 text-sm hover:text-white/60 transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-white/30 text-sm hover:text-white/60 transition-colors">Terms of Service</a>
              <a href="/refunds" className="text-white/30 text-sm hover:text-white/60 transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] pt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/20 mr-1">Secure payments via</span>
            {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((m) => (
              <span key={m} className="text-[11px] text-white/25 border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 rounded-md font-medium">{m}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/20">
            <p>© 2026 WIZ AI. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</a>
              <a href="/refunds" className="hover:text-white/50 transition-colors">Refund Policy</a>
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
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur-xl flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 mb-0.5">Continue where you left off</p>
          <p className="text-sm font-semibold text-white truncate">{resumeData.title || "Untitled project"}</p>
        </div>
        <a href={`/dashboard`} className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
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
    <div className="bg-black text-white min-h-screen overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <Nav />
      <main id="main-content">
        {/* 1. Hero */}
        <Hero />
        {/* 2. Choose what you want to create */}
        <ProductGrid />
        {/* 3. Welcome to WIZ AI — demo video */}
        <WelcomeSection />
        {/* 4. How it works */}
        <HowItWorks />
        {/* 5. Why WIZ AI */}
        <WhyWizAI />
        {/* 6. Showcase */}
        <Showcase />
        {/* 7. Built for creators */}
        <BuiltFor />
        {/* 8. Final CTA */}
        <FinalCTA />
      </main>
      <Footer />
      <ContinueProjectBanner />
    </div>
  );
}
