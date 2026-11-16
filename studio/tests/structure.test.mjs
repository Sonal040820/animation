import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,STUDIO} from '../lib/project.mjs';
test('Mandatory memory files and stage commands exist',()=>{
 for(const f of ['INDEX.md','LESSONS.md','COST.md','STATUS.md','package.json','cli/studio.mjs',
   'cli/voice.py','lib/core.mjs','lib/characters.mjs','lib/templates.mjs',
   'lib/runner.mjs','lib/timing.mjs','lib/audio.mjs','lib/quality.mjs']){
  assert.ok(fs.existsSync(path.join(STUDIO,f)),f);
 }
});
test('No project-specific JavaScript',()=>{
 const p=path.join(ROOT,'projects','window-at-midnight');
 const filenames=fs.readdirSync(p);
 assert.ok(filenames.includes('manifest.json')&&filenames.includes('config.json')&&filenames.includes('script.txt'));
 assert.ok(!filenames.some(x=>/\.(js|mjs|py|ts|tsx)$/.test(x)));
});
