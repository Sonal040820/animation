// Comprehensive manifest, config, dialogue, audio, camera, and caption validator.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectPath,readJSON,resolveLineSource,resolveProjectShots,enforceDataOnly,ROOT} from './project.mjs';
import {TEMPLATE_NAMES,TRANSITIONS} from './templates.mjs';
import {TEMPLATE_META} from './template-meta.mjs';
import {CAMERA_MOVES} from './motion.mjs';
import {STYLES} from './styles.mjs';
import {avatarRigChoices} from './characters.mjs';
import {SFX_TYPES,AMBIENCE_TYPES} from './audio.mjs';
import {computeWindowLayout} from './scenery.mjs';
import {normalizeRecipe} from './recipe.mjs';

const LIB=path.dirname(fileURLToPath(import.meta.url));

const loadedTemplateMeta=TEMPLATE_META;

const FALLBACK_TEMPLATE_META={
  'wide-establishing':{params:{scene:{type:'enum',values:['building','fence-moon']},set:{type:'string'},seed:{type:'number'},text:{type:'string'}}},
  'window-view':{params:{girl:{type:'boolean'},interior:{type:'boolean'},clock:{type:'string'},narrator:{type:'boolean'},seed:{type:'number'}}},
  'character-medium':{params:{rig:{type:'enum',values:['stick','block','silhouette']},expression:{type:'string'},expressionTo:{type:'string'},color:{type:'string'},wobble:{type:'number'},rimPulse:{type:'boolean'},backdrop:{type:'string'},blinkAt:{type:'array'},seed:{type:'number'}}},
  'giant-face':{params:{rig:{type:'enum',values:['stick','block','silhouette']},expression:{type:'string'},expressionTo:{type:'string'},color:{type:'string'},wobble:{type:'number'},rimPulse:{type:'boolean'},backdrop:{type:'string'},blinkAt:{type:'array'},seed:{type:'number'}}},
  'insert-macro-clock':{params:{time:{type:'string'},kind:{type:'enum',values:['analog','digital']},backdrop:{type:'string'},flicker:{type:'number'}}},
  'data-card':{params:{text:{type:'string'},value:{type:'string'}}},
  '3d-orbit':{params:{camera:{type:'string'},seed:{type:'number'}}},
  'title-card':{params:{text:{type:'string'}}},
  'three-particle-void':{params:{text:{type:'string'}}},
  'three-night-city':{params:{text:{type:'string'}}},
  'three-horror-room':{params:{text:{type:'string'}}},
  'intercom-macro':{params:{display:{type:'string'},signal:{type:'boolean'}}},
  'empty-hallway':{params:{figure:{type:'boolean'},blur:{type:'boolean'},light:{type:'string'}}},
  'door-close':{params:{knocks:{type:'number'},angle:{type:'number'},smile:{type:'boolean'}}},
  'mirror-double':{params:{emotion:{type:'string'},double:{type:'boolean'}}},
  'bedroom-shadow':{params:{knocks:{type:'number'},light:{type:'string'}}},
  'stairwell':{params:{wet:{type:'boolean'},figure:{type:'boolean'}}},
  'door-peephole':{params:{figure:{type:'boolean'}}},
  'keyhole-view':{params:{figure:{type:'boolean'},smile:{type:'boolean'}}},
  'figure-exterior':{params:{variant:{type:'enum',values:['girl','boy','adult']},pose:{type:'enum',values:['stand','walk','look','flinch','still']},expression:{type:'string'},gaze:{type:'object'},walk:{type:'boolean'}}},
  'empty-yard':{params:{moon:{type:'boolean'},clouds:{type:'boolean'},fence:{type:'boolean'},tree:{type:'boolean'}}}
};

const FALLBACK_SFX=['tick','click','impact','whoosh','heartbeat','breath','whisper','sting','riser','blink-swish','glass-tap','knock','static','radio','lowboom','subbass','footstep','latch','rain'];
const FALLBACK_AMBIENCE=['night-wind','crickets','room-tone','rain','clock-tick-loop','cold-night','room'];

