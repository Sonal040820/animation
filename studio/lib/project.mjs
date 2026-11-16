// Node-side manifest validation, line-bound shot resolution, schema and strict data separation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assertShot} from './templates.mjs';
import {STYLES} from './styles.mjs';
import {avatarRigChoices} from './characters.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PROJECTS=path.join(ROOT,'projects');
export const STUDIO=path.join(ROOT,'studio');
export const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const sha=content=>crypto.createHash('sha256').update(content).digest('hex');
export const mkdir=p=>fs.mkdirSync(p,{recursive:true});

export function projectPath(p){
  if(!p||typeof p!=='string')throw new Error('--project must be supplied');
  const full=path.resolve(ROOT,p);
  if(!full.startsWith(PROJECTS+path.sep))throw new Error('Project must be under projects/');
  if(path.relative(PROJECTS,full).split(path.sep).length!==1)throw new Error('Use projects/<slug>');
  if(!/^[a-z0-9][a-z0-9-]*$/.test(path.basename(full)))throw new Error('Project slug must be lowercase kebab-case');
  return full;
}

function splitSentences(script){
  const s=String(script||'').replace(/\s+/g,' ').trim();
  const items=s.match(/[^.!?]+[.!?]?/g)||[];
  return items.map(x=>x.trim()).filter(Boolean);
}

function estimateLinesFromItems(items){
  let cursor=0;
  const lines=items.map((item,idx)=>{
    const obj=typeof item==='string'?{id:'l'+(idx+1),text:item}:item;
    const spoken=String(obj.spoken??obj.text??'').trim();
    const display=String(obj.display??obj.text??spoken).trim();
    const words=spoken.split(/\s+/).filter(Boolean).length;
    const spokenDur=Math.max(0.75,+(words*0.32+spoken.length*0.018).toFixed(3));
    const pauseBefore=Number.isFinite(Number(obj.pause_before))?Number(obj.pause_before):0.05;
    const pauseAfter=Number.isFinite(Number(obj.pause_after))?Number(obj.pause_after):0.18;
    const start=+(cursor+pauseBefore).toFixed(3);
    const end=+(start+spokenDur).toFixed(3);
    cursor=+(end+pauseAfter).toFixed(3);
    return {
      id:obj.id||('l'+(idx+1)),
      speaker:obj.speaker||'narrator',
      spoken,
      display,
      text:display,
      emotion:obj.emotion||'neutral',
      start,
      end,
      spoken_seconds:spokenDur
    };
  });
  return {duration:+cursor.toFixed(3),lines};
}

export function resolveLineSource(dir){
  const linesFile=path.join(dir,'timeline','lines.json');
  if(fs.existsSync(linesFile)){
    const data=readJSON(linesFile);
    const lines=(Array.isArray(data.lines)?data.lines:[]).map(l=>({
      ...l,
      spoken:l.spoken??l.text??'',
      display:l.display??l.text??l.spoken??'',
      text:l.display??l.text??l.spoken??''
    }));
    const duration=Number(data.duration)||Math.max(0,...lines.map(l=>Number(l.end)||0));
    return {timing:'measured',duration,lines,voicePresent:Boolean(data.voice_present),provider:data.provider||null};
  }
  const dialogueFile=path.join(dir,'dialogue.json');
  if(fs.existsSync(dialogueFile)){
    const dlg=readJSON(dialogueFile);
    const rawLines=Array.isArray(dlg.lines)?dlg.lines:[];
    const isV1=dlg.schema_version===1||(rawLines[0]&&Number.isFinite(Number(rawLines[0].at))&&Number.isFinite(Number(rawLines[0].duration)));
    if(isV1){
      const lines=rawLines.map((l,idx)=>{
        const start=Number(l.at);
        const dur=Number(l.duration);
        const spoken=l.spoken??l.text;
        const display=l.display??l.text??spoken;
        return {
          id:l.id||('l'+(idx+1)),
          speaker:l.speaker||dlg.default_speaker||'narrator',
          spoken,
          display,
          text:display,
          emotion:l.emotion||'neutral',
          start:+start.toFixed(3),
          end:+(start+dur).toFixed(3),
          spoken_seconds:+dur.toFixed(3)
        };
      });
      const duration=Number(dlg.duration)||Math.max(0,...lines.map(l=>l.end));
      return {timing:'estimated',duration,lines,voicePresent:false,provider:null};
    }
    const est=estimateLinesFromItems(rawLines);
    return {timing:'estimated',duration:est.duration,lines:est.lines,voicePresent:false,provider:null};
  }
  const scriptFile=path.join(dir,'script.txt');
  if(fs.existsSync(scriptFile)){
    const sents=splitSentences(fs.readFileSync(scriptFile,'utf8'));
    const est=estimateLinesFromItems(sents);
    return {timing:'estimated',duration:est.duration,lines:est.lines,voicePresent:false,provider:null};
  }
  return {timing:'estimated',duration:0,lines:[],voicePresent:false,provider:null};
}

