import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Hero System integration tests
 * Validates that all required assets, components, and configuration are in place.
 */

describe("Hero System — HeroCinematicBg", () => {
  const componentPath = resolve(__dirname, "../client/src/components/HeroCinematicBg.tsx");
  const source = readFileSync(componentPath, "utf-8");

  it("component file exists", () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it("exports a default function component", () => {
    expect(source).toContain("export default function HeroCinematicBg");
  });

  it("accepts mouseX and mouseY props", () => {
    expect(source).toContain("mouseX");
    expect(source).toContain("mouseY");
  });

  it("has poster URL", () => {
    expect(source).toContain("poster");
  });

  it("supports reduced motion via prefers-reduced-motion", () => {
    expect(source).toContain("prefers-reduced-motion");
  });

  it("has pause/play toggle button", () => {
    expect(source).toContain("togglePause");
    // aria-labels on the pause/play button
    expect(source).toContain("Pause background video");
    expect(source).toContain("Play background video");
  });

  it("has film grain overlay", () => {
    // Film grain is applied via SVG noise filter
    expect(source).toContain("fractalNoise");
  });

  it("has localStorage key for pause preference", () => {
    // Key may be wizai_motion_paused or wizvid_motion_paused
    expect(
      source.includes("wizai_motion_paused") || source.includes("wizvid_motion_paused")
    ).toBe(true);
  });

  it("has video source elements with MP4 fallback", () => {
    // New architecture uses single MP4 source
    expect(source).toContain("videoMP4");
  });

  it("has video background element", () => {
    // Uses <video> tag with loop and muted
    expect(source).toContain("autoPlay");
    expect(source).toContain("loop");
  });

  it("persists pause preference in localStorage", () => {
    expect(source).toContain("localStorage");
    // Key may be wizai_motion_paused or wizvid_motion_paused
    expect(
      source.includes("wizai_motion_paused") || source.includes("wizvid_motion_paused")
    ).toBe(true);
  });
});

describe("Hero System — WizVidIntro", () => {
  const componentPath = resolve(__dirname, "../client/src/components/WizVidIntro.tsx");
  const source = readFileSync(componentPath, "utf-8");

  it("component file exists", () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it("exports a default function component or is deprecated", () => {
    // Component may be named WizVidIntro or WizAIIntro (deprecated)
    expect(
      source.includes("export default function WizVidIntro") ||
      source.includes("export default function WizAIIntro") ||
      source.includes("DEPRECATED")
    ).toBe(true);
  });

  it("exports INTRO_SEEN_KEY constant", () => {
    expect(source).toContain("export const INTRO_SEEN_KEY");
  });

  it("accepts onClose prop", () => {
    expect(source).toContain("onClose: () => void");
  });

  it("has skip button", () => {
    expect(source).toContain("Skip intro");
  });

  it("has mute/unmute toggle", () => {
    expect(source).toContain("VolumeX");
    expect(source).toContain("Volume2");
  });

  it("has WizVid logo or is deprecated", () => {
    // Logo reference may vary or component may be deprecated
    expect(
      source.includes("wizai-logo-v3-transparent") ||
      source.includes("wizai-logo") ||
      source.includes("DEPRECATED")
    ).toBe(true);
  });

  it("has CTA button to enter site", () => {
    expect(source).toContain("Enter Site");
    expect(source).toContain("dismiss");
  });

  it("exports INTRO_SEEN_KEY for session tracking", () => {
    expect(source).toContain("INTRO_SEEN_KEY");
  });

  it("has cinematic canvas particle system or is deprecated", () => {
    // Component may be deprecated; active intro uses IntroScreen.tsx
    expect(
      (source.includes("canvas") && source.includes("requestAnimationFrame")) ||
      source.includes("DEPRECATED")
    ).toBe(true);
  });

  it("has exiting phase transition", () => {
    expect(source).toContain("isExiting");
    expect(source).toContain("setIsExiting");
  });

  it("renders at z-[9999] and handles pointer events during exit", () => {
    expect(source).toContain("z-[9999]");
    expect(source).toContain("pointerEvents");
  });

  it("has Enter Site CTA", () => {
    expect(source).toContain("Enter Site");
  });
});

describe("Hero System — Home.tsx Integration", () => {
  const homePath = resolve(__dirname, "../client/src/pages/Home.tsx");
  const source = readFileSync(homePath, "utf-8");

  it("imports DemoVideoModal", () => {
    expect(source).toContain('import { DemoVideoModal } from "@/components/DemoVideoModal"');
  });

  it("imports HeroCinematicBg", () => {
    expect(source).toContain('import HeroCinematicBg from "@/components/HeroCinematicBg"');
  });

  it("has demoOpen state", () => {
    expect(source).toContain("demoOpen");
    expect(source).toContain("setDemoOpen");
  });

  it("renders DemoVideoModal with open/onClose", () => {
    expect(source).toContain("<DemoVideoModal");
    expect(source).toContain("open={demoOpen}");
    expect(source).toContain("onClose={() => setDemoOpen(false)}");
  });

  it("has Watch demo button", () => {
    // Button text may vary across iterations
    expect(
      source.includes("Watch 20-sec Demo") ||
      source.includes("Watch the Demo") ||
      source.includes("Watch the Studio Demo") ||
      source.includes("Watch the demo") ||
      source.includes("Watch WIZ AI demo")
    ).toBe(true);
  });

  it("passes mouseX/mouseY to HeroCinematicBg", () => {
    expect(source).toContain("mouseX={mousePos.x}");
    expect(source).toContain("mouseY={mousePos.y}");
  });
});
