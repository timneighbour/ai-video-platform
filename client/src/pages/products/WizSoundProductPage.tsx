import { WIZANIMATE_PRODUCT_PAGE, WIZAUDIO_STUDIO_PAGE, WIZSYNC_PRODUCT_PAGE } from "@/lib/routes";
/**
 * WizSoundProductPage — fully custom WizSound product page
 * Replaces the generic ProductPageTemplate for /products/wizsound
 * Features: premium photography, WizSoundDemoPlayer, back button, cinematic sections
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import WizSoundDemoPlayer from "@/components/WizSoundDemoPlayer";
import {
 ArrowRight, ChevronRight, Sparkles, Check, ChevronDown,
} from "@/lib/icons";

const CDN = "/manus-storage";
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-new_c5cced65.png`;
const WIZAI_LOGO = "/manus-storage/wizai-logo-v3_e7823047.png";

// Premium imagery CDN paths
const IMG = {
 heroConsole: "/manus-storage/studio-console_91324aaa.jpg",
 studioMic: "/manus-storage/studio-mic_3d8c675d.jpg",
 studioMicDark: "/manus-storage/studio-mic-dark_bd0b6598.jpg",
 studioMoody: "/manus-storage/studio-moody_02c867cc.jpg",
 concertHall: "/manus-storage/concert-hall_2b6b946b.jpg",
 sphereConcert: "/manus-storage/sphere-concert_e0e5b1d0.jpg",
 ambientMusic: "/manus-storage/ambient-music_efff5905.webp",
};

const RELATED = [
 { name: "WizCreate™", href: "/products/wizcreate" },
 { name: "WizAnimate™", href: WIZANIMATE_PRODUCT_PAGE },
 { name: "WizSync™", href: WIZSYNC_PRODUCT_PAGE },
 { name: "WizLumina™", href: "/products/wizlumina" },
 { name: "WizGenesis™", href: "/products/wizgenesis" },
 { name: "WizBoost™", href: "/products/wizboost" },
];

const HOW_IT_WORKS = [
 {
 num: "01",
 title: "Audio ingested",
 desc: "Your track is ingested and analysed — frequency content, dynamic range, noise floor, and stereo field all measured in real time.",
 img: IMG.studioMic,
 },
 {
 num: "02",
 title: "Enhancement applied",
 desc: "WizSound applies its proprietary 13-stage cinematic chain — EQ, compression, harmonic exciter, Haas widening, spatial reverb.",
 img: IMG.studioMoody,
 },
 {
 num: "03",
 title: "Mastering & QC",
 desc: "Two-pass loudnorm mastering targets your chosen LUFS level with true-peak limiting — broadcast-ready on every platform.",
 img: IMG.heroConsole,
 },
 {
 num: "04",
 title: "Baked into video",
 desc: "The enhanced audio is seamlessly baked into the final video build by WizGenesis™ — no manual steps, no file juggling.",
 img: IMG.concertHall,
 },
];

const KEY_FEATURES = [
 {
 title: "13-Stage Cinematic Chain",
 desc: "Every track passes through a proprietary 13-stage processing pipeline — EQ, compression, harmonic exciter, spatial widening, reverb, saturation, and true-peak mastering.",
 img: IMG.studioMoody,
 stat: "13",
 statLabel: "processing stages",
 },
 {
 title: "Haas Stereo Widening",
 desc: "Expands the stereo image to 3.5× its original width using psychoacoustic Haas delay — creating an immersive, cinema-grade soundstage.",
 img: IMG.sphereConcert,
 stat: "×3.5",
 statLabel: "stereo width",
 },
 {
 title: "Harmonic Exciter",
 desc: "Adds 2nd and 3rd-order harmonic content to introduce warmth, richness, and analogue character that digital recordings naturally lack.",
 img: IMG.ambientMusic,
 stat: "2nd+3rd",
 statLabel: "harmonics",
 },
 {
 title: "Broadcast Loudness Mastering",
 desc: "Automatic two-pass loudnorm mastering targets −14 LUFS integrated with true-peak limiting at −0.1 dBTP — meeting all major streaming standards.",
 img: IMG.studioMic,
 stat: "−14",
 statLabel: "LUFS target",
 },
 {
 title: "Concert Hall Reverb",
 desc: "A 3-tap concert hall reverb adds cinematic depth and spatial dimension — the difference between a demo recording and a film soundtrack.",
 img: IMG.concertHall,
 stat: "3-tap",
 statLabel: "reverb engine",
 },
 {
 title: "Noise Gate & Artefact Removal",
 desc: "Intelligent noise gating cleans the silence floor and removes digital artefacts before any enhancement is applied — preserving the integrity of the original.",
 img: IMG.studioMicDark,
 stat: "−60dB",
 statLabel: "noise floor",
 },
];

const BENEFITS = [
 { title: "Studio quality without a studio", desc: "WizSound delivers professional audio enhancement that would normally require a mastering engineer and significant investment in equipment." },
 { title: "Richer, fuller sound", desc: "Proprietary harmonic enhancement adds warmth and presence that makes your track feel alive — not just louder." },
 { title: "Cinematic spatial field", desc: "Stereo widening creates an immersive listening experience that draws viewers in and keeps them watching." },
 { title: "Broadcast-ready loudness", desc: "Automatic normalisation ensures your video meets YouTube, Spotify, and streaming platform standards every time." },
 { title: "Transparent processing", desc: "WizSound enhances without destroying — your original track's character is preserved and elevated, not replaced." },
 { title: "Automatic in the pipeline", desc: "WizSound runs automatically as part of every WIZ AI build — no manual steps, no extra software needed." },
];

const FAQS = [
 { q: "Will WizSound change the character of my music?", a: "No — WizSound enhances without replacing. The processing is designed to be transparent, preserving your track's original character while adding richness, width, and professional polish. You can preview the difference before committing." },
 { q: "Can I hear the difference before paying?", a: "Yes — use the audio demo player on this page to hear the same source track processed through each tier. The preview uses real WizSound-processed audio, not a simulation." },
 { q: "What do credits cover for WizSound?", a: "Previewing is always free. Credits are only charged when you export the final enhanced audio. You can compare tiers and listen as many times as you like before deciding." },
 { q: "Can I use the enhanced audio commercially?", a: "Yes — all WizSound-processed audio is fully licensed for commercial use on all plans, including streaming platforms, sync licensing, broadcast, and live events." },
 { q: "What is the difference between Active and Spatial?", a: "WizSound Active applies 7-stage enhancement including stereo widening, 3-band EQ, and loudness normalisation. WizSound Spatial adds the full 13-stage cinematic chain — Haas psychoacoustic widening, 5-band EQ, harmonic exciter, concert reverb, and −14 LUFS mastering." },
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
 {open && (
 <div className="pb-5 text-white/50 text-sm leading-relaxed pr-8">{a}</div>
 )}
 </div>
 );
}

export default function WizSoundProductPage() {
 useSEO({ title: "WizSound™ — Cinematic AI Audio Engine | WIZ AI", path: "/products/wizsound", description: "WizSound™ is WIZ AI's proprietary cinematic audio mastering engine. Broadcast-quality spatial audio applied automatically to every AI-generated track." });
 return (
 <div className="bg-[#040404] text-white min-h-screen overflow-x-hidden">

 {/* Nav */}
 <nav className="sticky top-0 z-50 border-b border-[--color-gold]/[0.06] bg-[#040404]/90 backdrop-blur-xl px-6 py-4">
 <div className="max-w-6xl mx-auto flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton fallback="/" label="Back" />
 <div className="flex items-center gap-3">
 <img src={WIZSOUND_LOGO} alt="WizSound™" className="h-8 w-auto object-contain" loading="lazy" />
 <span className="px-2.5 py-1 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[10px] font-bold tracking-[0.15em] uppercase text-[--color-gold-dark]">Cinematic Audio Engine</span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <NavLink href="/" className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[--color-silver-dark]/60 hover:text-[--color-silver] transition-colors">Home</NavLink>
 <NavLink
 href={WIZAUDIO_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-[--color-gold] text-white hover:bg-[--color-gold-light] transition-all shadow-[0_0_20px_rgba(196,164,100,0.25)]"
 >
 <Sparkles className="w-3.5 h-3.5" />Create Music Now
 </NavLink>
 </div>
 </div>
 </nav>

 {/* Hero */}
 <section className="relative min-h-[85vh] flex items-center overflow-hidden">
 {/* Full-bleed background */}
 <div className="absolute inset-0">
 <img
 src={IMG.heroConsole}
 alt="Professional recording studio"
 className="w-full h-full object-cover object-center"
 loading="eager"
 />
 {/* Multi-layer dark overlay */}
 <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(4,4,4,0.82) 0%, rgba(4,4,4,0.55) 50%, rgba(4,4,4,0.2) 100%)" }} />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,4,4,0.8) 0%, transparent 40%)" }} />
 {/* Emerald/teal glow */}
 <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 30% 50%, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />
 </div>

 <div className="relative max-w-6xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-16 items-center">
 {/* Left: copy */}
 <div>
 {/* Logo */}
 <div className="mb-8">
 <div className="relative inline-block">
 <div className="absolute inset-0 blur-3xl opacity-30" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)", transform: "scale(2.5)" }} />
 <img
 src={WIZSOUND_LOGO}
 alt="WizSound™"
 className="relative h-24 md:h-32 w-auto object-contain"
 style={{ filter: "drop-shadow(0 0 32px rgba(16,185,129,0.3)) drop-shadow(0 0 8px rgba(16,185,129,0.15))" }}
 loading="eager"
 />
 </div>
 </div>

 {/* Role pill */}
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-bold tracking-[0.22em] uppercase text-emerald-400 mb-6">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />The Composer · Cinematic Audio Engine
 </div>

 <h1 className="text-4xl md:text-[3.25rem] font-black tracking-tight leading-[1.08] mb-6 text-white">Hear the difference —<br />
 <span className="metallic-gold">studio audio from any track</span>
 </h1>
 <p className="text-white/50 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">WizSound™ transforms your audio into studio-grade cinematic sound — richer bass, clearer highs, and a fuller, more immersive presence that makes your video feel professional.
 </p>

 <div className="flex flex-col sm:flex-row items-start gap-4">
 <NavLink
 href={WIZAUDIO_STUDIO_PAGE}
 className="btn-primary btn-sheen inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-sm"
 >
 <Sparkles className="w-4 h-4" />Create Music Now <ArrowRight className="w-4 h-4" />
 </NavLink>
 <NavLink
 href="/pricing#plans"
 className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm text-white/50 border border-white/10 hover:border-white/20 hover:text-white/80 transition-all"
 >View pricing <ChevronRight className="w-4 h-4" />
 </NavLink>
 </div>
 <p className="text-[11px] text-white/30 mt-3 tracking-wide">Preview free &middot; Credits only on export</p>

 {/* Trust stats */}
 <div className="flex items-center gap-6 mt-10">
 {[
 { val: "13", label: "Processing stages" },
 { val: "×3.5", label: "Stereo width" },
 { val: "−14", label: "LUFS mastering" },
 ].map(s => (
 <div key={s.val} className="text-center">
 <div className="text-2xl font-black metallic-gold">{s.val}</div>
 <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Right: floating image panels */}
 <div className="hidden md:grid grid-cols-2 gap-3">
 <div className="rounded-2xl overflow-hidden border border-white/10 col-span-2 h-48">
 <img src={IMG.sphereConcert} alt="Immersive concert" className="w-full h-full object-cover" loading="lazy" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
 </div>
 <div className="rounded-2xl overflow-hidden border border-white/10 h-36">
 <img src={IMG.studioMicDark} alt="Studio microphone" className="w-full h-full object-cover" loading="lazy" />
 </div>
 <div className="rounded-2xl overflow-hidden border border-emerald-500/20 h-36 relative">
 <img src={IMG.concertHall} alt="Concert hall" className="w-full h-full object-cover" loading="lazy" />
 <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-transparent" />
 </div>
 </div>
 </div>
 </section>

 {/* Audio Demo Player */}
 <section className="py-20 px-6 bg-[#060608] relative overflow-hidden">
 <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 65%)" }} />
 <div className="max-w-4xl mx-auto relative">
 <div className="text-center mb-12">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[11px] font-bold tracking-[0.2em] uppercase text-emerald-400 mb-5">
 <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
 <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
 </svg>Live Audio Demo
 </div>
 <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Hear the difference for yourself
 </h2>
 <p className="text-white/40 text-base max-w-xl mx-auto">Same source track — three tiers of WizSound processing. Press play on any tier to hear the real difference.
 </p>
 </div>
 <WizSoundDemoPlayer />
 </div>
 </section>

 {/* What It Does */}
 <section className="py-20 px-6">
 <div className="max-w-5xl mx-auto">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-6">What It Does
 </div>
 <div className="grid md:grid-cols-2 gap-12 items-start">
 <div>
 <h2 className="text-3xl font-extrabold text-white mb-6 leading-tight">A 13-stage cinematic audio pipeline — built into every build
 </h2>
 <p className="text-white/50 text-base leading-relaxed mb-8">WizSound™ is WIZ AI's proprietary audio enhancement engine. It applies multi-band compression, harmonic enhancement, spatial widening, and cinematic EQ curves to your audio track — transforming it from a standard recording into a rich, immersive cinematic experience.
 </p>
 <ul className="space-y-3">
 {[
 "Multi-band dynamic compression and limiting",
 "Harmonic enhancement for warmth and presence",
 "Spatial widening for immersive stereo field",
 "Cinematic EQ curves (richer bass, clearer highs)",
 "Noise reduction and artefact removal",
 "Automatic loudness normalisation to broadcast standards",
 ].map(cap => (
 <li key={cap} className="flex items-start gap-3">
 <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
 <span className="text-white/60 text-sm">{cap}</span>
 </li>
 ))}
 </ul>
 </div>
 {/* Hero image panel */}
 <div className="relative rounded-2xl overflow-hidden border border-white/10 h-[360px]">
 <img src={IMG.heroConsole} alt="Professional studio console" className="w-full h-full object-cover" loading="lazy" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,4,4,0.5) 0%, transparent 50%)" }} />
 {/* Logo overlay */}
 <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
 <img src={WIZSOUND_LOGO} alt="WizSound™" className="h-7 w-auto object-contain" loading="lazy" />
 </div>
 {/* Stat overlay */}
 <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
 <div className="text-2xl font-black text-emerald-400">13</div>
 <div className="text-[10px] text-white/40 uppercase tracking-wider">stages</div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* How It Works */}
 <section className="py-20 px-6 bg-[#060608]">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-14">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">How It Works
 </div>
 <h2 className="text-3xl md:text-4xl font-extrabold text-white">From raw audio to cinematic sound — step by step
 </h2>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
 {HOW_IT_WORKS.map((step, i) => (
 <div key={step.num} className="relative rounded-2xl overflow-hidden border border-white/10 group hover:border-emerald-500/30 transition-all duration-300">
 {/* Background image */}
 <div className="h-40 overflow-hidden">
 <img
 src={step.img}
 alt={step.title}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 <div className="absolute inset-0 h-40" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.4) 100%)" }} />
 {/* Step number */}
 <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-emerald-500/90 flex items-center justify-center text-xs font-black text-white">
 {step.num}
 </div>
 </div>
 {/* Content */}
 <div className="p-5 bg-[#0a0a0c]">
 <h3 className="text-sm font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{step.title}</h3>
 <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
 </div>
 {/* Connector */}
 {i < HOW_IT_WORKS.length - 1 && (
 <div className="hidden lg:block absolute -right-3 top-20 z-10">
 <ChevronRight className="w-5 h-5 text-emerald-500/30" />
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Key Features */}
 <section className="py-20 px-6">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-14">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">Key Features
 </div>
 <h2 className="text-3xl md:text-4xl font-extrabold text-white">What makes WizSound™ different
 </h2>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {KEY_FEATURES.map(feat => (
 <div
 key={feat.title}
 className="group rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0a0a0c] hover:border-emerald-500/25 transition-all duration-300"
 >
 {/* Image header */}
 <div className="relative h-36 overflow-hidden">
 <img
 src={feat.img}
 alt={feat.title}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(10,10,12,0.5) 100%)" }} />
 {/* Stat badge */}
 <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-emerald-500/20">
 <div className="text-lg font-black text-emerald-400 leading-none">{feat.stat}</div>
 <div className="text-[9px] text-white/30 uppercase tracking-wider">{feat.statLabel}</div>
 </div>
 </div>
 {/* Content */}
 <div className="p-5">
 <h3 className="text-sm font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{feat.title}</h3>
 <p className="text-xs text-white/40 leading-relaxed">{feat.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Key Benefits */}
 <section className="py-20 px-6 bg-[#060608]">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-14">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">Key Benefits
 </div>
 <h2 className="text-3xl md:text-4xl font-extrabold text-white">Why WizSound™ changes everything
 </h2>
 </div>

 {/* Large hero benefit card */}
 <div className="relative rounded-3xl overflow-hidden border border-emerald-500/15 mb-5 h-64">
 <img src={IMG.concertHall} alt="Concert hall" className="w-full h-full object-cover" loading="lazy" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(4,4,4,0.75) 0%, rgba(4,4,4,0.4) 60%, rgba(4,4,4,0.1) 100%)" }} />
 <div className="absolute inset-0 flex items-center px-10">
 <div className="max-w-lg">
 <h3 className="text-xl font-bold text-white mb-3">Studio quality without a studio</h3>
 <p className="text-white/50 text-sm leading-relaxed">WizSound delivers professional audio enhancement that would normally require a mastering engineer and significant investment in equipment — automatically, for every build.</p>
 </div>
 </div>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {BENEFITS.slice(1).map(b => (
 <div key={b.title} className="p-6 rounded-2xl border border-white/[0.06] bg-[#0a0a0c] hover:border-emerald-500/20 transition-colors">
 <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
 <Check className="w-3 h-3 text-emerald-400" />
 </div>
 <h3 className="text-sm font-bold text-white mb-2">{b.title}</h3>
 <p className="text-xs text-white/40 leading-relaxed">{b.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Second Demo Player (compact) */}
 <section className="py-20 px-6">
 <div className="max-w-4xl mx-auto">
 <div className="text-center mb-10">
 <h2 className="text-2xl font-extrabold text-white mb-3">Try it again — compare the tiers
 </h2>
 <p className="text-white/40 text-sm">Use the player below to switch between tiers and hear the processing difference in real time.</p>
 </div>
 <WizSoundDemoPlayer compact />
 </div>
 </section>

 {/* FAQ */}
 <section className="py-20 px-6 bg-[#060608]">
 <div className="max-w-3xl mx-auto">
 <div className="text-center mb-12">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">FAQ
 </div>
 <h2 className="text-3xl font-extrabold text-white">Common questions</h2>
 </div>
 <div>
 {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
 </div>
 </div>
 </section>

 {/* Related Modules */}
 <section className="py-20 px-6">
 <div className="max-w-5xl mx-auto">
 <div className="text-center mb-10">
 <h2 className="text-2xl font-extrabold text-white mb-2">Part of the WIZ AI Engine</h2>
 <p className="text-white/72 text-sm">Each module works in sequence — explore the full pipeline</p>
 </div>
 <div className="flex flex-wrap justify-center gap-3">
 {RELATED.map(r => (
 <NavLink
 key={r.name}
 href={r.href}
 className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.02] text-sm text-white/50 hover:text-white/80 hover:border-white/15 transition-all"
 >
 {r.name} <ChevronRight className="w-3.5 h-3.5" />
 </NavLink>
 ))}
 </div>
 </div>
 </section>

 {/* Final CTA */}
 <section className="relative py-28 px-6 text-center overflow-hidden">
 <div className="absolute inset-0">
 <img src={IMG.studioMoody} alt="Studio" className="w-full h-full object-cover" loading="lazy" />
 <div className="absolute inset-0" style={{ background: "rgba(4,4,4,0.65)" }} />
 <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 65%)" }} />
 </div>
 <div className="max-w-2xl mx-auto relative">
 <img src={WIZSOUND_LOGO} alt="WizSound™" className="h-16 w-auto object-contain mx-auto mb-8" style={{ filter: "drop-shadow(0 0 24px rgba(16,185,129,0.3))" }} loading="lazy" />
 <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-400 mb-5">Start Now</p>
 <h2 className="text-3xl md:text-[2.75rem] font-black tracking-tight text-white mb-4 leading-tight">Ready to use WizSound™?
 </h2>
 <p className="text-white/40 mb-10 text-lg">Start creating cinematic AI content today — studio-grade audio included.</p>
 <NavLink
 href={WIZAUDIO_STUDIO_PAGE}
 className="btn-primary btn-sheen inline-flex items-center gap-2 px-12 py-4 rounded-2xl font-bold text-sm"
 >
 <Sparkles className="w-4 h-4" />Create Music Now <ArrowRight className="w-4 h-4" />
 </NavLink>
 <div className="flex items-center justify-center gap-5 mt-5 text-[11px] text-white/30 tracking-wide">
 <span>&#10003; Preview free</span>
 <span className="text-white/15">·</span>
 <span>&#10003; Broadcast-quality output</span>
 <span className="text-white/15">·</span>
 <span>&#10003; Credits only on export</span>
 </div>
 </div>
 </section>

 {/* Footer */}
 <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-12 px-6">
 <div className="max-w-7xl mx-auto">
 <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
 <NavLink href="/">
 <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.6rem] w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" loading="lazy" />
 </NavLink>
 <div className="flex items-center gap-5 text-xs text-white/25">
 <Link href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</Link>
 <Link href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</Link>
 <Link href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</Link>
 <Link href="/help" className="hover:text-[--color-gold-dark] transition-colors">Help</Link>
 </div>
 </div>
 <div className="luxury-divider" />
 <p className="text-center text-xs text-white/20 pt-6">&copy; 2026 WIZ AI. All rights reserved.</p>
 </div>
 </footer>
 </div>
 );
}
