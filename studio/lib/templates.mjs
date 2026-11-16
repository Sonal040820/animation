// Template-only shots: every visual element is drawn from code. Stateless frame API.
import {
  clamp, ease, noise, drawBackground, ellipse, rounded, stroke,
  viewport, bitmapText, projection3D, caption, style
} from './core.mjs';
import { drawCharacter, drawCharacterElite, drawFigure, drawHead } from './characters.mjs';
import { CAMERA_MOVES, cameraTransform, blinkAmount } from './motion.mjs';
import {
  drawNightExterior, drawRoomInterior, drawBlurred,
  drawAtmosphere, drawVignette
} from './scenery.mjs';
import { drawDigitalClock } from './props.mjs';
import { HORROR_TEMPLATES } from './horror.mjs';
import { STYLE_GRADE } from './styles.mjs';
import {
  renderThreeFrame, buildParticleVoidScene,
  buildNightCityScene, buildHorrorRoomScene
} from './three-scene.mjs';
import { TEMPLATE_META } from './template-meta.mjs';

export { TEMPLATE_META };

export const TRANSITIONS = Object.freeze(['cut', 'dip', 'flash', 'blink']);

export const TEMPLATE_NAMES = Object.freeze([
  'wide-establishing', 'window-view', 'character-medium', 'giant-face',
  'insert-macro-clock', 'figure-exterior', 'empty-yard',
  'data-card', '3d-orbit', 'title-card',
  'three-particle-void', 'three-night-city', 'three-horror-room',
  ...Object.keys(HORROR_TEMPLATES)
]);

function building(ctx, w, h, s, t) {
  ctx.fillStyle = s.wall;
  ctx.fillRect(0, h * 0.35, w, h * 0.65);
  for (let i = 0; i < 5; i++) {
    const x = (i * 0.25 + 0.08) * w, y = h * (0.46 + 0.05 * Math.sin(i));
    rounded(ctx, x, y, w * 0.09, h * 0.24, 9, s.bg);
    rounded(ctx, x + 5, y + 5, w * 0.09 - 10, h * 0.24 - 10, 6, '#101620');
  }
}

function exteriorWindowLegacy(ctx, w, h, s, t, girl = true) {
  const x = w * 0.23, y = h * 0.28, bw = w * 0.54, bh = h * 0.42;
  rounded(ctx, x - 11, y - 11, bw + 22, bh + 22, 12, s.wall);
  rounded(ctx, x, y, bw, bh, 6, '#050a13');
  ellipse(ctx, x + bw * 0.69, y + bh * 0.26, bw * 0.13, bw * 0.13, '#c2cbdf');
  if (girl) {
    drawCharacterElite(ctx, {
      x: x + bw * 0.50 + Math.sin(t * 0.7) * 3,
      y: y + bh * 0.88,
      scale: Math.min(w, h) / 520,
      color: '#303b51',
      rig: 'stick',
      expression: 'neutral',
      phase: t,
      rim: '#8cc5ff',
      wobble: 4,
      rimPulse: true
    });
  }
  stroke(ctx, [x + bw / 2, y], [x + bw / 2, y + bh], w * 0.018, s.wall);
  stroke(ctx, [x, y + bh * 0.50], [x + bw, y + bh * 0.50], w * 0.018, s.wall);
}

