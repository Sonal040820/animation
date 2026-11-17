#!/usr/bin/env node
// Deterministic stage commands. No engine code is generated into project folders.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT,STUDIO,sha,readJSON,mkdir,projectPath,loadProject,enforceDataOnly,findWordTimestamp} from '../lib/project.mjs';
import {browserExecutable,pythonExecutable,withBrowser,invoke,smoke,sheet,render,dimensions} from '../lib/runner.mjs';
import {phrases,saveWords,alignDialogue,alignMeasured} from '../lib/timing.mjs';
import {mix} from '../lib/audio.mjs';
import {verifyFilm} from '../lib/quality.mjs';
import {promoteVideo,syncIndex} from '../lib/learning.mjs';
import {validateProject} from '../lib/validate.mjs';
import {planProject} from '../lib/planner.mjs';
import {computeWindowLayout} from '../lib/scenery.mjs';
import {TEMPLATE_NAMES} from '../lib/templates.mjs';
import {presetRecipe,PRESETS} from '../lib/presets.mjs';
import {normalizeRecipe,resolveRecipe} from '../lib/recipe.mjs';
import {promoteRegistry} from '../lib/registry-promotion.mjs';
import {assetCatalog,inspectAsset,assetRecipe} from '../lib/assets.mjs';
import {verifyVisual} from '../lib/visual-check.mjs';

const argv=process.argv.slice(2),command=argv.shift();
const opts={};
for(let i=0;i<argv.length;i++){
  if(argv[i].startsWith('--')){
    const key=argv[i].slice(2);
    opts[key]=(argv[i+1]&&!argv[i+1].startsWith('--'))?argv[++i]:true;
  }
}
const projectArg=opts.project||opts.path;
const quality=String(opts.quality||'preview');
function output(v){process.stdout.write(JSON.stringify(v,null,2)+'\n')}
function version(file,args=['--version']){
  try{return execFileSync(file,args,{encoding:'utf8',timeout:10000}).split('\n')[0].trim()}
  catch{return 'missing'}
}

async function doctor(){
  const pkg=readJSON(path.join(STUDIO,'package.json'));
  const versionNode=process.version;
  const pythonBin=pythonExecutable();
  const pythonVer=version(pythonBin,['--version']);
  const ffmpeg=version('ffmpeg',['-version']);
  const ffprobe=version('ffprobe',['-version']);
  const browserPath=browserExecutable();
  const browserBinVersion=version(browserPath,['--version']);
  const fingerprint=sha(JSON.stringify({
    node:versionNode,
    platform:process.platform,
    arch:process.arch,
    pythonBin,
    python:pythonVer,
    playwright:pkg.dependencies.playwright,
    three:pkg.dependencies.three,
    ffmpeg,
    ffprobe,
    browserBinVersion
  }));
  const file=path.join(STUDIO,'environment.json');
  if(fs.existsSync(file)){
    const prev=readJSON(file);
    if(prev.status==='verified'&&prev.fingerprint===fingerprint&&opts.force!==true){
      output({...prev,reused:true});return;
    }
  }
  const checks=await withBrowser(async page=>{
    return await page.evaluate(()=>{
      const el=document.createElement('canvas');el.width=16;el.height=16;
      const c=el.getContext('2d');if(!c)throw new Error('Canvas2D missing');
      c.fillStyle='#f00';c.fillRect(0,0,16,16);
      const gl=document.createElement('canvas').getContext('webgl2');
      const webgl2=Boolean(gl);gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return {canvas2d:c.getImageData(1,1,1,1).data[0]===255,webgl2,offscreenCanvas:typeof OffscreenCanvas==='function'};
    });
  });
  if(!checks.canvas2d||!checks.webgl2||ffmpeg==='missing'||ffprobe==='missing')throw new Error('Required Path A renderer capability missing (Canvas2D, WebGL2, FFmpeg)');
  const env={
    schema_version:1,
    status:'verified',
    fingerprint,
    platform:process.platform,
    arch:process.arch,
    node:versionNode,
    pythonExecutable:pythonBin,
    python:pythonVer,
    ffmpeg,
    ffprobe,
    playwright:pkg.dependencies.playwright,
    chromium:browserBinVersion,
    browserSource:browserPath.includes('ms-playwright')?'playwright-pinned':'preinstalled',
    browserOverrideBoolean:Boolean(process.env.CHROMIUM_PATH),
    checks,
    renderer:'Three.js+Canvas2D+Chromium+ffmpeg',
    voice:'optional Kokoro ONNX; models not downloaded during setup',
    checked_at:new Date().toISOString()
  };
  mkdir(path.dirname(file));fs.writeFileSync(file,JSON.stringify(env,null,2)+'\n');
  output(env);
}

