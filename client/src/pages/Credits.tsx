import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { mp } from "@/lib/mixpanel";
import {
  Zap,
  ArrowLeft,
  Sparkles,
  Film,
  CheckCircle2,
  Star,
  Clapperboard,
} from "@/lib/icons";
import CreditBalance from "@/components/CreditBalance";

// ── Option A credit packs (profitable pricing) ──────────────────────────────
// Margin: 25–47% after API costs. 1 scene ≈ 15 credits (short) / 18–20 (long).
const STANDARD_PACKS = [
  {
    id: "spark" as const,
    name: "Spark",
    tagline: "Quick top-up",
    price: 3.99,
    priceDisplay: "£3.99",
    credits: 50,
    videos: "~3 scenes",
    perCreditPence: 8.0,
    popular: false,
    perks: [
      "50 Credits",
      "~3 rendered scenes",
      "Never expires",
      "Instant delivery",
    ],
  },
  {
    id: "boost" as const,
    name: "Boost",
    tagline: "Short video top-up",
    price: 9.99,
    priceDisplay: "£9.99",
    credits: 150,
    videos: "~10 scenes",
    perCreditPence: 6.7,
    popular: false,
    perks: [
      "150 Credits",
      "~10 rendered scenes",
      "Never expires",
      "Instant delivery",
    ],
  },
  {
    id: "creator" as const,
    name: "Creator",
    tagline: "Full short video",
    price: 21.99,
    priceDisplay: "£21.99",
    credits: 350,
    videos: "~23 scenes",
    perCreditPence: 6.3,
    popular: true,
    perks: [
      "350 Credits",
      "~23 rendered scenes",
      "Covers a full short video",
      "Never expires",
      "Instant delivery",
    ],
  },
  {
    id: "studio" as const,
    name: "Studio",
    tagline: "2 full videos",
    price: 44.99,
    priceDisplay: "£44.99",
    credits: 750,
    videos: "~50 scenes",
    perCreditPence: 6.0,
    popular: false,
    perks: [
      "750 Credits",
      "~50 rendered scenes",
      "Covers 2 full videos",
      "Never expires",
      "Instant delivery",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    tagline: "4–5 videos",
    price: 84.99,
    priceDisplay: "£84.99",
    credits: 1500,
    videos: "~100 scenes",
    perCreditPence: 5.7,
    popular: false,
    perks: [
      "1,500 Credits",
      "~100 rendered scenes",
      "Covers 4–5 full videos",
      "Never expires",
      "Instant delivery",
    ],
  },
  {
    id: "elite" as const,
    name: "Elite",
    tagline: "Best per-credit rate",
    price: 199.99,
    priceDisplay: "£199.99",
    credits: 4000,
    videos: "~267 scenes",
    perCreditPence: 5.0,
    popular: false,
    perks: [
      "4,000 Credits",
      "~267 rendered scenes",
      "10+ full videos",
      "Never expires",
      "Instant delivery",
    ],
  },
] as const;

// ── Cinematic upgrade packs ──────────────────────────────────────────────────
const CINEMATIC_PACKS = [
  {
    id: "cinematic_10" as const,
    name: "10 Cinematic Scenes",
    price: 12,
    credits: 200,
    scenes: 10,
    description: "Apply premium visual enhancement to 10 key scenes across your videos",
  },
  {
    id: "cinematic_25" as const,
    name: "25 Cinematic Scenes",
    price: 25,
    credits: 500,
    scenes: 25,
    description: "Apply premium visual enhancement to 25 key scenes — perfect for series creators",
    popular: true,
  },
  {
    id: "cinematic_50" as const,
    name: "50 Cinematic Scenes",
    price: 45,
    credits: 1000,
    scenes: 50,
    description: "Maximum cinematic upgrades for power creators",
  },
] as const;

type PackId = typeof STANDARD_PACKS[number]["id"] | typeof CINEMATIC_PACKS[number]["id"];

export default function Credits() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<PackId | null>(null);

  useEffect(() => {
    if (!isAuthenticated) window.location.href = getLoginUrl("/credits");
  }, [isAuthenticated]);

  // Check for success/cancel query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled") === "true") {
      toast.info("Purchase cancelled", { description: "Your credits were not charged." });
    }
  }, []);

  const createCreditCheckout = trpc.billing.createCreditCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Use same-tab redirect — window.open() is blocked as a pop-up on most browsers
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => {
      toast.error("Checkout failed", { description: err.message });
    },
    onSettled: () => setLoading(null),
  });

  const handleCheckout = (packId: PackId) => {
    setLoading(packId);
    const allPacks = [...STANDARD_PACKS, ...CINEMATIC_PACKS] as readonly { id: string; name: string; price: number }[];
    const pack = allPacks.find((p) => p.id === packId);
    mp.checkoutStarted(pack?.name ?? packId, pack?.price);
    createCreditCheckout.mutate({ pack: packId, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
          <span className="text-sm font-semibold text-white">Buy Credits</span>
          <CreditBalance variant="badge" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            Credits never expire
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Get more Credits
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Credits are only used when you build or upgrade videos. Storyboard generation is always free — preview your full video before you spend a single credit.
          </p>
        </div>

        {/* Standard packs */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Film className="w-5 h-5 text-[--color-gold]" />
            <h2 className="text-xl font-bold">Build Credits</h2>
            <span className="text-xs text-zinc-500">50–4,000 Credits · from £3.99 · never expire</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STANDARD_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
                  pack.popular
                    ? "border-[--color-gold]/30 bg-gradient-to-b from-[#b8892a]/40 to-zinc-900/60 shadow-lg shadow-[#b8892a]/20"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[--color-gold] px-3 py-1 text-xs font-semibold text-white">
                      <Star className="w-3 h-3" />
                      Best Value
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{pack.tagline}</p>
                  <h3 className="text-xl font-bold text-white">{pack.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{pack.videos}</p>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">{(pack as { priceDisplay?: string }).priceDisplay ?? `£${pack.price}`}</span>
                  <span className="text-zinc-500 text-sm mb-1">one-time</span>
                </div>
                <p className="text-[11px] text-zinc-600 -mt-3">{(pack as { perCreditPence?: number }).perCreditPence?.toFixed(1)}p per credit</p>

                <ul className="space-y-2 flex-1">
                  {pack.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-[--color-gold] flex-shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleCheckout(pack.id)}
                  disabled={loading === pack.id}
                  className={`w-full font-semibold ${
                    pack.popular
                      ? "bg-[--color-gold] hover:bg-[--color-gold]/80 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                  }`}
                >
                  {loading === pack.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Buy {pack.credits.toLocaleString()} Credits
                    </span>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Cinematic upgrade packs */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Clapperboard className="w-5 h-5 text-[--color-gold]" />
            <h2 className="text-xl font-bold">Cinematic Upgrades</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-8">
            Upgrade individual scenes in your videos to premium cinematic quality. Each cinematic scene costs 20 Credits.
            Use these packs to top up your cinematic scene allowance.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {CINEMATIC_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all ${
                  (pack as { popular?: boolean }).popular
                    ? "border-[--color-gold]/30 bg-gradient-to-b from-[#b8892a]/30 to-zinc-900/60"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                {(pack as { popular?: boolean }).popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[--color-gold] px-3 py-1 text-xs font-semibold text-white">
                      <Sparkles className="w-3 h-3" />
                      Popular
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white">{pack.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{pack.description}</p>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-white">£{pack.price}</span>
                  <span className="text-zinc-500 text-sm mb-1">one-time</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-[--color-gold]">
                  <Sparkles className="w-4 h-4" />
                  {pack.scenes} cinematic scene upgrades
                </div>

                <Button
                  onClick={() => handleCheckout(pack.id)}
                  disabled={loading === pack.id}
                  className="w-full bg-[--color-gold]/15 hover:bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30 hover:border-[--color-gold]/30 font-semibold"
                >
                  {loading === pack.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[--color-gold]/30 border-t-amber-300 rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Buy {pack.scenes} Cinematic Upgrades
                    </span>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Trust signals */}
        <section className="grid md:grid-cols-3 gap-6 border-t border-zinc-800 pt-12">
          {[
            {
              icon: <Zap className="w-5 h-5 text-[--color-gold]" />,
              title: "Credits never expire",
              desc: "Buy now, use whenever. No monthly reset, no pressure.",
            },
            {
              icon: <CheckCircle2 className="w-5 h-5 text-[--color-silver]" />,
              title: "Instant delivery",
              desc: "Credits are added to your account immediately after payment.",
            },
            {
              icon: <Sparkles className="w-5 h-5 text-[--color-gold]" />,
              title: "Preview your video for free",
              desc: "Generate and refine your full storyboard as many times as you like — no Credits needed. You only pay when you’re happy and ready to build.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="mt-0.5">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}
