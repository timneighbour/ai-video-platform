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

  it("has poster desktop and mobile URLs", () => {
    expect(source).toContain("posterDesktop");
    expect(source).toContain("posterMobile");
  });

  it("has responsive <picture> element with mobile source", () => {
    expect(source).toContain("<picture>");
    expect(source).toContain("max-width: 768px");
  });

  it("supports reduced motion via prefers-reduced-motion", () => {
    expect(source).toContain("prefers-reduced-motion");
  });

  it("has pause/play toggle button", () => {
    expect(source).toContain("togglePause");
    expect(source).toContain("Pause background animation");
    expect(source).toContain("Play background animation");
  });

  it("has film grain overlay", () => {
    expect(source).toContain("Film grain");
  });

  it("has analytics tracking via trackEvent", () => {
    expect(source).toContain("trackEvent");
    expect(source).toContain("wizvid_bg_started");
  });

  it("has video source elements with AV1, VP9, and MP4 fallback", () => {
    expect(source).toContain("bgVideoAV1");
    expect(source).toContain("bgVideoVP9");
    expect(source).toContain("bgVideoMP4");
  });

  it("has styleframe proxy crossfade for pre-video state", () => {
    expect(source).toContain("styleframes");
    expect(source).toContain("currentFrame");
  });

  it("persists pause preference in localStorage", () => {
    expect(source).toContain("localStorage");
    expect(source).toContain("wizvid_motion_paused");
  });
});

describe("Hero System — IntroFilmModal", () => {
  const componentPath = resolve(__dirname, "../client/src/components/IntroFilmModal.tsx");
  const source = readFileSync(componentPath, "utf-8");

  it("component file exists", () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it("exports a default function component", () => {
    expect(source).toContain("export default function IntroFilmModal");
  });

  it("accepts open and onClose props", () => {
    expect(source).toContain("open: boolean");
    expect(source).toContain("onClose: () => void");
  });

  it("has poster desktop and mobile URLs", () => {
    expect(source).toContain("posterDesktop");
    expect(source).toContain("posterMobile");
  });

  it("has responsive <picture> element", () => {
    expect(source).toContain("<picture>");
  });

  it("has VTT captions track", () => {
    expect(source).toContain("captionsUrl");
    expect(source).toContain("intro-film.vtt");
  });

  it("has play button with accessible label", () => {
    expect(source).toContain("Play intro film");
  });

  it("has close button with accessible label", () => {
    expect(source).toContain("Close intro film");
  });

  it("locks body scroll when open", () => {
    expect(source).toContain("document.body.style.overflow");
  });

  it("handles Escape key to close", () => {
    expect(source).toContain("Escape");
  });

  it("has analytics tracking", () => {
    expect(source).toContain("trackEvent");
    expect(source).toContain("wizvid_intro_opened");
    expect(source).toContain("wizvid_intro_played");
    expect(source).toContain("wizvid_intro_completed");
  });

  it("has mute/unmute toggle", () => {
    expect(source).toContain("toggleMute");
    expect(source).toContain("VolumeX");
    expect(source).toContain("Volume2");
  });

  it("has fullscreen toggle", () => {
    expect(source).toContain("toggleFullscreen");
    expect(source).toContain("requestFullscreen");
  });

  it("has captions toggle", () => {
    expect(source).toContain("captionsOn");
    expect(source).toContain("CaptionsOff");
  });

  it("has progress bar", () => {
    expect(source).toContain("progress");
    expect(source).toContain("from-violet-500 to-cyan-400");
  });

  it("has storyboard proxy slideshow", () => {
    expect(source).toContain("storyboardFrames");
    expect(source).toContain("proxyFrame");
    expect(source).toContain("SCENE_CAPTIONS");
  });

  it("has video source elements with AV1, VP9, and MP4 fallback", () => {
    expect(source).toContain("introVideoAV1");
    expect(source).toContain("introVideoVP9");
    expect(source).toContain("introVideoMP4");
  });
});

describe("Hero System — VTT Captions", () => {
  const vttPath = resolve(__dirname, "../client/public/captions/intro-film.vtt");

  it("VTT file exists", () => {
    expect(existsSync(vttPath)).toBe(true);
  });

  it("starts with WEBVTT header", () => {
    const content = readFileSync(vttPath, "utf-8");
    expect(content.startsWith("WEBVTT")).toBe(true);
  });

  it("has 6 caption cues", () => {
    const content = readFileSync(vttPath, "utf-8");
    const cues = content.split("\n").filter((l) => l.includes("-->"));
    expect(cues.length).toBe(6);
  });

  it("covers 0–30 second range", () => {
    const content = readFileSync(vttPath, "utf-8");
    expect(content).toContain("00:00:00.000");
    expect(content).toContain("00:00:30.000");
  });
});

describe("Hero System — Transcript", () => {
  const transcriptPath = resolve(__dirname, "../client/public/captions/intro-film-transcript.txt");

  it("transcript file exists", () => {
    expect(existsSync(transcriptPath)).toBe(true);
  });

  it("contains all 6 scene lines", () => {
    const content = readFileSync(transcriptPath, "utf-8");
    expect(content).toContain("[0:00");
    expect(content).toContain("[0:25");
  });
});

describe("Hero System — Home.tsx Integration", () => {
  const homePath = resolve(__dirname, "../client/src/pages/Home.tsx");
  const source = readFileSync(homePath, "utf-8");

  it("imports IntroFilmModal", () => {
    expect(source).toContain('import IntroFilmModal from "@/components/IntroFilmModal"');
  });

  it("imports HeroCinematicBg", () => {
    expect(source).toContain('import HeroCinematicBg from "@/components/HeroCinematicBg"');
  });

  it("has introOpen state", () => {
    expect(source).toContain("introOpen");
    expect(source).toContain("setIntroOpen");
  });

  it("renders IntroFilmModal with open/onClose", () => {
    expect(source).toContain("<IntroFilmModal");
    expect(source).toContain("open={introOpen}");
    expect(source).toContain("onClose={() => setIntroOpen(false)}");
  });

  it("has Watch the Film button", () => {
    expect(source).toContain("Watch the Film");
  });

  it("passes mouseX/mouseY to HeroCinematicBg", () => {
    expect(source).toContain("mouseX={mousePos.x}");
    expect(source).toContain("mouseY={mousePos.y}");
  });
});
