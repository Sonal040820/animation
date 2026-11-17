// Deterministic Chromium capture, parallel page pool, engine-hash caching, and labelled contact sheet.
// Integrated Three.js/WebGL2 and Canvas2D in headless Chromium; software GPU supported.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {ROOT,STUDIO,loadProject,sha,mkdir,readJSON} from './project.mjs';
import {TEMPLATE_NAMES} from './templates.mjs';
import {validateProject} from './validate.mjs';

const LIB=path.dirname(fileURLToPath(import.meta.url));
const contentTypes={
  '.html':'text/html; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8'
};

export const invoke=(file,args,opts={})=>execFileSync(file,args,{
  encoding:'utf8',
  stdio:['ignore','pipe','pipe'],
  timeout:opts.timeout||600000,
  maxBuffer:4*1024*1024,
  ...opts
});

export function pythonExecutable(){
  return process.env.PYTHON||(process.platform==='win32'?'python':'python3');
}

export function engineHash(libDir=LIB){
  const registryDir=path.join(libDir,'registry');
  const registry=fs.existsSync(registryDir)?fs.readdirSync(registryDir).filter(n=>n.endsWith('.json')).sort().map(n=>n+':'+sha(fs.readFileSync(path.join(registryDir,n)))).join('\n'):'';
  const files=fs.readdirSync(libDir,{withFileTypes:true})
    .filter(e=>e.isFile()&&/\.(mjs|json|html)$/i.test(e.name))
    .map(e=>e.name)
    .sort();
  const combined=files.map(name=>{
    const data=fs.readFileSync(path.join(libDir,name));
    return name+':'+sha(data);
  }).join('\n');
  const lock=path.join(libDir,'../package-lock.json');
  return sha(combined+registry+(fs.existsSync(lock)?sha(fs.readFileSync(lock)):''));
}

export function browserExecutable(){
  const candidates=[process.env.CHROMIUM_PATH,chromium.executablePath(),'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
  for(const p of candidates)if(p&&fs.existsSync(p))return p;
  throw new Error('CHROMIUM_MISSING: run npx playwright install --with-deps chromium or set CHROMIUM_PATH');
}

async function server(){
  const listener=http.createServer((req,res)=>{
    const name=decodeURIComponent((req.url||'/').split('?')[0]).slice(1);
    if(!name||name.includes('..')||!/\.(html|mjs|js|json)$/.test(name)){
      res.writeHead(404);res.end();return;
    }
    const vendor=['vendor/three.module.js','vendor/three.core.js'].includes(name);
    const target=vendor?path.join(STUDIO,'node_modules/three/build',path.basename(name)):path.resolve(LIB,name);
    if(!vendor&&!target.startsWith(LIB+path.sep)){res.writeHead(403);res.end();return}
    try{
      const data=fs.readFileSync(target);
      res.writeHead(200,{'Content-Type':contentTypes[path.extname(target)],'Cache-Control':'no-store'});
      res.end(data);
    }catch{res.writeHead(404);res.end()}
  });
  await new Promise((resolve,reject)=>listener.once('error',reject).listen(0,'127.0.0.1',resolve));
  return {listener,url:'http://127.0.0.1:'+listener.address().port+'/player.html'};
}

export async function withBrowserPool(poolSize,task){
  const count=Math.max(1,Math.min(4,poolSize||os.cpus().length||2));
  const {listener,url}=await server();
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:browserExecutable(),args:[
      '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader',
      '--enable-unsafe-swiftshader','--disable-background-networking',
      ...(process.env.STUDIO_SOFTWARE_CANVAS==='1'?['--disable-accelerated-2d-canvas']:[])
    ]});
    const pages=await Promise.all(Array.from({length:count},async ()=>{
      const page=await browser.newPage({viewport:{width:400,height:720},deviceScaleFactor:1});
      await page.goto(url,{waitUntil:'load'});
      await page.waitForFunction(()=>Boolean(window.studioReady),{timeout:30000});
      return page;
    }));
    return await task(pages);
  }finally{
    if(browser)await browser.close();
    await new Promise(r=>listener.close(()=>r()));
  }
}

export async function withBrowser(task){
  return await withBrowserPool(1,async pages=>await task(pages[0]));
}

async function capture(page,shot,config,t,words,file){
  const b64=await page.evaluate(({shot,config,t,words})=>{
    window.renderStudioFrame(shot,config,t,words);
    return document.getElementById('screen').toDataURL('image/png').slice('data:image/png;base64,'.length);
  },{shot,config,t,words});
  const image=Buffer.from(b64,'base64');
  mkdir(path.dirname(file));
  fs.writeFileSync(file,image);
  if(image.length<400)throw new Error('Empty screenshot '+file);
}

