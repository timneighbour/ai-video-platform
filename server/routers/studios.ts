/**
 * studios.ts — Creative Studios & Projects tRPC router
 *
 * Handles:
 * - creativeProfiles: user's named creative identities (e.g. "Tim's Animation Studio")
 * - creatorProjects: all work saved under each profile
 * - socialConnections: linked social media accounts
 * - socialPublishLogs: history of social publishes
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  creativeProfiles,
  creatorProjects,
  socialConnections,
  socialPublishLogs,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

// ─── Creative Profiles ───────────────────────────────────────────────────────

const profileInput = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["animator", "band", "artist", "dj", "filmmaker", "youtuber", "podcaster", "other"]).default("other"),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  colorTheme: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#b8892a"),
  isDefault: z.number().int().min(0).max(1).default(0),
});

// ─── Creator Projects ─────────────────────────────────────────────────────────

const projectInput = z.object({
  profileId: z.number().int().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  type: z.enum(["animation", "music_video", "music", "image", "short", "other"]).default("other"),
  status: z.enum(["draft", "in_progress", "complete", "archived"]).default("complete"),
  outputUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  source: z.enum(["wizanimate", "music_video", "wizimage", "wizsound", "manual"]).default("manual"),
  jobRef: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
});

export const studiosRouter = router({
  // ── Profiles ──────────────────────────────────────────────────────────────

  listProfiles: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const profiles = await db
      .select()
      .from(creativeProfiles)
      .where(eq(creativeProfiles.userId, ctx.user.id))
      .orderBy(desc(creativeProfiles.createdAt));

    // Attach project counts
    const withCounts = await Promise.all(
      profiles.map(async (p: typeof creativeProfiles.$inferSelect) => {
        const projects = await db
          .select()
          .from(creatorProjects)
          .where(and(eq(creatorProjects.userId, ctx.user.id), eq(creatorProjects.profileId, p.id)));
        return { ...p, projectCount: projects.length };
      })
    );
    return withCounts;
  }),

  createProfile: protectedProcedure
    .input(profileInput)
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      const [result] = await db.insert(creativeProfiles).values({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        colorTheme: input.colorTheme,
        isDefault: input.isDefault,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { id: (result as any).insertId };
    }),

  updateProfile: protectedProcedure
    .input(z.object({ id: z.number().int(), data: profileInput.partial() }))
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      const [existing] = await db
        .select()
        .from(creativeProfiles)
        .where(and(eq(creativeProfiles.id, input.id), eq(creativeProfiles.userId, ctx.user.id)));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(creativeProfiles)
        .set({ ...input.data, updatedAt: Date.now() })
        .where(eq(creativeProfiles.id, input.id));
      return { success: true };
    }),

  deleteProfile: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      const [existing] = await db
        .select()
        .from(creativeProfiles)
        .where(and(eq(creativeProfiles.id, input.id), eq(creativeProfiles.userId, ctx.user.id)));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(creativeProfiles).where(eq(creativeProfiles.id, input.id));
      return { success: true };
    }),

  getProfile: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
        const db = await requireDb();
      const [profile] = await db
        .select()
        .from(creativeProfiles)
        .where(and(eq(creativeProfiles.id, input.id), eq(creativeProfiles.userId, ctx.user.id)));
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const projects = await db
        .select()
        .from(creatorProjects)
        .where(and(eq(creatorProjects.userId, ctx.user.id), eq(creatorProjects.profileId, input.id)))
        .orderBy(desc(creatorProjects.createdAt));

      return { ...profile, projects };
    }),

  // ── Projects ──────────────────────────────────────────────────────────────

  listProjects: protectedProcedure
    .input(z.object({ profileId: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
        const db = await requireDb();
      const conditions = [eq(creatorProjects.userId, ctx.user.id)];
      if (input?.profileId) {
        conditions.push(eq(creatorProjects.profileId, input.profileId));
      }
      return db
        .select()
        .from(creatorProjects)
        .where(and(...conditions))
        .orderBy(desc(creatorProjects.createdAt));
    }),

  saveProject: protectedProcedure
    .input(projectInput)
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      // Verify profile belongs to user if provided
      if (input.profileId) {
        const [profile] = await db
          .select()
          .from(creativeProfiles)
          .where(and(eq(creativeProfiles.id, input.profileId), eq(creativeProfiles.userId, ctx.user.id)));
        if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Profile not found" });
      }

      const [result] = await db.insert(creatorProjects).values({
        userId: ctx.user.id,
        profileId: input.profileId ?? null,
        title: input.title,
        description: input.description,
        type: input.type,
        status: input.status,
        outputUrl: input.outputUrl,
        thumbnailUrl: input.thumbnailUrl,
        source: input.source,
        jobRef: input.jobRef,
        durationSeconds: input.durationSeconds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { id: (result as any).insertId };
    }),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      const [existing] = await db
        .select()
        .from(creatorProjects)
        .where(and(eq(creatorProjects.id, input.id), eq(creatorProjects.userId, ctx.user.id)));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(creatorProjects).where(eq(creatorProjects.id, input.id));
      return { success: true };
    }),

  // ── Social Connections ────────────────────────────────────────────────────

  listSocialConnections: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
    return db
      .select()
      .from(socialConnections)
      .where(eq(socialConnections.userId, ctx.user.id));
  }),

  disconnectSocial: protectedProcedure
    .input(z.object({ platform: z.enum(["youtube", "tiktok", "instagram", "facebook"]) }))
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      await db
        .update(socialConnections)
        .set({ isActive: 0 })
        .where(and(eq(socialConnections.userId, ctx.user.id), eq(socialConnections.platform, input.platform)));
      return { success: true };
    }),

  // ── Social Publish Logs ───────────────────────────────────────────────────

  logPublish: protectedProcedure
    .input(z.object({
      projectId: z.number().int().optional(),
      platform: z.enum(["youtube", "tiktok", "instagram", "facebook"]),
      status: z.enum(["pending", "published", "failed"]).default("pending"),
      platformPostUrl: z.string().url().optional(),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
      const [result] = await db.insert(socialPublishLogs).values({
        userId: ctx.user.id,
        projectId: input.projectId,
        platform: input.platform,
        status: input.status,
        platformPostUrl: input.platformPostUrl,
        errorMessage: input.errorMessage,
        createdAt: Date.now(),
      });
      return { id: (result as any).insertId };
    }),

  listPublishLogs: protectedProcedure
    .input(z.object({ projectId: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
        const db = await requireDb();
      const conditions = [eq(socialPublishLogs.userId, ctx.user.id)];
      if (input?.projectId) {
        conditions.push(eq(socialPublishLogs.projectId, input.projectId));
      }
      return db
        .select()
        .from(socialPublishLogs)
        .where(and(...conditions))
        .orderBy(desc(socialPublishLogs.createdAt))
        .limit(50);
    }),
});
