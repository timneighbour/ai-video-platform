#!/usr/bin/env python3
"""
WIZ AI Stem Extraction & Envelope Analysis
==========================================
Runs Demucs htdemucs_6s (6-stem model) on an audio file and produces:
  1. Per-stem WAV files (vocals, drums, bass, piano, guitar, other)
  2. A derived "accompaniment" mix (all non-vocal stems)
  3. Per-stem RMS amplitude envelopes as time-series JSON
  4. Section-level classification (vocal_performance, instrumental, orchestral_build, etc.)
  5. Energy intensity maps (vocal, orchestral, rhythm)
  6. Subtitle-ready phrase timing data
  7. Validation summary

Usage:
  python3 stem_extract.py <input_audio_path> <output_dir> [--hop-size 0.1]

Output:
  <output_dir>/stems/vocals.wav
  <output_dir>/stems/drums.wav
  <output_dir>/stems/bass.wav
  <output_dir>/stems/piano.wav
  <output_dir>/stems/guitar.wav
  <output_dir>/stems/other.wav
  <output_dir>/stems/accompaniment.wav  (derived: all non-vocal stems mixed)
  <output_dir>/envelopes.json           (full time-series data)
  <output_dir>/sections.json            (section classification)
  <output_dir>/energy_maps.json         (intensity maps for storyboard)
  <output_dir>/subtitle_timing.json     (phrase timing for future subtitles)
  <output_dir>/validation.json          (human-readable validation summary)
"""

import sys
import os
import json
import argparse
import subprocess
import shutil
import tempfile
import math
from pathlib import Path

import numpy as np
import librosa
import soundfile as sf

# ─── Constants ────────────────────────────────────────────────────────────────

DEMUCS_MODEL = "htdemucs_6s"  # 6-stem: vocals, drums, bass, piano, guitar, other
STEM_NAMES = ["vocals", "drums", "bass", "piano", "guitar", "other"]
SAMPLE_RATE = 44100
HOP_SIZE_DEFAULT = 0.1  # seconds per envelope sample

# Section classification thresholds
VOCAL_PRESENCE_THRESHOLD = 0.03    # RMS above this = vocals present
VOCAL_DOMINANT_THRESHOLD = 0.08    # RMS above this = vocals dominant
RHYTHM_PRESENCE_THRESHOLD = 0.04   # drums + bass RMS
ORCHESTRAL_THRESHOLD = 0.05        # piano + guitar + other RMS
SECTION_MIN_DURATION = 2.0         # minimum seconds for a section

# Subtitle phrase detection
PHRASE_SILENCE_THRESHOLD = 0.02    # below this = silence between phrases
PHRASE_MIN_GAP = 0.3               # minimum gap (seconds) between phrases
PHRASE_MIN_DURATION = 0.5          # minimum phrase duration (seconds)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def rms_envelope(audio: np.ndarray, sr: int, hop_size: float) -> list[dict]:
    """Compute per-hop RMS amplitude envelope. Returns list of {t, rms} dicts."""
    hop_samples = int(hop_size * sr)
    frame_length = hop_samples * 2
    rms = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_samples)[0]
    # Normalise to 0.0–1.0 relative to the max RMS in this stem
    max_rms = float(np.max(rms)) if np.max(rms) > 0 else 1.0
    result = []
    for i, r in enumerate(rms):
        t = round(i * hop_size, 3)
        result.append({"t": t, "rms": round(float(r), 6), "rms_norm": round(float(r) / max_rms, 4)})
    return result


def mix_stems(stem_arrays: list[np.ndarray]) -> np.ndarray:
    """Mix multiple stem arrays into one by averaging."""
    if not stem_arrays:
        return np.zeros(1)
    stacked = np.stack(stem_arrays, axis=0)
    return np.mean(stacked, axis=0)


def detect_peaks(envelope: list[dict], threshold_norm: float = 0.8, min_gap: float = 2.0) -> list[dict]:
    """Detect local maxima above threshold_norm with minimum gap between peaks."""
    peaks = []
    last_peak_t = -999.0
    for i in range(1, len(envelope) - 1):
        prev_rms = envelope[i-1]["rms_norm"]
        curr_rms = envelope[i]["rms_norm"]
        next_rms = envelope[i+1]["rms_norm"]
        if curr_rms >= threshold_norm and curr_rms >= prev_rms and curr_rms >= next_rms:
            t = envelope[i]["t"]
            if t - last_peak_t >= min_gap:
                peaks.append({"t": t, "rms_norm": curr_rms})
                last_peak_t = t
    return peaks


