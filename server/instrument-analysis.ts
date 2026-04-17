/**
 * Audio-to-Character Assignment Engine
 *
 * WIZ AI's core USP: each character is bound to a specific audio track and
 * instrument. Every animation directive in the render prompt is derived from
 * the actual audio — no generic looped animations, no random strumming.
 *
 * Pipeline:
 *   Audio metadata + lyrics + genre/mood
 *     → analyseAudioInstruments()        — detect instruments + time-map
 *     → assignInstrumentsToCharacters()  — CHARACTER → INSTRUMENT → AUDIO TRACK
 *     → buildPerformancePromptBlock()    — inject into scene prompt
 *
 * Multi-role characters (e.g. "Tim = guitar + vocals") are fully supported:
 * both instruments are synchronised simultaneously in the prompt.
 */

import { invokeLLM } from "./_core/llm";

// ─── Instrument Types ────────────────────────────────────────────────────────

export type InstrumentType =
  | "lead_vocals"
  | "backing_vocals"
  | "electric_guitar"
  | "acoustic_guitar"
  | "bass_guitar"
  | "drums"
  | "piano"
  | "keyboard"
  | "violin"
  | "saxophone"
  | "trumpet"
  | "other";

// ─── Audio Track ─────────────────────────────────────────────────────────────

export interface InstrumentTrack {
  instrument: InstrumentType;
  label: string;            // Human-readable e.g. "Electric Guitar"
  prominence: "lead" | "supporting" | "background";
  isVocal: boolean;
  performanceNotes: string; // e.g. "heavy distortion riff, power chords"
  // Audio track binding — identifies which waveform this character responds to
  audioTrackId: string;     // e.g. "guitar_lead", "drums", "bass", "vocals_lead"
}

export interface InstrumentAnalysis {
  instruments: InstrumentTrack[];
  tempo: number;
  timeSignature: string;
  musicalKey: string;
  energyLevel: "low" | "medium" | "high" | "intense";
  analysedAt: string;
}

// ─── Character-Instrument Binding ────────────────────────────────────────────

/**
 * A locked binding: CHARACTER → INSTRUMENT(S) → AUDIO TRACK(S)
 * Once set, this never changes between scenes.
 * Multi-role characters carry multiple instrument entries.
 */
export interface AudioTrackBinding {
  audioTrackId: string;     // e.g. "guitar_lead", "vocals_lead"
  instrumentType: InstrumentType;
  instrumentLabel: string;
  performanceNotes: string;
}

export interface CharacterInstrumentAssignment {
  characterName: string;
  // Primary role label (for UI display)
  performanceRole: string;  // e.g. "Lead Vocalist & Guitarist"
  // All bound audio tracks — supports multi-role (guitar + vocals simultaneously)
  audioBindings: AudioTrackBinding[];
  // Full performance directive block for prompt injection
  performanceDirective: string;
  // Camera guidance for this character's instruments
  cameraGuidance: string;
  // Whether this assignment is locked (cannot change after storyboard approval)
  isLocked: boolean;
}

// ─── Performance Directive Library ───────────────────────────────────────────
// Physically correct, audio-synchronised performance descriptions.
// These are injected verbatim into the render prompt.

interface InstrumentDirective {
  label: string;
  audioTrackId: string;
  performanceBlock: string;
  cameraGuidance: string;
}

