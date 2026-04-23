/**
 * WIZ AI Product Pages — all 10 modules
 * Routes: /products/wizcreate, /products/wizanimate, /products/wizsound,
 *         /products/wizlumina, /products/wizgenesis, /products/wizboost,
 *         /products/wizpilot, /products/wizsync-info, /products/wizscore
 * WizSync tool: /wizsync  |  WizScore tool: /wizscore  |  WizPilot tool: /wizpilot
 */
import ProductPageTemplate, { ProductPageProps } from "@/components/ProductPageTemplate";
import {
  WIZANIMATE_SEO_PAGE,
  WIZANIMATE_PRODUCT_PAGE,
  WIZVIDEO_STUDIO_PAGE,
  WIZAUDIO_STUDIO_PAGE,
  WIZIMAGE_STUDIO_PAGE,
  WIZSHORTS_STUDIO_PAGE,
  WIZSCRIPT_STUDIO_PAGE,
  WIZPILOT_STUDIO_PAGE,
  WIZSCORE_STUDIO_PAGE,
  WIZSYNC_STUDIO_PAGE,
} from "@/lib/routes";

const HERO_IMGS = {
  wizcreate:  "/manus-storage/product-wizcreate-hero_6c3efa10.jpg",
  wizanimate: "/manus-storage/hero-wizanimate_75dad3b8.jpg",
  wizsound:   "/manus-storage/product-wizsound-hero_8219d2d2.jpg",
  wizlumina:  "/manus-storage/product-wizlumina-hero_ed20683e.jpg",
  wizgenesis: "/manus-storage/hero-wizgenesis_839aa2e8.jpg",
  wizboost:   "/manus-storage/hero-wizboost_44024555.jpg",
  wizsync:    "/manus-storage/hero-wizsync_6e1c3369.jpg",
  wizscore:   "/manus-storage/hero-wizscore_d4786473.jpg",
  wizscript:  "/manus-storage/hero-wizscript_d5f3a63d.jpg",
  wizpilot:   "/manus-storage/hero-wizpilot_0e6b01dd.jpg",
  wizshorts:  "/manus-storage/hero-wizshorts_83e4e17d.jpg",
};

const CDN = "/manus-storage";

const CARD_IMGS = {
  audioUpload:    "/manus-storage/card-audio-upload_8cda253d.jpg",
  storyboard:     "/manus-storage/card-storyboard_38d61672.jpg",
  videoRender:    "/manus-storage/card-video-render_d81a3b98.jpg",
  aiBrain:        "/manus-storage/card-ai-brain_b513d38b.jpg",
  character:      "/manus-storage/card-character_f4fbf0a3.jpg",
  musicNotes:     "/manus-storage/card-music-notes_96ce5dac.jpg",
  imageGen:       "/manus-storage/card-image-generation_155efafb.jpg",
  animation:      "/manus-storage/card-animation_e13ffa11.jpg",
  sync:           "/manus-storage/card-sync_b129b54a.jpg",
  script:         "/manus-storage/card-script_106a5018.jpg",
  score:          "/manus-storage/card-score_04e96a04.jpg",
  pilot:          "/manus-storage/card-pilot_32edd175.jpg",
  shorts:         "/manus-storage/card-shorts_d6977166.jpg",
  performer:      "/manus-storage/card-performer_04e65a2e.jpg",
  preview:        "/manus-storage/card-preview_a7c9fab7.jpg",
};

const ALL_RELATED = [
  { name: "WizCreate™", href: "/products/wizcreate", colour: "violet" },
  { name: "WizAnimate™", href: WIZANIMATE_PRODUCT_PAGE, colour: "cyan" },
  { name: "WizPilot™", href: "/products/wizpilot", colour: "fuchsia" },
  { name: "WizSync™", href: "/products/wizsync-info", colour: "purple" },
  { name: "WizScore™", href: "/products/wizscore", colour: "teal" },
  { name: "WizSound™", href: "/products/wizsound", colour: "emerald" },
  { name: "WizLumina™", href: "/products/wizlumina", colour: "amber" },
  { name: "WizGenesis™", href: "/products/wizgenesis", colour: "rose" },
  { name: "WizBoost™", href: "/products/wizboost", colour: "orange" },
];

// ─── WizCreate ────────────────────────────────────────────────────────────────
const WIZCREATE: ProductPageProps = {
  name: "WizCreate™",
  role: "The Brain",
  tagline: "AI Creation Engine",
  headline: "Turn any idea into a cinematic storyboard",
  subheadline: "WizCreate™ is the intelligence layer of WIZ AI — it transforms your audio track or text prompt into a fully-structured scene-by-scene visual plan, ready for animation and building.",
  logo: `${CDN}/wizcreate-logo-new_85a25756.png`,
  accentFrom: "from-[#b8892a]",
  accentTo: "to-[#4a3010]",
  accentGlow: "rgba(139,92,246,0.25)",
  borderColour: "border-[--color-gold]/30",
  bgColour: "bg-[--color-gold]/15",
  badgeClass: "text-[--color-gold] bg-[--color-gold]/15 border-[--color-gold]/30",
  ctaHref: WIZVIDEO_STUDIO_PAGE,
  ctaLabel: "Start Creating",
  whatItDoes: "WizCreate™ analyses your audio's tempo, mood, and lyrical content — or your text description — and generates a complete cinematic storyboard. Each scene is assigned a visual style, character placement, camera angle, and timing. It's the creative director that never runs out of ideas.",
  capabilities: [
    "AI storyboard generation from audio or text",
    "Scene-by-scene visual direction",
    "Character design and consistency across scenes",
    "Style selection: Cinematic, Anime, 3D Animation, Documentary",
    "Automatic timing alignment to audio beats",
    "Multi-scene narrative structure",
  ],
  howItWorks: [
    { num: "01", icon: "upload", image: CARD_IMGS.audioUpload, title: "Upload or describe", desc: "Upload an audio track or describe your video concept in plain language." },
    { num: "02", icon: "cpu", image: CARD_IMGS.aiBrain, title: "AI analyses content", desc: "WizCreate analyses mood, tempo, lyrics, and narrative arc to plan the video." },
    { num: "03", icon: "layout", image: CARD_IMGS.storyboard, title: "Storyboard generated", desc: "A complete scene-by-scene storyboard is created with visual direction for each moment." },
    { num: "04", icon: "check-circle", image: CARD_IMGS.preview, title: "Review & proceed", desc: "Review the storyboard, make adjustments, then pass it to WizAnimate for production." },
  ],
  benefits: [
    { title: "Zero creative block", desc: "WizCreate generates a complete visual plan in seconds — no storyboarding experience needed." },
    { title: "Style consistency", desc: "Characters, colours, and visual language stay consistent across every scene automatically." },
    { title: "Audio-synced timing", desc: "Every scene cut is timed to the audio — no manual sync work required." },
    { title: "Multiple styles", desc: "Choose from Cinematic, Anime, 3D Animation, Documentary, or let AI decide based on your track." },
    { title: "Iterative refinement", desc: "Not happy with a scene? Regenerate individual scenes without redoing the whole storyboard." },
    { title: "Feeds the full pipeline", desc: "WizCreate output flows directly into WizAnimate, WizSync, and WizGenesis." },
  ],
  keyFeatures: [
    { icon: "cpu", image: CARD_IMGS.audioUpload, title: "Audio-Driven Storyboarding", desc: "Analyses your track's BPM, mood, and lyrical content to generate a scene plan that moves with the music — not against it." },
    { icon: "layout", image: CARD_IMGS.storyboard, title: "Multi-Style Visual Direction", desc: "Choose from Cinematic, Anime, 3D Animation, Documentary, or Illustrated — each style applies consistent visual rules across every scene." },
    { icon: "refresh", image: CARD_IMGS.aiBrain, title: "Scene-Level Regeneration", desc: "Unhappy with a single scene? Regenerate it in isolation without touching the rest of the storyboard — full creative control." },
    { icon: "layers", image: CARD_IMGS.character, title: "WizSync\u2122 Character Lock", desc: "Characters maintain the same appearance, proportions, and style across every scene — no drift, no inconsistency." },
    { icon: "upload", image: CARD_IMGS.script, title: "Text-to-Storyboard Mode", desc: "No audio? Describe your concept in plain language and WizCreate builds the full visual plan from your words alone." },
    { icon: "arrow-right-circle", image: CARD_IMGS.videoRender, title: "Pipeline-Ready Output", desc: "Every storyboard exports directly into WizAnimate, WizSync, and WizGenesis — no manual handoff or file conversion needed." },
  ],
  heroImage: HERO_IMGS.wizcreate,
  related: ALL_RELATED.filter(r => r.name !== "WizCreate™"),
};

