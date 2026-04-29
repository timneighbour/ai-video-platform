/**
 * WizShortsProductPage — dedicated studio-style product page for WizShorts™
 *
 * Visual theme: Short-form vertical content studio — creator energy
 * Accent: Hot pink / fuchsia #d946ef
 * Background: Near-black #050508 with speed-lines + fuchsia radial glow
 * Hero: Full-screen cinematic with scaled portrait phone mockups
 * P1: Hero ambient upgrade — stronger bg, glow, speed-lines
 * P2: Phone mockup scale-up — 180px/320px hero, 200px/356px showcase
 * P3: Stats bar upgrade — larger numbers, 4 stats
 * P4: PublicNavBar replaces bespoke nav
 * P5: Section heading typography upgrade — text-4xl/5xl, gradient accents
 * P6: Feature card copy depth — creator-facing benefit copy
 * P7: Non-numeric credibility strip (factual, no invented metrics)
 * P8: Mid-page CTA visual upgrade — dramatic gradient, stronger copy
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import PublicNavBar from "@/components/PublicNavBar";
import { NavLink } from "@/components/NavLink";
import {
  ArrowRight, ChevronRight, ChevronDown, Zap, Check,
} from "@/lib/icons";
import {
  WIZSHORTS_STUDIO_PAGE,
  WIZVIDEO_PRODUCT_PAGE,
  WIZSCRIPT_PRODUCT_PAGE,
  WIZIMAGE_PRODUCT_PAGE,
  WIZAUDIO_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizshorts-logo-v1_533db978.png`;
const WIZAI_LOGO = `${CDN}/wizai-logo-premium-transparent_ac3f550b.png`;

const IMGS = {
  hero:    `${CDN}/hero-wizshorts_83e4e17d.jpg`,
  hook:    `${CDN}/card-video-render_d81a3b98.jpg`,
  story:   `${CDN}/card-animation_e13ffa11.jpg`,
  cta:     `${CDN}/card-storyboard_38d61672.jpg`,
  feat1:   `${CDN}/card-ai-brain_b513d38b.jpg`,
  feat2:   `${CDN}/card-music-notes_96ce5dac.jpg`,
  feat3:   `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT      = "#d946ef";
const ACCENT_DIM  = "rgba(217,70,239,0.14)";
const ACCENT_GLOW = "rgba(217,70,239,0.40)";
const ACCENT_MID  = "rgba(217,70,239,0.22)";

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

// P6 — Creator-facing, benefit-driven feature copy
const KEY_FEATURES = [
  {
    title: "Native 9:16 Vertical Format",
    desc: "WizShorts™ composes every frame for vertical viewing from the start — not a landscape video cropped down. No black bars, no awkward reframing, no lost detail at the edges.",
    img: IMGS.hook,
  },
  {
    title: "Platform-Specific Optimisation",
    desc: "TikTok's algorithm rewards different pacing than Reels. YouTube Shorts has different caption conventions than Spotlight. WizShorts™ knows the difference — and adapts every output automatically for the platform you choose.",
    img: IMGS.feat1,
  },
  {
    title: "Hook/Story/CTA Structure",
    desc: "Every short follows the proven 3-part structure that drives the highest watch-through and engagement rates. The hook stops the scroll, the story delivers the value, and the CTA converts the viewer — all generated automatically.",
    img: IMGS.story,
  },
  {
    title: "Auto-Captions",
    desc: "Captions are generated, styled, and positioned automatically — large, readable, and formatted for mobile viewing. Platform-specific caption conventions applied per output.",
    img: IMGS.feat2,
  },
  {
    title: "Trending Audio Integration",
    desc: "WizShorts™ can match your content to trending audio formats for each platform, or connect to WizSound™ to generate original music that fits the mood and pacing of your short.",
    img: IMGS.feat3,
  },
  {
    title: "Batch Generation",
    desc: "Generate 5, 10, or 20 shorts from a single content brief — each with a different hook, visual treatment, or CTA. Ideal for content calendars, A/B testing, and campaign batches.",
    img: IMGS.cta,
  },
];

const BENEFITS = [
  { title: "Native vertical format",             desc: "WizShorts™ generates in 9:16 from the start — not a landscape video cropped down. Every frame is composed for vertical viewing." },
  { title: "Platform algorithm awareness",        desc: "Each platform rewards different content patterns — WizShorts™ adapts pacing, caption style, and CTA placement for TikTok, YouTube Shorts, Reels, and Spotlight." },
  { title: "Proven short-form structure",         desc: "Every generated short follows the Hook/Story/CTA structure that drives the highest watch-through and engagement rates." },
  { title: "Content calendar scale",             desc: "Generate a week's worth of shorts in the time it takes to produce one manually — ideal for consistent posting schedules." },
  { title: "No editing skills needed",           desc: "WizShorts™ handles scripting, visuals, captions, and platform optimisation — you provide the concept, the AI produces the content." },
  { title: "Cross-platform from one brief",      desc: "One content brief generates platform-specific variants for TikTok, YouTube Shorts, Reels, and Spotlight simultaneously." },
];

// P7 — Non-numeric credibility strip (factual, no invented metrics)
const CREDIBILITY_ITEMS = [
  {
    icon: "✦",
    title: "4 platforms, one brief",
    desc: "TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight — each output adapted for that platform's format, algorithm, and caption conventions.",
  },
  {
    icon: "✦",
    title: "Native 9:16 from the start",
    desc: "Every WizShorts™ output is composed vertically from the first frame — not a landscape video reformatted after the fact.",
  },
  {
    icon: "✦",
    title: "Hook/Story/CTA — automatically",
    desc: "The three-part structure proven to drive short-form watch-through and engagement is applied to every generated short, without manual planning.",
  },
  {
    icon: "✦",
    title: "Batch generation up to 20",
    desc: "Generate up to 20 variants from a single brief — different hooks, visual treatments, and CTAs — for testing, scheduling, or campaign batches.",
  },
];

const FAQS = [
  { q: "What if the short does not perform well?",          a: "WizShorts™ supports batch generation of up to 20 variants from a single brief — each with a different hook, visual treatment, or CTA. You can test multiple versions without extra setup and regenerate any variant that is not working." },
  { q: "What do credits cover for WizShorts™?",             a: "Credits are only charged on final video render. Brief creation, hook previews, and caption review are all free — you only pay when you are ready to export the finished short." },
  { q: "Can I use the videos commercially?",                a: "Yes — all generated shorts are fully licensed for commercial use on all plans, including brand content, sponsored posts, and paid promotion on all four platforms." },
  { q: "Does WizShorts™ work for all four platforms at once?", a: "Yes — a single brief generates platform-optimised variants for TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight simultaneously. Each variant is adapted for that platform's algorithm, caption style, and CTA conventions." },
  { q: "Can I use my own audio?",                           a: "Yes — you can upload your own audio track or use WizSound™ to generate original music. WizShorts™ can also match content to trending audio formats on each platform." },
  { q: "How long are WizShorts™ videos?",                  a: "WizShorts™ generates videos between 15 and 60 seconds. The default is 30 seconds — the optimal length for most platform algorithms. Custom durations are available on Pro and Business plans." },
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

/** P2 — Scaled-up portrait phone frame */
function PhoneFrame({
  img, label, subtitle, desc, tip, index,
  width = 180, height = 320,
}: {
  img: string; label: string; subtitle: string; desc: string; tip: string; index: number;
  width?: number; height?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden mb-5"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: "28px",
          border: `2px solid ${index === 0 ? ACCENT : "rgba(255,255,255,0.12)"}`,
          boxShadow: index === 0
            ? `0 0 40px ${ACCENT_GLOW}, 0 0 80px ${ACCENT_MID}`
            : "0 8px 40px rgba(0,0,0,0.6)",
          background: "#111",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 rounded-full"
          style={{ width: "40px", height: "6px", background: "#000" }}
        />
        <img src={img} alt={label} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 45%)" }} />
        {/* Simulated caption bar */}
        <div
          className="absolute bottom-10 left-3 right-3 px-2 py-1 rounded text-center"
          style={{ background: "rgba(0,0,0,0.72)" }}
        >
          <div className="text-[9px] font-black text-white uppercase tracking-wide">
            {label === "Hook" ? "WATCH THIS 👀" : label === "Story" ? "HERE'S HOW IT WORKS" : "FOLLOW FOR MORE ✨"}
          </div>
        </div>
        {/* Section label */}
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <div
            className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ background: index === 0 ? ACCENT : "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            {label}
          </div>
        </div>
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 h-8 flex items-start justify-between px-3 pt-1">
          <div className="text-[7px] text-white/60 mt-1">9:41</div>
          <div className="flex gap-0.5 mt-1">
            {[3, 2, 1].map(i => (
              <div key={i} className="w-0.5 rounded-sm" style={{ height: `${i * 3}px`, background: "rgba(255,255,255,0.5)", alignSelf: "flex-end" }} />
            ))}
          </div>
        </div>
      </div>
      {/* Description */}
      <div className="text-center max-w-[200px]">
        <div className="text-sm font-bold text-white mb-1.5">{label} — {subtitle}</div>
        <div className="text-[11px] text-white/40 leading-snug mb-3">{desc}</div>
        <div
          className="text-[10px] px-3 py-1.5 rounded-lg"
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
      {/* P1 — Ambient: speed-lines + fuchsia radial glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(135deg, ${ACCENT}05 0px, ${ACCENT}05 1px, transparent 1px, transparent 48px),
            repeating-linear-gradient(90deg, ${ACCENT}04 0px, ${ACCENT}04 1px, transparent 1px, transparent 40px)
          `,
          opacity: 0.9,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 70% 20%, ${ACCENT_MID} 0%, transparent 60%)`,
        }}
      />

      {/* P4 — PublicNavBar */}
      <PublicNavBar />

      {/* ── Hero — Full-screen cinematic ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* P1 — Hero background: stronger opacity + layered glows */}
        <div className="absolute inset-0">
          <img
            src={IMGS.hero}
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.40 }}
            loading="eager"
          />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to bottom, rgba(5,5,8,0.55) 0%, rgba(5,5,8,0.50) 40%, rgba(5,5,8,0.95) 100%)" }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 90% 70% at 50% 30%, ${ACCENT_DIM} 0%, transparent 65%)` }} />
          {/* Speed-lines overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(135deg, ${ACCENT}06 0px, ${ACCENT}06 1px, transparent 1px, transparent 60px)`,
              opacity: 0.7,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          {/* Logo + badge */}
          <div className="text-center mb-10">
            <img src={LOGO} alt="WizShorts™" className="h-14 w-auto object-contain mx-auto mb-6" loading="eager" />
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
              style={{ border: `1px solid ${ACCENT}35`, background: `${ACCENT}0a`, color: ACCENT }}
            >
              <Zap className="w-3 h-3" />
              The Short-Form Studio
            </div>

            {/* P5 — Larger, stronger headline */}
            <h1 className="text-5xl md:text-7xl font-black leading-[1.02] mb-6 text-white tracking-tight">
              Stop the scroll.<br />
              <span
                style={{
                  background: `linear-gradient(90deg, ${ACCENT} 0%, #a855f7 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Every time.
              </span>
            </h1>
            <p className="text-white/55 text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
              WizShorts™ generates platform-optimised short-form videos for TikTok, YouTube Shorts, Instagram Reels, and Snapchat Spotlight — native 9:16, Hook/Story/CTA structure, auto-captions.
            </p>
          </div>

          {/* Platform badges */}
          <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
            {PLATFORMS.map(p => (
              <div
                key={p.name}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide"
                style={{ background: p.color, color: p.textColor, border: `1px solid ${p.border}`, boxShadow: `0 0 12px ${p.border}30` }}
              >
                {p.name}
              </div>
            ))}
          </div>

          {/* P2 — Scaled-up phone frames: 180px × 320px */}
          <div className="flex items-end justify-center gap-8 md:gap-12 mb-14">
            {/* Left copy */}
            <div className="hidden lg:flex flex-col gap-4 max-w-[220px] text-right">
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Native 9:16</div>
                <div className="text-[10px] text-white/40">Composed for vertical — not cropped from landscape</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Auto-Captions</div>
                <div className="text-[10px] text-white/40">Platform-styled captions generated automatically</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Batch Mode</div>
                <div className="text-[10px] text-white/40">Up to 20 variants from one brief</div>
              </div>
            </div>

            {/* Phone frames */}
            <div className="flex items-end gap-5 md:gap-8">
              {FORMAT_FRAMES.map((frame, i) => (
                <div
                  key={frame.label}
                  className={`transition-transform duration-300 ${
                    i === 0 ? "" : i === 1 ? "hidden sm:block" : "hidden md:block"
                  }`}
                  style={{ transform: i === 1 ? "translateY(-24px) scale(1.06)" : "translateY(0)" }}
                >
                  <PhoneFrame
                    img={frame.img}
                    label={frame.label}
                    subtitle={frame.subtitle}
                    desc={frame.desc}
                    tip={frame.tip}
                    index={i}
                    width={180}
                    height={320}
                  />
                </div>
              ))}
            </div>

            {/* Right copy */}
            <div className="hidden lg:flex flex-col gap-4 max-w-[220px]">
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">4 Platforms</div>
                <div className="text-[10px] text-white/40">TikTok, YouTube Shorts, Reels, Spotlight</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">Hook/Story/CTA</div>
                <div className="text-[10px] text-white/40">Proven 3-part structure — automatically applied</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-bold text-white mb-1">WizSound™ Integration</div>
                <div className="text-[10px] text-white/40">Original AI music matched to your short</div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <NavLink
              href={WIZSHORTS_STUDIO_PAGE}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: ACCENT, boxShadow: `0 0 40px ${ACCENT_GLOW}` }}
            >
              <Zap className="w-4 h-4" />
              Create Your Short
              <ArrowRight className="w-4 h-4" />
            </NavLink>
            <NavLink
              href="/pricing#plans"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              View pricing <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
          <p className="text-center text-[11px] text-white/30 tracking-wide">2 free credits on sign-up &middot; No card required</p>

          {/* P3 — Upgraded stats bar: 4 stats, larger numbers */}
          <div className="flex items-center justify-center gap-10 md:gap-16 mt-12 pt-10 border-t border-white/[0.06]">
            {[
              { val: "9:16",  label: "Native vertical format" },
              { val: "4",     label: "Supported platforms" },
              { val: "20×",   label: "Batch generation" },
              { val: "3-part", label: "Hook/Story/CTA structure" },
            ].map(s => (
              <div key={s.val} className="text-center">
                <div
                  className="text-3xl md:text-4xl font-black mb-1"
                  style={{
                    background: `linear-gradient(90deg, ${ACCENT} 0%, #a855f7 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.val}
                </div>
                <div className="text-[10px] text-white/35 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Signature Section: Format Showcase ── */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: "#080810" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${ACCENT_DIM} 0%, transparent 65%)` }}
        />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-5"
              style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
            >
              <Zap className="w-3 h-3" />
              Format Showcase
            </div>
            {/* P5 — Larger section heading */}
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              The Hook/Story/<span style={{ color: ACCENT }}>CTA structure</span>
            </h2>
            <p className="text-white/45 text-base max-w-xl mx-auto">
              Every WizShorts™ video follows the proven 3-part structure that drives the highest watch-through and engagement rates across all platforms.
            </p>
          </div>

          {/* Platform badges */}
          <div className="flex flex-wrap gap-3 justify-center mb-14">
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

          {/* P2 — Larger phone frames: 200px × 356px */}
          <div className="flex items-end justify-center gap-6 md:gap-10">
            {FORMAT_FRAMES.map((frame, i) => (
              <div
                key={frame.label}
                style={{ transform: i === 1 ? "translateY(-20px)" : "translateY(0)" }}
              >
                <PhoneFrame
                  img={frame.img}
                  label={frame.label}
                  subtitle={frame.subtitle}
                  desc={frame.desc}
                  tip={frame.tip}
                  index={i}
                  width={200}
                  height={356}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* P7 — Non-numeric credibility strip */}
      <section className="py-16 px-6 border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIBILITY_ITEMS.map(item => (
              <div
                key={item.title}
                className="p-6 rounded-2xl"
                style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}18` }}
              >
                <div className="text-lg mb-3" style={{ color: ACCENT }}>{item.icon}</div>
                <div className="text-sm font-bold text-white mb-2">{item.title}</div>
                <div className="text-xs text-white/45 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            How It Works
          </div>
          {/* P5 — Larger heading */}
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-14 tracking-tight">
            From brief to <span style={{ color: ACCENT }}>platform-ready short</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(step => (
              <div
                key={step.num}
                className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-4xl font-black mb-4" style={{ color: `${ACCENT}55` }}>{step.num}</div>
                <div className="text-sm font-bold text-white mb-2">{step.title}</div>
                <div className="text-xs text-white/45 leading-relaxed">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section className="py-24 px-6" style={{ background: "#080810" }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Key Features
          </div>
          {/* P5 — Larger heading */}
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-14 tracking-tight">
            Built for short-form,<br />
            <span style={{ color: ACCENT }}>not adapted from long-form</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {KEY_FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-2xl overflow-hidden group"
                style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}
              >
                {/* P2 — Taller feature card images */}
                <div className="overflow-hidden" style={{ height: "180px" }}>
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `${ACCENT}10` }}
                  />
                </div>
                <div className="p-6">
                  <div className="text-sm font-bold text-white mb-2">{f.title}</div>
                  {/* P6 — Creator-facing benefit copy */}
                  <div className="text-xs text-white/50 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            Why WizShorts™
          </div>
          {/* P5 — Larger heading */}
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-14 tracking-tight">
            The short-form studio<br />
            <span style={{ color: ACCENT }}>built for creators</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="p-6 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${i === 0 ? ACCENT + "35" : "rgba(255,255,255,0.05)"}`,
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT }} />
                  <div className="text-sm font-bold text-white">{b.title}</div>
                </div>
                <div className="text-xs text-white/45 leading-relaxed pl-7">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* P8 — Mid-page CTA visual upgrade */}
      <section
        className="py-28 px-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(217,70,239,0.18) 0%, rgba(168,85,247,0.12) 40%, rgba(5,5,8,0) 70%)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 70% at 30% 50%, ${ACCENT_MID} 0%, transparent 65%)` }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}35`, background: `${ACCENT}0a`, color: ACCENT }}
          >
            <Zap className="w-3 h-3" />
            Start Creating
          </div>
          {/* P8 — Stronger headline */}
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Ready to stop the scroll?
          </h2>
          {/* P8 — Addresses creator hesitation */}
          <p className="text-white/55 text-lg mb-4 max-w-xl mx-auto">
            No editing. No filming. No experience required.
          </p>
          <p className="text-white/40 text-base mb-10 max-w-xl mx-auto">
            Describe your idea — WizShorts™ writes the script, builds the visuals, adds captions, and exports platform-ready for TikTok, YouTube Shorts, Reels, and Spotlight.
          </p>
          <NavLink
            href={WIZSHORTS_STUDIO_PAGE}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-base text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, #a855f7 100%)`,
              boxShadow: `0 0 50px ${ACCENT_GLOW}`,
            }}
          >
            <Zap className="w-5 h-5" />
            Open WizShorts™ Studio
            <ArrowRight className="w-5 h-5" />
          </NavLink>
          <div className="flex items-center justify-center gap-5 mt-6 text-[11px] text-white/35 tracking-wide flex-wrap">
            <span>&#10003; 4 platforms in one</span>
            <span className="text-white/15">·</span>
            <span>&#10003; Commercial use included</span>
            <span className="text-white/15">·</span>
            <span>&#10003; No card to start</span>
            <span className="text-white/15">·</span>
            <span>&#10003; 2 free credits on sign-up</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6" style={{ background: "#080810" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
          >
            FAQ
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-10">Common questions</h2>
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
