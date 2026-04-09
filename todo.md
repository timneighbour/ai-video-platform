# AI Video Platform - Project TODO

## Database & Backend Infrastructure
- [x] Design and implement database schema (users, subscriptions, credits, projects, transactions)
- [x] Implement subscription management procedures (create, update, cancel)
- [x] Implement credit system procedures (add, deduct, track usage)
- [x] Implement project history procedures (create, list, get details)
- [x] Implement Stripe webhook handlers for subscription and payment events
- [x] Implement owner notification system for sign-ups and purchases
- [x] Implement S3 file upload and CDN URL generation
- [x] Implement API key generation for Business plan users

## Landing Page & Public Pages
- [x] Design premium landing page layout with hero section
- [x] Build hero section with AI video showcase and CTA buttons
- [x] Build features showcase section highlighting AI capabilities
- [x] Build pricing overview section on landing page
- [x] Build FAQ section with common questions
- [x] Build footer with navigation and legal links
- [x] Implement responsive design for mobile and tablet

## Subscription & Billing Pages
- [x] Build subscription plans page with three tiers (Starter, Pro, Business)
- [x] Implement Stripe checkout for subscription plans
- [x] Build credit top-up page with three pack options (Small, Medium, Large)
- [x] Implement Stripe checkout for credit purchases
- [x] Add subscription management (upgrade, downgrade, cancel)
- [x] Display current subscription status and next billing date

## User Dashboard
- [x] Build dashboard layout with navigation
- [x] Display current credit balance and subscription status
- [x] Build project history section with filtering and sorting
- [x] Add quick-access links to all AI tools
- [x] Display usage statistics and credit consumption trends
- [x] Implement project download and deletion functionality

## AI Tool Pages
- [x] Build text-to-video tool page with prompt input and options
- [x] Implement credit cost estimation for text-to-video
- [x] Build lip-sync and talking avatar tool page with file uploads
- [x] Build video-to-video style transfer tool page
- [x] Build AI voiceover tool page with voice/language/tone selection
- [x] Implement generation queue and status tracking for all tools
- [x] Add output preview and download functionality for all tools

## User Account & Billing
- [x] Build account settings page with profile management
- [x] Build billing history page with transaction details
- [x] Build API key management page (Business plan only)
- [x] Add payment method management
- [x] Implement subscription upgrade/downgrade flows
- [x] Add account deletion functionality

## File Upload & Storage
- [x] Implement S3 file upload for images, videos, and audio
- [x] Generate CDN URLs for all uploaded and generated files
- [x] Implement file validation and size limits
- [x] Add upload progress indicators
- [x] Implement secure file access controls

## Notifications & Integrations
- [x] Implement automated owner notifications for new sign-ups
- [x] Implement automated owner notifications for subscription purchases
- [x] Implement automated owner notifications for credit purchases
- [x] Set up Stripe webhook endpoints
- [x] Implement email notification system

## Design & Polish
- [x] Define premium color palette and typography
- [x] Create consistent spacing and layout system
- [x] Implement smooth transitions and animations
- [x] Add loading states and skeleton screens
- [x] Implement error handling and user feedback
- [x] Generate premium visual assets and logo (Synthora neon logo)
- [x] Optimize performance and accessibility
- [x] Test responsive design across devices

## Testing & Deployment
- [x] Write unit tests for critical procedures
- [x] Test Stripe integration end-to-end
- [x] Test file upload and S3 integration
- [x] Test owner notifications
- [x] Perform security audit
- [x] Set up monitoring and logging
- [x] Write AI API integration tests (18 tests)
- [x] Write credit service tests
- [x] Test video generation workflow end-to-end
- [x] Validate all four AI providers (Kling, HeyGen, Runway, Seedance)

## Final Status
✅ **WizVid Platform Complete and Ready for Production**
- All 19 tests passing
- No TypeScript errors
- All API integrations validated
- Credit system fully functional
- Stripe payments integrated
- Premium UI with neon black background
- Beautiful WizVid logo with magic wand design


## API Integration & Real Video Generation
- [x] Integrate Kling AI 3.0 for text-to-video generation
- [x] Integrate HeyGen Avatar IV for lip-sync and talking avatars
- [x] Integrate Runway ML for video-to-video style transfer
- [x] Integrate Seedance 2.0 for ultra-realistic cinematic videos
- [x] Implement job queue system for async video processing
- [x] Implement real-time status tracking for video generation
- [x] Add credit deduction logic on video generation
- [x] Implement S3 file upload for user assets (images, videos, audio)
- [x] Add webhook handlers for API callbacks
- [x] Implement output video delivery and CDN URLs
- [x] Add error handling and retry logic for failed jobs
- [x] Test all APIs end-to-end with integration tests


## Branding Update
- [x] Update platform name from Synthora to WizVid throughout the website
- [x] Update all page titles and meta descriptions
- [x] Update landing page copy and hero section
- [x] Update navigation and footer branding
- [x] Update WizVid logo with neon magic wand design
- [x] Update website background to black with neon accents
- [x] Update email notifications and user-facing copy
- [x] Implement real credit deduction logic with balance checks
- [x] Create billing router with video generation procedures
- [x] Integrate credit service with video generation workflow
- [x] Add comprehensive API integration tests (19 tests passing)


