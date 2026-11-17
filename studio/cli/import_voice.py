"""Rebuild a timed voice track from local takes and existing fallback line WAVs.

Usage: python studio/cli/import_voice.py projects/<slug>
Optional audio-import.json maps dialogue IDs to project-relative files.
"""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
from voice_scene import ffmpeg_atempo

project = Path(sys.argv[1]).resolve()
dialogue = json.loads((project / 'dialogue.json').read_text())
imports = json.loads((project / 'audio-import.json').read_text())
rate = 24000
timeline = project / 'timeline'
canvas = np.zeros(round(dialogue['duration'] * rate), dtype=np.float32)
measured = []
for index, line in enumerate(dialogue['lines']):
    entry = imports.get(line['id'])
    source = (project / entry['file']).resolve() if entry else timeline / ('line_%02d.wav' % index)
    if not source.is_relative_to(project):
        raise ValueError('Audio input must stay inside project')
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-f', 'f32le', '-ac', '1', '-ar', str(rate), '-'])
    samples = np.frombuffer(raw, dtype='<f4').copy()
    capacity = line['duration'] - .12
    if len(samples) / rate > capacity:
        samples = ffmpeg_atempo(samples, rate, len(samples) / rate / capacity * 1.005)
    if line['speaker'] == 'ai':
        # Subtle delayed layers keep the words intelligible.
        dry = samples.copy()
        for seconds, gain in [(.045, .12), (.13, .09)]:
            delay = round(seconds * rate)
            samples[delay:] += dry[:-delay] * gain
    peak = np.max(np.abs(samples))
    if peak > 0:
        samples *= .7 / peak
    offset = round((line['at'] + .04) * rate)
    count = min(len(samples), len(canvas) - offset)
    canvas[offset:offset + count] += samples[:count]
    measured.append({**line, 'start':offset/rate, 'end':(offset+count)/rate,
                     'spoken_seconds':count/rate, 'provider':entry.get('provider','external') if entry else 'kokoro-onnx'})
sf.write(str(timeline / 'voice.wav'), canvas, rate, subtype='PCM_16')
payload = {'schema_version':1,'provider':'mixed-local-takes','voice_present':True,'duration':dialogue['duration'],'lines':measured}
(timeline / 'lines.json').write_text(json.dumps(payload,indent=2)+'\n')
(timeline / 'voice-report.json').write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'duration':dialogue['duration'],'lines':len(measured),'imported':len(imports)}))