export function dimensions(quality='preview'){
  if(quality==='draft')return {width:270,height:480,fps:12};
  if(quality==='preview')return {width:432,height:768,fps:24};
  if(quality==='standard')return {width:720,height:1280,fps:24};
  if(quality==='high')return {width:1080,height:1920,fps:24};
  throw new Error('Unknown quality '+quality);
}

function wordsFor(project){
  const p=path.join(project.dir,'timeline','words.json');
  return fs.existsSync(p)?readJSON(p).words||[]:[];
}

export async function sheet(projectRef,quality='draft'){
  const validation=validateProject(projectRef);
  if(!validation.valid){
    throw new Error('Validation failed before sheet: '+validation.errors.map(e=>e.message||e).join('; '));
  }
  const project=loadProject(projectRef),size=dimensions(quality);
  const out=path.join(STUDIO,'out',path.basename(project.dir));
  const dir=path.join(out,'sheet-frames');mkdir(dir);
  const sheetFile=path.join(out,'contact-sheet.png');
  const words=wordsFor(project),n=project.manifest.shots.length;
  const cols=Math.min(4,n),rows=Math.ceil(n/cols);
  const poolCount=Math.min(4,os.cpus().length||2,n);
  await withBrowserPool(poolCount,async pages=>{
    const images=new Array(n);
    const labels=new Array(n);
    let nextIdx=0;
    await Promise.all(pages.map(async page=>{
      while(true){
        const i=nextIdx++;
        if(i>=n)break;
        const shot=project.manifest.shots[i];
        const local=shot.duration*.5;
        const absTime=+(shot.start+local).toFixed(1);
        const file=path.join(dir,'shot_'+String(i).padStart(3,'0')+'.png');
        await capture(page,shot,{...project.config,...size},local,words,file);
        images[i]=fs.readFileSync(file).toString('base64');
        labels[i]={
          id:String(shot.id||('s'+String(i+1).padStart(2,'0'))),
          template:String(shot.template||''),
          time:`${shot.start.toFixed(1)}-${(shot.start+shot.duration).toFixed(1)}S`
        };
      }
    }));
    // Compose the ENTIRE contact sheet deterministically with bitmapText labels from core.mjs.
    const base64=await pages[0].evaluate(async ({images,labels,cols,rows})=>{
      const ww=180,hh=320,pad=12,margin=8;
      const board=document.createElement('canvas');
      board.width=cols*(ww+pad)+margin;
      board.height=rows*(hh+pad)+margin;
      const ctx=board.getContext('2d',{alpha:false});
      ctx.fillStyle='#080d17';ctx.fillRect(0,0,board.width,board.height);
      const drawLabel=window.studioBitmapText;
      for(let i=0;i<images.length;i++){
        const image=new Image();
        image.src='data:image/png;base64,'+images[i];
        await image.decode();
        const x=margin+(i%cols)*(ww+pad),y=margin+Math.floor(i/cols)*(hh+pad);
        ctx.drawImage(image,x,y,ww,hh);
        ctx.fillStyle='#db7683';ctx.fillRect(x,y,Math.max(2,Math.floor(ww*.015)),14);
        // Label strip at bottom of tile with shot id + template + time
        const stripH=30;
        ctx.fillStyle='rgba(5, 8, 15, 0.86)';
        ctx.fillRect(x,y+hh-stripH,ww,stripH);
        const lbl=labels[i]||{id:'S'+(i+1),template:'',time:''};
        if(typeof drawLabel==='function'){
          drawLabel(ctx,`${lbl.id} ${lbl.time}`,x+ww/2,y+hh-stripH+4,1.6,'#f7e5da',ww-8);
          drawLabel(ctx,lbl.template,x+ww/2,y+hh-13,1.5,'#63d9f8',ww-8);
        }
      }
      return board.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },{images,labels,cols,rows});
    fs.writeFileSync(sheetFile,Buffer.from(base64,'base64'));
  });
  if(!fs.existsSync(sheetFile)||fs.statSync(sheetFile).size<1000)
    throw new Error('Contact sheet creation failed');
  return {out:sheetFile,shots:n};
}

export async function smoke(){
  const out=path.join(STUDIO,'.cache','template-smoke');mkdir(out);
  const sz={width:144,height:256};
  const poolCount=Math.min(4,os.cpus().length||2,TEMPLATE_NAMES.length);
  await withBrowserPool(poolCount,async pages=>{
    let nextIdx=0;
    await Promise.all(pages.map(async page=>{
      while(true){
        const i=nextIdx++;
        if(i>=TEMPLATE_NAMES.length)break;
        const shot={id:'smoke_'+i,template:TEMPLATE_NAMES[i],start:0,duration:2,seed:100+i,
          params:{text:'TEST',value:'11:59',expression:'scared'}};
        await capture(page,shot,{style:'midnight',rig:'block',...sz},1,[],path.join(out,'template_'+String(i).padStart(2,'0')+'.png'));
      }
    }));
  });
  return {templates:TEMPLATE_NAMES.length,dir:out};
}