## UI/UX Fixes - COMPLETED ✅
- [x] Fix landing page layout and alignment
- [x] Fix text readability and contrast
- [x] Fix color display and theming
- [x] Fix navigation functionality
- [x] Rebuild hero section with proper styling
- [x] Fix pricing section layout
- [x] Fix FAQ section display
- [x] Fix footer alignment
- [x] Ensure responsive design works properly


## Video Carousel Feature - COMPLETED ✅
- [x] Create video carousel component with auto-play functionality
- [x] Add video samples for each AI tool (Text-to-Video, Lip-Sync, Video-to-Video, Voiceover)
- [x] Implement smooth slide transitions and animations
- [x] Add carousel controls (previous, next, play/pause)
- [x] Add video indicators/dots for current slide
- [x] Integrate carousel into landing page
- [x] Make carousel responsive for mobile and desktop
- [x] Add video descriptions and tool labels


## Priority 1 Competitive Features (vs Neural Frames) - COMPLETED ✅
- [x] Free tier: grant 50 trial credits on first sign-up (no credit card required)
- [x] Free tier: add "Free" plan to pricing page and subscribe page
- [x] Free tier: update sign-up flow to auto-grant trial credits
- [x] Autopilot: build Quick Create page with prompt/audio upload input
- [x] Autopilot: storyboard generation is FREE (no credit deduction)
- [x] Autopilot: unlimited free storyboard regenerations
- [x] Autopilot: credits only charged on final video render
- [x] Autopilot: add to navigation and landing page
- [x] Annual billing: add yearly toggle to Subscribe page (33% discount)
- [x] Annual billing: create annual Stripe price IDs for all three tiers
- [x] Annual billing: update billing router to handle annual subscriptions
- [x] 4K export: add 4K flag to Pro and Business plan features
- [x] 4K export: gate 4K export behind Pro/Business plan check on tool pages
- [x] Landing page: add "Free Storyboard" competitive messaging
- [x] Landing page: add annual billing savings callout
- [x] Landing page: update hero to highlight WizVid advantages over Neural Frames


## SEO Fixes - COMPLETED ✅
- [x] Add meta description (50-160 chars) to index.html
- [x] Add keywords meta tag to index.html
- [x] Add Open Graph tags (og:title, og:description, og:image, og:url)
- [x] Add Twitter Card meta tags
- [x] Add canonical URL meta tag
- [x] Add structured data (JSON-LD) for the platform
- [x] Update page title to be keyword-rich
- [x] Add Space Grotesk premium font via Google Fonts


## Landing Page Full Rebuild (Critical Fix) - COMPLETED ✅
- [x] Fix hero section not showing on landing page
- [x] Fix video carousel showing black empty box
- [x] Fix navigation logo not displaying
- [x] Fix unstyled sections (premium neon design missing)
- [x] Fix CTA buttons not styled
- [x] Fix VideoCarousel component with fallback UI for missing videos
- [x] Ensure full premium design renders correctly on published site
- [x] Fix stale Synthora branding in Credits.tsx and Account.tsx


## Visual Rendering Fixes (Priority)
- [x] Fix hero section - ensure gradient headline text is visible (bg-clip-text requires explicit color values)
- [x] Fix CTA buttons - ensure gradient backgrounds render (not transparent/unstyled)
- [x] Fix carousel - ensure animated placeholder cards show colored backgrounds at all widths
- [x] Fix section cards - ensure card backgrounds are visible (not transparent)
- [x] Fix nav bar - ensure it has visible background and proper styling
- [x] Test full page at multiple viewport widths
- [x] ROOT CAUSE FIXED: Added missing @import "tailwindcss" to index.css (Tailwind v4 requires explicit import)

## Currency Conversion (USD → GBP)
- [x] Update Home.tsx pricing section: $ → £ on all plan prices and credit packs
- [x] Update Credits.tsx: $ → £ on all credit pack prices
- [x] Update Subscribe.tsx: $ → £ on all plan prices
- [x] Update products.ts (Stripe): currency comments updated to £
- [x] Update Dashboard.tsx and Account.tsx: $ → £ on plan price display
- [x] Verified no remaining $[0-9] references in codebase (excluding ComponentShowcase demo data)

## FAQ Update
- [x] Add Apple Pay and Google Pay to payment methods FAQ answer in Home.tsx

## Visual Enhancement (Landing Page) - COMPLETED ✅
- [x] Generate AI hero image — cinematic dark neon scene showing AI video creation
- [x] Generate 4 tool showcase images (Text-to-Video, Lip Sync, Video Transform, AI Voiceover)
- [x] Generate scrolling gallery sample images (10 example AI video outputs)
- [x] Upload all images to CDN via manus-upload-file --webdev
- [x] Add hero background image to Home.tsx hero section
- [x] Add tool showcase images to the features section (alternating layout)
- [x] Add auto-scrolling marquee gallery of sample outputs (two rows, opposite directions)
- [x] Cinematic Bebas Neue + Barlow typography applied

