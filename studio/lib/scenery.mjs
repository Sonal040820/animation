// Original flat-vector horror scenery: moonlit night exterior, 4-pane room interior, OffscreenCanvas blur, atmosphere, vignette.
import { clamp, noise, ellipse, stroke, rounded } from './core.mjs';
import { smoothNoise } from './motion.mjs';
import { drawFigure } from './characters.mjs';
import { drawDigitalClock } from './props.mjs';

function drawBareTree(ctx, baseX, baseY, treeH, t) {
  const sway = Math.sin(t * 0.85) * (treeH * 0.008);
  const trunkW = Math.max(4, treeH * 0.058);
  const topX = baseX + sway;
  const topY = baseY - treeH * 0.55;

  ctx.save();
  ctx.strokeStyle = '#0a111d';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main trunk
  ctx.lineWidth = trunkW;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(topX, topY);
  ctx.stroke();

  // Branches: [startFrac, angle, lenFrac, widthFrac, twigs]
  const branches = [
    [0.24, -2.42, 0.56, 0.42, [[0.48, -2.18, 0.28], [0.72, -2.58, 0.22]]],
    [0.44, -0.58, 0.54, 0.40, [[0.52, -0.82, 0.26], [0.74, -0.42, 0.20]]],
    [0.58, -0.68, 0.58, 0.38, [[0.45, -0.92, 0.28], [0.70, -0.50, 0.24]]],
    [0.72, -2.30, 0.62, 0.42, [[0.50, -2.08, 0.28], [0.75, -2.45, 0.22]]],
    [0.84, -0.78, 0.60, 0.36, [[0.48, -0.98, 0.26], [0.72, -0.62, 0.22]]]
  ];

  for (let i = 0; i < branches.length; i++) {
    const [sf, ang, lf, wf, twigs] = branches[i];
    const bx0 = baseX + sway * sf;
    const by0 = baseY - treeH * 0.55 * sf;
    const bAng = ang + Math.sin(t * 0.9 + i) * 0.012;
    const bLen = treeH * lf;
    const bx1 = bx0 + Math.cos(bAng) * bLen;
    const by1 = by0 + Math.sin(bAng) * bLen;

    ctx.lineWidth = Math.max(1.5, trunkW * wf);
    ctx.beginPath();
    ctx.moveTo(bx0, by0);
    ctx.lineTo(bx1, by1);
    ctx.stroke();

    for (const [tf, tAng, tLenFrac] of twigs) {
      const tx0 = bx0 + (bx1 - bx0) * tf;
      const ty0 = by0 + (by1 - by0) * tf;
      const tLen = treeH * tLenFrac;
      const tx1 = tx0 + Math.cos(tAng) * tLen;
      const ty1 = ty0 + Math.sin(tAng) * tLen;
      ctx.lineWidth = Math.max(1, trunkW * wf * 0.55);
      ctx.beginPath();
      ctx.moveTo(tx0, ty0);
      ctx.lineTo(tx1, ty1);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPicketFence(ctx, x0, w, fenceTopY, fenceBotY, pxOffset = 0) {
  const fh = fenceBotY - fenceTopY;
  const count = 21;
  const step = w / count;
  const picketW = step * 0.44;
  const tipH = fh * 0.13;

  ctx.save();

  // Horizontal rails behind pickets
  const railH = Math.max(2, fh * 0.075);
  ctx.fillStyle = '#121d31';
  ctx.fillRect(x0, fenceTopY + fh * 0.52, w, railH);
  ctx.fillRect(x0, fenceTopY + fh * 0.67, w, railH);

  // Individual pointed pickets with moonlit edge highlight
  for (let i = -1; i <= count + 1; i++) {
    const px = x0 + i * step + (pxOffset % step);
    if (px + picketW < x0 - step || px > x0 + w + step) continue;

    ctx.fillStyle = '#0f182a';
    ctx.beginPath();
    ctx.moveTo(px, fenceTopY + tipH);
    ctx.lineTo(px + picketW * 0.5, fenceTopY);
    ctx.lineTo(px + picketW, fenceTopY + tipH);
    ctx.lineTo(px + picketW, fenceBotY);
    ctx.lineTo(px, fenceBotY);
    ctx.closePath();
    ctx.fill();

    // Crisp vertical moonlit rim line along right edge of picket
    ctx.strokeStyle = '#273a57';
    ctx.lineWidth = Math.max(1, picketW * 0.11);
    ctx.beginPath();
    ctx.moveTo(px + picketW, fenceTopY + tipH);
    ctx.lineTo(px + picketW, fenceBotY);
    ctx.stroke();
  }

  ctx.restore();
}

// Draws the moonlit night exterior (gradient sky, twinkling stars, glowing moon, drifting cloud bands, rolling hill, bare tree, picket fence).
export function drawNightExterior(ctx, w, h, t = 0, {
  seed = 1,
  moon = true,
  clouds = true,
  fence = true,
  tree = true,
  stars = 80,
  parallax = { x: 0, y: 0 }
} = {}) {
  const px = parallax?.x || 0;
  const py = parallax?.y || 0;

  ctx.save();

  // 1. Deep night sky vertical gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  skyGrad.addColorStop(0, '#040a13');
  skyGrad.addColorStop(0.36, '#0c2238');
  skyGrad.addColorStop(0.75, '#112c46');
  skyGrad.addColorStop(1, '#0b1d30');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Seeded twinkling stars
  const starCount = Math.min(250, Math.max(0, stars | 0));
  if (starCount > 0) {
    const rnd = noise((seed | 0) + 101);
    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const sx = (rnd() * w + px * 0.1 + w) % w;
      const sy = rnd() * h * 0.58;
      const sr = 0.6 + rnd() * 1.15;
      const twinkle = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (1.1 + (i % 5) * 0.35) + i * 1.9));
      ctx.globalAlpha = twinkle * 0.75;
      ctx.fillStyle = '#dceeff';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Resolve moon geometry
  const hasMoon = moon !== false && moon !== null;
  let mx = w * 0.50 + px * 0.22 + Math.sin(t * 0.08) * (w * 0.004);
  let my = h * 0.258 + py * 0.18 + Math.cos(t * 0.06) * (h * 0.002);
  let mr = Math.min(w, h) * 0.102;
  let mColor = '#c5ddf0';

  if (typeof moon === 'object' && moon !== null) {
    if (Number.isFinite(moon.x)) mx = moon.x <= 1 && moon.x >= 0 ? moon.x * w : moon.x;
    if (Number.isFinite(moon.y)) my = moon.y <= 1 && moon.y >= 0 ? moon.y * h : moon.y;
    if (Number.isFinite(moon.r)) mr = moon.r <= 1 && moon.r > 0 ? moon.r * Math.min(w, h) : moon.r;
    if (moon.color) mColor = moon.color;
  }

  // 3. Background cloud bands (behind moon)
  if (clouds) {
    const cRnd = noise((seed | 0) + 303);
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const cy = h * (0.115 + i * 0.028);
      const cw = w * (0.26 + cRnd() * 0.22);
      const ch = h * (0.008 + cRnd() * 0.006);
      const baseX = (cRnd() * 0.6 + 0.2) * w;
      const drift = Math.sin(t * 0.14 + i * 1.3) * (w * 0.025) + (t * (2.2 + i * 0.4)) % (w * 0.18);
      ctx.globalAlpha = 0.16;
      ellipse(ctx, baseX + drift - w * 0.04 + px * 0.3, cy + py * 0.2, cw, ch, '#6e92b5');
    }
    ctx.restore();
  }

  // 4. Moon + soft radial glow halo
  if (hasMoon) {
    ctx.save();
    const glowR = mr * 3.4;
    const mGlow = ctx.createRadialGradient(mx, my, mr * 0.25, mx, my, glowR);
    mGlow.addColorStop(0, 'rgba(195, 225, 250, 0.28)');
    mGlow.addColorStop(0.35, 'rgba(130, 175, 215, 0.12)');
    mGlow.addColorStop(1, 'rgba(15, 35, 60, 0)');
    ctx.fillStyle = mGlow;
    ctx.fillRect(mx - glowR, my - glowR, glowR * 2, glowR * 2);

    // Crisp moon disc
    ellipse(ctx, mx, my, mr, mr, mColor);
    ctx.restore();
  }

  // 5. Foreground translucent cloud bands drifting across the moon (matches frame_01 & frame_04)
  if (clouds) {
    const fBands = [
      { x: 0.48, y: 0.122, rx: 0.28, ry: 0.011, a: 0.14, col: '#7da0c0', spd: 1.8 },
      { x: 0.43, y: 0.142, rx: 0.35, ry: 0.012, a: 0.16, col: '#698cad', spd: -1.5 },
      { x: 0.45, y: 0.168, rx: 0.22, ry: 0.011, a: 0.18, col: '#5c7e9e', spd: 2.1 },
      { x: 0.38, y: 0.196, rx: 0.42, ry: 0.011, a: 0.22, col: '#3e5e7d', spd: -1.9 },
      { x: 0.22, y: 0.214, rx: 0.24, ry: 0.012, a: 0.20, col: '#355472', spd: 1.6 },
      { x: 0.45, y: 0.236, rx: 0.19, ry: 0.010, a: 0.34, col: '#243f5c', spd: -2.2 },
      { x: 0.48, y: 0.254, rx: 0.34, ry: 0.008, a: 0.48, col: '#18314c', spd: 2.5 },
      { x: 0.44, y: 0.266, rx: 0.26, ry: 0.009, a: 0.44, col: '#1c3754', spd: -2.0 },
      { x: 0.68, y: 0.282, rx: 0.22, ry: 0.010, a: 0.36, col: '#142a42', spd: 1.7 }
    ];
    ctx.save();
    for (let i = 0; i < fBands.length; i++) {
      const b = fBands[i];
      const sway = Math.sin(t * 0.22 + i * 0.9) * (w * 0.022) + Math.cos(t * 0.11 * b.spd) * (w * 0.015);
      ctx.globalAlpha = b.a;
      ellipse(ctx, b.x * w + sway + px * 0.35, b.y * h + py * 0.22, b.rx * w, b.ry * h, b.col);
    }
    ctx.restore();
  }

  // 6. Rolling hill silhouette
  const hillBaseY = h * 0.70;
  ctx.save();
  ctx.fillStyle = '#0c1528';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.642);
  ctx.bezierCurveTo(
    w * 0.18 + px * 0.4, h * 0.602,
    w * 0.38 + px * 0.4, h * 0.628,
    w * 0.64 + px * 0.4, h * 0.646
  );
  ctx.bezierCurveTo(
    w * 0.78 + px * 0.4, h * 0.654,
    w * 0.88 + px * 0.4, h * 0.608,
    w, h * 0.622
  );
  ctx.lineTo(w, hillBaseY);
  ctx.lineTo(0, hillBaseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 7. Bare silhouette tree on the right hill
  if (tree) {
    drawBareTree(ctx, w * 0.828 + px * 0.55, h * 0.685, h * 0.30, t);
  }

  // 8. Moonlit lawn / ground gradient from fence down to bottom of frame
  const groundTopY = h * 0.685;
  const gGrad = ctx.createLinearGradient(0, groundTopY, 0, h);
  gGrad.addColorStop(0, '#142736');
  gGrad.addColorStop(0.18, '#132534');
  gGrad.addColorStop(0.55, '#07111a');
  gGrad.addColorStop(1, '#040a10');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, groundTopY, w, h - groundTopY);

  // 9. Picket fence across the ridge
  if (fence) {
    drawPicketFence(ctx, 0, w, h * 0.635, h * 0.715, px * 0.7);
  }

  ctx.restore();
}

