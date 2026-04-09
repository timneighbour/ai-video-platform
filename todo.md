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
- [ ] Character reference pack UI: up to 4 characters per music video
- [ ] Per-character: name, type (real/animated), gender, role (lead/backing/featured/non-singing), singing flag
- [ ] Per-character: up to 8 reference images (different angles, outfits, costumes)
- [ ] Image upload for each character reference pack via /api/video/upload
- [ ] Store characters in musicVideoJobs.charactersJson field (DB migration)
- [ ] Pass character data to storyboard AI prompt for scene assignment
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
- [ ] sitemap.xml with all pages
- [ ] robots.txt

## Programmatic SEO (50 Pages)
- [ ] Dynamic SEO route /seo/:slug rendering master template
- [ ] All 50 keyword pages from the master list
- [ ] Internal links between all pages
- [ ] Demo video embed on every page
- [ ] sitemap.xml listing all 50 URLs + main pages
- [ ] robots.txt with sitemap reference


## Multilingual Support (i18n)
- [ ] Install i18next + react-i18next + i18next-browser-languagedetector
- [ ] Create translation files for EN, ES, PT-BR, FR (all key UI strings)
- [ ] Add LanguageSelector component to nav (flags + language names dropdown)
- [ ] Auto-detect browser language on first visit
- [ ] Persist language choice in localStorage
- [ ] Integrate i18n into Home.tsx nav, hero, and key sections

## Customer Support System
- [ ] Add Crisp live chat widget to all pages (bottom right)
- [ ] Build /help page with FAQ help centre
- [ ] Add support email support@wizvid.ai reference in help page
- [ ] Add help link in nav and footer

## Onboarding Flow
- [ ] Build /onboarding page: goal selection screen
- [ ] Step 1-3 guided creation flow
- [ ] First success moment with download + create another
- [ ] Redirect new users to /onboarding after first login
- [ ] Mobile responsive, minimal, one action per screen

## WizBeat Character Reference Packs
- [ ] Add character panel to MusicVideoAutopilot (up to 4 characters)
- [ ] Per character: name, type, gender, role, singing flag, up to 8 images
- [ ] Pass character data to storyboard AI prompt
- [ ] Apply MuseTalk lip-sync to singing characters

## Suno AI Integration
- [ ] Add Suno API key secret
- [ ] Create server/ai-apis/suno.ts
- [ ] Add Generate Song with AI option to WizBeat

## Homepage Cinematic Rebuild
- [ ] Rebuild Home.tsx with full-screen cinematic hero
- [ ] Sticky frosted-glass nav with language selector
- [ ] All 9 sections (hero, what it does, who its for, USP, how it works, WizBeat, WizPilot, social proof, pricing)
- [ ] GBP pricing tiers (Starter 19, Pro 49, Creator+ 99)
- [ ] SEO meta tags throughout

## Programmatic SEO (50 Pages)
- [ ] Register /seo/:slug route in App.tsx
- [ ] sitemap.xml and robots.txt created

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
