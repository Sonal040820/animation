import {clamp,ease,ellipse,noise,rounded,stroke} from './core.mjs';
import {drawFigure,drawHead} from './characters.mjs';

export const APARTMENT_VIEWS=['key','foyer','track','bed','retreat','unlocked','face','phone','hands','closet','eyes','black'];
const W=360,H=640;
const progress=(t,a,b)=>ease(clamp((t-a)/(b-a),0,1));
function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function shape(c,points,color){
  c.fillStyle=color;c.beginPath();
  for(const [i,[x,y]] of points.entries()) i?c.lineTo(x,y):c.moveTo(x,y);
  c.closePath();c.fill();
}
function wash(c,x,y,w,h,top,bottom){
  const g=c.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,top);g.addColorStop(1,bottom);box(c,x,y,w,h,g);
}
function light(c,x,y,r,color){
  const g=c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(1,'#00000000');
  box(c,x-r,y-r,2*r,2*r,g);
}
function letter(c,value,x,y,size,color='#e9e2d6',weight=500){
  c.font=weight+' '+size+'px sans-serif';c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(value,x,y);
}
function wall(c,base='#232a30'){
  wash(c,0,0,W,H,base,'#080e16');
  for(let i=0;i<9;i++)box(c,41*i,0,1,445,'#8092a307');
}
function floor(c,y=420){
  wash(c,0,y,W,H-y,'#384047','#151b24');
  for(let i=-2;i<=6;i++)stroke(c,[175+i*19,y],[i*116,H],1,'#77828735');
  for(const off of [22,51,91,150])box(c,0,y+off,W,1,'#73808a27');
}
function wood(c,x,y,w,h){
  wash(c,x,y,w,h,'#544942','#211f24');
  const rng=noise(184);
  for(let i=0;i<26;i++)box(c,x+rng()*w,y,1+rng()*2,h,'#bca1880c');
}
function deadbolt(c,x,y,scale,angle,bold=false){
  c.save();c.translate(x,y);c.scale(scale,scale);
  ellipse(c,2,6,49,46,'#080d15aa');
  ellipse(c,0,0,46,43,'#57402d');ellipse(c,-1,-2,43,40,'#9f8151');
  ellipse(c,-1,-3,37,34,'#685234');ellipse(c,-2,-4,31,29,'#806943');
  for(const offset of [-32,32]){ellipse(c,offset,0,4,4,'#2e251d');stroke(c,[offset-2,-1],[offset+2,1],1,'#c5a574');}
  c.rotate(angle);
  if(bold){rounded(c,-23,-7,46,14,6,'#d0b17e');stroke(c,[-17,-4],[17,-4],2,'#f0d5a6');}
  else{rounded(c,-3,-11,6,22,2,'#14151a');ellipse(c,0,-7,5,5,'#15151a');}
  c.restore();
}
function brassKey(c,x,y,angle=0,scale=1){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
  shape(c,[[0,-5],[47,-5],[52,0],[48,5],[41,5],[41,10],[34,10],[34,5],[24,5],[24,8],[17,8],[17,5],[0,5]],'#bc975a');
  stroke(c,[0,-3],[46,-3],1.5,'#f5d598');
  ellipse(c,-8,0,17,13,'#b5945b');ellipse(c,-8,0,11,8,'#685033');ellipse(c,-10,0,6,5,'#24242a');
  c.restore();
}
function hand(c,x,y,scale,turn=0,muddy=false){
  c.save();c.translate(x,y);c.rotate(turn);c.scale(scale,scale);
  shape(c,[[-55,74],[-55,32],[-35,21],[-24,31],[-19,24],[7,61],[-4,82]],'#263a45');
  shape(c,[[-35,39],[-30,15],[-24,0],[-18,-16],[-11,-14],[-7,5],[-5,-25],[2,-28],[7,-24],[8,3],[12,-21],[19,-21],[23,-15],[20,9],[25,-10],[32,-7],[32,1],[26,25],[15,46],[-5,60],[-22,60]],'#ac9a8d');
  shape(c,[[-33,33],[-23,17],[-17,25],[-7,20],[17,12],[24,18],[12,47],[-6,58],[-21,54]],'#796f6c');
  if(muddy){
    const rng=noise(67);
    for(let i=0;i<18;i++)ellipse(c,-17+rng()*39,10+rng()*34,1+rng()*4,1+rng()*3,'#4d3429a8');
    for(const [x,y] of [[-15,-11],[0,-22],[17,-16],[28,-5]])ellipse(c,x,y,4,3,'#342923');
    for(const [x,y] of [[-9,18],[6,14],[16,13]])stroke(c,[x-3,y+2],[x+3,y-2],2,'#7e393f');
  }
  c.restore();
}
function frontDoor(c,unlocked=false){
  wall(c,'#30363a');floor(c,464);
  box(c,40,84,222,392,'#0c1118');wood(c,51,94,199,374);
  for(const [y,h] of [[118,130],[276,165]]){
    box(c,69,y,163,h,'#25242a');wood(c,75,y+5,152,h-10);
    stroke(c,[75,y+5],[227,y+5],1,'#81705f');
  }
  box(c,45,86,6,380,'#969486');box(c,250,87,6,380,'#776a5e');
  deadbolt(c,205,302,.38,unlocked?Math.PI/2:0,true);
  ellipse(c,207,341,14,13,'#9c8057');ellipse(c,204,338,8,7,'#c4ad78');
  light(c,312,193,130,'#b7884b2b');
}
function head(c,t,{x=183,y=264,r=77,gaze=0,blink,expression='scared',blue=false}={}){
  ellipse(c,x-4,y-10,r*.86,r*1.04,'#151e27');
  ellipse(c,x+19,y+12,r*.74,r*1.03,'#171e29');
  drawHead(c,{x,y,radius:r,expression,blink,gaze:{x:0,y:gaze},headColor:blue?'#2b465b':'#747c80',shirtColor:blue?'#192b38':'#303f47',rimColor:blue?'#70a2ba':'#b5a99a',t});
  shape(c,[[x-r*.82,y-r*.35],[x-r*.73,y-r*.83],[x-r*.29,y-r],[x+r*.47,y-r*.9],[x+r*.78,y-r*.58],[x+r*.55,y-r*.53],[x+r*.19,y-r*.74],[x-r*.23,y-r*.46],[x-r*.57,y-r*.38],[x-r*.77,y+r*.21]],'#202630');
  stroke(c,[x-r*.67,y-r*.69],[x-r*.27,y-r*.85],2,'#6a798187');
}
function entry(c,t,unlocked){
  if(unlocked){
    const focus=progress(t,.25,2.35);
    const zoom=1+focus*1.28;
    c.translate(180,310);c.scale(zoom,zoom);c.translate(-180-focus*68,-310-focus*4);
    frontDoor(c,true);
    // Keys hang from the wall hook, apart from the bolt.
    box(c,278,266,30,53,'#574b43');
    ellipse(c,294,280,5,6,'#afa18a');ellipse(c,295,289,7,8,'#bdab80');ellipse(c,295,289,5,6,'#353237');
    brassKey(c,290,296,1.24,.54);brassKey(c,301,296,1.58,.48);
    c.save();light(c,254,294,101,'#ddac6630');c.restore();
    return;
  }
  frontDoor(c,false);
  const shift=Math.sin(t*4)*1.7;
  head(c,t,{x:173,y:271+shift,r:78,blink:1,expression:'scared'});
  shape(c,[[105,344],[152,328],[215,336],[247,403],[235,485],[100,485],[87,409]],'#334651');
  shape(c,[[95,385],[114,397],[103,426],[90,417],[98,411],[87,404]],'#111e27');
  for(let i=0;i<8;i++)stroke(c,[111+i*15,355+i%3*9],[108+i*15,398+i%4*8],1,'#7898a852');
  rounded(c,119,468,41,25,4,'#192128');rounded(c,180,468,48,25,4,'#192128');
  const rng=noise(131);
  for(let i=0;i<18;i++)ellipse(c,(i<9?122:183)+rng()*36,478+rng()*13,2+rng()*4,2,'#594638bd');
}
function print(c,x,y,scale){
  c.save();c.translate(x,y);c.rotate(.35);c.scale(scale,scale);
  ellipse(c,0,9,7,12,'#40372f');ellipse(c,-2,-9,10,10,'#4e4135');
  for(let i=0;i<5;i++)ellipse(c,-12+i*5,-20-Math.sin(i*.6)*5,3.2-i*.25,3.5,'#554437');
  stroke(c,[-5,-7],[2,-3],1.3,'#a38360');c.restore();
}
function bedroom(c,t,tracking){
  wall(c,'#253139');floor(c,348);box(c,0,344,W,5,'#786e60');
  const shift=tracking?40*(1-progress(t,0,3.3)):0;
  c.save();c.translate(shift,0);
  box(c,72,193,176,162,'#1b242a');wood(c,80,204,160,151);
  for(let i=0;i<8;i++)box(c,89+i*20,208,1,112,'#997e603e');
  shape(c,[[87,275],[232,275],[307,434],[103,434]],'#57616a');
  shape(c,[[91,278],[229,278],[298,414],[108,414]],'#a7aeab');
  shape(c,[[96,285],[151,284],[155,311],[99,311]],'#d6d5c9');
  shape(c,[[165,284],[220,283],[237,311],[172,311]],'#d1d2c7');
  shape(c,[[100,319],[249,319],[295,416],[107,416]],'#667c7d');
  shape(c,[[107,416],[295,416],[275,452],[109,451]],'#3d535a');
  stroke(c,[112,404],[284,404],2,'#bac6bd');
  shape(c,[[32,386],[86,386],[102,513],[14,513]],'#c7c7bc');
  for(let i=0;i<12;i++)stroke(c,[30-i,393+i*10],[85+i,393+i*10],.8,'#a0a69d');
  print(c,59,447,1.02);
  box(c,265,309,56,76,'#332e2d');box(c,260,306,66,7,'#756252');
  if(tracking){ellipse(c,293,298,17,6,'#577a81');stroke(c,[293,296],[293,274],3,'#829e9d');shape(c,[[279,255],[306,255],[313,277],[273,277]],'#889891');}
  c.restore();
  if(tracking){
    const x=18+progress(t,0,3.1)*18,y=390+Math.sin(Math.min(t,3.15)*7)*3;
    shape(c,[[0,y-9],[33,y-32],[91,y-3],[131,H],[0,H]],'#0c1720');
    ellipse(c,x,y-66,49,62,'#101b25');stroke(c,[x+43,y-98],[x+46,y-48],2,'#7794a0');
    box(c,0,0,11,H,'#111a21');
  }
}
function phone(c,t,message,overlay=false){
  const buzz=Math.sin(t*78)*Math.max(0,1-t*1.65)*4;
  const height=overlay?125:256, top=overlay?466:194;
  c.save();c.translate(buzz,0);
  rounded(c,23,top,314,height,16,'#091018');
  rounded(c,27,top+4,306,height-8,13,'#35586d');
  rounded(c,30,top+7,300,height-14,11,'#112b3b');
  box(c,42,top+36,276,1,'#426779');
  letter(c,'MOM',45,top+28,15,'#a2d4e7',700);
  for(const [i,line] of message.entries())letter(c,line,45,top+61+i*21,17,'#e6f3f5',500);
  if(!overlay){box(c,153,top+height-16,54,2,'#a1bcc9');letter(c,'MESSAGES',45,top+height-36,10,'#8bb2c3',600);}
  c.restore();
}
function closet(c,t,eyes,message){
  wall(c,'#283137');floor(c,472);
  box(c,66,82,225,408,'#080e15');box(c,77,95,206,383,'#080f17');
  const reveal=eyes?progress(t,.05,2.15):0;
  if(eyes){
    c.save();c.globalAlpha=reveal;
    light(c,184,316,130,'#265c7867');
    head(c,t,{x:180,y:247,r:71,expression:'terrified',blue:true,blink:0});
    rounded(c,161,322,38,59,5,'#101c27');
    rounded(c,165,326,30,49,3,'#79b9cb');
    light(c,179,337,97,'#6ccef349');
    c.restore();
  }
  const left=186-63*reveal,right=200+31*reveal;
  wood(c,75,98,left-75,375);wood(c,right,98,283-right,375);
  for(let i=0;i<19;i++){
    const y=108+i*18;
    stroke(c,[80,y],[left,y+4],4,'#726457');stroke(c,[right,y+4],[280,y],4,'#665c52');
    if(eyes && i>=5 && i<=13){
      c.save();c.globalAlpha=reveal;
      stroke(c,[left,y+4],[right,y+4],2,'#3a3f43');c.restore();
    }
  }
  stroke(c,[67,84],[291,84],3,'#777267');stroke(c,[67,84],[67,485],3,'#68655c');
  if(!eyes&&t>=.95)phone(c,t-.95,message,true);
  if(eyes&&t<1.9){c.save();c.globalAlpha=1-progress(t,1.3,1.9);phone(c,2,message,true);c.restore();}
}
export function drawApartment(c,w,h,_style,t,{view,title='',message=[]}){
  if(view==='black'){box(c,-w,-h,w*3,h*3,'#000000');return;}
  c.save();c.scale(w/W,h/H);
  switch(view){
    case 'key': {
      wood(c,0,0,W,H);light(c,115,258,245,'#c5985c33');
      deadbolt(c,148,285,1.32,progress(t,2.03,2.41)*1.4);
      const advance=progress(t,.35,2.03),turn=progress(t,2.03,2.41);
      const x=180-44*advance,y=313-28*advance+Math.sin(t*28)*1.7*(1-turn);
      brassKey(c,x+54,y,Math.PI+.44*turn,.98);hand(c,x+75,y+31,1.53,-.85+turn*.44);
      c.globalAlpha=1-progress(t,1.35,2.2);
      letter(c,title,37,511,25,'#ead6b7',700);
      break;
    }
    case 'foyer': entry(c,t,false);break;
    case 'track': bedroom(c,t,true);break;
    case 'bed': bedroom(c,t,false);break;
    case 'retreat': {
      const pan=1-progress(t,0,.53);
      c.save();c.translate(-pan*110,0);frontDoor(c,true);
      if(pan>.02){c.globalAlpha=pan;for(let i=0;i<7;i++)box(c,i*75,0,19,H,'#80949e38');c.globalAlpha=1;}
      c.restore();
      drawFigure(c,{x:247+progress(t,.52,3.2)*27,y:485,height:286,rig:'silhouette',variant:'adult',expression:'terrified',facing:-1,pose:t<2.9?'walk':'stand',phase:-t,dressColor:'#293e4b',rimColor:'#929da1',handTarget:{x:210+progress(t,.52,3.2)*27,y:363}});
      const x=208+progress(t,.52,3.2)*27;
      ellipse(c,x,366,14,19,'#66858d');light(c,x,363,25,'#98b4b63d');stroke(c,[x,348],[x,333],3,'#9bada8');
      shape(c,[[x-14,329],[x+11,328],[x+19,346],[x-21,346]],'#737d78');
      break;
    }
    case 'unlocked': entry(c,t,true);break;
    case 'face':
      wash(c,0,0,W,H,'#080c15','#101d2d');
      light(c,179,387,203,'#4b92bc42');
      head(c,t,{y:261,r:113,gaze:.48,blue:true,expression:'suspicious'});
      box(c,0,421,W,8,'#303c48');wash(c,0,429,W,211,'#16202c','#080d15');
      rounded(c,140,434,80,14,4,'#8dd3df');light(c,180,439,105,'#498bc463');break;
    case 'phone':
      wash(c,0,0,W,H,'#101c2a','#070d17');
      for(let i=0;i<6;i++)stroke(c,[0,150+i*65],[360,116+i*83],1,'#7796a720');
      light(c,178,315,224,'#2b789859');phone(c,t,message);break;
    case 'hands':
      wash(c,0,0,W,H,'#08101c','#1a2933');light(c,178,326,190,'#708da740');
      hand(c,86+Math.sin(t*10)*2,335,2.05,-.38,true);
      hand(c,263+Math.sin(t*9+1)*2,331,2.05,.36,true);break;
    case 'closet': closet(c,t,false,message);break;
    case 'eyes': closet(c,t,true,message);break;
  }
  c.restore();
}
