/**
 * WizImageProductPage — dedicated studio-style product page for WizImage™
 *
 * Visual theme: Visual art / image creation studio
 * Accent: Indigo/electric blue #6366f1
 * Background: Deep navy #04040e with canvas texture
 * Hero: Left copy + right 3×2 art-style gallery grid
 * Signature section: Style Selector Panel — 6 art styles with sample images
 */
import React, { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
 ArrowRight, ChevronRight, ChevronDown, Sparkles, Check, Eye, Layers, Zap,
} from "@/lib/icons";
import {
 WIZIMAGE_STUDIO_PAGE,
 WIZVIDEO_PRODUCT_PAGE,
 WIZSCRIPT_PRODUCT_PAGE,
 WIZSHORTS_PRODUCT_PAGE,
 WIZANIMATE_PRODUCT_PAGE,
} from "@/lib/routes";

const CDN = "/manus-storage";
const LOGO = `${CDN}/wizimage-logo-v1_83c86e5c.png`;
const WIZAI_LOGO = `/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png`;

const IMGS = {
 hero: `${CDN}/showcase-wiz-image_b2c3d4e5.jpg`,
 style1: `${CDN}/card-video-render_d81a3b98.jpg`,
 style2: `${CDN}/card-animation_e13ffa11.jpg`,
 style3: `${CDN}/card-storyboard_38d61672.jpg`,
 style4: `${CDN}/card-ai-brain_b513d38b.jpg`,
 style5: `${CDN}/card-music-notes_96ce5dac.jpg`,
 style6: `${CDN}/card-sync_b129b54a.jpg`,
};

const ACCENT = "#6366f1";
const ACCENT_DIM = "rgba(99,102,241,0.12)";
const ACCENT_GLOW = "rgba(99,102,241,0.35)";

const ART_STYLES = [
 { name: "Cinematic", desc: "Film-quality photorealistic imagery with dramatic lighting and depth", img: IMGS.style1, tag: "Most popular" },
 { name: "Anime", desc: "Japanese animation aesthetic with bold lines and vivid colour palettes", img: IMGS.style2, tag: null },
 { name: "Oil Painting", desc: "Rich textured brushwork with classical composition and tonal depth", img: IMGS.style3, tag: null },
 { name: "Watercolour", desc: "Soft, translucent washes with organic edges and delicate colour blends", img: IMGS.style4, tag: null },
 { name: "3D Render", desc: "Studio-quality 3D renders with precise lighting and material detail", img: IMGS.style5, tag: null },
 { name: "Photorealistic", desc: "Indistinguishable from photography — perfect for product and portrait", img: IMGS.style6, tag: "New" },
];

const HOW_IT_WORKS = [
 { num: "01", title: "Describe your image", desc: "Type a prompt describing what you want — subject, style, mood, lighting, composition. WizImage™ handles the rest." },
 { num: "02", title: "Style selected", desc: "Choose from 6 art styles or let WizImage™ select the best style for your prompt automatically." },
 { num: "03", title: "Image generated", desc: "Your image is generated at up to 4K resolution — ready for download, use in WizVideo™, or further editing." },
 { num: "04", title: "Iterate and refine", desc: "Regenerate variations, adjust the style, change the composition, or use the image as a starting point for video." },
];

const KEY_FEATURES = [
 { title: "6 Distinct Art Styles", desc: "Cinematic, Anime, Oil Painting, Watercolour, 3D Render, and Photorealistic — each with its own visual language.", img: IMGS.style1 },
 { title: "Up to 4K Resolution", desc: "Generate images at up to 4096×4096 — suitable for print, broadcast, and large-format display.", img: IMGS.style2 },
 { title: "WizVideo™ Integration", desc: "Use any generated image as a scene background, character reference, or visual style guide in WizVideo™.", img: IMGS.style3 },
 { title: "Aspect Ratio Control", desc: "Generate in any aspect ratio — square, portrait, landscape, ultrawide, or custom dimensions.", img: IMGS.style4 },
 { title: "Style Consistency", desc: "Generate multiple images in the same style with consistent visual language — ideal for series and campaigns.", img: IMGS.style5 },
 { title: "Commercial Licensing", desc: "All generated images are fully licensed for commercial use — product shots, marketing materials, and editorial.", img: IMGS.style6 },
];

