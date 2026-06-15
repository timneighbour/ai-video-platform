/**
 * Analyse the song tempo for Job 660001 and retrieve original Zara character description
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: '/home/ubuntu/ai-video-platform/.env' });
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';

(async () => {
  console.log('=== ORIGINAL ZARA CHARACTER DESCRIPTION (Job 540026 / 630001) ===');
  console.log(`
Name: Zara
Description: A full-length standing figure of Zara, a lead vocalist, captured in a photorealistic, 
cinematic style with natural skin texture. She possesses a very slim, narrow frame, lean physique, 
and slender build. Her long, straight black hair cascades down her back, complementing her striking 
green eyes and a subtly alluring, confident expression. She wears a floor-length, shiny black leather 
trench coat, open to reveal a fitted black lace-up corset top. Her long, slender legs are encased in 
tight black leather trousers that hug her knees and calves, leading down to her delicate ankles. She 
completes the gothic ensemble with chunky black platform boots featuring silver buckles, fully visible 
on her feet.

KEY VISUAL IDENTIFIERS:
- Ethnicity: White/Caucasian female
- Hair: Long, straight, black, cascading down her back
- Eyes: Striking green eyes
- Build: Very slim, narrow frame, lean physique, slender
- Outfit: Black leather trench coat + black lace-up corset top + black leather trousers + platform boots
- Style: Gothic, confident, alluring
  `);

  // Download audio and analyse tempo with ffmpeg/aubio
  console.log('\n=== ANALYSING SONG TEMPO ===');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tempo-'));
  const audioFile = path.join(tmpDir, 'song.mp3');
  
  console.log('Downloading audio...');
  const resp = await fetch(AUDIO_URL);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(audioFile, buf);
  console.log(`Downloaded: ${(buf.length/1024/1024).toFixed(1)}MB`);
  
  // Get audio duration
  try {
    const durationOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`, { encoding: 'utf8' });
    const duration = parseFloat(durationOut.trim());
    console.log(`Duration: ${duration.toFixed(1)}s (${Math.floor(duration/60)}m${Math.round(duration%60)}s)`);
  } catch (e) {
    console.log('Could not get duration:', e.message);
  }
  
  // Try aubio for BPM detection
  try {
    const bpmOut = execSync(`aubiotempo -i "${audioFile}" 2>&1 | tail -5`, { encoding: 'utf8' });
    console.log('BPM (aubio):', bpmOut.trim());
  } catch {
    // Try aubiotrack
    try {
      const bpmOut2 = execSync(`aubiotrack "${audioFile}" 2>&1 | head -20`, { encoding: 'utf8' });
      console.log('Beat track (aubio):', bpmOut2.trim().slice(0, 200));
    } catch {
      console.log('aubio not available — using ffmpeg beat analysis');
      // Use ffmpeg to extract a short segment and analyse
      try {
        const segFile = path.join(tmpDir, 'seg.wav');
        execSync(`ffmpeg -y -i "${audioFile}" -ss 10 -t 30 -ar 44100 "${segFile}" 2>/dev/null`);
        // Try python librosa if available
        const pyScript = `
import librosa
import sys
y, sr = librosa.load('${segFile}', duration=30)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
print(f'BPM: {tempo:.1f}')
print(f'Beat interval: {60/tempo:.2f}s per beat')
print(f'Character: {"Slow/ballad" if tempo < 80 else "Medium" if tempo < 110 else "Fast/upbeat"}')
`;
        const pyFile = path.join(tmpDir, 'analyse.py');
        fs.writeFileSync(pyFile, pyScript);
        const pyOut = execSync(`python3 "${pyFile}" 2>&1`, { encoding: 'utf8' });
        console.log('Librosa analysis:', pyOut.trim());
      } catch (pyErr) {
        console.log('Python analysis failed:', pyErr.message?.slice(0, 100));
      }
    }
  }
  
  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('\n=== DONE ===');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
