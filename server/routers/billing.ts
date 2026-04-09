/**
 * Billing Router
 * Handles subscription, credit, and payment operations
 */

import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getUserCredits, addCredits, getCreditHistory } from "../credit-service";
import { getUserSubscription } from "../db";
import { generateVideo, checkVideoStatus, getUserProjects } from "../video-service";
// import { notifyOwner } from "../\_core/notification";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const billingRouter = router({
  /**
   * Get user's current credit balance
   */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getUserCredits(ctx.user.id);
    return { balance };
  }),

  /**
   * Get user's current subscription plan
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    return {
      plan: sub?.plan ?? "free",
      status: sub?.status ?? "inactive",
      isActive: sub?.status === "active",
      isPro: sub?.plan === "pro" || sub?.plan === "business",
      isStarter: sub?.plan === "starter",
    };
  }),

  /**
   * Get user's credit transaction history
   */
  getCreditHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const history = await getCreditHistory(ctx.user.id, input.limit);
      return history;
    }),

  /**
   * Generate a video using AI
   */
  generateVideo: protectedProcedure
    .input(
      z.object({
        toolType: z.enum(["text_to_video", "lip_sync", "video_to_video", "voiceover"]),
        prompt: z.string().min(10).max(1000),
        imageUrl: z.string().url().optional(),
        videoUrl: z.string().url().optional(),
        audioUrl: z.string().url().optional(),
        options: z.record(z.string(), z.unknown()).optional(),
        request4K: z.boolean().optional(),
        userPlan: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await generateVideo({
          userId: ctx.user.id,
          toolType: input.toolType,
          prompt: input.prompt,
          imageUrl: input.imageUrl,
          videoUrl: input.videoUrl,
          audioUrl: input.audioUrl,
          options: input.options,
          request4K: input.request4K,
          userPlan: input.userPlan,
        });

        return {
          success: true,
          projectId: result.projectId,
          taskId: result.taskId,
          status: result.status,
          creditCost: result.creditCost,
        } as const;
      } catch (error) {
        console.error("Video generation error:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to generate video"
        );
      }
    }),

  /**
   * Check the status of a video generation task
   */
  checkVideoStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await checkVideoStatus(input.projectId);
        return {
          status: result.status,
          videoUrl: result.videoUrl,
          error: result.error,
        };
      } catch (error) {
        console.error("Check video status error:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to check video status"
        );
      }
    }),

  /**
   * Get user's project history
   */
  getProjects: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const projects = await getUserProjects(ctx.user.id, input.limit);
      return projects;
    }),

  /**
   * Create a Stripe checkout session for subscription
   */
  createSubscriptionCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["starter", "pro", "business"]),
        origin: z.string().url(),
        billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Monthly price IDs
        const monthlyPrices: Record<string, string> = {
          starter: process.env.STRIPE_STARTER_PRICE_ID || "",
          pro: process.env.STRIPE_PRO_PRICE_ID || "",
          business: process.env.STRIPE_BUSINESS_PRICE_ID || "",
        };
        // Annual price IDs (33% discount)
        const annualPrices: Record<string, string> = {
          starter: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || monthlyPrices.starter,
          pro: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || monthlyPrices.pro,
          business: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || monthlyPrices.business,
        };

        const priceId = input.billingInterval === "annual"
          ? annualPrices[input.plan]
          : monthlyPrices[input.plan];
        if (!priceId) {
          throw new Error(`Price not configured for plan: ${input.plan}`);
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: ctx.user.email || undefined,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${input.origin}/dashboard?success=true`,
          cancel_url: `${input.origin}/subscribe?canceled=true`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            plan: input.plan,
          },
          allow_promotion_codes: true,
        });

        return { checkoutUrl: session.url };
      } catch (error) {
        console.error("Subscription checkout error:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to create checkout session"
        );
      }
    }),

  /**
   * Create a Stripe checkout session for credit purchase
   */
  createCreditCheckout: protectedProcedure
    .input(
      z.object({
        pack: z.enum(["small", "medium", "large"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const creditPacks: Record<string, { priceId: string; credits: number }> = {
          small: {
            priceId: process.env.STRIPE_CREDIT_SMALL_PRICE_ID || "",
            credits: 500,
          },
          medium: {
            priceId: process.env.STRIPE_CREDIT_MEDIUM_PRICE_ID || "",
            credits: 1500,
          },
          large: {
            priceId: process.env.STRIPE_CREDIT_LARGE_PRICE_ID || "",
            credits: 4000,
          },
        };

        const packInfo = creditPacks[input.pack];
        if (!packInfo.priceId) {
          throw new Error(`Price not configured for pack: ${input.pack}`);
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: ctx.user.email || undefined,
          line_items: [
            {
              price: packInfo.priceId,
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${input.origin}/dashboard?credits_purchased=true`,
          cancel_url: `${input.origin}/credits?canceled=true`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            pack: input.pack,
            credits: packInfo.credits.toString(),
          },
          allow_promotion_codes: true,
        });

        return { checkoutUrl: session.url };
      } catch (error) {
        console.error("Credit checkout error:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to create checkout session"
        );
      }
    }),
});