function newProject(){
  const dir=projectPath(projectArg);
  if(fs.existsSync(dir))throw new Error('Project exists; refusing to overwrite');
  const text=opts.script?String(opts.script):opts['script-file']?fs.readFileSync(String(opts['script-file']),'utf8'):'';
  if(!text.trim())throw new Error('Supply --script or --script-file');
  mkdir(dir);mkdir(path.join(dir,'assets'));mkdir(path.join(dir,'timeline'));
  fs.writeFileSync(path.join(dir,'script.txt'),text.trim()+'\n');
  const parts=phrases(text),seconds=Number(opts.seconds||Math.max(6,Math.min(30,parts.length*1.6)));
  if(seconds<6||seconds>30)throw new Error('Duration must be 6..30 seconds');
  let cursor=0;const shots=parts.map((p,i)=>{
    const duration=i===parts.length-1?seconds-cursor:seconds/parts.length;
    const obj={id:'shot-'+String(i+1).padStart(2,'0'),
      start:+cursor.toFixed(3),duration:+duration.toFixed(3),camera:'static',cameraIntensity:0,
      recipe:{set:{preset:'three-room',params:{open:0}},actors:[{id:'lead',rig:'silhouette',appearance:'traveler',pos:{x:.4,depth:.65},expression:'neutral'}]}};
    cursor+=duration;return obj;
  });
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schema_version:2,slug:path.basename(dir),shots},null,2)+'\n');
  fs.writeFileSync(path.join(dir,'config.json'),JSON.stringify({schema_version:1,pipeline:'A',aspect:'9:16',studio:'original-short-video-studio',
    resolution:'720p',fps:24,style:opts.style||'midnight',rig:'silhouette'},null,2)+'\n');
  output({created:path.relative(ROOT,dir),shots:shots.length,rendered:false});
}

function project(){const p=loadProject(projectArg);return {...p,out:path.join(STUDIO,'out',path.basename(p.dir))}}

function align(){
  const p=loadProject(projectArg,{deferWordCues:true});
  const linesPath=path.join(p.dir,'timeline','lines.json');
  const dataPath=path.join(p.dir,'dialogue.json');
  mkdir(path.join(p.dir,'timeline'));

  if(fs.existsSync(linesPath)){
    const linesJson=readJSON(linesPath);
    const emphasisMap={};
    const displayMap={};
    if(fs.existsSync(dataPath)){
      const dlg=readJSON(dataPath);
      for(let i=0;i<(dlg.lines||[]).length;i++){
        const dl=dlg.lines[i];
        const lid=dl.id||('l'+(i+1));
        if(Array.isArray(dl.emphasis))emphasisMap[lid]=dl.emphasis;
        if(typeof dl.display==='string'&&dl.display.trim())displayMap[lid]=dl.display.trim();
      }
    }
    const mergedLinesJson={
      ...linesJson,
      lines:(linesJson.lines||[]).map(ln=>({
        ...ln,
        display:displayMap[ln.id]||ln.display||ln.text||ln.spoken
      }))
    };
    const result=alignMeasured(mergedLinesJson,{emphasis:emphasisMap});
    fs.writeFileSync(path.join(p.dir,'timeline','words.json'),JSON.stringify(result,null,2)+'\n');
    output({captions:result.words.length,method:result.method,duration:result.expected_duration});
    return;
  }

  const timingPath=path.join(p.dir,'timeline','phrases.json');
  const voice=fs.existsSync(timingPath)?readJSON(timingPath):null;
  const duration=voice?.duration||p.duration;
  if(fs.existsSync(dataPath)){
    const result=alignDialogue(readJSON(dataPath));
    fs.writeFileSync(path.join(p.dir,'timeline','words.json'),JSON.stringify(result,null,2)+'\n');
    output({captions:result.words.length,method:result.method,duration:result.expected_duration});
    return;
  }
  const script=fs.readFileSync(path.join(p.dir,'script.txt'),'utf8');
  const result=saveWords(p.dir,script,voice?.durations||null,duration);
  output({captions:result.words.length,method:result.method,duration});
}

