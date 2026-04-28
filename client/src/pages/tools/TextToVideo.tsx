import { useAuth } from "@/_core/hooks/useAuth";
import { LandscapeHint } from "@/components/LandscapeHint";
import { analytics } from "@/lib/analytics";
import { ArrowLeft, Sparkles, Wand2, Film, Zap, Play, ChevronRight } from "@/lib/icons";
import { useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

const STYLES = [
  { id: "cinematic", label: "Cinematic", desc: "Hollywood-grade drama and depth", accent: "from-blue-500/20 to-indigo-600/10", border: "border-blue-500/25", glow: "oklch(0.65 0.18 260)" },
  { id: "anime", label: "Anime", desc: "Vivid Japanese animation style", accent: "from-pink-500/20 to-fuchsia-600/10", border: "border-pink-500/25", glow: "oklch(0.68 0.18 330)" },
  { id: "3d", label: "3D Animation", desc: "Polished 3D rendered visuals", accent: "from-cyan-500/20 to-teal-600/10", border: "border-cyan-500/25", glow: "oklch(0.72 0.18 200)" },
  { id: "realistic", label: "Photorealistic", desc: "Ultra-realistic AI footage", accent: "from-amber-500/20 to-orange-600/10", border: "border-amber-500/25", glow: "oklch(0.78 0.11 75)" },
  { id: "neon-noir", label: "Neon Noir", desc: "Dark cyberpunk atmosphere", accent: "from-violet-500/20 to-purple-600/10", border: "border-violet-500/25", glow: "oklch(0.65 0.20 290)" },
  { id: "documentary", label: "Documentary", desc: "Raw, authentic storytelling", accent: "from-stone-500/20 to-zinc-600/10", border: "border-stone-500/25", glow: "oklch(0.60 0.05 60)" },
];

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9", sub: "Widescreen" },
  { id: "9:16", label: "9:16", sub: "Vertical" },
  { id: "1:1", label: "1:1", sub: "Square" },
];

const EXAMPLE_PROMPTS = [
  "A lone astronaut walks across a desolate alien landscape at dusk, twin moons rising on the horizon",
  "A jazz musician plays saxophone in a rain-soaked alley, neon signs reflected in puddles below",
  "A time-lapse of a city skyline transforming from day to night, lights flickering on one by one",
  "A dancer moves through an ancient forest, leaves swirling around her in slow motion",
];

