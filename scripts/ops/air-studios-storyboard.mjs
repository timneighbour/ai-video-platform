/**
 * Air Studios Music Video Storyboard
 * Song: "Beauty of the Wreckage" (demo track, 70.87s)
 * 
 * Instrumentation confirmed in track:
 *   - Grand piano (throughout)
 *   - Orchestral strings: violins + cellos/violas (from verse 1)
 *   - Acoustic drums (chorus only, 45s+)
 *   - Electric bass (chorus only, 45s+)
 *   - Synth pad atmosphere (throughout)
 * 
 * Concept: Air Studios Lindhurst Hall aesthetic
 *   - Massive recording hall, warm amber studio lighting
 *   - High ceilings, large windows, wooden floors
 *   - Real musicians visible in background
 *   - Zara at a vintage microphone stand, centre
 *   - Grand piano to her left, string section behind
 *   - Drummer visible from chorus onwards
 * 
 * Scene duration: 6 seconds each
 * Total scenes: 11 (covering 0–66s, outro fades naturally)
 * 
 * Performance scenes (lipSync=true): Zara close-up, face fills frame
 * Cinematic scenes (lipSync=false): Wide/establishing shots
 */

export const SCENES = [
  // ── INTRO (0–13s) ──────────────────────────────────────────────────────────
  {
    sceneIndex: 0,
    startTime: 0,        // ms
    duration: 6,         // seconds
    sceneType: "cinematic",
    lipSync: false,
    prompt: `Cinematic establishing shot inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Massive high-ceilinged room with warm amber and golden lighting, large arched windows with soft natural light filtering through. Polished wooden floors reflect the warm glow. A grand Steinway piano sits to the left, a string section of four violinists and two cellists are seated behind music stands in the background, tuning their instruments. A vintage Neumann U87 microphone on a stand is positioned centre-frame. The atmosphere is intimate and professional. No people in foreground yet. Cinematic 4K, shallow depth of field, film grain.`,
  },
  {
    sceneIndex: 1,
    startTime: 6000,
    duration: 6,
    sceneType: "cinematic",
    lipSync: false,
    prompt: `Close-up cinematic shot of a pianist's hands resting gently on the keys of a grand Steinway piano inside a warm recording studio. Soft amber studio lighting, shallow depth of field. The keys are ivory and ebony, beautifully lit. In the blurred background, a string section is visible, seated with bows ready. The atmosphere is quiet anticipation before the music begins. Air Studios aesthetic, warm golden tones, film grain, 4K.`,
  },

  // ── VERSE 1 (13–34s) ───────────────────────────────────────────────────────
  {
    sceneIndex: 2,
    startTime: 12000,
    duration: 6,
    sceneType: "performance",
    lipSync: true,
    prompt: `Close-up performance shot of Zara, a young Black British woman in her late 20s with natural hair, wearing an elegant deep burgundy dress, singing into a vintage Neumann U87 microphone in a grand recording studio. Warm amber studio lighting illuminates her face. Her eyes are closed, expression deeply emotional and vulnerable. The studio hall is visible in soft focus behind her — grand piano, string musicians. Air Studios aesthetic, cinematic 4K, shallow depth of field, film grain.`,
  },
  {
    sceneIndex: 3,
    startTime: 18000,
    duration: 6,
    sceneType: "cinematic",
    lipSync: false,
    prompt: `Wide cinematic shot inside Air Studios-style recording hall. Zara stands at the microphone centre-frame, singing with eyes closed. To her left, a pianist plays the grand Steinway with focused intensity. Behind her, a string quartet of four violinists bow their instruments in unison, their movements fluid and expressive. Warm amber and golden studio lighting, high ceilings with exposed wooden beams, large windows. The musicians all appear to be playing in time together. Cinematic 4K, film grain.`,
  },
  {
    sceneIndex: 4,
    startTime: 24000,
    duration: 6,
    sceneType: "performance",
    lipSync: true,
    prompt: `Medium close-up of Zara singing passionately at a vintage microphone in a grand recording studio. Her expression is raw and emotional, conveying vulnerability and truth. She wears a deep burgundy elegant dress. Warm amber studio lighting, slight bokeh on the background showing string musicians bowing. Air Studios aesthetic, cinematic 4K, shallow depth of field.`,
  },
  {
    sceneIndex: 5,
    startTime: 30000,
    duration: 6,
    sceneType: "cinematic",
    lipSync: false,
    prompt: `Cinematic side-angle shot of a violinist in a recording studio, bowing her violin with intense focus and expression. She is part of a string section visible in soft focus behind her. Warm amber studio lighting, the grand piano visible in the background. The musician appears deeply engaged, playing with emotion. Air Studios aesthetic, shallow depth of field, 4K, film grain.`,
  },

  // ── PRE-CHORUS (34–45s) ────────────────────────────────────────────────────
  {
    sceneIndex: 6,
    startTime: 36000,
    duration: 6,
    sceneType: "performance",
    lipSync: true,
    prompt: `Close-up performance shot of Zara at the microphone, her expression building with emotional intensity as the music swells. Eyes beginning to open, jaw slightly raised, conveying growing power and conviction. Warm amber lighting with a slight golden rim light on her hair. The string section is visible in soft focus behind, bows moving with increasing energy. Air Studios aesthetic, cinematic 4K.`,
  },
  {
    sceneIndex: 7,
    startTime: 42000,
    duration: 6,
    sceneType: "cinematic",
    lipSync: false,
    prompt: `Wide dramatic shot of the full recording studio ensemble at the moment before the chorus breaks. Zara stands at the microphone with arms slightly raised, the string section of six musicians behind her with bows raised, the pianist's hands poised over the keys. The room is bathed in warm golden studio light. High ceilings, large windows, polished wooden floors. A sense of collective anticipation and power. Air Studios Lindhurst Hall aesthetic, cinematic 4K, film grain.`,
  },

  // ── CHORUS (45–64s) ────────────────────────────────────────────────────────
  {
    sceneIndex: 8,
    startTime: 48000,
    duration: 6,
    sceneType: "performance",
    lipSync: true,
    prompt: `Powerful close-up of Zara singing at full voice at the microphone, eyes open and blazing with emotion, jaw wide, expression triumphant and cathartic. Her burgundy dress catches the warm studio light. Behind her in soft focus, the string section bows vigorously and a drummer is now visible at a drum kit in the background. Air Studios aesthetic, warm amber lighting, cinematic 4K.`,
  },
  {
    sceneIndex: 9,
    startTime: 54000,
    duration: 6,
    sceneType: "cinematic",
    lipSync: false,
    prompt: `Wide cinematic shot of the full recording studio in full performance. Zara at the microphone, arms open, singing with full power. The string section behind her bows with vigour and expression. A drummer is visible at a drum kit in the background, playing with intensity. The grand piano player is visible to the left. Warm golden studio lighting fills the hall. Air Studios Lindhurst Hall, high ceilings, large windows, cinematic 4K, film grain.`,
  },
  {
    sceneIndex: 10,
    startTime: 60000,
    duration: 6,
    sceneType: "performance",
    lipSync: true,
    prompt: `Intimate close-up of Zara at the microphone, the final moments of the chorus, her expression shifting from triumph to quiet resolution. Eyes glistening, a slight smile. The warm amber studio light softens around her. In the blurred background, the string musicians hold their final notes, bows resting. Air Studios aesthetic, cinematic 4K, shallow depth of field, film grain.`,
  },
];

console.log(`Total scenes: ${SCENES.length}`);
console.log(`Total duration: ${SCENES.reduce((a, s) => a + s.duration, 0)}s`);
console.log(`Performance scenes (lip sync): ${SCENES.filter(s => s.lipSync).length}`);
console.log(`Cinematic scenes: ${SCENES.filter(s => !s.lipSync).length}`);
console.log('\nScene breakdown:');
SCENES.forEach(s => {
  console.log(`  [${s.sceneIndex}] ${s.startTime/1000}s-${s.startTime/1000 + s.duration}s | ${s.sceneType} | lipSync=${s.lipSync}`);
});
