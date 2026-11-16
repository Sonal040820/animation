// Reusable original-code psychological horror shot templates.
// Every background, face, intercom, corridor and reflection is rendered with Canvas2D.
// No images, model meshes, proprietary effects or externally downloaded art.
import {ellipse,stroke,rounded,bitmapText,noise,clamp,ease,pulse} from './core.mjs';
import {drawCharacter} from './characters.mjs';

function line(ctx,x1,y1,x2,y2,c,width=2){
  ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function glow(ctx,x,y,r,color,alpha=.5){
  ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();
}
function perspective(ctx,w,h,vx,vy){
  ctx.save();
  ctx.fillStyle='#0e1521';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#182637';ctx.beginPath();
  ctx.moveTo(0,0);ctx.lineTo(vx,vy);ctx.lineTo(vx,h*.90);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
  ctx.fillStyle='#101925';ctx.beginPath();ctx.moveTo(w,0);ctx.lineTo(vx,vy);
  ctx.lineTo(vx,h*.9);ctx.lineTo(w,h);ctx.closePath();ctx.fill();
  const gg=ctx.createLinearGradient(0,vy,0,h);gg.addColorStop(0,'#263746');gg.addColorStop(1,'#070e16');
  ctx.fillStyle=gg;ctx.beginPath();ctx.moveTo(vx,vy);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
  line(ctx,0,0,vx,vy,'#394352',2);line(ctx,w,0,vx,vy,'#2f4557',2);
  line(ctx,0,h,vx,vy,'#273848',3);line(ctx,w,h,vx,vy,'#1e303e',3);
  for(let i=1;i<6;i++){
    let f=i/7,y=vy+(h-vy)*f*f;
    line(ctx,0,y,w,y,'#405263',Math.max(1,i*.3));
  }
  ctx.restore();
}
function bulb(ctx,w,h,t,color='#edb98b'){
  const x=w*.5,y=h*.23;
  glow(ctx,x,y,w*.42,color,.21+Math.sin(t*1.35)*.045);
  line(ctx,x,0,x,y-14,'#627687',3);
  ellipse(ctx,x,y,7,10,color);
}
function woman(ctx,w,h,t,{x=w*.5,y=h*.78,scale=1,ghost=false}={}){
  ctx.save();
  ctx.globalAlpha=ghost?.65:1;
  const sw=Math.min(w/380,h/650)*scale;
  drawCharacter(ctx,{x,y,scale:sw*1.75,color:ghost?'#293b53':'#42617a',
     rig:'block',expression:'scared',phase:t*.35,rim:ghost?'#8b9abf':'#69abc4'});
  ctx.restore();
}
export function intercomMacro(ctx,w,h,s,t,params={}){
  const left=w*.12,top=h*.23,ww=w*.76,hh=h*.55;
  glow(ctx,w*.75,h*.40,w*.8,'#7b94ba',.1);
  ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=35;
  rounded(ctx,left-9,top-9,ww+18,hh+20,24,'#070b12');
  const metal=ctx.createLinearGradient(left,top,left+ww,top+hh);
  metal.addColorStop(0,'#465164');metal.addColorStop(.5,'#151e2a');metal.addColorStop(1,'#374452');
  rounded(ctx,left,top,ww,hh,17,metal);ctx.restore();
  rounded(ctx,left+ww*.08,top+hh*.12,ww*.84,hh*.24,7,'#090f1a');
  glow(ctx,w*.5,top+hh*.25,w*.37,'#c53f51',.29);
  bitmapText(ctx,params.display||'2:17',w*.5,top+hh*.21,Math.min(12,w*.023),'#f46b74',ww*.74);
  for(let i=0;i<7;i++)for(let j=0;j<6;j++){
    const ax=left+ww*(.24+i*.086),ay=top+hh*(.45+j*.071);
    ellipse(ctx,ax,ay,3.7,2.1,'#060c12');
  }
  const led=t%2<1.8?'#da4654':'#27111c';
  ellipse(ctx,left+ww*.82,top+hh*.86,7,7,led);
  glow(ctx,left+ww*.82,top+hh*.86,25,led,.3);
  if(params.signal){
    ctx.save();ctx.globalAlpha=.1+.08*Math.sin(t*12);
    for(let j=0;j<4;j++)line(ctx,left+ww*.16,top+hh*(.13+j*.026),left+ww*.84,top+hh*(.13+j*.026),'#f15b5c',2);
    ctx.restore();
  }
}
export function emptyHallway(ctx,w,h,s,t,params={}){
  perspective(ctx,w,h,w*.50,h*.47);
  const vx=w*.5,vy=h*.47;
  for(let side of [-1,1])for(let k=0;k<4;k++){
    const z=Math.pow((4-k)/4,1.9);
    const x=vx+side*w*(.2+.24*z),yy=vy+h*(.05+.28*z);
    const dw=w*(.024+.11*z),dh=h*(.03+.26*z);
    rounded(ctx,x-side*dw,yy-dh,dw,dh,2,side<0?'#0b131e':'#142333');
    line(ctx,x-side*dw,yy-dh,x,yy-dh,side<0?'#405064':'#33475a',2);
    ellipse(ctx,x-side*dw*.24,yy-dh*.40,2.2,2.2,'#d5b28e');
  }
  glow(ctx,vx,vy,w*.23,'#7393b6',.19);
  bulb(ctx,w,h,t);
  const strip=1.0+Math.sin(t*5.5)*.16;
  ctx.save();ctx.globalAlpha=.6*strip;
  line(ctx,vx,vy+h*.05,vx,vy+h*.37,'#c0d4da',2);ctx.restore();
  if(params.figure){
    ctx.save();ctx.globalAlpha=params.blur?.45:.70;
    woman(ctx,w,h,t,{x:vx+Math.sin(t*.5)*2,y:vy+h*.13,scale:.36,ghost:true});
    ctx.restore();
  }
  if(params.light==='flicker'){
    ctx.save();ctx.globalAlpha=.16*Number(Math.sin(t*15)>0);
    ctx.fillStyle='#d3e2ee';ctx.fillRect(0,0,w,h);ctx.restore();
  }
}
export function doorClose(ctx,w,h,s,t,params={}){
  const x=w*.17,y=h*.10,dw=w*.66,dh=h*.87;
  const g=ctx.createLinearGradient(x,0,x+dw,0);
  g.addColorStop(0,'#060c15');g.addColorStop(.2,'#263546');g.addColorStop(.72,'#131d2b');g.addColorStop(1,'#060b11');
  rounded(ctx,x-14,y-10,dw+28,dh+20,5,'#0b1520');
  rounded(ctx,x,y,dw,dh,3,g);
  rounded(ctx,x+dw*.12,y+dh*.06,dw*.76,dh*.38,3,'#233347');
  rounded(ctx,x+dw*.12,y+dh*.50,dw*.76,dh*.37,3,'#1c2c3e');
  for(let yy of [y+dh*.06,y+dh*.50]){
    line(ctx,x+dw*.12,yy,x+dw*.88,yy,'#526476',2);
  }
  ellipse(ctx,x+dw*.78,y+dh*.49,7,7,'#c4a782');
  ellipse(ctx,x+dw*.72,y+dh*.45,4,4,'#080d12');
  glow(ctx,x+dw*.72,y+dh*.45,30,'#cc8f77',.12);
  if(params.knocks){
    const cx=x+dw*.63,cy=y+dh*.44;
    for(let i=0;i<3;i++){
      const phase=(t*.75+i*.1)%1,opacity=.25*(1-phase);
      ctx.save();ctx.globalAlpha=opacity;ctx.strokeStyle='#f7d4af';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx,cy,14+phase*60,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  if(params.smile){
    ctx.save();ctx.globalAlpha=.50+Math.sin(t)*.09;
    line(ctx,x+dw*.42,y+dh*.32,x+dw*.58,y+dh*.32,'#b5c0c2',4);
    ctx.restore();
  }
}
export function mirrorDouble(ctx,w,h,s,t,params={}){
  const x=w*.10,y=h*.09,rw=w*.80,rh=h*.77;
  rounded(ctx,x-12,y-14,rw+24,rh+28,16,'#060b13');
  const grad=ctx.createLinearGradient(0,y,0,y+rh);
  grad.addColorStop(0,'#273c4e');grad.addColorStop(.5,'#081421');grad.addColorStop(1,'#1e3243');
  rounded(ctx,x,y,rw,rh,9,grad);
  ctx.save();ctx.beginPath();ctx.rect(x,y,rw,rh);ctx.clip();
  const jitter=Number(params.double)*Math.sin(t*7)*w*.005;
  woman(ctx,w,h,t*.7,{x:w*.49+jitter,y:h*.73,scale:1.30,ghost:params.double});
  // The reflection's eyes do not blink with the real narrator.
  if(params.double){
    glow(ctx,w*.43+jitter,h*.41,w*.045,'#efb2b0',.24);
    glow(ctx,w*.56+jitter,h*.41,w*.045,'#efb2b0',.24);
  }
  ctx.restore();
  for(let i=0;i<5;i++){
    ctx.save();ctx.globalAlpha=.06;
    line(ctx,x+rw*.1,y+rh*(i+1)/6,x+rw*.92,y+rh*(i+1)/6,'#bbd9e9',1);
    ctx.restore();
  }
}
export function bedroomShadow(ctx,w,h,s,t,params={}){
  const x=w*.14,y=h*.09,dw=w*.72,dh=h*.83;
  rounded(ctx,x,y,dw,dh,4,'#1b2737');
  const open=w*.26+Math.sin(t*.45)*w*.014;
  rounded(ctx,x+open,y+dh*.06,dw-open-15,dh*.88,3,'#03070c');
  glow(ctx,x+open+18,y+dh*.54,w*.29,'#c98669',.14);
  ctx.save();ctx.globalAlpha=.74;
  ellipse(ctx,x+open+dw*.16,y+dh*.38,w*.07,h*.08,'#101a26');
  rounded(ctx,x+open+dw*.09,y+dh*.46,w*.16,h*.37,13,'#101a26');
  ctx.restore();
  line(ctx,x+open,y+dh*.05,x+open,y+dh*.92,'#73899a',3);
  if(params.light==='flicker'&&Math.sin(t*13)>0.5)glow(ctx,w*.61,h*.52,w*.5,'#bfa999',.11);
}
export function stairwell(ctx,w,h,s,t,params={}){
  ctx.fillStyle='#0d1723';ctx.fillRect(0,0,w,h);
  const vanX=w*.52,vanY=h*.21;
  glow(ctx,vanX,vanY,w*.35,'#85b9c7',.15);
  for(let i=0;i<9;i++){
    const f=i/9,yy=vanY+h*.79*f*f;
    const half=w*(.06+.65*f);
    ctx.fillStyle=i%2===0?'#233444':'#192936';
    ctx.beginPath();ctx.moveTo(vanX-half,yy);ctx.lineTo(vanX+half,yy);
    ctx.lineTo(vanX+half+w*.04,yy+h*.07*f);ctx.lineTo(vanX-half-w*.04,yy+h*.07*f);
    ctx.closePath();ctx.fill();
    line(ctx,vanX-half,yy,vanX+half,yy,'#577184',Math.max(1,f*3));
    if(params.wet)line(ctx,vanX-half*.6,yy+1,vanX+half*.2,yy+1,'#8dabb9',Math.max(1,f*.9));
  }
  line(ctx,w*.07,h*.1,w*.22,h,'#5e7d8d',7);
  line(ctx,w*.90,h*.08,w*.79,h,'#506c82',7);
  for(let i=0;i<11;i++){
    const rnd=noise(203+i),xx=rnd()*w;
    ctx.save();ctx.globalAlpha=.09;stroke(ctx,[xx,0],[xx+8,h],'#adcbd9',1);ctx.restore();
  }
  if(params.figure)woman(ctx,w,h,t,{x:w*.5,y:h*.62,scale:.55,ghost:true});
}
export function doorPeephole(ctx,w,h,s,t,params={}){
  ctx.fillStyle='#02060a';ctx.fillRect(0,0,w,h);
  const cx=w/2,cy=h*.45,r=w*.46;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
  perspective(ctx,w,h,cx,cy*.65);
  glow(ctx,cx,h*.36,w*.34,'#d4a482',.27);
  if(params.figure)woman(ctx,w,h,t,{x:cx+Math.sin(t*.5)*6,y:h*.75,scale:1.27,ghost:true});
  ctx.restore();
  ctx.strokeStyle='#8d796c';ctx.lineWidth=w*.035;
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.save();ctx.globalAlpha=.65;
  const v=ctx.createRadialGradient(cx,cy,r*.1,cx,cy,r*1.2);
  v.addColorStop(0,'transparent');v.addColorStop(1,'#000');
  ctx.fillStyle=v;ctx.fillRect(0,0,w,h);ctx.restore();
}
export function keyholeView(ctx,w,h,s,t,params={}){
  ctx.fillStyle='#030508';ctx.fillRect(0,0,w,h);
  const x=w/2,y=h*.43,r=w*.20;
  ctx.save();
  ctx.beginPath();ctx.arc(x,y-r*.45,r,Math.PI,0);
  ctx.lineTo(x+r*.36,y+r*2.05);ctx.lineTo(x-r*.36,y+r*2.05);
  ctx.closePath();ctx.clip();
  const g=ctx.createLinearGradient(0,h*.16,0,h*.86);
  g.addColorStop(0,'#6a514f');g.addColorStop(1,'#1c2830');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  if(params.figure){
    woman(ctx,w,h,t,{x:w*.5,y:h*.79,scale:.93,ghost:false});
    if(params.smile)line(ctx,w*.47,h*.46,w*.53,h*.47,'#e3c0af',3);
  }
  ctx.restore();
  glow(ctx,w*.5,h*.47,w*.34,'#c0ad95',.15);
  ctx.strokeStyle='#968273';ctx.lineWidth=6;
  ctx.beginPath();ctx.arc(x,y-r*.45,r,Math.PI,0);ctx.lineTo(x+r*.36,y+r*2.05);
  ctx.lineTo(x-r*.36,y+r*2.05);ctx.closePath();ctx.stroke();
}
export const HORROR_TEMPLATES=Object.freeze({
 'intercom-macro':intercomMacro,
 'empty-hallway':emptyHallway,
 'door-close':doorClose,
 'mirror-double':mirrorDouble,
 'bedroom-shadow':bedroomShadow,
 'stairwell':stairwell,
 'door-peephole':doorPeephole,
 'keyhole-view':keyholeView
});
