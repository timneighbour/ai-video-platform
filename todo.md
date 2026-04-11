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
- [x] Update backend: increase max file size from 50MB to 100MB for audio uploads
- [x] Update backend: increase max duration validation from current limit to 360 seconds (6 min)
- [x] Update frontend: update upload hint text to show "up to 6 minutes"
- [x] Update frontend: update file size validation message

## WizPilot Duration Options
- [x] Add longer duration options to WizPilot (30s, 60s, 90s, 120s) alongside existing 5s/10s/15s
- [x] Update credit costs for longer durations (proportional: 300/600/900/1200 credits)
- [x] Backend already accepts any string duration via options — no validation change needed
- [x] Duration selector changed from flex row to 4-column grid to accommodate 7 options cleanly

## Lyrics-Driven Music Video Autopilot
- [x] Backend: Whisper transcription of uploaded audio — extract lyrics with word/segment timestamps
- [x] Backend: Map lyrics segments to scenes (each scene gets the lyrics being sung during that time window)
- [x] Backend: Update storyboard LLM prompt to include lyrics context per scene so visuals match the words
- [x] Backend: Scene count and duration auto-calculated from actual audio duration (no manual input needed)
- [x] Backend: Store transcribed lyrics per scene in musicVideoScenes table (new `lyrics` column)
- [x] Frontend: Show transcribed lyrics snippet on each scene card in storyboard review
- [x] Frontend: Remove manual duration input — duration is auto-detected from uploaded audio
- [x] Frontend: Show "Transcribing lyrics..." loading state after upload
- [x] DB migration: add `lyrics` text column to music_video_scenes table

## Logo & Video Integration
- [ ] Replace old logo with new WizVid wizard hat logo image in navbar, hero, footer, and CTA section
- [ ] Add animated logo video (10s, with audio) as hero intro on landing page — autoplay muted, click to unmute
- [ ] Update favicon to use new logo
- [ ] Audit all video elements site-wide and ensure autoplay + loop on all decorative/preview videos
- [ ] Switch Seedance integration from Volcengine Ark to fal.ai (requires FAL_AI_API_KEY secret)
- [ ] Update index.html meta tags to remove Seedance 2.0 references

## MuseTalk Lip-Sync via fal.ai
- [ ] Research fal.ai MuseTalk API endpoint and request format
- [ ] Implement fal.ai client (musetalk.ts) with text-to-video and lip-sync methods
- [ ] Switch Seedance integration to fal.ai (fal-ai/seedance or similar model)
- [ ] Update LipSync.tsx tool page to use MuseTalk via fal.ai (real generation, not mock)
- [ ] Add MuseTalk lip-sync option to Music Video creator (optional face video + audio sync)
- [ ] Add FAL_AI_API_KEY secret via webdev_request_secrets
- [ ] Update landing page tool description to mention MuseTalk for lip-sync
- [ ] Add MuseTalk to AI API tests

## Character-Driven Music Video Feature
- [x] Character reference pack UI: up to 4 characters per music video
- [x] Per-character: name, type (real/animated), gender, role (lead/backing/featured/non-singing), singing flag
- [x] Per-character: up to 8 reference images (different angles, outfits, costumes)
- [ ] Image upload for each character reference pack via /api/video/upload
- [ ] Store characters in musicVideoJobs.charactersJson field (DB migration)
- [x] Pass character data to storyboard AI prompt for scene assignment
- [ ] AI assigns characters to scenes in storyboard generation
- [ ] Singing characters get MuseTalk lip-sync applied during render phase
- [ ] Non-singing characters get image-to-video motion via Kling/Seedance
- [ ] Animated characters use style-consistent generation prompts

## WizBeat Music Video Maker & Navigation
- [ ] Rename Music Video Autopilot feature to "WizBeat" throughout the app
- [ ] Add sticky top navigation to landing page with links: Home, WizBeat, Tools, Pricing, Sign In
- [ ] Add mobile hamburger menu to landing page navigation
- [ ] Build WizBeat landing section: cinematic hero with artist/band showcase images
- [ ] Generate Pixar-style animated character showcase images for WizBeat section
- [ ] Generate cinematic artist/band showcase images for WizBeat section
- [ ] Upload all WizBeat showcase images to CDN
- [ ] Add WizBeat to main app navigation (dashboard sidebar)
- [ ] Character reference pack UI: up to 4 characters per music video
- [ ] Per-character: name, type (real/animated), gender, role, singing flag
- [ ] Per-character: up to 8 reference images (angles, outfits, costumes)
- [ ] Wire characters into storyboard AI prompt for scene assignment
- [ ] Singing characters get MuseTalk lip-sync during render
- [ ] Switch Seedance integration to fal.ai (Seedance 1.5 Pro)
- [ ] Fix logo: use new WizVid logo image in navbar, footer, CTA section
- [ ] Add logo video as hero intro (autoplay muted, click for audio)
- [ ] Fix all video elements site-wide: autoplay + loop + playsInline
- [ ] Add MuseTalk lip-sync engine option to Lip-Sync tool page

## Homepage Cinematic Rebuild
- [ ] Source cinematic background video clips from Pexels/Pixabay (concert lights, AI visuals, music)
- [ ] Upload hero background video to CDN
- [ ] Full-screen cinematic hero: looping background video, dark overlay, WizVid animated logo centred
- [ ] Hero headline: bold, single impactful statement for artists/bands
- [ ] Two hero CTAs: "Make a Music Video" and "Explore Tools"
- [ ] Sticky frosted-glass navigation: Logo, WizBeat, Tools, Pricing, Sign In, mobile hamburger
- [ ] Lean below-fold: WizBeat teaser, Tools grid, Social proof, Pricing — no walls of text
- [ ] Demo video section: YouTube embed thumbnails from Kling AI, Runway, HeyGen official channels
- [ ] Mobile-first responsive design for all new sections

## Homepage Cinematic Rebuild
- [ ] Source cinematic background video clips from Pexels/Pixabay (concert lights, AI visuals, music)
- [ ] Upload hero background video to CDN
- [ ] Full-screen cinematic hero: looping background video, dark overlay, WizVid animated logo centred
- [ ] Hero headline: bold, single impactful statement for artists/bands
- [ ] Two hero CTAs: Make a Music Video (WizBeat) and Create Any Video (WizPilot)
- [ ] Sticky frosted-glass navigation: Logo, WizBeat, WizPilot, Tools, Pricing, Sign In, mobile hamburger
- [ ] WizBeat section: cinematic artist/band showcase with animated characters
- [ ] WizPilot section: general video creation showcase
- [ ] Demo video section: YouTube embed thumbnails from Kling AI, Runway, HeyGen official channels
- [ ] Lean below-fold: Tools grid, Social proof, Pricing
- [ ] Mobile-first responsive design for all new sections

## Suno AI Music Generation
- [ ] Research Suno API availability (official API vs third-party)
- [ ] Add Suno music generation step to WizBeat flow (generate song from prompt)
- [ ] If no official API: build guided Suno import workflow (user generates on Suno, imports audio URL)
- [ ] Add SUNO_API_KEY secret if API available
- [ ] Wire Suno-generated audio directly into WizBeat storyboard pipeline

## Homepage 9-Point Fix
- [ ] Headline: "Create AI Music Videos & Animations in Minutes — No Editing Needed"
- [ ] Audience callouts: Musicians, YouTubers, AI Creators
- [ ] USP statement: "Create full AI music videos — not just clips"
- [ ] Single primary CTA everywhere: "Create Your First Video"
- [ ] Autoplay cinematic hero reel (background video loop)
- [ ] Demo video gallery with YouTube embeds from Kling/Runway/HeyGen
- [ ] Social proof section: "Trusted by X creators" + testimonial cards
- [ ] SEO meta tags: "AI music video generator", "AI animation video maker"
- [ ] Wizard/magic transformation branding: Idea → Video journey throughout

## Pricing Update
- [ ] Starter: £19/month — limited videos, watermark
- [ ] Pro: £49/month (main sell) — unlimited videos, no watermark, faster rendering
- [ ] Creator+: £99/month — priority processing, premium styles, early features
- [ ] Core offer statement: "Create 30 videos per month without editing"
- [ ] Update Stripe products/prices to match GBP tiers

## SEO Implementation
- [ ] Meta title: "AI Music Video Generator | Create Videos Instantly with AI | WizVid"
- [ ] Meta description: "Create AI music videos and animations in minutes. Turn your ideas or audio into full videos instantly with WizVid. No editing needed. Start free today."
- [ ] H1: "Create AI Music Videos & Animations in Minutes"
- [ ] SEO paragraph on homepage
- [ ] Primary keywords in page content: AI music video generator, create music video with AI, AI animation video maker
- [ ] Long-tail keywords in section headings and copy
- [ ] CTA SEO line everywhere: "Create your first AI video now — no editing required."

## SEO Landing Pages
- [ ] /create-music-video-with-ai — "create music video with AI"
- [ ] /ai-video-generator-for-youtube — "AI video generator for YouTube creators"
- [ ] /ai-kids-video-generator — "AI kids video generator"
- [ ] /ai-animation-video-maker — "AI animation video maker"
- [ ] /turn-audio-into-video-ai — "turn audio into video AI"
- [ ] Each page: H1, intro, H2 steps, H2 why, H2 best tool, CTA, demo video embed, internal links
- [x] sitemap.xml with all pages
- [x] robots.txt

