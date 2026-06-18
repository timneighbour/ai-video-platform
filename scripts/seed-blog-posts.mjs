/**
 * Seed script: publish 6 SEO blog posts directly via DB helper.
 * Run: node scripts/seed-blog-posts.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Load env so DATABASE_URL is available
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

// We call the DB directly — import the compiled server helpers
// Since we can't import TS directly, use the tRPC HTTP endpoint instead.
// This script calls the local dev server's tRPC endpoint as the owner.

import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Get owner user id
const [ownerRows] = await db.query(
  "SELECT id FROM users WHERE openId = ? LIMIT 1",
  [process.env.OWNER_OPEN_ID]
);
const ownerId = ownerRows[0]?.id;
if (!ownerId) {
  console.error("Owner user not found. Make sure you have logged in at least once.");
  process.exit(1);
}
console.log(`Owner user id: ${ownerId}`);

// Ensure owner is admin
await db.query("UPDATE users SET role = 'admin' WHERE id = ?", [ownerId]);
console.log("Owner role set to admin.");

// ── Blog post content ─────────────────────────────────────────────────────────

const posts = [
  {
    title: "How to Make an AI Music Video (Step by Step)",
    slug: "how-to-make-an-ai-music-video",
    excerpt: "A complete beginner's guide to creating a professional AI music video — from uploading your track to downloading the final render.",
    tags: ["tutorial", "music video", "how-to"],
    metaTitle: "How to Make an AI Music Video (Step by Step) | WIZ AI",
    metaDescription: "A complete beginner's guide to creating a professional AI music video — from uploading your track to downloading the final render.",
    content: `## How to Make an AI Music Video (Step by Step)

Making a professional music video used to mean hiring a director, renting equipment, booking locations, and spending weeks in post-production. For most independent musicians, that was simply out of reach. AI music video tools have changed that equation entirely — and not in a superficial way. The output is genuinely cinematic, the process is structured, and the cost is a fraction of a traditional shoot.

This guide walks you through the complete process of making an AI music video using WIZ AI, from the moment you upload your track to the moment you download the finished file.

---

### Why Musicians Are Turning to AI Video Tools

The reasons are practical. A traditional music video shoot costs anywhere from £5,000 to £50,000 depending on production values. AI generation costs a fraction of that and can be completed in hours rather than weeks. There is no camera required, no crew to coordinate, and no location permits to arrange.

Beyond cost, AI video tools give musicians something that was previously impossible without a large budget: full creative control over every scene. You decide the visual style, the character appearances, the mood of each segment. The AI executes your vision rather than replacing it.

---

### Step 1: Upload Your Track

Start at [wiz-ai.io/music-video/create](/music-video/create). Upload your audio file — MP3, WAV, and most standard formats are supported.

Once uploaded, WizGenesis™ begins its analysis. This is the creative intelligence layer that reads your track's structure: it identifies lyric segments, maps beat timing, detects energy shifts between verse, chorus, and bridge, and uses that information to plan a scene-by-scene storyboard. You do not need to provide timestamps or segment labels — WizGenesis™ handles this automatically.

---

### Step 2: Review Your AI-Generated Storyboard

After analysis, WizGenesis™ presents a complete storyboard — one scene per lyric segment, each with a generated visual description. These descriptions are your starting point, not your final answer.

Read through each scene description carefully. If a scene does not match your vision for that section of the song, edit it directly. You can rewrite the prompt, change the setting, adjust the mood, or add specific visual details. The more specific your descriptions, the better the output.

---

### Step 3: Choose Your Visual Style

WIZ AI offers several visual styles that apply consistently across all scenes in your video. The main options include cinematic (high-contrast, film-like), anime (stylised, hand-drawn aesthetic), abstract (non-representational, colour-driven), and documentary (naturalistic, grounded).

Choose the style that fits your genre and audience. Electronic and pop tracks often suit abstract or cinematic styles. Hip hop and R&B tend to work well with cinematic or documentary. Orchestral and classical compositions often benefit from cinematic or abstract treatments.

---

### Step 4: Lock Your Characters with Character Lock™

If your video features a recurring character — a performer, a protagonist, or a visual anchor — use Character Lock™ to define their appearance once and maintain it across every scene.

Upload a reference photo or describe the character in detail. WIZ AI will use that definition to keep the character visually consistent from scene to scene. Without this step, AI-generated characters can drift in appearance between scenes, which breaks the narrative continuity of a music video.

---

### Step 5: Preview and Render

Before committing to a full render, use the Preview Before Download™ feature to review individual scenes. This lets you catch any scenes that need adjustment before spending render credits on the full video.

When you are satisfied with the storyboard and scene previews, start the render. Depending on the length of your track and the number of scenes, rendering typically takes between 10 and 30 minutes. You will receive a notification when the video is ready to download.

---

### Tips for a Better AI Music Video

**Use strong scene contrast.** If every scene has the same setting and lighting, the video becomes monotonous. Vary the environment, the time of day, and the visual energy between verse and chorus.

**Write specific character descriptions.** "A woman with short red hair, wearing a black leather jacket, standing in a rain-soaked alley" produces far better results than "a woman in a city." The AI responds to specificity.

**Match the visual style to the genre.** A cinematic style applied to a lo-fi bedroom pop track can feel mismatched. Think about what your audience expects visually from your genre.

**Edit the storyboard before rendering.** The AI-generated descriptions are a starting point. Spending 15 minutes refining them will produce noticeably better output than accepting the defaults.

---

### Try It Free

WIZ AI includes 50 free credits on signup — enough to create your first full music video without a subscription. No credit card required.

[Create your first AI music video →](/music-video/create)`,
  },
  {
    title: "5 Best AI Music Video Makers in 2025 (Honest Comparison)",
    slug: "best-ai-music-video-makers",
    excerpt: "We compare the top AI music video tools in 2025 — features, pricing, and what each one is actually good at.",
    tags: ["comparison", "music video", "tools"],
    metaTitle: "5 Best AI Music Video Makers in 2025 | WIZ AI",
    metaDescription: "We compare the top AI music video tools in 2025 — features, pricing, and what each one is actually good at.",
    content: `## 5 Best AI Music Video Makers in 2025 (Honest Comparison)

The AI video space has expanded rapidly over the past two years. For musicians, this is both an opportunity and a source of confusion — there are now dozens of tools that claim to generate video from audio, but most of them were not built with music video production in mind. This comparison looks at five tools that are actually being used by musicians in 2025, what each one does well, and where each one falls short.

---

### What Makes a Good AI Music Video Tool?

Before comparing tools, it is worth being clear about what a music video actually requires. A music video is not a collection of unrelated clips — it is a structured narrative that follows the arc of a song, maintains visual consistency across scenes, and ideally responds to the lyric content and energy of the track. Tools that generate impressive isolated clips are not necessarily good at producing a coherent music video.

The key criteria for this comparison are: lyric awareness, character consistency across scenes, UK pricing, free trial availability, and whether the tool produces a complete video output rather than isolated clips.

---

### 1. WIZ AI

**Built specifically for music videos.**

WIZ AI is the only tool in this list designed from the ground up for music video production. The workflow is structured around the song: upload your track, and WizGenesis™ analyses the lyric structure and beat timing to generate a scene-by-scene storyboard. You review and edit the storyboard before rendering, giving you director-level control over the final output.

Character Lock™ maintains consistent character appearances across every scene — a critical feature for any video with a recurring performer or protagonist. WizLumina™ applies cinematic visual polish to the output, and WizSync™ handles lip sync for performance scenes.

**Pricing:** From £29/month. Free trial available — 50 credits on signup, no credit card required.

**Best for:** Musicians who need a complete, structured music video with consistent characters and lyric-aware visuals.

---

### 2. Runway

**Strong video-to-video style transfer, but not designed for music.**

Runway is a capable general-purpose AI video tool with impressive style transfer and motion generation features. It is widely used by filmmakers and visual artists. However, it has no music-specific features: there is no lyric awareness, no beat mapping, no structured storyboard workflow, and no character consistency mechanism across scenes.

For musicians, Runway is most useful as a post-production tool — applying a visual style to existing footage — rather than as a primary music video generator.

**Pricing:** From $12/month (USD). Free tier available with limited credits.

**Best for:** Visual artists and filmmakers who want style transfer on existing footage.

---

### 3. Sora

**Impressive short clips, but no music workflow.**

Sora (OpenAI) generates high-quality short video clips from text prompts. The visual quality is genuinely impressive, and the motion generation is among the best available. However, Sora has no music synchronisation, no storyboard structure, no lyric awareness, and no mechanism for maintaining character consistency across multiple clips.

Producing a full music video with Sora would require generating each clip individually, manually editing them together in a video editor, and adding the audio track separately — a significant amount of work that defeats the purpose of AI automation.

**Pricing:** Available via ChatGPT Plus subscription ($20/month USD).

**Best for:** Short-form visual content and experimental clips.

---

### 4. Kling

**Capable video generation, not designed for music.**

Kling is a strong general-purpose video generation tool with good motion quality and a growing feature set. Like Runway and Sora, it was not designed for music video production: there is no beat matching, no lyric awareness, and no structured workflow for producing a multi-scene video from an audio track.

**Pricing:** Free tier available; paid plans from approximately $8/month USD.

**Best for:** General video generation and short-form content.

---

### 5. Pika Labs

**Fast clip generation, limited narrative structure.**

Pika Labs generates short video clips quickly and is popular for social media content. The output quality is solid for short clips, but the tool has no music-specific workflow, no character consistency across clips, and no structured approach to producing a full-length music video.

**Pricing:** Free tier available; paid plans from approximately $8/month USD.

**Best for:** Short-form social media clips.

---

### Comparison Table

| Feature | WIZ AI | Runway | Sora | Kling | Pika Labs |
|---|---|---|---|---|---|
| Lyric awareness | Yes | No | No | No | No |
| Character consistency | Yes (Character Lock™) | No | No | No | No |
| Full video output | Yes | No | No | No | No |
| UK pricing | From £29/mo | ~£10/mo | ~£16/mo | ~£6/mo | ~£6/mo |
| Free trial | Yes (50 credits) | Yes (limited) | Via ChatGPT Plus | Yes | Yes |
| Music-specific workflow | Yes | No | No | No | No |

---

### Verdict

For musicians who need a complete music video — not just isolated clips — WIZ AI is the only tool in this list built specifically for that workflow. The lyric-aware storyboarding, character consistency, and structured scene-by-scene production process are features that the general-purpose tools simply do not offer.

If you already have footage and want to apply a visual style to it, Runway is a strong choice. If you want high-quality short clips for social media, Pika Labs or Kling are worth exploring. But for a full music video from audio to final render, WIZ AI is the most direct path.

[Start free — no credit card required →](/music-video/create)`,
  },
  {
    title: "How to Make an Animated Music Video with AI (No Drawing Required)",
    slug: "how-to-make-an-animated-music-video-ai",
    excerpt: "No drawing, no animation software, no studio. Here's how to create a professional animated music video using AI in under an hour.",
    tags: ["tutorial", "animation", "music video"],
    metaTitle: "How to Make an Animated Music Video with AI | WIZ AI",
    metaDescription: "No drawing, no animation software, no studio. Here's how to create a professional animated music video using AI in under an hour.",
    content: `## How to Make an Animated Music Video with AI (No Drawing Required)

Animated music videos used to require one of two things: a substantial budget to hire a studio, or years of skill in animation software. Neither option was accessible to most independent musicians. AI has changed that. You can now produce a professional animated music video — with consistent characters, beat-matched scenes, and a polished visual style — without drawing a single frame or learning any animation software.

This guide explains how WizAnimate™ works and walks you through the process of creating an animated music video from scratch.

---

### What WizAnimate™ Does

WizAnimate™ is WIZ AI's character animation studio. It generates beat-matched animated scenes from your audio track, maintaining consistent character appearances across every scene in the video.

The key capabilities are:

**Beat matching.** WizAnimate™ analyses the rhythm and energy of your track and synchronises scene transitions and visual movement to the beat. The result feels musically driven rather than visually arbitrary.

**Consistent animated characters.** Define your character once — their appearance, style, and personality — and WizAnimate™ maintains that definition across every scene. This is what separates a coherent animated music video from a collection of unrelated clips.

**Multiple animation styles.** WizAnimate™ supports several distinct visual styles, including anime (stylised, expressive), Pixar-style (three-dimensional, character-driven), and cinematic animation (detailed, film-quality). Each style produces a noticeably different aesthetic, so choosing the right one for your genre matters.

---

### Step-by-Step: Creating an Animated Music Video

**Step 1: Choose your animation style.**

Before uploading your track, decide on the visual style. Anime works well for electronic, pop, and alternative music — it is expressive and high-energy. Pixar-style suits pop, children's music, and upbeat genres where character personality is central. Cinematic animation fits orchestral, cinematic, and serious genres where visual weight matters.

**Step 2: Describe your characters.**

Navigate to [wiz-ai.io/kids-video](/kids-video) and begin a new project. When prompted to define your characters, be specific. Include physical appearance (hair colour, eye colour, build, clothing), personality traits that might influence how the character moves and is framed, and any visual references that help establish the aesthetic.

Specificity matters significantly here. "A young woman with short silver hair, wearing a futuristic white jacket, with an intense expression" will produce far more consistent and usable results than "a cool-looking character."

**Step 3: Generate your scenes.**

WizAnimate™ analyses your track and generates a scene-by-scene breakdown. Each scene corresponds to a segment of the song — verse, chorus, bridge, instrumental. Review the generated scene descriptions and edit any that do not match your vision.

Pay particular attention to chorus scenes, which typically benefit from higher visual energy, wider shots, and more dynamic movement. Verse scenes often work better with closer, more intimate framing.

**Step 4: Render.**

Once you are satisfied with the storyboard, start the render. WizAnimate™ generates each scene individually and assembles them into a complete video with your audio track. The render typically takes 15–30 minutes depending on the length of the track and the number of scenes.

---

### Tips for Better Animated Music Videos

**Choose a style suited to your genre.** The mismatch between a heavy metal track and a Pixar-style animation, for example, can undermine the video's impact. Think about what your audience expects visually from your genre before choosing a style.

**Use specific character descriptions.** The more detail you provide about your character's appearance, the more consistent the output will be across scenes. Vague descriptions produce inconsistent characters.

**Vary the scene energy between verse and chorus.** A video where every scene has the same visual energy becomes monotonous. Use the storyboard editing step to ensure chorus scenes feel more expansive and energetic than verse scenes.

**Consider the colour palette.** WizAnimate™ will infer a colour palette from your style choice and character descriptions. If you have a specific palette in mind — for example, a predominantly blue and purple aesthetic for an electronic track — mention it in your character and scene descriptions.

---

### Best Genres for Animated Music Videos

Animated music videos work particularly well for genres where the visual world does not need to be photorealistic:

- **Hip hop and trap:** Stylised anime or cinematic animation suits the genre's visual energy
- **Indie and alternative:** Anime or abstract styles complement the genre's aesthetic sensibility
- **Electronic and synthwave:** Abstract and cinematic animation align with the genre's futuristic aesthetic
- **Pop:** Pixar-style and anime both work well for pop, depending on the artist's brand
- **Orchestral and classical:** Cinematic animation can produce genuinely stunning results for instrumental and orchestral music

---

### Try WizAnimate™ Free

WIZ AI includes 50 free credits on signup. No credit card required.

[Create your animated music video →](/kids-video)`,
  },
  {
    title: "How to Create a Music Video Without a Camera",
    slug: "music-video-without-a-camera",
    excerpt: "No camera, no crew, no editing suite. Here's how independent musicians are making professional music videos entirely with AI.",
    tags: ["tutorial", "music video", "beginners"],
    metaTitle: "How to Create a Music Video Without a Camera | WIZ AI",
    metaDescription: "No camera, no crew, no editing suite. Here's how independent musicians are making professional music videos entirely with AI.",
    content: `## How to Create a Music Video Without a Camera

A traditional music video shoot costs between £5,000 and £50,000 depending on production values. That figure includes the director, the camera crew, the lighting equipment, the location hire, the post-production edit, and the colour grade. For most independent musicians, that budget simply does not exist.

AI music video generation has changed the maths entirely. You can now produce a professional music video — original scenes, consistent characters, cinematic visual polish — without a camera, without a crew, and without a post-production suite. This guide explains how.

---

### What AI Music Video Generation Actually Produces

It is worth being clear about what AI music video generation produces, because there is a common misconception that it assembles stock footage or recycles existing video clips. It does not.

WIZ AI generates original scenes from scratch, built specifically around your track. WizGenesis™ analyses your audio — reading the lyric structure, mapping the beat timing, detecting energy shifts between sections — and uses that analysis to generate visual descriptions for each scene. Those descriptions are then rendered into original video footage that has never existed before.

The output is not a slideshow of images. It is video — moving, cinematic, scene-by-scene footage that follows the arc of your song.

---

### The WIZ AI Workflow

The process is straightforward and does not require any technical knowledge.

**Upload your track.** Navigate to [wiz-ai.io/music-video/create](/music-video/create) and upload your audio file. WizGenesis™ begins analysing the track immediately — reading the lyrics, mapping the structure, and planning the storyboard.

**Review and adjust the storyboard.** WizGenesis™ generates a complete storyboard: one scene per lyric segment, each with a visual description. This is your opportunity to direct the video. Read through each scene description and edit any that do not match your vision. You can change the setting, the mood, the character framing, or the visual details of any scene before rendering.

**Render the video.** Once you are satisfied with the storyboard, start the render. WIZ AI generates each scene and assembles them into a complete video with your audio track. The finished file is ready to download.

---

### Who This Works For

AI music video generation is not the right tool for every musician or every project. It works particularly well for:

**Bedroom producers and home studio artists.** If you produce music independently and do not have access to a professional network of directors and camera operators, AI generation gives you a professional output without the professional infrastructure.

**Unsigned artists on a limited budget.** A subscription to WIZ AI costs a fraction of a single traditional shoot. For artists releasing multiple tracks per year, the economics are compelling.

**Bands who want to release more content.** A traditional shoot is a significant undertaking. AI generation allows bands to produce a video for every track rather than just the singles.

**Songwriters who want to visualise their work.** For songwriters who write for other artists, AI video generation is a useful tool for pitching songs with a visual reference.

---

### Common Concerns — Addressed Honestly

**"Will it look cheap?"**

The quality of the output depends significantly on the quality of your inputs. A well-written storyboard with specific scene descriptions, a clear visual style choice, and properly defined characters will produce a noticeably better result than accepting all the defaults. The AI is a capable executor, but it responds to direction. Treat the storyboard editing step seriously and the output will reflect that.

**"Can I control the visuals?"**

Yes, at a scene-by-scene level. You can edit every scene description before rendering, choose the visual style, define the characters, and approve or reject individual scenes before the final video is assembled. You are the director; WIZ AI is the production crew.

**"What about my lyrics?"**

WizGenesis™ reads your lyrics as part of its analysis. The scene descriptions it generates are informed by the lyric content of each segment — a melancholic verse will produce different visual suggestions than an energetic chorus. If you want the visuals to respond more precisely to specific lyric lines, you can edit the scene descriptions to include direct references to the lyrics.

---

### Getting Started

WIZ AI includes 50 free credits on signup — enough to produce your first full music video without a subscription. No credit card required.

[Make your first video free →](/music-video/create)`,
  },
  {
    title: "What Is AI Music Video Generation and How Does It Work?",
    slug: "what-is-ai-music-video-generation",
    excerpt: "AI music video generators turn your audio track into a full visual production. Here's how the technology actually works — and what to expect.",
    tags: ["explainer", "music video", "AI"],
    metaTitle: "What Is AI Music Video Generation and How Does It Work? | WIZ AI",
    metaDescription: "AI music video generators turn your audio track into a full visual production. Here's how the technology actually works — and what to expect.",
    content: `## What Is AI Music Video Generation and How Does It Work?

The phrase "AI music video generator" covers a wide range of tools with very different capabilities. Some generate short video clips from text prompts. Some apply visual styles to existing footage. A smaller number — WIZ AI among them — are designed specifically to produce complete music videos from an audio track. Understanding the difference matters if you are trying to decide whether AI video generation is right for your project.

This article explains what AI music video generation actually means, how the technology works, and what you can realistically expect from the output.

---

### What "AI Music Video Generation" Means

In the most accurate sense, AI music video generation refers to a process where an AI system analyses an audio track — reading its structure, timing, and lyric content — and uses that analysis to generate a complete visual production: a scene-by-scene video that follows the arc of the song.

This is distinct from general AI video generation, which typically produces short clips from text prompts without any connection to an audio track. A general AI video tool can produce impressive footage, but it has no awareness of your song's structure, lyrics, or emotional arc. The result requires significant manual editing to assemble into a coherent music video.

---

### How WizGenesis™ Works

WizGenesis™ is WIZ AI's creative intelligence layer — the system that analyses your track and plans the visual production.

When you upload a track, WizGenesis™ performs several tasks simultaneously. It reads the lyric content and identifies the narrative and emotional themes of each segment. It maps the beat structure and energy profile of the track, identifying where the energy rises and falls. It detects the structural sections — verse, chorus, bridge, instrumental — and uses that structure to plan a scene-by-scene storyboard.

The output of this analysis is a complete storyboard: one scene per segment, each with a generated visual description that reflects the lyric content and energy of that part of the song. This storyboard is editable — you can review and modify every scene description before rendering.

---

### WizLumina™: The Visual Enhancement Layer

Raw AI-generated video footage can look flat or inconsistent. WizLumina™ is the visual enhancement layer that applies cinematic polish to the output — adjusting colour grading, contrast, and visual coherence to give the finished video a professional, film-quality appearance.

WizLumina™ operates on the assembled video after scene generation, treating the output as a single visual piece rather than a collection of individual clips. The result is a video that feels visually unified rather than assembled from disparate parts.

---

### WizSound™: Audio Mastering

WizSound™ applies audio mastering to the output, ensuring the audio track in the finished video has the clarity, depth, and dynamic range expected of a professional release. This is particularly relevant for tracks that have not been professionally mastered — WizSound™ applies enhancement at the output stage to ensure the audio quality matches the visual quality of the finished video.

---

### What You Control vs What the AI Decides

Understanding the division of control is important for setting expectations.

**You control:** the storyboard (you can edit every scene description), the visual style (cinematic, anime, abstract, documentary), the character definitions (appearance, consistency), and the export format.

**The AI decides:** the specific visual execution of each scene description, the motion and camera movement within scenes, and the precise visual details not specified in your scene descriptions.

The more specific your scene descriptions, the more the output will reflect your vision. Vague descriptions give the AI more creative latitude, which can produce interesting results but less predictable ones.

---

### What the Output Looks Like

WIZ AI produces a complete video file — MP4 format, with your audio track embedded. Resolution options include standard, HD, and 4K depending on your subscription tier. The video length matches your audio track length.

The output is original footage — not stock video, not recycled clips. Every scene is generated specifically for your track.

---

### Who It Is For — and Who It Is Not For

AI music video generation is a strong fit for independent musicians, bedroom producers, unsigned artists, and anyone who needs a professional music video without the budget or infrastructure for a traditional shoot.

It is less suited to artists who need photorealistic footage of specific real-world locations, productions that require live performance footage of the artist, or projects where the director's specific visual signature is central to the work.

For the majority of independent musicians releasing music in 2025, AI generation offers a practical, affordable, and genuinely professional path to a complete music video.

---

### See It for Yourself

WIZ AI includes 50 free credits on signup. No credit card required.

[Create your first AI music video →](/music-video/create)`,
  },
  {
    title: "How to Make a Lyric Video with AI (Automatically Synced)",
    slug: "how-to-make-a-lyric-video-ai",
    excerpt: "AI can now generate lyric-aware music videos where visuals are built around your actual song lyrics. Here's how.",
    tags: ["tutorial", "lyric video", "music video"],
    metaTitle: "How to Make a Lyric Video with AI (Automatically Synced) | WIZ AI",
    metaDescription: "AI can now generate lyric-aware music videos where visuals are built around your actual song lyrics. Here's how.",
    content: `## How to Make a Lyric Video with AI (Automatically Synced)

Lyric videos used to mean white text on a black background, scrolling in time with the music. They were functional but rarely compelling. The expectation has changed. Audiences now expect lyric videos to be visually interesting — and AI has made that achievable without a design background or video editing skills.

More importantly, AI has introduced something that traditional lyric video tools cannot offer: visuals that are actually built around your lyrics, not just displayed alongside them. This guide explains how lyric-aware AI video generation works and how to get the best results from it.

---

### What Lyric-Aware Generation Means

A standard AI video tool generates visuals from a text prompt. A lyric-aware tool goes further: it reads your actual song lyrics and uses the content, tone, and narrative of each lyric segment to generate visuals that respond to what the lyrics are saying.

WizGenesis™ is the system that handles this analysis in WIZ AI. When you upload your track, WizGenesis™ reads the lyrics and builds scene descriptions that reflect the lyric content of each segment. A verse about isolation in a city might generate a scene of a lone figure in an empty urban landscape. A chorus about freedom might generate an expansive outdoor scene with dynamic movement.

This is not a superficial connection — the lyric content directly influences the visual output of each scene.

---

### How to Make It Work Well

**Provide accurate lyrics.** WizGenesis™ reads the lyrics you provide. If the lyrics are inaccurate, incomplete, or missing, the scene descriptions will not reflect the actual content of the song. Take the time to provide clean, accurate lyrics before generating your storyboard.

**Use descriptive scene suggestions where the AI needs guidance.** WizGenesis™ generates scene descriptions automatically, but you can edit them before rendering. If a particular lyric segment has a specific visual that matters to you — a specific location, a specific mood, a specific visual metaphor — add it to the scene description. The AI will incorporate your direction into the generated footage.

**Consider the emotional arc of the song.** Lyric-aware generation works best when the visual arc of the video mirrors the emotional arc of the lyrics. A song that builds from introspective verses to an expansive chorus should have visuals that reflect that progression. Review the storyboard with this in mind and adjust any scenes that break the emotional continuity.

---

### Styles That Work Best for Lyric-Driven Videos

Not all visual styles suit lyric-driven content equally well.

**Cinematic** is the most versatile style for lyric-driven videos. It produces high-contrast, film-quality footage that can accommodate a wide range of lyric content — from intimate personal narratives to large-scale emotional statements.

**Documentary** works well for lyric content that is grounded and personal — songs about real experiences, relationships, or specific places. The naturalistic aesthetic of the documentary style reinforces the authenticity of the lyric content.

**Abstract** suits lyric content that is metaphorical, emotional, or non-narrative. Songs where the lyrics evoke feelings rather than tell stories often benefit from abstract visuals that respond to the emotional content rather than the literal meaning.

**Anime** works well for lyric content that is dramatic, expressive, or character-driven. The heightened emotional register of anime suits songs with strong narrative arcs or intense emotional content.

---

### Tips for Chorus vs Verse Scene Variety

One of the most common weaknesses in AI-generated music videos is visual monotony — every scene looks and feels the same regardless of where it falls in the song's structure. Lyric-aware generation helps with this, but you can reinforce it through the storyboard editing step.

**Verse scenes** typically benefit from closer, more intimate framing. The lyrics in a verse are often more personal and specific, and the visuals should reflect that intimacy.

**Chorus scenes** should feel more expansive. Wider shots, more dynamic movement, higher visual energy. The chorus is where the song opens up, and the visuals should do the same.

**Bridge scenes** are an opportunity for visual contrast — a change of setting, a shift in colour palette, or a different perspective that marks the bridge as a distinct moment in the song's narrative.

Spending time on these distinctions during the storyboard editing step will produce a noticeably more dynamic and engaging video.

---

### Try It Free

WIZ AI includes 50 free credits on signup. No credit card required. Create your first lyric-aware music video in under an hour.

[Try it free →](/music-video/create)`,
  },
];

// ── Insert posts directly into DB ─────────────────────────────────────────────

for (const post of posts) {
  // Check if slug already exists
  const [existing] = await db.query("SELECT id FROM blogPosts WHERE slug = ? LIMIT 1", [post.slug]);
  if (existing.length > 0) {
    console.log(`Post already exists: ${post.slug} (id=${existing[0].id}) — skipping`);
    continue;
  }

  const now = new Date();
  await db.query(
    `INSERT INTO blogPosts (title, slug, content, excerpt, author, status, tags, metaTitle, metaDescription, publishedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?)`,
    [
      post.title,
      post.slug,
      post.content,
      post.excerpt,
      "WIZ AI Team",
      JSON.stringify(post.tags),
      post.metaTitle,
      post.metaDescription,
      now,
      now,
      now,
    ]
  );
  console.log(`Published: ${post.slug}`);
}

await db.end();
console.log("Done.");
