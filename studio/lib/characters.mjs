// Entirely original code-drawn avatar rigs; no Roblox or other proprietary assets.
import { clamp, mix, ellipse, stroke, rounded } from './core.mjs';
import { breathe, blinkAmount, follow, smoothNoise, spring } from './motion.mjs';

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
  // Scared eyes lift the INNER brows (the reverse would read as angry).
  if(expression==='scared'){
    stroke(ctx,[-21,eyeY-8+breath],[-6,eyeY-15+breath],2.2,'#27313d');
    stroke(ctx,[6,eyeY-15+breath],[21,eyeY-8+breath],2.2,'#27313d');
    ellipse(ctx,-10.3,eyeY-2+breath,1.35,1.4,'#f8eee6');
    ellipse(ctx,13.2,eyeY-2+breath,1.35,1.4,'#f8eee6');
  }else{
    const brow=expression==='angry'?6:-4;
    stroke(ctx,[-19,eyeY+brow+breath],[-6,eyeY-6+breath],2.2,'#27313d');
    stroke(ctx,[6,eyeY-6+breath],[19,eyeY+brow+breath],2.2,'#27313d');
  }
  if(expression==='scared')ellipse(ctx,0,-93+breath,4,7,'#6f3c48');
  else if(expression==='happy')stroke(ctx,[-7,-93+breath],[7,-93+breath],2,'#6f3c48');
  else stroke(ctx,[-5,-92+breath],[5,-92+breath],1.5,'#6f3c48');
  ctx.restore();
}

export const avatarRigChoices=Object.freeze(['stick','block','silhouette']);

// Elite variant — extends drawCharacter with wobble hair sway, rimPulse, blink, and 'surprise' expression.
export function drawCharacterElite(ctx,{x,y,scale=1,color='#65c4db',rig='block',expression='neutral',phase=0,pose='idle',poseWeights=null,gaze={x:0,y:0},rim='#64e0ec',gender='unspecified',wobble=0,rimPulse=false,blink=0}={}){
  // rimPulse: oscillate rim-light intensity on a fast sine
  const effectiveRim=rimPulse?`rgba(${hexToRgb(rim)},${0.55+Math.abs(Math.sin(phase*3.7))*0.45})`:rim;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const breath=Math.sin(phase*2)*2,step=poseWeights?Math.sin(phase*8)*11*(poseWeights.walk||0):pose==='walk'?Math.sin(phase*8)*11:0;
  const lean=poseWeights?-.12*(poseWeights.run||0)+.08*(poseWeights.fear||0)+.1*(poseWeights.flinch||0):pose==='run'?-.12:pose==='fear'?.08:0;
  ctx.rotate(lean);
  ctx.shadowColor=effectiveRim;ctx.shadowBlur=rimPulse?18+Math.abs(Math.sin(phase*3.7))*14:15;
  ellipse(ctx,0,8,25,8,'#00000050');
  ctx.shadowBlur=rimPulse?10+Math.abs(Math.sin(phase*3.7))*8:8;ctx.strokeStyle=effectiveRim;ctx.lineWidth=4;
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
  // Stylized hair silhouette with wobble sway.
  const hw=wobble*Math.sin(phase*1.8);
  ctx.fillStyle='#20232c';ctx.beginPath();ctx.arc(hw,-117+breath,33,Math.PI,0);ctx.lineTo(27+hw,-130+breath);ctx.quadraticCurveTo(-5+hw,-158,-31+hw,-124+breath);ctx.closePath();ctx.fill();
  // Eyes — surprise: wide circular (or closed when blink > 0.55)
  if(typeof expression==='object'){
    const e=blendExpression(expression,expression,1),ey=-111+breath;
    for(const sign of [-1,1]){
      ellipse(ctx,sign*12+gaze.x*3,ey+gaze.y*2,4*e.pupil,Math.max(.4,5*e.eyeOpen*(1-blink)),'#17202d');
      stroke(ctx,[sign*20,ey-10-e.browOuter*5-e.browHeight*4],[sign*6,ey-10-e.browInner*7-e.browHeight*4],2.2,'#27313d');
    }
    ellipse(ctx,0,-93+breath,7*e.mouthWidth,Math.max(.6,8*e.mouthOpen),'#6f3c48');
  } else if(blink>0.55){
    const eyeY=-110+breath;
    stroke(ctx,[-18,eyeY],[-6,eyeY],2.5,'#17202d');
    stroke(ctx,[6,eyeY],[18,eyeY],2.5,'#17202d');
    if(expression==='surprise')ellipse(ctx,0,-93+breath,5,6,'#6f3c48');
    else if(expression==='scared')ellipse(ctx,0,-93+breath,4,7,'#6f3c48');
    else stroke(ctx,[-5,-92+breath],[5,-92+breath],1.5,'#6f3c48');
  } else if(expression==='surprise'){
    const eyeY=-110+breath;
    ellipse(ctx,-12,eyeY,7,8,'#17202d');
    ellipse(ctx,12,eyeY,7,8,'#17202d');
    ellipse(ctx,-10.5,eyeY-1.5,2,2,'#f8eee6');
    ellipse(ctx,13,eyeY-1.5,2,2,'#f8eee6');
    // Raised brows — both sides equally high
    stroke(ctx,[-20,eyeY-13+breath],[-5,eyeY-18+breath],2.2,'#27313d');
    stroke(ctx,[5,eyeY-18+breath],[20,eyeY-13+breath],2.2,'#27313d');
    // Open round mouth
    ellipse(ctx,0,-93+breath,5,6,'#6f3c48');
  } else {
    const eyeY=expression==='scared'?-110:-112;
    ellipse(ctx,-12,eyeY+breath,expression==='scared'?4.8:3,expression==='scared'?6:3,'#17202d');
    ellipse(ctx,12,eyeY+breath,expression==='scared'?4.8:3,expression==='scared'?6:3,'#17202d');
    if(expression==='scared'){
      stroke(ctx,[-21,eyeY-8+breath],[-6,eyeY-15+breath],2.2,'#27313d');
      stroke(ctx,[6,eyeY-15+breath],[21,eyeY-8+breath],2.2,'#27313d');
      ellipse(ctx,-10.3,eyeY-2+breath,1.35,1.4,'#f8eee6');
      ellipse(ctx,13.2,eyeY-2+breath,1.35,1.4,'#f8eee6');
    }else{
      const brow=expression==='angry'?6:-4;
      stroke(ctx,[-19,eyeY+brow+breath],[-6,eyeY-6+breath],2.2,'#27313d');
      stroke(ctx,[6,eyeY-6+breath],[19,eyeY+brow+breath],2.2,'#27313d');
    }
    if(expression==='scared')ellipse(ctx,0,-93+breath,4,7,'#6f3c48');
    else if(expression==='happy')stroke(ctx,[-7,-93+breath],[7,-93+breath],2,'#6f3c48');
    else stroke(ctx,[-5,-92+breath],[5,-92+breath],1.5,'#6f3c48');
  }
  ctx.restore();
}

