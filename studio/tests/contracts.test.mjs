import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATE_NAMES,assertShot} from '../lib/templates.mjs';
import {alignPhrases,phrases} from '../lib/timing.mjs';
import {style,STYLES} from '../lib/core.mjs';
import {enforceDataOnly,loadProject} from '../lib/project.mjs';
test('Eight independent reusable templates',()=>{
 assert.equal(TEMPLATE_NAMES.length,8);
 assert.equal(new Set(TEMPLATE_NAMES).size,8);
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
test('No per-project copy of executable source',()=>assert.deepEqual(enforceDataOnly(),[]));
test('Horror project manifest is data-only and coherent',()=>{
 const p=loadProject('projects/window-at-midnight');
 assert.equal(p.config.aspect,'9:16');
 assert.ok(p.duration>=9.5&&p.duration<=10.5);
});
