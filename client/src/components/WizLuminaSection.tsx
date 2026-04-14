/**
 * WizLuminaSection — Homepage visual enhancement comparison section.
 *
 * Shows a side-by-side / toggle comparison of Standard vs WizLumina™ Cinematic
 * visual quality using CSS filters applied dynamically to the same video source.
 * Mirrors the WizSoundSection pattern but for visual enhancement.
 */
import { useState, useRef, useEffect } from "react";
import { Eye, Sparkles, Film, Palette, Sun, Layers } from "lucide-react";

const WIZLUMINA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-logo-W8B2HDZw99Ld29Xm46xqXN.webp";

// Demo video — same source used in WizSoundSection
const DEMO_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-video_6b0a3c2d.mp4";

type VisualMode = "standard" | "cinematic";

const STANDARD_FILTER = "brightness(0.85) contrast(0.9) saturate(0.8) grayscale(0.05)";
const CINEMATIC_FILTER = "brightness(1.08) contrast(1.18) saturate(1.35) hue-rotate(2deg)";

const FEATURES = [
  {
    icon: Palette,
    title: "Advanced Colour Grading",
    description: "Hollywood-grade LUT processing transforms flat AI footage into rich, vivid cinematic colour.",
  },
  {
    icon: Film,
    title: "Cinematic Tone Mapping",
    description: "HDR-style tone mapping delivers deeper blacks, brighter highlights, and true film-level contrast.",
  },
  {
    icon: Sun,
    title: "Film-Level Finish",
    description: "Every frame is enhanced with professional-grade sharpening, noise reduction, and colour science.",
  },
  {
    icon: Layers,
    title: "Visual Depth & Clarity",
    description: "Proprietary spatial enhancement adds dimension and presence to every shot — like upgrading to IMAX.",
  },
];

export function WizLuminaSection() {
  const [mode, setMode] = useState<VisualMode>("standard");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Smooth transition when switching modes
  function handleModeSwitch(newMode: VisualMode) {
    if (newMode === mode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      setIsTransitioning(false);
    }, 150);
  }

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.play().catch(() => {});
  }, []);

  const currentFilter = mode === "cinematic" ? CINEMATIC_FILTER : STANDARD_FILTER;

  return (
    <section className="relative py-24 overflow-hidden bg-[#050508]">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] rounded-full bg-violet-600/6 blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-3 mb-5">
            <img src={WIZLUMINA_LOGO} alt="WizLumina" className="w-10 h-10 rounded-full" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold tracking-[0.2em] text-amber-400/70 uppercase">Introducing</span>
              <span className="text-lg font-bold text-white tracking-tight">WizLumina™</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
              Cinematic Visual Engine
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Film-Level Visuals.<br />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Every Frame.
            </span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            WizLumina™ applies advanced colour grading, HDR tone mapping, and cinematic sharpening to transform your AI video from flat to film-quality — instantly.
          </p>
        </div>

        {/* Video comparison */}
        <div className="relative max-w-3xl mx-auto mb-14">
          {/* Toggle pills */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <button
              onClick={() => handleModeSwitch("standard")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                mode === "standard"
                  ? "bg-white/15 border border-white/30 text-white shadow-lg"
                  : "bg-white/5 border border-white/10 text-white/45 hover:text-white/70 hover:bg-white/8"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Standard
            </button>
            <div className="w-px h-5 bg-white/15" />
            <button
              onClick={() => handleModeSwitch("cinematic")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                mode === "cinematic"
                  ? "bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-400/50 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                  : "bg-white/5 border border-white/10 text-white/45 hover:text-amber-300/70 hover:bg-amber-500/8"
              }`}
            >
              <img src={WIZLUMINA_LOGO} alt="" className="w-3.5 h-3.5 rounded-full" />
              WizLumina™ Cinematic
              <span className="px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 text-[9px] font-bold">+£5</span>
            </button>
          </div>

          {/* Video container */}
          <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-500 ${
            mode === "cinematic"
              ? "border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.25)]"
              : "border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          }`}>
            {/* Mode label overlay */}
            <div className="absolute top-3 left-3 z-10">
              {mode === "cinematic" ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/25 border border-amber-400/40 backdrop-blur-sm">
                  <img src={WIZLUMINA_LOGO} alt="" className="w-3.5 h-3.5 rounded-full" />
                  <span className="text-[11px] font-bold text-amber-200 tracking-wide">WizLumina™ Cinematic</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 backdrop-blur-sm">
                  <Eye className="w-3 h-3 text-white/60" />
                  <span className="text-[11px] font-semibold text-white/60">Standard</span>
                </div>
              )}
            </div>

            {/* Video with dynamic CSS filter */}
            <div
              className="transition-all duration-300"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              <video
                ref={videoRef}
                src={DEMO_VIDEO}
                className="w-full aspect-video object-cover"
                style={{ filter: currentFilter, transition: "filter 0.6s ease" }}
                muted
                loop
                playsInline
                autoPlay
              />
            </div>

            {/* Cinematic vignette overlay */}
            {mode === "cinematic" && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                  background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
                  opacity: isTransitioning ? 0 : 1,
                }}
              />
            )}
          </div>

          {/* Comparison hint */}
          <p className="text-center text-xs text-white/30 mt-3">
            Same video source — toggle to see the WizLumina™ Cinematic Engine difference
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group p-5 rounded-2xl bg-white/3 border border-white/8 hover:border-amber-500/25 hover:bg-amber-500/5 transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center mb-3 group-hover:bg-amber-500/25 transition-colors">
                  <Icon className="w-4.5 h-4.5 text-amber-400" />
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
              <div className="text-xs text-amber-400/60 mb-0.5">WizLumina Enhance</div>
              <div className="text-lg font-bold text-amber-300">+£2</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-xs text-amber-400/80 mb-0.5">WizLumina Cinematic</div>
              <div className="text-lg font-bold text-amber-200">+£5</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-900/30 to-violet-900/20 border border-fuchsia-500/30">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <div>
              <div className="text-xs font-bold text-fuchsia-300">Cinematic Mode Bundle</div>
              <div className="text-[11px] text-white/50">WizSound + WizLumina Cinematic — <span className="text-fuchsia-300 font-semibold">+£8</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WizLuminaSection;
