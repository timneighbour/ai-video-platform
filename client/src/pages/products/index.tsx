/**
 * WizVid Product Pages — all 7 modules
 * Routes: /products/wizcreate, /products/wizanimate, /products/wizsound,
 *         /products/wizlumina, /products/wizgenesis, /products/wizboost
 * WizSync has its own dedicated page at /wizsync
 */
import ProductPageTemplate, { ProductPageProps } from "@/components/ProductPageTemplate";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

const ALL_RELATED = [
  { name: "WizCreate™", href: "/products/wizcreate", colour: "violet" },
  { name: "WizAnimate™", href: "/products/wizanimate", colour: "cyan" },
  { name: "WizSync™", href: "/wizsync", colour: "purple" },
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
  subheadline: "WizCreate™ is the intelligence layer of WizVid — it transforms your audio track or text prompt into a fully-structured scene-by-scene visual plan, ready for animation and rendering.",
  logo: `${CDN}/wizcreate-logo-final_9f61f0de.png`,
  accentFrom: "from-violet-300",
  accentTo: "to-purple-300",
  accentGlow: "rgba(139,92,246,0.25)",
  borderColour: "border-violet-500/30",
  bgColour: "bg-violet-500/5",
  badgeClass: "text-violet-300 bg-violet-500/10 border-violet-500/25",
  ctaHref: "/music-video/create",
  ctaLabel: "Start Creating",
  whatItDoes: "WizCreate™ analyses your audio's tempo, mood, and lyrical content — or your text description — and generates a complete cinematic storyboard. Each scene is assigned a visual style, character placement, camera angle, and timing. It's the creative director that never runs out of ideas.",
  capabilities: [
    "AI storyboard generation from audio or text",
    "Scene-by-scene visual direction",
    "Character design and consistency across scenes",
    "Style selection: Cinematic, Anime, Pixar 3D, Documentary",
    "Automatic timing alignment to audio beats",
    "Multi-scene narrative structure",
  ],
  howItWorks: [
    { num: "01", icon: "🎵", title: "Upload or describe", desc: "Upload an audio track or describe your video concept in plain language." },
    { num: "02", icon: "🧠", title: "AI analyses content", desc: "WizCreate analyses mood, tempo, lyrics, and narrative arc to plan the video." },
    { num: "03", icon: "🎬", title: "Storyboard generated", desc: "A complete scene-by-scene storyboard is created with visual direction for each moment." },
    { num: "04", icon: "✅", title: "Review & proceed", desc: "Review the storyboard, make adjustments, then pass it to WizAnimate for production." },
  ],
  benefits: [
    { title: "Zero creative block", desc: "WizCreate generates a complete visual plan in seconds — no storyboarding experience needed." },
    { title: "Style consistency", desc: "Characters, colours, and visual language stay consistent across every scene automatically." },
    { title: "Audio-synced timing", desc: "Every scene cut is timed to the audio — no manual sync work required." },
    { title: "Multiple styles", desc: "Choose from Cinematic, Anime, Pixar 3D, Documentary, or let AI decide based on your track." },
    { title: "Iterative refinement", desc: "Not happy with a scene? Regenerate individual scenes without redoing the whole storyboard." },
    { title: "Feeds the full pipeline", desc: "WizCreate output flows directly into WizAnimate, WizSync, and WizGenesis." },
  ],
  related: ALL_RELATED.filter(r => r.name !== "WizCreate™"),
};

