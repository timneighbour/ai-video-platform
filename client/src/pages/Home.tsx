import { useState, useEffect, useRef, useCallback } from "react";
import { useSEO } from "@/hooks/useSEO";
import { triggerIntroReplay } from "@/lib/introReplay";
import WizProductGrid from "@/components/WizProductGrid";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
  WizScoreEmblem,
} from "@/components/WizProductEmblems";
import { NavLink } from "@/components/NavLink";
import { mp } from "@/lib/mixpanel";
import {
  WIZANIMATE_SEO_PAGE,
  WIZVIDEO_STUDIO_PAGE,
  WIZAUDIO_STUDIO_PAGE,
  WIZPILOT_STUDIO_PAGE,
  WIZSCRIPT_STUDIO_PAGE,
} from "@/lib/routes";
import { PRIMARY_PRODUCTS } from "@/lib/products";
import { useProjectResume } from "@/hooks/useProjectResume";
import { useExperiment } from "@/hooks/useExperiment";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import HeroCinematicBg from "@/components/HeroCinematicBg";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
// Lucide icons removed — replaced with inline SVGs and product logos
const ArrowSVG = ({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);
const PlaySVG = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M6.5 4.5l9 5.5-9 5.5V4.5z" /></svg>
);
const PauseSVG = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
);
const WaveformSVG = ({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) => (
  <svg className={className} viewBox="0 0 20 14" fill="none"><path d="M1 7h2M4 4v6M7 2v10M10 5v4M13 3v8M16 4v6M19 7h-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>
);
const CheckSVG = ({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 8.5l3.5 3.5 7-7" /></svg>
);
const ShieldSVG = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5L2 4v4c0 3.3 2.5 5.5 6 6 3.5-.5 6-2.7 6-6V4L8 1.5z" /></svg>
);
const StarSVG = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7L8 1z" /></svg>
);
const GlobeSVG = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.5" /><path d="M8 1.5C6.5 4 6 6 6 8s.5 4 2 6.5M8 1.5C9.5 4 10 6 10 8s-.5 4-2 6.5M1.5 8h13" /></svg>
);
const ChevronDownSVG = ({ className = "w-4 h-4", open = false, style }: { className?: string; open?: boolean; style?: React.CSSProperties }) => (
  <svg className={`${className} transition-transform duration-300 ${open ? "rotate-180" : ""}`} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l5 5 5-5" /></svg>
);

// ── Assets ───────────────────────────────────────────────────────────────────
const CDN = "/manus-storage";
const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ff33f09f.webp";
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-new_c5cced65.png`;
const WIZLUMINA_LOGO = `${CDN}/wizlumina-logo-new_0709f3c5.png`;
const WIZGENESIS_LOGO = `${CDN}/wizgenesis-logo-new_9814b3d1.png`;
const WIZBOOST_LOGO = `${CDN}/wizboost-logo-new_93f2b48b.png`;
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-new_85a25756.png`;
const WIZANIMATE_LOGO = `${CDN}/wizanimate-logo-new_a84f9808.png`;
const WIZSYNC_LOGO = `${CDN}/wizsync-logo-new_9563f007.png`;
const HERO_BG_VIDEO = `${CDN}/hero-bg-v2_737633d7.mp4`;
const HERO_BG_POSTER = `${CDN}/concert-hall_2b6b946b.jpg`;
const DEMO_POSTER = `${CDN}/trailer-v2-poster_4a74cc1c.jpg`;

const WHO_IMAGES = [
  `${CDN}/whos-it-for-musicians_45f54b69.png`,
  `${CDN}/whos-it-for-youtubers_58ce347b.png`,
  `${CDN}/whos-it-for-ai-creators_722cf5c6.png`,
  `${CDN}/whos-it-for-kids_09e9420f.png`,
];

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const observed = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add("visible"); }),
      { threshold: 0.12 }
    );

    function observeAll() {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    }

    observeAll();

    // Watch for dynamically added .reveal elements (e.g. after async data loads)
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

// ── Products — categorised by purpose ────────────────────────────────────────
// Emblem map: maps product id → React emblem component (size 32)
// This is the ONLY place emblems are mapped to product ids.
const EMBLEM_MAP: Record<string, React.ReactNode> = {
  wizsound:   <WizAudioEmblem size={32} />,
  wizimage:   <WizImageEmblem size={32} />,
  wizvideo:   <WizVideoEmblem size={32} />,
  wizanimate: <WizAnimateEmblem size={32} />,
  wizscore:   <WizScoreEmblem size={32} />,
  wizshorts:  <WizShortsEmblem size={32} />,
  wizscript:  <WizScriptEmblem size={32} />,
};

/**
 * Derived from PRIMARY_PRODUCTS in lib/products.ts — single source of truth.
 * To change order or add a studio, edit products.ts only.
 */
const PRODUCTS_CREATE = PRIMARY_PRODUCTS.map((p) => ({
  name:        p.name,
  tagline:     p.tagline,
  icon:        EMBLEM_MAP[p.id] ?? null,
  href:        p.productPage,
  glowColor:   p.glowColor,
  bgGradient:  p.bgGradient,
  borderColor: p.borderColor,
}));

const PRODUCTS_ENHANCE = [
  { name: "WizSound", tagline: "Premium Audio Engine", href: "/products/wizsound", logo: WIZSOUND_LOGO, glowColor: "oklch(0.72 0.18 160)" },
  { name: "WizLumina", tagline: "Visual Enhancement Engine", href: "/products/wizlumina", logo: WIZLUMINA_LOGO, glowColor: "oklch(0.78 0.11 75)" },
];

const PRODUCTS_GROW = [
  { name: "WizBoost", tagline: "Output Optimisation Engine", href: "/products/wizboost", logo: WIZBOOST_LOGO, glowColor: "oklch(0.70 0.18 260)" },
];

// ── Technology — WIZ engine stack ────────────────────────────────────────────
const WIZ_TECHNOLOGY_CORE = [
  { name: "WizGenesis", tagline: "Creative Intelligence", desc: "Creative planning, prompt expansion and storyboard intelligence.", href: "/technology/wizgenesis", logo: WIZGENESIS_LOGO },
  { name: "WizSound", tagline: "Audio Engine", desc: "Audio enhancement, clarity, depth and cinematic mastering.", href: "/technology/wizsound", logo: WIZSOUND_LOGO },
  { name: "WizLumina", tagline: "Visual Engine", desc: "Cinematic visual polish, colour, contrast and finishing.", href: "/technology/wizlumina", logo: WIZLUMINA_LOGO },
  { name: "WizBoost", tagline: "Optimisation Engine", desc: "Optimisation for quality, speed and platform-ready delivery.", href: "/technology/wizboost", logo: WIZBOOST_LOGO },
];
const WIZ_TECHNOLOGY_ADVANCED = [
  { name: "WizSync", tagline: "Sync & Alignment", desc: "Lip-sync, timing and performer alignment tools.", href: "/technology/wizsync", logo: WIZSYNC_LOGO },
  { name: "WizScore", tagline: "Quality Scoring", desc: "Quality checks and improvement scoring before final output.", href: "/technology/wizscore", logo: WIZSOUND_LOGO },
  // Note: WizScore is also a full product — see PRODUCTS_CREATE above
  { name: "WizPilot", tagline: "Guided Automation", desc: "Guided automation from idea to storyboard to final video build.", href: "/technology/wizpilot", logo: WIZGENESIS_LOGO },
];
const WIZ_TECHNOLOGY = [...WIZ_TECHNOLOGY_CORE, ...WIZ_TECHNOLOGY_ADVANCED];

