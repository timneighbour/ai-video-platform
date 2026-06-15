import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// Provider names that must never appear in client-facing error messages
const SENSITIVE_TERMS = [
  /suno/gi, /grok/gi, /wavespeed/gi, /seedance/gi, /kling/gi,
  /heygen/gi, /runway/gi, /fal\.ai/gi, /elevenlabs/gi, /musetalk/gi,
  /openai/gi, /anthropic/gi, /gemini/gi, /replicate/gi, /hailuo/gi,
  /minimax/gi, /xai/gi, /audiopipe/gi, /aiquickdraw/gi,
];

function sanitiseErrorMessage(msg: string): string {
  let sanitised = msg;
  for (const term of SENSITIVE_TERMS) {
    sanitised = sanitised.replace(term, "WIZ AI");
  }
  return sanitised;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Sanitise internal error messages before sending to client
    const safeMessage = sanitiseErrorMessage(shape.message);
    return {
      ...shape,
      message: safeMessage,
      data: {
        ...shape.data,
        // Strip stack traces in production
        stack: process.env.NODE_ENV === 'production' ? undefined : shape.data?.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ── ISS-003: Per-user render job rate limiter ─────────────────────────────────
// Tracks how many render-job mutations a user has made in the last hour.
// Stored in-process memory (sufficient for single-process deployment).
const renderJobCounts = new Map<string, number[]>(); // userId → array of timestamps
const RENDER_JOB_LIMIT = 5; // max render jobs per user per hour
const RENDER_JOB_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Procedures that count against the per-user render job limit
const RENDER_JOB_PROCEDURES = new Set([
  "musicVideo.createJob",
  "kidsVideo.createJob",
  "wizShorts.createJob",
  "enhancement.createJob",
]);

const renderJobRateLimiter = t.middleware(async opts => {
  const { ctx, path, next } = opts;
  if (ctx.user && ctx.user.role !== "admin" && RENDER_JOB_PROCEDURES.has(path)) {
    const now = Date.now();
    const userId = String(ctx.user.id);
    const timestamps = (renderJobCounts.get(userId) ?? []).filter(ts => now - ts < RENDER_JOB_WINDOW_MS);
    if (timestamps.length >= RENDER_JOB_LIMIT) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `You have created ${RENDER_JOB_LIMIT} videos in the last hour. Please wait before creating another.`,
      });
    }
    timestamps.push(now);
    renderJobCounts.set(userId, timestamps);
  }
  return next();
});

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(renderJobRateLimiter).use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
