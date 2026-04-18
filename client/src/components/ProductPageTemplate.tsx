/**
 * ProductPageTemplate — reusable layout for all WIZ AI product module pages
 * Used by: WizCreate, WizAnimate, WizSync, WizSound, WizLumina, WizGenesis, WizBoost
 * Luxury gold/silver/charcoal system — consistent with homepage
 */
import { ReactNode } from "react";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import { ArrowRight, Check, ChevronRight, Sparkles } from "lucide-react";

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
  colour: string; // kept for interface compat, not used in styling
}

export interface ProductPageProps {
  name: string;           // e.g. "WizCreate"
  role: string;           // e.g. "The Brain"
  tagline: string;        // e.g. "AI Creation Engine"
  headline: string;       // hero headline
  subheadline: string;    // hero sub
  logo: string;           // CDN URL
  accentFrom: string;     // kept for compat
  accentTo: string;       // kept for compat
  accentGlow: string;     // kept for compat
  borderColour: string;   // kept for compat
  bgColour: string;       // kept for compat
  badgeClass: string;     // kept for compat
  ctaHref: string;        // primary CTA link
  ctaLabel: string;       // primary CTA text
  whatItDoes: string;     // paragraph
  capabilities: string[]; // 3-6 bullet capabilities
  howItWorks: ProductStep[];
  benefits: ProductBenefit[];
  exampleOutput?: ReactNode;
  related: RelatedProduct[];
}

const WIZAI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";

export default function ProductPageTemplate(props: ProductPageProps) {
  const {
    name, role, tagline, headline, subheadline, logo,
    ctaHref, ctaLabel, whatItDoes, capabilities, howItWorks, benefits,
    exampleOutput, related,
  } = props;

  return (
    <div className="bg-[#040404] text-white min-h-screen overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-[--color-gold]/[0.06] bg-[#040404]/90 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back" />
            <div className="flex items-center gap-3">
              <img src={logo} alt={name} className="h-8 w-auto object-contain" />
              <span className="px-2.5 py-1 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[10px] font-bold tracking-[0.15em] uppercase text-[--color-gold-dark]">{tagline}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NavLink href="/" className="nav-link">Home</NavLink>
            <NavLink href="/create" className="nav-link">All Tools</NavLink>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative py-24 px-6 overflow-hidden">
        {/* Background radial glow — gold tinted */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(196,164,100,0.06) 0%, transparent 65%)" }}
        />
        <div className="max-w-5xl mx-auto text-center relative">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt={name}
              className="h-24 w-auto object-contain"
              style={{ filter: "drop-shadow(0 0 24px rgba(196,164,100,0.15))" }}
            />
          </div>

          {/* Role pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            {role} · {tagline}
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 metallic-gold">
            {headline}
          </h1>
          <p className="text-[--color-silver-dark]/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NavLink
              href={ctaHref}
              className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-sm"
            >
              <Sparkles className="w-4 h-4" />
              {ctaLabel} <ArrowRight className="w-4 h-4" />
            </NavLink>
            <NavLink
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-sm text-[--color-silver-dark]/60 border border-[--color-gold]/[0.08] hover:border-[--color-gold]/[0.15] hover:text-[--color-silver] transition-all"
            >
              See all modules <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── What It Does ── */}
      <section className="py-20 px-6 bg-[#080808]">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-6">
            What It Does
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-[--color-silver]/70 text-lg leading-relaxed mb-8">{whatItDoes}</p>
              <ul className="space-y-3">
                {capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[--color-gold]" />
                    <span className="text-[--color-silver]/70 text-sm">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Visual placeholder — luxury glass card */}
            <div className="rounded-2xl border border-[--color-gold]/[0.08] bg-[#0a0a0a] p-8 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(196,164,100,0.08) 0%, transparent 70%)" }}
              />
              <img src={logo} alt={name} className="h-20 w-auto object-contain relative z-10 mb-4" />
              <div className="text-sm font-semibold text-[--color-gold] relative z-10">{name}</div>
              <div className="text-xs text-[--color-silver-dark]/30 relative z-10 mt-1">{role}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              From input to output — step by step
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div key={step.num} className="relative p-6 rounded-2xl border border-[--color-gold]/[0.06] bg-[#0a0a0a]">
                {/* Step number */}
                <div className="text-xs font-mono font-bold text-[--color-gold-dark] mb-3 opacity-60">
                  {step.num}
                </div>
                {/* Icon */}
                <div className="text-3xl mb-3">
                  {step.icon.startsWith("http") ? (
                    <img src={step.icon} alt={step.title} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-[--color-gold]">{step.icon}</span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-[--color-silver-dark]/45 leading-relaxed">{step.desc}</p>
                {/* Connector arrow */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-[--color-gold]/[0.15]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Benefits ── */}
      <section className="py-20 px-6 bg-[#080808]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">
              Key Benefits
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              Why {name} changes everything
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="p-6 rounded-2xl border border-[--color-gold]/[0.06] bg-[#0a0a0a] hover:border-[--color-gold]/[0.12] transition-colors">
                <h3 className="text-sm font-bold text-[--color-gold] mb-2">{b.title}</h3>
                <p className="text-xs text-[--color-silver-dark]/50 leading-relaxed">{b.desc}</p>
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark] mb-4">
                Example Output
              </div>
              <h2 className="text-3xl font-extrabold text-white">See it in action</h2>
            </div>
            {exampleOutput}
          </div>
        </section>
      )}

      {/* ── Related Modules ── */}
      <section className="py-20 px-6 bg-[#080808]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-white mb-2">Part of the WIZ AI Engine</h2>
            <p className="text-[--color-silver-dark]/40 text-sm">Each module works in sequence — explore the full pipeline</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {related.map((r) => (
              <NavLink
                key={r.name}
                href={r.href}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[--color-gold]/[0.08] bg-[--color-gold]/[0.02] text-sm text-[--color-silver-dark]/60 hover:text-[--color-silver] hover:border-[--color-gold]/[0.15] transition-all"
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
          <p className="text-[--color-silver-dark]/50 mb-8">Start creating cinematic AI videos today — no experience required.</p>
          <NavLink
            href={ctaHref}
            className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-sm"
          >
            <Sparkles className="w-4 h-4" />
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <NavLink href="/">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.2rem] w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" />
            </NavLink>
            <div className="flex items-center gap-5 text-xs text-[--color-silver-dark]/30">
              <Link href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</Link>
              <Link href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</Link>
              <Link href="/help" className="hover:text-[--color-gold-dark] transition-colors">Help</Link>
            </div>
          </div>
          <div className="luxury-divider" />
          <p className="text-center text-xs text-[--color-silver-dark]/25 pt-6">&copy; 2026 WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