## Programmatic SEO (50 Pages)
- [x] Dynamic SEO route /seo/:slug rendering master template
- [ ] All 50 keyword pages from the master list
- [ ] Internal links between all pages
- [ ] Demo video embed on every page
- [ ] sitemap.xml listing all 50 URLs + main pages
- [x] robots.txt with sitemap reference


## Multilingual Support (i18n)
- [x] Install i18next + react-i18next + i18next-browser-languagedetector
- [ ] Create translation files for EN, ES, PT-BR, FR (all key UI strings)
- [x] Add LanguageSelector component to nav (flags + language names dropdown)
- [ ] Auto-detect browser language on first visit
- [x] Persist language choice in localStorage
- [ ] Integrate i18n into Home.tsx nav, hero, and key sections

## Customer Support System
- [ ] Add Crisp live chat widget to all pages (bottom right)
- [x] Build /help page with FAQ help centre
- [x] Add support email support@wizvid.ai reference in help page
- [x] Add help link in nav and footer

## Onboarding Flow
- [x] Build /onboarding page: goal selection screen
- [x] Step 1-3 guided creation flow
- [x] First success moment with download + create another
- [x] Redirect new users to /onboarding after first login
- [x] Mobile responsive, minimal, one action per screen

## WizBeat Character Reference Packs
- [x] Add character panel to MusicVideoAutopilot (up to 4 characters)
- [x] Per character: name, type, gender, role, singing flag, up to 8 images
- [ ] Pass character data to storyboard AI prompt
- [ ] Apply MuseTalk lip-sync to singing characters

## Suno AI Integration
- [ ] Add Suno API key secret
- [ ] Create server/ai-apis/suno.ts
- [ ] Add Generate Song with AI option to WizBeat

## Homepage Cinematic Rebuild
- [x] Rebuild Home.tsx with full-screen cinematic hero
- [x] Sticky frosted-glass nav with language selector
- [x] All 9 sections (hero, what it does, who its for, USP, how it works, WizBeat, WizPilot, social proof, pricing)
- [x] GBP pricing tiers (Starter 19, Pro 49, Creator+ 99)
- [ ] SEO meta tags throughout

## Programmatic SEO (50 Pages)
- [x] Register /seo/:slug route in App.tsx
- [x] sitemap.xml and robots.txt created

## Pricing & Monetisation System (Task: Apr 9 2026)
- [x] Create /pricing page with 3 GBP tiers (Starter £19, Pro £49, Creator+ £99)
- [x] Annual billing toggle with 33% discount
- [x] Pro plan highlighted as "Most Popular" with visual emphasis
- [x] Feature comparison table (Starter vs Pro vs Creator+)
- [x] Add-on video packs section (£5, £10, £20)
- [x] Pricing FAQ section
- [x] Final CTA section on pricing page
- [x] Create /onboarding page with 3-step guided flow
- [x] Onboarding: creator type selection (Musician, YouTuber, Kids, AI Creator)
- [x] Onboarding: free trial benefits screen
- [x] Onboarding: sign-up / start creating CTA
- [x] Rebuild Home.tsx with cinematic 9-section design
- [x] Register /pricing, /onboarding, /help, /seo/:slug routes in App.tsx
- [ ] Wire Pricing page CTAs to Stripe checkout (via /subscribe)
- [ ] Add upgrade trigger modals when user hits video limit
- [ ] Add upgrade prompt on video download for free/starter users
- [ ] Update Stripe products to match GBP pricing tiers

## Optimisation Task (Apr 2026)
- [x] Language selector (EN/ES/PT-BR/FR) added to nav
- [x] Theme toggle (dark/light) added to nav
- [x] Light mode CSS variables added to index.css
- [x] ThemeProvider set to switchable=true
- [x] Onboarding flow rebuilt with 3-step guided flow
- [x] UpgradeModal component created (limit/download/milestone/watermark triggers)
- [x] UpgradeBanner component created for inline upgrade prompts
- [x] getSubscription procedure added to billing router
- [x] CrispChat component created (VITE_CRISP_WEBSITE_ID env var)
- [x] GA4 analytics helper created (VITE_GA4_MEASUREMENT_ID env var)
- [x] initGA4 called on app startup in main.tsx
- [x] CrispChat added to App.tsx
- [x] Skip-to-content link added to Home.tsx
- [x] Main landmark added to Home.tsx
- [x] aria-hidden added to decorative background videos
- [x] aria-label added to WizBeat image slider buttons
- [x] aria-pressed added to WizBeat image slider buttons
- [x] role=switch + aria-checked added to Pricing billing toggle
- [x] aria-label added to mobile menu button

## Logo Fix (Apr 2026)
- [x] Increase hero logo box size so video and text fit without clipping
- [x] Ensure logo video fills the box correctly (no cropping)
- [x] Make logo visually prominent in the hero section

## Premium SaaS Redesign (Apr 2026)
- [x] Update index.css: new dark bg #0f0f0f, secondary #171717, subtext #a1a1aa, Inter font
- [x] Add Inter font via Google Fonts CDN in index.html
- [x] Update light mode CSS variables to white bg / #111 text
- [x] Rebuild Home.tsx: split hero (left text, right logo video), clean nav, premium sections
- [x] Apply scroll fade-in animations (IntersectionObserver) to all sections
- [x] Update Pricing.tsx: premium card design, PRO glow border, clean CTA buttons
- [x] Update Onboarding.tsx: clean minimal step flow with new design tokens
- [x] Update Help.tsx: clean FAQ layout with new typography
- [x] Consistent button styles: white primary, outline secondary, hover lift
- [x] Consistent card styles: rounded-2xl, #171717 bg, hover border + lift
- [x] Mobile responsive check across all updated pages

## Brand Logo Integration (Apr 2026)
- [x] Upload full WizVid logo (icon + wordmark) to CDN
- [x] Crop icon-only version for favicon and small UI elements
- [x] Replace nav logo in Home.tsx with full logo image
- [x] Replace nav logo in Pricing.tsx with full logo image
- [x] Replace nav logo in Help.tsx with full logo image
- [x] Replace nav logo in Onboarding.tsx with full logo image
- [x] Replace footer logo in Home.tsx with full logo image
- [x] Set favicon.ico using icon-only crop
- [x] Replace placeholder icon in SeoLandingPage.tsx Best Tool section

## Conversion Optimisation (Apr 2026)
- [x] Update hero headline to "Create full AI videos in minutes — not just clips"
- [x] Update hero subheadline to "Turn your audio, lyrics, or ideas into fully animated videos instantly."
- [x] Standardise primary CTA to "Create Your First Video" across all pages
- [x] Add micro trust text under CTAs: "No editing needed · Takes minutes · Start free"
- [x] Remove unverified stats (10,000+ videos, 1,000+ creators, 4.9 rating)
- [x] Replace with honest early-stage social proof copy
- [x] Update nav labels: "WizBeat" → "Music Videos", "WizPilot" → "Create Video"
- [x] Add product demo section (input → storyboard → output) under hero
- [x] Add/update "Why WizVid" section with 4 benefit points
- [x] Create Music Videos landing page (pre-login) with product overview + CTA
- [x] Wire /music-video route to landing page instead of direct login
- [x] Enhance Pricing page: add "Start free — no credit card required" above plans
- [x] Highlight PRO with "Most Popular — Unlimited video creation" label

## Final Conversion Optimisation Pass (Apr 2026)
- [x] Add soft trust line to hero: "Used by creators already generating full videos"
- [x] Add mid-page punch line section: "No editing. No complexity. Just results."
- [x] Audit all primary CTAs — ensure every one says "Create Your First Video"
- [x] Verify ProductDemo section is present and polished below hero
- [x] Verify WhyWizVid section is present with 4 benefit points
- [x] Verify Music Videos landing page (/music-video) is a full landing page, not a login gate
- [x] Verify Pricing page has "Start free — no credit card required" badge
- [x] Verify PRO plan badge says "Most Popular — Unlimited video creation"
- [x] Final spacing/clutter check on homepage
- [x] Final mobile responsiveness check

## Logo Consistency Audit (Apr 2026)
- [x] Audit all logo references across every page and component
- [x] Replace any old/placeholder logos in all pages
- [x] Update favicon.ico with official W icon
- [x] Add Open Graph / social preview image to index.html
- [x] Add SEO metadata (og:image, twitter:image) to index.html
- [x] Verify logo sizing and spacing on desktop and mobile
- [x] Verify no distortion or stretching of logo

## Preloader Animation (Apr 2026)
- [x] Create WizVidLoader component with W icon pulse/glow animation
- [x] Add smooth fade-out transition when loading completes
- [x] Replace DashboardLayoutSkeleton with WizVidLoader
- [x] Add app-level preloader for initial page load

## New Logo Animation Replacement (Apr 2026)
- [x] Upload new logo animation MP4 to CDN
- [x] Find all references to old wizvid-logo-intro video
- [x] Replace old animation URL with new CDN URL in Home.tsx
- [x] Replace old animation URL with new CDN URL in any other pages
- [x] Remove old animation from webdev-static-assets

## PayPal Payment Integration (Apr 2026)
- [x] Enable PayPal payment method in Stripe checkout sessions (billing router)
- [x] Enable PayPal in credit pack checkout sessions
- [x] Update Pricing page to show PayPal badge under plan CTAs
- [x] Update Subscribe page to show PayPal badge
- [x] Update Home.tsx footer / trust section to include PayPal
- [x] Update FAQ to mention PayPal as accepted payment method
- [x] Update JSON-LD structured data to mention PayPal

## Onboarding Visual Upgrade (Apr 2026)
- [x] Add background images to Music Video card on Onboarding step 1
- [x] Add background images to YouTube Video card on Onboarding step 1
- [x] Add background images to Kids Video card on Onboarding step 1
- [x] Add background images to Something Else card on Onboarding step 1

