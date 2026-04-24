/**
 * WizAnimateProductPage — dedicated studio-style product page for WizAnimate™
 *
 * Visual theme: Animation studio
 * Accent: Amber/gold #f59e0b
 * Background: Near-black #050505 with grid-dot pattern
 * Hero: Keyframe progression strip as dominant visual below headline
 * Signature section: Beat-Locked Timeline — waveform bar + character keyframe markers
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ArrowRight, ChevronRight, ChevronDown, Sparkles, Check, Zap, Eye, Layers,
} from "@/lib/icons";
import {
  WIZANIMATE_STUDIO_PAGE,
  WIZVIDEO_PRODUCT_PAGE,
  WIZSCRIPT_PRODUCT_PAGE,
  WIZSCORE_PRODUCT_PAGE,
  WIZAUDIO_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizanimate-logo-new_a84f9808.png`;
const WIZAI_LOGO = `${CDN}/wizai-logo-premium-transparent_ac3f550b.png`;

const IMGS = {
  hero:     `${CDN}/showcase-animation-studio_e21a763d.jpg`,
  frame1:   `${CDN}/card-animation_e13ffa11.jpg`,
  frame2:   `${CDN}/card-video-render_d81a3b98.jpg`,
  frame3:   `${CDN}/card-storyboard_38d61672.jpg`,
  frame4:   `${CDN}/card-ai-brain_b513d38b.jpg`,
  frame5:   `${CDN}/card-music-notes_96ce5dac.jpg`,
  frame6:   `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT = "#f97316";
const ACCENT_DIM = "rgba(249,115,22,0.12)";
const ACCENT_GLOW = "rgba(249,115,22,0.35)";

const KEYFRAMES = [
  { label: "Frame 01", beat: "0:00", img: IMGS.frame1 },
  { label: "Frame 02", beat: "0:04", img: IMGS.frame3 },
  { label: "Frame 03", beat: "0:08", img: IMGS.frame2 },
  { label: "Frame 04", beat: "0:12", img: IMGS.frame4 },
  { label: "Frame 05", beat: "0:16", img: IMGS.frame5 },
  { label: "Frame 06", beat: "0:20", img: IMGS.frame6 },
];

// Simulated waveform bar heights (CSS-drawn)
const WAVEFORM_BARS = [
  3,5,8,12,18,24,30,28,22,16,10,7,5,8,14,22,32,38,40,36,28,20,14,10,8,12,18,26,34,38,
  36,30,22,16,12,9,7,10,16,24,32,36,34,28,20,14,10,8,6,9,14,20,28,34,36,32,24,18,12,8,
];

const HOW_IT_WORKS = [
  { num: "01", title: "Upload your audio",          desc: "Drop in your music track. WizAnimate™ analyses the BPM, beat grid, and emotional arc to plan the animation." },
  { num: "02", title: "Characters generated",       desc: "AI generates your characters — appearance, costume, and personality — from your prompt or style selection." },
  { num: "03", title: "Animation beat-locked",      desc: "Every character movement, expression change, and scene transition is locked to the beat grid of your audio." },
  { num: "04", title: "Video exported",             desc: "The full animated video is rendered and exported — ready for YouTube, social media, or broadcast." },
];

const KEY_FEATURES = [
  { title: "Beat-Locked Animation",      desc: "Every movement, expression, and transition is synchronised to your audio's beat grid — no manual keyframing.", img: IMGS.frame1 },
  { title: "AI Character Generation",    desc: "Characters are generated from your prompt — appearance, personality, and animation style all defined by text.", img: IMGS.frame4 },
  { title: "Kids & Family Styles",       desc: "Dedicated animation styles for children's content — bright, safe, and age-appropriate visual language.", img: IMGS.frame3 },
  { title: "Cinematic Animation",        desc: "Mature cinematic animation styles for music videos, brand content, and adult-oriented creative projects.", img: IMGS.frame2 },
  { title: "WizSync™ Lip Sync",          desc: "Automatic lip sync driven by your audio — characters speak and sing in perfect sync with the track.", img: IMGS.frame6 },
  { title: "Scene Variety",              desc: "Multiple scenes, environments, and camera angles generated automatically — not a single looping background.", img: IMGS.frame5 },
];

const BENEFITS = [
  { title: "No animation skills needed",     desc: "WizAnimate™ handles every frame — character design, movement, lip sync, and scene composition — from your audio and prompt." },
  { title: "Music-driven by design",         desc: "Unlike generic animation tools, WizAnimate™ was built specifically for music — every animation decision is driven by your audio's structure." },
  { title: "Consistent characters",          desc: "Characters maintain their appearance and personality across every scene — no visual drift between cuts." },
  { title: "Safe for all audiences",         desc: "Dedicated children's content mode with age-appropriate visual language — suitable for YouTube Kids and family platforms." },
  { title: "Professional output quality",    desc: "Broadcast-quality animation at up to 4K resolution — suitable for streaming platforms, live events, and commercial use." },
  { title: "Fast generation",               desc: "A full animated music video (3–4 minutes) is ready in under 15 minutes — no rendering farm, no waiting days." },
];

const FAQS = [
  { q: "What animation styles does WizAnimate™ support?",       a: "WizAnimate™ supports Anime, 3D, Illustrated, Cartoon, Cinematic, and Children's styles. Style can be set globally or per scene." },
  { q: "How does beat-locked animation work?",                   a: "WizAnimate™ analyses your audio's BPM and beat grid, then generates character movements and scene transitions that align to specific beat positions — similar to how a music video editor would cut to the beat manually." },
  { q: "Can I use WizAnimate™ for children's content?",         a: "Yes — WizAnimate™ has a dedicated Children's Content mode that uses age-appropriate visual language, bright colours, and safe character designs suitable for YouTube Kids and family platforms." },
  { q: "Does WizSync™ lip sync work with any voice?",           a: "WizSync™ lip sync works with any vocal track — singing, spoken word, or narration. It analyses the audio and generates matching mouth movements automatically." },
  { q: "Can I customise the character appearance?",             a: "Yes — character appearance, costume, and personality are defined by your text prompt. You can specify detailed visual descriptions or use style presets." },
  { q: "Is the output licensed for commercial use?",            a: "Yes — all generated animations are fully licensed for commercial use, including streaming platforms, social media, broadcast, and live events." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-5 text-white/50 text-sm leading-relaxed pr-8">{a}</div>}
    </div>
  );
}

export default function WizAnimateProductPage() {
  useSEO({
    title: "WizAnimate™ — AI Animation Studio | WIZ AI",
    path: "/products/wizanimate",
    description: "WizAnimate™ generates beat-locked animated music videos from your audio track — AI characters, automatic lip sync, and cinematic animation styles.",
  });

  return (
    <div
      className="text-white min-h-screen overflow-x-hidden"
      style={{ background: "#050505" }}
    >
      {/* Grid-dot pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${ACCENT}18 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b px-6 py-4"
        style={{ background: "rgba(5,5,5,0.92)", backdropFilter: "blur(20px)", borderColor: `${ACCENT}18` }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back" />
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="WizAnimate™" className="h-8 w-auto object-contain" loading="lazy" />
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
              >
                AI Animation Studio
              </span>
            </div>
          </div>
          <NavLink
            href={WIZANIMATE_STUDIO_PAGE}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg"
            style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}`, color: "#000" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create Animation
          </NavLink>
        </div>
      </nav>

      {/* ── Hero — Headline + Keyframe strip ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        {/* Background — animation stage: amber grid on deep black */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(249,115,22,0.18) 0%, rgba(200,80,0,0.08) 40%, #050505 70%)" }} />
          <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg, ${ACCENT}06 0px, ${ACCENT}06 1px, transparent 1px, transparent 60px)`, opacity: 0.6 }} />
          <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${ACCENT}04 0px, ${ACCENT}04 1px, transparent 1px, transparent 80px)`, opacity: 0.5 }} />
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, ${ACCENT}12 0%, transparent 70%)`, transform: "translate(-30%, -30%)" }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full" style={{ background: `radial-gradient(circle, ${ACCENT}08 0%, transparent 70%)`, transform: "translate(30%, 30%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.5) 0%, transparent 30%, transparent 70%, rgba(5,5,5,0.95) 100%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-12 w-full">
          {/* Headline block — centred */}
          <div className="text-center mb-16">
            <img src={LOGO} alt="WizAnimate™" className="h-14 w-auto object-contain mx-auto mb-6" loading="eager" />
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
              style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
            >
              <Sparkles className="w-3 h-3" />
              The Animation Studio
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-6 text-white">
              Your music.<br />
              <span style={{ color: ACCENT }}>A beat-locked</span><br />
              animation.
            </h1>
            <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
              WizAnimate™ generates a full animated music video from your audio track — AI characters, automatic lip sync, and every frame locked to your beat grid.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <NavLink
                href={WIZANIMATE_STUDIO_PAGE}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}`, color: "#000" }}
              >
                <Sparkles className="w-4 h-4" />
                Create Your Animation
                <ArrowRight className="w-4 h-4" />
              </NavLink>
              <NavLink
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                View pricing <ChevronRight className="w-4 h-4" />
              </NavLink>
            </div>
            <p className="text-[11px] text-white/30 mt-3 tracking-wide">2 free credits on sign-up &middot; No card required</p>
          </div>

          {/* ── Animation Studio Monitor — signature visual ── */}
          <div className="relative">
            <div className="rounded-2xl p-4 mb-2" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)", border: `1px solid ${ACCENT}25`, boxShadow: `0 0 60px ${ACCENT}10, inset 0 1px 0 ${ACCENT}15` }}>
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: `1px solid ${ACCENT}15` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>WizAnimate™ Studio — Timeline</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-white/30">BPM: 128</span>
                  <span className="text-[9px] text-white/30">|</span>
                  <span className="text-[9px] text-white/30">00:00:24:00</span>
                  <div className="flex gap-1">{["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />)}</div>
                </div>
              </div>
          <div className="relative">
            {/* Progress bar connecting frames */}
            <div
              className="absolute top-[56px] left-[4%] right-[4%] h-0.5 hidden md:block"
              style={{ background: `linear-gradient(to right, transparent, ${ACCENT}50, ${ACCENT}80, ${ACCENT}50, transparent)` }}
            />
            {/* Beat marker dots on the bar */}
            <div className="absolute top-[53px] left-[4%] right-[4%] hidden md:flex justify-between px-[8%]">
              {KEYFRAMES.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: i < 3 ? ACCENT : "rgba(255,255,255,0.2)", boxShadow: i < 3 ? `0 0 8px ${ACCENT_GLOW}` : "none" }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {KEYFRAMES.map((frame, i) => (
                <div key={frame.label} className="flex flex-col items-center group">
                  {/* Frame counter */}
                  <div
                    className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[9px] font-black mb-3 transition-all group-hover:scale-110"
                    style={{
                      background: i < 3 ? ACCENT : "rgba(255,255,255,0.06)",
                      color: i < 3 ? "#000" : "rgba(255,255,255,0.4)",
                      border: `1px solid ${i < 3 ? ACCENT : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {i + 1}
                  </div>
                  {/* Frame thumbnail */}
                  <div
                    className="w-full rounded-xl overflow-hidden mb-2 transition-all group-hover:scale-[1.03]"
                    style={{
                      height: "90px",
                      border: `2px solid ${i < 3 ? ACCENT + "50" : "rgba(255,255,255,0.06)"}`,
                      boxShadow: i < 3 ? `0 0 16px ${ACCENT}25` : "none",
                    }}
                  >
                    <img src={frame.img} alt={frame.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="text-[9px] font-bold text-white/50">{frame.label}</div>
                  <div className="text-[9px]" style={{ color: ACCENT + "80" }}>{frame.beat}</div>
                </div>
              ))}
            </div>
          </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-12 mt-12">
            {[
              { val: "< 15m",  label: "Generation time" },
              { val: "4K",     label: "Max resolution" },
              { val: "6",      label: "Animation styles" },
            ].map(s => (
              <div key={s.val} className="text-center">
                <div className="text-2xl font-black" style={{ color: ACCENT }}>{s.val}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Signature Section: Beat-Locked Timeline ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#080808" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${ACCENT_DIM} 0%, transparent 65%)` }}
        />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-5"
              style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
            >
              <Zap className="w-3 h-3" />
              Beat-Locked Timeline
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Every frame locked to your beat
            </h2>
            <p className="text-white/40 text-base max-w-xl mx-auto">
              WizAnimate™ analyses your audio's beat grid and places character keyframes at exact beat positions — the way a professional animator would do it manually.
            </p>
          </div>

          {/* Waveform bar */}
          <div
            className="rounded-2xl p-6 mb-8"
            style={{ background: "#0c0c0c", border: `1px solid ${ACCENT}20` }}
          >
            <div className="text-[10px] text-white/25 uppercase tracking-wider mb-4">Audio waveform — beat grid</div>
            {/* Waveform bars */}
            <div className="flex items-center gap-[2px] h-16 mb-4">
              {WAVEFORM_BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: `${Math.min(100, h * 2)}%`,
                    background: i % 8 === 0
                      ? ACCENT
                      : i % 4 === 0
                        ? `${ACCENT}70`
                        : `${ACCENT}25`,
                  }}
                />
              ))}
            </div>
            {/* Beat markers */}
            <div className="flex justify-between">
              {["0:00", "0:04", "0:08", "0:12", "0:16", "0:20", "0:24", "0:28"].map(t => (
                <div key={t} className="text-[9px] text-white/25">{t}</div>
              ))}
            </div>
          </div>

          {/* Character keyframe thumbnails */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KEYFRAMES.slice(0, 4).map((frame, i) => (
              <div
                key={frame.label}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${ACCENT}25` }}
              >
                <img src={frame.img} alt={frame.label} className="w-full h-24 object-cover" loading="lazy" />
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-white/60">{frame.label}</div>
                    <div className="text-[9px]" style={{ color: ACCENT }}>Beat @ {frame.beat}</div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
                    style={{ background: ACCENT, color: "#000" }}
                  >
                    {i + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            How It Works
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">Four steps from audio to animation</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(step => (
              <div
                key={step.num}
                className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
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
      <section className="py-20 px-6" style={{ background: "#080808" }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Key Features
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">Built for music, not generic animation</h2>
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
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Why WizAnimate™
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">The animation studio in your browser</h2>
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
        style={{ background: `linear-gradient(135deg, ${ACCENT}10 0%, rgba(5,5,5,0) 60%)` }}
      >
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to animate your music?
          </h2>
          <p className="text-white/45 text-base mb-8 max-w-xl mx-auto">
            Upload your track and WizAnimate™ will have a beat-locked animated music video ready in under 15 minutes.
          </p>
          <NavLink
            href={WIZANIMATE_STUDIO_PAGE}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all"
            style={{ background: ACCENT, boxShadow: `0 0 40px ${ACCENT_GLOW}`, color: "#000" }}
          >
            <Sparkles className="w-4 h-4" />
            Open WizAnimate™ Studio
            <ArrowRight className="w-4 h-4" />
          </NavLink>
          <div className="flex items-center justify-center gap-5 mt-5 text-[11px] text-white/30 tracking-wide">
            <span>&#10003; Beat-locked animation</span>
            <span className="text-white/15">·</span>
            <span>&#10003; Commercial use included</span>
            <span className="text-white/15">·</span>
            <span>&#10003; No card to start</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6" style={{ background: "#080808" }}>
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

      {/* ── Related ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/25 mb-6">Part of the WIZ AI Engine</div>
          <div className="flex flex-wrap gap-3">
            {[
              { name: "WizVideo™",  href: WIZVIDEO_PRODUCT_PAGE },
              { name: "WizScript™", href: WIZSCRIPT_PRODUCT_PAGE },
              { name: "WizScore™",  href: WIZSCORE_PRODUCT_PAGE },
              { name: "WizSound™",  href: WIZAUDIO_PRODUCT_PAGE },
            ].map(r => (
              <NavLink
                key={r.name}
                href={r.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
              >
                {r.name} <ChevronRight className="w-3 h-3" />
              </NavLink>
            ))}
            <NavLink href="/products" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/30 hover:text-white/60 transition-all">
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