export async function render(projectRef,quality='preview'){
  const validation=validateProject(projectRef);
  if(!validation.valid){
    throw new Error('Validation failed before render: '+validation.errors.map(e=>e.message||e).join('; '));
  }
  const project=loadProject(projectRef),size=dimensions(quality);
  const slug=path.basename(project.dir),out=path.join(STUDIO,'out',slug);
  const frames=path.join(out,'frames');mkdir(frames);
  const logFile=path.join(out,'render-log.jsonl');
  fs.writeFileSync(logFile,'');
  const words=wordsFor(project);
  const engHash=process.env.STUDIO_SOFTWARE_CANVAS==='1'?sha(engineHash()+':software-canvas'):engineHash();
  const stats=[];
  const shots=project.manifest.shots;
  const shotFrameCounts=shots.map(s=>Math.max(1,Math.round(s.duration*size.fps)));
  const shotBaseFrames=[];
  let totalFrames=0;
  for(const fc of shotFrameCounts){
    shotBaseFrames.push(totalFrames);
    totalFrames+=fc;
  }

  // Clean up any stale frames beyond totalFrames from earlier renders
  for(const existing of fs.readdirSync(frames)){
    const m=existing.match(/^frame_(\d+)\.png$/);
    if(m&&Number(m[1])>=totalFrames){
      try{fs.unlinkSync(path.join(frames,existing))}catch{}
    }
  }

  const poolSize=Math.min(4,os.cpus().length||2);
  await withBrowserPool(poolSize,async pages=>{
    for(let sIdx=0;sIdx<shots.length;sIdx++){
      const shot=shots[sIdx];
      const frameCount=shotFrameCounts[sIdx];
      const baseFrame=shotBaseFrames[sIdx];
      const digest=sha(JSON.stringify({shot,config:project.config,size,words,engine:engHash}));
      const cache=path.join(STUDIO,'.cache','shots',slug,digest);
      mkdir(cache);
      const start=Date.now();
      let reused=0;
      const uncachedIndices=[];
      for(let j=0;j<frameCount;j++){
        const cached=path.join(cache,String(j).padStart(5,'0')+'.png');
        if(fs.existsSync(cached)&&fs.statSync(cached).size>400){
          reused++;
        }else{
          uncachedIndices.push(j);
        }
      }
      if(uncachedIndices.length>0){
        let cursor=0;
        const activePages=pages.slice(0,Math.min(pages.length,uncachedIndices.length));
        await Promise.all(activePages.map(async page=>{
          while(true){
            const k=cursor++;
            if(k>=uncachedIndices.length)break;
            const j=uncachedIndices[k];
            const local=j/size.fps;
            const cached=path.join(cache,String(j).padStart(5,'0')+'.png');
            await capture(page,shot,{...project.config,...size},local,words,cached);
          }
        }));
      }
      // Copy frames in strict deterministic order into frames/
      for(let j=0;j<frameCount;j++){
        const cached=path.join(cache,String(j).padStart(5,'0')+'.png');
        const dest=path.join(frames,'frame_'+String(baseFrame+j).padStart(5,'0')+'.png');
        fs.copyFileSync(cached,dest);
      }
      const seconds=+((Date.now()-start)/1000).toFixed(3);
      const shotStat={
        id:shot.id,
        template:shot.template,
        frames:frameCount,
        reused,
        rendered:frameCount-reused,
        seconds,
        digest
      };
      stats.push(shotStat);
      const logRecord={
        slug,
        quality,
        id:shot.id,
        template:shot.template,
        start:shot.start,
        duration:shot.duration,
        frames:frameCount,
        reused,
        rendered:frameCount-reused,
        cacheHit:reused===frameCount,
        digest,
        engineHash:engHash,
        seconds,
        timestamp:new Date().toISOString()
      };
      fs.appendFileSync(logFile,JSON.stringify(logRecord)+'\n');
    }
  });

  const mp4=path.join(out,'video_silent.mp4');
  invoke('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(size.fps),
    '-start_number','0','-i',path.join(frames,'frame_%05d.png'),'-c:v','libx264','-preset','medium',
    '-crf',quality==='high'?'18':'21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{timeout:600000});
  if(!fs.existsSync(mp4)||fs.statSync(mp4).size<2500)throw new Error('Render did not produce MP4');
  const report={
    quality,
    size,
    frames:totalFrames,
    engineHash:engHash,
    poolSize,
    stats,
    totalRenderSeconds:+stats.reduce((a,x)=>a+x.seconds,0).toFixed(3),
    builtAt:new Date().toISOString()
  };
  fs.writeFileSync(path.join(out,'render-stats.json'),JSON.stringify(report,null,2)+'\n');
  return {mp4,report};
}
