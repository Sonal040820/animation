// Entirely original code-drawn avatar rigs; no Roblox or other proprietary assets.
import {ellipse,stroke,rounded,mix} from './core.mjs';
export function drawCharacter(ctx,{x,y,scale=1,color='#65c4db',rig='block',expression='neutral',phase=0,pose='idle',rim='#64e0ec',gender='unspecified'}){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const breath=Math.sin(phase*2)*2,step=pose==='walk'?Math.sin(phase*8)*11:0;
  const lean=pose==='run'?-.12:pose==='fear'?.08:0;
  ctx.rotate(lean);
  ctx.shadowColor=rim;ctx.shadowBlur=15;
  ellipse(ctx,0,8,25,8,'#00000050');
  ctx.shadowBlur=8; ctx.strokeStyle=rim;ctx.lineWidth=4;
  if(rig==='stick'){
    stroke(ctx,[0,-78+breath],[0,-23],11,color);
    stroke(ctx,[0,-60],[28+step,-29],8,color);
    stroke(ctx,[0,-60],[-27-step,-26],8,color);
    stroke(ctx,[0,-23],[17-step,0],9,color);
    stroke(ctx,[0,-23],[-17+step,0],9,color);
  }else{
    rounded(ctx,-29,-75+breath,58,49,9,color);
    rounded(ctx,-26,-29,22,34,6,color);
    rounded(ctx,4,-29,22,34,6,color);
    rounded(ctx,-41,-70+breath,13,47,5,color);
    rounded(ctx,28,-70+breath,13,47,5,color);
    stroke(ctx,[-18,0],[-18+step,6],15,'#192238');
    stroke(ctx,[18,0],[18-step,6],15,'#192238');
  }
  ellipse(ctx,0,-108+breath,34,38,'#e4bca2');
  ctx.shadowBlur=0;
  // Stylized hair silhouette from authored curves.
  ctx.fillStyle='#20232c';ctx.beginPath();ctx.arc(0,-117+breath,33,Math.PI,0);ctx.lineTo(27,-130+breath);ctx.quadraticCurveTo(-5,-158,-31,-124+breath);ctx.closePath();ctx.fill();
  const eyeY=expression==='scared'?-110:-112;
  ellipse(ctx,-12,eyeY+breath,expression==='scared'?4.8:3,expression==='scared'?6:3,'#17202d');
  ellipse(ctx,12,eyeY+breath,expression==='scared'?4.8:3,expression==='scared'?6:3,'#17202d');
  const brow=expression==='angry'?6:expression==='scared'?-9:-4;
  stroke(ctx,[-19,eyeY+brow+breath],[-6,eyeY-6+breath],2.2,'#27313d');
  stroke(ctx,[6,eyeY-6+breath],[19,eyeY+brow+breath],2.2,'#27313d');
  if(expression==='scared')ellipse(ctx,0,-93+breath,4,7,'#6f3c48');
  else if(expression==='happy')stroke(ctx,[-7,-93+breath],[7,-93+breath],2,'#6f3c48');
  else stroke(ctx,[-5,-92+breath],[5,-92+breath],1.5,'#6f3c48');
  ctx.restore();
}
export const avatarRigChoices=Object.freeze(['stick','block']);
