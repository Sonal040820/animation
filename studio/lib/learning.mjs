// Durable, measured promotion of data-driven reusable assets, usage tracking, rule learning, and INDEX generation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {STUDIO,ROOT,sha,mkdir,readJSON} from './project.mjs';
import {TEMPLATE_NAMES} from './templates.mjs';
import {PLANNER_RULES_FILE,loadPlannerRules,matchShotRule} from './planner.mjs';
import {RECIPE_REGISTRIES} from './recipe.mjs';

const LIB=path.dirname(fileURLToPath(import.meta.url));
export const USAGE_FILE=path.join(LIB,'usage.json');

export const CLI_COMMANDS=Object.freeze([
  {command:'explain',args:'--project projects/<slug> --shot sNN [--at seconds]',summary:'Print normalized recipe, measured cue anchors and optional sampled frame'},
  {command:'recipe-new',args:'--preset window-view',summary:'Print recipe skeleton plus parameter schemas/defaults and timing annotations'},
  {command:'doctor',args:'[--force]',summary:'Capability check, version fingerprint, writes studio/environment.json'},
  {command:'smoke',args:'',summary:'Render one static low-res frame per template in parallel browser pool'},
  {command:'check',args:'',summary:'Enforce data-only rule across studio projects (reject unpromoted code)'},
  {command:'plan',args:'--project projects/<slug> [--force]',summary:'Generate dialogue.json v2 and line-bound manifest.json from script.txt via planner-rules.json'},
  {command:'validate',args:'--project projects/<slug>',summary:'Validate manifest templates, params (TEMPLATE_META), camera, sfx/ambience, emotions, overlaps/gaps, captions'},
  {command:'index',args:'[--check]',summary:'Regenerate or check drift of AUTO section in studio/INDEX.md from live code'},
  {command:'new-project',args:'--project projects/<slug> --script "..." [--seconds N]',summary:'Create starter data-only project'},
  {command:'make-voice',args:'--project projects/<slug>',summary:'Synthesize expressive voice.wav and measured timeline/lines.json'},
  {command:'align',args:'--project projects/<slug>',summary:'Align 1-2 word sentence-bound captions into timeline/words.json (uses measured lines.json when present)'},
  {command:'sheet',args:'--project projects/<slug> [--quality draft]',summary:'Validate and render labelled contact sheet (shot id + template + time)'},
  {command:'render',args:'--project projects/<slug> [--quality draft|preview|standard|high]',summary:'Validate and render frames in parallel page pool with engine-hash cache and render-log.jsonl'},
  {command:'mix',args:'--project projects/<slug>',summary:'Synthesize original score/ambience/SFX, duck under voice, loudnorm to -14 LUFS, write audio-report.json'},
  {command:'verify',args:'--project projects/<slug> [--quality standard] [--allow-silent]',summary:'Probe final.mp4, verify voice/captions/loudness/black/freeze, write measured facts.json'},
  {command:'golden',args:'[--project projects/golden-1159]',summary:'Validate, render contact sheet, and check all Phase 1 golden acceptance criteria against measured artifacts'},
  {command:'promote',args:'--project projects/<slug>',summary:'Increment usage.json, learn rules into planner-rules.json, regenerate INDEX.md, log measured COST/LESSONS/STATUS'}
]);

const permitted=/^[a-zA-Z0-9._/-]+$/;
function samePath(root,entry){
  if(!permitted.test(entry)||path.isAbsolute(entry))throw new Error('Invalid reusable asset path');
  const target=path.resolve(root,entry);
  if(!target.startsWith(root+path.sep))throw new Error('Asset must stay inside project');
  return target;
}

function promoteAsset(project,record){
  if(!record||typeof record!=='object')throw new Error('Promotion record missing');
  if(record.original!==true)throw new Error('Refusing to promote asset without original-authored declaration');
  if(!record.reusable)throw new Error('Asset is not marked reusable');
  const relative=record.asset;
  if(!relative.startsWith('assets/')||!/\.(json|svg|txt|wav)$/i.test(relative))
    throw new Error('Only original data/media assets under assets/ can be promoted');
  const source=samePath(project.dir,relative);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile())throw new Error('Promotion source missing');
  if(!/^[a-z0-9-]{3,60}$/.test(record.name))throw new Error('Invalid promotion name');
  const target=path.join(STUDIO,'lib','assets',record.name+path.extname(relative));
  mkdir(path.dirname(target));
  if(fs.existsSync(target)){
    if(sha(fs.readFileSync(source))!==sha(fs.readFileSync(target)))
      throw new Error('Existing library asset differs; rename instead of overwriting');
    return {name:record.name,existing:true};
  }
  fs.copyFileSync(source,target);
  return {name:record.name,existing:false};
}

