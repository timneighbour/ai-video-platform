import { trpc } from "@/lib/trpc";
import "@/lib/i18n"; // initialise i18n before app renders
import { initGA4 } from "@/lib/analytics";
import { initMixpanel } from "@/lib/mixpanel";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Initialise GA4 analytics
initGA4();
// Initialise Mixpanel analytics
initMixpanel();

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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </HelmetProvider>
);