function analogClock(ctx, w, h, s, t, params) {
  const cx = w / 2, cy = h * 0.47, r = Math.min(w * 0.28, h * 0.22);
  ellipse(ctx, cx, cy, r + 12, r + 12, s.rim);
  ellipse(ctx, cx, cy, r, r, s.shade);
  for (let n = 0; n < 12; n++) {
    const a = (n * Math.PI) / 6 - Math.PI / 2;
    stroke(
      ctx,
      [cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8],
      [cx + Math.cos(a) * r * 0.91, cy + Math.sin(a) * r * 0.91],
      3,
      s.text
    );
  }
  const midnight = params?.time === '00:01' || params?.time === '12:01' || t > 1.4;
  const min = midnight ? 1 : 59;
  const ma = (min / 60) * Math.PI * 2 - Math.PI / 2 + Math.sin(t * 6) * 0.015;
  const ha = ((midnight ? 0 : 11.999) / 12) * Math.PI * 2 - Math.PI / 2;
  stroke(ctx, [cx, cy], [cx + Math.cos(ha) * r * 0.45, cy + Math.sin(ha) * r * 0.45], 9, s.text);
  stroke(ctx, [cx, cy], [cx + Math.cos(ma) * r * 0.73, cy + Math.sin(ma) * r * 0.73], 5, s.accent);
  ellipse(ctx, cx, cy, 6, 6, s.accent);
  bitmapText(ctx, midnight ? '12:01' : '11:59', w / 2, h * 0.71, w * 0.013, s.text, w * 0.82);
}

function legacyFace(ctx, w, h, s, t, params) {
  drawCharacterElite(ctx, {
    x: w / 2,
    y: h * 0.80,
    scale: Math.min(w, h) / 300,
    rig: params?.rig || 'block',
    expression: params?.expression || 'scared',
    color: params?.color || s.accent,
    phase: t,
    rim: s.rim,
    wobble: params?.wobble ?? 4,
    rimPulse: params?.rimPulse ?? true
  });
  drawAtmosphere(ctx, w, h, t, { seed: (params?.seed || 1) + 55, dust: 22, fog: 0.1, color: s.fog });
}

function renderCloseUpHead(ctx, w, h, s, t, p, isGiant = true) {
  const rig = p?.rig || 'silhouette';
  if (rig === 'block' || rig === 'stick') {
    if (p?.backdrop === 'room-blur') {
      drawBlurred(ctx, w, h, Math.max(8, w * 0.022), (bctx, bw, bh) => {
        drawRoomInterior(bctx, bw, bh, t, {
          seed: p?.seed || 1,
          curtains: true,
          sill: true,
          clockTime: '11:59',
          figureOutside: null,
          lightLevel: 0.78
        });
      });
    }
    legacyFace(ctx, w, h, s, t, p);
    return;
  }

  const backdrop = p?.backdrop ?? 'room-blur';
  if (backdrop === 'room-blur') {
    drawBlurred(ctx, w, h, Math.max(8, w * 0.022), (bctx, bw, bh) => {
      drawRoomInterior(bctx, bw, bh, t, {
        seed: p?.seed || 1,
        curtains: true,
        sill: true,
        clockTime: '11:59',
        figureOutside: null,
        lightLevel: 0.78
      });
    });
  } else if (backdrop === 'night') {
    drawBlurred(ctx, w, h, Math.max(6, w * 0.016), (bctx, bw, bh) => {
      drawNightExterior(bctx, bw, bh, t, { seed: p?.seed || 1 });
    });
  }

  const forcedBlinks = Array.isArray(p?.blinkAt)
    ? p.blinkAt
    : (Number.isFinite(p?.blinkAt) ? [p.blinkAt] : []);
  const bAmt = p?.blink === false
    ? 0
    : blinkAmount(t, {
        seed: (p?.seed || 1) + 23,
        period: 2.8,
        duration: 0.16,
        forceAt: forcedBlinks
      });

  const dur = Number.isFinite(p?.duration) && p.duration > 0 ? p.duration : 1.5;
  const expMix = Number.isFinite(p?.expressionMix)
    ? p.expressionMix
    : (p?.expressionTo ? clamp(t / (dur * 0.7), 0, 1) : 0);

  const gazeObj = typeof p?.gaze === 'object' && p?.gaze !== null ? p.gaze : { x: 0, y: 0 };

  drawHead(ctx, {
    x: w * 0.5,
    y: h * (isGiant ? 0.485 : 0.51),
    radius: Math.min(w, h) * (isGiant ? 0.335 : 0.265),
    expression: p?.expression || (isGiant ? 'surprise' : 'scared'),
    expressionTo: p?.expressionTo || null,
    expressionMix: expMix,
    blink: bAmt,
    gaze: gazeObj,
    rimColor: p?.rimColor || '#dd4b4b',
    headColor: p?.headColor || '#091624',
    shirtColor: p?.shirtColor || '#347c92',
    t
  });

  drawAtmosphere(ctx, w, h, t, {
    seed: (p?.seed || 1) + 61,
    dust: w < 300 ? 6 : 16,
    fog: 0.06,
    color: s.fog
  });
}

