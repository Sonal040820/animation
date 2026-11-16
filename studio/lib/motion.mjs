// Deterministic stateless motion, spring physics, natural blink timing, and camera transforms.
// Pure functions of (t, seed) — safe for out-of-order frame rendering and Node imports.
import { clamp, mix } from './core.mjs';

export function easeInOutCubic(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(t, s = 1.70158) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c3 = s + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

// Analytical damped harmonic oscillator (mass-spring-damper).
export function spring(t, { from = 0, to = 1, stiffness = 120, damping = 14, mass = 1 } = {}) {
  if (!Number.isFinite(t) || t <= 0) return from;
  const m = Math.max(1e-4, mass);
  const k = Math.max(1e-4, stiffness);
  const c = Math.max(0, damping);
  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  let progress;
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * omega0 * t);
    progress = 1 - env * (Math.cos(omegaD * t) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * t));
  } else if (Math.abs(zeta - 1) < 1e-6) {
    const env = Math.exp(-omega0 * t);
    progress = 1 - env * (1 + omega0 * t);
  } else {
    const root = Math.sqrt(zeta * zeta - 1);
    const r1 = -omega0 * (zeta - root);
    const r2 = -omega0 * (zeta + root);
    progress = 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  return from + (to - from) * progress;
}

// Fast deterministic integer hash -> [-1, 1].
function hash1D(seed, i) {
  let x = ((seed | 0) * 374761393 + (i | 0) * 668265263) >>> 0;
  x = ((x ^ (x >>> 13)) * 1274126177) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return (x / 2147483647.5) - 1;
}

function octaveNoise(seed, t) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return mix(hash1D(seed, i), hash1D(seed, i + 1), u);
}

// Smooth deterministic 2-octave 1D noise in [-1, 1].
export function smoothNoise(seed = 1, t = 0) {
  const s = (seed | 0) || 1;
  const n1 = octaveNoise(s, t);
  const n2 = octaveNoise(s + 97, t * 2.17 + 0.37);
  return clamp(n1 * 0.76 + n2 * 0.24, -1, 1);
}

// Natural asymmetric breathing rhythm in [-1, 1] at `rate` Hz.
export function breathe(t = 0, rate = 0.25) {
  const phase = t * rate * Math.PI * 2;
  return clamp(Math.sin(phase) * 0.85 + Math.sin(phase * 2 - 0.45) * 0.15, -1, 1);
}

// Single blink envelope with fast close, brief hold, and slight eyelid overshoot on reopen.
function singleBlinkCurve(dt, dur) {
  if (dt < 0 || dt > dur) return 0;
  const u = dt / dur;
  if (u < 0.32) {
    // Rapid closing phase
    const p = u / 0.32;
    return p * p * (3 - 2 * p);
  }
  if (u < 0.52) {
    // Full closure hold
    return 1;
  }
  // Smooth opening with subtle eyelid settling
  const p = (u - 0.52) / 0.48;
  const open = 1 - easeOutBack(p, 1.15);
  return clamp(open, 0, 1);
}

