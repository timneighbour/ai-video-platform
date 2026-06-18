/**
 * ISS-011: Typed JSON column helpers
 *
 * The database stores JSON data as `longtext` strings (MySQL).
 * Drizzle's `.$type<T>()` modifier only works with `json()` columns.
 * Converting `longtext` → `json()` on a live production DB requires a migration
 * that changes the column storage type, which carries data-loss risk.
 *
 * This module provides type-safe parse/stringify wrappers so all JSON column
 * access is typed at compile time without touching the database schema.
 *
 * Usage:
 *   import { parseJson, stringifyJson } from "./json-columns";
 *   const segments = parseJson<TranscriptionSegment[]>(row.transcriptionSegments);
 *   const value = stringifyJson(segments);
 */

// ── Shared types ──────────────────────────────────────────────────────────────

export type TranscriptionSegment = { start: number; end: number; text: string };
export type LyricLine = { line: string; startTime: number; endTime: number };
export type LockedOutfit = { jacket?: string; shirt?: string; trousers?: string; shoes?: string; accessories?: string };
export type LockedProps = { instrument?: string; mic?: string; other?: string };
export type LockedRules = { role: string; mustHave?: string[]; allowedProps?: string[]; forbidden?: string[] };
export type CharacterVisualDetails = { instrument?: string; outfit?: string; props?: string; position?: string };
export type SpeechSegment = { start: number; end: number; confidence: number };
export type SceneSegment = { start: number; end: number; type: string };
export type CaptionSegment = { start: number; end: number; text: string };
export type SunoTrack = { audioUrl: string; imageUrl?: string; title?: string; tags?: string; duration?: number };
export type KidsCharacterLock = { name: string; species?: string; colour?: string; features?: string; outfit?: string; photoUrl?: string; lockedPrompt?: string };
export type StoryboardFrame = { sceneIndex: number; sceneLabel: string; imageUrl?: string; description?: string };
export type VideoAnalysisData = { speech_segments?: unknown[]; scene_cuts?: unknown[]; mood_tags?: string[]; confidence?: number };
export type FaceEmbedding = number[];
export type ContextAsset = { url: string; mimeType: string; type: 'image' | 'video' };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a JSON string column value into a typed value.
 * Returns null if the value is null, undefined, or invalid JSON.
 */
export function parseJson<T>(value: string | null | undefined): T | null {
  if (value == null || value === "") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Stringify a value for storage in a JSON string column.
 * Returns null if the value is null or undefined.
 */
export function stringifyJson<T>(value: T | null | undefined): string | null {
  if (value == null) return null;
  return JSON.stringify(value);
}
