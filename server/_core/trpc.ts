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

export const protectedProcedure = t.procedure.use(requireUser);

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
