import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NavLink } from "@/components/NavLink";
import { mp } from "@/lib/mixpanel";
import { useProjectResume } from "@/hooks/useProjectResume";
import { Button } from "@/components/ui/button";
import HeroCinematicBg from "@/components/HeroCinematicBg";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { HowWizVidWorks } from "@/components/HowWizVidWorks";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Music, Zap, Star, Play, Check, ArrowRight,
  Menu, X, Film, Wand2, Users, ChevronRight,
  Music2, Bot, Video, TrendingUp, Instagram
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-final_9f61f0de.png`;
const WIZLUMINA_ORB = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-orb-v2_fc002bef.png";
const WIZLUMINA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp";
const WIZGENESIS_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizgenesis-logo-final-jzVZtHAidTTQv5WxPAdJcz.webp";
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-v5_76ab5163.png`;
const WIZPILOT_LOGO = `${CDN}/wizpilot-logo-final_22d02597.png`;
// Official WIZ AI logo — transparent background, violet glow
const WIZAI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";
const WIZAI_LOGO_BRAND = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";
const WIZAI_LOGO_FOOTER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";
const WIZAI_LOGO_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";
const WIZAI_LOGO_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-animation-v3_85969477.mp4";
const HERO_VIDEOS = [
  `${CDN}/hero-nightclub-web_3a88ea3e.mp4`,
  `${CDN}/hero-abstract-web_ed099aea.mp4`,
  `${CDN}/hero-concert-web_2f9db1a6.mp4`,
];
const SHOWCASE_IMAGES = [
  { src: `${CDN}/wizbeat-artist-band_04b2adbf.jpg`, label: "WizVideo" },
  { src: `${CDN}/wizbeat-animated-dog_8d12b77c.jpg`, label: "WizAnimate" },
  { src: `${CDN}/wizbeat-animated-cat_81ffcf80.jpg`, label: "WizAnimate" },
  { src: `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`, label: "WizShorts" },
  { src: `${CDN}/wizbeat-hip-hop_247e7ea6.jpg`, label: "WizVideo" },
];
// ── How It Works step images ────────────────────────────────────────────────
const STEP_IMAGES = {
  upload: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step1-upload-audio-byRxxURESoxMZYpCB7FKpm.webp",
  styles: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step2-style-collage-P6HWeTbd9g6UsLFLRWYJEi.webp",
  render: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp",
};

// ── Who It's For images ──────────────────────────────────────────────────────
const WHO_IMAGES = {
  musicians: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp",
  youtubers: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-youtubers-hVpTL9NRQkqFJoeEzGZYpN.webp",
  aiCreators: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-ai-creators-iNKM9VvLTuKBigHPwZC3HS.webp",
  kidsCreators: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-kids-creators-V7CLZTheKBJ8dstLuLDWem.webp",
};

const STYLE_IMAGES = [
  { label: "Cinematic", img: `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq-thumb_855006a3.webp` },
  { label: "Anime", img: `${CDN}/style-anime-bCLhyWeYo6mek5pWMnEUV7-thumb_2704d4cf.webp` },
  { label: "Pixar 3D", img: `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV-thumb_59429596.webp` },
  { label: "Documentary", img: `${CDN}/style-documentary-nyjoHJnTHZU2hdjABnnjBm-thumb_3587102a.webp` },
];

// ── Scroll reveal hook ──────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Nav ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
];

