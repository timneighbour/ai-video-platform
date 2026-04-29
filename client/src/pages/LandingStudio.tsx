/**
 * wizvidstudio.com — Premium Placeholder Page
 *
 * Served when the Host header is wizvidstudio.com.
 * Also accessible at /studio for testing.
 *
 * Strategy: Premium "coming soon" page that communicates
 * WIZ AI Studio as a professional-tier product.
 * Captures email interest. Same design system as main site.
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Volume2, Film, Layers, Cpu, Mail, ArrowRight, CheckCircle2 } from "@/lib/icons";
import { useSEO } from "@/hooks/useSEO";

const MAIN_APP = "https://wiz-ai.io";

// Animated canvas particles
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// Animated waveform
function WaveformBars({ count = 16 }: { count?: number }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            background: `linear-gradient(to top, #7c3aed, #e879f9)`,
            animation: `studioWave${i % 5} ${0.5 + (i % 4) * 0.18}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: Film, title: "Professional-grade output", desc: "4K builds, advanced colour grading, and cinematic post-processing." },
  { icon: Layers, title: "Multi-scene projects", desc: "Build full short films and series — not just single videos." },
  { icon: Cpu, title: "Priority AI processing", desc: "Dedicated build queue for faster turnaround on complex projects." },
  { icon: Volume2, title: "WizSound™ Pro", desc: "Full spatial audio mastering suite — the complete cinematic experience." },
];

export default function LandingStudio() {

  useSEO({ title: "WIZ AI Studio — Professional AI Video Production", path: "/studio", description: "Professional-grade AI video production studio. Create cinematic music videos, animations, and visual content with WizGenesis™, WizLumina™, and WizSound™." });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [glowPhase, setGlowPhase] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setGlowPhase((p) => (p + 1) % 360), 50);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white font-sans overflow-x-hidden">

      {/* ── Minimal nav ── */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-white text-lg tracking-tight">WIZ AI</span>
            <span className="text-[--color-gold] font-extrabold text-lg tracking-tight"> Studio</span>
          </div>
        </div>
        <a href={MAIN_APP} className="text-white/40 hover:text-white/70 text-sm transition-colors">
          ← Back to WIZ AI.ai
        </a>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        {/* Particle background */}
        <ParticleCanvas />

        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.8) 0%, transparent 65%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] opacity-15"
            style={{ background: "radial-gradient(ellipse, rgba(217,70,239,0.6) 0%, transparent 65%)" }} />
        </div>

        {/* IMAX letterbox bars */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 text-[--color-gold] text-xs font-semibold mb-6 tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-[--color-gold] animate-pulse" />
            Coming Soon — Professional Tier
          </div>

          {/* Wordmark */}
          <div className="mb-6">
            <h1 className="font-black tracking-tight leading-none"
              style={{ fontSize: "clamp(4rem, 12vw, 9rem)" }}>
              <span className="text-white">Wiz</span>
              <span style={{
                backgroundImage: "linear-gradient(135deg, #a855f7 0%, #e879f9 50%, #c084fc 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Vid</span>
            </h1>
            <div className="flex items-center justify-center gap-3 mt-1">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#4a3010]/40" />
              <span className="font-bold tracking-[0.5em] text-white/50 text-sm uppercase">STUDIO</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#4a3010]/40" />
            </div>
          </div>

          {/* Tagline */}
          <p className="text-white/60 text-xl md:text-2xl leading-relaxed mb-4 max-w-2xl mx-auto">
            Professional-grade AI video creation.<br />
            <span className="text-white/80 font-semibold">For creators who demand more.</span>
          </p>

          {/* WizSound badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[--color-gold]/25 bg-[--color-gold]/15 text-[--color-gold] text-sm font-semibold">
              <Volume2 className="w-4 h-4" />
              Powered by WizSound™ Pro
              <WaveformBars count={10} />
            </div>
          </div>

          {/* Email capture */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto mb-5">
              <div className="relative flex-1 w-full">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for early access"
                  className="w-full bg-white/6 border border-white/12 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[--color-gold]/30 focus:bg-white/8 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] text-sm"
              >
                Get Early Access
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-green-500/25 bg-green-500/8 text-green-300 max-w-md mx-auto mb-5">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-sm">You're on the list. We'll notify you when Studio launches.</span>
            </div>
          )}

          <p className="text-xs text-white/25">No spam. Early access notification only.</p>
        </div>
      </section>

      {/* ── Features preview ── */}
      <section className="py-20 px-6 border-t border-white/6 bg-gradient-to-b from-[#06060c] to-[#0d0018]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[--color-gold] text-sm font-semibold uppercase tracking-widest mb-3">What's coming</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              Everything in WIZ AI,<br />
              <span style={{
                backgroundImage: "linear-gradient(90deg, #c4b5fd, #e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>elevated to professional standard</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:bg-white/5 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b8892a]/20 to-[#4a3010]/20 border border-[--color-gold]/30 flex items-center justify-center mb-4 group-hover:border-[--color-gold]/30 transition-colors">
                  <f.icon className="w-5 h-5 text-[--color-gold]" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Try WIZ AI now CTA ── */}
      <section className="py-20 px-6 text-center border-t border-white/6 bg-[#06060c]">
        <div className="max-w-xl mx-auto">
          <p className="text-white/40 text-sm mb-3">While you wait for Studio…</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            Start creating with WIZ AI today
          </h2>
          <p className="text-white/50 mb-6 text-sm">
            The full AI video creation platform is live now. Free to create — only pay when you build your final video.
          </p>
          <a
            href={`${MAIN_APP}/music-video/create`}
            className="inline-flex items-center gap-2.5 bg-white text-black font-bold px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.35)] hover:bg-white/95 transition-all text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Try WIZ AI for Free
            <ArrowRight className="w-4 h-4" />
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
            <span className="text-white/60 text-sm font-semibold">WIZ AI Studio</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/30">
            <a href={`${MAIN_APP}/privacy`} className="hover:text-white/60 transition-colors">Privacy</a>
            <a href={`${MAIN_APP}/terms`} className="hover:text-white/60 transition-colors">Terms</a>
            <a href={MAIN_APP} className="hover:text-white/60 transition-colors">WIZ AI.ai</a>
            <span>© 2025 WIZ AI. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes studioWave0 { from { height: 4px; } to { height: 24px; } }
        @keyframes studioWave1 { from { height: 8px; } to { height: 28px; } }
        @keyframes studioWave2 { from { height: 6px; } to { height: 20px; } }
        @keyframes studioWave3 { from { height: 10px; } to { height: 26px; } }
        @keyframes studioWave4 { from { height: 5px; } to { height: 18px; } }
      `}</style>
    </div>
  );
}
