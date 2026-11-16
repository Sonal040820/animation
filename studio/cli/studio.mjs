#!/usr/bin/env node
// Deterministic stage commands. No engine code is generated into project folders.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {ROOT,STUDIO,PROJECTS,sha,readJSON,mkdir,projectPath,loadProject,enforceDataOnly} from '../lib/project.mjs';
import {browserExecutable,withBrowser,invoke,smoke,sheet,render,dimensions} from '../lib/runner.mjs';
import {phrases,saveWords} from '../lib/timing.mjs';
import {mix} from '../lib/audio.mjs';
import {verifyFilm} from '../lib/quality.mjs';
import {promoteVideo} from '../lib/learning.mjs';
import {TEMPLATE_NAMES} from '../lib/templates.mjs';
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
  const ffmpeg=version('ffmpeg',['-version']);
  const ffprobe=version('ffprobe',['-version']);
  const browserPath=browserExecutable();
  const browserBinVersion=version(browserPath,['--version']);
  const fingerprint=sha(JSON.stringify({node:versionNode,platform:process.platform,arch:process.arch,
    playwright:pkg.dependencies.playwright,ffmpeg,ffprobe,browserBinVersion}));
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
      return {canvas2d:c.getImageData(1,1,1,1).data[0]===255,offscreenCanvas:typeof OffscreenCanvas==='function'};
    });
  });
  if(!checks.canvas2d||ffmpeg==='missing'||ffprobe==='missing')throw new Error('Required renderer capability missing');
  const env={schema_version:1,status:'verified',fingerprint,
    platform:process.platform,arch:process.arch,node:versionNode,python:version('python3',['--version']),
    ffmpeg,ffprobe,playwright:pkg.dependencies.playwright,
    chromium:browserBinVersion,browserSource:browserPath.includes('ms-playwright')?'playwright-pinned':'preinstalled',
    browserOverrideBoolean:Boolean(process.env.CHROMIUM_PATH),checks,renderer:'Canvas2D+Chromium+ffmpeg',
    voice:'optional Kokoro ONNX; models not downloaded during setup',checked_at:new Date().toISOString()};
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
    const obj={id:'shot-'+String(i+1).padStart(2,'0'),template:TEMPLATE_NAMES[i%TEMPLATE_NAMES.length],
      start:+cursor.toFixed(3),duration:+duration.toFixed(3),camera:'push',
      seed:110+i,params:{text:p.slice(0,25),expression:'neutral'}};
    cursor+=duration;return obj;
  });
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schema_version:1,slug:path.basename(dir),shots},null,2)+'\n');
  fs.writeFileSync(path.join(dir,'config.json'),JSON.stringify({schema_version:1,aspect:'9:16',studio:'original-short-video-studio',
    resolution:'720p',fps:24,style:opts.style||'midnight',rig:'block',voice:'am_adam'},null,2)+'\n');
  output({created:path.relative(ROOT,dir),shots:shots.length,rendered:false});
}
function project(){const p=loadProject(projectArg);return {...p,out:path.join(STUDIO,'out',path.basename(p.dir))}}
function align(){
  const p=project(),script=fs.readFileSync(path.join(p.dir,'script.txt'),'utf8');
  const timingPath=path.join(p.dir,'timeline','phrases.json');
  const voice=fs.existsSync(timingPath)?readJSON(timingPath):null;
  const duration=voice?.duration||p.duration;
  const result=saveWords(p.dir,script,voice?.durations||null,duration);
  output({captions:result.words.length,method:result.method,duration});
}
function makeVoice(){
  const p=project();
  const args=['studio/cli/voice.py','--project',path.relative(ROOT,p.dir),'--voice',String(opts.voice||p.config.voice||'am_adam')];
  if(opts.speed)args.push('--speed',String(opts.speed));
  const stdout=invoke('python3',args,{cwd:ROOT,timeout:600000});
  process.stdout.write(stdout);
}
function scan(){const errors=enforceDataOnly();if(errors.length)throw new Error('Unpromoted project source code: '+errors.join(', '));output({projectCodeViolations:0})}
function promote(){
  const p=project(),violations=enforceDataOnly();
  if(violations.length)throw new Error('Unpromoted project code: '+violations.join(', '));
  return output(promoteVideo(p,{tokens:opts.tokens}));
}
async function main(){
  if(command==='doctor')return await doctor();
  if(command==='smoke')return output(await smoke());
  if(command==='check')return scan();
  if(command==='new-project')return newProject();
  if(command==='make-voice')return makeVoice();
  if(command==='align')return align();
  if(command==='sheet')return output(await sheet(projectArg,quality));
  if(command==='render')return output(await render(projectArg,quality));
  if(command==='mix'){const p=project();return output(mix(p,p.duration))}
  if(command==='verify'){const p=project();return output(verifyFilm(projectArg,p,dimensions(quality)))}
  if(command==='promote')return promote();
  throw new Error('Command must be doctor, smoke, check, new-project, make-voice, align, sheet, render, mix, verify, promote');
}
main().catch(e=>{console.error('STUDIO_ERROR: '+e.message);process.exitCode=1});
