import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sparkles, Music, Zap, Star, Play, Check, ArrowRight,
  Menu, X, Volume2, VolumeX, Film, Wand2, Users
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO = `${CDN}/wizvid-logo_9bec645c.jpg`;
const WIZVID_LOGO_VIDEO = `${CDN}/wizvid-logo-intro_184d3e7d.mp4`;
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
  { label: "Abstract", img: `${CDN}/style-abstract-E9NdxWuFeAHfGRiGpsbW9Y.webp` },
  { label: "Vintage", img: `${CDN}/style-vintage-iCZFjq9buUWkDWVxu3J7Qy.webp` },
];

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
    { label: "WizBeat", href: "/music-video" },
    { label: "WizPilot", href: "/wizpilot" },
    { label: "Tools", href: "/dashboard" },
    { label: "Pricing", href: "/pricing" },
    { label: "Help", href: "/help" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <img
            src={WIZVID_LOGO}
            alt="WizVid"
            className="w-10 h-10 rounded-xl object-cover group-hover:scale-105 transition-transform"
            style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.5))" }}
          />
          <span className="font-black text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
            WizVid
          </span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
          {isAuthenticated ? (
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm px-5 rounded-xl font-semibold" asChild>
              <a href="/dashboard"><Sparkles className="w-4 h-4 mr-1.5" />Dashboard</a>
            </Button>
          ) : (
            <>
              <a href={getLoginUrl()} className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors font-medium">
                Sign In
              </a>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm px-5 rounded-xl font-semibold shadow-lg shadow-pink-500/20" asChild>
                <a href="/onboarding">Start Free</a>
              </Button>
            </>
          )}
          <button className="md:hidden p-2 text-white/70 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle mobile menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-4">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="block py-3 text-white/80 hover:text-white font-medium border-b border-white/5" onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="pt-4 flex gap-3">
            <a href={getLoginUrl()} className="flex-1 text-center py-3 text-white/60 border border-white/20 rounded-xl text-sm">Sign In</a>
            <a href="/onboarding" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm">Start Free</Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {HERO_VIDEOS.map((src, i) => (
        <video key={src} src={src} autoPlay loop muted playsInline
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${i === currentBg ? "opacity-40" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#080810]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-20">
        <div className="relative inline-block mb-8 group cursor-pointer" onClick={handleLogoClick}>
          {/* Glow ring behind the box */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 blur-2xl scale-110 opacity-60" aria-hidden="true" />
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/40 ring-2 ring-purple-500/40 group-hover:ring-purple-400/70 transition-all">
            <video
              ref={logoVideoRef}
              src={WIZVID_LOGO_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
              aria-label="WizVid animated logo"
            />
          </div>
          <div className="absolute -bottom-3 -right-3 w-9 h-9 rounded-full bg-purple-600 border-2 border-black flex items-center justify-center shadow-lg">
            {logoMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 px-4 py-1.5 text-sm font-semibold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />AI-Powered Video Creation
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-tight mb-6">
          <span className="text-white">Create AI Music Videos</span>
          <br />
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            &amp; Animations in Minutes
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-4 leading-relaxed">
          Turn your ideas or audio into fully animated videos instantly — no editing, no experience needed.
        </p>
        <p className="text-base text-pink-300/80 font-semibold mb-10">✨ From idea → full video in seconds</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-lg px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-pink-500/30 hover:scale-105 transition-all w-full sm:w-auto h-auto" asChild>
            <a href="/onboarding"><Sparkles className="w-5 h-5 mr-2" />Create Your First Video</a>
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4 rounded-2xl font-semibold w-full sm:w-auto bg-white/5 backdrop-blur-sm h-auto" asChild>
            <a href="/music-video"><Play className="w-5 h-5 mr-2" />Watch Demo</a>
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm">
          {[
            { icon: "🎬", label: "10,000+ Videos Created" },
            { icon: "✂️", label: "No Editing Required" },
            { icon: "🎨", label: "6 AI Video Styles" },
            { icon: "⚡", label: "Done in Minutes" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 text-white/60">
              <span>{stat.icon}</span><span className="font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
          <div className="w-1 h-3 bg-white/40 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function FullVideosSection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-[#080810] to-[#0d0d1a]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30">
              <Film className="w-3.5 h-3.5 mr-1.5" />Full Video Creation
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Create full videos…<br />
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">not just clips</span>
            </h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              Most AI tools edit content. <strong className="text-white">WizVid creates it from scratch.</strong>
            </p>
            <div className="space-y-4 mb-10">
              {[
                { icon: "🎵", text: "Turn songs into full music videos" },
                { icon: "🎬", text: "Generate animated scenes automatically" },
                { icon: "🤖", text: "AI handles everything — storyboard to final cut" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-white/80">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold h-auto py-3" asChild>
                <a href="/music-video">🎵 WizBeat</a>
              </Button>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold h-auto py-3" asChild>
                <a href="/wizpilot">🎬 WizPilot</a>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STYLE_IMAGES.slice(0, 4).map((style) => (
              <div key={style.label} className="relative rounded-2xl overflow-hidden aspect-video group cursor-pointer">
                <img src={style.img} alt={style.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">{style.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const audiences = [
    { emoji: "🎤", title: "Musicians", desc: "Create music videos instantly — no director, no studio, no budget needed.", cta: "Make a Music Video", href: "/music-video", gradient: "from-pink-500/20 to-purple-500/20", border: "border-pink-500/20 hover:border-pink-500/40" },
    { emoji: "🎥", title: "YouTubers", desc: "Boost CTR with AI animation. Stand out in a crowded feed. Create full YouTube videos without editing.", cta: "Create YouTube Content", href: "/wizpilot", gradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20 hover:border-blue-500/40" },
    { emoji: "🤖", title: "AI Creators", desc: "Automate your content pipeline. Scale without limits. Generate 30 videos a month without lifting a finger.", cta: "Start Automating", href: "/wizpilot", gradient: "from-green-500/20 to-emerald-500/20", border: "border-green-500/20 hover:border-green-500/40" },
    { emoji: "🧒", title: "Kids Content Creators", desc: "Perfect for animated channels, nursery rhymes, and family content. Safe, fun, and fully automated.", cta: "Create Kids Content", href: "/seo/ai-kids-video-generator", gradient: "from-yellow-500/20 to-orange-500/20", border: "border-yellow-500/20 hover:border-yellow-500/40" },
  ];

  return (
    <section className="py-24 px-4 bg-[#0d0d1a]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
            <Users className="w-3.5 h-3.5 mr-1.5" />Built for Creators
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Built for creators like you</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">Whether you're a musician, YouTuber, or kids content creator — WizVid is your AI video studio.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {audiences.map((a) => (
            <div key={a.title} className={`p-8 rounded-3xl bg-gradient-to-br ${a.gradient} border ${a.border} transition-all`}>
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{a.emoji}</div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{a.title}</h3>
                  <p className="text-white/60 leading-relaxed">{a.desc}</p>
                </div>
              </div>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 text-sm mt-2 bg-transparent" asChild>
                <a href={a.href}>{a.cta} <ArrowRight className="w-4 h-4 ml-2" /></a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyWizVid() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-[#0d0d1a] to-[#080810]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-pink-500/20 text-pink-300 border-pink-500/30">
            <Zap className="w-3.5 h-3.5 mr-1.5" />Why WizVid
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black mb-6">Why WizVid?</h2>
          <div className="inline-block bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl px-8 py-4 mb-6">
            <p className="text-xl font-bold text-pink-300">"Create full AI music videos — not just clips"</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "⚡", title: "Fully Automated", desc: "From idea to finished video — AI handles every step." },
            { icon: "🎨", title: "Built for Animation + Music", desc: "Not an editing tool. A creation engine." },
            { icon: "🧠", title: "No Learning Curve", desc: "If you can describe it, WizVid can create it." },
            { icon: "🚀", title: "Faster Than Any Workflow", desc: "What used to take days now takes minutes." },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all text-center">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-24 px-4 bg-[#080810]">
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-6 bg-green-500/20 text-green-300 border-green-500/30">
          <Wand2 className="w-3.5 h-3.5 mr-1.5" />Simple Process
        </Badge>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Create your video in 3 simple steps</h2>
        <p className="text-white/50 text-lg mb-16">Done in minutes. No editing required.</p>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {[
            { step: "01", icon: "🎵", title: "Upload your audio or idea", desc: "Drop in your song, describe your concept, or let AI generate the music with Suno." },
            { step: "02", icon: "🎨", title: "Choose your style", desc: "Pick from Cinematic, Anime, Pixar 3D, Documentary, Abstract, or Vintage." },
            { step: "03", icon: "🚀", title: "Let WizVid generate your video", desc: "AI builds your storyboard, renders every scene, and delivers a complete video." },
          ].map((step) => (
            <div key={step.step} className="p-8 rounded-3xl bg-gradient-to-b from-white/8 to-white/3 border border-white/10 hover:border-purple-500/30 transition-all">
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="text-purple-400 font-black text-sm mb-2 tracking-widest">STEP {step.step}</div>
              <h3 className="font-bold text-lg mb-3">{step.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
        <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-lg px-10 py-4 rounded-2xl font-bold shadow-2xl shadow-pink-500/20 hover:scale-105 transition-all h-auto" asChild>
          <a href="/onboarding"><Sparkles className="w-5 h-5 mr-2" />Create Your First Video</a>
        </Button>
      </div>
    </section>
  );
}

function WizBeatSection() {
  const [activeImg, setActiveImg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveImg((p) => (p + 1) % WIZBEAT_IMAGES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-[#080810] to-[#0d0820]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-video shadow-2xl shadow-purple-500/20 ring-1 ring-purple-500/20">
              {WIZBEAT_IMAGES.map((img, i) => (
                <img key={img.src} src={img.src} alt={img.label}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === activeImg ? "opacity-100" : "opacity-0"}`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                {WIZBEAT_IMAGES.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    aria-label={`Show ${img.label} style`}
                    aria-pressed={i === activeImg}
                    className={`h-1 flex-1 rounded-full transition-all ${i === activeImg ? "bg-pink-400" : "bg-white/30"}`}
                  />
                ))}
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl px-4 py-2 shadow-xl">
              <span className="text-white font-bold text-sm">🎵 WizBeat</span>
            </div>
          </div>
          <div>
            <Badge className="mb-6 bg-pink-500/20 text-pink-300 border-pink-500/30">
              <Music className="w-3.5 h-3.5 mr-1.5" />WizBeat Music Video Maker
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Your Music.<br />Your Story.<br />
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Brought to Life.</span>
            </h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              WizBeat is the world's first AI music video maker that syncs visuals to your lyrics automatically. Every line becomes a cinematic scene.
            </p>
            <div className="space-y-3 mb-10">
              {[
                "🎵 Lyrics drive the visuals — every line becomes a scene",
                "👥 Up to 4 characters with AI lip-sync",
                "🐕 Real artists or animated characters (dogs, cats, anything!)",
                "🎨 6 cinematic visual styles to choose from",
                "🤖 Suno AI music generation built in",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80 text-sm">{feat}</span>
                </div>
              ))}
            </div>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-pink-500/20 h-auto" asChild>
              <a href="/music-video"><Music className="w-5 h-5 mr-2" />Make a Music Video</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const testimonials = [
    { text: "This saved me HOURS of editing. My music video looks incredible.", author: "Sarah M.", role: "Indie Artist" },
    { text: "Game changer for my YouTube channel. My CTR doubled in a week.", author: "James K.", role: "YouTuber, 50K subs" },
    { text: "Finally an AI that actually creates videos, not just edits them.", author: "Priya R.", role: "AI Content Creator" },
    { text: "My kids channel went from 0 to 5K subscribers using WizVid animations.", author: "Tom B.", role: "Kids Content Creator" },
  ];
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-[#0d0820] to-[#080810]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Star className="w-3.5 h-3.5 mr-1.5" />Social Proof
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Trusted by creators worldwide</h2>
          <div className="flex flex-wrap justify-center gap-8 mt-8 mb-12">
            {[
              { num: "10,000+", label: "Videos Created" },
              { num: "1,000+", label: "Active Creators" },
              { num: "4.9★", label: "Average Rating" },
              { num: "< 5 min", label: "Average Creation Time" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">{stat.num}</div>
                <div className="text-white/50 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div key={t.author} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/20 transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-white/80 text-lg leading-relaxed mb-6 italic">"{t.text}"</p>
              <div>
                <div className="font-bold text-white">{t.author}</div>
                <div className="text-white/40 text-sm">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAPush() {
  return (
    <section className="py-24 px-4 bg-[#080810]">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
          <div className="relative z-10">
            <div className="text-5xl mb-6">🎬</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Create Your First Video Now</h2>
            <p className="text-white/60 text-xl mb-8 max-w-xl mx-auto">Join 1,000+ creators already making AI videos with WizVid. No editing skills needed.</p>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xl px-12 py-5 rounded-2xl font-black shadow-2xl shadow-pink-500/30 hover:scale-105 transition-all h-auto" asChild>
              <a href="/onboarding"><Sparkles className="w-6 h-6 mr-2" />Create Your First AI Video</a>
            </Button>
            <p className="text-white/30 text-sm mt-6">✓ No editing skills needed · ✓ Create videos in minutes · ✓ Cancel anytime</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandAngle() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-[#080810] to-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5" />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="text-6xl mb-6">✨</div>
        <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Turn ideas into reality</h2>
        <p className="text-white/60 text-xl mb-4 leading-relaxed max-w-2xl mx-auto">
          WizVid transforms ideas, audio, and concepts into fully animated videos. Magic. Transformation. Creation.
        </p>
        <p className="text-pink-300 font-bold text-lg mb-10">
          "From idea to video instantly" · "Create, don't edit" · "Turn sound into story"
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all h-auto" asChild>
            <a href="/onboarding"><Sparkles className="w-5 h-5 mr-2" />Start Creating Free</a>
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent px-8 py-4 rounded-2xl font-semibold text-lg h-auto" asChild>
            <a href="/pricing">View Pricing</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = [
    { title: "Product", links: [{ label: "WizBeat", href: "/music-video" }, { label: "WizPilot", href: "/wizpilot" }, { label: "Tools", href: "/dashboard" }, { label: "Pricing", href: "/pricing" }] },
    { title: "Use Cases", links: [{ label: "AI Music Video Generator", href: "/seo/ai-music-video-generator" }, { label: "AI Video for YouTube", href: "/seo/ai-video-generator-for-youtube" }, { label: "AI Kids Video Generator", href: "/seo/ai-kids-video-generator" }, { label: "AI Animation Maker", href: "/seo/ai-animation-video-maker" }] },
    { title: "Support", links: [{ label: "Help Centre", href: "/help" }, { label: "Contact", href: "mailto:support@wizvid.ai" }] },
  ];

  return (
    <footer className="bg-black border-t border-white/10 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={WIZVID_LOGO} alt="WizVid" className="w-10 h-10 rounded-xl object-cover" />
              <span className="font-black text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">WizVid</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-4">AI Music Video Generator — Create full videos in minutes. No editing needed.</p>
            <p className="text-white/30 text-xs">support@wizvid.ai</p>
          </div>
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-white/80 mb-4 text-sm uppercase tracking-wider">{section.title}</h4>
              <div className="space-y-3">
                {section.links.map((link) => (
                  <a key={link.label} href={link.href} className="block text-white/40 hover:text-white/70 text-sm transition-colors">{link.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-8 mb-8">
          <p className="text-white/20 text-xs leading-relaxed max-w-4xl">
            WizVid is an advanced AI music video generator that allows you to create music videos and animated content in minutes. Whether you're a YouTube creator, musician, or content creator, WizVid helps you turn audio, ideas, or text into fully animated videos without any editing experience.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-white/30">
          <p>© 2025 WizVid. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white/50 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white/50 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="bg-[#080810] text-white min-h-screen overflow-x-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:font-semibold">Skip to main content</a>
      <Nav />
      <main id="main-content">
      <Hero />
      <FullVideosSection />
      <WhoItsFor />
      <WhyWizVid />
      <HowItWorks />
      <WizBeatSection />
      <SocialProof />
      <CTAPush />
      <BrandAngle />
      </main>
      <Footer />
    </div>
  );
}
