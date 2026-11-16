// Rule-driven script-to-dialogue (v2) and line-bound manifest planner.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {STUDIO,projectPath,readJSON,mkdir} from './project.mjs';
import {phrases,tokenize} from './timing.mjs';
import {TEMPLATE_NAMES} from './templates.mjs';

const LIB=path.dirname(fileURLToPath(import.meta.url));
export const PLANNER_RULES_FILE=path.join(LIB,'planner-rules.json');

export function loadPlannerRules(){
  return readJSON(PLANNER_RULES_FILE);
}

const EMPHASIS_CANDIDATES=/^(NIGHT|GIRL|WINDOW|STARING|STARE|CLOCK|ELEVEN|FIFTY|NINE|BLINKED|BLINK|TWELVE|ONE|GONE|VANISHED|DOOR|OUTSIDE|ALONE|NEITHER|REAL|MYSELF)$/i;

function extractEmphasis(sentence){
  const tokens=tokenize(sentence);
  const picked=[];
  for(const tok of tokens){
    const clean=tok.replace(/[^a-z0-9]/gi,'').toUpperCase();
    if(EMPHASIS_CANDIDATES.test(clean)&&!picked.includes(clean))picked.push(clean);
  }
  if(!picked.length&&tokens.length){
    const last=tokens.at(-1).replace(/[^a-z0-9]/gi,'').toUpperCase();
    if(last)picked.push(last);
  }
  return picked;
}

export function guessEmotion(sentence,rules=loadPlannerRules()){
  const text=String(sentence||'');
  for(const rule of rules.emotion_rules||[]){
    const re=new RegExp(rule.pattern,rule.flags||'i');
    if(re.test(text)){
      return {
        emotion:rule.emotion||rules.default_emotion||'ominous',
        pause_after:Number.isFinite(Number(rule.pause_after))?Number(rule.pause_after):0.24,
        rule_id:rule.id||null
      };
    }
  }
  return {emotion:rules.default_emotion||'ominous',pause_after:0.24,rule_id:null};
}

export function matchShotRule(sentence,rules=loadPlannerRules()){
  const text=String(sentence||'');
  for(const rule of rules.shot_rules||[]){
    const re=new RegExp(rule.pattern,rule.flags||'i');
    if(re.test(text)){
      let template=rule.template;
      let params={...(rule.params||{})};
      if(!TEMPLATE_NAMES.includes(template)){
        if(template==='figure-exterior'){
          template='window-view';
          params={girl:true};
        }else if(template==='empty-yard'){
          template='window-view';
          params={interior:true,girl:false,clock:'12:01',narrator:true};
        }else{
          template='character-medium';
          params={rig:'block',expression:'scared'};
        }
      }
      return {matched:true,rule_id:rule.id||rule.pattern,rule:{...rule,template,params}};
    }
  }
  return {
    matched:false,
    rule_id:null,
    rule:{
      template:'character-medium',
      camera:'push',
      cameraIntensity:1.0,
      params:{rig:'block',expression:'scared'},
      sfx:[],
      ambience:'room-tone'
    }
  };
}

export function planScript(scriptText,{slug='planned',voice='af_heart',rules=loadPlannerRules()}={}){
  const sentences=phrases(scriptText);
  if(!sentences.length)throw new Error('script.txt contains no sentences to plan');
  const lines=[];
  const shots=[];
  const needs_new_code=[];
  for(let i=0;i<sentences.length;i++){
    const text=sentences[i];
    const lineId='l'+(i+1);
    const emo=guessEmotion(text,rules);
    const emphasis=extractEmphasis(text);
    lines.push({
      id:lineId,
      text,
      emotion:emo.emotion,
      speaker:'narrator',
      pause_after:emo.pause_after,
      emphasis
    });
    const m=matchShotRule(text,rules);
    if(!m.matched){
      needs_new_code.push({line:lineId,text,reason:'No rule in planner-rules.json matched this sentence'});
    }
    const r=m.rule;
    const shot={
      id:'s'+String(i+1).padStart(2,'0'),
      template:r.template,
      line:lineId,
      camera:r.camera||'push',
      cameraIntensity:Number.isFinite(Number(r.cameraIntensity))?Number(r.cameraIntensity):1.0,
      seed:2001+i,
      params:{...(r.params||{})},
      sfx:Array.isArray(r.sfx)?r.sfx.map(x=>({...x})):[]
    };
    if(r.ambience)shot.ambience=r.ambience;
    if(Number.isFinite(Number(r.fadeIn)))shot.fadeIn=Number(r.fadeIn);
    if(Number.isFinite(Number(r.fadeOut)))shot.fadeOut=Number(r.fadeOut);
    if(i===sentences.length-1&&!shot.fadeOut)shot.fadeOut=0.6;
    shots.push(shot);
  }
  const dialogue={
    schema_version:2,
    voices:{narrator:voice},
    default_speaker:'narrator',
    lines
  };
  const manifest={
    schema_version:1,
    slug,
    status:'planned',
    shots
  };
  return {dialogue,manifest,needs_new_code};
}

export function planProject(projectRef,{force=false}={}){
  const dir=projectPath(projectRef);
  const scriptFile=path.join(dir,'script.txt');
  if(!fs.existsSync(scriptFile))throw new Error('Missing script.txt in '+dir);
  const dialogueFile=path.join(dir,'dialogue.json');
  const manifestFile=path.join(dir,'manifest.json');
  if(!force&&(fs.existsSync(dialogueFile)||fs.existsSync(manifestFile))){
    throw new Error('Refusing to overwrite existing dialogue.json or manifest.json without --force');
  }
  const configFile=path.join(dir,'config.json');
  const config=fs.existsSync(configFile)?readJSON(configFile):{
    schema_version:1,
    studio:'original-short-video-studio',
    aspect:'9:16',
    resolution:'720p',
    fps:24,
    style:'midnight',
    rig:'block',
    voice:'af_heart'
  };
  if(!fs.existsSync(configFile)){
    fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');
  }
  const scriptText=fs.readFileSync(scriptFile,'utf8');
  const slug=path.basename(dir);
  const {dialogue,manifest,needs_new_code}=planScript(scriptText,{slug,voice:config.voice||'af_heart'});
  fs.writeFileSync(dialogueFile,JSON.stringify(dialogue,null,2)+'\n');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  const timelineDir=path.join(dir,'timeline');
  mkdir(timelineDir);
  const planReport={
    schema_version:1,
    slug,
    planned_at:new Date().toISOString(),
    lines_count:dialogue.lines.length,
    shots_count:manifest.shots.length,
    needs_new_code,
    planned_shots:manifest.shots.map(s=>({
      id:s.id,
      line:s.line,
      lines:s.lines,
      template:s.template,
      camera:s.camera,
      params:s.params
    }))
  };
  fs.writeFileSync(path.join(timelineDir,'plan-report.json'),JSON.stringify(planReport,null,2)+'\n');
  return {
    slug,
    dialogue:path.relative(STUDIO,dialogueFile),
    manifest:path.relative(STUDIO,manifestFile),
    lines:dialogue.lines.length,
    shots:manifest.shots.length,
    needs_new_code
  };
}
