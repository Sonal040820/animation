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
  // Original atonal/minor soundscape: suspended A/C/E harmonics, subharmonic
  // tension, slow rising Shepard-like colour, and authored transient percussion.
  // No pre-recorded samples and no copyrighted composition.
  const n=Math.floor(duration*RATE);
  const samples=new Float32Array(n);
  let state=15129421;const rnd=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
  const cueData=cues.map(c=>({type:c.type,time:Number(c.time)})).filter(c=>Number.isFinite(c.time));
  for(let i=0;i<n;i++){
    const t=i/RATE,progress=t/duration;
    const cycle=t/12;
    // A minor / add-9 cluster, never a sampled song.
    const chord=[55,65.406,82.407,110.00,123.47];
    let drone=0;
    for(let p=0;p<chord.length;p++){
      const freq=chord[p]*(1+.0012*Math.sin(t*.23+p));
      const weight=[.026,.009,.015,.010,.005][p];
      drone+=weight*Math.sin(TAU*freq*t+Math.sin(t*(.17+p*.07))*.13);
    }
    const pulseBeat=.030*envelope(t%1.3,.03,.045)*Math.sin(TAU*46*t);
    const rise=.014*Math.pow(progress,2)*Math.sin(TAU*(42+24*progress)*t);
    const breath=.010*(rnd()*2-1)*(1+.22*Math.sin(t*.73));
    const upperChime=(t>37&&t<56)?(.004*Math.sin(TAU*329.6*t)*(.5+.5*Math.sin(t*.46))):0;
    let sound=drone+pulseBeat+rise+breath+upperChime;
    for(const cue of cueData){
      const d=t-cue.time;
      if(d<0||d>1.3)continue;
      const exponential=Math.exp(-d*10);
      switch(cue.type){
        case 'knock':
          sound+=(.26*Math.sin(TAU*(91-10*d)*d)+.12*(rnd()*2-1))*Math.exp(-d*34);break;
        case 'radio': case 'static':
          sound+=(rnd()*2-1)*.055*envelope(d,.25,.25);break;
        case 'whisper': case 'breath':
          sound+=(rnd()*2-1)*.022*Math.exp(-d*3);break;
        case 'lowboom': case 'subbass':
          sound+=.15*Math.exp(-d*3)*Math.sin(TAU*(52-15*d)*d);break;
        case 'footstep': sound+=.13*Math.exp(-d*25)*Math.sin(TAU*71*d);break;
        case 'rain':sound+=(rnd()*2-1)*.021*Math.exp(-d*.8);break;
        case 'latch':
          sound+=.20*Math.exp(-d*46)*(rnd()*2-1)+.095*Math.exp(-d*14)*Math.sin(TAU*980*d);break;
        case 'heartbeat':
          sound+=.16*Math.exp(-d*20)*Math.sin(TAU*62*d)+.08*envelope(d,.19,.04)*Math.sin(TAU*58*d);break;
        case 'click':case 'tick':
          sound+=.12*Math.exp(-d*65)*Math.sin(TAU*1150*d);break;
        case 'whoosh':sound+=.11*envelope(d,.2,.17)*(rnd()*2-1);break;
        case 'impact':sound+=exponential*(.21*Math.sin(TAU*(80-10*d)*d)+.07*(rnd()*2-1));break;
        default:break;
      }
    }
    // End in silence immediately before the final dry line, then small sting.
    if(t>=56.8&&t<57.5)sound*=.12;
    if(t>=59.55)sound*=Math.max(0,(duration-t)/.45);
    samples[i]=Math.max(-.8,Math.min(.8,sound));
  }
  const file=path.join(dir,'synth-original.wav');
  wav(file,samples);return file;
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
