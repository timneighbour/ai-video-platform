# WizVid Hero System — Production Handoff

This document covers the complete video-based hero system for wizvid.ai. It includes storyboard tables, the full asset manifest, step-by-step replacement instructions for swapping in final video files, and a QA checklist.

---

## 1. Architecture Overview

The hero system comprises two independent components and a set of supporting assets:

| Component | File | Purpose |
|---|---|---|
| **HeroCinematicBg** | `client/src/components/HeroCinematicBg.tsx` | Full-bleed background behind the hero section. Plays a looping video (or crossfading styleframe proxy). Includes poster, reduced-motion support, pause toggle, parallax, analytics. |
| **IntroFilmModal** | `client/src/components/IntroFilmModal.tsx` | Modal triggered by "Watch the Film" CTA. Plays the 30-second intro film (or storyboard proxy). Includes poster, captions, transcript, mute/fullscreen/captions toggles, analytics. |
| **VTT Captions** | `client/public/captions/intro-film.vtt` | WebVTT captions for the intro film (6 cues, 0–30s). |
| **Transcript** | `client/public/captions/intro-film-transcript.txt` | Plain-text transcript of the intro film. |

Both components are wired into `Home.tsx` via the `Hero()` function. The `CinematicEntryScreen` (canvas-based) is still present in `App.tsx` as a session-once entry animation and remains independent of this system.

---

## 2. Intro Film Storyboard

The intro film is a 30-second cinematic piece with 6 scenes. Each scene has a generated styleframe that serves as a production reference and as a proxy slideshow until the final video is ready.

| Scene | Time | Beat | VO / Caption | Styleframe |
|---|---|---|---|---|
| 1 | 0:00–0:05 | **Problem** — Creator staring at blank timeline | "Every creator starts with a vision..." | `intro-scene1-problem.webp` |
| 2 | 0:05–0:10 | **Friction** — Frustrated creator, scattered clips | "But turning ideas into video is painful." | `intro-scene2-friction.webp` |
| 3 | 0:10–0:14 | **Reset** — Fade to black, WizVid logo appears | "What if there was a better way?" | `intro-scene3-reset.webp` |
| 4 | 0:14–0:20 | **Reveal** — WizVid UI materializes, prompt typed | "Meet WizVid — your AI video studio." | `intro-scene4-reveal.webp` |
| 5 | 0:20–0:25 | **Mechanism** — Storyboard cards fan out, character consistency shown | "One prompt. Consistent characters. Full storyboard." | `intro-scene5-mechanism.webp` |
| 6 | 0:25–0:30 | **Payoff** — Final video plays in player, CTA appears | "Start creating free — your story awaits." | `intro-scene6-payoff.webp` |

---

## 3. Background Loop Storyboard

The background loop is a 7-second seamless loop showing the product journey from darkness to finished output.

| Beat | Time | Description | Styleframe |
|---|---|---|---|
| 1 | 0:00–1.5s | **Reveal** — Dark void, faint UI panel outline emerging | `bg-beat1-reveal.webp` |
| 2 | 1.5–3.0s | **Prompt** — Glass input panel materializes, text typed | `bg-beat2-prompt.webp` |
| 3 | 3.0–4.5s | **Storyboard** — Three cards fan out with consistent character | `bg-beat3-storyboard.webp` |
| 4 | 4.5–6.0s | **Output** — Video player shows finished scene | `bg-beat4-output.webp` |
| 5 | 6.0–7.0s | **Loop** — Dissolve back to darkness (seamless) | Crossfade to beat 1 |

---

## 4. Asset Manifest

All assets are hosted on the project CDN and tied to the webdev project lifecycle.

### 4.1 Intro Film Storyboard Frames

