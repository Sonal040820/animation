import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {TEMPLATE_NAMES,assertShot} from '../lib/templates.mjs';
import {alignPhrases,alignMeasured,phrases} from '../lib/timing.mjs';
import {style,STYLES} from '../lib/core.mjs';
import {enforceDataOnly,loadProject,resolveProjectShots,STUDIO} from '../lib/project.mjs';
import {validateProject} from '../lib/validate.mjs';
import {syncIndex} from '../lib/learning.mjs';
import {engineHash} from '../lib/runner.mjs';
import {verifyFilm} from '../lib/quality.mjs';
import {planScript} from '../lib/planner.mjs';

test('All original reusable templates',()=>{
  assert.ok(TEMPLATE_NAMES.length>=16);
  assert.equal(new Set(TEMPLATE_NAMES).size,TEMPLATE_NAMES.length);
  for(const template of TEMPLATE_NAMES)assert.doesNotThrow(()=>assertShot({template,start:0,duration:1}));
});

test('All four data-defined styles exist',()=>{
  assert.equal(Object.keys(STYLES).length,4);
  for(const name of Object.keys(STYLES))assert.ok(style(name).rim);
});

test('Per-sentence 1-2 word captions, nonoverlap and duration',()=>{
  const s='Night. I saw a little girl outside my window. She was gone.';
  const groups=alignPhrases(s,null,10).words;
  assert.ok(groups.length>3);
  for(let i=0;i<groups.length;i++){
    assert.ok(groups[i].text.split(/\s+/).length<=2);
    assert.ok(groups[i].start<groups[i].end);
    if(i)assert.ok(groups[i].start>=groups[i-1].end-.002);
  }
  assert.ok(groups.at(-1).end<=10.01);
});

test('alignMeasured aligns 1-2 word sentence-bound captions strictly inside measured line spans',()=>{
  const linesJson={
    schema_version:1,
    provider:'kokoro-onnx',
    voice_present:true,
    duration:4.5,
    lines:[
      {id:'l1',speaker:'narrator',text:'Night.',emotion:'ominous',start:0.1,end:0.9,spoken_seconds:0.8},
      {id:'l2',speaker:'narrator',text:'I saw a little girl outside my window.',emotion:'scared',start:1.1,end:3.4,spoken_seconds:2.3},
      {id:'l3',speaker:'narrator',text:'She was gone.',emotion:'whisper',start:3.6,end:4.5,spoken_seconds:0.9}
    ]
  };
  const aligned=alignMeasured(linesJson,{emphasis:{l1:['NIGHT'],l3:['GONE']}});
  assert.equal(aligned.method,'measured-line/character-weight');
  assert.ok(aligned.words.length>=6);
  for(const w of aligned.words){
    assert.ok(w.text.split(/\s+/).length<=2);
    const line=linesJson.lines.find(l=>l.id===w.line_id);
    assert.ok(line);
    assert.ok(w.start>=line.start-0.001);
    assert.ok(w.end<=line.end+0.001);
  }
});

test('Line-bound shot resolution: starts at 0, contiguous ends, last ends at voice duration + tail',()=>{
  const lineSource={
    timing:'measured',
    duration:8.0,
    lines:[
      {id:'l1',start:0.12,end:1.1},
      {id:'l2',start:1.3,end:3.2},
      {id:'l3',start:3.5,end:5.0},
      {id:'l4',start:5.2,end:8.0}
    ]
  };
  const rawShots=[
    {id:'s01',template:'wide-establishing',line:'l1'},
    {id:'s02',template:'window-view',lines:['l2','l3']},
    {id:'s03',template:'empty-yard',line:'l4'}
  ];
  const resolved=resolveProjectShots(rawShots,lineSource,{tail:0.6});
  assert.equal(resolved[0].start,0);
  assert.equal(resolved[0].duration,1.3);
  assert.equal(resolved[1].start,1.3);
  assert.equal(resolved[1].duration,3.9);
  assert.equal(resolved[2].start,5.2);
  assert.equal(+(resolved[2].start+resolved[2].duration).toFixed(3),8.6);
});