// Helper: parse 6-digit hex to "r,g,b" string for rgba() usage.
function hexToRgb(hex){hex=String(hex||'#64e0ec').replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16)||0;return `${(n>>16)&255},${(n>>8)&255},${n&255}`}

// Parametric facial expressions.
// browInner > 0 means raised inner brow (scared/terrified/sad); < 0 means lowered inner brow (angry/suspicious).
export const EXPRESSIONS = Object.freeze({
  neutral: Object.freeze({
    browInner: 0.0, browOuter: 0.0, browHeight: 0.0,
    eyeOpen: 1.0, pupil: 1.0,
    mouthOpen: 0.0, mouthWidth: 0.72, mouthCurve: 0.0
  }),
  scared: Object.freeze({
    browInner: 0.78, browOuter: -0.15, browHeight: 0.38,
    eyeOpen: 1.28, pupil: 0.76,
    mouthOpen: 0.42, mouthWidth: 0.65, mouthCurve: -0.38
  }),
  terrified: Object.freeze({
    browInner: 0.96, browOuter: -0.22, browHeight: 0.58,
    eyeOpen: 1.45, pupil: 0.62,
    mouthOpen: 0.86, mouthWidth: 0.74, mouthCurve: -0.55
  }),
  surprise: Object.freeze({
    browInner: 0.85, browOuter: 0.85, browHeight: 0.68,
    eyeOpen: 1.38, pupil: 0.86,
    mouthOpen: 0.82, mouthWidth: 0.62, mouthCurve: 0.0
  }),
  suspicious: Object.freeze({
    browInner: -0.38, browOuter: 0.25, browHeight: -0.15,
    eyeOpen: 0.68, pupil: 0.95,
    mouthOpen: 0.0, mouthWidth: 0.68, mouthCurve: -0.18
  }),
  sad: Object.freeze({
    browInner: 0.68, browOuter: -0.25, browHeight: 0.16,
    eyeOpen: 0.82, pupil: 1.0,
    mouthOpen: 0.04, mouthWidth: 0.68, mouthCurve: -0.45
  }),
  relieved: Object.freeze({
    browInner: 0.26, browOuter: 0.06, browHeight: 0.12,
    eyeOpen: 0.86, pupil: 1.04,
    mouthOpen: 0.08, mouthWidth: 0.82, mouthCurve: 0.45
  }),
  angry: Object.freeze({
    browInner: -0.82, browOuter: 0.38, browHeight: -0.26,
    eyeOpen: 0.88, pupil: 0.84,
    mouthOpen: 0.22, mouthWidth: 0.80, mouthCurve: -0.42
  }),
  'blank-stare': Object.freeze({
    browInner: 0.0, browOuter: 0.0, browHeight: 0.0,
    eyeOpen: 1.16, pupil: 0.88,
    mouthOpen: 0.0, mouthWidth: 0.66, mouthCurve: 0.0
  })
});