// Deterministic natural blink amount in [0, 1] (1 = closed).
export function blinkAmount(t, { period = 3.2, seed = 0, duration = 0.16, forceAt = [] } = {}) {
  if (!Number.isFinite(t)) return 0;
  const baseDur = clamp(Number.isFinite(duration) ? duration : 0.16, 0.08, 0.45);
  let amount = 0;

  // Forced blinks (e.g. narrative "I blinked" cue)
  // Supports numbers (timestamp) or objects { at, duration, exactStart }
  const forcedList = Array.isArray(forceAt)
    ? forceAt
    : (Number.isFinite(forceAt) ? [forceAt] : []);
  for (const item of forcedList) {
    const isObj = typeof item === 'object' && item !== null;
    const ft = isObj ? Number(item.at) : Number(item);
    if (!Number.isFinite(ft)) continue;
    const fDur = isObj && Number.isFinite(Number(item.duration))
      ? clamp(Number(item.duration), 0.08, 0.8)
      : baseDur * 1.1;
    const start = (isObj && item.exactStart) ? ft : (ft - baseDur * 0.25);
    amount = Math.max(amount, singleBlinkCurve(t - start, fDur));
  }

  // Natural seeded periodic blinks (random intervals, 120-180ms duration)
  if (period > 0.2) {
    const k = Math.floor(t / period);
    for (let win = k - 1; win <= k; win++) {
      if (win < 0) continue;
      const jitter = (hash1D(seed + 19, win) + 1) * 0.5; // 0..1
      const durJitter = (hash1D(seed + 73, win) + 1) * 0.5; // 0..1
      const winDur = clamp(baseDur * (0.78 + durJitter * 0.36), 0.12, 0.185);
      const offset = (0.18 + jitter * 0.62) * period;
      const start = win * period + offset;
      amount = Math.max(amount, singleBlinkCurve(t - start, winDur));
    }
  }

  return clamp(amount, 0, 1);
}

// Secondary motion helper: samples `fn` at `t - lag`.
export function follow(fn, t, lag = 0.08) {
  return fn(t - lag);
}

export const CAMERA_MOVES = Object.freeze([
  'push',
  'pull',
  'pan-left',
  'pan-right',
  'tilt-up',
  'tilt-down',
  'orbit',
  'handheld',
  'rack-focus',
  'drift',
  'shake',
  'dolly-zoom',
  'creep',
  'static'
]);

