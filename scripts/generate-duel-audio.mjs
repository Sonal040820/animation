// Original synthesized instrumental score and impact effects.
// All files are generated deterministically from math + a fixed PRNG seed.
// No external copyrighted recordings, no API credentials, no npm dependencies.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] || "projects/storm-vs-ash/assets/audio");
fs.mkdirSync(OUT, {recursive:true});
const SR=32000, TAU=Math.PI*2;
let seed=0x43fa9521;
const rnd=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const fract=x=>x-Math.floor(x);
const s=(f,t)=>Math.sin(TAU*f*t);
const env=(t,a,d)=>Math.max(0,Math.min(1,t/a))*Math.exp(-Math.max(0,t-a)/d);
const soft=x=>Math.tanh(x);
const pack=(name,length,fn)=>{
 const n=Math.round(length*SR),raw=Buffer.alloc(44+n*2);
 raw.write("RIFF",0);raw.writeUInt32LE(36+n*2,4);raw.write("WAVE",8);
 raw.write("fmt ",12);raw.writeUInt32LE(16,16);raw.writeUInt16LE(1,20);
 raw.writeUInt16LE(1,22);raw.writeUInt32LE(SR,24);raw.writeUInt32LE(SR*2,28);
 raw.writeUInt16LE(2,32);raw.writeUInt16LE(16,34);raw.write("data",36);raw.writeUInt32LE(n*2,40);
 let peak=0;
 for(let i=0;i<n;i++){
   const t=i/SR,v=soft(fn(t,i));
   peak=Math.max(peak,Math.abs(v));
   raw.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*29000),44+i*2);
 }
 fs.writeFileSync(path.join(OUT,name+".wav"),raw);
 console.log(name+".wav",length.toFixed(2)+"s", "peak",peak.toFixed(3));
};
const tempo=128, beat=60/tempo;
const chords=[
 [110,130.8128,164.8138], // A minor colour
 [98,123.4708,146.8324], // G minor
 [87.307,110,130.8128],  // F minor colour
 [103.826,130.8128,155.563] // G sharp minor colour
];
const melody=[329.63,349.23,392,440,392,349.23,493.88,440,392,349.23,329.63,293.66,329.63,392,440,523.25];
const hit=(t,period)=>{const local=fract(t/period)*period;return local;};
pack("score",12,(t)=>{
 const c=chords[Math.min(3,Math.floor(t/3))];
 const chord=c.reduce((a,f,k)=>a+(0.048+0.012*k)*(s(f,t)+.25*s(f*2,t)+.1*s(f*3,t)),0);
 const pad=chord*(0.75+0.23*Math.sin(TAU*0.16*t));
 const bass=.16*Math.sin(TAU*c[0]*.5*t+.11*Math.sin(TAU*1.7*t));
 const e=hit(t,beat),kick=.33*Math.exp(-e*32)*s(60+100*Math.exp(-e*22),e);
 const snp=hit(t+beat,beat*2),snare=(rnd()-.5)*.16*Math.exp(-snp*19)+(s(185,snp)*.05*Math.exp(-snp*22));
 const hatp=hit(t,beat/2),hat=(rnd()-.5)*.065*Math.exp(-hatp*65);
 const index=Math.floor(t/(beat/2))%melody.length, et=hit(t,beat/2),m=melody[index];
 const ar=.073*env(et,.01,.2)*(s(m,t)+.32*s(m*2,t)+.12*s(m*3,t));
 const lift=t>5.9&&t<7.4 ? (rnd()-.5)*(t-5.9)/1.5*.10:0;
 const swell=t>7.1&&t<8.4 ? .08*s(73,t)*Math.exp(-(t-7.1)):0;
 const outro=t>10.6?Math.max(0,(12-t)/1.4):1;
 return outro*(pad+bass+kick+snare+hat+ar+lift+swell);
});
pack("dash",.65,t=>{
 const e=Math.exp(-t*5);
 return .28*(rnd()-.5)*e*(.4+.6*Math.sin(TAU*(1300*t+700*t*t))**2)+
 .12*s(290+700*t,t)*e;
});
pack("impact",.92,t=>{
 const n=(rnd()-.5);
 return .70*Math.exp(-t*18)*s(59+190*Math.exp(-t*16),t)
       +.85*n*Math.exp(-t*38)+
       .20*Math.exp(-t*3)*s(95,t)+
       .1*n*Math.exp(-t*5);
});
pack("charge",.92,t=>{
 const p=t/.92;
 return (.03+.22*p*p)*s(170+750*p*p,t)+.17*p*(rnd()-.5)
    +.09*p*s(54,t);
});
pack("finisher",1.45,t=>{
 const n=rnd()-.5;
 return .85*Math.exp(-t*10)*s(60+210*Math.exp(-t*12),t)
    +.95*n*Math.exp(-t*27)
    +.26*Math.exp(-t*2.5)*(s(38,t)+.30*s(76,t))
    +.20*n*Math.exp(-t*4);
});
