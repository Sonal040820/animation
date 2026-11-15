"""Original procedural cinematic combat sound design. No external music or voices."""
from __future__ import annotations
import math, random, struct, wave
from pathlib import Path

RATE=48000
DURATION=2.0
N=int(RATE*DURATION)
rng=random.Random(92441)
P=math.pi*2

def gaussian(t,mid,width):
    return math.exp(-.5*((t-mid)/width)**2)

def impact(t,center):
    d=t-center
    if d<0:return 0.0
    return math.exp(-d*15)*(math.sin(P*(68*d-23*d*d))*.58+math.sin(P*39*d)*.36)

def sample(t):
    # Low rhythmic tension under a floating harmonic dark drone.
    rise=max(0,min(1,(t-.12)/.84))
    drone=(.05*math.sin(P*48*t)+.025*math.sin(P*72*t)+.022*math.sin(P*95.7*t))*rise
    pulse=.09*gaussian(t,.49,.055)*math.sin(P*64*t)+.10*gaussian(t,.82,.05)*math.sin(P*55*t)
    # Attack acceleration and air pressure, culminating near frame 27.
    whoosh=gaussian(t,.89,.17)*(.085*rng.uniform(-1,1)+.04*math.sin(P*(340*t+120*t*t)))
    clash=impact(t,1.09)+.26*impact(t,1.16)
    hiss=math.exp(-max(0,t-1.09)*4.5)*(.022*rng.uniform(-1,1)) if t>=1.09 else 0
    return drone+pulse+whoosh+clash+hiss

def main():
    path=Path("renders/kai-ren/elite-01/kai_ren_original_audio.wav")
    path.parent.mkdir(parents=True,exist_ok=True)
    pcm=bytearray()
    for index in range(N):
        t=index/RATE
        val=sample(t)
        # Stereo width is modest; camera's centered contact remains centered.
        left=max(-.92,min(.92,val*(.98-.06*math.sin(P*.37*t))))
        right=max(-.92,min(.92,val*(.98+.06*math.sin(P*.37*t))))
        pcm+=struct.pack("<hh",int(left*32767),int(right*32767))
    with wave.open(str(path),"wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm)
    print("KAI_REN_ORIGINAL_AUDIO_READY",path.stat().st_size,flush=True)

if __name__=="__main__":main()
