/**
 * Sentry Error Monitoring (ISS-005)
 * ==================================
 * Initialise Sentry as early as possible in the server lifecycle.
 * Set SENTRY_DSN in the project secrets to activate monitoring.
 * If SENTRY_DSN is absent the module is a no-op — no errors are thrown.
 *
 * Usage:
 *   import "./sentry";          // at the very top of server/_core/index.ts
 *   import * as Sentry from "@sentry/node";
 *   Sentry.captureException(err);   // anywhere in server code
 */

import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Attach server-side source maps if available
    includeLocalVariables: true,
  });
  console.log("[Sentry] Initialised — error monitoring active");
} else {
  console.warn("[Sentry] SENTRY_DSN not set — error monitoring disabled. Set SENTRY_DSN in project secrets to enable.");
}

export { Sentry };