| Asset | CDN URL |
|---|---|
| Scene 1 — Problem | `https://d2xsxph8kpxj0f.cloudfront.net/.../intro-scene1-problem-NUDPXm4zAHrwbTQNxpG2EY.webp` |
| Scene 2 — Friction | `https://d2xsxph8kpxj0f.cloudfront.net/.../intro-scene2-friction-NmEviwrPfokNcXnr4AFVKK.webp` |
| Scene 3 — Reset | `https://d2xsxph8kpxj0f.cloudfront.net/.../intro-scene3-reset-ZDdtyjbTkAHnskxAhb859q.webp` |
| Scene 4 — Reveal | `https://d2xsxph8kpxj0f.cloudfront.net/.../intro-scene4-reveal-ZbdCdSTL2JVwthCsunMJ8a.webp` |
| Scene 5 — Mechanism | `https://d2xsxph8kpxj0f.cloudfront.net/.../intro-scene5-mechanism-8efAUip8Z2FaeyKUU8BxkQ.webp` |
| Scene 6 — Payoff | `https://d2xsxph8kpxj0f.cloudfront.net/.../intro-scene6-payoff-i4oZPuEGtUBVZaXieTDACC.webp` |

### 4.2 Background Loop Styleframes

| Asset | CDN URL |
|---|---|
| Beat 1 — Reveal | `https://d2xsxph8kpxj0f.cloudfront.net/.../bg-beat1-reveal-Vck6bEQh55CtAQTUFc9bRi.webp` |
| Beat 2 — Prompt | `https://d2xsxph8kpxj0f.cloudfront.net/.../bg-beat2-prompt-VaPBgqUQ2AXxfpvPM4PGbK.webp` |
| Beat 3 — Storyboard | `https://d2xsxph8kpxj0f.cloudfront.net/.../bg-beat3-storyboard-Cw5exPHLhQsPmxAgvctukJ.webp` |
| Beat 4 — Output | `https://d2xsxph8kpxj0f.cloudfront.net/.../bg-beat4-output-j65jh9UYoNEupVq62hyfFJ.webp` |

### 4.3 Posters

| Asset | CDN URL |
|---|---|
| Intro Poster (Desktop) | `https://d2xsxph8kpxj0f.cloudfront.net/.../poster-intro-desktop-2Xh5BzRVD8ty9ef5YUJWz8.webp` |
| Intro Poster (Mobile) | `https://d2xsxph8kpxj0f.cloudfront.net/.../poster-intro-mobile-4ao9q2zXTvr4UsZSusV5ZR.webp` |
| Background Poster (Desktop) | `https://d2xsxph8kpxj0f.cloudfront.net/.../poster-bg-desktop-PbmdiBCY44BQqDVNBMG4cu.webp` |
| Background Poster (Mobile) | `https://d2xsxph8kpxj0f.cloudfront.net/.../poster-bg-mobile-dz7ff7n5tfbQcaPEGNQYJD.webp` |
| Reduced-Motion Static | `https://d2xsxph8kpxj0f.cloudfront.net/.../background-static-26hfv2iSf3duNSvqQunvsu.webp` |

### 4.4 Video Files (To Be Produced)

| Slot | Codec | Format | Target Size | Component |
|---|---|---|---|---|
| `bgVideoAV1` | AV1 | `.webm` | < 2 MB | HeroCinematicBg |
| `bgVideoVP9` | VP9 | `.webm` | < 3 MB | HeroCinematicBg |
| `bgVideoMP4` | H.264 | `.mp4` | < 4 MB | HeroCinematicBg |
| `introVideoAV1` | AV1 | `.webm` | < 5 MB | IntroFilmModal |
| `introVideoVP9` | VP9 | `.webm` | < 7 MB | IntroFilmModal |
| `introVideoMP4` | H.264 | `.mp4` | < 10 MB | IntroFilmModal |

---

## 5. Video Replacement Instructions

When the final rendered videos are ready, follow these steps:

### Step 1: Upload videos to CDN

```bash
manus-upload-file --webdev /path/to/hero-bg-loop.av1.webm
manus-upload-file --webdev /path/to/hero-bg-loop.vp9.webm
manus-upload-file --webdev /path/to/hero-bg-loop.mp4
manus-upload-file --webdev /path/to/intro-film.av1.webm
manus-upload-file --webdev /path/to/intro-film.vp9.webm
manus-upload-file --webdev /path/to/intro-film.mp4
```

### Step 2: Update HeroCinematicBg.tsx

Open `client/src/components/HeroCinematicBg.tsx` and replace the empty strings in the `ASSETS` object:

```ts
const ASSETS = {
  bgVideoAV1: "https://cdn.../hero-bg-loop.av1.webm",  // ← paste CDN URL
  bgVideoVP9: "https://cdn.../hero-bg-loop.vp9.webm",  // ← paste CDN URL
  bgVideoMP4: "https://cdn.../hero-bg-loop.mp4",        // ← paste CDN URL
  // ... rest stays the same
};
```

