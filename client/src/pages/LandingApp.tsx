/**
 * wizvidapp.com — High-Conversion Ads Landing Page
 *
 * Served when the Host header is wizvidapp.com.
 * Also accessible at /app for testing.
 *
 * Strategy: No nav distractions, single CTA above the fold,
 * fast load, optimised for paid traffic conversion.
 * Follows AIDA: Attention → Interest → Desire → Action.
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Play, Zap, CheckCircle2, ArrowRight, Volume2, Star, Clock } from "@/lib/icons";

const MAIN_APP = "https://wiz-ai.io";
const CREATE_URL = `${MAIN_APP}/music-video/create`;

// Shared design tokens
const BRAND = {
  headline: "bg-gradient-to-r from-[#b8892a] via-purple-200 to-[#4a3010] bg-clip-text text-transparent",
  ctaPrimary: "inline-flex items-center justify-center gap-3 bg-white text-black font-extrabold px-10 py-5 rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.35)] hover:shadow-[0_0_80px_rgba(255,255,255,0.5)] hover:bg-white/95 transition-all duration-300 text-lg w-full sm:w-auto",
};

const PROOF_POINTS = [
  { icon: "", text: "Full cinematic videos — not clips" },
  { icon: "", text: "From idea to video in under 5 minutes" },
  { icon: "️", text: "Preview every scene before you pay" },
  { icon: "", text: "WizSound™ cinematic audio built in" },
];

const STYLES = [
  { label: "Music Videos", emoji: "" },
  { label: "Cinematic Films", emoji: "" },
  { label: "Stylised 3D", emoji: "" },
  { label: "Anime", emoji: "⚔️" },
  { label: "Epic Fantasy", emoji: "🐉" },
];

const STEPS = [
  { n: "01", title: "Describe your idea", desc: "Type your prompt — mood, style, story. The more vivid, the better." },
  { n: "02", title: "AI builds storyboard", desc: "Instant scene-by-scene storyboard. Preview and edit any frame." },
  { n: "03", title: "Preview every scene", desc: "See your full video before committing. Only pay when you love it." },
  { n: "04", title: "Render final video", desc: "Full cinematic video with WizSound™ audio. Ready to publish." },
];

// Animated waveform bars
function WaveformBars({ count = 12, color = "#a855f7" }: { count?: number; color?: string }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 28 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{
            width: 3,
            background: color,
            animation: `waveBar${i % 5} ${0.6 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingApp() {
  const [styleIdx, setStyleIdx] = useState(0);
  const [countdown, setCountdown] = useState(180); // 3-minute urgency timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setStyleIdx((i) => (i + 1) % STYLES.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#08080e] text-white font-sans overflow-x-hidden">

      {/* ── Urgency banner ── */}
      <div className="w-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] py-2.5 px-4 text-center text-sm font-semibold text-white">
        <span className="opacity-80">Limited offer — Create your first video free.</span>
        {" "}
        <span className="font-mono font-bold">{mins}:{secs}</span>
        {" "}
        <span className="opacity-80">remaining</span>
      </div>

      {/* ── Minimal nav (no distractions) ── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">WIZ AI</span>
        </div>
        <a href={CREATE_URL} className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors">
          Start Creating
        </a>
      </nav>

      {/* ── HERO — above the fold ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-25"
            style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.7) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-xs font-semibold mb-5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-[--color-gold]" />)}
            </div>
            Loved by musicians, YouTubers & creators
          </div>

          {/* Headline */}
          <h1 className="font-extrabold leading-[1.05] tracking-tight text-white mb-4"
            style={{ fontSize: "clamp(2.8rem, 6.5vw, 5.5rem)" }}>
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
                  background: "linear-gradient(90deg, #c4b5fd, #e879f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "fadeIn 0.4s ease",
                }}
              >
                {STYLES[styleIdx].emoji} {STYLES[styleIdx].label}
              </span>
            </div>
          </div>

          {/* Subheadline */}
          <p className="text-white/65 text-xl max-w-xl mx-auto mb-6 leading-relaxed">
            Turn your idea or song into a complete video — storyboard, scenes, and final render — all in one place.
          </p>

          {/* Speed strip */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/25 text-green-300 text-sm font-bold">
              <Zap className="w-3.5 h-3.5" />
              From idea to finished video in under 5 minutes
            </div>
          </div>

          {/* PRIMARY CTA — single, dominant */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <a href={CREATE_URL} className={BRAND.ctaPrimary}>
              <Sparkles className="w-5 h-5" />
              Create Your First Video — Free
              <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-xs text-white/30">No credit card · Free to create · Only pay when you render</p>
          </div>

          {/* Proof points */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {PROOF_POINTS.map((p) => (
              <div key={p.text} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/8 bg-white/3 text-white/60 text-xs">
                <span>{p.icon}</span>
                {p.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 border-t border-white/6 bg-gradient-to-b from-[#08080e] to-[#0f0f18]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[--color-gold] text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">From idea to full video in 4 steps</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-white/8 bg-white/3 p-5">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-2.5 z-10">
                    <ArrowRight className="w-5 h-5 text-[--color-gold]/50" />
                  </div>
                )}
                <div className="text-[--color-gold] font-mono text-xs font-bold mb-3">{s.n}</div>
                <h3 className="font-bold text-white mb-2 text-sm">{s.title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WizSound callout ── */}
      <section className="py-16 px-6 border-t border-white/6 bg-gradient-to-r from-[#b8892a]/40 via-[#0f0f18] to-[#4a3010]/30">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-sm font-bold mb-5">
            <Volume2 className="w-4 h-4" />
            Powered by WizSound™
            <WaveformBars count={8} color="#e879f9" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Cinematic sound. Not just visuals.
          </h2>
          <p className="text-white/55 text-lg leading-relaxed max-w-xl mx-auto">
            WizSound™ transforms your audio into an immersive, cinematic experience — adding depth, clarity, and impact to every video.
          </p>
        </div>
      </section>

      {/* ── Differentiator ── */}
      <section className="py-16 px-6 border-t border-white/6 bg-[#08080e]">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-[--color-gold]/30 bg-gradient-to-br from-[#b8892a]/40 to-[#4a3010]/30 p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Not just clips. Full videos.</h2>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              Most AI tools generate fragments. WIZ AI creates complete, ready-to-publish videos — with storyboard, scenes, audio, and final render all in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 className="w-4 h-4 text-[--color-gold]" />
                AI builds full storyboard instantly
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 className="w-4 h-4 text-[--color-gold]" />
                Preview every scene before paying
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 className="w-4 h-4 text-[--color-gold]" />
                Full video, not clips
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 className="w-4 h-4 text-[--color-gold]" />
                No editing required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center border-t border-white/6 bg-gradient-to-b from-[#08080e] to-[#0d0018]">
        <div className="max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-xs font-semibold mb-5">
            <Clock className="w-3.5 h-3.5" />
            Your first video is minutes away
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Start creating<br />
            <span className={BRAND.headline}>for free today</span>
          </h2>
          <p className="text-white/55 text-lg mb-8">
            Only pay when you render. No credit card required.
          </p>
          <a href={CREATE_URL} className={`${BRAND.ctaPrimary} mx-auto`}>
            <Sparkles className="w-5 h-5" />
            Create Your First Video — Free
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/6 bg-black">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white/60 text-sm font-semibold">WIZ AI</span>
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
        @keyframes waveBar0 { from { height: 4px; } to { height: 20px; } }
        @keyframes waveBar1 { from { height: 6px; } to { height: 24px; } }
        @keyframes waveBar2 { from { height: 8px; } to { height: 16px; } }
        @keyframes waveBar3 { from { height: 5px; } to { height: 22px; } }
        @keyframes waveBar4 { from { height: 10px; } to { height: 18px; } }
      `}</style>
    </div>
  );
}