export function resolveProjectShots(rawShots,lineSource,config={}){
  const shots=rawShots.map(s=>({...s}));
  const hasLineBound=shots.some(s=>Boolean(s.line||(Array.isArray(s.lines)&&s.lines.length))||!Number.isFinite(Number(s.start))||!Number.isFinite(Number(s.duration)));
  if(!hasLineBound){
    return [...shots].sort((a,b)=>a.start-b.start);
  }
  const lineMap=new Map((lineSource.lines||[]).map(l=>[l.id,l]));
  const anchors=[];
  const spans=[];
  for(let i=0;i<shots.length;i++){
    const s=shots[i];
    if(Number.isFinite(Number(s.start))&&Number.isFinite(Number(s.duration))&&!s.line&&!(Array.isArray(s.lines)&&s.lines.length)){
      anchors.push(Number(s.start));
      spans.push({start:Number(s.start),end:Number(s.start)+Number(s.duration)});
      continue;
    }
    const ids=Array.isArray(s.lines)&&s.lines.length?s.lines:(s.line?[s.line]:[]);
    if(!ids.length)throw new Error('Shot '+(s.id||i)+' must define start/duration or line/lines');
    const matched=ids.map(id=>{
      const ln=lineMap.get(id);
      if(!ln)throw new Error('Unknown line id "'+id+'" in shot '+(s.id||i));
      return ln;
    });
    const firstStart=Number(matched[0].start);
    const lastEnd=Number(matched[matched.length-1].end);
    anchors.push(i===0?0:firstStart);
    spans.push({start:firstStart,end:lastEnd});
  }
  // Ensure strictly increasing anchors when multiple shots share a line
  for(let i=1;i<anchors.length;i++){
    if(anchors[i]<=anchors[i-1]){
      const spanEnd=spans[i-1]?.end||anchors[i-1]+1;
      anchors[i]=+((anchors[i-1]+Math.max(anchors[i-1]+0.2,spanEnd))/2).toFixed(3);
    }
  }
  const tail=Number.isFinite(Number(config.tail))?Number(config.tail):0.6;
  const maxLineEnd=Math.max(Number(lineSource.duration)||0,...spans.map(sp=>sp.end||0));
  const finalEnd=+(maxLineEnd+tail).toFixed(3);
  for(let i=0;i<shots.length;i++){
    const s=shots[i];
    if(Number.isFinite(Number(s.start))&&Number.isFinite(Number(s.duration))&&!s.line&&!(Array.isArray(s.lines)&&s.lines.length)){
      s.start=+Number(s.start).toFixed(3);
      s.duration=+Number(s.duration).toFixed(3);
      continue;
    }
    const start=i===0?0:+(shots[i-1].start+shots[i-1].duration).toFixed(3);
    const nextStart=(i<shots.length-1)?anchors[i+1]:Math.max(finalEnd,start+0.5);
    const end=Math.max(+(start+0.1).toFixed(3),+nextStart.toFixed(3));
    s.start=+start.toFixed(3);
    s.duration=+(end-start).toFixed(3);
  }
  return shots;
}

export function findWordTimestamp(words,targetWord,shotStart=0,shotEnd=Infinity){
  const norm=String(targetWord||'').replace(/[^a-z0-9:]/gi,'').toLowerCase();
  if(!norm||!Array.isArray(words)||!words.length)return null;
  const searchPool=[];
  for(const w of words){
    const ws=Number(w.start),we=Number(w.end);
    if(!Number.isFinite(ws)||!Number.isFinite(we))continue;
    if(we>=shotStart-0.15&&ws<=shotEnd+0.15)searchPool.push(w);
  }
  const pool=searchPool.length?searchPool:words;
  for(const w of pool){
    const tokens=String(w.text||'').match(/[^\s]+/g)||[];
    if(!tokens.length)continue;
    const weights=tokens.map(tok=>Math.max(1,tok.replace(/[^a-z0-9]/gi,'').length));
    const sum=weights.reduce((a,b)=>a+b,0);
    let cursor=Number(w.start);
    const span=Math.max(0.01,Number(w.end)-cursor);
    for(let i=0;i<tokens.length;i++){
      const dur=span*(weights[i]/sum);
      const tokNorm=tokens[i].replace(/[^a-z0-9:]/gi,'').toLowerCase();
      if(tokNorm===norm){
        return {start:+cursor.toFixed(3),end:+(cursor+dur).toFixed(3),word:tokens[i]};
      }
      cursor+=dur;
    }
  }
  return null;
}

