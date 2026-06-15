/**
 * Character Lock System - Phase 1 Fix
 * 
 * Runs real LLM vision analysis on Tim and Greg's photos to generate
 * proper forensic descriptions, then updates ALL character records
 * across all jobs to use these frozen descriptions.
 */
import mysql from "mysql2/promise";
import { invokeLLM } from "./server/_core/llm";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

interface CharacterToFix {
  name: string;
  role: string;
  userStyleText: string; // what the user typed as style/description
  primaryPhotoUrl: string;
  secondaryPhotoUrl?: string;
}

const CHARACTERS_TO_FIX: CharacterToFix[] = [
  {
    name: "Tim",
    role: "Lead Singer and Guitarist",
    userStyleText: "Rock Star, leather jacket and plays a sunburst Gibson Les Paul electric guitar",
    primaryPhotoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/video-characters/1-120002-0-1775925955058-0.png",
  },
  {
    name: "Greg",
    role: "Drummer",
    userStyleText: "Wears a black T-Shirt and plays like he means it!!",
    primaryPhotoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/video-characters/1-120002-1-1775925955299-0.jpeg",
    secondaryPhotoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/video-characters/1-120002-1-1775925955396-1.jpeg",
  },
];

async function analyseCharacter(char: CharacterToFix): Promise<string> {
  console.log(`\nAnalysing ${char.name} (${char.role})...`);
  
  const imageContents: any[] = [
    { type: "image_url", image_url: { url: char.primaryPhotoUrl, detail: "high" } },
  ];
  if (char.secondaryPhotoUrl) {
    imageContents.push({ type: "image_url", image_url: { url: char.secondaryPhotoUrl, detail: "high" } });
  }
  imageContents.push({
    type: "text",
    text: `This is ${char.name}, the ${char.role} in a rock band called BRANDED.
User's style notes: "${char.userStyleText}"

Write a FROZEN CHARACTER IDENTITY BRIEF for AI video generation. This description will be copied VERBATIM into every scene prompt to ensure 100% visual consistency.

Requirements:
- Start with: "${char.name}, ${char.role} of rock band BRANDED:"
- Include EXACT physical appearance: gender, age range, ethnicity, skin tone
- Hair: EXACT colour (e.g. "dark brown", NOT "dark"), length, texture, style
- Face: shape, jawline, any distinctive features (beard, stubble, etc.)
- Eyes: colour and shape
- Build: height impression, body type
- Clothing for this video: incorporate the user's style notes
- Instrument: explicitly state what they play and how (e.g. "plays a sunburst Gibson Les Paul electric guitar", "plays drums with aggressive energy")
- End with: "CONSISTENCY RULE: This character's appearance MUST NOT change between scenes."

Write 120-150 words. Single paragraph. No bullet points. Be forensically specific.`
  });

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a forensic visual analyst creating character identity briefs for AI video generation. Your descriptions must be precise enough that an AI model generates the SAME person every single time.",
      },
      {
        role: "user",
        content: imageContents,
      },
    ],
  });

  const description = response.choices[0]?.message?.content;
  if (!description || typeof description !== "string") {
    throw new Error(`Empty response for ${char.name}`);
  }
  return description.trim();
}

// Process each character
for (const char of CHARACTERS_TO_FIX) {
  try {
    const frozenDescription = await analyseCharacter(char);
    console.log(`\n✅ ${char.name} frozen description (${frozenDescription.length} chars):`);
    console.log(frozenDescription.substring(0, 200) + "...");

    // Update ALL character records with this name across all jobs
    const [result] = await conn.execute(
      "UPDATE videoCharacters SET lockedDescription = ?, isLocked = 1 WHERE name = ?",
      [frozenDescription, char.name]
    ) as any[];
    console.log(`Updated ${result.affectedRows} character records for "${char.name}"`);
  } catch (err: any) {
    console.error(`❌ Failed for ${char.name}:`, err.message);
  }
}

await conn.end();
console.log("\n✅ Character Lock System Phase 1 complete");
