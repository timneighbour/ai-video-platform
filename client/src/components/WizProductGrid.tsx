/**
 * WizProductGrid — "Explore the Studios" section
 *
 * Layout:
 *   Row 1 — CREATE  (7 tiles: WizAudio, WizImage, WizVideo, WizAnimate, WizScore, WizShorts, WizScript)
 *   Row 2 — ENHANCE (2 tiles: WizSound, WizLumina)
 *   Row 3 — GROW    (1 tile:  WizBoost)
 *
 * Each tile: real app screenshot bg, product name, one-line benefit, hover zoom + glow, links to product page.
 * No icons — screenshot-first design.
 */
import { ArrowRight } from "@/lib/icons";
import { mp } from "@/lib/mixpanel";
import { getProduct } from "@/lib/products";
import { WIZANIMATE_PRODUCT_PAGE } from "@/lib/routes";

/* ── CDN asset constants ─────────────────────────────────────────────────── */
const CDN = `https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx`;

// App UI screenshots (CREATE row)
const APP_WIZSOUND   = `/manus-storage/app-wizsound-ui_4f315efe.jpg`;
const APP_WIZIMAGE   = `/manus-storage/app-wizimage-ui_ec33bf0e.jpg`;
const APP_WIZVIDEO   = `/manus-storage/app-wizvideo-ui-v2_126b7056.jpg`;
const APP_WIZANIMATE = `/manus-storage/app-wizanimate-ui-v2_1c249a46.jpg`;
const APP_WIZSCORE   = `/manus-storage/app-wizscore-ui-v2_67194998.jpg`;
const APP_WIZSHORTS  = `/manus-storage/app-wizshorts-ui-v2_be36b6fa.jpg`;
const APP_WIZSCRIPT  = `/manus-storage/app-wizscript-ui-v2_ca5cd09f.jpg`;

// Hero images for ENHANCE / GROW rows
const HERO_WIZSOUND  = `/manus-storage/product-wizsound-hero_8219d2d2.jpg`;
const HERO_WIZLUMINA = `/manus-storage/product-wizlumina-hero_ed20683e.jpg`;
const HERO_WIZBOOST  = `/manus-storage/product-wizboost-hero_9c11e1cc.jpg`;

/* ── Tile data ───────────────────────────────────────────────────────────── */
interface StudioTile {
  name: string;
  benefit: string;
  href: string;
  image: string;
  glowColor: string;
  borderHover: string;
}

