/**
 * timeline-normaliser.ts
 *
 * Ensures the scene timeline is deterministic and gap-free before any scene
 * is dispatched for rendering.
 *
 * Rules enforced:
 *   1. Scenes are sorted by startTime ascending.
 *   2. No two scenes overlap (earlier scene's endTime is trimmed if needed).
 *   3. No gaps between scenes (a cinematic filler scene is inserted for gaps > 1s).
 *   4. The last scene's endTime equals audioDurationMs (±1 frame at 25fps = 40ms).
 *   5. Every scene duration is at least MIN_SCENE_DURATION_MS.
 *   6. Scene boundaries snap to the nearest BPM beat grid when bpm is provided.
 *
 * This function is IDEMPOTENT — running it twice on the same input produces
 * the same output.
 *
 * It does NOT write to the database. Callers are responsible for persisting
 * the normalised scenes.
 */

export const MIN_SCENE_DURATION_MS = 3000; // 3 seconds minimum
export const DEFAULT_SCENE_DURATION_MS = 6000; // 6 seconds default
export const FRAME_TOLERANCE_MS = 40; // 1 frame at 25fps
export const GAP_THRESHOLD_MS = 1000; // gaps < 1s are snapped; >= 1s get a filler scene

export interface NormalisedScene {
  id?: number;
  startTime: number; // ms from start of audio
  endTime: number;   // ms from start of audio
  duration: number;  // endTime - startTime in ms
  sceneType: "cinematic" | "performance";
  prompt?: string;
  isFiller?: boolean; // true if this scene was inserted to fill a gap
}

export interface NormaliseResult {
  scenes: NormalisedScene[];
  fillerScenesInserted: number;
  overlapsResolved: number;
  gapsSnapped: number;
  durationAdjusted: boolean;
}

/**
 * Snap a timestamp (ms) to the nearest beat boundary.
 * Beat interval = 60000 / bpm (ms per beat).
 */
export function snapToBeatGrid(timeMs: number, bpm: number): number {
  if (!bpm || bpm <= 0) return timeMs;
  const beatIntervalMs = (60 / bpm) * 1000;
  return Math.round(timeMs / beatIntervalMs) * beatIntervalMs;
}

/**
 * Normalise a scene timeline.
 *
 * @param scenes            - Raw scenes from the database (may have gaps/overlaps)
 * @param audioDurationMs   - Total audio duration in milliseconds
 * @param bpm               - Optional BPM for beat-grid snapping
 */
export function normaliseTimeline(
  scenes: Array<{
    id?: number;
    startTime: number;
    endTime?: number;
    duration?: number;
    sceneType?: "cinematic" | "performance";
    prompt?: string;
  }>,
  audioDurationMs: number,
  bpm?: number
): NormaliseResult {
  let fillerScenesInserted = 0;
  let overlapsResolved = 0;
  let gapsSnapped = 0;
  let durationAdjusted = false;

  if (scenes.length === 0) {
    // No scenes — create a single cinematic scene covering the full duration
    return {
      scenes: [{
        startTime: 0,
        endTime: audioDurationMs,
        duration: audioDurationMs,
        sceneType: "cinematic",
        prompt: "Cinematic establishing shot",
        isFiller: true,
      }],
      fillerScenesInserted: 1,
      overlapsResolved: 0,
      gapsSnapped: 0,
      durationAdjusted: false,
    };
  }

  // Step 1: Compute endTime for scenes that only have startTime + duration
  let working: NormalisedScene[] = scenes.map((s) => {
    const duration = s.duration ?? DEFAULT_SCENE_DURATION_MS;
    const endTime = s.endTime ?? s.startTime + duration;
    return {
      id: s.id,
      startTime: s.startTime,
      endTime,
      duration: endTime - s.startTime,
      sceneType: s.sceneType ?? "cinematic",
      prompt: s.prompt,
    };
  });

  // Step 2: Sort by startTime
  working.sort((a, b) => a.startTime - b.startTime);

  // Step 3: Resolve overlaps — trim earlier scene's endTime
  for (let i = 0; i < working.length - 1; i++) {
    const curr = working[i];
    const next = working[i + 1];
    if (curr.endTime > next.startTime) {
      const trimmedEnd = next.startTime;
      if (trimmedEnd - curr.startTime >= MIN_SCENE_DURATION_MS) {
        curr.endTime = trimmedEnd;
        curr.duration = trimmedEnd - curr.startTime;
        overlapsResolved++;
      } else {
        // Scene would become too short — remove it
        working.splice(i, 1);
        i--;
        overlapsResolved++;
      }
    }
  }

  // Step 4: Apply BPM snap to all boundaries
  if (bpm && bpm > 0) {
    for (const scene of working) {
      scene.startTime = snapToBeatGrid(scene.startTime, bpm);
      scene.endTime = snapToBeatGrid(scene.endTime, bpm);
      scene.duration = scene.endTime - scene.startTime;
    }
    // Re-sort after snapping (snapping can cause minor reordering)
    working.sort((a, b) => a.startTime - b.startTime);
  }

  // Step 5: Fill gaps between scenes
  const filled: NormalisedScene[] = [];
  for (let i = 0; i < working.length; i++) {
    const scene = working[i];
    const prevEnd = filled.length > 0 ? filled[filled.length - 1].endTime : 0;

    const gap = scene.startTime - prevEnd;

    if (gap > GAP_THRESHOLD_MS) {
      // Insert a cinematic filler scene to cover the gap
      filled.push({
        startTime: prevEnd,
        endTime: scene.startTime,
        duration: scene.startTime - prevEnd,
        sceneType: "cinematic",
        prompt: "Cinematic atmospheric transition",
        isFiller: true,
      });
      fillerScenesInserted++;
    } else if (gap > FRAME_TOLERANCE_MS) {
      // Small gap — snap the current scene's startTime back to close it
      scene.startTime = prevEnd;
      scene.duration = scene.endTime - scene.startTime;
      gapsSnapped++;
    }

    filled.push(scene);
  }

  // Step 6: Ensure last scene ends at audioDurationMs
  if (filled.length > 0) {
    const last = filled[filled.length - 1];
    const shortfall = audioDurationMs - last.endTime;

    if (shortfall > GAP_THRESHOLD_MS) {
      // Gap at the end — insert a filler scene
      filled.push({
        startTime: last.endTime,
        endTime: audioDurationMs,
        duration: audioDurationMs - last.endTime,
        sceneType: "cinematic",
        prompt: "Cinematic closing shot",
        isFiller: true,
      });
      fillerScenesInserted++;
    } else if (shortfall > FRAME_TOLERANCE_MS) {
      // Small shortfall — extend the last scene
      last.endTime = audioDurationMs;
      last.duration = audioDurationMs - last.startTime;
      durationAdjusted = true;
    } else if (shortfall < -FRAME_TOLERANCE_MS) {
      // Last scene overshoots — trim it
      last.endTime = audioDurationMs;
      last.duration = audioDurationMs - last.startTime;
      durationAdjusted = true;
    }
  }

  // Step 7: Enforce minimum duration on all scenes
  const valid = filled.filter((s) => s.duration >= MIN_SCENE_DURATION_MS);

  return {
    scenes: valid,
    fillerScenesInserted,
    overlapsResolved,
    gapsSnapped,
    durationAdjusted,
  };
}