// ─── WizAnimate ───────────────────────────────────────────────────────────────
const WIZANIMATE: ProductPageProps = {
  name: "WizAnimate™",
  role: "The Performer",
  tagline: "Character Animation Engine",
  headline: "Characters that move, feel, and perform",
  subheadline: "WizAnimate™ takes your storyboard and breathes life into every character — generating fluid, beat-matched animation that looks like it was directed by a professional.",
  logo: `https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizanimate-logo-v2_e4d3081b.png`,
  accentFrom: "from-cyan-300",
  accentTo: "to-blue-300",
  accentGlow: "rgba(6,182,212,0.25)",
  borderColour: "border-cyan-500/30",
  bgColour: "bg-cyan-500/5",
  badgeClass: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
  ctaHref: "/wizsync",
  ctaLabel: "Animate Your Video",
  whatItDoes: "WizAnimate™ is the performance engine of WizVid. It takes the storyboard from WizCreate™ and generates character animation that is precisely matched to the audio — every movement, gesture, and expression timed to the beat, mood, and energy of the track.",
  capabilities: [
    "Beat-matched character motion and gestures",
    "Emotion-driven performance (happy, intense, melancholic)",
    "Multi-character scene choreography",
    "Smooth scene transitions and camera movement",
    "Support for 2D, 3D, and mixed animation styles",
    "Works with WizSync™ for lip sync integration",
  ],
  howItWorks: [
    { num: "01", icon: "🎬", title: "Receive storyboard", desc: "WizAnimate receives the scene plan from WizCreate™ with timing and character data." },
    { num: "02", icon: "🎵", title: "Audio analysis", desc: "The audio is analysed for beat, energy, and emotional arc to drive animation decisions." },
    { num: "03", icon: "💃", title: "Animation generated", desc: "Characters are animated with motion that matches the audio's rhythm and emotional tone." },
    { num: "04", icon: "🔗", title: "Passes to WizSync", desc: "Animated scenes are passed to WizSync™ for voice assignment and lip sync generation." },
  ],
  benefits: [
    { title: "Cinematic performance quality", desc: "Animation quality that rivals professional motion capture — generated automatically from audio." },
    { title: "Beat-perfect timing", desc: "Every movement is timed to the audio's beat grid — no manual keyframing required." },
    { title: "Emotional intelligence", desc: "WizAnimate reads the emotional tone of your track and adjusts character performance accordingly." },
    { title: "Multi-character support", desc: "Animate 2, 3, or more characters simultaneously with correct spatial relationships." },
    { title: "Style flexibility", desc: "Works with any visual style — cinematic, anime, 3D, or illustrated." },
    { title: "Seamless pipeline integration", desc: "Output flows directly into WizSync™ for lip sync and WizSound™ for audio enhancement." },
  ],
  related: ALL_RELATED.filter(r => r.name !== "WizAnimate™"),
};

// ─── WizSound ─────────────────────────────────────────────────────────────────
const WIZSOUND: ProductPageProps = {
  name: "WizSound™",
  role: "The Composer",
  tagline: "Cinematic Audio Engine",
  headline: "Hear the difference — studio audio from any track",
  subheadline: "WizSound™ transforms your audio into studio-grade cinematic sound — richer bass, clearer highs, and a fuller, more immersive presence that makes your video feel professional.",
  logo: `${CDN}/wizsound-logo-v5_76ab5163.png`,
  accentFrom: "from-emerald-300",
  accentTo: "to-teal-300",
  accentGlow: "rgba(16,185,129,0.25)",
  borderColour: "border-emerald-500/30",
  bgColour: "bg-emerald-500/5",
  badgeClass: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  ctaHref: "/music-creator",
  ctaLabel: "Create Music Now",
  whatItDoes: "WizSound™ is WizVid's proprietary audio enhancement engine. It applies multi-band compression, harmonic enhancement, spatial widening, and cinematic EQ curves to your audio track — transforming it from a standard recording into a rich, immersive cinematic experience.",
  capabilities: [
    "Multi-band dynamic compression and limiting",
    "Harmonic enhancement for warmth and presence",
    "Spatial widening for immersive stereo field",
    "Cinematic EQ curves (richer bass, clearer highs)",
    "Noise reduction and artefact removal",
    "Automatic loudness normalisation to broadcast standards",
  ],
  howItWorks: [
    { num: "01", icon: "🎵", title: "Audio ingested", desc: "Your audio track is ingested and analysed for frequency content, dynamic range, and noise." },
    { num: "02", icon: "🔊", title: "Enhancement applied", desc: "WizSound applies its proprietary cinematic enhancement chain — EQ, compression, spatial widening." },
    { num: "03", icon: "✨", title: "Quality check", desc: "The enhanced audio is checked against broadcast loudness standards and adjusted." },
    { num: "04", icon: "🎬", title: "Baked into video", desc: "The enhanced audio is baked into the final video render by WizGenesis™." },
  ],
  benefits: [
    { title: "Studio quality without a studio", desc: "WizSound delivers professional audio enhancement that would normally require a mastering engineer." },
    { title: "Richer, fuller sound", desc: "Proprietary harmonic enhancement adds warmth and presence that makes your track feel alive." },
    { title: "Cinematic spatial field", desc: "Stereo widening creates an immersive listening experience that draws viewers in." },
    { title: "Broadcast-ready loudness", desc: "Automatic normalisation ensures your video meets YouTube, Spotify, and streaming platform standards." },
    { title: "Transparent processing", desc: "WizSound enhances without destroying — your original track's character is preserved." },
    { title: "Automatic in the pipeline", desc: "WizSound runs automatically as part of every WizVid render — no manual steps needed." },
  ],
  related: ALL_RELATED.filter(r => r.name !== "WizSound™"),
};

