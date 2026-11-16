// Pure reusable math, deterministic seeded motion, palettes and original bitmap font.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export const pulse=(t,c,w)=>Math.exp(-Math.pow((t-c)/w,2));
export function noise(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
export const STYLES=Object.freeze({
  midnight:{bg:'#09101f',shade:'#151d2c',wall:'#27374a',accent:'#c1486a',key:'#8fa3e9',rim:'#63d9f8',text:'#f7e5da',fog:'#6e90b5',grain:.045,bloom:.18},
  ember:{bg:'#190d16',shade:'#321921',wall:'#4a292d',accent:'#ff9c51',key:'#f4be83',rim:'#ff664f',text:'#fff0ce',fog:'#a65242',grain:.06,bloom:.23},
  arctic:{bg:'#0b1822',shade:'#133445',wall:'#285262',accent:'#9bf2ff',key:'#a5f7e9',rim:'#50cfff',text:'#eaffff',fog:'#467c93',grain:.035,bloom:.15},
  ink:{bg:'#14121b',shade:'#24202c',wall:'#403647',accent:'#fa8bba',key:'#f4c3cf',rim:'#f899d0',text:'#fff0e5',fog:'#836f8c',grain:.07,bloom:.07}
});
export function style(id){if(!STYLES[id])throw new Error('Unknown style: '+id);return STYLES[id]}
export function drawBackground(ctx,w,h,s,t,seed=1){
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,s.bg);g.addColorStop(1,s.shade);
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const rnd=noise(seed);ctx.save();ctx.globalAlpha=.20;
  for(let i=0;i<38;i++){const x=rnd()*w,y=rnd()*h,r=rnd()*2+1;
    ctx.fillStyle=s.fog;ctx.beginPath();ctx.arc(x+Math.sin(t*.35+i)*6,y,r,0,Math.PI*2);ctx.fill()}
  ctx.restore();
}
export function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);ctx.fill()}
export function stroke(ctx,a,b,width,color){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineWidth=width;ctx.lineCap='round';ctx.strokeStyle=color;ctx.stroke()}
export function rounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
export function viewport(ctx,w,h,t,kind='push'){
  const drift=kind==='orbit'?Math.sin(t*.4)*.018:Math.sin(t*.35)*.012;
  const zoom=1+Math.min(.075,t*.014);
  ctx.translate(w/2,h/2);ctx.rotate(drift);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2);
}
export function projection3D(x,y,z,theta,scale=1){
  const ct=Math.cos(theta),st=Math.sin(theta);
  return [(x*ct-z*st)*scale,(y*.85 + (x*st+z*ct)*.28)*scale];
}
// Authored 5x7 stroke bitmap font. No external font files, images or copyright dependencies.
const GLYPHS={
 A:['01110','10001','10001','11111','10001','10001','10001'],
 B:['11110','10001','10001','11110','10001','10001','11110'],
 C:['01111','10000','10000','10000','10000','10000','01111'],
 D:['11110','10001','10001','10001','10001','10001','11110'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 F:['11111','10000','10000','11110','10000','10000','10000'],
 G:['01111','10000','10000','10111','10001','10001','01111'],
 H:['10001','10001','10001','11111','10001','10001','10001'],
 I:['11111','00100','00100','00100','00100','00100','11111'],
 J:['00111','00010','00010','00010','10010','10010','01100'],
 K:['10001','10010','10100','11000','10100','10010','10001'],
 L:['10000','10000','10000','10000','10000','10000','11111'],
 M:['10001','11011','10101','10101','10001','10001','10001'],
 N:['10001','11001','10101','10011','10001','10001','10001'],
 O:['01110','10001','10001','10001','10001','10001','01110'],
 P:['11110','10001','10001','11110','10000','10000','10000'],
 Q:['01110','10001','10001','10001','10101','10010','01101'],
 R:['11110','10001','10001','11110','10100','10010','10001'],
 S:['01111','10000','10000','01110','00001','00001','11110'],
 T:['11111','00100','00100','00100','00100','00100','00100'],
 U:['10001','10001','10001','10001','10001','10001','01110'],
 V:['10001','10001','10001','10001','10001','01010','00100'],
 W:['10001','10001','10001','10101','10101','10101','01010'],
 X:['10001','10001','01010','00100','01010','10001','10001'],
 Y:['10001','10001','01010','00100','00100','00100','00100'],
 Z:['11111','00001','00010','00100','01000','10000','11111'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],
 '1':['00100','01100','00100','00100','00100','00100','01110'],
 '2':['01110','10001','00001','00010','00100','01000','11111'],
 '3':['11110','00001','00001','01110','00001','00001','11110'],
 '4':['00010','00110','01010','10010','11111','00010','00010'],
 '5':['11111','10000','10000','11110','00001','00001','11110'],
 '6':['01111','10000','10000','11110','10001','10001','01110'],
 '7':['11111','00001','00010','00100','01000','01000','01000'],
 '8':['01110','10001','10001','01110','10001','10001','01110'],
 '9':['01110','10001','10001','01111','00001','00001','11110'],
 '.':['00000','00000','00000','00000','00000','01100','01100'],
 ':':['00000','01100','01100','00000','01100','01100','00000'],
 '!':['00100','00100','00100','00100','00100','00000','00100'],
 '?':['01110','10001','00001','00010','00100','00000','00100'],
 '-':['00000','00000','00000','11111','00000','00000','00000'],
 ' ':['00000','00000','00000','00000','00000','00000','00000']
};
export function bitmapText(ctx,text,cx,y,pixel,color,maxWidth=1e9){
  text=String(text).toUpperCase();const width=text.length*6*pixel-pixel;
  const p=width>maxWidth?pixel*maxWidth/width:pixel;
  const x0=cx-(text.length*6*p-p)/2;
  ctx.save();ctx.fillStyle=color;
  [...text].forEach((char,i)=>{const glyph=GLYPHS[char]||GLYPHS['?'];
    for(let row=0;row<7;row++)for(let col=0;col<5;col++)
      if(glyph[row][col]==='1')ctx.fillRect(x0+i*6*p+col*p,y+row*p,p*.92,p*.92)
  });ctx.restore();
}
export function caption(ctx,w,h,words,now,s){
  const active=words.find(x=>now>=x.start && now<x.end);
  if(!active)return;
  const text=(active.text||'').trim().toUpperCase();
  const px=Math.min(w*.019,Math.max(3,w/(8.8*Math.max(text.length,4))));
  const centerY=h*.79;
  ctx.save();ctx.shadowColor='#000000';ctx.shadowBlur=16;
  rounded(ctx,w*.12,centerY-25,w*.76,56,14,'#000000a6');
  ctx.shadowBlur=0;
  bitmapText(ctx,text,w/2,centerY-8,px,active.emphasis?s.accent:s.text,w*.68);
  ctx.restore();
}