// ─── WizAnimate ───────────────────────────────────────────────────────────────
const WIZANIMATE: ProductPageProps = {
  name: "WizAnimate™",
  role: "The Performer",
  tagline: "Character Animation Engine",
  headline: "Characters that move, feel, and perform",
  subheadline: "WizAnimate™ takes your storyboard and breathes life into every character — generating fluid, beat-matched animation that looks like it was directed by a professional.",
  logo: `/manus-storage/wizanimate-logo-new_a84f9808.png`,
  accentFrom: "from-[#9090a0]",
  accentTo: "to-blue-300",
  accentGlow: "rgba(6,182,212,0.25)",
  borderColour: "border-cyan-500/30",
  bgColour: "bg-[--color-silver]/10",
  badgeClass: "text-[--color-silver] bg-[--color-silver]/10 border-cyan-500/25",
  ctaHref: WIZANIMATE_SEO_PAGE,
  ctaLabel: "Animate Your Video",
  whatItDoes: "WizAnimate™ is the performance engine of WIZ AI. It takes the storyboard from WizCreate™ and generates character animation that is precisely matched to the audio — every movement, gesture, and expression timed to the beat, mood, and energy of the track.",
  capabilities: [
    "Beat-matched character motion and gestures",
    "Emotion-driven performance (happy, intense, melancholic)",
    "Multi-character scene choreography",
    "Smooth scene transitions and camera movement",
    "Support for 2D, 3D, and mixed animation styles",
    "Works with WizSync™ for lip sync integration",
  ],
  howItWorks: [
    { num: "01", icon: "file-text", image: CARD_IMGS.storyboard, title: "Receive storyboard", desc: "WizAnimate receives the scene plan from WizCreate™ with timing and character data." },
    { num: "02", icon: "music", image: CARD_IMGS.musicNotes, title: "Audio analysis", desc: "The audio is analysed for beat, energy, and emotional arc to drive animation decisions." },
    { num: "03", icon: "play-circle", image: CARD_IMGS.animation, title: "Animation generated", desc: "Characters are animated with motion that matches the audio's rhythm and emotional tone." },
    { num: "04", icon: "arrow-right-circle", image: CARD_IMGS.sync, title: "Passes to WizSync", desc: "Animated scenes are passed to WizSync™ for voice assignment and lip sync generation." },
  ],
  benefits: [
    { title: "Cinematic performance quality", desc: "Animation quality that rivals professional motion capture — generated automatically from audio." },
    { title: "Beat-perfect timing", desc: "Every movement is timed to the audio's beat grid — no manual keyframing required." },
    { title: "Emotional intelligence", desc: "WizAnimate reads the emotional tone of your track and adjusts character performance accordingly." },
    { title: "Multi-character support", desc: "Animate 2, 3, or more characters simultaneously with correct spatial relationships." },
    { title: "Style flexibility", desc: "Works with any visual style — cinematic, anime, 3D, or illustrated." },
    { title: "Seamless pipeline integration", desc: "Output flows directly into WizSync™ for lip sync and WizSound™ for audio enhancement." },
  ],
  keyFeatures: [
    { icon: "music", image: CARD_IMGS.musicNotes, title: "Beat-Locked Motion Engine", desc: "Every character movement, camera cut, and scene transition is timed to the audio's beat grid — automatically, with zero manual keyframing." },
    { icon: "play-circle", image: CARD_IMGS.videoRender, title: "Cinematic Camera System", desc: "Dynamic camera moves — dolly, pan, zoom, orbit — are chosen per scene based on emotional context, not random selection." },
    { icon: "layers", image: CARD_IMGS.character, title: "Multi-Character Choreography", desc: "Animate 2, 3, or more characters simultaneously with correct spatial relationships, eye contact, and interaction physics." },
    { icon: "eye", image: CARD_IMGS.animation, title: "Style-Adaptive Animation", desc: "Switches seamlessly between Cinematic, Anime, 3D, and Illustrated styles — each with its own motion language and physics rules." },
    { icon: "zap", image: CARD_IMGS.performer, title: "Emotion-Driven Performance", desc: "Facial expressions, body language, and gesture intensity are driven by the audio's emotional arc — not scripted manually." },
    { icon: "arrow-right-circle", image: CARD_IMGS.sync, title: "WizSync-Ready Export", desc: "Animated scenes pass directly to WizSync™ for lip sync and voice assignment — no re-processing or format conversion required." },
  ],
  heroImage: HERO_IMGS.wizanimate,
  related: ALL_RELATED.filter(r => r.name !== "WizAnimate™"),
};

// ─── WizSound ─────────────────────────────────────────────────────────────────
const WIZSOUND: ProductPageProps = {
  name: "WizSound™",
  role: "The Composer",
  tagline: "Cinematic Audio Engine",
  headline: "Hear the difference — studio audio from any track",
  subheadline: "WizSound™ transforms your audio into studio-grade cinematic sound — richer bass, clearer highs, and a fuller, more immersive presence that makes your video feel professional.",
  logo: `${CDN}/wizsound-logo-new_c5cced65.png`,
  accentFrom: "from-[#9090a0]",
  accentTo: "to-teal-300",
  accentGlow: "rgba(16,185,129,0.25)",
  borderColour: "border-[--color-silver]/30",
  bgColour: "bg-[--color-silver]/10",
  badgeClass: "text-[--color-silver] bg-[--color-silver]/10 border-[--color-silver]/25",
  ctaHref: WIZAUDIO_STUDIO_PAGE,
  ctaLabel: "Create Music Now",
  whatItDoes: "WizSound™ is WIZ AI's proprietary audio enhancement engine. It applies multi-band compression, harmonic enhancement, spatial widening, and cinematic EQ curves to your audio track — transforming it from a standard recording into a rich, immersive cinematic experience.",
  capabilities: [
    "Multi-band dynamic compression and limiting",
    "Harmonic enhancement for warmth and presence",
    "Spatial widening for immersive stereo field",
    "Cinematic EQ curves (richer bass, clearer highs)",
    "Noise reduction and artefact removal",
    "Automatic loudness normalisation to broadcast standards",
  ],
  howItWorks: [
    { num: "01", icon: "music", image: CARD_IMGS.musicNotes, title: "Audio ingested", desc: "Your audio track is ingested and analysed for frequency content, dynamic range, and noise." },
    { num: "02", icon: "zap", image: CARD_IMGS.aiBrain, title: "Enhancement applied", desc: "WizSound applies its proprietary cinematic enhancement chain — EQ, compression, spatial widening." },
    { num: "03", icon: "shield-check", image: CARD_IMGS.score, title: "Quality check", desc: "The enhanced audio is checked against broadcast loudness standards and adjusted." },
    { num: "04", icon: "film", image: CARD_IMGS.videoRender, title: "Baked into video", desc: "The enhanced audio is baked into the final video build by WizGenesis\u2122." },
  ],
  benefits: [
    { title: "Studio quality without a studio", desc: "WizSound delivers professional audio enhancement that would normally require a mastering engineer." },
    { title: "Richer, fuller sound", desc: "Proprietary harmonic enhancement adds warmth and presence that makes your track feel alive." },
    { title: "Cinematic spatial field", desc: "Stereo widening creates an immersive listening experience that draws viewers in." },
    { title: "Broadcast-ready loudness", desc: "Automatic normalisation ensures your video meets YouTube, Spotify, and streaming platform standards." },
    { title: "Transparent processing", desc: "WizSound enhances without destroying — your original track's character is preserved." },
    { title: "Automatic in the pipeline", desc: "WizSound runs automatically as part of every WIZ AI build — no manual steps needed." },
  ],
  keyFeatures: [
    { icon: "zap", title: "13-Stage Cinematic Chain", desc: "Every track passes through a proprietary 13-stage processing pipeline — EQ, compression, harmonic exciter, spatial widening, reverb, saturation, and true-peak mastering." },
    { icon: "layers", title: "Haas Stereo Widening", desc: "Expands the stereo image to 2.5x its original width using psychoacoustic Haas delay — creating an immersive, cinema-grade soundstage." },
    { icon: "music", title: "Harmonic Exciter", desc: "Adds 2nd and 3rd-order harmonic content to introduce warmth, richness, and analogue character that digital recordings naturally lack." },
    { icon: "shield-check", title: "Broadcast Loudness Mastering", desc: "Automatic two-pass loudnorm mastering targets -12 LUFS integrated with true-peak limiting at -0.1 dBTP — meeting all major streaming platform standards." },
    { icon: "film", title: "Concert Hall Reverb", desc: "A 3-tap concert hall reverb adds cinematic depth and spatial dimension — the difference between a demo recording and a film soundtrack." },
    { icon: "cpu", title: "Noise Gate & Artefact Removal", desc: "Intelligent noise gating cleans the silence floor and removes digital artefacts before any enhancement is applied — preserving the integrity of the original." },
  ],
  heroImage: HERO_IMGS.wizsound,
  related: ALL_RELATED.filter(r => r.name !== "WizSound™"),
};

