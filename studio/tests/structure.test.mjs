import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,STUDIO} from '../lib/project.mjs';

test('Mandatory memory files and stage commands exist',()=>{
  for(const f of [
    'INDEX.md','LESSONS.md','COST.md','STATUS.md','WORKFLOW.md','package.json','cli/studio.mjs',
    'cli/voice.py','cli/voice_scene.py','lib/core.mjs','lib/characters.mjs','lib/templates.mjs',
    'lib/template-meta.mjs','lib/motion.mjs','lib/scenery.mjs','lib/props.mjs','lib/font.mjs',
    'lib/validate.mjs','lib/planner.mjs','lib/planner-rules.json','lib/usage.json','lib/voice-presets.json',
    'lib/runner.mjs','lib/timing.mjs','lib/audio.mjs','lib/quality.mjs','lib/learning.mjs'
  ]){
    assert.ok(fs.existsSync(path.join(STUDIO,f)),f);
  }
});

test('No project-specific JavaScript',()=>{
  for(const slug of ['window-at-midnight','the-wrong-side','midnight-horror-elite']){
    const p=path.join(ROOT,'projects',slug);
    const filenames=fs.readdirSync(p);
    assert.ok(filenames.includes('manifest.json')&&filenames.includes('config.json'));
    assert.ok(!filenames.some(x=>/\.(js|mjs|py|ts|tsx)$/.test(x)));
  }
});
