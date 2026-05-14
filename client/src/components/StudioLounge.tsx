/**
 * StudioLounge — Premium creator comfort feature for WIZ AI
 *
 * Renders in three variants:
 *  - "section"  : Full homepage section with cinematic background image + "Order Here" CTA
 *  - "card"     : Compact dashboard sidebar card
 *  - "prompt"   : Inline render/loading screen nudge
 *
 * All provider links are UTM-ready and open in a new tab.
 * No data is collected, no addresses stored, no payments processed here.
 */

import React, { useState, useEffect, useRef } from "react";

const LOUNGE_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/studio-lounge-bg-v5-TWosg8H6NEowcbBhUAEfNy.webp";

// ── Real brand logos uploaded to CDN ─────────────────────────────────────────
const LOGO_DELIVEROO = "https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/deliveroologo_e78159b7.jpeg";
const LOGO_UBEREATS  = "https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/UberEatsImage2_4082987d.png";
const LOGO_JUSTEAT   = "https://d2xsxph8kpxj0f.cloudfront.net/manus-storage/JustEatLogo_2ead5ce9.png";

// ── UTM-ready provider definitions ───────────────────────────────────────────
const PROVIDERS = [
  {
    key: "deliveroo",
    name: "Deliveroo",
    tagline: "Fast delivery, restaurant quality",
    url: "https://deliveroo.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    color: "#00CCBC",
    logoBg: "#00CCBC",
    logo: LOGO_DELIVEROO,
  },
  {
    key: "ubereats",
    name: "Uber Eats",
    tagline: "Thousands of restaurants nearby",
    url: "https://www.ubereats.com/gb?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    color: "#06C167",
    logoBg: "#ffffff",
    logo: LOGO_UBEREATS,
  },
  {
    key: "justeat",
    name: "Just Eat",
    tagline: "Pizza, curry, sushi & more",
    url: "https://www.just-eat.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    color: "#FF8000",
    logoBg: "#ffffff",
    logo: LOGO_JUSTEAT,
  },
];

// ── Premium provider selector modal ──────────────────────────────────────────
export function ProviderModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Studio Lounge — choose your delivery provider"
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0f0c08 0%, #1a1208 60%, #0e0b06 100%)",
          border: "1px solid rgba(212,175,55,0.28)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.08) inset, 0 0 60px rgba(212,175,55,0.04) inset",
        }}
      >
        {/* Ambient warm glow at top */}
        <div
          className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        {/* Background image strip at top */}
        <div
          className="h-44 relative overflow-hidden"
          style={{
            backgroundImage: `url(${LOUNGE_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(15,12,8,0.97) 100%)",
            }}
          />
          {/* Gold shimmer line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 25%, rgba(255,220,100,1) 50%, rgba(212,175,55,0.5) 75%, transparent 100%)",
            }}
          />
          {/* Studio Lounge badge */}
          <div className="absolute bottom-5 left-0 right-0 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mx-auto"
              style={{
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.35)",
                backdropFilter: "blur(8px)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.9)" }} aria-hidden="true">
                <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(212,175,55,0.9)" }}>
                Studio Lounge
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 px-7 pt-6 pb-7">
          <h3 className="font-black text-xl tracking-tight mb-2" style={{ color: "rgba(255,245,220,0.95)" }}>
            Where would you like to order?
          </h3>
          <p className="text-sm mb-7 leading-relaxed" style={{ color: "rgba(200,185,155,0.5)" }}>
            Order food &amp; drinks to your door while your video renders. Your project is in good hands.
          </p>

          {/* Provider list with real logos */}
          <div className="flex flex-col gap-3">
            {PROVIDERS.map((p) => (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Order from ${p.name}`}
                className="group flex items-center gap-4 rounded-2xl px-4 py-4 transition-all duration-200 active:scale-[0.98]"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${p.color}55`;
                  (e.currentTarget as HTMLAnchorElement).style.background = `${p.color}10`;
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 4px 24px ${p.color}18`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                }}
              >
                {/* Real brand logo */}
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ background: p.logoBg, boxShadow: `0 2px 12px ${p.color}30` }}
                >
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    style={{ objectFit: "contain", padding: p.key === "deliveroo" ? "0" : "4px" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(200,185,155,0.45)" }}>
                    {p.tagline}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  style={{ color: "rgba(212,175,55,0.4)" }}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>

          {/* Gold divider */}
          <div className="my-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)" }} />

          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.15)" }}>
            All ordering is handled directly by each provider · Wiz AI does not collect any delivery information
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150"
          style={{
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.45)",
            touchAction: "manipulation",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
          }}
          aria-label="Close Studio Lounge"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── "Order Here" gold CTA button ─────────────────────────────────────────────
function OrderHereButton({ onClick, size = "md" }: { onClick: () => void; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2.5 font-semibold tracking-wide transition-all duration-300 active:scale-[0.97]"
      style={{
        padding: size === "sm" ? "8px 18px" : "13px 30px",
        fontSize: size === "sm" ? "12px" : "14px",
        borderRadius: "9999px",
        background: "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 100%)",
        border: "1px solid rgba(212,175,55,0.5)",
        color: "rgba(212,175,55,1)",
        boxShadow: "0 0 24px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.2)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "linear-gradient(135deg, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0.18) 100%)";
        el.style.borderColor = "rgba(212,175,55,0.75)";
        el.style.boxShadow = "0 0 32px rgba(212,175,55,0.22), inset 0 1px 0 rgba(212,175,55,0.3)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 100%)";
        el.style.borderColor = "rgba(212,175,55,0.5)";
        el.style.boxShadow = "0 0 24px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.2)";
      }}
      aria-label="Open Studio Lounge — order food and drinks"
    >
      {/* Fork & knife icon */}
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
      Order Here
    </button>
  );
}