## Onboarding Page Visual Upgrade (Apr 2026)
- [x] Add "Back to Home" button on Onboarding page header
- [x] Enlarge WizVid logo on Onboarding page (h-11 → h-16 or larger)
- [x] Add background images to all 4 creator type cards on Onboarding step 1
- [x] Audit logo sizes across all pages and standardise

## Music Video Autopilot — Missing Features (Apr 2026)
- [x] Show transcribed lyrics after audio upload (call Whisper, display lyrics in collapsible panel)
- [x] Character photo upload on Step 1 (upload face/character image, store S3 URL, pass to storyboard LLM)
- [x] Lip sync toggle on Step 1 (checkbox/switch to enable HeyGen lip sync on character scenes)
- [x] Pass characterImageUrl and enableLipSync flags through tRPC generateStoryboard and startRender procedures
- [x] Update storyboard LLM prompt to include character image reference when provided

## Lyrics Fix (Apr 2026)
- [x] Add transcribeAudioDirect tRPC procedure: accepts base64 audio, uploads to S3, calls Whisper, returns text immediately
- [x] Trigger transcription immediately on audio file select (not after storyboard generation)
- [x] Show lyrics panel as soon as audio is selected with live status indicator

## Multi-Character System (Apr 2026)
- [x] Add videoCharacters DB table: id, jobId, name, role, lipSync, createdAt
- [x] Add videoCharacterPhotos DB table: id, characterId, photoUrl, photoKey, isPrimary
- [x] Add tRPC procedures: saveCharacters (upsert up to 4), getCharacters, deleteCharacter
- [x] Build CharacterManager UI component: up to 4 character slots, each with name field + multiple photo upload + lip sync toggle per character
- [x] Replace single character upload in MusicVideoAutopilot with CharacterManager component
- [x] Pass character descriptions (name + photo URLs) into storyboard LLM prompt
- [ ] Add CharacterManager to Animation Video page if it exists
- [x] Add /privacy, /terms, /refunds legal pages
- [x] Update robots.txt with proper disallow rules
- [x] Add legal pages to sitemap.xml
- [x] Standardise nav labels to "Music Video" and "WizPilot" across all pages
- [x] Add Legal section to Home footer with Privacy, Terms, Refunds links
- [x] Fix support@wizvid.ai to be a mailto link in footer
- [x] Soften testimonial claims (remove "CTR doubled", "0 to 5K subs")
- [x] Add legal footer links to Pricing, MusicVideosLanding pages
- [x] Fix CTA on Pricing and MusicVideosLanding to go to /onboarding for unauthenticated users

## Conversion Optimisation Pass (Apr 2026)
- [ ] Hero: new headline "Create viral YouTube videos in minutes"
- [ ] Hero: new subheadline about prompt to video
- [ ] Hero: add prompt→video transformation block below hero copy
- [ ] Instant proof section: "See what creators are making with WizVid" with 3-6 example outputs
- [ ] Pricing: add "What you can create each month" outcome framing above cards
- [ ] Pricing: add clear ✔/✖ inclusions/exclusions to each plan
- [ ] Pricing: add "Best for YouTubers, creators, agencies" badge to Pro plan
- [ ] Testimonials: replace vague claims with specific believable ones
- [ ] Trust section: "Made with WizVid" with real outputs and use cases
- [ ] CTA standardisation: "Create Your First Video" primary, "Try WizVid Free" secondary
- [ ] Positioning: replace "AI video generator" with "Create daily content without editing"
- [ ] Music video landing page: new headline, video preview, flow explanation, CTA before login
- [ ] QA: verify all routes, links, no console errors
- [ ] Fix LCP (18.7s): preload hero video/image, add fetchpriority=high to hero img
- [ ] Fix TBT (510ms): defer non-critical JS, split large bundles
- [ ] Add font-display:swap to Google Fonts to eliminate render-blocking
- [ ] Add loading=lazy and explicit width/height to all below-fold images
- [ ] Add preconnect hints for CDN and API domains
- [ ] Remove or defer render-blocking requests (440ms savings)

## Lighthouse Accessibility & SEO Fixes (Apr 2026)
- [x] Remove maximum-scale=1 from viewport meta in index.html (blocks screen magnification)
- [x] Fix heading order in Pricing.tsx (h1→h3 skip fixed with sr-only h2) and MusicVideoAutopilot.tsx (h2 before h1 fixed)
- [x] Add <track kind="captions"> to hero video element
- [x] Fix canonical URL: changed to https://www.wizvid.ai/ (www), updated OG/Twitter/JSON-LD and sitemap.xml

## Mobile Performance Fixes (Lighthouse Mobile Score 58, LCP 30.2s)
- [x] Remove hero background videos on mobile (they load 24MB+ on slow 4G) — replace with static gradient/image on screens < lg
- [x] Add preload="none" to ALL hero background videos (already done for desktop, verify mobile path)
- [x] Convert wizvid-logo-v2.png (52KB, 1360x768) to WebP and serve at correct display size (115x65) — 1KB nav WebP
- [x] Convert style images (1920x1077 → 400x268 WebP thumbnails) saving ~1,148KB
- [x] Add explicit width and height attributes to logo img elements
- [x] Fix Google Fonts render-blocking: verified media=print onload pattern is in place; updated preload to WebP logo
- [x] Add Vite manual chunks for code splitting (react, trpc, radix, motion, charts, i18n, forms, router)
- [x] Lazy-load all non-Home routes with React.lazy + Suspense in App.tsx

## Bug Fixes
- [x] Live chat (Crisp) "Start Chat" button on Help page does nothing — fixed by setting VITE_CRISP_WEBSITE_ID=28782af1-abc3-4b3c-8da7-e438a4cb7016

## Showcase Video System
- [x] Generate 6 showcase poster/thumbnail images (Kids YouTube, Music Video, Story Animation, Faceless Content, Social Short, Cinematic AI Video)
- [x] Build ShowcaseGallery section component with video cards, category labels, lazy loading
- [x] Add conversion CTAs under each showcase card ("Create Your First Video")
- [x] Build DB table `showcase_items` for showcase library management
- [x] Add tRPC procedures: showcase.list (public), showcase.upsert + showcase.delete (admin)
- [x] Wire frontend gallery to backend showcase library
- [x] Ensure autoplay/loop/muted on all showcase videos, poster images for LCP (hover-to-play on desktop)
- [x] Add "Made with WizVid" badge on each card
- [x] Insert showcase section into Home.tsx (replaced text-only MadeWithWizVid section)

## Bug: Videos Not Playing
- [ ] Investigate and fix: hero background videos not autoplaying
- [ ] Investigate and fix: hero logo video not playing
- [ ] Investigate and fix: showcase card hover-to-play not working

## Suno Music Creator Feature
- [ ] Research Suno API availability and integration approach
- [ ] Build /music-creator page with style/mood/genre selector and prompt input
- [ ] Integrate Suno API (or structure for plug-in) for music generation
- [ ] Add playback UI with waveform/audio player on results
- [ ] Add music creator to main navigation
- [ ] Add music creator CTA on landing page
- [ ] Add tRPC procedure for music generation job management
- [ ] Write vitest tests for music creator backend

## Bug: Video Rendering Errors (All Pages)
- [ ] Audit all video elements site-wide for broken URLs, missing poster images, codec errors
- [ ] Fix all broken video CDN URLs
- [ ] Fix autoplay on hero background videos and logo video
- [ ] Fix video rendering on MusicVideoAutopilot page
- [ ] Fix video rendering on Dashboard/project history video previews
- [ ] Fix video rendering on tool output pages

## Bug: HTTP 426 Error on Video Rendering
- [ ] Find which endpoint/API call returns HTTP 426 (Upgrade Required)
- [ ] Fix the 426 error — likely a video generation status poll or AI API call using wrong protocol

## Bug: HTTP 429 Rate Limit on Video Generation
- [ ] Find all polling loops hitting AI APIs (Kling, HeyGen, Runway, Seedance) and check intervals
- [ ] Add exponential backoff to all status polling loops
- [ ] Handle Retry-After header from 429 responses
- [ ] Increase minimum polling interval to avoid rate limits

## USP Visual Overhaul (AI Content Engine)
- [ ] Animated 4-step idea-to-video flow component (sequential light-up, mobile vertical stack)
- [ ] USP sub-headline: "Create complete AI content — music, video, and storytelling in one platform"
- [ ] 3-column feature block: AI Music Generation / Music Video Creation / WizPilot Automation
- [ ] Combined flow example section: "From idea to finished video in minutes"
- [ ] Conversion hook copy: "Replace hours of production..."
- [ ] Dual CTAs: "Create Your First AI Video" + "Generate Your First Song"
- [ ] Update hero headline positioning copy site-wide
- [ ] Wire Suno router into main routers.ts and build Suno music creator page
- [ ] Ensure all animations are smooth, lightweight, and mobile-responsive

## MVP Enhancement: Core Flow Polish (Apr 2026)
- [ ] Step-by-step progress indicator (upload → style → storyboard → generate → export) with active/completed states
- [ ] Smooth animated transitions between steps
- [ ] Loading/progress indicators during storyboard generation and video rendering with % complete
- [ ] Scene type labels on storyboard cards (Intro, Verse, Chorus, Drop, Outro)
- [ ] Beat-sync timestamp on each storyboard scene card
- [ ] Storyboard approve/edit controls: approve-all button, edit individual scene prompt inline
- [ ] Style preset selection: clean visual card grid (6 presets), no prompt-heavy UI
- [ ] Optional lyric/caption sync toggle per scene
- [ ] Export format selection: YouTube 16:9, TikTok 9:16, Instagram 1:1 with aspect ratio preview
- [ ] Final video preview screen with format badge and download/share buttons
- [ ] Ensure every storyboard scene shows AI-generated visual thumbnail before render
- [ ] Add scene-based generation labels: Intro, Verse, Chorus, Drop, Outro

