/**
 * HowWizAIWorks — Homepage education section.
 * Shows 5 steps of the WIZ AI creation process with images.
 */

const STEPS = [
  {
    number: "01",
    title: "Upload Audio or Type a Prompt",
    description: "Drop in your track or describe your vision. WIZ AI accepts any audio file or a simple text prompt to kick off the creative process.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/how-wizvid-step1-PezKstNEpNvaVTiKdFVnXf.webp",
    accent: "from-[#b8892a] to-[#4a3010]",
    glow: "rgba(139,92,246,0.3)",
  },
  {
    number: "02",
    title: "AI Generates Your Storyboard",
    description: "Our Cinematic Engine analyses your audio and instantly generates a scene-by-scene storyboard — completely free, unlimited regenerations.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/how-wizvid-step2-T3Sv5TmeeN44qoMFcVAjXS.webp",
    accent: "from-[#b8892a] to-[#4a3010]",
    glow: "rgba(217,70,239,0.3)",
  },
  {
    number: "03",
    title: "Preview Your Scenes",
    description: "Review each scene, tweak prompts, and reorder clips until the storyboard matches your creative vision — before spending a single credit.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/how-wizvid-step3-56PvLkzpwjnZhXAa8BwgP8.webp",
    accent: "from-[--color-gold] to-[#4a3010]",
    glow: "rgba(59,130,246,0.3)",
  },
  {
    number: "04",
    title: "Apply WizSound™ + WizLumina™",
    description: "Elevate your video with Studio-Grade Sound and Film-Level Visuals. Choose Enhance or go full Cinematic Mode for the complete IMAX experience.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/how-wizvid-step4-8VnjmVDLFCTrnhiYfERbHz.webp",
    accent: "from-[#b8892a] to-[#4a3010]",
    glow: "rgba(245,158,11,0.3)",
  },
  {
    number: "05",
    title: "Render Your Cinematic Video",
    description: "Hit render and receive your finished video in 720p, 1080p, or 4K — ready to share on YouTube, Instagram, TikTok, or anywhere you create.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/how-wizvid-step5-aWVkp46Dt35wGRfwfgDX6S.webp",
    accent: "from-[#9090a0] to-[#4a3010]",
    glow: "rgba(16,185,129,0.3)",
  },
];

export function HowWizVidWorks() {
  return (
    <section className="relative py-24 overflow-hidden bg-[#06060a]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-semibold tracking-wider uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            Simple 5-Step Process
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            How WIZ AI Works
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            From idea to cinematic video in minutes. No editing skills required — just your creativity and our Cinematic Engine.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`group flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-6 items-center`}
            >
              {/* Image */}
              <div className="w-full md:w-1/2 relative">
                <div
                  className="relative rounded-2xl overflow-hidden border border-white/8 group-hover:border-white/15 transition-all duration-500"
                  style={{ boxShadow: `0 0 60px ${step.glow}` }}
                >
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full aspect-video object-cover"
                    loading="lazy"
                  />
                  {/* Step number overlay */}
                  <div className={`absolute top-3 ${i % 2 === 0 ? "left-3" : "right-3"} w-10 h-10 rounded-xl bg-gradient-to-br ${step.accent} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-black text-sm">{step.number}</span>
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="w-full md:w-1/2 px-2">
                <div className={`inline-block text-5xl font-black bg-gradient-to-r ${step.accent} bg-clip-text text-transparent mb-3 leading-none`}>
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/55 leading-relaxed text-base">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <a
            href="/music-video/create"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#b8892a] to-[#4a3010] text-white font-bold text-base hover:from-[#b8892a] hover:to-[#4a3010] transition-all duration-300 shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)]"
            onClick={(e) => { e.preventDefault(); window.location.href = "/music-video/create"; }}
          >
            Start Creating
            <span className="text-white/70">→</span>
          </a>
          <p className="text-xs text-white/30 mt-3">No credit card required · 2 free renders on sign-up</p>
        </div>
      </div>
    </section>
  );
}

export default HowWizVidWorks;
