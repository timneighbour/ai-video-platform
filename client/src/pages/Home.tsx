import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import HeroCinematicBg from "@/components/HeroCinematicBg";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import ThemeToggle from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Music, Zap, Star, Play, Check, ArrowRight,
  Menu, X, Volume2, VolumeX, Film, Wand2, Users, ChevronRight,
  Music2, Bot, Lightbulb, Video, Download
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
// Premium transparent logo — violet glow, transparent background
const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-premium_a0b936c5.png";
const WIZVID_LOGO_BRAND = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-premium_a0b936c5.png";
const WIZVID_LOGO_FOOTER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-premium_a0b936c5.png";
const WIZVID_LOGO_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-premium_a0b936c5.png";
const WIZVID_LOGO_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-animation-v3_85969477.mp4";
const HERO_VIDEOS = [
  `${CDN}/hero-nightclub-web_3a88ea3e.mp4`,
  `${CDN}/hero-abstract-web_ed099aea.mp4`,
  `${CDN}/hero-concert-web_2f9db1a6.mp4`,
];
const WIZBEAT_IMAGES = [
  { src: `${CDN}/wizbeat-artist-band_04b2adbf.jpg`, label: "Music Video" },
  { src: `${CDN}/wizbeat-animated-dog_8d12b77c.jpg`, label: "Kids Animation" },
  { src: `${CDN}/wizbeat-animated-cat_81ffcf80.jpg`, label: "Animated Story" },
  { src: `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`, label: "Social Clip" },
  { src: `${CDN}/wizbeat-hip-hop_247e7ea6.jpg`, label: "Cinematic" },
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
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-tools-menu]")) setToolsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolsOpen]);

  const mainLinks = [
    { label: "Home", href: "/" },
    { label: "Music Video", href: "/music-video" },
    { label: "WizPilot", href: "/wizpilot" },
    { label: "Pricing", href: "/pricing" },
    { label: "Help", href: "/help" },
  ];

  const toolLinks = [
    { label: "AI Music Generator", sub: "Powered by Suno", href: "/music-creator", icon: "🎵" },
    { label: "YouTube Video Creator", sub: "WizPilot for YouTube", href: "/wizpilot", icon: "🎥" },
    { label: "Kids Video", sub: "Safe animated content", href: "/kids-video", icon: "🧒" },
    { label: "Text to Video", sub: "Prompt to full video", href: "/text-to-video", icon: "✨" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8 shadow-lg" : "bg-transparent"
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center group flex-shrink-0">
          <img
            src={WIZVID_LOGO_FULL}
            alt="WizVid"
            width={320}
            height={180}
            className="h-14 w-auto object-contain transition-all duration-300 hover:scale-105 drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {mainLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-sm text-[#a1a1aa] hover:text-white rounded-lg transition-all duration-200 font-medium hover:scale-105 hover:-translate-y-0.5 inline-block whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}

          {/* Tools dropdown */}
          <div className="relative" data-tools-menu>
            <button
              data-tools-menu
              onClick={() => setToolsOpen((v) => !v)}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 font-medium whitespace-nowrap ${
                toolsOpen ? "text-white bg-white/8" : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              Tools
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {toolsOpen && (
              <div
                data-tools-menu
                className="absolute top-full right-0 mt-2 w-64 bg-[#111]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-2">
                  {toolLinks.map((tool) => (
                    <a
                      key={tool.label}
                      href={tool.href}
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/6 transition-colors group"
                    >
                      <span className="text-xl mt-0.5 flex-shrink-0">{tool.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{tool.label}</div>
                        <div className="text-xs text-[#a1a1aa] mt-0.5">{tool.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button className="bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9" asChild>
              <a href="/dashboard"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Dashboard</a>
            </Button>
          ) : (
            <>
              <a href={getLoginUrl()} className="hidden sm:block text-sm text-[#a1a1aa] hover:text-white transition-colors font-medium px-3 py-2">
                Sign in
              </a>
              <Button className="bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9 shadow-sm" asChild>
                <a href="/onboarding"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Get Started</a>
              </Button>
            </>
          )}
          <button
            className="lg:hidden p-2 text-[#a1a1aa] hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0f0f0f]/98 backdrop-blur-xl border-t border-white/8 px-6 py-5 max-h-[80vh] overflow-y-auto">
          {/* Main links */}
          {mainLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-[#a1a1aa] hover:text-white font-medium border-b border-white/5 text-sm"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}

          {/* Tools section */}
          <div className="pt-4 pb-2">
            <p className="text-xs font-bold text-[#a1a1aa]/60 uppercase tracking-widest mb-3">Tools</p>
            {toolLinks.map((tool) => (
              <a
                key={tool.label}
                href={tool.href}
                className="flex items-center gap-3 py-3 border-b border-white/5"
                onClick={() => setMobileOpen(false)}
              >
                <span className="text-lg">{tool.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{tool.label}</div>
                  <div className="text-xs text-[#a1a1aa]">{tool.sub}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="pt-4 flex gap-3">
            <a href={getLoginUrl()} className="flex-1 text-center py-2.5 text-[#a1a1aa] border border-white/15 rounded-xl text-sm font-medium">Sign in</a>
            <a href="/onboarding" className="flex-1">
              <Button className="w-full bg-white text-black rounded-xl text-sm font-semibold h-10">Get Started</Button>
            </a>
          </div>
        </div>
      )}
    </nav>
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

function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [demoOpen, setDemoOpen] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* ── Full-bleed cinematic background ── */}
      <HeroCinematicBg mouseX={mousePos.x} mouseY={mousePos.y} />

      {/* ── Centered hero content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-10 w-full max-w-5xl mx-auto">

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.02] tracking-tight text-white mb-6 drop-shadow-[0_2px_32px_rgba(0,0,0,0.9)]">
          Turn your ideas into<br />
          <span
            className="bg-gradient-to-r from-violet-300 via-purple-300 to-blue-300 bg-clip-text text-transparent"
            style={{ textShadow: "none" }}
          >
            cinematic video.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl text-white/75 max-w-2xl mb-10 leading-relaxed font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
          AI that understands your lyrics, story, and style.
          Music videos, social clips, kids animations — in under 2 minutes.
        </p>

        {/* Primary CTA */}
        <a
          href="/onboarding"
          className="inline-flex items-center gap-2.5 bg-white text-black font-bold text-lg px-10 py-4 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:bg-white/95 transition-all duration-300 mb-4"
        >
          <Sparkles className="w-5 h-5" />
          Create Your First Video — Free
        </a>

        {/* No card callout + trust micro-copy */}
        <p className="text-sm text-white/50 mb-2">No credit card required · 2 free videos included</p>
        <p className="text-sm text-white/40 mb-10 font-medium tracking-wide">Built for creators, musicians &amp; agencies</p>

        {/* Demo video trigger — large pulsing play button */}
        <button
          onClick={() => setDemoOpen(true)}
          className="group flex flex-col items-center gap-3 mb-16 focus:outline-none"
          aria-label="Watch 30-second demo"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            {/* Outer pulse rings */}
            <span className="absolute inset-0 rounded-full bg-white/15 animate-ping" />
            <span className="absolute inset-1 rounded-full bg-white/10 animate-ping [animation-delay:0.4s]" />
            {/* Inner button */}
            <span className="absolute inset-0 rounded-full bg-white/20 border border-white/30 group-hover:bg-white/30 group-hover:border-white/50 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" fill="white" />
            </span>
          </div>
          <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors font-medium tracking-wide">
            Watch 30-sec demo
          </span>
        </button>

        {/* Social proof strip */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-white/50 text-sm">
          {/* Avatar stack */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp",
                "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-youtubers-hVpTL9NRQkqFJoeEzGZYpN.webp",
                "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-ai-creators-iNKM9VvLTuKBigHPwZC3HS.webp",
                "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-kids-creators-V7CLZTheKBJ8dstLuLDWem.webp",
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-black object-cover"
                />
              ))}
            </div>
            <span className="text-white/60 text-sm font-medium">Trusted by musicians, YouTubers &amp; creators</span>
          </div>
          {/* Stars */}
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1 text-white/50">Free to start</span>
          </div>
        </div>
      </div>

      {/* Demo Video Modal */}
      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ── Immediate Value Section ─────────────────────────────────────────────────
function ImmediateValue() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-[#0f0f0f] to-[#111] border-t border-white/6">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="reveal">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">From upload to storyboard in seconds</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              See your full video before you render a single frame
            </h2>
            <ul className="space-y-4 mb-8">
              {[
                { icon: "⚡", text: "AI builds your full storyboard in under 30 seconds" },
                { icon: "👁️", text: "Preview every scene — edit any prompt before rendering" },
                { icon: "🎛️", text: "Full creative control, zero technical skill required" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                  <span className="text-[#a1a1aa] text-lg leading-snug">{item.text}</span>
                </li>
              ))}
            </ul>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Create your first video
            </a>
            <p className="text-xs text-[#a1a1aa]/60 mt-3">No credit card required · First video free · Under 2 minutes</p>
          </div>
          {/* Right: visual storyboard mockup */}
          <div className="reveal">
            <div className="bg-[#171717] border border-white/8 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-xs text-[#a1a1aa] font-mono">AI Storyboard Preview</span>
              </div>
              {[
                { time: "0:00", desc: "Opening scene — city skyline at night", status: "preview" },
                { time: "0:08", desc: "Artist silhouette under streetlight", status: "preview" },
                { time: "0:16", desc: "Rain in slow motion, neon reflections", status: "preview" },
                { time: "0:24", desc: "Chorus — wide cinematic shot", status: "cinematic" },
              ].map((scene) => (
                <div key={scene.time} className="flex items-center gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-white/5">
                  <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-violet-900/60 to-blue-900/40 border border-white/8 flex items-center justify-center text-xs text-[#a1a1aa] font-mono flex-shrink-0">
                    {scene.time}
                  </div>
                  <p className="text-sm text-white/80 flex-1 leading-snug">{scene.desc}</p>
                  {scene.status === "cinematic" ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 flex-shrink-0">✨ Cinematic</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/15 text-green-400 flex-shrink-0">Preview ready</span>
                  )}
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-[#a1a1aa]">4 scenes generated</span>
                <span className="text-xs text-violet-400 font-medium">Edit any scene before rendering →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Product Demo ────────────────────────────────────────────────────────────
function ProductDemo() {
  const steps = [
    {
      label: "Your input",
      icon: "✍️",
      color: "border-violet-500/30 bg-violet-500/5",
      badge: "bg-violet-500/20 text-violet-300",
      content: (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Example lyrics</div>
          <div className="p-4 rounded-xl bg-[#0f0f0f] border border-white/8 text-sm text-white/80 leading-relaxed font-mono">
            <p className="text-violet-300">🎵 Verse 1:</p>
            <p className="mt-2">"Lights fade out, city sleeps,</p>
            <p>Neon signs and broken dreams,</p>
            <p>I walk alone through midnight rain,</p>
            <p>Searching for a way back home again"</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#171717] border border-white/8 text-[#a1a1aa]">Style: Cinematic</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#171717] border border-white/8 text-[#a1a1aa]">Mood: Dark</span>
          </div>
        </div>
      ),
    },
    {
      label: "AI storyboard",
      icon: "🎨",
      color: "border-blue-500/30 bg-blue-500/5",
      badge: "bg-blue-500/20 text-blue-300",
      content: (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Generated scenes</div>
          {[
            { time: "0:00", scene: "Wide city skyline at night, neon reflections on wet pavement" },
            { time: "0:08", scene: "Close-up: artist silhouette under a flickering streetlight" },
            { time: "0:16", scene: "Rain falling in slow motion, droplets catching neon light" },
            { time: "0:24", scene: "Artist walking through empty alley, fog rolling in" },
          ].map((s) => (
            <div key={s.time} className="flex gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-white/6 text-xs">
              <span className="text-blue-400 font-mono font-bold flex-shrink-0">{s.time}</span>
              <span className="text-white/70 leading-relaxed">{s.scene}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: "Final video",
      icon: "🎬",
      color: "border-green-500/30 bg-green-500/5",
      badge: "bg-green-500/20 text-green-300",
      content: (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Real video generated with WizVid</div>
          <div className="relative rounded-xl overflow-hidden bg-[#0f0f0f] border border-white/8 aspect-video group cursor-pointer">
            <video
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic_13667434.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="w-full h-full object-cover"
              aria-label="Real AI-generated cinematic video output"
            />
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white/80 border border-white/10">
              Real WizVid output
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">✓ Synced to lyrics</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">✓ No watermark</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">See it in action</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            From idea to full video — in under 5 minutes
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">
            Describe your idea or upload your song. WizVid writes the storyboard, renders every scene, and delivers a complete video.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 reveal">
          {steps.map((step, i) => (
            <div key={step.label} className={`relative p-6 rounded-2xl border ${step.color} transition-all`}>
              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#171717] border border-white/10 items-center justify-center">
                  <ChevronRight className="w-3.5 h-3.5 text-[#a1a1aa]" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{step.icon}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${step.badge}`}>{step.label}</span>
              </div>
              {step.content}
            </div>
          ))}
        </div>

        <div className="text-center mt-10 reveal">
          <Button
            className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
            asChild
          >
            <a href="/onboarding"><Sparkles className="w-4 h-4 mr-2" />Start Creating Free</a>
          </Button>
          <p className="text-[#a1a1aa] text-sm mt-3">Free to start · No credit card · 2 free videos included</p>
        </div>
      </div>
    </section>
  );
}

// ── Why WizVid ────────────────────────────────────────────────────────────────
function WhyWizVid() {
  const reasons = [
    {
      icon: "👁️",
      title: "See your video before rendering",
      desc: "WizVid generates a full AI storyboard instantly. Preview every scene, edit any prompt, and approve your video before a single frame is rendered.",
    },
    {
      icon: "🧑‍🎤",
      title: "Keep characters consistent across every scene",
      desc: "Your characters stay identical from scene to scene — same look, same style, same energy. No jarring changes between cuts.",
    },
    {
      icon: "✨",
      title: "Upgrade your video to cinematic quality",
      desc: "Choose which scenes get premium cinematic rendering — chorus, climax, hero moments. You stay in control of quality and credits.",
    },
  ];

  return (
    <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">Why WizVid is different</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            See it. Approve it.<br />
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Then generate it.</span>
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">Most AI tools give you clips. WizVid gives you a complete, consistent music video — and lets you preview every scene before you spend a single credit.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`flex flex-col gap-4 p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-violet-500/30 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}
            >
              <div className="text-3xl">{r.icon}</div>
              <div>
                <h3 className="font-semibold text-white mb-2 text-lg">{r.title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
function Features() {
  return (
    <section className="py-28 px-6 bg-[#0f0f0f]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">What WizVid does</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
            Create full videos —<br />
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">not just clips</span>
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">
            Most AI tools edit content. WizVid creates it from scratch — storyboard to final cut.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 reveal">
            {[
              { icon: <Music className="w-5 h-5" />, title: "Music video autopilot", desc: "Upload your song, pick a style, and WizVid builds the entire music video — synced to your lyrics." },
              { icon: <Film className="w-5 h-5" />, title: "AI animation from text", desc: "Describe any scene or concept and watch it become a fully animated video in minutes." },
              { icon: <Wand2 className="w-5 h-5" />, title: "Storyboard to final cut", desc: "AI generates a storyboard, renders every scene, and delivers a complete video — automatically." },
              { icon: <Zap className="w-5 h-5" />, title: "6 cinematic styles", desc: "Choose from Cinematic, Anime, Pixar 3D, Documentary, Abstract, or Vintage." },
            ].map((item, i) => (
              <div key={item.title} className={`flex gap-4 p-5 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/12 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-[#a1a1aa] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 reveal">
            {STYLE_IMAGES.map((style) => (
              <div key={style.label} className="relative rounded-2xl overflow-hidden aspect-video group cursor-pointer card-hover">
                <img src={style.img} alt={style.label} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-2.5 left-3 text-white text-xs font-semibold">{style.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Who it's for ─────────────────────────────────────────────────────────────
function WhoItsFor() {
  const audiences = [
    {
      img: WHO_IMAGES.musicians,
      imgAlt: "Musician performing on stage with purple stage lighting",
      title: "Musicians",
      desc: "Create music videos instantly — no director, no studio, no budget needed.",
      cta: "Make a music video",
      href: "/music-video",
      accent: "from-violet-500/20 to-purple-500/5",
      badge: "🎤 Music Video",
    },
    {
      img: WHO_IMAGES.youtubers,
      imgAlt: "YouTuber recording in a professional studio setup",
      title: "YouTubers & Podcasters",
      desc: "Boost CTR with AI animation. Stand out in a crowded feed without editing.",
      cta: "Create YouTube content",
      href: "/wizpilot",
      accent: "from-red-500/20 to-orange-500/5",
      badge: "🎥 YouTube & Podcast",
    },
    {
      img: WHO_IMAGES.aiCreators,
      imgAlt: "Futuristic AI-generated digital avatar with neon glow",
      title: "AI Creators",
      desc: "Automate your content pipeline. Scale to 30+ videos a month without lifting a finger.",
      cta: "Start automating",
      href: "/wizpilot",
      accent: "from-cyan-500/20 to-blue-500/5",
      badge: "🤖 AI Content",
    },
    {
      img: WHO_IMAGES.kidsCreators,
      imgAlt: "Cute Pixar-style 3D animated child character in a colorful world",
      title: "Kids Content Creators",
      desc: "Safe, fun, fully automated. Perfect for animated channels and family content.",
      cta: "Create kids content",
      href: "/kids-video",
      accent: "from-pink-500/20 to-yellow-500/5",
      badge: "🧒 Kids & Family",
    },
  ];

  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Who it's for</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">Built for creators like you</h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">Whether you're a musician, YouTuber, or kids content creator — WizVid is your AI video studio.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {audiences.map((a, i) => (
            <div
              key={a.title}
              className={`group rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all card-hover reveal animate-delay-${(i + 1) * 100} overflow-hidden`}
            >
              {/* Image */}
              <div className="relative w-full aspect-[16/9] overflow-hidden">
                <img
                  src={a.img}
                  alt={a.imgAlt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${a.accent} mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-xs font-semibold text-white bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">{a.badge}</span>
              </div>
              {/* Text */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{a.title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed mb-4">{a.desc}</p>
                <a href={a.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors">
                  {a.cta} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

//// ── Content Engine USP ─────────────────────────────────────────────────────
function ContentEngine() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveStep((prev) => (prev + 1) % 4), 2200);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      icon: <Lightbulb className="w-6 h-6" />,
      label: "Idea or Prompt",
      sub: "Describe your vision",
      color: "violet",
      glow: "from-violet-500/30 to-violet-500/5",
      border: "border-violet-500/40",
      iconBg: "bg-violet-500/15 text-violet-300",
      activeBg: "bg-violet-500/10",
    },
    {
      icon: <Music2 className="w-6 h-6" />,
      label: "AI Music (Suno)",
      sub: "Full song generated",
      color: "blue",
      glow: "from-blue-500/30 to-blue-500/5",
      border: "border-blue-500/40",
      iconBg: "bg-blue-500/15 text-blue-300",
      activeBg: "bg-blue-500/10",
    },
    {
      icon: <Film className="w-6 h-6" />,
      label: "WizBeat",
      sub: "Scenes & characters",
      color: "purple",
      glow: "from-purple-500/30 to-purple-500/5",
      border: "border-purple-500/40",
      iconBg: "bg-purple-500/15 text-purple-300",
      activeBg: "bg-purple-500/10",
    },
    {
      icon: <Download className="w-6 h-6" />,
      label: "Final Video",
      sub: "Export & publish",
      color: "green",
      glow: "from-green-500/30 to-green-500/5",
      border: "border-green-500/40",
      iconBg: "bg-green-500/15 text-green-300",
      activeBg: "bg-green-500/10",
    },
  ];

  const features = [
    {
      icon: <Music2 className="w-7 h-7" />,
      badge: "Powered by Suno",
      badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/20",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      title: "AI Music Generation",
      desc: "Type what your song should sound like and get a complete track back in seconds — vocals, instruments, and full production included. No music knowledge needed.",
      bullets: ["Full songs from a single prompt", "Any style, genre, or mood", "Vocals & instrumentals included"],
      cta: "Generate a Song",
      href: "/music-creator",
    },
    {
      icon: <Film className="w-7 h-7" />,
      badge: "WizBeat",
      badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/20",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10 border-violet-500/20",
      title: "Music Video Creation",
      desc: "Upload your song and WizVid builds a complete music video for you — every scene synced to your lyrics, with animated characters and cinematic visuals.",
      bullets: ["Every scene synced to lyrics", "Animated characters & styles", "YouTube & socials ready"],
      cta: "Create Music Video",
      href: "/music-video",
    },
    {
      icon: <Bot className="w-7 h-7" />,
      badge: "WizPilot",
      badgeColor: "bg-green-500/15 text-green-300 border-green-500/20",
      iconColor: "text-green-400",
      iconBg: "bg-green-500/10 border-green-500/20",
      title: "WizPilot Automation",
      desc: "Describe any idea and WizPilot handles everything — storyboard, scenes, and final video. Perfect for YouTube, social content, and faceless channels.",
      bullets: ["Any idea to full video", "Auto-generated storyboard", "No editing, ever"],
      cta: "Start WizPilot",
      href: "/wizpilot",
    },
  ];

  return (
    <>
      {/* ── Animated Flow ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#0f0f0f] border-t border-white/6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              From idea to finished video
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-green-400 bg-clip-text text-transparent">in four simple steps</span>
            </h2>
            <p className="text-[#a1a1aa] text-lg max-w-2xl mx-auto">
              Type a prompt. WizVid generates your song, builds the storyboard, renders every scene, and delivers a complete video — no tools to juggle, no editing required.
            </p>
          </div>

          {/* Flow steps */}
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-0 reveal">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center flex-1 min-w-0">
                <div
                  className={`flex-1 relative p-5 rounded-2xl border transition-all duration-500 cursor-default
                    ${activeStep === i
                      ? `${step.activeBg} ${step.border} shadow-lg`
                      : "bg-[#171717] border-white/6"}
                  `}
                  onMouseEnter={() => setActiveStep(i)}
                >
                  {/* Glow on active */}
                  {activeStep === i && (
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.glow} opacity-40 pointer-events-none`} aria-hidden="true" />
                  )}
                  <div className="relative z-10">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-3 transition-colors duration-300 ${activeStep === i ? step.iconBg + " " + step.border : "bg-white/5 border-white/8 text-[#a1a1aa]"}`}>
                      {step.icon}
                    </div>
                    <div className="text-xs font-bold text-[#a1a1aa] tracking-widest mb-1">STEP {String(i + 1).padStart(2, "0")}</div>
                    <div className={`font-semibold text-sm mb-0.5 transition-colors duration-300 ${activeStep === i ? "text-white" : "text-white/70"}`}>{step.label}</div>
                    <div className="text-xs text-[#a1a1aa]">{step.sub}</div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-shrink-0 mx-2 transition-colors duration-500 ${activeStep > i ? "text-white" : "text-white/20"}`}>
                    <ArrowRight className="w-5 h-5 hidden md:block" />
                    <div className="w-px h-5 bg-current mx-auto md:hidden" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-0.5 bg-white/6 rounded-full overflow-hidden reveal">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-blue-500 to-green-500 rounded-full transition-all duration-[2200ms] ease-linear"
              style={{ width: `${((activeStep + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* ── 3-Column Feature Block ────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Everything you need in one place</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Three tools. One platform.<br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Zero complexity.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`flex flex-col p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${f.iconBg} ${f.iconColor}`}>
                  {f.icon}
                </div>
                <span className={`inline-flex self-start text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${f.badgeColor}`}>{f.badge}</span>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed mb-4 flex-1">{f.desc}</p>
                <ul className="space-y-1.5 mb-5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="border-white/12 text-white hover:bg-white/5 bg-transparent text-sm rounded-xl font-medium h-auto py-2.5 mt-auto"
                  asChild
                >
                  <a href={f.href}><ArrowRight className="w-3.5 h-3.5 mr-1.5" />{f.cta}</a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Combined Flow Example ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">See it in action</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              From idea to finished video
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">in minutes</span>
            </h2>
          </div>

          <div className="relative reveal">
            {/* Vertical connector line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-violet-500/60 via-blue-500/40 to-green-500/60 hidden md:block" aria-hidden="true" />

            <div className="space-y-4">
              {[
                {
                  step: "Prompt",
                  color: "violet",
                  dot: "bg-violet-500",
                  content: (
                    <div className="p-5 rounded-2xl bg-[#171717] border border-violet-500/20">
                      <p className="text-xs text-violet-300 font-semibold uppercase tracking-widest mb-2">Your idea</p>
                      <p className="text-white font-medium text-lg">"Kids pirate adventure song"</p>
                    </div>
                  ),
                },
                {
                  step: "AI Music",
                  color: "blue",
                  dot: "bg-blue-500",
                  content: (
                    <div className="p-5 rounded-2xl bg-[#171717] border border-blue-500/20">
                      <p className="text-xs text-blue-300 font-semibold uppercase tracking-widest mb-3">Suno generates</p>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5 items-end h-8">
                          {[3,5,4,7,5,6,4,8,5,4,6,5,7,4,5].map((h, i) => (
                            <div key={i} className="w-1.5 rounded-full bg-blue-400/70 animate-pulse" style={{height: `${h * 4}px`, animationDelay: `${i * 80}ms`}} />
                          ))}
                        </div>
                        <div>
                          <p className="text-white font-medium">Full song — 2:45</p>
                          <p className="text-[#a1a1aa] text-sm">Upbeat pirate folk, vocals + instruments</p>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  step: "WizVid creates",
                  color: "purple",
                  dot: "bg-purple-500",
                  content: (
                    <div className="p-5 rounded-2xl bg-[#171717] border border-purple-500/20">
                      <p className="text-xs text-purple-300 font-semibold uppercase tracking-widest mb-3">WizVid generates</p>
                      <div className="grid grid-cols-3 gap-2">
                        {["Storyboard", "Animated scenes", "Final video"].map((item) => (
                          <div key={item} className="p-3 rounded-xl bg-purple-500/8 border border-purple-500/15 text-center">
                            <Check className="w-4 h-4 text-green-400 mx-auto mb-1" />
                            <p className="text-white text-xs font-medium">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                },
                {
                  step: "Result",
                  color: "green",
                  dot: "bg-green-500",
                  content: (
                    <div className="p-5 rounded-2xl bg-[#171717] border border-green-500/20">
                      <p className="text-xs text-green-300 font-semibold uppercase tracking-widest mb-3">Ready to publish</p>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-green-900/40 to-black border border-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Play className="w-4 h-4 text-green-300 ml-0.5" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Full 2:45 animated video</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">1080p</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">No watermark</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">YouTube ready</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                },
              ].map((row) => (
                <div key={row.step} className="flex gap-5 md:pl-14 relative">
                  <div className={`absolute left-4 top-6 w-4 h-4 rounded-full ${row.dot} shadow-lg hidden md:block flex-shrink-0`} aria-hidden="true" />
                  <div className="flex-1">{row.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion hook */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-violet-500/8 via-blue-500/5 to-green-500/8 border border-white/8 text-center reveal">
            <p className="text-white font-semibold text-lg mb-1">
              Replace hours of production, editors, animators, and music tools
            </p>
            <p className="text-[#a1a1aa] text-base">
              — all with one platform, starting free.
            </p>
          </div>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 reveal">
            <Button
              className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a href="/onboarding"><Video className="w-4 h-4 mr-2" />Create Your First AI Video</a>
            </Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a href="/music-creator"><Music2 className="w-4 h-4 mr-2" />Generate Your First Song</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

// ── How It Works Modal ───────────────────────────────────────────────────────
function HowItWorksModalButton() {
  return (
    <a
      href="/how-it-works"
      className="inline-flex items-center gap-1.5 text-base px-7 py-3 rounded-xl font-medium border border-white/15 text-white hover:bg-white/5 transition-all"
    >
      <ChevronRight className="w-4 h-4" />See How It Works
    </a>
  );
}



// ── WizBeat showcase ──────────────────────────────────────────────────────────
function WizBeatSection() {
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveImg((prev) => (prev + 1) % WIZBEAT_IMAGES.length), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image carousel */}
          <div className="relative reveal">
            <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl border border-white/8">
              {WIZBEAT_IMAGES.map((img, i) => (
                <img
                  key={img.src}
                  src={img.src}
                  alt={img.label}
                  loading="lazy"
                  decoding="async"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === activeImg ? "opacity-100" : "opacity-0"}`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                {WIZBEAT_IMAGES.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={`Show ${img.label} style`}
                    aria-pressed={i === activeImg}
                    className={`h-1 flex-1 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-white/40 ${i === activeImg ? "bg-white" : "bg-white/25"}`}
                  />
                ))}
              </div>
            </div>
            <div className="absolute -top-3 -right-3 bg-[#171717] border border-white/10 rounded-xl px-3 py-1.5 shadow-lg">
              <span className="text-white text-xs font-semibold">🎵 WizBeat</span>
            </div>
          </div>

          {/* Text */}
          <div className="reveal">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-5">WizBeat</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight">
              Your music.<br />Your story.<br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Brought to life.</span>
            </h2>
            <p className="text-[#a1a1aa] text-base leading-relaxed mb-8">
              WizBeat is the world's first AI music video maker that syncs visuals to your lyrics automatically. Every line becomes a cinematic scene.
            </p>
            <div className="space-y-3 mb-9">
              {[
                "Lyrics drive the visuals — every line becomes a scene",
                "Up to 4 characters with AI lip-sync",
                "Real artists or animated characters",
                "6 cinematic visual styles",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-[#a1a1aa] text-sm">{feat}</span>
                </div>
              ))}
            </div>
            <Button
              className="bg-white text-black hover:bg-white/90 text-sm px-6 py-2.5 rounded-xl font-semibold h-auto shadow-md hover:shadow-lg transition-all"
              asChild
            >
              <a href="/music-video"><Music className="w-4 h-4 mr-2" />Make a music video</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Social proof ──────────────────────────────────────────────────────────────
function SocialProof() {
  const testimonials = [
    { text: "I described the vibe, uploaded my track, and WizBeat had a full storyboard ready in 90 seconds. The cinematic style was exactly what I had in my head. Posted it the same day — no edits needed.", author: "Sarah M.", role: "Indie Artist · 12K YouTube subscribers" },
    { text: "I was spending £280/month on a freelance animator for my kids channel. WizVid replaced that entirely. I now create 3 videos a week, my upload consistency went from twice a month to daily, and my CTR is up 40%.", author: "James K.", role: "Kids Content Creator · 28K subscribers" },
    { text: "Other AI tools give you a 10-second clip. WizVid gave me a complete 3-minute animated music video for my kids channel — scenes, characters, the lot — in under 4 minutes. My kids watch it on repeat.", author: "Priya R.", role: "Kids YouTube Creator · Posts daily using AI" },
    { text: "I started a faceless YouTube channel from scratch. WizVid handled every video — storyboard, scenes, everything. 30 days later I had 4,800 subscribers and my first video hit 11K views. I haven't edited a single frame.", author: "Tom B.", role: "Faceless YouTube Creator · 0 to 4.8K subscribers in 30 days" },
  ];

  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Testimonials</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">What creators are saying</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.author}
              className={`p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/12 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-white/85 text-base leading-relaxed mb-6">"{t.text}"</p>
              <div>
                <div className="font-semibold text-white text-sm">{t.author}</div>
                <div className="text-[#a1a1aa] text-xs mt-0.5">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLOURS: Record<string, { badge: string; glow: string }> = {
  "Kids YouTube":       { badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30", glow: "group-hover:shadow-yellow-500/20" },
  "Music Video":        { badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30", glow: "group-hover:shadow-violet-500/20" },
  "WizBeat":             { badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30", glow: "group-hover:shadow-violet-500/20" },
  "Story Animation":    { badge: "bg-pink-500/20 text-pink-300 border border-pink-500/30",       glow: "group-hover:shadow-pink-500/20" },
  "Faceless Content":   { badge: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",       glow: "group-hover:shadow-cyan-500/20" },
  "Social Short":       { badge: "bg-green-500/20 text-green-300 border border-green-500/30",   glow: "group-hover:shadow-green-500/20" },
  "Cinematic AI Video": { badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30", glow: "group-hover:shadow-orange-500/20" },
};

// ── Individual showcase card ───────────────────────────────────────────────────
function ShowcaseCard({ item }: { item: { id: number; category: string; title: string; description: string; posterUrl: string; videoUrl: string | null } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const colours = CATEGORY_COLOURS[item.category] ?? { badge: "bg-white/10 text-white/70 border border-white/20", glow: "group-hover:shadow-white/10" };

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
      className={`group relative rounded-2xl overflow-hidden bg-[#171717] border border-white/8 hover:border-white/20 transition-all duration-300 shadow-lg ${colours.glow} hover:shadow-xl cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail / video preview */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          width={640}
          height={360}
        />
        {item.videoUrl && (
          <video
            ref={videoRef}
            src={item.videoUrl}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
        )}
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Made with WizVid badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white/70 border border-white/10">
          Made with WizVid
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colours.badge}`}>{item.category}</span>
        </div>
        <h3 className="font-semibold text-white text-base mb-1 leading-snug">{item.title}</h3>
        <p className="text-[#a1a1aa] text-sm leading-relaxed mb-4">{item.description}</p>
        <a
          href="/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors group/cta"
        >
          Create your first video
          <ArrowRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
}

// ── Showcase gallery skeleton ─────────────────────────────────────────────────
function ShowcaseSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-[#171717] border border-white/8 animate-pulse">
          <div className="aspect-video bg-white/5" />
          <div className="p-5 space-y-3">
            <div className="h-4 w-24 bg-white/10 rounded-full" />
            <div className="h-4 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-full bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Made with WizVid (showcase gallery) ──────────────────────────────────────
function MadeWithWizVid() {
  const { data: items, isLoading } = trpc.showcase.list.useQuery();

  return (
    <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">Created with WizVid</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
            Real videos. Real creators.
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">
            Every video below was created using WizVid — no editing, no animators, no studio. Just an idea and a song.
          </p>
        </div>

        <div className="reveal">
          {isLoading ? (
            <ShowcaseSkeleton />
          ) : items && items.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <ShowcaseCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <ShowcaseSkeleton />
          )}
        </div>

        <div className="text-center mt-12 reveal">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create Your First Video — Free
          </a>
        </div>
      </div>
    </section>
  );
}
// ── Mid-page punch line ────────────────────────────────────────────────────────────
function PunchLine() {
  return (
    <section className="py-20 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-4xl mx-auto text-center reveal">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          No editing.
          <span className="text-[#a1a1aa]"> No complexity.</span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Just results.</span>
        </h2>
      </div>
    </section>
  );
}

// ── Value Clarity Pricing Block ─────────────────────────────────────────────
function HomePricing() {
  return (
    <section className="py-20 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-4xl mx-auto reveal">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Create videos from{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              £1–£2 per minute
            </span>
          </h2>
          <p className="text-[#a1a1aa] max-w-lg mx-auto">
            Storyboard generation is always free. Credits only deduct when you render your final video.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {([
            { name: "Starter", price: "£9", period: "/mo", annual: "£79/yr", saving: "save £29", desc: "5 min · 720p · Watermark", highlight: false },
            { name: "Creator", price: "£29", period: "/mo", annual: "£232/yr", saving: "save £116", desc: "20 min · 1080p · No watermark", highlight: true },
            { name: "Studio", price: "£99", period: "/mo", annual: "£792/yr", saving: "save £396", desc: "60 min · 4K · Full cinematic", highlight: false },
          ] as const).map((plan) => (
            <a
              key={plan.name}
              href="/pricing"
              className={`block rounded-2xl border p-5 transition-all duration-200 hover:scale-[1.02] ${
                plan.highlight
                  ? "border-violet-500/50 bg-violet-500/8 shadow-lg shadow-violet-500/10"
                  : "border-white/8 bg-white/3 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-base">{plan.name}</span>
                {plan.highlight && (
                  <span className="text-xs font-semibold text-violet-400 bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 rounded-full">
                    Most popular
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                <span className="text-[#a1a1aa] text-sm">{plan.period}</span>
              </div>
              <p className="text-xs text-[#a1a1aa] mb-1">
                {plan.annual}{" "}
                <span className="text-green-400 font-semibold">({plan.saving})</span>
              </p>
              <p className="text-xs text-[#a1a1aa]/70 mt-2">{plan.desc}</p>
            </a>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-green-400 font-medium mb-4">
            ✓ Annual billing gives you 2 months free — most creators save £116/year on Creator
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white border border-white/15 rounded-xl px-5 py-2.5 hover:bg-white/5 transition-all"
          >
            See full pricing &amp; compare plans →
          </a>
        </div>
      </div>
    </section>
  );
}

// ── CTA ────────────────────────────────────────────────────────────────────────────────
function CTAPush() {
  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-3xl mx-auto text-center reveal">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
          Your first video is free.
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Start in 60 seconds.</span>
        </h2>
        <p className="text-[#a1a1aa] text-lg mb-10 max-w-xl mx-auto">
          No editing. No experience. Just describe your idea and WizVid creates the full video — storyboard, scenes, and final render.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <Button
            className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
            asChild
          >
            <a href="/onboarding"><Sparkles className="w-4 h-4 mr-2" />Create Your First Video</a>
          </Button>
          <Button
            variant="outline"
            className="border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-8 py-3 rounded-xl font-medium h-auto"
            asChild
          >
            <a href="/pricing">View pricing</a>
          </Button>
        </div>
        <p className="text-[#a1a1aa] text-sm">Free to start · No credit card · 2 free videos included</p>
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
        { label: "Music Video", href: "/music-video" },
        { label: "WizPilot", href: "/wizpilot" },
        { label: "Pricing", href: "/pricing" },
        { label: "Help", href: "/help" },
      ],
    },
    {
      title: "Use cases",
      links: [
        { label: "AI Music Video Generator", href: "/seo/ai-music-video-generator" },
        { label: "AI Video for YouTube", href: "/seo/ai-video-generator-for-youtube" },
        { label: "AI Kids Video Generator", href: "/seo/ai-kids-video-generator" },
        { label: "AI Animation Maker", href: "/seo/ai-animation-video-maker" },
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
              <img src={WIZVID_LOGO_FOOTER} alt="WizVid" width={127} height={72} className="h-9 w-auto object-contain" />
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
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-[#a1a1aa] hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </a>
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
            <p>© 2026 WizVid. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/refunds" className="hover:text-white transition-colors">Refund Policy</a>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-[#a1a1aa]/50 tracking-widest uppercase">
              Powered by{" "}
              <a
                href="https://www.wizvid.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#a1a1aa]/70 hover:text-white transition-colors font-medium"
              >
                WizVid Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
        <Hero />
        <ImmediateValue />
        <ProductDemo />
        <WhyWizVid />
        <Features />
        <ContentEngine />
        <WhoItsFor />
        <WizBeatSection />
        <MadeWithWizVid />
      <SocialProof />
        <PunchLine />
        <HomePricing />
        <CTAPush />
      </main>
      <Footer />
    </div>
  );
}
