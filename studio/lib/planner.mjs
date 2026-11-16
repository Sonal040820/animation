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

const HOUR_WORDS={
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12
};
const DIGIT_WORDS={
  oh:0,zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9
};
const TEEN_WORDS={
  ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19
};
const TENS_WORDS={
  twenty:20,thirty:30,forty:40,fifty:50
};

// Converts spoken clock/time phrases (e.g. "eleven fifty nine", "twelve oh one") into display clock form ("11:59", "12:01").
export function normalizeDisplayText(spokenText){
  let out=String(spokenText||'').trim();
  if(!out)return out;
  const hoursRe='(?:'+Object.keys(HOUR_WORDS).join('|')+')';
  const digitsRe='(?:'+Object.keys(DIGIT_WORDS).join('|')+')';
  const teensRe='(?:'+Object.keys(TEEN_WORDS).join('|')+')';
  const tensRe='(?:'+Object.keys(TENS_WORDS).join('|')+')';
  const onesRe='(?:one|two|three|four|five|six|seven|eight|nine)';

  // 1. "<hour> o'clock" / "<hour> o clock" -> "H:00"
  out=out.replace(new RegExp(`\\b(${hoursRe})\\s+o['’]?\\s*clock\\b`,'gi'),(_,h)=>{
    return `${HOUR_WORDS[h.toLowerCase()]}:00`;
  });
  // 2. "<hour> oh <digit>" -> "H:0D" (e.g. "twelve oh one" -> "12:01")
  out=out.replace(new RegExp(`\\b(${hoursRe})\\s+(?:oh|zero)\\s+(${onesRe})\\b`,'gi'),(_,h,m)=>{
    const mm=String(DIGIT_WORDS[m.toLowerCase()]).padStart(2,'0');
    return `${HOUR_WORDS[h.toLowerCase()]}:${mm}`;
  });
  // 3. "<hour> <tens> [ones]" -> "H:MM" (e.g. "eleven fifty nine" -> "11:59")
  out=out.replace(new RegExp(`\\b(${hoursRe})\\s+(${tensRe})(?:[-\\s]+(${onesRe}))?\\b`,'gi'),(_,h,t,o)=>{
    const m=TENS_WORDS[t.toLowerCase()]+(o?DIGIT_WORDS[o.toLowerCase()]:0);
    return `${HOUR_WORDS[h.toLowerCase()]}:${String(m).padStart(2,'0')}`;
  });
  // 4. "<hour> <teens>" -> "H:MM" (e.g. "two seventeen" -> "2:17")
  out=out.replace(new RegExp(`\\b(${hoursRe})\\s+(${teensRe})\\b`,'gi'),(_,h,m)=>{
    return `${HOUR_WORDS[h.toLowerCase()]}:${String(TEEN_WORDS[m.toLowerCase()]).padStart(2,'0')}`;
  });
  return out;
}

const EMPHASIS_CANDIDATES=/^(NIGHT|GIRL|WINDOW|STARING|STARE|CLOCK|ELEVEN|FIFTY|NINE|BLINKED|BLINK|TWELVE|ONE|GONE|VANISHED|DOOR|OUTSIDE|ALONE|NEITHER|REAL|MYSELF|11:59|12:01)$/i;

