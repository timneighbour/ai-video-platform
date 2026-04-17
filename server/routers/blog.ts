import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  listPublishedBlogPosts,
  listAllBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  slugify,
} from "../db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next({ ctx });
});

export const blogRouter = router({
  /** Public: list all published posts */
  list: publicProcedure.query(async () => {
    return listPublishedBlogPosts();
  }),

  /** Public: get a single post by slug */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const post = await getBlogPostBySlug(input.slug);
      if (!post || post.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      return post;
    }),

  /** Admin: list all posts (including drafts) */
  adminList: adminProcedure.query(async () => {
    return listAllBlogPosts();
  }),

  /** Admin: get a single post by id */
  adminGetById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const post = await getBlogPostById(input.id);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      return post;
    }),

  /** Admin: create a new post */
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(512),
        content: z.string().min(1),
        excerpt: z.string().max(500).optional(),
        coverImage: z.string().url().optional(),
        author: z.string().max(255).optional(),
        status: z.enum(["draft", "published"]).default("draft"),
        tags: z.array(z.string()).optional(),
        metaTitle: z.string().max(512).optional(),
        metaDescription: z.string().max(500).optional(),
        slug: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const slug = input.slug ? slugify(input.slug) : slugify(input.title);
      const id = await createBlogPost({
        slug,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt ?? null,
        coverImage: input.coverImage ?? null,
        author: input.author ?? "WIZ AI Team",
        status: input.status,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        publishedAt: input.status === "published" ? new Date() : null,
      });
      return { id, slug };
    }),

  /** Admin: update a post */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(512).optional(),
        content: z.string().min(1).optional(),
        excerpt: z.string().max(500).optional().nullable(),
        coverImage: z.string().optional().nullable(),
        author: z.string().max(255).optional(),
        status: z.enum(["draft", "published"]).optional(),
        tags: z.array(z.string()).optional(),
        metaTitle: z.string().max(512).optional().nullable(),
        metaDescription: z.string().max(500).optional().nullable(),
        slug: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, tags, slug, status, ...rest } = input;
      const existing = await getBlogPostById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: Record<string, unknown> = { ...rest };
      if (slug) updateData.slug = slugify(slug);
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (status !== undefined) {
        updateData.status = status;
        if (status === "published" && !existing.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }
      await updateBlogPost(id, updateData as any);
      return { success: true };
    }),

  /** Admin: delete a post */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBlogPost(input.id);
      return { success: true };
    }),
});