// Stateless camera transform returning named fields {x, y, zoom, rotation, blur}.
// Never returns a bare array.
export function cameraTransform(kind = 'push', t = 0, duration = 3, { intensity = 1, seed = 1, flashDecay = 0 } = {}) {
  const dur = Math.max(0.1, Number.isFinite(duration) && duration > 0 ? duration : 3);
  const p = clamp(t / dur, 0, 1);
  const ep = easeInOutCubic(p);
  const k = Number.isFinite(intensity) ? intensity : 1;
  const s = (seed | 0) || 1;

  let x = 0;
  let y = 0;
  let zoom = 1;
  let rotation = 0;
  let blur = 0;

  switch (kind) {
    case 'push':
      zoom = 1 + 0.125 * ep * k;
      x = smoothNoise(s, t * 0.65) * 4.5 * k;
      y = smoothNoise(s + 17, t * 0.55) * 3.5 * k;
      rotation = Math.sin(t * 0.45) * 0.011 * k;
      break;
    case 'creep':
      zoom = 1 + 0.095 * p * k;
      x = smoothNoise(s + 3, t * 0.55) * 4.0 * k;
      y = smoothNoise(s + 19, t * 0.48) * 3.2 * k;
      rotation = Math.sin(t * 0.42) * 0.009 * k;
      break;
    case 'pull':
      zoom = 1.01 + 0.135 * (1 - ep) * k;
      x = smoothNoise(s, t * 0.6) * 4.0 * k;
      y = smoothNoise(s + 11, t * 0.52) * 3.0 * k;
      rotation = Math.sin(t * 0.45) * 0.01 * k;
      break;
    case 'pan-left':
      zoom = 1 + 0.075 * Math.max(1, k);
      x = (1 - 2 * ep) * 12 * k;
      y = smoothNoise(s + 5, t * 0.4) * 1.5 * k;
      break;
    case 'pan-right':
      zoom = 1 + 0.075 * Math.max(1, k);
      x = (2 * ep - 1) * 12 * k;
      y = smoothNoise(s + 5, t * 0.4) * 1.5 * k;
      break;
    case 'tilt-up':
      zoom = 1 + 0.075 * Math.max(1, k);
      x = smoothNoise(s + 7, t * 0.4) * 1.5 * k;
      y = (1 - 2 * ep) * 14 * k;
      break;
    case 'tilt-down':
      zoom = 1 + 0.075 * Math.max(1, k);
      x = smoothNoise(s + 7, t * 0.4) * 1.5 * k;
      y = (2 * ep - 1) * 14 * k;
      break;
    case 'orbit':
      zoom = 1 + 0.055 * k + 0.018 * Math.sin(t * 0.5) * k;
      x = Math.sin(t * 0.65) * 9 * k;
      y = Math.cos(t * 0.65) * 4 * k;
      rotation = Math.sin(t * 0.4) * 0.016 * k;
      break;
    case 'handheld':
      zoom = 1 + 0.045 * Math.max(1, k) + smoothNoise(s + 31, t * 0.9) * 0.012 * k;
      x = (smoothNoise(s + 101, t * 1.8) * 6 + smoothNoise(s + 103, t * 4.2) * 1.8) * k;
      y = (smoothNoise(s + 201, t * 1.6) * 5 + smoothNoise(s + 203, t * 3.9) * 1.5) * k;
      rotation = smoothNoise(s + 301, t * 1.3) * 0.014 * k;
      break;
    case 'rack-focus': {
      const focusCurve = Math.max(0, 1 - easeInOutCubic(clamp(p * 1.85, 0, 1)));
      zoom = 1 + 0.05 * ep * k;
      x = smoothNoise(s + 41, t * 0.4) * 2 * k;
      y = smoothNoise(s + 43, t * 0.4) * 2 * k;
      blur = 5.5 * focusCurve * k;
      break;
    }
    case 'drift':
      zoom = 1 + 0.04 * k + 0.015 * Math.sin(t * 0.4) * k;
      x = Math.sin(t * 0.45 + s) * 6 * k;
      y = Math.cos(t * 0.35 + s) * 4 * k;
      rotation = Math.sin(t * 0.3 + s) * 0.009 * k;
      break;
    case 'shake': {
      const decayEnv = flashDecay > 0 ? Math.exp(-t * flashDecay) : 1;
      zoom = 1 + 0.075 * Math.max(1, k) + 0.04 * decayEnv * k;
      x = (smoothNoise(s + 501, t * 18) * 11 + Math.sin(t * 43 + s) * 4.5) * k * (0.35 + 0.65 * decayEnv);
      y = (smoothNoise(s + 601, t * 17) * 9 + Math.cos(t * 47 + s) * 4.0) * k * (0.35 + 0.65 * decayEnv);
      rotation = smoothNoise(s + 701, t * 14) * 0.028 * k * (0.35 + 0.65 * decayEnv);
      blur = Math.abs(smoothNoise(s + 801, t * 12)) * 1.4 * k * decayEnv;
      break;
    }
    case 'dolly-zoom':
      zoom = 1 + 0.14 * ep * k;
      x = smoothNoise(s + 51, t * 0.6) * 2 * k;
      y = (0.5 - ep) * 8 * k;
      rotation = Math.sin(t * 0.5) * 0.01 * k;
      blur = Math.abs(p - 0.5) < 0.2 ? 0 : 0.8 * k;
      break;
    default:
      zoom = 1 + 0.018 * Math.sin(t * 0.5) * k;
      x = smoothNoise(s, t * 0.35) * 1.5 * k;
      y = smoothNoise(s + 9, t * 0.3) * 1.2 * k;
      rotation = Math.sin(t * 0.25) * 0.004 * k;
      break;
  }

  // Optional decaying impact shake overlay (e.g. triggered by a 'flash' shot transition)
  if (flashDecay > 0 && kind !== 'shake') {
    const decayEnv = Math.exp(-t * flashDecay);
    x += Math.sin(t * 48 + s) * 10 * k * decayEnv;
    y += Math.cos(t * 43 + s) * 8 * k * decayEnv;
    rotation += Math.sin(t * 39 + s) * 0.022 * k * decayEnv;
    zoom += 0.03 * decayEnv * k;
  }

  return { x, y, zoom, rotation, blur };
}
