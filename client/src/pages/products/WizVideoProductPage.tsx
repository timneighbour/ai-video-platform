/**
 * WizVideoProductPage — dedicated studio-style product page for WizVideo™
 *
 * Visual theme: Film production studio
 * Accent: Deep crimson #e63946
 * Background: Charcoal #0a0a0a with film grain overlay
 * Hero: Asymmetric — vertical film-strip sidebar (left) + headline/CTAs (right)
 * Signature section: Director's Timeline — horizontal pipeline from input to export
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ArrowRight, ChevronRight, ChevronDown, Sparkles, Check, Film, Play,
  Layers, Zap, Eye, Clock, Download,
} from "@/lib/icons";
import {
  WIZVIDEO_STUDIO_PAGE,
  WIZANIMATE_PRODUCT_PAGE,
  WIZSCRIPT_PRODUCT_PAGE,
  WIZSCORE_PRODUCT_PAGE,
  WIZAUDIO_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizvideo-logo-v1_9ec37e45.png`;
const WIZAI_LOGO = `${CDN}/wizai-logo-premium-transparent_ac3f550b.png`;

const IMGS = {
  hero:      `${CDN}/showcase-music-video_678b0f1d.jpg`,
  frame1:    `${CDN}/card-video-render_d81a3b98.jpg`,
  frame2:    `${CDN}/card-storyboard_38d61672.jpg`,
  frame3:    `${CDN}/card-animation_e13ffa11.jpg`,
  frame4:    `${CDN}/card-music-notes_96ce5dac.jpg`,
  frame5:    `${CDN}/card-ai-brain_b513d38b.jpg`,
  frame6:    `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT = "#e63946";
const ACCENT_DIM = "rgba(230,57,70,0.18)";
const ACCENT_GLOW = "rgba(230,57,70,0.35)";

const TIMELINE_STAGES = [
  { num: "01", icon: "🎵", label: "Audio Input",    desc: "Upload your track or generate with WizSound™",  img: IMGS.frame4 },
  { num: "02", icon: "📋", label: "Storyboard",     desc: "AI generates scene-by-scene visual direction",   img: IMGS.frame2 },
  { num: "03", icon: "🎬", label: "Scene Build",    desc: "Each scene rendered with cinematic AI visuals",  img: IMGS.frame3 },
  { num: "04", icon: "🔊", label: "Audio Sync",     desc: "WizSync™ locks visuals to the beat grid",        img: IMGS.frame6 },
  { num: "05", icon: "⚡", label: "Render",         desc: "Full HD or 4K cinematic output generated",       img: IMGS.frame1 },
  { num: "06", icon: "⬇️", label: "Export",         desc: "Download, share, or publish directly",           img: IMGS.frame5 },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Upload your track",         desc: "Drop in any audio file — MP3, WAV, or FLAC. WizVideo™ analyses the BPM, key, and emotional arc of your music." },
  { num: "02", title: "AI builds the storyboard",  desc: "The AI generates a scene-by-scene visual storyboard aligned to your track's structure — verses, chorus, bridge, outro." },
  { num: "03", title: "Scenes rendered",           desc: "Each storyboard scene is rendered into a cinematic video clip — characters, environments, lighting, and camera movement all generated automatically." },
  { num: "04", title: "Final video delivered",     desc: "All scenes are assembled, audio synced, and the final video exported at your chosen resolution — ready to publish." },
];

const KEY_FEATURES = [
  { title: "Beat-Locked Editing",      desc: "Every cut, transition, and camera move is locked to your track's beat grid — no manual keyframing.", img: IMGS.frame4 },
  { title: "Cinematic AI Visuals",     desc: "Characters, environments, and lighting generated from your music's mood — not stock footage.", img: IMGS.frame3 },
  { title: "Multi-Style Support",      desc: "Cinematic, Anime, 3D, Live Action — switch styles without changing your audio or storyboard.", img: IMGS.frame2 },
  { title: "4K Export",                desc: "Full 4K resolution output on Pro and Business plans — broadcast-ready without post-production.", img: IMGS.frame1 },
  { title: "WizSync™ Integration",     desc: "Automatic lip sync and character performance driven by your audio — no manual animation.", img: IMGS.frame6 },
  { title: "Batch Generation",         desc: "Generate multiple video variants from the same track — test different visual styles simultaneously.", img: IMGS.frame5 },
];

const BENEFITS = [
  { title: "No video editing skills needed",  desc: "WizVideo™ handles every step from storyboard to final export — no timeline editing, no keyframing, no post-production." },
  { title: "Music-first design",              desc: "Unlike generic AI video tools, WizVideo™ was built specifically for music — every visual decision is driven by your audio." },
  { title: "Professional output quality",     desc: "Cinematic colour grading, dynamic camera movement, and broadcast-quality resolution — indistinguishable from produced content." },
  { title: "Minutes, not days",               desc: "A full music video that would take a production team days to produce is ready in under 10 minutes." },
  { title: "Unlimited creative iterations",   desc: "Regenerate any scene, swap styles, or rebuild the entire video — no extra cost per iteration on the storyboard phase." },
  { title: "Direct publish support",          desc: "Export directly optimised for YouTube, TikTok, Instagram Reels, and Spotify Canvas — no format conversion needed." },
];

const FAQS = [
  { q: "What if I do not like the output?",                   a: "You can regenerate any individual scene without rebuilding the entire video. Scene-level regeneration is available on all plans — you are never locked into a result you are not happy with. Storyboard regeneration is always free." },
  { q: "What do credits actually cover?",                     a: "Credits are only charged on final video render. Storyboard generation, scene previews, and style selection are all free — you only pay when you are ready to produce the finished video." },
  { q: "Can I use the videos commercially?",                  a: "Yes — all generated videos are fully licensed for commercial use on all plans, including streaming platforms, social media, broadcast, and live events. No additional licensing fee is required." },
  { q: "Is 4K export available on the free plan?",            a: "4K export is available on Pro and Business plans. The free plan and Starter plan export at 1080p HD. You can compare export options on the pricing page." },
  { q: "What audio formats does WizVideo™ accept?",           a: "WizVideo™ accepts MP3, WAV, FLAC, AAC, and M4A files up to 50MB. For best results, use a stereo master at −14 LUFS." },
  { q: "How long does generation take?",                      a: "A full music video (3–4 minutes) typically takes 4–8 minutes to generate. You will receive a notification when your video is ready — no need to stay on the page." },
];

const RELATED = [
  { name: "WizAnimate™",  href: WIZANIMATE_PRODUCT_PAGE },
  { name: "WizScript™",   href: WIZSCRIPT_PRODUCT_PAGE },
  { name: "WizScore™",    href: WIZSCORE_PRODUCT_PAGE },
  { name: "WizSound™",    href: WIZAUDIO_PRODUCT_PAGE },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-5 text-white/50 text-sm leading-relaxed pr-8">{a}</div>}
    </div>
  );
}

export default function WizVideoProductPage() {
  useSEO({
    title: "WizVideo™ — AI Music Video Generator | WIZ AI",
    path: "/music-video",
    description: "WizVideo™ generates cinematic AI music videos from your audio track — beat-locked visuals, professional output, no editing skills required.",
  });

  return (
    <div
      className="text-white min-h-screen overflow-x-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Film grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b px-6 py-4"
        style={{ background: "rgba(10,10,10,0.92)", backdropFilter: "blur(20px)", borderColor: `${ACCENT}18` }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back" />
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="WizVideo™" className="h-8 w-auto object-contain" loading="lazy" />
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
              >
                AI Music Video Studio
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink href="/" className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-colors">
              Home
            </NavLink>
            <NavLink
              href={WIZVIDEO_STUDIO_PAGE}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg"
              style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
            >
              <Film className="w-3.5 h-3.5" />
              Create Music Video
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ── Hero — Asymmetric film-strip layout ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={IMGS.hero} alt="Music video production" className="w-full h-full object-cover object-center" loading="eager" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.75) 55%, rgba(10,10,10,0.3) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 40%)" }} />
          {/* Crimson glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 50% 60% at 20% 50%, ${ACCENT_DIM} 0%, transparent 60%)` }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-28 flex items-center gap-0 w-full">
          {/* Left: Vertical film-strip column */}
          <div className="hidden lg:flex flex-col gap-1 mr-12 flex-shrink-0" style={{ width: "120px" }}>
            {/* REC badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3 text-[10px] font-black tracking-[0.2em] uppercase"
              style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40`, color: ACCENT }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
              REC
            </div>
            {/* Film frames */}
            {[IMGS.frame1, IMGS.frame2, IMGS.frame3, IMGS.frame4].map((img, i) => (
              <div
                key={i}
                className="relative rounded overflow-hidden"
                style={{
                  height: "80px",
                  border: `2px solid ${i === 1 ? ACCENT : "rgba(255,255,255,0.08)"}`,
                  boxShadow: i === 1 ? `0 0 12px ${ACCENT_GLOW}` : "none",
                }}
              >
                <img src={img} alt={`Scene ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                {/* Film sprocket holes */}
                <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-around items-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                  {[0,1,2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-sm bg-black border border-white/20" />)}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col justify-around items-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                  {[0,1,2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-sm bg-black border border-white/20" />)}
                </div>
                {/* Scene label */}
                <div className="absolute bottom-1 left-3 right-3 text-center text-[8px] font-bold text-white/60">
                  SCENE {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            ))}
            {/* Take counter */}
            <div className="mt-3 text-center">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">TAKE</div>
              <div className="text-2xl font-black" style={{ color: ACCENT }}>01</div>
            </div>
          </div>

          {/* Right: Headline and CTAs */}
          <div className="flex-1 max-w-2xl">
            {/* Product logo */}
            <div className="mb-6">
              <img src={LOGO} alt="WizVideo™" className="h-12 w-auto object-contain" loading="eager" />
            </div>
            {/* Role pill */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
              style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
            >
              <Film className="w-3 h-3" />
              The Music Video Studio
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-6 text-white">
              Your music.<br />
              <span style={{ color: ACCENT }}>A cinematic</span><br />
              music video.
            </h1>
            <p className="text-white/55 text-base leading-relaxed mb-10 max-w-lg">
              Turn your audio track into a full cinematic music video — beat-locked, colour-graded, 4K. No editing skills required.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <NavLink
                href={WIZVIDEO_STUDIO_PAGE}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}` }}
              >
                <Film className="w-4 h-4" />
                Create Your Music Video
                <ArrowRight className="w-4 h-4" />
              </NavLink>
              <NavLink
                href="/pricing#plans"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                View pricing <ChevronRight className="w-4 h-4" />
              </NavLink>
            </div>
            <p className="text-[11px] text-white/30 mt-3 tracking-wide">2 free credits on sign-up &middot; No card required</p>
            {/* Trust stats */}
            <div className="flex items-center gap-8">
              {[
                { val: "4K",    label: "Max resolution" },
                { val: "<10m",  label: "Generation time" },
                { val: "6",     label: "Visual styles" },
              ].map(s => (
                <div key={s.val} className="text-center">
                  <div className="text-2xl font-black" style={{ color: ACCENT }}>{s.val}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Signature Section: Director's Timeline ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#060608" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 50% at 50% 50%, ${ACCENT_DIM} 0%, transparent 65%)` }}
        />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-5"
              style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
            >
              <Film className="w-3 h-3" />
              Director's Timeline
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              From audio file to finished video
            </h2>
            <p className="text-white/40 text-base max-w-xl mx-auto">
              Every WizVideo™ build follows the same cinematic production pipeline — fully automated, stage by stage.
            </p>
          </div>

          {/* Timeline strip */}
          <div className="relative">
            {/* Connector line */}
            <div
              className="absolute top-[52px] left-[8%] right-[8%] h-px hidden lg:block"
              style={{ background: `linear-gradient(to right, transparent, ${ACCENT}40, ${ACCENT}60, ${ACCENT}40, transparent)` }}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {TIMELINE_STAGES.map((stage, i) => (
                <div key={stage.num} className="flex flex-col items-center text-center group">
                  {/* Stage icon circle */}
                  <div
                    className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center mb-4 text-lg transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: i < 2 ? ACCENT : "rgba(255,255,255,0.05)",
                      border: `2px solid ${i < 2 ? ACCENT : "rgba(255,255,255,0.1)"}`,
                      boxShadow: i < 2 ? `0 0 20px ${ACCENT_GLOW}` : "none",
                    }}
                  >
                    <span>{stage.icon}</span>
                    {/* Step number */}
                    <div
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                      style={{ background: "#0a0a0a", border: `1px solid ${ACCENT}40`, color: ACCENT }}
                    >
                      {i + 1}
                    </div>
                  </div>
                  {/* Thumbnail */}
                  <div
                    className="w-full rounded-xl overflow-hidden mb-3"
                    style={{ height: "72px", border: `1px solid ${i < 2 ? ACCENT + "40" : "rgba(255,255,255,0.06)"}` }}
                  >
                    <img src={stage.img} alt={stage.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="text-xs font-bold text-white mb-1">{stage.label}</div>
                  <div className="text-[10px] text-white/35 leading-snug">{stage.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What It Does ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            What It Does
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-extrabold text-white mb-6 leading-tight">
                A full music video production pipeline — automated
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                WizVideo™ is WIZ AI's dedicated music video generation engine. It analyses your audio track — BPM, key, mood, and structure — and generates a complete cinematic music video with beat-locked visuals, dynamic camera movement, and professional colour grading.
              </p>
              <ul className="space-y-3">
                {[
                  "Beat-locked scene transitions and camera cuts",
                  "Cinematic AI-generated characters and environments",
                  "Multi-style support: Cinematic, Anime, 3D, Illustrated",
                  "WizSync™ lip sync and character performance",
                  "4K export with broadcast-quality colour grading",
                  "Direct publish to YouTube, TikTok, and Instagram",
                ].map(cap => (
                  <li key={cap} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
                    <span className="text-white/60 text-sm">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden" style={{ height: "380px" }}>
              <img src={IMGS.hero} alt="WizVideo production" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(10,10,10,0.7) 0%, transparent 50%)` }} />
              <div
                className="absolute bottom-4 left-4 right-4 p-4 rounded-xl"
                style={{ background: "rgba(10,10,10,0.85)", border: `1px solid ${ACCENT}25`, backdropFilter: "blur(12px)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
                    <Film className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Rendering scene 3 of 6</div>
                    <div className="text-[10px] text-white/40 mt-0.5">Cinematic style · 4K · Beat-locked</div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-xs font-black" style={{ color: ACCENT }}>47%</div>
                  </div>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full w-[47%]" style={{ background: ACCENT }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6" style={{ background: "#060608" }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            How It Works
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">Four steps from audio to video</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.num}
                className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-4xl font-black mb-4" style={{ color: `${ACCENT}50` }}>{step.num}</div>
                <div className="text-sm font-bold text-white mb-2">{step.title}</div>
                <div className="text-xs text-white/45 leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Key Features
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">Built for music, not generic video</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {KEY_FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl overflow-hidden group"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="h-36 overflow-hidden">
                  <img src={f.img} alt={f.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                </div>
                <div className="p-5">
                  <div className="text-sm font-bold text-white mb-2">{f.title}</div>
                  <div className="text-xs text-white/45 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-20 px-6" style={{ background: "#060608" }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Why WizVideo™
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">The music video studio in your browser</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? ACCENT + "30" : "rgba(255,255,255,0.05)"}` }}
              >
                <div className="text-sm font-bold text-white mb-2">{b.title}</div>
                <div className="text-xs text-white/45 leading-relaxed">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ── */}
      <section
        className="py-20 px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${ACCENT}15 0%, rgba(10,10,10,0) 60%)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${ACCENT}12 0%, transparent 60%)` }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to create your music video?
          </h2>
          <p className="text-white/45 text-base mb-8 max-w-xl mx-auto">
            Upload your track and WizVideo™ will have a cinematic music video ready in under 10 minutes.
          </p>
          <NavLink
            href={WIZVIDEO_STUDIO_PAGE}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: ACCENT, boxShadow: `0 0 40px ${ACCENT_GLOW}` }}
          >
            <Film className="w-4 h-4" />
            Open WizVideo™ Studio
            <ArrowRight className="w-4 h-4" />
          </NavLink>
          <div className="flex items-center justify-center gap-5 mt-5 text-[11px] text-white/30 tracking-wide">
            <span>&#10003; Commercial use included</span>
            <span className="text-white/15">·</span>
            <span>&#10003; 4K export</span>
            <span className="text-white/15">·</span>
            <span>&#10003; No card to start</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6" style={{ background: "#060608" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            FAQ
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-8">Common questions</h2>
          <div className="divide-y divide-white/[0.06]">
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── Related products ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/25 mb-6">Part of the WIZ AI Engine</div>
          <div className="flex flex-wrap gap-3">
            {RELATED.map(r => (
              <NavLink
                key={r.name}
                href={r.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
              >
                {r.name}
                <ChevronRight className="w-3 h-3" />
              </NavLink>
            ))}
            <NavLink
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/30 hover:text-white/60 transition-all"
            >
              View all products <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src={WIZAI_LOGO} alt="WIZ AI" className="h-6 w-auto opacity-40" loading="lazy" />
          <div className="text-[11px] text-white/20">© 2025 WIZ AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
