/**
 * Content Analyser — Shared Deep Understanding Module
 *
 * Used by ALL WizVid applications before any generation step:
 *   - WizVideo (music videos): analyses lyrics + user theme → drives every scene
 *   - WizSound: analyses lyrics + brief → drives instrumentation and arrangement
 *   - WizAnimate: analyses script/narration → drives character expression and pacing
 *   - WizScript: analyses brief/song → drives narrative structure and scene headings
 *
 * The AI MUST understand the content before generating anything.
 * This analysis is passed as mandatory context to every downstream generator.
 */

import { invokeLLM } from "./_core/llm";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SongSection {
  /** Section type: intro, verse, pre-chorus, chorus, bridge, breakdown, outro */
  type: "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "breakdown" | "outro" | "unknown";
  /** Start time in seconds (approximate, based on lyric timestamps) */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Lyric lines in this section */
  lyrics: string;
  /** Emotional intensity 1-10 */
  intensity: number;
}

export interface MoodShift {
  /** Time in seconds where the mood shifts */
  atTime: number;
  /** Description of the shift (e.g. "builds from melancholy to defiant anger") */
  description: string;
  /** Lighting suggestion for this shift */
  lightingSuggestion: string;
}

export interface ContentAnalysis {
  /** One-sentence summary of what the song/content is about */
  theme: string;
  /** Narrative arc: what story is being told across the whole piece */
  narrative: string;
  /** The dominant emotional journey (e.g. "starts with longing, builds to defiance, ends in triumph") */
  emotionalArc: string;
  /** Key visual imagery from the lyrics (concrete images that should appear in scenes) */
  keyImagery: string[];
  /** Mood shifts across the song with timing and lighting suggestions */
  moodShifts: MoodShift[];
  /** Song section map with timing, lyrics, and intensity */
  sections: SongSection[];
  /** Overall mood/feeling of the piece */
  overallMood: string;
  /** Dominant colour palette suggested by the content (e.g. ["deep red", "gold", "black"]) */
  dominantColours: string[];
  /** Setting/environment context (e.g. "urban night, rain-soaked streets") */
  settingContext: string;
  /** Camera style suggestion (e.g. "handheld, intimate close-ups") */
  cameraStyle: string;
  /** Whether the content is performance-based (singer on stage) or narrative (story-driven) */
  contentType: "performance" | "narrative" | "mixed";
  /** Specific lyric lines that are most visually powerful and should be highlighted */
  highlightLyrics: string[];
  /** Genre-specific visual conventions to follow */
  genreVisuals: string;
}

// ── Main Analysis Function ────────────────────────────────────────────────────

export interface AnalyseContentInput {
  /** Full lyrics text */
  lyrics?: string;
  /** Timestamped lyric segments from Whisper transcription */
  lyricSegments?: Array<{ start: number; end: number; text: string }>;
  /** User's theme/setting prompt (e.g. "desert at sunset, lone warrior") */
  themePrompt?: string;
  /** Song title */
  title?: string;
  /** Genre (e.g. "rock", "hip-hop", "pop") */
  genre?: string;
  /** Mood (e.g. "energetic", "melancholic", "triumphant") */
  mood?: string;
  /** Total audio duration in seconds */
  audioDuration?: number;
  /** Application type — affects what the analysis focuses on */
  appType?: "music_video" | "wizsound" | "wizanimate" | "wizscript";
}

