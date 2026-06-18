# Audio Audit Reference

## Components with audio that plays sound:

### 1. CinematicIntroSequence.tsx (560 lines)
- Creates Audio() element on mount with `audio.loop = true; audio.volume = 1.0`
- Attempts autoplay immediately
- Has local muted state (default false = UNMUTED)
- toggleMute sets volume to 0 or 1.0
- handleInteraction unmutes on click anywhere
- On skip: pauses audio and clears src
- ISSUES: autoplay at full volume, loop=true, click-anywhere unmute

### 2. CinematicEntryScreen.tsx (678 lines)
- Creates Audio() with preload, starts muted
- Has SOUND_PREF_KEY localStorage persistence
- enableSound: unmutes, fades in over 2s
- Auto-plays sound if preference saved (useEffect with 1200ms delay)
- On dismiss: fades out audio
- ISSUES: auto-play from persisted preference, re-triggers on mount

### 3. DemoVideoModal.tsx (891 lines)
- Local muted state (default true)
- Has floating mute/unmute button
- Mutes on close
- ISSUES: independent mute state, not coordinated with other players

### 4. IntroFilmModal.tsx (368 lines)
- Local muted state (default true)
- Has mute toggle button
- ISSUES: independent mute state

### 5. WizSoundSection.tsx (615 lines)
- Two Audio() elements (standard + cinematic) both with loop=true
- Playing state, wizsound toggle, local muted state
- ISSUES: looping audio, independent state

### 6. WizSoundShowcase.tsx (432 lines)
- Audio elements per tier with <audio> tags
- Volume state, playingTier state
- Stops others when playing new tier (good single-source)
- ISSUES: independent volume/mute state

### 7. RenderPaywallModal.tsx (766 lines)
- Audio preview elements + selectChime sound effect
- previewVolume state
- ISSUES: chime auto-plays on selection, independent state

### 8. MusicCreator.tsx
- Audio ref for generated music playback
- Play/pause toggle
- ISSUES: independent state

## Components with video only (muted visual):
- HeroCinematicBg.tsx - always muted, loop, autoplay ✓
- VideoCarousel.tsx - always muted, loop, autoplay ✓
- Various page video previews - controls or muted autoplay

## Fix Strategy:
1. All components use useGlobalAudio() for mute state
2. Remove all localStorage sound preference persistence (use global context)
3. All audio starts muted, sound only after user click
4. Loop audio keeps muted state on restart
5. Single source: requestAudioFocus/releaseAudioFocus
6. Remove click-anywhere-to-unmute patterns
7. Remove auto-play-from-preference patterns