// ─── WizLumina ────────────────────────────────────────────────────────────────
const WIZLUMINA: ProductPageProps = {
  name: "WizLumina™",
  role: "The Cinematographer",
  tagline: "Visual Enhancement Engine",
  headline: "See the difference — cinema-grade visuals from AI video",
  subheadline: "WizLumina™ applies cinematic colour grading, HDR tone mapping, and film-level sharpening to transform flat AI-generated video into rich, vivid, cinema-quality visuals.",
  logo: `${CDN}/wizlumina-logo-new_0709f3c5.png`,
  accentFrom: "from-[#b8892a]",
  accentTo: "to-yellow-200",
  accentGlow: "rgba(245,158,11,0.25)",
  borderColour: "border-[--color-gold]/30",
  bgColour: "bg-[--color-gold]/15",
  badgeClass: "text-[--color-gold] bg-[--color-gold]/15 border-[--color-gold]/30",
  ctaHref: WIZVIDEO_STUDIO_PAGE,
  ctaLabel: "Create Your Video",
  whatItDoes: "WizLumina™ is WIZ AI's visual post-processing engine. It analyses each frame of your AI-generated video and applies a cinematic enhancement pipeline — colour grading, HDR tone mapping, sharpening, and 4K upscaling — that transforms the output from flat AI imagery into rich, film-quality visuals.",
  capabilities: [
    "Cinematic colour grading with film LUT library",
    "HDR tone mapping for vivid highlights and deep shadows",
    "Film-level sharpening and detail enhancement",
    "4K upscaling using AI super-resolution",
    "Noise reduction and grain management",
    "Automatic scene-by-scene colour consistency",
  ],
  howItWorks: [
    { num: "01", icon: "video", image: CARD_IMGS.videoRender, title: "Video received", desc: "WizLumina receives the animated video from WizAnimate™ for visual enhancement." },
    { num: "02", icon: "eye", image: CARD_IMGS.aiBrain, title: "Colour analysis", desc: "Each scene is analysed for colour temperature, contrast, and visual mood." },
    { num: "03", icon: "sparkles", image: CARD_IMGS.imageGen, title: "Enhancement applied", desc: "Cinematic grading, HDR mapping, sharpening, and upscaling are applied frame by frame." },
    { num: "04", icon: "star", image: CARD_IMGS.preview, title: "Cinema-quality output", desc: "The enhanced video is passed to WizGenesis™ for final building and export." },
  ],
  benefits: [
    { title: "From flat to cinematic", desc: "WizLumina transforms the characteristic flatness of AI-generated video into rich, vivid imagery." },
    { title: "HDR-quality depth", desc: "Tone mapping creates the deep shadows and bright highlights that define cinema-quality visuals." },
    { title: "4K upscaling", desc: "AI super-resolution upscales your video to 4K without the blocky artefacts of traditional upscaling." },
    { title: "Film-grade colour", desc: "Professional LUT library with cinematic colour grades used in real film production." },
    { title: "Scene consistency", desc: "WizLumina maintains consistent colour grading across all scenes for a cohesive visual style." },
    { title: "Automatic in the pipeline", desc: "WizLumina runs automatically as part of every WIZ AI build — no manual colour grading needed." },
  ],
  keyFeatures: [
    { icon: "eye", title: "Cinematic Colour Grading", desc: "Applies professional LUT-based colour grades used in real film production — from warm golden-hour tones to cool sci-fi palettes — frame by frame." },
    { icon: "sparkles", title: "HDR Tone Mapping", desc: "Intelligent tone mapping creates deep shadows and bright highlights that define cinema-quality visuals, even from standard dynamic range source footage." },
    { icon: "zap", title: "AI Upscaling to 4K", desc: "Proprietary super-resolution upscaling increases resolution up to 4K while sharpening edges and recovering fine detail lost in the original build." },
    { icon: "star", title: "Scene-by-Scene Consistency", desc: "Colour temperature, contrast, and saturation are locked across all scenes automatically — no per-scene grading required." },
    { icon: "layers", title: "Grain & Noise Management", desc: "Adaptive noise reduction removes AI generation artefacts and digital grain while preserving the organic texture that makes footage feel real." },
    { icon: "film", title: "Film Emulation Mode", desc: "Emulates the look of specific film stocks — Kodak Vision3, Fuji Eterna, Arri LogC — giving AI-generated video the unmistakable feel of shot-on-film." },
  ],
  heroImage: HERO_IMGS.wizlumina,
  related: ALL_RELATED.filter(r => r.name !== "WizLumina™"),
};

// ─── WizGenesis ───────────────────────────────────────────────────────────────
const WIZGENESIS: ProductPageProps = {
  name: "WizGenesis\u2122",
  role: "The Intelligence Layer",
  tagline: "AI Build Intelligence Engine",
  headline: "The brain behind every build \u2014 intelligence meets cinema",
  subheadline: "WizGenesis\u2122 is the intelligence layer of WIZ AI. It ensures character consistency across scenes, enhances prompts for accuracy, and orchestrates the final 4K output with WizSound\u2122 spatial audio and WizLumina\u2122 baked in.",
  logo: `${CDN}/wizgenesis-logo-new_9814b3d1.png`,
  accentFrom: "from-[#9090a0]",
  accentTo: "to-[#2e2e36]",
  accentGlow: "rgba(244,63,94,0.25)",
  borderColour: "border-rose-500/30",
  bgColour: "bg-[--color-silver]/10",
  badgeClass: "text-[--color-silver] bg-[--color-silver]/10 border-rose-500/25",
  ctaHref: WIZVIDEO_STUDIO_PAGE,
  ctaLabel: "Build Your Video",
  whatItDoes: "WizGenesis\u2122 is the intelligence layer of WIZ AI. It analyses your storyboard for character consistency, enhances prompts for scene accuracy, and orchestrates the complete build pipeline \u2014 combining animated scenes from WizAnimate\u2122, spatial audio from WizSound\u2122, and graded visuals from WizLumina\u2122 into a single, polished video file at studio quality.",
  capabilities: [
    "Character consistency across all scenes",
    "Prompt enhancement for scene accuracy",
    "4K, 1080p, and 720p output options",
    "WizSound\u2122 spatial audio baked in",
    "WizLumina\u2122 visual enhancement baked in",
    "Intelligent batch processing",
  ],
  howItWorks: [
    { num: "01", icon: "brain", image: CARD_IMGS.aiBrain, title: "Intelligence analysis", desc: "WizGenesis analyses your storyboard for character consistency, scene coherence, and prompt accuracy." },
    { num: "02", icon: "wand", image: CARD_IMGS.script, title: "Prompt enhancement", desc: "Rough prompts are refined into structured, AI-friendly instructions that preserve your creative intent." },
    { num: "03", icon: "layers", title: "Orchestrated build", desc: "All elements \u2014 animation, spatial audio, visual grading \u2014 are assembled and built at studio quality." },
    { num: "04", icon: "download", title: "Download & share", desc: "Your finished video is available for instant download and sharing to any platform." },
  ],
  benefits: [
    { title: "Character consistency", desc: "WizGenesis preserves character identity, appearance, and outfit across every scene in your video." },
    { title: "Spatial audio baked in", desc: "WizSound\u2122 cinema-grade spatial audio and WizLumina\u2122 visual grading are permanently baked into the build." },
    { title: "Multiple resolutions", desc: "Choose 720p for fast delivery, 1080p for standard quality, or 4K for maximum impact." },
    { title: "Fast build times", desc: "Cloud-accelerated processing means your video is ready in minutes, not hours." },
    { title: "Instant distribution", desc: "Download your video or share directly to YouTube, Instagram, and TikTok from the dashboard." },
    { title: "Archive-quality files", desc: "High-bitrate exports ensure your video looks perfect on any screen or platform." },
  ],
  keyFeatures: [
    { icon: "brain", title: "Prompt Intelligence Layer", desc: "Transforms rough, vague, or incomplete prompts into structured, AI-optimised instructions that preserve creative intent while maximising generation quality." },
    { icon: "layers", title: "Full Pipeline Orchestration", desc: "Coordinates WizCreate, WizAnimate, WizSync, WizSound, and WizLumina in the correct sequence — ensuring every element is assembled at the right moment." },
    { icon: "shield-check", title: "Character Coherence Validation", desc: "Cross-checks character appearance, scene continuity, and narrative logic before building — catching inconsistencies that would otherwise require a full regeneration." },
    { icon: "zap", title: "Cloud-Accelerated Processing", desc: "Distributed cloud infrastructure processes your video in parallel across multiple nodes \u2014 delivering studio-quality output in minutes, not hours."},
    { icon: "film", title: "Multi-Resolution Export", desc: "Export at 720p, 1080p, or 4K with platform-optimised bitrate profiles for YouTube, Instagram, TikTok, and broadcast delivery." },
    { icon: "download", title: "Instant Delivery", desc: "Completed videos are available for immediate download or direct sharing to connected platforms the moment your video is ready." },
  ],
  heroImage: HERO_IMGS.wizgenesis,
  related: ALL_RELATED.filter(r => r.name !== "WizGenesis™"),
};