test('No per-project copy of executable source',()=>assert.deepEqual(enforceDataOnly(),[]));

test('Horror project manifest is data-only and coherent',()=>{
  const p=loadProject('projects/window-at-midnight');
  assert.equal(p.config.aspect,'9:16');
  assert.ok(p.duration>=9.5&&p.duration<=10.5);
});

test('60-second psychological horror production contract',()=>{
  const p=loadProject('projects/the-wrong-side');
  assert.equal(p.duration,60);
  assert.equal(p.manifest.shots.length,19);
  assert.equal(p.config.studio,'original-short-video-studio');
  assert.ok(p.manifest.shots.every(s=>TEMPLATE_NAMES.includes(s.template)));
});

test('validate passes for all three studio projects',()=>{
  for(const proj of ['projects/window-at-midnight','projects/the-wrong-side','projects/midnight-horror-elite']){
    const res=validateProject(proj);
    assert.equal(res.valid,true,`Expected ${proj} to validate cleanly, got errors: ${JSON.stringify(res.errors)}`);
    assert.equal(res.errors.length,0);
  }
});

test('index --check passes without drift',async ()=>{
  const res=await syncIndex({check:true});
  assert.equal(res.ok,true,'INDEX.md drifted from live exports/TEMPLATE_META; run node studio/cli/studio.mjs index');
  assert.equal(res.drift,false);
});

test('engineHash changes when a lib file changes',()=>{
  const tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-engine-hash-'));
  try{
    const libDir=path.join(STUDIO,'lib');
    for(const entry of fs.readdirSync(libDir,{withFileTypes:true})){
      if(entry.isFile()&&/\.(mjs|json)$/i.test(entry.name)){
        fs.copyFileSync(path.join(libDir,entry.name),path.join(tmpDir,entry.name));
      }
    }
    const hashBefore=engineHash(tmpDir);
    const stylesCopy=path.join(tmpDir,'styles.mjs');
    fs.appendFileSync(stylesCopy,'\n// engine edit probe\n');
    const hashAfter=engineHash(tmpDir);
    assert.notEqual(hashBefore,hashAfter,'engineHash must change when any studio/lib/*.mjs or *.json file changes');
  }finally{
    fs.rmSync(tmpDir,{recursive:true,force:true});
  }
});

test('verifyFilm fails when dialogue exists and voice.wav is missing',()=>{
  const tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-verify-silent-'));
  try{
    const projDir=path.join(tmpDir,'proj');
    const outDir=path.join(tmpDir,'out');
    fs.mkdirSync(path.join(projDir,'timeline'),{recursive:true});
    fs.mkdirSync(outDir,{recursive:true});
    fs.writeFileSync(path.join(projDir,'dialogue.json'),JSON.stringify({
      schema_version:2,
      voices:{narrator:'af_heart'},
      default_speaker:'narrator',
      lines:[{id:'l1',text:'Night.',emotion:'ominous'}]
    }));
    const mp4=path.join(outDir,'final.mp4');
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=270x480:r=12:d=1','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',mp4]);
    const fakeProject={dir:projDir,out:outDir,duration:1,config:{voice_required:true}};
    assert.throws(
      ()=>verifyFilm('projects/midnight-horror-elite',fakeProject,{width:270,height:480}),
      /Voice required/i
    );
  }finally{
    fs.rmSync(tmpDir,{recursive:true,force:true});
  }
});

test('planScript produces dialogue v2 and line-bound manifest from script text',()=>{
  const script='Night. I saw a little girl outside my window. The clock said eleven fifty nine. I blinked. She was gone.';
  const planned=planScript(script,{slug:'test-horror'});
  assert.equal(planned.dialogue.schema_version,2);
  assert.equal(planned.dialogue.lines.length,5);
  assert.equal(planned.manifest.shots.length,5);
  assert.ok(planned.manifest.shots.every(s=>Boolean(s.line)));
  assert.equal(planned.needs_new_code.length,0);
});
