// Deterministic Chromium capture, still-sheet smoke, and per-shot hash caching.
// Browser is headless software Canvas2D; no GPU, remote model, asset CDN or fonts.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {ROOT,STUDIO,loadProject,sha,mkdir,readJSON} from './project.mjs';
import {TEMPLATE_NAMES} from './templates.mjs';
const LIB=path.dirname(fileURLToPath(import.meta.url));
const contentTypes={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8'};
export const invoke=(file,args,opts={})=>execFileSync(file,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:opts.timeout||600000,maxBuffer:1024*1024,...opts});
export function browserExecutable(){
  const candidates=[process.env.CHROMIUM_PATH,chromium.executablePath(),'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
  for(const p of candidates)if(p&&fs.existsSync(p))return p;
  throw new Error('CHROMIUM_MISSING: run npx playwright install --with-deps chromium or set CHROMIUM_PATH');
}
async function server(){
  const listener=http.createServer((req,res)=>{
    const name=decodeURIComponent((req.url||'/').split('?')[0]).slice(1);
    if(!name||name.includes('..')||!/\.(html|mjs|js)$/.test(name)){
      res.writeHead(404);res.end();return;
    }
    const target=path.resolve(LIB,name);
    if(!target.startsWith(LIB+path.sep)){res.writeHead(403);res.end();return}
    try{
      const data=fs.readFileSync(target);
      res.writeHead(200,{'Content-Type':contentTypes[path.extname(target)],'Cache-Control':'no-store'});
      res.end(data);
    }catch{res.writeHead(404);res.end()}
  });
  await new Promise((resolve,reject)=>listener.once('error',reject).listen(0,'127.0.0.1',resolve));
  return {listener,url:'http://127.0.0.1:'+listener.address().port+'/player.html'};
}
export async function withBrowser(task){
  const {listener,url}=await server();
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:browserExecutable(),args:[
      '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader',
      '--enable-unsafe-swiftshader','--disable-background-networking'
    ]});
    const page=await browser.newPage({viewport:{width:400,height:720},deviceScaleFactor:1});
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>Boolean(window.studioReady),{timeout:30000});
    return await task(page);
  }finally{
    if(browser)await browser.close();
    await new Promise(r=>listener.close(()=>r()));
  }
}
async function capture(page,shot,config,t,words,file){
  await page.evaluate(({shot,config,t,words})=>window.renderStudioFrame(shot,config,t,words),{shot,config,t,words});
  const image=await page.locator('#screen').screenshot({type:'png'});
  mkdir(path.dirname(file));fs.writeFileSync(file,image);
  if(image.length<400)throw new Error('Empty screenshot '+file);
}
export function dimensions(quality='preview'){
  if(quality==='draft')return {width:270,height:480,fps:12};
  if(quality==='preview')return {width:405,height:720,fps:24};
  if(quality==='standard')return {width:720,height:1280,fps:24};
  if(quality==='high')return {width:1080,height:1920,fps:24};
  throw new Error('Unknown quality '+quality);
}
function wordsFor(project){
  const p=path.join(project.dir,'timeline','words.json');
  return fs.existsSync(p)?readJSON(p).words||[]:[];
}
export async function sheet(projectRef,quality='draft'){
  const project=loadProject(projectRef),size=dimensions(quality);
  const out=path.join(STUDIO,'out',path.basename(project.dir));
  const dir=path.join(out,'sheet-frames');mkdir(dir);
  const sheetFile=path.join(out,'contact-sheet.png');
  const words=wordsFor(project),n=project.manifest.shots.length;
  const cols=Math.min(4,n),rows=Math.ceil(n/cols);
  await withBrowser(async page=>{
    const images=[];
    for(let i=0;i<n;i++){
      const shot=project.manifest.shots[i];
      const local=shot.duration*.5;
      const file=path.join(dir,'shot_'+String(i).padStart(3,'0')+'.png');
      await capture(page,shot,{...project.config,...size},local,words,file);
      images.push(fs.readFileSync(file).toString('base64'));
    }
    // Compose the ENTIRE contact sheet using the already running pinned browser.
    // FFmpeg tile with -frames:v 1 produced only the first still on some runners.
    const base64=await page.evaluate(async ({images,cols,rows})=>{
      const ww=180,hh=320,pad=12,margin=8;
      const board=document.createElement('canvas');
      board.width=cols*(ww+pad)+margin;
      board.height=rows*(hh+pad)+margin;
      const ctx=board.getContext('2d',{alpha:false});
      ctx.fillStyle='#080d17';ctx.fillRect(0,0,board.width,board.height);
      for(let i=0;i<images.length;i++){
        const image=new Image();
        image.src='data:image/png;base64,'+images[i];
        await image.decode();
        const x=margin+(i%cols)*(ww+pad),y=margin+Math.floor(i/cols)*(hh+pad);
        ctx.drawImage(image,x,y,ww,hh);
        ctx.fillStyle='#db7683';ctx.fillRect(x,y,Math.max(2,Math.floor(ww*.015)),14);
      }
      return board.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },{images,cols,rows});
    fs.writeFileSync(sheetFile,Buffer.from(base64,'base64'));
  });
  if(!fs.existsSync(sheetFile)||fs.statSync(sheetFile).size<1000)
    throw new Error('Contact sheet creation failed');
  return {out:sheetFile,shots:n};
}
export async function smoke(){
  const out=path.join(STUDIO,'.cache','template-smoke');mkdir(out);
  const sz={width:144,height:256};
  await withBrowser(async page=>{
    for(let i=0;i<TEMPLATE_NAMES.length;i++){
      const shot={id:'smoke_'+i,template:TEMPLATE_NAMES[i],start:0,duration:2,seed:100+i,
        params:{text:'TEST',value:'11:59',expression:'scared'}};
      await capture(page,shot,{style:'midnight',rig:'block',...sz},1,[],path.join(out,'template_'+String(i).padStart(2,'0')+'.png'));
    }
  });
  return {templates:TEMPLATE_NAMES.length,dir:out};
}
export async function render(projectRef,quality='preview'){
  const project=loadProject(projectRef),size=dimensions(quality);
  const slug=path.basename(project.dir),out=path.join(STUDIO,'out',slug);
  const frames=path.join(out,'frames');mkdir(frames);
  const words=wordsFor(project);
  const stats=[];
  let n=0;
  await withBrowser(async page=>{
    for(const shot of project.manifest.shots){
      const frameCount=Math.max(1,Math.round(shot.duration*size.fps));
      const digest=sha(JSON.stringify({shot,config:project.config,size,words,engine:'0.1.0'}));
      const cache=path.join(STUDIO,'.cache','shots',slug,digest);
      mkdir(cache);
      const start=Date.now();let reused=0;
      for(let j=0;j<frameCount;j++){
        const local=j/size.fps;
        const cached=path.join(cache,String(j).padStart(5,'0')+'.png');
        if(fs.existsSync(cached)&&fs.statSync(cached).size>400)reused++;
        else await capture(page,shot,{...project.config,...size},local,words,cached);
        fs.copyFileSync(cached,path.join(frames,'frame_'+String(n++).padStart(5,'0')+'.png'));
      }
      stats.push({id:shot.id,template:shot.template,frames:frameCount,reused,seconds:(Date.now()-start)/1000});
    }
  });
  const mp4=path.join(out,'video_silent.mp4');
  invoke('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(size.fps),
    '-start_number','0','-i',path.join(frames,'frame_%05d.png'),'-c:v','libx264','-preset','medium',
    '-crf',quality==='high'?'18':'21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{timeout:600000});
  if(!fs.existsSync(mp4)||fs.statSync(mp4).size<2500)throw new Error('Render did not produce MP4');
  const report={quality,size,frames:n,stats,totalRenderSeconds:stats.reduce((a,x)=>a+x.seconds,0),builtAt:new Date().toISOString()};
  fs.writeFileSync(path.join(out,'render-stats.json'),JSON.stringify(report,null,2));
  return {mp4,report};
}
