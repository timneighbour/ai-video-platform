/**
 * useCurrency — dynamic currency conversion hook for the Pricing page
 *
 * - Auto-detects user's currency via IP geolocation (server-side)
 * - Fetches live GBP-based exchange rates (cached 1h server-side)
 * - Allows manual override via localStorage
 * - Provides formatPrice() helper for consistent display
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "wiz_preferred_currency";

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export function useCurrency() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "GBP";
    } catch {
      return "GBP";
    }
  });

  // Fetch exchange rates (cached 1h on server)
  const { data: rateData, isLoading: ratesLoading } = trpc.currency.getExchangeRates.useQuery(
    undefined,
    { staleTime: 60 * 60 * 1000, retry: 1 }
  );

  // Detect user's currency from IP (only once, no refetch)
  const { data: detectionData } = trpc.currency.detectCurrency.useQuery(
    undefined,
    {
      staleTime: Infinity,
      retry: 0,
      // Only auto-apply if user hasn't manually chosen
      enabled: !localStorage.getItem(STORAGE_KEY),
    }
  );

  // Apply detected currency if user hasn't manually chosen
  useEffect(() => {
    const stored = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
    if (!stored && detectionData?.detected && detectionData.currency) {
      setSelectedCurrency(detectionData.currency);
    }
  }, [detectionData]);

  const setCurrency = useCallback((code: string) => {
    setSelectedCurrency(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const rates = rateData?.rates ?? {};
  const currencies: CurrencyMeta[] = (rateData?.currencies as CurrencyMeta[] | undefined) ?? [
    { code: "GBP", symbol: "£", name: "British Pound", flag: "" },
  ];

  const currentMeta = currencies.find(c => c.code === selectedCurrency) ?? currencies[0];

  /**
   * Convert a GBP price to the selected currency and format it.
   * @param gbpAmount  Price in GBP (e.g. 19)
   * @param opts.decimals  Force decimal places (default: auto)
   */
  const formatPrice = useCallback(
    (gbpAmount: number, opts?: { decimals?: number }) => {
      if (!rateData || selectedCurrency === "GBP") {
        return `£${gbpAmount}`;
      }
      const rate = rates[selectedCurrency] ?? 1;
      const converted = gbpAmount * rate;

      // Determine decimal places
      let decimals = opts?.decimals;
      if (decimals === undefined) {
        // JPY, KRW, IDR, HUF — no decimals
        const noDecimals = ["JPY", "KRW", "IDR", "HUF"];
        decimals = noDecimals.includes(selectedCurrency) ? 0 : 2;
      }

      const formatted = converted.toLocaleString("en", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      return `${currentMeta?.symbol ?? ""}${formatted}`;
    },
    [rateData, rates, selectedCurrency, currentMeta]
  );

  /**
   * Convert a GBP price to the selected currency (raw number).
   */
  const convertPrice = useCallback(
    (gbpAmount: number): number => {
      if (!rateData || selectedCurrency === "GBP") return gbpAmount;
      const rate = rates[selectedCurrency] ?? 1;
      return gbpAmount * rate;
    },
    [rateData, rates, selectedCurrency]
  );

  return {
    currency: selectedCurrency,
    setCurrency,
    currencies,
    currentMeta,
    formatPrice,
    convertPrice,
    isLoading: ratesLoading,
    rateData,
  };
}