function card(ctx, w, h, s, t, params) {
  const pulseY = Math.sin(t * 1.6) * (h * 0.006);
  rounded(ctx, w * 0.11, h * 0.31 + pulseY, w * 0.78, h * 0.38, 22, s.wall);
  const title = String(params?.text || 'THE CLOCK');
  bitmapText(ctx, title, w / 2, h * 0.41 + pulseY, Math.min(10, w * 0.014), s.text, w * 0.66);
  const value = String(params?.value || '11:59');
  bitmapText(ctx, value, w / 2, h * 0.55 + pulseY, Math.min(14, w * 0.017), s.accent, w * 0.70);
  drawAtmosphere(ctx, w, h, t, { seed: (params?.seed || 1) + 71, dust: w < 300 ? 6 : 14, fog: 0.08, color: s.fog });
}

function orbit(ctx, w, h, s, t, params) {
  const spd = Number.isFinite(params?.speed) ? params.speed : 1;
  const sc = Number.isFinite(params?.scale) ? params.scale : 1;
  const theta = t * 0.43 * spd;
  const center = { x: w / 2, y: h * 0.48 };
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ].map(([x, y, z]) => {
    const p = projection3D(x, y, z, theta, Math.min(w, h) * 0.15 * sc);
    return { x: center.x + p.x, y: center.y + p.y };
  });
  ctx.fillStyle = s.wall;
  for (const f of [[0, 1, 2, 3], [1, 5, 6, 2], [4, 5, 6, 7]]) {
    ctx.beginPath();
    ctx.moveTo(vertices[f[0]].x, vertices[f[0]].y);
    for (const i of f.slice(1)) ctx.lineTo(vertices[i].x, vertices[i].y);
    ctx.closePath();
    ctx.fill();
  }
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) {
    stroke(ctx, vertices[a], vertices[b], Math.max(2, w * 0.005), s.rim);
  }
  drawAtmosphere(ctx, w, h, t, { seed: (params?.seed || 1) + 83, dust: w < 300 ? 6 : 14, fog: 0.08, color: s.fog });
}

function title(ctx, w, h, s, t, params) {
  const pulseR = w * (0.19 + 0.012 * Math.sin(t * 2.2));
  ctx.save();
  ctx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 2.2);
  ellipse(ctx, w * 0.5, h * 0.4, pulseR * 1.28, pulseR * 1.28, s.accent);
  ctx.restore();
  ellipse(ctx, w * 0.5, h * 0.4, pulseR, pulseR, s.accent);
  bitmapText(ctx, String(params?.text || 'NIGHT'), w / 2, h * 0.60, Math.max(5, w * 0.02), s.text, w * 0.78);
  drawAtmosphere(ctx, w, h, t, { seed: (params?.seed || 1) + 91, dust: w < 300 ? 6 : 14, fog: 0.08, color: s.fog });
}

