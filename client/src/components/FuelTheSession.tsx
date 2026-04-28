/**
 * FuelTheSession — Studio Comforts shortcut panel.
 * Provides outbound links to food delivery services during long renders.
 * WIZ AI does not collect, store, or manage any delivery account data.
 */

import { ExternalLink, Sparkles } from "@/lib/icons";

const PROVIDERS = [
  {
    name: "Deliveroo",
    url: "https://deliveroo.co.uk",
    color: "#00CCBC",
    hoverBg: "hover:bg-[#00CCBC]/10 hover:border-[#00CCBC]/40",
    activeBorder: "border-[#00CCBC]/20",
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="#00CCBC" opacity="0.15" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#00CCBC" fontSize="14" fontWeight="bold">D</text>
      </svg>
    ),
  },
  {
    name: "Uber Eats",
    url: "https://www.ubereats.com/gb",
    color: "#06C167",
    hoverBg: "hover:bg-[#06C167]/10 hover:border-[#06C167]/40",
    activeBorder: "border-[#06C167]/20",
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="#06C167" opacity="0.15" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#06C167" fontSize="14" fontWeight="bold">U</text>
      </svg>
    ),
  },
  {
    name: "Just Eat",
    url: "https://www.just-eat.co.uk",
    color: "#FF8000",
    hoverBg: "hover:bg-[#FF8000]/10 hover:border-[#FF8000]/40",
    activeBorder: "border-[#FF8000]/20",
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="#FF8000" opacity="0.15" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#FF8000" fontSize="14" fontWeight="bold">J</text>
      </svg>
    ),
  },
];

interface FuelTheSessionProps {
  /** Compact variant for sidebars or narrow contexts */
  compact?: boolean;
}

export function FuelTheSession({ compact = false }: FuelTheSessionProps) {
  return (
    <section
      aria-label="Studio Comforts — food delivery shortcuts"
      className={`relative rounded-2xl overflow-hidden border border-[--color-gold]/[0.12] ${compact ? "p-4" : "p-6 sm:p-8"}`}
      style={{
        background:
          "linear-gradient(135deg, rgba(196,164,100,0.04) 0%, rgba(10,10,12,0.97) 60%, rgba(196,164,100,0.02) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Subtle top-left glow */}
      <div
        className="absolute top-0 left-0 w-48 h-24 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(196,164,100,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className={`flex items-start gap-3 ${compact ? "mb-4" : "mb-6"}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl border border-[--color-gold]/20 bg-[--color-gold]/[0.06] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[--color-gold-dark]" />
        </div>
        <div>
          <h3 className={`font-bold text-white tracking-tight ${compact ? "text-sm" : "text-base"}`}>
            Fuel the Session
          </h3>
          {!compact && (
            <p className="text-white/40 text-xs leading-relaxed mt-0.5 max-w-xs">
              Long render? Late-night creative flow? Order food, coffee or snacks while Wiz AI brings your project to life.
            </p>
          )}
        </div>
      </div>

      {/* Delivery buttons */}
      <div className={`flex ${compact ? "flex-col gap-2" : "flex-col sm:flex-row gap-3"}`}>
        {PROVIDERS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all duration-200 ${p.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-gold]/50`}
            aria-label={`Order on ${p.name} (opens in new tab)`}
          >
            {p.logo}
            <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors flex-1">
              {p.name}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-white/25 group-hover:text-white/50 transition-colors flex-shrink-0" />
          </a>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-white/20 text-[10px] leading-relaxed">
        Food orders are handled directly by the selected provider. Availability depends on your location.
      </p>
    </section>
  );
}