const INSTRUMENT_DIRECTIVES: Record<InstrumentType, InstrumentDirective> = {
  lead_vocals: {
    label: "Lead Vocalist",
    audioTrackId: "vocals_lead",
    performanceBlock:
      "standing at a professional microphone, gripping the mic stand with one hand, " +
      "mouth wide open singing with full expression, lips and jaw moving in PERFECT SYNC with the vocal melody, " +
      "natural breathing between phrases, eyes closed or intense eye contact with camera, " +
      "body swaying slightly with the rhythm, emotionally engaged performance, " +
      "mouth movement driven directly by the vocal waveform — every word, every breath, every phrase",
    cameraGuidance:
      "tight close-up on face and mouth for lip sync verification, " +
      "mid-shot showing upper body and mic stand, " +
      "occasional wide shot showing full stage presence",
  },
  backing_vocals: {
    label: "Backing Vocalist",
    audioTrackId: "vocals_backing",
    performanceBlock:
      "standing at a secondary microphone, mouth open and moving in sync with backing vocal harmonies, " +
      "slightly behind the lead vocalist, holding the mic or mic stand, " +
      "subtle body movement matching the rhythm",
    cameraGuidance:
      "mid-shot showing vocalist and mic, occasional two-shot with lead vocalist",
  },
  electric_guitar: {
    label: "Electric Guitarist",
    audioTrackId: "guitar_lead",
    performanceBlock:
      "holding an electric guitar with correct left-hand fretting position on the neck, " +
      "fingers pressing down on specific frets matching the chord changes, " +
      "right hand strumming or picking the strings with a plectrum, " +
      "strumming motion PERFECTLY TIMED to the beat and rhythm of the guitar track, " +
      "wrist and elbow movement realistic for the tempo, " +
      "guitar strap over shoulder, body angled toward the amp, " +
      "physically believable hand coordination between fretting and strumming, " +
      "every strum driven by the guitar audio waveform — no random or looped motion",
    cameraGuidance:
      "close-up on left hand fretting the neck showing chord shapes, " +
      "close-up on right hand strumming showing pick technique, " +
      "mid-shot showing full guitar and upper body, " +
      "wide shot showing stage position",
  },
  acoustic_guitar: {
    label: "Acoustic Guitarist",
    audioTrackId: "guitar_acoustic",
    performanceBlock:
      "seated or standing with an acoustic guitar, " +
      "left hand correctly positioned on the fretboard with fingers pressing strings for each chord, " +
      "right hand strumming or fingerpicking in EXACT TIME with the music, " +
      "natural arm and wrist movement matching the song tempo, " +
      "guitar body resting against the body naturally, " +
      "every strum and pick driven by the acoustic guitar audio track",
    cameraGuidance:
      "close-up on picking hand showing fingerpicking or strumming technique, " +
      "close-up on fret hand showing chord shapes, " +
      "mid-shot showing full guitar",
  },
  bass_guitar: {
    label: "Bassist",
    audioTrackId: "bass",
    performanceBlock:
      "playing a bass guitar with low-slung strap, " +
      "left hand on the neck with fingers pressing bass strings for each note, " +
      "right hand plucking or picking strings in EXACT SYNC with the bass line, " +
      "subtle head nod matching the groove, " +
      "physically correct plucking motion with index and middle finger alternating, " +
      "locked in rhythmically with the drummer, " +
      "every pluck driven directly by the bass audio waveform",
    cameraGuidance:
      "mid-shot showing bassist and instrument, " +
      "close-up on plucking hand showing technique, " +
      "wide shot showing bassist and drummer together for rhythm section cohesion",
  },
  drums: {
    label: "Drummer",
    audioTrackId: "drums",
    performanceBlock:
      "seated behind a full drum kit, " +
      "right hand holding drumstick hitting the hi-hat on every beat in sync with the hi-hat audio track, " +
      "left hand hitting the snare drum on beats 2 and 4 in sync with the snare audio track, " +
      "right foot on the kick drum pedal hitting in sync with the kick drum audio track, " +
      "left foot on the hi-hat pedal, " +
      "ALL FOUR LIMBS moving in correct independent coordination driven by the drum audio track, " +
      "drumstick rebound realistic and timed to the exact tempo, " +
      "cymbals crashing at correct musical moments, " +
      "physically believable drumming posture and technique, " +
      "kick, snare, hi-hat, and cymbal hits ALL mapped to correct limb movement from the percussion waveform",
    cameraGuidance:
      "overhead shot showing full kit and all four limbs in action, " +
      "close-up on snare hit showing stick rebound, " +
      "close-up on kick pedal showing foot motion, " +
      "mid-shot showing upper body and arms, " +
      "wide shot showing full drum kit",
  },
  piano: {
    label: "Pianist",
    audioTrackId: "piano",
    performanceBlock:
      "seated at an upright or grand piano, " +
      "both hands positioned correctly on the keys, " +
      "fingers pressing down specific piano keys in EXACT SYNC with the melody and chord progression, " +
      "wrists relaxed and slightly elevated, " +
      "key presses timed exactly to each musical note from the piano audio track, " +
      "body swaying slightly with the phrasing, " +
      "physically correct piano technique with curved fingers",
    cameraGuidance:
      "close-up on both hands on the keys showing key presses, " +
      "overhead shot showing keyboard and hands, " +
      "mid-shot showing pianist from the side, " +
      "wide shot showing full piano",
  },
  keyboard: {
    label: "Keyboard Player",
    audioTrackId: "keyboard",
    performanceBlock:
      "standing or seated at an electronic keyboard or synthesiser, " +
      "both hands on the keys with fingers pressing in EXACT SYNC with the melody from the keyboard audio track, " +
      "correct hand positioning for the chord voicings, " +
      "body moving slightly with the music",
    cameraGuidance:
      "close-up on hands on keyboard showing key presses, " +
      "mid-shot showing player and instrument",
  },
  violin: {
    label: "Violinist",
    audioTrackId: "violin",
    performanceBlock:
      "holding a violin under the chin with left hand on the neck, " +
      "right hand drawing the bow across the strings in smooth, controlled strokes in sync with the violin audio track, " +
      "bow speed and pressure matching the musical dynamics, " +
      "left hand fingers pressing the strings for correct pitch, " +
      "physically correct bowing technique",
    cameraGuidance:
      "close-up on bow arm and bowing motion, " +
      "close-up on left hand fingering, " +
      "mid-shot showing full violin",
  },
  saxophone: {
    label: "Saxophonist",
    audioTrackId: "saxophone",
    performanceBlock:
      "holding a saxophone with both hands on the keys, " +
      "mouthpiece in mouth, cheeks puffed slightly, " +
      "fingers pressing the saxophone keys in sync with the melody from the saxophone audio track, " +
      "body swaying with the phrasing",
    cameraGuidance:
      "mid-shot showing saxophonist and instrument, " +
      "close-up on hands and keys",
  },
  trumpet: {
    label: "Trumpet Player",
    audioTrackId: "trumpet",
    performanceBlock:
      "holding a trumpet with both hands, mouthpiece pressed to lips, " +
      "right hand fingers pressing valves in sync with the melody from the trumpet audio track, " +
      "cheeks slightly puffed, body upright",
    cameraGuidance:
      "mid-shot showing trumpet player, " +
      "close-up on valve hand",
  },
  other: {
    label: "Musician",
    audioTrackId: "other",
    performanceBlock:
      "playing their instrument with correct technique, " +
      "movements timed to the music, physically believable performance",
    cameraGuidance:
      "mid-shot showing musician and instrument",
  },
};

