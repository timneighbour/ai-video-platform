// ─────────────────────────────────────────────────────────────────────────────
// PublicNavBar — single source of truth for all public-facing page nav bars.
// Import as: import PublicNavBar from "@/components/PublicNavBar";
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import React from "react";
import { ProviderModal as StudioLoungeModal } from "@/components/StudioLounge";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { PRIMARY_PRODUCTS } from "@/lib/products";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
  WizScoreEmblem,
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
const WIZAI_LOGO = "/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png";
const WIZSOUND_LOGO = `/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png`;
const WIZLUMINA_LOGO = `/manus-storage/wizlumina-logo-new_0709f3c5_83ddc673.png`;
const WIZBOOST_LOGO = `/manus-storage/wizboost-logo-new_93f2b48b_b731a139.png`;
const WIZCREATE_LOGO = `/manus-storage/wizcreate-logo-new_85a25756_f4aa29bb.png`;
const WIZANIMATE_LOGO = `/manus-storage/wizanimate-logo-new_a84f9808_a089857a.png`;
const WIZSYNC_LOGO = `/manus-storage/wizsync-logo-new_9563f007_70cef76a.png`;
const WIZGENESIS_LOGO = `/manus-storage/wizgenesis-logo-new_9814b3d1_cabaf933.png`;

// ── Products — categorised by purpose ────────────────────────────────────────
// Emblem map: maps product id → React emblem component (size 32)
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
  href:        p.studioPage,
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

// ── Technology — proprietary intelligence stack ───────────────────────────────
const WIZ_TECHNOLOGY_CORE = [
  { name: "WizGenesis", tagline: "Creative Intelligence", desc: "Creative planning, prompt expansion and storyboard intelligence.", href: "/technology/wizgenesis", logo: WIZGENESIS_LOGO },
  { name: "WizSound", tagline: "Premium Audio Engine", desc: "Audio enhancement, clarity, depth and cinematic mastering.", href: "/technology/wizsound", logo: WIZSOUND_LOGO },
  { name: "WizLumina", tagline: "Visual Enhancement Engine", desc: "Cinematic visual polish, colour, contrast and finishing.", href: "/technology/wizlumina", logo: WIZLUMINA_LOGO },
  { name: "WizBoost", tagline: "Output Optimisation Engine", desc: "Optimisation for quality, speed and platform-ready delivery.", href: "/technology/wizboost", logo: WIZBOOST_LOGO },
];
const WIZ_TECHNOLOGY_ADVANCED = [
  { name: "WizSync", tagline: "Portrait-to-LipSync™", desc: "AI Performance Enhancement — cinematic hero-shot lip sync from a portrait photo. No face video required.", href: "/technology/wizsync", logo: WIZSYNC_LOGO },
  { name: "WizScore", tagline: "AI Video-to-Music Engine", desc: "Analyses your video and composes an original AI soundtrack — perfectly synchronised to your footage.", href: "/technology/wizscore", logo: WIZSOUND_LOGO },
  { name: "WizPilot", tagline: "AI-Directed Cinematic Production", desc: "Cinematic-first storyboarding, intelligent scene orchestration, and WizSync™ performance enhancement — director-level output.", href: "/technology/wizpilot", logo: WIZCREATE_LOGO },
];
const WIZ_TECHNOLOGY = [...WIZ_TECHNOLOGY_CORE, ...WIZ_TECHNOLOGY_ADVANCED];

// ── Studio Lounge nav button ─────────────────────────────────────────────────
function StudioLoungeNavButton({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleClick = () => {
    setModalOpen(true);
    onClose?.();
  };

  if (mobile) {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 w-full text-left"
          style={{ color: "rgba(212,175,55,0.85)", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "rgba(212,175,55,0.7)" }}>
            <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
          </svg>
          Studio Lounge
        </button>
        {modalOpen && <StudioLoungeModal onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="nav-link flex items-center gap-1.5 transition-all duration-200"
        style={{ color: "rgba(212,175,55,0.8)", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(212,175,55,1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(212,175,55,0.8)"; }}
        aria-label="Studio Lounge — order food &amp; drinks while you create"
        title="Order food &amp; drinks while you create"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
        Studio Lounge
      </button>
      {modalOpen && <StudioLoungeModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

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
  const { isAuthenticated, user } = useAuth();

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
        className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#060606]/96 backdrop-blur-2xl border-b border-[--color-gold]/[0.08] shadow-[0_2px_60px_rgba(0,0,0,0.7)]"
            : "bg-gradient-to-b from-black/40 to-transparent backdrop-blur-[2px]"
        }`}
        style={{ top: "var(--founding-banner-h, 0px)" }}
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
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: "oklch(0.78 0.11 75 / 0.08)", color: "oklch(0.78 0.11 75 / 0.5)", border: "1px solid oklch(0.78 0.11 75 / 0.12)" }}>7 Studios</span>
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

                     {/* Enhance + Grow hidden — internal engines folded into "included intelligence" */}
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

            {/* Technology and Workflow menus hidden — internal engines folded into "included intelligence" */}

            <a href="/music-videos" className="nav-link" style={{ color: "oklch(0.78 0.11 75 / 0.75)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "oklch(0.88 0.11 75 / 1)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "oklch(0.78 0.11 75 / 0.75)"; }}>WizVideo</a>
            <a href="/wizavision" className="nav-link" style={{ color: "oklch(0.78 0.11 75 / 0.75)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "oklch(0.88 0.11 75 / 1)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "oklch(0.78 0.11 75 / 0.75)"; }}>WizaVision</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/help" className="nav-link">Help</a>
            <StudioLoungeNavButton />
          </div>

          {/* ── Auth CTA ── */}
          <div className="hidden md:flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
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
                {user?.role === "admin" && (
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.78 0.11 75 / 0.10) 0%, oklch(0.78 0.11 75 / 0.05) 100%)",
                      border: "1px solid oklch(0.78 0.11 75 / 0.20)",
                      color: "oklch(0.88 0.10 75)",
                    }}
                  >
                    ⚙️ Admin
                  </a>
                )}
              </>
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
                </div>
              </div>
            </div>

            {/* Technology + Workflow mobile accordions hidden — internal engines */}

            {/* Simple links */}
            <a href="/music-videos" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200" style={{ color: "oklch(0.82 0.11 75 / 0.85)" }} onClick={() => setMobileOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "oklch(0.78 0.11 75 / 0.7)" }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
              WizVideo — AI Music Videos
            </a>
            <a href="/wizavision" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200" style={{ color: "oklch(0.82 0.11 75 / 0.85)" }} onClick={() => setMobileOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "oklch(0.78 0.11 75 / 0.7)" }}><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
              WizaVision — Watch &amp; Discover
            </a>
            <a href="/pricing" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-all duration-200" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="/help" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-all duration-200" onClick={() => setMobileOpen(false)}>Help</a>

            {/* CTA buttons */}
            <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: "1px solid oklch(0.78 0.11 75 / 0.10)" }}>
              {isAuthenticated ? (
                <>
                  <a href="/dashboard" className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-200" style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 75 / 0.20) 0%, oklch(0.60 0.10 65 / 0.15) 100%)", border: "1px solid oklch(0.78 0.11 75 / 0.35)", color: "oklch(0.92 0.10 75)", boxShadow: "0 0 24px oklch(0.78 0.11 75 / 0.10)" }} onClick={() => setMobileOpen(false)}>
                    <img src={WIZAI_LOGO} alt="WIZ AI" aria-hidden="true" className="w-4 h-4 object-contain" /> Dashboard
                  </a>

                </>
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
