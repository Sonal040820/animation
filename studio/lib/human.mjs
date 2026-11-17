// Small reusable identity and action library, in actor-height coordinates.
export const HUMAN_LOOKS={
  traveler:{variant:'adult',facing:1,bodyColor:'#203040',dressColor:'#e1ae67',rimColor:'#fff1d1'},
  child:{variant:'girl',facing:1,bodyColor:'#253449',dressColor:'#e8919b',rimColor:'#ffe1e6'},
  observer:{variant:'boy',facing:1,bodyColor:'#222c3e',dressColor:'#8ac6c2',rimColor:'#dbffff'}
};
export const HUMAN_ACTIONS={
  'notice-recoil':[
    {t:0,pose:'stand',expression:'neutral',look:[0,0]},
    {t:1,pose:'look',expression:'suspicious',look:[1,0],blend:.25},
    {t:2.2,pose:'flinch',expression:'scared',look:[1,0],blend:.2},
    {t:3.2,pose:'still',expression:'scared',blend:.3}
  ]
};
export function solveTwoBone(root,target,upper,lower,bend=1){
  if(![root.x,root.y,target.x,target.y,upper,lower,bend].every(Number.isFinite)||upper<=0||lower<=0)throw Error('Invalid IK inputs');
  const dx=target.x-root.x,dy=target.y-root.y,raw=Math.hypot(dx,dy);
  const distance=Math.max(Math.abs(upper-lower)+1e-8,Math.min(upper+lower-1e-8,raw));
  const angle=raw?Math.atan2(dy,dx):Math.PI/2;
  const offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
  return {elbow:{x:root.x+Math.cos(angle+Math.sign(bend||1)*offset)*upper,y:root.y+Math.sin(angle+Math.sign(bend||1)*offset)*upper},hand:{x:root.x+Math.cos(angle)*distance,y:root.y+Math.sin(angle)*distance}};
}
