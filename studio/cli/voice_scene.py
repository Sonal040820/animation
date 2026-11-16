#!/usr/bin/env python3
"""Reusable, entirely local multi-speaker narration for timed and natural scripts.

Supports:
- dialogue.json schema_version 1: timed windows (at/duration), preserved for the-wrong-side.
- dialogue.json schema_version 2: natural synthesis per line, emotion presets from
  studio/lib/voice-presets.json, style-vector voice blending (e.g. af_heart:0.7+af_bella:0.3),
  content-addressed line caching in studio/.cache/voice-lines/, and measured timeline/lines.json.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import math
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
PRESETS_PATH = ROOT / "studio" / "lib" / "voice-presets.json"
LINE_CACHE_DIR = ROOT / "studio" / ".cache" / "voice-lines"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice import get_model, resolve_voice_style


def load_presets() -> dict:
    if PRESETS_PATH.exists():
        data = json.loads(PRESETS_PATH.read_text(encoding="utf-8-sig"))
        return data.get("emotions", data)
    return {
        "neutral": {
            "speed": 1.0,
            "gain_db": 0.0,
            "pitch_semitones": 0.0,
            "pause_before": 0.05,
            "pause_after": 0.22,
            "tremolo": {"rate": 0.0, "depth": 0.0},
            "breathiness": 0.02,
            "lowpass_hz": 8500,
            "reverb": {"delay_ms": 55, "decay": 0.06},
            "text_shaping": {"mode": "none", "ellipsis": False, "clause_pause": 0.10, "sentence_pause": 0.24},
        }
    }


def ffmpeg_atempo(samples: np.ndarray, rate: int, speed: float) -> np.ndarray:
    if abs(speed - 1.0) <= 0.001 or len(samples) == 0:
        return np.asarray(samples, dtype=np.float32)
    # FFmpeg atempo accepts [0.5, 2.0] per stage; chain factors for arbitrary tempo changes.
    factors = []
    rem = float(speed)
    while rem > 2.0:
        factors.append(2.0)
        rem /= 2.0
    while rem < 0.5:
        factors.append(0.5)
        rem /= 0.5
    factors.append(rem)
    inp = io.BytesIO()
    sf.write(inp, samples, rate, format="WAV", subtype="PCM_16")
    out = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            "pipe:0",
            "-filter:a",
            ",".join(f"atempo={x:.5f}" for x in factors),
            "-f",
            "wav",
            "pipe:1",
        ],
        input=inp.getvalue(),
        capture_output=True,
        check=True,
        timeout=120,
    )
    pcm, rate2 = sf.read(io.BytesIO(out.stdout), dtype="float32")
    if rate != rate2:
        raise RuntimeError("FFmpeg changed TTS sample rate")
    return np.asarray(pcm, dtype=np.float32)


def resample_linear(x: np.ndarray, source_rate: float, target_rate: float) -> np.ndarray:
    if abs(source_rate - target_rate) < 1e-3 or len(x) == 0:
        return np.asarray(x, dtype=np.float32)
    n = max(1, round(len(x) * target_rate / source_rate))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def spectral_centroid(samples: np.ndarray, rate: int) -> float:
    if len(samples) < 4:
        return 0.0
    windowed = samples.astype(np.float64) * np.hanning(len(samples))
    mag = np.abs(np.fft.rfft(windowed))
    freqs = np.fft.rfftfreq(len(samples), 1.0 / rate)
    denom = float(np.sum(mag))
    if denom <= 1e-9:
        return 0.0
    return float(np.sum(freqs * mag) / denom)


def compute_rms(samples: np.ndarray) -> float:
    if len(samples) == 0:
        return 0.0
    return float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))


def shape_text(text: str, shaping) -> tuple[str, float, float]:
    clean = str(text or "").strip()
    if not clean:
        return clean, 0.24, 0.10
    if isinstance(shaping, str):
        mode = shaping
        ellipsis = shaping in ("hesitate", "stammer", "ellipsis", "scared")
        clause_pause = 0.14 if ellipsis else 0.10
        sentence_pause = 0.25
    elif isinstance(shaping, dict):
        mode = str(shaping.get("mode", "none"))
        ellipsis = bool(shaping.get("ellipsis", False))
        clause_pause = float(shaping.get("clause_pause", 0.10))
        sentence_pause = float(shaping.get("sentence_pause", 0.24))
    else:
        return clean, 0.24, 0.10

    shaped = clean
    if ellipsis and "..." not in shaped:
        words = shaped.split()
        if mode in ("hesitate", "stammer") and len(words) >= 3:
            first = words[0]
            if not first.endswith((".", ",", "!", "?", ";", ":", "—", "-")):
                shaped = first + "... " + " ".join(words[1:])
        elif mode in ("trail_off", "soft") and shaped.endswith(".") and not shaped.endswith("..."):
            shaped = shaped[:-1] + "..."
    return shaped, sentence_pause, clause_pause


def apply_emotion_preset(samples: np.ndarray, rate: int, preset: dict, seed: int = 0) -> np.ndarray:
    if len(samples) == 0:
        return np.asarray(samples, dtype=np.float32)
    x = np.asarray(samples, dtype=np.float32).copy()

    # 1. Pitch shift via resample + atempo (preserving tempo)
    semitones = float(preset.get("pitch_semitones", 0.0))
    if abs(semitones) > 0.01:
        pitch_factor = 2.0 ** (semitones / 12.0)
        resampled = resample_linear(x, rate, rate / pitch_factor)
        x = ffmpeg_atempo(resampled, rate, 1.0 / pitch_factor)

    # 2. Tremolo (amplitude modulation)
    trem = preset.get("tremolo") or {}
    trem_rate = float(trem.get("rate", 0.0)) if isinstance(trem, dict) else 0.0
    trem_depth = float(trem.get("depth", 0.0)) if isinstance(trem, dict) else 0.0
    if trem_rate > 0.0 and trem_depth > 0.0 and len(x) > 0:
        t = np.arange(len(x), dtype=np.float32) / rate
        mod = (1.0 - 0.5 * trem_depth) + 0.5 * trem_depth * np.sin(2.0 * math.pi * trem_rate * t)
        x = (x * mod).astype(np.float32)

    # 3. Breathiness (0..1 noise mix following speech amplitude envelope)
    breath = float(preset.get("breathiness", 0.0))
    if breath > 0.001 and len(x) > 8:
        win = max(1, int(rate * 0.018))
        kernel = np.ones(win, dtype=np.float32) / win
        env = np.convolve(np.abs(x), kernel, mode="same")
        rng = np.random.default_rng(seed)
        noise = rng.standard_normal(len(x)).astype(np.float32)
        n_fft = np.fft.rfft(noise)
        n_freq = np.fft.rfftfreq(len(noise), 1.0 / rate)
        bp = (1.0 / (1.0 + (600.0 / np.maximum(1.0, n_freq)) ** 4)) * (
            1.0 / (1.0 + (n_freq / 4200.0) ** 4)
        )
        shaped_noise = np.fft.irfft(n_fft * bp, len(noise)).astype(np.float32)
        n_rms = float(np.sqrt(np.mean(shaped_noise ** 2))) + 1e-8
        shaped_noise /= n_rms
        aspiration = env * shaped_noise
        x = ((1.0 - 0.32 * breath) * x + (0.38 * breath) * aspiration).astype(np.float32)

    # 4. EQ (sub-rumble highpass + preset lowpass_hz + presence tilt for pitch shift)
    lowpass_hz = float(preset.get("lowpass_hz", 8500.0))
    if len(x) > 8:
        fft = np.fft.rfft(x)
        freq = np.fft.rfftfreq(len(x), 1.0 / rate)
        hp = 1.0 / (1.0 + (70.0 / np.maximum(1.0, freq)) ** 4)
        lp = 1.0 / (1.0 + (freq / max(300.0, lowpass_hz)) ** 6)
        # Gentle spectral tilt aligned with pitch_semitones so bright/scared voices carry crisp upper formants
        # and ominous/sad voices carry darker lower weight.
        tilt = np.ones_like(freq, dtype=np.float32)
        if abs(semitones) > 0.05:
            norm_f = np.clip(freq / 1200.0, 0.2, 6.0)
            tilt = (norm_f ** (0.14 * semitones)).astype(np.float32)
        x = np.fft.irfft(fft * hp * lp * tilt, len(x)).astype(np.float32)

    # 5. Light multi-tap room reverb
    rev = preset.get("reverb") or {}
    delay_ms = float(rev.get("delay_ms", 0.0)) if isinstance(rev, dict) else 0.0
    decay = float(rev.get("decay", 0.0)) if isinstance(rev, dict) else 0.0
    if delay_ms > 0.0 and decay > 0.0 and len(x) > 16:
        d1 = max(1, int(rate * (delay_ms / 1000.0)))
        d2 = max(1, int(rate * (delay_ms * 1.63 / 1000.0)))
        d3 = max(1, int(rate * (delay_ms * 2.41 / 1000.0)))
        wet = np.zeros_like(x)
        if len(x) > d1:
            wet[d1:] += decay * x[:-d1]
        if len(x) > d2:
            wet[d2:] += (decay * 0.5) * x[:-d2]
        if len(x) > d3:
            wet[d3:] += (decay * 0.25) * x[:-d3]
        # Warm the reverb tail with a 3.2 kHz lowpass
        w_fft = np.fft.rfft(wet)
        w_freq = np.fft.rfftfreq(len(wet), 1.0 / rate)
        w_lp = 1.0 / (1.0 + (w_freq / 3200.0) ** 4)
        wet = np.fft.irfft(w_fft * w_lp, len(wet)).astype(np.float32)
        x = (x + wet).astype(np.float32)

    # 6. Gain dB and soft anti-clipping ceiling
    gain_db = float(preset.get("gain_db", 0.0))
    if abs(gain_db) > 0.01:
        x = (x * (10.0 ** (gain_db / 20.0))).astype(np.float32)

    fade = min(int(rate * 0.018), len(x) // 8)
    if fade > 0:
        x[:fade] *= np.linspace(0.0, 1.0, fade, dtype=np.float32)
        x[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)

    peak = float(np.max(np.abs(x))) if len(x) > 0 else 0.0
    if peak > 0.94:
        x = (x * (0.94 / peak)).astype(np.float32)
    return x


def filter_voice(pcm, rate, role):
    """Legacy v1 filter for the-wrong-side roles (warning, double)."""
    if role not in {"warning", "double"}:
        return pcm
    fft = np.fft.rfft(pcm)
    freq = np.fft.rfftfreq(len(pcm), 1 / rate)
    if role == "warning":
        band = 1 / (1 + (230 / np.maximum(1, freq)) ** 6)
        band *= 1 / (1 + (freq / 2100) ** 8)
        shaped = np.fft.irfft(fft * band, len(pcm)).astype("float32")
        t = np.arange(len(shaped), dtype="float32") / rate
        return (shaped * (0.78 + 0.16 * np.sin(2 * math.pi * 16 * t))).astype("float32")
    band = 1 / (1 + (freq / 4200) ** 8)
    x = np.fft.irfft(fft * band, len(pcm)).astype("float32")
    echo = int(rate * 0.13)
    if len(x) > echo:
        x[echo:] += 0.15 * x[:-echo]
    return x


def fallback_sapi(text: str, speed: float = 1.0) -> tuple[np.ndarray, int]:
    """Offline Windows System.Speech SAPI fallback."""
    sapi_rate = int(max(-5, min(5, round((speed - 1.0) * 8))))
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        ps_script = (
            "Add-Type -AssemblyName System.Speech; "
            "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$s.Rate = {sapi_rate}; "
            "$s.SetOutputToWaveFile($args[0]); "
            "$s.Speak($args[1]); "
            "$s.Dispose()"
        )
        subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script, tmp_path, text],
            capture_output=True,
            check=True,
            timeout=60,
        )
        pcm, rate = sf.read(tmp_path, dtype="float32")
        if pcm.ndim > 1:
            pcm = np.mean(pcm, axis=1)
        return np.asarray(pcm, dtype=np.float32), int(rate)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def fallback_espeak(text: str, role: str = "mara", speed: float = 1.0) -> tuple[np.ndarray, int]:
    voices = {"mara": "en+f3", "warning": "en+f4", "double": "en+f3", "narrator": "en+f3"}
    wpm = max(90, min(240, round(140 * speed)))
    p = subprocess.run(
        ["espeak-ng", "-v", voices.get(role, "en+f3"), "-s", str(wpm), "-p", "46", "--stdout", text],
        capture_output=True,
        check=True,
        timeout=40,
    )
    pcm, rate = sf.read(io.BytesIO(p.stdout), dtype="float32")
    if pcm.ndim > 1:
        pcm = np.mean(pcm, axis=1)
    return np.asarray(pcm, dtype=np.float32), int(rate)


def init_tts_provider(force_fallback: bool = False):
    """Initialize Kokoro ONNX or honest OS fallback (Windows SAPI / Linux espeak-ng)."""
    if not force_fallback:
        try:
            from kokoro_onnx import Kokoro
            model = get_model("kokoro-v1.0.int8.onnx")
            voices = get_model("voices-v1.0.bin")
            kokoro = Kokoro(str(model), str(voices))
            return "kokoro-onnx-0.6.1-int8", kokoro
        except Exception as exc:
            sys.stderr.write(f"Kokoro init failed ({exc}), trying local OS TTS fallback...\n")

    # Try platform-appropriate offline fallback
    candidates = ["sapi", "espeak"] if os.name == "nt" else ["espeak", "sapi"]
    for cand in candidates:
        try:
            if cand == "sapi":
                pcm, _ = fallback_sapi("test", 1.0)
                if len(pcm) > 10:
                    return "windows-sapi-fallback", None
            else:
                pcm, _ = fallback_espeak("test", "narrator", 1.0)
                if len(pcm) > 10:
                    return "espeak-ng-fallback", None
        except Exception:
            continue
    return "none", None


def write_missing_tts_and_fail(outdir: Path):
    outdir.mkdir(parents=True, exist_ok=True)
    lines_payload = {
        "schema_version": 1,
        "provider": "none",
        "voice_present": False,
        "duration": 0.0,
        "lines": [],
    }
    (outdir / "lines.json").write_text(json.dumps(lines_payload, indent=2) + "\n", encoding="utf8")
    (outdir / "voice-report.json").write_text(
        json.dumps({"provider": "none", "voice_present": False, "duration": 0.0, "lines": []}, indent=2) + "\n",
        encoding="utf8",
    )
    sys.stderr.write("VOICE_ERROR: No TTS provider available (Kokoro and OS fallback failed).\n")
    sys.exit(1)


def synthesize_v1(project: Path, cfg: dict, provider: str, kokoro):
    total = float(cfg["duration"])
    if not 6 <= total <= 90:
        raise RuntimeError("Narration duration outside supported 6–90 seconds")
    lines = cfg["lines"]
    rate = 24000
    canvas = np.zeros(round(total * rate), dtype="float32")
    reports = []
    measured_lines = []
    outdir = project / "timeline"
    outdir.mkdir(parents=True, exist_ok=True)
    for index, line in enumerate(lines):
        at = float(line["at"])
        window = float(line["duration"])
        text = line["text"]
        if not 0 <= at < total or not 0.3 <= window <= 8 or at + window > total + 0.001:
            raise RuntimeError("Invalid dialogue line time at " + str(index))
        role = line.get("speaker", "mara")
        voice_spec = cfg.get("voices", {}).get(role, "af_heart")
        if kokoro is not None:
            voice_style = resolve_voice_style(kokoro, voice_spec)
            samples, sample_rate = kokoro.create(text, voice=voice_style, speed=1.06, lang="en-us")
            samples = np.asarray(samples, dtype="float32")
        elif provider == "windows-sapi-fallback":
            samples, sample_rate = fallback_sapi(text, speed=1.06)
        else:
            samples, sample_rate = fallback_espeak(text, role, speed=1.06)
        samples = resample_linear(samples, sample_rate, rate)
        # Keep a natural 90 ms breath/pause at each end; auto-fit long phrases.
        capacity = max(1, int((window - 0.14) * rate))
        if len(samples) > capacity:
            samples = ffmpeg_atempo(samples, rate, len(samples) / capacity * 1.025)
        if len(samples) > capacity:
            samples = samples[:capacity]
        samples = filter_voice(samples, rate, role)
        fade = min(int(rate * 0.025), len(samples) // 8)
        if fade:
            samples[:fade] *= np.linspace(0, 1, fade, dtype="float32")
            samples[-fade:] *= np.linspace(1, 0, fade, dtype="float32")
        offset = round((at + 0.06) * rate)
        size = min(len(samples), len(canvas) - offset)
        if size > 0:
            canvas[offset : offset + size] += samples[:size] * 0.92
        sf.write(str(outdir / ("line_%02d.wav" % index)), samples, rate, subtype="PCM_16")
        spoken_sec = round(size / rate, 3)
        start_sec = round(offset / rate, 3)
        end_sec = round((offset + size) / rate, 3)
        reports.append({
            "id": line.get("id", f"l{index+1}"),
            "speaker": role,
            "text": text,
            "emotion": line.get("emotion", "neutral"),
            "start": at,
            "window": window,
            "spoken_seconds": spoken_sec,
            "rms": round(compute_rms(samples[:size]), 5),
            "peak": round(float(np.max(np.abs(samples[:size]))) if size > 0 else 0.0, 5),
            "spectral_centroid_hz": round(spectral_centroid(samples[:size], rate), 1),
        })
        measured_lines.append({
            "id": line.get("id", f"l{index+1}"),
            "speaker": role,
            "text": text,
            "emotion": line.get("emotion", "neutral"),
            "start": start_sec,
            "end": end_sec,
            "spoken_seconds": spoken_sec,
        })
    peak = float(np.max(np.abs(canvas)))
    if peak > 0.96:
        canvas *= 0.96 / peak
    wav_path = outdir / "voice.wav"
    sf.write(str(wav_path), canvas, rate, subtype="PCM_16")
    measured_dur = round(sf.info(str(wav_path)).duration, 4)
    lines_payload = {
        "schema_version": 1,
        "provider": provider,
        "voice_present": True,
        "duration": measured_dur,
        "lines": measured_lines,
    }
    (outdir / "lines.json").write_text(json.dumps(lines_payload, indent=2) + "\n", encoding="utf8")
    report = {
        "schema_version": 1,
        "provider": provider,
        "voice_present": True,
        "duration": total,
        "measured_duration": measured_dur,
        "voices": cfg.get("voices", {}),
        "phrases": len(reports),
        "lines": reports,
        "full_timeline_wav": True,
        "peak": round(float(np.max(np.abs(canvas))), 4),
    }
    (outdir / "voice-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    print(
        "TIMED_MULTISPEAKER_VOICE_PASS",
        json.dumps({"provider": provider, "duration": total, "lines": len(lines), "voice_present": True}),
        flush=True,
    )


def synthesize_v2(project: Path, cfg: dict, provider: str, kokoro):
    presets = load_presets()
    default_preset = presets.get("neutral", {
        "speed": 1.0,
        "gain_db": 0.0,
        "pitch_semitones": 0.0,
        "pause_before": 0.05,
        "pause_after": 0.22,
        "tremolo": {"rate": 0.0, "depth": 0.0},
        "breathiness": 0.02,
        "lowpass_hz": 8500,
        "reverb": {"delay_ms": 55, "decay": 0.06},
        "text_shaping": {"mode": "none", "ellipsis": False, "clause_pause": 0.10, "sentence_pause": 0.24},
    })
    lines = cfg.get("lines", [])
    if not lines:
        raise RuntimeError("dialogue.json contains no lines")
    voices_map = cfg.get("voices", {})
    default_speaker = cfg.get("default_speaker", "narrator")
    rate = 24000
    outdir = project / "timeline"
    outdir.mkdir(parents=True, exist_ok=True)
    LINE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    segments = []
    measured_lines = []
    report_lines = []
    cursor_samples = 0
    cached_count = 0

    for index, line in enumerate(lines):
        line_id = str(line.get("id") or f"l{index+1}")
        text = str(line.get("spoken") or line.get("text") or "").strip()
        display_text = str(line.get("display") or line.get("text") or text).strip()
        if not text:
            raise RuntimeError(f"Empty dialogue line text at {line_id}")
        speaker = str(line.get("speaker") or default_speaker)
        voice_spec = str(line.get("voice") or voices_map.get(speaker) or "af_heart")
        emotion = str(line.get("emotion") or "neutral")
        if emotion not in presets:
            raise RuntimeError(f"Unknown emotion preset {emotion!r} on line {line_id}")
        preset = dict(default_preset)
        preset.update(presets[emotion])

        pause_before = float(line.get("pause_before", preset.get("pause_before", 0.05)))
        pause_after = float(line.get("pause_after", preset.get("pause_after", 0.22)))
        speed = float(line.get("speed", preset.get("speed", 1.0)))
        shaped_text, sentence_pause, clause_pause = shape_text(text, preset.get("text_shaping"))

        cache_payload = json.dumps(
            {
                "v": "2.2",
                "provider": provider,
                "text": text,
                "shaped_text": shaped_text,
                "voice": voice_spec,
                "emotion": emotion,
                "speed": speed,
                "preset": preset,
            },
            sort_keys=True,
        )
        cache_hash = hashlib.sha256(cache_payload.encode("utf8")).hexdigest()
        cache_wav = LINE_CACHE_DIR / f"{cache_hash}.wav"
        cache_meta = LINE_CACHE_DIR / f"{cache_hash}.json"

        was_cached = False
        unshifted_centroid = 0.0
        if cache_wav.exists() and cache_meta.exists():
            samples, cached_rate = sf.read(str(cache_wav), dtype="float32")
            if cached_rate != rate:
                samples = resample_linear(samples, cached_rate, rate)
            samples = np.asarray(samples, dtype=np.float32)
            meta_obj = json.loads(cache_meta.read_text(encoding="utf8"))
            unshifted_centroid = float(meta_obj.get("unshifted_centroid_hz", 0.0))
            was_cached = True
            cached_count += 1
        else:
            if kokoro is not None:
                voice_style = resolve_voice_style(kokoro, voice_spec)
                raw_samples, sample_rate = kokoro.create(
                    shaped_text,
                    voice=voice_style,
                    speed=max(0.5, min(2.0, speed)),
                    lang="en-us",
                    trim=True,
                    sentence_pause=sentence_pause,
                    clause_pause=clause_pause,
                )
                raw_samples = np.asarray(raw_samples, dtype=np.float32)
            elif provider == "windows-sapi-fallback":
                raw_samples, sample_rate = fallback_sapi(shaped_text, speed=speed)
            else:
                raw_samples, sample_rate = fallback_espeak(shaped_text, speaker, speed=speed)

            raw_samples = resample_linear(raw_samples, sample_rate, rate)
            seed_int = int(cache_hash[:8], 16)
            neutral_baseline = apply_emotion_preset(raw_samples, rate, default_preset, seed=seed_int)
            unshifted_centroid = spectral_centroid(neutral_baseline, rate)
            processed = (
                neutral_baseline
                if emotion == "neutral"
                else apply_emotion_preset(raw_samples, rate, preset, seed=seed_int)
            )
            sf.write(str(cache_wav), processed, rate, subtype="PCM_16")
            cache_meta.write_text(
                json.dumps({"unshifted_centroid_hz": round(unshifted_centroid, 2)}),
                encoding="utf8",
            )
            # Read back quantized PCM_16 so first run and cached runs are bit-identical
            samples, _ = sf.read(str(cache_wav), dtype="float32")
            samples = np.asarray(samples, dtype=np.float32)

        # Lay line sequentially with pause_before and pause_after
        pre_samples = max(0, round(pause_before * rate))
        post_samples = max(0, round(pause_after * rate))
        if pre_samples > 0:
            segments.append(np.zeros(pre_samples, dtype=np.float32))
            cursor_samples += pre_samples

        start_sample = cursor_samples
        segments.append(samples)
        cursor_samples += len(samples)
        end_sample = cursor_samples

        if post_samples > 0:
            segments.append(np.zeros(post_samples, dtype=np.float32))
            cursor_samples += post_samples

        sf.write(str(outdir / ("line_%02d.wav" % index)), samples, rate, subtype="PCM_16")

        start_sec = round(start_sample / rate, 4)
        end_sec = round(end_sample / rate, 4)
        spoken_sec = round(len(samples) / rate, 4)
        line_rms = round(compute_rms(samples), 5)
        line_peak = round(float(np.max(np.abs(samples))) if len(samples) > 0 else 0.0, 5)
        line_centroid = round(spectral_centroid(samples, rate), 1)

        line_entry = {
            "id": line_id,
            "speaker": speaker,
            "spoken": text,
            "display": display_text,
            "text": display_text,
            "emotion": emotion,
            "start": start_sec,
            "end": end_sec,
            "spoken_seconds": spoken_sec,
        }
        if "emphasis" in line and isinstance(line["emphasis"], list):
            line_entry["emphasis"] = line["emphasis"]
        measured_lines.append(line_entry)

        report_lines.append({
            **line_entry,
            "voice": voice_spec,
            "shaped_text": shaped_text,
            "pause_before": pause_before,
            "pause_after": pause_after,
            "speed": speed,
            "pitch_semitones": float(preset.get("pitch_semitones", 0.0)),
            "gain_db": float(preset.get("gain_db", 0.0)),
            "rms": line_rms,
            "peak": line_peak,
            "spectral_centroid_hz": line_centroid,
            "unshifted_centroid_hz": round(unshifted_centroid, 1),
            "cached": was_cached,
        })

    canvas = np.concatenate(segments) if segments else np.zeros(rate, dtype=np.float32)
    peak = float(np.max(np.abs(canvas))) if len(canvas) > 0 else 0.0
    if peak > 0.96:
        canvas = (canvas * (0.96 / peak)).astype(np.float32)

    wav_path = outdir / "voice.wav"
    sf.write(str(wav_path), canvas, rate, subtype="PCM_16")
    measured_duration = round(sf.info(str(wav_path)).duration, 4)

    lines_payload = {
        "schema_version": 1,
        "provider": provider,
        "voice_present": True,
        "duration": measured_duration,
        "lines": measured_lines,
    }
    (outdir / "lines.json").write_text(json.dumps(lines_payload, indent=2) + "\n", encoding="utf8")

    report = {
        "schema_version": 2,
        "provider": provider,
        "voice_present": True,
        "duration": measured_duration,
        "voices": voices_map,
        "default_speaker": default_speaker,
        "phrases": len(report_lines),
        "cached_lines": cached_count,
        "lines": report_lines,
        "full_timeline_wav": True,
        "rms": round(compute_rms(canvas), 5),
        "peak": round(float(np.max(np.abs(canvas))), 4),
    }
    (outdir / "voice-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    print(
        "TIMED_MULTISPEAKER_VOICE_PASS",
        json.dumps({
            "provider": provider,
            "voice_present": True,
            "duration": measured_duration,
            "lines": len(report_lines),
            "cached_lines": cached_count,
        }),
        flush=True,
    )


def synthesize(project: Path, force_fallback: bool = False):
    dlg_path = project / "dialogue.json"
    if not dlg_path.exists():
        raise RuntimeError(f"Missing dialogue.json in {project}")
    cfg = json.loads(dlg_path.read_text(encoding="utf-8-sig"))
    outdir = project / "timeline"
    provider, kokoro = init_tts_provider(force_fallback=force_fallback)
    if provider == "none":
        write_missing_tts_and_fail(outdir)

    schema_version = int(cfg.get("schema_version", 1))
    lines = cfg.get("lines", [])
    is_v2 = schema_version >= 2 or (lines and "at" not in lines[0])
    if is_v2:
        synthesize_v2(project, cfg, provider, kokoro)
    else:
        synthesize_v1(project, cfg, provider, kokoro)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--fallback", action="store_true")
    a = p.parse_args()
    folder = (ROOT / a.project).resolve()
    projects_dir = (ROOT / "projects").resolve()
    cache_dir = (ROOT / "studio" / ".cache").resolve()
    valid_Location = folder.parent == projects_dir or cache_dir in folder.parents
    if not valid_Location or not folder.is_dir():
        raise RuntimeError("Audio project must be under projects/<slug> or studio/.cache/<slug>")
    synthesize(folder, a.fallback)
