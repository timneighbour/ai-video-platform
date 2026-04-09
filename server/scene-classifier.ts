/**
 * WizVid Scene Classifier
 *
 * Classifies each storyboard scene into one of four importance tiers
 * to drive cost-aware renderer routing:
 *
 *   hero        — chorus, emotional peak, high-impact moment → premium renderer allowed
 *   performance — important visual moment → premium if within allocation
 *   standard    — normal storytelling → cheap renderer (Seedance)
 *   transition  — filler, linking content → cheapest method available
 *
 * Classification uses the LLM when the scene set is large enough to warrant it,
 * and falls back to heuristic rules for speed and reliability.
 */

import { invokeLLM } from "./_core/llm";
import type { SceneImportance } from "./products";

export interface SceneInput {
  sceneIndex: number;
  prompt: string;
  lyrics?: string | null;
  startTime: number;
  duration: number;
}

export interface ClassifiedScene extends SceneInput {
  importance: SceneImportance;
  classificationReason: string;
}

// ─── Heuristic keywords ───────────────────────────────────────────────────────

const HERO_KEYWORDS = [
  "chorus", "climax", "peak", "explosion", "epic", "grand", "triumphant",
  "emotional peak", "breakthrough", "revelation", "transformation", "finale",
  "dramatic", "powerful", "intense", "soaring", "rise", "crescendo",
];

const PERFORMANCE_KEYWORDS = [
  "performance", "singing", "dancing", "spotlight", "stage", "concert",
  "close-up", "closeup", "face", "expression", "emotion", "feeling",
  "character moment", "key moment", "important", "featured",
];

const FILLER_KEYWORDS = [
  "transition", "fade", "cut to", "meanwhile", "establishing shot",
  "wide shot", "aerial", "landscape", "background", "establishing",
  "filler", "bridge", "interlude", "instrumental break",
];

function heuristicClassify(scene: SceneInput): SceneImportance {
  const text = `${scene.prompt} ${scene.lyrics ?? ""}`.toLowerCase();

  if (HERO_KEYWORDS.some((kw) => text.includes(kw))) return "hero";
  if (PERFORMANCE_KEYWORDS.some((kw) => text.includes(kw))) return "performance";
  if (FILLER_KEYWORDS.some((kw) => text.includes(kw))) return "filler";
  return "narrative";
}

// ─── LLM-based batch classifier ───────────────────────────────────────────────

interface LLMClassificationResult {
  sceneIndex: number;
  importance: SceneImportance;
  reason: string;
}

async function llmClassifyScenes(
  scenes: SceneInput[]
): Promise<LLMClassificationResult[]> {
  const sceneDescriptions = scenes
    .map(
      (s) =>
        `Scene ${s.sceneIndex} [${s.startTime.toFixed(1)}s–${(s.startTime + s.duration).toFixed(1)}s]: "${s.prompt}"${s.lyrics ? ` | Lyrics: "${s.lyrics}"` : ""}`
    )
    .join("\n");

  const systemPrompt = `You are a video production expert classifying music video scenes by visual importance.
Classify each scene into exactly one of these four categories:
- "hero": chorus, emotional peak, high-impact moment, transformation, climax
- "performance": important visual moment, character close-up, key story beat
- "narrative": normal storytelling, narrative progression
- "filler": establishing shot, linking content, instrumental break, background

Return a JSON array with one object per scene: { "sceneIndex": number, "importance": string, "reason": string }
The "reason" should be a brief (max 10 words) explanation.`;

  const userPrompt = `Classify these music video scenes:\n\n${sceneDescriptions}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scene_classifications",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sceneIndex: { type: "integer" },
                    importance: {
                      type: "string",
                      enum: ["hero", "performance", "narrative", "filler"],
                    },
                    reason: { type: "string" },
                  },
                  required: ["sceneIndex", "importance", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["classifications"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty LLM response");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content) as { classifications: LLMClassificationResult[] };
    return parsed.classifications;
  } catch (err) {
    console.warn("[SceneClassifier] LLM classification failed, using heuristics:", err);
    return [];
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Classify an array of scenes by importance.
 * Uses LLM for batches of 4+ scenes; heuristics for smaller sets or on LLM failure.
 */
export async function classifyScenes(
  scenes: SceneInput[]
): Promise<ClassifiedScene[]> {
  if (scenes.length === 0) return [];

  let llmResults: LLMClassificationResult[] = [];

  // Only invoke LLM for 4+ scenes (cost vs benefit threshold)
  if (scenes.length >= 4) {
    llmResults = await llmClassifyScenes(scenes);
  }

  // Build a lookup map from LLM results
  const llmMap = new Map<number, LLMClassificationResult>(
    llmResults.map((r) => [r.sceneIndex, r])
  );

  return scenes.map((scene) => {
    const llm = llmMap.get(scene.sceneIndex);
    if (llm && isValidImportance(llm.importance)) {
      return {
        ...scene,
        importance: llm.importance,
        classificationReason: llm.reason,
      };
    }
    // Fallback to heuristic
    const importance = heuristicClassify(scene);
    return {
      ...scene,
      importance,
      classificationReason: "heuristic",
    };
  });
}

function isValidImportance(value: string): value is SceneImportance {
  return ["hero", "performance", "standard", "transition"].includes(value);
}

/**
 * Quick synchronous heuristic classification (no LLM call).
 * Use this when you need an immediate estimate without async overhead.
 */
export function classifySceneSync(scene: SceneInput): SceneImportance {
  return heuristicClassify(scene);
}
