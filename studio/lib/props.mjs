// Original flat-vector props: 7-segment digital clock with ghost 88:88 segments and radial red glow.
import { clamp, rounded, ellipse } from './core.mjs';
import { smoothNoise } from './motion.mjs';

const DIGIT_SEGMENTS = Object.freeze({
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'e', 'd', 'c', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  '-': ['g'],
  ' ': []
});

const ALL_SEGMENTS = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

function drawSegmentBar(ctx, seg, x, y, dw, dh, thick) {
  const pad = thick * 0.32;
  const x0 = x;
  const x1 = x + dw;
  const y0 = y;
  const ym = y + dh * 0.5;
  const y1 = y + dh;

  ctx.beginPath();
  switch (seg) {
    case 'a':
      ctx.moveTo(x0 + pad, y0);
      ctx.lineTo(x1 - pad, y0);
      break;
    case 'b':
      ctx.moveTo(x1, y0 + pad);
      ctx.lineTo(x1, ym - pad * 0.5);
      break;
    case 'c':
      ctx.moveTo(x1, ym + pad * 0.5);
      ctx.lineTo(x1, y1 - pad);
      break;
    case 'd':
      ctx.moveTo(x0 + pad, y1);
      ctx.lineTo(x1 - pad, y1);
      break;
    case 'e':
      ctx.moveTo(x0, ym + pad * 0.5);
      ctx.lineTo(x0, y1 - pad);
      break;
    case 'f':
      ctx.moveTo(x0, y0 + pad);
      ctx.lineTo(x0, ym - pad * 0.5);
      break;
    case 'g':
      ctx.moveTo(x0 + pad, ym);
      ctx.lineTo(x1 - pad, ym);
      break;
  }
  ctx.stroke();
}

function parseClockDigits(timeStr) {
  const s = String(timeStr || '11:59').trim();
  const parts = s.split(':');
  if (parts.length === 2) {
    const hh = parts[0].padStart(2, '0').slice(-2);
    const mm = parts[1].padStart(2, '0').slice(0, 2);
    return [hh[0], hh[1], mm[0], mm[1]];
  }
  const clean = s.replace(/[^0-9 -]/g, '').padStart(4, '0').slice(-4);
  return [clean[0], clean[1], clean[2], clean[3]];
}

// Draws a 7-segment digital clock with ghost 88:88 segments and soft radial glow.
// (x, y) is the center of the clock housing (or top-left if align === 'left' or x < width * 0.45).
export function drawDigitalClock(ctx, {
  x = 360,
  y = 560,
  width = 480,
  height = null,
  time = '11:59',
  color = '#ff4d4d',
  glow = 1,
  ghost = 0.12,
  flicker = 0,
  t = 0,
  align = 'center'
} = {}) {
  const w = Math.max(40, width);
  const h = Number.isFinite(height) && height > 0 ? height : w * 0.375;
  const isTopLeft = align === 'left' || (x - w * 0.5 < -2);
  const cx = isTopLeft ? x + w * 0.5 : x;
  const cy = isTopLeft ? y + h * 0.5 : y;
  const left = cx - w * 0.5;
  const top = cy - h * 0.5;

  const flickerMod = flicker > 0
    ? clamp(1 - flicker * 0.45 * Math.abs(smoothNoise(73, t * 18)), 0.35, 1)
    : (0.97 + 0.03 * Math.sin(t * 4.2));
  const effGlow = clamp(glow, 0, 2) * flickerMod;

  ctx.save();

  // Ambient red spill glow behind and underneath the clock body
  if (effGlow > 0.01) {
    ctx.save();
    const spillR = w * 0.72;
    const gSpill = ctx.createRadialGradient(cx, cy + h * 0.28, w * 0.04, cx, cy + h * 0.15, spillR);
    gSpill.addColorStop(0, color);
    gSpill.addColorStop(0.45, color);
    gSpill.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = clamp(0.28 * effGlow, 0, 0.65);
    ctx.fillStyle = gSpill;
    ctx.fillRect(cx - spillR, cy - spillR, spillR * 2, spillR * 2);
    ctx.restore();
  }

  // Outer bezel casing
  const outerR = Math.max(4, h * 0.115);
  rounded(ctx, left, top, w, h, outerR, '#171f2f');

  // Subtle top bezel rim highlight
  ctx.save();
  ctx.strokeStyle = '#25324a';
  ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.beginPath();
  ctx.roundRect(left + 1, top + 1, w - 2, h - 2, outerR);
  ctx.stroke();
  ctx.restore();

  // Recessed inner display cavity
  const padX = w * 0.032;
  const padY = h * 0.085;
  const innerR = Math.max(3, h * 0.08);
  rounded(ctx, left + padX, top + padY, w - padX * 2, h - padY * 2, innerR, '#161017');

  // Digit layout geometry
  const digits = parseClockDigits(time);
  const contentW = w * 0.82;
  const contentLeft = cx - contentW * 0.5;
  const digitW = contentW * 0.182;
  const digitH = h * 0.57;
  const digitTop = cy - digitH * 0.5;
  const gap = contentW * 0.042;
  const colonGap = contentW * 0.095;
  const segThick = Math.max(2, w * 0.028);

  const slotX = [
    contentLeft,
    contentLeft + digitW + gap,
    contentLeft + digitW * 2 + gap + colonGap,
    contentLeft + digitW * 3 + gap * 2 + colonGap
  ];

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;

  // 1. Ghost 88:88 segments
  const ghostAlpha = clamp(ghost, 0, 0.5);
  if (ghostAlpha > 0.005) {
    ctx.save();
    ctx.globalAlpha = ghostAlpha;
    ctx.lineWidth = segThick;
    for (let i = 0; i < 4; i++) {
      for (const seg of ALL_SEGMENTS) {
        drawSegmentBar(ctx, seg, slotX[i], digitTop, digitW, digitH, segThick);
      }
    }
    ctx.restore();
  }

  // 2. Colon dots (subtle pulse between ghost and lit)
  const colonX = contentLeft + digitW * 2 + gap + colonGap * 0.5;
  const dotR = segThick * 0.56;
  const colonPulse = 0.22 + 0.78 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2));
  ctx.save();
  ctx.globalAlpha = clamp(Math.max(ghostAlpha * 1.6, colonPulse * 0.55 * flickerMod), 0.12, 0.95);
  ellipse(ctx, colonX, cy - digitH * 0.21, dotR, dotR, color);
  ellipse(ctx, colonX, cy + digitH * 0.21, dotR, dotR, color);
  ctx.restore();

  // 3. Active lit segments (soft bloom pass + crisp core pass)
  if (effGlow > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp(0.24 * effGlow, 0, 0.5);
    ctx.lineWidth = segThick * 2.15;
    for (let i = 0; i < 4; i++) {
      const active = DIGIT_SEGMENTS[digits[i]] || DIGIT_SEGMENTS['0'];
      for (const seg of active) {
        drawSegmentBar(ctx, seg, slotX[i], digitTop, digitW, digitH, segThick);
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = clamp(0.94 * flickerMod, 0.4, 1);
  ctx.lineWidth = segThick;
  for (let i = 0; i < 4; i++) {
    const active = DIGIT_SEGMENTS[digits[i]] || DIGIT_SEGMENTS['0'];
    for (const seg of active) {
      drawSegmentBar(ctx, seg, slotX[i], digitTop, digitW, digitH, segThick);
    }
  }
  ctx.restore();

  ctx.restore();
}
