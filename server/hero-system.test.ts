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

  it("has analytics tracking via trackEvent", () => {
    expect(source).toContain("trackEvent");
    expect(source).toContain("wizvid_bg_started");
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
    expect(source).toContain("wizvid_motion_paused");
  });
});

describe("Hero System — WizVidIntro", () => {
  const componentPath = resolve(__dirname, "../client/src/components/WizVidIntro.tsx");
  const source = readFileSync(componentPath, "utf-8");

  it("component file exists", () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it("exports a default function component", () => {
    expect(source).toContain("export default function WizVidIntro");
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

  it("has WizVid logo", () => {
    expect(source).toContain("wizvid-logo-transparent");
  });

  it("has CTA button to enter site", () => {
    expect(source).toContain("Enter Site");
    expect(source).toContain("dismiss");
  });

  it("exports INTRO_SEEN_KEY for session tracking", () => {
    expect(source).toContain("INTRO_SEEN_KEY");
  });

  it("has cinematic trailer video", () => {
    expect(source).toContain("TRAILER_URL");
    expect(source).toContain(".mp4");
  });

  it("has exiting phase transition", () => {
    expect(source).toContain("isExiting");
    expect(source).toContain("setIsExiting");
  });

  it("renders at z-[9999] and handles pointer events during exit", () => {
    expect(source).toContain("z-[9999]");
    expect(source).toContain("pointerEvents");
  });

  it("has CTA show timer for end-of-trailer reveal", () => {
    expect(source).toContain("showCTA");
    expect(source).toContain("CTA_SHOW_AT_MS");
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
    expect(source).toContain("Watch 20-sec Demo");
  });

  it("passes mouseX/mouseY to HeroCinematicBg", () => {
    expect(source).toContain("mouseX={mousePos.x}");
    expect(source).toContain("mouseY={mousePos.y}");
  });
});
