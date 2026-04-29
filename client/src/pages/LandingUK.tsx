/**
 * wizvid.co.uk — UK Landing Page
 *
 * Served when the Host header is wizvid.co.uk.
 * Also accessible at /uk for testing.
 *
 * Strategy: UK-specific copy + trust signals, same design system,
 * primary CTA redirects to wiz-ai.io/music-video/create.
 */

import { useEffect, useState } from "react";
import { Sparkles, Play, Zap, CheckCircle2, Star, Volume2, ArrowRight } from "@/lib/icons";
import { useSEO } from "@/hooks/useSEO";

const MAIN_APP = "https://wiz-ai.io";

// Shared design tokens — must match main site
const BRAND = {
  headline: "bg-gradient-to-r from-[#b8892a] via-purple-200 to-[#4a3010] bg-clip-text text-transparent",
  badge: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-xs font-mono tracking-[0.18em] uppercase font-semibold",
  ctaPrimary: "inline-flex items-center gap-3 bg-white text-black font-bold px-9 py-4 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:shadow-[0_0_70px_rgba(255,255,255,0.45)] hover:bg-white/95 transition-all duration-300 text-base",
  ctaSecondary: "inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all duration-300 text-sm",
};

const FEATURES = [
  { icon: "", title: "Full music videos", desc: "Not clips — complete, ready-to-publish videos from a single prompt." },
  { icon: "", title: "Storyboard preview", desc: "See every scene before you build. Edit any frame. Only pay when you're happy." },
  { icon: "", title: "WizSound™ audio", desc: "Proprietary cinematic audio enhancement — studio quality, built in." },
  { icon: "", title: "Under 5 minutes", desc: "From idea to finished video faster than making a cup of tea." },
];

const STYLES = ["Cinematic Films", "Music Videos", "Stylised 3D", "Anime", "Epic Fantasy", "Neon Noir"];

const STATS = [
  { value: "5 min", label: "avg. creation time" },
  { value: "7+", label: "video styles" },
  { value: "Free", label: "to create & preview" },
];

