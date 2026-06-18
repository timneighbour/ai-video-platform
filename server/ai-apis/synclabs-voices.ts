/**
 * Sync Labs Voices API — /v2/voices
 * ──────────────────────────────────
 * Programmatic voice cloning from an audio or video sample.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  INTEGRATION ASSESSMENT — June 2026                                 │
 * │                                                                     │
 * │  Status: STUB — not yet wired into the WizVideo/WizSync pipeline.   │
 * │                                                                     │
 * │  Why not yet active:                                                │
 * │    1. The /v2/voices endpoint clones a voice for use in the         │
 * │       SyncLabs TTS API (/v2/tts), NOT for lip-sync generation.      │
 * │       Lip-sync jobs use video+audio input directly — the voice      │
 * │       clone is only relevant if we generate TTS speech first and    │
 * │       then lip-sync to that TTS output.                             │
 * │    2. The current WizVideo pipeline uses user-uploaded audio        │
 * │       (real vocal stems from Demucs) for lip-sync — not TTS.       │
 * │       Voice cloning would only add value if we introduce a          │
 * │       "sing in your voice" feature where the user uploads a         │
 * │       reference clip and we synthesise new vocals.                  │
 * │    3. The provider is currently ElevenLabs-backed — SyncLabs        │
 * │       routes the clone through ElevenLabs internally. This means    │
 * │       quality and availability depend on ElevenLabs, not SyncLabs.  │
 * │                                                                     │
 * │  Recommended future use case:                                       │
 * │    "WizVoice" — user uploads a 30-60s reference audio/video clip,   │
 * │    we clone their voice, generate TTS lyrics in their voice,        │
 * │    then lip-sync the character to that TTS output. This would be    │
 * │    a premium upsell feature (e.g. Pro+ plan).                       │
 * │                                                                     │
 * │  To activate: implement the WizVoice feature and wire               │
 * │    cloneSyncLabsVoice() → generateSyncLabsTTS() → lip-sync job.    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * API reference: https://sync.so/docs/api-reference/api/voices-api/clone
 */

import axios from "axios";

const SYNCLABS_API_BASE = "https://api.sync.so/v2";

function getKey(): string {
  const key = process.env.SYNC_LABS_API_KEY;
  if (!key) throw new Error("[SyncLabsVoices] SYNC_LABS_API_KEY is not set");
  return key;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncLabsVoice {
  voiceId: string;
  name: string;
  internalVoiceId: string;
}

export interface CloneVoiceOptions {
  /** Human-readable name for the cloned voice (e.g. "Tim-voice-v1") */
  name: string;
  /**
   * Either a public URL to the audio/video sample, or a SyncLabs assetId.
   * Provide exactly one of url or assetId.
   * Recommended: upload via /v2/assets first and pass the assetId.
   */
  url?: string;
  assetId?: string;
}

// ─── Clone a voice ────────────────────────────────────────────────────────────

/**
 * Clone a voice from an audio or video sample.
 * Returns a voiceId that can be used in /v2/tts (Text-to-Speech) generation jobs.
 *
 * Note: Voice cloning slots are limited per plan. Video sources have their
 * audio track extracted automatically (first 2 minutes used).
 *
 * @example
 * // Upload the reference audio first (recommended)
 * const assetId = await uploadAndRegisterSyncLabsAsset(audioBuffer, "audio/wav", "ref.wav", "AUDIO");
 * const voice = await cloneSyncLabsVoice({ name: "Tim-voice-v1", assetId });
 * // Then use voice.voiceId in generateSyncLabsTTS()
 */
export async function cloneSyncLabsVoice(options: CloneVoiceOptions): Promise<SyncLabsVoice> {
  if (!options.url && !options.assetId) {
    throw new Error("[SyncLabsVoices] Provide either url or assetId for voice cloning");
  }

  const body: Record<string, string> = {
    name: options.name,
    provider: "elevenlabs",
  };
  if (options.url) body.url = options.url;
  if (options.assetId) body.assetId = options.assetId;

  const resp = await axios.post(`${SYNCLABS_API_BASE}/voices`, body, {
    headers: { "x-api-key": getKey(), "Content-Type": "application/json" },
    timeout: 30_000,
  });

  const voice: SyncLabsVoice = resp.data;
  if (!voice?.voiceId) {
    throw new Error(`[SyncLabsVoices] Clone failed — no voiceId in response: ${JSON.stringify(resp.data).slice(0, 200)}`);
  }

  console.log(`[SyncLabsVoices] Voice cloned: id=${voice.voiceId} name="${voice.name}"`);
  return voice;
}

// ─── List cloned voices ───────────────────────────────────────────────────────

/**
 * List all cloned voices in the organisation.
 */
export async function listSyncLabsVoices(): Promise<SyncLabsVoice[]> {
  const resp = await axios.get(`${SYNCLABS_API_BASE}/voices`, {
    headers: { "x-api-key": getKey() },
    timeout: 10_000,
  });
  return (resp.data?.voices ?? resp.data?.items ?? resp.data) as SyncLabsVoice[];
}

// ─── Delete a cloned voice ────────────────────────────────────────────────────

/**
 * Delete a previously cloned voice by its voiceId.
 */
export async function deleteSyncLabsVoice(voiceId: string): Promise<void> {
  await axios.delete(`${SYNCLABS_API_BASE}/voices/${voiceId}`, {
    headers: { "x-api-key": getKey() },
    timeout: 10_000,
  });
  console.log(`[SyncLabsVoices] Voice deleted: id=${voiceId}`);
}
