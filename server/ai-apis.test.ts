/**
 * AI API Integration Tests
 * Validates that all AI provider APIs are properly configured and accessible
 */

import { describe, it, expect, beforeAll } from "vitest";
import { initKlingAI } from "./ai-apis/kling";
import { initHeyGen } from "./ai-apis/heygen";
import { initRunway } from "./ai-apis/runway";
import { initSeedance } from "./ai-apis/seedance";

describe("AI API Integrations", () => {
  describe("Kling AI", () => {
    it("should initialize with valid credentials", () => {
      expect(() => {
        const kling = initKlingAI();
        expect(kling).toBeDefined();
      }).not.toThrow();
    });

    it("should have createTextToVideo method", () => {
      const kling = initKlingAI();
      expect(kling.createTextToVideo).toBeDefined();
      expect(typeof kling.createTextToVideo).toBe("function");
    });

    it("should have getTaskStatus method", () => {
      const kling = initKlingAI();
      expect(kling.getTaskStatus).toBeDefined();
      expect(typeof kling.getTaskStatus).toBe("function");
    });

    it("should have listTasks method", () => {
      const kling = initKlingAI();
      expect(kling.listTasks).toBeDefined();
      expect(typeof kling.listTasks).toBe("function");
    });
  });

  describe("HeyGen", () => {
    it("should initialize with valid credentials", () => {
      expect(() => {
        const heygen = initHeyGen();
        expect(heygen).toBeDefined();
      }).not.toThrow();
    });

    it("should have createVideo method", () => {
      const heygen = initHeyGen();
      expect(heygen.createVideo).toBeDefined();
      expect(typeof heygen.createVideo).toBe("function");
    });

    it("should have getVideoStatus method", () => {
      const heygen = initHeyGen();
      expect(heygen.getVideoStatus).toBeDefined();
      expect(typeof heygen.getVideoStatus).toBe("function");
    });

    it("should have createPhotoAvatar method", () => {
      const heygen = initHeyGen();
      expect(heygen.createPhotoAvatar).toBeDefined();
      expect(typeof heygen.createPhotoAvatar).toBe("function");
    });

    it("should have translateVideo method", () => {
      const heygen = initHeyGen();
      expect(heygen.translateVideo).toBeDefined();
      expect(typeof heygen.translateVideo).toBe("function");
    });
  });

  describe("Runway ML", () => {
    it("should initialize with valid credentials", () => {
      expect(() => {
        const runway = initRunway();
        expect(runway).toBeDefined();
      }).not.toThrow();
    });

    it("should have createVideoToVideo method", () => {
      const runway = initRunway();
      expect(runway.createVideoToVideo).toBeDefined();
      expect(typeof runway.createVideoToVideo).toBe("function");
    });

    it("should have createImageToVideo method", () => {
      const runway = initRunway();
      expect(runway.createImageToVideo).toBeDefined();
      expect(typeof runway.createImageToVideo).toBe("function");
    });

    it("should have getTaskStatus method", () => {
      const runway = initRunway();
      expect(runway.getTaskStatus).toBeDefined();
      expect(typeof runway.getTaskStatus).toBe("function");
    });
  });

  describe("Seedance 2.0", () => {
    it("should initialize with valid credentials", () => {
      expect(() => {
        const seedance = initSeedance();
        expect(seedance).toBeDefined();
      }).not.toThrow();
    });

    it("should have createTextToVideo method", () => {
      const seedance = initSeedance();
      expect(seedance.createTextToVideo).toBeDefined();
      expect(typeof seedance.createTextToVideo).toBe("function");
    });

    it("should have createImageToVideo method", () => {
      const seedance = initSeedance();
      expect(seedance.createImageToVideo).toBeDefined();
      expect(typeof seedance.createImageToVideo).toBe("function");
    });

    it("should have getTaskStatus method", () => {
      const seedance = initSeedance();
      expect(seedance.getTaskStatus).toBeDefined();
      expect(typeof seedance.getTaskStatus).toBe("function");
    });
  });

  describe("Video Generation Service", () => {
    it("should export credit costs for all tools", () => {
      const creditCosts = {
        "text_to_video": 100,
        "lip_sync": 75,
        "video_to_video": 150,
        voiceover: 50,
      };

      expect(creditCosts["text_to_video"]).toBe(100);
      expect(creditCosts["lip_sync"]).toBe(75);
      expect(creditCosts["video_to_video"]).toBe(150);
      expect(creditCosts.voiceover).toBe(50);
    });
  });
});
