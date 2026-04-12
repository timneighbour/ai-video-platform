import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const posts = [
  {
    slug: "how-to-create-cinematic-music-video-ai",
    title: "How to Create a Cinematic Music Video with AI in Under 5 Minutes",
    excerpt: "Learn how WizVid turns your song or idea into a full cinematic music video — storyboard, scenes, and final render — all in one place.",
    content: `# How to Create a Cinematic Music Video with AI in Under 5 Minutes

Creating a professional music video used to take days of filming, editing, and post-production. With WizVid, you can go from idea to finished video in under 5 minutes.

## Step 1: Describe Your Idea

Start by entering a prompt that describes the mood, style, and story of your video. For example:

> "A melancholic indie artist performing on a rain-soaked rooftop at night, neon city lights reflecting in puddles, cinematic depth of field"

WizVid's AI understands creative language — the more vivid your description, the better the result.

## Step 2: AI Builds Your Storyboard

Within seconds, WizVid generates a complete storyboard — a sequence of scenes that tells your story visually. Each scene has its own prompt, style, and timing.

You can preview every scene before committing to a render. Don't like a scene? Edit the prompt and regenerate instantly.

## Step 3: Preview Every Scene

This is WizVid's most powerful feature: **you see your video before you pay for it**. Preview each AI-generated scene, adjust timing, reorder shots, or regenerate any frame.

## Step 4: Render Your Final Video

Once you're happy with the storyboard, click Render. WizVid assembles all scenes into a full, ready-to-publish video — complete with **WizSound™ audio enhancement** for cinematic depth and clarity.

## The Result

A complete, cinematic music video. Not clips. Not fragments. A full video, ready to upload to YouTube, TikTok, or Instagram.

---

*WizVid is the only AI video platform that shows you the full storyboard before you render — so you only pay for what you love.*`,
    author: "WizVid Team",
    status: "published",
    tags: JSON.stringify(["AI video", "music video", "tutorial", "cinematic"]),
    coverImage: "https://d2xsxph8kpxj0f.cloudfront.net/wizvid/whos-it-for-musicians.jpg",
    metaTitle: "How to Create a Cinematic Music Video with AI | WizVid",
    metaDescription: "Learn how WizVid turns your song or idea into a full cinematic music video in under 5 minutes. Storyboard, scenes, and final render — all in one place.",
    publishedAt: new Date(),
  },
  {
    slug: "wizsound-cinematic-audio-explained",
    title: "WizSound™: The Cinematic Audio Engine Behind Every WizVid Video",
    excerpt: "Discover how WizSound™ transforms raw audio into an immersive, studio-quality cinematic experience — and why it makes WizVid videos sound different.",
    content: `# WizSound™: The Cinematic Audio Engine Behind Every WizVid Video

When you watch a WizVid video, something feels different about the audio. It's not just louder or cleaner — it has *depth*. That's WizSound™.

## What is WizSound™?

WizSound™ is WizVid's proprietary audio enhancement engine. It processes your audio through three layers of cinematic treatment:

### 1. Immersive Depth
Standard stereo audio feels flat. WizSound™ adds spatial layering — subtle width, depth, and dimensionality that makes audio feel like it surrounds you.

### 2. Cinematic Mastering
Every WizVid video gets AI-enhanced clarity, punch, and balance — the kind of treatment you'd expect from a professional mastering engineer. Low frequencies are tightened, mids are clarified, and highs are polished.

### 3. Built for Video
WizSound™ is optimised specifically for music videos, animation, and storytelling. It understands the relationship between audio dynamics and visual pacing — enhancing impact at the right moments.

## Why Does It Matter?

Most AI video tools generate visuals and leave audio untouched. WizVid believes that cinematic video requires cinematic audio. WizSound™ is the difference between a video that looks good and one that *feels* cinematic.

## How to Get WizSound™

WizSound™ is available as an audio enhancement option when you render your video. Select the **Cinematic** audio tier for the full WizSound™ experience.

---

*"Cinematic visuals. Immersive sound." — That's the WizVid promise.*`,
    author: "WizVid Team",
    status: "published",
    tags: JSON.stringify(["WizSound", "audio", "cinematic", "music video"]),
    coverImage: "https://d2xsxph8kpxj0f.cloudfront.net/wizvid/wizsound-waveform.jpg",
    metaTitle: "WizSound™: Cinematic Audio for AI Music Videos | WizVid",
    metaDescription: "WizSound™ is WizVid's proprietary audio enhancement engine. Discover how it transforms raw audio into an immersive, studio-quality cinematic experience.",
    publishedAt: new Date(),
  },
  {
    slug: "ai-music-video-styles-guide",
    title: "7 AI Music Video Styles You Can Create with WizVid",
    excerpt: "From Pixar-style animation to epic cinematic films — explore the 7 video styles available in WizVid and find the perfect look for your music.",
    content: `# 7 AI Music Video Styles You Can Create with WizVid

WizVid supports a wide range of cinematic styles — from photorealistic to animated. Here's a guide to each style and when to use it.

## 1. Cinematic Realism
**Best for:** Pop, R&B, Soul, Singer-songwriter

Photorealistic scenes with dramatic lighting, depth of field, and film-grade colour grading. Looks like it was shot on a RED camera.

## 2. Pixar 3D Animation
**Best for:** Kids music, Pop, Upbeat tracks

Warm, expressive 3D animation in the style of Pixar films. Characters are charming, environments are rich, and the mood is always optimistic.

## 3. Epic Fantasy
**Best for:** Metal, Epic orchestral, Gaming soundtracks

Dragons, castles, ancient ruins, and sweeping landscapes. Perfect for music that demands a grand visual scale.

## 4. Anime
**Best for:** J-Pop, Electronic, Indie

Hand-drawn anime aesthetics with expressive characters, dynamic action, and vibrant colour palettes.

## 5. Cyberpunk / Neon Noir
**Best for:** Electronic, Hip-hop, Synthwave

Rain-soaked streets, neon signs, holographic displays, and a moody, high-contrast visual language.

## 6. Watercolour / Illustrated
**Best for:** Folk, Acoustic, Ambient

Soft, painterly visuals that feel handcrafted. Ideal for intimate, emotional music.

## 7. Documentary / Performance
**Best for:** Live music, Acoustic, Jazz

Realistic performance footage — artist in studio, on stage, or in a natural environment. Clean, authentic, and professional.

---

## How to Choose Your Style

When you create a video in WizVid, you'll be prompted to choose a visual style. Each style has its own set of AI models optimised for that aesthetic.

Not sure which to choose? Describe your music in the prompt and WizVid's AI will suggest the best match.

---

*Ready to create? [Start your first video →](https://wizvid.ai/music-video/create)*`,
    author: "WizVid Team",
    status: "published",
    tags: JSON.stringify(["AI video styles", "music video", "animation", "cinematic"]),
    coverImage: "https://d2xsxph8kpxj0f.cloudfront.net/wizvid/style-collage.jpg",
    metaTitle: "7 AI Music Video Styles You Can Create with WizVid",
    metaDescription: "From Pixar animation to cinematic realism — explore 7 AI music video styles in WizVid and find the perfect look for your music.",
    publishedAt: new Date(),
  },
];

for (const post of posts) {
  try {
    await conn.execute(
      `INSERT INTO blogPosts (slug, title, excerpt, content, author, status, tags, coverImage, metaTitle, metaDescription, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE updatedAt = NOW()`,
      [
        post.slug,
        post.title,
        post.excerpt,
        post.content,
        post.author,
        post.status,
        post.tags,
        post.coverImage,
        post.metaTitle,
        post.metaDescription,
        post.publishedAt,
      ]
    );
    console.log(`✓ Seeded: ${post.title}`);
  } catch (err) {
    console.error(`✗ Failed: ${post.title}`, err.message);
  }
}

await conn.end();
console.log("Done.");
