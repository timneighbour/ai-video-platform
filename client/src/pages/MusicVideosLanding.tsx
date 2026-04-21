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

const CDN = "https://wiz-ai.b-cdn.net";

// Static fallback showcase items for music video page (replaced by DB items when available)
const MUSIC_VIDEO_SHOWCASE = [
  {
    id: 1,
    title: "Stage Performance — Music Video",
    category: "Music Video",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-stage-performance_b1d68ebf.jpg",
    videoUrl: null,
    description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created from an uploaded track.",
  },
  {
    id: 2,
    title: "Midnight City — Cinematic Style",
    category: "Cinematic AI Video",
    posterUrl: "https://wiz-ai.b-cdn.net/showcase-midnight-city_caf4be96.jpg",
    videoUrl: null,
    description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt.",
  },
  {
    id: 3,
    title: "WizPerformer — Performance Sync",
    category: "WizPerformer",
    posterUrl: "https://wiz-ai.b-cdn.net/demo-animation-still_2cfcbcb8.png",
    videoUrl: null,
    description: "Not just lip-sync — full performance sync. Every gesture, expression, and movement matched to the music.",
  },
];
const WIZAI_LOGO = "https://wiz-ai.b-cdn.net/wizai-logo-premium-transparent_ac3f550b.png";
const WIZBEAT_IMAGES = [
  { src: `${CDN}/wizbeat-artist-band_04b2adbf.jpg`, label: "Indie Band" },
  { src: `${CDN}/wizbeat-animated-dog_8d12b77c.jpg`, label: "Animated Character" },
  { src: `${CDN}/wizbeat-animated-cat_81ffcf80.jpg`, label: "Animated Singer" },
  { src: `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`, label: "Solo Artist" },
];

export default function MusicVideosLanding() {
  useSEO({ title: "AI Music Video Generator — WIZ AI", path: "/music-video", description: "Turn any song into a full cinematic music video with AI. Upload your track, preview every scene, and render in minutes. No editing skills needed." });
  const { isAuthenticated } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);

  const handleCTA = () => {
    if (isAuthenticated) {
      window.location.href = "/music-video/create";
    } else {
      setShowAuthGate(true);
    }
  };

  // – onMouseDown fires BEFORE Chrome extensions can intercept onClick
  const handleCTAMouseDown = () => {
    if (isAuthenticated) {
      window.location.href = "/music-video/create";
    }
    // For unauthenticated: let onClick handle the auth gate modal
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Auth Gate Modal */}
      <AuthGate
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        featureName="create your music video"
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8">
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
              { label: "WizVideo", href: "/music-video/create" },
              { label: "WizScript", href: "/wizpilot" },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-white rounded-lg transition-all duration-200 font-medium hover:scale-105 hover:-translate-y-0.5 inline-block"
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <a
                href="/music-video/create"
                className="inline-flex items-center bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />Start with WizVideo
              </a>
            ) : (
              <>
                <a href={getLoginUrl()} className="hidden sm:block text-sm text-[#a1a1aa] hover:text-white transition-colors font-medium px-3 py-2">
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
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-[#a1a1aa] mb-8 font-medium">
                <Music className="w-3.5 h-3.5" />
                AI Music Video Maker
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6 text-white">
                Your song deserves<br />
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  a real music video
                </span>
              </h1>
              <p className="text-lg text-[#a1a1aa] leading-relaxed mb-8 max-w-lg">
                Upload your track. Describe your vision. WizVideo writes the storyboard, generates every scene, and delivers a complete music video — synced to your lyrics.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {isAuthenticated ? (
                  <a
                    href="/music-video/create"
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
              <p className="text-sm text-[#a1a1aa]">Free to create · No credit card · Only pay to render</p>
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
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">How it works</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mb-4">Three steps to your music video</h2>
            <p className="text-[#a1a1aa] text-lg max-w-lg mx-auto">Done in minutes. No editing required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: "", title: "Upload your song", desc: "Drop in your audio file or paste your lyrics. WizVideo reads every line." },
              { step: "02", icon: "", title: "Choose your style", desc: "Pick from Cinematic, Anime, Stylised 3D, Documentary, Abstract, or Vintage." },
              { step: "03", icon: "", title: "Get your full video", desc: "AI builds your storyboard, renders every scene synced to your music, and delivers a complete video." },
            ].map((s) => (
              <div key={s.step} className="p-7 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all">
                <div className="text-4xl mb-5">{s.icon}</div>
                <div className="text-xs font-bold text-[#a1a1aa] tracking-widest mb-3">STEP {s.step}</div>
                <h3 className="font-semibold text-white text-base mb-2">{s.title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed">{s.desc}</p>
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
              <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-5">WizVideo features</p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                Your music.<br />Your story.<br />
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Brought to life.</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: <Music className="w-5 h-5" />, title: "Lyrics-driven visuals", desc: "Every line of your song becomes a cinematic scene — automatically synced." },
                  { icon: <Film className="w-5 h-5" />, title: "6 visual styles", desc: "Cinematic, Anime, Stylised 3D, Documentary, Abstract, or Vintage." },
                  { icon: <Wand2 className="w-5 h-5" />, title: "AI lip-sync characters", desc: "Up to 4 characters with realistic AI lip-sync — real artists or animated." },
                  { icon: <Zap className="w-5 h-5" />, title: "Full video, not clips", desc: "WizVideo delivers a complete, ready-to-publish music video — not a 10-second clip." },
                  { icon: <Sparkles className="w-5 h-5" />, title: "Powered by WizSound™", desc: "Proprietary audio enhancement. Choose WizSound Enhance or WizSound Cinematic for richer, more immersive sound." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4 p-5 rounded-2xl bg-[#171717] border border-white/6 hover:border-white/12 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                      <p className="text-[#a1a1aa] text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-600/15 to-blue-600/10 rounded-3xl blur-2xl" aria-hidden="true" />
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#171717]">
                <div className="aspect-video bg-gradient-to-br from-violet-900/40 via-blue-900/30 to-black flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-center px-8">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                    <p className="text-white font-semibold">Your video, rendered here</p>
                    <p className="text-[#a1a1aa] text-sm">Full music video · Synced to lyrics · 1080p</p>
                  </div>
                </div>
                <div className="p-4 border-t border-white/8 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/20 text-[--color-silver]">✓ Lyrics synced</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/20 text-[--color-gold]">✓ No watermark</span>
                  </div>
                  <span className="text-xs text-[#a1a1aa]">Ready in ~4 min</span>
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
          <p className="text-[#a1a1aa] text-lg mb-10 max-w-xl mx-auto">
            Storyboard generation is always free. You only pay when you're ready to render and download. From £2 per video.
          </p>
          {isAuthenticated ? (
            <a
              href="/music-video/create"
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
          <p className="text-[#a1a1aa] text-sm mt-4">Free to create · No credit card · Only pay to render</p>
        </div>
      </section>

      {/* Showcase */}
      <ShowcaseVideoSection
        title="See what WIZ AI music videos look like"
        subtitle="Music video showcase"
        description="Every video built from a text prompt and an uploaded track. No crew, no editing, no experience needed."
        ctaLabel="Create Your Music Video"
        ctaHref="/music-video/create"
        items={MUSIC_VIDEO_SHOWCASE}
      />

      {/* Footer */}
      <footer className="bg-[#0f0f0f] border-t border-white/8 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#a1a1aa]">
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
