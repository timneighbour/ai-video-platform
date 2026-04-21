/**
 * Currency Router
 * - getExchangeRates: fetches live GBP-based rates, cached 1 hour server-side
 * - detectCurrency: detects user's currency from their IP address
 */
import { publicProcedure, router } from "../_core/trpc";

// ── In-memory cache ────────────────────────────────────────────────────────────
interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}
let rateCache: RateCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Supported currencies with display metadata
export const SUPPORTED_CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", flag: "🇲🇽" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", flag: "🇳🇴" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", flag: "🇩🇰" },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "🇿🇦" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", flag: "🇰🇷" },
  { code: "THB", symbol: "฿", name: "Thai Baht", flag: "🇹🇭" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty", flag: "🇵🇱" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna", flag: "🇨🇿" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint", flag: "🇭🇺" },
  { code: "RON", symbol: "lei", name: "Romanian Leu", flag: "🇷🇴" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", flag: "🇹🇷" },
] as const;

type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

// Country → currency mapping for geolocation
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD",
  JP: "JPY", CN: "CNY", IN: "INR", BR: "BRL", MX: "MXN",
  SG: "SGD", HK: "HKD", CH: "CHF", SE: "SEK", NO: "NOK",
  DK: "DKK", ZA: "ZAR", AE: "AED", SA: "SAR", KR: "KRW",
  TH: "THB", MY: "MYR", ID: "IDR", PH: "PHP", PL: "PLN",
  CZ: "CZK", HU: "HUF", RO: "RON", TR: "TRY",
  // Euro zone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
  IE: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR",
  LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR",
};

async function fetchRates(): Promise<Record<string, number>> {
  // Use open.er-api.com — free, no key required, updates daily
  const res = await fetch("https://open.er-api.com/v6/latest/GBP", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);
  const data = await res.json() as { result: string; rates: Record<string, number> };
  if (data.result !== "success") throw new Error("Exchange rate API returned non-success");
  return data.rates;
}

async function getCachedRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (rateCache && now - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.rates;
  }
  try {
    const rates = await fetchRates();
    rateCache = { rates, fetchedAt: now };
    return rates;
  } catch (err) {
    console.error("[Currency] Failed to fetch exchange rates:", err);
    // Return cached rates if available even if stale, else fallback
    if (rateCache) return rateCache.rates;
    // Hardcoded fallback rates (approximate, GBP base)
    return {
      GBP: 1, USD: 1.27, EUR: 1.17, CAD: 1.73, AUD: 1.95,
      NZD: 2.11, JPY: 190, CNY: 9.2, INR: 106, BRL: 6.5,
      MXN: 21.5, SGD: 1.71, HKD: 9.9, CHF: 1.13, SEK: 13.2,
      NOK: 13.5, DKK: 8.7, ZAR: 23.5, AED: 4.67, SAR: 4.76,
      KRW: 1700, THB: 44, MYR: 5.9, IDR: 20200, PHP: 72,
      PLN: 5.0, CZK: 29, HUF: 460, RON: 5.8, TRY: 41,
    };
  }
}

export const currencyRouter = router({
  // Get all exchange rates (GBP base) — cached 1h
  getExchangeRates: publicProcedure.query(async () => {
    const rates = await getCachedRates();
    // Filter to only supported currencies
    const filtered: Record<string, number> = {};
    for (const c of SUPPORTED_CURRENCIES) {
      if (rates[c.code] !== undefined) {
        filtered[c.code] = rates[c.code];
      }
    }
    return {
      base: "GBP" as const,
      rates: filtered,
      currencies: SUPPORTED_CURRENCIES,
    };
  }),

  // Detect currency from IP address
  detectCurrency: publicProcedure.query(async ({ ctx }) => {
    try {
      // Get real IP — behind proxy, check x-forwarded-for
      const forwarded = ctx.req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : ctx.req.socket.remoteAddress ?? "";

      // Skip loopback / private IPs
      if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168") || ip.startsWith("10.")) {
        return { currency: "GBP", country: "GB", detected: false };
      }

      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "WizAI/1.0" },
      });
      if (!res.ok) return { currency: "GBP", country: "GB", detected: false };

      const data = await res.json() as { country_code?: string; currency?: string; error?: boolean };
      if (data.error) return { currency: "GBP", country: "GB", detected: false };

      const countryCode = data.country_code ?? "";
      const detectedCurrency = data.currency ?? COUNTRY_CURRENCY_MAP[countryCode] ?? "GBP";

      // Verify it's in our supported list
      const supported = SUPPORTED_CURRENCIES.find(c => c.code === detectedCurrency);
      const finalCurrency = supported ? detectedCurrency : "GBP";

      return {
        currency: finalCurrency,
        country: countryCode,
        detected: true,
      };
    } catch {
      return { currency: "GBP", country: "GB", detected: false };
    }
  }),
});