const STOPWORDS=new Set([
  'the','and','that','this','with','from','were','have','said','into','right','over','then','when','what','they',
  'there','where','their','about','would','could','should','outside','inside','little','just','more','some','very'
]);

function deriveRegexPattern(text){
  const words=String(text||'')
    .toLowerCase()
    .replace(/[^a-z0-9:\s]/g,' ')
    .split(/\s+/)
    .filter(w=>w.length>=3&&!STOPWORDS.has(w));
  if(!words.length)return null;
  const picked=words.slice(0,3).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return '\\b('+picked.join('.*')+')\\b';
}

export function learnPlannerRules(project){
  const slug=path.basename(project.dir);
  const rules=loadPlannerRules();
  const shotRules=Array.isArray(rules.shot_rules)?rules.shot_rules:[];
  const lineMap=new Map((project.lines||[]).map(l=>[l.id,l.text]));
  const learned=[];

  for(const shot of project.manifest.shots||[]){
    const lineIds=Array.isArray(shot.lines)&&shot.lines.length?shot.lines:(shot.line?[shot.line]:[]);
    const text=lineIds.map(id=>lineMap.get(id)||'').join(' ').trim();
    if(!text)continue;
    const matched=matchShotRule(text,rules);
    if(matched.matched&&matched.rule.template===shot.template)continue;
    const pattern=deriveRegexPattern(text);
    if(!pattern)continue;
    const exists=shotRules.some(r=>r.pattern===pattern&&r.template===shot.template);
    if(exists)continue;
    const newRule={
      id:`learned-${slug}-${shot.id}`,
      pattern,
      flags:'i',
      template:shot.template,
      camera:shot.camera||'push',
      cameraIntensity:Number.isFinite(Number(shot.cameraIntensity))?Number(shot.cameraIntensity):1.0,
      params:shot.params||{},
      sfx:Array.isArray(shot.sfx)?shot.sfx:[]
    };
    if(shot.ambience)newRule.ambience=shot.ambience;
    if(Number.isFinite(Number(shot.fadeOut)))newRule.fadeOut=Number(shot.fadeOut);
    shotRules.push(newRule);
    learned.push(newRule.id);
  }
  if(learned.length>0){
    rules.shot_rules=shotRules;
    fs.writeFileSync(PLANNER_RULES_FILE,JSON.stringify(rules,null,2)+'\n');
  }
  return learned;
}

export function updateTemplateUsage(project){
  const slug=path.basename(project.dir);
  const usage=fs.existsSync(USAGE_FILE)
    ?readJSON(USAGE_FILE)
    :{schema_version:1,projects_promoted:[],templates:{},updated_at:null};
  usage.templates=usage.templates||{};
  usage.projects_promoted=Array.isArray(usage.projects_promoted)?usage.projects_promoted:[];
  for(const shot of project.manifest.shots||[]){
    usage.templates[shot.template]=(usage.templates[shot.template]||0)+1;
  }
  if(!usage.projects_promoted.includes(slug))usage.projects_promoted.push(slug);
  usage.updated_at=new Date().toISOString();
  fs.writeFileSync(USAGE_FILE,JSON.stringify(usage,null,2)+'\n');
  return usage;
}

