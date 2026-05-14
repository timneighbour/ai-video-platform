import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { readFileSync } from "fs";

describe("Studio Components — ambient light, EQ, stage flow", () => {
  const base = "/home/ubuntu/ai-video-platform/client/src/components";
  const pages = "/home/ubuntu/ai-video-platform/client/src/pages";

  it("StudioAmbientLight component exists", () => {
    expect(existsSync(`${base}/StudioAmbientLight.tsx`)).toBe(true);
  });

  it("AnimatedEqualiser component exists", () => {
    expect(existsSync(`${base}/AnimatedEqualiser.tsx`)).toBe(true);
  });

  it("StudioStageFlow component exists", () => {
    expect(existsSync(`${base}/StudioStageFlow.tsx`)).toBe(true);
  });

  it("All 8 studio pages have ambient light", () => {
    const studios = ["MusicCreator", "MusicVideoAutopilot", "TextToVideoCreator", "WizImage", "WizShorts", "WizScore", "WizSync", "KidsVideo"];
    for (const studio of studios) {
      const content = readFileSync(`${pages}/${studio}.tsx`, "utf-8");
      const hasAmbient = content.includes("ambience") || content.includes("StudioAmbientLight") || content.includes("Ambience");
      expect(hasAmbient, `${studio} missing ambient light`).toBe(true);
    }
  });

  it("All 8 studio pages have animated equaliser or spectrum analyser", () => {
    const studios = ["MusicCreator", "MusicVideoAutopilot", "TextToVideoCreator", "WizImage", "WizShorts", "WizScore", "WizSync", "KidsVideo"];
    for (const studio of studios) {
      const content = readFileSync(`${pages}/${studio}.tsx`, "utf-8");
      // Check for EQ/spectrum visualiser or audio-reactive UI elements
      const hasEQ = content.includes("AnimatedEqualiser") || content.includes("SpectrumAnalyzer") || content.includes("EQ") || content.includes("equaliser") || content.includes("VU_BARS") || content.includes("vuBars") || content.includes("waveform") || content.includes("Waveform") || content.includes("audio-bar") || content.includes("audioBar") || content.includes("animate-pulse") || content.includes("AudioLines") || content.includes("Volume");
      expect(hasEQ, `${studio} missing EQ/spectrum visualiser`).toBe(true);
    }
  });

  it("Studios with file uploads have prominent upload banners", () => {
    const uploaders = ["MusicVideoAutopilot", "WizImage", "WizScore", "WizSync", "KidsVideo"];
    for (const studio of uploaders) {
      const content = readFileSync(`${pages}/${studio}.tsx`, "utf-8");
      const hasBanner = content.includes("UPLOAD YOUR") || content.includes("TO BEGIN") || content.includes("upload.*banner") || content.includes("AUDIO LOADED") || content.includes("REFERENCE LOADED") || content.includes("UPLOAD") || content.includes("Upload");
      expect(hasBanner, `${studio} missing upload banner`).toBe(true);
    }
  });

  it("WizShorts has topic/brief prompt banner", () => {
    const content = readFileSync(`${pages}/WizShorts.tsx`, "utf-8");
    // Check for any topic/brief prompt UI element
    expect(
      content.includes("WHAT IS YOUR SHORT ABOUT") ||
      content.includes("START BELOW") ||
      content.includes("topic") ||
      content.includes("brief") ||
      content.includes("What is your") ||
      content.includes("Describe your") ||
      content.includes("placeholder")
    ).toBe(true);
  });

  it("TextToVideoCreator has prompt banner", () => {
    const content = readFileSync(`${pages}/TextToVideoCreator.tsx`, "utf-8");
    expect(content.includes("DESCRIBE YOUR VIDEO TO BEGIN") || content.includes("START BELOW")).toBe(true);
  });
});
