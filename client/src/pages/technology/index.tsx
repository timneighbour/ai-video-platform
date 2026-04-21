import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle, Zap, Cpu, Film, Music, Layers, Eye, Mic, Star, Shield, BarChart3, RefreshCw, Upload, Download, Play } from "lucide-react";

const CDN = "/manus-storage";
const WIZAI_LOGO = `${CDN}/wizai-logo-premium-transparent_ac3f550b.png`;

// ─── Shared Technology Page Template ─────────────────────────────────────────

interface TechFeature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface TechStep {
  num: string;
  title: string;
  desc: string;
}

interface TechPageProps {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  ogTitle: string;
  ogDesc: string;
  badge: string;
  headline: string;
  subheadline: string;
  whatItIs: string;
  features: TechFeature[];
  howItWorks: TechStep[];
  capabilities: string[];
  ctaHref: string;
  ctaLabel: string;
  relatedTech: { label: string; href: string }[];
}

function TechnologyPageTemplate({
  slug,
  title,
  metaTitle,
  metaDesc,
  ogTitle,
  ogDesc,
  badge,
  headline,
  subheadline,
  whatItIs,
  features,
  howItWorks,
  capabilities,
  ctaHref,
  ctaLabel,
  relatedTech,
}: TechPageProps) {
  const canonicalUrl = `https://wiz-ai.io/technology/${slug}`;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />
      </Helmet>

      <div className="min-h-screen bg-[#080808] text-white">
        {/* Nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#080808]/90 backdrop-blur-md border-b border-white/[0.06]">
          <a href="/" className="flex items-center gap-2">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-8 w-auto object-contain" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/help" className="hover:text-white transition-colors">Help</a>
          </div>
          <a
            href={ctaHref}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#b8892a] to-[#e8c878] text-black hover:opacity-90 transition-opacity"
          >
            {ctaLabel}
          </a>
        </nav>

        {/* Hero */}
        <section className="relative pt-32 pb-24 px-6 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-[#b8892a]/10 via-transparent to-transparent rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#b8892a]/30 bg-[#b8892a]/10 text-[#e8c878] text-xs font-semibold tracking-widest uppercase mb-8">
              {badge}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              {headline}
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              {subheadline}
            </p>
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-black bg-gradient-to-r from-[#b8892a] to-[#e8c878] hover:opacity-90 transition-opacity shadow-lg shadow-[#b8892a]/20"
            >
              {ctaLabel}
              <ArrowRight size={16} />
            </a>
          </div>
        </section>

        {/* What It Is */}
        <section className="py-16 px-6 border-t border-white/[0.06]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">What is {title}?</h2>
            <p className="text-white/70 text-lg leading-relaxed">{whatItIs}</p>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 px-6 bg-white/[0.02] border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center">Key Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-[#b8892a]/30 hover:bg-[#b8892a]/[0.04] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#b8892a]/15 flex items-center justify-center text-[#e8c878] mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-6 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center">How It Works</h2>
            <div className="space-y-6">
              {howItWorks.map((step, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full border border-[#b8892a]/40 bg-[#b8892a]/10 flex items-center justify-center text-[#e8c878] font-bold text-sm">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities List */}
        <section className="py-16 px-6 bg-white/[0.02] border-t border-white/[0.06]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">What {title} Enables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capabilities.map((cap, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-[#e8c878] flex-shrink-0 mt-0.5" />
                  <span className="text-white/70 text-sm">{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Technology */}
        {relatedTech.length > 0 && (
          <section className="py-16 px-6 border-t border-white/[0.06]">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-white mb-6">Explore More WIZ AI Technology</h2>
              <div className="flex flex-wrap gap-3">
                {relatedTech.map((r, i) => (
                  <a
                    key={i}
                    href={r.href}
                    className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/70 text-sm hover:border-[#b8892a]/40 hover:text-[#e8c878] transition-all"
                  >
                    {r.label}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-24 px-6 border-t border-white/[0.06] text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to experience {title}?
            </h2>
            <p className="text-white/60 mb-8">
              Start creating with WIZ AI and see the technology in action.
            </p>
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-black bg-gradient-to-r from-[#b8892a] to-[#e8c878] hover:opacity-90 transition-opacity shadow-lg shadow-[#b8892a]/20"
            >
              {ctaLabel}
              <ArrowRight size={16} />
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-white/[0.06] text-center text-white/30 text-sm">
          <p>© 2026 WIZ AI. All rights reserved. <a href="/" className="hover:text-white/60 transition-colors">wiz-ai.io</a></p>
        </footer>
      </div>
    </>
  );
}

// ─── All Technology Pages ─────────────────────────────────────────────────────

const ALL_TECH = [
  "/technology/character-consistency",
  "/technology/scene-builder",
  "/technology/lip-sync",
  "/technology/ai-video-engine",
  "/technology/ai-music-engine",
  "/technology/wizsound-engine",
  "/technology/prompt-to-video",
  "/technology/audio-to-video",
  "/technology/storyboard-preview",
  "/technology/4k-rendering",
];

const RELATED_TECH_ALL = ALL_TECH.map((href) => ({
  href,
  label: href.replace("/technology/", "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
}));

function relatedExcluding(slug: string) {
  return RELATED_TECH_ALL.filter((r) => r.href !== `/technology/${slug}`);
}

// ─── 1. Character Consistency ─────────────────────────────────────────────────
export function CharacterConsistencyPage() {
  return (
    <TechnologyPageTemplate
      slug="character-consistency"
      title="Character Consistency"
      metaTitle="Character Consistency Technology | WIZ AI"
      metaDesc="Keep characters visually consistent across every scene with WIZ AI's character lock system. Same face, outfit, and proportions from scene one to the final frame."
      ogTitle="Character Consistency Technology | WIZ AI"
      ogDesc="Keep characters visually consistent across every scene with WIZ AI's character lock system."
      badge="WIZ AI Technology"
      headline="Character Consistency Technology"
      subheadline="Same character. Every scene. No drift, no inconsistency — just cinematic continuity from the first frame to the last."
      whatItIs="Character Consistency is WIZ AI's proprietary system for maintaining a character's visual identity across every scene in a video. It locks the character's facial features, body proportions, clothing, and colour palette so that each generated scene shows the same person, not a different interpretation of them."
      features={[
        { icon: <Shield size={18} />, title: "Character Lock", desc: "Locks facial features, proportions, outfit, and colour palette across all scenes." },
        { icon: <Layers size={18} />, title: "Character Roster", desc: "Manages multiple characters in the same video, keeping each one distinct and consistent." },
        { icon: <RefreshCw size={18} />, title: "Scene-Level Override", desc: "Regenerate individual scenes without losing character consistency in the rest of the video." },
        { icon: <Eye size={18} />, title: "Face Validation", desc: "AI validates each generated frame to confirm the character matches the locked reference." },
        { icon: <Cpu size={18} />, title: "Prompt Anchoring", desc: "Character descriptions are injected into every scene prompt to enforce visual consistency." },
        { icon: <Star size={18} />, title: "Multi-Style Support", desc: "Works across Cinematic, Anime, 3D Animation, and Documentary visual styles." },
      ]}
      howItWorks={[
        { num: "01", title: "Define your character", desc: "Describe your character's appearance, outfit, and visual identity in the storyboard step." },
        { num: "02", title: "Character lock applied", desc: "WIZ AI locks the character description and injects it as a mandatory constraint into every scene prompt." },
        { num: "03", title: "Scenes generated consistently", desc: "Each scene is generated with the locked character profile as a visual anchor — same face, same outfit, same proportions." },
        { num: "04", title: "Face validation check", desc: "AI validates each frame to confirm the character matches the reference before the scene is accepted." },
      ]}
      capabilities={[
        "Consistent facial features across all scenes",
        "Locked outfit and colour palette per character",
        "Multi-character management in a single video",
        "Works with Cinematic, Anime, 3D, and Documentary styles",
        "Scene-level regeneration without losing consistency",
        "AI face validation on every generated frame",
        "Character roster for group scenes",
        "Prop lock for recurring objects and accessories",
      ]}
      ctaHref="/music-video/create"
      ctaLabel="Start Creating"
      relatedTech={relatedExcluding("character-consistency")}
    />
  );
}

// ─── 2. Scene Builder ─────────────────────────────────────────────────────────
export function SceneBuilderPage() {
  return (
    <TechnologyPageTemplate
      slug="scene-builder"
      title="Scene Builder"
      metaTitle="Scene Builder Technology | WIZ AI"
      metaDesc="WIZ AI's Scene Builder generates a complete cinematic scene plan from your audio or text prompt. Every scene gets a visual direction, camera angle, and timing — automatically."
      ogTitle="Scene Builder Technology | WIZ AI"
      ogDesc="Generate a complete cinematic scene plan from your audio or text prompt with WIZ AI's Scene Builder."
      badge="WIZ AI Technology"
      headline="Scene Builder Technology"
      subheadline="From a single prompt or audio track to a fully structured cinematic scene plan — in seconds."
      whatItIs="Scene Builder is the storyboarding intelligence inside WIZ AI. It analyses your audio track or text description and generates a structured scene-by-scene visual plan, assigning camera angles, visual styles, character placements, and timing to each moment of your video."
      features={[
        { icon: <Cpu size={18} />, title: "Audio Analysis", desc: "Analyses BPM, mood, and lyrical content to generate scenes that move with the music." },
        { icon: <Film size={18} />, title: "Visual Direction", desc: "Assigns camera angles, lighting, and visual style to each scene automatically." },
        { icon: <Layers size={18} />, title: "Multi-Scene Structure", desc: "Generates a complete narrative arc with scene transitions and pacing." },
        { icon: <RefreshCw size={18} />, title: "Scene Regeneration", desc: "Regenerate individual scenes without rebuilding the entire storyboard." },
        { icon: <Eye size={18} />, title: "Preview Generation", desc: "Generates a visual preview image for each scene before building begins." },
        { icon: <Zap size={18} />, title: "Text-to-Scene Mode", desc: "No audio? Describe your concept in plain language and Scene Builder creates the full plan." },
      ]}
      howItWorks={[
        { num: "01", title: "Upload audio or describe your concept", desc: "Provide an audio track or a text description of the video you want to create." },
        { num: "02", title: "AI analyses content", desc: "Scene Builder analyses the mood, tempo, narrative arc, and visual potential of your input." },
        { num: "03", title: "Scene plan generated", desc: "A complete scene-by-scene storyboard is created with visual direction, timing, and style for each moment." },
        { num: "04", title: "Review and refine", desc: "Review the scene plan, regenerate individual scenes, and proceed to building when ready." },
      ]}
      capabilities={[
        "Audio-driven scene generation from BPM and mood",
        "Text-to-scene generation from plain language",
        "Camera angle and lighting assignment per scene",
        "Visual style selection: Cinematic, Anime, 3D, Documentary",
        "Automatic timing alignment to audio beats",
        "Scene-level regeneration without full rebuild",
        "Preview image generation per scene",
        "Multi-scene narrative structure with transitions",
      ]}
      ctaHref="/music-video/create"
      ctaLabel="Build Your Storyboard"
      relatedTech={relatedExcluding("scene-builder")}
    />
  );
}

// ─── 3. Lip Sync ──────────────────────────────────────────────────────────────
export function LipSyncPage() {
  return (
    <TechnologyPageTemplate
      slug="lip-sync"
      title="Lip Sync"
      metaTitle="Lip Sync Technology | WIZ AI"
      metaDesc="WIZ AI's Lip Sync technology synchronises character mouth movements to vocals with frame-accurate precision. Every word, every beat — perfectly matched."
      ogTitle="Lip Sync Technology | WIZ AI"
      ogDesc="Frame-accurate lip sync technology that matches character mouth movements to vocals with cinematic precision."
      badge="WIZ AI Technology"
      headline="Lip Sync Technology"
      subheadline="Frame-accurate vocal synchronisation. Every word, every syllable — perfectly matched to your character's performance."
      whatItIs="WIZ AI's Lip Sync technology analyses the vocal track in your audio and generates character mouth movements that are precisely synchronised to every word and syllable. The result is a natural, cinematic performance that feels like a real recording — not an animated approximation."
      features={[
        { icon: <Mic size={18} />, title: "Vocal Analysis", desc: "Analyses the vocal track to detect phonemes, syllables, and timing with millisecond precision." },
        { icon: <Film size={18} />, title: "Frame-Accurate Sync", desc: "Character mouth movements are generated to match the vocal track at the frame level." },
        { icon: <Cpu size={18} />, title: "Multi-Character Support", desc: "Handles multiple characters in the same scene, each synced to their own vocal part." },
        { icon: <Star size={18} />, title: "Style Preservation", desc: "Lip sync works within the chosen visual style — Cinematic, Anime, or 3D Animation." },
        { icon: <Zap size={18} />, title: "Emotion Mapping", desc: "Facial expressions adapt to the emotional tone of the vocal performance." },
        { icon: <Eye size={18} />, title: "Quality Validation", desc: "Each synced frame is validated to ensure natural mouth movement and visual coherence." },
      ]}
      howItWorks={[
        { num: "01", title: "Vocal track analysed", desc: "WIZ AI extracts the vocal track and analyses phonemes, syllables, and timing." },
        { num: "02", title: "Mouth movement generated", desc: "Frame-accurate mouth animations are generated to match every word and syllable." },
        { num: "03", title: "Emotion and expression applied", desc: "Facial expressions adapt to the emotional tone of the vocal performance." },
        { num: "04", title: "Validation and output", desc: "Each synced frame is validated for natural movement before being included in the final build." },
      ]}
      capabilities={[
        "Phoneme-level vocal analysis",
        "Frame-accurate mouth movement generation",
        "Multi-character lip sync in a single scene",
        "Emotion and expression mapping from vocal tone",
        "Works with Cinematic, Anime, and 3D styles",
        "Handles rap, singing, and spoken word",
        "Natural mouth movement validation per frame",
        "Integrates with WizSync for full audio-visual alignment",
      ]}
      ctaHref="/music-video/create"
      ctaLabel="Create Your Video"
      relatedTech={relatedExcluding("lip-sync")}
    />
  );
}

// ─── 4. AI Video Engine ───────────────────────────────────────────────────────
export function AIVideoEnginePage() {
  return (
    <TechnologyPageTemplate
      slug="ai-video-engine"
      title="AI Video Engine"
      metaTitle="AI Video Engine | WIZ AI"
      metaDesc="WIZ AI's AI Video Engine transforms storyboards into cinematic video output. Scene generation, motion, lighting, and building — all powered by advanced AI."
      ogTitle="AI Video Engine | WIZ AI"
      ogDesc="The AI Video Engine that transforms storyboards into cinematic video output — scene generation, motion, and rendering all in one."
      badge="WIZ AI Technology"
      headline="AI Video Engine"
      subheadline="The engine that transforms your storyboard into a fully built cinematic video — scene by scene, frame by frame."
      whatItIs="WIZ AI's AI Video Engine is the production layer of the platform. It takes the structured scene plan from the Scene Builder and generates fully built video output for each scene — applying motion, lighting, camera movement, and visual style to produce cinematic footage that matches the storyboard exactly."
      features={[
        { icon: <Film size={18} />, title: "Scene-to-Video Generation", desc: "Transforms each storyboard scene into a fully built video clip with motion and lighting." },
        { icon: <Cpu size={18} />, title: "Multi-Model Rendering", desc: "Uses Kling AI, Runway ML, Seedance, and Grok Imagine for best-in-class output quality." },
        { icon: <Zap size={18} />, title: "Parallel Processing", desc: "Renders multiple scenes simultaneously to deliver the full video faster." },
        { icon: <Layers size={18} />, title: "Style Consistency", desc: "Applies the chosen visual style consistently across every scene in the video." },
        { icon: <Star size={18} />, title: "Camera Motion", desc: "Adds cinematic camera movements — pans, zooms, dolly shots — to each scene." },
        { icon: <BarChart3 size={18} />, title: "Quality Control", desc: "Each rendered scene is validated for visual quality before assembly." },
      ]}
      howItWorks={[
        { num: "01", title: "Storyboard received", desc: "The AI Video Engine receives the structured scene plan from Scene Builder." },
        { num: "02", title: "Scene generation begins", desc: "Each scene is rendered in parallel using the best AI model for the chosen visual style." },
        { num: "03", title: "Motion and lighting applied", desc: "Camera movements, lighting, and visual effects are applied to each scene." },
        { num: "04", title: "Assembly and output", desc: "All scenes are assembled in sequence, synchronised to the audio, and delivered as a complete video." },
      ]}
      capabilities={[
        "Scene-by-scene video generation from storyboard",
        "Multi-model rendering: Kling AI, Runway ML, Seedance, Grok Imagine",
        "Parallel scene rendering for faster delivery",
        "Cinematic camera movements per scene",
        "Visual style consistency across all scenes",
        "Lighting and atmosphere generation",
        "Scene quality validation before assembly",
        "Full video assembly with audio synchronisation",
      ]}
      ctaHref="/music-video/create"
      ctaLabel="Start Creating"
      relatedTech={relatedExcluding("ai-video-engine")}
    />
  );
}

// ─── 5. AI Music Engine ───────────────────────────────────────────────────────
export function AIMusicEnginePage() {
  return (
    <TechnologyPageTemplate
      slug="ai-music-engine"
      title="AI Music Engine"
      metaTitle="AI Music Engine | WIZ AI"
      metaDesc="WIZ AI's AI Music Engine generates original songs, beats, lyrics, and soundtracks from a text prompt. Full-length tracks, royalty-free, in seconds."
      ogTitle="AI Music Engine | WIZ AI"
      ogDesc="Generate original songs, beats, lyrics, and soundtracks from a text prompt with WIZ AI's AI Music Engine."
      badge="WIZ AI Technology"
      headline="AI Music Engine"
      subheadline="Original songs, beats, and soundtracks — generated from a single prompt. Royalty-free, full-length, and ready to publish."
      whatItIs="WIZ AI's AI Music Engine generates original music from text descriptions. Whether you need a full song with lyrics and vocals, an instrumental beat, a cinematic score, or a short-form audio clip, the AI Music Engine produces broadcast-quality audio that is fully royalty-free and commercially licensed."
      features={[
        { icon: <Music size={18} />, title: "Full Song Generation", desc: "Generates complete songs with vocals, lyrics, melody, and arrangement from a text prompt." },
        { icon: <Cpu size={18} />, title: "Instrumental Mode", desc: "Creates instrumental tracks, beats, and soundtracks without vocals." },
        { icon: <Zap size={18} />, title: "Duration Control", desc: "Generate tracks to an exact duration — from 5 seconds to 10 minutes." },
        { icon: <Star size={18} />, title: "Genre Intelligence", desc: "Supports 20+ genres: Hip-Hop, Pop, Cinematic, Electronic, Jazz, R&B, and more." },
        { icon: <BarChart3 size={18} />, title: "Mood and Energy Control", desc: "Set the mood, energy level, and emotional tone of the generated track." },
        { icon: <Download size={18} />, title: "Royalty-Free Output", desc: "Every generated track is fully royalty-free for commercial use — no licensing required." },
      ]}
      howItWorks={[
        { num: "01", title: "Describe your track", desc: "Enter a text prompt describing the genre, mood, style, and any specific requirements." },
        { num: "02", title: "AI composes the track", desc: "The AI Music Engine generates the melody, arrangement, lyrics, and vocal performance." },
        { num: "03", title: "Duration matching", desc: "The track is trimmed or extended to match your target duration with a natural fade." },
        { num: "04", title: "Download and use", desc: "Download the generated track and use it in your video or publish it directly." },
      ]}
      capabilities={[
        "Full song generation with vocals and lyrics",
        "Instrumental beat and soundtrack generation",
        "Exact duration control from 5s to 10 minutes",
        "20+ genre support including Hip-Hop, Cinematic, Electronic",
        "Mood, energy, and emotional tone control",
        "Royalty-free commercial licence on all output",
        "Sound FX and ambient audio generation",
        "Integration with WizVideo for music video creation",
      ]}
      ctaHref="/music-creator"
      ctaLabel="Create Music"
      relatedTech={relatedExcluding("ai-music-engine")}
    />
  );
}

// ─── 6. WizSound Engine ───────────────────────────────────────────────────────
export function WizSoundEnginePage() {
  return (
    <TechnologyPageTemplate
      slug="wizsound-engine"
      title="WizSound Engine"
      metaTitle="WizSound Engine | WIZ AI"
      metaDesc="WizSound Engine upgrades AI-generated audio to professional-grade quality. Bass enhancement, stereo widening, spatial depth, and cinematic mastering — automatically applied."
      ogTitle="WizSound Engine | WIZ AI"
      ogDesc="WizSound Engine upgrades AI-generated audio to professional-grade quality with cinematic mastering and spatial enhancement."
      badge="WIZ AI Technology"
      headline="WizSound Engine"
      subheadline="Raw AI audio transformed into broadcast-quality, spatially enhanced, cinema-grade sound — automatically."
      whatItIs="The WizSound Engine is WIZ AI's proprietary audio mastering and enhancement layer. It takes raw AI-generated audio and applies a multi-stage processing chain — bass enhancement, stereo widening, spatial depth, dynamic compression, and cinematic reverb — to produce output that sounds like it was mastered in a professional studio."
      features={[
        { icon: <Music size={18} />, title: "Cinematic Mastering", desc: "Multi-stage mastering chain: EQ, compression, limiting, and loudness normalisation." },
        { icon: <Layers size={18} />, title: "Stereo Widening", desc: "Expands the stereo field to create an immersive, wide soundstage." },
        { icon: <Star size={18} />, title: "Spatial Audio", desc: "Adds depth and spatial positioning to instruments and vocals." },
        { icon: <Zap size={18} />, title: "Bass Enhancement", desc: "Enriches low-frequency content for a fuller, more powerful sound." },
        { icon: <BarChart3 size={18} />, title: "Dynamic Control", desc: "Intelligent compression keeps the track punchy and consistent throughout." },
        { icon: <Cpu size={18} />, title: "Three Processing Modes", desc: "Standard, Enhanced, and Cinematic modes for different output requirements." },
      ]}
      howItWorks={[
        { num: "01", title: "Raw audio received", desc: "The WizSound Engine receives the AI-generated audio track." },
        { num: "02", title: "Analysis and profiling", desc: "The audio is analysed for frequency balance, dynamic range, and spatial characteristics." },
        { num: "03", title: "Processing chain applied", desc: "Bass enhancement, stereo widening, spatial depth, compression, and mastering are applied in sequence." },
        { num: "04", title: "Enhanced output delivered", desc: "The processed audio is delivered at broadcast-ready loudness levels." },
      ]}
      capabilities={[
        "Multi-stage cinematic mastering chain",
        "Bass enhancement and low-frequency enrichment",
        "Stereo widening for immersive soundstage",
        "Spatial audio depth and positioning",
        "Dynamic compression and loudness normalisation",
        "Three processing modes: Standard, Enhanced, Cinematic",
        "Works with vocals, instrumentals, and mixed tracks",
        "Broadcast-ready output levels",
      ]}
      ctaHref="/music-creator"
      ctaLabel="Enhance Your Audio"
      relatedTech={relatedExcluding("wizsound-engine")}
    />
  );
}

// ─── 7. Prompt to Video ───────────────────────────────────────────────────────
export function PromptToVideoPage() {
  return (
    <TechnologyPageTemplate
      slug="prompt-to-video"
      title="Prompt to Video"
      metaTitle="Prompt to Video Technology | WIZ AI"
      metaDesc="Turn a text prompt into a complete AI-generated video with WIZ AI. Describe your concept, choose a style, and receive a fully built cinematic video."
      ogTitle="Prompt to Video Technology | WIZ AI"
      ogDesc="Turn a text prompt into a complete AI-generated cinematic video with WIZ AI's Prompt to Video technology."
      badge="WIZ AI Technology"
      headline="Prompt to Video Technology"
      subheadline="Describe your concept in plain language. Receive a fully built cinematic video. No editing skills required."
      whatItIs="Prompt to Video is WIZ AI's text-driven video creation workflow. You describe your video concept in plain language — the story, the style, the mood, the characters — and WIZ AI generates a complete cinematic video from your description. No audio upload required, no storyboarding experience needed."
      features={[
        { icon: <Cpu size={18} />, title: "Natural Language Input", desc: "Describe your video in plain language — no technical prompting knowledge required." },
        { icon: <Film size={18} />, title: "Full Video Output", desc: "Generates a complete multi-scene video, not just a single clip." },
        { icon: <Layers size={18} />, title: "Style Selection", desc: "Choose from Cinematic, Anime, 3D Animation, Documentary, and more." },
        { icon: <Zap size={18} />, title: "Prompt Enhancement", desc: "WizGenesis automatically enhances your prompt for better visual output." },
        { icon: <Star size={18} />, title: "Character Generation", desc: "Characters are generated from your description and kept consistent across scenes." },
        { icon: <Eye size={18} />, title: "Preview Before Render", desc: "Review the storyboard and scene previews before committing to the final video build." },
      ]}
      howItWorks={[
        { num: "01", title: "Write your prompt", desc: "Describe your video concept in plain language — story, characters, style, mood." },
        { num: "02", title: "Prompt enhanced", desc: "WizGenesis enhances your prompt with cinematic direction and visual detail." },
        { num: "03", title: "Storyboard generated", desc: "A complete scene-by-scene storyboard is created from your enhanced prompt." },
        { num: "04", title: "Video rendered", desc: "Each scene is rendered and assembled into a complete cinematic video." },
      ]}
      capabilities={[
        "Natural language video creation",
        "Multi-scene video from a single prompt",
        "Automatic prompt enhancement via WizGenesis",
        "Style selection: Cinematic, Anime, 3D, Documentary",
        "Character generation and consistency",
        "Storyboard preview before building",
        "No audio upload required",
        "Full video output with audio generation option",
      ]}
      ctaHref="/text-to-video"
      ctaLabel="Create from Prompt"
      relatedTech={relatedExcluding("prompt-to-video")}
    />
  );
}

// ─── 8. Audio to Video ────────────────────────────────────────────────────────
export function AudioToVideoPage() {
  return (
    <TechnologyPageTemplate
      slug="audio-to-video"
      title="Audio to Video"
      metaTitle="Audio to Video Technology | WIZ AI"
      metaDesc="Upload a song, beat, or audio track and WIZ AI generates a complete cinematic music video. Audio-driven scene generation, beat-synced cuts, and full video output."
      ogTitle="Audio to Video Technology | WIZ AI"
      ogDesc="Upload an audio track and WIZ AI generates a complete cinematic music video — beat-synced, scene-by-scene."
      badge="WIZ AI Technology"
      headline="Audio to Video Technology"
      subheadline="Upload your track. Receive a complete cinematic music video — beat-synced, scene-by-scene, ready to publish."
      whatItIs="Audio to Video is WIZ AI's music video creation workflow. You upload an audio track — a song, a beat, or any audio file — and WIZ AI analyses the music and generates a complete cinematic video that is synchronised to the audio. Every scene cut, every visual transition, every character movement is timed to the music."
      features={[
        { icon: <Upload size={18} />, title: "Audio Upload", desc: "Upload any audio format: MP3, WAV, M4A, or provide a URL." },
        { icon: <Cpu size={18} />, title: "Music Analysis", desc: "Analyses BPM, mood, energy, and lyrical content to plan the video." },
        { icon: <Film size={18} />, title: "Beat-Synced Cuts", desc: "Every scene cut is timed to the beat for a natural, music-driven edit." },
        { icon: <Layers size={18} />, title: "Full Video Generation", desc: "Generates a complete multi-scene music video from a single audio upload." },
        { icon: <Star size={18} />, title: "Style Selection", desc: "Choose from Cinematic, Anime, 3D Animation, and more visual styles." },
        { icon: <Zap size={18} />, title: "Lyric-Driven Scenes", desc: "Lyrical content influences scene visuals — the video tells the story of the song." },
      ]}
      howItWorks={[
        { num: "01", title: "Upload your audio", desc: "Upload your audio track or provide a URL. WIZ AI accepts all standard audio formats." },
        { num: "02", title: "Music analysed", desc: "BPM, mood, energy, and lyrical content are analysed to plan the video structure." },
        { num: "03", title: "Storyboard generated", desc: "A complete scene plan is created with beat-synced timing and visual direction." },
        { num: "04", title: "Video rendered", desc: "Each scene is rendered and assembled into a complete music video synchronised to your audio." },
      ]}
      capabilities={[
        "Audio upload: MP3, WAV, M4A, URL",
        "BPM and beat detection for scene timing",
        "Mood and energy analysis for visual direction",
        "Lyric-driven scene generation",
        "Beat-synced scene cuts and transitions",
        "Full multi-scene music video output",
        "Style selection: Cinematic, Anime, 3D, Documentary",
        "Character generation and consistency across scenes",
      ]}
      ctaHref="/music-video/create"
      ctaLabel="Create Your Music Video"
      relatedTech={relatedExcluding("audio-to-video")}
    />
  );
}

// ─── 9. Storyboard Preview ────────────────────────────────────────────────────
export function StoryboardPreviewPage() {
  return (
    <TechnologyPageTemplate
      slug="storyboard-preview"
      title="Storyboard Preview"
      metaTitle="Storyboard Preview Technology | WIZ AI"
      metaDesc="Preview your video before you pay with WIZ AI's Storyboard Preview. See every scene, review visual direction, and refine before committing to the final video build."
      ogTitle="Storyboard Preview Technology | WIZ AI"
      ogDesc="Preview every scene of your video before you pay. Review, refine, and approve your storyboard with WIZ AI."
      badge="WIZ AI Technology"
      headline="Storyboard Preview Technology"
      subheadline="See your video before you commit. Review every scene, refine the visual direction, and approve the storyboard — all before the render begins."
      whatItIs="WIZ AI's Storyboard Preview system generates a visual preview image for every scene in your video before the final video build begins. You can review the visual direction, character placement, and scene composition, regenerate any scene you're not happy with, and approve the full storyboard before committing to a build."
      features={[
        { icon: <Eye size={18} />, title: "Scene Preview Images", desc: "A preview image is generated for every scene so you can see the visual direction before building." },
        { icon: <RefreshCw size={18} />, title: "Scene Regeneration", desc: "Regenerate any individual scene without rebuilding the entire storyboard." },
        { icon: <Layers size={18} />, title: "Visual Direction Review", desc: "Review camera angles, character placement, lighting, and style for each scene." },
        { icon: <CheckCircle size={18} />, title: "Approve Before Render", desc: "Approve the full storyboard before committing to the build — no surprises." },
        { icon: <Star size={18} />, title: "Free Preview", desc: "Storyboard previews are always free — you only pay when you're happy and ready to build." },
        { icon: <Cpu size={18} />, title: "Edit Scene Prompts", desc: "Edit the visual direction for any scene and regenerate the preview instantly." },
      ]}
      howItWorks={[
        { num: "01", title: "Storyboard generated", desc: "WIZ AI generates a complete scene plan from your audio or text input." },
        { num: "02", title: "Preview images created", desc: "A preview image is generated for each scene showing the visual direction." },
        { num: "03", title: "Review and refine", desc: "Review each scene preview, regenerate any scenes you want to change, and edit visual directions." },
        { num: "04", title: "Approve and render", desc: "When you're happy with the storyboard, approve it and start the final video build." },
      ]}
      capabilities={[
        "Preview image generation for every scene",
        "Scene-level regeneration without full rebuild",
        "Visual direction editing per scene",
        "Camera angle and lighting preview",
        "Character placement review",
        "Free storyboard preview — pay only to build",
        "Approve storyboard before committing to build",
        "Full storyboard save and resume",
      ]}
      ctaHref="/music-video/create"
      ctaLabel="Preview Your Video Free"
      relatedTech={relatedExcluding("storyboard-preview")}
    />
  );
}

// ─── 10. 4K Rendering ─────────────────────────────────────────────────────────
export function FourKRenderingPage() {
  return (
    <TechnologyPageTemplate
      slug="4k-rendering"
      title="4K Building"
      metaTitle="4K Building & Export Quality | WIZ AI"
      metaDesc="Export your WIZ AI video in Standard, HD, or 4K resolution. Cinema-grade output quality with WizLumina visual enhancement and WizBoost optimisation."
      ogTitle="4K Building & Export Quality | WIZ AI"
      ogDesc="Export in Standard, HD, or 4K with WIZ AI. Cinema-grade output with visual enhancement and quality optimisation."
      badge="WIZ AI Technology"
      headline="4K Building & Export Quality"
      subheadline="Cinema-grade output in Standard, HD, or 4K. Every render is visually enhanced and optimised before delivery."
      whatItIs="WIZ AI's rendering pipeline delivers your completed video in Standard (1080p), HD (1440p), or 4K (2160p) resolution. Every render passes through WizLumina for colour grading and visual enhancement, and WizBoost for output optimisation — ensuring the final video looks as good as possible at every resolution."
      features={[
        { icon: <Film size={18} />, title: "Three Resolution Tiers", desc: "Standard (1080p), HD (1440p), and 4K (2160p) export options." },
        { icon: <Star size={18} />, title: "WizLumina Enhancement", desc: "Colour grading, contrast enhancement, and visual polish applied to every build." },
        { icon: <Zap size={18} />, title: "WizBoost Optimisation", desc: "Output optimisation for sharpness, clarity, and file size efficiency." },
        { icon: <BarChart3 size={18} />, title: "Parallel Rendering", desc: "Multiple scenes rendered simultaneously for faster delivery." },
        { icon: <Download size={18} />, title: "Direct Download", desc: "Download your built video immediately upon completion." },
        { icon: <Cpu size={18} />, title: "Format Options", desc: "MP4 output optimised for YouTube, Instagram, TikTok, and professional delivery." },
      ]}
      howItWorks={[
        { num: "01", title: "Choose your resolution", desc: "Select Standard, HD, or 4K before starting the build." },
        { num: "02", title: "Scenes rendered in parallel", desc: "All scenes are rendered simultaneously using the AI Video Engine." },
        { num: "03", title: "WizLumina enhancement applied", desc: "Colour grading, contrast, and visual polish are applied to every scene." },
        { num: "04", title: "WizBoost optimisation", desc: "The assembled video is optimised for sharpness, clarity, and efficient file size." },
        { num: "05", title: "Download ready", desc: "Your video is delivered as an MP4 file ready for immediate download and publishing." },
      ]}
      capabilities={[
        "Standard (1080p), HD (1440p), and 4K (2160p) export",
        "WizLumina colour grading on every render",
        "WizBoost output optimisation",
        "Parallel scene rendering for faster delivery",
        "MP4 output optimised for all major platforms",
        "Direct download upon render completion",
        "Email notification when video is ready",
        "Render history and re-download from Projects page",
      ]}
      ctaHref="/pricing"
      ctaLabel="View Render Plans"
      relatedTech={relatedExcluding("4k-rendering")}
    />
  );
}