export async function buildAutoIndexSection(){
  const libFiles=fs.readdirSync(LIB,{withFileTypes:true})
    .filter(e=>e.isFile()&&e.name.endsWith('.mjs'))
    .map(e=>e.name)
    .sort();
  const moduleRows=[];
  let templateMeta={};
  for(const file of libFiles){
    try{
      const mod=await import(pathToFileURL(path.join(LIB,file)).href);
      const exportsList=Object.keys(mod).sort();
      moduleRows.push(`| \`studio/lib/${file}\` | ${exportsList.map(k=>`\`${k}\``).join(', ')||'_(none)_'} |`);
      if(file==='template-meta.mjs'&&mod.TEMPLATE_META){
        templateMeta=mod.TEMPLATE_META;
      }
    }catch{
      moduleRows.push(`| \`studio/lib/${file}\` | _(pending)_ |`);
    }
  }
  const usage=fs.existsSync(USAGE_FILE)?readJSON(USAGE_FILE).templates||{}:{};
  const allTemplates=[...new Set([...TEMPLATE_NAMES,...Object.keys(templateMeta)])];
  const templateRows=allTemplates.map(name=>{
    const meta=templateMeta[name]||{};
    const summary=meta.summary||'Reusable Canvas2D/3D studio template';
    const paramsObj=meta.params||{};
    const paramDesc=Object.entries(paramsObj).map(([k,v])=>{
      if(v.type==='enum'&&Array.isArray(v.values))return `${k}:enum(${v.values.join('|')})`;
      return `${k}:${v.type||'any'}`;
    }).join(', ')||'none';
    const example=meta.example?JSON.stringify(meta.example):'{}';
    const count=usage[name]||0;
    return `| \`${name}\` | ${summary} | \`${paramDesc}\` | \`${example}\` | ${count} |`;
  });

  const cliRows=CLI_COMMANDS.map(c=>`| \`${c.command}\` | \`${c.args||'—'}\` | ${c.summary} |`);

  return [
    '<!-- AUTO:BEGIN -->',
    '## Auto-Generated Engine Reference (do not hand-edit inside AUTO markers)',
    '',
    '### CLI Commands (`node studio/cli/studio.mjs <command>`)',
    '',
    '| Command | Arguments | Summary |',
    '|---|---|---|',
    ...cliRows,
    '',
    '### Library Module Exports (`studio/lib/*.mjs`)',
    '',
    '| Module | Exported Symbols |',
    '|---|---|',
    ...moduleRows,
    '',
    '### Template Registry (`TEMPLATE_META` & `usage.json`)',
    '',
    '| Template | Summary | Params Schema | Example | Used |',
    '|---|---|---|---|---:|',
    ...templateRows,
    '',
    '### Recipe registries (generated from validation metadata)',
    '',
    '| Registry | ID | Params and defaults | Example |',
    '|---|---|---|---|',
    ...Object.entries(RECIPE_REGISTRIES).flatMap(([kind,registry])=>Object.entries(registry).map(([id,entry])=>`| ${kind} | ${id} | ${JSON.stringify(entry.defaults)} | ${JSON.stringify(entry.example)} |`)),
    '<!-- AUTO:END -->'
  ].join('\n');
}

export async function syncIndex({check=false}={}){
  const indexFile=path.join(STUDIO,'INDEX.md');
  const current=fs.existsSync(indexFile)?fs.readFileSync(indexFile,'utf8').replace(/\r\n/g,'\n'):'# Studio index — search before writing code\n';
  const autoBlock=await buildAutoIndexSection();
  let nextContent;
  const beginTag='<!-- AUTO:BEGIN -->';
  const endTag='<!-- AUTO:END -->';
  const bIdx=current.indexOf(beginTag);
  const eIdx=current.indexOf(endTag);
  if(bIdx!==-1&&eIdx!==-1&&eIdx>bIdx){
    nextContent=current.slice(0,bIdx)+autoBlock+current.slice(eIdx+endTag.length);
  }else{
    nextContent=current.trimEnd()+'\n\n'+autoBlock+'\n';
  }
  const drift=current!==nextContent;
  if(check){
    return {ok:!drift,drift,file:path.relative(ROOT,indexFile)};
  }
  fs.writeFileSync(indexFile,nextContent);
  return {ok:true,drift:false,updated:drift,file:path.relative(ROOT,indexFile)};
}

function computePlanningStats(project){
  const shots=project.manifest.shots||[];
  if(!shots.length)return {autoShots:0,handEditedShots:0,autoPercent:0};
  const planReportFile=path.join(project.dir,'timeline','plan-report.json');
  if(fs.existsSync(planReportFile)){
    try{
      const pr=readJSON(planReportFile);
      const planned=Array.isArray(pr.planned_shots)?pr.planned_shots:[];
      let autoCount=0;
      for(let i=0;i<shots.length;i++){
        const s=shots[i];
        const p=planned.find(x=>x.id===s.id)||planned[i];
        if(p&&p.template===s.template&&JSON.stringify(p.params||{})===JSON.stringify(s.params||{})){
          autoCount++;
        }
      }
      const autoPercent=Math.round(100*autoCount/shots.length);
      return {autoShots:autoCount,handEditedShots:shots.length-autoCount,autoPercent};
    }catch{}
  }
  const rules=loadPlannerRules();
  const lineMap=new Map((project.lines||[]).map(l=>[l.id,l.text]));
  let autoCount=0;
  for(const s of shots){
    const ids=Array.isArray(s.lines)&&s.lines.length?s.lines:(s.line?[s.line]:[]);
    const text=ids.map(id=>lineMap.get(id)||'').join(' ').trim();
    if(text){
      const m=matchShotRule(text,rules);
      if(m.matched&&m.rule.template===s.template)autoCount++;
    }
  }
  const autoPercent=Math.round(100*autoCount/shots.length);
  return {autoShots:autoCount,handEditedShots:shots.length-autoCount,autoPercent};
}