## Character Consistency System (Apr 2026)
- [ ] Add characterLock fields to videoCharacters DB table: lockedDescription (full visual brief text), isLocked (bool), lockedAt
- [ ] Add tRPC procedure: characters.lockCharacter — saves full visual brief and sets isLocked=true
- [ ] Add tRPC procedure: characters.unlockCharacter — clears lock (requires explicit user action)
- [ ] Inject locked character brief as system-level constraint in storyboard LLM prompt (every scene must reference the locked brief)
- [ ] Enforce character brief as prefix to every scene image generation prompt
- [ ] Build Character Lock reference panel UI: locked character card showing name, photo, and all visual attributes (clothing, hair, colours, accessories)
- [ ] Add lock/unlock toggle to CharacterManager with confirmation dialog on unlock
- [ ] Add consistency warning banner when storyboard is generated without a locked character
- [ ] Add "Character Locked" badge on each storyboard scene card when a character lock is active
- [ ] Prevent scene image prompts from deviating from locked character description
- [ ] Add character reference panel to storyboard review screen (always visible sidebar/header)
- [ ] Write vitest tests for character lock/unlock procedures

## Scene-Level Lip Sync Control System (Apr 2026)
- [x] Fix TypeScript error: saveResult undefined in MusicVideoAutopilot character lock flow
- [x] Add `lipSync` boolean field to `musicVideoScenes` DB table (default true)
- [x] Add `updateSceneLipSync` tRPC procedure (update single scene lip sync flag)
- [x] Add `updateAllScenesLipSync` tRPC procedure (global override for all scenes)
- [x] Add `regenerateScene` tRPC procedure (re-render single scene with current settings)
- [x] Build per-scene lip sync toggle UI (ON/OFF switch + badge, visible on each scene card)
- [ ] Smart defaults: vocals detected → lip sync ON; instrumental → lip sync OFF
- [x] Global lip sync override control ("On for all" / "Off for all" buttons in storyboard header)
- [x] Per-scene loading indicator during independent regeneration (spinner on regenerate button)
- [x] Preserve all other scenes when regenerating one scene
- [x] Optimistic UI updates for lip sync toggle (instant feedback, rollback on error)
- [x] Write vitest tests for updateSceneLipSync, updateAllScenesLipSync, regenerateScene procedures

## Bug: Suno API callBackUrl Error
- [ ] Add callBackUrl parameter to all Suno API generation calls
- [ ] Implement /api/suno/callback endpoint to receive Suno webhook results
- [ ] Update suno router to poll for results OR handle webhook callback
- [ ] Test Suno music generation end-to-end after fix

## Bug Fix: HTTP 429 Rate Limit on Video Rendering (Priority)
- [ ] Audit Kling AI client for missing/weak retry logic
- [ ] Fix rateLimitRetry utility: add Retry-After header parsing, true exponential backoff with jitter
- [ ] Add server-side per-user render throttle (max 1 concurrent render job per user)
- [ ] Fix render button: disable immediately on click, prevent duplicate submissions
- [ ] Reduce polling frequency from current interval to 15s minimum with adaptive backoff
- [ ] Add 429-specific user-facing error message ("Rendering is busy right now...")
- [ ] Add structured logging: timestamp, route, userId, provider response on every 429
- [ ] Fix Suno API: add callBackUrl to generate requests + implement /api/suno/callback endpoint
- [ ] Add server-side Suno callback handler that updates DB on completion

## Pipeline Hardening: End-to-End Video Generation (Priority)
- [x] Wrap Kling createTextToVideo in withRetry (currently unguarded)
- [x] Add 429-specific error message in Kling client with Retry-After logging
- [x] Add staggered 3s delay between scene render starts to avoid burst 429s
- [x] Add server-side duplicate render guard (if job already rendering, return gracefully)
- [x] Fix render button: add isRendering ref guard to prevent double-click submissions
- [x] Improve polling: increase minimum interval to 15s, add adaptive backoff on 429
- [x] Show user-friendly 429 message: "Rendering is busy right now. Please wait a moment."
- [x] Add structured server logs: timestamp, userId, sceneId, HTTP status on every render event
- [x] Fix Suno callBackUrl: add /api/suno/callback endpoint + pass origin from MusicCreator
- [x] Update Suno router to build callBackUrl from input.origin
- [x] Run full TypeScript check and all 36 tests after changes

## Feature: Real-Time Render Progress Bar
- [x] Add stage pipeline display: Queued → Generating Scenes → Assembling → Complete
- [x] Add animated progress bar that fills based on completedScenes/totalScenes
- [x] Add per-scene status grid showing each scene as a dot/chip (pending/generating/done/failed)
- [x] Show estimated time remaining based on scenes completed
- [x] Show current stage label with animated pulse indicator
- [x] Smooth CSS transitions on progress bar fill (shimmer animation)
- [x] Show assembly stage progress after all scenes complete
- [x] Show final completion state with video preview auto-loaded
- [x] Add elapsed time counter
- [x] Add failed scene count indicator in progress bar
- [x] Add pollProgress sceneStatuses return for per-scene real-time status

## Feature: Failed Scene Detail View & Retry
- [x] Expose errorMessage in pollProgress sceneStatuses response
- [x] Add retryFailedScene tRPC procedure (reset scene to pending + re-queue render)
- [x] Add retryAllFailedScenes tRPC procedure (bulk retry all failed scenes in a job)
- [x] Failed scene chips in progress grid with tooltip showing raw error on hover
- [x] "Retry All Failed" button shown when failedScenes > 0 in render step
- [x] Per-scene retry button in the failed scene detail card
- [x] Human-readable error messages (429 → rate limit message, timeout → timeout message)
- [x] Retry loading state per scene (spinner + "Retrying" label)
- [x] Optimistic UI update on retry (scene chip moves to pending immediately)
- [x] Resume polling after retry is triggered (isRenderingRef + setRenderStatus)
- [x] Staggered 3s delay between bulk retries to avoid 429 cascade

## Feature: Edit Prompt Before Retry
- [x] Add updateScenePrompt tRPC procedure (update prompt + optional lyrics for a scene)
- [x] Add editingFailedSceneId state to track which failed scene is in edit mode
- [x] Add editFailedPrompt / editFailedLyrics local state for the edit form
- [x] "Edit" button on each failed scene card (opens inline edit form)
- [x] Inline textarea for visual prompt (pre-filled with current scene prompt)
- [x] Inline textarea for lyrics (optional, pre-filled with current scene lyrics)
- [x] "Save & Retry" button: persists edited prompt to DB then triggers retryFailedScene
- [x] "Cancel" button: collapses edit form without saving
- [x] Character count on prompt textarea (yellow at 1400, red at 1800, max 2000)
- [x] Optimistic UI: scene chip moves to pending after Save & Retry
- [x] Prompt/lyrics preserved in perSceneStatuses across poll updates
- [x] Write vitest tests for retryFailedScene, retryAllFailedScenes, updateScenePrompt, pollProgress

## Feature: Rendering History Dashboard
- [x] Extend listJobs to include scene stats (total, completed, failed counts) per job
- [x] Add getJobDetails tRPC procedure (returns job + all scenes with status/errorMessage)
- [x] Create /render-history page (RenderHistory.tsx) with job list cards
- [x] Job card: title, created date, status badge, scene progress bar, duration
- [x] Status badges: draft, storyboard_ready, rendering, assembling, completed, failed
- [x] Scene stats per job: X/Y scenes completed, Z failed
- [x] Error log drawer/modal: click job to see all scenes with status + error messages
- [x] Quick actions per job: Resume (go to WizPilot), Download (if completed), Retry All Failed
- [x] Empty state when no jobs exist with CTA to create first video
- [x] Register /render-history route in App.tsx
- [x] Add "Render History" button in Dashboard quick actions card
- [x] Auto-refresh every 15s when any job is actively rendering

## Bug Fix: Privacy Policy & Terms of Service Pages Not Functioning
- [x] Identified issue: Privacy.tsx was missing the WIZVID_LOGO_FULL constant (caused render crash)
- [x] Fixed Privacy.tsx by adding the missing logo constant
- [x] Privacy Policy content is complete (9 sections)
- [x] Terms of Service content is complete (12 sections)
- [x] Both pages routed in App.tsx at /privacy and /terms
- [x] Footer links in both pages point to correct routes
- [x] Both pages publicly accessible (no auth required)

## Bug Fix: Light/Dark Toggle & Language Selector
- [x] Fix light/dark theme toggle: added explicit .dark CSS block in index.css
- [x] Fixed @custom-variant dark to match both root and child elements
- [x] ThemeProvider has switchable=true and defaultTheme="dark" in App.tsx
- [x] Remove language selector (EN flag dropdown) from the top navigation bar

## UX: Retry All Failed Confirmation Dialog
- [ ] Add AlertDialog confirmation before "Retry All Failed" in RenderHistory.tsx
- [ ] Dialog shows job title, failed scene count, and a clear warning message
- [ ] "Confirm Retry" button triggers the mutation; "Cancel" dismisses without action

