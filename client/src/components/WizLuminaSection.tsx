import { mp } from "@/lib/mixpanel";
/**
 * WizLuminaSection — Homepage visual enhancement comparison section.
 *
 * Shows a 3-mode toggle (Standard / Enhanced / Cinematic) with a drag
 * comparison slider for before/after visual demonstration.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, Sparkles, Film, Palette, Sun, Layers, GripVertical } from "@/lib/icons";

const WIZLUMINA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp";
const DEMO_VIDEO = "/manus-storage/demo-video-only_404f1adb.mp4"; // Re-uploaded with video/mp4 MIME type

type VisualMode = "standard" | "enhanced" | "cinematic";

const FILTERS: Record<VisualMode, string> = {
  standard: "brightness(0.82) contrast(0.88) saturate(0.75) grayscale(0.08)",
  enhanced: "brightness(1.06) contrast(1.12) saturate(1.22) hue-rotate(1deg)",
  cinematic: "brightness(1.1) contrast(1.22) saturate(1.42) hue-rotate(3deg)",
};

const MODE_META: Record<VisualMode, {
  label: string;
  sublabel: string;
  description: string;
  accentColor: string;
  borderColor: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
}> = {
  standard: {
    label: "Standard",
    sublabel: "Baseline",
    description: "Flat, unprocessed output — the raw AI video before any enhancement.",
    accentColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.12)",
    glow: "",
    badgeBg: "rgba(0,0,0,0.5)",
    badgeText: "rgba(255,255,255,0.55)",
  },
  enhanced: {
    label: "Enhanced",
    sublabel: "WizLumina™",
    description: "Colour grading, sharpening, and contrast boost — immediate visible improvement.",
    accentColor: "#c49a3c",
    borderColor: "rgba(196,154,60,0.4)",
    glow: "0 0 40px rgba(196,154,60,0.18)",
    badgeBg: "rgba(196,154,60,0.18)",
    badgeText: "#e8c96a",
  },
  cinematic: {
    label: "Cinematic",
    sublabel: "WizLumina™ Ultra",
    description: "HDR tone mapping, deep blacks, vivid highlights, and film-level colour science.",
    accentColor: "#e8c96a",
    borderColor: "rgba(232,201,106,0.5)",
    glow: "0 0 60px rgba(196,154,60,0.25), 0 0 120px rgba(180,180,200,0.06)",
    badgeBg: "linear-gradient(135deg, rgba(196,154,60,0.25), rgba(180,180,200,0.08))",
    badgeText: "#f5e4a0",
  },
};

const FEATURES = [
  { icon: Palette, title: "Colour Grading", description: "Hollywood-grade LUT processing transforms flat AI footage into rich, vivid cinematic colour." },
  { icon: Film, title: "Tone Mapping", description: "HDR-style tone mapping delivers deeper blacks, brighter highlights, and true film-level contrast." },
  { icon: Sun, title: "Film Finish", description: "Professional sharpening, noise reduction, and colour science applied to every frame." },
  { icon: Layers, title: "Visual Depth", description: "Spatial enhancement adds dimension and presence — like upgrading to IMAX." },
];

/* ── Comparison Slider ───────────────────────────────────────────────────── */
function ComparisonSlider({ mode }: { mode: VisualMode }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoLeftRef = useRef<HTMLVideoElement>(null);
  const videoRightRef = useRef<HTMLVideoElement>(null);

  // Autoplay both videos
  useEffect(() => {
    [videoLeftRef, videoRightRef].forEach(ref => {
      const v = ref.current;
      if (!v) return;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.play().catch(() => {});
    });
  }, []);

  // Sync right video to left video time
  useEffect(() => {
    const interval = setInterval(() => {
      const l = videoLeftRef.current;
      const r = videoRightRef.current;
      if (l && r && Math.abs(l.currentTime - r.currentTime) > 0.15) {
        r.currentTime = l.currentTime;
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const updateSlider = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pos = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => updateSlider(e.clientX);
    const onTouchMove = (e: TouchEvent) => updateSlider(e.touches[0].clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updateSlider]);

  const meta = MODE_META[mode];

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden select-none cursor-ew-resize border-2 transition-all duration-500"
      style={{
        borderColor: meta.borderColor,
        boxShadow: meta.glow || "0 0 30px rgba(0,0,0,0.5)",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={(e) => { setDragging(true); updateSlider(e.touches[0].clientX); }}
    >
      {/* Left: Standard (always flat) */}
      <video
        ref={videoLeftRef}
        src={DEMO_VIDEO}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: FILTERS.standard }}
        muted loop playsInline autoPlay
      />

      {/* Right: Selected mode — clipped to right side */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
      >
        <video
          ref={videoRightRef}
          src={DEMO_VIDEO}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: FILTERS[mode], transition: "filter 0.5s ease" }}
          muted loop playsInline autoPlay
        />
        {/* Cinematic vignette */}
        {mode === "cinematic" && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)" }}
          />
        )}
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none"
        style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
      >
        {/* Line */}
        <div className="absolute inset-0 w-0.5 mx-auto bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center pointer-events-auto cursor-ew-resize"
          onMouseDown={onMouseDown}
          onTouchStart={(e) => { setDragging(true); updateSlider(e.touches[0].clientX); }}
        >
          <GripVertical className="w-4 h-4 text-black/70" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/15 bg-black/40">
          <Eye className="w-3 h-3 text-white/60" />
          <span className="text-[10px] font-semibold text-white/60">Standard</span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border"
          style={{ borderColor: meta.borderColor, background: meta.badgeBg }}>
          <img src={WIZLUMINA_LOGO} alt="" className="w-3 h-3 rounded-full" />
          <span className="text-[10px] font-bold" style={{ color: meta.badgeText }}>{meta.sublabel}</span>
        </div>
      </div>

      {/* Drag hint */}
      {!dragging && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/15 backdrop-blur-sm">
            <span className="text-[10px] text-white/50">← drag to compare →</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main section ────────────────────────────────────────────────────────── */
export function WizLuminaSection() {
  const [mode, setMode] = useState<VisualMode>("enhanced");
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const meta = MODE_META[mode];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 overflow-hidden bg-[#050508]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full blur-[120px]" style={{background:'rgba(196,154,60,0.04)'}} />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] rounded-full blur-[100px]" style={{background:'rgba(180,180,200,0.03)'}} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{border:'1px solid rgba(196,154,60,0.25)',background:'rgba(196,154,60,0.07)'}}>
            <img src={WIZLUMINA_LOGO} alt="WizLumina" className="w-3.5 h-3.5 rounded-full" />
            <span className="text-xs font-bold tracking-wider uppercase" style={{color:'#c49a3c'}}>Powered by WizLumina™</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            See the difference with{" "}
            <span className="metallic-gold">
              WizLumina™
            </span>
          </h2>
          <p className="text-white/50 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Drag the slider to compare Standard vs Enhanced vs Cinematic — the difference is immediate.
          </p>
        </div>

        {/* 3-mode toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["standard", "enhanced", "cinematic"] as VisualMode[]).map((m) => {
            const c = MODE_META[m];
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); mp.wizLuminaDemoInteracted(m); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  active ? "text-white" : "text-white/40 hover:text-white/65"
                }`}
                style={active ? {
                  background: m === "standard" ? "rgba(255,255,255,0.12)" : `linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,70,239,0.15))`,
                  border: `1px solid ${c.borderColor}`,
                  boxShadow: c.glow || undefined,
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                aria-pressed={active}
              >
                {m === "standard" ? <Eye className="w-3.5 h-3.5" /> : <img src={WIZLUMINA_LOGO} alt="" className="w-3.5 h-3.5 rounded-full" />}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Comparison slider */}
        <div className="max-w-3xl mx-auto mb-4">
          <ComparisonSlider mode={mode} />
          <p className="text-center text-xs text-white/30 mt-3">
            Same video source — {meta.description}
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group p-5 rounded-2xl bg-white/3 border border-white/8 transition-all duration-300" style={{}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(184,137,42,0.25)';(e.currentTarget as HTMLElement).style.background='rgba(184,137,42,0.04)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.08)';(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'}}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors" style={{background:'rgba(184,137,42,0.12)',border:'1px solid rgba(184,137,42,0.18)'}}>
                  <Icon className="w-4 h-4" style={{color:'#b8892a'}} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>

        {/* Pricing callout */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/3 border border-white/8">
            <div className="text-center">
              <div className="text-xs text-white/40 mb-0.5">Standard</div>
              <div className="text-lg font-bold text-white/60">Free</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-xs mb-0.5" style={{color:'rgba(184,137,42,0.7)'}}>WizLumina Enhanced</div>
              <div className="text-lg font-bold" style={{color:'#d4aa48'}}>+£2</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-xs mb-0.5" style={{color:'rgba(184,137,42,0.85)'}}>WizLumina Cinematic</div>
              <div className="text-lg font-bold" style={{color:'#e8c878'}}>+£5</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl" style={{background:'linear-gradient(135deg,rgba(184,137,42,0.12),rgba(180,180,200,0.06))',border:'1px solid rgba(184,137,42,0.25)'}}>
            <Sparkles className="w-4 h-4" style={{color:'#e8c878'}} />
            <div>
              <div className="text-xs font-bold" style={{color:'#e8c878'}}>Cinematic Bundle</div>
              <div className="text-[11px] text-white/50">WizSound + WizLumina Cinematic — <span className="font-semibold" style={{color:'#e8c878'}}>+£8</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WizLuminaSection;
