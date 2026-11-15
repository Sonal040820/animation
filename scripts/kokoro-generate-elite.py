"""Generate six original dialogue performances with Kokoro-ONNX on CPU.
Model weights are downloaded separately by GitHub Actions and cached.
"""
import json
import sys
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

project = Path(sys.argv[1]).resolve()
models = Path(sys.argv[2]).resolve()
model_file = models / "kokoro-v1.0.onnx"
voice_file = models / "voices-v1.0.bin"
audio_dir = project / "assets" / "audio"
audio_dir.mkdir(parents=True, exist_ok=True)
cues = json.loads((project / "AUDIO_CUES.json").read_text())["dialogue"]
if not model_file.is_file() or not voice_file.is_file():
    raise RuntimeError("Kokoro model files missing")

tts = Kokoro(str(model_file), str(voice_file))
for line in cues:
    lang = "en-gb" if line["voice"].startswith("b") else "en-us"
    samples, sample_rate = tts.create(line["text"], voice=line["voice"],
                                      speed=float(line["speed"]), lang=lang)
    if len(samples) < 500:
        raise RuntimeError("Generated audio too short: " + line["id"])
    path = audio_dir / (line["id"] + ".raw.wav")
    sf.write(str(path), samples, sample_rate, subtype="PCM_16")
    print(line["id"], line["voice"], sample_rate, len(samples) / sample_rate, flush=True)
