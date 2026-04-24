/**
 * WizShortsProductPage — dedicated studio-style product page for WizShorts™
 *
 * Visual theme: Short-form vertical content studio
 * Accent: Hot pink / fuchsia #d946ef
 * Background: Near-black #050508 with vertical stripe pattern
 * Hero: Portrait phone mockup centre with landscape copy flanking
 * Signature section: Format Showcase — 3 vertical phone frames (Hook/Story/CTA) with platform badges
 * Key structural difference: Only page with 9:16 portrait-oriented content cards
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ArrowRight, ChevronRight, ChevronDown, Sparkles, Check, Zap, Eye, Layers,
} from "@/lib/icons";
import {
  WIZSHORTS_STUDIO_PAGE,
  WIZVIDEO_PRODUCT_PAGE,
  WIZSCRIPT_PRODUCT_PAGE,
  WIZIMAGE_PRODUCT_PAGE,
  WIZAUDIO_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizshorts-logo_c3d4e5f6.png`;
const WIZAI_LOGO = `${CDN}/wizai-logo-premium-transparent_ac3f550b.png`;

const IMGS = {
  hero:    `${CDN}/showcase-kids-video_a1b2c3d4.jpg`,
  hook:    `${CDN}/card-video-render_d81a3b98.jpg`,
  story:   `${CDN}/card-animation_e13ffa11.jpg`,
  cta:     `${CDN}/card-storyboard_38d61672.jpg`,
  feat1:   `${CDN}/card-ai-brain_b513d38b.jpg`,
  feat2:   `${CDN}/card-music-notes_96ce5dac.jpg`,
  feat3:   `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT = "#d946ef";
const ACCENT_DIM = "rgba(217,70,239,0.12)";
const ACCENT_GLOW = "rgba(217,70,239,0.35)";

const PLATFORMS = [
  { name: "TikTok",             color: "#010101", textColor: "#fff",    border: "#333" },
  { name: "YouTube Shorts",     color: "#ff0000", textColor: "#fff",    border: "#ff0000" },
  { name: "Instagram Reels",    color: "#e1306c", textColor: "#fff",    border: "#e1306c" },
  { name: "Snapchat Spotlight", color: "#fffc00", textColor: "#000",    border: "#fffc00" },
];

const FORMAT_FRAMES = [
  {
    label: "Hook",
    subtitle: "0–3 seconds",
    desc: "Attention-grabbing opening — bold visual, text overlay, or surprising moment that stops the scroll.",
    img: IMGS.hook,
    tip: "First 3 seconds determine 80% of watch-through rate",
  },
  {
    label: "Story",
    subtitle: "3–25 seconds",
    desc: "The core content — value delivery, narrative, or entertainment that keeps viewers watching.",
    img: IMGS.story,
    tip: "WizShorts™ paces the story to match platform retention curves",
  },
  {
    label: "CTA",
    subtitle: "Final 5 seconds",
    desc: "Clear call-to-action — follow, like, share, or link in bio — with visual emphasis and text overlay.",
    img: IMGS.cta,
    tip: "Platform-specific CTAs generated automatically",
  },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Choose your platform",       desc: "Select TikTok, YouTube Shorts, Instagram Reels, or Snapchat Spotlight — WizShorts™ optimises for each platform's algorithm and format." },
  { num: "02", title: "Describe your content",      desc: "Type a prompt describing your short — topic, tone, style, and target audience. WizShorts™ writes the script and plans the visuals." },
  { num: "03", title: "Hook/Story/CTA generated",   desc: "The AI generates a 3-part short with a scroll-stopping hook, engaging story section, and platform-specific CTA." },
  { num: "04", title: "Export and publish",         desc: "Download in 9:16 vertical format, optimised for your chosen platform — ready to upload directly." },
];

const KEY_FEATURES = [
  { title: "9:16 Vertical Format",        desc: "Every WizShorts™ output is native 9:16 vertical — no cropping, no black bars, no format conversion.", img: IMGS.hook },
  { title: "Platform-Specific Optimisation", desc: "TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight each have different algorithms — WizShorts™ adapts content for each.", img: IMGS.feat1 },
  { title: "Hook/Story/CTA Structure",    desc: "Every short follows the proven 3-part structure: scroll-stopping hook, engaging story, and clear CTA — automatically.", img: IMGS.story },
  { title: "Auto-Captions",              desc: "Captions generated and styled automatically — large, readable, and positioned for mobile viewing.", img: IMGS.feat2 },
  { title: "Trending Audio Integration", desc: "WizShorts™ can match your content to trending audio formats — or use WizSound™ to generate original music.", img: IMGS.feat3 },
  { title: "Batch Generation",           desc: "Generate 5, 10, or 20 shorts from a single content brief — ideal for content calendars and campaign batches.", img: IMGS.cta },
];

const BENEFITS = [
  { title: "Native vertical format",             desc: "WizShorts™ generates in 9:16 from the start — not a landscape video cropped down. Every frame is composed for vertical viewing." },
  { title: "Platform algorithm awareness",        desc: "Each platform rewards different content patterns — WizShorts™ adapts pacing, caption style, and CTA placement for TikTok, YouTube Shorts, Reels, and Spotlight." },
  { title: "Proven short-form structure",         desc: "Every generated short follows the Hook/Story/CTA structure that drives the highest watch-through and engagement rates." },
  { title: "Content calendar scale",             desc: "Generate a week's worth of shorts in the time it takes to produce one manually — ideal for consistent posting schedules." },
  { title: "No editing skills needed",           desc: "WizShorts™ handles scripting, visuals, captions, and platform optimisation — you provide the concept, the AI produces the content." },
  { title: "Cross-platform from one brief",      desc: "One content brief generates platform-specific variants for TikTok, YouTube Shorts, Reels, and Spotlight simultaneously." },
];

const FAQS = [
  { q: "What platforms does WizShorts™ support?",          a: "WizShorts™ generates content optimised for TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight. Each platform variant is adapted for that platform's algorithm, caption style, and CTA conventions." },
  { q: "What aspect ratio does WizShorts™ output?",        a: "All WizShorts™ output is native 9:16 vertical format — composed for vertical viewing from the start, not cropped from landscape." },
  { q: "How long are WizShorts™ videos?",                  a: "WizShorts™ generates videos between 15 and 60 seconds. The default is 30 seconds — the optimal length for most platform algorithms. Custom durations are available on Pro and Business plans." },
  { q: "Can I generate multiple shorts from one brief?",   a: "Yes — WizShorts™ supports batch generation of up to 20 shorts from a single content brief. Each variant has a different hook, visual treatment, or CTA while maintaining the same core message." },
  { q: "Does WizShorts™ add captions automatically?",      a: "Yes — captions are generated and styled automatically. Caption style, font size, and position are optimised for each platform's mobile viewing context." },
  { q: "Can I use my own audio in WizShorts™?",            a: "Yes — you can upload your own audio track or use WizSound™ to generate original music. WizShorts™ can also match content to trending audio formats on each platform." },
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

/** A single portrait phone frame */
function PhoneFrame({ img, label, subtitle, desc, tip, index }: {
  img: string; label: string; subtitle: string; desc: string; tip: string; index: number;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Phone shell */}
      <div
        className="relative rounded-[28px] overflow-hidden mb-4"
        style={{
          width: "140px",
          height: "248px",
          border: `2px solid ${index === 0 ? ACCENT : "rgba(255,255,255,0.12)"}`,
          boxShadow: index === 0 ? `0 0 30px ${ACCENT_GLOW}` : "0 4px 24px rgba(0,0,0,0.5)",
          background: "#111",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full"
          style={{ width: "36px", height: "6px", background: "#000" }}
        />
        {/* Screen content */}
        <img src={img} alt={label} className="w-full h-full object-cover" loading="lazy" />
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
        {/* Label overlay */}
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <div
            className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
            style={{ background: index === 0 ? ACCENT : "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            {label}
          </div>
          <div className="text-[8px] text-white/50 mt-0.5">{subtitle}</div>
        </div>
        {/* Status bar simulation */}
        <div className="absolute top-0 left-0 right-0 h-8 flex items-start justify-between px-3 pt-1">
          <div className="text-[7px] text-white/60 mt-1">9:41</div>
          <div className="flex gap-0.5 mt-1">
            {[3,2,1].map(i => <div key={i} className="w-0.5 rounded-sm" style={{ height: `${i * 3}px`, background: "rgba(255,255,255,0.5)", alignSelf: "flex-end" }} />)}
          </div>
        </div>
      </div>
      {/* Description */}
      <div className="text-center max-w-[160px]">
        <div className="text-xs font-bold text-white mb-1">{label}</div>
        <div className="text-[10px] text-white/40 leading-snug mb-2">{desc}</div>
        <div
          className="text-[9px] px-2 py-1 rounded-lg"
          style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}20` }}
        >
          {tip}
        </div>
      </div>
    </div>
  );
}

export default function WizShortsProductPage() {
  useSEO({
    title: "WizShorts™ — AI Short-Form Video Generator | WIZ AI",
    path: "/products/wizshorts",
    description: "WizShorts™ generates platform-optimised short-form videos for TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight — native 9:16, Hook/Story/CTA structure.",
  });

  return (
    <div
      className="text-white min-h-screen overflow-x-hidden"
      style={{ background: "#050508" }}
    >
      {/* Vertical stripe pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${ACCENT}06 0px, ${ACCENT}06 1px, transparent 1px, transparent 40px)`,
          opacity: 0.8,
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b px-6 py-4"
        style={{ background: "rgba(5,5,8,0.92)", backdropFilter: "blur(20px)", borderColor: `${ACCENT}18` }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back" />
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="WizShorts™" className="h-8 w-auto object-contain" loading="lazy" />
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
              >
                Short-Form Studio
              </span>
            </div>
          </div>
          <NavLink
            href={WIZSHORTS_STUDIO_PAGE}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg"
            style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
          >
            <Zap className="w-3.5 h-3.5" />
            Create Short
          </NavLink>
        </div>
      </nav>

      {/* ── Hero — Portrait phone centre + flanking copy ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMGS.hero} alt="" className="w-full h-full object-cover object-center opacity-10" loading="eager" />
          <div className="absolute inset-0" style={{ background: "rgba(5,5,8,0.88)" }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 70% at 50% 50%, ${ACCENT_DIM} 0%, transparent 60%)` }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-28 w-full">
          {/* Top: Headline centred */}
          <div className="text-center mb-16">
            <img src={LOGO} alt="WizShorts™" className="h-12 w-auto object-contain mx-auto mb-6" loading="eager" />
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
              style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
            >
              <Zap className="w-3 h-3" />
              The Short-Form Studio
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-6 text-white">
              Stop the scroll.<br />
              <span style={{ color: ACCENT }}>Every time.</span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              WizShorts™ generates platform-optimised short-form videos for TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight — native 9:16, Hook/Story/CTA structure, auto-captions.
            </p>
          </div>

          {/* Centre: Three portrait phone frames */}
          <div className="flex items-end justify-center gap-8 md:gap-12 mb-12">
            {/* Left copy */}
            <div className="hidden lg:flex flex-col gap-4 max-w-[200px] text-right">
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Native 9:16</div>
                <div className="text-[10px] text-white/40">Composed for vertical — not cropped from landscape</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Auto-Captions</div>
                <div className="text-[10px] text-white/40">Platform-styled captions generated automatically</div>
              </div>
            </div>

            {/* Phone frames — 3 portrait phones */}
            <div className="flex items-end gap-4 md:gap-6">
              {FORMAT_FRAMES.map((frame, i) => (
                <div
                  key={frame.label}
                  className="transition-transform duration-300"
                  style={{ transform: i === 1 ? "translateY(-20px) scale(1.05)" : "translateY(0)" }}
                >
                  <PhoneFrame
                    img={frame.img}
                    label={frame.label}
                    subtitle={frame.subtitle}
                    desc={frame.desc}
                    tip={frame.tip}
                    index={i}
                  />
                </div>
              ))}
            </div>

            {/* Right copy */}
            <div className="hidden lg:flex flex-col gap-4 max-w-[200px]">
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">4 Platforms</div>
                <div className="text-[10px] text-white/40">TikTok, YouTube Shorts, Reels, Spotlight</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Batch Mode</div>
                <div className="text-[10px] text-white/40">Generate 20 shorts from one brief</div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            <NavLink
              href={WIZSHORTS_STUDIO_PAGE}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}` }}
            >
              <Zap className="w-4 h-4" />
              Create Your Short
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

          {/* Stats */}
          <div className="flex items-center justify-center gap-12">
            {[
              { val: "9:16",  label: "Native format" },
              { val: "4",     label: "Platforms" },
              { val: "20x",   label: "Batch generation" },
            ].map(s => (
              <div key={s.val} className="text-center">
                <div className="text-2xl font-black" style={{ color: ACCENT }}>{s.val}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Signature Section: Format Showcase ── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#080810" }}>
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
              Format Showcase
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              The Hook/Story/CTA structure
            </h2>
            <p className="text-white/40 text-base max-w-xl mx-auto">
              Every WizShorts™ video follows the proven 3-part structure that drives the highest watch-through and engagement rates across all platforms.
            </p>
          </div>

          {/* Platform badges */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {PLATFORMS.map(p => (
              <div
                key={p.name}
                className="px-4 py-2 rounded-full text-xs font-bold"
                style={{ background: p.color, color: p.textColor, border: `1px solid ${p.border}` }}
              >
                {p.name}
              </div>
            ))}
          </div>

          {/* Three portrait phone frames — larger version */}
          <div className="flex items-end justify-center gap-6 md:gap-10">
            {FORMAT_FRAMES.map((frame, i) => (
              <div
                key={frame.label}
                className="flex flex-col items-center"
                style={{ transform: i === 1 ? "translateY(-16px)" : "translateY(0)" }}
              >
                {/* Larger phone */}
                <div
                  className="relative rounded-[32px] overflow-hidden mb-5"
                  style={{
                    width: "160px",
                    height: "284px",
                    border: `2px solid ${i === 0 ? ACCENT : "rgba(255,255,255,0.1)"}`,
                    boxShadow: i === 0 ? `0 0 40px ${ACCENT_GLOW}` : "0 8px 32px rgba(0,0,0,0.6)",
                    background: "#111",
                  }}
                >
                  <div
                    className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 rounded-full"
                    style={{ width: "40px", height: "6px", background: "#000" }}
                  />
                  <img src={frame.img} alt={frame.label} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />
                  {/* Simulated caption bar */}
                  <div
                    className="absolute bottom-10 left-3 right-3 px-2 py-1 rounded text-center"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                  >
                    <div className="text-[9px] font-black text-white uppercase tracking-wide">
                      {frame.label === "Hook" ? "WATCH THIS 👀" : frame.label === "Story" ? "HERE'S HOW IT WORKS" : "FOLLOW FOR MORE ✨"}
                    </div>
                  </div>
                  {/* Section label */}
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <div
                      className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background: i === 0 ? ACCENT : "rgba(255,255,255,0.15)", color: "#fff" }}
                    >
                      {frame.label}
                    </div>
                  </div>
                </div>
                {/* Description */}
                <div className="text-center max-w-[180px]">
                  <div className="text-sm font-bold text-white mb-1">{frame.label} — {frame.subtitle}</div>
                  <div className="text-[10px] text-white/40 leading-snug mb-3">{frame.desc}</div>
                  <div
                    className="text-[9px] px-3 py-1.5 rounded-lg"
                    style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}20` }}
                  >
                    {frame.tip}
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
          <h2 className="text-3xl font-extrabold text-white mb-12">From brief to platform-ready short</h2>
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
      <section className="py-20 px-6" style={{ background: "#080810" }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Key Features
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">Built for short-form, not adapted from long-form</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {KEY_FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl overflow-hidden group"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Portrait-oriented thumbnail (9:16 aspect ratio) */}
                <div className="overflow-hidden" style={{ height: "160px" }}>
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
            Why WizShorts™
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-12">The short-form studio built for creators</h2>
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
        style={{ background: `linear-gradient(135deg, ${ACCENT}10 0%, rgba(5,5,8,0) 60%)` }}
      >
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to stop the scroll?
          </h2>
          <p className="text-white/45 text-base mb-8 max-w-xl mx-auto">
            One brief. Platform-optimised shorts for TikTok, YouTube Shorts, Reels, and Spotlight — ready in minutes.
          </p>
          <NavLink
            href={WIZSHORTS_STUDIO_PAGE}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: ACCENT, boxShadow: `0 0 40px ${ACCENT_GLOW}` }}
          >
            <Zap className="w-4 h-4" />
            Open WizShorts™ Studio
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6" style={{ background: "#080810" }}>
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
              { name: "WizImage™",  href: WIZIMAGE_PRODUCT_PAGE },
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
