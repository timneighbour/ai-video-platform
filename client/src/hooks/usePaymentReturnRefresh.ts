/**
 * usePaymentReturnRefresh
 *
 * Handles two scenarios after a Stripe checkout redirect:
 *
 * 1. Same-tab redirect (new behaviour): Stripe returns to `/account?checkout=success`
 *    or `/subscribe?checkout=cancelled`. We detect these URL params on mount,
 *    show a toast, invalidate credit/subscription queries, then clean the URL.
 *
 * 2. Tab-focus fallback (legacy): If the user somehow returns to the tab after
 *    completing checkout in a separate window, we still invalidate on focus.
 */
import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function usePaymentReturnRefresh() {
  const utils = trpc.useUtils();
  const lastRefreshRef = useRef<number>(0);
  const DEBOUNCE_MS = 3_000;

  const refresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < DEBOUNCE_MS) return;
    lastRefreshRef.current = now;
    utils.billing.getCredits.invalidate();
    utils.billing.getSubscription.invalidate();
  }, [utils]);

  // ── Same-tab redirect detection ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const topup = params.get("topup");

    if (checkout === "success" || topup === "success") {
      // Give the webhook a moment to process before refreshing
      setTimeout(() => {
        refresh();
        if (checkout === "success") {
          toast.success("Subscription activated!", {
            description: "Your plan is now active and credits have been added to your account.",
            duration: 6_000,
          });
        } else {
          toast.success("Credits added!", {
            description: "Your new credits are ready to use across all WIZ AI studios.",
            duration: 6_000,
          });
        }
      }, 2_000);

      // Clean the URL so refreshing the page doesn't re-trigger
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    } else if (checkout === "cancelled" || topup === "canceled") {
      toast.info("Checkout cancelled", {
        description: "No charge was made. You can return to checkout any time.",
      });
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tab-focus fallback ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const handleFocus = () => refresh();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);
}
