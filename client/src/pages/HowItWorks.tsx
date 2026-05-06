import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Sparkles, ArrowLeft, Wand2, Film, Download, Users, MessageSquare,
  CheckCircle2, Clock, Bell, Share2, ArrowRight, Play, Zap, ChevronRight } from "@/lib/icons";
import { Link } from "wouter";

const CDN = "/manus-storage";
const WIZAI_LOGO = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-new_c5cced65_d334a3bb.png`;
const WIZLUMINA_LOGO = `${CDN}/wizlumina-logo-new_0709f3c5_83ddc673.png`;
const WIZBOOST_LOGO = `${CDN}/wizboost-logo-new_93f2b48b_b731a139.png`;
const STEP_IMAGES = {
  upload:   `${CDN}/step1-upload-audio-byRxxURESoxMZYpCB7FKpm.webp`,
  styles:   `${CDN}/step2-style-collage-P6HWeTbd9g6UsLFLRWYJEi.webp`,
  render:   `${CDN}/step3-ai-scene_a71432c5.png`,
  hero:     `${CDN}/whos-it-for-musicians_45f54b69.png`,
  anime:    `${CDN}/whos-it-for-ai-creators_722cf5c6.png`,
  youtuber: `${CDN}/whos-it-for-youtubers_58ce347b.png`,
  kids:     `${CDN}/whos-it-for-kids_09e9420f.png`,
};

const STEP_COLORS = {
  violet:  { primary: "#8b5cf6", mid: "#a78bfa", glow: "rgba(139,92,246,0.35)",  border: "rgba(139,92,246,0.25)",  badge: "rgba(139,92,246,0.12)",  badgeText: "#c4b5fd" },
  blue:    { primary: "#3b82f6", mid: "#60a5fa", glow: "rgba(59,130,246,0.35)",   border: "rgba(59,130,246,0.25)",   badge: "rgba(59,130,246,0.12)",   badgeText: "#93c5fd" },
  emerald: { primary: "#10b981", mid: "#34d399", glow: "rgba(16,185,129,0.35)",   border: "rgba(16,185,129,0.25)",   badge: "rgba(16,185,129,0.12)",   badgeText: "#6ee7b7" },
  amber:   { primary: "#f59e0b", mid: "#fcd34d", glow: "rgba(245,158,11,0.35)",   border: "rgba(245,158,11,0.25)",   badge: "rgba(245,158,11,0.12)",   badgeText: "#fde68a" },
  fuchsia: { primary: "#d946ef", mid: "#e879f9", glow: "rgba(217,70,239,0.35)",   border: "rgba(217,70,239,0.25)",   badge: "rgba(217,70,239,0.12)",   badgeText: "#f0abfc" },
};

const STEPS = [
  {
    num: "01", color: "violet" as const,
    icon: <MessageSquare className="w-7 h-7" />,
    title: "Prompt", headline: "Describe your video idea",
    desc: "Type a prompt, upload your audio, or let AI generate the music. WIZ AI understands natural language — no technical skills needed.",
    details: [
      "Upload your song or describe your concept",
      "Choose from 11 cinematic styles (Cinematic, Anime, Stylised 3D, Neon Noir, and more)",
      "Set mood, genre, and visual direction",
    ],
    badge: "Free to start", image: STEP_IMAGES.upload, stat: "< 30 sec", statLabel: "to generate",
  },
  {
    num: "02", color: "blue" as const,
    icon: <Wand2 className="w-7 h-7" />,
    title: "Storyboard", headline: "AI builds your full storyboard",
    desc: "In under 30 seconds, WIZ AI generates a complete scene-by-scene storyboard with AI images, scene descriptions, and visual prompts.",
    details: [
      "Full storyboard generated instantly — no waiting",
      "Each scene has its own image, prompt, and timing",
      "Edit any scene prompt or swap the visual style",
    ],
    badge: "Completely free", image: STEP_IMAGES.styles, stat: "100%", statLabel: "free preview",
  },
  {
    num: "03", color: "emerald" as const,
    icon: <Film className="w-7 h-7" />,
    title: "Preview", headline: "Review every scene before you pay",
    desc: "See exactly what your video will look like before spending a single credit. Edit, regenerate, or approve each scene individually.",
    details: [
      "Preview every scene image — no surprises",
      "Regenerate any scene you're not happy with",
      "Approve the full storyboard before building",
    ],
    badge: "No credits needed", image: STEP_IMAGES.anime, stat: "0 credits", statLabel: "to preview",
  },
  {
    num: "04", color: "amber" as const,
    icon: <Download className="w-7 h-7" />,
    title: "Final Build", headline: "Build your video in HD or 4K",
    desc: "When you're happy with the storyboard, click Build. WIZ AI animates every scene, syncs audio, and delivers your complete video.",
    details: [
      "Choose HD (1080p) or 4K resolution",
      "WizSound™ audio enhancement included",
      "WizLumina™ visual grading for cinematic quality",
    ],
    badge: "Credits used here", image: STEP_IMAGES.render, stat: "HD + 4K", statLabel: "output quality",
  },
  {
    num: "05", color: "fuchsia" as const,
    icon: <Users className="w-7 h-7" />,
    title: "Share", headline: "Download, share, and grow",
    desc: "Download your video instantly. Share to YouTube, Instagram, TikTok, or publish to the WIZ AI platform to grow your audience with WizBoost.",
    details: [
      "Download MP4 immediately after building",
      "Share directly to social platforms",
      "Publish to WIZ AI and grow with WizBoost",
    ],
    badge: "Your video, your rights", image: STEP_IMAGES.youtuber, stat: "40+", statLabel: "countries",
  },
];

const RENDER_STAGES = [
  { icon: <Clock className="w-5 h-5" />,        stage: "Queued",     desc: "Your job enters the build queue. Position is based on your plan tier.",           color: "rgba(255,255,255,0.4)" },
  { icon: <Wand2 className="w-5 h-5" />,         stage: "Building",   desc: "AI animates each scene from your approved storyboard images.",                     color: "#c4a464" },
  { icon: <Film className="w-5 h-5" />,          stage: "Finalising", desc: "Scenes are assembled, audio is synced, and WizSound™/WizLumina™ are applied.",    color: "#c4a464" },
  { icon: <CheckCircle2 className="w-5 h-5" />,  stage: "Complete",   desc: "Your video is ready. Download instantly or share directly from WIZ AI.",           color: "#e8d5a0" },
];

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const c = STEP_COLORS[step.color];
  const isEven = index % 2 === 0;
  return (
    <div className="relative group">
      {index < STEPS.length - 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-px h-10 z-10 hidden lg:block"
          style={{ background: `linear-gradient(180deg, ${c.primary}50, transparent)` }} />
      )}
      <div className="relative overflow-hidden rounded-3xl border transition-all duration-500 group-hover:scale-[1.005]"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(10,10,10,0.97) 0%, rgba(14,14,14,0.95) 100%)",
          borderColor: c.border,
          boxShadow: `0 0 0 1px ${c.border}, 0 24px 60px rgba(0,0,0,0.5)`,
        }}>
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${c.primary}70, transparent)` }} />
        <div className="absolute pointer-events-none opacity-15 group-hover:opacity-25 transition-opacity duration-700"
          style={{
            width: "55%", height: "75%",
            top: isEven ? "-15%" : "auto", bottom: isEven ? "auto" : "-15%",
            right: isEven ? "-8%" : "auto", left: isEven ? "auto" : "-8%",
            background: `radial-gradient(ellipse, ${c.glow}, transparent 70%)`,
            filter: "blur(50px)",
          }} />
        <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-0`}>
          <div className="relative lg:w-[44%] h-60 lg:h-auto overflow-hidden flex-shrink-0">
            <img src={step.image} alt={step.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0"
              style={{
                background: isEven
                  ? "linear-gradient(270deg, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.45) 45%, transparent 100%)"
                  : "linear-gradient(90deg, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.45) 45%, transparent 100%)",
              }} />
            <div className="absolute inset-0"
              style={{ backgroundImage: "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, transparent 35%, transparent 65%, rgba(10,10,10,0.55) 100%)" }} />
            <div className="absolute bottom-3 left-4 lg:bottom-5 lg:left-5 font-black text-[72px] lg:text-[108px] leading-none select-none pointer-events-none"
              style={{
                color: "transparent",
                WebkitTextStroke: `1px ${c.primary}35`,
                filter: `drop-shadow(0 0 16px ${c.glow})`,
              }}>
              {step.num}
            </div>
            <div className="absolute top-4 right-4 text-center px-3 py-2 rounded-2xl backdrop-blur-md"
              style={{ background: c.badge, border: `1px solid ${c.border}` }}>
              <p className="text-base font-black leading-none" style={{ color: c.badgeText }}>{step.stat}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 text-white/45">{step.statLabel}</p>
            </div>
          </div>
          <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl"
                style={{ background: c.badge, border: `1px solid ${c.border}` }}>
                <span style={{ color: c.badgeText }}>{step.icon}</span>
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/25">STEP {step.num}</p>
                <p className="text-[11px] font-bold tracking-wider" style={{ color: c.badgeText }}>{step.badge}</p>
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white mb-1 leading-tight">{step.title}</h2>
            <h3 className="text-lg font-semibold mb-4 leading-snug" style={{ color: c.mid }}>{step.headline}</h3>
            <p className="text-white/50 text-base leading-relaxed mb-6 max-w-md">{step.desc}</p>
            <ul className="space-y-2.5">
              {step.details.map((d) => (
                <li key={d} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: c.badge, border: `1px solid ${c.border}` }}>
                    <ChevronRight className="w-3 h-3" style={{ color: c.badgeText }} />
                  </div>
                  <span className="text-sm text-white/60 leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  useSEO({ title: "How It Works — WIZ AI", path: "/how-it-works", description: "See how WIZ AI turns your audio into a full cinematic music video in minutes. Upload, preview, build, download." });
  const [activeStage, setActiveStage] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#060606] text-white">

      {/* HERO */}
      <div className="relative overflow-hidden min-h-[520px] flex flex-col">
        <div className="absolute inset-0">
          <img src={STEP_IMAGES.hero} alt="" className="w-full h-full object-cover object-center opacity-30" />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(180deg, rgba(6,6,6,0.25) 0%, rgba(6,6,6,0.55) 50%, rgba(6,6,6,1) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(139,92,246,0.18), transparent)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 80% 50%, rgba(196,164,100,0.08), transparent)" }} />
        </div>
        <div className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-4 h-4 text-white/40" />
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[4.275rem] w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" loading="eager" decoding="async" />
            </a>
          </Link>
          <a href="/onboarding"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{
              backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 50%, #c4a464 100%)",
              color: "#0a0a0a",
              boxShadow: "0 0 20px rgba(196,164,100,0.25)",
            }}>
            <Sparkles className="w-3.5 h-3.5" />
            Start Creating
          </a>
        </div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 pt-8 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)" }}>
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-black tracking-[0.22em] uppercase text-violet-300">HOW IT WORKS</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.93] mb-6">
            <span className="text-white">From idea to video</span>
            <br />
            <span style={{
              backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 30%, #a78bfa 65%, #c4a464 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>in five steps</span>
          </h1>
          <p className="text-white/45 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            WIZ AI handles the entire creation pipeline — you just describe what you want.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {STEPS.map((s, i) => {
              const c = STEP_COLORS[s.color];
              return (
                <div key={s.num} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                  style={{ background: c.badge, border: `1px solid ${c.border}`, color: c.badgeText }}>
                  <span className="text-[10px] font-black opacity-50">{s.num}</span>
                  {s.title}
                  {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 opacity-35" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP CARDS */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-8 space-y-6 lg:space-y-10">
        {STEPS.map((step, i) => (
          <StepCard key={step.num} step={step} index={i} />
        ))}
      </div>

      {/* RENDER PIPELINE */}
      <div className="relative overflow-hidden mt-12">
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(6,6,6,0) 0%, rgba(12,8,24,0.9) 20%, rgba(12,8,24,0.9) 80%, rgba(6,6,6,0) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(196,164,100,0.05), transparent)" }} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-[#c4a464]/45 mb-3">After you click Build</p>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">What happens during the build process?</h2>
            <p className="text-white/38 text-lg max-w-xl mx-auto">Your video goes through four processing stages. You'll be notified when it's ready.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px"
              style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(196,164,100,0.25) 20%, rgba(196,164,100,0.25) 80%, transparent)" }} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
              {RENDER_STAGES.map((item, i) => (
                <div key={item.stage}
                  className="relative flex flex-col items-center text-center p-6 rounded-2xl cursor-pointer transition-all duration-300"
                  style={{
                    background: activeStage === i
                      ? "linear-gradient(135deg, rgba(196,164,100,0.10), rgba(196,164,100,0.05))"
                      : "rgba(255,255,255,0.025)",
                    border: `1px solid ${activeStage === i ? "rgba(196,164,100,0.28)" : "rgba(255,255,255,0.05)"}`,
                    boxShadow: activeStage === i ? "0 0 30px rgba(196,164,100,0.08)" : "none",
                  }}
                  onMouseEnter={() => setActiveStage(i)}
                  onMouseLeave={() => setActiveStage(null)}>
                  <div className="hidden md:flex absolute -top-[21px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full items-center justify-center z-10"
                    style={{
                      background: activeStage === i ? "rgba(196,164,100,0.18)" : "rgba(12,12,12,1)",
                      border: `1px solid ${activeStage === i ? "rgba(196,164,100,0.45)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                  </div>
                  <div className="md:hidden flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                    style={{ background: "rgba(196,164,100,0.07)", border: "1px solid rgba(196,164,100,0.12)" }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                  </div>
                  <div className="mt-4 md:mt-6">
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-2" style={{ color: "rgba(196,164,100,0.45)" }}>Stage {String(i + 1).padStart(2, "0")}</p>
                    <p className="text-sm font-bold text-white mb-2">{item.stage}</p>
                    <p className="text-xs text-white/38 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 p-5 rounded-2xl flex items-start gap-4"
            style={{
              backgroundImage: "linear-gradient(135deg, rgba(196,164,100,0.07), rgba(196,164,100,0.03))",
              border: "1px solid rgba(196,164,100,0.18)",
            }}>
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(196,164,100,0.10)", border: "1px solid rgba(196,164,100,0.18)" }}>
              <Bell className="w-5 h-5 text-[#c4a464]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white/80 mb-1">Email notification</p>
              <p className="text-sm text-white/42 leading-relaxed">We'll send you an email when your video is ready, so you don't need to stay on the page.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ENGINE LOGOS */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <p className="text-center text-[10px] font-black tracking-[0.3em] uppercase text-white/22 mb-10">Powered by the WIZ Engines</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { logo: WIZSOUND_LOGO,  name: "WizSound™",  desc: "Studio-grade audio mastering" },
            { logo: WIZLUMINA_LOGO, name: "WizLumina™", desc: "Cinematic colour grading" },
            { logo: WIZBOOST_LOGO,  name: "WizBoost™",  desc: "Platform-optimised export" },
          ].map((e) => (
            <div key={e.name} className="flex flex-col items-center gap-3 p-6 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,164,100,0.07)" }}>
              <img src={e.logo} alt={e.name} className="h-12 w-auto object-contain opacity-85" />
              <div>
                <p className="text-xs font-bold text-white/65">{e.name}</p>
                <p className="text-[10px] text-white/28 mt-0.5">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WIZBOOST TEASER */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={STEP_IMAGES.kids} alt="" className="w-full h-full object-cover opacity-18" />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(180deg, rgba(6,6,6,1) 0%, rgba(6,6,6,0.65) 30%, rgba(6,6,6,0.65) 70%, rgba(6,6,6,1) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 65% 80% at 50% 50%, rgba(217,70,239,0.07), transparent)" }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(217,70,239,0.10)", border: "1px solid rgba(217,70,239,0.22)" }}>
            <img src={WIZBOOST_LOGO} alt="WizBoost" className="h-5 w-auto" />
            <span className="text-xs font-black tracking-[0.2em] uppercase text-fuchsia-300">WIZBOOST</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5">
            Create videos.<br />
            <span style={{
              backgroundImage: "linear-gradient(135deg, #d946ef, #f0abfc)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Build your audience.</span>
          </h2>
          <p className="text-white/42 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            After buildinging, WizBoost connects your content to real viewers, creators, and fans — helping you grow while you create.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <Share2 className="w-4 h-4" />, label: "Share to YouTube, Instagram, TikTok" },
              { icon: <Users className="w-4 h-4" />, label: "Publish to WIZ AI platform" },
              { icon: <Sparkles className="w-4 h-4" />, label: "Grow your fanbase" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "rgba(217,70,239,0.08)", border: "1px solid rgba(217,70,239,0.18)", color: "#f0abfc" }}>
                <span className="opacity-65">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(6,6,6,0) 0%, rgba(10,8,20,0.96) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(196,164,100,0.07), transparent)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-5">
            Ready to create<br />
            <span style={{
              backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 40%, #c4a464 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>your video?</span>
          </h2>
          <p className="text-white/42 text-xl mb-10 max-w-md mx-auto">
            Preview your full storyboard for free — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/onboarding"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:scale-105"
              style={{
                backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 50%, #c4a464 100%)",
                color: "#0a0a0a",
                boxShadow: "0 0 40px rgba(196,164,100,0.28), 0 8px 32px rgba(0,0,0,0.5)",
              }}>
              <Sparkles className="w-4 h-4" />
              Start Creating
            </a>
            <a href="/creators"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-medium transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
              <Play className="w-4 h-4" />
              View Examples
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
