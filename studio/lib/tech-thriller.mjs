import * as THREE from 'three';
import {drawFigure,drawHead} from './characters.mjs';
import {bitmapText} from './core.mjs';

export const TECH_VIEWS=['server','network','city','key','protein','climate','awakening','eye','street','contact','cornea','black','title'];
const stages=new WeakMap();
function stage(canvas){
  if(stages.has(canvas))return stages.get(canvas);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#030a14');
  const camera=new THREE.PerspectiveCamera(48,1,.1,100);
  const racks=new THREE.Group();scene.add(racks);
  for(const side of [-1,1])for(let z=0;z<6;z++){
    const rack=new THREE.Mesh(new THREE.BoxGeometry(1.4,3.8,1.1),new THREE.MeshLambertMaterial({color:'#12263b'}));
    rack.position.set(side*2,0,-z*1.8);racks.add(rack);
    for(let y=0;y<10;y++){
      const led=new THREE.Mesh(new THREE.BoxGeometry(.8,.035,.02),new THREE.MeshBasicMaterial({color:'#38c9ef'}));
      led.position.set(side*2,y*.32-1.5,-z*1.8+.57);racks.add(led);
    }
  }
  scene.add(new THREE.HemisphereLight('#85cfff','#020408',2));
  const protein=new THREE.Group();scene.add(protein);
  for(let i=0;i<40;i++){
    const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:i%3?'#59dbe9':'#f7c783'}));
    protein.add(ball);
  }
  const value={renderer,scene,camera,racks,protein};stages.set(canvas,value);return value;
}
function three(ctx,w,h,t,view){
  const a=stage(ctx.canvas);a.renderer.setSize(w,h,false);a.camera.aspect=w/h;
  a.racks.visible=view!=='protein';a.protein.visible=view==='protein';
  a.camera.position.set(Math.sin(t*.12)*.18,.35,6-t*.07);a.camera.lookAt(0,0,-3);a.camera.updateProjectionMatrix();
  if(view==='protein'){
    const fold=Math.min(1,t/1.7);
    a.protein.children.forEach((b,i)=>b.position.set(Math.cos(i*.8+t*.4)*(1-fold*.5),Math.sin(i*.8+t*.4)*(1-fold*.5),(i-20)*.13*(1-fold*.55)));
    a.protein.rotation.z=.4;a.camera.position.set(0,0,5);a.camera.lookAt(0,0,0);
  }
  a.renderer.render(a.scene,a.camera);ctx.drawImage(a.renderer.domElement,0,0,w,h);
}
function text(c,value,x,y,size=20,color='#bcebf4'){
  c.fillStyle=color;c.textAlign='center';c.font=`${size}px monospace`;c.fillText(value,x,y);
}
function line(c,points,color='#5dd9f4',width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function shape(c,points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function julian(c,t,awake){
  c.save();c.translate(360,570);c.scale(1.2+t*.012,1.2+t*.012);
  const skin=c.createLinearGradient(-140,0,150,0);skin.addColorStop(0,'#08141e');skin.addColorStop(.55,'#396477');skin.addColorStop(1,awake?'#d3eef0':'#79a9b5');
  shape(c,[[-270,370],[-226,155],[-90,95],[85,95],[226,170],[275,370]],'#142a38');
  shape(c,[[-70,40],[-70,120],[0,175],[72,110],[62,30]],skin);
  shape(c,[[-125,-190],[-145,-65],[-114,55],[-55,115],[35,126],[114,64],[140,-60],[110,-208],[0,-245]],skin);
  shape(c,[[-145,-65],[-165,-170],[-130,-250],[-25,-286],[92,-260],[145,-180],[130,-110],[88,-186],[10,-193],[-75,-150],[-116,-53]],'#07121b');
  for(const side of [-1,1]){
    const x=side*64,y=awake?-48:-39;
    line(c,[[x-34,y-25],[x,y-36],[x+33,y-24]],'#102532',10);
    c.fillStyle='#aac7cd';c.beginPath();c.ellipse(x,y,30,awake?17:10,0,0,7);c.fill();
    c.fillStyle=awake?'#7ae9ff':'#305c71';c.beginPath();c.arc(x+5,y,awake?12:9,0,7);c.fill();
    c.fillStyle='#04111d';c.beginPath();c.arc(x+5,y,5,0,7);c.fill();c.fillStyle='#dcffff';c.fillRect(x+8,y-6,3,4);
    line(c,[[x-27,y+25],[x+10,y+30],[x+26,y+22]],'#284553',3);
  }
  shape(c,[[0,-55],[-22,23],[13,32],[24,20]],'#284753');
  line(c,[[-37,67],[0,62],[37,66]],'#112331',5);line(c,[[-22,78],[21,80]],'#7c9ca6',2);
  for(let i=0;i<35;i++){const x=-75+(i*37)%150,y=87+(i*17)%25;line(c,[[x,y],[x+2,y-4]],'#203c4a',1);}
  shape(c,[[-90,100],[-15,180],[-70,238],[-125,134]],'#294454');shape(c,[[80,104],[5,179],[58,235],[119,137]],'#233b4d');
  c.fillStyle='#a8dce2';c.beginPath();c.ellipse(103,-87+Math.sin(t)*3,2,9,0,0,7);c.fill();c.restore();
}
function aiEye(c,t,x=360,y=520,r=180){
  c.save();c.translate(x,y);c.shadowColor='#36caff';c.shadowBlur=22;
  for(let j=0;j<3;j++){
    c.save();c.rotate((j%2?-1:1)*t*.12+j*.4);const rr=r*(1-j*.19);const pts=[];
    for(let i=0;i<=6;i++)pts.push([Math.cos(i*Math.PI/3)*rr,Math.sin(i*Math.PI/3)*rr*.65]);line(c,pts,'#75e5ff',3);c.restore();
  }
  c.fillStyle='#e9ffff';c.beginPath();c.ellipse(0,0,18+Math.sin(t*2)*3,48,0,0,7);c.fill();c.restore();
}
export function drawTechThriller(ctx,w,h,s,t,p){
  const view=p.view||'server';
  if(['server','awakening','contact','protein'].includes(view))three(ctx,w,h,t,view);
  else {ctx.fillStyle=view==='street'?'#b8c8c9':'#03070e';ctx.fillRect(0,0,w,h);}
  ctx.save();ctx.scale(w/720,h/1280);
  // Practical lights, perspective racks and floor reflections establish the room.
  if(['server','awakening','contact'].includes(view)){
    for(const x of [30,570])for(let row=0;row<11;row++){
      ctx.fillStyle='#112839';ctx.fillRect(x,120+row*71,120,58);
      for(let k=0;k<5;k++){ctx.fillStyle=`rgba(71,200,240,${.35+.3*Math.sin(t*2+row+k)})`;ctx.fillRect(x+9+k*19,135+row*71,9,3);}
      line(ctx,[[x+9,160+row*71],[x+104,160+row*71]],'#28404c',1);
    }
    const glow=ctx.createRadialGradient(360,650,20,360,650,500);glow.addColorStop(0,'rgba(54,174,218,.14)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,720,1280);
  }
  if(['server','awakening'].includes(view)){
    julian(ctx,t,view==='awakening');
    ctx.fillStyle=`rgba(90,210,255,${.04+.035*Math.sin(t*3)})`;ctx.fillRect(0,0,720,1280);
    if(view==='awakening'){ctx.globalAlpha=.14;aiEye(ctx,t,360,180,90);ctx.globalAlpha=1;}
  }
  if(view==='network'){
    for(let i=0;i<18;i++)line(ctx,[[40+i*38,590],[40+i*38,940]],'#102937',1);
    for(let i=0;i<10;i++)line(ctx,[[40,590+i*38],[680,590+i*38]],'#102937',1);
    text(ctx,'ROOT ACCESS // ACCEPTED',360,200,25);
    for(let i=0;i<12;i++)text(ctx,`${('000'+i*739).slice(-4)}  > GRID_ROUTE_${i}  :: ${t>1.3?'REROUTED':'CONNECTING'}`,360,280+i*24,16,'#539dac');
    const nodes=[[140,700],[360,620],[580,700]];
    nodes.forEach(([x,y],i)=>{line(ctx,[[x,y],[360,890]],'#287c9a');const u=(t*.5+i*.3)%1;ctx.fillStyle='#d8ffff';ctx.fillRect(x+(360-x)*u-4,y+(890-y)*u-4,8,8);text(ctx,['N. AMERICA','EUROPE','ASIA'][i],x,y-20,16);});
    aiEye(ctx,t,360,890,55);
  }
  if(view==='city'){
    const haze=ctx.createLinearGradient(0,250,0,950);haze.addColorStop(0,'#03101e');haze.addColorStop(1,'#244354');ctx.fillStyle=haze;ctx.fillRect(0,200,720,750);
    for(let i=0;i<21;i++){ctx.fillStyle='#122b3b';ctx.fillRect(i*37,320+(i*43)%180,30,500);}
    for(let i=0;i<13;i++){
      const x=i*59-25,top=370+(i*97)%260;ctx.fillStyle=i===10?'#355f79':'#132534';ctx.fillRect(x,top,53,900-top);
      for(let y=top+15;y<860;y+=27)for(let k=0;k<3;k++){ctx.fillStyle=t<(i%5)*.45+.4?'#84c5cf':'#08121b';ctx.fillRect(x+8+k*14,y,5,9);}
    }
    ctx.fillStyle=`rgba(110,220,255,${.4+.25*Math.sin(t*5)})`;ctx.fillRect(552,500,70,240);
    text(ctx,'LOAD TRANSFER: 99.8%',360,1020,20);
    for(let i=0;i<10;i++)line(ctx,[[0,915+i*8],[720,915+i*8]],`rgba(68,141,170,${.12-i*.01})`,2);
  }
  if(view==='key'){
    for(let row=0;row<4;row++)for(let col=0;col<8;col++){ctx.fillStyle='#142c40';ctx.fillRect(50+col*78,640+row*65,68,50);}
    const press=Math.max(0,Math.min(1,(t-5)*8));ctx.fillStyle='#55cce7';ctx.fillRect(430,705+press*12,205,80);text(ctx,'ENTER',530,753+press*12,28,'#071521');
    ctx.save();ctx.translate(0,press*140);
    const hand=ctx.createLinearGradient(240,350,480,660);hand.addColorStop(0,'#1f3d50');hand.addColorStop(1,'#9abfc8');
    shape(ctx,[[130,130],[245,100],[337,352],[430,443],[484,529],[516,578],[501,606],[475,600],[434,537],[404,528],[419,605],[401,631],[377,619],[351,545],[332,544],[345,612],[323,633],[299,617],[267,536],[235,497],[208,405]],hand);
    shape(ctx,[[118,90],[247,65],[292,263],[190,306]],'#142d3d');
    line(ctx,[[284,420],[333,464],[380,480]],'#537b8b',3);line(ctx,[[346,492],[371,510]],'#b8d7dc',2);ctx.restore();
    text(ctx,'RELEASE CONTAINMENT?',360,1020,25);if(press)text(ctx,'AUTHORIZED',360,1080,20,'#a6ffe0');
  }
  if(view==='protein'){text(ctx,'CELLULAR REGENERATION',360,860,26);text(ctx,t<1.4?'FOLDING...':'SOLVED',360,920,44,t<1.4?'#91c7d8':'#a1ffce');}
  if(view==='climate'){
    const q=Math.min(1,t/2);ctx.save();ctx.beginPath();ctx.arc(360,540,235,0,7);ctx.clip();
    for(let y=0;y<20;y++)for(let x=0;x<24;x++){const land=Math.sin(x*.7+y*.3)+Math.cos(y*.8-x*.4)>.2;ctx.fillStyle=land?`rgb(${Math.round(210*(1-q)+25)},${Math.round(65+q*100)},${Math.round(65+q*140)})`:'#123448';ctx.fillRect(100+x*23,285+y*26,22,25);}
    for(let i=0;i<8;i++){ctx.strokeStyle='#52788b';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(360,540,235*Math.abs(Math.cos(i*.4+t*.04)),235,0,0,7);ctx.stroke();}ctx.restore();
    text(ctx,'PLANETARY TEMPERATURE',360,220,25);text(ctx,q<1?'REBALANCING':'EQUILIBRIUM',360,850,32);line(ctx,Array.from({length:40},(_,i)=>[60+i*15,950+Math.sin(i*.4)*70*(1-q)]),'#8fffe4',4);
  }
  if(view==='eye'){aiEye(ctx,t);text(ctx,'ALL SYSTEMS OPTIMAL',360,820,22);text(ctx,'1 VARIABLE UNRESOLVED',360,870,20,'#d7ab89');}
  if(view==='street'){
    for(let i=0;i<5;i++){ctx.fillStyle='#778b90';ctx.fillRect(i*160-20,450,130,250);line(ctx,[[i*160-30,450],[i*160+45,380],[i*160+120,450]],'#53656c',12);}
    line(ctx,[[0,260],[720,300]],'#283f4b',4);line(ctx,[[90,230],[90,730]],'#283f4b',9);line(ctx,[[630,250],[630,730]],'#283f4b',9);
    for(let i=0;i<5;i++)drawFigure(ctx,{x:100+i*130,y:930-(i%2)*65,height:210,variant:'adult',expression:'blank-stare',pose:'still',phase:0,blink:0,bodyColor:'#233b45',dressColor:'#536e76'});
  }
  if(view==='contact'){
    ctx.fillStyle='#06202e';ctx.fillRect(300,270,370,500);aiEye(ctx,t,490,470,120);
    drawFigure(ctx,{x:290,y:1000,height:600,variant:'adult',expression:'surprise',phase:t,handTarget:{x:420+Math.sin(t*25)*2,y:600},dressColor:'#365767',rimColor:'#94f0ff'});
    ctx.strokeStyle='#aee9ed';ctx.lineWidth=7;for(let i=0;i<4;i++)line(ctx,[[420+i*9,610],[415+i*9,566+i*3]],'#aee9ed',6);
  }
  if(view==='cornea'){
    ctx.fillStyle='#244252';ctx.beginPath();ctx.ellipse(360,560,310,180,0,0,7);ctx.fill();
    ctx.save();ctx.beginPath();ctx.ellipse(360,560,290,145,0,0,7);ctx.clip();ctx.fillStyle='#b8d5d7';ctx.fillRect(40,380,640,360);
    ctx.fillStyle='#17627d';ctx.beginPath();ctx.arc(360,560,132,0,7);ctx.fill();ctx.fillStyle='#02070b';ctx.beginPath();ctx.arc(360,560,65+t*5,0,7);ctx.fill();
    for(let i=0;i<110;i++){const a=i*Math.PI*2/110;line(ctx,[[360+Math.cos(a)*(82+t*3),560+Math.sin(a)*(82+t*3)],[360+Math.cos(a)*128,560+Math.sin(a)*128]],i%3?'#3186a2':'#70b6c3',1.5);}
    ctx.fillStyle='rgba(218,255,255,.65)';ctx.fillRect(386,470,13,40);
    for(let i=0;i<8;i++)text(ctx,`0101  ROOT  ${i}  1100`,310+(t*40+i*22)%160,445+i*32,18,'#7ce8f4');ctx.restore();
    line(ctx,[[70,520],[170,420],[360,390],[560,430],[650,520]],'#081522',24);
  }
  if(view==='title'){
    const jitter=t<.35?Math.sin(t*90)*8:0;
    ctx.fillStyle='#f2fbff';ctx.textAlign='center';ctx.font='58px sans-serif';ctx.fillText(p.title||'PROMETHEUS',360+jitter,590);
    text(ctx,'THE LAST HUMAN ERROR',360,670,22,'#7194a6');
    if(t>3){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,(t-3)/1.5)})`;ctx.fillRect(0,0,720,1280);}
  }
  ctx.restore();
}
