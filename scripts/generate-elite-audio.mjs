/** STORM x ASH: original cinematic instrumental and designed impact library.
 * No commercial samples, generated deterministically at 44.1 kHz stereo.
 */
import fs from "node:fs";
import path from "node:path";
const OUT=path.resolve(process.argv[2]||"projects/storm-vs-ash-elite/assets/audio");
fs.mkdirSync(OUT,{recursive:true});
const SR=44100, TAU=2*Math.PI;
const sin=(f,t)=>Math.sin(TAU*f*t);
const frac=x=>x-Math.floor(x);
const ease=(x)=>Math.max(0,Math.min(1,x));
const env=(t,a,d)=>t<0?0:Math.min(1,t/a)*Math.exp(-Math.max(0,t-a)/d);
const n=(i,k=0)=>{let x=Math.imul((i+k*2291)|0,0x1b873593);x=(x^(x>>>16))>>>0;x=Math.imul(x,0x85ebca6b);return ((x^(x>>>13))>>>0)/2147483648-1;};
const wave=(f,t)=>sin(f,t)+.29*sin(2*f,t)+.10*sin(3*f,t)+.045*sin(4*f,t);
const body=(f,t)=>.67*sin(f,t)+.2*sin(f*.996,t)+.13*sin(f*1.005,t);
const limiter=x=>Math.tanh(x*.8);
function write(name,duration,fn){
  const samples=Math.round(SR*duration);
  const b=Buffer.alloc(44+samples*4);
  b.write("RIFF",0);b.writeUInt32LE(36+samples*4,4);b.write("WAVE",8);
  b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
  b.writeUInt16LE(2,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);
  b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);
  b.write("data",36);b.writeUInt32LE(samples*4,40);
  let peak=0, sq=0;
  for(let i=0;i<samples;i++){
    const t=i/SR,r=fn(t,i),l=limiter(Array.isArray(r)?r[0]:r),rr=limiter(Array.isArray(r)?r[1]:r);
    const a=Math.round(Math.max(-.97,Math.min(.97,l))*32767),c=Math.round(Math.max(-.97,Math.min(.97,rr))*32767);
    b.writeInt16LE(a,44+i*4);b.writeInt16LE(c,46+i*4);
    peak=Math.max(peak,Math.abs(l),Math.abs(rr));sq+=(l*l+rr*rr)*.5;
  }
  fs.writeFileSync(path.join(OUT,name+".wav"),b);
  console.log(name,duration,"peak",peak.toFixed(3),"RMS",Math.sqrt(sq/samples).toFixed(3));
}
const BEAT=60/116;
const chords=[
 [146.832,174.614,220.000], // D minor
 [116.541,146.832,174.614], // Bb
 [98.000,146.832,196.000],  // G minor
 [110.000,164.814,220.000], // A
 [146.832,174.614,220.000], // D minor
];
const top=[293.66,349.23,440,587.33,523.25,440,392,349.23,293.66,349.23,466.16,523.25,440,392,349.23,293.66];
const chordAt=t=>chords[Math.min(chords.length-1,Math.floor(t/4.6))];
function drum(t,period,kind=0){
 const u=frac(t/period)*period;
 if(kind===0)return .37*Math.exp(-u*19)*sin(61+120*Math.exp(-u*25),u)
   +.095*n(Math.floor(u*SR),7)*Math.exp(-u*60);
 if(kind===1)return .18*n(Math.floor(u*SR),8)*Math.exp(-u*29)+.065*sin(183,u)*Math.exp(-u*20);
 return .050*n(Math.floor(u*SR),5)*Math.exp(-u*75);
}
function score(t,i){
 const c=chordAt(t);
 const tension=ease((t-4.6)/5);
 const silence=t>16.72&&t<16.91?0.07:1;
 const quiet=t>10.98&&t<11.58?.52:1;
 const end=ease((23-t)/1.25);
 let string=0;
 c.forEach((f,k)=>string+=(.065+.009*k)*wave(f,t+.0016*k)*(.8+.16*sin(.13+k*.003,t)));
 const low=.26*body(c[0]/2,t)+.048*wave(c[0],t);
 const u=frac(t/(BEAT/2))*(BEAT/2);
 const idx=Math.floor(t/(BEAT/2))%top.length, pluck=.085*env(u,.009,.18)*wave(top[idx],t);
 const pulse=t<3?.32:1;
 const taiko=(.32+.16*tension)*drum(t,BEAT*2);
 const snare=(t>4.7?.75:.12)*drum(t+BEAT/2,BEAT,1);
 const sh=t>4.5?.55:.05;
 const hats=sh*drum(t,BEAT/4,2);
 const trem=.035*Math.sin(TAU*3.5*t)*sin(293.66*2,t);
 const riser=(t>13.7&&t<16.7)?(t-13.7)/3*.16*n(i,91):0;
 const bloom=(t>16.8&&t<18)? .11*body(73.4,t)*Math.exp(-(t-16.8)*1.4):0;
 const lead=(t>18.2)?.05*wave(293.66,t):0;
 const lr=string+low+pulse*(taiko+snare)+hats+pluck*(.7+.15*tension)+trem+riser+bloom+lead;
 return [lr*end*quiet*silence+.015*sin(110.04,t),lr*end*quiet*silence+.015*sin(109.94,t+.001)];
}
write("score",23,score);
write("wind",23,(t,i)=>{
 const wav=.09*sin(21,t)*sin(1.2,t)+.055*n(i,75)*(0.6+.25*sin(.2,t));
 return [wav*.90,wav*.85+.025*n(i,7)];
});
write("cloth",.36,(t,i)=>{const e=Math.sin(Math.PI*ease(t/.36));return [.11*n(i,9)*e,.095*n(i,10)*e];});
write("breath",.68,(t,i)=>{const e=ease(t/.16)*ease((.68-t)/.32);return [.11*n(i,18)*e,.11*n(i,19)*e];});
write("step",.35,(t,i)=>{
 const snap=.33*n(i,22)*Math.exp(-t*42);
 const thud=.48*sin(83+45*Math.exp(-t*24),t)*Math.exp(-t*23);
 const grit=.14*n(i,24)*Math.exp(-t*12);
 return [.8*(snap+thud+grit),.9*(snap+thud+grit)];
});
write("dash",.83,(t,i)=>{
 const ex=Math.exp(-t*5);
 const m=.46*n(i,31)*ex+.20*wave(165+700*t,t)*ex;
 return [m*.85,m];
});
write("guard",.72,(t,i)=>{
 const thud=.62*sin(92+230*Math.exp(-t*19),t)*Math.exp(-t*12);
 const bang=.54*n(i,45)*Math.exp(-t*44);
 const metal=.14*sin(890,t)*Math.exp(-t*11);
 return [.83*(thud+bang+metal),.86*(thud+bang+metal)];
});
write("punch",.95,(t,i)=>{
 const bass=.65*sin(67+210*Math.exp(-t*18),t)*Math.exp(-t*12);
 const snap=.62*n(i,61)*Math.exp(-t*48);
 const room=.13*n(i,62)*Math.exp(-t*5);
 return [bass+snap+room,(bass+snap+room)*.93];
});
write("kick",.68,(t,i)=>{
 const swoop=(.40*n(i,8)+.14*sin(300+600*t,t))*Math.exp(-t*4);
 return [swoop,.86*swoop];
});
write("charge",1.8,(t,i)=>{
 const p=t/1.8;
 const hum=.1*body(77+180*p,t)+.10*p*wave(290+720*p,t);
 const sfx=.10*Math.pow(p,1.4)*n(i,5);
 return [.8*(hum+sfx),hum+sfx];
});
write("finisher",1.7,(t,i)=>{
 const low=.91*sin(43+320*Math.exp(-t*14),t)*Math.exp(-t*5);
 const smash=.90*n(i,3)*Math.exp(-t*34);
 const tail=.28*body(52,t)*Math.exp(-t*2.2)+.18*n(i,19)*Math.exp(-t*7);
 const crystal=.20*sin(880,t)*Math.exp(-t*13);
 return [low+smash+tail+crystal,.94*(low+smash+tail+crystal)];
});
write("debris",1.8,(t,i)=>{
 let v=0;for(const at of [.06,.22,.49,.78,1.1,1.37]){
  const z=t-at;if(z>=0)v+=.28*n(i,Math.floor(at*100))*Math.exp(-z*39)+.065*sin(330+at*120,z)*Math.exp(-z*28);
 }
 return [v,v*.81];
});
write("scrape",.70,(t,i)=>{const v=.20*n(i,83)*(Math.sin(Math.PI*ease(t/.7))**2)+.06*sin(78,t)*Math.exp(-t*4);return [v*.95,v];});
write("sting",1.8,(t,i)=>{
 const v=.45*(wave(146.83,t)+.4*wave(220,t)+.35*wave(293.66,t))*Math.exp(-t*1.5)+.12*n(i,17)*Math.exp(-t*10);
 return [v,v*.92];
});