// Draws the dark bedroom interior with 4-pane window, red curtains, windowsill, optional digital clock, and optional figure outside.
export function drawRoomInterior(ctx, w, h, t = 0, {
  seed = 1,
  window: winOpt = true,
  curtains = true,
  sill = true,
  clockTime = null,
  figureOutside = null,
  lightLevel = 1
} = {}) {
  ctx.save();

  // 1. Dark room interior wall
  const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
  wallGrad.addColorStop(0, '#050b13');
  wallGrad.addColorStop(0.55, '#08111d');
  wallGrad.addColorStop(1, '#040911');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, h);

  // Resolve window rectangle
  const wx = typeof winOpt === 'object' && Number.isFinite(winOpt?.x) ? winOpt.x : w * 0.215;
  const wy = typeof winOpt === 'object' && Number.isFinite(winOpt?.y) ? winOpt.y : h * 0.125;
  const ww = typeof winOpt === 'object' && Number.isFinite(winOpt?.w) ? winOpt.w : w * 0.57;
  const wh = typeof winOpt === 'object' && Number.isFinite(winOpt?.h) ? winOpt.h : h * 0.48;

  if (winOpt !== false) {
    // 2. Clipped exterior view through the 4-pane window
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();

    // Sky inside window
    const wSky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    wSky.addColorStop(0, '#071829');
    wSky.addColorStop(0.55, '#0d263e');
    wSky.addColorStop(1, '#152b3c');
    ctx.fillStyle = wSky;
    ctx.fillRect(wx, wy, ww, wh);

    // Stars inside window
    const sRnd = noise((seed | 0) + 509);
    ctx.fillStyle = '#dceeff';
    for (let i = 0; i < 18; i++) {
      const sx = wx + sRnd() * ww;
      const sy = wy + sRnd() * (wh * 0.55);
      const sr = 0.7 + sRnd() * 0.9;
      ctx.globalAlpha = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + i));
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon in upper-left window pane (matches frame_02 & frame_03)
    const wmx = wx + ww * 0.21 + Math.sin(t * 0.08) * 2;
    const wmy = wy + wh * 0.22 + Math.cos(t * 0.06) * 1.5;
    const wmr = ww * 0.086;
    const mGlow = ctx.createRadialGradient(wmx, wmy, wmr * 0.2, wmx, wmy, wmr * 3.1);
    mGlow.addColorStop(0, 'rgba(195, 225, 250, 0.24)');
    mGlow.addColorStop(1, 'rgba(15, 35, 60, 0)');
    ctx.fillStyle = mGlow;
    ctx.fillRect(wx, wy, ww, wh);
    ellipse(ctx, wmx, wmy, wmr, wmr, '#c6dff2');

    // Drifting top window cloud bands
    ctx.save();
    ctx.globalAlpha = 0.22;
    const cDrift = Math.sin(t * 0.2) * (ww * 0.03);
    ellipse(ctx, wx + ww * 0.35 + cDrift, wy + wh * 0.05, ww * 0.36, wh * 0.022, '#4c6d8e');
    ellipse(ctx, wx + ww * 0.62 - cDrift, wy + wh * 0.085, ww * 0.42, wh * 0.024, '#365575');
    ctx.restore();

    // Rolling hill + yard ground inside window
    const wHillY = wy + wh * 0.68;
    ctx.fillStyle = '#0e172a';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh * 0.64);
    ctx.quadraticCurveTo(wx + ww * 0.35, wy + wh * 0.66, wx + ww, wy + wh * 0.69);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.lineTo(wx, wy + wh);
    ctx.closePath();
    ctx.fill();

    // Yard lawn below fence
    const yGrad = ctx.createLinearGradient(0, wHillY, 0, wy + wh);
    yGrad.addColorStop(0, '#182e3f');
    yGrad.addColorStop(1, '#0b1824');
    ctx.fillStyle = yGrad;
    ctx.fillRect(wx, wHillY, ww, wy + wh - wHillY);

    // Bare tree branches peeking in from right edge of window
    drawBareTree(ctx, wx + ww * 0.96, wy + wh * 0.72, wh * 0.42, t);

    // Picket fence inside window
    drawPicketFence(ctx, wx, ww, wy + wh * 0.64, wy + wh * 0.79, 0);

    // Optional figure outside window (matches girl in lower-right pane of frame_03)
    if (figureOutside) {
      const figOpts = typeof figureOutside === 'object' ? figureOutside : {};
      drawFigure(ctx, {
        x: wx + ww * 0.61,
        y: wy + wh * 0.855,
        height: wh * 0.35,
        rig: 'silhouette',
        variant: 'girl',
        facing: -1,
        expression: 'blank-stare',
        pose: 'stand',
        phase: t,
        rimSide: 'right',
        rimColor: '#dceeff',
        bodyColor: '#0b1420',
        dressColor: '#9bc4f4',
        ...figOpts
      });
    }

    ctx.restore();

    // 3. 4-pane window frame and cross mullions
    const frameThick = Math.max(4, w * 0.022);
    ctx.save();
    ctx.strokeStyle = '#18161f';
    ctx.lineWidth = frameThick;
    ctx.strokeRect(wx, wy, ww, wh);

    // Vertical center mullion & horizontal center mullion
    const midX = wx + ww * 0.488;
    const midY = wy + wh * 0.50;
    stroke(ctx, [midX, wy], [midX, wy + wh], frameThick * 0.92, '#18161f');
    stroke(ctx, [wx, midY], [wx + ww, midY], frameThick * 0.88, '#18161f');

    // Subtle inner bevel highlight on mullions
    stroke(ctx, [midX - frameThick * 0.3, wy], [midX - frameThick * 0.3, wy + wh], 1.2, '#272533');
    ctx.restore();
  }

  // 4. Deep burgundy-red curtains with vertical folds (matches frame_02 & frame_03)
  const sillTopY = wy + wh;
  if (curtains) {
    const cTopY = wy - h * 0.022;
    const cBotY = sillTopY + h * 0.004;
    const cH = cBotY - cTopY;
    const sway = Math.sin(t * 0.75) * (w * 0.002);

    // Curtain rod / valance shadow bar
    ctx.fillStyle = '#0e0b12';
    ctx.fillRect(w * 0.075, cTopY - h * 0.012, w * 0.85, h * 0.016);

    const sides = [
      { left: w * 0.085, width: w * 0.175 + sway },
      { left: w * 0.735 + sway, width: w * 0.175 - sway }
    ];

    for (const c of sides) {
      // Base curtain fabric
      ctx.fillStyle = '#281219';
      ctx.fillRect(c.left, cTopY, c.width, cH);

      // Vertical pleated folds
      const folds = 4;
      const foldW = c.width / folds;
      for (let i = 0; i < folds; i++) {
        const fx = c.left + i * foldW;
        ctx.fillStyle = i % 2 === 0 ? '#200e14' : '#31161f';
        ctx.fillRect(fx + foldW * 0.18, cTopY, foldW * 0.48, cH);
      }
    }
  }

  // 5. Windowsill ledge
  if (sill) {
    const sillX = w * 0.065;
    const sillW = w * 0.87;
    const sillH = h * 0.025;
    // Top surface of sill
    ctx.fillStyle = '#272932';
    ctx.fillRect(sillX, sillTopY, sillW, sillH * 0.35);
    // Front face of sill
    ctx.fillStyle = '#1c1e26';
    ctx.fillRect(sillX, sillTopY + sillH * 0.35, sillW, sillH * 0.65);
  }

  // 6. Sill Digital Clock (with warm red glow spill on curtain and sill, matches frame_03 & frame_10)
  if (clockTime !== null && clockTime !== undefined && clockTime !== false) {
    const clockW = w * 0.22;
    const clockH = clockW * 0.375;
    const clockCX = w * 0.275;
    const clockCY = sillTopY - clockH * 0.46;

    // Extra red light reflection on sill surface right under clock
    ctx.save();
    const sillGlow = ctx.createRadialGradient(
      clockCX, sillTopY + h * 0.008, clockW * 0.05,
      clockCX, sillTopY + h * 0.01, clockW * 0.95
    );
    sillGlow.addColorStop(0, 'rgba(255, 77, 77, 0.38)');
    sillGlow.addColorStop(0.5, 'rgba(220, 50, 60, 0.14)');
    sillGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sillGlow;
    ctx.fillRect(clockCX - clockW, sillTopY - clockH, clockW * 2, clockH * 2);
    ctx.restore();

    drawDigitalClock(ctx, {
      x: clockCX,
      y: clockCY,
      width: clockW,
      time: String(clockTime),
      color: '#ff4d4d',
      glow: 1,
      ghost: 0.14,
      t
    });
  }

  // 7. Light level dimming overlay (e.g. fade / power out in frame_11)
  const lv = clamp(Number.isFinite(lightLevel) ? lightLevel : 1, 0, 1);
  if (lv < 0.999) {
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - lv})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

