/**
 * useCreditGuard — behavioural credit triggers for WIZ AI.
 *
 * Provides three trigger functions:
 *  1. checkLowCredits()  — shows a toast when balance < LOW_CREDIT_THRESHOLD
 *  2. checkCanAfford()   — returns true/false; shows modal if user can't afford
 *  3. showCinematicUpsell() — shows post-video upsell toast for cinematic upgrade
 *
 * Language rule: always say "Credits", never "tokens", "cost", or "API".
 */
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LOW_CREDIT_THRESHOLD } from "../../../shared/const";
import { mp } from "@/lib/mixpanel";

export function useCreditGuard() {
  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const balance = creditData?.balance ?? 0;

  // Prevent duplicate low-credit toasts within the same session
  const lowCreditToastShown = useRef(false);

  /**
   * Show a low-credit warning toast once per session when balance is low.
   * Call this after any credit deduction.
   */
  const checkLowCredits = useCallback(() => {
    if (balance > 0 && balance < LOW_CREDIT_THRESHOLD && !lowCreditToastShown.current) {
      lowCreditToastShown.current = true;
      mp.creditBalanceLow(balance);
      toast.warning(`You're running low on Credits (${balance} left)`, {
        description: "Top up now to keep creating without interruption.",
        duration: 8000,
        action: {
          label: "Buy Credits",
          onClick: () => { window.location.href = "/credits"; },
        },
      });
    }
    if (balance === 0 && !lowCreditToastShown.current) {
      lowCreditToastShown.current = true;
      toast.error("You've run out of Credits", {
        description: "Get more Credits to continue creating videos.",
        duration: 10000,
        action: {
          label: "Get Credits",
          onClick: () => { window.location.href = "/credits"; },
        },
      });
    }
  }, [balance]);

  /**
   * Check if the user can afford an operation.
   * Returns true if they can, false if not.
   * If they can't afford it, shows an error toast with a link to /credits.
   *
   * @param creditCost - Number of credits required
   * @param operationLabel - Human-readable label e.g. "create this video"
   */
  const checkCanAfford = useCallback(
    (creditCost: number, operationLabel = "create this video"): boolean => {
      if (balance >= creditCost) return true;

      const shortfall = creditCost - balance;
      toast.error(`Not enough Credits to ${operationLabel}`, {
        description: `You need ${creditCost} Credits but have ${balance}. You're ${shortfall} Credits short.`,
        duration: 10000,
        action: {
          label: "Get Credits",
          onClick: () => { window.location.href = "/credits"; },
        },
      });
      return false;
    },
    [balance]
  );

  /**
   * Show a post-video cinematic upsell toast.
   * Call this after a video has been successfully rendered.
   *
   * @param videoTitle - Optional video title for personalisation
   */
  const showCinematicUpsell = useCallback((videoTitle?: string) => {
    const label = videoTitle ? `"${videoTitle}"` : "your video";
    toast.success(`${label} is ready!`, {
      description: "Want to make it even more impressive? Upgrade key scenes to cinematic quality for 20 Credits each.",
      duration: 12000,
      action: {
        label: "Upgrade Scenes",
        onClick: () => { window.location.href = "/credits#cinematic"; },
      },
    });
  }, []);

  return {
    balance,
    isLow: balance > 0 && balance < LOW_CREDIT_THRESHOLD,
    isEmpty: balance === 0,
    checkLowCredits,
    checkCanAfford,
    showCinematicUpsell,
  };
}
