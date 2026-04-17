/**
 * ProductPageTemplate — reusable layout for all 7 WIZ AI product module pages
 * Used by: WizCreate, WizAnimate, WizSync, WizSound, WizLumina, WizGenesis, WizBoost
 */
import { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ProductStep {
  num: string;
  title: string;
  desc: string;
  icon: string; // emoji or URL
}

export interface ProductBenefit {
  title: string;
  desc: string;
}

export interface RelatedProduct {
  name: string;
  href: string;
  colour: string; // tailwind colour name e.g. "violet"
}

export interface ProductPageProps {
  name: string;           // e.g. "WizCreate™"
  role: string;           // e.g. "The Brain"
  tagline: string;        // e.g. "AI Creation Engine"
  headline: string;       // hero headline
  subheadline: string;    // hero sub
  logo: string;           // CDN URL
  accentFrom: string;     // tailwind gradient from colour class
  accentTo: string;       // tailwind gradient to colour class
  accentGlow: string;     // inline rgba for glow
  borderColour: string;   // tailwind border class
  bgColour: string;       // tailwind bg class
  badgeClass: string;     // tailwind badge classes
  ctaHref: string;        // primary CTA link
  ctaLabel: string;       // primary CTA text
  whatItDoes: string;     // paragraph
  capabilities: string[]; // 3-6 bullet capabilities
  howItWorks: ProductStep[];
  benefits: ProductBenefit[];
  exampleOutput?: ReactNode;
  related: RelatedProduct[];
}

const COLOUR_TEXT: Record<string, string> = {
  violet: "text-violet-300",
  cyan: "text-cyan-300",
  purple: "text-purple-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
  orange: "text-orange-300",
  fuchsia: "text-fuchsia-300",
};

export default function ProductPageTemplate(props: ProductPageProps) {
  const {
    name, role, tagline, headline, subheadline, logo,
    accentFrom, accentTo, accentGlow, borderColour, bgColour, badgeClass,
    ctaHref, ctaLabel, whatItDoes, capabilities, howItWorks, benefits,
    exampleOutput, related,
  } = props;

  return (
    <div className="bg-[#0f0f0f] text-white min-h-screen overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/6 bg-[#0f0f0f]/90 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back" />
            <div className="flex items-center gap-3">
              <img src={logo} alt={name} className="h-8 w-auto object-contain" />
              <Badge className={`${badgeClass} text-xs border`}>{tagline}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NavLink href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Home</NavLink>
            <NavLink href="/create" className="text-sm text-zinc-400 hover:text-white transition-colors">All Tools</NavLink>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative py-24 px-6 overflow-hidden">
        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${accentGlow} 0%, transparent 65%)` }}
        />
        <div className="max-w-5xl mx-auto text-center relative">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt={name}
              className="h-24 w-auto object-contain"
              style={{ filter: `drop-shadow(0 0 32px ${accentGlow})` }}
            />
          </div>

          {/* Role pill */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${borderColour} ${bgColour} ${badgeClass.split(" ")[0]} text-xs font-mono tracking-widest uppercase font-semibold mb-6`}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentGlow }} />
            {role} · {tagline}
          </div>

          {/* Headline */}
          <h1 className={`text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r ${accentFrom} ${accentTo} bg-clip-text text-transparent`}>
            {headline}
          </h1>
          <p className="text-white/55 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NavLink
              href={ctaHref}
              className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90 transition-opacity shadow-[0_0_24px_rgba(139,92,246,0.3)]`}
            >
              {ctaLabel} <ArrowRight className="w-4 h-4" />
            </NavLink>
            <NavLink
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-sm text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80 transition-all"
            >
              See all modules <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── What It Does ── */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderColour} ${bgColour} ${badgeClass.split(" ")[0]} text-xs font-mono tracking-widest uppercase font-semibold mb-6`}>
            What It Does
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-white/70 text-lg leading-relaxed mb-8">{whatItDoes}</p>
              <ul className="space-y-3">
                {capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-3">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${badgeClass.split(" ")[0]}`} />
                    <span className="text-white/70 text-sm">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Visual placeholder — animated gradient card */}
            <div className={`rounded-2xl border ${borderColour} ${bgColour} p-8 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden`}>
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${accentGlow} 0%, transparent 70%)` }}
              />
              <img src={logo} alt={name} className="h-20 w-auto object-contain relative z-10 mb-4" />
              <div className={`text-sm font-semibold ${badgeClass.split(" ")[0]} relative z-10`}>{name}</div>
              <div className="text-xs text-white/30 relative z-10 mt-1">{role}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderColour} ${bgColour} ${badgeClass.split(" ")[0]} text-xs font-mono tracking-widest uppercase font-semibold mb-4`}>
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              From input to output — step by step
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div key={step.num} className={`relative p-6 rounded-2xl border ${borderColour} ${bgColour}`}>
                {/* Step number */}
                <div className={`text-xs font-mono font-bold ${badgeClass.split(" ")[0]} mb-3 opacity-60`}>
                  {step.num}
                </div>
                {/* Icon */}
                <div className="text-3xl mb-3">
                  {step.icon.startsWith("http") ? (
                    <img src={step.icon} alt={step.title} className="w-8 h-8 object-contain" />
                  ) : (
                    step.icon
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{step.desc}</p>
                {/* Connector arrow */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-white/15" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Benefits ── */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderColour} ${bgColour} ${badgeClass.split(" ")[0]} text-xs font-mono tracking-widest uppercase font-semibold mb-4`}>
              Key Benefits
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              Why {name} changes everything
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className={`p-6 rounded-2xl border ${borderColour} ${bgColour} group hover:${borderColour.replace("/30", "/50")} transition-colors`}>
                <h3 className={`text-sm font-bold ${badgeClass.split(" ")[0]} mb-2`}>{b.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example Output (optional) ── */}
      {exampleOutput && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderColour} ${bgColour} ${badgeClass.split(" ")[0]} text-xs font-mono tracking-widest uppercase font-semibold mb-4`}>
                Example Output
              </div>
              <h2 className="text-3xl font-extrabold text-white">See it in action</h2>
            </div>
            {exampleOutput}
          </div>
        </section>
      )}

      {/* ── Related Modules ── */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-white mb-2">Part of the WIZ AI Engine</h2>
            <p className="text-white/40 text-sm">Each module works in sequence — explore the full pipeline</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {related.map((r) => (
              <NavLink
                key={r.name}
                href={r.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/3 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all`}
              >
                {r.name} <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to use {name}?
          </h2>
          <p className="text-white/50 mb-8">Start creating cinematic AI videos today — no experience required.</p>
          <NavLink
            href={ctaHref}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90 transition-opacity shadow-[0_0_32px_rgba(139,92,246,0.3)]`}
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </section>
    </div>
  );
}