def classify_section(
    t_start: float,
    t_end: float,
    vocal_rms: float,
    drums_rms: float,
    bass_rms: float,
    piano_rms: float,
    guitar_rms: float,
    other_rms: float,
) -> dict:
    """
    Classify a time section into one of six types:
      vocal_performance   — vocals dominant, rhythm present
      instrumental        — no vocals, rhythm dominant
      orchestral_build    — no vocals, orchestral stems dominant
      emotional_transition — low energy, vocal fading in/out
      climax              — all stems high energy
      outro               — all stems low and declining
    """
    rhythm_rms = (drums_rms + bass_rms) / 2
    orchestral_rms = (piano_rms + guitar_rms + other_rms) / 3
    total_rms = (vocal_rms + rhythm_rms + orchestral_rms) / 3

    # Climax: everything loud
    if total_rms > 0.12 and vocal_rms > VOCAL_PRESENCE_THRESHOLD and rhythm_rms > RHYTHM_PRESENCE_THRESHOLD:
        section_type = "climax"
        confidence = min(1.0, total_rms / 0.2)
    # Vocal performance: vocals dominant
    elif vocal_rms >= VOCAL_DOMINANT_THRESHOLD:
        section_type = "vocal_performance"
        confidence = min(1.0, vocal_rms / 0.15)
    elif vocal_rms >= VOCAL_PRESENCE_THRESHOLD:
        section_type = "vocal_performance"
        confidence = min(1.0, vocal_rms / VOCAL_DOMINANT_THRESHOLD) * 0.7
    # Orchestral build: orchestral stems high, no vocals
    elif orchestral_rms >= ORCHESTRAL_THRESHOLD and rhythm_rms < RHYTHM_PRESENCE_THRESHOLD:
        section_type = "orchestral_build"
        confidence = min(1.0, orchestral_rms / 0.1)
    # Instrumental: rhythm dominant, no vocals
    elif rhythm_rms >= RHYTHM_PRESENCE_THRESHOLD:
        section_type = "instrumental"
        confidence = min(1.0, rhythm_rms / 0.1)
    # Emotional transition: low energy
    elif total_rms < 0.03:
        section_type = "outro"
        confidence = 0.6
    else:
        section_type = "emotional_transition"
        confidence = 0.5

    return {
        "start": round(t_start, 3),
        "end": round(t_end, 3),
        "duration": round(t_end - t_start, 3),
        "type": section_type,
        "confidence": round(confidence, 3),
        "stem_rms": {
            "vocals": round(vocal_rms, 6),
            "drums": round(drums_rms, 6),
            "bass": round(bass_rms, 6),
            "piano": round(piano_rms, 6),
            "guitar": round(guitar_rms, 6),
            "other": round(other_rms, 6),
        }
    }


def detect_sections(stems_envelopes: dict, hop_size: float, total_duration: float) -> list[dict]:
    """
    Segment audio into sections by detecting transitions in stem balance.
    Uses a sliding window to compute average RMS per stem per window,
    then classifies each window and merges adjacent identical sections.
    """
    window_size = 4.0  # seconds per analysis window
    step_size = 1.0    # seconds between windows

    n_hops = len(stems_envelopes["vocals"])
    sections_raw = []

    t = 0.0
    while t < total_duration:
        t_end = min(t + window_size, total_duration)
        # Collect hops in this window
        hop_start = int(t / hop_size)
        hop_end = int(t_end / hop_size)

        def mean_rms(stem_name):
            env = stems_envelopes.get(stem_name, [])
            vals = [env[i]["rms"] for i in range(hop_start, min(hop_end, len(env)))]
            return float(np.mean(vals)) if vals else 0.0

        section = classify_section(
            t, t_end,
            vocal_rms=mean_rms("vocals"),
            drums_rms=mean_rms("drums"),
            bass_rms=mean_rms("bass"),
            piano_rms=mean_rms("piano"),
            guitar_rms=mean_rms("guitar"),
            other_rms=mean_rms("other"),
        )
        sections_raw.append(section)
        t += step_size

    # Merge adjacent sections of the same type
    if not sections_raw:
        return []

    merged = [sections_raw[0].copy()]
    for sec in sections_raw[1:]:
        last = merged[-1]
        if sec["type"] == last["type"] and sec["start"] - last["end"] < step_size * 1.5:
            # Extend the last section
            last["end"] = sec["end"]
            last["duration"] = round(last["end"] - last["start"], 3)
            # Average the confidence
            last["confidence"] = round((last["confidence"] + sec["confidence"]) / 2, 3)
            # Average stem RMS
            for stem in last["stem_rms"]:
                last["stem_rms"][stem] = round(
                    (last["stem_rms"][stem] + sec["stem_rms"][stem]) / 2, 6
                )
        else:
            merged.append(sec.copy())

    # Filter out sections shorter than minimum duration
    merged = [s for s in merged if s["duration"] >= SECTION_MIN_DURATION]

    return merged