const TEMPLATES = {
  'wide-establishing': (ctx, w, h, s, t, p) => {
    const useBuilding = p?.scene === 'building' || /building/i.test(String(p?.text || ''));
    if (useBuilding) {
      building(ctx, w, h, s, t);
      ctx.save();
      ctx.globalAlpha = 0.15;
      ellipse(ctx, w * 0.76 + Math.sin(t * 0.08) * w * 0.04, h * 0.14 + Math.cos(t * 0.06) * h * 0.02, 54, 54, '#d8b5ba');
      ctx.restore();
      ellipse(ctx, w * 0.76 + Math.sin(t * 0.08) * w * 0.04, h * 0.14 + Math.cos(t * 0.06) * h * 0.02, 32, 32, '#d8b5ba');
      drawAtmosphere(ctx, w, h, t, { seed: (p?.seed || 1) + 99, dust: w < 300 ? 6 : 16, fog: 0.08, color: s.fog });
      return;
    }
    drawNightExterior(ctx, w, h, t, {
      seed: p?.seed || 1,
      moon: p?.moon ?? true,
      clouds: p?.clouds ?? true,
      fence: p?.fence ?? true,
      tree: p?.tree ?? true,
      stars: p?.stars ?? 80
    });
    drawAtmosphere(ctx, w, h, t, {
      seed: (p?.seed || 1) + 17,
      dust: w < 300 ? 5 : 14,
      fog: 0.06,
      color: s.fog
    });
  },
  'window-view': (ctx, w, h, s, t, p) => {
    if (p?.interior === false) {
      building(ctx, w, h, s, t);
      exteriorWindowLegacy(ctx, w, h, s, t, p?.girl !== false);
      const rnd = noise((p?.seed || 1) + 77);
      ctx.save();
      ctx.strokeStyle = '#8ab4c8';
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const rx = rnd() * w, ry = (t * 180 + i * 60) % h, rl = 22 + rnd() * 18;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx, ry + rl);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const showGirl = p?.girl !== false;
    const rawClock = p?.clock ?? p?.clockTime ?? '11:59';
    const clockStr = rawClock === '00:01' ? '12:01' : String(rawClock);

    drawRoomInterior(ctx, w, h, t, {
      seed: p?.seed || 1,
      curtains: p?.curtains ?? true,
      sill: p?.sill ?? true,
      clockTime: clockStr,
      figureOutside: showGirl
        ? {
            variant: p?.variant || 'girl',
            expression: p?.expression || 'blank-stare',
            pose: p?.pose || 'stand',
            phase: t
          }
        : null,
      lightLevel: p?.lightLevel ?? 1
    });

    // Blurred foreground narrator silhouette in bottom-left (matches frame_02, frame_03, frame_10)
    if (p?.narrator !== false) {
      drawBlurred(ctx, w, h, Math.max(2, w * 0.005), (bctx, bw, bh) => {
        drawFigure(bctx, {
          x: bw * 0.135,
          y: bh * 1.02,
          height: bh * 0.29,
          rig: 'silhouette',
          variant: 'boy',
          facing: 1,
          expression: 'scared',
          pose: 'stand',
          phase: t,
          rimSide: 'right',
          rimColor: '#7eb2d6',
          bodyColor: '#1a2c3e',
          dressColor: '#0e2433'
        });
      });
    }

    drawAtmosphere(ctx, w, h, t, {
      seed: (p?.seed || 1) + 29,
      dust: w < 300 ? 6 : 16,
      fog: 0.06,
      color: s.fog
    });
  },
  'character-medium': (ctx, w, h, s, t, p) => renderCloseUpHead(ctx, w, h, s, t, p, false),
  'giant-face': (ctx, w, h, s, t, p) => renderCloseUpHead(ctx, w, h, s, t, p, true),
  'insert-macro-clock': (ctx, w, h, s, t, p) => {
    if (p?.kind === 'analog') {
      analogClock(ctx, w, h, s, t, p);
      drawAtmosphere(ctx, w, h, t, { seed: (p?.seed || 1) + 41, dust: w < 300 ? 6 : 14, fog: 0.07, color: s.fog });
      return;
    }
    const rawTime = p?.time || '11:59';
    const timeStr = rawTime === '00:01' ? '12:01' : String(rawTime);
    const backdrop = p?.backdrop ?? 'room-blur';
    if (backdrop === 'room-blur') {
      drawBlurred(ctx, w, h, Math.max(8, w * 0.022), (bctx, bw, bh) => {
        drawRoomInterior(bctx, bw, bh, t, {
          seed: p?.seed || 1,
          curtains: true,
          sill: true,
          clockTime: timeStr,
          figureOutside: null,
          lightLevel: 0.85
        });
      });
    }
    drawDigitalClock(ctx, {
      x: w * 0.5,
      y: h * 0.44,
      width: w * 0.84,
      time: timeStr,
      color: p?.color || '#ef5350',
      glow: p?.glow ?? 1.1,
      ghost: p?.ghost ?? 0.14,
      flicker: p?.flicker ?? 0,
      t
    });
    drawAtmosphere(ctx, w, h, t, {
      seed: (p?.seed || 1) + 43,
      dust: w < 300 ? 6 : 18,
      fog: 0.07,
      color: '#9ab4cc'
    });
  },
  'figure-exterior': (ctx, w, h, s, t, p) => {
    const moonOpt = p?.moon === false
      ? false
      : (typeof p?.moon === 'object' && p?.moon !== null ? p.moon : { x: 0.535, y: 0.305, r: 0.112 });

    drawNightExterior(ctx, w, h, t, {
      seed: p?.seed || 1,
      moon: moonOpt,
      clouds: p?.clouds ?? true,
      fence: p?.fence ?? true,
      tree: p?.tree ?? true
    });

    const isWalk = Boolean(p?.walk) || p?.pose === 'walk';
    const pose = isWalk ? 'walk' : (p?.pose || 'stand');
    const dir = p?.facing === 'right' ? 1 : (p?.facing === 'front' ? 0 : -1);
    const dur = Number.isFinite(p?.duration) && p.duration > 0 ? p.duration : 2;
    const walkX = isWalk ? (t - dur * 0.5) * w * 0.06 * (dir || -1) : 0;
    const expMix = Number.isFinite(p?.expressionMix)
      ? p.expressionMix
      : (p?.expressionTo ? clamp(t / (dur * 0.7), 0, 1) : 0);
    const gazeObj = typeof p?.gaze === 'object' && p?.gaze !== null ? p.gaze : { x: 0, y: 0 };

    drawFigure(ctx, {
      x: w * 0.50 + walkX,
      y: h * 0.705,
      height: h * 0.275,
      rig: p?.rig || 'silhouette',
      variant: p?.variant || 'girl',
      facing: dir,
      expression: p?.expression || 'blank-stare',
      expressionTo: p?.expressionTo || null,
      expressionMix: expMix,
      gaze: gazeObj,
      pose,
      phase: t,
      rimSide: 'right',
      rimColor: '#dceeff',
      bodyColor: '#0b1420',
      dressColor: (p?.variant || 'girl') === 'girl' ? '#9bc4f4' : '#1b354d'
    });

    drawAtmosphere(ctx, w, h, t, {
      seed: (p?.seed || 1) + 33,
      dust: w < 300 ? 5 : 14,
      fog: 0.06,
      color: s.fog
    });
  },
  'empty-yard': (ctx, w, h, s, t, p) => {
    const moonOpt = p?.moon === false
      ? false
      : (typeof p?.moon === 'object' && p?.moon !== null ? p.moon : { x: 0.535, y: 0.305, r: 0.112 });

    drawNightExterior(ctx, w, h, t, {
      seed: p?.seed || 1,
      moon: moonOpt,
      clouds: p?.clouds ?? true,
      fence: p?.fence ?? true,
      tree: p?.tree ?? true,
      stars: p?.stars ?? 80
    });

    // Subtle ground mist wisp where the figure vanished
    ctx.save();
    const mistDrift = Math.sin(t * 0.9) * (w * 0.03);
    const mistSpread = w * (0.18 + Math.min(0.14, t * 0.05));
    const mistAlpha = Math.max(0.04, 0.18 - t * 0.04);
    ctx.globalAlpha = mistAlpha;
    ellipse(ctx, w * 0.50 + mistDrift, h * 0.695, mistSpread, h * 0.018, '#7fa6c9');
    ctx.restore();

    drawAtmosphere(ctx, w, h, t, {
      seed: (p?.seed || 1) + 44,
      dust: w < 300 ? 6 : 16,
      fog: 0.09,
      color: s.fog
    });
  },
  'data-card': (ctx, w, h, s, t, p) => card(ctx, w, h, s, t, p),
  '3d-orbit': (ctx, w, h, s, t, p) => orbit(ctx, w, h, s, t, p),
  'title-card': (ctx, w, h, s, t, p) => title(ctx, w, h, s, t, p),
  'three-particle-void': (ctx, w, h, s, t, p) => renderThreeFrame(ctx.canvas, buildParticleVoidScene, t),
  'three-night-city': (ctx, w, h, s, t, p) => renderThreeFrame(ctx.canvas, buildNightCityScene, t),
  'three-horror-room': (ctx, w, h, s, t, p) => renderThreeFrame(ctx.canvas, buildHorrorRoomScene, t),
  ...HORROR_TEMPLATES
};

