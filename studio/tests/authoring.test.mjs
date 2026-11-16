import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {ROOT} from '../lib/project.mjs';
test('recipe-new prints documented parameter skeleton',()=>{const result=JSON.parse(execFileSync(process.execPath,['studio/cli/studio.mjs','recipe-new','--preset','window-view'],{cwd:ROOT,encoding:'utf8'}));assert.equal(result.recipe.set.preset,'preset:window-view');assert.equal(result.annotations.params.girl.type,'boolean|object');});
test('explain resolves a legacy project without changing it',()=>{const result=JSON.parse(execFileSync(process.execPath,['studio/cli/studio.mjs','explain','--project','projects/golden-1159','--shot','s02'],{cwd:ROOT,encoding:'utf8'}));assert.equal(result.recipe.set.preset,'preset:window-view');});
