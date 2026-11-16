// Durable, measured promotion of data-driven reusable assets and per-film knowledge.
import fs from 'node:fs';
import path from 'node:path';
import {STUDIO,ROOT,sha,mkdir} from './project.mjs';
import {TEMPLATE_NAMES} from './templates.mjs';

const permitted=/^[a-zA-Z0-9._/-]+$/;
function samePath(root,entry){
  if(!permitted.test(entry)||path.isAbsolute(entry))throw new Error('Invalid reusable asset path');
  const target=path.resolve(root,entry);
  if(!target.startsWith(root+path.sep))throw new Error('Asset must stay inside project');
  return target;
}
function appendIndex(record){
  const dest=path.join(STUDIO,'INDEX.md');
  fs.appendFileSync(dest,'\n| '+record.name+' | '+record.signature+' | '+record.example+' |\n');
}
function promoteAsset(project,record){
  if(!record||typeof record!=='object')throw new Error('Promotion record missing');
  if(record.original!==true)throw new Error('Refusing to promote asset without original-authored declaration');
  if(!record.reusable)throw new Error('Asset is not marked reusable');
  const relative=record.asset;
  if(!relative.startsWith('assets/')||!/\.(json|svg|txt|wav)$/i.test(relative))
    throw new Error('Only original data/media assets under assets/ can be promoted');
  const source=samePath(project.dir,relative);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile())throw new Error('Promotion source missing');
  if(!/^[a-z0-9-]{3,60}$/.test(record.name))throw new Error('Invalid promotion name');
  const target=path.join(STUDIO,'lib','assets',record.name+path.extname(relative));
  mkdir(path.dirname(target));
  if(fs.existsSync(target)){
    if(sha(fs.readFileSync(source))!==sha(fs.readFileSync(target)))
      throw new Error('Existing library asset differs; rename instead of overwriting');
    return {name:record.name,existing:true};
  }
  fs.copyFileSync(source,target);
  appendIndex({name:record.name,signature:record.signature||'asset='+record.name,
    example:record.example||'reusable original asset'});
  return {name:record.name,existing:false};
}
export function promoteVideo(project,options={}){
  const out=project.out,slug=path.basename(project.dir);
  const film=path.join(out,'final.mp4'),verify=path.join(out,'verification.json');
  const statsFile=path.join(out,'render-stats.json');
  if(!fs.existsSync(film)||!fs.existsSync(verify)||!fs.existsSync(statsFile))
    throw new Error('Promote requires verified final film and measured render stats');
  const verification=JSON.parse(fs.readFileSync(verify,'utf8'));
  if(verification.status!=='pass')throw new Error('Refusing unverified promotion');
  const stats=JSON.parse(fs.readFileSync(statsFile,'utf8'));
  const shots=project.manifest.shots||[];
  const reused=shots.filter(s=>TEMPLATE_NAMES.includes(s.template)).length;
  const ratio=Math.round(100*reused/shots.length);
  const cached=(stats.stats||[]).filter(s=>s.reused===s.frames).length;
  const secs=Number(stats.totalRenderSeconds);
  if(!Number.isFinite(secs)||secs<0)throw new Error('Render seconds unavailable');
  const fingerprint=sha(JSON.stringify({manifest:project.manifest,config:project.config,
    promotions:project.manifest.promotions||[]}));
  const marker=path.join(out,'promotion.json');
  if(fs.existsSync(marker)&&JSON.parse(fs.readFileSync(marker,'utf8')).fingerprint===fingerprint)
    return {promoted:true,reused:true,ratio,seconds:secs};
  const indexAdditions=[];
  for(const record of project.manifest.promotions||[])
    indexAdditions.push(promoteAsset(project,record));
  const costFile=path.join(STUDIO,'COST.md');
  const history=fs.readFileSync(costFile,'utf8').split('\n').filter(x=>x.startsWith('| ')&&!x.includes('Video |')&&!x.includes('Setup only'));
  let comparison='First measured production run';
  if(history.length){
    const last=history.at(-1).split('|').map(x=>x.trim());
    const oldPercent=Number((last[3]||'').replace('%',''));
    const oldSeconds=Number(last[4]);
    if(Number.isFinite(oldPercent)&&Number.isFinite(oldSeconds)){
      comparison='Previous reuse '+oldPercent+'% => '+ratio+'%; render seconds '+oldSeconds+' => '+secs.toFixed(1);
      if(ratio<oldPercent||secs>oldSeconds)comparison+='; review template coverage/cache and scene complexity';
    }
  }
  fs.appendFileSync(costFile,'\n| '+slug+' | '+shots.length+' | '+ratio+'% | '+secs.toFixed(1)+
    ' | '+(options.tokens||'not tracked')+' | '+cached+' |\n');
  const lesson='- '+new Date().toISOString()+' / '+slug+': verified '+shots.length+
    ' shots, '+ratio+'% templates, '+secs.toFixed(1)+' render seconds, '+cached+
    ' fully cached shots; '+comparison+'. No unreported errors are assumed.\n';
  const lessonsFile=path.join(STUDIO,'LESSONS.md');
  const lessons=fs.readFileSync(lessonsFile,'utf8');
  const newline=lessons.indexOf('\n');
  fs.writeFileSync(lessonsFile,lessons.slice(0,newline+1)+'\n'+lesson+lessons.slice(newline+1));
  fs.appendFileSync(path.join(STUDIO,'STATUS.md'),'\n- '+new Date().toISOString()+
    ': '+slug+' promoted with '+ratio+'% template reuse, '+secs.toFixed(1)+' seconds; '+comparison+'.\n');
  const result={promoted:true,reused:false,ratio,seconds:secs,cached,comparison,indexAdditions,fingerprint};
  fs.writeFileSync(marker,JSON.stringify(result,null,2)+'\n');
  return result;
}
