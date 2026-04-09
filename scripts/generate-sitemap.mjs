/**
 * Generates sitemap.xml for WizVid including all 50 SEO pages.
 * Run: node scripts/generate-sitemap.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// All 50 SEO slugs
const SEO_SLUGS = [
  "ai-music-video-generator",
  "ai-music-video-generator-youtube",
  "ai-music-video-generator-tiktok",
  "ai-music-video-generator-rap",
  "ai-music-video-generator-kids",
  "ai-music-video-generator-songs",
  "create-music-video-with-ai",
  "ai-lyric-video-generator",
  "ai-animated-music-video-maker",
  "ai-video-generator-musicians",
  "ai-video-generator-youtube",
  "ai-video-generator-youtube-creators",
  "ai-video-generator-youtube-automation",
  "ai-youtube-content-generator",
  "ai-tool-youtube-videos",
  "ai-video-generator-faceless-youtube",
  "ai-video-generator-shorts",
  "ai-video-generator-tiktok",
  "ai-video-generator-reels",
  "ai-content-creation-youtube",
  "ai-kids-video-generator",
  "ai-animation-kids-youtube",
  "ai-nursery-rhyme-video-generator",
  "ai-cartoon-video-generator",
  "ai-kids-animation-maker",
  "ai-storytelling-video-generator",
  "ai-kids-content-creator",
  "ai-video-generator-children",
  "ai-animation-nursery-rhymes",
  "ai-cartoon-video-maker",
  "ai-animation-video-maker",
  "ai-animation-generator",
  "ai-animated-video-creator",
  "ai-cartoon-animation-generator",
  "ai-character-animation-generator",
  "ai-storytelling-animation-tool",
  "ai-animation-beginners",
  "ai-animation-software-online",
  "create-animated-videos-ai",
  "ai-animation-video-tool",
  "turn-audio-into-video-ai",
  "ai-audio-to-video-generator",
  "ai-video-generator-from-audio",
  "convert-song-into-video-ai",
  "ai-video-generator-from-sound",
  "ai-video-from-music-generator",
  "ai-video-generator-podcasts",
  "ai-voice-to-video-generator",
  "ai-text-to-video-generator",
  "ai-script-to-video-generator",
];

const BASE_URL = "https://wizvid.ai";
const today = new Date().toISOString().split("T")[0];

const staticPages = [
  { url: "/", priority: "1.0", changefreq: "weekly" },
  { url: "/music-video", priority: "0.9", changefreq: "weekly" },
  { url: "/autopilot", priority: "0.9", changefreq: "weekly" },
  { url: "/tools", priority: "0.8", changefreq: "monthly" },
  { url: "/#pricing", priority: "0.8", changefreq: "monthly" },
];

const seoPageEntries = SEO_SLUGS.map((slug) => ({
  url: `/seo/${slug}`,
  priority: "0.7",
  changefreq: "monthly",
}));

const allPages = [...staticPages, ...seoPageEntries];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

const outPath = join(__dirname, "../client/public/sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`✅ sitemap.xml written with ${allPages.length} URLs → ${outPath}`);
