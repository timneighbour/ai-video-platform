/**
 * WizAnimateProductPage — dedicated studio-style product page for WizAnimate™
 *
 * Polish pass: A1–A8
 * A1: PublicNavBar replaces bespoke nav
 * A2: Hero background image wired + opacity raised + cinematic depth layers
 * A3: Stats bar upgraded — 4 stats, larger type, orange gradient treatment
 * A4: Feature card image height increased h-36 → h-52
 * A5: Feature copy deepened with benefit framing
 * A6: Benefits section upgraded with visual differentiation
 * A7: Stale route constants fixed (WIZSCORE → WIZSHORTS, WIZAUDIO → correct alias)
 * A8: Credibility strip added; mid-page CTA upgraded; footer improved
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import PublicNavBar from "@/components/PublicNavBar";
import { NavLink } from "@/components/NavLink";
import {
 ArrowRight, ChevronRight, ChevronDown, Sparkles, Zap, Music, Film, Users, Clock,
} from "@/lib/icons";
import {
 WIZANIMATE_STUDIO_PAGE,
 WIZVIDEO_PRODUCT_PAGE,
 WIZSCRIPT_PRODUCT_PAGE,
 WIZSHORTS_PRODUCT_PAGE,
 WIZAUDIO_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizanimate-logo-new_a84f9808.png`;
const WIZAI_LOGO = `/manus-storage/wizai-logo-v3_e7823047.png`;

const IMGS = {
 hero: `${CDN}/showcase-animation-studio_e21a763d.jpg`,
 frame1: `${CDN}/card-animation_e13ffa11.jpg`,
 frame2: `${CDN}/card-video-render_d81a3b98.jpg`,
 frame3: `${CDN}/card-storyboard_38d61672.jpg`,
 frame4: `${CDN}/card-ai-brain_b513d38b.jpg`,
 frame5: `${CDN}/card-music-notes_96ce5dac.jpg`,
 frame6: `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT = "#f97316";
const ACCENT_DIM = "rgba(249,115,22,0.12)";
const ACCENT_GLOW = "rgba(249,115,22,0.35)";
const ACCENT_DEEP = "rgba(249,115,22,0.06)";

const KEYFRAMES = [
 { label: "Frame 01", beat: "0:00", img: IMGS.frame1 },
 { label: "Frame 02", beat: "0:04", img: IMGS.frame3 },
 { label: "Frame 03", beat: "0:08", img: IMGS.frame2 },
 { label: "Frame 04", beat: "0:12", img: IMGS.frame4 },
 { label: "Frame 05", beat: "0:16", img: IMGS.frame5 },
 { label: "Frame 06", beat: "0:20", img: IMGS.frame6 },
];

const WAVEFORM_BARS = [
 3,5,8,12,18,24,30,28,22,16,10,7,5,8,14,22,32,38,40,36,28,20,14,10,8,12,18,26,34,38,
 36,30,22,16,12,9,7,10,16,24,32,36,34,28,20,14,10,8,6,9,14,20,28,34,36,32,24,18,12,8,
];

const HOW_IT_WORKS = [
 { num: "01", title: "Upload your audio", desc: "Drop in your music track. WizAnimate™ analyses the BPM, beat grid, and emotional arc to plan the animation — no manual tempo-mapping required." },
 { num: "02", title: "Characters generated", desc: "AI generates your characters — appearance, costume, and personality — from your prompt or style selection. Describe what you want and the characters appear." },
 { num: "03", title: "Animation beat-locked", desc: "Every character movement, expression change, and scene transition is locked to the beat grid of your audio — the way a professional animator would do it manually, done automatically." },
 { num: "04", title: "Video exported", desc: "The full animated music video is rendered and exported at up to 4K resolution — ready for YouTube, social media, streaming platforms, or broadcast." },
];

const KEY_FEATURES = [
 {
 title: "Beat-Locked Animation",
 desc: "Every movement, expression, and scene transition is synchronised to your audio's beat grid — not placed randomly or on a fixed timer. WizAnimate™ reads your track's BPM and places keyframes at exact beat positions, the way a professional animator would cut to the beat manually. The result is animation that feels composed, not generated.",
 img: IMGS.frame1,
 },
 {
 title: "AI Character Generation",
 desc: "Characters are generated entirely from your text prompt — appearance, costume, personality, and animation style all defined by description. You do not need to provide reference images or pre-built character assets. Describe the character you want and WizAnimate™ builds it, maintaining visual consistency across every scene.",
 img: IMGS.frame4,
 },
 {
 title: "Kids & Family Styles",
 desc: "A dedicated animation mode designed specifically for children's content — bright, expressive visual language, age-appropriate character designs, and safe content output. Suitable for YouTube Kids, family streaming platforms, and educational content. Not a generic animation style with a filter applied — a purpose-built mode for this audience.",
 img: IMGS.frame3,
 },
 {
 title: "Cinematic Animation",
 desc: "Mature cinematic animation styles for music videos, brand content, and adult-oriented creative projects. Dramatic lighting, detailed environments, and expressive character movement — the visual quality expected from a professional animation studio, generated from your audio and prompt.",
 img: IMGS.frame2,
 },
 {
 title: "WizSync™ Lip Sync",
 desc: "Automatic lip sync driven by your audio — characters speak and sing in perfect synchronisation with the track. WizSync™ analyses the vocal frequencies and phoneme patterns in your audio and maps them to character mouth movements frame by frame. No manual lip-sync work required.",
 img: IMGS.frame6,
 },
 {
 title: "Scene Variety",
 desc: "Multiple scenes, environments, and camera angles are generated automatically across the full video — not a single looping background with a character placed in front of it. WizAnimate™ composes a full visual narrative that follows the structure and energy of your audio from start to finish.",
 img: IMGS.frame5,
 },
];

const BENEFITS = [
 { icon: <Music className="w-5 h-5" />, title: "Music-driven by design", desc: "Unlike generic animation tools, WizAnimate™ was built specifically for music. Every animation decision — pacing, expression, scene transitions — is driven by your audio's structure, not applied on top of it." },
 { icon: <Zap className="w-5 h-5" />, title: "No animation skills needed", desc: "WizAnimate™ handles every frame — character design, movement, lip sync, and scene composition — from your audio and prompt. No timeline editing, no keyframe adjustment, no rendering knowledge required." },
 { icon: <Users className="w-5 h-5" />, title: "Consistent characters", desc: "Characters maintain their appearance and personality across every scene in the video — no visual drift between cuts, no inconsistent costume or facial features. What you describe in the prompt is what you get throughout." },
 { icon: <Film className="w-5 h-5" />, title: "Safe for all audiences", desc: "Dedicated children's content mode with age-appropriate visual language — suitable for YouTube Kids and family platforms. The same engine that produces cinematic adult content has a fully separate safe mode for family creators." },
 { icon: <Sparkles className="w-5 h-5" />, title: "Professional output quality", desc: "Broadcast-quality animation at up to 4K resolution — suitable for streaming platforms, live events, and commercial use. The output is not a preview or a draft — it is the finished video, ready to publish." },
 { icon: <Clock className="w-5 h-5" />, title: "Fast generation", desc: "A full animated music video (3–4 minutes) is ready in under 15 minutes. No rendering farm, no overnight wait, no batch queue. Upload your track, describe your vision, and the video is ready before your next meeting." },
];

const FAQS = [
 { q: "What if the animation does not look right?", a: "You can regenerate any individual scene without rebuilding the entire animation. Style, character appearance, and scene direction can all be adjusted and re-run — you are never locked into a result you are not happy with." },
 { q: "What do credits cover for WizAnimate™?", a: "Credits are only charged on final animation render. Storyboard generation, character previews, and style selection are all free — you only pay when you are ready to produce the finished animation." },
 { q: "Can I use the animations commercially?", a: "Yes — all generated animations are fully licensed for commercial use on all plans, including streaming platforms, social media, broadcast, and live events. No additional licensing fee is required." },
 { q: "Can I customise the character appearance?", a: "Yes — character appearance, costume, and personality are defined by your text prompt. You can specify detailed visual descriptions or use style presets. Character settings can be changed per scene." },
 { q: "How does beat-locked animation work?", a: "WizAnimate™ analyses your audio's BPM and beat grid, then generates character movements and scene transitions that align to specific beat positions — similar to how a music video editor would cut to the beat manually." },
 { q: "Does WizAnimate™ work for children's content?", a: "Yes — WizAnimate™ has a dedicated Children's Content mode that uses age-appropriate visual language, bright colours, and safe character designs suitable for YouTube Kids and family platforms." },
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
 <div className="text-white min-h-screen overflow-x-hidden" style={{ background: "#050505" }}>

 {/* Grid-dot ambient overlay */}
 <div
 className="fixed inset-0 pointer-events-none z-0"
 style={{
 backgroundImage: `radial-gradient(circle, ${ACCENT}18 1px, transparent 1px)`,
 backgroundSize: "32px 32px",
 opacity: 0.35,
 }}
 />

 {/* A1 — PublicNavBar */}
 <PublicNavBar />

 {/* Hero */}
 <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden">

 {/* A2 — Hero background image + cinematic depth layers */}
 <div className="absolute inset-0">
 {/* Background image — showcase-animation-studio */}
 <img
 src={IMGS.hero}
 alt=""
 aria-hidden="true"
 className="absolute inset-0 w-full h-full object-cover"
 style={{ opacity: 0.38 }}
 />
 {/* Cinematic gradient overlay — top and bottom fade */}
 <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,0.65) 0%, rgba(5,5,5,0.15) 30%, rgba(5,5,5,0.15) 65%, rgba(5,5,5,0.95) 100%)" }} />
 {/* Orange radial glow — behind hero content */}
 <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 55% at 50% 42%, ${ACCENT_DIM} 0%, transparent 65%)` }} />
 {/* Subtle horizontal scan lines */}
 <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)`, opacity: 0.5 }} />
 {/* Corner accent glows */}
 <div className="absolute top-0 left-0 w-80 h-80 rounded-full" style={{ background: `radial-gradient(circle, ${ACCENT}10 0%, transparent 70%)`, transform: "translate(-35%, -35%)" }} />
 <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full" style={{ background: `radial-gradient(circle, ${ACCENT}08 0%, transparent 70%)`, transform: "translate(35%, 35%)" }} />
 </div>

 <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-12 w-full">
 {/* Headline block */}
 <div className="text-center mb-16">
 <img src={LOGO} alt="WizAnimate™" className="h-16 w-auto object-contain mx-auto mb-6 drop-shadow-lg" loading="eager" />
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}35`, background: `${ACCENT}10`, color: ACCENT }}
 >
 <Sparkles className="w-3 h-3" />The Animation Studio
 </div>
 <h1 className="text-5xl md:text-7xl font-black leading-[1.04] mb-6 text-white tracking-tight">Your music.<br />
 <span style={{ background: `linear-gradient(90deg, ${ACCENT}, #fb923c)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>A beat-locked
 </span><br />
 animation.
 </h1>
 <p className="text-white/55 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">WizAnimate™ generates a full animated music video from your audio track — AI characters, automatic lip sync, and every frame locked to your beat grid. No animation skills required.
 </p>
 <div className="flex flex-wrap gap-3 justify-center">
 <NavLink
 href={WIZANIMATE_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all"
 style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}`, color: "#000" }}
 >
 <Sparkles className="w-4 h-4" />Create Your Animation
 <ArrowRight className="w-4 h-4" />
 </NavLink>
 <NavLink
 href="/pricing#plans"
 className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-all"
 style={{ border: "1px solid rgba(255,255,255,0.12)" }}
 >View pricing <ChevronRight className="w-4 h-4" />
 </NavLink>
 </div>
 <p className="text-[11px] text-white/30 mt-3 tracking-wide">2 free credits on sign-up &middot; No card required</p>
 </div>

 {/* Animation Studio Monitor — signature visual */}
 <div className="relative">
 <div
 className="rounded-2xl p-4 mb-2"
 style={{
 background: "linear-gradient(135deg, rgba(249,115,22,0.09) 0%, rgba(249,115,22,0.03) 100%)",
 border: `1px solid ${ACCENT}28`,
 boxShadow: `0 0 60px ${ACCENT}0d, inset 0 1px 0 ${ACCENT}18`,
 }}
 >
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
 <div
 className="absolute top-[56px] left-[4%] right-[4%] h-0.5 hidden md:block"
 style={{ background: `linear-gradient(to right, transparent, ${ACCENT}50, ${ACCENT}80, ${ACCENT}50, transparent)` }}
 />
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

 {/* A3 — Stats bar: 4 stats, larger type, orange gradient */}
 <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 mt-12">
 {[
 { val: "< 15m", label: "Generation time" },
 { val: "4K", label: "Max resolution" },
 { val: "6", label: "Animation styles" },
 { val: "100%", label: "Beat-locked output" },
 ].map(s => (
 <div key={s.val} className="text-center">
 <div
 className="text-4xl md:text-5xl font-black"
 style={{ background: `linear-gradient(135deg, ${ACCENT}, #fb923c)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
 >
 {s.val}
 </div>
 <div className="text-[11px] text-white/35 uppercase tracking-wider mt-1">{s.label}</div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* A8 — Credibility / value strip */}
 <section className="py-10 px-6 border-y" style={{ background: "#080808", borderColor: `${ACCENT}12` }}>
 <div className="max-w-6xl mx-auto">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
 {[
 { icon: <Music className="w-5 h-5 mx-auto mb-2" style={{ color: ACCENT }} />, label: "Audio-first architecture", sub: "Built for music, not adapted from it" },
 { icon: <Zap className="w-5 h-5 mx-auto mb-2" style={{ color: ACCENT }} />, label: "Beat-grid synchronisation", sub: "Keyframes placed at exact beat positions" },
 { icon: <Film className="w-5 h-5 mx-auto mb-2" style={{ color: ACCENT }} />, label: "Kids & cinematic modes", sub: "Two dedicated animation style systems" },
 { icon: <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: ACCENT }} />, label: "WizSync™ lip sync included", sub: "Automatic — no manual phoneme mapping" },
 ].map(item => (
 <div key={item.label} className="py-2">
 {item.icon}
 <div className="text-xs font-bold text-white/80">{item.label}</div>
 <div className="text-[10px] text-white/35 mt-1">{item.sub}</div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Beat-Locked Timeline signature section */}
 <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#080808" }}>
 <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${ACCENT_DIM} 0%, transparent 65%)` }} />
 <div className="max-w-6xl mx-auto relative">
 <div className="text-center mb-12">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-5"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >
 <Zap className="w-3 h-3" />Beat-Locked Timeline
 </div>
 <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Every frame locked to your beat
 </h2>
 <p className="text-white/40 text-base max-w-xl mx-auto">WizAnimate™ analyses your audio's beat grid and places character keyframes at exact beat positions — the way a professional animator would do it manually.
 </p>
 </div>

 <div className="rounded-2xl p-6 mb-8" style={{ background: "#0c0c0c", border: `1px solid ${ACCENT}20` }}>
 <div className="text-[10px] text-white/25 uppercase tracking-wider mb-4">Audio waveform — beat grid</div>
 <div className="flex items-center gap-[2px] h-16 mb-4">
 {WAVEFORM_BARS.map((h, i) => (
 <div
 key={i}
 className="flex-1 rounded-sm transition-all"
 style={{
 height: `${Math.min(100, h * 2)}%`,
 background: i % 8 === 0 ? ACCENT : i % 4 === 0 ? `${ACCENT}70` : `${ACCENT}25`,
 }}
 />
 ))}
 </div>
 <div className="flex justify-between">
 {["0:00","0:04","0:08","0:12","0:16","0:20","0:24","0:28"].map(t => (
 <div key={t} className="text-[9px] text-white/25">{t}</div>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {KEYFRAMES.slice(0, 4).map((frame, i) => (
 <div key={frame.label} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ACCENT}25` }}>
 <img src={frame.img} alt={frame.label} className="w-full h-28 object-cover" loading="lazy" />
 <div className="p-3 flex items-center justify-between">
 <div>
 <div className="text-[9px] font-bold text-white/60">{frame.label}</div>
 <div className="text-[9px]" style={{ color: ACCENT }}>Beat @ {frame.beat}</div>
 </div>
 <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: ACCENT, color: "#000" }}>
 {i + 1}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* How It Works */}
 <section className="py-20 px-6">
 <div className="max-w-6xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >How It Works
 </div>
 <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-12 tracking-tight">Four steps from audio to animation</h2>
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

 {/* Key Features — A4: image height h-52 */}
 <section className="py-20 px-6" style={{ background: "#080808" }}>
 <div className="max-w-6xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >Key Features
 </div>
 <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-12 tracking-tight">Built for music, not generic animation</h2>
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
 {KEY_FEATURES.map(f => (
 <div
 key={f.title}
 className="rounded-2xl overflow-hidden group"
 style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
 >
 {/* A4 — increased image height */}
 <div className="h-52 overflow-hidden">
 <img src={f.img} alt={f.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
 </div>
 <div className="p-5">
 <div className="text-sm font-bold text-white mb-2">{f.title}</div>
 {/* A5 — deepened copy */}
 <div className="text-xs text-white/45 leading-relaxed">{f.desc}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Benefits — A6: visual differentiation with icons */}
 <section className="py-20 px-6">
 <div className="max-w-6xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >Why WizAnimate™
 </div>
 <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-12 tracking-tight">The animation studio in your browser</h2>
 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
 {BENEFITS.map((b, i) => (
 <div
 key={b.title}
 className="p-6 rounded-2xl"
 style={{
 background: i === 0 ? `${ACCENT}08` : "rgba(255,255,255,0.02)",
 border: `1px solid ${i === 0 ? ACCENT + "30" : "rgba(255,255,255,0.06)"}`,
 }}
 >
 <div
 className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
 style={{ background: `${ACCENT}15`, color: ACCENT }}
 >
 {b.icon}
 </div>
 <div className="text-sm font-bold text-white mb-2">{b.title}</div>
 <div className="text-xs text-white/45 leading-relaxed">{b.desc}</div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Mid-page CTA — A8: dramatic gradient background */}
 <section
 className="py-24 px-6 relative overflow-hidden"
 style={{ background: `linear-gradient(135deg, ${ACCENT}18 0%, rgba(251,146,60,0.08) 40%, rgba(5,5,5,0) 70%)` }}
 >
 {/* Radial glow behind CTA */}
 <div
 className="absolute inset-0 pointer-events-none"
 style={{ background: `radial-gradient(ellipse 60% 70% at 50% 50%, ${ACCENT}12 0%, transparent 65%)` }}
 />
 {/* Diagonal accent line */}
 <div
 className="absolute inset-0 pointer-events-none"
 style={{ backgroundImage: `repeating-linear-gradient(135deg, ${ACCENT}04 0px, ${ACCENT}04 1px, transparent 1px, transparent 60px)`, opacity: 0.8 }}
 />
 <div className="max-w-4xl mx-auto text-center relative">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}10`, color: ACCENT }}
 >
 <Sparkles className="w-3 h-3" />Start Creating
 </div>
 <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Ready to animate your music?
 </h2>
 <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">No animation skills. No timeline editing. No rendering knowledge required.<br />Upload your track — WizAnimate™ does the rest.
 </p>
 <NavLink
 href={WIZANIMATE_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all"
 style={{ background: ACCENT, boxShadow: `0 0 50px ${ACCENT_GLOW}`, color: "#000" }}
 >
 <Sparkles className="w-4 h-4" />Open WizAnimate™ Studio
 <ArrowRight className="w-4 h-4" />
 </NavLink>
 <div className="flex flex-wrap items-center justify-center gap-4 mt-5 text-[11px] text-white/35 tracking-wide">
 <span>&#10003; Beat-locked animation</span>
 <span className="text-white/15">·</span>
 <span>&#10003; Commercial use included</span>
 <span className="text-white/15">·</span>
 <span>&#10003; No card to start</span>
 <span className="text-white/15">·</span>
 <span>&#10003; 2 free credits on sign-up</span>
 </div>
 </div>
 </section>

 {/* FAQ */}
 <section className="py-20 px-6" style={{ background: "#080808" }}>
 <div className="max-w-3xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >FAQ
 </div>
 <h2 className="text-3xl font-extrabold text-white mb-8">Common questions</h2>
 <div className="divide-y divide-white/[0.06]">
 {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
 </div>
 </div>
 </section>

 {/* Related — A7: corrected route constants */}
 <section className="py-16 px-6 border-t border-white/[0.04]">
 <div className="max-w-6xl mx-auto">
 <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/25 mb-6">Part of the WIZ AI Engine</div>
 <div className="flex flex-wrap gap-3">
 {[
 { name: "WizVideo™", href: WIZVIDEO_PRODUCT_PAGE },
 { name: "WizShorts™", href: WIZSHORTS_PRODUCT_PAGE },
 { name: "WizScript™", href: WIZSCRIPT_PRODUCT_PAGE },
 { name: "WizSound™", href: WIZAUDIO_PRODUCT_PAGE },
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
 <NavLink href="/products" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/30 hover:text-white/60 transition-all">View all products <ChevronRight className="w-3 h-3" />
 </NavLink>
 </div>
 </div>
 </section>

 {/* Footer */}
 <footer className="py-10 px-6 border-t" style={{ borderColor: "rgba(255,255,255,0.04)", background: "#040404" }}>
 <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
 <img src={WIZAI_LOGO} alt="WIZ AI" className="h-7 w-auto opacity-40" loading="lazy" />
 <div className="flex flex-wrap gap-4 text-[11px] text-white/20">
 <NavLink href="/" className="hover:text-white/50 transition-colors">Home</NavLink>
 <NavLink href="/products" className="hover:text-white/50 transition-colors">Products</NavLink>
 <NavLink href="/pricing" className="hover:text-white/50 transition-colors">Pricing</NavLink>
 <NavLink href="/help" className="hover:text-white/50 transition-colors">Help</NavLink>
 </div>
 <div className="text-[11px] text-white/20">© 2025 WIZ AI. All rights reserved.</div>
 </div>
 </footer>

 </div>
 );
}
