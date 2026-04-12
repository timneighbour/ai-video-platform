import { useEffect, useRef, useState } from "react";
import { Volume2, Zap, Music2, Film } from "lucide-react";

/* ── Animated waveform bars ─────────────────────────────────────────────── */
function WaveformVisualizer({ active }: { active: boolean }) {
  const bars = [14, 24, 36, 48, 44, 38, 30, 22, 32, 44, 50, 42, 32, 36, 46, 52, 44, 34, 24, 16, 28, 40, 52, 44, 36, 28, 20, 32, 44, 48];
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: 3,
            height: active ? `${h}%` : "20%",
            background: active
              ? `linear-gradient(to top, rgba(217,70,239,0.9), rgba(139,92,246,0.7))`
              : "rgba(255,255,255,0.12)",
            animation: active ? `waveBar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate` : "none",
            animationDelay: `${(i * 0.04) % 0.5}s`,
            boxShadow: active ? `0 0 6px rgba(217,70,239,0.5)` : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  );
}

/* ── 3D depth orb ────────────────────────────────────────────────────────── */
function DepthOrb() {
  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full opacity-30 animate-pulse"
        style={{
          background: "radial-gradient(circle, rgba(217,70,239,0.4) 0%, rgba(139,92,246,0.2) 50%, transparent 70%)",
          animationDuration: "3s",
        }}
      />
      {/* Mid ring */}
      <div
        className="absolute inset-8 rounded-full border border-fuchsia-500/20"
        style={{ boxShadow: "0 0 40px rgba(217,70,239,0.15), inset 0 0 40px rgba(139,92,246,0.08)" }}
      />
      {/* Inner sphere */}
      <div
        className="absolute inset-16 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 35% 35%, rgba(217,70,239,0.6), rgba(99,50,200,0.8) 60%, rgba(10,10,20,0.95))",
          boxShadow: "0 0 60px rgba(217,70,239,0.3), inset 0 0 30px rgba(255,255,255,0.05)",
        }}
      >
        <Volume2 className="w-8 h-8 text-white/80" />
      </div>
      {/* Orbiting particle */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ animation: "orbit 4s linear infinite" }}
      >
        <div
          className="absolute w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.8)]"
          style={{ top: "8%", left: "50%", transform: "translateX(-50%)" }}
        />
      </div>
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ── Feature card ────────────────────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-2xl border border-white/8 bg-white/3 p-6 overflow-hidden group hover:border-fuchsia-500/30 hover:bg-white/5 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {/* Gradient accent top-left */}
      <div
        className="absolute top-0 left-0 w-24 h-24 rounded-br-full opacity-20 group-hover:opacity-30 transition-opacity duration-500"
        style={{ background: gradient }}
      />
      <div className="relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: gradient, boxShadow: `0 0 20px rgba(217,70,239,0.2)` }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-white font-bold text-base mb-2">{title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ── Main section ────────────────────────────────────────────────────────── */
export default function WizSoundSection() {
  const [waveActive, setWaveActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Trigger wave animation when section is in view
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          setWaveActive(true);
        } else {
          setWaveActive(false);
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-28 px-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a14 0%, #0d0d1a 50%, #0a0a0f 100%)" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        }}
      />
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />

      <div className="relative max-w-6xl mx-auto">

        {/* Header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-xs font-mono tracking-widest uppercase font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            Powered by WizSound™
          </div>

          <h2
            className="font-extrabold tracking-tight text-white mb-4"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", lineHeight: 1.1 }}
          >
            Cinematic sound.{" "}
            <span
              className="bg-gradient-to-r from-fuchsia-300 via-purple-200 to-indigo-300 bg-clip-text text-transparent"
            >
              Not just visuals.
            </span>
          </h2>

          <p className="text-white/55 text-lg max-w-2xl mx-auto leading-relaxed">
            WizSound™ transforms your audio into an immersive, cinematic experience — adding depth, clarity, and impact to every video.
          </p>
        </div>

        {/* Central visual + waveform */}
        <div
          className="flex flex-col items-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
          }}
        >
          <DepthOrb />
          <div className="mt-8 w-full max-w-md">
            <WaveformVisualizer active={waveActive} />
          </div>
          {/* Callout */}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/8 text-fuchsia-300/70 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60 animate-pulse" />
            Simulated cinematic spatial audio experience
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-14">
          <FeatureCard
            icon={Volume2}
            title="Immersive Depth"
            description="Audio that surrounds the viewer — layered and spatial, not flat stereo. WizSound™ adds Haas stereo enhancement and spatial reverb for a three-dimensional sound field."
            gradient="linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,50,200,0.6))"
            delay={0}
          />
          <FeatureCard
            icon={Zap}
            title="Cinematic Mastering"
            description="AI-enhanced clarity, punch, and balance — like a professionally mastered soundtrack. 5-band EQ, dynamic compression, and loudness normalisation to streaming standards."
            gradient="linear-gradient(135deg, rgba(217,70,239,0.8), rgba(139,92,246,0.6))"
            delay={100}
          />
          <FeatureCard
            icon={Film}
            title="Built for Video"
            description="Optimised specifically for music videos, animation, and storytelling. Every processing step is tuned for the emotional impact of moving image, not just standalone listening."
            gradient="linear-gradient(135deg, rgba(236,72,153,0.8), rgba(217,70,239,0.6))"
            delay={200}
          />
        </div>

        {/* Tier comparison strip */}
        <div
          className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s",
          }}
        >
          <div className="grid grid-cols-3 divide-x divide-white/8">
            {[
              { label: "Standard Audio", sub: "Original mix", price: "Included", colour: "text-white/50", icon: Music2 },
              { label: "WizSound Enhance", sub: "Polished, fuller sound", price: "+£1", colour: "text-violet-300", icon: Volume2 },
              { label: "WizSound Cinematic", sub: "Full mastering pipeline", price: "+£3", colour: "text-fuchsia-300", icon: Zap, badge: "RECOMMENDED" },
            ].map((tier) => (
              <div key={tier.label} className={`relative p-5 text-center ${tier.badge ? "bg-fuchsia-500/5" : ""}`}>
                {tier.badge && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-lg bg-fuchsia-500 text-white text-[9px] font-bold tracking-widest">
                    {tier.badge}
                  </div>
                )}
                <tier.icon className={`w-5 h-5 mx-auto mb-2 mt-3 ${tier.colour}`} />
                <p className={`text-sm font-bold ${tier.colour}`}>{tier.label}</p>
                <p className="text-white/35 text-xs mt-1">{tier.sub}</p>
                <p className={`text-base font-extrabold mt-2 ${tier.badge ? "text-fuchsia-300" : "text-white/60"}`}>{tier.price}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
