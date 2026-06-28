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
import { SUBSCRIPTION_PLANS, TOPUP_PACKS, type TopupPackKey } from "../products";
import { topupPurchases, users } from "../../drizzle/schema";
import { eq as eqOp } from "drizzle-orm";
// import { notifyOwner } from "../_core/notification";
import Stripe from "stripe";
import { getOrCreateCustomer } from "../stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// ── Boot-time Stripe mode diagnostics ────────────────────────────────────────
// Logs whether each key/price is live or test so we can spot mixed-mode configs.
(function logStripeMode() {
  const sk = process.env.STRIPE_SECRET_KEY || "";
  const pk = process.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
  const wh = process.env.STRIPE_WEBHOOK_SECRET || "";
  const mode = sk.startsWith("sk_live_") ? "LIVE" : sk.startsWith("sk_test_") ? "TEST" : "MISSING";
  const pkMode = pk.startsWith("pk_live_") ? "LIVE" : pk.startsWith("pk_test_") ? "TEST" : "MISSING";
  const whMode = wh.startsWith("whsec_") ? "OK" : "MISSING";
  console.log(`[Stripe] Secret key: ${mode} | Publishable key: ${pkMode} | Webhook secret: ${whMode}`);
  if (mode !== pkMode && mode !== "MISSING" && pkMode !== "MISSING") {
    console.error("[Stripe] ⚠️  MIXED MODE DETECTED — secret key and publishable key are from different environments!");
  }
  // Log each subscription price ID
  const priceEnvs = [
    "STRIPE_STARTER_PRICE_ID", "STRIPE_BASIC_PRICE_ID", "STRIPE_PRO_PRICE_ID",
    "STRIPE_PRO_PLUS_PRICE_ID", "STRIPE_BUSINESS_PRICE_ID",
    "STRIPE_STARTER_ANNUAL_PRICE_ID", "STRIPE_BASIC_ANNUAL_PRICE_ID",
    "STRIPE_PRO_ANNUAL_PRICE_ID", "STRIPE_PRO_PLUS_ANNUAL_PRICE_ID",
  ];
  for (const envKey of priceEnvs) {
    const val = process.env[envKey];
    if (!val || !val.startsWith("price_")) {
      console.warn(`[Stripe] ${envKey}: MISSING or invalid — will use hardcoded fallback test price`);
    } else {
      console.log(`[Stripe] ${envKey}: ${val.substring(0, 12)}... (${mode === "LIVE" ? "live" : "test"})`);
    }
  }
})();

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
                description: "Download your video without the WIZ AI watermark",
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
        prompt: z.string().min(10).max(5000),
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
        // Re-throw TRPCErrors (e.g. INSUFFICIENT_CREDITS FORBIDDEN) so the client can detect them
        const { TRPCError } = await import("@trpc/server");
        if (error instanceof TRPCError) throw error;
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
        // Monthly price IDs — fallback to hardcoded sandbox prices if env var is from wrong account
        const isValidPrice = (id: string | undefined) =>
          !!id && id.startsWith("price_");
        const monthlyPrices: Record<string, string> = {
          starter: isValidPrice(process.env.STRIPE_STARTER_PRICE_ID) ? process.env.STRIPE_STARTER_PRICE_ID! : "price_1TSTNUI3gJ5F0DKDCN2k41pY",
          basic: isValidPrice(process.env.STRIPE_BASIC_PRICE_ID) ? process.env.STRIPE_BASIC_PRICE_ID! : "price_1TSTNiI3gJ5F0DKDHpRPuoGC",
          creator: isValidPrice(process.env.STRIPE_PRO_PRICE_ID) ? process.env.STRIPE_PRO_PRICE_ID! : "price_1TSTNZI3gJ5F0DKDEq8xu0IX",
          pro: isValidPrice(process.env.STRIPE_PRO_PLUS_PRICE_ID) ? process.env.STRIPE_PRO_PLUS_PRICE_ID! : "price_1TSTNeI3gJ5F0DKDQkaNwYEa",
          studio: isValidPrice(process.env.STRIPE_BUSINESS_PRICE_ID) ? process.env.STRIPE_BUSINESS_PRICE_ID! : "price_1TSTNpI3gJ5F0DKD2uRUjNuI",
        };
        // Annual price IDs (2 months free)
        const annualPrices: Record<string, string> = {
          starter: isValidPrice(process.env.STRIPE_STARTER_ANNUAL_PRICE_ID) ? process.env.STRIPE_STARTER_ANNUAL_PRICE_ID! : "price_1TSTNWI3gJ5F0DKDvB4h1lF8",
          basic: isValidPrice(process.env.STRIPE_BASIC_ANNUAL_PRICE_ID) ? process.env.STRIPE_BASIC_ANNUAL_PRICE_ID! : "price_1TSTNkI3gJ5F0DKDky82Czt7",
          creator: isValidPrice(process.env.STRIPE_PRO_ANNUAL_PRICE_ID) ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID! : "price_1TSTNaI3gJ5F0DKDCKaReJbp",
          pro: isValidPrice(process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID) ? process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID! : "price_1TSTNfI3gJ5F0DKDLkZD1qv3",
          studio: isValidPrice(process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID) ? process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID! : monthlyPrices.studio,
        };

        const priceId = input.billingInterval === "annual"
          ? annualPrices[input.plan]
          : monthlyPrices[input.plan];
        if (!priceId) {
          throw new Error(`Price not configured for plan: ${input.plan}`);
        }

        // Prefer a real Stripe Customer over customer_email so the customer is
        // reused across sessions and the subscription is tied to a known customer.
        let stripeCustomerId = ctx.user.stripeCustomerId || undefined;
        if (!stripeCustomerId && ctx.user.email) {
          try {
            const customer = await getOrCreateCustomer(ctx.user.email, ctx.user.name || null);
            stripeCustomerId = customer.id;
            // Persist the Stripe customer ID back to the user row
            const db = await getDb();
            if (db) {
              await db.update(users)
                .set({ stripeCustomerId: customer.id })
                .where(eqOp(users.id, ctx.user.id));
            }
          } catch (custErr) {
            console.warn("[Stripe] Could not get/create customer, falling back to customer_email:", custErr);
          }
        }

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          // payment_method_types omitted — Stripe auto-enables card, Apple Pay, Google Pay, PayPal
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          success_url: `${input.origin}/account?checkout=success`,
          cancel_url: `${input.origin}/subscribe?checkout=cancelled`,
          client_reference_id: ctx.user.id.toString(),
          // subscription_data.metadata lands on the Stripe Subscription object
          // so customer.subscription.created webhook can read user_id and plan_id
          subscription_data: {
            metadata: {
              user_id: ctx.user.id.toString(),
              customer_email: ctx.user.email || "",
              customer_name: ctx.user.name || "",
              plan_id: input.plan,
            },
          },
          allow_promotion_codes: true,
        };
        if (stripeCustomerId) {
          (sessionParams as any).customer = stripeCustomerId;
        } else {
          sessionParams.customer_email = ctx.user.email || undefined;
        }
        const session = await stripe.checkout.sessions.create(sessionParams);

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
        // Option A packs: spark/boost/creator/studio/pro/elite
        // Cinematic packs: cinematic_10/cinematic_25/cinematic_50
        // Legacy keys kept for backward compat: small/medium/large/starter
        // Price IDs verified 2026-05-06
        pack: z.enum(["spark", "boost", "creator", "studio", "pro", "elite",
                      "cinematic_10", "cinematic_25", "cinematic_50",
                      "small", "medium", "large", "starter"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Use env var if valid, otherwise fall back to sandbox price IDs
        const vp = (id: string | undefined, fallback: string) => (id && id.startsWith("price_")) ? id : fallback;
        const creditPacks: Record<string, { priceId: string; credits: number; label: string }> = {
          // ── Option A packs — dedicated Stripe price IDs ─────────────────────────────────────────────────
          spark: {
            priceId: vp(process.env.STRIPE_TOPUP_SPARK_PRICE_ID, "price_1TTtsxI3gJ5F0DKDr2osAQtH"),
            credits: 50,
            label: "Spark Pack (50 credits)",
          },
          boost: {
            priceId: vp(process.env.STRIPE_TOPUP_BOOST_PRICE_ID, "price_1TTtsyI3gJ5F0DKDz1mhvia0"),
            credits: 150,
            label: "Boost Pack (150 credits)",
          },
          creator: {
            priceId: vp(process.env.STRIPE_TOPUP_CREATOR_PRICE_ID, "price_1TTtt0I3gJ5F0DKDboiU1Qlf"),
            credits: 350,
            label: "Creator Pack (350 credits)",
          },
          studio: {
            priceId: vp(process.env.STRIPE_TOPUP_STUDIO_PRICE_ID, "price_1TTtt1I3gJ5F0DKDc7JukwIv"),
            credits: 750,
            label: "Studio Pack (750 credits)",
          },
          pro: {
            priceId: vp(process.env.STRIPE_TOPUP_PRO_PRICE_ID, "price_1TTtt3I3gJ5F0DKDxaBysFnT"),
            credits: 1500,
            label: "Pro Pack (1,500 credits)",
          },
          elite: {
            priceId: vp(process.env.STRIPE_TOPUP_ELITE_PRICE_ID, "price_1TTtt4I3gJ5F0DKDWi3TgiVd"),
            credits: 4000,
            label: "Elite Pack (4,000 credits)",
          },
          // ── Cinematic upgrade packs ──────────────────────────────────────────
          cinematic_10: {
            priceId: vp(process.env.STRIPE_CINEMATIC_10_PRICE_ID, "price_1TSTOMI3gJ5F0DKD8PlxlS7d"),
            credits: 200,
            label: "10 Cinematic Scenes",
          },
          cinematic_25: {
            priceId: vp(process.env.STRIPE_CINEMATIC_25_PRICE_ID, "price_1TSTOPI3gJ5F0DKDrMY7k4E2"),
            credits: 500,
            label: "25 Cinematic Scenes",
          },
          cinematic_50: {
            priceId: vp(process.env.STRIPE_CINEMATIC_50_PRICE_ID, "price_1TSTOUI3gJ5F0DKDLR8lTnTE"),
            credits: 1000,
            label: "50 Cinematic Scenes",
          },
          // ── Legacy keys (backward compat) ────────────────────────────────────
          small: {
            priceId: vp(process.env.STRIPE_TOPUP_QUICK_BOOST_PRICE_ID, "price_1TSTNtI3gJ5F0DKDgRWgWCRP"),
            credits: 50,
            label: "Spark Pack (50 credits)",
          },
          starter: {
            priceId: vp(process.env.STRIPE_TOPUP_QUICK_BOOST_PRICE_ID, "price_1TSTNtI3gJ5F0DKDgRWgWCRP"),
            credits: 50,
            label: "Spark Pack (50 credits)",
          },
          medium: {
            priceId: vp(process.env.STRIPE_TOPUP_STUDIO_BOOST_PRICE_ID, "price_1TSTO1I3gJ5F0DKDjieJ0AVV"),
            credits: 350,
            label: "Creator Pack (350 credits)",
          },
          large: {
            priceId: vp(process.env.STRIPE_BUNDLE_15_PRICE_ID, "price_1TSTNtI3gJ5F0DKDgRWgWCRP"),
            credits: 1500,
            label: "Pro Pack (1,500 credits)",
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
   * Generate an AI storyboard from a user prompt.
   * Uses a two-pass LLM approach:
   *   1. World-lock pass: extract subject, costume, setting, tone, camera style, action progression
   *   2. Scene generation pass: generate all scenes from the locked base
   * Free — no credits deducted. Used in WizScript storyboard step.
   */
  generateAIStoryboard: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(2000),
        style: z.string(),
        sceneCount: z.number().int().min(2).max(6).default(3),
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");

      // ── Pass 1: World-lock extraction ──────────────────────────────────────
      // Extract a locked "world bible" from the user prompt before generating scenes.
      // This prevents each scene from re-inventing the subject/costume/setting.
      const worldLockResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a film director's assistant. Your job is to extract a precise, locked "world bible" and exact character specification from a user's video prompt.
You must identify and lock EVERY visual detail so that an image AI can reproduce the EXACT same character in every scene with zero drift.
Be hyper-specific. Do not use vague terms like "standard" or "typical". Infer plausible specific details if not stated.
Examples of the level of detail required:
- face_identity: "young woman, early 20s, pale skin, sharp cheekbones, dark brown eyes, no visible makeup"
- age_range: "early 20s"
- body_proportions: "slender build, average height, slight frame"
- clothing_details: "oversized bright yellow PVC raincoat, double-breasted with large collar, knee-length"
- colour_accents: "bright canary yellow coat, black buttons, white shirt collar visible at neck"
- footwear_details: "tall black rubber Wellington boots, knee-high, matte finish, no visible branding"
- headwear_state: "no hat, hood of raincoat down, wet dark hair plastered to face"
- props_accessories: "no bag, hands at sides, no umbrella"
- companion_details: "none" (or e.g. "black warhorse, full barding armour, dark mane")
Return ONLY valid JSON. No commentary.`,
          },
          {
            role: "user",
            content: `Extract the complete world bible and exact character specification for this video prompt: "${input.prompt}"`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "world_bible",
            strict: true,
            schema: {
              type: "object",
              properties: {
                main_subject: { type: "string" },
                face_identity: { type: "string" },
                age_range: { type: "string" },
                body_proportions: { type: "string" },
                clothing_details: { type: "string" },
                colour_accents: { type: "string" },
                footwear_details: { type: "string" },
                headwear_state: { type: "string" },
                props_accessories: { type: "string" },
                companion_details: { type: "string" },
                setting: { type: "string" },
                tone: { type: "string" },
                camera_style: { type: "string" },
                action_progression: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["main_subject", "face_identity", "age_range", "body_proportions", "clothing_details", "colour_accents", "footwear_details", "headwear_state", "props_accessories", "companion_details", "setting", "tone", "camera_style", "action_progression"],
              additionalProperties: false,
            },
          },
        },
      });

      let worldBible: {
        main_subject: string;
        face_identity: string;
        age_range: string;
        body_proportions: string;
        clothing_details: string;
        colour_accents: string;
        footwear_details: string;
        headwear_state: string;
        props_accessories: string;
        companion_details: string;
        setting: string;
        tone: string;
        camera_style: string;
        action_progression: string[];
      };
      try {
        const raw = worldLockResponse.choices[0]?.message?.content ?? "{}";
        worldBible = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      } catch {
        // Fallback: derive from prompt directly
        worldBible = {
          main_subject: input.prompt.slice(0, 80),
          face_identity: "as described in the prompt",
          age_range: "adult",
          body_proportions: "average build",
          clothing_details: "as described in the prompt",
          colour_accents: "as described in the prompt",
          footwear_details: "as described in the prompt",
          headwear_state: "as described in the prompt",
          props_accessories: "none",
          companion_details: "none",
          setting: input.prompt.slice(0, 80),
          tone: input.style,
          camera_style: "cinematic",
          action_progression: ["opening", "main action", "closing"],
        };
      }

      // Build a rich consistency anchor that explicitly names every visual spec
      const consistencyAnchor = [
        `Subject: ${worldBible.main_subject}.`,
        `Face/identity: ${worldBible.face_identity}.`,
        `Age: ${worldBible.age_range}.`,
        `Build: ${worldBible.body_proportions}.`,
        `Clothing: ${worldBible.clothing_details}.`,
        `Colours: ${worldBible.colour_accents}.`,
        `Footwear: ${worldBible.footwear_details}.`,
        `Headwear/helmet: ${worldBible.headwear_state}.`,
        `Props/accessories: ${worldBible.props_accessories}.`,
        worldBible.companion_details && worldBible.companion_details !== "none" ? `Companion: ${worldBible.companion_details}.` : "",
        `Setting: ${worldBible.setting}.`,
        `Tone: ${worldBible.tone}.`,
        `Camera: ${worldBible.camera_style}.`,
      ].filter(Boolean).join(" ");

      // ── Pass 2: Scene generation from locked world bible ───────────────────
      const sceneCount = input.sceneCount;
      const actionSteps = worldBible.action_progression.slice(0, sceneCount);
      // Pad if fewer steps than requested scenes
      while (actionSteps.length < sceneCount) {
        actionSteps.push(`Continue the narrative (scene ${actionSteps.length + 1})`);
      }

      const scenesResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a film director breaking a single continuous scene into sequential shots for a storyboard.
You have a locked world bible with an exact character specification. Every scene MUST:
- Use the EXACT same face/identity, age, build, clothing, colours, footwear, headwear state, props, and companion as locked below
- Stay in the EXACT same setting
- NEVER change the character's costume, footwear, or helmet state between scenes unless the action explicitly requires it
- NEVER introduce new characters, new locations, or symbolic cutaways unless the user explicitly asked for them
- Each scene description MUST explicitly name the locked costume/footwear/headwear details so the image AI cannot drift
Each scene should feel like the next shot in the same film — same world, same character, continuous narrative.
Return ONLY valid JSON. No commentary.`,
          },
          {
            role: "user",
            content: `LOCKED CHARACTER SPECIFICATION (must be repeated explicitly in every scene description):
${consistencyAnchor}

Original prompt: "${input.prompt}"
Style: ${input.style}

Generate exactly ${sceneCount} sequential storyboard scenes. Each scene must:
1. Feature the EXACT same character with the EXACT same face, clothing (${worldBible.clothing_details}), footwear (${worldBible.footwear_details}), and headwear state (${worldBible.headwear_state})
2. Stay in the EXACT same setting: ${worldBible.setting}
3. Progress the action logically: ${actionSteps.join(" → ")}
4. Include a specific camera shot type and movement
5. In the scene description, explicitly name the character's clothing, footwear, and headwear — do NOT just say "same as before"

Action steps to cover: ${actionSteps.map((s, i) => `Scene ${i + 1}: ${s}`).join(", ")}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "storyboard_scenes",
            strict: true,
            schema: {
              type: "object",
              properties: {
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      visualNotes: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["title", "description", "visualNotes", "duration"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["scenes"],
              additionalProperties: false,
            },
          },
        },
      });

      let rawScenes: Array<{ title: string; description: string; visualNotes: string; duration: string }> = [];
      try {
        const raw = scenesResponse.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        rawScenes = parsed.scenes ?? [];
      } catch {
        rawScenes = [];
      }

      // Fallback: if LLM failed to return scenes, generate basic consistent ones
      if (rawScenes.length === 0) {
        rawScenes = actionSteps.map((step, i) => ({
          title: i === 0 ? "Opening Shot" : i === sceneCount - 1 ? "Closing Shot" : `Scene ${i + 1}`,
          description: `${worldBible.main_subject} — ${step}. ${worldBible.setting}.`,
          visualNotes: `${input.style} style. ${worldBible.camera_style}. ${consistencyAnchor}`,
          duration: i === 0 || i === sceneCount - 1 ? "3s" : "5s",
        }));
      }

      const scenes = rawScenes.slice(0, sceneCount).map((s, i) => ({
        id: i + 1,
        title: s.title,
        description: s.description,
        // Prepend consistency anchor to visualNotes so image generation stays locked
        visualNotes: `${consistencyAnchor} ${s.visualNotes}`,
        duration: s.duration || (i === 0 || i === sceneCount - 1 ? "3s" : "5s"),
      }));

      return { scenes, consistencyAnchor, worldBible };
    }),

  /**
   * Generate an AI preview image for a single storyboard scene.
   * Free — no credits deducted. Used in WizScript storyboard step.
   */
  generateScenePreview: protectedProcedure
    .input(
      z.object({
        sceneTitle: z.string(),
        sceneDescription: z.string(),
        visualNotes: z.string(),
        style: z.string(),
        contextImageUrl: z.string().optional(),
        consistencyAnchor: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Build the image prompt with the consistency anchor prepended so the
      // image AI generates the same subject/costume/setting across all scenes.
      const anchorPrefix = input.consistencyAnchor
        ? `${input.consistencyAnchor} `
        : "";
      const prompt = [
        `${input.style} style cinematic video scene.`,
        anchorPrefix,
        `Scene: ${input.sceneTitle}.`,
        input.sceneDescription,
        `Visual direction: ${input.visualNotes}`,
        "High quality, detailed, 16:9 aspect ratio, consistent character appearance throughout.",
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

  /**
   * Get all available Video Credit top-up packs
   */
  getTopupPacks: protectedProcedure.query(async () => {
    return Object.values(TOPUP_PACKS).map((p) => ({
      key: p.key,
      name: p.name,
      credits: p.credits,
      priceGbp: p.priceGbp,
      bestFor: p.bestFor,
      cta: p.cta,
      popular: p.popular,
    }));
  }),

  /**
   * Create a Stripe checkout session for a Video Credit top-up pack
   */
  createTopupCheckout: protectedProcedure
    .input(
      z.object({
        packKey: z.enum(["quick_boost", "creator_boost", "studio_boost", "pro_bulk_boost"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pack = TOPUP_PACKS[input.packKey as TopupPackKey];
      if (!pack.stripePriceId) {
        throw new Error(`Top-up pack ${input.packKey} has no Stripe price ID configured`);
      }
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          type: "video_credit_topup",
          pack_key: input.packKey,
          pack_name: pack.name,
          credits: pack.credits.toString(),
        },
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        success_url: `${input.origin}/dashboard?topup=success&credits=${pack.credits}`,
        cancel_url: `${input.origin}/pricing?topup=canceled`,
        allow_promotion_codes: true,
      });
      return { checkoutUrl: session.url };
    }),

  /**
   * Get the user's top-up purchase history
   */
  getTopupHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const history = await db
      .select()
      .from(topupPurchases)
      .where(eqOp(topupPurchases.userId, ctx.user.id))
      .orderBy(topupPurchases.createdAt)
      .limit(50);
    return history;
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
      // Use env var if valid for current sandbox, otherwise fall back to hardcoded sandbox prices
      const validRenderPrice = (id: string | undefined) => !!id && id.startsWith("price_");
      const qualityPrices: Record<string, { priceId: string; amount: number; label: string }> = {
        standard: { priceId: validRenderPrice(process.env.STRIPE_RENDER_STANDARD_PRICE_ID) ? process.env.STRIPE_RENDER_STANDARD_PRICE_ID! : "price_1TSTO9I3gJ5F0DKDoGgNQ8mw", amount: 200, label: "Standard Render (720p)" },
        hd: { priceId: validRenderPrice(process.env.STRIPE_RENDER_HD_PRICE_ID) ? process.env.STRIPE_RENDER_HD_PRICE_ID! : "price_1TSTODI3gJ5F0DKD0jArxUEh", amount: 400, label: "HD Render (1080p)" },
        "4k": { priceId: validRenderPrice(process.env.STRIPE_RENDER_4K_PRICE_ID) ? process.env.STRIPE_RENDER_4K_PRICE_ID! : "price_1TSTOII3gJ5F0DKDoy0EHVvq", amount: 600, label: "4K Render (2160p)" },
      };
      const audioPrices: Record<string, { priceId: string; amount: number; label: string } | null> = {
        standard: null,
        enhanced: { priceId: validRenderPrice(process.env.STRIPE_AUDIO_ENHANCED_PRICE_ID) ? process.env.STRIPE_AUDIO_ENHANCED_PRICE_ID! : "price_1TSTOMI3gJ5F0DKD8PlxlS7d", amount: 100, label: "Enhanced Audio" },
        cinematic: { priceId: validRenderPrice(process.env.STRIPE_AUDIO_CINEMATIC_PRICE_ID) ? process.env.STRIPE_AUDIO_CINEMATIC_PRICE_ID! : "price_1TSTOPI3gJ5F0DKDrMY7k4E2", amount: 300, label: "Cinematic Audio" },
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
      const vb = (id: string | undefined, fallback: string) => (id && id.startsWith("price_")) ? id : fallback;
      const bundlePrices: Record<string, { priceId: string; renders: number; label: string }> = {
        "6": { priceId: vb(process.env.STRIPE_BUNDLE_6_PRICE_ID, "price_1TSTOgI3gJ5F0DKDvbRUG8d6"), renders: 6, label: "6 Render Bundle" },
        "15": { priceId: vb(process.env.STRIPE_BUNDLE_15_PRICE_ID, "price_1TSTOkI3gJ5F0DKDGs8pBex6"), renders: 15, label: "15 Render Bundle" },
        "40": { priceId: vb(process.env.STRIPE_BUNDLE_40_PRICE_ID, "price_1TSTOpI3gJ5F0DKD9ulY6kUr"), renders: 40, label: "40 Render Bundle" },
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
      const vru = (id: string | undefined, fallback: string) => (id && id.startsWith("price_")) ? id : fallback;
      const qualityPrices: Record<string, { priceId: string; amount: number; label: string; resolution: string }> = {
        standard: { priceId: vru(process.env.STRIPE_RENDER_STANDARD_PRICE_ID, "price_1TSTO9I3gJ5F0DKDoGgNQ8mw"), amount: 200, label: "Standard Render", resolution: "720p" },
        hd:       { priceId: vru(process.env.STRIPE_RENDER_HD_PRICE_ID, "price_1TSTODI3gJ5F0DKD0jArxUEh"),       amount: 400, label: "HD Render",       resolution: "1080p" },
        "4k":     { priceId: vru(process.env.STRIPE_RENDER_4K_PRICE_ID, "price_1TSTOII3gJ5F0DKDoy0EHVvq"),       amount: 600, label: "4K Render",       resolution: "2160p" },
      };
      const audioPrices: Record<string, { priceId: string; amount: number; label: string }> = {
        standard:  { priceId: "",                                                                                   amount: 0,   label: "Standard Audio" },
        enhanced:  { priceId: vru(process.env.STRIPE_AUDIO_ENHANCED_PRICE_ID, "price_1TSTOMI3gJ5F0DKD8PlxlS7d"),   amount: 100, label: "WizSound Enhance" },
        cinematic: { priceId: vru(process.env.STRIPE_AUDIO_CINEMATIC_PRICE_ID, "price_1TSTOPI3gJ5F0DKDrMY7k4E2"),  amount: 300, label: "WizSound Cinematic" },
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
      // Standard: flat/dry — reduced bass, no widening, quiet — the "before" experience
      standard: "/manus-storage/wizsound-demo-standard_faeb45d0.mp3",
      // Enhanced: EQ boosted, compressed, stereo widened — clear improvement over standard
      enhanced: "/manus-storage/wizsound-demo-enhanced_0e893759.mp3",
      // Cinematic: same enhanced master — full DSP pipeline, broadcast-standard loudness
      cinematic: "/manus-storage/wizsound-demo-enhanced_0e893759.mp3",
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
        // Trigger the actual render pipeline for music video jobs
        if (updatedJob && updatedJob.sourceJobId && updatedJob.sourceJobType === "music_video") {
          try {
            const { triggerMusicVideoRender } = await import("../music-video-service");
            const triggerResult = await triggerMusicVideoRender(ctx.user.id, updatedJob.sourceJobId);
            if (!triggerResult.success) {
              console.warn(`[confirmRenderPayment] triggerMusicVideoRender failed for job ${updatedJob.sourceJobId}: ${triggerResult.reason}`);
            } else {
              console.log(`[confirmRenderPayment] Render triggered for music video job ${updatedJob.sourceJobId}`);
            }
          } catch (triggerErr) {
            // Non-fatal: payment is confirmed, render will need manual retry
            console.error("[confirmRenderPayment] Failed to trigger render:", triggerErr);
          }
        }
        return { success: true, job: updatedJob, alreadyConfirmed: false, sourceJobId: updatedJob?.sourceJobId ?? null };
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
