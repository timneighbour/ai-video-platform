# Provider QA Checklist — Wiz AI Render Pipeline

**Version:** 1.0 — May 2026  
**Applies to:** All video generation providers before activation in production  
**Owner:** Engineering / Tim  
**Status:** MANDATORY — no provider enters production without passing all checks

---

## Purpose

This checklist exists because we learned the hard way that providers can pass technical integration tests while producing output that is completely unacceptable for a paid product. Atlas Cloud passed all API tests and produced watermarked video. fal.ai MuseTalk passed all integration tests and produced unreliable lip sync. Neither was caught before reaching paying users.

This checklist is the gate that prevents that from happening again.

---

## Section 1 — Watermark Validation (BLOCKING)

All items must be PASS before the provider is activated.

| Check | Method | Pass Criteria | Status |
|---|---|---|---|
| Generate a 5-second test clip | Call provider API with a simple prompt | Video plays without any visible watermark, logo, or branding overlay | |
| Generate a 10-second test clip | Same as above, longer duration | No watermark at any point in the video | |
| Test at 720p and 1080p | Generate at both resolutions | No watermark at either resolution | |
| Test with reference image | Generate with a reference_images input | No watermark when reference images are used | |
| Test with free/trial tier | If provider has tiers, test the tier we are using | Confirm our contracted tier is watermark-free | |
| Manual visual inspection | Watch the full output video | No branding, no overlay, no semi-transparent logo | |

**Current Status:**
- WaveSpeed Seedance 2.0: ✅ PASS — confirmed watermark-free
- Atlas Cloud Seedance: ❌ FAIL — embeds visible watermark in output. **DISABLED.**
- fal.ai Seedance: ⚠️ UNVERIFIED — disabled pending watermark check
- HeyGen lip sync: ⚠️ PENDING — requires test with active API key

---

## Section 2 — Character Consistency (BLOCKING)

| Check | Method | Pass Criteria | Status |
|---|---|---|---|
| Single reference image test | Submit one portrait as reference_images[0] | Character in output visually matches the reference photo | |
| Multi-scene consistency test | Generate 3 scenes with same reference | Character appearance is consistent across all 3 scenes | |
| Dual-anchor test | Submit portrait + storyboard as reference_images[0,1] | Character matches portrait AND scene matches storyboard | |
| Character Lock™ validation | Generate with and without reference | With reference: consistent. Without: random (expected). | |
| Face detail preservation | Use a close-up portrait as reference | Facial features (hair, skin tone, face shape) preserved in output | |

**Current Status:**
- WaveSpeed Seedance 2.0: ⚠️ PARTIAL — reference_images accepted, consistency varies by prompt complexity
- Atlas Cloud: ❌ DISABLED (watermark)
- HeyGen lip sync: N/A (post-processing, not generation)

---

## Section 3 — Render Quality (BLOCKING)

| Check | Method | Pass Criteria | Status |
|---|---|---|---|
| Motion quality | Watch output at normal speed | Natural, fluid motion — no jitter, no stuttering, no frozen frames | |
| Resolution quality | View at 100% zoom | Sharp, not blurry or pixelated | |
| Temporal consistency | Watch scene from start to finish | No sudden appearance changes, no flickering | |
| Prompt adherence | Compare prompt to output | Output visually matches the described scene | |
| Duration accuracy | Check output duration | Matches requested duration (±0.5s) | |
| Audio sync (if applicable) | Check audio-to-video alignment | Audio and video are in sync | |

---

## Section 4 — Lip Sync Quality (BLOCKING for lip sync providers)

| Check | Method | Pass Criteria | Status |
|---|---|---|---|
| Phoneme accuracy | Submit a clear speech clip | Mouth movements match phonemes in the audio | |
| Music sync | Submit a music track (not speech) | Lip movements follow the vocal melody, not random | |
| Natural appearance | Watch at normal speed | Lip sync looks natural, not robotic or exaggerated | |
| No artefacts | Watch full clip | No flickering around mouth, no blending errors | |
| Hero-shot suitability | Test with close-up face video | Output is suitable for a hero-shot performance scene | |

**Current Status:**
- fal.ai MuseTalk: ❌ REMOVED — unreliable phoneme matching, not production-grade for music
- HeyGen v2 lipsync: ⚠️ PENDING — wired and ready, requires API key validation and showcase test

---

## Section 5 — Assembly Integration (BLOCKING)

| Check | Method | Pass Criteria | Status |
|---|---|---|---|
| API response format | Check response schema | Matches expected format (task ID, polling endpoint) | |
| Polling reliability | Poll a submitted job 10 times | Status updates correctly, completes without hanging | |
| Error handling | Submit an invalid request | Returns a parseable error, does not hang | |
| Timeout behaviour | Submit a job and wait | Job completes within documented SLA | |
| S3 URL compatibility | Submit an S3 URL as input | Provider accepts and processes S3-hosted files | |

---

## Section 6 — Cost Validation (ADVISORY)

| Check | Method | Pass Criteria | Status |
|---|---|---|---|
| Per-second cost | Check provider pricing page | Cost per second of output is within budget | |
| Billing accuracy | Compare API charges to expected | Charged amount matches expected based on duration | |
| Free tier limits | Check if free tier is used | If using free tier, confirm it does not add watermarks | |

---

## Provider Activation Decision

A provider may be activated in production ONLY when:

1. All BLOCKING checks in Sections 1–3 are PASS
2. For lip sync providers: all BLOCKING checks in Section 4 are PASS
3. Section 5 assembly integration is fully validated
4. At least one complete showcase render has been reviewed by Tim and approved

**Current Production Providers:**
| Provider | Role | Status |
|---|---|---|
| WaveSpeed Seedance 2.0 | Primary video generation | ✅ ACTIVE |
| HeyGen v2 lipsync | Hero-shot lip sync (selective) | ⚠️ WIRED — pending API key validation |
| Atlas Cloud | DISABLED | ❌ WATERMARK — do not re-enable |
| fal.ai MuseTalk | REMOVED | ❌ QUALITY — do not re-enable |

---

## Showcase Render Validation Checklist

Before scaling traffic or subscriptions, one complete showcase render must pass all of the following:

- [ ] Correct character face in every scene (matches uploaded portrait)
- [ ] Consistent character identity across all scenes (same person throughout)
- [ ] No watermarks in any scene
- [ ] Believable motion quality (no jitter, no frozen frames)
- [ ] Believable lip sync on hero shots (if HeyGen is active)
- [ ] No corrupted scenes (no black frames, no garbled video)
- [ ] No assembly errors (scenes join correctly, no gaps)
- [ ] Cinematic pacing acceptable (not generic avatar karaoke)
- [ ] Audio sync correct (video matches song timing)
- [ ] Final video playable and downloadable

**Showcase render approved by Tim:** [ ] YES / [ ] NO  
**Date approved:** _______________

---

*This document is a living checklist. Update it when providers are added, changed, or removed.*
