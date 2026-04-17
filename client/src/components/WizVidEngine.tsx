/**
 * WIZ AI Engine Section
 * Animated pipeline flow: Audio/Idea → WizCreate → WizAnimate + WizSync → WizSound → WizLumina → WizGenesis → WizBoost
 */
import { useEffect, useRef, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { ArrowRight, ChevronRight } from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

interface PipelineStep {
  id: string;
  label: string;
  sublabel?: string;
  role: string;
  colour: string;
  glow: string;
  border: string;
  bg: string;
  icon: string;
  href: string;
  isInput?: boolean;
  isBranch?: boolean;
  branchWith?: string;
}

const PIPELINE: PipelineStep[] = [
  {
    id: "input",
    label: "Audio / Idea",
    role: "Your starting point",
    colour: "white",
    glow: "shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    border: "border-white/20",
    bg: "bg-white/5",
    icon: "🎵",
    href: "/music-video/create",
    isInput: true,
  },
  {
    id: "wizcreate",
    label: "WizCreate™",
    role: "The Brain",
    colour: "violet",
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.35)]",
    border: "border-violet-500/40",
    bg: "bg-violet-500/8",
    icon: `${CDN}/wizcreate-logo-final_9f61f0de.png`,
    href: "/products/wizcreate",
  },
  {
    id: "wizanimate",
    label: "WizAnimate™",
    sublabel: "+ WizSync™",
    role: "The Performer",
    colour: "cyan",
    glow: "shadow-[0_0_24px_rgba(6,182,212,0.35)]",
    border: "border-cyan-500/40",
    bg: "bg-cyan-500/8",
    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizanimate-logo-v2_b363ca67.png",
    href: "/products/wizanimate",
    isBranch: true,
    branchWith: "WizSync™",
  },
  {
    id: "wizsound",
    label: "WizSound™",
    role: "The Composer",
    colour: "emerald",
    glow: "shadow-[0_0_24px_rgba(16,185,129,0.35)]",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/8",
    icon: `${CDN}/wizsound-logo-v5_76ab5163.png`,
    href: "/products/wizsound",
  },
  {
    id: "wizlumina",
    label: "WizLumina™",
    role: "The Cinematographer",
    colour: "amber",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.35)]",
    border: "border-amber-500/40",
    bg: "bg-amber-500/8",
    icon: `${CDN}/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp`,
    href: "/products/wizlumina",
  },
  {
    id: "wizgenesis",
    label: "WizGenesis™",
    role: "The Renderer",
    colour: "rose",
    glow: "shadow-[0_0_24px_rgba(244,63,94,0.35)]",
    border: "border-rose-500/40",
    bg: "bg-rose-500/8",
    icon: `${CDN}/wizgenesis-logo-final-jzVZtHAidTTQv5WxPAdJcz.webp`,
    href: "/products/wizgenesis",
  },
  {
    id: "wizboost",
    label: "WizBoost™",
    role: "The Amplifier",
    colour: "orange",
    glow: "shadow-[0_0_24px_rgba(249,115,22,0.35)]",
    border: "border-orange-500/40",
    bg: "bg-orange-500/8",
    icon: `${CDN}/module-wizboost_ce93c033.png`,
    href: "/products/wizboost",
  },
];

