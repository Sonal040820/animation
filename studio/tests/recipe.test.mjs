import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecipe,resolveRecipe,worldPosition} from '../lib/recipe.mjs';
const basic=()=>({set:{preset:'void'},actors:[{id:'girl',pos:{x:.5,depth:.5}}]});
test('Recipe defaults and numeric channel interpolation',()=>{
 const r=basic();r.camera={keys:[{t:0,zoom:1},{t:2,zoom:2}]};
 const n=normalizeRecipe(r);assert.equal(resolveRecipe(n,1).camera.zoom,1.5);assert.equal(n.actors[0].rig,'silhouette');assert.equal(r.actors[0].rig,undefined);
});
test('Recipe unknown ids offer suggestions',()=>{const r=basic();r.set.preset='yaard';assert.throws(()=>normalizeRecipe(r),/did you mean "yard"/);});
test('Recipe bad easing rejected',()=>{const r=basic();r.camera={keys:[{t:1,zoom:2,easing:'bounce'}]};assert.throws(()=>normalizeRecipe(r),/easing/);});
test('Recipe out-of-bounds placement rejected, including keys',()=>{const r=basic();r.actors[0].keys=[{t:1,pos:{x:1.2,depth:.5}}];assert.throws(()=>normalizeRecipe(r),/pos.x/);});
test('Recipe caption overlap rejected',()=>{const r=basic();r.actors[0].pos.depth=1;assert.throws(()=>normalizeRecipe(r),/caption zone/);});
test('World model has near objects larger and lower',()=>{const a=worldPosition({x:.5,depth:0}),b=worldPosition({x:.5,depth:.8});assert.ok(b.y>a.y&&b.scale>a.scale);});
test('Expression and pose key begin at 1.0 and reach target at 1.15',()=>{const r=basic();r.actors[0].keys=[{t:1,expression:'terrified',pose:'walk'}];const n=normalizeRecipe(r);const at=t=>resolveRecipe(n,t).actors[0];assert.equal(at(1).expression.mouthOpen,0);assert.ok(at(1.075).expression.mouthOpen>.4);assert.ok(Math.abs(at(1.15).expression.mouthOpen-.86)<1e-8);assert.ok(at(1.15).poseWeights.walk>.999);});
test('Talk amplitude samples are opt-in',()=>{const r=basic();assert.equal(resolveRecipe(normalizeRecipe(r),0).actors[0].expression.mouthOpen,0);r.actors[0].talk={fps:10,amplitude:[0,.8,0]};assert.equal(resolveRecipe(normalizeRecipe(r),.1).actors[0].expression.mouthOpen,.8);});
test('Recipe partial state keys preserve other state fields',()=>{const r=normalizeRecipe({set:{preset:'void'},props:[{type:'clock',keys:[{t:1,state:{time:'3:00'}}]}]});assert.equal(resolveRecipe(r,1).props[0].state.time,'3:00');assert.equal(resolveRecipe(r,1).props[0].state.color,'#ff4d4d');});