// ─── WizLumina ────────────────────────────────────────────────────────────────
const WIZLUMINA: ProductPageProps = {
  name: "WizLumina™",
  role: "The Cinematographer",
  tagline: "Visual Enhancement Engine",
  headline: "See the difference — cinema-grade visuals from AI video",
  subheadline: "WizLumina™ applies cinematic colour grading, HDR tone mapping, and film-level sharpening to transform flat AI-generated video into rich, vivid, cinema-quality visuals.",
  logo: `${CDN}/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp`,
  accentFrom: "from-amber-300",
  accentTo: "to-yellow-200",
  accentGlow: "rgba(245,158,11,0.25)",
  borderColour: "border-amber-500/30",
  bgColour: "bg-amber-500/5",
  badgeClass: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  ctaHref: "/enhancement-studio",
  ctaLabel: "Enhance Your Video",
  whatItDoes: "WizLumina™ is WizVid's visual post-processing engine. It analyses each frame of your AI-generated video and applies a cinematic enhancement pipeline — colour grading, HDR tone mapping, sharpening, and 4K upscaling — that transforms the output from flat AI imagery into rich, film-quality visuals.",
  capabilities: [
    "Cinematic colour grading with film LUT library",
    "HDR tone mapping for vivid highlights and deep shadows",
    "Film-level sharpening and detail enhancement",
    "4K upscaling using AI super-resolution",
    "Noise reduction and grain management",
    "Automatic scene-by-scene colour consistency",
  ],
  howItWorks: [
    { num: "01", icon: "🎬", title: "Video received", desc: "WizLumina receives the animated video from WizAnimate™ for visual enhancement." },
    { num: "02", icon: "🎨", title: "Colour analysis", desc: "Each scene is analysed for colour temperature, contrast, and visual mood." },
    { num: "03", icon: "✨", title: "Enhancement applied", desc: "Cinematic grading, HDR mapping, sharpening, and upscaling are applied frame by frame." },
    { num: "04", icon: "🎥", title: "Cinema-quality output", desc: "The enhanced video is passed to WizGenesis™ for final rendering and export." },
  ],
  benefits: [
    { title: "From flat to cinematic", desc: "WizLumina transforms the characteristic flatness of AI-generated video into rich, vivid imagery." },
    { title: "HDR-quality depth", desc: "Tone mapping creates the deep shadows and bright highlights that define cinema-quality visuals." },
    { title: "4K upscaling", desc: "AI super-resolution upscales your video to 4K without the blocky artefacts of traditional upscaling." },
    { title: "Film-grade colour", desc: "Professional LUT library with cinematic colour grades used in real film production." },
    { title: "Scene consistency", desc: "WizLumina maintains consistent colour grading across all scenes for a cohesive visual style." },
    { title: "Automatic in the pipeline", desc: "WizLumina runs automatically as part of every WizVid render — no manual colour grading needed." },
  ],
  related: ALL_RELATED.filter(r => r.name !== "WizLumina™"),
};

// ─── WizGenesis ───────────────────────────────────────────────────────────────
const WIZGENESIS: ProductPageProps = {
  name: "WizGenesis™",
  role: "The Renderer",
  tagline: "Final Render Engine",
  headline: "The final act — your video, rendered at studio quality",
  subheadline: "WizGenesis™ is the final stage of the WizVid pipeline. It takes every element — animation, audio, visual enhancement — and renders the complete video at 720p, 1080p, or 4K.",
  logo: `${CDN}/wizgenesis-logo-final-jzVZtHAidTTQv5WxPAdJcz.webp`,
  accentFrom: "from-rose-300",
  accentTo: "to-pink-300",
  accentGlow: "rgba(244,63,94,0.25)",
  borderColour: "border-rose-500/30",
  bgColour: "bg-rose-500/5",
  badgeClass: "text-rose-300 bg-rose-500/10 border-rose-500/25",
  ctaHref: "/music-video/create",
  ctaLabel: "Render Your Video",
  whatItDoes: "WizGenesis™ is the final render engine of WizVid. It combines the animated scenes from WizAnimate™, the enhanced audio from WizSound™, and the graded visuals from WizLumina™ into a single, polished video file — rendered at studio quality and ready for download or distribution.",
  capabilities: [
    "4K, 1080p, and 720p render options",
    "WizSound™ audio baked into final render",
    "WizLumina™ visual enhancement baked in",
    "H.264 and H.265 export formats",
    "Instant download and share links",
    "Batch rendering for multiple scenes",
  ],
  howItWorks: [
    { num: "01", icon: "🔗", title: "All elements assembled", desc: "WizGenesis receives animation, enhanced audio, and graded visuals from the full pipeline." },
    { num: "02", icon: "⚙️", title: "Render settings applied", desc: "Resolution, format, and quality settings are applied based on your selected tier." },
    { num: "03", icon: "🎬", title: "Video rendered", desc: "The complete video is rendered frame by frame at studio quality with all enhancements baked in." },
    { num: "04", icon: "📥", title: "Download & share", desc: "Your finished video is available for instant download and sharing to any platform." },
  ],
  benefits: [
    { title: "Studio-quality output", desc: "WizGenesis renders at the same quality settings used by professional video production studios." },
    { title: "Everything baked in", desc: "WizSound™ audio enhancement and WizLumina™ visual grading are permanently baked into the render." },
    { title: "Multiple resolutions", desc: "Choose 720p for fast delivery, 1080p for standard quality, or 4K for maximum impact." },
    { title: "Fast render times", desc: "Cloud-accelerated rendering means your video is ready in minutes, not hours." },
    { title: "Instant distribution", desc: "Download your video or share directly to YouTube, Instagram, and TikTok from the dashboard." },
    { title: "Archive-quality files", desc: "High-bitrate exports ensure your video looks perfect on any screen or platform." },
  ],
  related: ALL_RELATED.filter(r => r.name !== "WizGenesis™"),
};

