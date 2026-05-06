/**
 * usePaymentReturnRefresh
 *
 * Detects when the user returns to this tab after completing a Stripe checkout
 * in a new tab, then immediately invalidates the credit balance query so the
 * updated balance appears without requiring a page reload.
 *
 * Strategy:
 *   - Listen to `visibilitychange` (tab becomes visible again)
 *   - Also listen to `focus` on the window (user clicks back to tab)
 *   - Debounce to avoid duplicate invalidations
 *   - Invalidate `billing.getCredits` which is used by:
 *       • DashboardLayout header badge
 *       • useCreditGuard (all studio pages)
 *       • CreditBalance component
 *       • Dashboard page
 *       • Account page
 *       • Credits page
 */
import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export function usePaymentReturnRefresh() {
  const utils = trpc.useUtils();
  const lastRefreshRef = useRef<number>(0);
  const DEBOUNCE_MS = 3_000; // prevent double-fire within 3 seconds

  const refresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < DEBOUNCE_MS) return;
    lastRefreshRef.current = now;
    // Invalidate credit balance — all components using this query will re-fetch
    utils.billing.getCredits.invalidate();
    // Also invalidate subscription in case they just subscribed
    utils.billing.getSubscription.invalidate();
  }, [utils]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const handleFocus = () => {
      refresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);
}