export async function promoteVideo(project,options={}){
  const out=project.out,slug=path.basename(project.dir);
  const film=path.join(out,'final.mp4'),verify=path.join(out,'verification.json');
  const statsFile=path.join(out,'render-stats.json');
  const factsFile=path.join(out,'facts.json');
  if(!fs.existsSync(film)||!fs.existsSync(verify)||!fs.existsSync(statsFile))
    throw new Error('Promote requires verified final film and measured render stats');
  const verification=JSON.parse(fs.readFileSync(verify,'utf8'));
  if(verification.status!=='pass')throw new Error('Refusing unverified promotion');
  const stats=JSON.parse(fs.readFileSync(statsFile,'utf8'));
  const facts=fs.existsSync(factsFile)?readJSON(factsFile):null;
  const linesFile=path.join(project.dir,'timeline','lines.json');
  const linesJson=fs.existsSync(linesFile)?readJSON(linesFile):null;
  const voiceProvider=facts?.voice_provider||linesJson?.provider||(verification.voice_present?'kokoro-onnx':'none');

  const shots=project.manifest.shots||[];
  const reused=shots.filter(s=>TEMPLATE_NAMES.includes(s.template)).length;
  const ratio=Math.round(100*reused/shots.length);
  const cached=(stats.stats||[]).filter(s=>s.reused===s.frames).length;
  const secs=Number(stats.totalRenderSeconds);
  if(!Number.isFinite(secs)||secs<0)throw new Error('Render seconds unavailable');

  const planStats=computePlanningStats(project);
  const fingerprint=sha(JSON.stringify({manifest:project.manifest,config:project.config,
    promotions:project.manifest.promotions||[],voiceProvider}));
  const marker=path.join(out,'promotion.json');
  if(fs.existsSync(marker)&&JSON.parse(fs.readFileSync(marker,'utf8')).fingerprint===fingerprint){
    await syncIndex({check:false});
    return {promoted:true,reused:true,ratio,autoPercent:planStats.autoPercent,seconds:secs,cached,voiceProvider};
  }

  const indexAdditions=[];
  for(const record of project.manifest.promotions||[])
    indexAdditions.push(promoteAsset(project,record));

  const usage=updateTemplateUsage(project);
  const learnedRules=learnPlannerRules(project);
  await syncIndex({check:false});

  const costFile=path.join(STUDIO,'COST.md');
  const history=fs.readFileSync(costFile,'utf8').split('\n').filter(x=>x.startsWith('| ')&&!x.includes('Video |')&&!x.includes('Setup only'));
  let comparison='First measured production run';
  if(history.length){
    const last=history.at(-1).split('|').map(x=>x.trim());
    const oldPercent=Number((last[3]||'').replace('%',''));
    const oldSeconds=Number(last[4]);
    if(Number.isFinite(oldPercent)&&Number.isFinite(oldSeconds)){
      comparison='Previous reuse '+oldPercent+'% => '+ratio+'%; render seconds '+oldSeconds+' => '+secs.toFixed(1);
    }
  }
  const plannedCol=`${planStats.autoPercent}% auto (${planStats.autoShots}/${shots.length}) / ${100-planStats.autoPercent}% hand-edited`;
  fs.appendFileSync(costFile,`\n| ${slug} | ${shots.length} | ${ratio}% | ${plannedCol} | ${secs.toFixed(1)} | ${cached} | ${voiceProvider} |\n`);

  const lesson=`- ${new Date().toISOString()} / ${slug}: verified ${shots.length} shots, ${ratio}% template reuse, ${plannedCol}, ${secs.toFixed(1)} render seconds, ${cached} fully cached shots, voice=${voiceProvider}; ${comparison}.\n`;
  const lessonsFile=path.join(STUDIO,'LESSONS.md');
  const lessons=fs.readFileSync(lessonsFile,'utf8');
  const newline=lessons.indexOf('\n');
  fs.writeFileSync(lessonsFile,lessons.slice(0,newline+1)+'\n'+lesson+lessons.slice(newline+1));
  fs.appendFileSync(path.join(STUDIO,'STATUS.md'),`\n- ${new Date().toISOString()}: ${slug} promoted with ${ratio}% template reuse (${plannedCol}), ${secs.toFixed(1)}s, voice=${voiceProvider}; ${comparison}.\n`);

  const result={
    promoted:true,
    reused:false,
    shots:shots.length,
    ratio,
    plannedAutoPercent:planStats.autoPercent,
    plannedAutoShots:planStats.autoShots,
    handEditedShots:planStats.handEditedShots,
    seconds:secs,
    cached,
    voiceProvider,
    learnedRules,
    templateUsage:usage.templates,
    comparison,
    indexAdditions,
    fingerprint
  };
  fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n');
  return result;
}