const PRODUCT_LINKS = [
  { href: "/music-creator", label: "WizAudio", desc: "Create songs, vocals and full audio tracks", colour: "text-emerald-400" },
  { href: "/wiz-image", label: "WizImage", desc: "AI images, characters, artwork and visuals", colour: "text-amber-400" },
  { href: "/music-video/create", label: "WizVideo", desc: "Full cinematic AI videos from any idea", colour: "text-violet-400" },
  { href: "/wiz-shorts", label: "WizShorts", desc: "Short-form content for Shorts, Reels and TikTok", colour: "text-cyan-400" },
  { href: "/kids-video", label: "WizAnimate", desc: "Animated stories, kids content and stylised motion", colour: "text-rose-400" },
  { href: "/text-to-video", label: "WizScript", desc: "Turn text prompts into full AI videos", colour: "text-orange-400" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0a0a0a]/96 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center justify-between">
          {/* Logo */}
          <NavLink href="/" className="flex items-center flex-shrink-0 hover:opacity-85 transition-opacity duration-200">
            <img
              src={WIZAI_LOGO}
              alt="WIZ AI"
              width={320}
              height={180}
              className="h-[6.5rem] w-auto object-contain drop-shadow-[0_0_16px_rgba(139,92,246,0.55)]"
            />
          </NavLink>
          {/* Desktop nav links — hardened native anchors */}
          <div className="hidden md:flex items-center gap-0.5" style={{ pointerEvents: "auto", position: "relative", zIndex: 51 }}>
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="text-[13px] text-white/60 hover:text-white/95 transition-colors duration-150 font-medium px-3.5 py-2 rounded-lg hover:bg-white/[0.05]" style={{ pointerEvents: "auto" }}>{label}</a>
            ))}
            {/* Products dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white/95 transition-colors duration-150 font-medium px-3.5 py-2 rounded-lg hover:bg-white/[0.05]">
                Products <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${productsOpen ? "rotate-90" : ""}`} />
              </button>
              {productsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-[#0d0d0d]/98 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl p-2 z-50">
                  {PRODUCT_LINKS.map(({ href, label, desc, colour }) => (
                    <a
                      key={href}
                      href={href}
                      className="flex flex-col px-3.5 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-150 group"
                    >
                      <span className={`text-[13px] font-semibold ${colour} group-hover:opacity-100 opacity-90`}>{label}</span>
                      <span className="text-[11px] text-white/40 mt-0.5">{desc}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Right: Auth + mobile toggle */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Button className="btn-primary text-sm px-5 rounded-xl h-9" asChild>
                <NavLink href="/dashboard" className="flex items-center"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Dashboard</NavLink>
              </Button>
            ) : (
              <>
                <a href={getLoginUrl()} className="hidden sm:block text-[13px] text-white/55 hover:text-white/90 transition-colors duration-150 font-medium px-3 py-2">Sign in</a>
                <Button className="btn-primary text-sm px-5 rounded-xl h-9" asChild>
                  <NavLink href="/onboarding">Start Free</NavLink>
                </Button>
              </>
            )}
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/[0.07] transition-colors duration-150 ml-1"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
            </button>
          </div>
        </div>
      </nav>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div
            className="absolute top-[60px] left-0 right-0 bg-[#0d0d0d]/98 backdrop-blur-2xl border-b border-white/[0.07] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <NavLink
                  key={href}
                  href={href}
                  className="text-[15px] text-white/70 hover:text-white font-medium px-4 py-3 rounded-xl hover:bg-white/[0.06] transition-colors duration-150"
                  onClick={() => setMobileOpen(false)}
                >{label}</NavLink>
              ))}
              {/* Products section in mobile */}
              <div className="mt-2 pt-2 border-t border-white/[0.05]">
                <p className="text-[11px] text-white/30 font-semibold uppercase tracking-widest px-4 py-1.5">Products</p>
                {PRODUCT_LINKS.map(({ href, label, colour }) => (
                  <a
                    key={href}
                    href={href}
                    className="text-[14px] font-medium px-4 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors duration-150 block"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={colour}>{label}</span>
                  </a>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.07] flex flex-col gap-2">
                {isAuthenticated ? (
                  <NavLink href="/dashboard" className="btn-primary flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold" onClick={() => setMobileOpen(false)}>
                    <Sparkles className="w-4 h-4" />Dashboard
                  </NavLink>
                ) : (
                  <>
                    <a href={getLoginUrl()} className="text-center text-sm text-white/60 hover:text-white py-2.5 transition-colors">Sign in</a>
                    <NavLink href="/onboarding" className="btn-primary flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold" onClick={() => setMobileOpen(false)}>Start Free</NavLink>
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

// ── Hero ─────────────────────────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

/* ── Hero product preview panel ──────────────────────────────────────── */
const HERO_PREVIEW_PHASES = [
  {
    id: "prompt",
    label: "Describe your idea",
    badge: "Step 1",
    badgeColor: "border-violet-500/40 bg-violet-500/15 text-violet-300",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step1-upload-audio-byRxxURESoxMZYpCB7FKpm.webp",
    prompt: '"Walking through fire, cinematic, epic"',
  },
  {
    id: "storyboard",
    label: "AI builds storyboard",
    badge: "Generating…",
    badgeColor: "border-blue-500/40 bg-blue-500/15 text-blue-300",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step2-style-collage-P6HWeTbd9g6UsLFLRWYJEi.webp",
    prompt: null,
  },
  {
    id: "scenes",
    label: "Preview every scene",
    badge: "Preview",
    badgeColor: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp",
    prompt: null,
  },
  {
    id: "output",
    label: "Render final video",
    badge: "✓ Ready",
    badgeColor: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp",
    prompt: null,
  },
];

const CATEGORY_LABELS = ["MUSIC VIDEOS", "CINEMATIC FILMS", "AI ANIMATION"];

function HeroProductPreview() {
  const [phase, setPhase] = useState(0);
  const [catIdx, setCatIdx] = useState(0);
  const [catVisible, setCatVisible] = useState(true);

  // Cycle through product phases every 2.2s
  useEffect(() => {
    const t = setInterval(() => {
      setPhase((p) => (p + 1) % HERO_PREVIEW_PHASES.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // Cycle category labels every 1.5s with fade
  useEffect(() => {
    const t = setInterval(() => {
      setCatVisible(false);
      setTimeout(() => {
        setCatIdx((i) => (i + 1) % CATEGORY_LABELS.length);
        setCatVisible(true);
      }, 220);
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const current = HERO_PREVIEW_PHASES[phase];

  return (
    <div className="relative w-full max-w-[520px] mx-auto lg:mx-0">

      {/* ── WizCreate™ badge — top right, above the mockup ── */}
      <div className="flex justify-end mb-2 pr-1">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border"
          style={{
            background: "rgba(109,40,217,0.15)",
            borderColor: "rgba(139,92,246,0.35)",
            boxShadow: "0 0 18px rgba(139,92,246,0.2)",
          }}
        >
          {/* Wiz icon — stylised W spark */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 3L5.5 13L8 7L10.5 13L14 3" stroke="url(#wc-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="wc-grad" x1="2" y1="3" x2="14" y2="13" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#e879f9" />
              </linearGradient>
            </defs>
          </svg>
          <span
            className="font-black tracking-[0.12em] text-xs"
            style={{
              background: "linear-gradient(90deg, #c4b5fd 0%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 6px rgba(167,139,250,0.7))",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            WizCreate™
          </span>
          <span className="text-[9px] text-white/40 font-medium tracking-wide">AI Studio</span>
        </div>
      </div>

      {/* Outer glow ring */}
      <div
        className="absolute -inset-3 rounded-3xl pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.22) 0%, transparent 70%)",
          animation: "heroPulse 3s ease-in-out infinite alternate",
        }}
      />

      {/* Browser chrome frame */}
      <div className="relative rounded-2xl overflow-hidden border border-white/12 shadow-[0_0_60px_rgba(109,40,217,0.25)]" style={{ background: "rgba(8,4,20,0.92)" }}>
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8" style={{ background: "rgba(12,6,28,0.95)" }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 mx-3 h-6 rounded-md flex items-center px-3" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="text-white/35 text-xs font-mono">wizvid.ai/create</span>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400/70 text-[10px] font-mono">LIVE</span>
          </div>
        </div>

        {/* Main image area */}
        <div className="relative" style={{ aspectRatio: "16/10" }}>
          {HERO_PREVIEW_PHASES.map((p, i) => (
            <img
              key={p.id}
              src={p.image}
              alt={p.label}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none"
              style={{ opacity: i === phase ? 1 : 0 }}
            />
          ))}

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 100%)" }} />

          {/* Category cycling text — top centre */}
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div
              className="px-4 py-1.5 rounded-full border border-white/15 bg-black/50 backdrop-blur-sm"
              style={{
                transition: "opacity 0.22s ease",
                opacity: catVisible ? 1 : 0,
              }}
            >
              <span
                className="font-black tracking-[0.22em] text-sm"
                style={{
                  background: "linear-gradient(90deg, #c4b5fd, #e879f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 8px rgba(167,139,250,0.7))",
                }}
              >
                {CATEGORY_LABELS[catIdx]}
              </span>
            </div>
          </div>

          {/* Step badge — top right */}
          <div className="absolute top-4 right-4">
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold font-mono tracking-wide ${current.badgeColor}`}>
              {current.badge}
            </span>
          </div>

          {/* Prompt box (step 1 only) */}
          {current.prompt && (
            <div className="absolute bottom-14 left-4 right-4">
              <div className="rounded-xl border border-white/10 bg-black/70 backdrop-blur-sm px-4 py-2.5">
                <p className="text-orange-300 font-mono text-sm">{current.prompt}</p>
              </div>
            </div>
          )}

          {/* Step label — bottom */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">{current.label}</span>
            {/* Step dots */}
            <div className="flex gap-1.5">
              {HERO_PREVIEW_PHASES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhase(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === phase ? "w-5 h-2 bg-violet-400" : "w-2 h-2 bg-white/25 hover:bg-white/50"
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/8">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${((phase + 1) / HERO_PREVIEW_PHASES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── 4-step progress strip ── */}
      <div className="mt-3 flex items-center justify-between px-1">
        {[
          { label: "Describe your idea", step: 0 },
          { label: "AI builds storyboard", step: 1 },
          { label: "Preview every scene", step: 2 },
          { label: "Render final video", step: 3 },
        ].map(({ label, step }, i) => (
          <button
            key={label}
            onClick={() => setPhase(step)}
            className="flex flex-col items-center gap-1 group cursor-pointer"
            style={{ flex: 1 }}
          >
            {/* connector line */}
            {i > 0 && (
              <div className="absolute" style={{ display: 'none' }} />
            )}
            <span
              className="text-[9px] font-semibold tracking-wide text-center leading-tight transition-colors duration-200"
              style={{
                color: phase === step ? "rgba(167,139,250,1)" : "rgba(255,255,255,0.3)",
                textShadow: phase === step ? "0 0 8px rgba(167,139,250,0.6)" : "none",
              }}
            >
              {label}
            </span>
            <div
              className="h-0.5 w-full rounded-full transition-all duration-300"
              style={{
                background: phase >= step
                  ? "linear-gradient(90deg, #8b5cf6, #d946ef)"
                  : "rgba(255,255,255,0.1)",
              }}
            />
          </button>
        ))}
      </div>

      {/* Keyframe for outer glow pulse */}
      <style>{`
        @keyframes heroPulse {
          0%   { opacity: 0.6; transform: scale(0.98); }
          100% { opacity: 1;   transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [demoOpen, setDemoOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* ── Full-bleed cinematic background ── */}
      <HeroCinematicBg mouseX={mousePos.x} mouseY={mousePos.y} />

      {/* ── Dark scrim: left-side text readability ── */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.15) 65%, transparent 100%)",
        }}
      />

      {/* ── Hero layout: two-column — text left, video player right ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 pt-28 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-10 min-h-[85vh]">

          {/* ── LEFT COLUMN: Copy + CTAs + Trust ── */}
          <div className="relative z-10 flex flex-col items-start text-left flex-1">
            {/* Extra dark backdrop behind text for guaranteed readability */}
            <div
              className="absolute -inset-x-4 -inset-y-6 rounded-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse 90% 100% at 20% 50%, rgba(0,0,0,0.55) 0%, transparent 80%)" }}
            />

            {/* Eyebrow badge */}
            <div className="relative z-10 mb-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300 text-xs font-mono tracking-[0.18em] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Premium Creative Intelligence
            </div>

            {/* Headline */}
            <h1
              className="relative z-10 font-extrabold leading-[1.05] tracking-tight text-white mb-5 drop-shadow-[0_2px_40px_rgba(0,0,0,0.95)]"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
            >
              Create anything.{" "}
              <span
                className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent"
                style={{ textShadow: "none" }}
              >
                Instantly.
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-white/70 max-w-xl mb-6 leading-relaxed font-medium drop-shadow-[0_1px_12px_rgba(0,0,0,0.9)]"
              style={{ fontSize: "clamp(0.95rem, 2vw, 1.15rem)" }}
            >
              WIZ AI is the premium creative intelligence platform for audio, images, video, shorts, animation, and text-to-video workflows.
            </p>

            {/* Microcopy */}
            <p className="relative z-10 text-white/50 text-sm mb-7 font-medium">
              No editing experience needed. Build faster with AI.
            </p>

            {/* CTA row */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <a
                id="hero-cta"
                href={isAuthenticated ? "/music-video/create" : "/onboarding"}
                className="inline-flex items-center gap-3 btn-primary px-9 py-4 rounded-2xl font-bold transition-all duration-300"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", cursor: "pointer", pointerEvents: "auto", position: "relative", zIndex: 10 }}
                onClick={() => mp.heroCTAClicked()}
              >
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                {isAuthenticated ? "Start Creating" : "Start Creating"}
              </a>
              <button
                onClick={() => setDemoOpen(true)}
                className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all duration-300"
                style={{ fontSize: "clamp(0.9rem, 1.6vw, 1rem)" }}
              >
                <span className="relative w-6 h-6 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" style={{ animationDuration: "2s" }} />
                  <span className="absolute inset-0 rounded-full bg-white/15 border border-white/30 flex items-center justify-center pointer-events-none">
                    <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                  </span>
                </span>
                Watch Demo
              </button>
              <a
                href="#products"
                className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white/80 transition-colors font-medium"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Explore Products
              </a>
            </div>

            {/* Trust line */}
            <p className="relative z-10 flex items-center gap-1.5 text-sm text-white/40 font-medium mb-6">
              <Zap className="w-3 h-3 text-green-400/70 flex-shrink-0" />
              2 free videos included. No credit card required.
            </p>

            {/* Trust strip — avatars + stats */}
            <div className="relative z-10 flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    WHO_IMAGES.musicians,
                    WHO_IMAGES.youtubers,
                    WHO_IMAGES.aiCreators,
                    WHO_IMAGES.kidsCreators,
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-black object-cover" />
                  ))}
                </div>
                <span className="text-white/50 text-xs font-medium">Trusted by creators, musicians, and YouTubers</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-white font-bold text-sm">5 min</p>
                  <p className="text-white/35 text-[10px]">avg. creation</p>
                </div>
                <div className="h-4 w-px bg-white/15" />
                <div className="text-center">
                  <p className="text-white font-bold text-sm">Full video</p>
                  <p className="text-white/35 text-[10px]">not just clips</p>
                </div>
                <div className="h-4 w-px bg-white/15" />
                <div className="text-center">
                  <p className="text-white font-bold text-sm">Free to create</p>
                  <p className="text-white/35 text-[10px]">pay to render only</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Video player mockup — vertically centered with content ── */}
          <div className="hidden lg:flex lg:items-center lg:w-[440px] lg:flex-shrink-0">
            <HeroProductPreview />
          </div>
        </div>

        {/* Mobile: product preview below CTAs */}
        <div className="lg:hidden mt-10 px-4">
          <HeroProductPreview />
        </div>
      </div>

      {/* ── Scroll indicator (bottom of hero, no overlap) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
        <button
          onClick={() => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label="Scroll to content"
          className="flex flex-col items-center gap-1.5 opacity-50 hover:opacity-80 transition-opacity duration-300 cursor-pointer"
        >
          <span className="text-white/50 text-[10px] font-medium tracking-widest uppercase">Explore</span>
          <svg className="w-4 h-4 text-white/50 animate-bounce" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
      </div>

      {/* Demo Video Modal */}
      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

    </section>
  );
}

// ── WIZ AI Product Suite ─────────────────────────────────────────────────────
const PRODUCT_CARDS = [
  {
    name: "WizAudio",
    label: "Create Audio",
    desc: "Create songs, vocals and full audio tracks in minutes.",
    usps: ["Fast AI music creation", "No production skills required", "Built to feed directly into video workflows"],
    cta: "Start with WizAudio",
    href: "/music-creator",
    colour: "from-emerald-500/20 to-emerald-900/10",
    border: "border-emerald-500/20 hover:border-emerald-400/40",
    accent: "text-emerald-400",
    icon: <Music2 className="w-6 h-6" />,
  },
  {
    name: "WizImage",
    label: "Create Images",
    desc: "Generate characters, artwork, thumbnails, visuals and branded images with AI.",
    usps: ["Great for thumbnails, concept art and characters", "Fast image generation", "Ideal for creators and brand visuals"],
    cta: "Start with WizImage",
    href: "/wiz-image",
    colour: "from-amber-500/20 to-amber-900/10",
    border: "border-amber-500/20 hover:border-amber-400/40",
    accent: "text-amber-400",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    name: "WizVideo",
    label: "Create Videos",
    desc: "Turn songs and ideas into cinematic full-length AI videos.",
    usps: ["Full videos, not just clips", "Storyboard and scenes generated automatically", "Preview before render"],
    cta: "Start with WizVideo",
    href: "/music-video/create",
    colour: "from-violet-500/20 to-violet-900/10",
    border: "border-violet-500/20 hover:border-violet-400/40",
    accent: "text-violet-400",
    icon: <Film className="w-6 h-6" />,
  },
  {
    name: "WizShorts",
    label: "Create Shorts",
    desc: "Turn text and images into scroll-stopping short-form videos for Shorts, Reels and TikTok.",
    usps: ["Built for short-form growth", "Fast social-ready output", "Great for hooks, promos and creator content"],
    cta: "Start with WizShorts",
    href: "/wiz-shorts",
    colour: "from-cyan-500/20 to-cyan-900/10",
    border: "border-cyan-500/20 hover:border-cyan-400/40",
    accent: "text-cyan-400",
    icon: <Instagram className="w-6 h-6" />,
  },
  {
    name: "WizAnimate",
    label: "Create Animation",
    desc: "Create animated stories, stylised videos and kids content with AI.",
    usps: ["Ideal for storytelling and family content", "Strong stylised output", "Great for YouTube and branded animation"],
    cta: "Start with WizAnimate",
    href: "/kids-video",
    colour: "from-rose-500/20 to-rose-900/10",
    border: "border-rose-500/20 hover:border-rose-400/40",
    accent: "text-rose-400",
    icon: <Wand2 className="w-6 h-6" />,
  },
  {
    name: "WizScript",
    label: "Create from Text",
    desc: "Turn written prompts into visual scenes and full AI videos.",
    usps: ["Direct text-to-video workflow", "Great for prototyping and ideation", "Fast from concept to output"],
    cta: "Start with WizScript",
    href: "/text-to-video",
    colour: "from-orange-500/20 to-orange-900/10",
    border: "border-orange-500/20 hover:border-orange-400/40",
    accent: "text-orange-400",
    icon: <Bot className="w-6 h-6" />,
  },
];

function ProductSuite() {
  return (
    <section id="products" className="bg-[#0a0a0a] border-t border-white/6 py-24 px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-amber-400/90 mb-3">WIZ AI Product Suite</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Choose what you want to create</h2>
          <p className="text-white/45 mt-4 max-w-2xl mx-auto text-base leading-relaxed">Six premium creative tools — one unified platform. No editing experience required.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCT_CARDS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              className={`group relative rounded-2xl border ${p.border} bg-gradient-to-br ${p.colour} backdrop-blur-sm p-7 transition-all duration-300 hover:scale-[1.025] hover:shadow-2xl reveal overflow-hidden`}
            >
              {/* Subtle glow on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${p.colour} blur-xl`} />
              <div className="relative z-10">
                {/* Badge + Icon row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`${p.accent} p-3 rounded-xl bg-white/[0.06] border border-white/[0.08] shadow-lg`}>{p.icon}</div>
                    <div>
                      <h3 className={`text-lg font-bold tracking-tight ${p.accent}`}>{p.name}</h3>
                      <p className="text-[10px] text-white/35 font-semibold uppercase tracking-[0.2em]">{p.label}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${p.accent} bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full`}>Premium</span>
                </div>
                {/* Description */}
                <p className="text-sm text-white/55 leading-relaxed mb-5">{p.desc}</p>
                {/* USPs */}
                <ul className="space-y-2.5 mb-7">
                  {p.usps.map((u) => (
                    <li key={u} className="flex items-start gap-2.5 text-xs text-white/50">
                      <Check className={`w-3.5 h-3.5 mt-0.5 ${p.accent} opacity-60 flex-shrink-0`} />
                      {u}
                    </li>
                  ))}
                </ul>
                {/* CTA */}
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${p.accent} group-hover:gap-3 transition-all duration-300`}>
                  {p.cta} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Try an Example ─────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  { label: "Hip-Hop", prompt: "A cinematic hip-hop music video — artist performing on a rooftop at golden hour, city skyline, slow-motion crowd shots, neon lights", genre: "Hip-Hop" },
  { label: "Rock", prompt: "An epic rock music video — electric guitar solo on a stormy mountain peak, lightning strikes, dramatic wide shots, dark cinematic atmosphere", genre: "Rock" },
  { label: "R&B", prompt: "A moody R&B music video — artist in a rain-soaked city street at midnight, neon reflections, intimate close-ups, cinematic slow motion", genre: "R&B" },
  { label: "Pop", prompt: "A vibrant pop music video — colourful dance sequences, confetti, bright studio lights, high-energy choreography, fun and upbeat", genre: "Pop" },
  { label: "Cinematic", prompt: "A sweeping cinematic orchestral video — aerial shots of mountain ranges at sunrise, dramatic clouds, epic scale, emotional storytelling", genre: "Cinematic" },
];

// ── Continue Project Banner (Production Audit Item 3) ─────────────────────
function ContinueProjectBanner() {
  const { resumeData, showResume, dismissResume, clearAndDismiss } = useProjectResume();
  if (!showResume || !resumeData) return null;

  const timeSince = Date.now() - resumeData.lastSavedAt;
  const minutesAgo = Math.floor(timeSince / 60000);
  const timeLabel = minutesAgo < 1 ? "just now" : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;

  const resumeHref = resumeData.jobId
    ? `/music-video/create?jobId=${resumeData.jobId}`
    : "/music-video/create";

  return (
    <section className="bg-gradient-to-r from-violet-950/40 via-[#0f0f0f] to-violet-950/40 border-y border-violet-500/20 py-4 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div>
            <p className="text-white font-semibold text-sm">
              Continue your last video
              {resumeData.title && <span className="text-violet-300 ml-1">— {resumeData.title}</span>}
            </p>
            <p className="text-white/40 text-xs">
              {resumeData.selectedStyle} style · {resumeData.step} step · saved {timeLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NavLink
            href={resumeHref}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Continue
          </NavLink>
          <button
            onClick={clearAndDismiss}
            className="text-white/40 hover:text-white/70 text-xs px-3 py-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Trust Signals — large gleaming animated benefit lines ────────────────────
const BENEFIT_LINES = [
  { text: "No editing experience needed", delay: 0 },
  { text: "Preview every scene first", delay: 120 },
  { text: "Full video render in minutes", delay: 240 },
];

function TrustSignals() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="bg-[#080808] border-t border-white/6 py-20 px-6 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 md:divide-x md:divide-white/8">
        {BENEFIT_LINES.map(({ text, delay }) => (
          <div
            key={text}
            className="flex-1 flex flex-col items-center text-center px-8 py-2"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
            }}
          >
            {/* Gleaming text */}
            <span
              className="font-extrabold tracking-tight leading-tight"
              style={{
                fontSize: "clamp(2.2rem, 4.2vw, 3rem)",
                background: "linear-gradient(135deg, #FFD700 0%, #ffffff 25%, #c4b5fd 50%, #ffffff 75%, #FFD700 100%)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: visible ? `shimmer 3s ease-in-out ${delay}ms infinite alternate` : "none",
                textShadow: "none",
              }}
            >
              {text}
            </span>
            {/* Sparkle dot */}
            <span
              className="mt-3 w-2.5 h-2.5 rounded-full bg-violet-400"
              style={{
                boxShadow: "0 0 16px 4px rgba(167,139,250,0.9), 0 0 32px 8px rgba(139,92,246,0.5)",
                animation: visible ? `pulse 2s ease-in-out ${delay}ms infinite` : "none",
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
}

// ── How It Works Strip (4-step, directly under hero) ───────────────────────
function HowItWorksStrip() {
  const steps = [
    { num: "01", icon: <Sparkles className="w-5 h-5" />, title: "Describe your idea", desc: "Tell WIZ AI what you want to create — a music video, animation, cinematic short, or anything else." },
    { num: "02", icon: <Wand2 className="w-5 h-5" />, title: "AI builds your storyboard", desc: "WizCreate\u2122 generates a full visual storyboard with scenes, characters, and direction." },
    { num: "03", icon: <Film className="w-5 h-5" />, title: "Render your video", desc: "Preview every scene, then render in HD or 4K with WizSound\u2122 and WizLumina\u2122 baked in." },
  ];
  return (
    <section className="bg-[#0a0a0a] border-t border-white/6 py-14 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-center text-xs font-semibold text-violet-400/70 uppercase tracking-widest mb-8">How it works</p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3">
                {i > 0 && <div className="hidden md:block w-12 h-px bg-gradient-to-r from-transparent to-violet-500/30" />}
                <div className="flex-shrink-0 w-12 h-12 rounded-full border border-violet-500/40 bg-violet-500/10 flex items-center justify-center text-violet-300">
                  {step.icon}
                </div>
                {i < steps.length - 1 && <div className="hidden md:block w-12 h-px bg-gradient-to-r from-violet-500/30 to-transparent" />}
              </div>
              <div>
                <p className="text-[10px] font-mono text-violet-400/60 tracking-widest uppercase mb-1.5">Step {step.num}</p>
                <p className="text-base font-bold text-white leading-snug mb-1">{step.title}</p>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Brand / Demo Video Section ─────────────────────────────────────────────
function BrandDemoVideo() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <section className="py-24 px-6 bg-[#0a0a0a] border-t border-white/5">
      <div className="max-w-4xl mx-auto text-center">
        <div className="reveal mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-400/80 mb-4">Powered by WIZ AI</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Welcome to WIZ AI
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            See how WIZ AI turns ideas into full videos in minutes. No editing. No experience. Just describe your idea.
          </p>
        </div>
        {/* Large central play button */}
        <div className="reveal flex justify-center mb-6">
          <button
            onClick={() => setDemoOpen(true)}
            className="group relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border border-white/12 bg-[#171717] hover:border-violet-500/40 transition-all duration-300 shadow-2xl hover:shadow-violet-500/20 focus:outline-none"
            aria-label="Watch 20-second demo"
          >
            {/* Poster image */}
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp"
              alt="WIZ AI demo preview"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            {/* Play button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="relative w-20 h-20">
                <span className="absolute inset-0 rounded-full bg-white/15 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
                <span className="absolute inset-0 rounded-full bg-white/20 border-2 border-white/50 group-hover:bg-white/30 group-hover:border-white/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </span>
              </div>
              <span className="text-white font-semibold text-lg drop-shadow-lg">Watch 20-sec Demo</span>
            </div>
            {/* Bottom label */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-xs text-white/60 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">Prompt → Storyboard → Final Video</span>
              <span className="text-xs text-white/60 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">20 seconds</span>
            </div>
          </button>
        </div>
        <div className="reveal mt-8">
          <a
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            Start Creating
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLOURS: Record<string, { badge: string; glow: string; dot: string }> = {
  "Animation":          { badge: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30", glow: "group-hover:shadow-cyan-500/20",  dot: "bg-cyan-400" },
  "Anime":              { badge: "bg-rose-500/20 text-rose-300 border border-rose-500/30", glow: "group-hover:shadow-rose-500/20",  dot: "bg-rose-400" },
  "Faceless Content":   { badge: "bg-slate-500/20 text-slate-300 border border-slate-500/30", glow: "group-hover:shadow-slate-500/20",  dot: "bg-slate-400" },
  "WizVideo":        { badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30", glow: "group-hover:shadow-violet-500/20",  dot: "bg-violet-400" },
  "Story Animation":    { badge: "bg-pink-500/20 text-pink-300 border border-pink-500/30",       glow: "group-hover:shadow-pink-500/20",    dot: "bg-pink-400" },
  "Social Short":       { badge: "bg-green-500/20 text-green-300 border border-green-500/30",    glow: "group-hover:shadow-green-500/20",   dot: "bg-green-400" },
  "Cinematic":          { badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30", glow: "group-hover:shadow-orange-500/20",  dot: "bg-orange-400" },
  "Cinematic AI Video": { badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30", glow: "group-hover:shadow-orange-500/20",  dot: "bg-orange-400" },
};

// ── Static showcase data (always shown; DB items override when available) ─────
const STATIC_SHOWCASE_ITEMS = [
  {
    id: -1,
    category: "WizVideo",
    title: "Neon Stage",
    description: "A cinematic concert performance with AI-generated crowd, volumetric lighting, and WizSound™ audio enhancement.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-neon-stage-L43AthLEfiF5bt3wJUcHWB.webp",
    videoUrl: null,
    duration: "3:24",
    tool: "Music Video Creator",
  },
  {
    id: -2,
    category: "WizVideo",
    title: "Desert Horizon",
    description: "Silhouette guitarist at golden hour — epic desert landscape, cinematic lens flares, and an original WizSound™ soundtrack.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-desert-sunset-gGWfEUTSjXNgKVCvSv5y85.webp",
    videoUrl: null,
    duration: "2:58",
    tool: "Music Video Creator",
  },
  {
    id: -3,
    category: "WizVideo",
    title: "Cyberpunk Alley",
    description: "Rain-soaked neon Tokyo street performance — holographic displays, purple and cyan lighting, full cinematic grade.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-cyberpunk-band-mEMS5T6znt5Fqj3DwimTcK.webp",
    videoUrl: null,
    duration: "4:12",
    tool: "Music Video Creator",
  },
  {
    id: -4,
    category: "Animation",
    title: "The Enchanted Forest",
    description: "Two young adventurers discover a magical glowing forest — Pixar 3D style, vibrant colours, and a whimsical original score.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-kids-pixar-adventure-BKhZNEWoXbX6EXPmv6vDHr.webp",
    videoUrl: null,
    duration: "5:10",
    tool: "WizAnimate™",
  },
  {
    id: -5,
    category: "Animation",
    title: "Cosmic Explorers",
    description: "A cheerful astronaut and friendly alien companions float through a vibrant galaxy — joyful, colourful, and perfectly paced for young audiences.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-kids-space-explorer-gUrADwNHSJSJCBHQnA9TKr.webp",
    videoUrl: null,
    duration: "4:45",
    tool: "WizAnimate™",
  },
  {
    id: -6,
    category: "Animation",
    title: "Dragon Rider",
    description: "A brave girl soars through rainbow clouds on her friendly dragon — Disney cartoon style with a catchy original kids song.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-kids-cartoon-dragon-fHkz9VL8sBdfDvLuy8RYqd.webp",
    videoUrl: null,
    duration: "3:30",
    tool: "WizAnimate™",
  },
  {
    id: -7,
    category: "Cinematic",
    title: "Neon City Chronicles",
    description: "Aerial flyover of a rain-soaked futuristic megacity — atmospheric fog, purple and gold lighting, Hollywood-grade colour grade.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic-city-7Gb7h9K3CbiAuwh6HKv9bc.webp",
    videoUrl: null,
    duration: "2:45",
    tool: "WizScript",
  },
  {
    id: -8,
    category: "Cinematic",
    title: "The Last Stand",
    description: "A lone golden warrior surveys a ruined fantasy kingdom — dramatic storm, lightning, and a sweeping orchestral WizSound™ score.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic-warrior-KwKZH22SRsKfJSGoJaL3Nu.webp",
    videoUrl: null,
    duration: "3:18",
    tool: "WizScript",
  },
  {
    id: -9,
    category: "Story Animation",
    title: "The Spirit of Summer",
    description: "A Ghibli-inspired watercolour story — a young girl and her magical spirit companion wander through a sunlit meadow at dusk.",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-story-ghibli-EtQk9cWKXAQvDGRgrHfBt3.webp",
    videoUrl: null,
    duration: "4:02",
    tool: "WizAnimate™",
  },
];

const SHOWCASE_FILTER_TABS = ["All", "WizVideo", "Animation", "Cinematic", "Story Animation"] as const;

// ── Individual showcase card ───────────────────────────────────────────────────────
type ShowcaseItem = { id: number; category: string; title: string; description: string; posterUrl: string; videoUrl: string | null; duration?: string; tool?: string };

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const colours = CATEGORY_COLOURS[item.category] ?? { badge: "bg-white/10 text-white/70 border border-white/20", glow: "group-hover:shadow-white/10", dot: "bg-white/40" };

  // Route CTA to the correct tool based on category or tool label
  const ctaHref = (() => {
    if (item.category === "Music Video" || item.tool === "WizVideo" || item.tool === "WizVideo") return "/music-video/create";
    if (item.category === "Animation" || item.category === "Story Animation" || item.tool === "WizAnimate™") return "/products/wizanimate";
    if (item.category === "Anime" || item.category === "Cinematic" || item.tool === "WizScript") return "/wizpilot";
    return "/onboarding";
  })();

  const handleMouseEnter = () => {
    if (videoRef.current && item.videoUrl) {
      videoRef.current.play().catch(() => {});
    }
  };
  const handleMouseLeave = () => {
    if (videoRef.current && item.videoUrl) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden glass-card hover:border-white/22 transition-all duration-300 shadow-lg ${colours.glow} hover:shadow-xl cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail / video preview */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width={640}
          height={360}
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        {item.videoUrl && (
          <video
            ref={videoRef}
            src={item.videoUrl}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          />
        )}
        {/* Duration badge top-left */}
        {item.duration && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[11px] font-semibold text-white/90 border border-white/10 flex items-center gap-1">
            <Play className="w-2.5 h-2.5 fill-white" />
            {item.duration}
          </div>
        )}
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Made with WIZ AI badge bottom-right */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white/70 border border-white/10">
          Made with WIZ AI
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colours.badge}`}>{item.category}</span>
          {item.tool && (
            <span className="text-[10px] text-white/40 font-medium">{item.tool}</span>
          )}
        </div>
        <h3 className="font-bold text-white text-base mb-2 leading-snug group-hover:text-violet-200 transition-colors">{item.title}</h3>
        <p className="text-[#a1a1aa] text-sm leading-relaxed mb-4 line-clamp-2">{item.description}</p>
        <NavLink
          href={ctaHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors group/cta"
        >
          Create something like this
          <ArrowRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5" />
        </NavLink>
      </div>
    </div>
  );
}
function MadeWithWizAI() {
  const { data: dbItems } = trpc.showcase.list.useQuery();
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // Use DB items if available, otherwise fall back to static data
  const allItems: ShowcaseItem[] = (dbItems && dbItems.length > 0)
    ? dbItems.map((i) => ({ ...i, duration: undefined, tool: undefined }))
    : STATIC_SHOWCASE_ITEMS;

  const filteredItems = activeFilter === "All"
    ? allItems
    : allItems.filter((i) => i.category === activeFilter);

  return (
    <section className="py-24 px-6 bg-[#0a0a0a] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 reveal">
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">WIZ AI Creator Network</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
            Discover Creators Using WIZ AI
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto mb-3">
            Create videos. Get discovered. Grow your audience.
          </p>
          <p className="text-[#a1a1aa] text-base max-w-xl mx-auto">
            Real creators using WIZ AI — musicians, YouTubers, animators, and kids content creators. Every video below was generated with WIZ AI.
          </p>
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10 reveal">
          {SHOWCASE_FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            const colours = CATEGORY_COLOURS[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab === "All" ? (
                  "All Videos"
                ) : (
                  <span className="flex items-center gap-1.5">
                    {colours && <span className={`w-1.5 h-1.5 rounded-full ${colours.dot}`} />}
                    {tab}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="reveal">
          {filteredItems.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => (
                <ShowcaseCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-white/40">
              <Film className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No examples in this category yet.</p>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14 reveal flex flex-col items-center gap-4">
          <p className="text-[#a1a1aa] text-sm">Want to get featured on WIZ AI?</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <NavLink
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25"
            >
              <Sparkles className="w-4 h-4" />
              Create Your First Video →
            </NavLink>
            <NavLink
              href="/discover"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all"
            >
              <Users className="w-4 h-4" />
              View All Creators
            </NavLink>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Use-Case Cards ─────────────────────────────────────────────────────────
function UseCaseCards() {
  const cases = [
    {
      icon: <Music className="w-6 h-6" />,
      title: "Musicians",
      desc: "Turn your track into a full music video — synced to lyrics, with animated characters and cinematic visuals.",
      color: "from-violet-600 to-purple-700",
      border: "border-violet-500/25",
      glow: "hover:shadow-violet-500/15",
      cta: "Start with WizVideo",
      href: "/music-video/create",
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: "Content Creators",
      desc: "Generate faceless YouTube videos, social shorts, and visual stories — no camera, no editing, no crew.",
      color: "from-blue-600 to-indigo-700",
      border: "border-blue-500/25",
      glow: "hover:shadow-blue-500/15",
      cta: "Start with WizScript",
      href: "/wizpilot",
    },
    {
      icon: <Film className="w-6 h-6" />,
      title: "Animators & Storytellers",
      desc: "Create Pixar-style animations, anime, and visual stories from a single prompt — characters stay consistent across every scene.",
      color: "from-emerald-600 to-teal-700",
      border: "border-emerald-500/25",
      glow: "hover:shadow-emerald-500/15",
      cta: "Create Animation",
      href: "/products/wizanimate",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "YouTubers & Brands",
      desc: "Produce professional video content at scale — intros, explainers, and branded visuals, all AI-generated.",
      color: "from-red-600 to-orange-700",
      border: "border-red-500/25",
      glow: "hover:shadow-red-500/15",
      cta: "Get Started Free",
      href: "/onboarding",
    },
  ];

  return (
    <section className="py-24 px-6 bg-[#0a0a0a] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">Who it's for</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Built for creators who want{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">results, not tools</span>
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">
            Whether you're a musician, YouTuber, animator, or brand — WIZ AI handles the entire video creation process.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal">
          {cases.map((c) => (
            <div
              key={c.title}
              className={`group relative rounded-2xl bg-[#141414] border ${c.border} p-6 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${c.glow}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow-lg`}>
                {c.icon}
              </div>
              <h3 className="text-lg font-bold text-white">{c.title}</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed flex-1">{c.desc}</p>
              <NavLink
                href={c.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors mt-auto"
              >
                {c.cta} <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTAPush ────────────────────────────────────────────────────────────────────────────────
function CTAPush() {
  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-3xl mx-auto text-center reveal">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
          Ready to create your video?
        </h2>
        <p className="text-[#a1a1aa] text-lg mb-10 max-w-xl mx-auto">
          Start for free. Pay only when you render. No subscriptions, no hidden fees.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <Button
            className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
            asChild
          >
            <NavLink href="/onboarding"><Sparkles className="w-4 h-4 mr-2" />Create Your First Video Free</NavLink>
          </Button>
          <Button
            variant="outline"
            className="border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-8 py-3 rounded-xl font-medium h-auto"
            asChild
          >
            <NavLink href="/pricing">View pricing</NavLink>
          </Button>
        </div>
        <p className="text-[#a1a1aa] text-sm">No credit card required</p>
      </div>
    </section>
  );
}

const WIZSYNC_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsync-logo-v1_a4fc38c0.png";
const WIZANIMATE_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizanimate-logo-v2_e4d3081b.png";
const WIZBOOST_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/module-wizboost_ce93c033.png";

// ── Ecosystem Section ─────────────────────────────────────────────────────────
function EcosystemSection() {
  const engines = [
    {
      logo: WIZCREATE_LOGO,
      name: "WizCreate™",
      role: "The Brain",
      tagline: "AI Creation Engine",
      desc: "Transforms any audio or idea into a fully-structured cinematic storyboard with scenes, characters, and visual direction.",
      caps: ["AI storyboard generation", "Scene-by-scene visual planning", "Character design & consistency"],
      colour: "violet",
      border: "border-violet-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]",
      bg: "bg-violet-500/5",
      badge: "text-violet-300 bg-violet-500/10 border-violet-500/25",
      href: "/products/wizcreate",
    },
    {
      logo: WIZANIMATE_ICON,
      name: "WizAnimate™",
      nameSub: "+ WizSync™",
      role: "The Performer",
      tagline: "Character Animation Engine",
      desc: "Brings characters to life with fluid AI-driven animation, motion-matched to the audio beat and emotional tone.",
      caps: ["Beat-matched character motion", "Emotion-driven performance", "Multi-character scene support"],
      colour: "cyan",
      border: "border-cyan-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]",
      bg: "bg-cyan-500/5",
      badge: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
      href: "/products/wizanimate",
    },
    {
      logo: WIZSYNC_LOGO,
      name: "WizSync™",
      role: "The Lip Sync Master",
      tagline: "Voice-to-Character Engine",
      desc: "Detects every voice in a track, assigns each to a character, and generates frame-perfect lip sync for realistic performance.",
      caps: ["AI speaker diarisation", "Auto voice-to-character mapping", "Hedra lip sync integration"],
      colour: "purple",
      border: "border-purple-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
      bg: "bg-purple-500/5",
      badge: "text-purple-300 bg-purple-500/10 border-purple-500/25",
      href: "/wizsync",
    },
    {
      logo: WIZSOUND_LOGO,
      name: "WizSound™",
      role: "The Composer",
      tagline: "Cinematic Audio Engine",
      desc: "Proprietary audio enhancement that transforms standard sound into studio-grade, immersive cinematic audio.",
      caps: ["Studio-grade audio mastering", "Richer bass & clearer highs", "Cinematic spatial presence"],
      colour: "emerald",
      border: "border-emerald-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
      bg: "bg-emerald-500/5",
      badge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
      href: "/products/wizsound",
    },
    {
      logo: WIZLUMINA_LOGO,
      name: "WizLumina™",
      role: "The Cinematographer",
      tagline: "Visual Enhancement Engine",
      desc: "Cinematic colour grading, HDR tone mapping, and film-level sharpening that transforms flat AI video into rich, vivid visuals.",
      caps: ["HDR tone mapping & grading", "Film-level sharpening", "4K upscaling & enhancement"],
      colour: "amber",
      border: "border-amber-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]",
      bg: "bg-amber-500/5",
      badge: "text-amber-300 bg-amber-500/10 border-amber-500/25",
      href: "/products/wizlumina",
    },
    {
      logo: WIZGENESIS_LOGO,
      name: "WizGenesis\u2122",
      role: "The Intelligence Layer",
      tagline: "AI Render Intelligence Engine",
      desc: "The brain behind every render. WizGenesis ensures character consistency across scenes, enhances prompts for accuracy, and orchestrates the final 4K output with WizSound\u2122 spatial audio and WizLumina\u2122 baked in.",
      caps: ["Character consistency across scenes", "Prompt enhancement & scene accuracy", "4K render with spatial audio"],
      colour: "rose",
      border: "border-rose-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]",
      bg: "bg-rose-500/5",
      badge: "text-rose-300 bg-rose-500/10 border-rose-500/25",
      href: "/products/wizgenesis",
    },
    {
      logo: WIZBOOST_ICON,
      name: "WizBoost™",
      role: "The Amplifier",
      tagline: "Creator Distribution Engine",
      desc: "Connects your finished video to real viewers, creators, and fans — amplifying reach across platforms automatically.",
      caps: ["Multi-platform distribution", "Creator network amplification", "Audience growth analytics"],
      colour: "orange",
      border: "border-orange-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]",
      bg: "bg-orange-500/5",
      badge: "text-orange-300 bg-orange-500/10 border-orange-500/25",
      href: "/products/wizboost",
    },
  ];

  return (
    <section className="py-24 px-6 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-400/25 bg-violet-500/8 text-violet-300 text-xs font-mono tracking-widest uppercase font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            The WIZ AI Ecosystem
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            One platform.
            <span className="bg-gradient-to-r from-violet-300 via-purple-200 to-fuchsia-300 bg-clip-text text-transparent"> Seven powerful modules.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            WIZ AI is built on seven specialised AI modules — each one engineered for a specific stage of the video creation pipeline.
          </p>
        </div>

        {/* WIZ AI platform card */}
        <div className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/3 flex flex-col md:flex-row items-center gap-6">
          <img
            src={WIZAI_LOGO}
            alt="WIZ AI"
            className="h-[10.4rem] w-auto object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
          />
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h3 className="text-xl font-bold text-white">WIZ AI</h3>
              <span className="text-xs px-2 py-0.5 rounded-full border border-white/20 text-white/50 font-mono">Platform</span>
            </div>
            <p className="text-white/60 text-sm">All-in-one cinematic video creation platform — the unified experience that brings WizCreate™, WizSound™, WizLumina™, WizGenesis™, and WizScript together.</p>
          </div>
        </div>

        {/* Engine grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {engines.map((engine) => (
            <NavLink
              key={engine.name}
              href={engine.href}
              className={`group relative flex flex-col p-6 rounded-2xl border ${engine.border} ${engine.bg} ${engine.glow} transition-all duration-300 cursor-pointer`}
            >
              {/* Logo */}
              <div className="mb-4 flex items-center justify-center h-28">
                {engine.logo ? (
                  <img
                    src={engine.logo}
                    alt={engine.name}
                    className="h-24 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_16px_rgba(139,92,246,0.5)]"
                  />
                ) : (
                  <span className="text-7xl transition-transform duration-300 group-hover:scale-105">{(engine as { icon?: string }).icon}</span>
                )}
              </div>

              {/* Name + nameSub */}
              {(engine as { nameSub?: string }).nameSub && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm font-bold text-white">{engine.name}</span>
                  <span className="text-xs font-semibold text-cyan-400/80">{(engine as { nameSub?: string }).nameSub}</span>
                </div>
              )}

              {/* Role + Badge row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${engine.badge}`}>
                  {engine.tagline}
                </div>
                <span className="text-[10px] text-white/35 font-medium">{(engine as { role?: string }).role}</span>
              </div>

              {/* Description */}
              <p className="text-white/55 text-sm leading-relaxed mb-3">{engine.desc}</p>

              {/* Capabilities */}
              <ul className="space-y-1 flex-1">
                {((engine as { caps?: string[] }).caps ?? []).map((cap) => (
                  <li key={cap} className="flex items-start gap-2 text-xs text-white/40">
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${engine.badge.split(" ")[0].replace("text-", "bg-")}`} />
                    {cap}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${engine.badge.split(" ")[0]} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                Explore {engine.name} <ArrowRight className="w-3 h-3" />
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "WizVideo", href: "/music-video" },
        { label: "WizScript", href: "/wizpilot" },
        { label: "Pricing", href: "/pricing" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Help", href: "/help" },
      ],
    },
    {
      title: "Wiz AI Ecosystem",
      links: [
        { label: "WIZ AI — Video Creation", href: "/" },
        { label: "WizSound — Spatial Audio", href: "/products/wizsound" },
        { label: "WizScript — AI Workflow", href: "/wizpilot" },
        { label: "WizGenesis — Intelligence", href: "/products/wizgenesis" },
        { label: "WizLumina — Visual Enhancement", href: "/products/wizlumina" },
        { label: "Wiz AI \u2014 Platform", href: "https://www.wiz-ai.io" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help Centre", href: "/help" },
        { label: "Contact", href: "mailto:support@wizvid.ai" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Refund Policy", href: "/refunds" },
      ],
    },
  ];

  return (
    <footer className="bg-[#0f0f0f] border-t border-white/8 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={WIZAI_LOGO_FOOTER} alt="WIZ AI" width={165} height={94} loading="lazy" className="h-[6.5rem] w-auto object-contain" />
            </div>
            <p className="text-[#a1a1aa] text-sm leading-relaxed mb-4">
              AI Music Video Generator — create full videos in minutes. No editing needed.
            </p>
            <a href="mailto:support@wizvid.ai" className="text-[#a1a1aa] text-xs hover:text-white transition-colors">support@wizvid.ai</a>
          </div>
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-white text-sm mb-4">{section.title}</h4>
              <div className="space-y-3">
                {section.links.map((link) => (
                  link.href.startsWith('mailto:') || link.href.startsWith('http') ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="block text-[#a1a1aa] hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <NavLink
                      key={link.label}
                      href={link.href}
                      className="block text-[#a1a1aa] hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </NavLink>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/8 pt-8 flex flex-col gap-5">
          {/* Payment methods */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[#a1a1aa] mr-1">Secure payments via</span>
            {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", "PayPal"].map((method) => (
              <span
                key={method}
                className="inline-flex items-center px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-xs text-[#a1a1aa] font-medium"
              >
                {method}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#a1a1aa]">
            <p>© 2026 WIZ AI by Wiz AI. All rights reserved.</p>
            <div className="flex gap-6">
              <NavLink href="/privacy" className="hover:text-white transition-colors">Privacy Policy</NavLink>
              <NavLink href="/terms" className="hover:text-white transition-colors">Terms of Service</NavLink>
              <NavLink href="/refunds" className="hover:text-white transition-colors">Refund Policy</NavLink>
            </div>
          </div>
          <div className="mt-6 text-center space-y-1">
            <p className="text-xs text-[#a1a1aa]/50 tracking-widest uppercase">
              WIZ AI ecosystem:{" "}
              <span className="text-violet-400/70">WizCreate™</span>
              {" · "}
              <span className="text-indigo-400/70">WizSound™</span>
              {" · "}
              <span className="text-fuchsia-400/70">WizScript</span>
              {" · "}
              <span className="text-amber-400/70">WizGenesis™</span>
              {" · "}
              <span className="text-emerald-400/70">WizLumina™</span>
              {" · "}
              <span className="text-rose-400/70">WizBoost™</span>
            </p>
            <p className="text-[10px] text-[#a1a1aa]/30">
              A product by{" "}
              <a href="https://www.wiz-ai.io" target="_blank" rel="noopener noreferrer" className="text-violet-400/50 hover:text-violet-400/80 transition-colors">Wiz AI</a>
              {" "}— Creative Intelligence Platform
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
// ── Page ────────────────────────────────────────────────────────────────────────────────
export default function Home() {
  useReveal();

  return (
    <div className="bg-[#0f0f0f] text-white min-h-screen overflow-x-hidden">
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
        {/* 2. Choose What You Want to Create */}
        <ProductSuite />
        {/* 3. Brand / Demo Video — "Welcome to WIZ AI" */}
        <BrandDemoVideo />
        {/* 4. How It Works */}
        <HowItWorksStrip />
        {/* 5. Why WIZ AI — trust signals + value prop */}
        <TrustSignals />
        <EcosystemSection />
        {/* 6. Product Showcase / Examples */}
        <MadeWithWizAI />
        <UseCaseCards />
        {/* 7. Final CTA */}
        <CTAPush />
        {/* Continue project banner (contextual) */}
        <ContinueProjectBanner />
      </main>
      <Footer />
    </div>
  );
}
