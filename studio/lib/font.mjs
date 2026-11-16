// Original vector stroke font: A-Z, 0-9, . , ! ? : ' - and space.
// Drawn from code as polylines and circular/elliptical arcs with round caps and joins.
// No external font files, system fonts, or downloaded assets.

function arcPoints(cx, cy, rx, ry, a0, a1, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

const PI = Math.PI;

export const VECTOR_GLYPHS = Object.freeze({
  A: {
    w: 0.68,
    strokes: [
      [{ x: 0.04, y: 1 }, { x: 0.5, y: 0 }, { x: 0.96, y: 1 }],
      [{ x: 0.2, y: 0.66 }, { x: 0.8, y: 0.66 }]
    ]
  },
  B: {
    w: 0.64,
    strokes: [
      [{ x: 0.08, y: 0 }, { x: 0.08, y: 1 }],
      [
        { x: 0.08, y: 0 },
        { x: 0.52, y: 0 },
        ...arcPoints(0.52, 0.24, 0.38, 0.24, -PI / 2, PI / 2, 10),
        { x: 0.08, y: 0.48 }
      ],
      [
        { x: 0.08, y: 0.48 },
        { x: 0.56, y: 0.48 },
        ...arcPoints(0.56, 0.74, 0.38, 0.26, -PI / 2, PI / 2, 10),
        { x: 0.08, y: 1 }
      ]
    ]
  },
  C: {
    w: 0.64,
    strokes: [
      arcPoints(0.54, 0.5, 0.44, 0.5, -0.3 * PI, -1.7 * PI, 16)
    ]
  },
  D: {
    w: 0.66,
    strokes: [
      [
        { x: 0.08, y: 0 },
        { x: 0.08, y: 1 },
        { x: 0.46, y: 1 },
        ...arcPoints(0.46, 0.5, 0.46, 0.5, PI / 2, -PI / 2, 14),
        { x: 0.08, y: 0 }
      ]
    ]
  },
  E: {
    w: 0.58,
    strokes: [
      [{ x: 0.92, y: 0 }, { x: 0.08, y: 0 }, { x: 0.08, y: 1 }, { x: 0.92, y: 1 }],
      [{ x: 0.08, y: 0.5 }, { x: 0.78, y: 0.5 }]
    ]
  },
  F: {
    w: 0.56,
    strokes: [
      [{ x: 0.92, y: 0 }, { x: 0.08, y: 0 }, { x: 0.08, y: 1 }],
      [{ x: 0.08, y: 0.5 }, { x: 0.78, y: 0.5 }]
    ]
  },
  G: {
    w: 0.68,
    strokes: [
      [
        ...arcPoints(0.52, 0.5, 0.44, 0.5, -0.28 * PI, -1.75 * PI, 16),
        { x: 0.92, y: 0.54 },
        { x: 0.54, y: 0.54 }
      ]
    ]
  },
  H: {
    w: 0.66,
    strokes: [
      [{ x: 0.08, y: 0 }, { x: 0.08, y: 1 }],
      [{ x: 0.92, y: 0 }, { x: 0.92, y: 1 }],
      [{ x: 0.08, y: 0.5 }, { x: 0.92, y: 0.5 }]
    ]
  },
  I: {
    w: 0.24,
    strokes: [
      [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }]
    ]
  },
  J: {
    w: 0.54,
    strokes: [
      [
        { x: 0.86, y: 0 },
        { x: 0.86, y: 0.68 },
        ...arcPoints(0.48, 0.68, 0.38, 0.32, 0, 0.85 * PI, 12)
      ]
    ]
  },
  K: {
    w: 0.66,
    strokes: [
      [{ x: 0.08, y: 0 }, { x: 0.08, y: 1 }],
      [{ x: 0.9, y: 0 }, { x: 0.14, y: 0.54 }],
      [{ x: 0.36, y: 0.38 }, { x: 0.94, y: 1 }]
    ]
  },
  L: {
    w: 0.56,
    strokes: [
      [{ x: 0.1, y: 0 }, { x: 0.1, y: 1 }, { x: 0.92, y: 1 }]
    ]
  },
  M: {
    w: 0.84,
    strokes: [
      [{ x: 0.06, y: 1 }, { x: 0.06, y: 0 }, { x: 0.5, y: 0.62 }, { x: 0.94, y: 0 }, { x: 0.94, y: 1 }]
    ]
  },
  N: {
    w: 0.68,
    strokes: [
      [{ x: 0.08, y: 1 }, { x: 0.08, y: 0 }, { x: 0.92, y: 1 }, { x: 0.92, y: 0 }]
    ]
  },
  O: {
    w: 0.70,
    strokes: [
      arcPoints(0.5, 0.5, 0.44, 0.5, 0, 2 * PI, 20)
    ]
  },
  P: {
    w: 0.62,
    strokes: [
      [
        { x: 0.08, y: 1 },
        { x: 0.08, y: 0 },
        { x: 0.54, y: 0 },
        ...arcPoints(0.54, 0.27, 0.38, 0.27, -PI / 2, PI / 2, 12),
        { x: 0.08, y: 0.54 }
      ]
    ]
  },
  Q: {
    w: 0.72,
    strokes: [
      arcPoints(0.5, 0.5, 0.44, 0.5, 0, 2 * PI, 20),
      [{ x: 0.58, y: 0.62 }, { x: 0.96, y: 1.02 }]
    ]
  },
  R: {
    w: 0.64,
    strokes: [
      [
        { x: 0.08, y: 1 },
        { x: 0.08, y: 0 },
        { x: 0.54, y: 0 },
        ...arcPoints(0.54, 0.26, 0.38, 0.26, -PI / 2, PI / 2, 12),
        { x: 0.08, y: 0.52 }
      ],
      [{ x: 0.52, y: 0.5 }, { x: 0.92, y: 1 }]
    ]
  },
  S: {
    w: 0.62,
    strokes: [
      [
        ...arcPoints(0.5, 0.26, 0.38, 0.26, -0.15 * PI, -1.35 * PI, 10),
        ...arcPoints(0.5, 0.74, 0.4, 0.26, -0.45 * PI, 0.88 * PI, 10)
      ]
    ]
  },
  T: {
    w: 0.62,
    strokes: [
      [{ x: 0.04, y: 0 }, { x: 0.96, y: 0 }],
      [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }]
    ]
  },
  U: {
    w: 0.66,
    strokes: [
      [
        { x: 0.08, y: 0 },
        { x: 0.08, y: 0.64 },
        ...arcPoints(0.5, 0.64, 0.42, 0.36, PI, 0, 12),
        { x: 0.92, y: 0 }
      ]
    ]
  },
  V: {
    w: 0.66,
    strokes: [
      [{ x: 0.06, y: 0 }, { x: 0.5, y: 1 }, { x: 0.94, y: 0 }]
    ]
  },
  W: {
    w: 0.88,
    strokes: [
      [{ x: 0.04, y: 0 }, { x: 0.26, y: 1 }, { x: 0.5, y: 0.32 }, { x: 0.74, y: 1 }, { x: 0.96, y: 0 }]
    ]
  },
  X: {
    w: 0.66,
    strokes: [
      [{ x: 0.08, y: 0 }, { x: 0.92, y: 1 }],
      [{ x: 0.92, y: 0 }, { x: 0.08, y: 1 }]
    ]
  },
  Y: {
    w: 0.64,
    strokes: [
      [{ x: 0.06, y: 0 }, { x: 0.5, y: 0.52 }, { x: 0.94, y: 0 }],
      [{ x: 0.5, y: 0.52 }, { x: 0.5, y: 1 }]
    ]
  },
  Z: {
    w: 0.62,
    strokes: [
      [{ x: 0.08, y: 0 }, { x: 0.92, y: 0 }, { x: 0.08, y: 1 }, { x: 0.92, y: 1 }]
    ]
  },
  '0': {
    w: 0.64,
    strokes: [
      arcPoints(0.5, 0.5, 0.42, 0.5, 0, 2 * PI, 20)
    ]
  },
  '1': {
    w: 0.44,
    strokes: [
      [{ x: 0.16, y: 0.22 }, { x: 0.58, y: 0 }, { x: 0.58, y: 1 }]
    ]
  },
  '2': {
    w: 0.60,
    strokes: [
      [
        ...arcPoints(0.5, 0.28, 0.38, 0.28, -0.85 * PI, 0.22 * PI, 12),
        { x: 0.08, y: 1 },
        { x: 0.92, y: 1 }
      ]
    ]
  },
  '3': {
    w: 0.60,
    strokes: [
      [
        ...arcPoints(0.48, 0.25, 0.38, 0.25, -0.8 * PI, 0.5 * PI, 10),
        ...arcPoints(0.5, 0.74, 0.4, 0.26, -0.5 * PI, 0.82 * PI, 10)
      ]
    ]
  },
  '4': {
    w: 0.64,
    strokes: [
      [{ x: 0.72, y: 1 }, { x: 0.72, y: 0 }, { x: 0.06, y: 0.68 }, { x: 0.94, y: 0.68 }]
    ]
  },
  '5': {
    w: 0.60,
    strokes: [
      [
        { x: 0.88, y: 0 },
        { x: 0.14, y: 0 },
        { x: 0.12, y: 0.46 },
        ...arcPoints(0.5, 0.68, 0.4, 0.32, -0.65 * PI, 0.8 * PI, 12)
      ]
    ]
  },
  '6': {
    w: 0.62,
    strokes: [
      [
        ...arcPoints(0.52, 0.5, 0.4, 0.5, -0.25 * PI, -1.12 * PI, 10),
        ...arcPoints(0.5, 0.68, 0.4, 0.32, PI, 3 * PI, 14)
      ]
    ]
  },
  '7': {
    w: 0.58,
    strokes: [
      [{ x: 0.08, y: 0 }, { x: 0.92, y: 0 }, { x: 0.32, y: 1 }]
    ]
  },
  '8': {
    w: 0.62,
    strokes: [
      arcPoints(0.5, 0.25, 0.36, 0.25, 0, 2 * PI, 14),
      arcPoints(0.5, 0.73, 0.4, 0.27, 0, 2 * PI, 14)
    ]
  },
  '9': {
    w: 0.62,
    strokes: [
      arcPoints(0.5, 0.32, 0.4, 0.32, 0, 2 * PI, 14),
      [
        { x: 0.9, y: 0.32 },
        { x: 0.9, y: 0.68 },
        ...arcPoints(0.5, 0.68, 0.4, 0.32, 0, 0.82 * PI, 10)
      ]
    ]
  },
  '.': {
    w: 0.24,
    strokes: [
      [{ x: 0.5, y: 0.95 }, { x: 0.5, y: 0.96 }]
    ]
  },
  ',': {
    w: 0.24,
    strokes: [
      [{ x: 0.54, y: 0.92 }, { x: 0.38, y: 1.12 }]
    ]
  },
  '!': {
    w: 0.26,
    strokes: [
      [{ x: 0.5, y: 0 }, { x: 0.5, y: 0.66 }],
      [{ x: 0.5, y: 0.95 }, { x: 0.5, y: 0.96 }]
    ]
  },
  '?': {
    w: 0.56,
    strokes: [
      [
        ...arcPoints(0.5, 0.27, 0.38, 0.27, -0.85 * PI, 0.35 * PI, 10),
        { x: 0.5, y: 0.52 },
        { x: 0.5, y: 0.68 }
      ],
      [{ x: 0.5, y: 0.95 }, { x: 0.5, y: 0.96 }]
    ]
  },
  ':': {
    w: 0.24,
    strokes: [
      [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.31 }],
      [{ x: 0.5, y: 0.84 }, { x: 0.5, y: 0.85 }]
    ]
  },
  "'": {
    w: 0.22,
    strokes: [
      [{ x: 0.5, y: 0 }, { x: 0.44, y: 0.28 }]
    ]
  },
  '-': {
    w: 0.46,
    strokes: [
      [{ x: 0.12, y: 0.5 }, { x: 0.88, y: 0.5 }]
    ]
  },
  ' ': {
    w: 0.38,
    strokes: []
  }
});