const EXPRESSION_KEYS = Object.freeze([
  'browInner', 'browOuter', 'browHeight',
  'eyeOpen', 'pupil',
  'mouthOpen', 'mouthWidth', 'mouthCurve'
]);

function resolveExpression(exp) {
  if (!exp) return EXPRESSIONS.neutral;
  if (typeof exp === 'string') return EXPRESSIONS[exp] || EXPRESSIONS.neutral;
  if (typeof exp === 'object') return { ...EXPRESSIONS.neutral, ...exp };
  return EXPRESSIONS.neutral;
}

export function blendExpression(a, b, k = 0) {
  const ea = resolveExpression(a);
  const eb = b ? resolveExpression(b) : ea;
  const t = clamp(Number.isFinite(k) ? k : 0, 0, 1);
  const out = {};
  for (const key of EXPRESSION_KEYS) {
    out[key] = mix(ea[key], eb[key], t);
  }
  return out;
}

// Draws a full-body character figure with silhouette/block/stick support, spring secondary motion, and expressions.
export function drawFigure(ctx, {
  x = 360,
  y = 880,
  height = 340,
  rig = 'silhouette',
  variant = 'girl',
  facing = -1,
  expression = 'blank-stare',
  expressionTo = null,
  expressionMix = 0,
  gaze = { x: 0, y: 0 },
  blink = null,
  pose = 'stand',
  poseWeights = null,
  phase = 0,
  rimSide = 'right',
  rimColor = '#d8ecff',
  bodyColor = '#0b1420',
  dressColor = null,
  alpha = 1
} = {}) {
  if (rig === 'stick' || rig === 'block') {
    ctx.save();
    ctx.globalAlpha *= clamp(alpha, 0, 1);
    drawCharacterElite(ctx, {
      x,
      y,
      scale: height / 145,
      color: dressColor || '#65c4db',
      rig,
      expression,
      poseWeights,
      gaze,
      blink: blink??0,
      phase,
      pose: pose === 'walk' ? 'walk' : 'idle',
      rim: rimColor,
      wobble: 3,
      rimPulse: false
    });
    ctx.restore();
    return;
  }

  const h = Math.max(40, height);
  const t = Number.isFinite(phase) ? phase : 0;
  const exp = blendExpression(expression, expressionTo || expression, expressionMix);
  const effBlink = Number.isFinite(blink) ? clamp(blink, 0, 1) : blinkAmount(t, { seed: 17, period: 3.4 });

  const dir = (facing === 1 || facing === 'right') ? 1 : (facing === 0 || facing === 'front' ? 0 : -1);
  const rSide = (rimSide === 'left' || rimSide === -1) ? -1 : 1;

  // Breathing & pose kinematics
  const br = breathe(t, 0.26);
  const breathY = br * h * 0.006;
  const isWalk = poseWeights ? poseWeights.walk||0 : Number(pose === 'walk');
  const isFlinch = poseWeights ? poseWeights.flinch||0 : Number(pose === 'flinch');
  const isLook = poseWeights ? poseWeights.look||0 : Number(pose === 'look');

  const walkCycle = isWalk ? t * 5.2 : 0;
  const stride = isWalk * Math.sin(walkCycle);
  const weightBob = isWalk * Math.abs(Math.cos(walkCycle)) * h * 0.016;
  const flinchAmt = isFlinch * spring(Math.max(0, t % 2.5), { from: 0, to: 1, stiffness: 150, damping: 11 });
  const lookAmt = isLook * spring(Math.max(0, t), { from: 0, to: 1, stiffness: 90, damping: 14 });

  // Lagged secondary motion for dress/coat hem and head follow
  const hemSway = follow(
    p => Math.sin(p * 1.8) * h * 0.008 + (isWalk ? Math.sin(p * 5.2) * h * 0.022 : 0),
    t,
    0.14
  );
  const headLag = follow(p => Math.sin(p * 1.4) * h * 0.004, t, 0.1);

  const rootX = x - dir * flinchAmt * h * 0.025;
  const rootY = y + weightBob + flinchAmt * h * 0.018;

  const effDressColor = dressColor || (variant === 'girl' ? '#9bc4f4' : '#0e2433');
  const backLegColor = variant === 'girl' ? '#2c435e' : '#1b3147';

  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);

  // 1. Soft ground shadow ellipse
  ellipse(ctx, rootX, y + h * 0.006, h * 0.135, h * 0.02, 'rgba(2, 6, 12, 0.55)');

  const legTopY = rootY - h * 0.34;
  const footY = y;
  const stepSpan = stride * h * 0.055;
  const legW = Math.max(2.5, h * 0.044);

  // 2. Back leg (moonlit slate with crisp outer rim highlight)
  const backHipX = rootX + rSide * h * 0.022;
  const backFootX = backHipX + stepSpan;
  ctx.save();
  ctx.strokeStyle = backLegColor;
  ctx.lineWidth = legW;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(backHipX, legTopY);
  ctx.lineTo(backFootX, footY - legW * 0.35);
  ctx.stroke();

  // Back foot
  const footLen = h * 0.036 * (dir || -1);
  stroke(ctx, [backFootX, footY - legW * 0.35], [backFootX + footLen, footY - legW * 0.35], legW * 0.92, backLegColor);

  // Rim highlight on back leg
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = Math.max(1.2, h * 0.0075);
  ctx.beginPath();
  ctx.moveTo(backHipX + rSide * legW * 0.46, legTopY + h * 0.04);
  ctx.lineTo(backFootX + rSide * legW * 0.46, footY - legW * 0.2);
  ctx.stroke();
  ctx.restore();

  // 3. Torso / Dress silhouette
  const shoulderY = rootY - h * 0.69 + breathY;
  const waistY = rootY - h * 0.45 + breathY * 0.5;
  const hemY = rootY - h * 0.21;

  if (variant === 'girl') {
    // Sleeveless bodice flaring into A-line skirt (matches frame_04)
    const shHalf = h * 0.062;
    const waistHalf = h * 0.066;
    const hemHalf = h * 0.145;

    ctx.save();
    ctx.fillStyle = effDressColor;
    ctx.beginPath();
    ctx.moveTo(rootX - shHalf, shoulderY + h * 0.012);
    ctx.quadraticCurveTo(rootX, shoulderY - h * 0.01, rootX + shHalf, shoulderY + h * 0.015);
    ctx.lineTo(rootX + waistHalf, waistY);
    ctx.lineTo(rootX + hemHalf + hemSway, hemY);
    ctx.lineTo(rootX - hemHalf + hemSway, hemY);
    ctx.lineTo(rootX - waistHalf, waistY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    // Hoodie / coat silhouette (matches foreground narrator in frame_03)
    const shHalf = h * 0.075;
    const hemHalf = h * 0.088;
    ctx.save();
    ctx.fillStyle = effDressColor;
    ctx.beginPath();
    ctx.roundRect(rootX - shHalf, shoulderY, shHalf * 2, hemY - shoulderY + h * 0.03, h * 0.035);
    ctx.fill();

    // Hood bump behind neck
    const hoodX = rootX - (dir || 1) * shHalf * 0.75;
    ellipse(ctx, hoodX, shoulderY + h * 0.025, h * 0.045, h * 0.028, effDressColor);

    // Rim highlight along torso edge
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = Math.max(1.5, h * 0.009);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rootX + rSide * shHalf, shoulderY + h * 0.02);
    ctx.lineTo(rootX + rSide * hemHalf + hemSway * 0.4, hemY);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Front leg (deep silhouette overlapping lower skirt/torso)
  const frontHipX = rootX - rSide * h * 0.014;
  const frontFootX = frontHipX - stepSpan - h * 0.012;
  ctx.save();
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = legW * 1.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(frontHipX, rootY - h * 0.39);
  ctx.lineTo(frontFootX, footY - legW * 0.35);
  ctx.stroke();

  // Front foot with subtle rim tip
  const frontFootEnd = frontFootX + footLen * 1.15;
  stroke(ctx, [frontFootX, footY - legW * 0.35], [frontFootEnd, footY - legW * 0.35], legW * 0.96, bodyColor);
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = Math.max(1, h * 0.005);
  ctx.beginPath();
  ctx.arc(frontFootEnd, footY - legW * 0.38, legW * 0.42, Math.PI * 0.7, Math.PI * 1.45, dir > 0);
  ctx.stroke();
  ctx.restore();

  // 5. Front arm (tapered silhouette arm from shoulder to hip)
  const armShoulderX = rootX - rSide * h * 0.006;
  const armShoulderY = shoulderY + h * 0.032;
  const armHandX = rootX - rSide * h * 0.038 - stride * h * 0.035 + hemSway * 0.3;
  const armHandY = rootY - h * 0.42;
  const armW = Math.max(2.5, h * 0.042);

  if (variant === 'girl') {
    // Thin dress-colored separation halo so the dark arm reads crisply inside the bodice
    stroke(ctx, [armShoulderX, armShoulderY], [armHandX, armHandY], armW + h * 0.012, effDressColor);
  }
  stroke(ctx, [armShoulderX, armShoulderY], [armHandX, armHandY], armW, bodyColor);

  // 6. Head & Face
  const headR = h * 0.112;
  const headX = rootX + headLag + (dir * lookAmt * h * 0.008);
  const headY = rootY - h * 0.825 + breathY * 1.1;

  // Head silhouette circle
  ellipse(ctx, headX, headY, headR, headR, bodyColor);

  // Crisp crescent rim-light arc on head
  ctx.save();
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  const rimShiftX = rSide * headR * 0.06;
  const rimShiftY = -headR * 0.03;
  ctx.arc(headX + rimShiftX, headY + rimShiftY, headR * 1.02, -Math.PI * 0.75, Math.PI * 0.65, rSide < 0);
  ctx.arc(headX, headY, headR * 0.96, Math.PI * 0.65, -Math.PI * 0.75, rSide >= 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Facial features positioned toward `dir`
  const faceCenterX = headX + dir * headR * 0.24 + (gaze?.x || 0) * headR * 0.08;
  const eyeY = headY - headR * 0.08 + (gaze?.y || 0) * headR * 0.06;
  const eyeSpacing = headR * 0.22;
  const eyeRX = headR * 0.155;
  const eyeRY = headR * 0.17 * clamp(exp.eyeOpen, 0.55, 1.45);

  for (const side of [-1, 1]) {
    const ex = faceCenterX + side * eyeSpacing;
    if (effBlink >= 0.82) {
      stroke(ctx, [ex - eyeRX * 0.85, eyeY], [ex + eyeRX * 0.85, eyeY], Math.max(1.2, headR * 0.055), '#f0f7ff');
    } else {
      const curRY = Math.max(1, eyeRY * (1 - effBlink * 0.88));
      ellipse(ctx, ex, eyeY, eyeRX, curRY, '#f0f7ff');
      const px = ex + (dir * 0.22 + (gaze?.x || 0) * 0.35) * eyeRX;
      const py = eyeY + ((gaze?.y || 0) * 0.35) * curRY;
      const pr = Math.min(curRY * 0.82, eyeRX * 0.48 * clamp(exp.pupil, 0.55, 1.25));
      ellipse(ctx, px, py, pr, pr, bodyColor);
    }

    // Eyebrows when expression has non-neutral brow action
    if (Math.abs(exp.browInner) > 0.08 || Math.abs(exp.browOuter) > 0.08 || Math.abs(exp.browHeight) > 0.08) {
      const innerX = ex - side * eyeRX * 0.78;
      const outerX = ex + side * eyeRX * 0.88;
      const baseBY = eyeY - eyeRY * 1.35 - exp.browHeight * headR * 0.08;
      const innerY = baseBY - exp.browInner * headR * 0.14;
      const outerY = baseBY - exp.browOuter * headR * 0.12;
      stroke(ctx, [innerX, innerY], [outerX, outerY], Math.max(1.3, headR * 0.065), '#eef6ff');
    }
  }

  // Mouth
  const mouthY = headY + headR * 0.30;
  const mouthHalfW = headR * 0.22 * clamp(exp.mouthWidth, 0.4, 1.1);
  if (exp.mouthOpen > 0.28) {
    const mRX = mouthHalfW * 0.78;
    const mRY = headR * 0.14 * clamp(exp.mouthOpen, 0.3, 1.1);
    ellipse(ctx, faceCenterX, mouthY, mRX, mRY, '#f0f7ff');
    ellipse(ctx, faceCenterX, mouthY, mRX * 0.52, mRY * 0.52, bodyColor);
  } else {
    ctx.save();
    ctx.strokeStyle = '#f0f7ff';
    ctx.lineWidth = Math.max(1.3, headR * 0.068);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(faceCenterX - mouthHalfW, mouthY);
    ctx.quadraticCurveTo(
      faceCenterX,
      mouthY + exp.mouthCurve * headR * 0.18,
      faceCenterX + mouthHalfW,
      mouthY
    );
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// Draws a macro/close-up head with teal shoulders, crescent red rim arc, expressive brows/eyes/O-mouth, and natural blink.
export function drawHead(ctx, {
  x = null,
  y = null,
  radius = null,
  expression = 'surprise',
  expressionTo = null,
  expressionMix = 0,
  blink = null,
  gaze = { x: 0, y: 0 },
  rimColor = '#dd4b4b',
  headColor = '#091624',
  shirtColor = '#347c92',
  t = 0
} = {}) {
  const cw = ctx?.canvas?.width || 720;
  const ch = ctx?.canvas?.height || 1280;
  const cx = Number.isFinite(x) ? x : cw * 0.5;
  const cy = Number.isFinite(y) ? y : ch * 0.485;
  const r = Number.isFinite(radius) && radius > 0 ? radius : Math.min(cw, ch) * 0.325;

  const exp = blendExpression(expression, expressionTo || expression, expressionMix);
  const effBlink = Number.isFinite(blink)
    ? clamp(blink, 0, 1)
    : blinkAmount(t, { seed: 23, period: 3.1 });

  const br = breathe(t, 0.25);
  const breathY = br * r * 0.016;
  const microX = smoothNoise(31, t * 0.65) * r * 0.012;
  const microY = smoothNoise(47, t * 0.55) * r * 0.01;

  const hx = cx + microX;
  const hy = cy + breathY + microY;

  ctx.save();

  // 1. Broad curved teal shoulders underneath head (matches frame_08)
  const shTopY = hy + r * 0.66 + breathY * 0.6;
  const shBotY = hy + r * 1.49;
  const shHalfW = r * 1.28;

  ctx.save();
  const shGrad = ctx.createRadialGradient(
    hx, shTopY + r * 0.25, r * 0.08,
    hx, shTopY + r * 0.4, shHalfW * 1.1
  );
  shGrad.addColorStop(0, shirtColor);
  shGrad.addColorStop(1, '#266175');
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.moveTo(hx - shHalfW, shBotY);
  ctx.bezierCurveTo(
    hx - shHalfW * 0.96, shTopY + r * 0.08,
    hx - shHalfW * 0.42, shTopY,
    hx, shTopY
  );
  ctx.bezierCurveTo(
    hx + shHalfW * 0.42, shTopY,
    hx + shHalfW * 0.96, shTopY + r * 0.08,
    hx + shHalfW, shBotY
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Soft outer rim glow + Crescent rim-light arc around head (thickest on left/top-left, tapering on bottom-right)
  ctx.save();
  const rimShiftX = -r * 0.026;
  const rimShiftY = -r * 0.008;
  const outerRimR = r * 1.032;

  // Subtle rim glow halo
  ctx.save();
  ctx.globalAlpha = 0.22;
  ellipse(ctx, hx + rimShiftX, hy + rimShiftY, outerRimR * 1.03, outerRimR * 1.03, rimColor);
  ctx.restore();

  // Crisp crescent rim body
  ellipse(ctx, hx + rimShiftX, hy + rimShiftY, outerRimR, outerRimR, rimColor);
  ctx.restore();

  // 3. Main circular dark head fill
  ellipse(ctx, hx, hy, r, r, headColor);

  // 4. Saccade-eased gaze offset
  const saccadeX = clamp((gaze?.x || 0) + smoothNoise(83, t * 0.8) * 0.08, -1, 1);
  const saccadeY = clamp((gaze?.y || 0) + smoothNoise(89, t * 0.7) * 0.06, -1, 1);

  // 5. Eyes & Eyebrows
  const eyeSpacing = r * 0.34;
  const baseEyeY = hy - r * 0.115;
  const eyeRX = r * 0.205;
  const eyeRY = eyeRX * clamp(exp.eyeOpen / 1.32, 0.58, 1.15);

  for (const side of [-1, 1]) {
    const ex = hx + side * eyeSpacing;
    const ey = baseEyeY;

    // Eye rendering with natural blink + eyelid overshoot
    if (effBlink >= 0.82) {
      // Closed eye: bold white curved blink line
      const settle = ((effBlink - 0.82) / 0.18) * r * 0.015;
      ctx.save();
      ctx.strokeStyle = '#eef6ff';
      ctx.lineWidth = r * 0.068;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - eyeRX * 0.78, ey + settle);
      ctx.quadraticCurveTo(ex, ey + r * 0.045 + settle, ex + eyeRX * 0.78, ey + settle);
      ctx.stroke();
      ctx.restore();
    } else {
      const openScale = 1 - effBlink * 0.88;
      const curRY = Math.max(r * 0.03, eyeRY * openScale);

      // White sclera
      ellipse(ctx, ex, ey, eyeRX, curRY, '#eef6ff');

      // Dark pupil clipped inside sclera
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, eyeRX * 0.96, curRY * 0.96, 0, 0, Math.PI * 2);
      ctx.clip();
      const pupilR = eyeRX * 0.44 * clamp(exp.pupil, 0.5, 1.3);
      const px = ex + saccadeX * eyeRX * 0.34;
      const py = ey + saccadeY * curRY * 0.32 + r * 0.012;
      ellipse(ctx, px, py, pupilR, pupilR, headColor);
      ctx.restore();
    }

    // Expressive rounded eyebrow above each eye
    const browHalfW = eyeRX * 0.72;
    const innerX = ex - side * browHalfW;
    const outerX = ex + side * browHalfW;
    const baseBrowY = ey - eyeRX * (1.28 + exp.browHeight * 0.28);
    // Positive browInner lifts inner end HIGHER (smaller Y) -> scared/worried
    const innerY = baseBrowY - exp.browInner * r * 0.12;
    const outerY = baseBrowY - exp.browOuter * r * 0.12;
    const archLift = r * (0.075 + Math.max(0, exp.browHeight) * 0.065);
    const ctrlY = Math.min(innerY, outerY) - archLift;

    ctx.save();
    ctx.strokeStyle = '#eef6ff';
    ctx.lineWidth = r * 0.072;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.quadraticCurveTo(ex, ctrlY, outerX, outerY);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Mouth
  const mouthX = hx + saccadeX * r * 0.03;
  const mouthY = hy + r * 0.305;

  if (exp.mouthOpen > 0.25) {
    // Open O-mouth (white outer ring + dark inner mouth cavity, matches frame_08)
    const mRX = r * 0.205 * clamp(exp.mouthWidth / 0.62, 0.65, 1.35);
    const mRY = r * 0.178 * clamp(exp.mouthOpen / 0.82, 0.42, 1.25);
    ellipse(ctx, mouthX, mouthY, mRX, mRY, '#eef6ff');
    ellipse(ctx, mouthX, mouthY, mRX * 0.52, mRY * 0.52, headColor);
  } else {
    // Closed / curved mouth
    const mHalfW = r * 0.22 * clamp(exp.mouthWidth, 0.4, 1.2);
    ctx.save();
    ctx.strokeStyle = '#eef6ff';
    ctx.lineWidth = r * 0.065;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mouthX - mHalfW, mouthY);
    ctx.quadraticCurveTo(
      mouthX,
      mouthY + exp.mouthCurve * r * 0.16,
      mouthX + mHalfW,
      mouthY
    );
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