function makeVoice(){
  const p=project();
  const py=pythonExecutable();
  const args=['studio/cli/voice.py','--project',path.relative(ROOT,p.dir),'--voice',String(opts.voice||p.config.voice||'am_adam')];
  if(opts.speed)args.push('--speed',String(opts.speed));
  if(fs.existsSync(path.join(p.dir,'dialogue.json'))){
    const sceneArgs=['studio/cli/voice_scene.py','--project',path.relative(ROOT,p.dir)];
    if(opts.fallback)sceneArgs.push('--fallback');
    const outputText=invoke(py,sceneArgs,{cwd:ROOT,timeout:900000});
    process.stdout.write(outputText);return;
  }
  const stdout=invoke(py,args,{cwd:ROOT,timeout:600000});
  process.stdout.write(stdout);
}

function scan(){
  const errors=enforceDataOnly();
  if(errors.length)throw new Error('Unpromoted project source code: '+errors.join(', '));
  output({projectCodeViolations:0});
}

async function promote(){
  if(opts.asset){const result=promoteRegistry(projectArg,String(opts.asset));await syncIndex();return output(result);}
  const p=project(),violations=enforceDataOnly();
  if(violations.length)throw new Error('Unpromoted project code: '+violations.join(', '));
  return output(await promoteVideo(p,{tokens:opts.tokens}));
}