function extractEmphasis(sentence){
  const tokens=tokenize(sentence);
  const picked=[];
  for(const tok of tokens){
    const raw=tok.trim().toUpperCase().replace(/[.!?,]+$/,'');
    const clean=tok.replace(/[^a-z0-9]/gi,'').toUpperCase();
    const key=/^\d{1,2}:\d{2}$/.test(raw)?raw:clean;
    if((EMPHASIS_CANDIDATES.test(clean)||EMPHASIS_CANDIDATES.test(raw))&&!picked.includes(key))picked.push(key);
  }
  if(!picked.length&&tokens.length){
    const last=tokens.at(-1).replace(/[^a-z0-9:]/gi,'').toUpperCase();
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

export function planScript(scriptText,{slug='planned',voice='af_heart',rules=loadPlannerRules(),existingDialogue=null}={}){
  const sentences=phrases(scriptText);
  if(!sentences.length)throw new Error('script.txt contains no sentences to plan');
  const existingMap=new Map();
  for(const ln of (existingDialogue?.lines||[])){
    if(ln?.id&&typeof ln.display==='string'&&ln.display.trim()){
      existingMap.set(ln.id,ln.display.trim());
    }
  }
  const lines=[];
  const shots=[];
  const needs_new_code=[];
  const auto_planned=[];
  let prevWasTimeReveal=false;
  let lastClockTime=null;
  for(let i=0;i<sentences.length;i++){
    const spoken=sentences[i];
    const lineId='l'+(i+1);
    const display=existingMap.get(lineId)||normalizeDisplayText(spoken);
    const emo=guessEmotion(spoken,rules);
    const emphasis=extractEmphasis(display);
    lines.push({
      id:lineId,
      spoken,
      display,
      text:spoken,
      emotion:emo.emotion,
      speaker:'narrator',
      pause_after:emo.pause_after,
      emphasis
    });
    const m=matchShotRule(spoken,rules);
    const timeMatch=display.match(/\b(\d{1,2}:\d{2})\b/);
    const isTimeReveal=Boolean(timeMatch)||m.rule?.template==='insert-macro-clock';
    const estSpeechSec=Math.max(0.4,spoken.split(/\s+/).filter(Boolean).length*0.32);
    const shortAfterTime=prevWasTimeReveal&&estSpeechSec<1.0;
    if(!m.matched){
      needs_new_code.push({line:lineId,text:spoken,reason:'No rule in planner-rules.json matched this sentence'});
    }
    const r=m.rule;
    const params={...(r.params||{})};
    if(isTimeReveal&&timeMatch){
      params.time=timeMatch[1];
      lastClockTime=timeMatch[1];
    }else if(r.template==='window-view'&&params.girl===false&&lastClockTime){
      params.clock=lastClockTime;
    }
    const shot={
      id:'s'+String(i+1).padStart(2,'0'),
      template:r.template,
      line:lineId,
      camera:r.camera||'push',
      cameraIntensity:Number.isFinite(Number(r.cameraIntensity))?Number(r.cameraIntensity):(r.template==='insert-macro-clock'?1.35:1.0),
      seed:2001+i,
      params,
      sfx:Array.isArray(r.sfx)?r.sfx.map(x=>({...x})):[]
    };
    if(r.transition){
      shot.transition=r.transition;
      if(Number.isFinite(Number(r.transitionDuration)))shot.transitionDuration=Number(r.transitionDuration);
    }else if(isTimeReveal&&lastClockTime&&i>0&&prevWasTimeReveal){
      shot.transition='flash';
      shot.transitionDuration=0.22;
    }
    if(Array.isArray(r.cues)&&r.cues.length){
      shot.cues=r.cues.map(c=>({...c}));
    }
    if(r.ambience)shot.ambience=r.ambience;
    if(Number.isFinite(Number(r.fadeIn)))shot.fadeIn=Number(r.fadeIn);
    if(Number.isFinite(Number(r.fadeOut)))shot.fadeOut=Number(r.fadeOut);
    if(i===sentences.length-1&&!shot.fadeOut)shot.fadeOut=0.6;
    if(m.matched){
      auto_planned.push({shot:shot.id,line:lineId,rule_id:m.rule_id,template:shot.template,short_after_time:shortAfterTime});
    }
    prevWasTimeReveal=isTimeReveal;
    shots.push(shot);
  }
  const dialogue={
    schema_version:3,
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
  return {dialogue,manifest,needs_new_code,auto_planned};
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
  const existingDialogue=fs.existsSync(dialogueFile)?readJSON(dialogueFile):null;
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
  const {dialogue,manifest,needs_new_code,auto_planned}=planScript(scriptText,{slug,voice:config.voice||'af_heart',existingDialogue});
  // Persist composable presets; retain planScript's legacy result for callers.
  manifest.shots=manifest.shots.map(({template,params,...shot})=>({...shot,preset:template,overrides:{set:{params}}}));
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
    auto_planned,
    rules_needed:needs_new_code,
    needs_new_code,
    planned_shots:manifest.shots.map(s=>({
      id:s.id,
      line:s.line,
      lines:s.lines,
      template:s.template,
      preset:s.preset,
      overrides:s.overrides,
      camera:s.camera,
      transition:s.transition||'cut',
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
