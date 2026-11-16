#!/usr/bin/env python3
"""Reusable, entirely local multi-speaker narration for timed original scripts.

The scene is project DATA. Speech is synthesized from a pinned permissive Kokoro
model, or (if unavailable) an OS-installed espeak-ng voice, never cloud TTS.
"""
from __future__ import annotations
import argparse
import io
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice import get_model

def ffmpeg_atempo(samples,rate,speed):
    if speed<=1.001:return samples
    # FFmpeg atempo preserves pitch; compose factors for long phrases.
    factors=[]
    while speed>2:
        factors.append(2.0);speed/=2
    factors.append(speed)
    inp=io.BytesIO()
    sf.write(inp,samples,rate,format="WAV",subtype="PCM_16")
    out=subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-i","pipe:0",
        "-filter:a",",".join("atempo="+format(x,".5f") for x in factors),
        "-f","wav","pipe:1"],input=inp.getvalue(),capture_output=True,check=True,timeout=120)
    pcm,rate2=sf.read(io.BytesIO(out.stdout),dtype="float32")
    if rate!=rate2:raise RuntimeError("FFmpeg changed TTS sample rate")
    return np.asarray(pcm,dtype=np.float32)

def filter_voice(pcm,rate,role):
    if role not in {"warning","double"}:return pcm
    fft=np.fft.rfft(pcm)
    freq=np.fft.rfftfreq(len(pcm),1/rate)
    if role=="warning":
        band=1/(1+(230/np.maximum(1,freq))**6)
        band*=1/(1+(freq/2100)**8)
        shaped=np.fft.irfft(fft*band,len(pcm)).astype("float32")
        t=np.arange(len(shaped),dtype="float32")/rate
        return (shaped*(.78+.16*np.sin(2*math.pi*16*t))).astype("float32")
    band=1/(1+(freq/4200)**8)
    x=np.fft.irfft(fft*band,len(pcm)).astype("float32")
    echo=int(rate*.13)
    if len(x)>echo:x[echo:]+=.15*x[:-echo]
    return x

def fallback_espeak(text,role):
    voices={"mara":"en+f3","warning":"en+f4","double":"en+f3"}
    p=subprocess.run(["espeak-ng","-v",voices.get(role,"en+f3"),"-s","135","-p","46",
      "--stdout",text],capture_output=True,check=True,timeout=40)
    pcm,rate=sf.read(io.BytesIO(p.stdout),dtype="float32")
    return np.asarray(pcm,dtype=np.float32),rate

def resample_linear(x,source_rate,target_rate):
    if source_rate==target_rate:return x
    n=max(1,round(len(x)*target_rate/source_rate))
    return np.interp(np.linspace(0,len(x)-1,n),np.arange(len(x)),x).astype("float32")

def synthesize(project,force_fallback=False):
    cfg=json.loads((project/"dialogue.json").read_text("utf8"))
    total=float(cfg["duration"])
    if not 6<=total<=90:raise RuntimeError("Narration duration outside supported 6–90 seconds")
    lines=cfg["lines"]
    # Import/download a shared model once, not once per dialogue line.
    provider="espeak-ng-fallback"
    kokoro=None
    if not force_fallback:
        from kokoro_onnx import Kokoro
        model=get_model("kokoro-v1.0.int8.onnx")
        voices=get_model("voices-v1.0.bin")
        kokoro=Kokoro(str(model),str(voices))
        provider="kokoro-onnx-0.6.1-int8"
    rate=24000
    canvas=np.zeros(round(total*rate),dtype="float32")
    reports=[]
    outdir=project/"timeline";outdir.mkdir(parents=True,exist_ok=True)
    for index,line in enumerate(lines):
        at=float(line["at"]);window=float(line["duration"]);text=line["text"]
        if not 0<=at<total or not .3<=window<=8 or at+window>total+.001:
            raise RuntimeError("Invalid dialogue line time at "+str(index))
        role=line.get("speaker","mara")
        if kokoro:
            voice=cfg.get("voices",{}).get(role,"af_heart")
            samples,sample_rate=kokoro.create(text,voice=voice,speed=1.06,lang="en-us")
            samples=np.asarray(samples,dtype="float32")
        else:
            samples,sample_rate=fallback_espeak(text,role)
        samples=resample_linear(samples,sample_rate,rate)
        # Keep a natural 90 ms breath/pause at each end; auto-fit long phrases.
        capacity=max(1,int((window-.14)*rate))
        if len(samples)>capacity:
            samples=ffmpeg_atempo(samples,rate,len(samples)/capacity*1.025)
        if len(samples)>capacity:
            # Last-resort microscopic trim after pitch-preserving time compression.
            samples=samples[:capacity]
        samples=filter_voice(samples,rate,role)
        fade=min(int(rate*.025),len(samples)//8)
        if fade:
            samples[:fade]*=np.linspace(0,1,fade,dtype="float32")
            samples[-fade:]*=np.linspace(1,0,fade,dtype="float32")
        offset=round((at+.06)*rate)
        size=min(len(samples),len(canvas)-offset)
        if size>0:canvas[offset:offset+size]+=samples[:size]*.92
        sf.write(str(outdir/("line_%02d.wav"%index)),samples,rate,subtype="PCM_16")
        reports.append({"speaker":role,"text":text,"start":at,"window":window,
                        "spoken_seconds":round(size/rate,3)})
    peak=float(np.max(np.abs(canvas)))
    if peak>.96:canvas*=.96/peak
    sf.write(str(outdir/"voice.wav"),canvas,rate,subtype="PCM_16")
    report={"provider":provider,"duration":total,"voices":cfg["voices"],
            "phrases":len(reports),"lines":reports,
            "full_timeline_wav":True,"peak":round(float(np.max(np.abs(canvas))),3)}
    (outdir/"voice-report.json").write_text(json.dumps(report,indent=2),encoding="utf8")
    print("TIMED_MULTISPEAKER_VOICE_PASS",json.dumps({"provider":provider,"duration":total,"lines":len(lines)}),flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--project",required=True)
    p.add_argument("--fallback",action="store_true")
    a=p.parse_args()
    folder=(ROOT/a.project).resolve()
    if folder.parent!=ROOT/"projects" or not folder.is_dir():
        raise RuntimeError("Audio project must be exactly projects/<slug>")
    synthesize(folder,a.fallback)