async function golden(){
  const ref=projectArg||'projects/golden-1159';
  const validation=validateProject(ref);
  const p=loadProject(ref);
  const outDir=path.join(STUDIO,'out',path.basename(p.dir));
  const sheetRes=await sheet(ref,'draft');
  const wordsPath=path.join(p.dir,'timeline','words.json');
  const wordsData=fs.existsSync(wordsPath)?readJSON(wordsPath):{words:[]};
  const factsPath=path.join(outDir,'facts.json');
  const facts=fs.existsSync(factsPath)?readJSON(factsPath):null;
  const statsPath=path.join(outDir,'render-stats.json');
  const stats=fs.existsSync(statsPath)?readJSON(statsPath):null;
  const shots=p.manifest.shots;

  const expectedTemplates=['wide-establishing','window-view','figure-exterior','insert-macro-clock','giant-face','insert-macro-clock','window-view'];
  const actualTemplates=shots.map(s=>s.template);
  const expectedCaptions=['NIGHT.','I SAW','A LITTLE','GIRL OUTSIDE','MY WINDOW.','STARING RIGHT','AT ME.','THE CLOCK','SAID 11:59.','I BLINKED.','12:01.','SHE WAS','GONE.'];
  const actualCaptions=(wordsData.words||[]).map(w=>String(w.text||'').trim().toUpperCase());

  const s02=shots[1];
  const s02Layout=s02?computeWindowLayout(720,1280,{girl:s02.params?.girl}):null;
  const s02Inside=Boolean(s02Layout?.girl?.visible&&
    s02Layout.girl.box.left>=s02Layout.pane.x+s02Layout.pane.frameThick*0.5&&
    s02Layout.girl.box.right<=s02Layout.pane.x+s02Layout.pane.w-s02Layout.pane.frameThick*0.5&&
    s02Layout.girl.box.top>=s02Layout.pane.y+s02Layout.pane.frameThick*0.5&&
    s02Layout.girl.box.bottom<=s02Layout.pane.sillTopY-s02Layout.pane.frameThick*0.5);
  const s02Small=Boolean(s02Layout?.girl&&s02Layout.girl.height<s02Layout.pane.h*0.25);

  const s05=shots[4];
  const blinkedWord=findWordTimestamp(wordsData.words||[],'blinked',s05?.start||0,(s05?.start||0)+(s05?.duration||2));
  const blinkCue=(s05?.resolvedCues||[]).find(c=>c.action==='blink');
  const blinkDelta=blinkedWord&&blinkCue?Math.abs(blinkCue.at-blinkedWord.start):Infinity;

  const s06=shots[5];
  const s06Ok=Boolean(s06&&s06.transition==='flash'&&String(s06.params?.time)==='12:01');

  const clipMean=facts?.motion?.clip_mean??0;
  const minShotMean=facts?.motion?.min_shot_mean??0;
  const motionOk=clipMean>=2.0&&minShotMean>=0.8;

  const streams=facts?.streams||[];
  const hasH264=streams.some(st=>st.codec_name==='h264');
  const hasAac=streams.some(st=>st.codec_name==='aac');
  const dur=Number(facts?.duration||0);
  const mediaOk=Boolean(facts&&facts.resolution==='720x1280'&&facts.fps===24&&hasH264&&hasAac&&dur>=10.4&&dur<=11.0);

  const unexpectedBlack=(facts?.black_detections||[]).filter(b=>{
    const lastShot=shots.at(-1);
    const fadeStart=(lastShot?.start||0)+(lastShot?.duration||0)-(Number(lastShot?.fadeOut)||0)-0.2;
    return b.start<fadeStart;
  });
  const voiceBlackOk=Boolean(facts&&facts.voice_present===true&&unexpectedBlack.length===0);

  const codeViolations=enforceDataOnly();
  const baselineSeconds=581.1;
  const afterSeconds=Number(stats?.totalRenderSeconds||0);
  const renderTimeOk=afterSeconds>0&&afterSeconds<=baselineSeconds*1.2;

  const checks=[
    {name:'7 shots & storyboard templates/order',pass:JSON.stringify(actualTemplates)===JSON.stringify(expectedTemplates),measured:{count:shots.length,templates:actualTemplates}},
    {name:'caption groups match display text sequence',pass:JSON.stringify(actualCaptions)===JSON.stringify(expectedCaptions),measured:{count:actualCaptions.length,captions:actualCaptions}},
    {name:'s6 flash transition & 12:01 clock',pass:s06Ok,measured:{transition:s06?.transition,transitionDuration:s06?.transitionDuration,time:s06?.params?.time}},
    {name:'s2 girl inside pane & < 25% height',pass:s02Inside&&s02Small,measured:s02Layout?.girl?{height:Math.round(s02Layout.girl.height),paneHeight:Math.round(s02Layout.pane.h),pct:+(100*s02Layout.girl.height/s02Layout.pane.h).toFixed(1),inside:s02Inside}:null},
    {name:'blink starts within 0.1s of "blinked"',pass:blinkDelta<=0.1,measured:{wordStart:blinkedWord?.start,cueAt:blinkCue?.at,delta:Number.isFinite(blinkDelta)?+blinkDelta.toFixed(4):null}},
    {name:'motion clip >= 2.0 & min shot >= 0.8',pass:motionOk,measured:facts?.motion||null},
    {name:'720x1280 24fps H.264+AAC 10.4-11.0s',pass:mediaOk,measured:facts?{resolution:facts.resolution,fps:facts.fps,duration:facts.duration,h264:hasH264,aac:hasAac}:null},
    {name:'voice present & no unexpected black',pass:voiceBlackOk,measured:{voice_present:facts?.voice_present,unexpected_black:unexpectedBlack}},
    {name:'validate & data-only check',pass:validation.valid&&codeViolations.length===0,measured:{valid:validation.valid,errors:validation.errors,codeViolations}},
    {name:'render seconds <= 1.2x baseline (581.1s)',pass:renderTimeOk,measured:{before_seconds:baselineSeconds,after_seconds:afterSeconds?+afterSeconds.toFixed(1):null}}
  ];

  const allPass=checks.every(c=>c.pass);
  const report={status:allPass?'pass':'fail',project:ref,contact_sheet:sheetRes.out,checks};
  output(report);
  if(!allPass)process.exitCode=1;
}

