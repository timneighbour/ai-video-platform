import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
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
import { providerHealthRouter } from "./routers/providerHealth";
import { pipelineOpsRouter } from "./routers/pipelineOps";
import { unsubscribeRouter } from "./routers/unsubscribe";
import { characterLibraryRouter } from "./routers/characterLibrary";
import { studiosRouter } from "./routers/studios";
import { wizavisionRouter } from "./routers/wizavision";
import { notificationsRouter } from "./routers/notifications";

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
  providerHealth: providerHealthRouter,
  pipelineOps: pipelineOpsRouter,
  unsubscribe: unsubscribeRouter,
  characterLibrary: characterLibraryRouter,
  studios: studiosRouter,
  wizavision: wizavisionRouter,
  notifications: notificationsRouter,
  platform: router({
    stats: publicProcedure.query(async () => {
      try {
        const { getDb } = await import("./db");
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return { creators: 0, videosCreated: 0 };
        const [userRows, videoRows] = await Promise.all([
          db.execute(sql`SELECT COUNT(*) as cnt FROM users`),
          db.execute(sql`SELECT COUNT(*) as cnt FROM musicVideoJobs WHERE status = 'completed' AND finalVideoProduced = 1`),
        ]);
        const userCount = Number((userRows as any)[0]?.[0]?.cnt ?? 0);
        const videoCount = Number((videoRows as any)[0]?.[0]?.cnt ?? 0);
        return {
          creators: userCount,
          videosCreated: videoCount,
        };
      } catch {
        return { creators: 0, videosCreated: 0 };
      }
    }),
  }),
  waitlist: router({
    join: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { creatorNetworkWaitlist } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        try {
          await db.insert(creatorNetworkWaitlist).values({ email: input.email });
          return { success: true, alreadyJoined: false };
        } catch (err: any) {
          // Duplicate entry — already on waitlist
          if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate")) {
            return { success: true, alreadyJoined: true };
          }
          throw err;
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
