import { WIZVIDEO_STUDIO_PAGE, WIZSCRIPT_STUDIO_PAGE } from "@/lib/routes";
import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import BackButton from "@/components/BackButton";
import AuthGate from "@/components/AuthGate";
import { Music, Check, Play, Sparkles, Zap, Film, Wand2, ChevronRight } from "@/lib/icons";
import { useLocation, Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import ShowcaseVideoSection from "@/components/ShowcaseVideoSection";

const CDN = "/manus-storage";

const _SC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
// Static fallback showcase items for music video page (replaced by DB items when available)
const MUSIC_VIDEO_SHOWCASE = [
  {
    id: 30002,
    title: "Stage Performance — Music Video Style",
    category: "Music Video",
    posterUrl: `${_SC}/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp`,
    videoUrl: `${_SC}/showcase-music-video_19324f13.mp4`,
    description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created from an uploaded track.",
  },
  {
    id: 30001,
    title: "Midnight City — Cinematic Style",
    category: "Cinematic AI Video",
    posterUrl: `${_SC}/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp`,
    videoUrl: `${_SC}/showcase-cinematic_13667434.mp4`,
    description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt.",
  },
  {
    id: 30003,
    title: "Star Quest — Kids Channel Intro",
    category: "Animation",
    posterUrl: `${_SC}/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp`,
    videoUrl: `${_SC}/showcase-kids_d49d86f8.mp4`,
    description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description and theme prompt.",
  },
];
const WIZAI_LOGO = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";
const WIZBEAT_IMAGES = [
  { src: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizbeat-indie-band-QBYx42tgc36NweRhP46fgT.webp", label: "Indie Band" },
  { src: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizbeat-animated-character-823E4h8WJbEtFk57ZoVx2s.webp", label: "Animated Character" },
  { src: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizbeat-animated-singer-4kJyYS5GdBHbMgKUwbCW2N.webp", label: "Animated Singer" },
  { src: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizbeat-solo-artist-69wuFH2c7cPuMbew5JjSjJ.webp", label: "Solo Artist" },
];

export default function MusicVideosLanding() {
  useSEO({ title: "AI Music Video Director — WIZ AI", path: "/music-video", description: "AI-directed music video production software with director-level control. Set the scene, direct every shot, control lip sync and character consistency — then build a cinematic music video that is entirely yours." });
  const { isAuthenticated } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);

  const handleCTA = () => {
    if (isAuthenticated) {
      window.location.href = WIZVIDEO_STUDIO_PAGE;
    } else {
      setShowAuthGate(true);
    }
  };

  // – onMouseDown fires BEFORE Chrome extensions can intercept onClick
  const handleCTAMouseDown = () => {
    if (isAuthenticated) {
      window.location.href = WIZVIDEO_STUDIO_PAGE;
    }
    // For unauthenticated: let onClick handle the auth gate modal
  };

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Auth Gate Modal */}
      <AuthGate
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        featureName="create your music video"
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back to Home" />
            <NavLink href="/" className="hidden md:flex items-center">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[7.3rem] w-auto object-contain transition-all duration-300 hover:scale-105 hover:brightness-110" />
            </NavLink>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Home", href: "/" },
              { label: "WizVideo", href: WIZVIDEO_STUDIO_PAGE },
              { label: "WizScript", href: WIZSCRIPT_STUDIO_PAGE },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-white rounded-lg transition-all duration-200 font-medium hover:scale-105 hover:-translate-y-0.5 inline-block"
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <a
                href={WIZVIDEO_STUDIO_PAGE}
                className="inline-flex items-center bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />Start with WizVideo
              </a>
            ) : (
              <>
                <a href={getLoginUrl()} className="hidden sm:block text-sm text-muted-foreground hover:text-white transition-colors font-medium px-3 py-2">
                  Sign in
                </a>
                <button
                  className="inline-flex items-center bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9 transition-colors"
                  onMouseDown={handleCTAMouseDown} onClick={handleCTA}
                >
                  Start Creating
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-muted-foreground mb-8 font-medium">
                <Music className="w-3.5 h-3.5" />
                AI Music Video Maker
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6 text-white">
                You're the director.<br />
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  WIZ AI is your crew.
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                Upload your track. Direct every scene. Control lip sync, camera angles, and character consistency — WIZ AI builds a cinematic music video synced to your lyrics, exactly as you envisioned it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {isAuthenticated ? (
                  <a
                    href={WIZVIDEO_STUDIO_PAGE}
                    className="inline-flex items-center justify-center bg-white text-black hover:bg-white/90 text-base px-7 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />Start Creating
                  </a>
                ) : (
                  <button
                    className="inline-flex items-center justify-center bg-white text-black hover:bg-white/90 text-base px-7 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    onMouseDown={handleCTAMouseDown} onClick={handleCTA}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />Start Creating
                  </button>
                )}
                <a
                  href="/pricing"
                  className="inline-flex items-center justify-center border border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-7 py-3 rounded-xl font-medium transition-colors"
                >
                  <ChevronRight className="w-4 h-4 mr-1" />View pricing
                </a>
              </div>
              <p className="text-sm text-muted-foreground">Free to create · No credit card · Only pay to build</p>
            </div>

            {/* Right: image grid */}
            <div className="grid grid-cols-2 gap-3">
              {WIZBEAT_IMAGES.map((img) => (
                <div key={img.src} className="relative rounded-2xl overflow-hidden aspect-video group">
                  <img
                    src={img.src}
                    alt={img.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3 text-white text-xs font-semibold">{img.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="py-20 px-6 border-t border-white/6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">How it works</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">Three steps to your music video</h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">Done in minutes. No editing required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: "", title: "Upload your song", desc: "Drop in your audio file or paste your lyrics. WizVideo reads every line." },
              { step: "02", icon: "", title: "Choose your style", desc: "Pick from Cinematic, Anime, Stylised 3D, Documentary, Abstract, or Vintage." },
              { step: "03", icon: "", title: "Get your full video", desc: "AI builds your storyboard, renders every scene synced to your music, and delivers a complete video." },
            ].map((s) => (
              <div key={s.step} className="p-7 rounded-2xl bg-card border border-white/6 hover:border-white/14 transition-all">
                <div className="text-4xl mb-5">{s.icon}</div>
                <div className="text-xs font-bold text-muted-foreground tracking-widest mb-3">STEP {s.step}</div>
                <h3 className="font-semibold text-white text-base mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-white/6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-5">WizVideo features</p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                Your music.<br />Your story.<br />
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Brought to life.</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: <Sparkles className="w-5 h-5" />, title: "Character Lock™", desc: "Your character's face, costume, and performance stay identical across every scene. No random strangers. No drift. Ever." },
                  { icon: <Music className="w-5 h-5" />, title: "Real Lip Sync", desc: "WizSync™ passes the exact 8-second audio clip for each scene to the model. Phoneme-accurate, frame-perfect lip sync — not an approximation." },
                  { icon: <Film className="w-5 h-5" />, title: "Lyric-Aware Storyboarding™", desc: "WIZ AI analyses your full lyrics before generating a single scene. Every frame reflects what is being sung at that exact moment." },
                  { icon: <Wand2 className="w-5 h-5" />, title: "Scene Director™", desc: "Edit any scene's prompt, camera angle, and lip sync after the render. Re-render just that scene for free. You are the director." },
                  { icon: <Zap className="w-5 h-5" />, title: "Preview Before Download™", desc: "Watch the full video before committing. Re-direct any scene for free. Download only when you are satisfied. Quality guaranteed." },
                  { icon: <Film className="w-5 h-5" />, title: "6 visual styles", desc: "Cinematic, Anime, Stylised 3D, Documentary, Abstract, or Vintage — applied consistently across every scene." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4 p-5 rounded-2xl bg-card border border-white/6 hover:border-white/12 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-muted-foreground flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-600/15 to-blue-600/10 rounded-3xl blur-2xl" aria-hidden="true" />
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-card">
                <div className="aspect-video bg-gradient-to-br from-violet-900/40 via-blue-900/30 to-black flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-center px-8">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                    <p className="text-white font-semibold">Your video, rendered here</p>
                    <p className="text-muted-foreground text-sm">Full music video · Synced to lyrics · 1080p</p>
                  </div>
                </div>
                <div className="p-4 border-t border-white/8 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/20 text-[--color-silver]">✓ Lyrics synced</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/20 text-[--color-gold]">✓ No watermark</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Ready in ~4 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USP Showcase — 4 hero features with marketing assets */}
      <section className="py-20 px-6 border-t border-white/6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/80 mb-3">The WizVideo Standard</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Four things no other platform does.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every feature below is exclusive to WizVideo. Not approximated. Not simulated. Built from the ground up.
            </p>
          </div>

          {/* Feature rows — alternating image/text layout */}
          <div className="space-y-16">
            {/* 1 — Character Lock */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90/10 border border-primary/80/25 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/90" />
                  <span className="text-xs font-bold text-primary/80 tracking-widest uppercase">Exclusive Feature</span>
                </div>
                <h3 className="text-3xl font-extrabold text-white mb-4 leading-tight">
                  Character Lock™
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed mb-6">
                  Your character's face, costume, and performance style are locked from the first scene to the last. No random strangers. No face drift. No inconsistencies. The same person — every single frame.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Reference-to-Video model</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Master portrait anchor</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Zero face substitutions</span>
                </div>
              </div>
              <div className="order-1 lg:order-2 relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-primary/90/15 to-transparent rounded-3xl blur-2xl" aria-hidden="true" />
                <img
                  src="/manus-storage/wizai-marketing-character-lock_1fae56ed.png"
                  alt="Character Lock™ — Same face every scene"
                  className="relative w-full rounded-2xl border border-white/10 shadow-2xl object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* 2 — Real Lip Sync */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-blue-600/15 to-transparent rounded-3xl blur-2xl" aria-hidden="true" />
                <img
                  src="/manus-storage/wizai-marketing-lip-sync_93f07c62.png"
                  alt="Real Lip Sync — Phoneme-accurate, frame-perfect"
                  className="relative w-full rounded-2xl border border-white/10 shadow-2xl object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">Exclusive Feature</span>
                </div>
                <h3 className="text-3xl font-extrabold text-white mb-4 leading-tight">
                  Real Lip Sync
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed mb-6">
                  WizSync™ extracts the exact 8-second audio segment for each scene and passes it directly to the generation model. The result is phoneme-accurate, frame-perfect lip sync — not a visual approximation. Your character sings the actual words.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Phoneme-accurate</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Audio-driven model</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Per-scene audio clips</span>
                </div>
              </div>
            </div>

            {/* 3 — Lyric-Aware Storyboarding */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span className="text-xs font-bold text-violet-400 tracking-widest uppercase">Exclusive Feature</span>
                </div>
                <h3 className="text-3xl font-extrabold text-white mb-4 leading-tight">
                  Lyric-Aware Storyboarding™
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed mb-6">
                  WIZ AI reads your full lyrics before generating a single scene. It extracts your song's theme, emotional arc, narrative, and key imagery — then builds a storyboard where every scene reflects exactly what is being sung at that moment.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Deep song analysis</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Verse/chorus/bridge mapping</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Emotional arc tracking</span>
                </div>
              </div>
              <div className="order-1 lg:order-2 relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-violet-600/15 to-transparent rounded-3xl blur-2xl" aria-hidden="true" />
                <img
                  src="/manus-storage/wizai-marketing-lyric-aware_c302161c.png"
                  alt="Lyric-Aware Storyboarding™ — The AI reads your lyrics"
                  className="relative w-full rounded-2xl border border-white/10 shadow-2xl object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* 4 — Scene Director */}
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-emerald-600/15 to-transparent rounded-3xl blur-2xl" aria-hidden="true" />
                <img
                  src="/manus-storage/wizai-marketing-scene-director_b5bf748f.png"
                  alt="Scene Director™ — Direct every scene"
                  className="relative w-full rounded-2xl border border-white/10 shadow-2xl object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Exclusive Feature</span>
                </div>
                <h3 className="text-3xl font-extrabold text-white mb-4 leading-tight">
                  Scene Director™
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed mb-6">
                  After your video renders, you are the director. Edit any scene's prompt, camera angle, and lip sync setting. Re-render just that scene for free — before you download. Preview Before Download™ means you only commit when you are completely satisfied.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Per-scene editing</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Free re-render before download</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">Preview Before Download™</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
            Upload your song. Get a full video.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Storyboard generation is always free. You only pay when you're ready to build and download. From £2 per video.
          </p>
          {isAuthenticated ? (
            <a
              href={WIZVIDEO_STUDIO_PAGE}
              className="inline-flex items-center justify-center bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" />Start Creating
            </a>
          ) : (
            <button
              className="inline-flex items-center justify-center bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              onMouseDown={handleCTAMouseDown} onClick={handleCTA}
            >
              <Sparkles className="w-4 h-4 mr-2" />Start Creating
            </button>
          )}
          <p className="text-muted-foreground text-sm mt-4">Free to create · No credit card · Only pay to build</p>
        </div>
      </section>

      {/* Showcase */}
      <ShowcaseVideoSection
        title="See what WIZ AI music videos look like"
        subtitle="Music video showcase"
        description="Every video built from a text prompt and an uploaded track. No crew, no editing, no experience needed."
        ctaLabel="Create Your Music Video"
        ctaHref={WIZVIDEO_STUDIO_PAGE}
        items={MUSIC_VIDEO_SHOWCASE}
      />

      {/* Footer */}
      <footer className="bg-background border-t border-white/8 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[7.3rem] w-auto object-contain" />
          <p>© 2025 WIZ AI. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/help" className="hover:text-white transition-colors">Help</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/refunds" className="hover:text-white transition-colors">Refunds</Link>
            <Link href="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            <button onClick={() => window.dispatchEvent(new CustomEvent('wiz:open-cookie-settings'))} className="hover:text-white transition-colors bg-transparent border-0 p-0 cursor-pointer">Cookie Settings</button>
            <a href="mailto:support@wiz-ai.io" className="hover:text-white transition-colors">support@wiz-ai.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