// Reusable OffscreenCanvas pool by recursion depth so nested drawBlurred calls never collide.
const blurPool = [];
let blurDepth = 0;

function getOffscreenBuffer(w, h) {
  const idx = blurDepth;
  let entry = blurPool[idx];
  if (!entry) {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      entry = { canvas, ctx: canvas.getContext('2d') };
      blurPool[idx] = entry;
    } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      entry = { canvas, ctx: canvas.getContext('2d') };
      blurPool[idx] = entry;
    } else {
      return null;
    }
  }
  if (entry.canvas.width !== w || entry.canvas.height !== h) {
    entry.canvas.width = w;
    entry.canvas.height = h;
  }
  return entry;
}

// Renders `drawFn(offCtx, w, h)` to an OffscreenCanvas and composites it onto `ctx` with `blur(blurPx)`.
// Guards cleanly if OffscreenCanvas is unavailable (e.g. in headless Node tests).
export function drawBlurred(ctx, w, h, blurPx, drawFn) {
  if (typeof drawFn !== 'function') return;
  const px = Number.isFinite(blurPx) ? Math.max(0, blurPx) : 0;
  if (px <= 0.1) {
    ctx.save();
    drawFn(ctx, w, h);
    ctx.restore();
    return;
  }

  const buf = getOffscreenBuffer(w, h);
  if (!buf || !buf.ctx) {
    ctx.save();
    drawFn(ctx, w, h);
    ctx.restore();
    return;
  }

  blurDepth++;
  try {
    const offCtx = buf.ctx;
    offCtx.save();
    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.filter = 'none';
    offCtx.globalAlpha = 1;
    offCtx.clearRect(0, 0, w, h);
    drawFn(offCtx, w, h);
    offCtx.restore();

    ctx.save();
    ctx.filter = `blur(${px}px)`;
    ctx.drawImage(buf.canvas, 0, 0, w, h);
    ctx.restore();
  } finally {
    blurDepth--;
  }
}

