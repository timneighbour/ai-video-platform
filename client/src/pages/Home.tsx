import { useState, useEffect, useRef, useCallback } from "react";
import { triggerIntroReplay } from "@/lib/introReplay";
import WizProductGrid from "@/components/WizProductGrid";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
} from "@/components/WizProductEmblems";
import { NavLink } from "@/components/NavLink";
import { mp } from "@/lib/mixpanel";
import { useProjectResume } from "@/hooks/useProjectResume";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import HeroCinematicBg from "@/components/HeroCinematicBg";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Play, ArrowRight, Menu, X, ChevronDown,
  Music2, Image, Film, Zap, Wand2, FileText,
  Check, Star, Users, TrendingUp, Globe, Shield,
  Volume2, VolumeX, Eye, Layers, Rocket,
} from "lucide-react";

// ── Assets ───────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-v5_76ab5163.png`;
const WIZLUMINA_LOGO = `${CDN}/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp`;
const WIZGENESIS_LOGO = `${CDN}/wizgenesis-logo-final-jzVZtHAidTTQv5WxPAdJcz.webp`;
const WIZBOOST_LOGO = `${CDN}/module-wizboost_ce93c033.png`;
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-final_9f61f0de.png`;
const WIZANIMATE_LOGO = `${CDN}/wizanimate-logo-v2_e4d3081b.png`;
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
    desc: "Studio-quality songs, vocals, and soundtracks — produced in minutes, not weeks.",
    icon: <WizAudioEmblem size={28} />,
    href: "/music-creator",
  },
  {
    name: "WizImage",
    label: "Create Images",
    desc: "Publish-ready thumbnails, characters, and brand visuals — no designer required.",
    icon: <WizImageEmblem size={28} />,
    href: "/wiz-image",
  },
  {
    name: "WizVideo",
    label: "Create Videos",
    desc: "Complete cinematic music videos from any track — full narrative, full render.",
    icon: <WizVideoEmblem size={28} />,
    href: "/music-video/create",
  },
  {
    name: "WizShorts",
    label: "Create Shorts",
    desc: "High-performing Shorts, Reels, and TikToks — ready to post in seconds.",
    icon: <WizShortsEmblem size={28} />,
    href: "/wiz-shorts",
  },
  {
    name: "WizAnimate",
    label: "Create Animation",
    desc: "Cinematic 3D animation and stylised motion — from a single prompt.",
    icon: <WizAnimateEmblem size={28} />,
    href: "/kids-video",
  },
  {
    name: "WizScript",
    label: "Create from Text",
    desc: "Turn any written idea into scenes, storyboards, and a full AI video.",
    icon: <WizScriptEmblem size={28} />,
    href: "/text-to-video",
  },
];

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [enginesOpen, setEnginesOpen] = useState(false);
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
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[4.275rem] w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" />
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
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[520px] bg-[#070707]/99 backdrop-blur-2xl border border-[--color-gold]/[0.10] rounded-2xl shadow-[0_32px_100px_rgba(0,0,0,0.85)] p-4 z-50"
                  style={{ boxShadow: "0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(196,164,100,0.06) inset, 0 1px 0 rgba(196,164,100,0.12) inset" }}>
                  {/* Dropdown header */}
                  <div className="px-2 pb-3 mb-1 border-b border-[--color-gold]/[0.06]">
                    <p className="text-[9px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/50">WIZ AI Platform — Six Creation Tools</p>
                  </div>
                  {/* Two-column product grid */}
                  <div className="grid grid-cols-2 gap-1">
                    {PRODUCTS.map((p) => (
                      <a
                        key={p.name}
                        href={p.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.05] border border-transparent hover:border-[--color-gold]/[0.08] transition-all duration-200 group"
                      >
                        {/* Emblem */}
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-[--color-gold]/[0.06] group-hover:border-[--color-gold]/[0.15] transition-all duration-200">
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity scale-75">{p.icon}</span>
                        </div>
                        {/* Name + tagline */}
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white/80 group-hover:text-[--color-gold-light] transition-colors leading-tight">
                            {p.name}<sup className="text-[8px] font-bold ml-0.5 text-[--color-gold-dark]/60">™</sup>
                          </p>
                          <p className="text-[10px] text-white/30 mt-0.5 leading-tight truncate">{p.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                  {/* Footer CTA */}
                  <div className="mt-3 pt-3 border-t border-[--color-gold]/[0.06] flex items-center justify-between px-2">
                    <p className="text-[10px] text-white/20">50 free credits on sign-up</p>
                    <a href="/onboarding" className="text-[11px] font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors flex items-center gap-1">
                      Start Creating <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Wiz Engines dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setEnginesOpen(true)}
              onMouseLeave={() => setEnginesOpen(false)}
            >
              <button className="nav-link flex items-center gap-1">
                Wiz Engines <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${enginesOpen ? "rotate-180" : ""}`} />
              </button>
              {enginesOpen && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[640px] bg-[#070707]/99 backdrop-blur-2xl border border-[--color-gold]/[0.10] rounded-2xl p-5 z-50"
                  style={{ boxShadow: "0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(196,164,100,0.06) inset, 0 1px 0 rgba(196,164,100,0.12) inset" }}
                >
                  <div className="px-2 pb-3 mb-2 border-b border-[--color-gold]/[0.06]">
                    <p className="text-[9px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/50">WIZ AI — Proprietary Intelligence Stack</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { name: "WizSound", tagline: "Premium Audio Engine", desc: "Studio-grade mastering, spatial widening, and cinematic depth on every track.", href: "/products/wizsound", logo: WIZSOUND_LOGO },
                      { name: "WizLumina", tagline: "Visual Enhancement Engine", desc: "Cinematic colour grading, HDR tone mapping, and film-level polish on every frame.", href: "/products/wizlumina", logo: WIZLUMINA_LOGO },
                      { name: "WizGenesis", tagline: "Core Intelligence Engine", desc: "Orchestrates the entire creative workflow — storyboard to final render.", href: "/products/wizgenesis", logo: WIZGENESIS_LOGO },
                      { name: "WizBoost", tagline: "Output Optimisation Engine", desc: "Intelligent upscaling, compression, and platform-specific formatting.", href: "/products/wizboost", logo: WIZBOOST_LOGO },
                      { name: "WizCreate", tagline: "AI Creation Engine", desc: "Transforms audio or text into a complete cinematic storyboard in seconds.", href: "/products/wizcreate", logo: WIZCREATE_LOGO },
                      { name: "WizAnimate", tagline: "Animation Engine", desc: "Cinematic 3D animation and stylised motion from a single prompt.", href: "/products/wizanimate", logo: WIZANIMATE_LOGO },
                    ].map((eng) => (
                      <a
                        key={eng.name}
                        href={eng.href}
                        className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-[--color-gold]/[0.05] border border-transparent hover:border-[--color-gold]/[0.10] transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] border border-[--color-gold]/[0.08] group-hover:border-[--color-gold]/[0.22] transition-all duration-200 overflow-hidden">
                          <img src={eng.logo} alt={eng.name} className="w-7 h-7 object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-white/80 group-hover:text-[--color-gold-light] transition-colors leading-tight">
                            {eng.name}<sup className="text-[8px] font-bold ml-0.5 text-[--color-gold-dark]/60">™</sup>
                          </p>
                          <p className="text-[10px] font-semibold text-[--color-gold-dark]/60 mt-0.5 leading-tight">{eng.tagline}</p>
                          <p className="text-[10px] text-white/30 mt-1 leading-relaxed line-clamp-2">{eng.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[--color-gold]/[0.06] flex items-center justify-between px-2">
                    <p className="text-[10px] text-white/20">6 proprietary engines powering every creation</p>
                    <a href="/#wiz-engines" className="text-[11px] font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors flex items-center gap-1">
                      See how they work <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
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
                {/* Mobile: Wiz Engines */}
                <p className="text-[10px] text-[--color-gold-dark]/40 font-bold uppercase tracking-[0.2em] px-4 py-2 mt-1">Wiz Engines</p>
                {([
                  { name: "WizSound™", href: "/products/wizsound" },
                  { name: "WizLumina™", href: "/products/wizlumina" },
                  { name: "WizGenesis™", href: "/products/wizgenesis" },
                  { name: "WizBoost™", href: "/products/wizboost" },
                  { name: "WizCreate™", href: "/products/wizcreate" },
                  { name: "WizAnimate™", href: "/products/wizanimate" },
                ] as { name: string; href: string }[]).map((eng) => (
                  <a key={eng.name} href={eng.href} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>{eng.name}</a>
                ))}
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
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [demoOpen, setDemoOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#030303]"
      onMouseMove={handleMouseMove}
    >
      {/* Cinematic motion background — gold dust, waveform, bloom */}
      <HeroCinematicBg mouseX={mousePos.x} mouseY={mousePos.y} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-[96px] pb-24 w-full">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] backdrop-blur-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-[--color-gold-dark]">The Premium AI Creative Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.8rem,7.5vw,5.5rem)] font-black leading-[0.93] tracking-tight text-white mb-6">
            Your ideas deserve<br />
            <span className="metallic-gold">world-class production.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-[clamp(1rem,1.8vw,1.2rem)] text-[--color-silver]/65 leading-relaxed max-w-xl mb-8">
            WIZ AI turns any idea into professional audio, images, video, shorts, and animation — in minutes, not months.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <a
              href="/onboarding"
              className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base"
              onClick={() => { mp.heroCTAClicked?.(); mp.startCreatingClicked("hero"); }}
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
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {WHO_IMAGES.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-[#030303] object-cover" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-[--color-gold] text-[10px]">&#9733;</span>)}
                </div>
                <span className="text-[--color-silver-dark]/50 text-[11px] font-medium">Loved by creators worldwide</span>
              </div>
            </div>
            <div className="h-8 w-px bg-[--color-gold]/10 hidden sm:block" />
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[--color-silver]/55 font-semibold">Free</span> to start — no card needed
              </span>
              <span className="w-px h-3 bg-[--color-gold]/10" />
              <span className="flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="text-[--color-silver]/55 font-semibold">5 min</span> from idea to finished video
              </span>
              <span className="w-px h-3 bg-[--color-gold]/10 hidden sm:block" />
              <span className="hidden sm:flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="text-[--color-silver]/55 font-semibold">Full video</span> — not just clips
              </span>
            </div>
          </div>
        </div>
      </div>

      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ProductGrid replaced by WizProductGrid component
function ProductGrid() {
  return <WizProductGrid />;
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
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-5">See it in action</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-white leading-tight mb-6">
              From idea to finished video.<br />In under five minutes.
            </h2>
            <p className="text-[--color-silver-dark]/55 text-base leading-relaxed mb-8">
              Describe your idea. WIZ AI builds the storyboard, generates every scene, adds music, and delivers a complete video — ready to publish.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/onboarding"
                onClick={() => mp.startCreatingClicked("welcome_section")}
                className="btn-primary btn-sheen btn-sheen inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm"
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
            <div
              onClick={() => setDemoOpen(true)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDemoOpen(true)}
              role="button"
              tabIndex={0}
              className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-[--color-gold]/[0.08] bg-[#080808] hover:border-[--color-gold]/[0.2] transition-all duration-500 shadow-[0_16px_60px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(196,164,100,0.05)] focus:outline-none cursor-pointer"
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
                <button
                  onClick={(e) => { e.stopPropagation(); triggerIntroReplay(); }}
                  className="flex items-center gap-1 text-xs text-[--color-silver-dark]/40 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-[--color-gold]/[0.06] hover:text-[--color-gold]/70 hover:border-[--color-gold]/20 transition-all"
                  aria-label="Replay the WIZ AI intro"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Replay intro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ── WIZ Engines — Proprietary Intelligence Layer ────────────────────────────
function WizEngines() {
  const engines = [
    {
      name: "WizSound",
      tm: "™",
      tagline: "Premium Audio Engine",
      desc: "Enhances every audio track with richer depth, spatial clarity, and cinematic presence. From stereo widening to full mastering — your sound becomes studio-grade.",
      benefit: "Your audio sounds professionally mastered, not AI-generated.",
      logoUrl: WIZSOUND_LOGO,
      accentFrom: "oklch(0.78 0.11 75 / 0.15)",
      accentBorder: "oklch(0.78 0.11 75 / 0.12)",
      accentGlow: "oklch(0.78 0.11 75 / 0.06)",
    },
    {
      name: "WizLumina",
      tm: "™",
      tagline: "Visual Enhancement Engine",
      desc: "Applies cinematic colour grading, HDR tone mapping, and film-level polish to every frame. Your visuals go from raw AI output to cinema-ready.",
      benefit: "Every frame looks colour-graded by a professional colourist.",
      logoUrl: WIZLUMINA_LOGO,
      accentFrom: "oklch(0.82 0.01 260 / 0.15)",
      accentBorder: "oklch(0.82 0.01 260 / 0.12)",
      accentGlow: "oklch(0.82 0.01 260 / 0.06)",
    },
    {
      name: "WizGenesis",
      tm: "™",
      tagline: "Core Intelligence Engine",
      desc: "Orchestrates the entire creative workflow — from storyboard generation to scene composition to final render. The brain that makes everything work together.",
      benefit: "Your ideas become better, faster, and more consistent automatically.",
      logoUrl: WIZGENESIS_LOGO,
      accentFrom: "oklch(0.78 0.11 75 / 0.15)",
      accentBorder: "oklch(0.78 0.11 75 / 0.08)",
      accentGlow: "oklch(0.78 0.11 75 / 0.04)",
    },
    {
      name: "WizBoost",
      tm: "™",
      tagline: "Output Optimisation Engine",
      desc: "Analyses your final render and applies intelligent upscaling, compression optimisation, and platform-specific formatting. Your content arrives publish-ready for YouTube, TikTok, Instagram, and beyond.",
      benefit: "Every export is optimised for maximum quality on every platform.",
      logoUrl: WIZBOOST_LOGO,
      accentFrom: "oklch(0.78 0.11 75 / 0.12)",
      accentBorder: "oklch(0.78 0.11 75 / 0.10)",
      accentGlow: "oklch(0.78 0.11 75 / 0.05)",
    },
  ];

  const flow = [
    { step: "01", label: "You choose what to create", detail: "Music video, animation, short, image, or audio." },
    { step: "02", label: "WIZ AI generates the foundation", detail: "WizGenesis™ builds your storyboard, scenes, and structure." },
    { step: "03", label: "The WIZ Engines enhance and refine", detail: "WizSound™ and WizLumina™ elevate audio and visuals. WizBoost™ optimises the final output." },
    { step: "04", label: "You preview, build, and export", detail: "Review every scene, then render in HD or 4K — publish-ready for any platform." },
  ];

  return (
    <section id="wiz-engines" className="relative bg-[#040404] py-32 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.78 0.11 75 / 0.03) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-20 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Proprietary Intelligence</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-5">
            Powered by the <span className="metallic-gold">WIZ Engines</span>
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-2xl mx-auto leading-relaxed">
            Every creation on WIZ AI is enhanced by a stack of proprietary engines that make your output smarter, more polished, and more cinematic than ordinary AI tools.
          </p>
        </div>

        {/* Engine cards — 2×2 grid */}
        <div className="grid sm:grid-cols-2 gap-7 mb-24">
          {engines.map((eng) => (
            <div
              key={eng.name}
              className="reveal group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2"
              style={{
                background: `linear-gradient(160deg, ${eng.accentGlow} 0%, oklch(0.055 0.006 260) 50%, oklch(0.04 0.004 260) 100%)`,
                border: "1px solid rgba(196,164,100,0.20)",
                boxShadow: "0 1px 0 rgba(232,213,160,0.12) inset, 0 -1px 0 rgba(0,0,0,0.7) inset, 0 8px 48px rgba(0,0,0,0.65), 0 2px 0 rgba(196,164,100,0.06)",
              }}
            >
              {/* Full-card hover glow sweep */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${eng.accentFrom}, transparent 70%)` }}
              />
              {/* Top shimmer bar */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent 0%, ${eng.accentFrom} 50%, transparent 100%)` }}
              />
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />

              <div className="relative z-10 p-8 sm:p-10">
                {/* Top row: logo left, badge right */}
                <div className="flex items-start justify-between mb-7">
                  {/* Logo with glow halo — much larger */}
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-2xl blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-700"
                      style={{ background: eng.accentFrom, transform: 'scale(1.6)' }}
                    />
                    <div
                      className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(145deg, rgba(196,164,100,0.08) 0%, rgba(0,0,0,0.5) 100%)",
                        border: "1px solid rgba(196,164,100,0.18)",
                        boxShadow: "0 1px 0 rgba(232,213,160,0.12) inset, 0 6px 30px rgba(0,0,0,0.7)",
                      }}
                    >
                      <img
                        src={eng.logoUrl}
                        alt={eng.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_0_24px_rgba(196,164,100,0.5)] group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>

                  {/* Engine type badge */}
                  <div
                    className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.16em] uppercase mt-1"
                    style={{
                      background: `linear-gradient(135deg, ${eng.accentFrom}, rgba(0,0,0,0.4))`,
                      border: `1px solid ${eng.accentBorder}`,
                      color: 'rgba(232,213,160,0.65)',
                    }}
                  >
                    {eng.tagline}
                  </div>
                </div>

                {/* Product name — large and bold */}
                <h3 className="text-3xl sm:text-[2.6rem] font-black text-white tracking-tight leading-none mb-1 relative z-10">
                  {eng.name}<span className="text-[--color-gold-dark] text-xl align-super ml-0.5">{eng.tm}</span>
                </h3>

                {/* Tagline as subtitle */}
                <p className="text-[--color-gold-dark]/55 text-xs font-semibold tracking-[0.22em] uppercase mb-5 relative z-10">{eng.tagline}</p>

                {/* Description */}
                <p className="text-white/42 text-sm leading-relaxed mb-6 relative z-10 max-w-xs">{eng.desc}</p>

                {/* Benefit callout — styled highlight strip */}
                <div
                  className="relative z-10 flex items-start gap-3 px-4 py-3.5 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${eng.accentGlow}, rgba(0,0,0,0.35))`,
                    border: `1px solid ${eng.accentBorder}`,
                  }}
                >
                  <Check className="w-4 h-4 text-[--color-gold] mt-0.5 flex-shrink-0" />
                  <p className="text-white/72 text-sm font-medium leading-snug">{eng.benefit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works together */}
        <div className="reveal">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">How it all works together</p>
            <h3 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-black tracking-tight text-white">
              More than tools. An intelligent creative system.
            </h3>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {flow.map((f, i) => (
              <div key={f.step} className="reveal relative">
                {/* Connector */}
                {i < flow.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%_-_0.5rem)] w-full h-px" style={{ background: "linear-gradient(90deg, oklch(0.78 0.11 75 / 0.15), transparent)" }} />
                )}
                <div className="relative z-10">
                  <div className="text-[2.5rem] font-black leading-none metallic-gold opacity-25 mb-3">{f.step}</div>
                  <h4 className="text-base font-bold text-white mb-2">{f.label}</h4>
                  <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 reveal">
          <a
            href="/onboarding"
            onClick={() => mp.startCreatingClicked("how_it_works")}
            className="btn-primary btn-sheen btn-sheen inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Start Creating
          </a>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", title: "Describe your idea", desc: "Tell WIZ AI what you want to create — a music video, animation, cinematic short, or anything else." },
    { num: "02", title: "AI builds your storyboard", desc: "WizCreate™, our AI storyboard engine, generates a full visual storyboard with scenes, characters, and direction — in seconds." },
    { num: "03", title: "Preview every scene", desc: "Review your full video before committing to render. Edit, swap, or refine any scene you want." },
    { num: "04", title: "Render and publish", desc: "Export in HD or 4K with WizSound™ audio mastering and WizLumina™ visual enhancement built in. Download and share." },
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

// ── WizSound Demo ────────────────────────────────────────────────────────────
const AUDIO_TIERS = [
  {
    id: "normal",
    label: "Normal",
    desc: "Raw AI-generated audio. Functional, but unpolished.",
    bars: [0.3, 0.5, 0.4, 0.6, 0.3, 0.5, 0.4, 0.3, 0.5, 0.4, 0.6, 0.3, 0.4, 0.5, 0.3, 0.4],
    color: "rgba(120,120,130,0.6)",
    colorActive: "rgba(160,160,170,0.8)",
  },
  {
    id: "enhanced",
    label: "Enhanced",
    desc: "Noise-reduced, balanced, and broadcast-ready.",
    bars: [0.4, 0.6, 0.7, 0.8, 0.5, 0.7, 0.6, 0.5, 0.7, 0.6, 0.8, 0.5, 0.6, 0.7, 0.5, 0.6],
    color: "rgba(180,170,140,0.6)",
    colorActive: "rgba(196,164,100,0.85)",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    desc: "Full spatial mix with depth, warmth, and presence. Studio-grade.",
    bars: [0.5, 0.7, 0.85, 0.95, 0.7, 0.9, 0.8, 0.65, 0.85, 0.75, 0.95, 0.7, 0.8, 0.9, 0.65, 0.8],
    color: "rgba(180,150,50,0.5)",
    colorActive: "rgba(212,175,55,0.9)",
  },
];

function WizSoundDemo() {
  const [activeTier, setActiveTier] = useState(0);
  const tier = AUDIO_TIERS[activeTier];

  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WizSound™</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-4">
            Hear the difference
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-xl mx-auto">
            Three tiers of audio quality. Switch between them and hear the upgrade instantly.
          </p>
        </div>

        <div className="reveal">
          {/* Tier selector */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {AUDIO_TIERS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveTier(i)}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 border ${
                  activeTier === i
                    ? i === 2
                      ? "border-[--color-gold]/30 bg-[--color-gold]/[0.08] text-[--color-gold] shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                      : i === 1
                        ? "border-[--color-gold]/20 bg-[--color-gold]/[0.04] text-[--color-gold-dark]"
                        : "border-white/15 bg-white/[0.06] text-white/80"
                    : "border-white/[0.06] bg-transparent text-white/30 hover:text-white/50 hover:border-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Visualiser card */}
          <div className="glass-card p-8 max-w-2xl mx-auto">
            {/* Waveform bars */}
            <div className="flex items-end justify-center gap-1.5 h-24 mb-8">
              {tier.bars.map((h, i) => (
                <div
                  key={i}
                  className="w-3 rounded-full transition-all duration-500"
                  style={{
                    height: `${h * 100}%`,
                    background: tier.colorActive,
                    boxShadow: activeTier === 2 ? `0 0 8px ${tier.color}` : "none",
                    opacity: 0.5 + h * 0.5,
                  }}
                />
              ))}
            </div>

            {/* Tier info */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Volume2 className="w-5 h-5" style={{ color: tier.colorActive }} />
                <h3 className="text-xl font-bold text-white">{tier.label}</h3>
                {activeTier === 2 && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-[--color-gold]/20 bg-[--color-gold]/[0.06] text-[--color-gold-dark]">Recommended</span>
                )}
              </div>
              <p className="text-[--color-silver-dark]/50 text-sm leading-relaxed max-w-md mx-auto">{tier.desc}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <a href="/onboarding" className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm">
              <Sparkles className="w-4 h-4" />
              Start Creating
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── WizLumina Demo ───────────────────────────────────────────────────────────
function WizLuminaDemo() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
    const onTouchMove = (e: TouchEvent) => { if (isDragging.current) handleMove(e.touches[0].clientX); };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleMove]);

  return (
    <section className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WizLumina™</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-4">
            See the difference
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-xl mx-auto">
            Cinematic colour grading, HDR enhancement, and visual polish — applied to every frame automatically.
          </p>
        </div>

        <div className="reveal">
          {/* Before / After slider */}
          <div
            ref={containerRef}
            className="relative max-w-3xl mx-auto aspect-video rounded-2xl overflow-hidden border border-[--color-gold]/[0.08] cursor-ew-resize select-none"
            onMouseDown={(e) => { isDragging.current = true; handleMove(e.clientX); }}
            onTouchStart={(e) => { isDragging.current = true; handleMove(e.touches[0].clientX); }}
          >
            {/* "After" (full image, underneath) */}
            <div className="absolute inset-0">
              <img
                src={DEMO_POSTER}
                alt="After WizLumina enhancement"
                className="w-full h-full object-cover"
                style={{ filter: "contrast(1.15) saturate(1.2) brightness(1.05)" }}
              />
              {/* Warm cinematic overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.06), transparent 60%)" }} />
            </div>

            {/* "Before" (clipped) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src={DEMO_POSTER}
                alt="Before WizLumina"
                className="w-full h-full object-cover"
                style={{ filter: "saturate(0.5) brightness(0.75) contrast(0.9)" }}
              />
              {/* Desaturated overlay */}
              <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* Slider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10 pointer-events-none"
              style={{ left: `${sliderPos}%`, boxShadow: "0 0 12px rgba(255,255,255,0.3)" }}
            >
              {/* Handle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-xl">
                <Layers className="w-4 h-4 text-white/80" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 z-20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">Before</span>
            </div>
            <div className="absolute top-4 right-4 z-20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[--color-gold] bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[--color-gold]/20">After WizLumina</span>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {["Cinematic Grading", "HDR Enhancement", "Frame Sharpening", "Colour Correction"].map((f) => (
              <span key={f} className="text-[11px] font-semibold tracking-wide text-[--color-silver-dark]/40 border border-[--color-gold]/[0.08] bg-[--color-gold]/[0.02] px-4 py-2 rounded-full">{f}</span>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <a href="/onboarding" className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm">
              <Eye className="w-4 h-4" />
              Start Creating
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const quotes = [
    {
      text: "I made my first music video in 45 minutes. The quality blew my mind. My fans thought I hired a production team.",
      name: "Marcus T.",
      role: "Independent Musician",
      avatar: `${CDN}/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp`,
    },
    {
      text: "WIZ AI replaced a £3,000/month video editor for my YouTube channel. I now publish three times a week without breaking a sweat.",
      name: "Priya S.",
      role: "YouTube Creator — 180K subscribers",
      avatar: `${CDN}/whos-it-for-youtubers-hVpTL9NRQkqFJoeEzGZYpN.webp`,
    },
    {
      text: "The character consistency is genuinely impressive. My animated series looks like a real studio production. Nothing else comes close.",
      name: "Daniel K.",
      role: "Animator & Storyteller",
      avatar: `${CDN}/whos-it-for-ai-creators-iNKM9VvLTuKBigHPwZC3HS.webp`,
    },
    {
      text: "I used WizScript to turn a blog post into a fully produced video in under 10 minutes. The ROI is extraordinary.",
      name: "Sophie L.",
      role: "Brand Content Director",
      avatar: `${CDN}/whos-it-for-kids-creators-V7CLZTheKBJ8dstLuLDWem.webp`,
    },
  ];
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Creator proof</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            Real creators. Real results.
          </h2>
          <p className="text-[--color-silver-dark]/45 text-base mt-4 max-w-xl mx-auto">
            From independent musicians to brand teams — WIZ AI is changing how professional content gets made.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {quotes.map((q) => (
            <div key={q.name} className="reveal glass-card p-6 flex flex-col gap-5 relative">
              {/* Gold quote mark */}
              <span className="absolute top-5 right-5 text-[--color-gold]/[0.12] text-5xl font-serif leading-none select-none">&ldquo;</span>
              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-[--color-gold] text-sm">&#9733;</span>
                ))}
              </div>
              {/* Quote */}
              <p className="text-[--color-silver]/65 text-sm leading-relaxed flex-1">{q.text}</p>
              {/* Attribution */}
              <div className="flex items-center gap-3 pt-3 border-t border-[--color-gold]/[0.06]">
                <img
                  src={q.avatar}
                  alt={q.name}
                  className="w-9 h-9 rounded-full object-cover border border-[--color-gold]/[0.15] flex-shrink-0"
                />
                <div>
                  <p className="text-white text-xs font-semibold">{q.name}</p>
                  <p className="text-[--color-silver-dark]/40 text-[11px]">{q.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Payment reassurance strip */}
        <div className="mt-14 reveal flex flex-wrap items-center justify-center gap-8 text-xs text-[--color-silver-dark]/35">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[--color-gold]/40" />
            Secure payment via Stripe
          </span>
          <span className="w-px h-4 bg-[--color-gold]/10 hidden sm:block" />
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[--color-gold]/40" />
            No credit card to start creating
          </span>
          <span className="w-px h-4 bg-[--color-gold]/10 hidden sm:block" />
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[--color-gold]/40" />
            Cancel anytime — no lock-in
          </span>
          <span className="w-px h-4 bg-[--color-gold]/10 hidden sm:block" />
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[--color-gold]/40" />
            Used by creators in 40+ countries
          </span>
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
                  Start Creating <ArrowRight className="w-3 h-3" />
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.72 0.14 70), transparent 70%)" }} />
      <div className="relative z-10 max-w-3xl mx-auto text-center reveal">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[--color-gold]" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">No credit card required</span>
        </div>
        <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black tracking-tight text-white mb-6 leading-tight">
          Your next creation<br />
          <span className="metallic-gold">starts here.</span>
        </h2>
        <p className="text-[--color-silver-dark]/50 text-lg mb-10 leading-relaxed">
          Join thousands of creators producing professional audio, video, and animation with WIZ AI. Create free. Pay only when you render.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/onboarding"
            className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-base"
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
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.6rem] w-auto object-contain mb-5 drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" />
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
  useEffect(() => { mp.homepageViewed(); }, []);
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
        <WizEngines />
        <HowItWorks />
        <WizSoundDemo />
        <WizLuminaDemo />
        <WhyWizAI />
        <Testimonials />
        <Showcase />
        <BuiltFor />
        <FinalCTA />
      </main>
      <Footer />
      <ContinueProjectBanner />
    </div>
  );
}
