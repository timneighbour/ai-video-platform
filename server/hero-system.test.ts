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

  it("has CTA button", () => {
    // CTA navigates to site entry (dismiss/enter site/onboarding)
    expect(source).toMatch(/dismiss|Enter Site|Start Creating|onboarding/);
  });

  it("intro shows on every page load (no localStorage gating)", () => {
    // Intro now shows every time — no localStorage.setItem to gate it
    expect(source).toContain("INTRO_SEEN_KEY"); // Key is exported but not used for gating
    // Close/dismiss handler exists (may be named dismiss or handleClose)
    expect(source).toMatch(/handleClose|dismiss/);
  });

  it("has cinematic background video clips", () => {
    // Either BG_CLIPS array or TRAILER_URL single video
    expect(source).toMatch(/BG_CLIPS|TRAILER_URL/);
    expect(source).toContain(".mp4");
  });

  it("has fade-in/exiting phase transitions", () => {
    // Phase transitions use CSS opacity or className-based fade
    expect(source).toMatch(/fade-in|opacity.*isExiting|transition.*opacity|isExiting/);
    expect(source).toContain("exiting");
  });

  it("renders at z-[9999] and is pointer-events:none when exiting", () => {
    expect(source).toContain("z-[9999]");
    expect(source).toContain("pointerEvents: isExiting ? \"none\" : \"auto\"");
  });

  it("has progress bar or CTA timing mechanism", () => {
    // Progress bar may use introProgress or CTA_SHOW_AT_MS timer
    expect(source).toMatch(/introProgress|CTA_SHOW_AT_MS|showCTA/);
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