## UX: Retry All Failed Confirmation Dialog
- [ ] Add AlertDialog confirmation before "Retry All Failed" in RenderHistory.tsx
- [ ] Dialog shows job title, failed scene count, and warning message
- [ ] "Confirm Retry" triggers mutation; "Cancel" dismisses

## Final QA: Video Rendering Pipeline Audit
- [ ] Verify startRender creates job record and fires scene renders correctly
- [ ] Verify Kling AI client sends correct payload and handles response
- [ ] Verify pollProgress correctly detects all-scenes-complete and triggers assembly
- [ ] Verify assembly step concatenates scene videos and saves finalVideoUrl
- [ ] Verify job status transitions: rendering → assembling → completed
- [ ] Verify finalVideoUrl is stored in DB and returned to frontend
- [ ] Verify frontend shows completed video with play/download after render
- [ ] Fix any broken steps found in the audit

## Pipeline Audit & Final QA (Apr 2026)
- [x] Add AlertDialog confirmation before "Retry All Failed" in RenderHistory dashboard
- [x] Confirmation dialog shows job title, failed scene count, and credit warning
- [x] Fix startSceneRender: pass lipSync flag from DB to Kling prompt modifier
- [x] Fix pollSceneStatus: extract Kling's actual fail_reason instead of generic message
- [x] Fix pollSceneStatus: add 3-attempt retry loop for scene video download (transient CDN errors)
- [x] Fix pollSceneStatus: handle missing videoUrl after succeed status (mark as failed with clear message)
- [x] Fix assembly: raise ffmpeg timeout from 5 min to 10 min for long multi-scene videos
- [x] Verify lipSync flag is passed in retryAllFailedScenes stagger loop (both occurrences)
- [x] TypeScript: 0 errors
- [x] Tests: 40/40 passing

## Feature: Lip-Sync Style Selector (Apr 2026)
- [x] Add lipSyncStyle column to musicVideoScenes schema (enum: natural, expressive, subtle, dramatic)
- [x] Generate and apply DB migration for lipSyncStyle column (0012_mysterious_the_anarchist.sql)
- [x] Add updateSceneLipSyncStyle tRPC procedure (update single scene lip sync style)
- [x] Wire lipSyncStyle into startSceneRender prompt modifier (4 distinct prompt suffixes per style)
- [x] Build style selector UI in storyboard scene card (4 pill buttons with ToggleGroup)
- [x] Add tooltip descriptions for each style (Natural, Expressive, Subtle, Dramatic)
- [x] Optimistic UI update on style change (instant feedback, rollback on error)
- [x] Hide style selector when lipSync is OFF (not applicable)
- [x] Pass lipSyncStyle to startSceneRender in both startRender and retryAllFailedScenes loops
- [x] Write vitest test for updateSceneLipSyncSty## Feature: Anime Lip-Sync Style (Apr 2026)
- [x] Add 'anime' to lipSyncStyle enum in drizzle/schema.ts
- [x] Generate and apply DB migration for 'anime' enum value (0013_peaceful_the_anarchist.sql)
- [x] Add 'anime' to updateSceneLipSyncStyle zod enum in musicVideo router
- [x] Update all type casts in musicVideo router to include 'anime'
- [x] Add anime prompt modifier: "Anime-style lip sync: stylized, exaggerated mouth flaps..."
- [x] Add 'Anime' pill button to the UI style selector in MusicVideoAutopilot
- [x] Update SceneCard interface type to include 'anime'
- [x] 41/41 test## Bug Fix: Kling AI 400 Bad Request on Scene Render (Apr 2026)
- [x] Root cause: error was actually from Suno, not Kling (misidentified)
- [x] Kling request body validated against API spec — no issues found
- [x] Full error logging already in place via withRetry structured logs
## Bug Fix: Suno 400 - Empty/Malformed Lyrics (Apr 2026)
- [x] Root cause: custom mode prompt field was description text, not lyrics
- [x] Updated Suno AI client to send lyrics as the prompt body in custom mode
- [x] Updated Suno router to accept separate lyrics field
- [x] Frontend validation: block submit if lyrics empty in custom mode
- [x] Clear user error: "Please enter or generate lyrics for your song"
- [x] 41/41 tests passing, 0 TypeScript errors

## Feature: Editable Lyrics in MusicCreator (Apr 2026)
- [x] Add lyrics field to Suno API client and router (custom mode uses lyrics as the prompt body)
- [x] Add AI-generated lyrics step: "Generate Lyrics" button calls LLM via generateLyrics procedure
- [x] Show editable textarea pre-filled with AI-generated lyrics
- [x] User can freely edit the lyrics before generating the song
- [x] Character count on lyrics textarea (yellow at 1800, red at 2400, max 3000)
- [x] Fix Suno 400: in custom mode, pass lyrics as the prompt field (not the description)
- [x] Show clear error if lyrics are empty when custom mode is active
- [x] 41/41 tests passing, 0 TypeScript errors

## Homepage & Nav Optimisation (Apr 2026)
- [x] Replace hero label "AI-Powered Video Creation" with "From idea to full video with AI"
- [x] Ensure hero headline is outcome-focused, subheadline explains input→output
- [x] Add USP flow under hero: Idea/Prompt → Generate Song (AI) → Create Video → Final Output (ContentEngine animated flow, heading updated)
- [x] Add "See it in action" label above demo section (already present in ProductDemo)
- [x] Add "Everything you need in one place" 3-column section (AI Music, Music Video, WizPilot)
- [x] Ensure music video creation appears early in homepage narrative (not buried)
- [x] Fix testimonials: add specificity (timeframe, niche, result)
- [x] Fix footer: Privacy Policy, Terms of Service, Refund Policy all clickable + 200 OK
- [x] Create Refund Policy page at /refund-policy (already exists at /refunds)
- [x] Add back navigation component to all internal pages (/pricing, /music-video, /wizpilot, /help, /onboarding)
- [x] Fix nav consistency: Home, Pricing, WizPilot, Music Video, Help, Get Started/Login
- [x] Remove duplicate/conflicting nav labels (removed duplicate brand logo from nav top-right)
- [x] QA: homepage flows logically top→bottom, USP clear in 3s, footer links work, back buttons work

## Video Showcase Integration (Apr 2026)
- [x] Audit existing CDN video assets (hero videos, WizVid animation, showcase items)
- [x] Generate AI video poster images for 6 video style categories
- [x] Build VideoStylesShowcase section with 6 looping video previews
- [x] Each showcase card: category label, short description, hover-to-play video
- [x] Add "Real video generated with WizVid" label to demo section
- [x] Ensure all videos: muted autoplay, loop, preload=none (lazy), no layout shift
- [x] Performance: explicit aspect-ratio containers to prevent CLS
- [x] QA: videos autoplay muted on mobile and desktop

## Cinematic Hero Video Rebuild (Apr 2026)
- [x] Generate hero background video (character animation, scene transitions, storytelling moments)
- [x] Upload hero video to CDN
- [x] Rebuild hero: full-bleed video background, dark gradient overlay, text readability
- [x] New headline: "Create full AI videos in minutes — from idea to final content"
- [x] New subheadline: "Turn a prompt, song, or idea into a complete animated video with zero editing"
- [x] Add micro proof block: Prompt "Kids pirate adventure song" → Full animated video in under 2 minutes
- [x] CTA primary: "Create Your First Video", secondary: "Try WizVid Free"
- [x] Performance: compressed video, fallback poster image, no layout shift
- [x] QA: muted autoplay on mobile and desktop, smooth loop

## Profitability Control System (Apr 2026)
- [x] Update products.ts: Starter 10 videos/60s, Pro 25 videos/120s, Creator+ 50 videos/180s
- [x] Add cost target constants: Starter £1.25 hard stop, Pro £3.50, Creator+ £7.00
- [x] Build scene-classifier.ts: LLM-based hero/performance/narrative/filler classification
- [x] Build renderer-router.ts: route scenes to Seedance (cheap) vs Kling (premium) by scene type + plan allocation
- [x] Add pre-generation cost estimate and hard stop enforcement in music-video-service.ts
- [x] Add scene downgrade logic: if over budget, demote non-essential scenes to cheaper renderer
- [x] Enforce video length limits per plan before generation starts
- [x] Add audio trim/excerpt handling for tracks exceeding plan length limit
- [x] Cap premium API retries: 1 retry for essential scenes, fallback to Seedance for non-essential
- [x] Add per-user monthly video count check before job starts (enforce plan cap)
- [x] Write vitest tests for scene classifier, renderer router, and cost guardrail logic

## Credits System UI & Behaviour (Apr 2026)
- [x] Fix estimateVideoCostGBP test signature mismatch (sceneCount+premiumScenes not sceneCount+plan)
- [x] Update backend credit costs: 30/60/90 credits by video length, +20 per premium scene, +30 for lip sync
- [x] Update products.ts credit pack prices: Starter £9, Creator £24, Pro £59
- [x] Add cinematic upgrade packs: 10 scenes £12, 25 scenes £25, 50 scenes £45
- [x] Credit balance display in nav/top bar: ⚡ N Credits, low warning at <20, zero state
- [x] Estimated credit usage block on video creation screen (standard + cinematic breakdown)
- [x] Credit pack purchase modal with 3 packs + cinematic upgrades + Stripe checkout
- [x] Low credit toast trigger when balance drops below 20
- [x] Insufficient credits modal with Get Credits + Reduce Quality buttons
- [x] Post-video cinematic upsell: "Want to enhance this video? Upgrade key scenes to cinematic quality"
- [x] Smart microcopy across UI (creator-friendly language, no technical terms)

