// Browser-safe, data-only shot composition. No project code is evaluated.
import {clamp, ellipse, rounded, bitmapText} from './core.mjs';
import {groundDepthPosition, drawNightExterior, drawRoomInterior, drawAtmosphere, drawVignette} from './scenery.mjs';
import {drawFigure, EXPRESSIONS, blendExpression} from './characters.mjs';
import {drawDigitalClock} from './props.mjs';
import {HORROR_TEMPLATES} from './horror.mjs';
import catalog from './registry/catalog.json' with {type:'json'};
import {declarationEntry} from './declarative.mjs';

const number=(value=0,min=-Infinity,max=Infinity)=>({type:'number',default:value,min,max});
const bool=(value=false)=>({type:'boolean',default:value});
const string=(value='')=>({type:'string',default:value});
const entry=(params,draw,example={})=>({params,defaults:Object.fromEntries(Object.entries(params).map(([k,v])=>[k,v.default])),example,draw});
export const EASINGS=Object.freeze({
  linear:entry({},t=>t), in:entry({},t=>t*t), out:entry({},t=>1-(1-t)**2),
  inOut:entry({},t=>t*t*(3-2*t)), hold:entry({},()=>0)
});
export const SETS={
  yard:entry({seed:number(1),moon:bool(true),clouds:bool(true),fence:bool(true),tree:bool(true),stars:number(80,0,200)},(c,w,h,s,t,p)=>drawNightExterior(c,w,h,t,p)),
  'bedroom-window':entry({seed:number(1),curtains:bool(true),sill:bool(true),lightLevel:number(1,0,2)},(c,w,h,s,t,p)=>drawRoomInterior(c,w,h,t,p)),
  room:entry({lightLevel:number(1,0,2)},(c,w,h,s,t,p)=>drawRoomInterior(c,w,h,t,{...p,window:false,curtains:false,sill:false})),
  corridor:entry({figure:bool(false),blur:bool(false),light:string('cold')},HORROR_TEMPLATES['empty-hallway']),
  stairwell:entry({wet:bool(false),figure:bool(false)},HORROR_TEMPLATES.stairwell),
  void:entry({},()=>{})
};
// Local prop space: x=-.5..+.5, y=-1..0, origin at the feet/base.
export const PROPS={
  clock:entry({time:string('11:59'),color:string('#ff4d4d'),glow:number(1,0,2)},(c,w,h,s,t,p)=>drawDigitalClock(c,{x:0,y:-h/2,width:w,height:h,...p,t}),{time:'3:00'}),
  moon:entry({color:string('#d8e4f0')},(c,w,h,s,t,p)=>ellipse(c,0,-h/2,w/2,h/2,p.color)),
  sill:entry({color:string('#354354')},(c,w,h,s,t,p)=>rounded(c,-w/2,-h,w,h,2,p.color)),
  door:entry({color:string('#263444'),open:number(0,0,1)},(c,w,h,s,t,p)=>{rounded(c,-w/2,-h,w,h,2,'#03070b');rounded(c,-w/2,-h,w*(1-p.open),h,2,p.color);ellipse(c,w*(.3-p.open*.6),-h*.48,w*.025,w*.025,'#b7a777');}),
  lamp:entry({color:string('#e9c584'),on:bool(true)},(c,w,h,s,t,p)=>{rounded(c,-w*.035,-h*.7,w*.07,h*.7,1,'#5d6570');rounded(c,-w/2,-h,w,h*.35,3,p.on?p.color:'#333a46');}),
  window:entry({color:string('#8499af')},(c,w,h,s,t,p)=>{rounded(c,-w/2,-h,w,h,2,p.color);rounded(c,-w*.45,-h*.95,w*.9,h*.9,1,'#071422');rounded(c,-w*.025,-h,w*.05,h,0,p.color);rounded(c,-w/2,-h*.52,w,h*.04,0,p.color);}),
  curtains:entry({color:string('#5d2330'),open:number(.7,0,1)},(c,w,h,s,t,p)=>{const width=w*(.5-.4*p.open);rounded(c,-w/2,-h,width,h,3,p.color);rounded(c,w/2-width,-h,width,h,3,p.color);}),
  fence:entry({color:string('#24364b')},(c,w,h,s,t,p)=>{for(let i=0;i<9;i++)rounded(c,-w/2+i*w/9,-h,w*.045,h,1,p.color);rounded(c,-w/2,-h*.7,w,h*.1,0,p.color);}),
  tree:entry({color:string('#0c1826')},(c,w,h,s,t,p)=>{rounded(c,-w*.07,-h*.8,w*.14,h*.8,2,p.color);ellipse(c,0,-h*.7,w/2,h*.3,p.color);})
};
export const RIGS=Object.fromEntries(['stick','block','silhouette'].map(id=>[id,entry({},drawFigure,{rig:id})]));
export const FX={
  dust:entry({amount:number(16,0,200),seed:number(1)},(c,w,h,s,t,p)=>drawAtmosphere(c,w,h,t,{dust:p.amount,fog:0,seed:p.seed,color:s.fog})),
  fog:entry({amount:number(.1,0,1),seed:number(1)},(c,w,h,s,t,p)=>drawAtmosphere(c,w,h,t,{dust:0,fog:p.amount,seed:p.seed,color:s.fog})),
  rain:entry({amount:number(35,0,200),seed:number(1)},(c,w,h,s,t,p)=>{c.strokeStyle=s.fog;c.globalAlpha*=.3;c.lineWidth=w/500;c.beginPath();for(let i=0;i<p.amount;i++){const x=((i*137+p.seed*17)%997)/997*w,y=((i*83+t*400)%h);c.moveTo(x,y);c.lineTo(x-w*.015,y+h*.025);}c.stroke();}),
  vignette:entry({amount:number(.5,0,1)},(c,w,h,s,t,p)=>drawVignette(c,w,h,p.amount)),
  flash:entry({amount:number(0,0,1),color:string('#ffffff')},(c,w,h,s,t,p)=>{c.globalAlpha*=p.amount;c.fillStyle=p.color;c.fillRect(0,0,w,h);}),
  glow:entry({amount:number(.15,0,1),color:string('#a9cee9')},(c,w,h,s,t,p)=>{const g=c.createRadialGradient(w/2,h*.4,0,w/2,h*.4,w*.7);g.addColorStop(0,p.color);g.addColorStop(1,'transparent');c.globalAlpha*=p.amount;c.fillStyle=g;c.fillRect(0,0,w,h);})
};
export const RECIPE_REGISTRIES={sets:SETS,props:PROPS,rigs:RIGS,fx:FX,easings:EASINGS};
for(const [kind,entries] of Object.entries(catalog))for(const [id,data] of Object.entries(entries)){
  if(Object.hasOwn(RECIPE_REGISTRIES[kind],id))throw Error('Registry id collision '+id);
  RECIPE_REGISTRIES[kind][id]=declarationEntry(data);
}
const poses=['stand','walk','look','flinch','still','idle','run','fear'];
const actorFields=['id','rig','color','pos','scale','layer','keys','pose','expression','look','blink','talk','blend'];
const propFields=['id','type','pos','scale','layer','state','keys'];
const cameraFields=['x','y','zoom','rotation','blur'];
function object(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error(`${label} must be an object`);}
function known(value,registry,label){
  if(Object.hasOwn(registry,value))return;
  const ids=Object.keys(registry), score=s=>{const row=Array.from({length:s.length+1},(_,i)=>i);for(let i=0;i<String(value).length;i++){let prev=row[0];row[0]=i+1;for(let j=0;j<s.length;j++){const old=row[j+1];row[j+1]=Math.min(row[j]+1,old+1,prev+(String(value)[i]!==s[j]));prev=old;}}return row[s.length];};
  ids.sort((a,b)=>score(a)-score(b));throw Error(`Unknown ${label} "${value}"; did you mean "${ids[0]}"?`);
}
function fields(v,allowed,label){object(v,label);for(const k of Object.keys(v))known(k,Object.fromEntries(allowed.map(x=>[x,true])),`${label} field`);}
function finite(v,label,min=-Infinity,max=Infinity){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${label} must be finite in [${min}, ${max}]`);}
function params(v,meta,label){object(v,label);for(const [k,val] of Object.entries(v)){known(k,meta.params,label);const spec=meta.params[k];if(spec.type==='number')finite(val,`${label}.${k}`,spec.min,spec.max);else if(spec.type==='enum'){known(val,Object.fromEntries(spec.values.map(x=>[x,true])),`${label}.${k}`);}else if(!spec.type.split('|').includes(Array.isArray(val)?'array':typeof val)||val===null)throw Error(`${label}.${k} must be ${spec.type}`);}}
function keys(list,allowed,check,label){
  if(!Array.isArray(list))throw Error(`${label} must be an array`);
  let last=-1;
  for(const key of list){fields(key,['t','easing',...allowed],label);finite(key.t,`${label}.t`,0);if(key.t<=last)throw Error(`${label} times must strictly increase`);last=key.t;known(key.easing||'linear',EASINGS,'easing');check(key);}
}
export function worldPosition(pos={x:.5,depth:.5},scale=1,set='void'){
  // Phase 1 uses reversed depth; retain its contract for legacy projects.
  const window=set==='bedroom-window'||set==='preset:window-view';
  const p=groundDepthPosition(1-pos.depth,{x:pos.x,horizonY:window?.40:.38,groundY:window?.56:.80,minScale:window?.25:.55,maxScale:window?.45:1,scaleBase:scale});
  return {x:p.x,y:p.y,scale:p.scale};
}
function placement(item,actor,set){
  fields(item.pos,['x','depth'],'pos');finite(item.pos.x,'pos.x',0,1);finite(item.pos.depth,'pos.depth',0,1);finite(item.scale??1,'scale',.05,2);
  if(item.layer!==undefined)finite(item.layer,'layer',-100,100);
  const p=worldPosition(item.pos,item.scale??1,set),height=(actor?.32:.18)*p.scale,width=(actor?.24:.28)*p.scale;
  if(p.y>=.77)throw Error('Placement overlaps caption zone at 79%');
  if(p.x-width/2<.04||p.x+width/2>.96||p.y-height<.04)throw Error('Placement bounds outside safe area');
  if((set==='bedroom-window'||set==='preset:window-view')&&(p.x-width/2<.24||p.x+width/2>.76||p.y-height<.15||p.y>.58))throw Error('Placement overlaps window frame/sill');
}
function actorValues(a){
  if(a.pose!==undefined)known(a.pose,Object.fromEntries(poses.map(x=>[x,true])),'pose');
  if(a.expression!==undefined)known(a.expression,{...EXPRESSIONS,happy:true},'expression');
  if(a.look!==undefined){if(!Array.isArray(a.look)||a.look.length!==2)throw Error('look must be [x,y]');a.look.forEach(v=>finite(v,'look',-1,1));}
  if(a.blink!==undefined)finite(a.blink,'blink',0,1);
  if(a.talk!==undefined){if(typeof a.talk==='number')finite(a.talk,'talk',0,1);else{fields(a.talk,['amplitude','fps'],'talk');finite(a.talk.fps,'talk.fps',1,240);if(!Array.isArray(a.talk.amplitude)||!a.talk.amplitude.length)throw Error('talk.amplitude needs samples');a.talk.amplitude.forEach(v=>finite(v,'amplitude',0,1));}}
  if(a.blend!==undefined)finite(a.blend,'blend',0,2);
  if(a.color!==undefined&&(!/^#[0-9a-f]{6}$/i.test(a.color)))throw Error('color must be #rrggbb');
}
export function normalizeRecipe(input){
  const r=typeof input==='string'?JSON.parse(input):structuredClone(input);
  fields(r,['set','actors','props','camera','fx','cues'],'recipe');
  fields(r.set,['preset','params'],'set');known(r.set.preset,SETS,'set');r.set.params={...SETS[r.set.preset].defaults,...r.set.params};params(r.set.params,SETS[r.set.preset],'set.params');
  r.actors??=[];r.props??=[];r.fx??=[];r.cues??=[];
  for(const name of ['actors','props','fx','cues'])if(!Array.isArray(r[name]))throw Error(`${name} must be an array`);
  const ids=new Set();
  for(const a of r.actors){
    fields(a,actorFields,'actor');if(typeof a.id!=='string'||!a.id||ids.has(a.id))throw Error('Actor id must be unique and nonempty');ids.add(a.id);
    a.rig??='silhouette';known(a.rig,RIGS,'rig');a.pos??={x:.5,depth:.5};a.scale??=1;a.pose??='stand';a.expression??='neutral';a.color??='#8fb4e6';a.keys??=[];
    actorValues(a);placement(a,true,r.set.preset);keys(a.keys,actorFields.filter(x=>!['id','rig','keys'].includes(x)),k=>{actorValues(k);placement({...a,...k},true,r.set.preset);},'actor.keys');
  }
  for(const p of r.props){
    fields(p,propFields,'prop');known(p.type,PROPS,'prop');p.pos??={x:.5,depth:.5};p.scale??=1;p.state={...PROPS[p.type].defaults,...p.state};p.keys??=[];
    params(p.state,PROPS[p.type],'prop.state');placement(p,false,r.set.preset);keys(p.keys,['pos','scale','layer','state'],k=>{if(k.state)params(k.state,PROPS[p.type],'prop.state');placement({...p,...k},false,r.set.preset);},'prop.keys');
  }
  if(r.camera){fields(r.camera,['keys','shake'],'camera');const check=k=>{for(const f of cameraFields)if(k[f]!==undefined)finite(k[f],`camera.${f}`,f==='zoom'?.1:f==='blur'?0:-10,f==='blur'?40:10);};keys(r.camera.keys||[],cameraFields,check,'camera.keys');if(r.camera.shake){fields(r.camera.shake,['amount','decay'],'shake');finite(r.camera.shake.amount,'shake.amount',0,1);finite(r.camera.shake.decay??5,'shake.decay',0,50);}}
  for(const f of r.fx){fields(f,['type','params','keys'],'fx');known(f.type,FX,'fx');f.params={...FX[f.type].defaults,...f.params};params(f.params,FX[f.type],'fx.params');keys(f.keys||[],['params'],k=>{if(k.params)params(k.params,FX[f.type],'fx.params');},'fx.keys');}
  for(const c of r.cues){fields(c,['at','at_word','action','sfx','actor','duration'],'cue');if((c.at===undefined)===(c.at_word===undefined))throw Error('Cue needs exactly one of at or at_word');if(c.at!==undefined)finite(c.at,'cue.at',0);if(c.at_word!==undefined&&(typeof c.at_word!=='string'||!c.at_word.trim()))throw Error('at_word must be nonempty');if(c.action)known(c.action,{blink:1,flash:1,shake:1,pulse:1},'cue action');if(!c.action&&!c.sfx)throw Error('Cue needs action or sfx');if(c.actor&&!ids.has(c.actor))throw Error(`Unknown cue actor ${c.actor}`);}
  return r;
}
function interpolate(a,b,u){
  if(typeof a==='number'&&typeof b==='number')return a+(b-a)*u;
  if(Array.isArray(a)&&Array.isArray(b))return a.map((v,i)=>interpolate(v,b[i],u));
  if(a&&b&&typeof a==='object'&&typeof b==='object'){const out={...a};for(const k of Object.keys(b))out[k]=interpolate(a[k],b[k],u);return out;}
  return u>=1?b:a;
}
export function resolveKeys(base,keys=[],t=0){
  let state=structuredClone(base),previousTime=0;
  for(const key of keys){const {t:time,easing='linear',...patch}=key;const target=mergeRecipe(state,patch);if(t<time){const u=clamp((t-previousTime)/Math.max(.000001,time-previousTime),0,1);return {state:interpolate(state,target,EASINGS[easing].draw(u))};}state=target;previousTime=time;}
  return {state};
}
export function mergeRecipe(base,patch){
  const result=structuredClone(base);for(const [k,v] of Object.entries(patch||{})){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe data key');result[k]=v&&typeof v==='object'&&!Array.isArray(v)&&result[k]&&typeof result[k]==='object'&&!Array.isArray(result[k])?mergeRecipe(result[k],v):structuredClone(v);}return result;
}
export function resolveRecipe(recipe,t=0){
  return {set:recipe.set,actors:recipe.actors.map(a=>resolveActor(a,t)),props:recipe.props.map(p=>resolveKeys(p,p.keys,t).state),fx:recipe.fx.map(f=>resolveKeys(f,f.keys,t).state),camera:resolveKeys({x:0,y:0,zoom:1,rotation:0,blur:0},recipe.camera?.keys,t).state,cues:recipe.cues};
}
export function resolveActor(actor,t){
  const state=resolveKeys(actor,actor.keys,t).state;
  const channel=(field,initial,convert)=>{
    let from=convert(initial),to=from,start=0,duration=0,easing='linear';
    const sample=at=>interpolate(from,to,duration?EASINGS[easing].draw(clamp((at-start)/duration,0,1)):1);
    for(const key of actor.keys){if(key.t>t)break;if(key[field]===undefined)continue;from=sample(key.t);to=convert(key[field]);start=key.t;duration=key.t===0?0:(key.blend??actor.blend??.15);easing=key.easing||'inOut';}
    return sample(t);
  };
  state.expression=channel('expression',actor.expression,v=>blendExpression(v,v,1));
  state.poseWeights=channel('pose',actor.pose,v=>Object.fromEntries(poses.map(p=>[p,p===v?1:0])));
  if(state.talk!==undefined){const a=state.talk;state.expression.mouthOpen=typeof a==='number'?a:(a.amplitude[Math.floor(t*a.fps)]??0);}
  return state;
}
export function drawRecipe(ctx,w,h,s,t,recipe,context={}){
  const r=resolveRecipe(recipe,t),cam=r.camera;
  if(recipe.camera?.shake){const q=recipe.camera.shake,env=q.amount*Math.exp(-(q.decay??5)*t);cam.x+=Math.sin(t*49)*env;cam.y+=Math.cos(t*43)*env;}
  ctx.save();ctx.translate(w/2+cam.x*w,h/2+cam.y*h);ctx.rotate(cam.rotation);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-w/2,-h/2);if(cam.blur)ctx.filter=`blur(${cam.blur*w/720}px)`;
  SETS[r.set.preset].draw(ctx,w,h,s,t,{...r.set.params,duration:context.duration,seed:r.set.params.seed??context.seed,cues:context.cues});
  const items=[...r.actors.map(a=>({...a,actor:true})),...r.props].sort((a,b)=>a.pos.depth-b.pos.depth||(a.layer||0)-(b.layer||0));
  for(const item of items){const p=worldPosition(item.pos,item.scale,r.set.preset);ctx.save();if(item.actor){let blink=item.blink;for(const cue of context.cues||[]){if(cue.action==='blink'&&(!cue.actor||cue.actor===item.id)){const dt=t-cue.localTime,d=cue.duration||.16;if(dt>=0&&dt<d)blink=Math.sin(Math.PI*dt/d);}}drawFigure(ctx,{x:p.x*w,y:p.y*h,height:.28*p.scale*h,rig:item.rig,pose:item.pose,poseWeights:item.poseWeights,expression:item.expression,gaze:{x:item.look?.[0]||0,y:item.look?.[1]||0},blink,phase:t,dressColor:item.color});}else{ctx.translate(p.x*w,p.y*h);PROPS[item.type].draw(ctx,.28*p.scale*w,.18*p.scale*h,s,t,item.state);}ctx.restore();}
  for(const f of r.fx){ctx.save();FX[f.type].draw(ctx,w,h,s,t,f.params);ctx.restore();}ctx.restore();
}
