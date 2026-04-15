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

## Full Quality + Navigation Pass (Apr 15 — on e26520c1 base)
- [x] Extract audio from b0e49c8b intro video and use it in new quality-upgraded intro (user provided MP3 directly)
- [x] Re-encode intro with WizSound+WizLumina quality upgrade (v16 — logo overlay + boom + 4K)
- [x] Fix 404 page: dark theme, cross-platform visible
- [x] Create WizLumina product page with CTAs, back/home buttons
- [x] Create WizBoost product page with CTAs, back/home buttons
- [x] Create Showcase page and wire route
- [x] Add all missing product routes to App.tsx (/products/wizcreate, /products/wizpilot, /products/wizsound, /products/wizlumina, /products/wizboost, /showcase, /my-projects)
- [ ] Audit all pages for missing back/home buttons and fix them
- [ ] Fix mobile portrait layout: all text, titles, intro video fit on small screens

## Intro Video v16 + Cross-Platform Compatibility (Apr 15)
- [x] Overlay crisp sharpened logo PNG on intro video logo segment (18.75s–26.5s)
- [x] Add cinematic boom sound at logo reveal (18.75s)
- [x] Update intro video to v16 with all enhancements
- [x] Audit WizVidIntro for iOS Safari, Android Chrome, Firefox, Edge, Brave compatibility
- [x] Ensure intro video displays correctly in portrait mode on all mobile phones
- [x] Verify video codec compatibility (H.264 High Profile Level 5.1 — iOS 11+/Android 7+ supported)
- [x] Test touch events and gesture handling on mobile (touch-action: manipulation added)
- [x] Ensure all CTA buttons and navigation work on touch devices (-webkit-tap-highlight-color: transparent)

## Brand Logo + Remaining Fixes (Apr 15)
- [x] Check and fix brand logo size in header/nav so it stands out on every page (Home h-16, Dashboard h-12, all product/showcase pages 48px with purple glow)

## AI Music Generation Enhancements (Apr 15)
- [ ] Add audio upload with playback preview (user can hear uploaded track before generating)
- [ ] Add AI lyric generator button (generates lyrics from prompt/genre/mood using LLM)
- [ ] Add style input field (free-text tags like Suno's Advanced mode for custom style description)
- [ ] Allow users to edit AI-generated lyrics before submitting
- [ ] Backend: audio upload to S3, lyric generation procedure, pass style + audio to Suno API
- [ ] Frontend: Suno-like Advanced mode UI with audio upload, lyrics editor, style tags
- [x] Centralise bottom 2 app cards (Text to Video, AI Music Generator) on the Onboarding page

## Create Page Layout Fix (Apr 15)
- [x] Move WizCreate video player/mockup from upper-right to bottom of the Create page hero section
- [x] Ensure Create page hero has proper layout: text/CTAs on top, video player mockup below

## AI Music Page - Graphic Equaliser (Apr 15)
- [x] Add graphic equaliser visualisation to the audio uploader/player on the AI Music Generation page
- [x] Equaliser should animate in real-time when audio is playing (Web Audio API AnalyserNode)
- [x] Visual style: purple/violet gradient bars matching WizVid brand

## PRE-LAUNCH FULL SITE AUDIT (Apr 15)
- [ ] 1. Global link check — all nav, buttons, CTAs, footer, internal links
- [ ] 2. CTA functionality — Start Creating, Watch Demo, Pricing, Upgrade, WizSound/WizLumina
- [ ] 3. Video & media check — intro video, audio, playback across pages
- [ ] 4. Creation flow — prompt → storyboard → edit → preview → render
- [ ] 5. Render system — start, progress, status updates, completion
- [ ] 6. Output validation — final video matches storyboard
- [ ] 7. Save + resume — project persistence and reload
- [ ] 8. Dashboard — My Projects, My Videos, drafts, completed
- [ ] 9. Download function — button works, file plays
- [ ] 10. Payment system (Stripe) — plan select, checkout, success
- [ ] 11. Email system — signup, render complete, payment notifications
- [ ] 12. WizSound / WizLumina UX — links, demos, audio/visual clarity
- [ ] 13. Mobile UX — responsive layout, navigation, CTAs, video
- [ ] 14. Performance — page load, no lag, no blocking scripts
- [ ] 15. Error handling — failed render, failed payment, network drop messages
- [ ] 16. Logging — actions logged, errors tracked
- [ ] 17. Full user journey test — end-to-end from homepage to download
- [ ] Produce full audit report with issues, severity, and fixes

## Hero Layout — Left-Align Text (Apr 15)
- [x] Move hero text, CTAs, trust indicators back to left-aligned layout (asymmetric)
- [x] Keep WizCreate video player mockup below the hero content
