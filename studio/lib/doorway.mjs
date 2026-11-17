// Original Canvas2D doorway study; geometry, light and hand share one hinge model.
import {clamp,ease,ellipse,stroke} from './core.mjs';
import {drawFigure} from './characters.mjs';
export function doorwayState(t,{openStart=1.05,openDuration=1.45}={}){
  const opening=ease(clamp((t-openStart)/openDuration,0,1));
  const reach=ease(clamp((t-.25)/.65,0,1));
  const release=ease(clamp((t-2.55)/.45,0,1));
  return {opening,reach:reach*(1-release),recoil:ease(clamp((t-2.7)/.5,0,1)),edge:.22+.31*Math.cos(opening*1.22),bottom:.69+opening*.065};
}
export function drawDoorway(c,w,h,s,t,p){
  const q=doorwayState(t,p);
  c.save();c.scale(w,h);
  const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const wall=c.createLinearGradient(0,0,1,.7);wall.addColorStop(0,'#111e2a');wall.addColorStop(.65,'#24313a');wall.addColorStop(1,'#493b32');c.fillStyle=wall;c.fillRect(0,0,1,1);
  poly([[0,.69],[1,.69],[1,1],[0,1]],'#18212a');
  for(const x of [-.5,0,.5,1,1.5]){c.strokeStyle='#33404a';c.lineWidth=.0015;c.beginPath();c.moveTo(.37+(x-.37)*.2,.69);c.lineTo(x,1);c.stroke();}
  for(const y of [.77,.89]){c.fillStyle='#293640';c.fillRect(0,y,1,.002);}
  c.fillStyle='#09121b';c.fillRect(0,.673,1,.017);c.fillStyle='#56606a';c.fillRect(0,.67,1,.003);
  // Recess, jambs and threshold ground the door in the wall.
  c.fillStyle='#080e15';c.fillRect(.195,.165,.365,.535);
  const outside=c.createLinearGradient(0,.18,0,.70);outside.addColorStop(0,'#102739');outside.addColorStop(.65,'#477082');outside.addColorStop(1,'#7c9aa3');c.fillStyle=outside;c.fillRect(.22,.19,.31,.50);
  poly([[.22,.49],[.53,.49],[.53,.69],[.22,.69]],'#3b515c');
  c.fillStyle='#1c3545';c.fillRect(.25,.22,.013,.29);c.fillRect(.45,.19,.018,.34);
  // Opening projects a widening cold patch across the interior floor.
  c.globalAlpha=q.opening*.48;
  const spill=c.createLinearGradient(0,.69,0,1);spill.addColorStop(0,'#b6dce5');spill.addColorStop(1,'#42647a00');
  poly([[.23,.69],[.53,.69],[.98,.98],[.12,.98]],spill);c.globalAlpha=1;
  c.fillStyle='#58636b';c.fillRect(.195,.165,.025,.535);c.fillRect(.53,.165,.025,.535);c.fillRect(.195,.165,.36,.025);
  poly([[.195,.695],[.555,.695],[.58,.713],[.18,.713]],'#7b8587');
  poly([[.22,.19],[q.edge,.19+q.opening*.04],[q.edge,q.bottom],[.22,.69]],'#34414a');
  poly([[.235,.21],[q.edge-.015,.21+q.opening*.04],[q.edge-.015,q.bottom-.025],[.235,.67]],'#29343f');
  c.strokeStyle='#62717a';c.lineWidth=.003;c.beginPath();c.moveTo(q.edge,.19+q.opening*.04);c.lineTo(q.edge,q.bottom);c.stroke();
  const handle={x:q.edge-.027,y:.475+q.opening*.035};
  c.fillStyle='#9b8e72';c.fillRect(handle.x-.018,handle.y,.034,.006);
  // Warm practical on the right contrasts with the cool doorway.
  const lamp=c.createRadialGradient(.86,.32,0,.86,.32,.34);lamp.addColorStop(0,'#e1a95d40');lamp.addColorStop(1,'#d59b4b00');c.fillStyle=lamp;c.fillRect(.52,0,.48,.7);
  c.fillStyle='#bda47e';c.fillRect(.84,.29,.045,.045);c.fillStyle='#f4d3a0';c.fillRect(.845,.30,.035,.02);
  c.restore();
  const x=(.66+q.recoil*.025)*w,y=.735*h,height=.43*h;
  const resting={x:x-height*.038,y:y-height*.42};
  const target={x:resting.x+(handle.x*w-resting.x)*q.reach,y:resting.y+(handle.y*h-resting.y)*q.reach};
  drawFigure(c,{x,y,height,variant:'adult',rig:'silhouette',facing:-1,expression:'suspicious',expressionTo:'scared',expressionMix:q.recoil,phase:t,pose:'stand',handTarget:target,dressColor:'#334858',bodyColor:'#101e2b',rimColor:'#9dbfca',rimSide:'left',gaze:{x:-1,y:0}});
  // Sparse dust only in the doorway light; no full-frame bright bubbles.
  c.save();c.globalAlpha=.15*q.opening;for(let i=0;i<9;i++)ellipse(c,(.25+((i*.073+t*.007)%.27))*w,(.25+((i*.061+t*.012)%.40))*h,.0009*w,.0009*w,'#d5e6e9');c.restore();
}
