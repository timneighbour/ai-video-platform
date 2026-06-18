# Full Pipeline Audit — Job 1020003

## What Tim Saw (Problems)
1. Still pictures of Air Studios (B&W overhead photo) used as scene content for scenes 2–6+
2. Scene 0: generic AI orchestra scene — wrong character (woman in green playing cello, not Zara)
3. Scene 1: Zara visible but has a microphone (explicitly not wanted) — appears static
4. No lip sync visible
5. B&W vs colour inconsistency throughout

## Root Cause Analysis

### Root Cause 1: Zara's `environmentRefUrl` is a FULL-BODY WIDE SHOT, not a face-forward performance shot
Zara's `environmentRefUrl` (`environment-mq75o6bn.jpg`) shows her standing full-length in a concert hall — this is a good reference image. However, when Seedance r2v uses this as `@Image1`, it animates the full-body standing pose with minimal movement. The result is a near-static video of a standing figure.

**The image itself is actually good** — Zara is correctly placed in a concert hall environment. The problem is that Seedance is treating it as a still and barely animating it.

### Root Cause 2: Scenes 2–6 used the WRONG source image
Looking at the final video frames at 12s, 18s, 24s, 30s, 36s — these are all the same B&W overhead photo of Lyndhurst Hall. This is NOT Zara's environmentRefUrl. This is the Air Studios reference photo that Tim uploaded as context.

The `contextAssetUrls` field is NULL in the DB — so the Air Studios photo was NOT stored there. But the scenes still show the Air Studios photo. This means the Air Studios photo was used as the `heroImageUrl` for those scenes during rendering.

**Likely cause**: The scene dispatch heartbeat used the Air Studios reference image (from Tim's uploads) as the `heroImageUrl` for scenes that were classified as "cinematic" or "establishing shot" type, and Seedance animated it with near-zero motion.

### Root Cause 3: Scene 0 shows wrong character
Scene 0 prompt says "aerial crane shot reveals Zara" but the rendered video shows a generic woman in green playing cello. This is because:
- Scene 0 has `lipSync=0` (no lip sync), so it used the fallback path
- The character assignment for Scene 0 may have resolved to Jackie (cello) or the generic orchestra, not Zara
- Or the `environmentRefUrl` for Scene 0 resolved to the Pianist's environment ref (which shows a different character)

### Root Cause 4: Scenes marked lipSync=0 (Scenes 0, 1, 4, 11) used videoUrl directly
These scenes bypassed the lip-sync pipeline and used the raw rendered video. The raw renders were:
- Scene 0: Generic orchestra (wrong character)
- Scene 1: Zara standing with microphone (static, no lip sync)
- Scene 4: Aerial Air Studios photo (static still)
- Scene 11: Unknown

### Root Cause 5: HeyGen lip sync on scenes 2, 3, 5–10
These scenes DID go through HeyGen. But if the input video already showed a static/wrong character, HeyGen would produce a lip-synced version of that wrong/static content.

## What Needs to Be Fixed

### Fix 1: Scene generation must produce dynamic video of Zara's face
The current `environmentRefUrl` shows Zara full-body at a distance. For lip-sync to work properly, we need a **close-up or medium shot of Zara's face** as the base video. The Seedance r2v should animate Zara's face with singing motion.

**Action**: Generate a new performance reference for Zara that shows her face clearly (medium close-up, facing camera, in the Air Studios environment). This is the `performanceRefUrl` that should be used for lip-sync scenes.

### Fix 2: Remove the Air Studios reference photo from scene rendering
The Air Studios B&W overhead photo must NOT be used as a scene input image. It should only inform the text prompt describing the environment.

**Action**: Identify where this photo is being injected into the scene rendering pipeline and remove it.

### Fix 3: Ensure all performance scenes use Zara's face-forward reference
All 12 scenes should show Zara singing (when vocals are present) or Zara in the environment (when instrumental). The character assignment for all scenes should resolve to Zara.

### Fix 4: Fix the microphone issue
The prompt for Scene 1 (and potentially others) should explicitly say "no microphone."

### Fix 5: Re-render all 12 scenes with corrected pipeline

## Scene-by-Scene Evidence

| Scene | Time | What Was Seen | Expected |
|---|---|---|---|
| 0 | 0s | Generic orchestra — woman in green playing cello | Zara in Air Studios, cinematic establishing shot |
| 1 | 6s | Zara standing with microphone — near-static | Zara close-up, no microphone, lip-syncing |
| 2 | 12s | B&W overhead Air Studios photo — STILL | Zara singing, medium shot, dynamic camera |
| 3 | 18s | B&W overhead Air Studios photo — STILL | Zara singing, dynamic camera |
| 4 | 24s | B&W overhead Air Studios photo — STILL | Zara singing, dynamic camera |
| 5 | 30s | B&W overhead Air Studios photo — STILL | Zara singing, dynamic camera |
| 6 | 36s | B&W overhead Air Studios photo — STILL | Zara singing, dynamic camera |

## Zara's Reference Images

- **masterPortraitUrl**: Full-body standing on grey background — NOT suitable for lip-sync (face too small, grey background)
- **environmentRefUrl**: Full-body standing in concert hall — better, but still full-body (face too small for HeyGen lip-sync)
- **performanceRefUrl**: NULL — this is the missing piece

## Immediate Action Plan

1. Generate a new `performanceRefUrl` for Zara: medium close-up (chest-up), facing camera, in Air Studios environment, no microphone
2. Update the scene dispatch to use `performanceRefUrl` for lip-sync scenes instead of `environmentRefUrl`
3. Identify and remove the Air Studios reference photo from scene rendering inputs
4. Re-render all 12 scenes
5. Re-assemble final video
