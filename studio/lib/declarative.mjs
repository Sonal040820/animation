// Bounded JSON drawing language. No URLs, scripts, callbacks or evaluation.
import {bitmapText} from './core.mjs';
const fields={polygon:['type','points','fill'],arc:['type','x','y','rx','ry','start','end','fill'],gradient:['type','from','to','stops'],text:['type','x','y','text','size','fill']};
const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v);
function unit(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;}
function point(v){return Array.isArray(v)&&v.length===2&&v.every(unit);}
export function validateDeclaration(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Declaration must be an object');
  for(const key of Object.keys(data))if(!['id','kind','primitives','description'].includes(key))throw Error('Unknown declaration field '+key);
  if(!/^[a-z][a-z0-9-]{2,59}$/.test(data.id)||!['sets','props','fx'].includes(data.kind))throw Error('Invalid registry id/kind');
  if(!Array.isArray(data.primitives)||!data.primitives.length||data.primitives.length>128)throw Error('Use 1..128 declarative primitives');
  for(const p of data.primitives){
    if(!p||!Object.hasOwn(fields,p.type))throw Error('Only polygons, arcs, gradients and text are allowed');
    for(const k of Object.keys(p))if(!fields[p.type].includes(k))throw Error('Unknown primitive field '+k);
    if(p.type!=='gradient'&&!color(p.fill))throw Error('Primitive fill must be hex color');
    if(p.type==='polygon'&&(!Array.isArray(p.points)||p.points.length<3||p.points.length>64||!p.points.every(point)))throw Error('Invalid polygon points');
    if(p.type==='arc'&&(!['x','y','rx','ry'].every(k=>unit(p[k]))||![p.start,p.end].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Math.PI*2)))throw Error('Invalid arc');
    if(p.type==='text'&&(!unit(p.x)||!unit(p.y)||!unit(p.size)||typeof p.text!=='string'||p.text.length>80))throw Error('Invalid text');
    if(p.type==='gradient'&&(!point(p.from)||!point(p.to)||!Array.isArray(p.stops)||p.stops.length<2||p.stops.length>16||!p.stops.every(s=>Array.isArray(s)&&s.length===2&&unit(s[0])&&color(s[1]))))throw Error('Invalid gradient');
  }
  return {declaration:structuredClone(data)};
}
export function declarationEntry(data){
  validateDeclaration(data);
  return {params:{},defaults:{},example:{},declarative:true,draw(c,w,h){
    c.save();if(data.kind==='props')c.translate(-w/2,-h);
    c.beginPath();c.rect(0,0,w,h);c.clip();
    for(const p of data.primitives){
      c.fillStyle=p.fill||'#000000';
      if(p.type==='polygon'){c.beginPath();p.points.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();c.fill();}
      if(p.type==='arc'){c.beginPath();c.ellipse(p.x*w,p.y*h,p.rx*w,p.ry*h,0,p.start,p.end);c.fill();}
      if(p.type==='text')bitmapText(c,p.text,p.x*w,p.y*h,Math.max(1,p.size*w),p.fill,w);
      if(p.type==='gradient'){const g=c.createLinearGradient(p.from[0]*w,p.from[1]*h,p.to[0]*w,p.to[1]*h);for(const [at,color] of p.stops)g.addColorStop(at,color);c.fillStyle=g;c.fillRect(0,0,w,h);}
    }c.restore();
  }};
}
