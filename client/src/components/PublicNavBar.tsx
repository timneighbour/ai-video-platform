// ─────────────────────────────────────────────────────────────────────────────
// PublicNavBar — single source of truth for all public-facing page nav bars.
// Import as: import PublicNavBar from "@/components/PublicNavBar";
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import React from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { WIZANIMATE_PRODUCT_PAGE } from "@/lib/routes";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
} from "@/components/WizProductEmblems";

// ── SVG helpers ───────────────────────────────────────────────────────────────
const ChevronDownSVG = ({ className = "w-4 h-4", open = false, style }: { className?: string; open?: boolean; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={open ? "4 10 8 6 12 10" : "4 6 8 10 12 6"} />
  </svg>
);

const ArrowSVG = ({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

// ── CDN & Logo constants ──────────────────────────────────────────────────────
const CDN = "/manus-storage";
const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ff33f09f_72ea7f44.webp";
const WIZSOUND_LOGO = `/manus-storage/wizsound-logo-new_c5cced65.png`;
const WIZLUMINA_LOGO = `/manus-storage/wizlumina-logo-new_0709f3c5.png`;
const WIZBOOST_LOGO = `/manus-storage/wizboost-logo-new_93f2b48b.png`;
const WIZCREATE_LOGO = `/manus-storage/wizcreate-logo-new_85a25756.png`;
const WIZANIMATE_LOGO = `/manus-storage/wizanimate-logo-new_a84f9808.png`;
const WIZSYNC_LOGO = `/manus-storage/wizsync-logo-new_9563f007.png`;
const WIZGENESIS_LOGO = `/manus-storage/wizgenesis-logo-new_9814b3d1.png`;

// ── Products — categorised by purpose ────────────────────────────────────────
const PRODUCTS_CREATE = [
  {
    name: "WizVideo",
    tagline: "AI Music Video Generator",
    icon: <WizVideoEmblem size={32} />,
    href: "/music-video",
    glowColor: "oklch(0.70 0.18 260)",
    bgGradient: "linear-gradient(135deg, oklch(0.22 0.08 260 / 0.9) 0%, oklch(0.16 0.06 260 / 0.95) 100%)",
    borderColor: "oklch(0.70 0.18 260 / 0.35)",
  },
  {
    name: "WizAnimate",
    tagline: "AI Character Animation",
    icon: <WizAnimateEmblem size={32} />,
    href: WIZANIMATE_PRODUCT_PAGE,
    glowColor: "oklch(0.68 0.18 330)",
    bgGradient: "linear-gradient(135deg, oklch(0.24 0.08 330 / 0.9) 0%, oklch(0.17 0.06 330 / 0.95) 100%)",
    borderColor: "oklch(0.68 0.18 330 / 0.35)",
  },
  {
    name: "WizScript",
    tagline: "AI Script & Storyboard Builder",
    icon: <WizScriptEmblem size={32} />,
    href: "/products/wizscript",
    glowColor: "oklch(0.75 0.16 200)",
    bgGradient: "linear-gradient(135deg, oklch(0.24 0.08 200 / 0.9) 0%, oklch(0.17 0.06 200 / 0.95) 100%)",
    borderColor: "oklch(0.75 0.16 200 / 0.35)",
  },
  {
    name: "WizImage",
    tagline: "AI Image & Artwork Creator",
    icon: <WizImageEmblem size={32} />,
    href: "/products/wizimage",
    glowColor: "oklch(0.78 0.11 75)",
    bgGradient: "linear-gradient(135deg, oklch(0.28 0.08 75 / 0.9) 0%, oklch(0.20 0.06 75 / 0.95) 100%)",
    borderColor: "oklch(0.78 0.11 75 / 0.35)",
  },
  {
    name: "WizSound™",
    tagline: "AI Music & Audio Studio",
    icon: <WizAudioEmblem size={32} />,
    href: "/products/wizsound",
    glowColor: "oklch(0.72 0.18 160)",
    bgGradient: "linear-gradient(135deg, oklch(0.25 0.06 160 / 0.9) 0%, oklch(0.18 0.04 160 / 0.95) 100%)",
    borderColor: "oklch(0.72 0.18 160 / 0.35)",
  },
  {
    name: "WizShorts",
    tagline: "AI Short-Form Video Creator",
    icon: <WizShortsEmblem size={32} />,
    href: "/products/wizshorts",
    glowColor: "oklch(0.72 0.18 30)",
    bgGradient: "linear-gradient(135deg, oklch(0.28 0.10 30 / 0.9) 0%, oklch(0.20 0.07 30 / 0.95) 100%)",
    borderColor: "oklch(0.72 0.18 30 / 0.35)",
  },
];

const PRODUCTS_ENHANCE = [
  { name: "WizSound", tagline: "Premium Audio Engine", href: "/products/wizsound", logo: WIZSOUND_LOGO, glowColor: "oklch(0.72 0.18 160)" },
  { name: "WizLumina", tagline: "Visual Enhancement Engine", href: "/products/wizlumina", logo: WIZLUMINA_LOGO, glowColor: "oklch(0.78 0.11 75)" },
];

const PRODUCTS_GROW = [
  { name: "WizBoost", tagline: "Output Optimisation Engine", href: "/products/wizboost", logo: WIZBOOST_LOGO, glowColor: "oklch(0.70 0.18 260)" },
];

// ── Technology — proprietary intelligence stack ───────────────────────────────
const WIZ_TECHNOLOGY_CORE = [
  { name: "WizGenesis", tagline: "Creative Intelligence", desc: "Creative planning, prompt expansion and storyboard intelligence.", href: "/technology/wizgenesis", logo: WIZGENESIS_LOGO },
  { name: "WizSound", tagline: "Audio Engine", desc: "Audio enhancement, clarity, depth and cinematic mastering.", href: "/technology/wizsound", logo: WIZSOUND_LOGO },
  { name: "WizLumina", tagline: "Visual Engine", desc: "Cinematic visual polish, colour, contrast and finishing.", href: "/technology/wizlumina", logo: WIZLUMINA_LOGO },
  { name: "WizBoost", tagline: "Optimisation Engine", desc: "Optimisation for quality, speed and platform-ready delivery.", href: "/technology/wizboost", logo: WIZBOOST_LOGO },
];
const WIZ_TECHNOLOGY_ADVANCED = [
  { name: "WizSync", tagline: "Sync & Alignment", desc: "Lip-sync, timing and performer alignment tools.", href: "/technology/wizsync", logo: WIZSYNC_LOGO },
  { name: "WizScore", tagline: "Quality Scoring", desc: "Quality checks and improvement scoring before final output.", href: "/technology/wizscore", logo: WIZSOUND_LOGO },
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
                Products
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
                      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/60">Proprietary Intelligence Stack</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: "oklch(0.78 0.11 75 / 0.08)", color: "oklch(0.78 0.11 75 / 0.5)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>7 Engines</span>
                  </div>

                  {/* Core engines */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mb-2 px-1">Technology</p>
                    <div className="grid grid-cols-2 gap-1">
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
                            <p className="text-[10.5px] font-semibold text-[--color-gold-dark]/50 mt-0.5 leading-tight group-hover:text-[--color-gold-dark]/75 transition-colors">{eng.tagline}</p>
                            <p className="text-[10px] text-white/25 mt-1 leading-snug group-hover:text-white/40 transition-colors">{eng.desc}</p>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  {/* Advanced tools */}
                  <div className="px-3 pt-2 pb-3">
                    <p className="text-[9px] font-black tracking-[0.28em] uppercase text-[--color-gold-dark]/40 mb-2 px-1">Advanced tools</p>
                    <div className="grid grid-cols-2 gap-1">
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
                            <p className="text-[10.5px] font-semibold text-[--color-gold-dark]/50 mt-0.5 leading-tight group-hover:text-[--color-gold-dark]/75 transition-colors">{eng.tagline}</p>
                            <p className="text-[10px] text-white/25 mt-1 leading-snug group-hover:text-white/40 transition-colors">{eng.desc}</p>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.06)", background: "oklch(0.78 0.11 75 / 0.015)" }}>
                    <p className="text-[10px] text-white/20">7 proprietary engines — every creation, every time</p>
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
                          <img src={WIZGENESIS_LOGO} alt="WizPilot" className="w-5 h-5 object-contain" loading="lazy" />
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
                    {/* WizPerformer */}
                    <a
                      href="/products/wizperformer"
                      className="group relative rounded-xl overflow-hidden flex flex-col justify-end"
                      style={{ height: 180, border: "1px solid oklch(0.78 0.11 75 / 0.10)", transition: "border-color 0.2s" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.30)")}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.borderColor = "oklch(0.78 0.11 75 / 0.10)")}
                    >
                      <img
                        src="/manus-storage/showcase-stage-performance_3379ee75.jpg"
                        alt="WizPerformer"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,0,20,0.92) 0%, rgba(10,0,20,0.32) 55%, transparent 100%)" }} />
                      <div className="relative z-10 p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <img src={WIZANIMATE_LOGO} alt="WizPerformer" className="w-5 h-5 object-contain" loading="lazy" />
                          <p className="text-[12px] font-bold text-white/90 group-hover:text-[--color-gold-light] transition-colors">WizPerformer<sup className="text-[7px] ml-0.5 text-[--color-gold-dark]/55">™</sup></p>
                        </div>
                        <p className="text-[10px] text-white/50 leading-tight">Face-Consistent AI Performer</p>
                        <p className="text-[9px] text-white/30 mt-1 leading-tight">Your face. Your character. Every scene.</p>
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
                  Products
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
                    { name: "WizPerformer", tagline: "Face-Consistent AI Performer", desc: "Your face. Your character. Every scene.", href: "/products/wizperformer", logo: WIZANIMATE_LOGO, img: "/manus-storage/showcase-stage-performance_3379ee75.jpg" },
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


export { Nav as PublicNavBar };
export default Nav;
