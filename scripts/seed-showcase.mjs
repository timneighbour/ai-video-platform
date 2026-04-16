/**
 * Seed script: populate the showcase_items table with 6 AI-generated video examples.
 * Run: node scripts/seed-showcase.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

const SHOWCASE_ITEMS = [
  {
    category: "Cinematic AI Video",
    title: "Neon City — Cinematic Style",
    description: "A lone figure walks rain-soaked streets under violet neon lights. Generated from a single text prompt in under 3 minutes.",
    posterUrl: `${CDN}/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp`,
    videoUrl: `${CDN}/showcase-cinematic_13667434.mp4`,
    sortOrder: 1,
    isActive: 1,
  },
  {
    category: "Music Video",
    title: "Stage Performance — Music Video Style",
    description: "A full music video with synced visuals, concert lighting, and smoke effects. Created with WizBeat from an uploaded song.",
    posterUrl: `${CDN}/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp`,
    videoUrl: `${CDN}/showcase-music-video_19324f13.mp4`,
    sortOrder: 2,
    isActive: 1,
  },
  {
    category: "Animation",
    title: "Star Quest — Kids Channel Intro",
    description: "Vibrant Pixar-style 3D animation for a kids YouTube channel. Generated from a character description and theme prompt.",
    posterUrl: `${CDN}/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp`,
    videoUrl: `${CDN}/showcase-kids_d49d86f8.mp4`,
    sortOrder: 3,
    isActive: 1,
  },
  {
    category: "Anime",
    title: "Cherry Blossom — Anime Style",
    description: "A magical anime scene with flowing hair and glowing particles. Generated using the Anime visual style in WizPilot.",
    posterUrl: `${CDN}/showcase-anime-gdkPWj4zZ3wPdwmswMeaY9.webp`,
    videoUrl: `${CDN}/showcase-anime_36099b49.mp4`,
    sortOrder: 4,
    isActive: 1,
  },
  {
    category: "Story Animation",
    title: "The Enchanted Forest — Story Animation",
    description: "A storybook adventure through a bioluminescent forest. Perfect for kids content and narrative YouTube channels.",
    posterUrl: `${CDN}/showcase-story-USepA6hkPxe97oTtpWXhtt.webp`,
    videoUrl: `${CDN}/showcase-story_ffc51308.mp4`,
    sortOrder: 5,
    isActive: 1,
  },
  {
    category: "Faceless Content",
    title: "Ancient Ruins — Documentary Style",
    description: "Cinematic aerial footage of ancient ruins at golden hour. Ideal for faceless YouTube channels and history content.",
    posterUrl: `${CDN}/showcase-faceless-czjqMEgbKbB2YQHLyDgQBB.webp`,
    videoUrl: `${CDN}/showcase-faceless_9566b108.mp4`,
    sortOrder: 6,
    isActive: 1,
  },
];

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.");

  // Clear existing showcase items
  await conn.execute("DELETE FROM showcaseItems");
  console.log("Cleared existing showcase items.");

  for (const item of SHOWCASE_ITEMS) {
    await conn.execute(
      `INSERT INTO showcaseItems (category, title, description, posterUrl, videoUrl, sortOrder, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [item.category, item.title, item.description, item.posterUrl, item.videoUrl, item.sortOrder, item.isActive]
    );
    console.log(`  ✓ Inserted: ${item.title}`);
  }

  console.log(`\nSeeded ${SHOWCASE_ITEMS.length} showcase items successfully.`);
  await conn.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