// ─── WizBoost ─────────────────────────────────────────────────────────────────
const WIZBOOST: ProductPageProps = {
  name: "WizBoost™",
  role: "The Amplifier",
  tagline: "Creator Distribution Engine",
  headline: "Your video is ready — now let the world see it",
  subheadline: "WizBoost™ connects your finished video to real viewers, creators, and fans — amplifying your reach across platforms automatically and growing your audience while you create.",
  logo: `${CDN}/wizboost-logo-new_93f2b48b.png`,
  accentFrom: "from-orange-300",
  accentTo: "to-red-300",
  accentGlow: "rgba(249,115,22,0.25)",
  borderColour: "border-orange-500/30",
  bgColour: "bg-orange-500/5",
  badgeClass: "text-orange-300 bg-orange-500/10 border-orange-500/25",
  ctaHref: WIZVIDEO_STUDIO_PAGE,
  ctaLabel: "Boost Your Video",
  whatItDoes: "WizBoost™ is the distribution and growth layer of WIZ AI. After your video is rendered by WizGenesis™, WizBoost™ helps you reach your audience — connecting your content to the WIZ AI creator network, optimising it for platform algorithms, and tracking performance across channels.",
  capabilities: [
    "Multi-platform distribution (YouTube, Instagram, TikTok)",
    "Creator network amplification and cross-promotion",
    "Audience growth analytics and insights",
    "Platform-optimised export formats and metadata",
    "Hashtag and SEO optimisation for discoverability",
    "Performance tracking across all distribution channels",
  ],
  howItWorks: [
    { num: "01", icon: "check-circle", title: "Video completed", desc: "Your video is rendered and ready by WizGenesis™ — WizBoost™ takes it from here." },
    { num: "02", icon: "settings", title: "Platform optimisation", desc: "WizBoost optimises your video's metadata, format, and thumbnail for each target platform." },
    { num: "03", icon: "send", title: "Distribution launched", desc: "Your video is distributed to your connected platforms and amplified through the creator network." },
    { num: "04", icon: "bar-chart", title: "Performance tracked", desc: "Analytics track views, engagement, and growth across all platforms in real time." },
  ],
  benefits: [
    { title: "Reach beyond your followers", desc: "WizBoost connects your content to the WIZ AI creator network for cross-promotion and discovery." },
    { title: "Platform-native optimisation", desc: "Each platform gets a version of your video optimised for its algorithm and format requirements." },
    { title: "Growth while you create", desc: "WizBoost works in the background — your audience grows while you focus on making more content." },
    { title: "Real-time analytics", desc: "Track performance across YouTube, Instagram, and TikTok from a single WIZ AI dashboard." },
    { title: "SEO and discoverability", desc: "Automatic hashtag and metadata optimisation ensures your content is found by the right audience." },
    { title: "Creator network access", desc: "Join a network of WIZ AI creators for collaboration, cross-promotion, and shared growth." },
  ],
  keyFeatures: [
    { icon: "settings", title: "Platform-Specific Optimisation", desc: "Automatically reformats, re-encodes, and adjusts aspect ratio for YouTube, Instagram Reels, TikTok, and X — each platform gets its own optimised version." },
    { icon: "bar-chart", title: "Real-Time Performance Analytics", desc: "Tracks views, watch time, engagement rate, and audience retention across all connected platforms in a single unified dashboard." },
    { icon: "send", title: "One-Click Multi-Platform Distribution", desc: "Publish to all connected platforms simultaneously with a single click — no manual uploading, no format juggling, no missed platforms." },
    { icon: "zap", title: "AI Thumbnail Generation", desc: "Generates multiple platform-optimised thumbnail options from your video's best frames, with title overlay and branding applied automatically." },
    { icon: "cpu", title: "SEO Metadata Engine", desc: "Generates titles, descriptions, tags, and hashtags optimised for each platform's search algorithm — based on your video's content and target audience." },
    { icon: "star", title: "Creator Network Amplification", desc: "Connects your video to the WIZ AI creator network for cross-promotion, collaboration opportunities, and organic reach amplification." },
  ],
  heroImage: HERO_IMGS.wizboost,
  related: ALL_RELATED.filter(r => r.name !== "WizBoost™"),
};

// ─── WizScript ───────────────────────────────────────────────────────────────
const WIZSCRIPT: ProductPageProps = {
  name: "WizScript™",
  role: "The Storyteller",
  tagline: "AI Script & Storyboard Engine",
  headline: "From plain text to a fully-structured video script",
  subheadline: "WizScript™ transforms your idea — a single sentence, a concept, a topic — into a scene-by-scene video script with dialogue, visual direction, and storyboard panels, ready for WizGenesis™ to build.",
  logo: "/manus-storage/wizscript-logo-v1_df85b4ab.png",
  accentFrom: "from-violet-400",
  accentTo: "to-purple-600",
  accentGlow: "rgba(139,92,246,0.25)",
  borderColour: "border-violet-500/30",
  bgColour: "bg-violet-500/5",
  badgeClass: "text-violet-300 bg-violet-500/10 border-violet-500/25",
  ctaHref: WIZSCRIPT_STUDIO_PAGE,
  ctaLabel: "Write Your First Script",
  whatItDoes: "WizScript™ is the creative intelligence layer of WIZ AI. It takes your raw idea — a sentence, a topic, or a mood — and structures it into a complete, production-ready video script. Each scene is defined with visual direction, dialogue, and timing, giving WizGenesis™ everything it needs to build your video automatically.",
  capabilities: [
    "Plain-text to full video script in seconds",
    "Scene-by-scene structure with dialogue and visual direction",
    "Automatic storyboard panel generation",
    "Genre and tone customisation (cinematic, documentary, social, educational)",
    "Character voice and style consistency across scenes",
    "Direct handoff to WizGenesis\u2122 for final build",
  ],
  howItWorks: [
    { num: "01", icon: "edit", title: "Describe your idea", desc: "Type a sentence, a concept, or a topic. WizScript™ understands tone, genre, and intent from plain language." },
    { num: "02", icon: "cpu", title: "AI structures the script", desc: "WizScript™ generates a full scene-by-scene script with dialogue, visual cues, and timing for every scene." },
    { num: "03", icon: "image", title: "Storyboard generated", desc: "Each scene is visualised as a storyboard panel — giving you a preview of the final video before building begins." },
    { num: "04", icon: "zap", title: "Hand off to WizGenesis™", desc: "Your completed script and storyboard are sent directly to WizGenesis™ for full cinematic video building." },
  ],
  benefits: [
    { title: "No writing experience needed", desc: "WizScript™ does the creative heavy lifting — you just describe your idea and it builds the full script." },
    { title: "Consistent character voices", desc: "Characters maintain their tone, style, and dialogue patterns across every scene in your script." },
    { title: "Genre-aware storytelling", desc: "WizScript™ adapts its structure and language to match your chosen genre — cinematic, educational, social, or documentary." },
    { title: "Storyboard preview", desc: "See every scene visualised before building — so you can edit, reorder, or regenerate individual scenes." },
    { title: "Scene-level control", desc: "Edit any individual scene, regenerate specific sections, or override dialogue — full creative control at every step." },
    { title: "Seamless WizGenesis™ handoff", desc: "Your script flows directly into WizGenesis™ with no manual setup — from idea to finished video in one workflow." },
  ],
  keyFeatures: [
    { icon: "edit", title: "Plain-Text Script Generation", desc: "Converts a single sentence or concept into a fully structured video script with scenes, dialogue, and visual direction — no writing experience required." },
    { icon: "image", title: "Automatic Storyboard Panels", desc: "Generates a visual storyboard panel for every scene, giving you a cinematic preview of your video before building begins." },
    { icon: "cpu", title: "Genre & Tone Intelligence", desc: "Adapts script structure, language, and pacing to match your chosen genre — cinematic drama, educational explainer, social short, or documentary." },
    { icon: "settings", title: "Scene-Level Editing", desc: "Edit, regenerate, or reorder individual scenes without rewriting the entire script — full granular control over every part of your story." },
    { icon: "star", title: "Character Voice Consistency", desc: "Maintains consistent character voices, dialogue styles, and personality traits across all scenes for a coherent, professional narrative." },
    { icon: "zap", title: "WizGenesis™ Integration", desc: "Scripts flow directly into WizGenesis™ for building — no manual export, no format conversion, no setup. One click from script to final video." },
  ],
  heroImage: HERO_IMGS.wizscript,
  related: ALL_RELATED.filter(r => r.name !== "WizCreate™"),
};