// Draws drifting atmospheric fog washes and floating dust motes (guarantees continuous frame-to-frame motion).
export function drawAtmosphere(ctx, w, h, t = 0, {
  seed = 1,
  dust = 40,
  fog = 0.15,
  color = '#8cb4d4'
} = {}) {
  ctx.save();

  // 1. Soft drifting fog layers
  const fogAlpha = clamp(Number.isFinite(fog) ? fog : 0.15, 0, 0.8);
  if (fogAlpha > 0.005) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const fx = w * (0.25 + i * 0.25) + Math.sin(t * (0.22 + i * 0.07) + i * 2) * (w * 0.08);
      const fy = h * (0.32 + i * 0.22) + Math.cos(t * 0.18 + i) * (h * 0.03);
      const fr = Math.max(w, h) * 0.45;
      const g = ctx.createRadialGradient(fx, fy, fr * 0.05, fx, fy, fr);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = fogAlpha * 0.32;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // 2. Floating dust motes
  const count = Math.min(200, Math.max(0, dust | 0));
  if (count > 0) {
    const rnd = noise((seed | 0) + 773);
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const bx = rnd() * w;
      const by = rnd() * h;
      const r = 1.1 + rnd() * 2.1;
      const spdX = 6 + rnd() * 10;
      const spdY = 4 + rnd() * 8;
      const mx = (bx + Math.sin(t * 0.55 + i * 1.7) * 14 + t * spdX) % w;
      const my = (by + Math.cos(t * 0.45 + i * 2.3) * 10 - t * spdY % h + h) % h;
      const pulse = 0.18 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 3.1));
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc((mx + w) % w, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// Draws a smooth radial dark vignette around the frame edges.
export function drawVignette(ctx, w, h, strength = 0.65) {
  const s = clamp(Number.isFinite(strength) ? strength : 0.65, 0, 1);
  if (s <= 0.005) return;
  ctx.save();
  const cx = w * 0.5;
  const cy = h * 0.48;
  const r0 = Math.min(w, h) * 0.22;
  const r1 = Math.hypot(w, h) * 0.56;
  const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.65, `rgba(0, 0, 0, ${(s * 0.42).toFixed(3)})`);
  grad.addColorStop(1, `rgba(0, 0, 0, ${s.toFixed(3)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
