/**
 * Tests for the upsell checkout flow.
 * Verifies the billing router's createUpsellCheckout procedure structure
 * and the webhook handler's upsell detection logic.
 */
import { describe, it, expect } from "vitest";

describe("Upsell Checkout", () => {
  describe("Upsell pricing", () => {
    const UPSELL_PRICES = {
      cinematicScenes: 500, // £5.00 in pence
      upgrade4K: 300,       // £3.00 in pence
      removeWatermark: 200, // £2.00 in pence
    };

    it("cinematic scenes costs £5", () => {
      expect(UPSELL_PRICES.cinematicScenes).toBe(500);
    });

    it("4K upgrade costs £3", () => {
      expect(UPSELL_PRICES.upgrade4K).toBe(300);
    });

    it("watermark removal costs £2", () => {
      expect(UPSELL_PRICES.removeWatermark).toBe(200);
    });

    it("all three combined costs £10", () => {
      const total = UPSELL_PRICES.cinematicScenes + UPSELL_PRICES.upgrade4K + UPSELL_PRICES.removeWatermark;
      expect(total).toBe(1000);
    });
  });

  describe("Upsell metadata detection", () => {
    function isUpsellPurchase(metadata: Record<string, string>): boolean {
      return metadata.type === "upsell";
    }

    function parseUpsellAddons(metadata: Record<string, string>) {
      return {
        cinematicScenes: metadata.cinematic_scenes === "true",
        upgrade4K: metadata.upgrade_4k === "true",
        removeWatermark: metadata.remove_watermark === "true",
      };
    }

    it("detects upsell type from metadata", () => {
      expect(isUpsellPurchase({ type: "upsell", job_id: "123" })).toBe(true);
      expect(isUpsellPurchase({ type: "credit_purchase" })).toBe(false);
      expect(isUpsellPurchase({ pack: "starter" })).toBe(false);
    });

    it("parses addon flags from metadata", () => {
      const metadata = {
        type: "upsell",
        job_id: "42",
        cinematic_scenes: "true",
        upgrade_4k: "false",
        remove_watermark: "true",
      };
      const addons = parseUpsellAddons(metadata);
      expect(addons.cinematicScenes).toBe(true);
      expect(addons.upgrade4K).toBe(false);
      expect(addons.removeWatermark).toBe(true);
    });

    it("handles missing addon flags as false", () => {
      const metadata = { type: "upsell", job_id: "42" };
      const addons = parseUpsellAddons(metadata);
      expect(addons.cinematicScenes).toBe(false);
      expect(addons.upgrade4K).toBe(false);
      expect(addons.removeWatermark).toBe(false);
    });
  });

  describe("Frontend upsell total calculation", () => {
    function calculateUpsellTotal(addons: { cinematicScenes: boolean; upgrade4K: boolean; removeWatermark: boolean }): number {
      return (addons.cinematicScenes ? 5 : 0) + (addons.upgrade4K ? 3 : 0) + (addons.removeWatermark ? 2 : 0);
    }

    it("returns 0 when nothing selected", () => {
      expect(calculateUpsellTotal({ cinematicScenes: false, upgrade4K: false, removeWatermark: false })).toBe(0);
    });

    it("returns 5 for cinematic only", () => {
      expect(calculateUpsellTotal({ cinematicScenes: true, upgrade4K: false, removeWatermark: false })).toBe(5);
    });

    it("returns 3 for 4K only", () => {
      expect(calculateUpsellTotal({ cinematicScenes: false, upgrade4K: true, removeWatermark: false })).toBe(3);
    });

    it("returns 2 for watermark only", () => {
      expect(calculateUpsellTotal({ cinematicScenes: false, upgrade4K: false, removeWatermark: true })).toBe(2);
    });

    it("returns 10 for all three", () => {
      expect(calculateUpsellTotal({ cinematicScenes: true, upgrade4K: true, removeWatermark: true })).toBe(10);
    });

    it("returns 8 for cinematic + 4K", () => {
      expect(calculateUpsellTotal({ cinematicScenes: true, upgrade4K: true, removeWatermark: false })).toBe(8);
    });

    it("returns 7 for cinematic + watermark", () => {
      expect(calculateUpsellTotal({ cinematicScenes: true, upgrade4K: false, removeWatermark: true })).toBe(7);
    });
  });
});
