/**
 * Lyrics & Captions Management Service
 * Handles lyrics import, parsing, timing, and caption rendering
 * Core feature for music and kids videos
 */

import { LyricsLine, CaptionConfig } from "../drizzle/schema";

/**
 * Extract lyrics from audio transcription
 * Attempts to parse lyrics from Whisper transcription or Suno lyrics
 */
export function extractLyricsFromTranscription(
  transcription: string,
  audioDurationSeconds: number
): LyricsLine[] {
  const lines = transcription.split("\n").filter(line => line.trim().length > 0);
  const lyricsLines: LyricsLine[] = [];

  // Simple timing distribution: spread lyrics evenly across audio duration
  const timePerLine = (audioDurationSeconds * 1000) / lines.length;

  lines.forEach((line, index) => {
    const startTime = Math.round(index * timePerLine);
    const endTime = Math.round((index + 1) * timePerLine);

    lyricsLines.push({
      line: line.trim(),
      startTime,
      endTime
    });
  });

  return lyricsLines;
}

/**
 * Parse lyrics from SRT subtitle format
 */
export function parseLyricsFromSRT(srtContent: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  const blocks = srtContent.split("\n\n").filter(b => b.trim());

  for (const block of blocks) {
    const lines_in_block = block.split("\n");
    if (lines_in_block.length >= 3) {
      const timeLine = lines_in_block[1];
      const textLines = lines_in_block.slice(2).join(" ");

      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (timeMatch) {
        const startHours = parseInt(timeMatch[1]);
        const startMinutes = parseInt(timeMatch[2]);
        const startSeconds = parseInt(timeMatch[3]);
        const startMillis = parseInt(timeMatch[4]);

        const endHours = parseInt(timeMatch[5]);
        const endMinutes = parseInt(timeMatch[6]);
        const endSeconds = parseInt(timeMatch[7]);
        const endMillis = parseInt(timeMatch[8]);

        const startTime = (startHours * 3600 + startMinutes * 60 + startSeconds) * 1000 + startMillis;
        const endTime = (endHours * 3600 + endMinutes * 60 + endSeconds) * 1000 + endMillis;

        lines.push({
          line: textLines.trim(),
          startTime,
          endTime
        });
      }
    }
  }

  return lines;
}

/**
 * Parse lyrics from VTT subtitle format
 */
export function parseLyricsFromVTT(vttContent: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  const blocks = vttContent.split("\n\n").filter(b => b.trim() && !b.startsWith("WEBVTT"));

  for (const block of blocks) {
    const lines_in_block = block.split("\n");
    if (lines_in_block.length >= 2) {
      const timeLine = lines_in_block[0];
      const textLines = lines_in_block.slice(1).join(" ");

      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timeMatch) {
        const startHours = parseInt(timeMatch[1]);
        const startMinutes = parseInt(timeMatch[2]);
        const startSeconds = parseInt(timeMatch[3]);
        const startMillis = parseInt(timeMatch[4]);

        const endHours = parseInt(timeMatch[5]);
        const endMinutes = parseInt(timeMatch[6]);
        const endSeconds = parseInt(timeMatch[7]);
        const endMillis = parseInt(timeMatch[8]);

        const startTime = (startHours * 3600 + startMinutes * 60 + startSeconds) * 1000 + startMillis;
        const endTime = (endHours * 3600 + endMinutes * 60 + endSeconds) * 1000 + endMillis;

        lines.push({
          line: textLines.trim(),
          startTime,
          endTime
        });
      }
    }
  }

  return lines;
}

/**
 * Validate lyrics for timing consistency
 */
