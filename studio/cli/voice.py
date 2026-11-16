#!/usr/bin/env python3
"""Local, source-pinned Kokoro ONNX phrase narration. Not invoked during setup."""
import argparse
import hashlib
import json
import os
import re
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "studio" / ".cache" / "kokoro"
BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/"
MODELS = {
    "kokoro-v1.0.onnx": "beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a",
    "kokoro-v1.0.int8.onnx": "ae315a79b623f244700e4afb9246c46a26066782e049ba174bf3ba433970ee9c",
    "voices-v1.0.bin": "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d",
}


def get_model(filename):
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / filename
    expected = MODELS[filename]
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == expected:
        return dest
    if dest.exists():
        dest.unlink()
    url = BASE + filename
    temp = CACHE / (filename + ".partial")
    req = urllib.request.Request(url, headers={"User-Agent": "original-studio-kokoro/0.1"})
    with urllib.request.urlopen(req, timeout=300) as response, temp.open("wb") as sink:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            sink.write(chunk)
    if hashlib.sha256(temp.read_bytes()).hexdigest() != expected:
        temp.unlink(missing_ok=True)
        raise RuntimeError("Pinned Kokoro asset SHA256 mismatch: " + filename)
    temp.replace(dest)
    return dest


def resolve_voice_style(engine, voice_spec: str):
    import numpy as np
    spec = (voice_spec or "af_heart").strip()
    if "+" not in spec and ":" not in spec:
        return engine.get_voice_style(spec).astype(np.float32)
    parts = [p.strip() for p in spec.split("+") if p.strip()]
    styles, weights = [], []
    for part in parts:
        if ":" in part:
            name, w_str = part.split(":", 1)
            w = float(w_str.strip())
        else:
            name, w = part, 1.0
        styles.append(engine.get_voice_style(name.strip()).astype(np.float32))
        weights.append(w)
    total = sum(weights)
    if total <= 0:
        raise ValueError(f"Invalid voice blend weights in {voice_spec!r}")
    blended = sum((w / total) * s for w, s in zip(weights, styles))
    return np.asarray(blended, dtype=np.float32)


def phrases(text):
    return [s.strip() for s in re.findall(r"[^.!?]+[.!?]?", text) if s.strip()]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--project", required=True)
    p.add_argument("--voice", default="am_adam")
    p.add_argument("--speed", type=float, default=0.93)
    p.add_argument("--lang", default="en-us")
    args = p.parse_args()
    root = ROOT / "projects"
    project = (ROOT / args.project).resolve()
    if project.parent != root.resolve() or not project.is_dir():
        raise RuntimeError("Voice project must be exactly projects/<slug>")
    script = (project / "script.txt").read_text(encoding="utf-8-sig")
    segments = phrases(script)
    if not segments:
        raise RuntimeError("Cannot synthesize empty script")
    # Prefer int8 model if already cached to avoid unnecessary duplicate download.
    model_name = "kokoro-v1.0.onnx" if (CACHE / "kokoro-v1.0.onnx").exists() else "kokoro-v1.0.int8.onnx"
    model = get_model(model_name)
    voices = get_model("voices-v1.0.bin")
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro
    engine = Kokoro(str(model), str(voices))
    voice_style = resolve_voice_style(engine, args.voice)
    target = project / "timeline"
    target.mkdir(parents=True, exist_ok=True)
    audio = []
    durations = []
    lines_meta = []
    sample_rate = None
    cursor_samples = 0
    gap_sec = 0.12
    for i, sentence in enumerate(segments):
        pcm, rate = engine.create(sentence, voice=voice_style, speed=args.speed, lang=args.lang)
        if sample_rate is None:
            sample_rate = rate
        elif sample_rate != rate:
            raise RuntimeError("Kokoro returned inconsistent sample rates")
        pcm = np.asarray(pcm, dtype=np.float32)
        dur = round(len(pcm) / sample_rate, 5)
        start_sec = round(cursor_samples / sample_rate, 4)
        end_sec = round((cursor_samples + len(pcm)) / sample_rate, 4)
        durations.append(dur)
        sf.write(str(target / ("phrase_%02d.wav" % i)), pcm, rate, subtype="PCM_16")
        audio.append(pcm)
        cursor_samples += len(pcm)
        lines_meta.append({
            "id": f"l{i+1}",
            "speaker": "narrator",
            "text": sentence,
            "emotion": "neutral",
            "start": start_sec,
            "end": end_sec,
            "spoken_seconds": round(end_sec - start_sec, 4),
        })
        if i != len(segments) - 1:
            gap_samples = int(rate * gap_sec)
            audio.append(np.zeros(gap_samples, dtype=np.float32))
            cursor_samples += gap_samples
    result = np.concatenate(audio)
    wav_path = target / "voice.wav"
    sf.write(str(wav_path), result, sample_rate, subtype="PCM_16")
    total_dur = round(sf.info(str(wav_path)).duration, 4)
    provider = "kokoro-onnx-0.6.1-int8" if "int8" in model_name else "kokoro-onnx-0.6.1"
    (target / "phrases.json").write_text(json.dumps({
        "method": "Kokoro ONNX local per phrase",
        "provider": provider,
        "voice": args.voice,
        "durations": durations,
        "gap": gap_sec,
        "duration": total_dur,
        "sentences": segments,
    }, indent=2), encoding="utf8")
    (target / "lines.json").write_text(json.dumps({
        "schema_version": 1,
        "provider": provider,
        "voice_present": True,
        "duration": total_dur,
        "lines": lines_meta,
    }, indent=2), encoding="utf8")
    print(json.dumps({"status": "voice_ready", "provider": provider, "duration": total_dur,
                      "phrases": len(segments), "voice": args.voice}))


if __name__ == "__main__":
    main()