export default function LandingUK() {

  useSEO({ title: "WIZ AI — UK's Leading AI Video Creator", path: "/uk", description: "Create stunning AI videos, music videos, and animations. Made in the UK. WIZ AI combines cutting-edge AI with cinematic production quality." });
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [styleIdx, setStyleIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStyleIdx((i) => (i + 1) % STYLES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <a href={MAIN_APP} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">WIZ AI</span>
          <span className="text-xs text-white/30 font-mono ml-1">.co.uk</span>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-white/40 font-mono">United Kingdom</span>
          <a
            href={`${MAIN_APP}/music-video/create`}
            className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
          >
            Start Creating
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(109,40,217,0.6) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(217,70,239,0.5) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* UK badge */}
          <div className="flex justify-center mb-4">
            <div className={BRAND.badge}>
              <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
              Now available in the UK
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-extrabold leading-[1.05] tracking-tight text-white mb-4"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5.5rem)" }}>
            Create Cinematic AI<br />
            <span className={BRAND.headline}>Music Videos in Minutes</span>
          </h1>

          {/* Cycling style */}
          <div className="flex justify-center mb-5">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
              <span className="text-white/40 text-sm">Perfect for</span>
              <span
                key={styleIdx}
                className="font-bold text-sm"
                style={{
                  backgroundImage: "linear-gradient(90deg, #c4b5fd, #e879f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                {STYLES[styleIdx]}
              </span>
            </div>
          </div>

          {/* Subheadline */}
          <p className="text-white/65 max-w-2xl mx-auto mb-5 leading-relaxed text-lg">
            Turn your idea or song into a complete video — storyboard, scenes, and final build — all in one place. No editing. No complicated tools.
          </p>

          {/* Speed strip */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/25 text-green-300 text-sm font-semibold">
              <Zap className="w-3.5 h-3.5" />
              From idea to finished video in under 5 minutes
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a href={`${MAIN_APP}/music-video/create`} className={BRAND.ctaPrimary}>
              <Sparkles className="w-5 h-5" />
              Create Your First Video
            </a>
            <a href={`${MAIN_APP}#demo`} className={BRAND.ctaSecondary}>
              <span className="relative w-6 h-6 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" style={{ animationDuration: "2s" }} />
                <span className="absolute inset-0 rounded-full bg-white/15 border border-white/30 flex items-center justify-center pointer-events-none">
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </span>
              </span>
              Watch Demo
            </a>
          </div>

          {/* Trust line */}
          <p className="text-sm text-white/35 font-medium">
            Free to create · No credit card · Only pay when you build your final video
          </p>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-bold text-xl">{s.value}</p>
                <p className="text-white/35 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 border-t border-white/6 bg-gradient-to-b from-[#0a0a0f] to-[#0f0f18]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[--color-gold] text-sm font-semibold uppercase tracking-widest mb-3">Why WIZ AI</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">See it. Approve it. Then build it.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/8 bg-white/3 p-5 hover:bg-white/5 transition-colors">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WizSound callout ── */}
      <section className="py-16 px-6 bg-gradient-to-r from-[#b8892a]/40 via-[#0f0f18] to-[#4a3010]/30 border-t border-white/6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-sm font-semibold mb-5">
            <Volume2 className="w-4 h-4" />
            Powered by WizSound™
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Cinematic sound.<br />Not just visuals.
          </h2>
          <p className="text-white/55 text-lg leading-relaxed max-w-xl mx-auto mb-6">
            WizSound™ transforms your audio into an immersive, cinematic experience — adding depth, clarity, and impact to every video.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Immersive depth", "Cinematic mastering", "Built for video"].map((f) => (
              <div key={f} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/4 text-white/70 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-[--color-gold] flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases strip ── */}
      <section className="py-14 px-6 border-t border-white/6 bg-[#0a0a0f]">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-white/40 text-xs uppercase tracking-widest font-semibold mb-6">What UK creators can build</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { title: "Musicians", desc: "Turn songs into cinematic music video concepts and final builds.", icon: "\ud83c\udfb5" },
              { title: "YouTubers", desc: "Create shorts, visual stories and thumbnails without editing software.", icon: "\ud83c\udfac" },
              { title: "Brands", desc: "Produce campaign visuals and social content from one workspace.", icon: "\ud83d\udcbc" },
            ].map((uc) => (
              <div key={uc.title} className="flex-1 min-w-[260px] max-w-sm rounded-2xl border border-white/8 bg-white/3 p-5">
                <span className="text-2xl mb-3 block">{uc.icon}</span>
                <h3 className="text-white font-bold text-sm mb-2">{uc.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-white/25 text-xs mt-6">Real customer stories will be added once creators begin publishing with WIZ AI.</p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center border-t border-white/6 bg-gradient-to-b from-[#0a0a0f] to-[#0d0018]">
        <div className="max-w-2xl mx-auto">
          <div className={`${BRAND.badge} mx-auto mb-5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            Available now in the UK
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Your first video is<br />
            <span className={BRAND.headline}>minutes away</span>
          </h2>
          <p className="text-white/55 text-lg mb-8">
            Start creating for free. Only pay when you build your final video.
          </p>
          <a href={`${MAIN_APP}/music-video/create`} className={`${BRAND.ctaPrimary} mx-auto`}>
            <Sparkles className="w-5 h-5" />
            Create Your First Video
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-xs text-white/25 mt-4">No credit card required · Free to create · Only pay when you build your final video</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/6 bg-black">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white/60 text-sm font-semibold">WIZ AI.co.uk</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/30">
            <a href={`${MAIN_APP}/privacy`} className="hover:text-white/60 transition-colors">Privacy</a>
            <a href={`${MAIN_APP}/terms`} className="hover:text-white/60 transition-colors">Terms</a>
            <a href={`${MAIN_APP}/help`} className="hover:text-white/60 transition-colors">Help</a>
            <span>© 2025 WIZ AI. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
