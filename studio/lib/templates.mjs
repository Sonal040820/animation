// Template-only shots: every visual element is drawn from code. Stateless frame API.
import {clamp,ease,noise,drawBackground,ellipse,rounded,stroke,viewport,bitmapText,projection3D,caption,style} from './core.mjs';
import {drawCharacter} from './characters.mjs';
import {HORROR_TEMPLATES} from './horror.mjs';
import {STYLE_GRADE} from './styles.mjs';
export const TEMPLATE_NAMES=Object.freeze([
  'wide-establishing','window-view','character-medium','giant-face',
  'insert-macro-clock','data-card','3d-orbit','title-card',
  ...Object.keys(HORROR_TEMPLATES)
]);
function building(ctx,w,h,s,t){
  ctx.fillStyle=s.wall;
  ctx.fillRect(0,h*.35,w,h*.65);
  for(let i=0;i<5;i++){
    const x=(i*.25+.08)*w,y=h*(.46+.05*Math.sin(i));
    rounded(ctx,x,y,w*.09,h*.24,9,s.bg);
    rounded(ctx,x+5,y+5,w*.09-10,h*.24-10,6,'#101620');
  }
}
function window(ctx,w,h,s,t,girl=true){
  const x=w*.23,y=h*.28,bw=w*.54,bh=h*.42;
  rounded(ctx,x-11,y-11,bw+22,bh+22,12,s.wall);
  rounded(ctx,x,y,bw,bh,6,'#050a13');
  ellipse(ctx,x+bw*.69,y+bh*.26,bw*.13,bw*.13,'#c2cbdf');
  if(girl){
    drawCharacter(ctx,{x:x+bw*.50+Math.sin(t*.7)*3,y:y+bh*.88,scale:Math.min(w,h)/520,
      color:'#303b51',rig:'stick',expression:'neutral',phase:0,rim:'#8cc5ff'});
  }
  stroke(ctx,[x+bw/2,y],[x+bw/2,y+bh],w*.018,s.wall);
  stroke(ctx,[x,y+bh*.50],[x+bw,y+bh*.50],w*.018,s.wall);
}
function clock(ctx,w,h,s,t,params){
  const cx=w/2,cy=h*.47,r=Math.min(w*.28,h*.22);
  ellipse(ctx,cx,cy,r+12,r+12,s.rim);
  ellipse(ctx,cx,cy,r,r,s.shade);
  for(let n=0;n<12;n++){
    const a=n*Math.PI/6-Math.PI/2;
    stroke(ctx,[cx+Math.cos(a)*r*.8,cy+Math.sin(a)*r*.8],
        [cx+Math.cos(a)*r*.91,cy+Math.sin(a)*r*.91],3,s.text);
  }
  const midnight=params?.time==='00:01'||t>1.4;
  const min=midnight?1:59;
  const ma=min/60*Math.PI*2-Math.PI/2;
  const ha=(midnight?0:11.999)/12*Math.PI*2-Math.PI/2;
  stroke(ctx,[cx,cy],[cx+Math.cos(ha)*r*.45,cy+Math.sin(ha)*r*.45],9,s.text);
  stroke(ctx,[cx,cy],[cx+Math.cos(ma)*r*.73,cy+Math.sin(ma)*r*.73],5,s.accent);
  ellipse(ctx,cx,cy,6,6,s.accent);
  bitmapText(ctx,midnight?'12:01':'11:59',w/2,h*.71,w*.013,s.text,w*.82);
}
function face(ctx,w,h,s,t,params){
  drawCharacter(ctx,{x:w/2,y:h*.80,scale:Math.min(w,h)/300,
    rig:params?.rig||'block',expression:params?.expression||'scared',
    color:params?.color||s.accent,phase:t,rim:s.rim});
}
function card(ctx,w,h,s,t,params){
  rounded(ctx,w*.11,h*.31,w*.78,h*.38,22,s.wall);
  const title=String(params?.text||'THE CLOCK');
  bitmapText(ctx,title,w/2,h*.41,Math.min(10,w*.014),s.text,w*.66);
  const value=String(params?.value||'11:59');
  bitmapText(ctx,value,w/2,h*.55,Math.min(14,w*.017),s.accent,w*.70);
}
function orbit(ctx,w,h,s,t){
  const theta=t*.43;
  const center=[w/2,h*.48];
  const vertices=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
   .map(([x,y,z])=>{const p=projection3D(x,y,z,theta,Math.min(w,h)*.15);return [center[0]+p[0],center[1]+p[1]]});
  ctx.fillStyle=s.wall;
  for(const f of [[0,1,2,3],[1,5,6,2],[4,5,6,7]]){
    ctx.beginPath();ctx.moveTo(...vertices[f[0]]);for(const i of f.slice(1))ctx.lineTo(...vertices[i]);ctx.closePath();ctx.fill();
  }
  for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])
    stroke(ctx,vertices[a],vertices[b],Math.max(2,w*.005),s.rim);
}
function title(ctx,w,h,s,t,params){
  ellipse(ctx,w*.5,h*.4,w*.19,w*.19,s.accent);
  bitmapText(ctx,String(params?.text||'NIGHT'),w/2,h*.60,Math.max(5,w*.02),s.text,w*.78);
}
const TEMPLATES={
 'wide-establishing':(ctx,w,h,s,t,p)=>{building(ctx,w,h,s,t);ellipse(ctx,w*.76,h*.16,28,28,'#d8b5ba')},
 'window-view':(ctx,w,h,s,t,p)=>{building(ctx,w,h,s,t);window(ctx,w,h,s,t,p?.girl!==false)},
 'character-medium':(ctx,w,h,s,t,p)=>face(ctx,w,h,s,t,p),
 'giant-face':(ctx,w,h,s,t,p)=>face(ctx,w,h,s,t,{...p,expression:p?.expression||'scared'}),
 'insert-macro-clock':(ctx,w,h,s,t,p)=>clock(ctx,w,h,s,t,p),
 'data-card':(ctx,w,h,s,t,p)=>card(ctx,w,h,s,t,p),
 '3d-orbit':(ctx,w,h,s,t,p)=>orbit(ctx,w,h,s,t),
 'title-card':(ctx,w,h,s,t,p)=>title(ctx,w,h,s,t,p),
  ...HORROR_TEMPLATES
};
export function drawStudioFrame(canvas,shot,config,seconds=0,words=[]){
  const ctx=canvas.getContext('2d',{alpha:false});
  const w=canvas.width,h=canvas.height;
  const s=style(config.style||'midnight');
  ctx.save();drawBackground(ctx,w,h,s,seconds,shot.seed||1);
  ctx.save();viewport(ctx,w,h,seconds,shot.camera||'push');
  TEMPLATES[shot.template](ctx,w,h,s,seconds,shot.params||{});
  ctx.restore();
  // A data-driven vignette and subtle bloom wash, applied below captions.
  const grade=STYLE_GRADE[config.style||'midnight'];
  if(grade){
    ctx.save();
    const v=ctx.createRadialGradient(w*.5,h*.46,w*.16,w*.5,h*.47,Math.max(w,h)*.74);
    v.addColorStop(0,'rgba(0,0,0,0)');
    v.addColorStop(1,'rgba(0,0,0,'+grade.vignette+')');
    ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
    ctx.restore();
    ctx.save();ctx.globalAlpha=grade.bloom*.11;
    const bloom=ctx.createRadialGradient(w*.75,h*.23,0,w*.75,h*.23,w*.65);
    bloom.addColorStop(0,s.accent);bloom.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=bloom;ctx.fillRect(0,0,w,h);ctx.restore();
  }
  ctx.save();caption(ctx,w,h,words,seconds+(shot.start||0),s);ctx.restore();
  const grain=noise((shot.seed||1)*8971+Math.floor(seconds*24));
  ctx.save();ctx.globalAlpha=s.grain;
  for(let i=0;i<Math.min(110,Math.floor(w*h/4800));i++){
    ctx.fillStyle=grain()>.5?'#ffffff':'#000000';
    ctx.fillRect(grain()*w,grain()*h,1,1);
  }
  ctx.restore();ctx.restore();
}
export function assertShot(shot){
  if(!TEMPLATE_NAMES.includes(shot.template))throw new Error('Unknown template '+shot.template);
  if(!Number.isFinite(shot.start)||!Number.isFinite(shot.duration)||shot.duration<=0)
    throw new Error('Invalid shot time');
  if(shot.duration>30)throw new Error('Single shot cannot exceed 30 seconds');
}