export function resolveShotCues(shots,words=[],lines=[]){
  return shots.map(shot=>{
    if(!Array.isArray(shot.cues)||!shot.cues.length)return shot;
    const shotStart=Number(shot.start)||0;
    const shotEnd=shotStart+(Number(shot.duration)||1);
    const resolvedCues=shot.cues.map(cue=>{
      if(!cue||typeof cue!=='object')return cue;
      let at=Number.isFinite(Number(cue.at))?Number(cue.at):null;
      let localTime=Number.isFinite(Number(cue.offset))?Number(cue.offset):null;
      let matchedWord=null;
      if(cue.at_word){
        const hit=findWordTimestamp(words,cue.at_word,shotStart,shotEnd);
        if(hit){
          at=hit.start;
          localTime=+Math.max(0,hit.start-shotStart).toFixed(3);
          matchedWord=hit;
        }else if(localTime===null){
          localTime=+Math.min((Number(shot.duration)||1)*0.4,0.35).toFixed(3);
          at=+(shotStart+localTime).toFixed(3);
        }
      }else if(at!==null&&localTime===null){
        localTime=+Math.max(0,at-shotStart).toFixed(3);
      }else if(localTime!==null&&at===null){
        at=+(shotStart+localTime).toFixed(3);
      }
      return {
        ...cue,
        action:cue.action||(cue.sfx?'sfx':'pulse'),
        at,
        localTime,
        matchedWord
      };
    });
    return {...shot,resolvedCues};
  });
}

export function loadProject(p){
  const dir=projectPath(p),manifest=readJSON(path.join(dir,'manifest.json'));
  const config=readJSON(path.join(dir,'config.json'));
  if(!Array.isArray(manifest.shots)||!manifest.shots.length)throw new Error('Empty manifest');
  const lineSource=resolveLineSource(dir);
  let shots=resolveProjectShots(manifest.shots,lineSource,config);
  const wordsFile=path.join(dir,'timeline','words.json');
  const words=fs.existsSync(wordsFile)?(readJSON(wordsFile).words||[]):[];
  shots=resolveShotCues(shots,words,lineSource.lines);
  for(let i=0;i<shots.length;i++){
    assertShot(shots[i]);
    if(i&&shots[i].start<shots[i-1].start+shots[i-1].duration-.02)
      throw new Error('Overlapping shots: '+shots[i].id);
  }
  const duration=+Math.max(...shots.map(s=>s.start+s.duration)).toFixed(3);
  if(duration>90||duration<.1)throw new Error('Video duration must be 0–90 seconds');
  if(config.aspect!=='9:16')throw new Error('This studio accepts vertical 9:16 only');
  const validStyles=Object.keys(STYLES);
  if(!validStyles.includes(config.style))throw new Error('Unknown style: '+config.style);
  const validRigs=avatarRigChoices.includes('silhouette')?avatarRigChoices:[...avatarRigChoices,'silhouette'];
  if(!validRigs.includes(config.rig))throw new Error('Unknown rig: '+config.rig);
  return {
    dir,
    manifest:{...manifest,shots},
    config,
    duration,
    timing:lineSource.timing,
    lines:lineSource.lines
  };
}

export function enforceDataOnly(){
  if(!fs.existsSync(PROJECTS))return [];
  const errors=[];
  for(const entry of fs.readdirSync(PROJECTS,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const root=path.join(PROJECTS,entry.name);
    // Legacy HyperFrames projects belong to another pipeline and are unchanged.
    const configPath=path.join(root,'config.json');
    if(!fs.existsSync(configPath))continue;
    let marker;
    try{marker=readJSON(configPath).studio}catch{continue}
    if(marker!=='original-short-video-studio')continue;
    const stack=[root];
    while(stack.length){
      const dir=stack.pop();
      for(const item of fs.readdirSync(dir,{withFileTypes:true})){
        const full=path.join(dir,item.name);
        if(item.isDirectory()){if(!['node_modules','.git'].includes(item.name))stack.push(full);continue}
        if(/\.(mjs|cjs|js|jsx|tsx|ts|py|sh|html|css|wasm)$/i.test(item.name))
          errors.push(path.relative(ROOT,full));
      }
    }
  }
  return errors;
}
