/** Generate narrator and character voices on Github Actions with HyperFrames Kokoro. */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
const DIR=path.resolve(process.argv[2]||"projects/storm-vs-ash-elite");
const cues=JSON.parse(fs.readFileSync(path.join(DIR,"AUDIO_CUES.json"),"utf8"));
const OUT=path.join(DIR,"assets/audio");
fs.mkdirSync(OUT,{recursive:true});
const log=[];
const run=(bin,args,options={})=>spawnSync(bin,args,{encoding:"utf8",timeout:300000,maxBuffer:1024*1024*3,...options});
for (const line of cues.dialogue) {
 const dest=path.join(OUT,line.id+".wav");
 const raw=path.join(OUT,line.id+".raw.wav");
 const phrase=line.text;
 let engine="Kokoro ONNX";
 let result={status:0,stderr:"",stdout:""};
 if(!fs.existsSync(raw)||fs.statSync(raw).size<2000){
  engine="HyperFrames Kokoro";
  result=run(path.join(process.cwd(),"node_modules/.bin/hyperframes"),[
    "tts",phrase,"--voice",line.voice,"--speed",String(line.speed),"-o",raw
  ]);
 }
 if(result.status!==0||!fs.existsSync(raw)||fs.statSync(raw).size<2000){
  console.warn("Kokoro synthesis unavailable for "+line.id+": "+String(result.stderr||result.stdout||"no diagnostic").slice(0,850));
  engine="eSpeak-NG FALLBACK";
  const voice=line.speaker==="Narrator"?"en-gb+f3":line.speaker==="Kai"?"en-us+m3":"en-us+m2";
  const pace=line.speaker==="Ren"?"148":"135";
  const backup=run("espeak-ng",["-v",voice,"-s",pace,"-w",raw,phrase]);
  if(backup.status!==0)throw Error("Both TTS routes failed for "+line.id+": "+result.stderr+"; "+backup.stderr);
 }
 const probe=run("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nokey=1:noprint_wrappers=1",raw]);
 const dur=Number.parseFloat(probe.stdout);
 if(!Number.isFinite(dur)||dur<.2)throw Error("Invalid duration of voice "+line.id);
 const target=Number(line.slot);
 let atempo=Math.max(.75,Math.min(2,dur/(target*.92)));
 if(dur/atempo>target)atempo=Math.min(2,Math.max(atempo,dur/(target*.99)));
 const filter="highpass=f=75,lowpass=f=7800,atempo="+atempo.toFixed(4)+",acompressor=threshold=-22dB:ratio=2.4:attack=6:release=130,alimiter=limit=0.83,atrim=duration="+target+",apad=pad_dur="+target;
 const res=run("ffmpeg",["-hide_banner","-loglevel","error","-y","-i",raw,"-af",filter,"-ar","44100","-ac","1",dest]);
 if(res.status!==0||!fs.existsSync(dest))throw Error("Cannot postprocess "+line.id+": "+res.stderr);
 fs.unlinkSync(raw);
 const record={id:line.id,speaker:line.speaker,text:phrase,voiceEngine:engine,slot:target,sourceDuration:dur,tempo:atempo};
 log.push(record);
 console.log(JSON.stringify(record));
}
fs.writeFileSync(path.join(OUT,"voice-provenance.json"),JSON.stringify(log,null,2)+"\n");
