/**
 * HomePricingSection — simplified 3-plan pricing overview for the homepage.
 * Shows Starter / Creator / Studio cards with a "Create videos from £1 per minute" headline.
 * Links to /subscribe for full plan comparison.
 */
import { Link } from "wouter";
import { getPlan } from "@/lib/plans";
import { Check, ArrowRight, Zap, Star, Crown } from "lucide-react";

const FEATURED_PLANS = [
  { id: "starter", icon: <Zap className="w-5 h-5" /> },
  { id: "creator", icon: <Star className="w-5 h-5" /> },
  { id: "studio",  icon: <Crown className="w-5 h-5" /> },
] as const;

const TRUST_SIGNALS = [
  "Free storyboard — no credit card needed",
  "Cancel anytime",
  "Save 2 months with annual billing",
];

export default function HomePricingSection() {
  return (
    <section
      className="relative py-24 px-4 overflow-hidden"
      aria-labelledby="home-pricing-heading"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.35 0.12 280 / 0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: "oklch(0.82 0.16 80)" }}
          >
            Transparent Pricing
          </p>
          <h2
            id="home-pricing-heading"
            className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight"
          >
            Create for free.{" "}
            <span style={{ color: "oklch(0.82 0.16 80)" }}>Pay to render.</span>
          </h2>
          <p className="text-base text-white/60 max-w-xl mx-auto">
            Build your entire video — storyboard, scenes, lip sync — at no cost. Only pay when you're ready to download your finished video. No subscriptions required.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {FEATURED_PLANS.map(({ id, icon }) => {
            const plan = getPlan(id);
            if (!plan) return null;
            const isHighlight = plan.popular || plan.highlight;
            return (
              <div
                key={id}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  background: isHighlight
                    ? "linear-gradient(135deg, oklch(0.22 0.06 280 / 0.95), oklch(0.18 0.04 280 / 0.95))"
                    : "oklch(0.14 0.02 280 / 0.8)",
                  border: isHighlight
                    ? "1.5px solid oklch(0.82 0.16 80 / 0.45)"
                    : "1px solid oklch(1 0 0 / 0.08)",
                  boxShadow: isHighlight
                    ? "0 0 40px oklch(0.82 0.16 80 / 0.12)"
                    : "none",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                    style={{
                      background: "oklch(0.82 0.16 80)",
                      color: "#000",
                    }}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: isHighlight
                        ? "oklch(0.82 0.16 80 / 0.15)"
                        : "oklch(1 0 0 / 0.06)",
                      color: isHighlight ? "oklch(0.82 0.16 80)" : "oklch(0.7 0 0)",
                    }}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{plan.name}</p>
                    <p className="text-[11px] text-white/50">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  {plan.monthlyPrice === 0 ? (
                    <p className="text-3xl font-extrabold text-white">Free</p>
                  ) : (
                    <p className="text-3xl font-extrabold text-white">
                      £{plan.monthlyPrice}
                      <span className="text-sm font-normal text-white/50">/mo</span>
                    </p>
                  )}
                  {plan.annualSaving > 0 && (
                    <p className="text-[11px] text-white/40 mt-0.5">
                      or £{plan.annualTotal}/yr{" "}
                      <span style={{ color: "oklch(0.82 0.16 80)" }}>
                        save £{plan.annualSaving}
                      </span>
                    </p>
                  )}
                </div>

                {/* Top 4 outcomes */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.outcomes.slice(0, 4).map((o) => (
                    <li key={o} className="flex items-start gap-2 text-xs text-white/70">
                      <Check
                        className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        style={{ color: "oklch(0.82 0.16 80)" }}
                      />
                      {o}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/subscribe"
                  className="block text-center text-sm font-semibold py-2.5 rounded-xl transition-all duration-200"
                  style={
                    isHighlight
                      ? {
                          background: "oklch(0.82 0.16 80)",
                          color: "#000",
                        }
                      : {
                          background: "oklch(1 0 0 / 0.06)",
                          color: "oklch(0.85 0 0)",
                          border: "1px solid oklch(1 0 0 / 0.1)",
                        }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Cinematic Pack add-on */}
        <div
          className="rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
          style={{
            background: "oklch(0.14 0.02 280 / 0.7)",
            border: "1px solid oklch(1 0 0 / 0.08)",
          }}
        >
          <div>
            <p className="text-sm font-bold text-white mb-0.5">
              Cinematic Pack add-on{" "}
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full ml-1"
                style={{ background: "oklch(0.82 0.16 80 / 0.15)", color: "oklch(0.82 0.16 80)" }}
              >
                ★ BEST EXPERIENCE
              </span>
            </p>
            <p className="text-xs text-white/50">
              4K render + WizSound™ Cinematic audio mastering — the full premium output.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <p className="text-2xl font-extrabold text-white">
              £7
              <span className="text-xs font-normal text-white/40"> per video</span>
            </p>
            <Link
              href="/pricing"
              className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{
                background: "oklch(0.82 0.16 80 / 0.12)",
                color: "oklch(0.82 0.16 80)",
                border: "1px solid oklch(0.82 0.16 80 / 0.25)",
              }}
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
          {TRUST_SIGNALS.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-white/40">
              <Check className="w-3 h-3" style={{ color: "oklch(0.82 0.16 80)" }} />
              {t}
            </span>
          ))}
        </div>

        {/* Full pricing link */}
        <div className="text-center">
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: "oklch(0.82 0.16 80)" }}
          >
            See full pricing &amp; compare plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