// ─── WizBoost ─────────────────────────────────────────────────────────────────
const WIZBOOST: ProductPageProps = {
  name: "WizBoost™",
  role: "The Amplifier",
  tagline: "Creator Distribution Engine",
  headline: "Your video is ready — now let the world see it",
  subheadline: "WizBoost™ connects your finished video to real viewers, creators, and fans — amplifying your reach across platforms automatically and growing your audience while you create.",
  logo: `${CDN}/module-wizboost_ce93c033.png`,
  accentFrom: "from-orange-300",
  accentTo: "to-red-300",
  accentGlow: "rgba(249,115,22,0.25)",
  borderColour: "border-orange-500/30",
  bgColour: "bg-orange-500/5",
  badgeClass: "text-orange-300 bg-orange-500/10 border-orange-500/25",
  ctaHref: "/dashboard",
  ctaLabel: "Go to Dashboard",
  whatItDoes: "WizBoost™ is the distribution and growth layer of WizVid. After your video is rendered by WizGenesis™, WizBoost™ helps you reach your audience — connecting your content to the WizVid creator network, optimising it for platform algorithms, and tracking performance across channels.",
  capabilities: [
    "Multi-platform distribution (YouTube, Instagram, TikTok)",
    "Creator network amplification and cross-promotion",
    "Audience growth analytics and insights",
    "Platform-optimised export formats and metadata",
    "Hashtag and SEO optimisation for discoverability",
    "Performance tracking across all distribution channels",
  ],
  howItWorks: [
    { num: "01", icon: "🎬", title: "Video completed", desc: "Your video is rendered and ready by WizGenesis™ — WizBoost™ takes it from here." },
    { num: "02", icon: "⚡", title: "Platform optimisation", desc: "WizBoost optimises your video's metadata, format, and thumbnail for each target platform." },
    { num: "03", icon: "🚀", title: "Distribution launched", desc: "Your video is distributed to your connected platforms and amplified through the creator network." },
    { num: "04", icon: "📊", title: "Performance tracked", desc: "Analytics track views, engagement, and growth across all platforms in real time." },
  ],
  benefits: [
    { title: "Reach beyond your followers", desc: "WizBoost connects your content to the WizVid creator network for cross-promotion and discovery." },
    { title: "Platform-native optimisation", desc: "Each platform gets a version of your video optimised for its algorithm and format requirements." },
    { title: "Growth while you create", desc: "WizBoost works in the background — your audience grows while you focus on making more content." },
    { title: "Real-time analytics", desc: "Track performance across YouTube, Instagram, and TikTok from a single WizVid dashboard." },
    { title: "SEO and discoverability", desc: "Automatic hashtag and metadata optimisation ensures your content is found by the right audience." },
    { title: "Creator network access", desc: "Join a network of WizVid creators for collaboration, cross-promotion, and shared growth." },
  ],
  related: ALL_RELATED.filter(r => r.name !== "WizBoost™"),
};

// ─── Page exports ─────────────────────────────────────────────────────────────

export function WizCreatePage() {
  return <ProductPageTemplate {...WIZCREATE} />;
}

export function WizAnimatePage() {
  return <ProductPageTemplate {...WIZANIMATE} />;
}

export function WizSoundPage() {
  return <ProductPageTemplate {...WIZSOUND} />;
}

export function WizLuminaPage() {
  return <ProductPageTemplate {...WIZLUMINA} />;
}

export function WizGenesisPage() {
  return <ProductPageTemplate {...WIZGENESIS} />;
}

export function WizBoostPage() {
  return <ProductPageTemplate {...WIZBOOST} />;
}
