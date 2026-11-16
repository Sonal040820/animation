// Original synthesized score, ambience and sound FX. No downloaded samples.
import fs from 'node:fs';
import path from 'node:path';
import {invoke} from './runner.mjs';
import {mkdir} from './project.mjs';
const RATE=48000;
const TAU=Math.PI*2;
function envelope(t,a,b){return Math.exp(-Math.pow((t-a)/b,2))}
function wav(file,samples){
  mkdir(path.dirname(file));
  const data=Buffer.alloc(44+samples.length*4);
  data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);
  data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);
  data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);
  data.writeUInt32LE(RATE,24);data.writeUInt32LE(RATE*4,28);
  data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);
  data.write('data',36);data.writeUInt32LE(samples.length*4,40);
  for(let i=0;i<samples.length;i++){
    const x=Math.round(Math.max(-.96,Math.min(.96,samples[i]))*32767);
    data.writeInt16LE(x,44+i*4);data.writeInt16LE(x,46+i*4);
  }
  fs.writeFileSync(file,data);
}
export function synthOriginalAudio(dir,duration,cues=[]){
  const n=Math.floor(duration*RATE);
  const samples=new Float32Array(n);
  let state=15129421;const rnd=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
  for(let i=0;i<n;i++){
    const t=i/RATE;
    const drone=.04*Math.sin(TAU*55*t)+.02*Math.sin(TAU*82.5*t);
    const clock=.026*envelope(t,Math.floor(t)+.02,.017)*Math.sin(TAU*780*t);
    const air=.007*(rnd()*2-1)*(1+.3*Math.sin(t*.8));
    let s=drone+clock+air;
    for(const cue of cues){
      const dt=t-cue.time;
      if(dt>=0&&dt<.7){
        const a=Math.exp(-dt*17);
        if(cue.type==='impact')s+=a*(.19*Math.sin(TAU*(80*dt-12*dt*dt))+.09*(rnd()*2-1));
        else if(cue.type==='whoosh')s+=.10*envelope(dt,.12,.10)*(rnd()*2-1);
        else if(cue.type==='tick')s+=.13*Math.exp(-dt*60)*Math.sin(TAU*1320*dt);
      }
    }
    samples[i]=s;
  }
  const file=path.join(dir,'synth-original.wav');wav(file,samples);return file;
}
export function mix(project,duration){
  const out=path.join(project.out,'final.mp4');
  const voice=path.join(project.dir,'timeline','voice.wav');
  const cues=project.manifest.shots.flatMap(s=>(s.sfx||[]).map(c=>({type:c.type||'tick',time:s.start+(c.offset||0)})));
  const bed=synthOriginalAudio(project.out,duration,cues);
  const video=path.join(project.out,'video_silent.mp4');
  if(!fs.existsSync(video))throw new Error('Render silent video before mixing');
  const args=['-hide_banner','-loglevel','error','-y','-i',video,'-i',bed];
  if(fs.existsSync(voice)){
    args.push('-i',voice,'-filter_complex','[1:a]volume=0.70[bed];[bed][2:a]sidechaincompress=threshold=0.015:ratio=8:attack=12:release=220[duck];[duck][2:a]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]','-map','0:v','-map','[out]');
  }else args.push('-filter_complex','[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[out]','-map','0:v','-map','[out]');
  args.push('-c:v','copy','-c:a','aac','-b:a','160k','-t',String(duration),'-movflags','+faststart',out);
  invoke('ffmpeg',args,{timeout:600000});
  return {file:out,voicePresent:fs.existsSync(voice)};
}
