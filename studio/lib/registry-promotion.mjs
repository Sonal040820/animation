import fs from 'node:fs';
import path from 'node:path';
import {projectPath,STUDIO,readJSON,sha} from './project.mjs';
import {validateDeclaration} from './declarative.mjs';
import {RECIPE_REGISTRIES} from './recipe.mjs';
export function promoteRegistry(projectRef,asset){
  const dir=projectPath(projectRef);
  if(typeof asset!=='string'||!/^assets\/[a-z0-9-]+\.json$/.test(asset))throw Error('Use assets/<name>.json');
  const source=path.join(dir,asset),real=fs.realpathSync(source),assets=fs.realpathSync(path.join(dir,'assets'));
  if(!real.startsWith(assets+path.sep))throw Error('Asset must stay inside project assets');
  const {declaration}=validateDeclaration(readJSON(real));
  const registryDir=path.join(STUDIO,'lib','registry'),catalogFile=path.join(registryDir,'catalog.json');
  const catalog=readJSON(catalogFile),prior=catalog[declaration.kind][declaration.id];
  if(prior&&JSON.stringify(prior)!==JSON.stringify(declaration))throw Error('Registry entry differs; choose a new id');
  if(!prior&&Object.hasOwn(RECIPE_REGISTRIES[declaration.kind],declaration.id))throw Error('Cannot replace a built-in registry entry');
  const target=path.join(registryDir,`${declaration.kind}-${declaration.id}.json`);
  const text=JSON.stringify(declaration,null,2)+'\n';
  fs.writeFileSync(target,text);catalog[declaration.kind][declaration.id]=declaration;
  fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n');
  return {id:declaration.id,kind:declaration.kind,created:!prior,sha256:sha(text),file:target};
}
export function countRecipeUsage(shots){
  const counts={};let recipes=0;
  for(const shot of shots){const r=shot.recipe;if(!r)continue;recipes++;const ids=[`sets:${r.set.preset}`,...(r.actors||[]).map(a=>`rigs:${a.rig||'silhouette'}`),...(r.props||[]).map(p=>`props:${p.type}`),...(r.fx||[]).map(f=>`fx:${f.type}`)];for(const id of new Set(ids))counts[id]=(counts[id]||0)+1;}
  return {counts,recipes,total:shots.length,recipePercent:shots.length?100*recipes/shots.length:0};
}
