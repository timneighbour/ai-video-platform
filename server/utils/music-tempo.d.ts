declare module 'music-tempo' {
  class MusicTempo {
    tempo: number;
    beats: number[];
    constructor(audioBuffer: AudioBuffer);
  }
  export = MusicTempo;
}