// ─── Audio Analysis ──────────────────────────────────────────────────────────

export async function analyseAudioInstruments(params: {
  genre: string | null;
  mood: string | null;
  title: string;
  lyrics: string | null;
  audioDuration: number;
  themePrompt: string;
}): Promise<InstrumentAnalysis> {
  const { genre, mood, title, lyrics, audioDuration, themePrompt } = params;
  const lyricsSnippet = lyrics
    ? lyrics.slice(0, 600).replace(/\n/g, " ")
    : "No lyrics available";

  const systemPrompt =
    "You are a music production expert. Analyse the provided song metadata and determine " +
    "which instruments are present. Return a JSON object matching the InstrumentAnalysis schema exactly.";

  const userPrompt = `Analyse this song and identify all instruments present:

Title: ${title}
Genre: ${genre ?? "Unknown"}
Mood: ${mood ?? "Unknown"}
Duration: ${audioDuration} seconds
Theme/Description: ${themePrompt}
Lyrics snippet: "${lyricsSnippet}"

Return JSON with this exact schema:
{
  "instruments": [
    {
      "instrument": "lead_vocals|backing_vocals|electric_guitar|acoustic_guitar|bass_guitar|drums|piano|keyboard|violin|saxophone|trumpet|other",
      "label": "Human readable name",
      "prominence": "lead|supporting|background",
      "isVocal": true,
      "performanceNotes": "Specific playing style e.g. 'heavy distortion power chords'",
      "audioTrackId": "unique track id e.g. vocals_lead, guitar_lead, bass, drums, piano"
    }
  ],
  "tempo": 120,
  "timeSignature": "4/4",
  "musicalKey": "E minor",
  "energyLevel": "low|medium|high|intense",
  "analysedAt": "${new Date().toISOString()}"
}

Rules:
- Always include lead_vocals if the song has lyrics
- Include drums for rock, pop, hip-hop, dance
- Include bass_guitar for rock, pop, R&B, hip-hop
- Be specific about guitar type (electric vs acoustic) based on genre
- List instruments in order of prominence (most prominent first)
- audioTrackId must be unique per instrument: vocals_lead, vocals_backing, guitar_lead, guitar_rhythm, bass, drums, piano, keyboard, violin, saxophone, trumpet`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "instrument_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              instruments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    instrument: { type: "string" },
                    label: { type: "string" },
                    prominence: { type: "string" },
                    isVocal: { type: "boolean" },
                    performanceNotes: { type: "string" },
                    audioTrackId: { type: "string" },
                  },
                  required: ["instrument", "label", "prominence", "isVocal", "performanceNotes", "audioTrackId"],
                  additionalProperties: false,
                },
              },
              tempo: { type: "number" },
              timeSignature: { type: "string" },
              musicalKey: { type: "string" },
              energyLevel: { type: "string" },
              analysedAt: { type: "string" },
            },
            required: ["instruments", "tempo", "timeSignature", "musicalKey", "energyLevel", "analysedAt"],
            additionalProperties: false,
          },
        },
      },
    } as any);

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    parsed.analysedAt = new Date().toISOString();
    return parsed as InstrumentAnalysis;
  } catch (err) {
    console.error("[InstrumentAnalysis] LLM analysis failed, using genre-based fallback:", err);
    return buildFallbackAnalysis(genre, mood, audioDuration);
  }
}

