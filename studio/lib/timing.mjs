// Dependency-free phrase splitting and deterministic caption alignment fallback.
// Caption groups never cross sentence boundaries; 1-2 words per group.
import fs from 'node:fs';
import path from 'node:path';
import {mkdir} from './project.mjs';
export const tokenize=s=>String(s).match(/[^\s]+/g)||[];
export function phrases(script){
  const s=String(script||'').replace(/\s+/g,' ').trim();
  const items=s.match(/[^.!?]+[.!?]?/g)||[];
  return items.map(x=>x.trim()).filter(Boolean);
}
export function alignPhrases(script,durations,totalSeconds=10,gap=.12){
  const ps=phrases(script);
  if(!ps.length)throw new Error('Script contains no narration');
  if(durations&&durations.length!==ps.length)throw new Error('Voice phrase count mismatch');
  const raw=durations||ps.map(p=>Math.max(.65,p.length*.048));
  const totalRaw=raw.reduce((a,b)=>a+b,0);
  const available=Math.max(.1,totalSeconds-gap*(ps.length-1));
  const multiplier=durations?1:available/totalRaw;
  const words=[];let offset=0;
  for(let i=0;i<ps.length;i++){
    const phrase=ps[i],pwords=tokenize(phrase),length=raw[i]*multiplier;
    const weights=pwords.map(w=>Math.max(1,w.replace(/[^a-z0-9]/gi,'').length));
    const sum=weights.reduce((a,b)=>a+b,0);
    let cursor=offset;
    for(let j=0;j<pwords.length;){
      const count=Math.min(2,pwords.length-j);
      const group=pwords.slice(j,j+count);
      const weight=weights.slice(j,j+count).reduce((a,b)=>a+b,0);
      const dur=length*weight/sum;
      words.push({text:group.join(' '),start:+cursor.toFixed(3),end:+(cursor+dur).toFixed(3),
        emphasis:group.some(x=>/^(NIGHT|BLINKED|GONE|TWELVE|STARE|ONE)$/i.test(x.replace(/[.!?]/g,'')))});
      cursor+=dur;j+=count;
    }
    offset+=length+gap;
  }
  return {schema_version:1,method:durations?'phrase-audio-measured/character-weight':'estimated/character-weight',
    expected_duration:+totalSeconds.toFixed(3),words};
}
export function saveWords(project,text,durations=null,total=10){
  const result=alignPhrases(text,durations,total);
  const out=path.join(project,'timeline','words.json');mkdir(path.dirname(out));
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
  return result;
}
