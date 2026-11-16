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
    script = (project / "script.txt").read_text(encoding="utf8")
    segments = phrases(script)
    if not segments:
        raise RuntimeError("Cannot synthesize empty script")
    # Large optional downloads happen only for a user-invoked voice generation.
    model = get_model("kokoro-v1.0.onnx")
    voices = get_model("voices-v1.0.bin")
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro
    engine = Kokoro(str(model), str(voices))
    target = project / "timeline"
    target.mkdir(parents=True, exist_ok=True)
    audio = []
    durations = []
    sample_rate = None
    for i, sentence in enumerate(segments):
        pcm, rate = engine.create(sentence, voice=args.voice, speed=args.speed, lang=args.lang)
        if sample_rate is None:
            sample_rate = rate
        elif sample_rate != rate:
            raise RuntimeError("Kokoro returned inconsistent sample rates")
        pcm = np.asarray(pcm, dtype=np.float32)
        durations.append(round(len(pcm) / sample_rate, 5))
        sf.write(str(target / ("phrase_%02d.wav" % i)), pcm, rate, subtype="PCM_16")
        audio.append(pcm)
        if i != len(segments) - 1:
            audio.append(np.zeros(int(rate * 0.12), dtype=np.float32))
    result = np.concatenate(audio)
    sf.write(str(target / "voice.wav"), result, sample_rate, subtype="PCM_16")
    (target / "phrases.json").write_text(json.dumps({
        "method": "Kokoro ONNX local per phrase",
        "voice": args.voice,
        "durations": durations,
        "gap": 0.12,
        "duration": round(len(result) / sample_rate, 5),
        "sentences": segments,
    }, indent=2))
    print(json.dumps({"status": "voice_ready", "duration": len(result) / sample_rate,
                      "phrases": len(segments), "voice": args.voice}))


if __name__ == "__main__":
    main()