// ─── WizPilot ─────────────────────────────────────────────────────────────────
const WIZPILOT: ProductPageProps = {
  name: "WizPilot™",
  role: "The Orchestrator",
  tagline: "AI Workflow Automation Engine",
  headline: "One prompt. A complete video. Fully automated.",
  subheadline: "WizPilot™ is the intelligent automation layer of WIZ AI — it takes your idea and orchestrates every step of the creation pipeline automatically, from storyboard to final build, without a single manual handoff.",
  logo: `${CDN}/wizgenesis-logo-new_9814b3d1.png`,
  accentFrom: "from-fuchsia-400",
  accentTo: "to-pink-600",
  accentGlow: "rgba(217,70,239,0.25)",
  borderColour: "border-fuchsia-500/30",
  bgColour: "bg-fuchsia-500/5",
  badgeClass: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/25",
  ctaHref: WIZPILOT_STUDIO_PAGE,
  ctaLabel: "Launch WizPilot™",
  whatItDoes: "WizPilot™ is the automation intelligence of WIZ AI. You describe your vision — a track, a concept, a style — and WizPilot™ orchestrates the entire creation pipeline automatically. WizCreate™ builds the storyboard, WizAnimate™ generates the animation, WizSync™ locks the audio, WizSound™ enhances the mix, WizLumina™ grades the visuals, WizGenesis\u2122 builds the final output. No manual steps. No handoffs. One prompt to finished video.",
  capabilities: [
    "End-to-end automated video production from a single prompt",
    "Intelligent pipeline orchestration across all WIZ AI modules",
    "Free storyboard generation — credits only charged on final build",
    "Unlimited storyboard regenerations before committing",
    "Style selection: Cinematic, Anime, 3D, Documentary, Neon Noir, and more",
    "Real-time progress tracking across every pipeline stage",
  ],
  howItWorks: [
    { num: "01", icon: "wand", image: CARD_IMGS.script, title: "Describe your vision", desc: "Type a prompt, upload a track, or describe your concept. WizPilot™ understands tone, genre, and intent from plain language." },
    { num: "02", icon: "layout", image: CARD_IMGS.storyboard, title: "Free storyboard generated", desc: "WizCreate™ builds a complete scene-by-scene storyboard automatically — free, with unlimited regenerations until it's right." },
    { num: "03", icon: "cpu", image: CARD_IMGS.pilot, title: "Pipeline orchestrated", desc: "On approval, WizPilot™ triggers the full pipeline: animation, audio sync, enhancement, visual grading, and final build — all automated." },
    { num: "04", icon: "download", image: CARD_IMGS.videoRender, title: "Finished video delivered", desc: "Your completed video is delivered in HD or 4K, ready to download, share, or publish — no editing required." },
  ],
  benefits: [
    { title: "Zero manual handoffs", desc: "WizPilot™ orchestrates every module automatically — you never need to move files, adjust settings, or manage the pipeline yourself." },
    { title: "Free storyboard, always", desc: "Every project starts with a free AI storyboard — see your video before you commit a single credit." },
    { title: "Unlimited creative iterations", desc: "Regenerate your storyboard as many times as you need until the vision is exactly right — no cost until you build your final video." },
    { title: "10 visual styles", desc: "Choose from Cinematic, Anime, Stylised 3D, Documentary, Neon Noir, Epic Fantasy, Vintage, and more — applied consistently across every scene." },
    { title: "Real-time progress", desc: "Track every stage of your video's creation in real time — from storyboard approval through to final build delivery." },
    { title: "Beginner to professional", desc: "No video editing experience required. WizPilot™ handles every technical decision so you can focus entirely on your creative vision." },
  ],
  keyFeatures: [
    { icon: "wand", image: CARD_IMGS.script, title: "One-Prompt Video Creation", desc: "Describe your concept in plain language and WizPilot™ builds the entire video — storyboard, animation, audio, grading, and build — automatically." },
    { icon: "cpu", image: CARD_IMGS.pilot, title: "Full Pipeline Orchestration", desc: "Coordinates WizCreate™, WizAnimate™, WizSync™, WizSound™, WizLumina™, and WizGenesis™ in sequence — zero manual steps between modules." },
    { icon: "sparkles", image: CARD_IMGS.storyboard, title: "Free Storyboard Every Time", desc: "Every project starts with a free AI-generated storyboard. Regenerate unlimited times before committing credits to the final build." },
    { icon: "film", image: CARD_IMGS.animation, title: "10 Cinematic Visual Styles", desc: "From Hollywood Cinematic to Anime, Neon Noir to Epic Fantasy — WizPilot™ applies your chosen style consistently across every scene." },
    { icon: "eye", image: CARD_IMGS.aiBrain, title: "Real-Time Pipeline Tracking", desc: "Watch your video being built in real time — each pipeline stage updates live so you always know exactly where your creation is." },
    { icon: "zap", image: CARD_IMGS.score, title: "Credits Only on Build", desc: "Storyboard generation and all regenerations are completely free. Credits are only deducted when you approve and trigger the final build." },
  ],
  heroImage: HERO_IMGS.wizpilot,
  related: ALL_RELATED.filter(r => r.name !== "WizPilot™"),
};

// ─── WizSync Product Info ──────────────────────────────────────────────────────
const WIZSYNC_INFO: ProductPageProps = {
  name: "WizSync™",
  role: "The Conductor",
  tagline: "Audio-Visual Synchronisation Engine",
  headline: "Every beat locked. Every cut perfect.",
  subheadline: "WizSync™ is the synchronisation intelligence of WIZ AI — it analyses your audio at a molecular level and locks every visual cut, character movement, and scene transition to the exact rhythm of your track.",
  logo: `${CDN}/wizsync-logo-new_9563f007.png`,
  accentFrom: "from-purple-400",
  accentTo: "to-indigo-600",
  accentGlow: "rgba(147,51,234,0.25)",
  borderColour: "border-purple-500/30",
  bgColour: "bg-purple-500/5",
  badgeClass: "text-purple-300 bg-purple-500/10 border-purple-500/25",
  ctaHref: WIZSYNC_STUDIO_PAGE,
  ctaLabel: "Try WizSync™",
  whatItDoes: "WizSync™ analyses your audio track at the waveform level — detecting beats, tempo changes, energy peaks, and speaker voices — then maps every visual element to the audio timeline with frame-perfect precision. The result is a video where every cut, every movement, and every transition feels intentional and musically driven.",
  capabilities: [
    "Beat-perfect audio-to-visual synchronisation",
    "Speaker diarisation — identifies and separates individual voices",
    "Character-to-voice assignment for multi-speaker tracks",
    "Instrument stem separation for layered audio analysis",
    "Automatic scene cut timing aligned to musical energy",
    "Frame-accurate lip-sync preparation for character animation",
  ],
  howItWorks: [
    { num: "01", icon: "upload", image: CARD_IMGS.audioUpload, title: "Upload your audio", desc: "Upload any audio track — music, voiceover, or mixed audio. WizSync™ accepts all standard formats." },
    { num: "02", icon: "cpu", image: CARD_IMGS.aiBrain, title: "AI analyses the track", desc: "WizSync™ detects beats, tempo, energy peaks, and individual speaker voices across the entire track." },
    { num: "03", icon: "music", image: CARD_IMGS.character, title: "Characters assigned", desc: "Detected voices are automatically assigned to characters — with manual override available for full creative control." },
    { num: "04", icon: "film", image: CARD_IMGS.sync, title: "Sync map generated", desc: "A precise audio-visual sync map is generated and passed to WizAnimate™ and WizGenesis™ for beat-locked building." },
  ],
  benefits: [
    { title: "Frame-perfect synchronisation", desc: "Every visual cut and character movement is timed to the exact frame — not approximated, not averaged. Precisely locked." },
    { title: "Multi-speaker support", desc: "WizSync™ identifies and separates individual voices in a track, assigning each to a specific character for accurate lip-sync animation." },
    { title: "Automatic beat detection", desc: "No manual timeline editing required. WizSync™ maps your audio's rhythm automatically and applies it across every visual element." },
    { title: "Stem separation", desc: "Separates your track into individual instrument and vocal stems, enabling precise per-element synchronisation for complex audio." },
    { title: "Energy-aware scene cuts", desc: "Scene transitions are placed at energy peaks and musical moments — creating a video that feels emotionally in sync with the music." },
    { title: "Pipeline integration", desc: "WizSync™ output flows directly into WizAnimate™ and WizGenesis™ — no manual export or timeline adjustment needed." },
  ],
  keyFeatures: [
    { icon: "music", title: "Beat-Perfect Visual Locking", desc: "Analyses your track at the waveform level and locks every visual cut, movement, and transition to the exact beat — frame-accurate, every time." },
    { icon: "cpu", title: "Speaker Diarisation", desc: "Identifies and separates individual voices in a mixed audio track, assigning each speaker to a specific character for precise lip-sync animation." },
    { icon: "layers", title: "Instrument Stem Separation", desc: "Separates your audio into individual instrument and vocal stems, enabling per-element synchronisation for complex, layered tracks." },
    { icon: "film", title: "Energy-Aware Scene Timing", desc: "Places scene cuts and transitions at musical energy peaks — so your video feels emotionally driven by the music, not just technically aligned." },
    { icon: "settings", title: "Manual Override Controls", desc: "Review auto-assigned character-voice pairings and override any assignment with full manual control — precision without rigidity." },
    { icon: "arrow-right-circle", title: "Pipeline-Ready Sync Map", desc: "Generates a complete audio-visual sync map that flows directly into WizAnimate™ and WizGenesis™ — no manual timeline work required." },
  ],
  heroImage: HERO_IMGS.wizsync,
  related: ALL_RELATED.filter(r => r.name !== "WizSync™"),
};