function drawEyelidBlinkTransition(ctx, w, h, closeAmt) {
  const c = clamp(closeAmt, 0, 1);
  if (c <= 0.01) return;
  ctx.save();
  ctx.fillStyle = '#020408';
  const topEdge = h * 0.52 * c;
  const botEdge = h - h * 0.52 * c;
  const curve = h * 0.08 * (1 - c * 0.6);

  // Upper eyelid
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, topEdge);
  ctx.quadraticCurveTo(w * 0.5, topEdge + curve, 0, topEdge);
  ctx.closePath();
  ctx.fill();

  // Lower eyelid
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.lineTo(w, botEdge);
  ctx.quadraticCurveTo(w * 0.5, botEdge - curve, 0, botEdge);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawStudioFrame(canvas, shot, config, seconds = 0, words = []) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const w = canvas.width, h = canvas.height;
  const s = style(config.style || 'midnight');
  const dur = Number.isFinite(shot.duration) && shot.duration > 0 ? shot.duration : 2;
  const seed = shot.seed || shot.params?.seed || 1;

  ctx.save();
  drawBackground(ctx, w, h, s, seconds, seed);

  ctx.save();
  const camKind = shot.camera || 'push';
  let camBlur = 0;
  if (CAMERA_MOVES.includes(camKind)) {
    const cam = cameraTransform(camKind, seconds, dur, {
      intensity: shot.cameraIntensity ?? 1,
      seed
    });
    const scale = w / 720;
    ctx.translate(w * 0.5 + (cam.x || 0) * scale, h * 0.5 + (cam.y || 0) * scale);
    ctx.rotate(cam.rotation || 0);
    ctx.scale(cam.zoom || 1, cam.zoom || 1);
    ctx.translate(-w * 0.5, -h * 0.5);
    camBlur = (cam.blur || 0) * scale;
  } else {
    viewport(ctx, w, h, seconds, camKind);
  }

  const tplFn = TEMPLATES[shot.template];
  if (!tplFn) throw new Error('Unknown template ' + shot.template);
  const tplParams = {
    ...(shot.params || {}),
    duration: dur,
    seed: shot.params?.seed ?? seed
  };

  if (camBlur > 0.35) {
    drawBlurred(ctx, w, h, camBlur, (bctx, bw, bh) => tplFn(bctx, bw, bh, s, seconds, tplParams));
  } else {
    tplFn(ctx, w, h, s, seconds, tplParams);
  }
  ctx.restore();

  // Data-driven vignette and subtle bloom wash applied below captions
  const grade = STYLE_GRADE[config.style || 'midnight'];
  if (grade) {
    drawVignette(ctx, w, h, clamp(grade.vignette * 1.4, 0.15, 0.75));
    ctx.save();
    ctx.globalAlpha = grade.bloom * 0.10;
    const bloom = ctx.createRadialGradient(w * 0.75, h * 0.23, 0, w * 0.75, h * 0.23, w * 0.65);
    bloom.addColorStop(0, s.accent);
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Optional shot transition wipe: 'cut' | 'dip' | 'flash' | 'blink'
  const trans = shot.transition || shot.params?.transition || 'cut';
  const rawTransDur = shot.transitionDuration ?? shot.params?.transitionDuration;
  const transDur = Number.isFinite(Number(rawTransDur)) && Number(rawTransDur) > 0
    ? Number(rawTransDur)
    : Math.min(0.22, dur * 0.35);
  if (trans === 'blink') {
    const blinkWin = Math.min(0.22, dur * 0.25);
    let closeAmt = 0;
    if (seconds < blinkWin) {
      closeAmt = 1 - ease(clamp(seconds / blinkWin, 0, 1));
    } else if (seconds > dur - blinkWin) {
      closeAmt = ease(clamp((seconds - (dur - blinkWin)) / blinkWin, 0, 1));
    }
    drawEyelidBlinkTransition(ctx, w, h, closeAmt);
  } else if (trans === 'flash' && seconds < transDur) {
    const flashAlpha = clamp(1 - ease(clamp(seconds / transDur, 0, 1)), 0, 1) * 0.94;
    if (flashAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = '#fff9f4';
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  } else if (trans === 'dip' && seconds < transDur) {
    const dipAlpha = clamp(1 - ease(clamp(seconds / transDur, 0, 1)), 0, 1) * 0.94;
    if (dipAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = '#020408';
      ctx.globalAlpha = dipAlpha;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // Captions
  ctx.save();
  caption(ctx, w, h, words, seconds + (shot.start || 0), s);
  ctx.restore();

  // Shot fadeIn / fadeOut from/to black
  const rawFadeIn = shot.fadeIn ?? shot.params?.fadeIn ?? 0;
  const fadeInSec = rawFadeIn === true ? Math.min(0.45, dur * 0.35) : (Number(rawFadeIn) || 0);
  const rawFadeOut = shot.fadeOut ?? shot.params?.fadeOut ?? 0;
  const fadeOutSec = rawFadeOut === true ? Math.min(0.65, dur * 0.45) : (Number(rawFadeOut) || 0);

  let fadeAlpha = 0;
  if (fadeInSec > 0 && seconds < fadeInSec) {
    fadeAlpha = Math.max(fadeAlpha, 1 - ease(clamp(seconds / fadeInSec, 0, 1)));
  }
  if (fadeOutSec > 0 && seconds > dur - fadeOutSec) {
    fadeAlpha = Math.max(fadeAlpha, ease(clamp((seconds - (dur - fadeOutSec)) / fadeOutSec, 0, 1)));
  }
  if (fadeAlpha > 0.005) {
    ctx.save();
    ctx.fillStyle = '#020408';
    ctx.globalAlpha = clamp(fadeAlpha, 0, 0.94);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Film grain pass (always advances frame-to-frame)
  const grain = noise(seed * 8971 + Math.floor(seconds * 24) + 1);
  ctx.save();
  ctx.globalAlpha = s.grain;
  for (let i = 0; i < Math.min(110, Math.floor((w * h) / 4800)); i++) {
    ctx.fillStyle = grain() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(grain() * w, grain() * h, 1, 1);
  }
  ctx.restore();

  ctx.restore();
}

export function assertShot(shot) {
  if (!TEMPLATE_NAMES.includes(shot.template)) throw new Error('Unknown template ' + shot.template);
  if (!Number.isFinite(shot.start) || !Number.isFinite(shot.duration) || shot.duration <= 0) {
    throw new Error('Invalid shot time');
  }
  if (shot.duration > 30) throw new Error('Single shot cannot exceed 30 seconds');
}