const CREATE_TILES: StudioTile[] = [
  {
    name: "WizAudio™",
    benefit: "Original songs & studio voiceover",
    href: getProduct("wizsound")?.productPage ?? "/products/wizsound",
    image: APP_WIZSOUND,
    glowColor: "rgba(196,164,100,0.30)",
 borderHover: "rgba(196,164,100,0.55)",
 },
 {
    name: "WizImage™",
    benefit: "Images, art & cover design",
    href: getProduct("wizimage")?.productPage ?? "/products/wizimage",
    image: APP_WIZIMAGE,
    glowColor: "rgba(196,164,100,0.30)",
 borderHover: "rgba(196,164,100,0.55)",
 },
 {
    name: "WizVideo™",
    benefit: "Cinematic music videos & film scenes",
    href: getProduct("wizvideo")?.productPage ?? "/music-video",
    image: APP_WIZVIDEO,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
  {
    name: "WizAnimate™",
    benefit: "Animation & motion graphics",
    href: WIZANIMATE_PRODUCT_PAGE,
    image: APP_WIZANIMATE,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
  {
    name: "WizScore™",
    benefit: "Bespoke soundtracks & scoring",
    href: getProduct("wizscore")?.productPage ?? "/products/wizscore",
    image: APP_WIZSCORE,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
  {
    name: "WizShorts™",
    benefit: "Scroll-stopping vertical shorts",
    href: getProduct("wizshorts")?.productPage ?? "/products/wizshorts",
    image: APP_WIZSHORTS,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
  {
    name: "WizScript™",
    benefit: "Storyboards & scripts to plan every shot",
    href: getProduct("wizscript")?.productPage ?? "/products/wizscript",
    image: APP_WIZSCRIPT,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
];

const ENHANCE_TILES: StudioTile[] = [
  {
    name: "WizSound™",
    benefit: "Studio-grade audio mastering & enhancement",
    href: "/products/wizsound",
    image: HERO_WIZSOUND,
    glowColor: "rgba(196,164,100,0.30)",
 borderHover: "rgba(196,164,100,0.55)",
 },
 {
 name: "WizLumina™",
    benefit: "Cinematic colour grading & visual polish",
    href: "/products/wizlumina",
    image: HERO_WIZLUMINA,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
];

const GROW_TILES: StudioTile[] = [
  {
    name: "WizBoost\u2122",
    benefit: "Optimise, distribute, and grow your audience across every platform",
    href: "/products/wizboost",
    image: HERO_WIZBOOST,
    glowColor: "rgba(196,164,100,0.30)",
    borderHover: "rgba(196,164,100,0.55)",
  },
];

const DISCOVER_TILES: StudioTile[] = [
  {
    name: "WizaVision",
    benefit: "Watch & discover AI-generated videos from creators worldwide",
    href: "/wizavision",
    image: `/manus-storage/product-wizlumina-hero_ed20683e.jpg`,
    glowColor: "rgba(120,100,220,0.35)",
    borderHover: "rgba(140,120,240,0.60)",
  },
];

/* ── Tile component ──────────────────────────────────────────────────────── */
function Tile({ tile, height = 220 }: { tile: StudioTile; height?: number }) {
  return (
    <a
      href={tile.href}
      onClick={() => mp.productCardClicked(tile.name)}
      className="group relative block overflow-hidden rounded-2xl cursor-pointer wiz-tile"
      data-h={height}
      style={{
        height: `${Math.round(height * 0.73)}px`,
        border: "1px solid rgba(196,164,100,0.18)",
        transition: "border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = tile.borderHover;
        el.style.boxShadow = `0 0 40px ${tile.glowColor}, 0 8px 32px rgba(0,0,0,0.6)`;
        el.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(196,164,100,0.18)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Background image with zoom on hover */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        style={{ backgroundImage: `url(${tile.image})` }}
      />

      {/* Dark gradient overlay — stronger at bottom for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Accent glow on hover — bottom radial */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 110%, ${tile.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top bevel highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{ backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(232,213,160,0.25) 30%, rgba(232,213,160,0.45) 50%, rgba(232,213,160,0.25) 80%, transparent 100%)" }}
      />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Product name */}
        <h3
          className="font-black text-lg leading-tight mb-1.5 transition-transform duration-300 group-hover:-translate-y-0.5"
          style={{
            backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 40%, #ffffff 70%, #e8d5a0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {tile.name}
        </h3>

        {/* One-line benefit */}
        <p className="text-white/65 text-sm leading-snug group-hover:text-white/90 transition-colors duration-300">
          {tile.benefit}
        </p>

        {/* Arrow CTA — appears on hover */}
        <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className="text-[11px] font-black tracking-[0.15em] uppercase" style={{ color: "#d4a843" }}>
            Explore Studio
          </span>
          <ArrowRight className="w-3 h-3" style={{ color: "#d4a843" }} />
        </div>
      </div>
    </a>
  );
}

/* ── Row label ───────────────────────────────────────────────────────────── */
function RowLabel({ label, count, accentColor }: { label: string; count: number; accentColor: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span
        className="text-[10px] font-black tracking-[0.35em] uppercase flex-shrink-0"
        style={{ color: accentColor }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{
          color: accentColor,
          background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
        }}
      >
        {count}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accentColor} 35%, transparent) 0%, transparent 100%)` }}
      />
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function WizProductGrid() {
  return (
    <section
      id="studios"
      className="relative py-28 px-6 scroll-mt-20 overflow-hidden"
      style={{ backgroundImage: "linear-gradient(180deg, #030303 0%, #050505 50%, #030303 100%)" }}
    >
      {/* Atmospheric depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: [
 "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(196,164,100,0.06) 0%, transparent 70%)",
 "radial-gradient(ellipse 60% 40% at 80% 30%, rgba(196,164,100,0.05) 0%, transparent 70%)",
 "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(196,164,100,0.05) 0%, transparent 70%)",
 "radial-gradient(ellipse 40% 30% at 50% 50%, rgba(196,164,100,0.08) 0%, transparent 70%)",
        ].join(", "),
      }} />

      {/* Grain texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }} />

      <div className="luxury-divider absolute top-0 left-0 right-0" />

      <div className="max-w-7xl mx-auto relative">
        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="mb-16 reveal text-center">
          <p className="text-[clamp(1rem,2.5vw,1.5rem)] font-black tracking-[0.35em] uppercase text-[--color-gold-dark] mb-5">
            ONE SUBSCRIPTION UNLOCKS ALL 7
          </p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-3">
            Every studio. One shared wallet.
          </h2>
          <p className="text-white/40 text-base max-w-2xl leading-relaxed mx-auto">
            Music videos, images, shorts, animation, audio, scoring and scripts —
            all powered by a single credit balance. Try everything free.
          </p>
        </div>
        {/* ── Row 1: CREATE (7 tiles) — 4 top + 3 centred bottom ─────────── */}
        <div className="mb-14 reveal">
          <RowLabel label="Create" count={7} accentColor="#c4a464" />
          {/* Top row: 4 equal tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {CREATE_TILES.slice(0, 4).map((tile) => (
              <Tile key={tile.name} tile={tile} height={220} />
            ))}
          </div>
          {/* Bottom row: 3 tiles centred — use a max-w wrapper so they don't stretch full width */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full sm:max-w-[calc(75%+8px)]">
              {CREATE_TILES.slice(4, 7).map((tile) => (
                <Tile key={tile.name} tile={tile} height={220} />
              ))}
            </div>
          </div>
        </div>
        {/* ── Row 2: ENHANCE (2 tiles) ─────────────────────────────────── */}
        <div className="mb-14 reveal">
          <RowLabel label="Enhance" count={2} accentColor="#d4a843" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ENHANCE_TILES.map((tile) => (
              <Tile key={tile.name} tile={tile} height={260} />
            ))}
          </div>
        </div>

        {/* ── Row 3: GROW (1 tile, full width) ─────────────────────────── */}
        <div className="mb-14 reveal">
          <RowLabel label="Grow" count={1} accentColor="#818cf8" />
          <div className="grid grid-cols-1 gap-4">
            {GROW_TILES.map((tile) => (
              <Tile key={tile.name} tile={tile} height={260} />
            ))}
          </div>
        </div>

        {/* ── Row 4: DISCOVER (WizaVision) ─────────────────────────────── */}
        <div className="mb-14 reveal">
          <RowLabel label="Discover" count={1} accentColor="#a78bfa" />
          <div className="grid grid-cols-1 gap-4">
            {DISCOVER_TILES.map((tile) => (
              <Tile key={tile.name} tile={tile} height={260} />
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ──────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6 reveal">
          <div>
            <p className="text-white/25 text-xs">
              30 free credits on sign-up — no card required.
            </p>
            <p className="text-white/15 text-xs mt-0.5">
              Spend them across any studio. Preview before you download.
            </p>
          </div>
          <a
            href="/onboarding"
            onClick={() => mp.startCreatingClicked("homepage_product_grid")}
            className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold flex-shrink-0"
          >
            <span>Start free — 30 credits</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>

      <div className="luxury-divider absolute bottom-0 left-0 right-0" />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 640px) {
          .wiz-tile[data-h="220"] { height: 220px !important; }
          .wiz-tile[data-h="260"] { height: 260px !important; }
        }
      `}</style>
    </section>
  );
}
