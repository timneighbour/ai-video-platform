import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sparkles, Music, Zap, Star, Play, Check, ArrowRight,
  Menu, X, Volume2, VolumeX, Film, Wand2, Users, ChevronRight
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-v2_02b60663.png"; // v2 logo
const WIZVID_LOGO_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-icon_0f4f3569.png";
const WIZVID_LOGO_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-animation-v3_85969477.mp4";
const HERO_VIDEOS = [
  `${CDN}/hero-nightclub-web_3a88ea3e.mp4`,
  `${CDN}/hero-abstract-web_ed099aea.mp4`,
  `${CDN}/hero-concert-web_2f9db1a6.mp4`,
];
const WIZBEAT_IMAGES = [
  { src: `${CDN}/wizbeat-artist-band_04b2adbf.jpg`, label: "Indie Band" },
  { src: `${CDN}/wizbeat-animated-dog_8d12b77c.jpg`, label: "Animated Character" },
  { src: `${CDN}/wizbeat-animated-cat_81ffcf80.jpg`, label: "Animated Singer" },
  { src: `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`, label: "Solo Artist" },
  { src: `${CDN}/wizbeat-hip-hop_247e7ea6.jpg`, label: "Hip-Hop Artist" },
];
const STYLE_IMAGES = [
  { label: "Cinematic", img: `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp` },
  { label: "Anime", img: `${CDN}/style-anime-bCLhyWeYo6mek5pWMnEUV7.webp` },
  { label: "Pixar 3D", img: `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp` },
  { label: "Documentary", img: `${CDN}/style-documentary-nyjoHJnTHZU2hdjABnnjBm.webp` },
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
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Music Video", href: "/music-video" },
    { label: "WizPilot", href: "/wizpilot" },
    { label: "Pricing", href: "/pricing" },
    { label: "Help", href: "/help" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8 shadow-lg" : "bg-transparent"
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center group">
          <img
            src={WIZVID_LOGO_FULL}
            alt="WizVid"
            className="h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-white rounded-lg transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <LanguageSelector />
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
                <a href="/onboarding"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Create video</a>
              </Button>
            </>
          )}
          <button
            className="md:hidden p-2 text-[#a1a1aa] hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0f0f0f]/98 backdrop-blur-xl border-t border-white/8 px-6 py-5">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-[#a1a1aa] hover:text-white font-medium border-b border-white/5 text-sm"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-5 flex gap-3">
            <a href={getLoginUrl()} className="flex-1 text-center py-2.5 text-[#a1a1aa] border border-white/15 rounded-xl text-sm font-medium">Sign in</a>
            <a href="/onboarding" className="flex-1">
              <Button className="w-full bg-white text-black rounded-xl text-sm font-semibold h-10">Create video</Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const logoVideoRef = useRef<HTMLVideoElement>(null);
  const [logoMuted, setLogoMuted] = useState(true);
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentBg((prev) => (prev + 1) % HERO_VIDEOS.length), 8000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoClick = () => {
    if (!logoVideoRef.current) return;
    const newMuted = !logoMuted;
    setLogoMuted(newMuted);
    logoVideoRef.current.muted = newMuted;
    if (!newMuted) logoVideoRef.current.play();
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0f0f0f]">
      {/* Background videos */}
      {HERO_VIDEOS.map((src, i) => (
        <video key={src} src={src} autoPlay loop muted playsInline preload="none"
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${i === currentBg ? "opacity-20" : "opacity-0"}`}
        />
      ))}
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/80 to-[#0f0f0f]/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f]/60 via-transparent to-[#0f0f0f]" />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-10 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-[#a1a1aa] mb-8 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Create daily content without editing, animators, or delays
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 text-white">
              Your song. Your story.<br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                A full video in minutes.
              </span>
            </h1>

            <p className="text-lg text-[#a1a1aa] leading-relaxed mb-8 max-w-lg">
              Upload your audio, describe your vision, and WizVid generates a complete scene-by-scene video — synced to your lyrics, no editing required.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Button
                className="bg-white text-black hover:bg-white/90 text-base px-7 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                asChild
              >
                <a href="/onboarding"><Sparkles className="w-4 h-4 mr-2" />Start Creating Free</a>
              </Button>
              <Button
                variant="outline"
                className="border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-7 py-3 rounded-xl font-medium h-auto"
                asChild
              >
                <a href="/pricing"><ChevronRight className="w-4 h-4 mr-1" />Try WizVid Free</a>
              </Button>
            </div>

            <p className="text-sm text-[#a1a1aa] mb-3">Free to start · No credit card · 2 free videos included</p>
            <p className="text-xs text-[#a1a1aa]/70 mb-8">Used by creators to grow YouTube channels and content pages</p>
          </div>

          {/* Right: logo video — large cinematic */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative cursor-pointer group w-full" onClick={handleLogoClick}>
              {/* Outer ambient glow — large and dramatic */}
              <div className="absolute -inset-8 bg-gradient-to-br from-purple-600/30 via-violet-500/20 to-blue-600/25 rounded-[2rem] blur-3xl opacity-80 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
              <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/15 to-blue-500/10 rounded-[2rem] blur-xl opacity-60" aria-hidden="true" />
              {/* Video container — full-width 16:9 */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/12 shadow-[0_0_80px_rgba(139,92,246,0.25)] group-hover:shadow-[0_0_120px_rgba(139,92,246,0.4)] group-hover:border-purple-500/40 transition-all duration-500">
                <video
                  ref={logoVideoRef}
                  src={WIZVID_LOGO_VIDEO}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                  aria-label="WizVid animated logo"
                >
                  <track kind="captions" srcLang="en" label="English" default />
                </video>
              </div>
              {/* Mute toggle */}
              <button
                className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 flex items-center justify-center shadow-lg hover:bg-white/10 transition-colors"
                aria-label={logoMuted ? "Unmute logo video" : "Mute logo video"}
                onClick={(e) => { e.stopPropagation(); handleLogoClick(); }}
              >
                {logoMuted ? <VolumeX className="w-3.5 h-3.5 text-[#a1a1aa]" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Prompt → Video transformation block */}
        <div className="mt-14 p-6 rounded-2xl bg-white/3 border border-white/8 reveal">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4 text-center">🎬 Example transformation</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 p-4 rounded-xl bg-[#171717] border border-white/8">
              <p className="text-xs text-[#a1a1aa] uppercase tracking-widest mb-2 font-semibold">Prompt</p>
              <p className="text-white font-medium">"Kids pirate adventure song"</p>
            </div>
            <div className="flex-shrink-0 text-2xl text-[#a1a1aa]">→</div>
            <div className="flex-1 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs text-violet-300 uppercase tracking-widest mb-2 font-semibold">Result</p>
              <p className="text-white font-medium">Full animated video in under 2 minutes</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">✓ Scenes</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">✓ Characters</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">✓ Storytelling</span>
              </div>
            </div>
          </div>
        </div>
        {/* Trust row */}
        <div className="mt-16 pt-10 border-t border-white/8 flex flex-wrap gap-8 md:gap-16">
          {[
            { num: "< 5 min", label: "Average creation time" },
            { num: "Full videos", label: "Not just clips — complete, ready-to-post" },
            { num: "Free", label: "Start with no card required" },
            { num: "Early access", label: "Used by early creators" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.num}</div>
              <div className="text-sm text-[#a1a1aa] mt-0.5">{stat.label}</div>
            </div>
          ))}
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
          <div className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Ready to export</div>
          <div className="relative rounded-xl overflow-hidden bg-[#0f0f0f] border border-white/8 aspect-video flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-blue-900/20 to-black" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
              <span className="text-white text-sm font-medium">Full 3-minute video</span>
              <span className="text-[#a1a1aa] text-xs">1080p · Cinematic style · Ready in 4 min</span>
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
    { icon: "🚫", title: "No editing required", desc: "WizVid handles everything from storyboard to final cut. You never touch a timeline." },
    { icon: "🎬", title: "Create full videos, not clips", desc: "Most AI tools generate 10-second clips. WizVid creates complete, ready-to-publish videos." },
    { icon: "🤖", title: "AI does everything for you", desc: "Upload your audio or idea. AI writes the storyboard, renders every scene, and delivers your video." },
    { icon: "📺", title: "Built for YouTube, music & kids content", desc: "Optimised for the formats that matter — music videos, YouTube intros, and animated kids content." },
  ];

  return (
    <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Why WizVid</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Why creators use WizVid
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`flex gap-5 p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}
            >
              <div className="text-3xl flex-shrink-0">{r.icon}</div>
              <div>
                <h3 className="font-semibold text-white mb-2">{r.title}</h3>
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
    { emoji: "🎤", title: "Musicians", desc: "Create music videos instantly — no director, no studio, no budget needed.", cta: "Make a music video", href: "/music-video" },
    { emoji: "🎥", title: "YouTubers", desc: "Boost CTR with AI animation. Stand out in a crowded feed without editing.", cta: "Create YouTube content", href: "/wizpilot" },
    { emoji: "🤖", title: "AI Creators", desc: "Automate your content pipeline. Scale to 30+ videos a month without lifting a finger.", cta: "Start automating", href: "/wizpilot" },
    { emoji: "🧒", title: "Kids Content Creators", desc: "Safe, fun, fully automated. Perfect for animated channels and family content.", cta: "Create kids content", href: "/seo/ai-kids-video-generator" },
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
              className={`group p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}
            >
              <div className="text-3xl mb-4">{a.emoji}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{a.title}</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed mb-5">{a.desc}</p>
              <a href={a.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors">
                {a.cta} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">Three steps to your video</h2>
          <p className="text-[#a1a1aa] text-lg max-w-lg mx-auto">Done in minutes. No editing required.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: "01", icon: "🎵", title: "Upload your audio or idea", desc: "Drop in your song, describe your concept, or let AI generate the music." },
            { step: "02", icon: "🎨", title: "Choose your style", desc: "Pick from Cinematic, Anime, Pixar 3D, Documentary, Abstract, or Vintage." },
            { step: "03", icon: "🚀", title: "WizVid generates your video", desc: "AI builds your storyboard, renders every scene, and delivers a complete video." },
          ].map((step, i) => (
            <div
              key={step.step}
              className={`p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all card-hover reveal animate-delay-${(i + 1) * 100}`}
            >
              <div className="text-4xl mb-5">{step.icon}</div>
              <div className="text-xs font-bold text-[#a1a1aa] tracking-widest mb-3">STEP {step.step}</div>
              <h3 className="font-semibold text-white text-base mb-2">{step.title}</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12 reveal">
          <Button
            className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
            asChild
          >
            <a href="/onboarding"><Sparkles className="w-4 h-4 mr-2" />Create your first video</a>
          </Button>
        </div>
      </div>
    </section>
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
    { text: "I posted my first AI music video on a Friday. By Sunday it had 4,200 views. WizBeat nailed the cinematic style I described — I didn't touch a single edit.", author: "Sarah M.", role: "Indie Artist · 12K YouTube subscribers" },
    { text: "I run a kids channel and was spending £300/month on animators. Now I create 3 videos a week with WizVid for a fraction of the cost. My CTR doubled in 7 days on my kids YouTube channel.", author: "James K.", role: "Kids Content Creator · 28K subscribers" },
    { text: "Finally an AI that creates full videos, not just 10-second clips. I described a pirate adventure story and got a complete animated video back in under 3 minutes.", author: "Priya R.", role: "YouTube Creator · Posts daily using AI" },
    { text: "I went from zero content to posting daily in one week. WizVid handles the storyboard, the scenes, everything. My audience grew by 800 subscribers in the first month.", author: "Tom B.", role: "AI Content Creator · 5K new subscribers in 30 days" },
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

// ── Made with WizVid ─────────────────────────────────────────────────────────
function MadeWithWizVid() {
  const examples = [
    { type: "YouTube Video", label: "Kids Channel", result: "Posts 3 videos/week using AI", icon: "🎥", color: "border-blue-500/30 bg-blue-500/5", badge: "bg-blue-500/20 text-blue-300" },
    { type: "Music Video", label: "Indie Artist", result: "4,200 views on first AI video", icon: "🎵", color: "border-violet-500/30 bg-violet-500/5", badge: "bg-violet-500/20 text-violet-300" },
    { type: "Story Video", label: "Animated Content", result: "800 new subscribers in 30 days", icon: "✨", color: "border-pink-500/30 bg-pink-500/5", badge: "bg-pink-500/20 text-pink-300" },
    { type: "YouTube Video", label: "Daily Creator", result: "Posts daily without editing", icon: "📺", color: "border-green-500/30 bg-green-500/5", badge: "bg-green-500/20 text-green-300" },
    { type: "Music Video", label: "Band Showcase", result: "Cinematic style, zero editing", icon: "🎸", color: "border-orange-500/30 bg-orange-500/5", badge: "bg-orange-500/20 text-orange-300" },
    { type: "Kids Video", label: "Nursery Rhymes", result: "Pixar-style animation, 2 min creation", icon: "🧸", color: "border-yellow-500/30 bg-yellow-500/5", badge: "bg-yellow-500/20 text-yellow-300" },
  ];
  return (
    <section className="py-24 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 reveal">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Real results</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
            See what creators are making with WizVid
          </h2>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto">
            Used by creators to grow YouTube channels and content pages — without editing, animators, or delays.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 reveal">
          {examples.map((ex, i) => (
            <div
              key={ex.label}
              className={`p-6 rounded-2xl border ${ex.color} hover:border-white/20 transition-all card-hover animate-delay-${(i + 1) * 100}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{ex.icon}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ex.badge}`}>{ex.type}</span>
              </div>
              <h3 className="font-semibold text-white mb-1">{ex.label}</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">{ex.result}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10 reveal">
          <a href="/onboarding" className="inline-flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm font-medium transition-colors">
            Start creating for free <span>→</span>
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

// ── CTA ────────────────────────────────────────────────────────────────────────────────
function CTAPush() {
  return (
    <section className="py-28 px-6 bg-[#0f0f0f] border-t border-white/6">
      <div className="max-w-3xl mx-auto text-center reveal">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
          Start creating today
        </h2>
        <p className="text-[#a1a1aa] text-lg mb-10 max-w-xl mx-auto">
          Creators are already generating full videos with WizVid. Join them — no editing needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <Button
            className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
            asChild
          >
            <a href="/onboarding"><Sparkles className="w-4 h-4 mr-2" />Start Creating Free</a>
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
              <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-9 w-auto object-contain" />
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
            <p>© 2025 WizVid. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            </div>
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
        <ProductDemo />
        <WhyWizVid />
        <Features />
        <WhoItsFor />
        <HowItWorks />
        <WizBeatSection />
        <MadeWithWizVid />
      <SocialProof />
        <PunchLine />
        <CTAPush />
      </main>
      <Footer />
    </div>
  );
}
