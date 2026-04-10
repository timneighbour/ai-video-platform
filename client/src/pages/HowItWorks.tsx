import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN assets (same as Home.tsx) ────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO_FULL = `${CDN}/wizvid-logo-cropped_86dbad19.png`;

const STEP_IMAGES = {
  upload: `${CDN}/step1-upload-audio-byRxxURESoxMZYpCB7FKpm.webp`,
  styles: `${CDN}/step2-style-collage-P6HWeTbd9g6UsLFLRWYJEi.webp`,
  render: `${CDN}/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp`,
};

// ── Detailed walkthrough steps ───────────────────────────────────────────────
const WALKTHROUGH_STEPS = [
  {
    step: "01",
    icon: "🎬",
    title: "Choose your video type",
    desc: "Pick from Music Video, YouTube/WizPilot, Kids Video, or Text to Video. Each has a tailored flow built for your content.",
    visual: (
      <div className="flex flex-wrap gap-2 mt-3">
        {["🎤 Music Video", "🎥 WizPilot", "🧒 Kids Video", "✨ Text to Video"].map((t) => (
          <span key={t} className="text-xs bg-white/8 border border-white/10 rounded-full px-3 py-1 text-white/80">{t}</span>
        ))}
      </div>
    ),
  },
  {
    step: "02",
    icon: "🎨",
    title: "Pick your style",
    desc: "Choose from 11 cinematic styles — Cinematic, Anime, Pixar 3D, Documentary, Neon Noir, Disney, Epic Fantasy, Realistic, Horror, Abstract, or Vintage.",
    visual: (
      <div className="flex flex-wrap gap-2 mt-3">
        {["🎬 Cinematic", "🌸 Anime", "✨ Pixar 3D", "🌃 Neon Noir", "🏰 Disney"].map((t) => (
          <span key={t} className="text-xs bg-violet-500/15 border border-violet-500/25 rounded-full px-3 py-1 text-violet-300">{t}</span>
        ))}
      </div>
    ),
  },
  {
    step: "03",
    icon: "🖼️",
    title: "Preview your storyboard",
    desc: "WizVid instantly generates an AI storyboard with scene images. Review every scene, edit any prompt, and approve before spending a single credit.",
    visual: (
      <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/8 text-xs text-white/60">
        💡 <span className="text-white/80 font-medium">Free to preview</span> — you only pay credits when you click Render
      </div>
    ),
  },
  {
    step: "04",
    icon: "🚀",
    title: "Render your video",
    desc: "Happy with the storyboard? Hit Render and WizVid generates your full video — every scene synced, styled, and ready to download.",
    visual: (
      <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-300">
        ✅ Download MP4 · Share anywhere · Your video, your rights
      </div>
    ),
  },
];

// ── Three high-level step cards ───────────────────────────────────────────────
const STEP_CARDS = [
  {
    step: "01",
    icon: "🎵",
    title: "Upload your audio or idea",
    desc: "Drop in your song, describe your concept, or let AI generate the music.",
    img: STEP_IMAGES.upload,
    imgAlt: "Audio waveform upload interface with glowing violet microphone",
    accent: "from-violet-500/20 to-violet-500/0",
  },
  {
    step: "02",
    icon: "🎨",
    title: "Choose your style",
    desc: "Pick from Cinematic, Anime, Pixar 3D, Documentary, Abstract, or Vintage.",
    img: STEP_IMAGES.styles,
    imgAlt: "Four-panel collage showing Cinematic, Anime, Pixar 3D, and Vintage video styles",
    accent: "from-blue-500/20 to-blue-500/0",
  },
  {
    step: "03",
    icon: "🚀",
    title: "WizVid generates your video",
    desc: "AI builds your storyboard, renders every scene, and delivers a complete video.",
    img: STEP_IMAGES.render,
    imgAlt: "AI-generated cinematic music video scene — singer on stage with cosmic LED backdrop",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
];

export default function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Nav bar ── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/8 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          {/* Logo */}
          <a href="/" className="absolute left-1/2 -translate-x-1/2">
            <img
              src={WIZVID_LOGO_FULL}
              alt="WizVid"
              className="h-9 w-auto object-contain"
            />
          </a>

          {/* CTA */}
          <Button
            className="bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9 shadow-sm"
            asChild
          >
            <a href="/onboarding">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Get Started
            </a>
          </Button>
        </div>
      </nav>

      {/* ── Hero header ── */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-6">
          How it works
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
          Three steps to your video
        </h1>
        <p className="text-[#a1a1aa] text-lg max-w-lg mx-auto">
          From idea to full video in under 5 minutes — no editing required.
        </p>
      </div>

      {/* ── Three-step visual cards ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {STEP_CARDS.map((step, i) => (
            <div
              key={step.step}
              className="rounded-2xl bg-[#171717] border border-white/6 hover:border-white/14 transition-all overflow-hidden group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Step image */}
              <div className="relative w-full aspect-video overflow-hidden">
                <img
                  src={step.img}
                  alt={step.imgAlt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${step.accent} mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent" />
              </div>
              {/* Step content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{step.icon}</span>
                  <span className="text-xs font-bold text-[#a1a1aa] tracking-widest">STEP {step.step}</span>
                </div>
                <h3 className="font-semibold text-white text-base mb-2">{step.title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-white/8" />
      </div>

      {/* ── Detailed walkthrough ── */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-3">Step by step</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
            How WizVid works
          </h2>
          <p className="text-[#a1a1aa]">A closer look at each stage of the creation process.</p>
        </div>

        <div className="space-y-2">
          {WALKTHROUGH_STEPS.map((s, i) => (
            <div key={s.step} className="flex gap-5">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-xl flex-shrink-0">
                  {s.icon}
                </div>
                {i < WALKTHROUGH_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-white/8 mt-2 mb-2" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#a1a1aa] tracking-widest">STEP {s.step}</span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed">{s.desc}</p>
                {s.visual}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA section ── */}
      <div className="bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] border-t border-white/6 py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
          Ready to create your video?
        </h2>
        <p className="text-[#a1a1aa] text-lg mb-8 max-w-md mx-auto">
          Preview your full storyboard for free — no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            className="bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
            asChild
          >
            <a href="/onboarding">
              <Sparkles className="w-4 h-4 mr-2" />Ready to Create Video
            </a>
          </Button>
          <Button
            variant="outline"
            className="border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-8 py-3 rounded-xl font-medium h-auto"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
