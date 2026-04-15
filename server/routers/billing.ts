/**
 * Billing Router
 * Handles subscription, credit, and payment operations
 */

import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { generateImage } from "../_core/imageGeneration";
import { z } from "zod";
import { getUserCredits, addCredits, getCreditHistory } from "../credit-service";
import { getUserSubscription, mapDbPlanToProductPlan } from "../db";
import { generateVideo, checkVideoStatus, getUserProjects, deleteProject } from "../video-service";
import { SUBSCRIPTION_PLANS } from "../products";
// import { notifyOwner } from "../_core/notification";
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
      isPro: sub?.plan === "creator" || sub?.plan === "studio" || sub?.plan === "pro" || sub?.plan === "business",
      isBasic: sub?.plan === "basic",
      isStarter: sub?.plan === "starter",
    };
  }),

  /**
   * Get user's plan limits (maxVideoSeconds, maxVideosPerMonth, maxPremiumScenesPerVideo)
   */
  getPlanLimits: protectedProcedure.query(async ({ ctx }) => {
    // Admin/owner gets unlimited access for testing
    if (ctx.user.role === "admin") {
      return {
        plan: "studio" as const,
        maxVideoSeconds: 99999,
        maxVideosPerMonth: 99999,
        maxPremiumScenesPerVideo: 99999,
        isAdmin: true,
      };
    }
    const sub = await getUserSubscription(ctx.user.id);
    const productPlan = mapDbPlanToProductPlan(sub?.plan ?? "free");
    const limits = SUBSCRIPTION_PLANS[productPlan];
    return {
      plan: productPlan,
      maxVideoSeconds: limits.maxVideoSeconds,
      maxVideosPerMonth: limits.maxVideosPerMonth,
      maxPremiumScenesPerVideo: limits.maxPremiumScenesPerVideo,
      isAdmin: false,
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
   * Create a Stripe checkout session for post-completion upsells.
   * Supports combining multiple add-ons: cinematic scenes, 4K upgrade, watermark removal.
   * Each add-on becomes a separate line item in the checkout.
   */
  createUpsellCheckout: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        addons: z.object({
          cinematicScenes: z.boolean().default(false),
          upgrade4K: z.boolean().default(false),
          removeWatermark: z.boolean().default(false),
        }),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Build line items from selected add-ons
        const lineItems: Array<{ price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }> = [];

        if (input.addons.cinematicScenes) {
          lineItems.push({
            price_data: {
              currency: "gbp",
              product_data: {
                name: "Cinematic Scenes Upgrade",
                description: "Add premium cinematic rendering to all scenes in your video",
              },
              unit_amount: 500, // £5.00
            },
            quantity: 1,
          });
        }

        if (input.addons.upgrade4K) {
          lineItems.push({
            price_data: {
              currency: "gbp",
              product_data: {
                name: "4K Quality Upgrade",
                description: "Upscale your video to 4K resolution",
              },
              unit_amount: 300, // £3.00
            },
            quantity: 1,
          });
        }

        if (input.addons.removeWatermark) {
          lineItems.push({
            price_data: {
              currency: "gbp",
              product_data: {
                name: "Remove Watermark",
                description: "Download your video without the WizVid watermark",
              },
              unit_amount: 200, // £2.00
            },
            quantity: 1,
          });
        }

        if (lineItems.length === 0) {
          throw new Error("No add-ons selected");
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: ctx.user.email || undefined,
          // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
          line_items: lineItems,
          mode: "payment",
          success_url: `${input.origin}/onboarding?upsell_success=true&job_id=${input.jobId}`,
          cancel_url: `${input.origin}/onboarding?upsell_canceled=true&job_id=${input.jobId}`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            type: "upsell",
            job_id: input.jobId.toString(),
            cinematic_scenes: input.addons.cinematicScenes ? "true" : "false",
            upgrade_4k: input.addons.upgrade4K ? "true" : "false",
            remove_watermark: input.addons.removeWatermark ? "true" : "false",
          },
          allow_promotion_codes: true,
        });

        return { checkoutUrl: session.url };
      } catch (error) {
        console.error("Upsell checkout error:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to create upsell checkout session"
        );
      }
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
   * Delete a project owned by the current user
   */
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteProject(ctx.user.id, input.projectId);
      return { success: true };
    }),

  /**
   * Create a Stripe checkout session for subscription
   */
  createSubscriptionCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["starter", "basic", "creator", "pro", "studio"]),
        origin: z.string().url(),
        billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Monthly price IDs for all 5 tiers
        const monthlyPrices: Record<string, string> = {
          starter: process.env.STRIPE_STARTER_PRICE_ID || "",
          basic: process.env.STRIPE_BASIC_PRICE_ID || "",
          creator: process.env.STRIPE_PRO_PRICE_ID || "",
          pro: process.env.STRIPE_PRO_PLUS_PRICE_ID || "",
          studio: process.env.STRIPE_BUSINESS_PRICE_ID || "",
        };
        // Annual price IDs (2 months free)
        const annualPrices: Record<string, string> = {
          starter: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || monthlyPrices.starter,
          basic: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || monthlyPrices.basic,
          creator: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || monthlyPrices.creator,
          pro: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID || monthlyPrices.pro,
          studio: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || monthlyPrices.studio,
        };

        const priceId = input.billingInterval === "annual"
          ? annualPrices[input.plan]
          : monthlyPrices[input.plan];
        if (!priceId) {
          throw new Error(`Price not configured for plan: ${input.plan}`);
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: ctx.user.email || undefined,
          // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
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
        // Standard packs: starter (£9/300cr), creator (£24/900cr), pro (£59/2400cr)
        // Cinematic packs: cinematic_10 (£12/200cr), cinematic_25 (£25/500cr), cinematic_50 (£45/1000cr)
        // Legacy keys kept for backward compat: small→starter, medium→creator, large→pro
        pack: z.enum(["small", "medium", "large", "starter", "creator", "pro", "cinematic_10", "cinematic_25", "cinematic_50"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const creditPacks: Record<string, { priceId: string; credits: number; label: string }> = {
          // Standard packs (new keys)
          starter: {
            priceId: process.env.STRIPE_SMALL_PACK_PRICE_ID || process.env.STRIPE_CREDIT_SMALL_PRICE_ID || "",
            credits: 300,
            label: "Starter Pack",
          },
          creator: {
            priceId: process.env.STRIPE_MEDIUM_PACK_PRICE_ID || process.env.STRIPE_CREDIT_MEDIUM_PRICE_ID || "",
            credits: 900,
            label: "Creator Pack",
          },
          pro: {
            priceId: process.env.STRIPE_LARGE_PACK_PRICE_ID || process.env.STRIPE_CREDIT_LARGE_PRICE_ID || "",
            credits: 2400,
            label: "Pro Pack",
          },
          // Legacy keys (backward compat)
          small: {
            priceId: process.env.STRIPE_SMALL_PACK_PRICE_ID || process.env.STRIPE_CREDIT_SMALL_PRICE_ID || "",
            credits: 300,
            label: "Starter Pack",
          },
          medium: {
            priceId: process.env.STRIPE_MEDIUM_PACK_PRICE_ID || process.env.STRIPE_CREDIT_MEDIUM_PRICE_ID || "",
            credits: 900,
            label: "Creator Pack",
          },
          large: {
            priceId: process.env.STRIPE_LARGE_PACK_PRICE_ID || process.env.STRIPE_CREDIT_LARGE_PRICE_ID || "",
            credits: 2400,
            label: "Pro Pack",
          },
          // Cinematic upgrade packs
          cinematic_10: {
            priceId: process.env.STRIPE_CINEMATIC_10_PRICE_ID || "",
            credits: 200,
            label: "10 Cinematic Scenes",
          },
          cinematic_25: {
            priceId: process.env.STRIPE_CINEMATIC_25_PRICE_ID || "",
            credits: 500,
            label: "25 Cinematic Scenes",
          },
          cinematic_50: {
            priceId: process.env.STRIPE_CINEMATIC_50_PRICE_ID || "",
            credits: 1000,
            label: "50 Cinematic Scenes",
          },
        };

        const packInfo = creditPacks[input.pack];
        if (!packInfo.priceId) {
          throw new Error(`Price not configured for pack: ${input.pack}`);
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: ctx.user.email || undefined,
          // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
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
            pack_label: packInfo.label,
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

  /**
   * Generate an AI preview image for a single storyboard scene.
   * Free — no credits deducted. Used in WizPilot storyboard step.
   */
  generateScenePreview: protectedProcedure
    .input(
      z.object({
        sceneTitle: z.string(),
        sceneDescription: z.string(),
        visualNotes: z.string(),
        style: z.string(),
        contextImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = [
        `${input.style} style video scene.`,
        `Scene: ${input.sceneTitle}.`,
        input.sceneDescription,
        `Visual direction: ${input.visualNotes}`,
        "Cinematic composition, high quality, detailed, 16:9 aspect ratio.",
      ].join(" ");

      const options: Parameters<typeof generateImage>[0] = { prompt };
      if (input.contextImageUrl) {
        options.originalImages = [{ url: input.contextImageUrl, mimeType: "image/jpeg" }];
      }

      const { url } = await generateImage(options);
      return { imageUrl: url };
    }),
  /**
   * Get detailed subscription info for the Account page.
   */
  getAccountSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    if (!sub || sub.status !== "active") {
      return { plan: "Free", planKey: "free", status: "inactive", isActive: false, pricePerMonth: 0, currentPeriodEnd: null, stripeSubscriptionId: null };
    }
    const planKey = sub.plan as keyof typeof SUBSCRIPTION_PLANS;
    const planInfo = SUBSCRIPTION_PLANS[planKey];
    return {
      plan: planInfo?.name ?? sub.plan,
      planKey: sub.plan,
      status: sub.status,
      isActive: true,
      pricePerMonth: planInfo?.pricePerMonth ?? 0,
      currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
      stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
      canceledAt: sub.canceledAt ? new Date(sub.canceledAt).toISOString() : null,
    };
  }),
  /**
   * Cancel the user's subscription (sets cancel_at_period_end).
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const { TRPCError } = await import("@trpc/server");
    const sub = await getUserSubscription(ctx.user.id);
    if (!sub || !sub.stripeSubscriptionId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
    }
    const { cancelSubscription: stripeCancelSub } = await import("../stripe");
    await stripeCancelSub(sub.stripeSubscriptionId);
    const { updateSubscription: updateSub } = await import("../db");
    await updateSub(sub.id, { canceledAt: new Date() });
    console.log(`[Billing] Subscription ${sub.stripeSubscriptionId} canceled by user ${ctx.user.id}`);
    return { success: true };
  }),
  /**
   * Create a Stripe Billing Portal session for updating payment method.
   */
  createBillingPortalSession: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const { getOrCreateCustomer } = await import("../stripe");
      const customer = await getOrCreateCustomer(ctx.user.email ?? "", ctx.user.name ?? null);
      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${input.origin}/account`,
      });
      return { url: session.url };
    }),
});

// ── Render Paywall Procedures ──────────────────────────────────────────────

import {
  getRenderAllowance,
  getRenderBundleRemaining,
  createRenderJob,
  getRenderJob,
  getUserRenderJobs,
  consumeSubscriptionRender,
  consumeBundleRender,
  getRendersForPlan,
  getUserSubscription as _getUserSubscription,
  getDb,
} from "../db";
import { eq, and } from "drizzle-orm";
import { renderJobs, renderBundles } from "../../drizzle/schema";

// Re-export so we can use in this file (already imported above as getUserSubscription)
// Note: getUserSubscription is already imported at top of file

/**
 * Check how many renders a user has available (subscription + bundles).
 */
export const renderRouter = router({
  getRenderStatus: protectedProcedure.query(async ({ ctx }) => {
    // Admin gets unlimited
    if (ctx.user.role === "admin") {
      return { subscriptionRemaining: 999, bundleRemaining: 999, total: 999, isAdmin: true };
    }
    const allowance = await getRenderAllowance(ctx.user.id);
    const bundleRemaining = await getRenderBundleRemaining(ctx.user.id);
    const subscriptionRemaining = allowance
      ? Math.max(0, allowance.totalAllowed - allowance.used)
      : 0;
    return {
      subscriptionRemaining,
      bundleRemaining,
      total: subscriptionRemaining + bundleRemaining,
      isAdmin: false,
    };
  }),

  /**
   * Create a Stripe checkout session for a render purchase.
   * Supports: standard/hd/4k quality + enhanced/cinematic audio add-on.
   */
  createRenderCheckout: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        jobType: z.enum(["music_video", "text_to_video", "kids_video", "wizpilot"]).default("music_video"),
        quality: z.enum(["standard", "hd", "4k"]),
        audioTier: z.enum(["standard", "enhanced", "cinematic"]).default("standard"),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const qualityPrices: Record<string, { priceId: string; amount: number; label: string }> = {
        standard: { priceId: process.env.STRIPE_RENDER_STANDARD_PRICE_ID || "", amount: 200, label: "Standard Render (720p)" },
        hd: { priceId: process.env.STRIPE_RENDER_HD_PRICE_ID || "", amount: 400, label: "HD Render (1080p)" },
        "4k": { priceId: process.env.STRIPE_RENDER_4K_PRICE_ID || "", amount: 600, label: "4K Render (2160p)" },
      };
      const audioPrices: Record<string, { priceId: string; amount: number; label: string } | null> = {
        standard: null,
        enhanced: { priceId: process.env.STRIPE_AUDIO_ENHANCED_PRICE_ID || "", amount: 100, label: "Enhanced Audio" },
        cinematic: { priceId: process.env.STRIPE_AUDIO_CINEMATIC_PRICE_ID || "", amount: 300, label: "Cinematic Audio" },
      };

      const qualityInfo = qualityPrices[input.quality];
      const audioInfo = audioPrices[input.audioTier];

      if (!qualityInfo.priceId) throw new Error(`Render price not configured for quality: ${input.quality}`);

      const lineItems: Array<{ price: string; quantity: number }> = [
        { price: qualityInfo.priceId, quantity: 1 },
      ];
      if (audioInfo && audioInfo.priceId) {
        lineItems.push({ price: audioInfo.priceId, quantity: 1 });
      }

      const totalAmount = qualityInfo.amount + (audioInfo?.amount ?? 0);

      // Create a pending render job record
      const renderJobId = await createRenderJob({
        userId: ctx.user.id,
        sourceJobId: input.jobId,
        sourceJobType: input.jobType,
        quality: input.quality,
        audioTier: input.audioTier,
        basePrice: qualityInfo.amount,
        audioAddon: audioInfo?.amount ?? 0,
        totalPrice: totalAmount,
        paymentStatus: "pending",
        renderStatus: "queued",
        usedSubscriptionRender: false,
      });

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.user.email || undefined,
        // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
        line_items: lineItems,
        mode: "payment",
        success_url: `${input.origin}/render/success?render_job_id=${renderJobId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/music-video/create?render_canceled=true`,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          render_job_id: renderJobId.toString(),
          job_id: input.jobId.toString(),
          job_type: input.jobType,
          quality: input.quality,
          audio_tier: input.audioTier,
          type: "render",
        },
        allow_promotion_codes: true,
      });

      return { checkoutUrl: session.url, renderJobId };
    }),

  /**
   * Create a Stripe checkout session for a render bundle purchase.
   */
  createBundleCheckout: protectedProcedure
    .input(
      z.object({
        bundle: z.enum(["6", "15", "40"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bundlePrices: Record<string, { priceId: string; renders: number; label: string }> = {
        "6": { priceId: process.env.STRIPE_BUNDLE_6_PRICE_ID || "", renders: 6, label: "6 Render Bundle" },
        "15": { priceId: process.env.STRIPE_BUNDLE_15_PRICE_ID || "", renders: 15, label: "15 Render Bundle" },
        "40": { priceId: process.env.STRIPE_BUNDLE_40_PRICE_ID || "", renders: 40, label: "40 Render Bundle" },
      };

      const bundleInfo = bundlePrices[input.bundle];
      if (!bundleInfo.priceId) throw new Error(`Bundle price not configured: ${input.bundle}`);

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.user.email || undefined,
        // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
        line_items: [{ price: bundleInfo.priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${input.origin}/dashboard?bundle_purchased=true&renders=${bundleInfo.renders}`,
        cancel_url: `${input.origin}/pricing?canceled=true`,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          type: "render_bundle",
          bundle_size: input.bundle,
          renders: bundleInfo.renders.toString(),
        },
        allow_promotion_codes: true,
      });

      return { checkoutUrl: session.url };
    }),

  /**
   * Use a free render (subscription or bundle).
   * Returns { used: true } if a render was consumed, or { used: false } if none available.
   */
  useFreeRender: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        jobType: z.enum(["music_video", "text_to_video", "kids_video", "wizpilot"]).default("music_video"),
        quality: z.enum(["standard", "hd", "4k"]).default("standard"),
        audioTier: z.enum(["standard", "enhanced", "cinematic"]).default("standard"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Admin gets unlimited free renders
      if (ctx.user.role === "admin") {
        const renderJobId = await createRenderJob({
          userId: ctx.user.id,
          sourceJobId: input.jobId,
          sourceJobType: input.jobType,
          quality: input.quality,
          audioTier: input.audioTier,
          basePrice: 0,
          audioAddon: 0,
          totalPrice: 0,
          paymentStatus: "free",
          renderStatus: "queued",
          usedSubscriptionRender: false,
        });
        return { used: true, renderJobId, source: "admin" as const };
      }

      // Try subscription render first
      const usedSub = await consumeSubscriptionRender(ctx.user.id);
      if (usedSub) {
        const renderJobId = await createRenderJob({
          userId: ctx.user.id,
          sourceJobId: input.jobId,
          sourceJobType: input.jobType,
          quality: input.quality,
          audioTier: input.audioTier,
          basePrice: 0,
          audioAddon: 0,
          totalPrice: 0,
          paymentStatus: "subscription",
          renderStatus: "queued",
          usedSubscriptionRender: true,
        });
        return { used: true, renderJobId, source: "subscription" as const };
      }

      // Try bundle render
      const usedBundle = await consumeBundleRender(ctx.user.id);
      if (usedBundle) {
        const renderJobId = await createRenderJob({
          userId: ctx.user.id,
          sourceJobId: input.jobId,
          sourceJobType: input.jobType,
          quality: input.quality,
          audioTier: input.audioTier,
          basePrice: 0,
          audioAddon: 0,
          totalPrice: 0,
          paymentStatus: "free",
          renderStatus: "queued",
          usedSubscriptionRender: false,
        });
        return { used: true, renderJobId, source: "bundle" as const };
      }

      return { used: false, renderJobId: null, source: "none" as const };
    }),

  /**
   * List all render jobs for the current user.
   * Returns quality, audioTier, renderStatus, and downloadUrl for each job.
   */
  getMyRenderJobs: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await getUserRenderJobs(ctx.user.id);
    return jobs.map((j) => ({
      id: j.id,
      sourceJobId: j.sourceJobId,
      sourceJobType: j.sourceJobType,
      quality: j.quality,
      audioTier: j.audioTier,
      totalPrice: j.totalPrice,
      paymentStatus: j.paymentStatus,
      renderStatus: j.renderStatus,
      downloadUrl: j.downloadUrl,
      createdAt: j.createdAt,
    }));
  }),

  /**
   * Get the most recent completed render job for a given source job.
   * Used by PostRenderUpgradePanel to find the render job ID.
   */
  getRenderJobForSource: protectedProcedure
    .input(z.object({ sourceJobId: z.number().int(), sourceJobType: z.enum(["music_video", "text_to_video", "kids_video", "wizpilot"]) }))
    .query(async ({ ctx, input }) => {
      const jobs = await getUserRenderJobs(ctx.user.id);
      const match = jobs
        .filter(
          (j) =>
            j.sourceJobId === input.sourceJobId &&
            j.sourceJobType === input.sourceJobType &&
            j.renderStatus === "completed"
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (!match) return null;
      return {
        id: match.id,
        quality: match.quality,
        audioTier: match.audioTier,
        totalPrice: match.totalPrice,
        downloadUrl: match.downloadUrl,
      };
    }),

  /**
   * Create a Stripe checkout session for upgrading an existing completed render.
   * Charges only the price difference between the current tier and the desired upgrade.
   * Supported upgrades:
   *   - quality: standard → hd, standard → 4k, hd → 4k
   *   - audioTier: standard/enhanced → cinematic
   */
  createUpgradeCheckout: protectedProcedure
    .input(
      z.object({
        renderJobId: z.number().int(),
        upgradeQuality: z.enum(["standard", "hd", "4k"]).optional(),
        upgradeAudioTier: z.enum(["standard", "enhanced", "cinematic"]).optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the existing render job
      const existingJob = await getRenderJob(input.renderJobId);
      if (!existingJob) throw new Error("Render job not found");
      if (existingJob.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorised");
      }
      if (existingJob.renderStatus !== "completed") {
        throw new Error("Can only upgrade a completed render");
      }

      // Price tables (in pence)
      const qualityPrices: Record<string, { priceId: string; amount: number; label: string; resolution: string }> = {
        standard: { priceId: process.env.STRIPE_RENDER_STANDARD_PRICE_ID || "", amount: 200, label: "Standard Render", resolution: "720p" },
        hd:       { priceId: process.env.STRIPE_RENDER_HD_PRICE_ID || "",       amount: 400, label: "HD Render",       resolution: "1080p" },
        "4k":     { priceId: process.env.STRIPE_RENDER_4K_PRICE_ID || "",       amount: 600, label: "4K Render",       resolution: "2160p" },
      };
      const audioPrices: Record<string, { priceId: string; amount: number; label: string }> = {
        standard:  { priceId: "",                                                              amount: 0,   label: "Standard Audio" },
        enhanced:  { priceId: process.env.STRIPE_AUDIO_ENHANCED_PRICE_ID || "",               amount: 100, label: "WizSound Enhance" },
        cinematic: { priceId: process.env.STRIPE_AUDIO_CINEMATIC_PRICE_ID || "",              amount: 300, label: "WizSound Cinematic" },
      };

      const currentQualityAmount  = qualityPrices[existingJob.quality]?.amount  ?? 0;
      const currentAudioAmount    = audioPrices[existingJob.audioTier]?.amount   ?? 0;

      const targetQuality   = input.upgradeQuality   ?? existingJob.quality;
      const targetAudioTier = input.upgradeAudioTier ?? existingJob.audioTier;

      const targetQualityAmount = qualityPrices[targetQuality]?.amount  ?? 0;
      const targetAudioAmount   = audioPrices[targetAudioTier]?.amount   ?? 0;

      // Validate upgrades are actually upgrades
      const qualityOrder = ["standard", "hd", "4k"];
      if (qualityOrder.indexOf(targetQuality) < qualityOrder.indexOf(existingJob.quality)) {
        throw new Error("Cannot downgrade quality");
      }
      if (targetAudioAmount < currentAudioAmount) {
        throw new Error("Cannot downgrade audio tier");
      }

      const qualityDiff = Math.max(0, targetQualityAmount - currentQualityAmount);
      const audioDiff   = Math.max(0, targetAudioAmount   - currentAudioAmount);
      const totalDiff   = qualityDiff + audioDiff;

      if (totalDiff === 0) throw new Error("No upgrade selected or already at this tier");

      // Build line items for the difference only
      const lineItems: Array<{ price: string; quantity: number }> = [];
      if (qualityDiff > 0 && qualityPrices[targetQuality].priceId) {
        // We charge the full target quality price and credit back the original via metadata
        // Stripe doesn't support partial charges on existing price IDs, so we use a
        // custom amount via price_data
        lineItems.push({
          // @ts-expect-error price_data is valid but not in narrow type
          price_data: {
            currency: "gbp",
            unit_amount: qualityDiff,
            product_data: {
              name: `Upgrade to ${qualityPrices[targetQuality].label} (${qualityPrices[targetQuality].resolution})`,
              description: `Upgrade from ${qualityPrices[existingJob.quality].label} — you pay only the difference`,
            },
          },
          quantity: 1,
        });
      }
      if (audioDiff > 0 && audioPrices[targetAudioTier].priceId) {
        lineItems.push({
          // @ts-expect-error price_data is valid but not in narrow type
          price_data: {
            currency: "gbp",
            unit_amount: audioDiff,
            product_data: {
              name: `Upgrade to ${audioPrices[targetAudioTier].label}`,
              description: `Audio upgrade from ${audioPrices[existingJob.audioTier].label} — you pay only the difference`,
            },
          },
          quantity: 1,
        });
      }

      // Create a new pending render job for the upgraded render
      const upgradeJobId = await createRenderJob({
        userId: ctx.user.id,
        sourceJobId: existingJob.sourceJobId ?? undefined,
        sourceJobType: existingJob.sourceJobType,
        quality: targetQuality,
        audioTier: targetAudioTier,
        basePrice: targetQualityAmount,
        audioAddon: targetAudioAmount,
        totalPrice: totalDiff,
        paymentStatus: "pending",
        renderStatus: "queued",
        usedSubscriptionRender: false,
      });

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.user.email || undefined,
        // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        line_items: lineItems as any,
        mode: "payment",
        success_url: `${input.origin}/render/success?render_job_id=${upgradeJobId}&session_id={CHECKOUT_SESSION_ID}&upgrade=true`,
        cancel_url: `${input.origin}/render/history?upgrade_canceled=true`,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          render_job_id: upgradeJobId.toString(),
          original_render_job_id: input.renderJobId.toString(),
          job_id: (existingJob.sourceJobId ?? 0).toString(),
          job_type: existingJob.sourceJobType,
          quality: targetQuality,
          audio_tier: targetAudioTier,
          type: "render_upgrade",
        },
        allow_promotion_codes: true,
      });

      return {
        checkoutUrl: session.url,
        upgradeJobId,
        qualityDiff,
        audioDiff,
        totalDiff,
      };
    }),

  /**
   * Analyse user purchase behaviour and return a subscription upgrade nudge
   * if the user has made multiple pay-per-render or bundle purchases without a subscription.
   *
   * Trigger thresholds:
   *   - 2+ paid renders (no active subscription) → show nudge
   *   - 1+ bundle purchase (no active subscription) → show nudge
   *
   * Returns null when the user already has an active subscription.
   */
  getUpgradeNudge: protectedProcedure.query(async ({ ctx }) => {
    // If user already has an active subscription, never show the nudge
    const sub = await getUserSubscription(ctx.user.id);
    if (sub && sub.status === "active") return null;

    const db = await getDb();
    if (!db) return null;

    // Count paid render jobs (not free/subscription renders)
    const paidRenders = await db
      .select({ id: renderJobs.id, totalPrice: renderJobs.totalPrice })
      .from(renderJobs)
      .where(
        and(
          eq(renderJobs.userId, ctx.user.id),
          eq(renderJobs.paymentStatus, "paid")
        )
      );

    // Count bundle purchases
    const bundles = await db
      .select({ id: renderBundles.id, bundleSize: renderBundles.bundleSize })
      .from(renderBundles)
      .where(eq(renderBundles.userId, ctx.user.id));

    const paidRenderCount = paidRenders.length;
    const bundleCount = bundles.length;
    const totalSpentPence = paidRenders.reduce((sum, r) => sum + (r.totalPrice ?? 0), 0);

    // Trigger: 2+ paid renders OR 1+ bundle
    const shouldNudge = paidRenderCount >= 2 || bundleCount >= 1;
    if (!shouldNudge) return null;

    // Calculate potential savings: Creator plan = £39/mo, 15 renders/mo
    // Average per-render cost from their history
    const avgPerRender = paidRenderCount > 0 ? Math.round(totalSpentPence / paidRenderCount) : 400;
    // Monthly equivalent spend at their current rate (assume 5 renders/mo as baseline)
    const estimatedMonthlySavingPence = Math.max(0, avgPerRender * 15 - 3900); // Creator plan saves vs 15 pay-per-renders

    return {
      shouldNudge: true,
      paidRenderCount,
      bundleCount,
      totalSpentPence,
      estimatedMonthlySavingPence,
      recommendedPlan: "creator" as const,
      recommendedPlanPrice: 39,
      recommendedPlanRendersPerMonth: 15,
    };
  }),

  /**
   * Return CDN URLs for the 10-second WizSound™ tier preview audio samples.
   * These are pre-generated static files — no auth required.
   */
  getWizSoundPreviews: publicProcedure.query(() => {
    return {
      // Standard: same source track, normalized at -20 LUFS — flat, dry, quiet — the "before"
      standard: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-demo-standard-subwoofer_df98cac4.mp3",
      // Enhanced: same source track, light FFmpeg DSP — -16 LUFS, 3-band EQ, gentle compression
      enhanced: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-demo-enhanced-mid-subwoofer_3cb0b73b.mp3",
      // Cinematic: same source track, full FFmpeg DSP — -14 LUFS, 5-band EQ, pro mastering, stereo widening
      cinematic: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-demo-enhanced-subwoofer_eec1eb9c.mp3",
    };
  }),

  /**
   * Confirm a render payment after Stripe checkout success.
   * Called by the /render/success page with the Stripe session ID.
   * Verifies payment with Stripe, marks the render job as paid, returns job details.
   */
  confirmRenderPayment: protectedProcedure
    .input(z.object({
      renderJobId: z.number().int(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getRenderJob, updateRenderJob } = await import("../db");
      const { TRPCError } = await import("@trpc/server");
      const job = await getRenderJob(input.renderJobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Render job not found" });
      if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorised" });
      }
      // Already confirmed — idempotent
      if (job.paymentStatus === "paid" || job.paymentStatus === "free" || job.paymentStatus === "subscription") {
        return { success: true, job, alreadyConfirmed: true };
      }
      // Verify with Stripe
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);
      if (session.payment_status === "paid") {
        await updateRenderJob(input.renderJobId, {
          paymentStatus: "paid",
          stripeSessionId: input.sessionId,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        });
        const updatedJob = await getRenderJob(input.renderJobId);
        return { success: true, job: updatedJob, alreadyConfirmed: false };
      }
      return { success: false, job, alreadyConfirmed: false, reason: "Payment not completed in Stripe" };
    }),

  /**
   * Get a single render job by ID (for polling on the success page).
   */
  getRenderJobById: protectedProcedure
    .input(z.object({ renderJobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const { getRenderJob } = await import("../db");
      const { TRPCError } = await import("@trpc/server");
      const job = await getRenderJob(input.renderJobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Render job not found" });
      if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorised" });
      }
      return job;
    }),
});