export function validateLyricsTimings(lyrics: LyricsLine[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lyrics.length === 0) {
    errors.push("No lyrics provided");
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < lyrics.length; i++) {
    const lyric = lyrics[i];

    // Check for invalid timing
    if (lyric.startTime >= lyric.endTime) {
      errors.push(`Line ${i + 1}: Start time (${lyric.startTime}ms) >= End time (${lyric.endTime}ms)`);
    }

    // Check for overlaps
    if (i > 0) {
      const prevLyric = lyrics[i - 1];
      if (lyric.startTime < prevLyric.endTime) {
        warnings.push(`Line ${i + 1}: Overlaps with previous line`);
      }
    }

    // Check for gaps
    if (i > 0) {
      const prevLyric = lyrics[i - 1];
      const gap = lyric.startTime - prevLyric.endTime;
      if (gap > 1000) {
        warnings.push(`Line ${i + 1}: Large gap (${gap}ms) from previous line`);
      }
    }

    // Check for empty lines
    if (!lyric.line || lyric.line.trim().length === 0) {
      warnings.push(`Line ${i + 1}: Empty lyric text`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate SRT subtitle file from lyrics
 */
export function generateSRTSubtitles(lyrics: LyricsLine[]): string {
  let srt = "";

  lyrics.forEach((lyric, index) => {
    const startMs = lyric.startTime;
    const endMs = lyric.endTime;

    const startSeconds = Math.floor(startMs / 1000);
    const startMillis = startMs % 1000;
    const startHours = Math.floor(startSeconds / 3600);
    const startMinutes = Math.floor((startSeconds % 3600) / 60);
    const startSecs = startSeconds % 60;

    const endSeconds = Math.floor(endMs / 1000);
    const endMillis = endMs % 1000;
    const endHours = Math.floor(endSeconds / 3600);
    const endMinutes = Math.floor((endSeconds % 3600) / 60);
    const endSecs = endSeconds % 60;

    const startStr = `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}:${String(startSecs).padStart(2, "0")},${String(startMillis).padStart(3, "0")}`;
    const endStr = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:${String(endSecs).padStart(2, "0")},${String(endMillis).padStart(3, "0")}`;

    srt += `${index + 1}\n`;
    srt += `${startStr} --> ${endStr}\n`;
    srt += `${lyric.line}\n\n`;
  });

  return srt;
}

/**
 * Generate VTT subtitle file from lyrics
 */
export function generateVTTSubtitles(lyrics: LyricsLine[]): string {
  let vtt = "WEBVTT\n\n";

  lyrics.forEach((lyric) => {
    const startMs = lyric.startTime;
    const endMs = lyric.endTime;

    const startSeconds = Math.floor(startMs / 1000);
    const startMillis = startMs % 1000;
    const startHours = Math.floor(startSeconds / 3600);
    const startMinutes = Math.floor((startSeconds % 3600) / 60);
    const startSecs = startSeconds % 60;

    const endSeconds = Math.floor(endMs / 1000);
    const endMillis = endMs % 1000;
    const endHours = Math.floor(endSeconds / 3600);
    const endMinutes = Math.floor((endSeconds % 3600) / 60);
    const endSecs = endSeconds % 60;

    const startStr = `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}:${String(startSecs).padStart(2, "0")}.${String(startMillis).padStart(3, "0")}`;
    const endStr = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:${String(endSecs).padStart(2, "0")}.${String(endMillis).padStart(3, "0")}`;

    vtt += `${startStr} --> ${endStr}\n`;
    vtt += `${lyric.line}\n\n`;
  });

  return vtt;
}

/**
 * Get caption at specific timestamp
 */
export function getCaptionAtTime(lyrics: LyricsLine[], timeMs: number): LyricsLine | null {
  for (const lyric of lyrics) {
    if (timeMs >= lyric.startTime && timeMs < lyric.endTime) {
      return lyric;
    }
  }
  return null;
}

/**
 * Get next caption after specific timestamp
 */
export function getNextCaption(lyrics: LyricsLine[], timeMs: number): LyricsLine | null {
  for (const lyric of lyrics) {
    if (lyric.startTime > timeMs) {
      return lyric;
    }
  }
  return null;
}

/**
 * Adjust lyrics timing (e.g., shift all by offset)
 */
export function adjustLyricsTiming(
  lyrics: LyricsLine[],
  offsetMs: number
): LyricsLine[] {
  return lyrics.map(lyric => ({
    ...lyric,
    startTime: Math.max(0, lyric.startTime + offsetMs),
    endTime: Math.max(0, lyric.endTime + offsetMs)
  }));
}

/**
 * Split a lyric line into multiple lines
 */
export function splitLyricLine(
  lyrics: LyricsLine[],
  lineIndex: number,
  splitPoint: number
): LyricsLine[] {
  if (lineIndex < 0 || lineIndex >= lyrics.length) {
    return lyrics;
  }

  const line = lyrics[lineIndex];
  const text = line.line;

  if (splitPoint <= 0 || splitPoint >= text.length) {
    return lyrics;
  }

  const firstPart = text.substring(0, splitPoint);
  const secondPart = text.substring(splitPoint);

  const duration = line.endTime - line.startTime;
  const midTime = line.startTime + Math.floor(duration / 2);

  const newLyrics = [...lyrics];
  newLyrics[lineIndex] = {
    line: firstPart,
    startTime: line.startTime,
    endTime: midTime
  };

  newLyrics.splice(lineIndex + 1, 0, {
    line: secondPart,
    startTime: midTime,
    endTime: line.endTime
  });

  return newLyrics;
}

/**
 * Merge two consecutive lyric lines
 */
export function mergeLyricLines(lyrics: LyricsLine[], lineIndex: number): LyricsLine[] {
  if (lineIndex < 0 || lineIndex >= lyrics.length - 1) {
    return lyrics;
  }

  const line1 = lyrics[lineIndex];
  const line2 = lyrics[lineIndex + 1];

  const merged: LyricsLine = {
    line: `${line1.line} ${line2.line}`,
    startTime: line1.startTime,
    endTime: line2.endTime
  };

  const newLyrics = [...lyrics];
  newLyrics.splice(lineIndex, 2, merged);

  return newLyrics;
}

/**
 * Generate caption CSS for rendering
 */
export function generateCaptionCSS(config: CaptionConfig): string {
  const positionMap: Record<string, string> = {
    bottom_center: "bottom: 20px; left: 50%; transform: translateX(-50%);",
    top_center: "top: 20px; left: 50%; transform: translateX(-50%);",
    custom: "bottom: 20px; left: 50%; transform: translateX(-50%);"
  };

  const backgroundMap: Record<string, string> = {
    none: "background: transparent;",
    soft_shadow: "background: rgba(0, 0, 0, 0.5); border-radius: 8px; padding: 8px 16px;",
    solid_box: "background: rgba(0, 0, 0, 0.8); border-radius: 4px; padding: 12px 20px;"
  };

  const css = `
.caption {
  position: fixed;
  ${positionMap[config.safeArea] || positionMap.bottom_center}
  font-family: ${config.fontStyle === "serif" ? "Georgia, serif" : config.fontStyle === "monospace" ? "Courier New, monospace" : "Arial, sans-serif"};
  font-size: ${config.fontSize}px;
  color: ${config.textColour};
  text-align: center;
  max-width: 90%;
  z-index: 1000;
  ${backgroundMap[config.background] || backgroundMap.soft_shadow}
  animation: fadeIn 0.3s ease-in;
}

.caption.karaoke {
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 20px;
  border-radius: 8px;
}

.caption .word {
  display: inline;
  margin: 0 2px;
}

.caption .word.highlight {
  color: ${config.highlightColour};
  font-weight: bold;
  text-shadow: 0 0 8px ${config.highlightColour};
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.caption.fade-out {
  animation: fadeOut 0.3s ease-out;
}
`;

  return css;
}

/**
 * Validate caption configuration
 */
export function validateCaptionConfig(config: CaptionConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.fontSize < 12 || config.fontSize > 72) {
    errors.push("Font size must be between 12 and 72 pixels");
  }

  if (!/^#[0-9A-F]{6}$/i.test(config.textColour)) {
    errors.push("Text colour must be a valid hex colour code (e.g., #FFFFFF)");
  }

  if (!/^#[0-9A-F]{6}$/i.test(config.highlightColour)) {
    errors.push("Highlight colour must be a valid hex colour code");
  }

  if (!["bottom", "top", "custom"].includes(config.style)) {
    errors.push("Invalid caption style");
  }

  if (!["none", "soft_shadow", "solid_box"].includes(config.background)) {
    errors.push("Invalid caption background");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
