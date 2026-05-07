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
import { kidsVideoRouter } from "./routers/kidsVideo";
import { creatorRouter } from "./routers/creator";
import { wizSyncRouter } from "./routers/wizSync";
import { wizScoreRouter } from "./routers/wizScore";
import { wizImageRouter } from "./routers/wizImage";
import { wizShortsRouter } from "./routers/wizShorts";
import { analyticsRouter } from "./routers/analytics";
import { privacyRouter } from "./routers/privacy";
import { wizadoraAdminRouter } from "./routers/wizadora";
import { currencyRouter } from "./routers/currency";
import { voiceRouter } from "./routers/voice";
import { adminEmailRouter } from "./routers/adminEmail";
import { adminCreditsRouter } from "./routers/adminCredits";
import { unsubscribeRouter } from "./routers/unsubscribe";
import { characterLibraryRouter } from "./routers/characterLibrary";
import { studiosRouter } from "./routers/studios";
import { wizavisionRouter } from "./routers/wizavision";

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
  kidsVideo: kidsVideoRouter,
  creator: creatorRouter,
  wizSync: wizSyncRouter,
  wizScore: wizScoreRouter,
  wizImage: wizImageRouter,
  wizShorts: wizShortsRouter,
  analytics: analyticsRouter,
  privacy: privacyRouter,
  wizadora: wizadoraAdminRouter,
  currency: currencyRouter,
  voice: voiceRouter,
  adminEmail: adminEmailRouter,
  adminCredits: adminCreditsRouter,
  unsubscribe: unsubscribeRouter,
  characterLibrary: characterLibraryRouter,
  studios: studiosRouter,
  wizavision: wizavisionRouter,
  platform: router({
    stats: publicProcedure.query(async () => {
      try {
        const { getDb } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return { creators: 120, videosCreated: 340 };
        const [userRows, videoRows] = await Promise.all([
          db.execute(sql`SELECT COUNT(*) as cnt FROM users`),
          db.execute(sql`SELECT COUNT(*) as cnt FROM music_video_jobs WHERE status = 'completed'`),
        ]);
        const userCount = Number((userRows as any)[0]?.[0]?.cnt ?? 0);
        const videoCount = Number((videoRows as any)[0]?.[0]?.cnt ?? 0);
        return {
          creators: Math.max(userCount, 120),
          videosCreated: Math.max(videoCount, 340),
        };
      } catch {
        return { creators: 120, videosCreated: 340 };
      }
    }),
  }),
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
