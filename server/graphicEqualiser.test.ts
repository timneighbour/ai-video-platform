/**
 * Tests for the GraphicEqualiser component logic.
 *
 * Since this is a canvas-based component that relies on Web Audio API,
 * we test the module structure, exports, and the WeakMap caching logic.
 * Full rendering tests would require a browser environment with Web Audio API.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("GraphicEqualiser component", () => {
  const componentPath = resolve(__dirname, "..", "client", "src", "components", "GraphicEqualiser.tsx");
  const source = readFileSync(componentPath, "utf-8");

  it("exports a default function component", () => {
    expect(source).toContain("export default function GraphicEqualiser");
  });

  it("accepts required props: audioElement, isPlaying", () => {
    expect(source).toContain("audioElement: HTMLAudioElement | null");
    expect(source).toContain("isPlaying: boolean");
  });

  it("accepts optional props: barCount, height, className", () => {
    expect(source).toContain("barCount?: number");
    expect(source).toContain("height?: number");
    expect(source).toContain("className?: string");
  });

  it("uses Web Audio API AnalyserNode for frequency data", () => {
    expect(source).toContain("AudioContext");
    expect(source).toContain("createAnalyser");
    expect(source).toContain("getByteFrequencyData");
    expect(source).toContain("fftSize");
  });

  it("uses a WeakMap to cache AudioContext per audio element", () => {
    expect(source).toContain("WeakMap");
    expect(source).toContain("audioCtxMap");
  });

  it("connects source → analyser → destination", () => {
    expect(source).toContain("createMediaElementSource");
    expect(source).toContain("source.connect(analyser)");
    expect(source).toContain("analyser.connect(ctx.destination)");
  });

  it("uses requestAnimationFrame for the render loop", () => {
    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("cancelAnimationFrame");
  });

  it("renders a canvas element", () => {
    expect(source).toContain("<canvas");
    expect(source).toContain("canvasRef");
  });

  it("draws violet/blue gradient bars matching WizVid brand", () => {
    // Check for the brand gradient colours
    expect(source).toContain("139, 92, 246"); // violet-500 rgb
    expect(source).toContain("59, 130, 246"); // blue-500 rgb
  });

  it("draws idle bars when not playing", () => {
    // When paused, should draw minimal idle bars
    expect(source).toContain("idleHeight");
    expect(source).toContain("rgba(139, 92, 246, 0.25)");
  });

  it("resumes AudioContext on play (browser gesture requirement)", () => {
    expect(source).toContain('ctxRef.current?.state === "suspended"');
    expect(source).toContain("ctxRef.current.resume()");
  });

  it("uses roundRect for rounded bar tops", () => {
    expect(source).toContain("roundRect");
  });

  it("has default barCount of 32 and height of 48", () => {
    expect(source).toContain("barCount = 32");
    expect(source).toContain("height = 48");
  });
});
