/**
 * WizScriptProductPage — dedicated studio-style product page for WizScript™
 *
 * Visual theme: Screenplay / writing studio
 * Accent: Deep violet #7c3aed
 * Background: Dark navy #06060f with CSS noise texture
 * Hero: Left copy + right animated screenplay panel (typewriter cursor)
 * Signature section: Script Preview Panel — prompt → screenplay → storyboard frames
 */
import React, { useState, useEffect, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
 ArrowRight, ChevronRight, ChevronDown, FileText, Sparkles, Check, Layers, Zap, Eye,
} from "@/lib/icons";
import {
 WIZSCRIPT_STUDIO_PAGE,
 WIZVIDEO_PRODUCT_PAGE,
 WIZANIMATE_PRODUCT_PAGE,
 WIZPILOT_PRODUCT_PAGE,
 WIZIMAGE_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizscript-logo_6e6e7f2e.png`;
const WIZAI_LOGO = `/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png`;

const IMGS = {
 hero: `${CDN}/showcase-text-to-video_c2d4e8f1.jpg`,
 frame1: `${CDN}/card-storyboard_38d61672.jpg`,
 frame2: `${CDN}/card-video-render_d81a3b98.jpg`,
 frame3: `${CDN}/card-animation_e13ffa11.jpg`,
 feature1: `${CDN}/card-ai-brain_b513d38b.jpg`,
 feature2: `${CDN}/card-music-notes_96ce5dac.jpg`,
 feature3: `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT = "#7c3aed";
const ACCENT_DIM = "rgba(124,58,237,0.15)";
const ACCENT_GLOW = "rgba(124,58,237,0.35)";

const SAMPLE_SCRIPT = `FADE IN:

INT. ROOFTOP STUDIO — NIGHT

Rain hammers the skylight. MAYA (28) hunches over
a mixing board, headphones around her neck.

 MAYA
 (to herself)
 This is the one. This is the one.

She hits PLAY. The room fills with sound.

CUT TO:

EXT. CITY STREET — CONTINUOUS

The beat pulses through the walls. A crowd forms
below, drawn by the music drifting down.

 MAYA (V.O.)
 I never thought an AI could understand
 what I was trying to say. But it did.

SMASH CUT TO:`;

const PREVIEW_STEPS = [
 {
 label: "01 — Prompt",
 content: "A music producer discovers her breakthrough track on a rainy rooftop studio. Cinematic noir. Emotional. Urban.",
 type: "prompt",
 },
 {
 label: "02 — Generated Script",
 content: SAMPLE_SCRIPT,
 type: "script",
 },
 {
 label: "03 — Storyboard",
 content: "storyboard",
 type: "frames",
 },
];

const HOW_IT_WORKS = [
 { num: "01", title: "Describe your story", desc: "Type a prompt describing your concept — mood, setting, characters, tone. WizScript™ handles the rest." },
 { num: "02", title: "AI writes the screenplay", desc: "A full screenplay is generated in proper format: scene headings, action lines, dialogue, and transitions." },
 { num: "03", title: "Storyboard generated", desc: "Each scene is visualised as a storyboard panel — camera angle, lighting, and character blocking included." },
 { num: "04", title: "Video production begins", desc: "The screenplay and storyboard feed directly into WizVideo™ or WizAnimate™ for full video generation." },
];

const KEY_FEATURES = [
 { title: "Proper Screenplay Format", desc: "Industry-standard Final Draft format — scene headings, action lines, dialogue blocks, and transitions.", img: IMGS.feature1 },
 { title: "Tone & Genre Control", desc: "Set the genre, tone, pacing, and emotional arc before generation — the AI adapts its writing style accordingly.", img: IMGS.feature2 },
 { title: "Auto-Storyboarding", desc: "Every scene generates a visual storyboard panel automatically — no separate storyboard tool needed.", img: IMGS.feature3 },
 { title: "Character Consistency", desc: "Named characters maintain consistent voice, motivation, and visual description across the entire script.", img: IMGS.frame1 },
 { title: "WizVideo™ Integration", desc: "Export your screenplay directly to WizVideo™ — the scenes, characters, and tone carry over automatically.", img: IMGS.frame2 },
 { title: "Revision & Regeneration", desc: "Regenerate any individual scene, rewrite dialogue, or change the tone of a section without rebuilding from scratch.", img: IMGS.frame3 },
];

const BENEFITS = [
 { title: "No screenwriting experience needed", desc: "WizScript™ handles structure, format, and pacing — you provide the concept, the AI writes the screenplay." },
 { title: "From concept to storyboard in minutes", desc: "A full screenplay with storyboard panels that would take a writer days is ready in under 5 minutes." },
 { title: "Built for video production", desc: "Unlike general writing tools, WizScript™ generates scripts specifically designed for AI video generation — scenes are optimised for visual rendering." },
 { title: "Genre-aware writing", desc: "The AI understands genre conventions — a thriller script reads differently from a music video treatment or a documentary narration." },
 { title: "Consistent character voice", desc: "Characters maintain their voice and motivation across the entire script — no inconsistent dialogue or personality drift." },
 { title: "Direct pipeline to video", desc: "WizScript™ feeds directly into WizVideo™ and WizAnimate™ — the full production pipeline starts here." },
];

const FAQS = [
 { q: "What if the script does not match what I had in mind?", a: "You can regenerate any individual scene, rewrite dialogue, or adjust the tone of any section after generation. The full script is editable — you are never locked into the first output." },
 { q: "What do credits cover for WizScript™?", a: "Credits are only charged when you export or send the script to WizVideo™. Generating, previewing, and editing the script is free — you only pay when you are ready to produce." },
 { q: "Is the generated content original and commercially usable?", a: "Yes — all generated scripts are original content created from your prompt, not derived from existing scripts or copyrighted material. They are fully licensed for commercial use." },
 { q: "Can I refine the script before sending it to production?", a: "Yes — the full script is editable in the WizScript™ studio. You can rewrite scenes, change dialogue, adjust tone, or regenerate any section before exporting to WizVideo™." },
 { q: "How does WizScript™ connect to WizVideo™?", a: "WizScript™ exports directly to WizVideo™ — the scenes, characters, and visual direction carry over automatically without re-entering any information." },
 { q: "What script formats does WizScript™ generate?", a: "WizScript™ generates music video treatments, short film scripts, documentary narrations, commercial scripts, and social content scripts in industry-standard screenplay format." },
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

function TypewriterCursor() {
 const [visible, setVisible] = useState(true);
 useEffect(() => {
 const t = setInterval(() => setVisible(v => !v), 530);
 return () => clearInterval(t);
 }, []);
 return <span className="inline-block w-[2px] h-[14px] align-middle ml-0.5" style={{ background: visible ? "#7c3aed" : "transparent" }} />;
}

function ScriptPreviewPanel() {
 const [activeStep, setActiveStep] = useState(1);
 return (
 <div
 className="rounded-2xl overflow-hidden"
 style={{ background: "#0c0c18", border: `1px solid ${ACCENT}25` }}
 >
 {/* Step tabs */}
 <div className="flex border-b border-white/[0.06]">
 {PREVIEW_STEPS.map((step, i) => (
 <button
 key={step.label}
 onClick={() => setActiveStep(i)}
 className="flex-1 py-3 px-4 text-[10px] font-bold tracking-wider uppercase transition-all"
 style={{
 color: activeStep === i ? ACCENT : "rgba(255,255,255,0.78)",
 background: activeStep === i ? `${ACCENT}10` : "transparent",
 borderBottom: activeStep === i ? `2px solid ${ACCENT}` : "2px solid transparent",
 }}
 >
 {step.label}
 </button>
 ))}
 </div>
 {/* Content */}
 <div className="p-6" style={{ minHeight: "280px" }}>
 {activeStep === 0 && (
 <div>
 <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Story prompt</div>
 <div
 className="p-4 rounded-xl text-sm text-white/70 leading-relaxed font-mono"
 style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${ACCENT}20` }}
 >
 {PREVIEW_STEPS[0].content}
 <TypewriterCursor />
 </div>
 <div className="mt-4 flex items-center gap-2">
 <div
 className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
 style={{ background: ACCENT }}
 >Generate Script →
 </div>
 <div className="text-[10px] text-white/25">Genre: Music Video · Tone: Cinematic Noir</div>
 </div>
 </div>
 )}
 {activeStep === 1 && (
 <div>
 <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Generated screenplay</div>
 <pre
 className="text-[11px] leading-relaxed text-white/65 whitespace-pre-wrap font-mono overflow-y-auto"
 style={{ maxHeight: "240px", fontFamily: "'Courier New', Courier, monospace" }}
 >
 {SAMPLE_SCRIPT}
 <TypewriterCursor />
 </pre>
 </div>
 )}
 {activeStep === 2 && (
 <div>
 <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Auto-generated storyboard</div>
 <div className="grid grid-cols-3 gap-3">
 {[IMGS.frame1, IMGS.frame2, IMGS.frame3].map((img, i) => (
 <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ACCENT}20` }}>
 <img src={img} alt={`Scene ${i + 1}`} className="w-full h-20 object-cover" loading="lazy" />
 <div className="p-2">
 <div className="text-[9px] font-bold text-white/60">SCENE {String(i + 1).padStart(2, "0")}</div>
 <div className="text-[9px] text-white/30 mt-0.5">
 {["INT. ROOFTOP — NIGHT", "EXT. CITY STREET — NIGHT", "INT. STUDIO — DAY"][i]}
 </div>
 </div>
 </div>
 ))}
 </div>
 <div className="mt-3 flex items-center gap-2">
 <div
 className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
 style={{ background: ACCENT }}
 >Send to WizVideo™ →
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

export default function WizScriptProductPage() {
 useSEO({
 title: "WizScript™ — AI Screenplay & Storyboard Generator | WIZ AI",
 path: "/products/wizscript",
 description: "WizScript™ generates professional screenplays and storyboards from a single prompt — proper screenplay format, auto-storyboarding, and direct WizVideo™ integration.",
 });

 return (
 <div
 className="text-white min-h-screen overflow-x-hidden"
 style={{ background: "#06060f" }}
 >
 {/* Noise texture overlay */}
 <div
 className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
 style={{
 backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
 backgroundRepeat: "repeat",
 backgroundSize: "200px 200px",
 }}
 />

 {/* Nav */}
 <nav
 className="sticky top-0 z-50 border-b px-6 py-4"
 style={{ background: "rgba(6,6,15,0.92)", backdropFilter: "blur(20px)", borderColor: `${ACCENT}18` }}
 >
 <div className="max-w-7xl mx-auto flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton fallback="/" label="Back" />
 <div className="flex items-center gap-3">
 <img src={LOGO} alt="WizScript™" className="h-8 w-auto object-contain" loading="lazy" />
 <span
 className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
 style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
 >AI Screenplay Studio
 </span>
 </div>
 </div>
 <NavLink
 href={WIZSCRIPT_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg"
 style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
 >
 <FileText className="w-3.5 h-3.5" />Write a Script
 </NavLink>
 </div>
 </nav>

 {/* Hero — Copy left + Screenplay panel right */}
 <section className="relative min-h-[90vh] flex items-center overflow-hidden">
 {/* Background */}
 <div className="absolute inset-0">
 <img src={IMGS.hero} alt="" className="w-full h-full object-cover object-center opacity-20" loading="eager" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(6,6,15,0.98) 0%, rgba(6,6,15,0.85) 50%, rgba(6,6,15,0.7) 100%)" }} />
 <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 70% at 0% 50%, ${ACCENT_DIM} 0%, transparent 55%)` }} />
 </div>

 <div className="relative max-w-7xl mx-auto px-6 py-28 grid lg:grid-cols-2 gap-16 items-center w-full">
 {/* Left: Headline and CTAs */}
 <div>
 <img src={LOGO} alt="WizScript™" className="h-12 w-auto object-contain mb-6" loading="eager" />
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
 >
 <FileText className="w-3 h-3" />The Screenplay Studio
 </div>
 <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-6 text-white">Your concept.<br />
 <span style={{ color: ACCENT }}>A professional</span><br />
 screenplay.
 </h1>
 <p className="text-white/50 text-base leading-relaxed mb-10 max-w-lg">Generate a production-ready screenplay and storyboard from a single prompt — proper format, consistent characters, WizVideo™ ready.
 </p>
 <div className="flex flex-wrap gap-3 mb-10">
 <NavLink
 href={WIZSCRIPT_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all"
 style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}` }}
 >
 <FileText className="w-4 h-4" />Open WizScript™ Studio
 <ArrowRight className="w-4 h-4" />
 </NavLink>
 <NavLink
 href="/pricing#plans"
 className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-all"
 style={{ border: "1px solid rgba(255,255,255,0.12)" }}
 >View pricing <ChevronRight className="w-4 h-4" />
 </NavLink>
 </div>
 <p className="text-[11px] text-white/30 mt-3 tracking-wide">Opens in the WizScript™ writing studio &middot; 2 free credits on sign-up &middot; No card required</p>
 <div className="flex items-center gap-8">
 {[
 { val: "< 5m", label: "Script generation" },
 { val: "100%", label: "Proper format" },
 { val: "6+", label: "Languages" },
 ].map(s => (
 <div key={s.val} className="text-center">
 <div className="text-2xl font-black" style={{ color: ACCENT }}>{s.val}</div>
 <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Right: Animated screenplay panel */}
 <div className="hidden lg:block">
 {/* "FADE IN:" header card */}
 <div
 className="mb-4 px-5 py-3 rounded-xl inline-flex items-center gap-3"
 style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30` }}
 >
 <span className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: ACCENT, fontFamily: "'Courier New', Courier, monospace" }}>FADE IN:
 </span>
 <span className="text-[10px] text-white/30">WizScript™ is writing your screenplay</span>
 </div>
 {/* Screenplay card */}
 <div
 className="rounded-2xl p-6 relative"
 style={{
 background: "#0c0c1a",
 border: `1px solid ${ACCENT}25`,
 boxShadow: `0 0 60px ${ACCENT}12`,
 fontFamily: "'Courier New', Courier, monospace",
 }}
 >
 <pre className="text-[11px] leading-relaxed text-white/65 whitespace-pre-wrap overflow-hidden" style={{ maxHeight: "320px" }}>
 {SAMPLE_SCRIPT}
 <TypewriterCursor />
 </pre>
 {/* Fade at bottom */}
 <div
 className="absolute bottom-0 left-0 right-0 h-16 rounded-b-2xl"
 style={{ background: "linear-gradient(to top, #0c0c1a, transparent)" }}
 />
 </div>
 </div>
 </div>
 </section>

 {/* Signature Section: Script Preview Panel */}
 <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#08081a" }}>
 <div
 className="absolute inset-0 pointer-events-none"
 style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${ACCENT_DIM} 0%, transparent 65%)` }}
 />
 <div className="max-w-5xl mx-auto relative">
 <div className="text-center mb-12">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-5"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >
 <FileText className="w-3 h-3" />Script Preview Panel
 </div>
 <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Prompt → Screenplay → Storyboard
 </h2>
 <p className="text-white/40 text-base max-w-xl mx-auto">See the full WizScript™ pipeline in action — from a single sentence to a production-ready screenplay and storyboard.
 </p>
 </div>
 <ScriptPreviewPanel />
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
 <h2 className="text-3xl font-extrabold text-white mb-12">From concept to production-ready script</h2>
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

 {/* Key Features */}
 <section className="py-20 px-6" style={{ background: "#08081a" }}>
 <div className="max-w-6xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >Key Features
 </div>
 <h2 className="text-3xl font-extrabold text-white mb-12">Built for video production, not just writing</h2>
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

 {/* Benefits */}
 <section className="py-20 px-6">
 <div className="max-w-6xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >Why WizScript™
 </div>
 <h2 className="text-3xl font-extrabold text-white mb-12">The writing studio that feeds your entire pipeline</h2>
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

 {/* Mid-page CTA */}
 <section
 className="py-20 px-6 relative overflow-hidden"
 style={{ background: `linear-gradient(135deg, ${ACCENT}12 0%, rgba(6,6,15,0) 60%)` }}
 >
 <div className="max-w-4xl mx-auto text-center relative">
 <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to write your screenplay?
 </h2>
 <p className="text-white/45 text-base mb-8 max-w-xl mx-auto">One prompt. A full screenplay, storyboard, and production pipeline — ready in under 5 minutes.
 </p>
 <NavLink
 href={WIZSCRIPT_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all"
 style={{ background: ACCENT, boxShadow: `0 0 40px ${ACCENT_GLOW}` }}
 >
 <FileText className="w-4 h-4" />Open WizScript™ Studio
 <ArrowRight className="w-4 h-4" />
 </NavLink>
 <div className="flex items-center justify-center gap-5 mt-5 text-[11px] text-white/30 tracking-wide">
 <span>&#10003; Commercial use included</span>
 <span className="text-white/15">·</span>
 <span>&#10003; Proper screenplay format</span>
 <span className="text-white/15">·</span>
 <span>&#10003; No card to start</span>
 </div>
 </div>
 </section>

 {/* FAQ */}
 <section className="py-20 px-6" style={{ background: "#08081a" }}>
 <div className="max-w-3xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >FAQ
 </div>
 <h2 className="text-2xl font-extrabold text-white mb-8">Common questions</h2>
 <div className="divide-y divide-white/[0.06]">
 {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
 </div>
 </div>
 </section>

 {/* Related */}
 <section className="py-16 px-6 border-t border-white/[0.04]">
 <div className="max-w-6xl mx-auto">
 <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/25 mb-6">Part of the WIZ AI Engine</div>
 <div className="flex flex-wrap gap-3">
 {[
 { name: "WizVideo™", href: WIZVIDEO_PRODUCT_PAGE },
 { name: "WizAnimate™", href: WIZANIMATE_PRODUCT_PAGE },
 { name: "WizPilot™", href: WIZPILOT_PRODUCT_PAGE },
 { name: "WizImage™", href: WIZIMAGE_PRODUCT_PAGE },
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
 <footer className="py-8 px-6 border-t border-white/[0.04]">
 <div className="max-w-6xl mx-auto flex items-center justify-between">
 <img src={WIZAI_LOGO} alt="WIZ AI" className="h-6 w-auto opacity-80" loading="lazy" />
 <div className="text-[11px] text-white/20">© 2025 WIZ AI. All rights reserved.</div>
 </div>
 </footer>
 </div>
 );
}