def detect_phrase_timing(vocal_envelope: list[dict], hop_size: float) -> list[dict]:
    """
    Detect vocal phrase boundaries from the vocal RMS envelope.
    Returns list of {start, end, duration, avg_energy} dicts.
    These are the building blocks for subtitle timing.
    """
    phrases = []
    in_phrase = False
    phrase_start = 0.0
    silence_start = 0.0

    for entry in vocal_envelope:
        t = entry["t"]
        rms = entry["rms"]

        if not in_phrase:
            if rms > PHRASE_SILENCE_THRESHOLD:
                in_phrase = True
                phrase_start = t
        else:
            if rms <= PHRASE_SILENCE_THRESHOLD:
                # Potential end of phrase — wait for min gap
                silence_start = t
            elif silence_start > 0 and t - silence_start >= PHRASE_MIN_GAP:
                # Confirmed phrase end
                phrase_end = silence_start
                duration = phrase_end - phrase_start
                if duration >= PHRASE_MIN_DURATION:
                    # Compute average energy in this phrase
                    phrase_hops = [e for e in vocal_envelope if phrase_start <= e["t"] <= phrase_end]
                    avg_energy = float(np.mean([e["rms"] for e in phrase_hops])) if phrase_hops else 0.0
                    phrases.append({
                        "start": round(phrase_start, 3),
                        "end": round(phrase_end, 3),
                        "duration": round(duration, 3),
                        "avg_energy": round(avg_energy, 6),
                    })
                in_phrase = True
                phrase_start = t
                silence_start = 0.0

    # Close any open phrase at end of audio
    if in_phrase and vocal_envelope:
        phrase_end = vocal_envelope[-1]["t"]
        duration = phrase_end - phrase_start
        if duration >= PHRASE_MIN_DURATION:
            phrase_hops = [e for e in vocal_envelope if phrase_start <= e["t"] <= phrase_end]
            avg_energy = float(np.mean([e["rms"] for e in phrase_hops])) if phrase_hops else 0.0
            phrases.append({
                "start": round(phrase_start, 3),
                "end": round(phrase_end, 3),
                "duration": round(duration, 3),
                "avg_energy": round(avg_energy, 6),
            })

    return phrases


