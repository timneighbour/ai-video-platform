/**
 * wizavision.ts — WizaVision streaming platform tRPC router
 *
 * Handles:
 * - Publishing videos to WizaVision
 * - Browsing/searching the platform
 * - Creator channel management
 * - Video watch page data + view tracking
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  wizavisionVideos,
  wizavisionCreatorChannels,
} from "../../drizzle/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

// Slug generator
function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) + "-" + Date.now().toString(36);
}

const MAIN_CATEGORIES = [
  "music_video", "short_film", "documentary", "animation",
  "series", "experimental", "kids", "education", "trailer", "cinematic"
] as const;

const publishInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(3000).optional(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().int().min(0).optional(),
  mainCategory: z.enum(MAIN_CATEGORIES).default("music_video"),
  subCategory: z.string().max(100).optional(),
  genre: z.string().max(100).optional(),
  visualStyle: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  tags: z.array(z.string()).max(20).optional(),
  isKidsSafe: z.number().int().min(0).max(1).default(0),
  projectId: z.number().int().optional(),
  sourceType: z.string().optional(),
});

export const wizavisionRouter = router({
  // ── Publish a video ───────────────────────────────────────────────────────

  publish: protectedProcedure
    .input(publishInput)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Get or create creator channel
      let channel = await db
        .select()
        .from(wizavisionCreatorChannels)
        .where(eq(wizavisionCreatorChannels.userId, ctx.user.id))
        .then(r => r[0] ?? null);

      if (!channel) {
        // Auto-create channel from user profile
        const username = (ctx.user.name ?? "creator")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 30) + ctx.user.id;
        await db.insert(wizavisionCreatorChannels).values({
          userId: ctx.user.id,
          username,
          displayName: ctx.user.name ?? "Creator",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        channel = await db
          .select()
          .from(wizavisionCreatorChannels)
          .where(eq(wizavisionCreatorChannels.userId, ctx.user.id))
          .then(r => r[0]);
      }

      const slug = makeSlug(input.title);
      const tagsJson = input.tags ? JSON.stringify(input.tags) : null;

      const [result] = await db.insert(wizavisionVideos).values({
        userId: ctx.user.id,
        slug,
        title: input.title,
        description: input.description,
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl,
        duration: input.duration,
        mainCategory: input.mainCategory,
        subCategory: input.subCategory,
        genre: input.genre,
        visualStyle: input.visualStyle,
        mood: input.mood,
        tags: tagsJson,
        creatorName: ctx.user.name ?? "Creator",
        creatorUsername: channel?.username,
        isPublic: 1,
        isKidsSafe: input.isKidsSafe,
        sourceType: input.sourceType ?? "user_upload",
        projectId: input.projectId,
        metaTitle: input.title,
        metaDescription: input.description?.slice(0, 500),
        publishedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update channel video count
      if (channel) {
        await db
          .update(wizavisionCreatorChannels)
          .set({ videoCount: sql`${wizavisionCreatorChannels.videoCount} + 1`, updatedAt: Date.now() })
          .where(eq(wizavisionCreatorChannels.id, channel.id));
      }

      return { id: (result as any).insertId, slug };
    }),

  // ── My published videos ───────────────────────────────────────────────────

  myVideos: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select()
      .from(wizavisionVideos)
      .where(eq(wizavisionVideos.userId, ctx.user.id))
      .orderBy(desc(wizavisionVideos.createdAt));
  }),

  deleteVideo: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select()
        .from(wizavisionVideos)
        .where(and(eq(wizavisionVideos.id, input.id), eq(wizavisionVideos.userId, ctx.user.id)));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(wizavisionVideos).where(eq(wizavisionVideos.id, input.id));
      return { success: true };
    }),

  // ── Public browse ─────────────────────────────────────────────────────────

  browse: publicProcedure
    .input(z.object({
      category: z.enum(MAIN_CATEGORIES).optional(),
      genre: z.string().optional(),
      search: z.string().optional(),
      kidsOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(24),
      offset: z.number().int().min(0).default(0),
      sort: z.enum(["newest", "trending", "most_watched"]).default("newest"),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let query = db
        .select()
        .from(wizavisionVideos)
        .where(eq(wizavisionVideos.isPublic, 1));

      const videos = await db
        .select()
        .from(wizavisionVideos)
        .where(
          and(
            eq(wizavisionVideos.isPublic, 1),
            input?.category ? eq(wizavisionVideos.mainCategory, input.category) : undefined,
            input?.genre ? eq(wizavisionVideos.genre, input.genre) : undefined,
            input?.kidsOnly ? eq(wizavisionVideos.isKidsSafe, 1) : undefined,
            input?.search
              ? or(
                  like(wizavisionVideos.title, `%${input.search}%`),
                  like(wizavisionVideos.description, `%${input.search}%`),
                )
              : undefined,
          )
        )
        .orderBy(
          input?.sort === "most_watched"
            ? desc(wizavisionVideos.viewCount)
            : input?.sort === "trending"
            ? desc(wizavisionVideos.likeCount)
            : desc(wizavisionVideos.publishedAt)
        )
        .limit(input?.limit ?? 24)
        .offset(input?.offset ?? 0);

      return videos;
    }),

  // ── Featured / homepage sections ─────────────────────────────────────────

  homepage: publicProcedure.query(async () => {
    const db = await requireDb();

    const [featured, trending, recent, staffPicks, kidsContent] = await Promise.all([
      db.select().from(wizavisionVideos)
        .where(and(eq(wizavisionVideos.isPublic, 1), eq(wizavisionVideos.isFeatured, 1)))
        .orderBy(desc(wizavisionVideos.publishedAt)).limit(6),
      db.select().from(wizavisionVideos)
        .where(eq(wizavisionVideos.isPublic, 1))
        .orderBy(desc(wizavisionVideos.viewCount)).limit(12),
      db.select().from(wizavisionVideos)
        .where(eq(wizavisionVideos.isPublic, 1))
        .orderBy(desc(wizavisionVideos.publishedAt)).limit(12),
      db.select().from(wizavisionVideos)
        .where(and(eq(wizavisionVideos.isPublic, 1), eq(wizavisionVideos.isStaffPick, 1)))
        .orderBy(desc(wizavisionVideos.publishedAt)).limit(6),
      db.select().from(wizavisionVideos)
        .where(and(eq(wizavisionVideos.isPublic, 1), eq(wizavisionVideos.isKidsSafe, 1)))
        .orderBy(desc(wizavisionVideos.publishedAt)).limit(8),
    ]);

    // Category counts
    const categories = await db.execute(
      sql`SELECT mainCategory, COUNT(*) as cnt FROM wizavisionVideos WHERE isPublic = 1 GROUP BY mainCategory ORDER BY cnt DESC`
    );

    // Featured creators
    const creators = await db.select().from(wizavisionCreatorChannels)
      .where(eq(wizavisionCreatorChannels.isFeatured, 1))
      .limit(6);

    return { featured, trending, recent, staffPicks, kidsContent, categories, creators };
  }),

  // ── Single video ─────────────────────────────────────────────────────────

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [video] = await db
        .select()
        .from(wizavisionVideos)
        .where(and(eq(wizavisionVideos.slug, input.slug), eq(wizavisionVideos.isPublic, 1)));
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      // Related videos (same category)
      const related = await db
        .select()
        .from(wizavisionVideos)
        .where(
          and(
            eq(wizavisionVideos.isPublic, 1),
            eq(wizavisionVideos.mainCategory, video.mainCategory),
          )
        )
        .orderBy(desc(wizavisionVideos.publishedAt))
        .limit(8);

      return { video, related: related.filter(v => v.id !== video.id) };
    }),

  incrementView: publicProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(wizavisionVideos)
        .set({ viewCount: sql`${wizavisionVideos.viewCount} + 1` })
        .where(eq(wizavisionVideos.slug, input.slug));
      return { success: true };
    }),

  // ── Creator channels ──────────────────────────────────────────────────────

  getChannel: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [channel] = await db
        .select()
        .from(wizavisionCreatorChannels)
        .where(eq(wizavisionCreatorChannels.username, input.username));
      if (!channel) throw new TRPCError({ code: "NOT_FOUND" });

      const videos = await db
        .select()
        .from(wizavisionVideos)
        .where(and(eq(wizavisionVideos.userId, channel.userId), eq(wizavisionVideos.isPublic, 1)))
        .orderBy(desc(wizavisionVideos.publishedAt))
        .limit(24);

      return { channel, videos };
    }),

  myChannel: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [channel] = await db
      .select()
      .from(wizavisionCreatorChannels)
      .where(eq(wizavisionCreatorChannels.userId, ctx.user.id));
    return channel ?? null;
  }),

  updateChannel: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(255).optional(),
      bio: z.string().max(1000).optional(),
      avatarUrl: z.string().url().optional(),
      bannerUrl: z.string().url().optional(),
      websiteUrl: z.string().url().optional(),
      youtubeUrl: z.string().url().optional(),
      tiktokUrl: z.string().url().optional(),
      instagramUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select()
        .from(wizavisionCreatorChannels)
        .where(eq(wizavisionCreatorChannels.userId, ctx.user.id));

      if (!existing) {
        // Create channel
        const username = (ctx.user.name ?? "creator")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 30) + ctx.user.id;
        await db.insert(wizavisionCreatorChannels).values({
          userId: ctx.user.id,
          username,
          displayName: input.displayName ?? ctx.user.name ?? "Creator",
          ...input,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        await db
          .update(wizavisionCreatorChannels)
          .set({ ...input, updatedAt: Date.now() })
          .where(eq(wizavisionCreatorChannels.userId, ctx.user.id));
      }
      return { success: true };
    }),

  // ── Featured creators ─────────────────────────────────────────────────────

  featuredCreators: publicProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select()
      .from(wizavisionCreatorChannels)
      .where(eq(wizavisionCreatorChannels.isFeatured, 1))
      .orderBy(desc(wizavisionCreatorChannels.followerCount))
      .limit(12);
  }),
});