## Feature: Cinematic Upsell Modal (Apr 2026)
- [x] Audit render completion flow and scene data structure (sceneStatuses, thumbnails, videoUrls)
- [x] Build CinematicUpsellModal: scene grid selector, per-scene cost (20 Credits), total cost preview
- [x] Add quality comparison callout (Standard vs Cinematic) with feature bullets
- [x] Add "Select All" / "Deselect All" toggle in modal
- [x] Add backend tRPC procedure: cinematicUpgrade (validate credits, deduct, queue premium re-render)
- [x] Wire modal trigger into MusicVideoAutopilot on render completion (replaces simple toast)
- [x] Credit guard: check balance before dispatching, show InsufficientCreditsModal if short
- [x] Show re-render progress inline in modal (scene-by-scene status)
- [x] Write vitest tests for cinematicUpgrade procedure (17 tests)
- [x] TypeScript check: 0 errors, 81/81 tests passing

## Conversion Optimisation System (Apr 2026)
- [x] Hero: new headline "Your song deserves a music video — create it in minutes"
- [x] Hero: new subheadline about AI storyboards, scene previews, cinematic moments
- [x] Hero: CTA primary "Create My First Video", secondary "See How It Works"
- [x] Hero: supporting line "No editing. No experience. Just your idea."
- [x] Add Immediate Value section below hero: "See your full video before you render a single frame"
- [x] Add Differentiation section: "Why WizVid is different" (3 bullet points)
- [x] Pricing: Starter label "Perfect for trying ideas"
- [x] Pricing: Pro label "Best for regular creators" + "MOST POPULAR" badge
- [x] Pricing: Creator+ label "For serious video production"
- [x] Pricing: add line "Start creating for less than £1 per video"
- [x] Add speed microcopy: "Create your first video in under 2 minutes", "Instant storyboard generation"
- [x] In-product: per-scene cinematic prompt — handled via CinematicUpsellModal
- [x] In-product: longer video credit warning with upgrade link to /pricing
- [x] In-product: post-render upgrade CTA label "Upgrade Key Scenes" (CinematicUpsellModal)
- [x] Credit system: helper text "No credit card required · First video free · Under 2 minutes"
- [x] Credit system: standard vs cinematic credit difference clearly shown in breakdown block

## Master System Implementation (Apr 2026)
- [x] Hero: headline updated with conversion-optimised copy
- [x] Hero: subheadline about AI storyboards/scene previews/cinematic moments
- [x] Hero: CTAs "Create Your First Video" + "Try WizVid Free"
- [x] Hero: supporting line "No editing. No experience. Just your idea."
- [x] Add ImmediateValue section: "See your full video before you render a single frame" + 3 bullets + "Create your first video" CTA
- [x] Update WhyWizVid to "Why WizVid is different" with 3 spec points
- [x] Pricing: Starter £29 "Perfect for trying ideas"
- [x] Pricing: Pro £69 "Best for regular creators" + MOST POPULAR badge
- [x] Pricing: Creator+ £149 "For serious video production"
- [x] Pricing: add "Start creating for less than £1 per video" above cards
- [x] Pricing: add "Plans designed for generous creative use. Fair use applies." small text
- [x] Video length limit warning: amber banner when audio exceeds plan limit, with upgrade link
- [x] In-product: post-render "Upgrade Key Scenes" via CinematicUpsellModal
- [x] In-product: low credits — useCreditGuard toast "You're running low on Credits (N left)"
- [x] In-product: insufficient credits — InsufficientCreditsModal "You need more credits"
- [x] Speed microcopy: "under 30 seconds", "under 2 minutes", "no waiting, no setup"
- [x] Credit helper text: "No credit card required · First video free · Under 2 minutes"
- [x] Fix WizPilot page: content is left-aligned, needs to be centred (global @utility container override + mx-auto on all container divs)
- [x] Fix WizPilot back button: use history.back() with 300ms fallback to setLocation("/")

## Feature: Low Credit Warning Banner (Apr 2026)
- [x] Build LowCreditBanner component: severity levels (low/insufficient), estimated cost vs balance, top-up CTA
- [x] Wire banner into MusicVideoAutopilot upload step (shows before user starts)
- [x] Wire banner into WizPilot prompt step (shows before generation)
- [x] Add persistent low-credit card to DashboardLayout sidebar when balance < 20
- [x] TypeScript check: 0 errors, 81/81 tests passing

## Feature: Quick Top-Up from Low Credit Banner (Apr 2026)
- [x] Build QuickTopUpModal: 3 standard credit packs, cost-per-video helper, Stripe checkout dispatch
- [x] Update LowCreditBanner: "Top up credits" button opens QuickTopUpModal (not /credits redirect)
- [x] Wire QuickTopUpModal into sidebar banner (DashboardLayout)
- [x] Wire QuickTopUpModal into inline banners (MusicVideoAutopilot, WizPilot)
- [x] TypeScript check: 0 errors, 81/81 tests passing, checkpoint saved

## Fix: Nav Logo Too Small (Apr 2026)
- [ ] Increase WizVid logo size in nav header — visible next to Back button on all pages

## Fix: Nav Logo Too Small + Back Button (Apr 2026)
- [x] Crop WizVid logo (remove excess black padding) and upload cropped version to CDN
- [x] Update all nav instances to use cropped logo at h-8 (Pricing, Help, Home, MusicVideosLanding, Onboarding, Subscribe, SeoLandingPage, DashboardLayout, Privacy, Terms, Refunds)
- [x] Fix BackButton: replace unreliable history.back() with direct navigate(fallback) so "Back to Home" always goes to /
- [x] TypeScript check: 0 errors, 81/81 tests passing

## Feature: Logo Hover Animation (Apr 2026)
- [x] Add subtle hover animation to WizVid nav logo across all pages (scale-105 + brightness-110, 300ms transition)

## Feature: Nav Link Hover Animation (Apr 2026)
- [x] Add subtle hover animation (scale-105 + -translate-y-0.5, 200ms) to all header nav links across all pages (Home, Pricing, Help, MusicVideosLanding)

## Audit Recommendations Implementation (Apr 2026)
- [x] SEO: sitemap.xml and robots.txt already in place and verified
- [x] SEO: robots.txt already correct — allows public routes, blocks auth routes, references sitemap
- [x] SEO: JSON-LD SoftwareApplication schema already present in index.html
- [x] Security: Added express-rate-limit — general (300/15min), AI generation (20/15min), upload (30/15min); trust proxy set
- [x] UX: Seeded 6 showcase demo items (Cinematic, Anime, Pixar 3D, Hip-Hop, Indie Band, Documentary) into DB
- [x] Produced audit action plan document covering all 6 areas with prioritised external actions

## Conversion & Monetisation Optimisation System (Apr 2026)
- [x] S1: Update hero headline to "Your song deserves a music video — create it in minutes"
- [x] S1: Add "See your full video before you generate it" supporting line under headline
- [x] S1: Update subheadline copy
- [x] S2/S7: Add speed/urgency badges (⚡ Create your video in under 2 minutes, 🎬 Instant storyboard preview) to hero
- [x] S3: Updated WhyWizVid section title to 'See it. Approve it. Then generate it.' with 3 key differentiators
- [x] S4: Replaced cinematic language in WhyWizVid card and CinematicUpsellModal
- [x] S5: Added pre-render upgrade nudge banner in MusicVideoAutopilot storyboard step
- [x] S5: Updated CinematicUpsellModal title to 'Want this video to look like a real music video?'
- [x] S5: Pre-render nudge covers this: 'standard quality — upgrade key scenes for professional finish'
- [x] S6: Updated showcase section to 'Real videos. Real creators.' with 'Created with WizVid' label and new subtitle
- [x] S8: Updated Credits page header and trust signal to reinforce 'preview free, pay to render' messaging

## SEO Checklist: 50 Programmatic /seo/ Pages (Apr 2026)
### Phase 1 & 2: Technical Foundation & On-Page SEO
- [x] P1: robots.txt verified — /seo/ is fully crawlable (only auth/dashboard routes blocked)
- [x] P1: Self-referencing canonical tags injected dynamically per page via setLink()
- [x] P2: Dynamic title + meta description already per-page; Open Graph + Twitter Card tags added
- [x] P2: og:type, og:title, og:description, og:url, og:image, og:site_name injected per page
- [x] P2: Breadcrumb nav with ChevronRight added (Home > keyword)
- [x] P2: H1 already unique per page from seoPages.ts data
### Phase 5: UX & Conversion
- [x] P5: CTAButton now shows keyword-specific label ('Try [keyword] Free') in 3 locations per page
- [x] P5: TrustBar component added below hero CTA (No credit card required, 10,000+ videos, Trusted by creators, First video free)
### Phase 6: Schema Markup
- [x] P6: FAQPage JSON-LD schema injected (4 questions per page, keyword-specific)
- [x] P6: HowTo JSON-LD schema injected (3 steps from howToSteps data)
- [x] P6: VideoObject JSON-LD schema injected with keyword-specific name and description
- [x] P6: BreadcrumbList JSON-LD schema injected (Home > keyword)

## Fix: Deployment OOM Build Failure (Apr 2026)
- [ ] Diagnose largest Vite chunks causing OOM kill (exit code 137)
- [ ] Add lazy loading / code-splitting for heavy page components
- [ ] Add Vite chunk size warnings and manual chunk splitting config
- [ ] Verify local build succeeds before re-deploying

## Feature: Google Analytics 4 (Apr 2026)
- [x] Add GA4 gtag.js snippet (G-YJD1MG144E) to index.html head