// ─── WizScore ─────────────────────────────────────────────────────────────────
const WIZSCORE_INFO: ProductPageProps = {
  name: "WizScore™",
  role: "The Composer",
  tagline: "AI Video-to-Music Engine",
  headline: "Your video. Its perfect soundtrack. Instantly.",
  subheadline: "WizScore™ analyses your video's mood, pacing, and emotional arc — then composes an original, perfectly synchronised soundtrack that feels like it was written specifically for your footage.",
  logo: `${CDN}/wizaudio-logo-v1_f428aad0.png`,
  accentFrom: "from-teal-400",
  accentTo: "to-cyan-600",
  accentGlow: "rgba(20,184,166,0.25)",
  borderColour: "border-teal-500/30",
  bgColour: "bg-teal-500/5",
  badgeClass: "text-teal-300 bg-teal-500/10 border-teal-500/25",
  ctaHref: WIZSCORE_STUDIO_PAGE,
  ctaLabel: "Score Your Video",
  whatItDoes: "WizScore™ reverses the traditional music video workflow. Instead of fitting visuals to music, WizScore™ analyses your existing video — its pacing, mood, energy, and emotional arc — and composes an original AI soundtrack that is perfectly synchronised to your footage. The result is a track that feels composed specifically for your video, not retrofitted to it.",
  capabilities: [
    "AI-composed original soundtracks from video analysis",
    "Mood, pacing, and energy detection from video content",
    "Genre selection: Cinematic, Electronic, Orchestral, Ambient, Hip-Hop, and more",
    "Tempo and beat synchronisation to video pacing",
    "Emotional arc mapping — music builds and resolves with your footage",
    "Instant download of the generated soundtrack",
  ],
  howItWorks: [
    { num: "01", icon: "upload", image: CARD_IMGS.videoRender, title: "Upload your video", desc: "Upload any video file. WizScore™ accepts all standard formats and analyses the content automatically." },
    { num: "02", icon: "eye", image: CARD_IMGS.aiBrain, title: "AI analyses mood & pacing", desc: "WizScore™ analyses your video's visual energy, pacing, emotional tone, and scene transitions to understand its musical needs." },
    { num: "03", icon: "music", image: CARD_IMGS.musicNotes, title: "Soundtrack composed", desc: "An original AI soundtrack is composed in your chosen genre — timed precisely to your video's pacing and emotional arc." },
    { num: "04", icon: "download", image: CARD_IMGS.score, title: "Download & publish", desc: "Preview the generated soundtrack, download the audio file, and add it to your video — ready to publish." },
  ],
  benefits: [
    { title: "Original, royalty-free music", desc: "Every WizScore™ soundtrack is an original AI composition — not a library track. Fully royalty-free for commercial use." },
    { title: "Emotionally intelligent scoring", desc: "WizScore™ maps the emotional arc of your footage and composes music that builds, resolves, and responds to your video's story." },
    { title: "No music production skills needed", desc: "You don't need to know anything about music theory, tempo, or mixing. WizScore™ handles every creative and technical decision." },
    { title: "Multiple genre options", desc: "Choose from Cinematic, Electronic, Orchestral, Ambient, Hip-Hop, Jazz, and more — or let WizScore™ select the best genre for your footage." },
    { title: "Instant generation", desc: "Your soundtrack is generated in seconds — no waiting, no back-and-forth with a composer, no licensing negotiations." },
    { title: "Perfect sync, always", desc: "The generated music is timed precisely to your video's pacing — scene cuts, energy peaks, and emotional moments are all musically marked." },
  ],
  keyFeatures: [
    { icon: "eye", title: "Video Mood & Energy Analysis", desc: "Analyses your footage's visual energy, pacing, scene transitions, and emotional tone to understand exactly what kind of music it needs." },
    { icon: "music", title: "Original AI Composition", desc: "Composes a fully original soundtrack — not a library track — that is written specifically for your video's emotional arc and pacing." },
    { icon: "film", title: "Emotional Arc Mapping", desc: "Maps the emotional journey of your footage and composes music that builds, resolves, and responds to every key moment in your video." },
    { icon: "star", title: "Multi-Genre Intelligence", desc: "Choose from Cinematic, Electronic, Orchestral, Ambient, Hip-Hop, Jazz, and more — or let WizScore™ select the perfect genre automatically." },
    { icon: "zap", title: "Frame-Accurate Tempo Sync", desc: "The generated soundtrack is timed to your video's exact pacing — scene cuts and energy peaks are musically marked with precision." },
    { icon: "download", title: "Instant Royalty-Free Download", desc: "Every generated soundtrack is fully royalty-free for commercial use — download and publish immediately, no licensing required." },
  ],
  heroImage: HERO_IMGS.wizscore,
  related: ALL_RELATED.filter(r => r.name !== "WizScore™"),
};

// ─── Page exports ─────────────────────────────────────────────────────────────

export function WizCreatePage() {
  return <ProductPageTemplate {...WIZCREATE} />;
}

export function WizAnimatePage() {
  return <ProductPageTemplate {...WIZANIMATE} />;
}

export { default as WizSoundPage } from "./WizSoundProductPage";

export function WizLuminaPage() {
  return <ProductPageTemplate {...WIZLUMINA} />;
}

export function WizGenesisPage() {
  return <ProductPageTemplate {...WIZGENESIS} />;
}

export function WizBoostPage() {
  return <ProductPageTemplate {...WIZBOOST} />;
}

export function WizScriptPage() {
  return <ProductPageTemplate {...WIZSCRIPT} />;
}

export function WizPilotPage() {
  return <ProductPageTemplate {...WIZPILOT} />;
}

export function WizSyncInfoPage() {
  return <ProductPageTemplate {...WIZSYNC_INFO} />;
}

export function WizScoreInfoPage() {
  return <ProductPageTemplate {...WIZSCORE_INFO} />;
}

