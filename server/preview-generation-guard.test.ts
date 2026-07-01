/**
 * Tests for the previewGenerationRunningRef guard that prevents duplicate
 * sequential preview generation loops when jobQuery fires multiple times.
 *
 * These tests verify the guard logic in isolation — the actual React component
 * behaviour is covered by the guard being a useRef (always stable, no re-render).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simulates the sequential preview generation loop with the ref guard. */
async function runPreviewLoop(opts: {
  scenesNeedingPreview: Array<{ id: number }>;
  jobId: number;
  guardRef: { current: boolean };
  generatePreview: (sceneId: number) => Promise<string | null>;
  onSceneUpdate: (sceneId: number, imageUrl: string | null) => void;
}) {
  const { scenesNeedingPreview, jobId, guardRef, generatePreview, onSceneUpdate } = opts;

  if (scenesNeedingPreview.length === 0 || !jobId) return "skipped_no_scenes";
  if (guardRef.current) return "skipped_guard";

  guardRef.current = true;
  try {
    for (const scene of scenesNeedingPreview) {
      try {
        const imageUrl = await generatePreview(scene.id);
        onSceneUpdate(scene.id, imageUrl);
      } catch {
        onSceneUpdate(scene.id, null);
      }
    }
  } finally {
    guardRef.current = false;
  }
  return "completed";
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("previewGenerationRunningRef guard", () => {
  let guardRef: { current: boolean };

  beforeEach(() => {
    guardRef = { current: false };
  });

  it("runs the loop and releases the guard when all scenes succeed", async () => {
    const updates: Record<number, string | null> = {};
    const generatePreview = vi.fn(async (id: number) => `https://cdn.example.com/scene-${id}.jpg`);

    const result = await runPreviewLoop({
      scenesNeedingPreview: [{ id: 1 }, { id: 2 }, { id: 3 }],
      jobId: 42,
      guardRef,
      generatePreview,
      onSceneUpdate: (id, url) => { updates[id] = url; },
    });

    expect(result).toBe("completed");
    expect(guardRef.current).toBe(false); // guard released
    expect(generatePreview).toHaveBeenCalledTimes(3);
    expect(updates[1]).toBe("https://cdn.example.com/scene-1.jpg");
    expect(updates[2]).toBe("https://cdn.example.com/scene-2.jpg");
    expect(updates[3]).toBe("https://cdn.example.com/scene-3.jpg");
  });

  it("skips the second loop invocation when the guard is already set", async () => {
    guardRef.current = true; // simulate first loop already running

    const generatePreview = vi.fn(async () => "https://cdn.example.com/scene.jpg");
    const result = await runPreviewLoop({
      scenesNeedingPreview: [{ id: 1 }],
      jobId: 42,
      guardRef,
      generatePreview,
      onSceneUpdate: vi.fn(),
    });

    expect(result).toBe("skipped_guard");
    expect(generatePreview).not.toHaveBeenCalled();
    // Guard remains true (held by the first loop)
    expect(guardRef.current).toBe(true);
  });

  it("releases the guard even when a scene generation throws", async () => {
    const updates: Record<number, string | null> = {};
    const generatePreview = vi.fn(async (id: number) => {
      if (id === 2) throw new Error("BFL API timeout");
      return `https://cdn.example.com/scene-${id}.jpg`;
    });

    const result = await runPreviewLoop({
      scenesNeedingPreview: [{ id: 1 }, { id: 2 }, { id: 3 }],
      jobId: 42,
      guardRef,
      generatePreview,
      onSceneUpdate: (id, url) => { updates[id] = url; },
    });

    expect(result).toBe("completed");
    expect(guardRef.current).toBe(false); // guard released despite error
    expect(updates[1]).toBe("https://cdn.example.com/scene-1.jpg");
    expect(updates[2]).toBeNull(); // failed scene gets null
    expect(updates[3]).toBe("https://cdn.example.com/scene-3.jpg");
  });

  it("skips when there are no scenes needing preview", async () => {
    const generatePreview = vi.fn();
    const result = await runPreviewLoop({
      scenesNeedingPreview: [],
      jobId: 42,
      guardRef,
      generatePreview,
      onSceneUpdate: vi.fn(),
    });

    expect(result).toBe("skipped_no_scenes");
    expect(generatePreview).not.toHaveBeenCalled();
    expect(guardRef.current).toBe(false);
  });

  it("allows a second loop after the first completes (guard reset)", async () => {
    const generatePreview = vi.fn(async (id: number) => `https://cdn.example.com/scene-${id}.jpg`);
    const updates: Record<number, string | null> = {};
    const onSceneUpdate = (id: number, url: string | null) => { updates[id] = url; };

    // First loop
    await runPreviewLoop({
      scenesNeedingPreview: [{ id: 1 }],
      jobId: 42,
      guardRef,
      generatePreview,
      onSceneUpdate,
    });

    expect(guardRef.current).toBe(false); // guard released

    // Simulate storyboard regeneration resetting the guard
    guardRef.current = false;

    // Second loop (new storyboard)
    const result2 = await runPreviewLoop({
      scenesNeedingPreview: [{ id: 10 }, { id: 11 }],
      jobId: 42,
      guardRef,
      generatePreview,
      onSceneUpdate,
    });

    expect(result2).toBe("completed");
    expect(generatePreview).toHaveBeenCalledTimes(3); // 1 from first + 2 from second
    expect(updates[10]).toBe("https://cdn.example.com/scene-10.jpg");
    expect(updates[11]).toBe("https://cdn.example.com/scene-11.jpg");
  });

  it("does not run when jobId is falsy", async () => {
    const generatePreview = vi.fn();
    const result = await runPreviewLoop({
      scenesNeedingPreview: [{ id: 1 }],
      jobId: 0, // falsy
      guardRef,
      generatePreview,
      onSceneUpdate: vi.fn(),
    });

    expect(result).toBe("skipped_no_scenes");
    expect(generatePreview).not.toHaveBeenCalled();
  });
});