// ── Dropdown wrapper with fade+slide animation ────────────────────────────────
// Uses a transparent "bridge" strip between the trigger and the panel so the
// mouse can travel from button → panel without the onMouseLeave firing.
function NavDropdown({ open, children, wide, align = "center" }: { open: boolean; children: React.ReactNode; wide?: boolean; align?: "center" | "left" | "right" }) {
  const translateX = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";
  const leftPos = align === "left" ? "0" : align === "right" ? "100%" : "50%";
  return (
    <div
      className={`absolute z-50 transition-all duration-200 origin-top ${
        open ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-y-95 -translate-y-1 pointer-events-none"
      }`}
      style={{ top: "calc(100% - 4px)", left: leftPos, transform: `translateX(${translateX})`, width: wide ? 720 : 620, visibility: open ? "visible" : "hidden" }}
    >
      {/* Invisible bridge — fills the gap between button and panel so mouse travel doesn't close the dropdown */}
      <div className="h-4 w-full" />
      {/* Arrow tip */}
      <div className="flex justify-center mb-[-1px]">
        <div className="w-3 h-3 rotate-45 border-l border-t border-[--color-gold]/[0.18] bg-[#070707]" style={{ marginBottom: -7 }} />
      </div>
      {children}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileTechOpen, setMobileTechOpen] = useState(false);
  const [mobileWorkflowOpen, setMobileWorkflowOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const toggleProducts = (e: React.MouseEvent) => { e.stopPropagation(); setProductsOpen((v) => { if (!v) { setTechOpen(false); setWorkflowOpen(false); } return !v; }); };
  const toggleTech = (e: React.MouseEvent) => { e.stopPropagation(); setTechOpen((v) => { if (!v) { setProductsOpen(false); setWorkflowOpen(false); } return !v; }); };
  const toggleWorkflow = (e: React.MouseEvent) => { e.stopPropagation(); setWorkflowOpen((v) => { if (!v) { setProductsOpen(false); setTechOpen(false); } return !v; }); };

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navRef = useRef<HTMLElement>(null);
  // Close dropdowns on Escape or outside click (ref-based so clicks inside nav don't close it)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setProductsOpen(false); setTechOpen(false); setWorkflowOpen(false); setMobileOpen(false); }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setProductsOpen(false); setTechOpen(false); setWorkflowOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClickOutside);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("click", onClickOutside); };
  }, []);
  return (
    <>
      <nav
        ref={navRef}
        role="navigation"
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#060606]/96 backdrop-blur-2xl border-b border-[--color-gold]/[0.08] shadow-[0_2px_60px_rgba(0,0,0,0.7)]"
            : "bg-gradient-to-b from-black/40 to-transparent backdrop-blur-[2px]"
        }`}
      >
        {/* Subtle top gold line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, oklch(0.78 0.11 75 / 0.35) 30%, oklch(0.78 0.11 75 / 0.55) 50%, oklch(0.78 0.11 75 / 0.35) 70%, transparent 100%)" }} />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[72px] flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <a href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-gold]/40 rounded-lg" aria-label="WIZ AI Home">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[4.2rem] w-auto object-contain drop-shadow-[0_0_14px_rgba(196,164,100,0.18)]" loading="eager" decoding="async" />
          </a>

          {/* ── Desktop nav links ── */}
          <div className="hidden md:flex items-center gap-0">

            <a href="/" className="nav-link">Home</a>

            {/* PRODUCTS dropdown — categorised: Create / Enhance / Grow */}
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={`nav-link flex items-center gap-1 transition-colors ${
                  productsOpen ? "text-[--color-gold-light]" : ""
                }`}
                aria-haspopup="true"
                aria-expanded={productsOpen}
                onClick={toggleProducts}
              >
                Wiz Studios
                <ChevronDownSVG className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  productsOpen ? "rotate-180 text-[--color-gold]" : ""
                }`} />
              </button>

              <NavDropdown open={productsOpen} wide>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #0d0d0d 0%, #080808 100%)",
                    border: "1px solid oklch(0.78 0.11 75 / 0.14)",
                    boxShadow: "0 40px 120px rgba(0,0,0,0.95), 0 0 0 1px rgba(196,164,100,0.06) inset, 0 1px 0 rgba(196,164,100,0.18) inset",
                  }}
                >
                  {/* Header */}
                  <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.78 0.11 75 / 0.08)", background: "oklch(0.78 0.11 75 / 0.025)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
                      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/60">WIZ AI — Product Suite</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: "oklch(0.78 0.11 75 / 0.08)", color: "oklch(0.78 0.11 75 / 0.5)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>9 Products</span>
                  </div>

                  <div className="p-4 flex gap-4">
                    {/* Create column */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mb-2 px-1">Create</p>
                      <div className="flex flex-col gap-0.5">
                        {PRODUCTS_CREATE.map((p) => (
                          <NavLink
                            key={p.name}
                            href={p.href}
                            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--color-gold]/40"
                            style={{ border: "1px solid transparent" }}
                            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.11 75 / 0.13)"; }}
                            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden" style={{ background: p.bgGradient, border: `1px solid ${p.borderColor}` }}>
                              <span className="opacity-85 group-hover:opacity-100 transition-opacity">{p.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-bold text-white/85 group-hover:text-[--color-gold-light] transition-colors leading-tight">{p.name}<sup className="text-[7px] font-bold ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                              <p className="text-[10px] text-[--color-gold-dark]/45 leading-tight group-hover:text-[--color-gold-dark]/70 transition-colors truncate">{p.tagline}</p>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px self-stretch" style={{ background: "oklch(0.78 0.11 75 / 0.08)" }} />

                    {/* Enhance + Grow column */}
                    <div style={{ width: 200 }} className="flex-shrink-0">
                      <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mb-2 px-1">Enhance</p>
                      <div className="flex flex-col gap-0.5 mb-4">
                        {PRODUCTS_ENHANCE.map((p) => (
                          <NavLink
                            key={p.name}
                            href={p.href}
                            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--color-gold]/40"
                            style={{ border: "1px solid transparent" }}
                            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.11 75 / 0.13)"; }}
                            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.06)", border: "1px solid oklch(0.78 0.11 75 / 0.14)" }}>
                              <img src={p.logo} alt={p.name} className="w-5 h-5 object-contain" loading="lazy" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-bold text-white/85 group-hover:text-[--color-gold-light] transition-colors leading-tight">{p.name}<sup className="text-[7px] font-bold ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                              <p className="text-[10px] text-[--color-gold-dark]/45 leading-tight group-hover:text-[--color-gold-dark]/70 transition-colors truncate">{p.tagline}</p>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                      <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mb-2 px-1">Grow</p>
                      <div className="flex flex-col gap-0.5">
                        {PRODUCTS_GROW.map((p) => (
                          <NavLink
                            key={p.name}
                            href={p.href}
                            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--color-gold]/40"
                            style={{ border: "1px solid transparent" }}
                            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.11 75 / 0.13)"; }}
                            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.06)", border: "1px solid oklch(0.78 0.11 75 / 0.14)" }}>
                              <img src={p.logo} alt={p.name} className="w-5 h-5 object-contain" loading="lazy" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-bold text-white/85 group-hover:text-[--color-gold-light] transition-colors leading-tight">{p.name}<sup className="text-[7px] font-bold ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                              <p className="text-[10px] text-[--color-gold-dark]/45 leading-tight group-hover:text-[--color-gold-dark]/70 transition-colors truncate">{p.tagline}</p>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.07)", background: "oklch(0.78 0.11 75 / 0.015)" }}>
                    <p className="text-[10px] text-white/20 font-medium">Free storyboard on every project</p>
                    <a href="/onboarding" className="flex items-center gap-1.5 text-[11px] font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors">
                      Start Creating <ArrowSVG className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </NavDropdown>
            </div>

            {/* TECHNOLOGY dropdown */}
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={`nav-link flex items-center gap-1 transition-colors ${
                  techOpen ? "text-[--color-gold-light]" : ""
                }`}
                aria-haspopup="true"
                aria-expanded={techOpen}
                onClick={toggleTech}
              >
                Technology
                <ChevronDownSVG className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  techOpen ? "rotate-180 text-[--color-gold]" : ""
                }`} />
              </button>

              <NavDropdown open={techOpen} wide>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #0d0d0d 0%, #080808 100%)",
                    border: "1px solid oklch(0.78 0.11 75 / 0.13)",
                    boxShadow: "0 40px 120px rgba(0,0,0,0.95), 0 0 0 1px rgba(196,164,100,0.05) inset, 0 1px 0 rgba(196,164,100,0.16) inset",
                  }}
                >
                  {/* Header */}
                  <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.78 0.11 75 / 0.07)", background: "oklch(0.78 0.11 75 / 0.02)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
                      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/60">WIZ Engine Stack</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: "oklch(0.78 0.11 75 / 0.08)", color: "oklch(0.78 0.11 75 / 0.5)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>7 Engines</span>
                  </div>

                  {/* Core engines */}
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[--color-gold-dark]/40 mb-1">Core Engines</p>
                  </div>
                  <div className="px-3 pb-2 grid grid-cols-2 gap-1">
                    {WIZ_TECHNOLOGY_CORE.map((eng) => (
                      <NavLink
                        key={eng.name}
                        href={eng.href}
                        className="group flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--color-gold]/40"
                        style={{ border: "1px solid transparent" }}
                        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.04)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.11 75 / 0.12)"; }}
                        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.05)", border: "1px solid oklch(0.78 0.11 75 / 0.10)" }}>
                          <img src={eng.logo} alt={eng.name} className="w-7 h-7 object-contain" loading="lazy" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-white/80 group-hover:text-[--color-gold-light] transition-colors leading-tight">{eng.name}<sup className="text-[8px] font-bold ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                          <p className="text-[10px] text-white/25 mt-1 leading-snug group-hover:text-white/40 transition-colors">{eng.desc}</p>
                        </div>
                      </NavLink>
                    ))}
                  </div>

                  {/* Advanced tools divider */}
                  <div className="px-4 pt-2 pb-1" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.06)" }}>
                    <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[--color-gold-dark]/40 mb-1">Advanced Tools</p>
                  </div>
                  <div className="px-3 pb-3 grid grid-cols-2 gap-1">
                    {WIZ_TECHNOLOGY_ADVANCED.map((eng) => (
                      <NavLink
                        key={eng.name}
                        href={eng.href}
                        className="group flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--color-gold]/40"
                        style={{ border: "1px solid transparent" }}
                        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.04)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.78 0.11 75 / 0.12)"; }}
                        onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.05)", border: "1px solid oklch(0.78 0.11 75 / 0.10)" }}>
                          <img src={eng.logo} alt={eng.name} className="w-7 h-7 object-contain" loading="lazy" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-white/80 group-hover:text-[--color-gold-light] transition-colors leading-tight">{eng.name}<sup className="text-[8px] font-bold ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                          <p className="text-[10px] text-white/25 mt-1 leading-snug group-hover:text-white/40 transition-colors">{eng.desc}</p>
                        </div>
                      </NavLink>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.06)", background: "oklch(0.78 0.11 75 / 0.015)" }}>
                    <p className="text-[10px] text-white/20">7 engines powering every creation</p>
                    <a href="/#wiz-engines" className="flex items-center gap-1.5 text-[11px] font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors">
                      See how they work <ArrowSVG className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </NavDropdown>
            </div>

            {/* WORKFLOW dropdown */}
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={`nav-link flex items-center gap-1 transition-colors ${
                  workflowOpen ? "text-[--color-gold-light]" : ""
                }`}
                aria-haspopup="true"
                aria-expanded={workflowOpen}
                onClick={toggleWorkflow}
              >
                Workflow
                <ChevronDownSVG className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  workflowOpen ? "rotate-180 text-[--color-gold]" : ""
                }`} />
              </button>
              <NavDropdown open={workflowOpen} wide align="right">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #0d0d0d 0%, #080808 100%)",
                    border: "1px solid oklch(0.78 0.11 75 / 0.13)",
                    boxShadow: "0 40px 120px rgba(0,0,0,0.95), 0 0 0 1px rgba(196,164,100,0.05) inset, 0 1px 0 rgba(196,164,100,0.16) inset",
                  }}
                >
                  {/* Header */}
                  <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.78 0.11 75 / 0.07)", background: "oklch(0.78 0.11 75 / 0.02)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
                      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/60">Automation &amp; Supporting Tools</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: "oklch(0.78 0.11 75 / 0.08)", color: "oklch(0.78 0.11 75 / 0.5)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>4 Tools</span>
                  </div>
                  {/* 2-column grid with hero image panels */}
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {/* WizCreate */}
                    <a
                      href="/products/wizcreate"
                      className="group relative rounded-xl overflow-hidden flex flex-col justify-end"
                      style={{ height: 180, border: "1px solid oklch(0.78 0.11 75 / 0.10)", transition: "border-color 0.2s" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.30)")}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.10)")}
                    >
                      <img
                        src="/manus-storage/product-wizcreate-hero_6c3efa10.jpg"
                        alt="WizCreate"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.30) 55%, transparent 100%)" }} />
                      <div className="relative z-10 p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <img src={WIZCREATE_LOGO} alt="WizCreate" className="w-5 h-5 object-contain" loading="lazy" />
                          <p className="text-[12px] font-bold text-white/90 group-hover:text-[--color-gold-light] transition-colors">WizCreate<sup className="text-[7px] ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight">AI Storyboard Engine</p>
                        <p className="text-[9px] text-white/30 mt-1 leading-tight">Turn any idea into a full cinematic storyboard in seconds</p>
                      </div>
                    </a>
                    {/* WizPilot */}
                    <a
                      href="/products/wizpilot"
                      className="group relative rounded-xl overflow-hidden flex flex-col justify-end"
                      style={{ height: 180, border: "1px solid oklch(0.78 0.11 75 / 0.10)", transition: "border-color 0.2s" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.30)")}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.10)")}
                    >
                      <img
                        src="/manus-storage/product-wizcreate-hero_6c3efa10.jpg"
                        alt="WizPilot"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,0,20,0.92) 0%, rgba(10,0,20,0.35) 55%, transparent 100%)" }} />
                      <div className="relative z-10 p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <img src={WIZCREATE_LOGO} alt="WizPilot" className="w-5 h-5 object-contain" loading="lazy" />
                          <p className="text-[12px] font-bold text-white/90 group-hover:text-[--color-gold-light] transition-colors">WizPilot<sup className="text-[7px] ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight">AI Workflow Automation</p>
                        <p className="text-[9px] text-white/30 mt-1 leading-tight">One prompt. Full pipeline. Zero manual steps.</p>
                      </div>
                    </a>
                    {/* WizSync */}
                    <a
                      href="/products/wizsync-info"
                      className="group relative rounded-xl overflow-hidden flex flex-col justify-end"
                      style={{ height: 180, border: "1px solid oklch(0.78 0.11 75 / 0.10)", transition: "border-color 0.2s" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.30)")}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.10)")}
                    >
                      <img
                        src="/manus-storage/product-wizgenesis-hero_0a9aa16b.jpg"
                        alt="WizSync"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,10,0.90) 0%, rgba(0,0,10,0.30) 55%, transparent 100%)" }} />
                      <div className="relative z-10 p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <img src={WIZSYNC_LOGO} alt="WizSync" className="w-5 h-5 object-contain" loading="lazy" />
                          <p className="text-[12px] font-bold text-white/90 group-hover:text-[--color-gold-light] transition-colors">WizSync<sup className="text-[7px] ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight">Audio-Visual Sync Engine</p>
                        <p className="text-[9px] text-white/30 mt-1 leading-tight">Every beat locked. Every cut frame-perfect.</p>
                      </div>
                    </a>
                    {/* WizScore */}
                    <a
                      href="/products/wizscore"
                      className="group relative rounded-xl overflow-hidden flex flex-col justify-end"
                      style={{ height: 180, border: "1px solid oklch(0.78 0.11 75 / 0.10)", transition: "border-color 0.2s" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.30)")}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.10)")}
                    >
                      <img
                        src="/manus-storage/product-wizsound-hero_8219d2d2.jpg"
                        alt="WizScore"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,8,8,0.92) 0%, rgba(0,8,8,0.32) 55%, transparent 100%)" }} />
                      <div className="relative z-10 p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <img src={WIZSOUND_LOGO} alt="WizScore" className="w-5 h-5 object-contain" loading="lazy" />
                          <p className="text-[12px] font-bold text-white/90 group-hover:text-[--color-gold-light] transition-colors">WizScore<sup className="text-[7px] ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight">AI Video-to-Music Engine</p>
                        <p className="text-[9px] text-white/30 mt-1 leading-tight">Your video. Its perfect original soundtrack.</p>
                      </div>
                    </a>
                  </div>
                  {/* Footer */}
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.07)", background: "oklch(0.78 0.11 75 / 0.015)" }}>
                    <p className="text-[10px] text-white/20 font-medium">Automate your entire creative pipeline</p>
                    <a href="/products/wizpilot" className="flex items-center gap-1.5 text-[11px] font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors">
                      Launch WizPilot <ArrowSVG className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </NavDropdown>
            </div>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/help" className="nav-link">Help</a>
          </div>

          {/* ── Auth CTA ── */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated ? (
              <a
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, oklch(0.78 0.11 75 / 0.18) 0%, oklch(0.78 0.11 75 / 0.08) 100%)",
                  border: "1px solid oklch(0.78 0.11 75 / 0.30)",
                  color: "oklch(0.88 0.10 75)",
                  boxShadow: "0 0 20px oklch(0.78 0.11 75 / 0.08), inset 0 1px 0 oklch(0.78 0.11 75 / 0.20)",
                }}
              >
                <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-3.5 h-3.5 object-contain" /> Dashboard
              </a>
            ) : (
              <>
                <a
                  href={getLoginUrl()}
                  className="text-[13px] font-medium px-3 py-2 rounded-lg transition-colors text-[--color-silver-dark] hover:text-[--color-silver-light] hover:bg-white/[0.04]"
                >
                  Sign in
                </a>
                <a
                  href="/onboarding"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.78 0.11 75 / 0.22) 0%, oklch(0.60 0.10 65 / 0.18) 100%)",
                    border: "1px solid oklch(0.78 0.11 75 / 0.35)",
                    color: "oklch(0.92 0.10 75)",
                    boxShadow: "0 0 24px oklch(0.78 0.11 75 / 0.12), inset 0 1px 0 oklch(0.78 0.11 75 / 0.25)",
                  }}
                >
                  <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-3.5 h-3.5 object-contain" />
                  Start Creating
                </a>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="flex md:hidden relative w-10 h-10 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-gold]/40"
            style={mobileOpen ? { background: "oklch(0.78 0.11 75 / 0.08)", border: "1px solid oklch(0.78 0.11 75 / 0.20)" } : { border: "1px solid transparent" }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <div className="relative w-6 h-[18px] flex flex-col justify-between">
              <span className={`block h-[2px] w-full rounded-full transition-all duration-300 origin-center ${
                mobileOpen ? "rotate-45 translate-y-[8px] bg-[#c9a84c]" : "bg-white"
              }`} style={{ opacity: mobileOpen ? 1 : 0.9 }} />
              <span className={`block h-[2px] w-full rounded-full transition-all duration-300 ${
                mobileOpen ? "opacity-0 scale-x-0" : "bg-white"
              }`} style={{ opacity: mobileOpen ? 0 : 0.9 }} />
              <span className={`block h-[2px] w-full rounded-full transition-all duration-300 origin-center ${
                mobileOpen ? "-rotate-45 -translate-y-[8px] bg-[#c9a84c]" : "bg-white"
              }`} style={{ opacity: mobileOpen ? 1 : 0.9 }} />
            </div>
          </button>
        </div>
      </nav>

      {/* ── Mobile full-screen drawer ── */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

        {/* Drawer panel */}
        <div
          className={`absolute top-[72px] left-0 right-0 bottom-0 overflow-y-auto transition-transform duration-300 ${
            mobileOpen ? "translate-y-0" : "-translate-y-4"
          }`}
          style={{
            background: "linear-gradient(180deg, #080808 0%, #050505 100%)",
            borderTop: "1px solid oklch(0.78 0.11 75 / 0.12)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-4 flex flex-col gap-1 pb-8">

            {/* Home */}
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </a>

            {/* Products accordion */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.78 0.11 75 / 0.08)" }}>
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-[15px] font-semibold transition-all duration-200"
                style={mobileProductsOpen ? { background: "oklch(0.78 0.11 75 / 0.06)", color: "oklch(0.88 0.10 75)" } : { color: "rgba(255,255,255,0.8)" }}
                onClick={() => setMobileProductsOpen((v) => !v)}
                aria-expanded={mobileProductsOpen}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: mobileProductsOpen ? "oklch(0.78 0.11 75)" : "rgba(255,255,255,0.2)" }} />
                  Wiz Studios
                </span>
                <ChevronDownSVG className={`w-4 h-4 transition-transform duration-300 ${
                  mobileProductsOpen ? "rotate-180" : ""
                }`} style={{ color: mobileProductsOpen ? "oklch(0.78 0.11 75)" : "rgba(255,255,255,0.3)" }} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${
                mobileProductsOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="px-2 pb-2" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.06)" }}>
                  {/* Create */}
                  <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mt-3 mb-1.5 px-3">Create</p>
                  {PRODUCTS_CREATE.map((p) => (
                    <NavLink key={p.name} href={p.href} className="flex items-center gap-3.5 px-3 py-3 rounded-2xl mt-1 transition-all duration-200 group" style={{ border: `1px solid ${p.borderColor}` }}
                      onTouchStart={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = p.bgGradient; }}
                      onTouchEnd={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      onClick={() => setMobileOpen(false)}>
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: p.bgGradient, border: `1px solid ${p.borderColor}` }}>{p.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold" style={{ color: "oklch(0.92 0.10 75)" }}>{p.name}<sup className="text-[8px] ml-0.5" style={{ color: "oklch(0.78 0.11 75 / 0.7)" }}>™</sup></p>
                        <p className="text-[11px] text-white/45 mt-0.5 truncate">{p.tagline}</p>
                      </div>
                      <ArrowSVG className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: p.glowColor }} />
                    </NavLink>
                  ))}
                  {/* Enhance */}
                  <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mt-4 mb-1.5 px-3">Enhance</p>
                  {PRODUCTS_ENHANCE.map((p) => (
                    <NavLink key={p.name} href={p.href} className="flex items-center gap-3 px-3 py-3 rounded-xl mt-1 transition-all duration-200" style={{ border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}
                      onTouchStart={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.06)"; }}
                      onTouchEnd={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      onClick={() => setMobileOpen(false)}>
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.06)", border: "1px solid oklch(0.78 0.11 75 / 0.14)" }}>
                        <img src={p.logo} alt={p.name} className="w-7 h-7 object-contain" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold" style={{ color: "oklch(0.88 0.10 75)" }}>{p.name}<sup className="text-[8px] ml-0.5" style={{ color: "oklch(0.78 0.11 75 / 0.6)" }}>™</sup></p>
                        <p className="text-[11px] text-white/40 mt-0.5 truncate">{p.tagline}</p>
                      </div>
                      <ArrowSVG className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }} />
                    </NavLink>
                  ))}
                  {/* Grow */}
                  <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mt-4 mb-1.5 px-3">Grow</p>
                  {PRODUCTS_GROW.map((p) => (
                    <NavLink key={p.name} href={p.href} className="flex items-center gap-3 px-3 py-3 rounded-xl mt-1 transition-all duration-200" style={{ border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}
                      onTouchStart={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.06)"; }}
                      onTouchEnd={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      onClick={() => setMobileOpen(false)}>
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.06)", border: "1px solid oklch(0.78 0.11 75 / 0.14)" }}>
                        <img src={p.logo} alt={p.name} className="w-7 h-7 object-contain" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold" style={{ color: "oklch(0.88 0.10 75)" }}>{p.name}<sup className="text-[8px] ml-0.5" style={{ color: "oklch(0.78 0.11 75 / 0.6)" }}>™</sup></p>
                        <p className="text-[11px] text-white/40 mt-0.5 truncate">{p.tagline}</p>
                      </div>
                      <ArrowSVG className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }} />
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            {/* Technology accordion */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.78 0.11 75 / 0.08)" }}>
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-[15px] font-semibold transition-all duration-200"
                style={mobileTechOpen ? { background: "oklch(0.78 0.11 75 / 0.06)", color: "oklch(0.88 0.10 75)" } : { color: "rgba(255,255,255,0.8)" }}
                onClick={() => setMobileTechOpen((v) => !v)}
                aria-expanded={mobileTechOpen}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: mobileTechOpen ? "oklch(0.78 0.11 75)" : "rgba(255,255,255,0.2)" }} />
                  Technology
                </span>
                <ChevronDownSVG className={`w-4 h-4 transition-transform duration-300 ${
                  mobileTechOpen ? "rotate-180" : ""
                }`} style={{ color: mobileTechOpen ? "oklch(0.78 0.11 75)" : "rgba(255,255,255,0.3)" }} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                mobileTechOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="px-2 pb-2" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.06)" }}>
                  {WIZ_TECHNOLOGY.map((eng) => (
                    <NavLink key={eng.name} href={eng.href} className="flex items-center gap-3 px-3 py-3 rounded-xl mt-1 transition-all duration-200" style={{ border: "1px solid transparent" }}
                      onTouchStart={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.78 0.11 75 / 0.06)"; }}
                      onTouchEnd={(e: React.TouchEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      onClick={() => setMobileOpen(false)}>
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden" style={{ background: "oklch(0.78 0.11 75 / 0.06)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>
                        <img src={eng.logo} alt={eng.name} className="w-7 h-7 object-contain" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold" style={{ color: "oklch(0.88 0.10 75)" }}>{eng.name}<sup className="text-[8px] ml-0.5" style={{ color: "oklch(0.78 0.11 75 / 0.6)" }}>™</sup></p>
                        <p className="text-[11px] text-white/40 mt-0.5 truncate">{eng.tagline}</p>
                      </div>
                      <ArrowSVG className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }} />
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            {/* Workflow accordion */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.78 0.11 75 / 0.08)" }}>
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-[15px] font-semibold transition-all duration-200"
                style={mobileWorkflowOpen ? { background: "oklch(0.78 0.11 75 / 0.06)", color: "oklch(0.88 0.10 75)" } : { color: "rgba(255,255,255,0.8)" }}
                onClick={() => setMobileWorkflowOpen((v) => !v)}
                aria-expanded={mobileWorkflowOpen}
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: mobileWorkflowOpen ? "oklch(0.78 0.11 75)" : "rgba(255,255,255,0.2)" }} />
                  Workflow
                </span>
                <ChevronDownSVG className={`w-4 h-4 transition-transform duration-300 ${
                  mobileWorkflowOpen ? "rotate-180" : ""
                }`} style={{ color: mobileWorkflowOpen ? "oklch(0.78 0.11 75)" : "rgba(255,255,255,0.3)" }} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                mobileWorkflowOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {[
                    { name: "WizCreate", tagline: "AI Storyboard Engine", desc: "Turn any idea into a full cinematic storyboard", href: "/products/wizcreate", logo: WIZCREATE_LOGO, img: "/manus-storage/product-wizcreate-hero_6c3efa10.jpg" },
                    { name: "WizPilot", tagline: "AI Workflow Automation", desc: "One prompt. Full pipeline. Zero manual steps.", href: "/products/wizpilot", logo: WIZGENESIS_LOGO, img: "/manus-storage/product-wizgenesis-hero_0a9aa16b.jpg" },
                    { name: "WizSync", tagline: "Audio-Visual Sync Engine", desc: "Every beat locked. Every cut frame-perfect.", href: "/products/wizsync-info", logo: WIZSYNC_LOGO, img: "/manus-storage/product-wizgenesis-hero_0a9aa16b.jpg" },
                    { name: "WizScore", tagline: "AI Video-to-Music Engine", desc: "Your video. Its perfect original soundtrack.", href: "/products/wizscore", logo: WIZSOUND_LOGO, img: "/manus-storage/product-wizsound-hero_8219d2d2.jpg" },
                  ].map((tool) => (
                    <a
                      key={tool.name}
                      href={tool.href}
                      className="group relative rounded-xl overflow-hidden flex items-end"
                      style={{ height: 90, border: "1px solid oklch(0.78 0.11 75 / 0.10)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <img src={tool.img} alt={tool.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)" }} />
                      <div className="relative z-10 p-3 flex items-center gap-2.5 w-full">
                        <img src={tool.logo} alt={tool.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold" style={{ color: "oklch(0.88 0.10 75)" }}>{tool.name}<sup className="text-[8px] ml-0.5" style={{ color: "oklch(0.78 0.11 75 / 0.6)" }}>™</sup></p>
                          <p className="text-[11px] text-white/40 truncate">{tool.tagline}</p>
                        </div>
                        <ArrowSVG className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: "oklch(0.78 0.11 75 / 0.35)" }} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Simple links */}
            <a href="/pricing" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-all duration-200" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="/help" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-all duration-200" onClick={() => setMobileOpen(false)}>Help</a>

            {/* CTA buttons */}
            <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.10)" }}>
              {isAuthenticated ? (
                <a href="/dashboard" className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-200" style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 75 / 0.20) 0%, oklch(0.60 0.10 65 / 0.15) 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.35)", color: "oklch(0.92 0.10 75)", boxShadow: "0 0 24px oklch(0.78 0.11 75 / 0.10)" }} onClick={() => setMobileOpen(false)}>
                  <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" /> Dashboard
                </a>
              ) : (
                <>
                  <a href={getLoginUrl()} className="flex items-center justify-center py-3 rounded-xl text-[14px] font-medium text-white/60 hover:text-white/90 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => setMobileOpen(false)}>Sign in</a>
                  <a href="/onboarding" className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-200" style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 75 / 0.22) 0%, oklch(0.60 0.10 65 / 0.18) 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.40)", color: "oklch(0.92 0.10 75)", boxShadow: "0 0 28px oklch(0.78 0.11 75 / 0.14)" }} onClick={() => setMobileOpen(false)}>
                    <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" /> Start Creating — Free
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [demoOpen, setDemoOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  return (
    <section
      data-section="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#030303]"
      onMouseMove={handleMouseMove}
    >
      {/* Cinematic motion background — gold dust, waveform, bloom */}
      <HeroCinematicBg mouseX={mousePos.x} mouseY={mousePos.y} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-[96px] pb-24 w-full">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-[--color-gold]/[0.18] bg-[--color-gold]/[0.04] backdrop-blur-sm mb-8 shadow-[0_0_24px_rgba(196,164,100,0.08)]">
            <span className="relative flex items-center justify-center w-2 h-2">
              <span className="absolute w-full h-full rounded-full bg-[--color-gold] animate-ping opacity-60" style={{ animationDuration: "2s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold]" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase text-[--color-gold-dark]">The AI Creative Studio</span>
            <span className="w-px h-3 bg-[--color-gold]/20" />
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[--color-gold]/50">WIZ AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.8rem,7.5vw,5.5rem)] font-black leading-[0.93] tracking-tight text-white mb-6">
            The AI Creative<br />
            <span className="metallic-gold">Studio.</span>
          </h1>
          {/* Subheadline */}
          <p className="text-[clamp(1rem,1.8vw,1.2rem)] text-[--color-silver]/70 leading-relaxed max-w-xl mb-4">
            Music videos. Animation. Original scores. Cinematic visuals.
            Produced to a professional standard — from a single brief.
          </p>
          <p className="text-[clamp(0.85rem,1.4vw,1rem)] text-[--color-silver]/45 leading-relaxed max-w-xl mb-8">
            Nine specialised AI studios. One unified production environment.
            Solo production. Studio standard.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <a
              href="/onboarding"
              className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base"
              onClick={() => { mp.heroCTAClicked?.(); mp.startCreatingClicked("hero"); }}
            >
              <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-5 h-5 object-contain" />
              Enter the Studio — Free
            </a>
            <a
              href="/pricing"
              className="btn-secondary inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base"
            >
              See What It Produces
              <ArrowSVG className="w-4 h-4" />
            </a>
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2.5 text-[--color-silver-dark] hover:text-[--color-silver-light] font-medium text-sm transition-colors"
            >
              <span className="relative w-8 h-8 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-[--color-gold]/10 animate-ping" style={{ animationDuration: "2.5s" }} />
                <span className="absolute inset-0 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/5 flex items-center justify-center">
                  <PlaySVG className="w-3 h-3 text-[--color-gold] ml-0.5" />
                </span>
              </span>
              Watch Demo
            </button>
          </div>

          {/* Proof strip — studio-grade capabilities */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { icon: <img src={WIZCREATE_LOGO} alt="WizCreate" aria-hidden="true" className="w-5 h-5 object-contain" />, label: "AI Music Video", glow: "oklch(0.70 0.18 260)" },
              { icon: <WaveformSVG className="w-5 h-5" color="oklch(0.72 0.18 160)" />, label: "Studio Audio Mastering", glow: "oklch(0.72 0.18 160)" },
              { icon: <img src={WIZLUMINA_LOGO} alt="WizLumina" aria-hidden="true" className="w-5 h-5 object-contain" />, label: "Cinematic Visual Grade", glow: "oklch(0.78 0.11 75)" },
              { icon: <img src={WIZANIMATE_LOGO} alt="WizAnimate" aria-hidden="true" className="w-5 h-5 object-contain" />, label: "Character Lock Animation", glow: "oklch(0.68 0.18 330)" },
              { icon: <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-5 h-5 object-contain" />, label: "Original Score", glow: "oklch(0.78 0.11 75)" },
              { icon: <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-5 h-5 object-contain" />, label: "Free Preview Every Scene", glow: "oklch(0.78 0.11 75)" },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-bold tracking-wide"
                style={{
                  background: "linear-gradient(135deg, rgba(196,164,100,0.10) 0%, rgba(196,164,100,0.04) 100%)",
                  border: "1px solid oklch(0.78 0.11 75 / 0.22)",
                  color: "oklch(0.90 0.08 75)",
                  boxShadow: `0 0 18px ${item.glow}18, inset 0 1px 0 oklch(0.78 0.11 75 / 0.14)`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <span style={{ filter: `drop-shadow(0 0 6px ${item.glow}88)` }}>{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {WHO_IMAGES.map((src, i) => (
                  <img key={i} src={src} alt="Creator" className="w-8 h-8 rounded-full border-2 border-[#030303] object-cover" loading="lazy" />
                ))}
              </div>
              <div>
                <span className="text-[--color-silver-dark]/50 text-[11px] font-medium">AI-powered video creation</span>
              </div>
            </div>
            <div className="h-8 w-px bg-[--color-gold]/10 hidden sm:block" />
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[--color-silver]/55 font-semibold">No credit card</span> to start
              </span>
              <span className="w-px h-3 bg-[--color-gold]/10" />
              <span className="flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="text-[--color-silver]/55 font-semibold">Own your content</span>
              </span>
              <span className="w-px h-3 bg-[--color-gold]/10 hidden sm:block" />
              <span className="hidden sm:flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="text-[--color-silver]/55 font-semibold">No watermark</span>
              </span>
              <span className="w-px h-3 bg-[--color-gold]/10 hidden sm:block" />
              <span className="hidden sm:flex items-center gap-1.5 text-[--color-silver-dark]/40">
                <span className="text-[--color-silver]/55 font-semibold">Free storyboard</span> on every project
              </span>
            </div>
          </div>
        </div>
      </div>

      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ProductGrid replaced by WizProductGrid component
function ProductGrid() {
  return <WizProductGrid />;
}

// ── Welcome to WIZ AI (Demo Video) ────────────────────────────────────────────
function WelcomeSection() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-5">The Studio in Action</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight text-white leading-tight mb-6">
              One brief.<br />Studio-grade output.
            </h2>
            <p className="text-[--color-silver-dark]/55 text-base leading-relaxed mb-8">
              Describe your idea. WIZ AI builds the storyboard, generates every scene, applies studio audio mastering and cinematic grading, and delivers a complete production — ready to publish.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/onboarding"
                onClick={() => mp.startCreatingClicked("welcome_section")}
                className="btn-primary btn-sheen btn-sheen inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm"
              >
                <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" />
                Start Creating
              </a>
              <a href="/pricing" className="btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm">
                View Pricing
              </a>
            </div>
          </div>
          <div className="reveal">
            <div
              onClick={() => setDemoOpen(true)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDemoOpen(true)}
              role="button"
              tabIndex={0}
              className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-[--color-gold]/[0.08] bg-[#080808] hover:border-[--color-gold]/[0.2] transition-all duration-500 shadow-[0_16px_60px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(196,164,100,0.05)] focus:outline-none cursor-pointer"
              aria-label="Watch WIZ AI demo"
            >
              <img
                src={DEMO_POSTER}
                alt="WIZ AI demo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[1.1] saturate-[1.15]"
                loading="lazy" width="1920" height="1080" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/05 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="relative w-16 h-16">
                  <span className="absolute inset-0 rounded-full bg-[--color-gold]/15 animate-ping" style={{ animationDuration: "2.5s" }} />
                  <span className="absolute inset-0 rounded-full bg-[--color-gold]/10 border-2 border-[--color-gold]/40 group-hover:bg-[--color-gold]/15 group-hover:border-[--color-gold]/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                    <PlaySVG className="w-6 h-6 text-[--color-gold] ml-0.5" />
                  </span>
                </div>
                <span className="text-white font-semibold text-sm drop-shadow-lg">Watch the Studio Demo</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-xs text-[--color-silver-dark]/50 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-[--color-gold]/[0.06]">Prompt → Storyboard → Final Video</span>
                <button
                  onClick={(e) => { e.stopPropagation(); triggerIntroReplay(); }}
                  className="flex items-center gap-1 text-xs text-[--color-silver-dark]/40 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-[--color-gold]/[0.06] hover:text-[--color-gold]/70 hover:border-[--color-gold]/20 transition-all"
                  aria-label="Replay the WIZ AI intro"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Replay intro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

// ── WIZ Engines — Proprietary Intelligence Layer ────────────────────────────
function WizEngines() {
  const engines = [
    {
      name: "WizSound",
      tm: "™",
      tagline: "Premium Audio Engine",
      desc: "The premium audio engine that upgrades every track from Normal to Cinematic quality.",
      benefit: "Your audio sounds professionally mastered, not AI-generated.",
      logoUrl: WIZSOUND_LOGO,
      // Warm gold — audio warmth
      accentFrom: "oklch(0.80 0.14 72 / 0.18)",
      accentBorder: "oklch(0.80 0.14 72 / 0.22)",
      accentGlow: "oklch(0.80 0.14 72 / 0.07)",
      accentColor: "oklch(0.80 0.14 72)",
    },
    {
      name: "WizLumina",
      tm: "™",
      tagline: "Visual Enhancement Engine",
      desc: "The visual enhancement engine that transforms raw AI footage into polished, cinematic output.",
      benefit: "Every frame looks colour-graded by a professional colourist.",
      logoUrl: WIZLUMINA_LOGO,
      // Cool silver-blue — visual clarity
      accentFrom: "oklch(0.78 0.06 230 / 0.18)",
      accentBorder: "oklch(0.78 0.06 230 / 0.22)",
      accentGlow: "oklch(0.78 0.06 230 / 0.07)",
      accentColor: "oklch(0.78 0.06 230)",
    },
    {
      name: "WizGenesis",
      tm: "™",
      tagline: "Core Intelligence Engine",
      desc: "The core intelligence engine powering every creative decision inside WIZ AI.",
      benefit: "Your ideas become better, faster, and more consistent automatically.",
      logoUrl: WIZGENESIS_LOGO,
      // Deep violet-purple — intelligence
      accentFrom: "oklch(0.68 0.18 295 / 0.18)",
      accentBorder: "oklch(0.68 0.18 295 / 0.22)",
      accentGlow: "oklch(0.68 0.18 295 / 0.07)",
      accentColor: "oklch(0.68 0.18 295)",
    },
    {
      name: "WizBoost",
      tm: "™",
      tagline: "Output Optimisation Engine",
      desc: "The output optimisation engine that accelerates build speed and sharpens final quality.",
      benefit: "Every export is optimised for maximum quality on every platform.",
      logoUrl: WIZBOOST_LOGO,
      // Electric green — speed/performance
      accentFrom: "oklch(0.76 0.18 145 / 0.16)",
      accentBorder: "oklch(0.76 0.18 145 / 0.20)",
      accentGlow: "oklch(0.76 0.18 145 / 0.06)",
      accentColor: "oklch(0.76 0.18 145)",
    },
  ];

  const flow = [
    { step: "01", label: "You choose what to create", detail: "Music video, animation, short, image, or audio." },
    { step: "02", label: "WIZ AI generates the foundation", detail: "WizGenesis™ builds your storyboard, scenes, and structure." },
    { step: "03", label: "The WIZ Engines enhance and refine", detail: "WizSound™ and WizLumina™ elevate audio and visuals. WizBoost™ optimises the final output." },
    { step: "04", label: "You preview, build, and export", detail: "Review every scene, then build in HD or 4K — publish-ready for any platform." },
  ];

  return (
    <section id="wiz-engines" className="relative bg-[#040404] py-32 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.78 0.11 75 / 0.03) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-20 reveal">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: "oklch(0.78 0.11 75 / 0.08)", border: "1px solid oklch(0.78 0.11 75 / 0.18)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-[--color-gold-dark]">Proprietary Intelligence Layer</span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-5">
            Powered by the <span className="metallic-gold">WIZ Engines</span>
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-2xl mx-auto leading-relaxed">
            Four proprietary engines work silently behind every creation — making your output smarter, more polished, and more cinematic than anything ordinary AI tools can produce.
          </p>
        </div>

        {/* Engine cards — 2×2 grid */}
        <div className="grid sm:grid-cols-2 gap-7 mb-24">
          {engines.map((eng) => (
            <div
              key={eng.name}
              className="reveal group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2"
              style={{
                background: `linear-gradient(160deg, ${eng.accentGlow} 0%, oklch(0.055 0.006 260) 50%, oklch(0.04 0.004 260) 100%)`,
                border: "1px solid rgba(196,164,100,0.20)",
                boxShadow: "0 1px 0 rgba(232,213,160,0.12) inset, 0 -1px 0 rgba(0,0,0,0.7) inset, 0 8px 48px rgba(0,0,0,0.65), 0 2px 0 rgba(196,164,100,0.06)",
              }}
            >
              {/* Full-card hover glow sweep */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${eng.accentFrom}, transparent 70%)` }}
              />
              {/* Top shimmer bar */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent 0%, ${eng.accentFrom} 50%, transparent 100%)` }}
              />
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.2), transparent)" }} />

              <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center text-center">
                {/* Logo centred with glow halo */}
                <div className="relative mb-7">
                  <div
                    className="absolute inset-0 rounded-2xl blur-3xl opacity-25 group-hover:opacity-55 transition-opacity duration-700"
                    style={{ background: (eng as any).accentColor, transform: 'scale(1.8)' }}
                  />
                  <div
                    className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(145deg, ${eng.accentGlow} 0%, rgba(0,0,0,0.25) 100%)`,
                      border: `1px solid ${eng.accentBorder}`,
                      boxShadow: `0 1px 0 ${eng.accentFrom} inset, 0 6px 30px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4)`,
                    }}
                  >
                    <img
                      src={eng.logoUrl}
                      alt={eng.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain group-hover:scale-105 transition-transform duration-500"
                      style={{ filter: `drop-shadow(0 0 20px ${(eng as any).accentColor})` }}
                     loading="lazy" />
                  </div>
                </div>

                {/* Engine type badge */}
                <div
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${eng.accentGlow}, rgba(0,0,0,0.2))`,
                    border: `1px solid ${eng.accentBorder}`,
                    color: (eng as any).accentColor,
                    opacity: 0.85,
                  }}
                >
                  {eng.tagline}
                </div>

                {/* Product name — large and bold */}
                <h3 className="text-3xl sm:text-[2.6rem] font-black text-white tracking-tight leading-none mb-1 relative z-10">
                  {eng.name}<span className="text-[--color-gold-dark] text-xl align-super ml-0.5">{eng.tm}</span>
                </h3>

                {/* Tagline as subtitle */}
                <p className="text-xs font-semibold tracking-[0.22em] uppercase mb-5 relative z-10" style={{ color: (eng as any).accentColor, opacity: 0.6 }}>{eng.tagline}</p>

                {/* Description */}
                <p className="text-white/45 text-sm leading-relaxed mb-6 relative z-10 max-w-xs">{eng.desc}</p>

                {/* Benefit callout — styled highlight strip */}
                <div
                  className="relative z-10 flex items-start gap-3 px-4 py-3.5 rounded-xl w-full"
                  style={{
                    background: `linear-gradient(135deg, ${eng.accentGlow}, rgba(0,0,0,0.15))`,
                    border: `1px solid ${eng.accentBorder}`,
                  }}
                >
                  <CheckSVG className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: (eng as any).accentColor }} />
                  <p className="text-white/75 text-sm font-medium leading-snug text-left">{eng.benefit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works together — PREMIUM redesign */}
        <div className="reveal">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ background: "oklch(0.78 0.11 75 / 0.08)", border: "1px solid oklch(0.78 0.11 75 / 0.18)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-[--color-gold-dark]">How it all works together</span>
            </div>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-black tracking-tight text-white">
              More than tools. An intelligent creative system.
            </h3>
          </div>

          {/* Desktop: horizontal flow */}
          <div className="hidden md:grid md:grid-cols-4 gap-0 relative">
            {/* Background track line */}
            <div className="absolute top-[3.25rem] left-[12.5%] right-[12.5%] h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.78 0.11 75 / 0.25) 15%, oklch(0.78 0.11 75 / 0.25) 85%, transparent)" }} />

            {flow.map((f, i) => (
              <div key={f.step} className="reveal relative flex flex-col items-center text-center px-4">
                {/* Number circle — large and glowing */}
                <div className="relative mb-6 z-10">
                  {/* Outer glow ring */}
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-50"
                    style={{ background: "oklch(0.78 0.11 75 / 0.4)", transform: "scale(1.8)" }}
                  />
                  {/* Circle */}
                  <div
                    className="relative w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(145deg, oklch(0.78 0.11 75 / 0.18) 0%, oklch(0.04 0.004 260) 100%)",
                      border: "1.5px solid oklch(0.78 0.11 75 / 0.55)",
                      boxShadow: "0 0 0 1px oklch(0.78 0.11 75 / 0.08), 0 4px 24px oklch(0.78 0.11 75 / 0.20), inset 0 1px 0 oklch(0.78 0.11 75 / 0.25)",
                    }}
                  >
                    <span
                      className="text-2xl font-black tracking-tight"
                      style={{
                        backgroundImage: "linear-gradient(160deg, #f0d080 0%, #c4a450 40%, #8a6520 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 8px oklch(0.78 0.11 75 / 0.6))",
                      }}
                    >
                      {f.step}
                    </span>
                  </div>
                </div>

                {/* Arrow connector (not on last) */}
                {i < flow.length - 1 && (
                  <div className="absolute top-[3.25rem] left-[calc(50%_+_2.25rem)] right-[calc(-50%_+_2.25rem)] h-px z-0" style={{ background: "linear-gradient(90deg, oklch(0.78 0.11 75 / 0.4), oklch(0.78 0.11 75 / 0.1))" }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "6px solid oklch(0.78 0.11 75 / 0.4)" }} />
                  </div>
                )}

                {/* Text */}
                <h4 className="text-[0.95rem] font-bold text-white mb-2 leading-snug">{f.label}</h4>
                <p className="text-[--color-silver-dark]/50 text-[0.8rem] leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>

          {/* Mobile: vertical stack */}
          <div className="md:hidden flex flex-col gap-4">
            {flow.map((f, i) => (
              <div key={f.step} className="reveal flex gap-5 items-start p-5 rounded-2xl" style={{ background: "oklch(0.055 0.006 260 / 0.8)", border: "1px solid oklch(0.78 0.11 75 / 0.15)", boxShadow: "0 0 30px oklch(0.78 0.11 75 / 0.04)" }}>
                {/* Number badge */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(145deg, oklch(0.78 0.11 75 / 0.18) 0%, oklch(0.04 0.004 260) 100%)",
                    border: "1.5px solid oklch(0.78 0.11 75 / 0.55)",
                    boxShadow: "0 0 16px oklch(0.78 0.11 75 / 0.25), inset 0 1px 0 oklch(0.78 0.11 75 / 0.25)",
                  }}
                >
                  <span
                    className="text-lg font-black"
                    style={{
                      backgroundImage: "linear-gradient(160deg, #f0d080 0%, #c4a450 40%, #8a6520 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 0 6px oklch(0.78 0.11 75 / 0.6))",
                    }}
                  >
                    {f.step}
                  </span>
                </div>
                {/* Vertical connector */}
                <div className="flex-1">
                  <h4 className="text-base font-bold text-white mb-1">{f.label}</h4>
                  <p className="text-[--color-silver-dark]/50 text-sm leading-relaxed">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 reveal">
          <a
            href="/onboarding"
            onClick={() => mp.startCreatingClicked("how_it_works")}
            className="btn-primary btn-sheen btn-sheen inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm"
          >
            <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" />
            Start Creating
          </a>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const steps = [
    { num: "01", title: "Describe your idea", desc: "Tell WIZ AI what you want to create — a music video, animation, cinematic short, or anything else.", img: "/manus-storage/product-wizcreate-hero_6c3efa10.jpg", logo: WIZAI_LOGO },
    { num: "02", title: "AI builds your storyboard", desc: "WizCreate™, our AI storyboard engine, generates a full visual storyboard with scenes, characters, and direction — in seconds.", img: "/manus-storage/product-wizcreate-hero_6c3efa10.jpg", logo: WIZCREATE_LOGO },
    { num: "03", title: "Preview every scene", desc: "Review your full video before committing to build. Edit, swap, or refine any scene you want.", img: "/manus-storage/product-wizlumina-hero_ed20683e.jpg", logo: WIZLUMINA_LOGO },
    { num: "04", title: "Build and export", desc: "Export in HD or 4K with WizSound™ audio mastering and WizLumina™ visual enhancement built in. Download and share.", img: "/manus-storage/product-wizboost-hero_9c11e1cc.jpg", logo: WIZSOUND_LOGO },
  ];

  // Auto-advance steps every 2.5s when section is in view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
          }, 2500);
        } else {
          if (interval) clearInterval(interval);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
    return () => { observer.disconnect(); if (interval) clearInterval(interval); };
  }, [steps.length]);

  return (
    <section ref={sectionRef} id="how-it-works" className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">How it works</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            From Idea to Cinematic Video in Minutes
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-xl mx-auto mt-4">
            No editing experience needed. No crew. No timeline. Just describe what you want.
          </p>
        </div>

        {/* Desktop: 4-column animated grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="reveal relative cursor-pointer group"
              onClick={() => setActiveStep(i)}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className="absolute top-8 left-[calc(100%_-_1rem)] w-full h-px transition-all duration-700"
                  style={{
                    background: i < activeStep
                      ? "linear-gradient(90deg, oklch(0.78 0.11 75 / 0.5), oklch(0.78 0.11 75 / 0.15))"
                      : "linear-gradient(90deg, oklch(0.78 0.11 75 / 0.15), transparent)",
                  }}
                />
              )}
              {/* Step image */}
              <div
                className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-5 border transition-all duration-500 ${
                  i === activeStep
                    ? "border-[--color-gold]/40 shadow-lg shadow-[--color-gold]/10 scale-[1.02]"
                    : i < activeStep
                    ? "border-[--color-gold]/20"
                    : "border-[--color-gold]/[0.06]"
                }`}
              >
                <img
                  src={s.img}
                  alt={s.title}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    i === activeStep ? "brightness-110 saturate-110" : i < activeStep ? "brightness-90" : "brightness-75"
                  }`}
                 loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 70%)' }} />
                {/* Step number — premium glowing badge */}
                <div className="absolute bottom-3 left-3">
                  <div
                    className="relative w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: i <= activeStep
                        ? "linear-gradient(145deg, oklch(0.78 0.11 75 / 0.25) 0%, oklch(0.04 0.004 260 / 0.9) 100%)"
                        : "rgba(0,0,0,0.35)",
                      border: i <= activeStep
                        ? "1.5px solid oklch(0.78 0.11 75 / 0.6)"
                        : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: i <= activeStep
                        ? "0 0 20px oklch(0.78 0.11 75 / 0.35), inset 0 1px 0 oklch(0.78 0.11 75 / 0.3)"
                        : "none",
                      transition: "all 0.5s ease",
                    }}
                  >
                    {i <= activeStep && (
                      <div
                        className="absolute inset-0 rounded-full blur-lg opacity-60"
                        style={{ background: "oklch(0.78 0.11 75 / 0.5)", transform: "scale(1.5)" }}
                      />
                    )}
                    <span
                      className="relative text-base font-black tracking-tight transition-all duration-500"
                      style={i <= activeStep ? {
                        backgroundImage: "linear-gradient(160deg, #f0d080 0%, #c4a450 40%, #8a6520 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 6px oklch(0.78 0.11 75 / 0.8))",
                      } : { color: "rgba(255,255,255,0.25)" }}
                    >
                      {s.num}
                    </span>
                  </div>
                </div>
                {/* Active indicator */}
                {i === activeStep && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 rounded-full bg-[--color-gold] animate-pulse" />
                  </div>
                )}
              </div>
              <div className="relative z-10">
                <div className={`flex items-center gap-2 mb-2 transition-colors duration-500 ${
                  i <= activeStep ? "text-[--color-gold-dark]" : "text-white/20"
                }`}>
                  <img src={(s as any).logo} alt={(s as any).badge ?? s.title} aria-hidden="true" className="w-5 h-5 object-contain opacity-80" />
                  <h3 className={`text-lg font-bold transition-colors duration-500 ${
                    i <= activeStep ? "text-white" : "text-white/40"
                  }`}>{s.title}</h3>
                </div>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${
                  i === activeStep ? "text-[--color-silver-dark]/65" : "text-[--color-silver-dark]/25"
                }`}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="md:hidden flex flex-col gap-6">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`reveal flex gap-4 items-start p-4 rounded-xl border transition-all duration-500 ${
                i === activeStep
                  ? "border-[--color-gold]/30 bg-[--color-gold]/[0.03]"
                  : "border-white/5 bg-transparent"
              }`}
              onClick={() => setActiveStep(i)}
            >
              {/* Number badge — premium */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative transition-all duration-500"
                style={i <= activeStep ? {
                  background: "linear-gradient(145deg, oklch(0.78 0.11 75 / 0.2) 0%, oklch(0.04 0.004 260) 100%)",
                  border: "1.5px solid oklch(0.78 0.11 75 / 0.55)",
                  boxShadow: "0 0 16px oklch(0.78 0.11 75 / 0.3), inset 0 1px 0 oklch(0.78 0.11 75 / 0.25)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span
                  className="text-sm font-black transition-all duration-500"
                  style={i <= activeStep ? {
                    backgroundImage: "linear-gradient(160deg, #f0d080 0%, #c4a450 40%, #8a6520 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 6px oklch(0.78 0.11 75 / 0.7))",
                  } : { color: "rgba(255,255,255,0.25)" }}
                >
                  {s.num}
                </span>
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-bold mb-1 transition-colors duration-500 ${
                  i <= activeStep ? "text-white" : "text-white/40"
                }`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${
                  i === activeStep ? "text-[--color-silver-dark]/60" : "text-[--color-silver-dark]/20"
                }`}>{s.desc}</p>
              </div>
              {/* Step image (mobile) */}
              {i === activeStep && (
                <div className="flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border border-[--color-gold]/20">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover"  loading="lazy" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step progress dots */}
        <div className="flex justify-center gap-2 mt-12">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeStep ? "w-6 h-2 bg-[--color-gold]" : "w-2 h-2 bg-white/15 hover:bg-white/30"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── The Standard ─────────────────────────────────────────────────────────────
function WhyWizAI() {
  const standards = [
    {
      number: "01",
      title: "Character Lock",
      subtitle: "Consistent characters. Every scene.",
      desc: "WizAnimate™ maintains exact visual consistency across every scene — same face, same costume, same performance. No drift. No inconsistency. The character you brief is the character that appears, from the first frame to the last.",
      logo: WIZANIMATE_LOGO,
      img: "/manus-storage/why-wiz-formats_98888fe0.png",
    },
    {
      number: "02",
      title: "Studio Audio",
      subtitle: "Every track. Professionally mastered.",
      desc: "Raw AI audio is flat, narrow, and unfinished. WizSound™ mastering applies spatial depth, frequency balance, and cinematic width to every track — automatically. The output is not AI audio. It is a mastered record.",
      logo: WIZSOUND_LOGO,
      img: "/manus-storage/why-wiz-full-video_5f818c4d.png",
    },
    {
      number: "03",
      title: "Cinematic Grade",
      subtitle: "Every frame. Colour-graded.",
      desc: "Raw AI footage is ungraded and visually inconsistent. WizLumina™ applies cinematic colour grading, HDR enhancement, and frame-level polish to every production — automatically. The output is not AI footage. It is a graded film.",
      logo: WIZLUMINA_LOGO,
      img: "/manus-storage/why-wiz-preview_a3e1de16.png",
    },
    {
      number: "04",
      title: "Complete Production",
      subtitle: "One brief. Finished work.",
      desc: "WIZ AI does not produce clips. It produces complete productions — storyboard, scenes, audio, grade, and final build — from a single creative brief. The output is ready to publish. No assembly required.",
      logo: WIZAI_LOGO,
      img: "/manus-storage/why-wiz-no-editing_37037a03.png",
    },
    {
      number: "05",
      title: "Preview Before Build",
      subtitle: "See everything. Before you commit.",
      desc: "Every scene is reviewed and approved before a single credit is spent on the final build. The complete production — every frame, every scene — is visible before rendering begins. This is how a serious studio works.",
      logo: WIZCREATE_LOGO,
      img: "/manus-storage/why-wiz-faster_532c9bed.png",
    },
    {
      number: "06",
      title: "Every Creative Format",
      subtitle: "Music video. Animation. Score. Image. Shorts.",
      desc: "Nine specialised AI studios cover every format a serious creator needs — from full music videos and character animation to original scores, cinematic images, and short-form content. One ecosystem. Every format.",
      logo: WIZAI_LOGO,
      img: "/manus-storage/why-wiz-creators_3ebbdae1.png",
    },
  ];
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WIZ AI — The Standard</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight max-w-2xl">
            The standard.
          </h2>
          <p className="text-white/40 text-lg max-w-xl leading-relaxed mt-4">
            Every production that leaves WIZ AI passes through the same quality threshold. These are the principles that define it.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {standards.map((s) => (
            <div key={s.number} className="reveal group relative rounded-2xl overflow-hidden flex flex-col" style={{ border: "1px solid rgba(196,164,100,0.12)", background: "linear-gradient(160deg, rgba(196,164,100,0.04) 0%, rgba(4,4,4,0.95) 100%)" }}>
              {/* Card image */}
              <div className="relative h-40 overflow-hidden">
                <img src={s.img} alt={s.title} className="w-full h-full object-cover opacity-80 brightness-[1.1] saturate-[1.1] group-hover:opacity-95 group-hover:scale-105 transition-all duration-700" loading="lazy" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(4,4,4,0.0) 0%, rgba(4,4,4,0.55) 100%)" }} />
                {/* Standard number badge */}
                <div className="absolute top-4 left-5 px-2.5 py-1 rounded-lg border border-[--color-gold]/[0.25] bg-black/70 backdrop-blur-sm">
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[--color-gold-dark]">{s.number}</span>
                </div>
                {/* Logo badge */}
                <div className="absolute bottom-4 left-5 w-10 h-10 rounded-xl border border-[--color-gold]/[0.2] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <img src={s.logo} alt="WIZ AI" aria-hidden="true" className="w-6 h-6 object-contain opacity-80" />
                </div>
              </div>
              {/* Card text */}
              <div className="p-6 flex flex-col gap-2 flex-1">
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="text-[--color-gold-dark]/70 text-xs font-semibold tracking-wide uppercase">{s.subtitle}</p>
                <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── WizSound Demo ────────────────────────────────────────────────────────────
const AUDIO_TIERS = [
  {
    id: "normal",
    label: "Normal",
    tagline: "Standard Audio",
    desc: "Raw AI-generated audio. Flat, narrow, and unprocessed.",
    features: ["Mono mix", "No spatial depth", "Basic EQ", "Thin low-end"],
    src: "/manus-storage/original_test_268addb1.mp3", // TEST: 440Hz tone
    bars: [0.25, 0.35, 0.3, 0.45, 0.25, 0.35, 0.3, 0.25, 0.35, 0.3, 0.4, 0.25, 0.3, 0.35, 0.25, 0.3, 0.35, 0.28, 0.32, 0.38],
    color: "rgba(100,100,110,0.4)",
    colorActive: "rgba(140,140,150,0.7)",
    glowColor: "transparent",
    ringColor: "rgba(255,255,255,0.08)",
  },
  {
    id: "enhanced",
    label: "Enhanced",
    tagline: "WizSound Enhance",
    desc: "Cleaned, balanced, and broadcast-ready with stereo width.",
    features: ["Stereo widening", "Noise reduction", "EQ mastering", "Improved clarity"],
    src: "/manus-storage/enhanced_test_b2a5540a.mp3", // TEST: 880Hz tone
    bars: [0.35, 0.5, 0.55, 0.65, 0.4, 0.55, 0.5, 0.4, 0.55, 0.48, 0.62, 0.4, 0.5, 0.55, 0.42, 0.5, 0.52, 0.45, 0.48, 0.58],
    color: "rgba(180,165,120,0.5)",
    colorActive: "rgba(196,170,100,0.85)",
    glowColor: "rgba(196,170,100,0.08)",
    ringColor: "rgba(196,170,100,0.15)",
  },
  {
    id: "wizsound",
    label: "WizSound™",
    tagline: "WizSound Cinematic",
    desc: "Full spatial immersion with deep bass, warmth, and studio-grade presence.",
    features: ["Spatial 3D audio", "Deep cinematic bass", "Studio mastering", "Immersive depth"],
    src: "/manus-storage/cinematic_test_5d2bc6b3.mp3", // TEST: 220Hz tone
    bars: [0.45, 0.65, 0.8, 0.92, 0.6, 0.85, 0.75, 0.58, 0.82, 0.7, 0.95, 0.62, 0.78, 0.88, 0.58, 0.75, 0.82, 0.68, 0.72, 0.9],
    color: "rgba(212,175,55,0.4)",
    colorActive: "rgba(212,175,55,0.9)",
    glowColor: "rgba(212,175,55,0.12)",
    ringColor: "rgba(212,175,55,0.25)",
  },
];

function WizSoundDemo() {
  const [activeTier, setActiveTier] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tier = AUDIO_TIERS[activeTier];

  // STEP 2: Single audio element — imperative src-swap, currentTime preserved, volume=1.0
  const handleTierSwitch = (i: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const savedTime = audio.currentTime; // preserve position
    const wasPlaying = !audio.paused;
    console.log('[WizSound] TIER_SWITCH → tier:', AUDIO_TIERS[i].label, '| savedTime:', savedTime.toFixed(2), '| wasPlaying:', wasPlaying);
    // Imperatively swap src and reload — React has NO src prop on <audio> so this cannot be overwritten
    const newSrc = AUDIO_TIERS[i].src;
    console.log('[WizSound] SWITCHING TO:', newSrc);
    audio.src = newSrc;
    audio.load();
    audio.volume = 1.0;
    console.log('[WizSound] CURRENT SRC after set:', audio.src);
    // Restore position after canplay fires (load() resets currentTime to 0)
    const onCanPlay = () => {
      audio.currentTime = savedTime;
      if (wasPlaying) {
        audio.play().then(() => {
          console.log('[WizSound] RESUMED at time:', audio.currentTime.toFixed(2));
        }).catch((err) => {
          console.error('[WizSound] PLAY_BLOCKED:', err);
        });
      }
      audio.removeEventListener('canplay', onCanPlay);
    };
    audio.addEventListener('canplay', onCanPlay);
    setActiveTier(i);
  };

  // Play / pause toggle
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1.0;
    console.log('[WizSound] TOGGLE_PLAY | isPlaying:', isPlaying, '| src:', audio.src, '| currentTime:', audio.currentTime.toFixed(2));
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        console.log('[WizSound] PLAY_SUCCESS | muted:', audio.muted, '| volume:', audio.volume);
        setIsPlaying(true);
      }).catch((err) => {
        console.error('[WizSound] PLAY_BLOCKED:', err);
      });
    }
  };

  // On mount: set initial src imperatively (no React src prop on <audio> to avoid React overwriting it)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = AUDIO_TIERS[0].src;
    audio.volume = 1.0;
    audio.load();
    console.log('[WizSound] MOUNT | initial src set to:', audio.src);
    const onTime = () => setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnded); };
  }, []); // ← empty deps: attach once, never re-attach

  return (
    <section className="relative py-32 px-6" style={{ background: "linear-gradient(180deg, #030303 0%, #0a0a0f 50%, #030303 100%)" }}>
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      {/* Subtle ambient glow behind the section */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: `radial-gradient(circle, ${tier.colorActive} 0%, transparent 70%)`, transition: "all 0.8s ease" }} />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header with WizSound branding */}
        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-3 mb-6 px-5 py-2.5 rounded-full border border-[--color-gold]/10 bg-[--color-gold]/[0.03]">
            <img src={WIZSOUND_LOGO} alt="WizSound™" className="h-8 w-auto" loading="lazy" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[--color-gold]/60">WizSound™ — The Mastering Suite</span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-4">
            Hear the difference.
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-lg mx-auto leading-relaxed">
            Raw AI audio is flat and unfinished. WizSound™ mastering applies spatial depth, frequency balance, and cinematic width — automatically. Switch between tiers and hear what studio-grade sounds like.
          </p>
        </div>

        <div className="reveal">
          {/* Tier selector — premium pill style */}
          <div className="flex items-center justify-center mb-12">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
              {AUDIO_TIERS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTierSwitch(i); }}
                  className={`relative px-7 py-3 rounded-xl text-sm font-bold transition-all duration-400 ${
                    activeTier === i
                      ? i === 2
                        ? "bg-gradient-to-r from-[--color-gold]/15 to-[--color-gold]/5 text-[--color-gold] shadow-[0_0_30px_rgba(212,175,55,0.08)]"
                        : i === 1
                          ? "bg-white/[0.06] text-[--color-gold-dark]"
                          : "bg-white/[0.04] text-white/70"
                      : "text-white/25 hover:text-white/45"
                  }`}
                >
                  {i === 2 && activeTier === 2 && (
                    <img src={WIZSOUND_LOGO} alt="" className="absolute -top-2 -right-2 w-4 h-4 opacity-60" />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main player area — two columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">

            {/* Left: Feature card */}
            <div className="lg:col-span-2 rounded-2xl p-6 border transition-all duration-500" style={{ borderColor: tier.ringColor, background: `linear-gradient(135deg, rgba(255,255,255,0.02), ${tier.glowColor})` }}>
              <div className="flex items-center gap-2.5 mb-4">
                {activeTier === 2 && <img src={WIZSOUND_LOGO} alt="WizSound" className="w-5 h-5" />}
                <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: tier.colorActive }}>{tier.tagline}</span>
              </div>
              <ul className="space-y-3">
                {tier.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tier.colorActive, boxShadow: activeTier === 2 ? `0 0 6px ${tier.color}` : "none" }} />
                    <span className="text-white/60">{f}</span>
                  </li>
                ))}
              </ul>
              {activeTier === 2 && (
                <div className="mt-5 pt-4 border-t border-[--color-gold]/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[--color-gold]/50">Recommended</span>
                </div>
              )}
            </div>

            {/* Right: Player card */}
            <div className="lg:col-span-3 rounded-2xl p-8 border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm">
              {/* Single audio element — NO src prop: src is set imperatively in useEffect and handleTierSwitch */}
              <audio ref={audioRef} preload="auto" />

              {/* Animated waveform bars — more bars, thinner, premium look */}
              <div className="flex items-end justify-center gap-[3px] h-24 mb-8">
                {tier.bars.map((h, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: "4px",
                      height: `${h * 100}%`,
                      background: `linear-gradient(180deg, ${tier.colorActive}, ${tier.color})`,
                      boxShadow: activeTier === 2 ? `0 0 10px ${tier.color}` : "none",
                      opacity: isPlaying ? (0.5 + h * 0.5) : (0.2 + h * 0.35),
                      animation: isPlaying ? `pulse ${0.35 + (i % 5) * 0.08}s ease-in-out infinite alternate` : "none",
                    }}
                  />
                ))}
              </div>

              {/* Progress bar */}
              <div className="relative h-1 bg-white/[0.04] rounded-full mb-8 overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  if (!audioRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  audioRef.current.currentTime = pct * (audioRef.current.duration || 0);
                }}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-100"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${tier.color}, ${tier.colorActive})` }}
                />
                {/* Playhead dot */}
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progress}% - 6px)`, background: tier.colorActive, boxShadow: `0 0 8px ${tier.color}` }} />
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border"
                    style={{
                      background: isPlaying ? `linear-gradient(135deg, ${tier.colorActive}, rgba(0,0,0,0.6))` : "rgba(255,255,255,0.04)",
                      borderColor: isPlaying ? tier.colorActive : "rgba(255,255,255,0.08)",
                      boxShadow: isPlaying ? `0 0 24px ${tier.color}` : "none",
                    }}
                  >
                    {isPlaying ? <PauseSVG className="w-4 h-4 text-white" /> : <PlaySVG className="w-4 h-4 text-white/80" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{tier.label}</h3>
                      {activeTier === 2 && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-[--color-gold]/20 bg-[--color-gold]/[0.06] text-[--color-gold]">Studio</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">{tier.desc}</p>
                  </div>
                </div>
                <WaveformSVG className="w-5 h-5" color={tier.colorActive} />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-14 flex flex-wrap items-center justify-center gap-4">
            <a href="/dashboard" className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold">
              <img src={WIZSOUND_LOGO} alt="WizSound" aria-hidden="true" className="w-5 h-5 object-contain" />
              Start Creating
            </a>
            <a href="/products/wizsound" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[--color-gold-dark] hover:bg-[--color-gold]/[0.07] hover:text-[--color-gold] transition-all">
              Find Out More
              <ArrowSVG className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── WizLumina Demo ───────────────────────────────────────────────────────────
function WizLuminaDemo() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
    const onTouchMove = (e: TouchEvent) => { if (isDragging.current) handleMove(e.touches[0].clientX); };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleMove]);

  return (
    <section className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 reveal">
          <div className="flex items-center justify-center mb-5">
            <img src={WIZLUMINA_LOGO} alt="WizLumina" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(196,164,100,0.4)]"  loading="lazy" />
          </div>
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WizLumina™ — The Grading Suite</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-4">
            See the difference.
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-xl mx-auto">
            Raw AI footage is ungraded and visually inconsistent. WizLumina™ applies cinematic colour grading, HDR enhancement, and frame-level polish to every production — automatically. Drag to compare.
          </p>
        </div>

        <div className="reveal">
          {/* Before / After slider */}
          <div
            ref={containerRef}
            className="relative max-w-3xl mx-auto aspect-video rounded-2xl overflow-hidden border border-[--color-gold]/[0.08] cursor-ew-resize select-none"
            onMouseDown={(e) => { isDragging.current = true; handleMove(e.clientX); }}
            onTouchStart={(e) => { isDragging.current = true; handleMove(e.touches[0].clientX); }}
          >
            {/* "After" (full image, underneath) */}
            <div className="absolute inset-0">
              <img
                src={DEMO_POSTER}
                alt="After WizLumina enhancement"
                className="w-full h-full object-cover"
                style={{ filter: "contrast(1.2) saturate(1.35) brightness(1.1)" }}
                loading="lazy" width="1920" height="1080" />
              {/* Warm cinematic overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.06), transparent 60%)" }} />
            </div>

            {/* "Before" (clipped) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <img
                src={DEMO_POSTER}
                alt="Before WizLumina"
                className="w-full h-full object-cover"
                style={{ filter: "saturate(0.55) brightness(0.85) contrast(0.95)" }}
                loading="lazy" width="1920" height="1080" />
              {/* Desaturated overlay */}
              <div className="absolute inset-0 bg-black/05" />
            </div>

            {/* Slider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10 pointer-events-none"
              style={{ left: `${sliderPos}%`, boxShadow: "0 0 12px rgba(255,255,255,0.3)" }}
            >
              {/* Handle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-xl">
                <img src={WIZLUMINA_LOGO} alt="WizLumina" aria-hidden="true" className="w-5 h-5 object-contain opacity-80" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 z-20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">Before</span>
            </div>
            <div className="absolute top-4 right-4 z-20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[--color-gold] bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[--color-gold]/20">After WizLumina</span>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {["Cinematic Grading", "HDR Enhancement", "Frame Sharpening", "Colour Correction"].map((f) => (
              <span key={f} className="text-[11px] font-semibold tracking-wide text-[--color-silver-dark]/40 border border-[--color-gold]/[0.08] bg-[--color-gold]/[0.02] px-4 py-2 rounded-full">{f}</span>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="/onboarding" className="btn-primary btn-sheen inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm">
              <img src={WIZLUMINA_LOGO} alt="WizLumina" aria-hidden="true" className="w-4 h-4 object-contain" />
              Start Creating
            </a>
            <a href="/products/wizlumina" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] text-[--color-gold-dark] hover:bg-[--color-gold]/[0.08] hover:text-[--color-gold] transition-all">
              Find Out More
              <ArrowSVG className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Use Cases ────────────────────────────────────────────────────────────────
function UseCases() {
  const useCases = [
    {
      title: "For Musicians",
      desc: "Turn songs, lyrics and creative ideas into cinematic music video concepts, scenes and final video builds.",
      icon: "music",
      color: "from-violet-500/20 to-violet-600/5",
      borderColor: "border-violet-500/20",
    },
    {
      title: "For YouTubers",
      desc: "Create visual stories, shorts, thumbnails and animation ideas without complex editing software.",
      icon: "film",
      color: "from-blue-500/20 to-blue-600/5",
      borderColor: "border-blue-500/20",
    },
    {
      title: "For Brands",
      desc: "Produce campaign visuals, product videos and social content faster from one creative workspace.",
      icon: "brand",
      color: "from-amber-500/20 to-amber-600/5",
      borderColor: "border-amber-500/20",
    },
    {
      title: "For Storytellers",
      desc: "Transform prompts and scripts into animated scenes, cinematic visuals and platform-ready content.",
      icon: "story",
      color: "from-emerald-500/20 to-emerald-600/5",
      borderColor: "border-emerald-500/20",
    },
  ];
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Use cases</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            What creators can build with WIZ AI
          </h2>
          <p className="text-[--color-silver-dark]/45 text-base mt-4 max-w-2xl mx-auto">
            Explore example use cases for musicians, YouTubers, brands and storytellers. Real customer stories will be added once creators begin publishing with WIZ AI.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {useCases.map((uc) => (
            <div key={uc.title} className={`reveal rounded-2xl p-6 flex flex-col gap-4 border ${uc.borderColor} bg-gradient-to-b ${uc.color} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg`}>
              <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                {uc.icon === "music" && <WaveformSVG className="w-5 h-5 text-violet-400" />}
                {uc.icon === "film" && <PlaySVG className="w-5 h-5 text-blue-400" />}
                {uc.icon === "brand" && <StarSVG className="w-5 h-5 text-amber-400" />}
                {uc.icon === "story" && <ArrowSVG className="w-5 h-5 text-emerald-400" />}
              </span>
              <h3 className="text-white font-bold text-lg">{uc.title}</h3>
              <p className="text-[--color-silver]/55 text-sm leading-relaxed flex-1">{uc.desc}</p>
            </div>
          ))}
        </div>
        {/* Payment reassurance strip */}
        <div className="mt-14 reveal flex flex-wrap items-center justify-center gap-8 text-xs text-[--color-silver-dark]/35">
          <span className="flex items-center gap-2">
            <ShieldSVG className="w-4 h-4 text-[--color-gold]/40" />
            Secure payment via Stripe
          </span>
          <span className="w-px h-4 bg-[--color-gold]/10 hidden sm:block" />
          <span className="flex items-center gap-2">
            <CheckSVG className="w-4 h-4 text-[--color-gold]/40" />
            No credit card to start creating
          </span>
          <span className="w-px h-4 bg-[--color-gold]/10 hidden sm:block" />
          <span className="flex items-center gap-2">
            <StarSVG className="w-4 h-4 text-[--color-gold]/40" />
            Cancel anytime — no lock-in
          </span>
          <span className="w-px h-4 bg-[--color-gold]/10 hidden sm:block" />
          <span className="flex items-center gap-2">
            <GlobeSVG className="w-4 h-4 text-[--color-gold]/40" />
            Used by creators in 40+ countries
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Showcase ──────────────────────────────────────────────────────────────────
// Showcase card with hover-to-play video preview
function ShowcaseCard({ item }: { item: { id: number; title: string; category: string; posterUrl: string; description: string; videoUrl?: string | null } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && item.videoUrl) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="reveal group glass-card overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        {/* Poster image */}
        <img
          src={item.posterUrl}
          alt={item.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 brightness-[1.05] saturate-[1.1] ${
            isHovering && videoReady ? "opacity-0" : "opacity-100 group-hover:scale-105"
          }`}
          loading="lazy"
        />
        {/* Video preview (hover) */}
        {item.videoUrl && (
          <video
            ref={videoRef}
            src={item.videoUrl}
            muted
            loop
            playsInline
            preload="none"
            onCanPlay={() => setVideoReady(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              isHovering && videoReady ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {/* Play button overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isHovering ? "opacity-0" : "opacity-100"
        }`}>
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-[--color-gold]/30 flex items-center justify-center group-hover:bg-[--color-gold]/10 group-hover:border-[--color-gold]/50 transition-all duration-300">
            <PlaySVG className="w-5 h-5 text-[--color-gold] ml-0.5" />
          </div>
        </div>
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[--color-gold-dark] bg-black/70 backdrop-blur-sm border border-[--color-gold]/[0.15] px-2.5 py-1 rounded-full">
            {item.category}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
        <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed">{item.description}</p>
      </div>
      <div className="px-5 pb-5">
        <a href="/onboarding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[--color-gold-dark]/60 hover:text-[--color-gold] transition-colors">
          Start Creating <ArrowSVG className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function Showcase() {
  const { data: dbItems } = trpc.showcase.list.useQuery();
  const SC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
  const items = dbItems && dbItems.length > 0 ? dbItems : [
    { id: 30001, title: "Midnight City — Cinematic Style", category: "Cinematic AI Video", posterUrl: `${SC}/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp`, videoUrl: `${SC}/showcase-cinematic_13667434.mp4`, description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt in under three minutes." },
    { id: 30002, title: "Stage Performance — Music Video Style", category: "Music Video", posterUrl: `${SC}/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp`, videoUrl: `${SC}/showcase-music-video_19324f13.mp4`, description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created with WizVideo from an uploaded track." },
    { id: 30003, title: "Star Quest — Kids Channel Intro", category: "Animation", posterUrl: `${SC}/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp`, videoUrl: `${SC}/showcase-kids_d49d86f8.mp4`, description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description and theme prompt." },
    { id: 30004, title: "Cherry Blossom — Anime Style", category: "Anime", posterUrl: `${SC}/showcase-anime-gdkPWj4zZ3wPdwmswMeaY9.webp`, videoUrl: `${SC}/showcase-anime_36099b49.mp4`, description: "Fluid anime-style visuals with cherry blossom transitions. Generated entirely from a mood and colour palette prompt." },
  ];

  return (
    <section id="showcase" className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 reveal">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Created with WIZ AI</p>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
              See what's possible
            </h2>
          </div>
          <a href="/showcase" className="inline-flex items-center gap-2 text-sm font-semibold text-[--color-gold-dark] hover:text-[--color-gold] transition-colors">
            View all <ArrowSVG className="w-4 h-4" />
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.slice(0, 4).map((item) => (
            <ShowcaseCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Built For ─────────────────────────────────────────────────────────────────
function BuiltFor() {
  const audiences = [
    { title: "Musicians", desc: "Turn your track into a full music video — synced to lyrics, with animated characters and cinematic visuals.", cta: "Start with WizVideo", href: WIZVIDEO_STUDIO_PAGE, logo: WIZSOUND_LOGO, img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/creator-musicians-premium-8GZ9NuzqqusE8rZ27Tqrxm.webp" },
    { title: "Content Creators", desc: "Generate faceless YouTube videos, social shorts, and visual stories — no camera, no editing, no crew.", cta: "Start with WizScript", href: WIZSCRIPT_STUDIO_PAGE, logo: WIZCREATE_LOGO, img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/creator-content-premium-oEFftXPsMcVs8xZA9z88QR.webp" },
    { title: "Animators & Storytellers", desc: "Create cinematic 3D animations, anime, and visual stories from a single prompt.", cta: "Start with WizAnimate", href: WIZANIMATE_SEO_PAGE, logo: WIZANIMATE_LOGO, img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/creator-animator-premium-MLeuwBsaHxd9cindqxiXUp.webp" },
    { title: "YouTubers & Brands", desc: "Produce professional video content at scale — intros, explainers, and branded visuals, all AI-generated.", cta: "Start Creating", href: "/onboarding", logo: WIZCREATE_LOGO, img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/creator-youtuber-premium-gqHtiaHLuP258LeYjwzB7S.webp" },
  ];
  return (
    <section id="built-for" className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Who it's for</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            Built for Creators
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((a) => (
            <div key={a.title} className="reveal relative rounded-2xl overflow-hidden group cursor-pointer" style={{ border: '1px solid rgba(196,164,100,0.12)' }}>
              {/* Background image */}
              <div className="absolute inset-0">
                <img src={a.img} alt={a.title} className="w-full h-full object-cover brightness-[1.1] saturate-[1.1] transition-transform duration-700 group-hover:scale-105" loading="lazy" width="600" height="800" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.0) 100%)' }} />
              </div>
              {/* Content */}
              <div className="relative z-10 p-7 flex flex-col gap-4 min-h-[280px]">
                <div className="w-10 h-10 rounded-xl border border-[--color-gold]/20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <img src={(a as any).logo} alt="WIZ AI" aria-hidden="true" className="w-6 h-6 object-contain opacity-90" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-lg font-bold text-white mb-2">{a.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed mb-4">{a.desc}</p>
                  <a href={a.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[--color-gold-dark] hover:text-[--color-gold] transition-colors">
                    {a.cta} <ArrowSVG className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Feature Block ─────────────────────────────────────────────────────────────
function FeatureBlock() {
  const features = [
    {
      logo: WIZSOUND_LOGO,
      title: "AI Music Generation",
      desc: "Generate original songs, soundtracks, and audio from a text prompt. Choose genre, mood, tempo, and style — WizSound™ masters every track to professional-grade quality.",
      cta: "Generate a Song",
      href: WIZAUDIO_STUDIO_PAGE,
      badge: "WizSound™",
      gradient: "from-[#1a1408] to-[#0d0d0d]",
      borderGlow: "hover:border-[--color-gold]/30 hover:shadow-[0_0_40px_rgba(212,175,55,0.06)]",
    },
    {
      logo: WIZCREATE_LOGO,
      title: "Music Video Creation",
      desc: "Upload your track and WIZ AI builds a full music video — storyboard, scenes, characters, and cinematic visuals synced to every beat and lyric.",
      cta: "Create a Music Video",
      href: WIZVIDEO_STUDIO_PAGE,
      badge: "WizCreate™",
      gradient: "from-[#0d1018] to-[#0d0d0d]",
      borderGlow: "hover:border-blue-500/20 hover:shadow-[0_0_40px_rgba(59,130,246,0.04)]",
    },
    {
      logo: WIZAI_LOGO,
      title: "WizPilot Automation",
      desc: "Describe your idea once — WizPilot™ handles everything: storyboard, scenes, performance-sync, audio, build, and delivery. The complete AI music video pipeline in one click.",
      cta: "Try WizPilot",
      href: WIZPILOT_STUDIO_PAGE,
      badge: "WizPilot™",
      gradient: "from-[#0d1808] to-[#0d0d0d]",
      borderGlow: "hover:border-green-500/20 hover:shadow-[0_0_40px_rgba(34,197,94,0.04)]",
    },
  ];

  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">Purpose-built studios</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            Each studio is built for its format
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-2xl mx-auto mt-4">
            Not a general tool. Every WIZ AI studio is purpose-engineered for one creative format — so the output is always right.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className={`reveal group relative rounded-2xl border border-[--color-gold]/[0.08] bg-gradient-to-b ${f.gradient} p-8 flex flex-col gap-5 transition-all duration-500 ${f.borderGlow} cursor-pointer`}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl border border-[--color-gold]/15 bg-[--color-gold]/[0.04] flex items-center justify-center group-hover:bg-[--color-gold]/[0.08] transition-colors">
                <img src={(f as any).logo} alt={(f as any).badge ?? "WIZ AI"} className="w-9 h-9 object-contain" />
              </div>
              {/* Badge */}
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[--color-gold-dark] bg-[--color-gold]/[0.05] border border-[--color-gold]/[0.1] px-2.5 py-1 rounded-full w-fit">
                {f.badge}
              </span>
              <div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-[--color-silver-dark]/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
              <a
                href={f.href}
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[--color-gold-dark] hover:text-[--color-gold] transition-colors group-hover:gap-3"
              >
                {f.cta} <ArrowSVG className="w-4 h-4 transition-all" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── The WIZ AI Engine Ecosystem ──────────────────────────────────────────────
function WizVidEngineSection() {
  const engines = [
    {
      name: "WizCreate",
      tm: "™",
      tagline: "AI Storyboard & Scene Engine",
      desc: "Builds your full storyboard, generates every scene, and assembles the complete video from a single idea.",
      logoUrl: WIZCREATE_LOGO,
      href: WIZVIDEO_STUDIO_PAGE,
    },
    {
      name: "WizSound",
      tm: "™",
      tagline: "Studio-Grade Audio Engine",
      desc: "Enhances every audio track with richer depth, spatial clarity, and cinematic presence — from stereo widening to full mastering.",
      logoUrl: WIZSOUND_LOGO,
      href: "/products/wizsound",
    },
    {
      name: "WizLumina",
      tm: "™",
      tagline: "Film-Level Visual Engine",
      desc: "Applies cinematic colour grading, HDR tone mapping, and film-level polish to every frame automatically.",
      logoUrl: WIZLUMINA_LOGO,
      href: "/products/wizlumina",
    },
    {
      name: "WizPilot",
      tm: "™",
      tagline: "Full Automation Engine",
      desc: "Describe your idea once. WizPilot handles everything — storyboard, scenes, lip-sync, audio, build, and delivery.",
      logoUrl: WIZSYNC_LOGO,
      href: "/products/wizpilot",
    },
  ];
  return (
    <section className="relative bg-[#030303] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">The WIZ AI Engine</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-4">
            Four engines. One platform.
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-2xl mx-auto">
            WIZ AI combines four proprietary AI engines into a single seamless workflow — from idea to finished, cinema-ready video.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {engines.map((eng) => (
            <a
              key={eng.name}
              href={eng.href}
              className="reveal group relative rounded-2xl border border-[--color-gold]/[0.10] bg-gradient-to-b from-[#0d0d0d] to-[#080808] p-7 flex flex-col items-center text-center gap-4 hover:border-[--color-gold]/25 hover:-translate-y-1 transition-all duration-400 cursor-pointer"
            >
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: 'oklch(0.78 0.11 75 / 0.5)' }} />
                <img src={eng.logoUrl} alt={eng.name} className="relative w-14 h-14 object-contain"  loading="lazy" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-1">{eng.tagline}</p>
                <h3 className="text-base font-bold text-white">{eng.name}{eng.tm}</h3>
              </div>
              <p className="text-[--color-silver-dark]/45 text-xs leading-relaxed flex-1">{eng.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[--color-gold-dark] group-hover:text-[--color-gold] transition-colors">
                Learn more <ArrowSVG className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── See the Difference (Video + Audio Comparison) ────────────────────────────
// ── Tier data — each tier has audio BAKED INTO the video file ────────────────
// This is the only approach that works reliably across all browsers (Chrome, Safari, Firefox, mobile).
// A separate <audio> element gets blocked by autoplay policy on deployed sites.
const TIER_DATA = [
  {
    id: 0, label: "Original",
    desc: "Raw source — no processing applied",
    videoSrc: "/manus-storage/tier-original-fixed_d48f8ad2.mp4",
    accentColor: "rgba(160,160,170,0.7)", borderColor: "rgba(255,255,255,0.08)",
    glowRgb: "160,160,170",
  },
  {
    id: 1, label: "WizSound Enhance",
    desc: "Richer, warmer sound with enhanced presence",
    videoSrc: "/manus-storage/tier-enhanced-fixed_40ffc50a.mp4",
    accentColor: "rgba(196,164,100,0.85)", borderColor: "rgba(196,164,100,0.2)",
    glowRgb: "196,164,100",
  },
  {
    id: 2, label: "WizSound Cinematic",
    desc: "Deep bass, spatial immersion — full cinema experience",
    videoSrc: "/manus-storage/tier-cinematic-new_ee006f72.mp4",
    accentColor: "rgba(212,175,55,0.95)", borderColor: "rgba(212,175,55,0.3)",
    glowRgb: "212,175,55",
  },
];

// Clear visual progression — Original is flat/dull, Enhanced is clean, Cinematic is rich
const VIDEO_FILTERS = [
  "brightness(0.82) saturate(0.65) contrast(0.88)",               // Original: flat, desaturated, dull
  "brightness(1.0) saturate(1.2) contrast(1.1)",                  // Enhanced: clean, sharp, better colour
  "brightness(1.06) saturate(1.5) contrast(1.22) sepia(0.14) hue-rotate(-6deg)",  // Cinematic: rich, warm, deep
];

function SeeTheDifference() {
  const [activeTier, setActiveTier] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  // One ref per tier — audio is baked into each video file.
  // This is the ONLY approach that works reliably on all browsers (Chrome, Safari, Firefox, mobile).
  // A separate <audio> element gets silently blocked by browser autoplay policy on deployed sites.
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);
  const rafRef = useRef<number | null>(null);
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const { variant: ctaVariant, trackImpression: trackCtaImpression, trackClick: trackCtaClick } = useExperiment("CINEMATIC_CTA");

  useEffect(() => {
    const el = ctaSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { trackCtaImpression(); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trackCtaImpression]);

  const tier = TIER_DATA[activeTier];
  const activeVideo = () => videoRefs.current[activeTier];

  // RAF-based progress tracking
  const tickProgress = useCallback(() => {
    const v = videoRefs.current[activeTier];
    if (v && v.duration) {
      setCurrentTime(v.currentTime);
      setProgress((v.currentTime / v.duration) * 100);
    }
    rafRef.current = requestAnimationFrame(tickProgress);
  }, [activeTier]);

  const stopRaf = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  useEffect(() => () => { stopRaf(); }, [stopRaf]);

  // Mute all videos on mount so the browser can load them without autoplay blocking.
  // We unmute imperatively in togglePlay() within the user gesture tick.
  useEffect(() => {
    videoRefs.current.forEach(v => {
      if (v) { v.muted = true; v.volume = 0.8; }
    });
  }, []);

  // Sync volume/mute to all video elements
  useEffect(() => {
    videoRefs.current.forEach(v => {
      if (v) v.volume = isMuted ? 0 : volume;
    });
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    const v = activeVideo();
    if (!v) return;
    if (isPlaying) {
      v.pause();
      stopRaf();
      setIsPlaying(false);
    } else {
      // Imperatively set muted=false and volume BEFORE calling play().
      // We do NOT rely on React's muted prop here — React batches state updates
      // and would apply them after this handler returns, which is too late.
      v.muted = false;
      v.volume = isMuted ? 0 : volume;
      v.play().catch((err) => console.warn('[WizSound] play blocked:', err));
      rafRef.current = requestAnimationFrame(tickProgress);
      setIsPlaying(true);
      setHasStarted(true);
    }
  }, [isPlaying, volume, isMuted, tickProgress, stopRaf, activeTier]);

  // Tier switch: pause current, seek new to same position, resume if playing
  const handleTierSwitch = useCallback((id: number) => {
    if (id === activeTier) return;
    const current = videoRefs.current[activeTier];
    const next = videoRefs.current[id];
    const savedTime = current?.currentTime ?? 0;
    const wasPlaying = isPlaying;
    if (current) current.pause();
    setActiveTier(id);
    if (!next) return;
    next.muted = false;
    next.volume = isMuted ? 0 : volume;
    // Seek to same position in the new tier video
    if (next.duration) {
      next.currentTime = savedTime % next.duration;
    }
    if (wasPlaying) {
      next.play().catch(() => {});
    }
  }, [activeTier, isPlaying, volume, isMuted]);

  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = activeVideo();
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * v.duration;
    v.currentTime = newTime;
    setProgress(pct * 100);
    setCurrentTime(newTime);
  }, [activeTier]);

  const handleVideoLoaded = useCallback((idx: number) => {
    if (idx === activeTier) {
      const v = videoRefs.current[idx];
      if (v) setDuration(v.duration || 0);
    }
  }, [activeTier]);

  const handleVideoEnded = useCallback(() => {
    stopRaf();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, [stopRaf]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <section className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full transition-all duration-700"
          style={{ background: `radial-gradient(circle, rgba(${tier.glowRgb},0.04) 0%, transparent 70%)` }} />
      </div>

      {/* Three video elements — one per tier, each with audio baked in.
           Only the active tier is visible; others are hidden but preloaded. */}

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-14 reveal">
          <div className="inline-flex items-center gap-4 mb-6 px-6 py-3 rounded-full border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <img src={WIZSOUND_LOGO} alt="WizSound" className="h-8 w-auto" loading="lazy" />
              <span className="text-xs font-bold text-white/50">WizSound™</span>
            </div>
            <span className="text-white/15 text-base">+</span>
            <div className="flex items-center gap-2">
              <img src={WIZLUMINA_LOGO} alt="WizLumina" className="h-8 w-8 object-contain" loading="lazy" />
              <span className="text-xs font-bold text-white/50">WizLumina™</span>
            </div>
          </div>
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">The Cinematic Difference</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white mb-4">
            Original. Enhanced. <span className="metallic-gold">Cinematic.</span>
          </h2>
          <p className="text-[--color-silver-dark]/50 text-base max-w-2xl mx-auto">
            Press play once, then switch between <strong className="text-white/70">Original</strong>, <strong className="text-white/70">Enhanced</strong>, and <strong className="text-white/70">Cinematic</strong> — same track, same moment, instantly transformed.
          </p>
        </div>

        <div className="reveal">
          {/* Tier selector */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              {TIER_DATA.map((t) => (
                <button
                  key={t.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTierSwitch(t.id); }}
                  className={`relative px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeTier === t.id
                      ? t.id === 2
                        ? "bg-gradient-to-r from-[--color-gold]/15 to-[--color-gold]/5 text-[--color-gold] shadow-[0_0_24px_rgba(212,175,55,0.12)]"
                        : t.id === 1
                          ? "bg-white/[0.07] text-[--color-gold-dark]"
                          : "bg-white/[0.05] text-white/75"
                      : "text-white/25 hover:text-white/50"
                  }`}
                  style={activeTier === t.id ? { boxShadow: `0 0 20px rgba(${t.glowRgb},0.08)` } : {}}
                >
                  {t.id === 2 && activeTier === 2 && (
                    <span className="absolute -top-2 -right-1 text-[8px] font-black uppercase tracking-widest text-[--color-gold] bg-[--color-gold]/10 border border-[--color-gold]/20 px-1.5 py-0.5 rounded-full">Best</span>
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier label + description */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              {activeTier > 0 && <img src={WIZSOUND_LOGO} alt="" className="h-5 w-auto opacity-70" loading="lazy" />}
              <p className="text-base font-bold text-white">{tier.label}</p>
            </div>
            <p className="text-sm text-[--color-silver-dark]/40">{tier.desc}</p>
          </div>

          {/* Single unified video player */}
          <div className="relative rounded-2xl overflow-hidden border transition-all duration-700 mb-3"
            style={{ borderColor: tier.borderColor, boxShadow: `0 0 40px rgba(${tier.glowRgb},0.08)` }}>
            {activeTier === 2 && (
              <div className="absolute -inset-px rounded-2xl pointer-events-none z-0"
                style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.06), transparent 50%, rgba(212,175,55,0.03))" }} />
            )}
            <div className="relative z-10 aspect-video bg-black">
              {TIER_DATA.map((t, idx) => (
                <video
                  key={t.id}
                  ref={(el) => { videoRefs.current[idx] = el; }}
                  src={t.videoSrc}
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                  style={{
                    filter: VIDEO_FILTERS[idx],
                    opacity: activeTier === idx ? 1 : 0,
                    pointerEvents: activeTier === idx ? "auto" : "none",
                  }}
                  playsInline
                  loop
                  preload={idx === 0 ? "auto" : "metadata"}
                  onLoadedMetadata={() => handleVideoLoaded(idx)}
                  onEnded={handleVideoEnded}
                />
              ))}

              {/* Tier badge top-left */}
              <div className="absolute top-4 left-4 z-20">
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-500"
                  style={{
                    color: activeTier === 2 ? "var(--color-gold)" : activeTier === 1 ? "rgba(196,164,100,0.9)" : "rgba(200,200,210,0.7)",
                    borderColor: `rgba(${tier.glowRgb},0.3)`,
                    background: "rgba(0,0,0,0.65)",
                  }}
                >{tier.label}</span>
              </div>

              {/* Audio + Visual badges top-right */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 transition-all duration-500"
                  style={{ background: "rgba(0,0,0,0.65)", color: tier.accentColor, border: `1px solid rgba(${tier.glowRgb},0.2)` }}>
                  <img src={WIZSOUND_LOGO} alt="" className="w-3 h-3 object-contain opacity-80" />
                  {activeTier === 0 ? "Original Audio" : activeTier === 1 ? "Enhanced Audio" : "Spatial Audio"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 transition-all duration-500"
                  style={{ background: "rgba(0,0,0,0.65)", color: tier.accentColor, border: `1px solid rgba(${tier.glowRgb},0.2)` }}>
                  <img src={WIZLUMINA_LOGO} alt="" className="w-3 h-3 object-contain opacity-80" />
                  {activeTier === 0 ? "Original Video" : activeTier === 1 ? "Enhanced Video" : "HDR Video"}
                </span>
              </div>

              {/* Play overlay — shown before first play */}
              {!hasStarted && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10">
                    <button
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-105"
                      style={{ borderColor: tier.accentColor, background: `rgba(${tier.glowRgb},0.2)`, boxShadow: `0 0 40px rgba(${tier.glowRgb},0.3)` }}
                      onClick={togglePlay}
                    >
                      <PlaySVG className="w-7 h-7 text-white" />
                    </button>
                    <span className="text-xs text-white/70 font-semibold tracking-wide">Press play — then switch tiers to hear &amp; see the difference</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player controls bar */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 mb-6">

            {/* Scrubber */}
            <div
              className="relative h-2 bg-white/[0.06] rounded-full mb-4 cursor-pointer group"
              onClick={handleScrub}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-100"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, rgba(${tier.glowRgb},0.6), rgba(${tier.glowRgb},1))` }}
              />
              {/* Playhead thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 8px)`, background: tier.accentColor, borderColor: "white" }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 flex-shrink-0"
                style={{
                  background: isPlaying ? `rgba(${tier.glowRgb},0.15)` : "rgba(255,255,255,0.04)",
                  borderColor: isPlaying ? `rgba(${tier.glowRgb},0.5)` : "rgba(255,255,255,0.08)",
                  boxShadow: isPlaying ? `0 0 20px rgba(${tier.glowRgb},0.2)` : "none",
                }}
              >
                {isPlaying ? <PauseSVG className="w-4 h-4 text-white" /> : <PlaySVG className="w-4 h-4 text-white/80" />}
              </button>

              {/* Time */}
              <span className="text-[11px] font-mono text-white/30 flex-shrink-0 w-16">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: tier.accentColor }}
                />
              </div>

              {/* Waveform icon */}
              <WaveformSVG className="w-5 h-5 flex-shrink-0" color={tier.accentColor} />
            </div>
          </div>

          {/* Feature comparison — Audio + Visual side by side below video */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* WizSound card */}
            <div className="rounded-xl border bg-[#080808]/80 p-5 transition-all duration-500" style={{ borderColor: tier.borderColor }}>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={WIZSOUND_LOGO} alt="WizSound" className="h-7 w-auto" loading="lazy" />
                <div>
                  <p className="text-xs font-bold text-white">WizSound™</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: tier.accentColor }}>Audio</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {(activeTier === 0
                  ? ["Flat, dry, unprocessed audio", "Mono — no stereo width", "Raw AI output"]
                  : activeTier === 1
                    ? ["Stereo widening + natural reverb", "EQ mastered — broadcast-ready", "Light strings added for warmth"]
                    : ["Full orchestra — strings, horns, choir", "Deep sub-bass + spatial 3D mastering", "Studio-grade cinematic mix"]
                ).map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckSVG className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: tier.accentColor }} />
                    <span className="text-xs text-white/55">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* WizLumina card */}
            <div className="rounded-xl border bg-[#080808]/80 p-5 transition-all duration-500" style={{ borderColor: tier.borderColor }}>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={WIZLUMINA_LOGO} alt="WizLumina" className="h-7 w-7 object-contain" loading="lazy" />
                <div>
                  <p className="text-xs font-bold text-white">WizLumina™</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: tier.accentColor }}>Visual</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {(activeTier === 0
                  ? ["Original AI output", "Flat, ungraded colour", "Basic resolution"]
                  : activeTier === 1
                    ? ["Colour correction + sharpening", "Contrast optimisation", "Frame-level enhancement"]
                    : ["HDR grading + film-level polish", "Cinematic colour science", "4K visual finishing"]
                ).map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <CheckSVG className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: tier.accentColor }} />
                    <span className="text-xs text-white/55">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cinematic Pack includes row */}
          {activeTier === 2 && (
            <div className="rounded-xl border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] px-6 py-4 mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <span className="text-[--color-gold] font-semibold">Cinematic Pack includes:</span>
              <span className="text-white/50">4K Resolution</span>
              <span className="text-white/20">+</span>
              <span className="text-white/50">WizSound™ Spatial</span>
              <span className="text-white/20">+</span>
              <span className="text-white/50">WizLumina™ HDR</span>
              <span className="text-white/20">+</span>
              <span className="text-white/50">Priority Build</span>
              <span className="text-[--color-gold] font-bold ml-2">£7 per video</span>
            </div>
          )}

          {/* CTA — A/B tested */}
          <div className="text-center" ref={ctaSectionRef}>
            {/* Control: original gold button */}
            {ctaVariant === "control" && (
              <a
                href="/subscribe#cinematic"
                className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm"
                onClick={trackCtaClick}
              >
                <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" />
                Upgrade to Cinematic Mode
              </a>
            )}
            {/* Variant B: urgency copy */}
            {ctaVariant === "variant_b" && (
              <a
                href="/subscribe#cinematic"
                className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm"
                onClick={trackCtaClick}
              >
                <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" />
                Unlock Cinematic Quality — Limited Offer
              </a>
            )}
            {/* Variant C: social proof copy */}
            {ctaVariant === "variant_c" && (
              <a
                href="/subscribe#cinematic"
                className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm"
                onClick={trackCtaClick}
              >
                <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" />
                Join Creators Going Cinematic
              </a>
            )}
            <p className="text-xs text-[--color-silver-dark]/30 mt-3">WizSound™ + WizLumina™ Cinematic bundle — included in every build upgrade</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative bg-[#040404] py-32 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.28] pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.72 0.14 70), transparent 70%)" }} />
      <div className="relative z-10 max-w-3xl mx-auto text-center reveal">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] mb-8">
          <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-3.5 h-3.5 object-contain" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">No credit card required</span>
        </div>
        <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black tracking-tight text-white mb-6 leading-tight">
          Your next creation<br />
          <span className="metallic-gold">starts here.</span>
        </h2>
        <p className="text-[--color-silver-dark]/50 text-lg mb-10 leading-relaxed">
          Join creators worldwide producing professional audio, video, and animation with WIZ AI. Create free. Pay only when you build your final video.
        </p>
        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <a
            href="/onboarding"
            className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-base w-full sm:w-auto justify-center"
          >
            <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-5 h-5 object-contain" />
            Create Your First AI Video
          </a>
          <a
            href={WIZAUDIO_STUDIO_PAGE}
            className="btn-secondary inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-base w-full sm:w-auto justify-center"
          >
            <img src={WIZSOUND_LOGO} alt="WizSound" aria-hidden="true" className="w-5 h-5 object-contain" />
            Generate Your First Song
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 mt-6">
          <a href="/pricing" className="inline-flex items-center gap-2 text-sm text-[--color-silver-dark]/40 hover:text-[--color-silver] transition-colors font-medium">
            View Pricing <ArrowSVG className="w-4 h-4" />
          </a>
          <span className="w-px h-3 bg-[--color-gold]/10" />
          <span className="text-xs text-[--color-silver-dark]/25">2 free videos included. Cancel anytime.</span>
        </div>
      </div>
    </section>
  );
}

// ── Demo Video Gallery ──────────────────────────────────────────────────────────
const _SC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const DEMO_VIDEOS = [
  {
    key: "music-video",
    title: "Stage Performance — Music Video Style",
    badge: "WizVideo",
    badgeColor: "#7C3AED",
    description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created with WizVideo from an uploaded track.",
    posterUrl: `${_SC}/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp`,
    videoUrl: `${_SC}/showcase-music-video_19324f13.mp4` as string | null,
  },
  {
    key: "scene",
    title: "Midnight City — Cinematic Style",
    badge: "WizCreate",
    badgeColor: "oklch(0.72 0.14 70)",
    description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt in under three minutes.",
    posterUrl: `${_SC}/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp`,
    videoUrl: `${_SC}/showcase-cinematic_13667434.mp4` as string | null,
  },
  {
    key: "kids",
    title: "Star Quest — Kids Channel Intro",
    badge: "WizAnimate",
    badgeColor: "#0EA5E9",
    description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description and theme prompt.",
    posterUrl: `${_SC}/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp`,
    videoUrl: `${_SC}/showcase-kids_d49d86f8.mp4` as string | null,
  },
];

function DemoVideoGallery() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <section className="relative bg-[#040404] py-28 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full opacity-[0.18] pointer-events-none" style={{ background: "radial-gradient(ellipse, oklch(0.72 0.14 70), transparent 70%)" }} />
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] mb-6">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">Example outputs</span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-black tracking-tight text-white mb-4">
            See what WIZ AI can create
          </h2>
          <p className="text-[--color-silver-dark]/40 text-lg max-w-2xl mx-auto">
            Explore example outputs from the WIZ AI creative workflow — from cinematic music videos and animated scenes to AI presenter and lip-sync demos. These examples show the type of visual content creators can build with WIZ AI.
          </p>
        </div>

        {/* Video cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {DEMO_VIDEOS.map((v) => (
            <div key={v.key} className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-all duration-300 reveal">
              {/* Thumbnail / video */}
              <div className="relative aspect-video bg-black">
                {activeVideo === v.key && v.videoUrl ? (
                  <video
                    src={v.videoUrl}
                    poster={v.posterUrl}
                    autoPlay
                    controls
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <button
                    onClick={() => v.videoUrl ? setActiveVideo(v.key) : undefined}
                    className="absolute inset-0 w-full h-full group/play cursor-default"
                    aria-label={v.videoUrl ? `Play ${v.title}` : `${v.title} — coming soon`}
                    disabled={!v.videoUrl}
                  >
                    {/* Poster image */}
                    <img
                      src={v.posterUrl}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover/play:scale-105 transition-transform duration-500"
                      loading="lazy"
                      width="1280"
                      height="720"
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/25 group-hover/play:bg-black/15 transition-colors duration-300" />
                    {/* Play / coming soon indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {v.videoUrl ? (
                        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover/play:scale-110 group-hover/play:bg-white/20 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      ) : (
                        <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/50 text-xs font-medium tracking-wide">
                          Demo coming soon
                        </div>
                      )}
                    </div>
                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full text-white" style={{ background: v.badgeColor + "33", border: `1px solid ${v.badgeColor}55` }}>
                        {v.badge}
                      </span>
                    </div>
                  </button>
                )}
              </div>
              {/* Info */}
              <div className="p-5">
                <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{v.title}</h3>
                <p className="text-[--color-silver-dark]/35 text-xs leading-relaxed">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative bg-[#030303] py-16 px-6">
      <div className="luxury-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.6rem] w-auto object-contain mb-5 drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]"  loading="lazy" />
            <p className="text-[--color-silver-dark]/40 text-sm leading-relaxed mb-5 max-w-xs">
              The premium creative intelligence platform. Create audio, images, video, shorts, animation, and text-to-video — instantly.
            </p>
            <a href="mailto:support@wiz-ai.io" className="text-[--color-silver-dark]/30 text-xs hover:text-[--color-gold-dark] transition-colors">
              support@wiz-ai.io
            </a>
          </div>
          {/* Products — creation tools only */}
          <div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Products</h4>
            <div className="flex flex-col gap-3 mb-6">
              {PRODUCTS_CREATE.map((p) => (
                <a key={p.name} href={p.href} className="text-sm text-[--color-silver-dark]/40 hover:text-[--color-gold] transition-colors font-medium">{p.name}</a>
              ))}
            </div>
            <h4 className="text-[--color-gold-dark]/40 text-[10px] font-bold uppercase tracking-widest mb-4">Engines</h4>
            <div className="flex flex-col gap-3">
              {[...PRODUCTS_ENHANCE, ...PRODUCTS_GROW].map((p) => (
                <a key={p.name} href={p.href} className="text-sm text-[--color-silver-dark]/30 hover:text-[--color-gold-dark] transition-colors font-medium">{p.name}</a>
              ))}
            </div>
          </div>
          {/* Platform */}
          <div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Platform</h4>
            <div className="flex flex-col gap-3">
              {[
                { label: "How It Works", href: "/#how-it-works" },
                { label: "Showcase", href: "/#showcase" },
                { label: "For Creators", href: "/#built-for" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          {/* Support / Legal */}
          <div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Support</h4>
            <div className="flex flex-col gap-3 mb-8">
              <a href="/help" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Help Centre</a>
              <a href="mailto:support@wiz-ai.io" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Contact</a>
            </div>
            <h4 className="text-[--color-gold-dark]/60 text-xs font-bold uppercase tracking-widest mb-5">Legal</h4>
            <div className="flex flex-col gap-3">
              <a href="/privacy" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Terms of Service</a>
              <a href="/refunds" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Refund Policy</a>
              <a href="/cookie-policy" className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors">Cookie Policy</a>
              <button onClick={() => window.dispatchEvent(new CustomEvent('wiz:open-cookie-settings'))} className="text-[--color-silver-dark]/35 text-sm hover:text-[--color-gold-dark] transition-colors text-left bg-transparent border-0 p-0 cursor-pointer">Cookie Settings</button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[--color-gold]/[0.05] pt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[--color-silver-dark]/25 mr-1">Secure payments via</span>
            {[
              { name: "Visa", svg: <svg viewBox="0 0 38 24" className="h-5 w-auto"><rect width="38" height="24" rx="4" fill="#1A1F71"/><text x="19" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">VISA</text></svg> },
              { name: "Mastercard", svg: <svg viewBox="0 0 38 24" className="h-5 w-auto"><rect width="38" height="24" rx="4" fill="#252525"/><circle cx="14" cy="12" r="7" fill="#EB001B"/><circle cx="24" cy="12" r="7" fill="#F79E1B"/><path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#FF5F00"/></svg> },
              { name: "Amex", svg: <svg viewBox="0 0 38 24" className="h-5 w-auto"><rect width="38" height="24" rx="4" fill="#2E77BC"/><text x="19" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">AMERICAN EXPRESS</text></svg> },
              { name: "Apple Pay", svg: <svg viewBox="0 0 38 24" className="h-5 w-auto"><rect width="38" height="24" rx="4" fill="#000"/><text x="19" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="500" fontFamily="-apple-system,sans-serif"> Pay</text></svg> },
              { name: "Google Pay", svg: <svg viewBox="0 0 38 24" className="h-5 w-auto"><rect width="38" height="24" rx="4" fill="#fff"/><text x="19" y="16" textAnchor="middle" fill="#3c4043" fontSize="7" fontWeight="500" fontFamily="Arial">Google Pay</text></svg> },
            ].map((m) => (
              <span key={m.name} className="flex items-center justify-center border border-[--color-gold]/[0.08] bg-[--color-gold]/[0.02] px-2 py-1 rounded-md" title={m.name}>{m.svg}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[--color-silver-dark]/25">
            <p>&copy; 2026 WIZ AI. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</a>
              <a href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</a>
              <a href="/cookie-policy" className="hover:text-[--color-gold-dark] transition-colors">Cookie Policy</a>
              <button onClick={() => window.dispatchEvent(new CustomEvent('wiz:open-cookie-settings'))} className="hover:text-[--color-gold-dark] transition-colors bg-transparent border-0 p-0 cursor-pointer">Cookie Settings</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Sticky Mobile CTA Bar ────────────────────────────────────────────────────
function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('[data-section="hero"]') as HTMLElement | null;
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!dismissed) setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [dismissed]);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[--color-gold]/[0.12] px-4 py-3 flex items-center gap-3 shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
        <a
          href="/onboarding"
          className="flex-1 btn-primary btn-sheen inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
          onClick={() => mp.startCreatingClicked?.("sticky_mobile_cta")}
        >
          <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" />
          Create Your First Video — Free
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[--color-silver-dark]/40 hover:text-[--color-silver] transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
        </button>
      </div>
    </div>
  );
}

// ── Continue Project Banner ────────────────────────────────────────────────────
function ContinueProjectBanner() {
  const { resumeData, showResume } = useProjectResume();
  if (!showResume || !resumeData) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full mx-4">
      <div className="bg-[#0a0a0a] border border-[--color-gold]/[0.1] rounded-2xl px-5 py-4 shadow-[0_16px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[--color-silver-dark]/40 mb-0.5">Continue where you left off</p>
          <p className="text-sm font-semibold text-white truncate">{resumeData.title || "Untitled project"}</p>
        </div>
        <a href="/dashboard" className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-[--color-gold] hover:text-[--color-gold-light] transition-colors">
          Continue <ArrowSVG className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  useSEO({ title: "WIZ AI — The AI Creative Studio", path: "/", description: "WIZ AI is the world’s first AI creative studio. Music videos, animation, original scores, and cinematic visuals — produced to a professional standard from a single brief. Nine specialised AI studios. One unified production environment." });
  useReveal();
  useEffect(() => { mp.homepageViewed(); }, []);
  return (
    <div className="bg-[#030303] text-white min-h-screen overflow-x-hidden">

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>
      <Nav />
      {/* DEPLOYMENT VERIFICATION — remove after confirming live site updates */}
      <div id="build-version" style={{position:'fixed',top:0,left:0,right:0,zIndex:99999,background:'#ff0000',color:'#ffffff',textAlign:'center',padding:'8px 0',fontSize:'14px',fontWeight:'bold',letterSpacing:'0.05em',fontFamily:'monospace'}}>⚡ BUILD VERSION: 06:03-29Apr-audio-fix ⚡ — if you see this, deployment is working</div>
      <div style={{height:'36px'}} />
      <main id="main-content">
        <Hero />
        <ProductGrid />
        <WelcomeSection />
        <WhyWizAI />
        <WizSoundDemo />
        <WizLuminaDemo />
        <WizEngines />
        <HowItWorks />
        <Showcase />
        <BuiltFor />
        <FeatureBlock />
        <SeeTheDifference />
        <FinalCTA />
      </main>
      <Footer />
      <ContinueProjectBanner />
      <StickyMobileCTA />
    </div>
  );
}
// audio fix Wed Apr 29 01:03:27 EDT 2026
