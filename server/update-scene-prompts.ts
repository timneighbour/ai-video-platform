/**
 * Update the 4 pending scene prompts for Job 660001.
 * 
 * Performance scenes (3, 5): Zara singing with intensity — focused on her
 * Cinematic scenes (4, 6): Show orchestral musicians (violinists, cellist) around her
 *   in the studio — she's not alone, it's a live recording session feel.
 * 
 * The music is piano + strings, emotional, building. BPM-matched movement.
 */
import "dotenv/config";
import { getDb } from "./db";
import { musicVideoScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const CHAR_DESC = "Zara: slim white woman, long straight black hair, green eyes, black corset top, confident singer.";

const updatedPrompts: Record<number, string> = {
  // Scene 3 (18-24s) - performance - Zara singing with building intensity
  660004: `${CHAR_DESC} Medium close-up performance shot. Inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Warm amber and golden lighting with deeper dramatic tones. Zara at the microphone, eyes burning with intensity, singing with rising power and conviction. Her hair catches warm backlight creating a halo effect. Subtle lens flare from studio lights. Behind her, slightly out of focus, string players can be glimpsed. The emotion builds visibly in her expression — determination and passion. Camera slowly pushes in. Cinematic, 16:9.`,

  // Scene 4 (24-30s) - cinematic - ORCHESTRAL PLAYERS visible, violins and cello
  660005: `${CHAR_DESC} Sweeping cinematic wide shot. Inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. A small string ensemble — two violinists and a cellist — seated in a semicircle behind Zara, playing with feeling and passion. Their bows move together in slow, graceful arcs matching the emotional tempo of the music. Warm amber light bathes the musicians. Zara stands at the microphone in the foreground, slightly out of focus. The grandeur of the high-ceilinged hall frames them all. Dust particles float in golden light beams from arched windows. Camera glides slowly on a dolly track. Atmospheric, cinematic, 16:9.`,

  // Scene 5 (30-36s) - performance - peak emotional moment, raw and powerful
  660006: `${CHAR_DESC} Extreme close-up performance shot. Inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Intimate warm golden light illuminating only Zara's face against a darker background. Her green eyes glistening with unshed tears, raw emotion pouring through. Every micro-expression visible — the slight tremble of her lip, the intensity in her gaze. She sings with absolute conviction, completely lost in the music. A single warm spotlight creates dramatic shadows on her face. Camera holds perfectly still. Deeply intimate, powerful, cinematic, 16:9.`,

  // Scene 6 (36-42s) - cinematic - CELLIST featured, intimate musician moment
  660007: `${CHAR_DESC} Cinematic detail shot transitioning to wide. Inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Close-up of a cellist's hands drawing the bow across strings with deep feeling, then the camera pulls back to reveal the full studio — Zara at the microphone, the string ensemble around her, all bathed in rich warm golden hour light streaming through large arched windows. Long dramatic shadows across polished hardwood floor. The musicians sway gently with the music's rhythm. Volumetric light, floating dust motes. A live recording session in full flow. Epic, emotional, cinematic, 16:9.`,
};

async function main() {
  const db = await getDb();
  if (!db) { console.error("DB unavailable"); process.exit(1); }

  for (const [idStr, prompt] of Object.entries(updatedPrompts)) {
    const id = parseInt(idStr);
    await db.update(musicVideoScenes)
      .set({ prompt })
      .where(eq(musicVideoScenes.id, id));
    console.log(`✅ Updated Scene id=${id} prompt (${prompt.length} chars)`);
  }

  console.log("\nAll 4 pending scene prompts updated.");
  console.log("- Scenes 4 & 6: orchestral musicians (violins, cello) visible");
  console.log("- Scenes 3 & 5: Zara performance with more intensity");
  console.log("The heartbeat will pick these up and render them on WaveSpeed.");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
