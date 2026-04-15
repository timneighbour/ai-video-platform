# WizVid Platform — TODO

## Core Infrastructure
- [x] Database schema (users, subscriptions, credits, projects, transactions)
- [x] Subscription management procedures
- [x] Credit system (add, deduct, track usage)
- [x] Stripe webhook handlers
- [x] S3 file upload and CDN URL generation
- [x] API key generation for Business plan users
- [x] Owner notification system

## AI Video APIs
- [x] Kling AI 3.0 text-to-video integration
- [x] HeyGen Avatar IV lip-sync integration
- [x] Runway ML video-to-video integration
- [x] Seedance 2.0 cinematic video integration
- [x] Job queue system for async video processing
- [x] Real-time status tracking
- [x] Credit deduction on generation
- [x] Kling v2 mode parameter fix (v2 does not support mode param)

## Music Video / WizPilot
- [x] MusicVideoAutopilot page with full creation flow
- [x] Audio upload and transcription
- [x] AI storyboard generation (free, no credits)
- [x] Scene-by-scene image generation
- [x] Storyboard lock on approval
- [x] Render pipeline: storyboard image → animation → final video
- [x] Anti-randomness rule: no new characters/scenes during render
- [x] Render progress UI: 5-stage tracker with percentage + ETA
- [x] Save/resume system: auto-save to DB, resume via ?resume=jobId
- [x] Download fix: blob-fetch with cross-origin CDN fallback
- [x] instrumentAnalysis column in DB and schema (line 150 drizzle/schema.ts)

## Homepage
- [x] 11-section flow: Hero → Trust Strip → How It Works → Examples → Product Ecosystem → Audio Demo → Visual Demo → Pricing → Post-Render → WizBoost → Final CTA
- [x] Hero: fullscreen cinematic bg video, "Start Creating" + "Watch Examples" CTAs
- [x] Trust strip: 3 items (No editing skills / AI storyboard / Full render in minutes)
- [x] How It Works strip: 5-step pipeline (Prompt → Storyboard → Preview → Full Render → Share)
- [x] Examples grid: hover-play video previews (MadeWithWizVid)
- [x] Product Ecosystem: WizCreate, WizPilot, WizSound, WizLumina, WizBoost
- [x] Audio Demo (WizSoundSection): 3-mode toggle (Normal/Enhanced/Cinematic via Web Audio API)
- [x] Visual Demo (WizLuminaSection): 3-mode drag comparison slider
- [x] Pricing: 5 tiers £9/£19/£29/£59/£99, pay-per-render messaging, best value highlight
- [x] Post-Render section: render queue, processing stages, notifications, downloads
- [x] WizBoost section: Musicians/Creators/Animators/YouTubers with social icons
- [x] Final CTA: strong conversion block

## Navigation
- [x] Nav links: Create, How It Works, Examples, Pricing, Help
- [x] Mobile hamburger menu
- [x] DashboardLayout sidebar updated

## UI Polish
- [x] glass-card and btn-primary gradient classes in index.css
- [x] Glassmorphism cards across homepage sections
- [x] Gradient CTAs with hover lift + glow
- [x] Safari video: playsinline + muted autoplay + poster fallback
- [x] Lazy loading on non-critical assets

## Intro Video (v10)
- [x] Cinematic trailer score: build → rise → drop at logo (15.3s)
- [x] Text: "If ever there was a Wiz..." → pause → "There is." → logo
- [x] High-contrast white text, bold, strong shadow
- [x] Slow pacing: 3–3.5s per clip, 0.5s crossfades
- [x] 25.4s duration, H.264 Baseline 1080p, iOS/Safari compatible
- [x] Tap-to-Enter overlay: "Experience WizVid with sound"
- [x] Large pulsing "Enable Sound" button centred during playback
- [x] Unmute on any click/tap anywhere on screen
- [x] Small mute toggle in top-right corner

## Pages
- [x] Home.tsx (landing page)
- [x] HowItWorks.tsx (5-step flow)
- [x] Pricing.tsx (5 tiers + post-render section)
- [x] Subscribe.tsx (checkout flow)
- [x] MyProjects.tsx (Drafts / Rendering / Completed sections)
- [x] Dashboard.tsx (credit balance, quick links, project history)
- [x] Help.tsx (FAQ with correct 5-tier pricing)
- [x] Account.tsx, Credits.tsx, BillingHistory.tsx

## Billing
- [x] 5-tier pricing: Starter £9, Basic £19, Creator £29, Pro £59, Studio £99
- [x] Annual billing toggle (33% discount)
- [x] Stripe checkout sessions
- [x] Stripe webhook handlers
- [x] Credit top-up packs

## Skills
- [x] ai-video-platform-builder skill updated with core system reliability patterns
- [x] ai-video-platform-builder skill updated with homepage/UI polish patterns

## Pending
- [x] Email notifications when render completes (user + owner)
- [x] Stripe Price IDs for new 5-tier structure (connected and verified via render-prices.test.ts)
- [ ] 4K intro video (requires machine with more RAM for upscaling)

## User Dashboard (Apr 14)
- [x] Dashboard page with Drafts / Rendering / Completed sections
- [x] Drafts: jobs with status draft or storyboard_ready — show title, thumbnail, last edited, Resume button
- [x] Rendering: jobs with status rendering or assembling — show title, progress bar, ETA, live polling
- [x] Completed: jobs with status completed — show title, thumbnail, Watch/Download/Share buttons
- [x] Empty states for each section
- [x] Real-time polling for Rendering section (every 5s)
- [x] Route /dashboard wired in App.tsx

## Launch Priority Fixes (Apr 15)
- [x] Render progress stages UI: Queued → Rendering → Finalising → Complete with stage pills + progress bar
- [x] Render-complete email sent to user (not just owner)
- [x] Signup welcome email sent to user on account creation
- [x] Stripe owner email includes session ID + amount
- [x] Save/resume via URL ?jobId param in MusicVideoAutopilot
- [x] Dashboard.tsx imports and renders BackButton
- [x] Hero-system tests updated to match current WizVidIntro implementation
- [x] All 335 tests passing (confirmed)
- [x] tsc --noEmit exits 0 (zero TypeScript errors confirmed)

## Intro Video Restore + Quality Upgrade (Apr 15)
- [x] Identify strongest previous intro version (v9/v10 era with original music)
- [x] Apply WizSound audio enhancement to original track (EQ, stereo width, depth) — do NOT change music
- [x] Re-encode with sharpness filter and enhanced audio, upload to CDN
- [x] Update WizVidIntro component with restored+enhanced version

## Intro Video 4K Quality Upgrade from 3cd307d2 (Apr 15)
- [x] Identify exact intro video and assembly script from checkpoint 3cd307d2
- [x] Re-assemble with WizLumina cinematic colour grade (deeper blacks, HDR curves, sharpness) — 1080p quality-upgraded web version (H.264 Baseline, iOS/Safari compatible)
- [x] Apply enhanced WizSound audio (stereo width m=3.2, EQ presence +4dB, bass +8dB, compression)
- [x] Generate sharp professional titles using Montserrat Bold font
- [x] Animated logo: scale-up + glow bloom + light flare, synced to audio drop
- [x] Encode web-compatible H.264 Baseline 1080p version for iOS/Safari
- [x] Upload to CDN, update WizVidIntro component

## WizCreate Demo Overlay Fix (Apr 15)
- [x] Move demo video overlay to bottom-right of hero section
- [x] Fix all text visibility (step labels upgraded from 9px to 11px, opacity 0.45)
- [x] Align step labels (Describe your idea / AI builds storyboard / Preview every scene / Render final video) with left-side text
