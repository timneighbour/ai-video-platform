/**
 * StudioLounge — Premium creator comfort feature for WIZ AI
 *
 * Renders in three variants:
 *  - "section"  : Full homepage section (lower page)
 *  - "card"     : Compact dashboard sidebar card
 *  - "prompt"   : Inline render/loading screen nudge
 *
 * All provider links are UTM-ready and open in a new tab.
 * No data is collected, no addresses stored, no payments processed here.
 */

import React, { useState } from "react";

// ── UTM-ready provider links ──────────────────────────────────────────────────
// To add affiliate tracking or promo codes, update the utm_* params below.
const PROVIDERS = [
  {
    key: "deliveroo",
    name: "Deliveroo",
    url: "https://deliveroo.co.uk/?utm_source=wiz-ai&utm_medium=studio-lounge&utm_campaign=creator-comfort",
    // SVG icon — Deliveroo teal roo head, simplified
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" aria-hidden="true">
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
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" aria-hidden="true">
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
      <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" aria-hidden="true">
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
}: {
  provider: (typeof PROVIDERS)[0];
  size?: "sm" | "md";
}) {
  return (
    <a
      href={provider.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Order from ${provider.name}`}
      className={`
        group flex items-center gap-2 rounded-xl border transition-all duration-200
        border-[rgba(184,137,42,0.18)] bg-[rgba(184,137,42,0.04)]
        hover:border-[rgba(184,137,42,0.4)] hover:bg-[rgba(184,137,42,0.10)]
        active:scale-95
        ${size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"}
      `}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      {provider.icon}
      <span className="font-medium text-[rgba(212,175,55,0.85)] group-hover:text-[rgba(212,175,55,1)] transition-colors">
        {provider.name}
      </span>
      <svg
        className="w-3 h-3 text-[rgba(184,137,42,0.4)] group-hover:text-[rgba(184,137,42,0.8)] transition-colors ml-auto"
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
      className="relative bg-[#030303] py-20 px-6 overflow-hidden"
      aria-labelledby="studio-lounge-heading"
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(184,137,42,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Thin gold divider */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(184,137,42,0.3), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
          {/* Left — icon + copy */}
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(184,137,42,0.2)] bg-[rgba(184,137,42,0.05)] mb-5">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(184,137,42,0.7)]">
                Studio Lounge
              </span>
            </div>

            <h2
              id="studio-lounge-heading"
              className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight text-white mb-3 leading-tight"
            >
              Rendering a project?
            </h2>
            <p className="text-[rgba(200,200,200,0.45)] text-base leading-relaxed max-w-md">
              Order food, coffee or snacks while Wiz AI works. Your studio, your
              comfort.
            </p>
          </div>

          {/* Right — provider buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            {PROVIDERS.map((p) => (
              <ProviderButton key={p.key} provider={p} size="md" />
            ))}
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
      className="rounded-xl border border-[rgba(184,137,42,0.15)] bg-[rgba(184,137,42,0.03)] p-4 group-data-[collapsible=icon]:hidden"
      role="complementary"
      aria-label="Studio Lounge"
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left focus:outline-none"
        aria-expanded={open}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <div className="flex items-center gap-2">
          {/* Coffee cup icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 shrink-0"
            style={{ color: "rgba(184,137,42,0.7)" }}
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
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-[rgba(184,137,42,0.7)]">
            Studio Lounge
          </span>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`w-3.5 h-3.5 text-[rgba(184,137,42,0.4)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsed teaser */}
      {!open && (
        <p className="text-[11px] text-[rgba(200,200,200,0.35)] mt-2 leading-relaxed">
          Take a break while your next project builds.
        </p>
      )}

      {/* Expanded providers */}
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[11px] text-[rgba(200,200,200,0.4)] mb-1 leading-relaxed">
            Take a break while your next project builds.
          </p>
          {PROVIDERS.map((p) => (
            <ProviderButton key={p.key} provider={p} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Prompt variant (render / loading screen inline nudge) ─────────────────────
export function StudioLoungePrompt() {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="rounded-2xl border border-[rgba(184,137,42,0.2)] bg-[rgba(184,137,42,0.04)] p-5 text-center max-w-sm mx-auto">
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[rgba(184,137,42,0.6)] mb-1">
          Studio Lounge
        </p>
        <p className="text-white/50 text-sm mb-4">
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
          className="mt-3 text-[10px] text-white/20 hover:text-white/40 transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex items-center gap-3 rounded-xl border border-[rgba(184,137,42,0.12)] bg-[rgba(184,137,42,0.03)] hover:border-[rgba(184,137,42,0.3)] hover:bg-[rgba(184,137,42,0.07)] transition-all duration-200 px-4 py-3 max-w-sm mx-auto w-full"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      aria-label="Open Studio Lounge"
    >
      {/* Coffee icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-4 h-4 shrink-0 text-[rgba(184,137,42,0.6)]"
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
        <p className="text-xs font-semibold text-[rgba(184,137,42,0.7)] group-hover:text-[rgba(184,137,42,0.9)] transition-colors">
          Your project is building. Fancy a break?
        </p>
        <p className="text-[10px] text-white/25 mt-0.5">Open Studio Lounge</p>
      </div>
      <svg
        className="w-3.5 h-3.5 text-[rgba(184,137,42,0.3)] group-hover:text-[rgba(184,137,42,0.6)] transition-colors shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
