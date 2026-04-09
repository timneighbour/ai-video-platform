/**
 * Billing Router
 * Handles subscription and credit purchases
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { createSubscriptionCheckout, createCreditCheckout } from "./stripe";
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from "./products";

export const billingRouter = router({
  createSubscriptionCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.enum(["starter", "pro", "business"]),
        origin: z.string().url(),
        billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const checkoutUrl = await createSubscriptionCheckout(
          ctx.user.id,
          input.planId as keyof typeof SUBSCRIPTION_PLANS,
          ctx.user.email || "",
          ctx.user.name,
          input.origin,
          input.billingInterval
        );

        return checkoutUrl;
      } catch (error) {
        console.error("Checkout error:", error);
        throw error;
      }
    }),

  createCreditCheckout: protectedProcedure
    .input(
      z.object({
        packId: z.enum(["small", "medium", "large"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const checkoutUrl = await createCreditCheckout(
          ctx.user.id,
          input.packId as keyof typeof CREDIT_PACKS,
          ctx.user.email || "",
          ctx.user.name,
          input.origin
        );

        return checkoutUrl;
      } catch (error) {
        console.error("Checkout error:", error);
        throw error;
      }
    }),
});