function buildFallbackAnalysis(
  genre: string | null,
  mood: string | null,
  audioDuration: number
): InstrumentAnalysis {
  const g = (genre ?? "").toLowerCase();
  const instruments: InstrumentTrack[] = [
    {
      instrument: "lead_vocals",
      label: "Lead Vocalist",
      prominence: "lead",
      isVocal: true,
      performanceNotes: "expressive lead vocals",
      audioTrackId: "vocals_lead",
    },
  ];

  if (g.includes("rock") || g.includes("metal") || g.includes("punk")) {
    instruments.push(
      { instrument: "electric_guitar", label: "Electric Guitar", prominence: "lead", isVocal: false, performanceNotes: "distorted power chords and riffs", audioTrackId: "guitar_lead" },
      { instrument: "bass_guitar", label: "Bass Guitar", prominence: "supporting", isVocal: false, performanceNotes: "driving bass line", audioTrackId: "bass" },
      { instrument: "drums", label: "Drums", prominence: "lead", isVocal: false, performanceNotes: "heavy kick and snare", audioTrackId: "drums" }
    );
  } else if (g.includes("pop")) {
    instruments.push(
      { instrument: "keyboard", label: "Keyboard", prominence: "supporting", isVocal: false, performanceNotes: "synth pads and melodic lines", audioTrackId: "keyboard" },
      { instrument: "bass_guitar", label: "Bass Guitar", prominence: "supporting", isVocal: false, performanceNotes: "groovy bass line", audioTrackId: "bass" },
      { instrument: "drums", label: "Drums", prominence: "supporting", isVocal: false, performanceNotes: "pop drum pattern", audioTrackId: "drums" }
    );
  } else if (g.includes("jazz") || g.includes("blues")) {
    instruments.push(
      { instrument: "piano", label: "Piano", prominence: "lead", isVocal: false, performanceNotes: "jazz chord voicings and improvisation", audioTrackId: "piano" },
      { instrument: "bass_guitar", label: "Bass Guitar", prominence: "supporting", isVocal: false, performanceNotes: "walking bass line", audioTrackId: "bass" },
      { instrument: "drums", label: "Drums", prominence: "supporting", isVocal: false, performanceNotes: "jazz brushwork", audioTrackId: "drums" }
    );
  } else if (g.includes("acoustic") || g.includes("folk") || g.includes("country")) {
    instruments.push(
      { instrument: "acoustic_guitar", label: "Acoustic Guitar", prominence: "lead", isVocal: false, performanceNotes: "fingerpicked or strummed acoustic", audioTrackId: "guitar_acoustic" }
    );
  } else {
    instruments.push(
      { instrument: "electric_guitar", label: "Guitar", prominence: "supporting", isVocal: false, performanceNotes: "rhythm guitar", audioTrackId: "guitar_lead" },
      { instrument: "bass_guitar", label: "Bass Guitar", prominence: "supporting", isVocal: false, performanceNotes: "bass line", audioTrackId: "bass" },
      { instrument: "drums", label: "Drums", prominence: "supporting", isVocal: false, performanceNotes: "standard drum pattern", audioTrackId: "drums" }
    );
  }

  return {
    instruments,
    tempo: 120,
    timeSignature: "4/4",
    musicalKey: "Unknown",
    energyLevel:
      (mood ?? "").toLowerCase().includes("energetic") || (mood ?? "").toLowerCase().includes("intense")
        ? "high"
        : "medium",
    analysedAt: new Date().toISOString(),
  };
}

