// Node-side manifest validation, schema and strict separation of engine and project data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assertShot} from './templates.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const PROJECTS=path.join(ROOT,'projects');
export const STUDIO=path.join(ROOT,'studio');
export const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const sha=content=>crypto.createHash('sha256').update(content).digest('hex');
export const mkdir=p=>fs.mkdirSync(p,{recursive:true});
export function projectPath(p){
  if(!p||typeof p!=='string')throw new Error('--project must be supplied');
  const full=path.resolve(ROOT,p);
  if(!full.startsWith(PROJECTS+path.sep))throw new Error('Project must be under projects/');
  if(path.relative(PROJECTS,full).split(path.sep).length!==1)throw new Error('Use projects/<slug>');
  if(!/^[a-z0-9][a-z0-9-]*$/.test(path.basename(full)))throw new Error('Project slug must be lowercase kebab-case');
  return full;
}
export function loadProject(p){
  const dir=projectPath(p),manifest=readJSON(path.join(dir,'manifest.json'));
  const config=readJSON(path.join(dir,'config.json'));
  if(!Array.isArray(manifest.shots)||!manifest.shots.length)throw new Error('Empty manifest');
  const shots=[...manifest.shots].sort((a,b)=>a.start-b.start);
  for(let i=0;i<shots.length;i++){
    assertShot(shots[i]);
    if(i&&shots[i].start<shots[i-1].start+shots[i-1].duration-.02)
      throw new Error('Overlapping shots: '+shots[i].id);
  }
  const duration=Math.max(...shots.map(s=>s.start+s.duration));
  if(duration>90||duration<.1)throw new Error('Video duration must be 0–90 seconds');
  if(config.aspect!=='9:16')throw new Error('This studio accepts vertical 9:16 only');
  if(!['midnight','ember','arctic','ink'].includes(config.style))throw new Error('Unknown style');
  if(!['stick','block'].includes(config.rig))throw new Error('Unknown rig');
  return {dir,manifest:{...manifest,shots},config,duration};
}
export function enforceDataOnly(){
  if(!fs.existsSync(PROJECTS))return [];
  const errors=[];
  for(const entry of fs.readdirSync(PROJECTS,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const root=path.join(PROJECTS,entry.name);
    // Legacy HyperFrames projects belong to another pipeline and are unchanged.
    const configPath=path.join(root,'config.json');
    if(!fs.existsSync(configPath))continue;
    let marker;
    try{marker=readJSON(configPath).studio}catch{continue}
    if(marker!=='original-short-video-studio')continue;
    const stack=[root];
    while(stack.length){
      const dir=stack.pop();
      for(const item of fs.readdirSync(dir,{withFileTypes:true})){
        const full=path.join(dir,item.name);
        if(item.isDirectory()){if(!['node_modules','.git'].includes(item.name))stack.push(full);continue}
        if(/\.(mjs|cjs|js|jsx|tsx|ts|py|sh|html|css|wasm)$/i.test(item.name))
          errors.push(path.relative(ROOT,full));
      }
    }
  }
  return errors;
}