// ─── WizShorts ────────────────────────────────────────────────────────────────
const WIZSHORTS: ProductPageProps = {
  name: "WizShorts™",
  role: "The Short-Form Creator",
  tagline: "AI Short-Form Video Creator",
  headline: "Create viral short-form videos with AI",
  subheadline: "WizShorts™ generates polished 9:16 short-form videos for YouTube Shorts, Instagram Reels, and TikTok — from a topic or script, in minutes.",
  logo: `${CDN}/wizshorts-logo-v1_533db978.png`,
  accentFrom: "from-orange-400",
  accentTo: "to-red-500",
  accentGlow: "rgba(249,115,22,0.25)",
  borderColour: "border-orange-500/30",
  bgColour: "bg-orange-500/5",
  badgeClass: "text-orange-300 bg-orange-500/10 border-orange-500/25",
  ctaHref: WIZSHORTS_STUDIO_PAGE,
  ctaLabel: "Create a Short",
  whatItDoes: "WizShorts™ is WIZ AI's short-form video creation engine. It takes a topic, script, or concept and generates a complete 9:16 vertical video — with AI-generated scenes, optional music, and polished transitions — ready to publish on YouTube Shorts, Instagram Reels, or TikTok.",
  capabilities: [
    "9:16 vertical video output for Shorts, Reels, and TikTok",
    "Topic or script-driven scene generation",
    "3–6 AI-generated scenes per video",
    "Optional music track integration",
    "Cinematic transitions and motion",
    "Direct download as MP4",
  ],
  howItWorks: [
    { num: "01", icon: "edit", image: CARD_IMGS.script, title: "Enter your topic or script", desc: "Describe your video topic or paste a script. WizShorts™ structures it into scenes automatically." },
    { num: "02", icon: "cpu", image: CARD_IMGS.aiBrain, title: "AI generates scenes", desc: "Each scene is generated as a 5–10 second video clip using WIZ AI's video engine." },
    { num: "03", icon: "music", image: CARD_IMGS.musicNotes, title: "Music added (optional)", desc: "Add an AI-generated music track or upload your own audio to accompany the video." },
    { num: "04", icon: "download", image: CARD_IMGS.shorts, title: "Download and publish", desc: "Your completed short-form video is assembled and ready to download and publish." },
  ],
  benefits: [
    { title: "Built for short-form platforms", desc: "9:16 vertical output is optimised for YouTube Shorts, Instagram Reels, and TikTok from the start." },
    { title: "No editing skills required", desc: "WizShorts™ handles scene generation, transitions, and assembly — you just provide the concept." },
    { title: "Fast production", desc: "A complete short-form video is ready in minutes — not hours." },
    { title: "Multiple scenes per video", desc: "Generate 3–6 scenes per video for a polished, varied visual narrative." },
    { title: "Music integration", desc: "Add an AI-generated music track or your own audio to complete the production." },
    { title: "Direct download", desc: "Download your video as an MP4 file ready for immediate publishing." },
  ],
  keyFeatures: [
    { icon: "film", image: CARD_IMGS.shorts, title: "9:16 Vertical Video Output", desc: "Every WizShorts™ video is generated in 9:16 vertical format — optimised for YouTube Shorts, Instagram Reels, and TikTok." },
    { icon: "cpu", image: CARD_IMGS.aiBrain, title: "AI Scene Generation", desc: "Each scene is generated using WIZ AI's video engine — cinematic quality, short-form pacing." },
    { icon: "music", image: CARD_IMGS.musicNotes, title: "Music Track Integration", desc: "Add an AI-generated music track or upload your own audio to accompany the video." },
    { icon: "edit", image: CARD_IMGS.script, title: "Topic or Script Input", desc: "Describe a topic or paste a script — WizShorts™ structures it into a complete scene plan automatically." },
    { icon: "zap", image: CARD_IMGS.animation, title: "Fast Assembly", desc: "All scenes are assembled with transitions and optional music in a single pass — no manual editing required." },
    { icon: "download", image: CARD_IMGS.videoRender, title: "MP4 Download", desc: "Download your completed short-form video as an MP4 file ready for immediate publishing." },
  ],
  heroImage: HERO_IMGS.wizshorts,
  related: ALL_RELATED.filter(r => r.name !== "WizShorts™"),
};

export function WizShortsPage() {
  return <ProductPageTemplate {...WIZSHORTS} />;
}

// ─── WizPerformer ─────────────────────────────────────────────────────────────
const WIZPERFORMER: ProductPageProps = {
  name: "WizPerformer™",
  role: "The Face",
  tagline: "AI Face-Consistent Performer Engine",
  headline: "Your face. Your character. Every scene.",
  subheadline: "WizPerformer™ uses a single reference photo to generate a consistent AI performer that appears across every scene of your video — with the same face, style, and presence throughout.",
  logo: `${CDN}/wizaudio-logo-v1_f428aad0.png`,
  accentFrom: "from-purple-400",
  accentTo: "to-fuchsia-400",
  accentGlow: "rgba(168,85,247,0.25)",
  borderColour: "border-purple-500/30",
  bgColour: "bg-purple-500/5",
  badgeClass: "text-purple-300 bg-purple-500/10 border-purple-500/25",
  ctaHref: WIZVIDEO_STUDIO_PAGE,
  ctaLabel: "Create Your Video",
  whatItDoes: "WizPerformer™ is WIZ AI's face-consistent character engine. Upload a single reference photo and WizPerformer™ generates a fully animated AI performer that maintains the same face, expression, and identity across every scene — no drift, no inconsistency, no manual work.",
  capabilities: [
    "Face-consistent character generation from a single photo",
    "Consistent appearance across all scenes in a video",
    "Works with all WIZ AI video styles (Cinematic, Anime, 3D)",
    "Privacy-first — photos processed only for your project",
    "Integrates with WizCreate™ storyboard and WizAnimate™",
    "Optional — full WIZ AI pipeline works without a face photo",
  ],
  howItWorks: [
    { num: "01", icon: "upload", image: CARD_IMGS.character, title: "Upload your reference photo", desc: "Upload a clear front-facing photo. WizPerformer™ extracts your facial identity for use across your video." },
    { num: "02", icon: "cpu", image: CARD_IMGS.aiBrain, title: "AI builds your performer", desc: "WizPerformer™ creates a consistent AI character based on your photo — styled to match your chosen visual theme." },
    { num: "03", icon: "film", image: CARD_IMGS.performer, title: "Performer appears in every scene", desc: "Your AI performer is placed into each scene of your video with the same face, proportions, and identity throughout." },
    { num: "04", icon: "check-circle", image: CARD_IMGS.videoRender, title: "Download your video", desc: "Export your completed video with your consistent AI performer featured in every scene." },
  ],
  benefits: [
    { title: "True face consistency", desc: "The same face appears in every scene — no drift, no variation, no uncanny valley inconsistency." },
    { title: "One photo is all you need", desc: "A single clear reference photo is enough to generate a consistent performer across an entire video." },
    { title: "Works with every style", desc: "Cinematic, Anime, 3D Animation — WizPerformer™ adapts your face to any visual style." },
    { title: "Privacy by design", desc: "Your photo is used only for your project. It is never shared, sold, or used for advertising." },
    { title: "Fully optional", desc: "WizPerformer™ is an optional layer — you can create complete videos without uploading any face photo." },
    { title: "No editing required", desc: "WizPerformer™ handles all the character placement and consistency — you just upload and create." },
  ],
  keyFeatures: [
    { icon: "user", title: "Single-Photo Face Capture", desc: "One reference photo is all WizPerformer™ needs to generate a consistent AI performer across your entire video." },
    { icon: "layers", title: "Cross-Scene Identity Lock", desc: "Your performer's face, proportions, and style are locked across every scene — no manual correction needed." },
    { icon: "palette", title: "Multi-Style Adaptation", desc: "WizPerformer™ adapts your face to Cinematic, Anime, 3D Animation, and other visual styles automatically." },
    { icon: "shield", title: "Privacy-First Processing", desc: "Photos are processed exclusively for your project and are never shared, sold, or used outside WIZ AI." },
    { icon: "link", title: "Full Pipeline Integration", desc: "WizPerformer™ feeds directly into WizCreate™, WizAnimate™, and WizSync™ for a seamless end-to-end workflow." },
    { icon: "toggle-right", title: "Fully Optional Module", desc: "WizPerformer™ is an opt-in layer — the full WIZ AI pipeline works without it if you prefer faceless content." },
  ],
  heroImage: `/manus-storage/hero-wizsync_6e1c3369.jpg`,
  related: ALL_RELATED.filter(r => r.name !== "WizSync™"),
};

export function WizPerformerPage() {
  return <ProductPageTemplate {...WIZPERFORMER} />;
}