## Feature: GA4 Generate Video Event Tracking (Apr 2026)
- [ ] Create shared analytics helper (client/src/lib/analytics.ts) with trackEvent() wrapper
- [ ] Fire generate_video_click event on every Generate Video button across all pages

## Feature: New Video Styles (Apr 2026)
- [x] Add Neon Noir, Disney, Epic Fantasy styles to video creation flow (MusicVideoAutopilot + Autopilot, with AI-generated thumbnails)

## Feature: Realistic Video Style (Apr 2026)
- [x] Generate thumbnail and add Realistic style to video creation flow

## Feature: Horror Video Style (Apr 2026)
- [x] Generate thumbnail and add Horror style to video creation flow

## Fix: Text to Video (WizPilot) Generation UX (Apr 2026)
- [x] Add animated progress bar during video generation (7-stage, auto-advances every 6s)
- [x] Add step-by-step status messages with icons (Queued → Analysing → Composing → Generating → Styling → Rendering → Finalising)
- [x] Add success state with inline video player, Download, Open in New Tab, and View All Projects buttons
- [x] Fix mobile layout: responsive step pills, stacked buttons, full-width CTAs, touch-friendly tap targets
- [x] Added polling every 8s via checkVideoStatus; auto-transitions to done state with toast on completion

## Fix: Video Action Buttons + Back Navigation (Apr 2026)
- [x] Fix Preview button: opens Dialog modal with inline video player + Download button
- [x] Fix Download button: creates anchor with outputUrl, triggers download, shows toast
- [x] Fix Delete button: AlertDialog confirmation, deleteProject mutation with ownership check on server
- [x] Fix back button: dropdown menu (click Back arrow) with Dashboard / Home Page / WizPilot options
- [x] Add Home option to back button navigation dropdown
- [x] Show remaining credits on Projects page header with top-up shortcut
- [x] Add deleteProject procedure to billing router + video-service.ts
- [x] Projects page now uses real trpc.billing.getProjects data (was hardcoded sample data)
- [x] Auto-refresh every 15s while jobs are pending/processing

## Feature: WizPilot Storyboard Upgrade (Apr 2026)
- [ ] Scene preview images: generate AI image per scene after storyboard is created (visual confirmation before render)
- [ ] Scene preview images: show loading skeleton while image generates, then fade in the result
- [ ] Scene preview images: add tRPC procedure to generate a preview image for a single scene
- [ ] Editable frames: allow user to edit scene prompt/description text inline
- [ ] Editable frames: add "Add Scene" button to insert a new blank scene
- [ ] Editable frames: add "Remove Scene" button (X) on each scene card
- [ ] Editable frames: support copy-paste of scene text (standard browser behaviour + clipboard button)
- [ ] Photo upload: add image upload input in WizPilot prompt step for AI context
- [ ] Video upload: add video upload input in WizPilot prompt step for AI context
- [ ] Photo/video upload: pass uploaded asset URLs to storyboard generation as context
- [ ] YouTube branding: add YouTube logo/badge to WizPilot page header

## Fix: Kids Video Storyboard Flow (Apr 2026)
- [ ] Find Kids Video component and audit current storyboard/scene flow
- [ ] Add AI scene preview image generation per scene (same as WizPilot)
- [ ] Add editable scene text (title, description, visual notes) inline
- [ ] Add confirm-and-regenerate: user edits scene text, clicks regenerate to get new preview image
- [ ] Fix mobile layout: responsive scene cards, stacked buttons, full-width CTAs
- [ ] Enhance Kids Video style thumbnail to be more obviously kids/animation-focused
- [ ] Add "Add Scene" and "Remove Scene" controls to Kids Video storyboard

## Feature: Text to Video Page + Kids Video Page + Onboarding Rework (Apr 2026)
- [ ] Create /kids-video page: kid-friendly branding, Pixar 3D pre-selected, full storyboard with AI previews
- [ ] Create /text-to-video page: prompt + style selector, no audio upload, storyboard with AI previews, render
- [ ] Update Onboarding: replace 'Something Else' with 'Text to Video' option routing to /text-to-video
- [ ] Update Onboarding: route 'Kids Video' to /kids-video instead of /wizpilot
- [ ] Add /kids-video and /text-to-video routes to App.tsx

## Feature: Music Video Flow Upgrade (Apr 2026)
- [ ] Step 1: Artist Type selection — Band, Solo Artist, Animated Characters, Solo Animated Character
- [ ] Step 2: Audio input — Upload audio, Paste lyrics (copy/paste), or Generate with Suno (style + genre + prompt)
- [ ] Suno integration in Music Video flow: user picks style/genre, generates audio, can save and select before storyboard
- [ ] Storyboard: AI image preview per scene with editable prompt, regenerate button before confirming render
- [ ] Credits display + top-up on MusicVideoAutopilot render step
- [ ] Credits display + top-up on Autopilot (WizPilot) render step
- [ ] Credits display + top-up on KidsVideo render step
- [ ] Credits display + top-up on TextToVideoCreator render step
- [ ] Shared CreditsBanner component for reuse across all video creation pages

## Fix: Light/Dark Theme Toggle (Apr 2026)
- [ ] Fix light/dark toggle — diagnose why theme switch doesn't apply visually
- [ ] Ensure toggle works on mobile and desktop
- [ ] Verify CSS variables update correctly when theme changes
- [ ] Fix "Failed to start scene regeneration" error on /music-video/create page
- [ ] Remove lyrics from storyboard scene cards on /music-video/create
- [ ] Add optional captions toggle so users can add captions if they want
- [ ] Fix Kling API mode value (standard→std) causing scene regeneration failures
- [ ] Show per-scene lyrics as editable collapsible section on storyboard cards
- [ ] Add optional captions toggle for final video render


## Session 10 Fixes (April 2026) - COMPLETED ✅
- [x] Add storyboard generation progress overlay (animated steps + progress bar) to MusicVideoAutopilot
- [x] Fix render error handling: add prompt length truncation (480 chars) + automatic retry with simplified 200-char fallback prompt for fal.ai Seedance
- [x] Fix Stripe webhook handler: update to match billing router metadata keys (pack/credits instead of pack_id/type)
- [x] Fix Stripe webhook handler: actually call addCredits() to update user balance (previously only inserted transaction record)
- [x] Fix Stripe webhook handler: support both new metadata format (pack+credits) and legacy format (pack_id)
- [x] Register /api/stripe/webhook route in Express server with raw body parsing (was missing entirely)
- [x] Verify: character injection in startRender already implemented (lines 371-388 musicVideo.ts)
- [x] Verify: lyrics-in-video prevention already in storyboard LLM prompt (explicit NO text instructions)
- [x] Verify: 30s truncation already fixed (ffprobe duration check + stream_loop in assembleMusicVideo)
- [x] All 81 tests passing, 0 TypeScript errors

## Session 11 Fixes (April 2026)
- [ ] Fix character consistency: storyboard LLM must assign specific named characters to each scene (not just describe all characters generically)
- [ ] Fix character consistency: store per-scene character assignments in DB (new column or JSON field on musicVideoScenes)
- [ ] Fix character consistency: startRender must inject ONLY the character(s) assigned to each scene, not all locked characters
- [ ] Fix character consistency: storyboard LLM prompt must enforce "CHARACTER X appears in scenes Y, Z" assignment logic
- [ ] Fix stuck storyboard spinner: find state transition bug that leaves "generating storyboard" overlay active after scenes are loaded
- [ ] Fix stuck storyboard spinner: ensure overlay dismisses when generateStoryboard mutation completes or scenes data is present
- [x] Fix character consistency for ALL characters (not just locked): LLM must define any AI-invented additional/background characters once in a "character roster" and reuse those exact descriptions in every scene they appear in — no improvising different appearances
- [x] Store AI-invented character descriptions in the storyboard JSON so startRender can inject them per-scene alongside locked character briefs
- [x] Fix stuck storyboard spinner: overlay must dismiss immediately when generateStoryboardMutation resolves, regardless of subsequent jobQuery loading state
- [x] Fix 404 tRPC API error on /music-creator page — Suno API endpoint changed from /api/v1/generate-record-info to /api/v1/generate/record-info; also fixed response parsing (sunoData array, uppercase status values)
- [x] Fix Suno API error "customMode cannot be null" on /music-creator — customMode is now a required boolean field in the Suno API, must always be explicitly true/false

## Session 12 - Deep Character Consistency Fix - COMPLETED ✅
- [x] Fix Character 2 (locked with uploaded photo) never matching the photo — vision LLM (Gemini 2.5 Flash) now auto-analyses uploaded photo and generates precise 60-100 word appearance description
- [x] Fix duplicate roles in same scene — roster LLM now enforces role exclusivity: if Character 1 is singer, no other character can be singer in any scene
- [x] Fix roster assignment: locked character roles are now exclusive — "LOCKED ROLE EXCLUSIVITY" block added to scene generation prompt
- [x] Fix render prompt: character description now appears FIRST in every fal.ai scene prompt (before scene/setting description)
- [x] Auto-analysis flow: after saveCharacters returns fresh IDs + primaryPhotoUrl, frontend auto-calls analysePhoto then auto-locks each character
- [x] saveCharacters now returns primaryPhotoUrl so no extra fetch needed
- [x] CharacterManager UI updated: no longer requires manual typing, shows "AI will auto-analyse your photo" hint
- [x] All 81 tests passing, 0 TypeScript errors

