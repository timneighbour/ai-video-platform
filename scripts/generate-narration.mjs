/**
 * WIZ AI — ElevenLabs Narration Generator
 * Generates all 4 voiceover audio files for the product video.
 */
import axios from 'axios';
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';

const KEY = process.env.ELEVENLABS_API_KEY;
const OUT_DIR = '/home/ubuntu/wiz-ai-narration';
mkdirSync(OUT_DIR, { recursive: true });

if (!KEY) {
  console.error('ELEVENLABS_API_KEY not set');
  process.exit(1);
}

// Check available voices
const voicesResp = await axios.get('https://api.elevenlabs.io/v1/voices', {
  headers: { 'xi-api-key': KEY },
  timeout: 10000
});
const voices = voicesResp.data.voices || [];
console.log('Total voices available:', voices.length);

// Find best British/premium female voice
const preferred = ['Charlotte', 'Alice', 'Grace', 'Matilda', 'Rachel', 'Emily', 'Freya', 'Dorothy'];
let selectedVoice = null;
for (const name of preferred) {
  const v = voices.find(v => v.name === name);
  if (v) { selectedVoice = v; break; }
}
// Fallback: any female voice
if (!selectedVoice) {
  selectedVoice = voices.find(v => v.labels?.gender === 'female') || voices[0];
}
console.log('Selected voice:', selectedVoice.name, '|', selectedVoice.voice_id, '| labels:', JSON.stringify(selectedVoice.labels));

const VOICE_ID = selectedVoice.voice_id;

// Voice settings — calm, measured, premium
const VOICE_SETTINGS = {
  stability: 0.72,
  similarity_boost: 0.85,
  style: 0.15,
  use_speaker_boost: true
};

const SCRIPTS = {
  '90s': `Welcome to WIZ AI. The AI creative studio for musicians, creators and brands.

Imagine creating music, images, videos, shorts, animations and full visual stories from one intelligent platform. Everything you need to go from idea to finished output, without switching tools, without losing momentum.

Start with WizAudio for songs, soundtracks and vocal ideas. Use WizImage for characters, artwork and visual concepts. Turn ideas into cinematic videos with WizVideo. Create social-ready clips with WizShorts. Bring animated stories to life with WizAnimate. Or turn written prompts into scenes and full videos with WizScript.

For musicians and artists, WIZ AI goes even further. Meet WizPerformer — the tool that lets you create an AI performer that looks, moves and plays like you.

Designed to capture your face, your expressions, your body shape, your style, your instruments and your performance reference. Not just lip-sync. Performance-sync.

Behind every creation is the WIZ Engine stack. WizSound enhances your audio with cinematic depth and clarity. WizLumina adds visual polish, colour and a cinema-ready finish. WizGenesis orchestrates the entire workflow from idea to output. And WizBoost optimises speed, quality and platform-ready delivery.

WIZ AI is not just another AI tool. It is a complete creative system built to help creators move faster, look better and bring bigger ideas to life. WIZ AI. Create anything. Instantly. Start creating today.`,

  '45s': `Welcome to WIZ AI. The AI creative studio for musicians, creators and brands.

WizAudio for music. WizImage for visuals. WizVideo for cinematic content. WizShorts for social. WizAnimate for stories. WizScript for turning prompts into full productions.

And with WizPerformer, musicians and artists can create an AI version of themselves — face, expressions, body, instruments. Not just lip-sync. Performance-sync.

WIZ AI. The complete AI creative studio for serious creators. Start creating today.`,

  '20s': `Music. Images. Videos. Animations. All from one AI platform.

WizAudio, WizImage, WizVideo, WizShorts, WizAnimate, WizScript — every creative tool, one intelligent platform.

WIZ AI. Start creating today.`,

  '10s': `Music, images, videos and animations — one AI platform. WIZ AI. Create anything.`
};

for (const [version, script] of Object.entries(SCRIPTS)) {
  console.log(`\nGenerating ${version} narration...`);
  try {
    const resp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: VOICE_SETTINGS
      },
      {
        headers: {
          'xi-api-key': KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    );
    const outPath = `${OUT_DIR}/wiz-ai-narration-${version}.mp3`;
    writeFileSync(outPath, Buffer.from(resp.data));
    const sizeMB = (resp.data.byteLength / 1024 / 1024).toFixed(2);
    console.log(`  Saved: ${outPath} (${sizeMB} MB)`);
  } catch (e) {
    console.error(`  ERROR for ${version}:`, e.response?.status, e.response?.data ? Buffer.from(e.response.data).toString() : e.message);
  }
}

console.log('\nAll narration files generated.');
console.log('Voice used:', selectedVoice.name, '(', VOICE_ID, ')');
