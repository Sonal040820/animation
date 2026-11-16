import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withBrowser} from '../lib/runner.mjs';
import {PRESETS} from '../lib/presets.mjs';
import {STUDIO} from '../lib/project.mjs';
test('All Canvas2D compatibility presets reproduce legacy pixels at three times',async()=>{
 const report=await withBrowser(page=>page.evaluate(async presets=>{
   const {drawStudioFrame}=await import('./templates.mjs');
   const results=[];
   for(const [id,meta] of Object.entries(presets)){
     const canvas=document.createElement('canvas');canvas.width=144;canvas.height=256;
     for(const t of [0,.7,1.6]){
       const shot={template:id,start:0,duration:2,seed:71,params:meta.example};
       drawStudioFrame(canvas,shot,{style:'midnight'},t,[]);
       const a=canvas.getContext('2d').getImageData(0,0,144,256).data;
       drawStudioFrame(canvas,{...shot,template:undefined,preset:id},{style:'midnight'},t,[]);
       const b=canvas.getContext('2d').getImageData(0,0,144,256).data;
       let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);
       results.push({preset:id,t,meanAbsoluteDifference:sum/a.length});
     }
   }
   return results;
 },PRESETS));
 fs.mkdirSync(path.join(STUDIO,'out'),{recursive:true});
 fs.writeFileSync(path.join(STUDIO,'out','phase2-equivalence.json'),JSON.stringify(report,null,2));
 assert.equal(report.length,Object.keys(PRESETS).length*3);
 for(const r of report)assert.ok(r.meanAbsoluteDifference<2,JSON.stringify(r));
});
