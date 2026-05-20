# Definitive Lip Sync Pipeline (WizSync™)

> **Last updated:** 2026-05-20
> **Applies to:** Music Video, WizAnimate, and any future product with vocal lip sync

---

## The Golden Rule

**SyncLabs sync-3 must ONLY receive isolated vocals (Demucs separation). NEVER the full mix.**

The viewer hears the original full mix. SyncLabs never touches the full mix.

---

## Pipeline Steps (Per-Scene — Preferred)

### 1. Demucs Vocal Isolation
- Input: Original full mix audio (`job.audioUrl`)
- Output: Isolated vocals stem (`job.vocalsUrl`)
- Tool: Demucs (via `vocal-isolation-service.ts`)
- The isolated vocals contain ONLY the singing voice — no piano, no strings, no instruments

### 2. Cut Scene Audio Segment
- Input: Isolated vocals stem + scene `startTime` + scene `duration`
- Output: 6-second isolated vocals clip for that exact scene window
- Tool: ffmpeg (`audio-clip-extractor.ts`)
- **Timing must be frame-exact** — same timestamps as the video clip

### 3. Submit to SyncLabs sync-3
- Input: Raw video clip (from WaveSpeed/Seedance) + isolated vocals clip
- Output: Lip-synced video (mouth movements driven by isolated voice)
- Settings:
  - `syncMode: "cut_off"` (trim to shorter of audio/video)
  - `temperature: 1.0` (maximum expressiveness for singing)
  - `occlusionDetection: true` (handles microphones, hands, etc.)
- **SyncLabs returns a video with its own audio track — this audio must be STRIPPED**

### 4. Strip SyncLabs Audio
- Input: SyncLabs output video
- Output: Silent video with lip-synced mouth movements
- Tool: `ffmpeg -an -c:v copy`
- The SyncLabs audio (isolated vocals) is discarded entirely

### 5. Assembly — Overlay Original Full Mix
- All scene clips (lip-synced silent + cinematic raw) are concatenated
- The ORIGINAL full mix audio (`job.audioUrl`) is overlaid on the concatenated video
- Tool: `ffmpeg -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac`
- **Result:** Viewer hears the complete song (vocals + instruments), sees perfect lip sync

---

## Why This Works

The isolated vocals and the full mix share **identical timing** (they come from the same master recording). When SyncLabs drives the mouth from isolated vocals at timestamp 54–60s, and the viewer hears the full mix at 54–60s, the lip sync is frame-perfect because the voice in both tracks is the same performance at the same time.

---

## When to Apply Lip Sync

- **ANY scene where a character's face/mouth is visible** — regardless of whether it's labelled "performance" or "cinematic"
- If Zara (or any singing character) is walking away but her face is visible, she should still be lip-syncing
- The user can toggle `enableLipSync` per scene or per job

---

## Whole-Video Fallback (Only When Per-Scene Fails)

If per-scene lip sync was not applied (all scenes have `lipSyncStatus: "error"`), the assembly runs a whole-video SyncLabs pass as a fallback:
- **Still uses isolated vocals** (never full mix)
- Applied to the entire assembled video in one pass
- Less accurate than per-scene (SyncLabs processes all frames including non-singing scenes)
- If per-scene lip sync succeeded, the whole-video pass is **SKIPPED entirely**

---

## BPM in WaveSpeed Prompts

Always include the song's BPM in WaveSpeed text prompts for cinematic scenes with musicians:
- This influences the speed of movements (bow strokes, head nods, swaying)
- Example: "...slow graceful bow movements at 76 BPM tempo..."
- The BPM is stored on `job.songBpm` (detected during audio analysis)

---

## Products Using This Pipeline

| Product | Per-Scene Lip Sync | Whole-Video Fallback | Audio Overlay |
|---------|-------------------|---------------------|---------------|
| Music Video | ✓ (heartbeat) | ✓ (assembly) | ✓ (assembly) |
| WizAnimate | ✓ (render service) | ✓ (render service) | ✓ (render service) |

---

## Key Files

- `server/vocal-isolation-service.ts` — Demucs vocal separation
- `server/audio-clip-extractor.ts` — Scene audio segment cutting
- `server/ai-apis/synclabs-lipsync.ts` — SyncLabs sync-3 API client
- `server/scheduled/sceneDispatchHeartbeat.ts` — Per-scene lip sync (Music Video)
- `server/music-video-service.ts` — Assembly + whole-video fallback (Music Video)
- `server/kids-video-render-service.ts` — Full pipeline (WizAnimate)

---

## Anti-Patterns (NEVER DO)

1. ❌ Send full mix to SyncLabs — instruments mask the voice, lip sync is inaccurate
2. ❌ Keep SyncLabs audio in the final video — it's isolated vocals, not the full song
3. ❌ Skip lip sync on visible singing characters — if the mouth is visible, sync it
4. ❌ Run whole-video pass when per-scene already succeeded — it's worse quality
5. ❌ Use different timestamps for audio and video — they must be from the same timeline
