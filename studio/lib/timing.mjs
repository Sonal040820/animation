// Dependency-free phrase splitting and deterministic caption alignment.
// Caption groups never cross sentence boundaries; 1-2 words per group.
import fs from 'node:fs';
import path from 'node:path';
import {mkdir} from './project.mjs';

export const tokenize=s=>String(s).match(/[^\s]+/g)||[];

export function phrases(script){
  const s=String(script||'').replace(/\s+/g,' ').trim();
  const items=s.match(/[^.!?]+[.!?]*/g)||[];
  return items.map(x=>x.trim()).filter(Boolean);
}

const DEFAULT_EMPHASIS=/^(NIGHT|BLINKED|GONE|TWELVE|STARE|STARING|ONE|1159|1201|NEITHER|OUTSIDE|ALONE|DOOR|COME|IN|REAL|MYSELF)$/i;

function isEmphasized(groupTokens,lineEmphasisSet,globalEmphasisSet){
  for(const tok of groupTokens){
    const rawUpper=String(tok).trim().toUpperCase().replace(/[.!?,]+$/,'');
    const clean=String(tok).replace(/[^a-z0-9]/gi,'').toUpperCase();
    if(!clean&&!rawUpper)continue;
    if(lineEmphasisSet.has(clean)||lineEmphasisSet.has(rawUpper)||globalEmphasisSet.has(clean)||globalEmphasisSet.has(rawUpper))return true;
    if(DEFAULT_EMPHASIS.test(clean))return true;
  }
  return false;
}

export function alignMeasured(linesJson,{emphasis=[]}={}){
  const lines=Array.isArray(linesJson?.lines)?linesJson.lines:[];
  if(!lines.length)throw new Error('lines.json contains no lines');
  const globalSet=new Set();
  const perLineMap=new Map();
  if(Array.isArray(emphasis)){
    for(const w of emphasis){
      const clean=String(w).replace(/[^a-z0-9]/gi,'').toUpperCase();
      const raw=String(w).trim().toUpperCase().replace(/[.!?,]+$/,'');
      if(clean)globalSet.add(clean);
      if(raw)globalSet.add(raw);
    }
  }else if(emphasis&&typeof emphasis==='object'){
    for(const [k,v] of Object.entries(emphasis)){
      if(Array.isArray(v)){
        const s=new Set();
        for(const x of v){
          const clean=String(x).replace(/[^a-z0-9]/gi,'').toUpperCase();
          const raw=String(x).trim().toUpperCase().replace(/[.!?,]+$/,'');
          if(clean)s.add(clean);
          if(raw)s.add(raw);
        }
        perLineMap.set(k,s);
      }
    }
  }
  const words=[];
  let maxEnd=0;
  for(let idx=0;idx<lines.length;idx++){
    const line=lines[idx];
    const start=Number(line.start);
    const end=Number(line.end);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)
      throw new Error('Invalid measured span for line '+(line.id||idx));
    if(end>maxEnd)maxEnd=end;
    const lineSet=new Set(perLineMap.get(line.id)||[]);
    if(Array.isArray(line.emphasis)){
      for(const w of line.emphasis){
        const clean=String(w).replace(/[^a-z0-9]/gi,'').toUpperCase();
        const raw=String(w).trim().toUpperCase().replace(/[.!?,]+$/,'');
        if(clean)lineSet.add(clean);
        if(raw)lineSet.add(raw);
      }
    }
    // Split display text by sentence boundaries first so caption groups never cross sentences
    const displayText=String(line.display??line.text??line.spoken??'').trim();
    const sents=phrases(displayText);
    const groups=[];
    for(const sent of sents){
      const tokens=tokenize(sent);
      for(let j=0;j<tokens.length;j+=2){
        const chunk=tokens.slice(j,j+2);
        const weight=chunk.reduce((sum,w)=>sum+Math.max(1,w.replace(/[^a-z0-9]/gi,'').length),0);
        groups.push({chunk,weight});
      }
    }
    if(!groups.length)continue;
    const totalWeight=groups.reduce((sum,g)=>sum+g.weight,0);
    const span=end-start;
    let cursor=start;
    for(let gIdx=0;gIdx<groups.length;gIdx++){
      const g=groups[gIdx];
      const dur=span*(g.weight/totalWeight);
      const wStart=gIdx===0?+start.toFixed(3):+cursor.toFixed(3);
      const wEnd=gIdx===groups.length-1?+end.toFixed(3):+(cursor+dur).toFixed(3);
      words.push({
        text:g.chunk.join(' '),
        start:wStart,
        end:Math.max(+(wStart+0.02).toFixed(3),wEnd),
        line_id:line.id||('l'+(idx+1)),
        speaker:line.speaker||'narrator',
        emphasis:isEmphasized(g.chunk,lineSet,globalSet)
      });
      cursor+=dur;
    }
  }
  const expectedDuration=Number(linesJson.duration)||maxEnd;
  return {
    schema_version:1,
    method:'measured-line/character-weight',
    expected_duration:+expectedDuration.toFixed(3),
    words
  };
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

