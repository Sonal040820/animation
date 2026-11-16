import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDeclaration} from '../lib/declarative.mjs';
import {countRecipeUsage} from '../lib/registry-promotion.mjs';
test('Declarative registry rejects executable or external content',()=>{
 for(const primitive of [{type:'script',code:'alert(1)'},{type:'text',x:0,y:0,size:.1,text:'A',fill:'#ffffff',url:'https://example.org'}])assert.throws(()=>validateDeclaration({id:'example',kind:'props',primitives:[primitive]}));
});
test('Declarative polygons are bounded and recipe usage is counted per shot',()=>{
 const d={id:'wet-print',kind:'props',primitives:[{type:'polygon',points:[[0,0],[1,0],[.5,1]],fill:'#446688'}]};assert.equal(validateDeclaration(d).declaration.id,d.id);d.primitives[0].points[0][0]=-1;assert.throws(()=>validateDeclaration(d));
 const r=countRecipeUsage([{recipe:{set:{preset:'room'},props:[{type:'clock'},{type:'clock'}]}}]);assert.equal(r.counts['props:clock'],1);assert.equal(r.recipePercent,100);
});
