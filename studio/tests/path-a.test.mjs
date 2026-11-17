import test from 'node:test';
import assert from 'node:assert/strict';
import {solveTwoBone} from '../lib/human.mjs';
import {assertPipeline} from '../lib/pipeline.mjs';
import {assetCatalog,assetRecipe,inspectAsset} from '../lib/assets.mjs';
import {normalizeRecipe,resolveActor} from '../lib/recipe.mjs';
import {validateProject} from '../lib/validate.mjs';
import {withBrowser,dimensions} from '../lib/runner.mjs';

test('Every output size supports H.264 yuv420p and exact 9:16',()=>{
  for(const quality of ['draft','preview','standard','high']){
    const {width,height}=dimensions(quality);
    assert.equal(width%2,0);assert.equal(height%2,0);assert.equal(width/height,9/16);
  }
});

test('Path A is the default; other pipelines fail clearly',()=>{
  assert.equal(assertPipeline({}),'A');assert.equal(assertPipeline({pipeline:'A'}),'A');
  for(const pipeline of ['B','C','D',null]){
    if(pipeline!==null)assert.throws(()=>assertPipeline({pipeline}),/Path A/);
  }
});
test('IK preserves segment lengths for reachable, unreachable and coincident targets',()=>{
  for(const target of [{x:1,y:1},{x:20,y:0},{x:0,y:0}])for(const bend of [-1,1]){
    const root={x:0,y:0},r=solveTwoBone(root,target,2,1,bend);
    assert.ok(Math.abs(Math.hypot(r.elbow.x,r.elbow.y)-2)<1e-6);
    assert.ok(Math.abs(Math.hypot(r.hand.x-r.elbow.x,r.hand.y-r.elbow.y)-1)<1e-6);
    assert.ok(Math.hypot(r.hand.x,r.hand.y)<=3);
  }
  assert.throws(()=>solveTwoBone({x:0,y:0},{x:1,y:1},0,1),/Invalid/);
});
test('Catalog recipes normalize; reusable actions remain deterministic and editable',()=>{
  for(const item of assetCatalog().filter(a=>a.kind!=='easings'))assert.doesNotThrow(()=>assetRecipe(item.id),item.id);
  assert.equal(inspectAsset('sets/three-room').renderer,'Three.js WebGL2 + Canvas2D');
  const r=assetRecipe('actions/notice-recoil');
  assert.deepEqual(normalizeRecipe(r),r);
  assert.ok(resolveActor(r.actors[0],2.5).poseWeights.flinch>.9);
  const invalid=structuredClone(r);invalid.actors[0].action='notice-recoil';
  assert.throws(()=>normalizeRecipe(invalid),/action OR keys/);
  assert.equal(validateProject('projects/path-a-visual-proof').valid,true);
});
test('Real Three.js composite is seekable, resizable and changes with door action',async()=>{
  await withBrowser(async page=>{
    const result=await page.evaluate(async()=>{
      const {initializeThreeStage,disposeThreeStage}=await import('./three-stage.mjs');
      const canvas=document.getElementById('screen'),stage=initializeThreeStage(canvas);
      const shot={id:'test',start:0,duration:4,camera:'static',cameraIntensity:0,recipe:{set:{preset:'three-room'},actors:[{id:'lead',appearance:'traveler',pos:{x:.4,depth:.65},action:'notice-recoil'}]}};
      const config={width:180,height:320,style:'midnight'};
      const draw=t=>{window.renderStudioFrame(shot,config,t,[]);return canvas.toDataURL();};
      const first=draw(0),later=draw(3),repeat=draw(0);
      window.renderStudioFrame(shot,{...config,width:270,height:480},2,[]);
      const size=[stage.renderer.domElement.width,stage.renderer.domElement.height];
      const webgl=stage.renderer.getContext() instanceof WebGL2RenderingContext;
      disposeThreeStage(canvas);
      const replacement=initializeThreeStage(canvas)!==stage;
      return {seekable:first===repeat,changed:first!==later,size,webgl,replacement};
    });
    assert.deepEqual(result,{seekable:true,changed:true,size:[270,480],webgl:true,replacement:true});
  });
});