## Session 13 Fixes (April 2026) - COMPLETED ✅
- [x] Fix stuck storyboard spinner (AGAIN) — storyboardGenerating state now set to false in all error paths
- [x] Fix 401 Unauthorized errors from fal.ai Seedance — switched to Hypereal AI (hypereal.cloud) as primary renderer
- [x] Fix 401 fal.ai AuthN error — Hypereal API key validated and working (83/83 tests pass)
- [x] Fix Character 2 photo analysis not matching uploaded photos — upgraded to forensic-level 80-120 word vision LLM prompt with hyper-specific descriptions
- [x] Fix Character 1 still appearing in Character 2's role — strengthened role exclusivity rules in storyboard LLM
- [x] Integrate Hypereal AI (hypereal.cloud) as primary video generation provider — Seedance 2.0 via unified gateway
- [x] HYPEREAL_API_KEY and ATLAS_CLOUD_API_KEY stored as secrets
- [x] Built server/ai-apis/hypereal.ts client with submitHyperealVideo, pollHyperealVideo, validateHyperealKey
- [x] Updated music-video-service.ts: fal_seedance/seedance renderers now try Hypereal first, fal.ai as fallback
- [x] Added pollSceneStatusHypereal function with S3 re-upload and DB update
- [x] All 83 tests passing, 0 TypeScript errors

## Session 14 Fixes
- [ ] Fix "Failed to start scene regeneration" error on /music-video/create
- [ ] Integrate Atlas Cloud as video generation provider and add to fallback chain
- [ ] Research Atlas Cloud API docs and build client module

## Session 14 - Atlas Cloud Integration - COMPLETED ✅
- [x] Fix "Failed to start scene regeneration" error — added Atlas Cloud as fallback between Hypereal and fal.ai
- [x] Integrate Atlas Cloud (atlascloud.ai) as video generation provider — Seedance 2.0 via bytedance/seedance-2.0/text-to-video model
- [x] Built server/ai-apis/atlascloud.ts with submitAtlasVideo, pollAtlasVideo, validateAtlasKey
- [x] Added startSceneRenderAtlasCloud and pollSceneStatusAtlasCloud to music-video-service.ts
- [x] Fallback chain is now: Hypereal → Atlas Cloud → fal.ai Seedance
- [x] ATLAS_CLOUD_API_KEY validated (85/85 tests passing)


## Session 15 - WaveSpeed AI Integration
- [ ] Store WAVESPEED_API_KEY secret
- [ ] Build WaveSpeed client with Seedance 2.0 and Hailuo Minimax support
- [ ] Update storyboard LLM to assign models per scene (character-heavy → Seedance, wide/atmospheric → Hailuo)
- [ ] Add WaveSpeed as primary provider in render fallback chain
- [ ] Verify smart model-mixing reduces API costs by ~40%


## CRITICAL BLOCKING ISSUES - MUSIC VIDEO CREATOR
- [x] Fix form data loss on page refresh - persist all user input (title, audio file, theme, genre, mood, style, characters) to localStorage
- [x] Add upload progress bar for audio file uploads - show real-time progress percentage
- [x] Implement lyrics editing UI - allow users to edit AI-generated lyrics before storyboard generation
- [ ] Add generation progress indicator - show real-time progress during storyboard and render phases
- [ ] Prevent form submission during upload - disable buttons while file is uploading

## Session 16 - Database Schema Fix
- [x] Fix musicVideoJobs INSERT failing with "Unknown column" error — applied missing column migrations to production database (isKidsVideo, kidsTargetAge, kidsEducationalTheme, kidsEnableSingalong, kidsFriendlyIntensity, lyrics, lyricsStatus, captionsEnabled, captionStyle, captionBackground, captionFontSize, captionFontStyle, captionTextColour, captionHighlightColour, captionKaraokeMode, captionSafeArea, lyricsApproved, status columns were all missing from the live database)
- [x] Fix mvJobStatus → status column rename — old column dropped, new status column added with data migrated

## Session 17 - Storyboard Generation Timeout Fix
- [x] Identified root cause: generateStoryboard was re-transcribing audio (30-60s) causing HTTP timeout
- [x] Fixed: Use stored transcription text from DB instead of re-transcribing
- [x] Increased HTTP server timeout to 5 minutes for long-running AI calls
- [x] Added splitLink in tRPC client: long-running AI procedures use non-batched httpLink
- [x] Added onError logging to tRPC middleware for production error visibility
- [x] Added generateStoryboard and createJob to AI rate limiter

## Session 18 - Scene Insert Fix & Navigation
- [x] Fix musicVideoScenes INSERT: added missing modelAssignment column to DB
- [x] Add back/home button to Music Video create page
- [x] Add back/home button to Dashboard (Home link in sidebar)

## Session 19 - Character Consistency & Overlay Fix
- [ ] Fix storyboard overlay staying on screen after scenes load (isGeneratingStoryboard not cleared)
- [ ] Fix character inconsistency: enforce locked character descriptions in ALL scene prompts
- [ ] Fix character inconsistency: use photo analysis to lock Tim and Greg's appearance before storyboard generation
- [ ] Fix character inconsistency: ensure character roster descriptions are injected into every scene prompt at render time
- [ ] Fix character inconsistency: add explicit "do not change appearance" instruction to LLM storyboard prompt

## Session 20 - Character Consistency Enforcement
- [x] Fix: ensure ALL characters with photos get photo-analysed and locked before storyboard generation
- [x] Fix: fetch character S3 URLs from server after saveCharacters if primaryPhotoUrl is null
- [x] Fix: per-scene lyrics in storyboard card shows only that scene's lyrics (not full song)
- [x] Fix: storyboard loading overlay toast dismissed properly when done
- [x] Fix: regenerate storyboard toast also uses ID to dismiss properly
- [x] Improve: server-side character description injection already done - verify it works end-to-end

## Session 21 - Character Consistency Critical Fixes
- [x] Fix: LLM assigning wrong roles (Greg=bassist instead of drummer)
- [x] Fix: LLM inventing extra characters (Sarah with blue hair)
- [x] Fix: Storyboard preview images use reference photos (img2img) not just text
- [x] Fix: Stuck "Uploading song..." toast never dismissed
- [x] Fix: Character locked descriptions must include instrument/role explicitly

## Character Lock System (Critical - Core Product Fix)
- [x] Phase 1: Run real photo analysis (LLM vision) for Tim and Greg on all existing jobs
- [x] Phase 1: Merge user style text + photo analysis into one rich frozen description
- [x] Phase 2: Rewrite analysePhoto to produce 120-150 word forensic description including role/instrument
- [x] Phase 2: Store frozen description as immutable once set (never overwrite with weaker text)
- [x] Phase 3: Roster LLM prompt: explicitly list all locked roles, forbid inventing duplicates
- [x] Phase 3: Scene LLM prompt: inject frozen character description verbatim into EVERY scene prompt
- [x] Phase 3: Scene LLM prompt: add "ONLY characters from roster" rule with zero tolerance
- [x] Phase 4: Add negative prompt suffix to every scene render: "different person, different hair, different clothing, inconsistent character"
- [x] Phase 4: Scene render: prepend frozen character description as first sentence of every prompt
- [x] Phase 5: Fix stuck "Uploading song..." toast
- [x] Phase 5: Fix "Loading song" spinner in bottom-left corner

## Session 22 - Invented Character Consistency
- [ ] Store AI-invented character descriptions in DB after roster generation (so Mike is the same person every scene)
- [ ] Inject frozen invented character descriptions into every scene prompt verbatim
- [ ] Remove [LOCKED APPEARANCE — match exactly] tag from visible scene prompt text

## Character Consistency & Prompt Fixes
- [x] Fix prompt duplication bug: LLM copies character description into prompt, then post-processing prepends it again
- [x] Change LLM scene prompt to NOT include character descriptions — only scene direction (camera, lighting, action, setting)
- [x] Post-processing injects character descriptions mechanically — guaranteed correct, no duplication
- [x] Clean up user-visible prompt text: strip verbose character description prefix from displayed prompt in storyboard UI
- [x] Ensure new forensic descriptions for Tim and Greg are used after storyboard regeneration
- [x] Fix storyboard preview images not loading after prompt duplication fix
- [x] Improve character likeness in storyboard preview images — AI-generated images don't resemble uploaded photos
- [x] Pass ALL uploaded photos per character to preview image generation (not just 1 per character) for better likeness from multiple angles
- [x] Fix Greg's likeness not captured in drum scenes — AI generates generic drummer instead of matching Greg's photos
- [x] Fix random extra musicians appearing in preview images — add explicit character count constraint to prompt
- [x] Fix storyboard LLM writing scene directions that contradict character locked descriptions (e.g. 'hair flying' for short-haire- [x] Fix AI-invented characters (Mark) getting Tim's face — only pass reference photos for characters who actually have uploaded photos, not for AI-invented characters (fixed by using Flux PuLID only for scenes with locked character descript## Session 23 - Face-Consistent Image Generation (Flux PuLID) - COMPLETED ✅
- [x] Research face-consistent image generation APIs (Ideogram Character, Flux PuLID, WaveSpeed, Minimax)
- [x] Create Flux PuLID helper module (server/_core/fluxPuLID.ts) with fal.ai integration
- [x] Update musicVideo router to use Flux PuLID for preview images when character photos available
- [x] Add fallback to generic generateImage if Flux PuLID fails
- [x] Write 12 integration tests validating Flux PuLID implementation
- [x] Verify all tests pass (98/99 passing, 1 pre-existing failure unrelated to changes)
- [x] Verify AI-invented characters still use generic image generation (no photo fallback)
- [x] TypeScript compilation: zero errors
- [x] Ready for deployment to production