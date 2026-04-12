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
          payment_method_types: ["card", "paypal"],
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
        plan: z.enum(["starter", "creator", "studio"]),
        origin: z.string().url(),
        billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Monthly price IDs (new keys: starter/creator/studio)
        const monthlyPrices: Record<string, string> = {
          starter: process.env.STRIPE_STARTER_PRICE_ID || "",
          creator: process.env.STRIPE_PRO_PRICE_ID || "",
          studio: process.env.STRIPE_BUSINESS_PRICE_ID || "",
        };
        // Annual price IDs (2 months free)
        const annualPrices: Record<string, string> = {
          starter: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || monthlyPrices.starter,
          creator: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || monthlyPrices.creator,
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
          payment_method_types: ["card", "paypal"],
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
          payment_method_types: ["card", "paypal"],
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
});

// ── Render Paywall Procedures ──────────────────────────────────────────────

import {
  getRenderAllowance,
  getRenderBundleRemaining,
  createRenderJob,
  consumeSubscriptionRender,
  consumeBundleRender,
  getRendersForPlan,
  getUserSubscription as _getUserSubscription,
} from "../db";

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
        payment_method_types: ["card", "paypal"],
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
        payment_method_types: ["card", "paypal"],
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
});
