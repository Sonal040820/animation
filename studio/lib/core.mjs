// Pure reusable math, deterministic seeded motion, palettes and original vector/bitmap fonts.
import { STYLES } from './styles.mjs';
import { vectorText, measureVectorText } from './font.mjs';
import { spring } from './motion.mjs';

export { STYLES, vectorText, measureVectorText, spring };

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const ease = t => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const pulse = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
export function noise(seed) {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function springFallback(t, { from = 0, to = 1, stiffness = 120, damping = 14, mass = 1 } = {}) {
  if (t <= 0) return from;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const delta = to - from;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * w0 * t);
    return to - delta * env * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
  }
  const env = Math.exp(-w0 * t);
  return to - delta * env * (1 + w0 * t);
}

export function style(id) {
  if (!STYLES[id]) throw new Error('Unknown style: ' + id);
  return STYLES[id];
}

export function drawBackground(ctx, w, h, s, t, seed = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, s.bg);
  g.addColorStop(1, s.shade);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = noise(seed);
  ctx.save();
  ctx.globalAlpha = 0.20;
  for (let i = 0; i < 38; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 2 + 1;
    ctx.fillStyle = s.fog;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 0.35 + i) * 6, y + Math.cos(t * 0.25 + i * 0.7) * 3, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
  ctx.fill();
}

export function stroke(ctx, a, b, width, color) {
  const ax = a.x ?? a[0], ay = a.y ?? a[1];
  const bx = b.x ?? b[0], by = b.y ?? b[1];
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function rounded(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export function viewport(ctx, w, h, t, kind = 'push') {
  const drift = kind === 'orbit' ? Math.sin(t * 0.4) * 0.018 : Math.sin(t * 0.35) * 0.012;
  const zoom = 1 + Math.min(0.075, t * 0.014);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(drift);
  ctx.scale(zoom, zoom);
  ctx.translate(-w / 2, -h / 2);
}

export function projection3D(x, y, z, theta, scale = 1) {
  const ct = Math.cos(theta), st = Math.sin(theta);
  const px = (x * ct - z * st) * scale;
  const py = (y * 0.85 + (x * st + z * ct) * 0.28) * scale;
  return {
    x: px,
    y: py,
    0: px,
    1: py,
    *[Symbol.iterator]() {
      yield px;
      yield py;
    }
  };
}

// Authored 5x7 stroke bitmap font kept for clock and data-card UIs.
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '11110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

export function bitmapText(ctx, text, cx, y, pixel, color, maxWidth = 1e9) {
  text = String(text).toUpperCase();
  const width = text.length * 6 * pixel - pixel;
  const p = width > maxWidth ? (pixel * maxWidth) / width : pixel;
  const x0 = cx - (text.length * 6 * p - p) / 2;
  ctx.save();
  ctx.fillStyle = color;
  [...text].forEach((char, i) => {
    const glyph = GLYPHS[char] || GLYPHS['?'];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === '1') {
          ctx.fillRect(x0 + i * 6 * p + col * p, y + row * p, p * 0.92, p * 0.92);
        }
      }
    }
  });
  ctx.restore();
}

const EMPHASIS_WORD_RE = /^(NIGHT|BLINKED|GONE|TWELVE|STARE|STARING|ONE|11:59|12:01|00:01|NEITHER|OUTSIDE|ALONE|DOOR|REAL|MYSELF|CLOCK|WINDOW|GIRL)$/i;

function isWordEmphasized(word, emphasisProp) {
  if (!emphasisProp) return false;
  const clean = word.replace(/[^A-Z0-9:]/gi, '').toUpperCase();
  if (Array.isArray(emphasisProp)) {
    return emphasisProp.some(e => String(e).replace(/[^A-Z0-9:]/gi, '').toUpperCase() === clean);
  }
  if (typeof emphasisProp === 'string') {
    return emphasisProp.replace(/[^A-Z0-9:]/gi, '').toUpperCase() === clean;
  }
  return EMPHASIS_WORD_RE.test(clean);
}

export function caption(ctx, w, h, words, now, s) {
  if (!Array.isArray(words) || !words.length) return;
  const active = words.find(x => now >= x.start && now < x.end);
  if (!active) return;
  const text = (active.text || '').trim().toUpperCase();
  if (!text) return;

  const baseSize = Math.max(14, Math.min(w * 0.062, h * 0.035));
  const rawW = measureVectorText(text, baseSize);
  const maxW = w * 0.80;
  const size = rawW > maxW && rawW > 0 ? baseSize * (maxW / rawW) : baseSize;
  const centerY = h * 0.79;

  const dt = Math.max(0, now - (active.start || 0));
  const pop = clamp(spring(dt, { from: 0.82, to: 1, stiffness: 220, damping: 16, mass: 1 }), 0.6, 1.12);

  const accentColor = s?.accent || '#c1486a';
  const tokens = text.split(/\s+/).filter(Boolean);
  const empSource = active.emphasisWords || active.emphasis;

  ctx.save();
  ctx.translate(w * 0.5, centerY);
  ctx.scale(pop, pop);
  ctx.translate(-w * 0.5, -centerY);

  if (!empSource) {
    vectorText(ctx, text, w * 0.5, centerY, size, {
      fill: '#ffffff',
      outline: '#000000',
      weight: 'bold',
      align: 'center'
    });
  } else {
    let flags = tokens.map(tok => isWordEmphasized(tok, empSource));
    if (empSource === true && !flags.some(Boolean)) {
      flags = tokens.map(() => true);
    }
    if (flags.every(Boolean)) {
      vectorText(ctx, text, w * 0.5, centerY, size, {
        fill: accentColor,
        outline: '#000000',
        weight: 'bold',
        align: 'center'
      });
    } else {
      const totalW = measureVectorText(text, size);
      vectorText(ctx, text, w * 0.5, centerY, size, {
        fill: '#ffffff',
        outline: '#000000',
        weight: 'bold',
        align: 'center'
      });
      let cursor = w * 0.5 - totalW * 0.5;
      const stepSpace = measureVectorText('A B', size) - measureVectorText('A', size) - measureVectorText('B', size);
      for (let i = 0; i < tokens.length; i++) {
        const tw = measureVectorText(tokens[i], size);
        if (flags[i]) {
          vectorText(ctx, tokens[i], cursor, centerY, size, {
            fill: accentColor,
            outline: 'none',
            outlineWidth: 0,
            weight: 'bold',
            align: 'left'
          });
        }
        cursor += tw + stepSpace;
      }
    }
  }

  ctx.restore();
}