export async function analyseContent(input: AnalyseContentInput): Promise<ContentAnalysis> {
  const {
    lyrics = "",
    lyricSegments = [],
    themePrompt = "",
    title = "Untitled",
    genre = "pop",
    mood = "neutral",
    audioDuration = 180,
    appType = "music_video",
  } = input;

  // Build timestamped lyric map for section detection
  const timestampedLyrics = lyricSegments.length > 0
    ? lyricSegments.map(s => `[${s.start.toFixed(1)}s] ${s.text}`).join("\n")
    : lyrics;

  const systemPrompt = `You are a world-class music video director and creative analyst.
Your job is to deeply understand a song and produce a structured creative brief that will drive every visual decision in the video.

You MUST:
- Read the lyrics carefully and understand the story, emotions, and imagery
- Identify the song's narrative arc (what journey does the listener go on?)
- Map the emotional intensity across the song (where does it peak? where does it soften?)
- Extract concrete visual imagery from the lyrics (if lyrics say "fire in my eyes", that's a visual)
- Identify the song structure (intro, verse, chorus, bridge, outro) from lyric patterns and timing
- Suggest a colour palette that matches the emotional tone
- Suggest camera styles that match the genre and mood
- Respect the user's theme/setting prompt — it OVERRIDES generic genre conventions

The user's theme prompt is sacred. If they say "desert at sunset", EVERY scene must be in that desert.
If the lyrics say "standing on the edge", the desert scene should show a cliff edge or dune peak.
The setting and lyrics must work TOGETHER, not independently.

Return ONLY valid JSON matching the ContentAnalysis schema. No markdown, no explanation.`;

  const userPrompt = `Analyse this song deeply and return a ContentAnalysis JSON object.

SONG TITLE: ${title}
GENRE: ${genre}
MOOD: ${mood}
DURATION: ${audioDuration}s
USER'S THEME/SETTING: ${themePrompt || "Not specified — use genre conventions"}
APPLICATION: ${appType}

LYRICS (with timestamps if available):
${timestampedLyrics || "No lyrics provided — analyse based on title, genre, and mood"}

Return a ContentAnalysis JSON with these exact fields:
{
  "theme": "one sentence: what is this song about?",
  "narrative": "what story is told across the whole piece?",
  "emotionalArc": "describe the emotional journey from start to finish",
  "keyImagery": ["concrete visual image from lyrics", "another image", ...],
  "moodShifts": [
    { "atTime": 45, "description": "builds from sadness to anger", "lightingSuggestion": "shift from blue to red" }
  ],
  "sections": [
    { "type": "intro", "startTime": 0, "endTime": 8, "lyrics": "...", "intensity": 3 },
    { "type": "verse", "startTime": 8, "endTime": 32, "lyrics": "...", "intensity": 5 },
    { "type": "chorus", "startTime": 32, "endTime": 56, "lyrics": "...", "intensity": 9 }
  ],
  "overallMood": "e.g. defiant, melancholic, triumphant, euphoric",
  "dominantColours": ["deep red", "gold", "black"],
  "settingContext": "e.g. rain-soaked urban streets at night",
  "cameraStyle": "e.g. handheld intimate close-ups with wide establishing shots",
  "contentType": "performance" | "narrative" | "mixed",
  "highlightLyrics": ["most powerful lyric line 1", "most powerful lyric line 2"],
  "genreVisuals": "genre-specific visual conventions to follow"
}

IMPORTANT: If the user specified a theme/setting, the settingContext MUST reflect it.
If no lyrics are provided, infer from title, genre, and mood.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              theme: { type: "string" },
              narrative: { type: "string" },
              emotionalArc: { type: "string" },
              keyImagery: { type: "array", items: { type: "string" } },
              moodShifts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    atTime: { type: "number" },
                    description: { type: "string" },
                    lightingSuggestion: { type: "string" },
                  },
                  required: ["atTime", "description", "lightingSuggestion"],
                  additionalProperties: false,
                },
              },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["intro", "verse", "pre-chorus", "chorus", "bridge", "breakdown", "outro", "unknown"] },
                    startTime: { type: "number" },
                    endTime: { type: "number" },
                    lyrics: { type: "string" },
                    intensity: { type: "number" },
                  },
                  required: ["type", "startTime", "endTime", "lyrics", "intensity"],
                  additionalProperties: false,
                },
              },
              overallMood: { type: "string" },
              dominantColours: { type: "array", items: { type: "string" } },
              settingContext: { type: "string" },
              cameraStyle: { type: "string" },
              contentType: { type: "string", enum: ["performance", "narrative", "mixed"] },
              highlightLyrics: { type: "array", items: { type: "string" } },
              genreVisuals: { type: "string" },
            },
            required: [
              "theme", "narrative", "emotionalArc", "keyImagery", "moodShifts",
              "sections", "overallMood", "dominantColours", "settingContext",
              "cameraStyle", "contentType", "highlightLyrics", "genreVisuals",
            ],
            additionalProperties: false,
          },
        },
      },
    } as any);

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in LLM response");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    console.log(`[ContentAnalyser] "${title}" — theme: "${parsed.theme}", mood: "${parsed.overallMood}", sections: ${parsed.sections?.length ?? 0}, imagery: ${parsed.keyImagery?.length ?? 0} items`);
    return parsed as ContentAnalysis;
  } catch (err: any) {
    console.error(`[ContentAnalyser] Analysis failed for "${title}":`, err?.message ?? err);
    // Return a safe fallback so generation can still proceed
    return buildFallbackAnalysis(input);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get the song section type for a given timestamp.
 * Used by scene generators to determine scene type (chorus → wide shot, verse → intimate).
 */
export function getSectionAtTime(analysis: ContentAnalysis, timeSeconds: number): SongSection | null {
  return analysis.sections.find(s => timeSeconds >= s.startTime && timeSeconds < s.endTime) ?? null;
}

/**
 * Get the lighting suggestion for a given timestamp based on mood shifts.
 */
export function getLightingAtTime(analysis: ContentAnalysis, timeSeconds: number): string | null {
  // Find the most recent mood shift before this time
  const pastShifts = analysis.moodShifts
    .filter(s => s.atTime <= timeSeconds)
    .sort((a, b) => b.atTime - a.atTime);
  return pastShifts[0]?.lightingSuggestion ?? null;
}

/**
 * Build a scene-level visual brief from the content analysis.
 * Called by the storyboard generator for each scene.
 */
export function buildSceneVisualBrief(
  analysis: ContentAnalysis,
  sceneStartTime: number,
  sceneLyrics: string,
  userTheme: string
): string {
  const section = getSectionAtTime(analysis, sceneStartTime);
  const lighting = getLightingAtTime(analysis, sceneStartTime);

  const parts: string[] = [];

  // 1. Setting — user theme is ALWAYS the foundation
  if (userTheme) {
    parts.push(`SETTING (MANDATORY): ${userTheme}. This setting MUST appear in this scene.`);
  } else if (analysis.settingContext) {
    parts.push(`SETTING: ${analysis.settingContext}`);
  }

  // 2. Section-specific camera and energy direction
  if (section) {
    switch (section.type) {
      case "chorus":
        parts.push(`SCENE TYPE: CHORUS — wide stage shot, full band visible, maximum energy, crowd energy, peak performance moment. Intensity: ${section.intensity}/10`);
        break;
      case "verse":
        parts.push(`SCENE TYPE: VERSE — intimate close-up, storytelling moment, character-focused, emotional depth. Intensity: ${section.intensity}/10`);
        break;
      case "bridge":
      case "breakdown":
        parts.push(`SCENE TYPE: BRIDGE/BREAKDOWN — dramatic, abstract, or emotional peak. Unexpected visual. Intensity: ${section.intensity}/10`);
        break;
      case "intro":
        parts.push(`SCENE TYPE: INTRO — establishing shot, set the scene, build anticipation. Intensity: ${section.intensity}/10`);
        break;
      case "outro":
        parts.push(`SCENE TYPE: OUTRO — resolution, fade, emotional landing. Intensity: ${section.intensity}/10`);
        break;
      default:
        parts.push(`SCENE INTENSITY: ${section.intensity}/10`);
    }
  }

  // 3. Lyric imagery — what the lyrics are saying RIGHT NOW must be visible
  if (sceneLyrics && sceneLyrics.trim()) {
    parts.push(`LYRIC IMAGERY (MANDATORY): The lyrics at this moment are: "${sceneLyrics.trim()}". The scene MUST visually reflect this lyric — show the imagery described in the words.`);
  }

  // 4. Lighting from mood shift
  if (lighting) {
    parts.push(`LIGHTING: ${lighting}`);
  } else if (analysis.dominantColours.length > 0) {
    parts.push(`COLOUR PALETTE: ${analysis.dominantColours.join(", ")}`);
  }

  // 5. Key imagery from the song (inject relevant ones)
  const relevantImagery = analysis.keyImagery.slice(0, 3);
  if (relevantImagery.length > 0) {
    parts.push(`KEY VISUAL THEMES FROM SONG: ${relevantImagery.join("; ")}`);
  }

  // 6. Camera style
  if (analysis.cameraStyle) {
    parts.push(`CAMERA STYLE: ${analysis.cameraStyle}`);
  }

  return parts.join("\n");
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function buildFallbackAnalysis(input: AnalyseContentInput): ContentAnalysis {
  const duration = input.audioDuration ?? 180;
  return {
    theme: `A ${input.genre ?? "music"} song about ${input.mood ?? "emotion"} and expression`,
    narrative: "A musical journey through emotion and performance",
    emotionalArc: "Builds from opening to peak energy at chorus, resolves at outro",
    keyImagery: ["stage lights", "microphone", "crowd energy", "raw emotion"],
    moodShifts: [
      { atTime: duration * 0.3, description: "energy builds", lightingSuggestion: "brighter, warmer tones" },
      { atTime: duration * 0.6, description: "peak intensity", lightingSuggestion: "dramatic contrast, deep shadows" },
    ],
    sections: [
      { type: "intro", startTime: 0, endTime: duration * 0.1, lyrics: "", intensity: 3 },
      { type: "verse", startTime: duration * 0.1, endTime: duration * 0.35, lyrics: input.lyrics?.slice(0, 200) ?? "", intensity: 5 },
      { type: "chorus", startTime: duration * 0.35, endTime: duration * 0.55, lyrics: "", intensity: 9 },
      { type: "verse", startTime: duration * 0.55, endTime: duration * 0.75, lyrics: "", intensity: 6 },
      { type: "chorus", startTime: duration * 0.75, endTime: duration * 0.9, lyrics: "", intensity: 9 },
      { type: "outro", startTime: duration * 0.9, endTime: duration, lyrics: "", intensity: 4 },
    ],
    overallMood: input.mood ?? "energetic",
    dominantColours: ["deep blue", "gold", "black"],
    settingContext: input.themePrompt ?? "concert stage with dramatic lighting",
    cameraStyle: "dynamic mix of close-ups and wide shots",
    contentType: "performance",
    highlightLyrics: [],
    genreVisuals: `Standard ${input.genre ?? "music"} video visual conventions`,
  };
}