export function alignDialogue(document){
  const lines=document.lines||[];
  if(!lines.length)throw new Error('Invalid dialogue: no lines');
  const isV2Plus=document.schema_version>=2||lines.some(l=>!Number.isFinite(Number(l.at))||!Number.isFinite(Number(l.duration)));
  if(isV2Plus){
    let cursor=0;
    const estLines=lines.map((l,idx)=>{
      const spoken=String(l.spoken??l.text??'').trim();
      const display=String(l.display??l.text??spoken).trim();
      const wc=spoken.split(/\s+/).filter(Boolean).length;
      const spokenDur=Math.max(0.75,+(wc*0.32+spoken.length*0.018).toFixed(3));
      const pauseBefore=Number.isFinite(Number(l.pause_before))?Number(l.pause_before):0.05;
      const pauseAfter=Number.isFinite(Number(l.pause_after))?Number(l.pause_after):0.18;
      const start=+(cursor+pauseBefore).toFixed(3);
      const end=+(start+spokenDur).toFixed(3);
      cursor=+(end+pauseAfter).toFixed(3);
      return {...l,id:l.id||('l'+(idx+1)),speaker:l.speaker||document.default_speaker||'narrator',spoken,display,text:display,start,end,spoken_seconds:spokenDur};
    });
    const res=alignMeasured({duration:cursor,lines:estLines});
    return {...res,method:'estimated-line/character-weight'};
  }
  const duration=Number(document.duration||0);
  if(!Number.isFinite(duration)||duration<=0||duration>90)throw new Error('Invalid dialogue duration');
  const words=[];
  for(const line of lines){
    if(!line.text||!Number.isFinite(line.at)||!Number.isFinite(line.duration))
      throw new Error('Invalid spoken line');
    if(line.at<0||line.at+line.duration>duration+.001)throw new Error('Voice line exceeds film');
    // Within a line, breaks at punctuation and word groups never cross sentences.
    const parts=phrases(line.text);
    const weights=parts.map(p=>Math.max(1,p.replace(/[^a-z0-9]/gi,'').length));
    const sum=weights.reduce((a,b)=>a+b,0);
    let cursor=line.at+.06;
    const available=Math.max(.1,line.duration-.13);
    for(let i=0;i<parts.length;i++){
      const len=available*weights[i]/sum;
      const ws=tokenize(parts[i]);const chars=ws.map(x=>Math.max(1,x.length));
      const denom=chars.reduce((a,b)=>a+b,0);
      let offset=0;
      for(let j=0;j<ws.length;){
        const group=ws.slice(j,j+2),k=chars.slice(j,j+2).reduce((a,b)=>a+b,0);
        const a=cursor+len*offset/denom,b=cursor+len*(offset+k)/denom;
        words.push({text:group.join(' '),start:+a.toFixed(3),end:+b.toFixed(3),
          speaker:line.speaker,emphasis:/^(NEITHER|OUTSIDE|ALONE|DOOR|COME|IN|REAL|MYSELF)/i.test(group.join(' '))});
        offset+=k;j+=2;
      }
      cursor+=len;
    }
  }
  return {schema_version:1,method:'timed-dialogue/phrase-weighted',expected_duration:duration,words};
}
