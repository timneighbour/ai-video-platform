/**
 * logger.ts — Structured logging with pino (ISS-020).
 *
 * Usage:
 *   import logger from "./logger";
 *   logger.info({ jobId: 123 }, "Scene dispatched");
 *   logger.error({ err, jobId }, "Assembly failed");
 *
 * In production, logs are emitted as newline-delimited JSON.
 * In development, pino-pretty formats them for readability.
 */
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    // Rename pino's default 'msg' field to 'message' for compatibility with
    // common log aggregators (Datadog, CloudWatch, Logtail, etc.)
    messageKey: "message",
    // Include timestamp as ISO string for human readability in log viewers
    timestamp: pino.stdTimeFunctions.isoTime,
    // Redact sensitive fields that should never appear in logs
    redact: {
      paths: [
        "*.password",
        "*.token",
        "*.secret",
        "*.apiKey",
        "*.api_key",
        "*.authorization",
        "*.stripe_secret",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
    base: {
      service: "wiz-ai-platform",
      env: process.env.NODE_ENV ?? "development",
    },
  },
  // In development, use pino-pretty if available; fall back to stdout JSON
  isDev
    ? (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pretty = require("pino-pretty");
          return pretty({ colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname,service,env" });
        } catch {
          return undefined; // pino-pretty not installed — use JSON output
        }
      })()
    : undefined
);

export default logger;

/**
 * Create a child logger with persistent context fields.
 * Useful for adding jobId / userId to all log lines within a function scope.
 *
 * @example
 *   const log = childLogger({ jobId: 123, userId: 456 });
 *   log.info("Starting assembly");
 */
export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