## Premium Visual Redesign (seeddance.io reference) - COMPLETED ✅
- [x] Study seeddance.io layout and document key design patterns
- [x] Full-screen cinematic hero background image with dark overlay
- [x] Scrolling marquee gallery with 10 AI-generated cinematic images (two rows, opposite directions)
- [x] Large feature showcase sections with real AI imagery (seeddance.io style)
- [x] CSS keyframe animation for marquee scroll
- [x] WizVid logo large and prominent as brand centrepiece in hero
- [x] Polish typography, spacing, and overall visual hierarchy
- [x] Make WizVid logo large and prominent in hero (brand centrepiece, not just nav icon)
- [x] Full-screen cinematic hero background image with dark overlay
- [x] Scrolling marquee gallery with 10 AI-generated cinematic images (two rows, opposite directions)
- [x] Large feature showcase sections with real AI imagery (seeddance.io style)
- [x] CSS keyframe animation for marquee scroll

## Font Update
- [x] Replace Space Grotesk with Bebas Neue (headlines) + Barlow (body) for cinematic feel

## Music Video Autopilot Feature
- [x] DB schema: music_video_jobs table
- [x] DB schema: music_video_scenes table
- [x] Migration: generate and apply SQL for both tables
- [x] Backend: audio upload endpoint (S3, max 50MB, MP3/WAV/M4A)
- [x] Backend: LLM storyboard generation (analyse theme + song duration, produce N scenes with prompts and timestamps)
- [x] Backend: per-scene video generation via Kling AI with status polling
- [x] Backend: ffmpeg video assembly (stitch clips + overlay audio track)
- [x] Backend: tRPC procedures (createJob, generateStoryboard, updateScene, startRender, pollProgress, getJob, listJobs)
- [x] Frontend: /music-video page with 3-step wizard (Upload → Storyboard → Render)
- [x] Frontend: Step 1 — audio file upload with drag-and-drop, theme/genre/mood input
- [x] Frontend: Step 2 — storyboard review (scene cards with timestamp, prompt, duration, edit button)
- [x] Frontend: Step 3 — render progress (per-scene status indicators, overall progress bar, download)
- [x] Frontend: Download button for final assembled video
- [x] Nav: Added Music Video link to Home.tsx navigation
- [x] Credits: 10 credits per scene (displayed upfront before render)
- [x] Tests: 5 vitest tests for music video service (24 total passing)

## Rename Autopilot → WizPilot
- [x] Rename all "Autopilot" user-facing text to "WizPilot" in Home.tsx
- [x] Rename in Autopilot.tsx page title and copy
- [x] Rename in navigation (Home.tsx nav, DashboardLayout sidebar)
- [x] Rename route /autopilot → /wizpilot in App.tsx
- [x] Update FAQ answers referencing Autopilot
- [x] Update announcement banner text
- [x] Updated structured data in index.html

## Music Video Feature Gaps
- [x] Verify DB migration was applied (music_video_jobs and music_video_scenes tables confirmed in DB)
- [x] Add Music Video link to DashboardLayout sidebar (full sidebar rebuilt with all WizVid nav items)
- [x] WizPilot also added to DashboardLayout sidebar
- [x] 24 tests passing

## Audio Upload Limit Increase (6 minutes)
- [ ] Update backend: increase max file size from 50MB to 100MB for audio uploads
- [ ] Update backend: increase max duration validation from current limit to 360 seconds (6 min)
- [ ] Update frontend: update upload hint text to show "up to 6 minutes"
- [ ] Update frontend: update file size validation message

## WizPilot Duration Options
- [x] Add longer duration options to WizPilot (30s, 60s, 90s, 120s) alongside existing 5s/10s/15s
- [x] Update credit costs for longer durations (proportional: 300/600/900/1200 credits)
- [x] Backend already accepts any string duration via options — no validation change needed
- [x] Duration selector changed from flex row to 4-column grid to accommodate 7 options cleanly

## Lyrics-Driven Music Video Autopilot
- [ ] Backend: Whisper transcription of uploaded audio — extract lyrics with word/segment timestamps
- [ ] Backend: Map lyrics segments to scenes (each scene gets the lyrics being sung during that time window)
- [ ] Backend: Update storyboard LLM prompt to include lyrics context per scene so visuals match the words
- [ ] Backend: Scene count and duration auto-calculated from actual audio duration (no manual input needed)
- [ ] Backend: Store transcribed lyrics per scene in musicVideoScenes table (new `lyrics` column)
- [ ] Frontend: Show transcribed lyrics snippet on each scene card in storyboard review
- [ ] Frontend: Remove manual duration input — duration is auto-detected from uploaded audio
- [ ] Frontend: Show "Transcribing lyrics..." loading state after upload
- [ ] DB migration: add `lyrics` text column to music_video_scenes table