def build_energy_maps(stems_envelopes: dict, sections: list[dict], total_duration: float) -> dict:
    """
    Build three intensity maps for the storyboard system:
      vocal_intensity    — vocal RMS over time (normalised)
      orchestral_intensity — piano + guitar + other (normalised)
      rhythm_intensity   — drums + bass (normalised)

    Each map is a list of {t, intensity} dicts at hop resolution.
    Also computes song-level summary: where it builds, relaxes, peaks.
    """
    def normalise(env: list[dict]) -> list[dict]:
        max_rms = max((e["rms"] for e in env), default=1.0)
        if max_rms == 0:
            max_rms = 1.0
        return [{"t": e["t"], "intensity": round(e["rms"] / max_rms, 4)} for e in env]

    def mix_envelopes(names: list[str]) -> list[dict]:
        """Average multiple stem envelopes into one."""
        envs = [stems_envelopes.get(n, []) for n in names if n in stems_envelopes]
        if not envs:
            return []
        min_len = min(len(e) for e in envs)
        result = []
        for i in range(min_len):
            avg_rms = float(np.mean([e[i]["rms"] for e in envs]))
            result.append({"t": envs[0][i]["t"], "rms": avg_rms})
        return result

    vocal_env = stems_envelopes.get("vocals", [])
    orchestral_env = mix_envelopes(["piano", "guitar", "other"])
    rhythm_env = mix_envelopes(["drums", "bass"])

    vocal_map = normalise(vocal_env)
    orchestral_map = normalise(orchestral_env)
    rhythm_map = normalise(rhythm_env)

    # Song-level summary: find emotional peak, build regions, relaxation regions
    def find_peak(intensity_map: list[dict]) -> dict | None:
        if not intensity_map:
            return None
        peak = max(intensity_map, key=lambda x: x["intensity"])
        return peak

    vocal_peak = find_peak(vocal_map)
    orchestral_peak = find_peak(orchestral_map)
    rhythm_peak = find_peak(rhythm_map)

    # Identify "build" regions: intensity rising over 4+ seconds
    def find_build_regions(intensity_map: list[dict], window: float = 4.0) -> list[dict]:
        builds = []
        for i in range(len(intensity_map)):
            t_start = intensity_map[i]["t"]
            t_end = t_start + window
            window_pts = [p for p in intensity_map if t_start <= p["t"] <= t_end]
            if len(window_pts) < 3:
                continue
            intensities = [p["intensity"] for p in window_pts]
            # Linear regression slope
            xs = list(range(len(intensities)))
            slope = float(np.polyfit(xs, intensities, 1)[0])
            if slope > 0.02:  # Rising by 2% per hop
                builds.append({"start": round(t_start, 3), "end": round(t_end, 3), "slope": round(slope, 4)})
        # Merge overlapping build regions
        merged = []
        for b in builds:
            if merged and b["start"] <= merged[-1]["end"]:
                merged[-1]["end"] = max(merged[-1]["end"], b["end"])
            else:
                merged.append(b.copy())
        return merged

    return {
        "vocal_intensity": vocal_map,
        "orchestral_intensity": orchestral_map,
        "rhythm_intensity": rhythm_map,
        "summary": {
            "vocal_peak": vocal_peak,
            "orchestral_peak": orchestral_peak,
            "rhythm_peak": rhythm_peak,
            "total_duration": round(total_duration, 3),
            "vocal_build_regions": find_build_regions(vocal_map),
            "orchestral_build_regions": find_build_regions(orchestral_map),
            "section_count": len(sections),
            "vocal_performance_sections": len([s for s in sections if s["type"] == "vocal_performance"]),
            "instrumental_sections": len([s for s in sections if s["type"] == "instrumental"]),
            "climax_sections": len([s for s in sections if s["type"] == "climax"]),
        }
    }


