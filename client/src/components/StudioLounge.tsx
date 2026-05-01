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

// ── UTM-ready provider definitions ───────────────────────────────────────────
const PROVIDERS = [
  {
    key: "deliveroo",
    name: "Deliveroo",
    tagline: "Fast delivery, restaurant quality",
    url: "https://deliveroo.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    color: "#00CCBC",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#00CCBC" />
        <path d="M10 22c0-3.3 2.7-6 6-6s6 2.7 6 6H10z" fill="white" />
        <circle cx="16" cy="13" r="3.5" fill="white" />
      </svg>
    ),
  },
  {
    key: "ubereats",
    name: "Uber Eats",
    tagline: "Thousands of restaurants nearby",
    url: "https://www.ubereats.com/gb?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    color: "#06C167",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#06C167" />
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="sans-serif">U</text>
      </svg>
    ),
  },
  {
    key: "justeat",
    name: "Just Eat",
    tagline: "Pizza, curry, sushi & more",
    url: "https://www.just-eat.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    color: "#FF8000",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#FF8000" />
        <text x="16" y="21" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="sans-serif">JE</text>
      </svg>
    ),
  },
];

// ── Premium provider selector modal ──────────────────────────────────────────
export function ProviderModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Studio Lounge — choose your delivery provider"
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0e0b08 0%, #161008 100%)",
          border: "1px solid rgba(212,175,55,0.22)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.06) inset",
        }}
      >
        {/* Background image strip at top */}
        <div
          className="h-36 relative overflow-hidden"
          style={{
            backgroundImage: `url(${LOUNGE_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 55%",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(14,11,8,0.95) 100%)",
            }}
          />
          {/* Gold shimmer line at top of modal */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 30%, rgba(212,175,55,0.9) 50%, rgba(212,175,55,0.5) 70%, transparent 100%)",
            }}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mx-auto"
              style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" style={{ color: "rgba(212,175,55,0.85)" }} aria-hidden="true">
                <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(212,175,55,0.85)" }}>
                Studio Lounge
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6">
          <h3 className="text-white font-bold text-lg tracking-tight mb-1">
            Where would you like to order from?
          </h3>
          <p className="text-sm mb-6" style={{ color: "rgba(200,185,160,0.45)" }}>
            Your project is in good hands. Take a moment.
          </p>

          {/* Provider list */}
          <div className="flex flex-col gap-3">
            {PROVIDERS.map((p) => (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Order from ${p.name}`}
                className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98]"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.03)",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${p.color}40`;
                  (e.currentTarget as HTMLAnchorElement).style.background = `${p.color}0d`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)";
                }}
              >
                {p.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(200,185,160,0.4)" }}>
                    {p.tagline}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  style={{ color: "rgba(212,175,55,0.35)" }}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>

          <p className="text-[10px] text-center mt-5" style={{ color: "rgba(255,255,255,0.15)" }}>
            All ordering is handled directly by each provider · Wiz AI does not collect any delivery information
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150"
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.45)",
            touchAction: "manipulation",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
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
        padding: size === "sm" ? "8px 18px" : "12px 28px",
        fontSize: size === "sm" ? "12px" : "14px",
        borderRadius: "9999px",
        background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)",
        border: "1px solid rgba(212,175,55,0.45)",
        color: "rgba(212,175,55,1)",
        boxShadow: "0 0 20px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.15)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "linear-gradient(135deg, rgba(212,175,55,0.28) 0%, rgba(212,175,55,0.15) 100%)";
        el.style.borderColor = "rgba(212,175,55,0.75)";
        el.style.boxShadow = "0 0 32px rgba(212,175,55,0.18), inset 0 1px 0 rgba(212,175,55,0.25)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)";
        el.style.borderColor = "rgba(212,175,55,0.45)";
        el.style.boxShadow = "0 0 20px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.15)";
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
        style={{ minHeight: "420px" }}
      >
        {/* Full-bleed background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${LOUNGE_BG})` }}
          aria-hidden="true"
        />

        {/* Dark overlay — left heavier, right lighter to let image breathe */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.45) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Bottom fade to page */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)" }}
          aria-hidden="true"
        />

        {/* Gold shimmer line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.35) 30%, rgba(212,175,55,0.65) 50%, rgba(212,175,55,0.35) 70%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-16">

            {/* Left — copy */}
            <div className="flex-1 min-w-0">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{
                  border: "1px solid rgba(212,175,55,0.3)",
                  background: "rgba(212,175,55,0.08)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.8)" }} aria-hidden="true">
                  <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(212,175,55,0.8)" }}>
                  Studio Lounge
                </span>
              </div>

              <h2
                id="studio-lounge-heading"
                className="font-black tracking-tight leading-[1.1] mb-4"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  color: "white",
                  textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                }}
              >
                Rendering a project?
              </h2>

              <p className="text-base leading-relaxed mb-2" style={{ color: "rgba(220,210,190,0.7)", maxWidth: "420px" }}>
                Order food, coffee or snacks while Wiz AI works.
              </p>
              <p className="text-sm mb-8" style={{ color: "rgba(212,175,55,0.5)", fontStyle: "italic" }}>
                Your studio, your comfort.
              </p>

              <OrderHereButton onClick={() => setModalOpen(true)} />

              {/* Decorative gold rule */}
              <div className="mt-8 h-px w-24" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.4) 0%, transparent 100%)" }} aria-hidden="true" />
            </div>

            {/* Right — purely decorative on desktop, hidden on mobile */}
            <div className="hidden md:flex flex-col items-end gap-2 shrink-0 w-56 opacity-40 pointer-events-none select-none" aria-hidden="true">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-right" style={{ color: "rgba(212,175,55,0.6)" }}>
                Available via
              </p>
              {PROVIDERS.map((p) => (
                <div key={p.key} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {p.icon}
                  <span>{p.name}</span>
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
        className="rounded-xl overflow-hidden group-data-[collapsible=icon]:hidden"
        role="complementary"
        aria-label="Studio Lounge"
        style={{
          border: "1px solid rgba(212,175,55,0.18)",
          background: "rgba(10,8,6,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Background image strip */}
        <div
          className="h-14 relative overflow-hidden"
          style={{
            backgroundImage: `url(${LOUNGE_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 55%",
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.78) 100%)" }} />
          <div className="absolute inset-0 flex items-center px-3 gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" style={{ color: "rgba(212,175,55,0.85)" }} aria-hidden="true">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(212,175,55,0.85)" }}>
              Studio Lounge
            </span>
          </div>
        </div>

        <div className="p-3">
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(200,185,160,0.5)" }}>
            Take a break while your next project builds.
          </p>
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
        className="group flex items-center gap-3 rounded-xl transition-all duration-300 px-4 py-3 max-w-sm mx-auto w-full"
        style={{
          border: "1px solid rgba(212,175,55,0.15)",
          background: "rgba(212,175,55,0.04)",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "rgba(212,175,55,0.35)";
          el.style.background = "rgba(212,175,55,0.09)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "rgba(212,175,55,0.15)";
          el.style.background = "rgba(212,175,55,0.04)";
        }}
        aria-label="Open Studio Lounge"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4 shrink-0"
          style={{ color: "rgba(212,175,55,0.65)" }}
          aria-hidden="true"
        >
          <path
            d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: "rgba(212,175,55,0.75)" }}>
            Your project is building. Fancy a break?
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            Open Studio Lounge
          </p>
        </div>
        <svg
          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: "rgba(212,175,55,0.3)" }}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {modalOpen && <ProviderModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