const BENEFITS = [
 { title: "Professional quality without a photographer", desc: "WizImage™ generates studio-quality images at a fraction of the cost of a professional photoshoot or illustration commission." },
 { title: "6 art styles, one tool", desc: "Switch between Cinematic, Anime, Oil Painting, Watercolour, 3D Render, and Photorealistic without changing tools or workflows." },
 { title: "Built for video production", desc: "Generated images feed directly into WizVideo™ as scene backgrounds, character references, and visual style guides." },
 { title: "Instant iteration", desc: "Generate 10 variations in the time it takes to brief a designer — find the right image in minutes, not days." },
 { title: "No prompt engineering required", desc: "WizImage™ understands natural language descriptions — no need to learn complex prompt syntax or negative prompts." },
 { title: "Commercial use included", desc: "All generated images are fully licensed for commercial use on all plans — no additional licensing fees." },
];

const FAQS = [
 { q: "What if I do not like the image?", a: "You can generate up to 4 variations of the same prompt simultaneously and choose the best result. If none work, you can refine your prompt and regenerate — no credits are charged until you export." },
 { q: "What do credits cover for WizImage™?", a: "Credits are only charged on final image export. Generating previews, comparing variations, and adjusting your prompt are all free — you only pay when you are satisfied with the result." },
 { q: "Can I use the images commercially?", a: "Yes — all generated images are fully licensed for commercial use on all plans, including product shots, marketing materials, editorial, and broadcast. No additional licensing fee is required." },
 { q: "Can I generate multiple variations to compare?", a: "Yes — WizImage™ can generate up to 4 variations of the same prompt simultaneously, allowing you to compare styles, compositions, and colour treatments before choosing." },
 { q: "How does WizImage™ connect to WizVideo™?", a: "Generated images can be used directly in WizVideo™ as scene backgrounds, character references, or visual style guides — no file export or re-upload needed." },
 { q: "What resolution and aspect ratios are supported?", a: "WizImage™ generates up to 4096×4096 (4K) resolution and supports any aspect ratio including square (1:1), portrait (9:16), landscape (16:9), ultrawide (21:9), and custom dimensions." },
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

function StyleSelectorPanel() {
 const [selected, setSelected] = useState(0);
 return (
 <div
 className="rounded-2xl overflow-hidden"
 style={{ background: "#08081a", border: `1px solid ${ACCENT}20` }}
 >
 {/* Style grid */}
 <div className="grid grid-cols-3 md:grid-cols-6 border-b border-white/[0.06]">
 {ART_STYLES.map((style, i) => (
 <button
 key={style.name}
 onClick={() => setSelected(i)}
 className="relative p-3 text-center transition-all"
 style={{
 background: selected === i ? `${ACCENT}12` : "transparent",
 borderBottom: selected === i ? `2px solid ${ACCENT}` : "2px solid transparent",
 }}
 >
 {style.tag && (
 <div
 className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
 style={{ background: ACCENT, color: "#fff" }}
 >
 {style.tag}
 </div>
 )}
 <div className="text-[10px] font-bold" style={{ color: selected === i ? ACCENT : "rgba(255,255,255,0.78)" }}>
 {style.name}
 </div>
 </button>
 ))}
 </div>
 {/* Selected style preview */}
 <div className="p-6 grid md:grid-cols-2 gap-6 items-center">
 <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ACCENT}25`, boxShadow: `0 0 30px ${ACCENT}15` }}>
 <img
 src={ART_STYLES[selected].img}
 alt={ART_STYLES[selected].name}
 className="w-full h-48 object-cover"
 loading="lazy"
 />
 </div>
 <div>
 <div
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold mb-3"
 style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
 >
 {ART_STYLES[selected].name} Style
 </div>
 <p className="text-white/60 text-sm leading-relaxed mb-4">{ART_STYLES[selected].desc}</p>
 <div className="flex items-center gap-2">
 <div
 className="px-4 py-2 rounded-lg text-xs font-bold text-white"
 style={{ background: ACCENT }}
 >Generate in {ART_STYLES[selected].name} →
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

export default function WizImageProductPage() {
 useSEO({
 title: "WizImage™ — AI Image Generation Studio | WIZ AI",
 path: "/products/wizimage",
 description: "WizImage™ generates professional images in 6 art styles — Cinematic, Anime, Oil Painting, Watercolour, 3D Render, and Photorealistic — at up to 4K resolution.",
 });

 return (
 <div
 className="text-white min-h-screen overflow-x-hidden"
 style={{ background: "#04040e" }}
 >
 {/* Canvas texture overlay */}
 <div
 className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
 style={{
 backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
 backgroundRepeat: "repeat",
 backgroundSize: "200px 200px",
 }}
 />

 {/* Nav */}
 <nav
 className="sticky top-0 z-50 border-b px-6 py-4"
 style={{ background: "rgba(4,4,14,0.92)", backdropFilter: "blur(20px)", borderColor: `${ACCENT}18` }}
 >
 <div className="max-w-7xl mx-auto flex items-center justify-between">
 <div className="flex items-center gap-4">
 <BackButton fallback="/" label="Back" />
 <div className="flex items-center gap-3">
 <img src={LOGO} alt="WizImage™" className="h-8 w-auto object-contain" loading="lazy" />
 <span
 className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
 style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
 >AI Image Studio
 </span>
 </div>
 </div>
 <NavLink
 href={WIZIMAGE_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg"
 style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
 >
 <Sparkles className="w-3.5 h-3.5" />Create Image
 </NavLink>
 </div>
 </nav>

 {/* Hero — Copy left + Gallery grid right */}
 <section className="relative min-h-[90vh] flex items-center overflow-hidden">
 <div className="absolute inset-0">
 <img src={IMGS.hero} alt="" className="w-full h-full object-cover object-center opacity-15" loading="eager" />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(4,4,14,0.98) 0%, rgba(4,4,14,0.85) 50%, rgba(4,4,14,0.65) 100%)" }} />
 <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 70% at 0% 50%, ${ACCENT_DIM} 0%, transparent 55%)` }} />
 </div>

 <div className="relative max-w-7xl mx-auto px-6 py-28 grid lg:grid-cols-2 gap-16 items-center w-full">
 {/* Left: Headline and CTAs */}
 <div>
 <img src={LOGO} alt="WizImage™" className="h-12 w-auto object-contain mb-6" loading="eager" />
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT }}
 >
 <Eye className="w-3 h-3" />The Image Creation Studio
 </div>
 <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-6 text-white">Any image.<br />
 <span style={{ color: ACCENT }}>Any style.</span><br />Instantly.
 </h1>
 <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-lg">WizImage™ generates professional images in 6 art styles — from cinematic photorealism to anime, oil painting, and 3D render — at up to 4K resolution.
 </p>
 <div className="flex flex-wrap gap-3 mb-10">
 <NavLink
 href={WIZIMAGE_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all"
 style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT_GLOW}` }}
 >
 <Sparkles className="w-4 h-4" />Create Your Image
 <ArrowRight className="w-4 h-4" />
 </NavLink>
 <NavLink
 href="/pricing#plans"
 className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-all"
 style={{ border: "1px solid rgba(255,255,255,0.12)" }}
 >View pricing <ChevronRight className="w-4 h-4" />
 </NavLink>
 </div>
 <p className="text-[11px] text-white/70 mt-3 tracking-wide">2 free credits on sign-up &middot; No card required</p>
 <div className="flex items-center gap-8">
 {[
 { val: "6", label: "Art styles" },
 { val: "4K", label: "Max resolution" },
 { val: "100%", label: "Commercial use" },
 ].map(s => (
 <div key={s.val} className="text-center">
 <div className="text-2xl font-black" style={{ color: ACCENT }}>{s.val}</div>
 <div className="text-[10px] text-white/72 uppercase tracking-wider mt-0.5">{s.label}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Right: 3×2 gallery grid */}
 <div className="hidden lg:grid grid-cols-3 gap-3">
 {ART_STYLES.map((style, i) => (
 <div
 key={style.name}
 className="rounded-xl overflow-hidden group relative"
 style={{ border: `1px solid ${ACCENT}20` }}
 >
 <img
 src={style.img}
 alt={style.name}
 className="w-full h-28 object-cover transition-transform duration-500 group-hover:scale-105"
 loading="lazy"
 />
 <div
 className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
 style={{ background: "linear-gradient(to top, rgba(4,4,14,0.95), transparent)" }}
 >
 <div className="text-[9px] font-bold text-white/70">{style.name}</div>
 </div>
 {style.tag && (
 <div
 className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
 style={{ background: ACCENT, color: "#fff" }}
 >
 {style.tag}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Signature Section: Style Selector Panel */}
 <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#060614" }}>
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
 <Eye className="w-3 h-3" />Style Selector
 </div>
 <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
 6 art styles. One prompt.
 </h2>
 <p className="text-white/40 text-base max-w-xl mx-auto">The same prompt generates completely different results in each style — choose the visual language that fits your project.
 </p>
 </div>
 <StyleSelectorPanel />
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
 <h2 className="text-3xl font-extrabold text-white mb-12">From prompt to professional image</h2>
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
 <section className="py-20 px-6" style={{ background: "#060614" }}>
 <div className="max-w-6xl mx-auto">
 <div
 className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
 style={{ border: `1px solid ${ACCENT}25`, background: `${ACCENT}08`, color: ACCENT }}
 >Key Features
 </div>
 <h2 className="text-3xl font-extrabold text-white mb-12">Built for creators, not prompt engineers</h2>
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
 >Why WizImage™
 </div>
 <h2 className="text-3xl font-extrabold text-white mb-12">The image studio that feeds your entire workflow</h2>
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
 style={{ background: `linear-gradient(135deg, ${ACCENT}10 0%, rgba(4,4,14,0) 60%)` }}
 >
 <div className="max-w-4xl mx-auto text-center relative">
 <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to create your image?
 </h2>
 <p className="text-white/45 text-base mb-8 max-w-xl mx-auto">One prompt. Six art styles. Professional quality at up to 4K — ready in seconds.
 </p>
 <NavLink
 href={WIZIMAGE_STUDIO_PAGE}
 className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all"
 style={{ background: ACCENT, boxShadow: `0 0 40px ${ACCENT_GLOW}` }}
 >
 <Sparkles className="w-4 h-4" />Open WizImage™ Studio
 <ArrowRight className="w-4 h-4" />
 </NavLink>
 <div className="flex items-center justify-center gap-5 mt-5 text-[11px] text-white/70 tracking-wide">
 <span>&#10003; 6 art styles</span>
 <span className="text-white/40">·</span>
 <span>&#10003; Commercial use included</span>
 <span className="text-white/40">·</span>
 <span>&#10003; No card to start</span>
 </div>
 </div>
 </section>

 {/* FAQ */}
 <section className="py-20 px-6" style={{ background: "#060614" }}>
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
 <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/70 mb-6">Part of the WIZ AI Engine</div>
 <div className="flex flex-wrap gap-3">
 {[
 { name: "WizVideo™", href: WIZVIDEO_PRODUCT_PAGE },
 { name: "WizScript™", href: WIZSCRIPT_PRODUCT_PAGE },
 { name: "WizShorts™", href: WIZSHORTS_PRODUCT_PAGE },
 { name: "WizAnimate™",href: WIZANIMATE_PRODUCT_PAGE },
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
 <img src={WIZAI_LOGO} alt="WIZ AI" className="h-6 w-auto opacity-40" loading="lazy" />
 <div className="text-[11px] text-white/20">© 2025 WIZ AI. All rights reserved.</div>
 </div>
 </footer>
 </div>
 );
}
