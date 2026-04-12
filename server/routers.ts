import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { billingRouter, renderRouter } from "./routers/billing";
import { musicVideoRouter } from "./routers/musicVideo";
import { videoRouter } from "./routers/video";
import { charactersRouter } from "./routers/characters";
import { showcaseRouter } from "./routers/showcase";
import { sunoRouter } from "./routers/suno";
import { kidsVideoAndCaptionsRouter } from "./routers/kidsVideoAndCaptions";
import { enhancementRouter } from "./routers/enhancement";
import { batchRegenRouter } from "./routers/batchRegen";
import { blogRouter } from "./routers/blog";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  billing: billingRouter,
  render: renderRouter,
  musicVideo: router({ ...musicVideoRouter._def.procedures, ...batchRegenRouter._def.procedures }),
  video: videoRouter,
  characters: charactersRouter,
  showcase: showcaseRouter,
  suno: sunoRouter,
  kidsVideoAndCaptions: kidsVideoAndCaptionsRouter,
  enhancement: enhancementRouter,
  blog: blogRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