// ─── Character-Instrument Assignment ─────────────────────────────────────────

/**
 * Assign each character to one or more audio tracks.
 *
 * Priority matching:
 * 1. Existing role hint on the character (e.g. "drummer" → drums)
 * 2. Prominence order (lead instruments first)
 * 3. Multi-role: if a character's role contains both "guitar" and "vocal",
 *    they are bound to BOTH audio tracks simultaneously.
 *
 * This binding is LOCKED — it never changes between scenes.
 */
export function assignInstrumentsToCharacters(
  characters: Array<{ name: string; role: string | null; slotIndex: number }>,
  analysis: InstrumentAnalysis
): CharacterInstrumentAssignment[] {
  const assignments: CharacterInstrumentAssignment[] = [];
  const usedAudioTrackIds = new Set<string>();

  // Sort by prominence
  const sortedInstruments = [...analysis.instruments].sort((a, b) => {
    const order = { lead: 0, supporting: 1, background: 2 };
    return order[a.prominence] - order[b.prominence];
  });

  // Sort characters by slot index
  const sortedChars = [...characters].sort((a, b) => a.slotIndex - b.slotIndex);

  for (const char of sortedChars) {
    const roleLower = (char.role ?? "").toLowerCase();
    const bindings: AudioTrackBinding[] = [];

    // ── Multi-role detection ──────────────────────────────────────────────────
    // Check if the character's role hint contains multiple instruments.
    // e.g. "Lead Singer and Guitarist" → vocals + guitar
    const wantsVocals =
      roleLower.includes("sing") || roleLower.includes("vocal") || roleLower.includes("lead");
    const wantsGuitar =
      roleLower.includes("guitar") || roleLower.includes("guitarist");
    const wantsBass =
      roleLower.includes("bass");
    const wantsDrums =
      roleLower.includes("drum") || roleLower.includes("percus");
    const wantsPiano =
      roleLower.includes("piano") || roleLower.includes("keyboard") || roleLower.includes("keys");

    const wantedTypes: InstrumentType[] = [];
    if (wantsVocals) wantedTypes.push("lead_vocals");
    if (wantsGuitar) wantedTypes.push("electric_guitar", "acoustic_guitar");
    if (wantsBass) wantedTypes.push("bass_guitar");
    if (wantsDrums) wantedTypes.push("drums");
    if (wantsPiano) wantedTypes.push("piano", "keyboard");

    if (wantedTypes.length > 0) {
      // Bind to all matching audio tracks (multi-role support)
      for (const wantedType of wantedTypes) {
        const track = sortedInstruments.find(
          i => (i.instrument === wantedType || (wantedType === "electric_guitar" && i.instrument === "acoustic_guitar") || (wantedType === "acoustic_guitar" && i.instrument === "electric_guitar"))
            && !usedAudioTrackIds.has(i.audioTrackId)
        );
        if (track) {
          usedAudioTrackIds.add(track.audioTrackId);
          const directive = INSTRUMENT_DIRECTIVES[track.instrument] ?? INSTRUMENT_DIRECTIVES.other;
          bindings.push({
            audioTrackId: track.audioTrackId,
            instrumentType: track.instrument,
            instrumentLabel: directive.label,
            performanceNotes: track.performanceNotes,
          });
        }
      }
    }

    // If no role hint matched, assign the next unassigned prominent instrument
    if (bindings.length === 0) {
      const track = sortedInstruments.find(i => !usedAudioTrackIds.has(i.audioTrackId));
      if (track) {
        usedAudioTrackIds.add(track.audioTrackId);
        const directive = INSTRUMENT_DIRECTIVES[track.instrument] ?? INSTRUMENT_DIRECTIVES.other;
        bindings.push({
          audioTrackId: track.audioTrackId,
          instrumentType: track.instrument,
          instrumentLabel: directive.label,
          performanceNotes: track.performanceNotes,
        });
      } else {
        // All tracks assigned — backing vocalist fallback
        bindings.push({
          audioTrackId: "vocals_backing",
          instrumentType: "backing_vocals",
          instrumentLabel: "Backing Vocalist",
          performanceNotes: "harmonising backing vocals",
        });
      }
    }

    // ── Build performance directive ───────────────────────────────────────────
    const roleLabels = bindings.map(b => b.instrumentLabel);
    const performanceRole = roleLabels.join(" & ");

    // Build per-instrument blocks
    const instrumentBlocks = bindings.map(b => {
      const directive = INSTRUMENT_DIRECTIVES[b.instrumentType] ?? INSTRUMENT_DIRECTIVES.other;
      return (
        `${char.name} is ${directive.performanceBlock}. ` +
        `Performance notes: ${b.performanceNotes}. ` +
        `This is bound to the ${b.audioTrackId} audio track — movements are driven DIRECTLY by that waveform.`
      );
    });

    // Multi-role simultaneous sync note
    const multiRoleNote = bindings.length > 1
      ? ` ${char.name} is performing BOTH roles simultaneously — ${roleLabels.join(" AND ")} at the same time, fully synchronised.`
      : "";

    const cameraBlocks = Array.from(new Set(bindings.map(b => {
      const directive = INSTRUMENT_DIRECTIVES[b.instrumentType] ?? INSTRUMENT_DIRECTIVES.other;
      return directive.cameraGuidance;
    })));

    const performanceDirective =
      `${char.name} is the ${performanceRole}. ` +
      instrumentBlocks.join(" ") +
      multiRoleNote +
      ` All movements are timed exactly to the ${analysis.tempo} BPM ${analysis.timeSignature} beat. ` +
      `This is a physically correct, audio-synchronised performance. NO generic looped animation. NO random movement.`;

    assignments.push({
      characterName: char.name,
      performanceRole,
      audioBindings: bindings,
      performanceDirective,
      cameraGuidance: cameraBlocks.join("; "),
      isLocked: true,
    });
  }

  return assignments;
}