// ─── WizImage ─────────────────────────────────────────────────────────────────
const WIZIMAGE: ProductPageProps = {
  name: "WizImage™",
  role: "The Canvas",
  tagline: "AI Image Generation Engine",
  headline: "Describe it. Generate it. Own it.",
  subheadline: "WizImage™ turns any text prompt into a stunning, high-resolution AI image in seconds — across cinematic, anime, 3D, abstract, and more visual styles.",
  logo: `${CDN}/wizimage-logo-v1_83c86e5c.png`,
  accentFrom: "from-amber-400",
  accentTo: "to-yellow-300",
  accentGlow: "rgba(196,164,100,0.30)",
  borderColour: "border-amber-500/30",
  bgColour: "bg-amber-500/5",
  badgeClass: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  ctaHref: WIZIMAGE_STUDIO_PAGE,
  ctaLabel: "Generate an Image",
  whatItDoes: "WizImage™ is WIZ AI's image generation engine. Type any description and WizImage™ produces a high-resolution, publication-ready image in your chosen style — from photorealistic cinematic frames to anime illustrations, 3D renders, and abstract art. Every image is yours to download and use.",
  capabilities: [
    "Text-to-image generation in seconds",
    "Multiple visual styles: Cinematic, Anime, 3D, Abstract, Illustration",
    "High-resolution output — publication and print ready",
    "Full gallery of your generated images",
    "Download and own every image you create",
    "2 free credits on sign-up — no card required",
  ],
  howItWorks: [
    { num: "01", icon: "file-text", image: CARD_IMGS.script, title: "Describe your image", desc: "Type a description of what you want to see. Be as specific or as open as you like — WizImage™ handles the rest." },
    { num: "02", icon: "palette", image: CARD_IMGS.imageGen, title: "Choose your style", desc: "Select from Cinematic, Anime, 3D Animation, Abstract, Illustration, and more visual styles." },
    { num: "03", icon: "cpu", image: CARD_IMGS.aiBrain, title: "AI generates your image", desc: "WizImage™ processes your prompt and style choice, generating a high-resolution image in seconds." },
    { num: "04", icon: "download", image: CARD_IMGS.preview, title: "Download and own it", desc: "Your image is saved to your gallery. Download it at any time — full resolution, no watermark." },
  ],
  benefits: [
    { title: "Instant results", desc: "From prompt to finished image in seconds — no waiting, no rendering queue, no experience needed." },
    { title: "Multiple visual styles", desc: "Cinematic, Anime, 3D, Abstract, Illustration — choose the style that fits your project." },
    { title: "High-resolution output", desc: "Every image is generated at high resolution, ready for social media, print, or use inside your videos." },
    { title: "Your gallery, always available", desc: "Every image you generate is saved to your personal gallery — accessible any time, from any device." },
    { title: "2 free credits on sign-up", desc: "Start generating immediately with 2 free credits — no credit card required to try WizImage™." },
    { title: "Use inside your videos", desc: "WizImage™ outputs integrate directly with the WIZ AI video pipeline — use your images as scene visuals." },
  ],
  keyFeatures: [
    { icon: "wand", title: "Text-to-Image Engine", desc: "Type any description and WizImage™ generates a high-resolution image in seconds — no design skills needed.", image: `${CDN}/style-cinematic-1_5b43a687.jpg` },
    { icon: "layers", title: "Multi-Style Generation", desc: "Cinematic, Anime, 3D, Abstract, Illustration — switch styles instantly without rewriting your prompt.", image: `${CDN}/style-anime-1_f617a500.jpg` },
    { icon: "download", title: "Full-Resolution Download", desc: "Every image downloads at full resolution with no watermark — ready for social, print, or video use.", image: `${CDN}/style-3d_2a0c1bee.png` },
    { icon: "eye", title: "Personal Gallery", desc: "All your generated images are saved to your gallery — browse, re-download, or use them in your videos any time.", image: `${CDN}/style-abstract-1_e905ccff.jpg` },
    { icon: "link", title: "Video Pipeline Integration", desc: "WizImage™ outputs connect directly to WizCreate™ and WizAnimate™ — use your images as scene visuals.", image: `${CDN}/creator-content-premium_367d5bb6.jpg` },
    { icon: "zap", title: "2 Free Credits on Sign-Up", desc: "Every new account gets 2 free WizImage™ credits — start generating immediately, no card required.", image: `${CDN}/creator-animator-premium_261e8715.jpg` },
  ],
  heroImage: `${CDN}/showcase-music-video_678b0f1d.jpg`,
  related: ALL_RELATED,
};
export function WizImageProductPage() { return <ProductPageTemplate {...WIZIMAGE} />;
}

// ─── WizVideo (Music Video Landing) ──────────────────────────────────────────
const WIZVIDEO: ProductPageProps = {
  name: "WizVideo™",
  role: "The Director",
  tagline: "AI Music Video Creation Engine",
  headline: "Upload your song. Get a full music video.",
  subheadline: "WizVideo™ transforms any audio track into a complete, scene-by-scene cinematic music video — with AI-generated visuals, lyric sync, style consistency, and a full render in minutes.",
  logo: `${CDN}/wizvideo-logo-v1_9ec37e45.png`,
  accentFrom: "from-blue-400",
  accentTo: "to-indigo-400",
  accentGlow: "rgba(99,102,241,0.25)",
  borderColour: "border-blue-500/30",
  bgColour: "bg-blue-500/5",
  badgeClass: "text-blue-300 bg-blue-500/10 border-blue-500/25",
  ctaHref: WIZVIDEO_STUDIO_PAGE,
  ctaLabel: "Create Your Music Video",
  whatItDoes: "WizVideo™ is WIZ AI's end-to-end music video creation engine. Upload your track — or create music with WizScore™ — and WizVideo™ generates a full scene-by-scene storyboard, animates every scene with AI visuals, syncs cuts to your beats and lyrics, and renders a complete music video ready to publish. No editing skills. No crew. No studio.",
  capabilities: [
    "Upload any audio track or create music with WizScore™",
    "AI storyboard generation — full scene plan from your track",
    "Preview every scene before you commit to rendering",
    "Style-consistent visuals across every scene",
    "Optional face-consistent performer with WizPerformer™",
    "Full render in minutes — 1080p, no watermark",
  ],
  howItWorks: [
    { num: "01", icon: "upload", image: CARD_IMGS.audioUpload, title: "Upload your track", desc: "Upload your audio file or create a new track with WizScore™. WizVideo™ analyses the tempo, lyrics, and mood automatically." },
    { num: "02", icon: "layout", image: CARD_IMGS.storyboard, title: "AI generates your storyboard", desc: "WizCreate™ builds a full scene-by-scene visual plan from your track — every scene timed to your music. Always free to generate." },
    { num: "03", icon: "eye", image: CARD_IMGS.preview, title: "Preview and customise", desc: "Review every scene before rendering. Adjust styles, swap visuals, add a face-consistent performer, or accept the AI plan as-is." },
    { num: "04", icon: "film", image: CARD_IMGS.videoRender, title: "Render your music video", desc: "WizVideo™ animates every scene, syncs cuts to your beats, and renders a complete 1080p music video — ready to download and publish." },
  ],
  benefits: [
    { title: "Storyboard is always free", desc: "Generate a full scene plan for any track at no cost. You only pay when you are ready to render and download." },
    { title: "Preview before you pay", desc: "See every scene before committing to a render — no surprises, no wasted credits." },
    { title: "Style consistency across scenes", desc: "Every scene in your video shares the same visual style, colour palette, and character identity — no jarring cuts." },
    { title: "Lyric and beat sync", desc: "WizSync™ locks every visual cut to your beats and lyric moments — the video feels made for your track." },
    { title: "No editing experience needed", desc: "WizVideo™ handles storyboarding, animation, sync, and rendering — you just describe your vision and upload your track." },
    { title: "From £2 per video", desc: "Render a complete music video from as little as £2. No subscription required to get started." },
  ],
  keyFeatures: [
    { icon: "music", image: CARD_IMGS.audioUpload, title: "Audio Track Upload", desc: "Upload any MP3, WAV, or AAC track. WizVideo™ analyses tempo, mood, and lyrics to build your storyboard automatically." },
    { icon: "layout", image: CARD_IMGS.storyboard, title: "AI Storyboard Engine", desc: "WizCreate™ generates a full scene-by-scene visual plan from your track — timed, structured, and ready to preview." },
    { icon: "eye", image: CARD_IMGS.preview, title: "Scene Preview", desc: "Review every scene before rendering. Adjust styles, swap visuals, or accept the AI plan — full creative control." },
    { icon: "zap", image: CARD_IMGS.sync, title: "Beat and Lyric Sync", desc: "WizSync™ locks every cut to your beats and lyric moments — the video feels purpose-built for your track." },
    { icon: "film", image: CARD_IMGS.videoRender, title: "Full 1080p Render", desc: "WizVideo™ renders a complete, watermark-free 1080p music video — ready to download and publish anywhere." },
    { icon: "user", image: CARD_IMGS.performer, title: "Face-Consistent Performer", desc: "Add WizPerformer™ to feature a consistent AI performer — your face, your character — across every scene." },
  ],
  heroImage: `${CDN}/showcase-music-video_678b0f1d.jpg`,
  related: [
    { name: "WizCreate™", href: "/products/wizcreate", colour: "violet" },
    { name: "WizSync™", href: "/products/wizsync-info", colour: "purple" },
    { name: "WizScore™", href: "/products/wizscore", colour: "teal" },
    { name: "WizPerformer™", href: "/products/wizperformer", colour: "fuchsia" },
    { name: "WizSound™", href: "/products/wizsound", colour: "emerald" },
    { name: "WizLumina™", href: "/products/wizlumina", colour: "amber" },
  ],
};
export function WizVideoLandingPage() {
  return <ProductPageTemplate {...WIZVIDEO} />;
}