const TRACKING_RATIO = 0.22;

function resolveStrokeWidth(size, weight) {
  if (typeof weight === 'number' && Number.isFinite(weight)) {
    if (weight <= 0) return size * 0.22;
    if (weight <= 1) return size * weight;
    if (weight >= 100) return size * (0.16 + ((weight - 400) / 300) * 0.06);
    return weight;
  }
  if (weight === 'normal' || weight === 'regular') return size * 0.17;
  if (weight === 'heavy' || weight === 'black') return size * 0.26;
  return size * 0.23;
}

export function measureVectorText(text, size = 36) {
  const s = String(text ?? '').toUpperCase();
  if (!s.length || size <= 0) return 0;
  const tracking = size * TRACKING_RATIO;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const g = VECTOR_GLYPHS[s[i]] || VECTOR_GLYPHS['?'];
    total += g.w * size;
    if (i < s.length - 1) total += tracking;
  }
  return total;
}

function traceTextPath(ctx, chars, x0, topY, size) {
  const tracking = size * TRACKING_RATIO;
  let cursor = x0;
  ctx.beginPath();
  for (let i = 0; i < chars.length; i++) {
    const g = VECTOR_GLYPHS[chars[i]] || VECTOR_GLYPHS['?'];
    const gw = g.w * size;
    for (const poly of g.strokes) {
      if (!poly.length) continue;
      ctx.moveTo(cursor + poly[0].x * gw, topY + poly[0].y * size);
      for (let j = 1; j < poly.length; j++) {
        ctx.lineTo(cursor + poly[j].x * gw, topY + poly[j].y * size);
      }
    }
    cursor += gw + tracking;
  }
}

export function vectorText(ctx, text, cx, y, size = 36, opts = {}) {
  const str = String(text ?? '').toUpperCase();
  const width = measureVectorText(str, size);
  if (!ctx || !str.length || size <= 0) return { width };

  const {
    fill = '#ffffff',
    outline = '#000000',
    outlineWidth,
    weight = 'bold',
    align = 'center'
  } = opts;

  const innerW = resolveStrokeWidth(size, weight);
  const outW = outlineWidth === undefined
    ? innerW * 0.85
    : (outlineWidth > 0 && outlineWidth < 1 ? size * outlineWidth : Number(outlineWidth) || 0);

  let x0 = cx - width * 0.5;
  if (align === 'left') x0 = cx;
  else if (align === 'right') x0 = cx - width;

  const topY = y - size * 0.5;
  const chars = [...str];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (outline && outline !== 'none' && outW > 0) {
    traceTextPath(ctx, chars, x0, topY, size);
    ctx.strokeStyle = outline;
    ctx.lineWidth = innerW + outW * 2;
    ctx.stroke();
  }

  traceTextPath(ctx, chars, x0, topY, size);
  ctx.strokeStyle = fill;
  ctx.lineWidth = innerW;
  ctx.stroke();

  ctx.restore();
  return { width };
}
