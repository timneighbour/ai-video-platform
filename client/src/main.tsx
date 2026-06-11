import { trpc } from "@/lib/trpc";
import "@/lib/i18n"; // initialise i18n before app renders
import { initGA4 } from "@/lib/analytics";
import { initMixpanel } from "@/lib/mixpanel";
import {
  setConsentModeDefaults,
  getStoredConsent,
  applyConsentToTrackers,
} from "@/lib/cookieConsent";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { HelmetProvider } from "react-helmet-async";
import { SwUpdateBanner } from "@/components/SwUpdateBanner";
import FoundingCreatorBanner from "@/components/FoundingCreatorBanner";
import App from "./App";
import { getLoginUrl } from "./const";
import { GlobalAudioProvider } from "@/contexts/AudioContext";
import "./index.css";

// ── Consent Mode v2: set defaults BEFORE any gtag config calls ──────────────
// analytics_storage, ad_storage, ad_user_data, ad_personalization are all
// denied by default until the user explicitly consents via the cookie banner.
setConsentModeDefaults();

// ── Initialise trackers (consent-gated) ─────────────────────────────────────
// GA4 and Google Ads scripts are loaded in index.html but Consent Mode v2
// prevents data collection until consent is granted.
initGA4();

// Mixpanel: initialise but respect stored consent (opt-out if no analytics consent)
initMixpanel();

// Apply stored consent preferences on load (re-applies trackers after page refresh)
const storedConsent = getStoredConsent();
if (storedConsent) {
  applyConsentToTrackers(storedConsent.preferences);
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Procedures that run long AI tasks — use a dedicated non-batched link with no timeout
const AI_LONG_RUNNING_PROCEDURES = [
  "musicVideo.generateStoryboard",
  "musicVideo.createJob",
  "musicVideo.renderVideo",
  "autopilot.start",
  "wizpilot.generate",
  // WizShorts: pollProgress downloads scene clips; assembleJob triggers background ffmpeg
  "wizShorts.pollProgress",
  "wizShorts.assembleJob",
  // Voice transcription calls Whisper + LLM — can take 15-45s, must not be batched or timed out
  "voice.transcribeAndRefine",
];

const fetchWithCredentials = (input: RequestInfo | URL, init?: RequestInit) =>
  globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      // Route long-running AI procedures through a dedicated non-batched link
      condition(op) {
        return AI_LONG_RUNNING_PROCEDURES.some(
          (proc) => op.path === proc || op.path.startsWith(proc + ".")
        );
      },
      true: httpLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch: fetchWithCredentials,
      }),
      false: httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch: fetchWithCredentials,
      }),
    }),
  ],
});

// ── PWA: Register service worker ───────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("[PWA] Service worker registered:", reg.scope))
      .catch((err) => console.warn("[PWA] Service worker registration failed:", err));
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GlobalAudioProvider>
          <SwUpdateBanner />
          <FoundingCreatorBanner />
          <App />
        </GlobalAudioProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </HelmetProvider>
);