export function levenshtein(a,b){
  const s=String(a||'').toLowerCase(),t=String(b||'').toLowerCase();
  const m=s.length,n=t.length;
  const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost=s[i-1]===t[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

export function didYouMean(input,candidates=[]){
  if(!input||!candidates.length)return null;
  const target=String(input).toLowerCase();
  let best=null,bestScore=Infinity;
  for(const c of candidates){
    const cand=String(c);
    const cl=cand.toLowerCase();
    if(cl.includes(target)||target.includes(cl)){
      const d=Math.abs(cl.length-target.length);
      if(d<bestScore){bestScore=d;best=cand;}
      continue;
    }
    const d=levenshtein(target,cl);
    if(d<bestScore){bestScore=d;best=cand;}
  }
  return bestScore<=Math.max(4,Math.ceil(target.length*0.6))?best:best;
}

function getTemplateMeta(){
  if(!loadedTemplateMeta)return FALLBACK_TEMPLATE_META;
  // Merge fallback legacy params (e.g. text on wide-establishing, color on giant-face) so existing verified films stay valid
  const merged={...FALLBACK_TEMPLATE_META,...loadedTemplateMeta};
  for(const [k,v] of Object.entries(loadedTemplateMeta)){
    const fbParams=FALLBACK_TEMPLATE_META[k]?.params||{};
    merged[k]={...v,params:{...fbParams,...(v.params||{})}};
  }
  return merged;
}

function getValidSfx(){
  const fromAudio=Array.isArray(SFX_TYPES)?SFX_TYPES:[];
  return [...new Set([...fromAudio,...FALLBACK_SFX])];
}

function getValidAmbience(){
  const fromAudio=Array.isArray(AMBIENCE_TYPES)?AMBIENCE_TYPES:[];
  return [...new Set([...fromAudio,...FALLBACK_AMBIENCE])];
}

function getValidEmotions(){
  const file=path.join(LIB,'voice-presets.json');
  if(fs.existsSync(file)){
    try{
      const data=readJSON(file);
      return Object.keys(data.emotions||data||{});
    }catch{}
  }
  return ['neutral','ominous','whisper','scared','terrified','tense','calm','sad','relieved','excited'];
}

function checkParamValue(shotId,template,paramName,val,spec){
  if(!spec||typeof spec!=='object')return null;
  const t=spec.type;
  if(t==='boolean|object'){
    if(typeof val==='boolean')return null;
    if(typeof val==='object'&&val!==null&&!Array.isArray(val))return null;
    return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be boolean or object, got ${typeof val}`};
  }
  if(t==='string|object'){
    if(typeof val==='string')return null;
    if(typeof val==='object'&&val!==null&&!Array.isArray(val))return null;
    return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be string or object, got ${typeof val}`};
  }
  if(t==='boolean'&&typeof val!=='boolean'){
    return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be boolean, got ${typeof val}`};
  }
  if(t==='number'){
    if(typeof val!=='number'||!Number.isFinite(val)){
      return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be finite number, got ${val}`};
    }
    if(Number.isFinite(spec.min)&&val<spec.min){
      return {code:'PARAM_OUT_OF_RANGE',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" (${val}) is below min ${spec.min}`};
    }
    if(Number.isFinite(spec.max)&&val>spec.max){
      return {code:'PARAM_OUT_OF_RANGE',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" (${val}) exceeds max ${spec.max}`};
    }
  }
  if(t==='string'){
    if(typeof val!=='string'){
      return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be string, got ${typeof val}`};
    }
    if(spec.pattern&&!(new RegExp(spec.pattern).test(val))){
      return {code:'INVALID_PARAM_PATTERN',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" ("${val}") does not match pattern ${spec.pattern}`};
    }
    if(Array.isArray(spec.values)&&!spec.values.includes(val)){
      const sug=didYouMean(val,spec.values);
      return {code:'INVALID_PARAM_ENUM',shot:shotId,field:`params.${paramName}`,suggestion:sug,message:`Shot ${shotId} (${template}): param "${paramName}" value "${val}" not in [${spec.values.join(', ')}]${sug?` (did you mean "${sug}"?)`:''}`};
    }
  }
  if(t==='enum'){
    const allowed=Array.isArray(spec.values)?spec.values:[];
    if(allowed.length&&!allowed.includes(val)){
      const sug=didYouMean(String(val),allowed);
      return {code:'INVALID_PARAM_ENUM',shot:shotId,field:`params.${paramName}`,suggestion:sug,message:`Shot ${shotId} (${template}): param "${paramName}" value "${val}" not in [${allowed.join(', ')}]${sug?` (did you mean "${sug}"?)`:''}`};
    }
  }
  if(t==='array'&&!Array.isArray(val)){
    return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be array, got ${typeof val}`};
  }
  if(t==='object'&&(typeof val!=='object'||val===null||Array.isArray(val))){
    return {code:'MISTYPED_PARAM',shot:shotId,field:`params.${paramName}`,message:`Shot ${shotId} (${template}): param "${paramName}" must be object`};
  }
  return null;
}

export function validateProject(projectRef){
  const dir=projectPath(projectRef);
  const slug=path.basename(dir);
  const errors=[];
  const warnings=[];

  const manifestFile=path.join(dir,'manifest.json');
  const configFile=path.join(dir,'config.json');
  if(!fs.existsSync(manifestFile)){
    errors.push({code:'MISSING_MANIFEST',message:'manifest.json is missing'});
    return {valid:false,status:'fail',project:slug,errors,warnings};
  }
  if(!fs.existsSync(configFile)){
    errors.push({code:'MISSING_CONFIG',message:'config.json is missing'});
    return {valid:false,status:'fail',project:slug,errors,warnings};
  }

  const manifest=readJSON(manifestFile);
  const config=readJSON(configFile);
  const templateMeta=getTemplateMeta();
  const validTemplates= [...new Set([...TEMPLATE_NAMES,...Object.keys(templateMeta)])];
  const validSfx=getValidSfx();
  const validAmbience=getValidAmbience();
  const validEmotions=getValidEmotions();
  const validStyles=Object.keys(STYLES);
  const validRigs=avatarRigChoices.includes('silhouette')?avatarRigChoices:[...avatarRigChoices,'silhouette'];

  if(config.aspect!=='9:16'){
    errors.push({code:'INVALID_ASPECT',field:'config.aspect',message:`Config aspect must be "9:16", got "${config.aspect}"`});
  }
  if(!validStyles.includes(config.style)){
    const sug=didYouMean(config.style,validStyles);
    errors.push({code:'UNKNOWN_STYLE',field:'config.style',suggestion:sug,message:`Unknown style "${config.style}"${sug?` (did you mean "${sug}"?)`:''}`});
  }
  if(!validRigs.includes(config.rig)){
    const sug=didYouMean(config.rig,validRigs);
    errors.push({code:'UNKNOWN_RIG',field:'config.rig',suggestion:sug,message:`Unknown rig "${config.rig}"${sug?` (did you mean "${sug}"?)`:''}`});
  }

  // Validate dialogue.json emotions if present
  const dialogueFile=path.join(dir,'dialogue.json');
  if(fs.existsSync(dialogueFile)){
    try{
      const dlg=readJSON(dialogueFile);
      const seenIds=new Set();
      for(let i=0;i<(dlg.lines||[]).length;i++){
        const ln=dlg.lines[i];
        const lid=ln.id||('l'+(i+1));
        if(ln.id){
          if(seenIds.has(ln.id)){
            errors.push({code:'DUPLICATE_LINE_ID',line:ln.id,message:`Duplicate dialogue line id "${ln.id}"`});
          }
          seenIds.add(ln.id);
        }
        const spokenVal=ln.spoken??ln.text;
        if(!spokenVal||!String(spokenVal).trim()){
          errors.push({code:'EMPTY_LINE_TEXT',line:lid,message:`Dialogue line "${lid}" has empty spoken/text`});
        }
        if(ln.display!==undefined&&(typeof ln.display!=='string'||!ln.display.trim())){
          errors.push({code:'INVALID_DISPLAY_TEXT',line:lid,field:'display',message:`Dialogue line "${lid}" display must be a non-empty string`});
        }
        if(ln.emotion!==undefined&&!validEmotions.includes(ln.emotion)){
          const sug=didYouMean(ln.emotion,validEmotions);
          errors.push({
            code:'UNKNOWN_EMOTION',
            line:lid,
            field:'emotion',
            value:ln.emotion,
            suggestion:sug,
            message:`Unknown emotion "${ln.emotion}" in dialogue line "${lid}"${sug?` (did you mean "${sug}"?)`:''}`
          });
        }
      }
    }catch(e){
      errors.push({code:'INVALID_DIALOGUE_JSON',message:`Failed to parse dialogue.json: ${e.message}`});
    }
  }

  if(!Array.isArray(manifest.shots)||!manifest.shots.length){
    errors.push({code:'EMPTY_MANIFEST',message:'manifest.shots must be a non-empty array'});
    return {valid:false,status:'fail',project:slug,errors,warnings};
  }

  const lineSource=resolveLineSource(dir);
  let resolvedShots=[];
  try{
    resolvedShots=resolveProjectShots(manifest.shots,lineSource,config);
  }catch(e){
    errors.push({code:'LINE_RESOLUTION_ERROR',message:e.message});
    resolvedShots=manifest.shots.map((s,i)=>({...s,start:Number(s.start)||i,duration:Number(s.duration)||1}));
  }

  for(let i=0;i<resolvedShots.length;i++){
    const shot=resolvedShots[i];
    const sid=shot.id||('shot_'+i);

    // 1. Template check
    if(shot.recipe){
      try{normalizeRecipe(shot.recipe);}catch(e){errors.push({code:'INVALID_RECIPE',shot:sid,message:e.message});}
    }else if(!validTemplates.includes(shot.template)){
      const sug=didYouMean(shot.template,validTemplates);
      errors.push({
        code:'UNKNOWN_TEMPLATE',
        shot:sid,
        field:'template',
        value:shot.template,
        suggestion:sug,
        message:`Unknown template "${shot.template}" in shot ${sid}${sug?` (did you mean "${sug}"?)`:''}`
      });
    }else{
      // 2. Template params check per TEMPLATE_META
      const meta=templateMeta[shot.template];
      const paramSchema=meta?.params||{};
      const allowedParamKeys=Object.keys(paramSchema);
      const shotParams=shot.params||{};
      if(typeof shotParams!=='object'||Array.isArray(shotParams)){
        errors.push({code:'MISTYPED_PARAMS',shot:sid,field:'params',message:`Shot ${sid}: params must be an object`});
      }else{
        for(const [pk,pv] of Object.entries(shotParams)){
          if(!(pk in paramSchema)){
            const sug=didYouMean(pk,allowedParamKeys);
            errors.push({
              code:'UNKNOWN_PARAM',
              shot:sid,
              field:`params.${pk}`,
              value:pv,
              suggestion:sug,
              message:`Unknown param "${pk}" on template "${shot.template}" in shot ${sid}${sug?` (did you mean "${sug}"?)`:''}`
            });
          }else{
            const paramErr=checkParamValue(sid,shot.template,pk,pv,paramSchema[pk]);
            if(paramErr)errors.push(paramErr);
          }
        }
        // Placement validator for window-view exterior actor
        if(shot.template==='window-view'&&shotParams.interior!==false){
          const w=Number(config.width)||720;
          const h=Number(config.height)||1280;
          const layout=computeWindowLayout(w,h,{girl:shotParams.girl??true});
          if(layout.girl?.visible){
            if(layout.girl.y>layout.pane.sillTopY-2||layout.girl.y<layout.pane.y+layout.pane.h*0.50){
              errors.push({
                code:'WINDOW_PLACEMENT_FEET',
                shot:sid,
                field:'params.girl',
                message:`Shot ${sid} (window-view): actor feet (y=${layout.girl.y.toFixed(1)}) lie outside valid yard/sill region [${(layout.pane.y+layout.pane.h*0.50).toFixed(1)}, ${(layout.pane.sillTopY-2).toFixed(1)}]`
              });
            }
            if(layout.girl.height>layout.pane.h*0.60){
              errors.push({
                code:'WINDOW_PLACEMENT_HEIGHT',
                shot:sid,
                field:'params.girl',
                message:`Shot ${sid} (window-view): actor height (${layout.girl.height.toFixed(1)}) exceeds 60% of window height (${(layout.pane.h*0.60).toFixed(1)})`
              });
            }
          }
        }
      }
    }

    // 3. Camera & Transition checks
    if(shot.camera!==undefined&&!CAMERA_MOVES.includes(shot.camera)){
      const sug=didYouMean(shot.camera,CAMERA_MOVES);
      errors.push({
        code:'UNKNOWN_CAMERA',
        shot:sid,
        field:'camera',
        value:shot.camera,
        suggestion:sug,
        message:`Unknown camera move "${shot.camera}" in shot ${sid}${sug?` (did you mean "${sug}"?)`:''}`
      });
    }
    const validTransitions=Array.isArray(TRANSITIONS)?TRANSITIONS:['cut','dip','flash','blink'];
    if(shot.transition!==undefined&&!validTransitions.includes(shot.transition)){
      const sug=didYouMean(shot.transition,validTransitions);
      errors.push({
        code:'UNKNOWN_TRANSITION',
        shot:sid,
        field:'transition',
        value:shot.transition,
        suggestion:sug,
        message:`Unknown transition "${shot.transition}" in shot ${sid}${sug?` (did you mean "${sug}"?)`:''}`
      });
    }
    if(shot.transitionDuration!==undefined&&(typeof shot.transitionDuration!=='number'||!Number.isFinite(shot.transitionDuration)||shot.transitionDuration<=0||shot.transitionDuration>5)){
      errors.push({
        code:'INVALID_TRANSITION_DURATION',
        shot:sid,
        field:'transitionDuration',
        value:shot.transitionDuration,
        message:`Shot ${sid}: transitionDuration must be a number in (0, 5], got ${shot.transitionDuration}`
      });
    }

    // 4. SFX & Ambience check
    if(shot.sfx!==undefined){
      if(!Array.isArray(shot.sfx)){
        errors.push({code:'MISTYPED_SFX',shot:sid,field:'sfx',message:`Shot ${sid}: sfx must be an array`});
      }else{
        for(const cue of shot.sfx){
          if(!cue||!validSfx.includes(cue.type)){
            const sug=didYouMean(cue?.type,validSfx);
            errors.push({
              code:'UNKNOWN_SFX',
              shot:sid,
              field:'sfx',
              value:cue?.type,
              suggestion:sug,
              message:`Unknown sfx type "${cue?.type}" in shot ${sid}${sug?` (did you mean "${sug}"?)`:''}`
            });
          }
        }
      }
    }
    if(shot.ambience!==undefined&&shot.ambience!==null&&!validAmbience.includes(shot.ambience)){
      const sug=didYouMean(shot.ambience,validAmbience);
      errors.push({
        code:'UNKNOWN_AMBIENCE',
        shot:sid,
        field:'ambience',
        value:shot.ambience,
        suggestion:sug,
        message:`Unknown ambience "${shot.ambience}" in shot ${sid}${sug?` (did you mean "${sug}"?)`:''}`
      });
    }
    if(shot.cues!==undefined){
      const validCueActions=['blink','pulse','flash','shake','clock-set','sfx'];
      if(!Array.isArray(shot.cues)){
        errors.push({code:'MISTYPED_CUES',shot:sid,field:'cues',message:`Shot ${sid}: cues must be an array`});
      }else{
        for(const c of shot.cues){
          if(!c||typeof c!=='object'){
            errors.push({code:'INVALID_CUE',shot:sid,field:'cues',message:`Shot ${sid}: each cue must be an object`});
            continue;
          }
          const act=c.action||(c.sfx?'sfx':null);
          if(!act||!validCueActions.includes(act)){
            const sug=didYouMean(act,validCueActions);
            errors.push({code:'UNKNOWN_CUE_ACTION',shot:sid,field:'cues',value:act,suggestion:sug,message:`Unknown cue action "${act}" in shot ${sid}`});
          }
          if(c.at_word!==undefined&&(typeof c.at_word!=='string'||!c.at_word.trim())){
            errors.push({code:'INVALID_CUE_WORD',shot:sid,field:'cues.at_word',message:`Shot ${sid}: cue at_word must be a non-empty string`});
          }
          if((act==='sfx'||c.sfx)&&!validSfx.includes(c.sfx||c.type)){
            errors.push({code:'UNKNOWN_SFX',shot:sid,field:'cues.sfx',value:c.sfx||c.type,message:`Unknown cue sfx "${c.sfx||c.type}" in shot ${sid}`});
          }
        }
      }
    }

    // 5. Timing & duration checks
    if(!Number.isFinite(shot.start)||!Number.isFinite(shot.duration)||shot.duration<=0||shot.duration>30){
      errors.push({
        code:'INVALID_SHOT_TIME',
        shot:sid,
        message:`Invalid start/duration (${shot.start}/${shot.duration}) in shot ${sid}`
      });
    }else{
      if(shot.duration<0.5){
        warnings.push({
          code:'SHOT_TOO_SHORT',
          shot:sid,
          duration:shot.duration,
          message:`Shot ${sid} duration (${shot.duration}s) is shorter than 0.5s`
        });
      }else if(shot.duration>4.0){
        warnings.push({
          code:'SHOT_TOO_LONG',
          shot:sid,
          duration:shot.duration,
          message:`Shot ${sid} duration (${shot.duration}s) is longer than 4.0s`
        });
      }
    }

    if(i===0&&Math.abs(shot.start)>0.02){
      errors.push({
        code:'INITIAL_GAP',
        shot:sid,
        message:`First shot ${sid} must start at 0, got ${shot.start}s`
      });
    }
    if(i>0){
      const prev=resolvedShots[i-1];
      const prevEnd=prev.start+prev.duration;
      const diff=shot.start-prevEnd;
      if(diff<-0.02){
        errors.push({
          code:'SHOT_OVERLAP',
          shot:sid,
          message:`Overlapping shots: ${prev.id} ends at ${prevEnd.toFixed(3)}s, ${sid} starts at ${shot.start.toFixed(3)}s`
        });
      }else if(diff>0.02){
        errors.push({
          code:'SHOT_GAP',
          shot:sid,
          message:`Gap of ${diff.toFixed(3)}s between ${prev.id} (ends ${prevEnd.toFixed(3)}s) and ${sid} (starts ${shot.start.toFixed(3)}s)`
        });
      }
    }
  }

  const totalDuration=resolvedShots.length?+Math.max(...resolvedShots.map(s=>s.start+s.duration)).toFixed(3):0;

  // 6. Caption words check
  const wordsFile=path.join(dir,'timeline','words.json');
  if(fs.existsSync(wordsFile)){
    try{
      const wordsData=readJSON(wordsFile);
      const words=Array.isArray(wordsData.words)?wordsData.words:[];
      for(const w of words){
        const wc=String(w.text||'').trim().split(/\s+/).filter(Boolean).length;
        if(wc>2){
          errors.push({
            code:'CAPTION_WORDS_EXCEEDED',
            text:w.text,
            words:wc,
            message:`Caption "${w.text}" has ${wc} words (maximum allowed is 2)`
          });
        }
        if(!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<0||w.start>=w.end){
          errors.push({
            code:'INVALID_CAPTION_SPAN',
            text:w.text,
            message:`Caption "${w.text}" has invalid span [${w.start}, ${w.end}]`
          });
        }else if(totalDuration>0&&w.end>totalDuration+0.25){
          errors.push({
            code:'CAPTION_EXCEEDS_DURATION',
            text:w.text,
            message:`Caption "${w.text}" ends at ${w.end}s beyond project duration ${totalDuration}s`
          });
        }
      }
      if(lineSource.lines&&lineSource.lines.length){
        const expectedTokens=[];
        for(const ln of lineSource.lines){
          const disp=String(ln.display??ln.text??ln.spoken??'').trim();
          const toks=disp.match(/[^\s]+/g)||[];
          expectedTokens.push(...toks);
        }
        const captionTokens=[];
        for(const w of words){
          const toks=String(w.text||'').trim().match(/[^\s]+/g)||[];
          captionTokens.push(...toks);
        }
        if(expectedTokens.length&&captionTokens.length&&expectedTokens.join(' ')!==captionTokens.join(' ')){
          errors.push({
            code:'CAPTION_DISPLAY_MISMATCH',
            message:`Captions (${captionTokens.length} words) do not cover every display word once (${expectedTokens.length} words)`
          });
        }
      }
    }catch(e){
      errors.push({code:'INVALID_WORDS_JSON',message:`Failed to parse timeline/words.json: ${e.message}`});
    }
  }

  // 7. Data-only check for this project
  const violations=enforceDataOnly().filter(v=>v.startsWith(path.relative(ROOT,dir)));
  for(const v of violations){
    errors.push({code:'CODE_IN_PROJECT',file:v,message:`Executable code file found in data-only project: ${v}`});
  }

  return {
    valid:errors.length===0,
    status:errors.length===0?'pass':'fail',
    project:slug,
    timing:lineSource.timing,
    shots:resolvedShots.length,
    duration:totalDuration,
    errors,
    warnings
  };
}