const COLOUR_MAP: Record<string, { text: string; badge: string; dot: string }> = {
  white: { text: "text-white", badge: "bg-white/10 text-white/70 border-white/20", dot: "bg-white" },
  violet: { text: "text-violet-300", badge: "bg-violet-500/10 text-violet-300 border-violet-500/25", dot: "bg-violet-400" },
  cyan: { text: "text-cyan-300", badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25", dot: "bg-cyan-400" },
  emerald: { text: "text-emerald-300", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  amber: { text: "text-amber-300", badge: "bg-amber-500/10 text-amber-300 border-amber-500/25", dot: "bg-amber-400" },
  rose: { text: "text-rose-300", badge: "bg-rose-500/10 text-rose-300 border-rose-500/25", dot: "bg-rose-400" },
  orange: { text: "text-orange-300", badge: "bg-orange-500/10 text-orange-300 border-orange-500/25", dot: "bg-orange-400" },
};

function useRevealOnce(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function WizVidEngine() {
  const { ref, visible } = useRevealOnce(0.1);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      className="py-24 px-6 bg-[#080808] relative overflow-hidden"
      aria-label="The WIZ AI Engine"
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 90% 70% at 50% 40%, rgba(139,92,246,0.06) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-400/25 bg-violet-500/8 text-violet-300 text-xs font-mono tracking-widest uppercase font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            System Architecture
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            The{" "}
            <span className="bg-gradient-to-r from-violet-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">
              WIZ AI Engine
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Seven specialised AI modules, each engineered for one stage of video creation — working in sequence to transform any audio or idea into a cinematic masterpiece.
          </p>
        </div>

        {/* Pipeline — desktop horizontal, mobile vertical */}
        <div className="hidden lg:flex items-center justify-between gap-0 relative">
          {/* Connecting line behind cards */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-white/5 via-violet-500/30 to-orange-500/20 -translate-y-1/2 z-0" />

          {PIPELINE.map((step, i) => {
            const c = COLOUR_MAP[step.colour];
            const isActive = activeStep === step.id;
            const delay = `${i * 80}ms`;
            const isImg = step.icon.startsWith("http");

            return (
              <div key={step.id} className="flex items-center z-10">
                <NavLink
                  href={step.isInput ? step.href : step.href}
                  className={`group relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-300 cursor-pointer w-[118px]
                    ${step.border} ${step.bg} ${step.glow}
                    ${isActive ? "scale-105" : "hover:scale-105"}
                    ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                  `}
                  style={{ transitionDelay: delay }}
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  {/* Icon */}
                  <div className="w-14 h-14 mb-3 flex items-center justify-center">
                    {isImg ? (
                      <img
                        src={step.icon}
                        alt={step.label}
                        className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(139,92,246,0.5)] group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{step.icon}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className={`text-xs font-bold ${c.text} leading-tight mb-1`}>{step.label}</div>
                  {step.sublabel && (
                    <div className="text-[10px] text-white/40 leading-tight mb-1">{step.sublabel}</div>
                  )}

                  {/* Role badge */}
                  <div className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${c.badge}`}>
                    {step.role}
                  </div>

                  {/* Hover arrow */}
                  {!step.isInput && (
                    <div className={`mt-2 flex items-center gap-0.5 text-[9px] font-semibold ${c.text} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                      Explore <ChevronRight className="w-2.5 h-2.5" />
                    </div>
                  )}
                </NavLink>

                {/* Arrow connector */}
                {i < PIPELINE.length - 1 && (
                  <div className="flex items-center justify-center w-6 flex-shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 text-white/20" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical stack */}
        <div className="lg:hidden space-y-3">
          {PIPELINE.map((step, i) => {
            const c = COLOUR_MAP[step.colour];
            const isImg = step.icon.startsWith("http");
            const delay = `${i * 60}ms`;

            return (
              <div key={step.id}>
                <NavLink
                  href={step.href}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300
                    ${step.border} ${step.bg}
                    ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}
                  `}
                  style={{ transitionDelay: delay }}
                >
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                    {isImg ? (
                      <img src={step.icon} alt={step.label} className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-2xl">{step.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${c.text}`}>{step.label}{step.sublabel ? ` ${step.sublabel}` : ""}</div>
                    <div className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider inline-flex mt-1 ${c.badge}`}>
                      {step.role}
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 ${c.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                </NavLink>
                {i < PIPELINE.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-gradient-to-b from-white/10 to-white/5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div
          className={`text-center mt-14 transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <NavLink
            href="/music-video/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-purple-500 transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            Start the Engine <ArrowRight className="w-4 h-4" />
          </NavLink>
          <p className="text-white/30 text-xs mt-3">From idea to cinematic video in minutes</p>
        </div>
      </div>
    </section>
  );
}