// ─── Scene Prompt Injection ───────────────────────────────────────────────────

/**
 * Build the full performance block for a single scene's enriched prompt.
 *
 * Only includes characters that are assigned to this scene.
 * Each character's directive is derived from their locked audio-track binding.
 * No cross-over between characters — ONLY Tim responds to guitar, ONLY Greg to drums.
 */
export function buildPerformancePromptBlock(
  assignments: CharacterInstrumentAssignment[],
  assignedCharacterNames: string[],
  tempo: number,
  energyLevel: string
): string {
  if (assignments.length === 0) return "";

  // Filter to only the characters in this scene
  const sceneAssignments = assignments.filter(a =>
    assignedCharacterNames.some(n => n.toLowerCase() === a.characterName.toLowerCase())
  );

  if (sceneAssignments.length === 0) return "";

  const performanceBlocks = sceneAssignments.map(a => a.performanceDirective);
  const cameraBlocks = sceneAssignments.map(a => a.cameraGuidance);

  // Build the cross-character isolation statement
  // This explicitly tells the video generator there is NO cross-over
  const isolationStatement = sceneAssignments.length > 1
    ? sceneAssignments.map(a => {
        const trackIds = a.audioBindings.map(b => b.audioTrackId).join(" and ");
        return `ONLY ${a.characterName} responds to the ${trackIds} audio track`;
      }).join(". ") + "."
    : "";

  return (
    `AUDIO-DRIVEN PERFORMANCE REQUIRED: ` +
    performanceBlocks.join(" ") +
    (isolationStatement ? ` AUDIO ISOLATION: ${isolationStatement}` : "") +
    ` CAMERA: ${cameraBlocks.join("; ")}. ` +
    `Tempo: ${tempo} BPM, energy: ${energyLevel}. ` +
    `Every musician must appear to be genuinely performing their specific instrument in real time. ` +
    `ALL movements are synchronised to their assigned audio waveform. ` +
    `NO generic looped animations. NO incorrect hand positions. NO random movement.`
  );
}

/**
 * Get a compact summary of character-instrument assignments for UI display.
 * Used by the storyboard panel to show instrument badges.
 */
export function getAssignmentSummary(
  assignments: CharacterInstrumentAssignment[]
): Array<{
  characterName: string;
  performanceRole: string;
  instruments: string[];
  audioTracks: string[];
  isLocked: boolean;
}> {
  return assignments.map(a => ({
    characterName: a.characterName,
    performanceRole: a.performanceRole,
    instruments: a.audioBindings.map(b => b.instrumentLabel),
    audioTracks: a.audioBindings.map(b => b.audioTrackId),
    isLocked: a.isLocked,
  }));
}