export default function TextToVideo() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    analytics.generateVideoClicked("text_to_video_tool");
    // Store prompt in sessionStorage so WizPilot can pick it up
    sessionStorage.setItem("wizpilot_prefill_prompt", prompt);
    sessionStorage.setItem("wizpilot_prefill_style", style);
    setLocation("/wizpilot");
  };

  const selectedStyle = STYLES.find(s => s.id === style) || STYLES[0];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #070707 0%, #0a0a0a 100%)" }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, oklch(0.78 0.11 75) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: "rgba(7,7,7,0.92)", backdropFilter: "blur(20px)", borderColor: "oklch(0.78 0.11 75 / 0.08)" }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "oklch(0.78 0.11 75 / 0.55)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.88 0.10 75)")}
            onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.78 0.11 75 / 0.55)")}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </a>
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" style={{ color: "oklch(0.78 0.11 75)" }} />
            <span className="text-sm font-bold text-white/70">Text-to-Video</span>
          </div>
          <div className="w-24" />
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-5 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-bold tracking-widest uppercase" style={{ background: "oklch(0.78 0.11 75 / 0.08)", border: "1px solid oklch(0.78 0.11 75 / 0.18)", color: "oklch(0.88 0.10 75)" }}>
          <Sparkles className="h-3 w-3" />
          Powered by WizPilot™
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
          Describe it.<br />
          <span style={{ background: "linear-gradient(135deg, oklch(0.88 0.12 75) 0%, oklch(0.78 0.11 75) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Watch it come to life.
          </span>
        </h1>
        <p className="text-base text-white/45 max-w-xl mx-auto leading-relaxed">
          Type your vision, choose a style, and WizPilot™ builds your complete video — storyboard, animation, audio, and final render.
        </p>
      </div>

      {/* Main form */}
      <div className="max-w-5xl mx-auto px-5 pb-16">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left: Prompt + Style */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Prompt */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0e0e0e 0%, #0a0a0a 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.78 0.11 75 / 0.07)" }}>
                <p className="text-xs font-black tracking-[0.25em] uppercase" style={{ color: "oklch(0.78 0.11 75 / 0.5)" }}>Your Vision</p>
              </div>
              <div className="p-5">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to create..."
                  rows={4}
                  className="w-full resize-none text-sm leading-relaxed bg-transparent outline-none placeholder:text-white/20"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                />
                {/* Example prompts */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "oklch(0.78 0.11 75 / 0.07)" }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }}>Try an example</p>
                  <div className="flex flex-col gap-1.5">
                    {EXAMPLE_PROMPTS.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(ex)}
                        className="text-left text-xs px-3 py-2 rounded-lg transition-all duration-150"
                        style={{ color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.11 75 / 0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
                      >
                        "{ex}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Style selection */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0e0e0e 0%, #0a0a0a 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.78 0.11 75 / 0.07)" }}>
                <p className="text-xs font-black tracking-[0.25em] uppercase" style={{ color: "oklch(0.78 0.11 75 / 0.5)" }}>Visual Style</p>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`relative text-left p-3.5 rounded-xl transition-all duration-200 ${s.id === style ? `bg-gradient-to-br ${s.accent}` : ""}`}
                    style={{
                      border: s.id === style ? `1px solid ${s.glow.replace("oklch", "oklch").replace(")", " / 0.40)")}` : "1px solid oklch(0.78 0.11 75 / 0.08)",
                      boxShadow: s.id === style ? `0 0 20px ${s.glow.replace(")", " / 0.12)")}` : "none",
                    }}
                  >
                    {s.id === style && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: s.glow }} />
                    )}
                    <p className="text-sm font-bold text-white/85 leading-tight">{s.label}</p>
                    <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0e0e0e 0%, #0a0a0a 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.78 0.11 75 / 0.07)" }}>
                <p className="text-xs font-black tracking-[0.25em] uppercase" style={{ color: "oklch(0.78 0.11 75 / 0.5)" }}>Aspect Ratio</p>
              </div>
              <div className="p-5 flex gap-3">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id)}
                    className="flex-1 py-3 rounded-xl text-center transition-all duration-200"
                    style={{
                      background: ar.id === aspectRatio ? "oklch(0.78 0.11 75 / 0.10)" : "transparent",
                      border: ar.id === aspectRatio ? "1px solid oklch(0.78 0.11 75 / 0.30)" : "1px solid oklch(0.78 0.11 75 / 0.08)",
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: ar.id === aspectRatio ? "oklch(0.88 0.10 75)" : "rgba(255,255,255,0.5)" }}>{ar.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{ar.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: CTA panel */}
          <div className="flex flex-col gap-4">
            {/* Generate CTA */}
            <div className="rounded-2xl overflow-hidden sticky top-24" style={{ background: "linear-gradient(160deg, #0e0e0e 0%, #0a0a0a 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.14)" }}>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.25em] uppercase mb-1" style={{ color: "oklch(0.78 0.11 75 / 0.5)" }}>Ready to build</p>
                  <p className="text-white/60 text-sm leading-relaxed">WizPilot™ will generate a free storyboard first — you only pay when you approve and render.</p>
                </div>

                <div className="rounded-xl p-3.5" style={{ background: "oklch(0.78 0.11 75 / 0.05)", border: "1px solid oklch(0.78 0.11 75 / 0.10)" }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white/40">Storyboard</span>
                    <span className="text-xs font-bold" style={{ color: "oklch(0.78 0.11 75)" }}>Free</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">Final render</span>
                    <span className="text-xs font-bold text-white/60">Credits on approval</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="w-full py-3.5 rounded-xl text-sm font-black tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: prompt.trim() ? "linear-gradient(135deg, oklch(0.78 0.11 75) 0%, oklch(0.65 0.10 65) 100%)" : "oklch(0.78 0.11 75 / 0.15)",
                    color: prompt.trim() ? "#0a0a0a" : "rgba(255,255,255,0.3)",
                    boxShadow: prompt.trim() ? "0 0 30px oklch(0.78 0.11 75 / 0.25)" : "none",
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate with WizPilot™
                </button>

                {!isAuthenticated && (
                  <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                    <a href={getLoginUrl()} style={{ color: "oklch(0.78 0.11 75 / 0.6)" }}>Sign in</a> to save your videos
                  </p>
                )}
              </div>

              {/* Pipeline preview */}
              <div className="px-5 pb-5">
                <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-3" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }}>Pipeline</p>
                {[
                  { label: "WizCreate™", desc: "Storyboard generation" },
                  { label: "WizAnimate™", desc: "Scene animation" },
                  { label: "WizSync™", desc: "Audio alignment" },
                  { label: "WizGenesis™", desc: "Final render" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 mb-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black" style={{ background: "oklch(0.78 0.11 75 / 0.10)", color: "oklch(0.78 0.11 75 / 0.6)", border: "1px solid oklch(0.78 0.11 75 / 0.15)" }}>{i + 1}</div>
                    <div>
                      <p className="text-[11px] font-bold text-white/60">{step.label}</p>
                      <p className="text-[9px] text-white/25">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(160deg, #0e0e0e 0%, #0a0a0a 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.08)" }}>
              <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-3" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }}>Prompt Tips</p>
              {[
                "Be specific about setting, mood, and lighting",
                "Mention camera angles and movements",
                "Describe character actions and emotions",
                "Include atmosphere: time of day, weather",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "oklch(0.78 0.11 75 / 0.4)" }} />
                  <p className="text-[11px] text-white/35 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <LandscapeHint />
    </div>
  );
}