### Step 3: Update IntroFilmModal.tsx

Open `client/src/components/IntroFilmModal.tsx` and replace the empty strings in the `ASSETS` object:

```ts
const ASSETS = {
  introVideoAV1: "https://cdn.../intro-film.av1.webm",  // ← paste CDN URL
  introVideoVP9: "https://cdn.../intro-film.vp9.webm",  // ← paste CDN URL
  introVideoMP4: "https://cdn.../intro-film.mp4",        // ← paste CDN URL
  // ... rest stays the same
};
```

### Step 4: Update VTT captions

If the final video timing differs from the storyboard, update `client/public/captions/intro-film.vtt` to match the actual scene timings.

### Step 5: Test and checkpoint

```bash
pnpm test --run server/hero-system.test.ts
```

Then save a checkpoint and publish.

---

## 6. QA Checklist

### Visual

- [ ] Background crossfades smoothly between styleframes (3.5s per frame)
- [ ] Poster loads immediately (LCP-friendly, `fetchPriority="high"`)
- [ ] Mobile poster displays on screens < 768px
- [ ] Film grain overlay is subtle (3% opacity)
- [ ] Gradient overlays ensure text readability
- [ ] Parallax responds to mouse movement
- [ ] Pause button toggles between Play/Pause icons

### Intro Film Modal

- [ ] "Watch the Film" button opens the modal
- [ ] Poster displays with centered play button and glow ring
- [ ] Play button starts the storyboard proxy slideshow
- [ ] Captions display below each frame during proxy playback
- [ ] Progress bar advances smoothly
- [ ] Close button (X) dismisses the modal
- [ ] Escape key dismisses the modal
- [ ] Body scroll is locked while modal is open
- [ ] Captions toggle works
- [ ] Fullscreen toggle works

### Accessibility

- [ ] `prefers-reduced-motion: reduce` shows static poster only
- [ ] All buttons have `aria-label` attributes
- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Video elements have `aria-hidden="true"`
- [ ] VTT captions are well-formed (WEBVTT header, 6 cues)
- [ ] Transcript file is available

### Analytics

- [ ] `wizvid_bg_started` fires when background begins playing
- [ ] `wizvid_bg_paused` fires on pause/play toggle (includes `paused` boolean)
- [ ] `wizvid_intro_opened` fires when modal opens
- [ ] `wizvid_intro_played` fires when play is clicked
- [ ] `wizvid_intro_completed` fires when video ends

### Performance

- [ ] Poster images are WebP format
- [ ] Video uses `preload="none"` (lazy-loaded)
- [ ] Styleframe images use `loading="lazy"` (except first)
- [ ] No layout shift when video loads over poster

### Cross-Browser

- [ ] Chrome/Edge: AV1 source plays
- [ ] Firefox: VP9 source plays
- [ ] Safari: MP4 fallback plays
- [ ] Mobile Safari: `playsInline` works, no fullscreen hijack

---

## 7. Analytics Events Reference

| Event Name | Trigger | Key Params |
|---|---|---|
| `wizvid_bg_started` | Background begins playing | `video_id`, `video_name`, `location` |
| `wizvid_bg_paused` | Pause/play toggle clicked | `video_id`, `video_name`, `location`, `paused` |
| `wizvid_intro_opened` | Intro modal opens | `video_id`, `video_name`, `location` |
| `wizvid_intro_played` | Play button clicked in modal | `video_id`, `video_name`, `location` |
| `wizvid_intro_completed` | Video reaches end | `video_id`, `video_name` |

---

## 8. Color Palette Reference

| Token | Value | Usage |
|---|---|---|
| Background | `#05060A` | Deep near-black base |
| Surface | `#0A0C12` | Slightly lighter panels |
| Primary text | `rgba(244, 247, 255, 1)` | Headlines |
| Secondary text | `rgba(244, 247, 255, 0.72)` | Body copy, labels |
| Accent violet | `#7C3AED` | Glows, gradients, CTA borders |
| Accent cyan | `#22D3EE` | Secondary accent, progress bar end |
| Border | `rgba(244, 247, 255, 0.10)` | Glass-morphism borders |