def build_validation_summary(
    stems_envelopes: dict,
    sections: list[dict],
    energy_maps: dict,
    phrase_timing: list[dict],
    total_duration: float,
) -> dict:
    """
    Build a human-readable validation summary for Phase 1E.
    This is the output Tim will review to confirm classification is sensible.
    """
    vocal_sections = [s for s in sections if s["type"] == "vocal_performance"]
    instrumental_sections = [s for s in sections if s["type"] == "instrumental"]
    orchestral_sections = [s for s in sections if s["type"] == "orchestral_build"]
    climax_sections = [s for s in sections if s["type"] == "climax"]
    transition_sections = [s for s in sections if s["type"] == "emotional_transition"]
    outro_sections = [s for s in sections if s["type"] == "outro"]

    vocal_coverage = sum(s["duration"] for s in vocal_sections)
    vocal_pct = round(vocal_coverage / total_duration * 100, 1) if total_duration > 0 else 0

    return {
        "total_duration_seconds": round(total_duration, 3),
        "total_sections": len(sections),
        "section_breakdown": {
            "vocal_performance": {"count": len(vocal_sections), "coverage_pct": vocal_pct,
                                   "sections": [{"start": s["start"], "end": s["end"], "confidence": s["confidence"]} for s in vocal_sections]},
            "instrumental": {"count": len(instrumental_sections),
                              "sections": [{"start": s["start"], "end": s["end"]} for s in instrumental_sections]},
            "orchestral_build": {"count": len(orchestral_sections),
                                  "sections": [{"start": s["start"], "end": s["end"]} for s in orchestral_sections]},
            "climax": {"count": len(climax_sections),
                        "sections": [{"start": s["start"], "end": s["end"]} for s in climax_sections]},
            "emotional_transition": {"count": len(transition_sections),
                                      "sections": [{"start": s["start"], "end": s["end"]} for s in transition_sections]},
            "outro": {"count": len(outro_sections),
                       "sections": [{"start": s["start"], "end": s["end"]} for s in outro_sections]},
        },
        "vocal_phrases": {
            "count": len(phrase_timing),
            "phrases": phrase_timing[:20],  # First 20 for validation
        },
        "energy_peaks": {
            "vocal_peak": energy_maps["summary"]["vocal_peak"],
            "orchestral_peak": energy_maps["summary"]["orchestral_peak"],
            "rhythm_peak": energy_maps["summary"]["rhythm_peak"],
        },
        "build_regions": {
            "vocal": energy_maps["summary"]["vocal_build_regions"][:5],
            "orchestral": energy_maps["summary"]["orchestral_build_regions"][:5],
        },
        "stem_availability": {stem: stem in stems_envelopes for stem in STEM_NAMES},
        "classification_quality": {
            "has_vocal_sections": len(vocal_sections) > 0,
            "has_instrumental_sections": len(instrumental_sections) > 0,
            "has_climax": len(climax_sections) > 0,
            "vocal_coverage_reasonable": 10 <= vocal_pct <= 90,
            "phrase_count_reasonable": 3 <= len(phrase_timing) <= 100,
        }
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="WIZ AI Stem Extraction & Envelope Analysis")
    parser.add_argument("input_audio", help="Path to input audio file (MP3, WAV, FLAC, etc.)")
    parser.add_argument("output_dir", help="Directory to write output files")
    parser.add_argument("--hop-size", type=float, default=HOP_SIZE_DEFAULT, help="Envelope hop size in seconds (default: 0.1)")
    parser.add_argument("--no-demucs", action="store_true", help="Skip Demucs (use pre-existing stems in output_dir/stems/)")
    args = parser.parse_args()

    input_path = Path(args.input_audio)
    output_dir = Path(args.output_dir)
    stems_dir = output_dir / "stems"
    output_dir.mkdir(parents=True, exist_ok=True)
    stems_dir.mkdir(parents=True, exist_ok=True)

    print(f"[WizStem] Input: {input_path}", flush=True)
    print(f"[WizStem] Output: {output_dir}", flush=True)

    # ── Step 1: Run Demucs ────────────────────────────────────────────────────
    if not args.no_demucs:
        print(f"[WizStem] Running Demucs ({DEMUCS_MODEL})...", flush=True)
        demucs_tmp = output_dir / "demucs_tmp"
        demucs_tmp.mkdir(exist_ok=True)
        result = subprocess.run(
            [
                "python3", "-m", "demucs",
                "--two-stems", "vocals",  # Fast: vocals + accompaniment only for initial pass
                "-n", "htdemucs",
                "--out", str(demucs_tmp),
                str(input_path),
            ],
            capture_output=True, text=True, timeout=600
        )
        if result.returncode != 0:
            print(f"[WizStem] Demucs fast pass failed, trying full 6-stem...", flush=True)
            # Fall back to full 6-stem model
            result = subprocess.run(
                [
                    "python3", "-m", "demucs",
                    "-n", DEMUCS_MODEL,
                    "--out", str(demucs_tmp),
                    str(input_path),
                ],
                capture_output=True, text=True, timeout=900
            )
            if result.returncode != 0:
                print(f"[WizStem] ERROR: Demucs failed: {result.stderr}", flush=True)
                sys.exit(1)

        # Find Demucs output directory (it creates model_name/track_name/)
        demucs_out_dirs = list(demucs_tmp.rglob("*.wav"))
        if not demucs_out_dirs:
            print(f"[WizStem] ERROR: No WAV files found in Demucs output", flush=True)
            sys.exit(1)

        # Copy stems to our stems_dir
        demucs_track_dir = demucs_out_dirs[0].parent
        for wav_file in demucs_track_dir.glob("*.wav"):
            stem_name = wav_file.stem.lower()
            dest = stems_dir / f"{stem_name}.wav"
            shutil.copy2(wav_file, dest)
            print(f"[WizStem] Stem: {stem_name} → {dest}", flush=True)

        # Build accompaniment mix if not already present
        if not (stems_dir / "accompaniment.wav").exists():
            non_vocal_stems = [stems_dir / f"{s}.wav" for s in STEM_NAMES if s != "vocals" and (stems_dir / f"{s}.wav").exists()]
            if non_vocal_stems:
                print(f"[WizStem] Building accompaniment mix from {len(non_vocal_stems)} stems...", flush=True)
                arrays = []
                sr_ref = SAMPLE_RATE
                for p in non_vocal_stems:
                    audio, sr = librosa.load(str(p), sr=SAMPLE_RATE, mono=True)
                    arrays.append(audio)
                    sr_ref = sr
                accomp = mix_stems(arrays)
                sf.write(str(stems_dir / "accompaniment.wav"), accomp, sr_ref)

        # Clean up Demucs temp dir
        shutil.rmtree(demucs_tmp, ignore_errors=True)
    else:
        print(f"[WizStem] Skipping Demucs (--no-demucs flag)", flush=True)

    # ── Step 2: Load stems and compute envelopes ──────────────────────────────
    print(f"[WizStem] Computing amplitude envelopes (hop={args.hop_size}s)...", flush=True)
    stems_envelopes = {}
    total_duration = 0.0

    for stem_name in STEM_NAMES + ["accompaniment"]:
        stem_path = stems_dir / f"{stem_name}.wav"
        if not stem_path.exists():
            print(f"[WizStem] Warning: stem {stem_name} not found, skipping", flush=True)
            continue
        audio, sr = librosa.load(str(stem_path), sr=SAMPLE_RATE, mono=True)
        duration = len(audio) / sr
        if duration > total_duration:
            total_duration = duration
        envelope = rms_envelope(audio, sr, args.hop_size)
        stems_envelopes[stem_name] = envelope
        print(f"[WizStem] Envelope: {stem_name} — {len(envelope)} samples, {round(duration, 1)}s", flush=True)

    # ── Step 3: Section classification ───────────────────────────────────────
    print(f"[WizStem] Classifying sections...", flush=True)
    sections = detect_sections(stems_envelopes, args.hop_size, total_duration)
    print(f"[WizStem] Found {len(sections)} sections", flush=True)

    # ── Step 4: Energy maps ───────────────────────────────────────────────────
    print(f"[WizStem] Building energy intensity maps...", flush=True)
    energy_maps = build_energy_maps(stems_envelopes, sections, total_duration)

    # ── Step 5: Phrase timing ─────────────────────────────────────────────────
    print(f"[WizStem] Detecting vocal phrase timing...", flush=True)
    vocal_envelope = stems_envelopes.get("vocals", [])
    phrase_timing = detect_phrase_timing(vocal_envelope, args.hop_size)
    print(f"[WizStem] Found {len(phrase_timing)} vocal phrases", flush=True)

    # ── Step 6: Validation summary ────────────────────────────────────────────
    print(f"[WizStem] Building validation summary...", flush=True)
    validation = build_validation_summary(stems_envelopes, sections, energy_maps, phrase_timing, total_duration)

    # ── Step 7: Write output files ────────────────────────────────────────────
    envelopes_output = {
        "version": "1.0",
        "hop_size": args.hop_size,
        "total_duration": round(total_duration, 3),
        "stems": {name: env for name, env in stems_envelopes.items()},
    }

    sections_output = {
        "version": "1.0",
        "total_duration": round(total_duration, 3),
        "sections": sections,
    }

    subtitle_output = {
        "version": "1.0",
        "total_duration": round(total_duration, 3),
        "phrases": phrase_timing,
        "note": "Phrase boundaries detected from vocal stem RMS. Lyric text alignment requires a separate transcription step.",
        "subtitle_schema": {
            "description": "Each phrase entry maps to a subtitle cue. Lyric text is not yet assigned.",
            "fields": {
                "start": "seconds from start of audio",
                "end": "seconds from start of audio",
                "duration": "phrase duration in seconds",
                "avg_energy": "average vocal RMS energy (0.0–1.0)",
                "text": "lyric text — to be populated by lyric alignment service",
            }
        }
    }

    with open(output_dir / "envelopes.json", "w") as f:
        json.dump(envelopes_output, f, separators=(",", ":"))
    with open(output_dir / "sections.json", "w") as f:
        json.dump(sections_output, f, indent=2)
    with open(output_dir / "energy_maps.json", "w") as f:
        json.dump(energy_maps, f, separators=(",", ":"))
    with open(output_dir / "subtitle_timing.json", "w") as f:
        json.dump(subtitle_output, f, indent=2)
    with open(output_dir / "validation.json", "w") as f:
        json.dump(validation, f, indent=2)

    print(f"[WizStem] Done. Output written to {output_dir}", flush=True)
    print(json.dumps({"status": "ok", "total_duration": round(total_duration, 3), "sections": len(sections), "phrases": len(phrase_timing)}))


if __name__ == "__main__":
    main()
