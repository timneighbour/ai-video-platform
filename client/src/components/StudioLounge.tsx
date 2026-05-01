/**
 * StudioLounge — Premium creator comfort feature for WIZ AI
 *
 * Renders in three variants:
 *  - "section"  : Full homepage section with cinematic background image
 *  - "card"     : Compact dashboard sidebar card
 *  - "prompt"   : Inline render/loading screen nudge
 *
 * All provider links are UTM-ready and open in a new tab.
 * No data is collected, no addresses stored, no payments processed here.
 */

import React, { useState } from "react";

const LOUNGE_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/studio-lounge-bg-BGFGCqrNTGY5f3TWHFhuzw.webp";

// ── UTM-ready provider links ──────────────────────────────────────────────────
// To add affiliate tracking or promo codes, update the utm_* params below.
const PROVIDERS = [
  {
    key: "deliveroo",
    name: "Deliveroo",
    url: "https://deliveroo.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#00CCBC" />
        <path d="M10 22c0-3.3 2.7-6 6-6s6 2.7 6 6H10z" fill="white" />
        <circle cx="16" cy="13" r="3.5" fill="white" />
      </svg>
    ),
  },
  {
    key: "ubereats",
    name: "Uber Eats",
    url: "https://www.ubereats.com/gb?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#06C167" />
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="sans-serif">U</text>
      </svg>
    ),
  },
  {
    key: "justeat",
    name: "Just Eat",
    url: "https://www.just-eat.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#FF8000" />
        <text x="16" y="21" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="sans-serif">JE</text>
      </svg>
    ),
  },
];

// ── Shared provider button ────────────────────────────────────────────────────
function ProviderButton({
  provider,
  size = "md",
  glass = false,
}: {
  provider: (typeof PROVIDERS)[0];
  size?: "sm" | "md" | "lg";
  glass?: boolean;
}) {
  return (
    <a
      href={provider.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Order from ${provider.name}`}
      className={`
        group flex items-center gap-3 rounded-xl border transition-all duration-300
        ${glass
          ? "border-white/10 bg-black/30 hover:bg-black/50 hover:border-[rgba(212,175,55,0.35)] backdrop-blur-md"
          : "border-[rgba(184,137,42,0.2)] bg-[rgba(184,137,42,0.05)] hover:border-[rgba(184,137,42,0.45)] hover:bg-[rgba(184,137,42,0.12)]"
        }
        active:scale-[0.97]
        ${size === "sm" ? "px-3 py-2 text-xs" : size === "lg" ? "px-6 py-4 text-sm" : "px-4 py-3 text-sm"}
      `}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      {provider.icon}
      <span className={`font-semibold transition-colors ${glass ? "text-white/80 group-hover:text-white" : "text-[rgba(212,175,55,0.85)] group-hover:text-[rgba(212,175,55,1)]"}`}>
        {provider.name}
      </span>
      <svg
        className={`w-3.5 h-3.5 ml-auto transition-all duration-200 group-hover:translate-x-0.5 ${glass ? "text-white/30 group-hover:text-white/60" : "text-[rgba(184,137,42,0.35)] group-hover:text-[rgba(184,137,42,0.7)]"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

// ── Section variant (homepage) ────────────────────────────────────────────────
export function StudioLoungeSection() {
  return (
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
          background: "linear-gradient(105deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 40%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.40) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Warm amber vignette at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle gold shimmer line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.35) 30%, rgba(212,175,55,0.6) 50%, rgba(212,175,55,0.35) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-16">

          {/* Left — copy */}
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{
                border: "1px solid rgba(212,175,55,0.3)",
                background: "rgba(212,175,55,0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Coffee icon */}
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
            <p className="text-sm" style={{ color: "rgba(212,175,55,0.5)", fontStyle: "italic" }}>
              Your studio, your comfort.
            </p>

            {/* Decorative gold rule */}
            <div className="mt-8 h-px w-24" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.5) 0%, transparent 100%)" }} aria-hidden="true" />
          </div>

          {/* Right — provider buttons */}
          <div className="flex flex-col gap-3 shrink-0 w-full md:w-72">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "rgba(212,175,55,0.45)" }}>
              Order via
            </p>
            {PROVIDERS.map((p) => (
              <ProviderButton key={p.key} provider={p} size="lg" glass={true} />
            ))}
            <p className="text-[10px] mt-2 text-center" style={{ color: "rgba(255,255,255,0.18)" }}>
              All ordering handled directly by each provider
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Card variant (dashboard sidebar) ─────────────────────────────────────────
export function StudioLoungeCard() {
  const [open, setOpen] = useState(false);

  return (
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
      {/* Tiny background image strip */}
      <div
        className="h-14 relative overflow-hidden"
        style={{
          backgroundImage: `url(${LOUNGE_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)" }} />
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
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left focus:outline-none"
          aria-expanded={open}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(200,185,160,0.55)" }}>
            {open ? "Choose your delivery app" : "Take a break while your next project builds."}
          </p>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`w-3.5 h-3.5 shrink-0 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: "rgba(212,175,55,0.4)" }}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded providers */}
        {open && (
          <div className="mt-3 flex flex-col gap-2">
            {PROVIDERS.map((p) => (
              <ProviderButton key={p.key} provider={p} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prompt variant (render / loading screen inline nudge) ─────────────────────
export function StudioLoungePrompt() {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div
        className="rounded-2xl overflow-hidden max-w-sm mx-auto w-full"
        style={{
          border: "1px solid rgba(212,175,55,0.22)",
          background: "rgba(8,6,4,0.9)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Background image strip */}
        <div
          className="h-20 relative"
          style={{
            backgroundImage: `url(${LOUNGE_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(8,6,4,0.9) 100%)" }} />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(212,175,55,0.75)" }}>
              Studio Lounge
            </span>
          </div>
        </div>

        <div className="p-4">
          <p className="text-white/60 text-sm text-center mb-4 leading-relaxed">
            Your project is building. Order something while you wait.
          </p>
          <div className="flex flex-col gap-2">
            {PROVIDERS.map((p) => (
              <ProviderButton key={p.key} provider={p} size="sm" />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full text-[10px] transition-colors"
            style={{ color: "rgba(255,255,255,0.2)", touchAction: "manipulation" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex items-center gap-3 rounded-xl transition-all duration-300 px-4 py-3 max-w-sm mx-auto w-full"
      style={{
        border: "1px solid rgba(212,175,55,0.15)",
        background: "rgba(212,175,55,0.04)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.35)";
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.09)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.15)";
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.04)";
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
        <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>Open Studio Lounge</p>
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
  );
}