async function main(){
  if(command==='assets')return output(assetCatalog(String(opts.query||'')).map(({example,...item})=>item));
  if(command==='asset-inspect')return output(inspectAsset(String(opts.id||'')));
  if(command==='asset-preview'){
    const id=String(opts.id||''),recipe=assetRecipe(id),size=dimensions('draft');
    const at=Number(opts.at??2);if(!Number.isFinite(at)||at<0)throw Error('--at must be a nonnegative time');
    const out=path.join(STUDIO,'out','asset-previews',id.replace(/[^a-z0-9-]/gi,'_')+'.png');mkdir(path.dirname(out));
    const b64=await withBrowser(page=>page.evaluate(({recipe,size,at,id})=>{window.renderStudioFrame({id:'preview',start:0,duration:4,camera:'static',cameraIntensity:0,recipe},{...size,style:id.startsWith('styles/')?id.slice(7):'midnight'},at,[]);return document.getElementById('screen').toDataURL().split(',')[1];},{recipe,size,at,id}));
    fs.writeFileSync(out,Buffer.from(b64,'base64'));return output({id,at,out});
  }
  if(command==='verify-visual'){const result=verifyVisual(projectArg,quality);output(result);if(result.status!=='pass')process.exitCode=1;return;}
  if(command==='recipe-new'){
    const id=String(opts.preset||'window-view');
    const recipe=presetRecipe(id);
    recipe.set.params=Object.fromEntries(Object.entries(PRESETS[id].params).filter(([,v])=>v.default!==undefined).map(([k,v])=>[k,v.default]));
    return output({recipe,annotations:{coordinates:'x: 0..1; depth: 0 far .. 1 near; feet above caption safe zone',keys:'Shot-relative seconds, linear/in/out/inOut/hold; pose/expression blends start at key time (default .15s)',params:PRESETS[id].params}});
  }
  if(command==='explain'){
    const p=loadProject(projectArg),shot=p.manifest.shots.find(s=>s.id===opts.shot);
    if(!shot)throw Error('Unknown shot '+opts.shot);
    const recipe=normalizeRecipe(shot.recipe||presetRecipe(shot.template,{},shot.params));
    return output({shot:shot.id,start:shot.start,duration:shot.duration,recipe,resolvedCues:shot.resolvedCues||[],...(opts.at!==undefined?{frame:resolveRecipe(recipe,Number(opts.at))}:{})});
  }
  if(command==='doctor')return await doctor();
  if(command==='smoke')return output(await smoke());
  if(command==='check')return scan();
  if(command==='plan')return output(planProject(projectArg,{force:Boolean(opts.force)}));
  if(command==='validate'){
    const res=validateProject(projectArg);
    output(res);
    if(!res.valid)process.exitCode=1;
    return;
  }
  if(command==='index'){
    const res=await syncIndex({check:Boolean(opts.check)});
    output(res);
    if(!res.ok)process.exitCode=1;
    return;
  }
  if(command==='new-project')return newProject();
  if(command==='make-voice')return makeVoice();
  if(command==='align')return align();
  if(command==='sheet')return output(await sheet(projectArg,quality));
  if(command==='render')return output(await render(projectArg,quality));
  if(command==='mix'){const p=project();return output(await mix(p,p.duration))}
  if(command==='verify'){const p=project();return output(verifyFilm(projectArg,p,dimensions(quality),opts))}
  if(command==='golden')return await golden();
  if(command==='promote')return await promote();
  throw new Error('Command must be doctor, smoke, check, plan, validate, index, new-project, make-voice, align, sheet, render, mix, verify, golden, promote');
}
main().catch(e=>{console.error('STUDIO_ERROR: '+e.message);process.exitCode=1});
