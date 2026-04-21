import { useEffect, useRef, useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Music2, Film, User, Brain, Zap, Bell, Rocket,
  ChevronRight, ArrowRight,
} from "@/lib/icons";

const STEPS = [
  {
    step: 1,
    iconImg: "/manus-storage/wizaudio-logo-v1_f428aad0.png",
    icon: Music2,
    title: "Create or Upload Audio",
    desc: "Create a song with AI or upload your own track",
    color: "violet",
    iconBg: "bg-[--color-gold]/15",
    iconColor: "text-[--color-gold]",
    borderColor: "border-[--color-gold]/30",
    glowColor: "shadow-violet-500/20",
    dotColor: "bg-[--color-gold]",
    lineColor: "from-[#b8892a]/60",
  },
  {
    step: 2,
    iconImg: "/manus-storage/wizvideo-logo-v1_9ec37e45.png",
    icon: Film,
    title: "Generate Your Video",
    desc: "Turn your audio into a cinematic video or animation",
    color: "cyan",
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    borderColor: "border-cyan-500/30",
    glowColor: "shadow-cyan-500/20",
    dotColor: "bg-cyan-500",
    lineColor: "from-[#9090a0]/60",
  },
  {
    step: 3,
    iconImg: "/manus-storage/wizanimate-logo-new_a84f9808.png",
    icon: User,
    title: "Lock Your Character",
    desc: "Upload a photo or generate your own AI character — locked across every scene",
    color: "pink",
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    borderColor: "border-pink-500/30",
    glowColor: "shadow-pink-500/20",
    dotColor: "bg-pink-500",
    lineColor: "from-[#9090a0]/60",
  },
  {
    step: 4,
    iconImg: "/manus-storage/wizcreate-logo-new_85a25756.png",
    icon: Brain,
    title: "Build Your Storyboard",
    desc: "Preview and refine every scene before building your full video",
    color: "amber",
    iconBg: "bg-[--color-gold]/15",
    iconColor: "text-[--color-gold]",
    borderColor: "border-[--color-gold]/30",
    glowColor: "shadow-amber-500/20",
    dotColor: "bg-[--color-gold]",
    lineColor: "from-[#b8892a]/60",
  },
  {
    step: 5,
    iconImg: "/manus-storage/wizimage-logo-v1_83c86e5c.png",
    icon: Zap,
    title: "Full Video Render",
    desc: "Render your complete video only when you're happy",
    color: "emerald",
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    borderColor: "border-[--color-silver]/30",
    glowColor: "shadow-emerald-500/20",
    dotColor: "bg-[--color-silver]",
    lineColor: "from-[#9090a0]/60",
  },
  {
    step: 6,
    iconImg: "/manus-storage/wizscript-logo-v1_c6af5345.png",
    icon: Bell,
    title: "Get Notified",
    desc: "Get notified when your video is ready — by email or dashboard",
    color: "sky",
    iconBg: "bg-sky-500/20",
    iconColor: "text-sky-400",
    borderColor: "border-sky-500/30",
    glowColor: "shadow-sky-500/20",
    dotColor: "bg-sky-500",
    lineColor: "from-sky-500/60",
  },
  {
    step: 7,
    iconImg: "/manus-storage/wizboost-logo-new_93f2b48b.png",
    icon: Rocket,
    title: "Share & Grow",
    desc: "Share your creation, grow your audience, and promote your content",
    color: "rose",
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    borderColor: "border-rose-500/30",
    glowColor: "shadow-rose-500/20",
    dotColor: "bg-rose-500",
    lineColor: "from-[#9090a0]/60",
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function AllInOnePlatform() {
  const { ref: sectionRef, inView } = useInView(0.1);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-5 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #0d0a14 50%, #0a0a0a 100%)" }}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-[--color-gold]/15 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] rounded-full bg-[--color-silver]/10 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[300px] rounded-full bg-[--color-silver]/10 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* Label pill */}
          <div className="inline-flex items-center gap-2 bg-[--color-gold]/15 border border-[--color-gold]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-[--color-gold] text-xs font-semibold uppercase tracking-widest">All-in-One Platform</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            The complete AI video creation platform
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#b8892a] via-cyan-400 to-[#2e2e36]">
              — all in one place
            </span>
          </h2>
          <p className="text-white/55 text-lg max-w-2xl mx-auto leading-relaxed">
            From <span className="text-[--color-gold] font-semibold">idea</span> → to{" "}
            <span className="text-[--color-silver] font-semibold">song</span> → to{" "}
            <span className="text-[--color-silver] font-semibold">video</span> → to{" "}
            <span className="text-[--color-silver] font-semibold">audience</span>.{" "}
            No tools. No complexity. Just create.
          </p>
        </div>

        {/* Desktop: horizontal scroll flow */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-[52px] left-[calc(100%/14)] right-[calc(100%/14)] h-px bg-gradient-to-r from-[#b8892a]/40 via-cyan-500/40 via-pink-500/40 via-amber-500/40 via-emerald-500/40 via-sky-500/40 to-[#2e2e36]/40" />

            <div className="grid grid-cols-7 gap-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = activeStep === s.step;
                const delay = i * 80;
                return (
                  <div
                    key={s.step}
                    className={`relative flex flex-col items-center text-center transition-all duration-700 cursor-default ${
                      inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                    }`}
                    style={{ transitionDelay: `${delay}ms` }}
                    onMouseEnter={() => setActiveStep(s.step)}
                    onMouseLeave={() => setActiveStep(null)}
                  >
                    {/* Step number dot on line */}
                    <div className={`relative z-10 w-[104px] h-[104px] rounded-2xl border ${s.borderColor} ${s.iconBg} flex flex-col items-center justify-center mb-4 transition-all duration-300 ${
                      isActive ? `scale-110 shadow-2xl ${s.glowColor}` : "scale-100"
                    }`}>
                      {/* Step number */}
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${s.iconColor} opacity-60 mb-1`}>
                        Step {s.step}
                      </span>
                      <img src={s.iconImg} alt={s.title} className="w-10 h-10 object-contain" />
                    </div>

                    {/* Arrow between steps (not after last) */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute top-[52px] -right-2 z-20 hidden xl:flex">
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                    )}

                    <h3 className={`text-white font-bold text-xs leading-tight mb-1.5 transition-colors duration-200 ${isActive ? "text-white" : "text-white/85"}`}>
                      {s.title}
                    </h3>
                    <p className={`text-[11px] leading-relaxed transition-colors duration-200 ${isActive ? "text-white/70" : "text-white/40"}`}>
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet: vertical stacked cards */}
        <div className="lg:hidden space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const delay = i * 60;
            return (
              <div
                key={s.step}
                className={`flex items-start gap-4 p-4 rounded-2xl border ${s.borderColor} ${s.iconBg} transition-all duration-700 ${
                  inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
                }`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${s.iconBg} border ${s.borderColor} flex items-center justify-center flex-shrink-0`}>
                  <img src={s.iconImg} alt={s.title} className="w-7 h-7 object-contain" />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${s.iconColor} opacity-70`}>
                      Step {s.step}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-sm leading-tight mb-1">{s.title}</h3>
                  <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
                </div>
                {/* Connector arrow (not last) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[36px] mt-[60px]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom tagline + CTA */}
        <div
          className={`text-center mt-16 transition-all duration-700 delay-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-white/40 text-sm font-medium mb-6 tracking-wide">
            Everything you need to create, build, and grow — in one platform
          </p>
          <NavLink
            href="/create"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white font-bold px-8 py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/25 text-sm"
          >
            Start Creating
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>
    </section>
  );
}
