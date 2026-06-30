import { Button } from "@/components/ui/button";
import { AlertCircle, Zap } from "@/lib/icons";
import { toast } from "sonner";

interface LowCreditPromptProps {
  currentCredits: number;
  creditsNeeded: number;
  onTopUp: () => void;
  onPayPerTrack: () => void;
  isLoading?: boolean;
}

/**
 * LowCreditPrompt — shown when user tries to download a song but lacks credits
 * Frames credit packs by value ("100 credits / £12 ≈ ~50 songs")
 * Also offers £3.99 one-off as alternative for single-track users
 */
export function LowCreditPrompt({
  currentCredits,
  creditsNeeded,
  onTopUp,
  onPayPerTrack,
  isLoading = false,
}: LowCreditPromptProps) {
  const creditShortfall = creditsNeeded - currentCredits;

  // Credit pack options with estimated song count
  const packs = [
    { credits: 100, price: "£12", songs: "~50", priceId: "STRIPE_TOPUP_SPARK_PRICE_ID" },
    { credits: 250, price: "£25", songs: "~125", priceId: "STRIPE_TOPUP_CREATOR_PRICE_ID" },
    { credits: 500, price: "£45", songs: "~250", priceId: "STRIPE_TOPUP_STUDIO_PRICE_ID" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#1a1a1f] to-[#0f0f14] rounded-lg border border-white/10 max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-white">Not Enough Credits</h3>
            <p className="text-xs text-white/50 mt-1">
              You have <span className="text-white/70 font-medium">{currentCredits}</span> credits, but need{" "}
              <span className="text-white/70 font-medium">{creditsNeeded}</span>
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-4" />

        {/* Option 1: Credit Packs */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Top Up Credits</p>
          <div className="grid gap-2">
            {packs.map((pack) => (
              <button
                key={pack.credits}
                onClick={() => onTopUp()}
                disabled={isLoading}
                className="flex items-center justify-between px-3 py-2.5 rounded-[6px] border border-white/10 hover:border-white/20 hover:bg-white/3 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">
                      {pack.credits} credits
                    </div>
                    <div className="text-[10px] text-white/40">
                      {pack.songs} songs
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-white/80">{pack.price}</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/35 mt-2">
            Each song download costs 2 credits. Unused credits roll over each month.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-4" />

        {/* Option 2: Pay Per Track */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Or Just This Track</p>
          <button
            onClick={() => onPayPerTrack()}
            disabled={isLoading}
            className="w-full px-3 py-2.5 rounded-[6px] bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            Unlock for £3.99
          </button>
          <p className="text-[10px] text-white/35 mt-2">
            One-time payment. The track stays unlocked for free re-downloads.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-4" />

        {/* Footer CTA */}
        <div className="text-center">
          <p className="text-[10px] text-white/40">
            Already subscribed? <span className="text-white/60">Your plan includes monthly credits.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LowCreditPrompt;