// ── Section variant (homepage) ────────────────────────────────────────────────
export function StudioLoungeSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section
        className="relative overflow-hidden"
        aria-labelledby="studio-lounge-heading"
        style={{ minHeight: "480px" }}
      >
        {/* Full-bleed background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${LOUNGE_BG})` }}
          aria-hidden="true"
        />

        {/* Rich warm overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(8,5,2,0.94) 0%, rgba(12,8,4,0.80) 40%, rgba(0,0,0,0.50) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Warm amber ambient glow from bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-96 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 0% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        {/* Bottom fade to page */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
          aria-hidden="true"
        />

        {/* Gold shimmer line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.4) 25%, rgba(255,220,100,0.9) 50%, rgba(212,175,55,0.4) 75%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-28">
          <div className="flex flex-col md:flex-row md:items-center gap-12 md:gap-20">

            {/* Left — copy */}
            <div className="flex-1 min-w-0">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
                style={{
                  border: "1px solid rgba(212,175,55,0.35)",
                  background: "rgba(212,175,55,0.10)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.85)" }} aria-hidden="true">
                  <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[11px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(212,175,55,0.85)" }}>
                  Studio Lounge
                </span>
              </div>

              <h2
                id="studio-lounge-heading"
                className="font-black tracking-tight leading-[1.05] mb-5"
                style={{
                  fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)",
                  color: "rgba(255,248,225,0.97)",
                  textShadow: "0 2px 30px rgba(0,0,0,0.9)",
                }}
              >
                Rendering a project?
              </h2>

              <p className="text-base leading-relaxed mb-2" style={{ color: "rgba(220,210,185,0.65)", maxWidth: "400px" }}>
                Order food, coffee or snacks while Wiz AI works its magic.
              </p>
              <p className="text-sm mb-9" style={{ color: "rgba(212,175,55,0.55)", fontStyle: "italic" }}>
                Your studio, your comfort.
              </p>

              <OrderHereButton onClick={() => setModalOpen(true)} />

              {/* Decorative gold rule */}
              <div className="mt-9 h-px w-28" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.45) 0%, transparent 100%)" }} aria-hidden="true" />
            </div>

            {/* Right — provider logos on desktop */}
            <div className="hidden md:flex flex-col items-end gap-4 shrink-0 w-64" aria-hidden="true">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-right mb-1" style={{ color: "rgba(212,175,55,0.5)" }}>
                Available via
              </p>
              {PROVIDERS.map((p) => (
                <div
                  key={p.key}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 w-full"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                    style={{ background: p.logoBg }}
                  >
                    <img
                      src={p.logo}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      style={{ objectFit: "contain", padding: p.key === "deliveroo" ? "0" : "3px" }}
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {modalOpen && <ProviderModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ── Card variant (dashboard sidebar) ─────────────────────────────────────────
export function StudioLoungeCard() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden group-data-[collapsible=icon]:hidden"
        role="complementary"
        aria-label="Studio Lounge"
        style={{
          border: "1px solid rgba(212,175,55,0.22)",
          background: "linear-gradient(160deg, #0f0c08 0%, #1a1208 100%)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.05) inset",
        }}
      >
        {/* Background image strip */}
        <div
          className="h-16 relative overflow-hidden"
          style={{
            backgroundImage: `url(${LOUNGE_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(15,12,8,0.92) 100%)" }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)" }} />
          <div className="absolute inset-0 flex items-center px-3.5 gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" style={{ color: "rgba(212,175,55,0.9)" }} aria-hidden="true">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(212,175,55,0.9)" }}>
              Studio Lounge
            </span>
          </div>
        </div>

        <div className="p-3.5">
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(200,185,155,0.5)" }}>
            Take a break while your next project builds.
          </p>
          {/* Mini logo row */}
          <div className="flex items-center gap-2 mb-3.5">
            {PROVIDERS.map((p) => (
              <div
                key={p.key}
                className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                style={{ background: p.logoBg, border: `1px solid ${p.color}30` }}
                title={p.name}
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  className="w-full h-full"
                  style={{ objectFit: "contain", padding: p.key === "deliveroo" ? "0" : "2px" }}
                />
              </div>
            ))}
          </div>
          <OrderHereButton onClick={() => setModalOpen(true)} size="sm" />
        </div>
      </div>

      {modalOpen && <ProviderModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ── Prompt variant (render / loading screen inline nudge) ─────────────────────
export function StudioLoungePrompt() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group flex items-center gap-3.5 rounded-2xl transition-all duration-300 px-4 py-3.5 max-w-sm mx-auto w-full"
        style={{
          border: "1px solid rgba(212,175,55,0.18)",
          background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "rgba(212,175,55,0.40)";
          el.style.background = "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.05) 100%)";
          el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.08)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "rgba(212,175,55,0.18)";
          el.style.background = "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)";
          el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
        }}
        aria-label="Open Studio Lounge"
      >
        {/* Mini logo trio */}
        <div className="flex items-center -space-x-1.5 shrink-0">
          {PROVIDERS.map((p, i) => (
            <div
              key={p.key}
              className="w-7 h-7 rounded-lg overflow-hidden border"
              style={{
                background: p.logoBg,
                borderColor: `${p.color}50`,
                zIndex: PROVIDERS.length - i,
                position: "relative",
              }}
            >
              <img
                src={p.logo}
                alt={p.name}
                className="w-full h-full"
                style={{ objectFit: "contain", padding: p.key === "deliveroo" ? "0" : "2px" }}
              />
            </div>
          ))}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: "rgba(212,175,55,0.85)" }}>
            Your project is building. Fancy a break?
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Open Studio Lounge
          </p>
        </div>
        <svg
          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: "rgba(212,175,55,0.35)" }}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {modalOpen && <ProviderModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
