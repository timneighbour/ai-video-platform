# WIZ AI Platform — Permanent Pipeline Rules

**MANDATORY: Read this file at the start of every pipeline-related task.**

---

## 5-Stage Compositing Pipeline (NEVER BYPASS)

Every music video render MUST pass through all 5 stages in order. No stage may be skipped or reordered.

| Stage | Service | Rule |
|-------|---------|------|
| 1 | Seedance | Generate cinematic background clip (no Zara) |
| 2 | Face-crop + InfiniteTalk | Crop portrait using fal.ai face detection (NOT heuristic), then submit to InfiniteTalk |
| 3 | fal.ai BiRefNet | Remove grey background from InfiniteTalk output |
| 4 | ffmpeg composite | Overlay Zara matte onto Seedance background |
| 5 | Assembly | Stitch all clips with original full-mix audio |

---

## Face-Crop Rules (Stage 2) — MANDATORY

- **ALWAYS** use fal.ai retinaface face detection to locate the face bounding box
- **NEVER** use a blind heuristic (top-X% of image) as the primary strategy
- Headroom above crown: **minimum 30% of face height** — full head including hair MUST be visible
- Chin pad below chin: minimum 55% of face height (shows shoulders)
- Side pad: minimum 45% of face width each side
- Output: square crop, minimum 512px
- Fallback (if face detection API fails): top-45% heuristic (NOT 55%) — log a `[FaceCrop] WARNING: using heuristic fallback` line

**Why this matters:** Portrait B is a full-body fashion photo. Without face detection, the crop clips the crown of Zara's head. This has happened multiple times and must never happen again.

---

## Assembly Clip Selection Priority (NEVER CHANGE)

In `server/music-video-service.ts` → `assembleMusicVideo()`, the clip URL priority for performance scenes is:

1. `compositeVideoUrl` (compositeStatus=`done`) — **HIGHEST PRIORITY** — Zara composited onto Air Studios background
2. `lipSyncVideoUrl` (lipSyncStatus=`done`) — grey background fallback only when composite not ready
3. `videoUrl` — raw Seedance clip (cinematic scenes only, or error fallback)

**This order MUST NOT be changed.** The composited clip is always the correct final output.

**Verification:** After every assembly, check the logs for `using WizSync™ composited clip (Stage 4) ✓` for all performance scenes. If you see `using WizSync™ SyncLabs lip-synced clip` for a performance scene, the composite was not used — stop and investigate.

---

## Assembly Guard (NEVER REMOVE)

The `assemblyWorker.ts` composite guard MUST check that ALL scenes have `compositeStatus` in (`done`, `skipped`, `error`) before assembling. If any performance scene has `compositeStatus=pending` or `processing`, the job must stay in `rendering` status and the assembly must not fire.

Do not remove or weaken this guard.

---

## Stuck-Scene Recovery (ALWAYS ACTIVE)

Any scene stuck in `lipSyncStatus=processing` OR `compositeStatus=processing` for **more than 10 minutes** MUST be automatically reset to `error` by the heartbeat reaper so it can be retried. This prevents permanent pipeline stalls after server restarts or silent failures.

The reaper is implemented in `sceneDispatchHeartbeat.ts` sections 6a (lip sync) and 6b (composite). Do not remove these sections.

---

## Job Reset Protocol

When resetting a job for re-render, follow this exact sequence:

1. Set job: `status=rendering`, `finalVideoUrl=NULL`
2. Reset performance scenes: `lipSyncStatus=pending`, `lipSyncVideoUrl=NULL`, `compositeStatus=pending`, `compositeVideoUrl=NULL`, `compositeVideoKey=NULL`, `compositeAttempts=0`
3. Set cinematic scenes: `compositeStatus=skipped` (they never need compositing)
4. Clear the in-memory face-crop cache: call `clearCropCache()` or restart the server

---

## Verification Checklist Before Declaring a Render Complete

Before telling Tim a video is ready, verify ALL of the following in the logs:

- [ ] `[FaceCrop] Face detected: x=... y=... w=... h=...` — face detection ran (not heuristic)
- [ ] `[Assembly] Scene N: using WizSync™ composited clip (Stage 4) ✓` — for every performance scene
- [ ] `[ExportValidator] Job XXXXXX: PASSED` — file size is DIFFERENT from any previous run
- [ ] Job `status=completed` in DB with a populated `finalVideoUrl`

---

## What NOT to Do

- **NEVER** declare the pipeline "locked" or "complete" without verifying the assembly logs show `composited clip (Stage 4)` for all performance scenes
- **NEVER** use the SyncLabs lip-sync path for WIZ AI jobs — InfiniteTalk (WaveSpeed) is the only lip-sync provider
- **NEVER** assemble a video where the file size matches a previous run exactly — identical file size means the same clips were used and compositing was bypassed
- **NEVER** use a heuristic crop as the primary face-crop strategy — always use fal.ai face detection first
