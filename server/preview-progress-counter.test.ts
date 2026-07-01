/**
 * Tests for the "Previews generating X / Y" progress counter logic.
 *
 * The counter is derived purely from the scenes array state:
 *   - totalScenes  = scenes.length
 *   - doneCount    = scenes with a non-null previewImageUrl
 *   - loadingCount = scenes with previewImageLoading=true AND no previewImageUrl
 *   - pct          = Math.round(doneCount / totalScenes * 100)
 *   - visible      = totalScenes > 0 && loadingCount > 0
 */
import { describe, it, expect } from "vitest";

interface SceneState {
  id: number;
  previewImageUrl: string | null | undefined;
  previewImageLoading: boolean;
}

function deriveProgressCounter(scenes: SceneState[]) {
  const totalScenes = scenes.length;
  const loadingCount = scenes.filter(s => s.previewImageLoading && !s.previewImageUrl).length;
  const doneCount = scenes.filter(s => !!s.previewImageUrl).length;
  const visible = totalScenes > 0 && loadingCount > 0;
  const pct = totalScenes > 0 ? Math.round((doneCount / totalScenes) * 100) : 0;
  return { totalScenes, loadingCount, doneCount, visible, pct };
}

describe("preview progress counter", () => {
  it("is hidden when no scenes exist", () => {
    const { visible } = deriveProgressCounter([]);
    expect(visible).toBe(false);
  });

  it("is hidden when all scenes already have previews", () => {
    const scenes: SceneState[] = [
      { id: 1, previewImageUrl: "https://cdn/1.jpg", previewImageLoading: false },
      { id: 2, previewImageUrl: "https://cdn/2.jpg", previewImageLoading: false },
    ];
    const { visible } = deriveProgressCounter(scenes);
    expect(visible).toBe(false);
  });

  it("is visible when at least one scene is loading", () => {
    const scenes: SceneState[] = [
      { id: 1, previewImageUrl: "https://cdn/1.jpg", previewImageLoading: false },
      { id: 2, previewImageUrl: null, previewImageLoading: true },
    ];
    const { visible, doneCount, totalScenes } = deriveProgressCounter(scenes);
    expect(visible).toBe(true);
    expect(doneCount).toBe(1);
    expect(totalScenes).toBe(2);
  });

  it("shows 0 / N when no previews are done yet", () => {
    const scenes: SceneState[] = [
      { id: 1, previewImageUrl: null, previewImageLoading: true },
      { id: 2, previewImageUrl: null, previewImageLoading: true },
      { id: 3, previewImageUrl: null, previewImageLoading: true },
    ];
    const { visible, doneCount, totalScenes, pct } = deriveProgressCounter(scenes);
    expect(visible).toBe(true);
    expect(doneCount).toBe(0);
    expect(totalScenes).toBe(3);
    expect(pct).toBe(0);
  });

  it("shows correct progress mid-generation (3 done, 5 total → 60%)", () => {
    const scenes: SceneState[] = [
      { id: 1, previewImageUrl: "https://cdn/1.jpg", previewImageLoading: false },
      { id: 2, previewImageUrl: "https://cdn/2.jpg", previewImageLoading: false },
      { id: 3, previewImageUrl: "https://cdn/3.jpg", previewImageLoading: false },
      { id: 4, previewImageUrl: null, previewImageLoading: true },
      { id: 5, previewImageUrl: null, previewImageLoading: true },
    ];
    const { visible, doneCount, totalScenes, pct } = deriveProgressCounter(scenes);
    expect(visible).toBe(true);
    expect(doneCount).toBe(3);
    expect(totalScenes).toBe(5);
    expect(pct).toBe(60);
  });

  it("does not count a scene as loading when it has a previewImageUrl (even if loading flag is true)", () => {
    // This covers the regenerating overlay case where previewImageUrl exists but loading=true
    const scenes: SceneState[] = [
      { id: 1, previewImageUrl: "https://cdn/1.jpg", previewImageLoading: true }, // regenerating
      { id: 2, previewImageUrl: null, previewImageLoading: true }, // genuinely loading
    ];
    const { visible, loadingCount, doneCount } = deriveProgressCounter(scenes);
    expect(visible).toBe(true);
    expect(loadingCount).toBe(1); // only scene 2 counts as loading
    expect(doneCount).toBe(1);   // scene 1 counts as done (has URL)
  });

  it("hides when last scene finishes loading", () => {
    const scenes: SceneState[] = [
      { id: 1, previewImageUrl: "https://cdn/1.jpg", previewImageLoading: false },
      { id: 2, previewImageUrl: "https://cdn/2.jpg", previewImageLoading: false },
      { id: 3, previewImageUrl: "https://cdn/3.jpg", previewImageLoading: false },
    ];
    const { visible, pct } = deriveProgressCounter(scenes);
    expect(visible).toBe(false);
    expect(pct).toBe(100);
  });

  it("rounds percentage correctly (1 done, 8 total → 13%)", () => {
    const scenes: SceneState[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      previewImageUrl: i === 0 ? "https://cdn/done.jpg" : null,
      previewImageLoading: i !== 0,
    }));
    const { pct } = deriveProgressCounter(scenes);
    expect(pct).toBe(13); // Math.round(1/8 * 100) = 13
  });
});
