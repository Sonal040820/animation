// Original synthesized score, ambience and sound FX. No downloaded samples.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {invoke} from './runner.mjs';
import {mkdir} from './project.mjs';

const RATE = 48000;
const TAU = Math.PI * 2;

export const MUSIC_MOODS = [
  'dread',
  'tension',
  'calm',
  'eerie-lullaby'
];

export const AMBIENCE_TYPES = [
  'night-wind',
  'crickets',
  'room-tone',
  'rain',
  'clock-tick-loop',
  'cold-night',
  'room'
];

export const SFX_TYPES = [
  'phone-buzz',
  'tick',
  'impact',
  'whoosh',
  'heartbeat',
  'breath',
  'sting',
  'stinger',
  'riser',
  'blink-swish',
  'glass-tap',
  'knock',
  'static',
  'lowboom',
  'footstep',
  'latch',
  'rain',
  'click',
  'radio',
  'whisper',
  'subbass'
];

function envelope(t, a, b) {
  return Math.exp(-Math.pow((t - a) / b, 2));
}

function wav(file, samples) {
  mkdir(path.dirname(file));
  const data = Buffer.alloc(44 + samples.length * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(samples.length * 4, 40);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.round(Math.max(-0.96, Math.min(0.96, samples[i])) * 32767);
    data.writeInt16LE(x, 44 + i * 4);
    data.writeInt16LE(x, 46 + i * 4);
  }
  fs.writeFileSync(file, data);
}

function synthMusicSample(mood, t, progress, rnd) {
  if (mood === 'tension') {
    const chord = [58.27, 61.735, 87.307, 116.54, 130.81];
    let drone = 0;
    for (let p = 0; p < chord.length; p++) {
      const freq = chord[p] * (1 + 0.002 * Math.sin(t * 0.41 + p));
      const weight = [0.024, 0.014, 0.015, 0.010, 0.006][p];
      drone += weight * Math.sin(TAU * freq * t + Math.sin(t * (0.25 + p * 0.09)) * 0.2);
    }
    const pulse = 0.034 * envelope(t % 0.85, 0.03, 0.04) * Math.sin(TAU * 52 * t);
    const rise = 0.018 * Math.pow(progress, 1.7) * Math.sin(TAU * (55 + 38 * progress) * t);
    return drone + pulse + rise;
  }
  if (mood === 'calm') {
    const chord = [65.406, 98.0, 130.81, 164.81, 196.0];
    let pad = 0;
    for (let p = 0; p < chord.length; p++) {
      const freq = chord[p] * (1 + 0.0008 * Math.sin(t * 0.18 + p));
      const weight = [0.022, 0.016, 0.012, 0.008, 0.005][p];
      pad += weight * Math.sin(TAU * freq * t);
    }
    const shimmer = 0.004 * (0.5 + 0.5 * Math.sin(t * 0.35)) * Math.sin(TAU * 293.66 * t);
    return pad + shimmer;
  }
  if (mood === 'eerie-lullaby') {
    const notes = [220.0, 261.63, 329.63, 349.23, 415.3, 329.63, 261.63, 246.94];
    const step = 0.65;
    const idx = Math.floor(t / step) % notes.length;
    const localT = t % step;
    const f = notes[idx];
    const bell =
      (0.026 * Math.sin(TAU * f * localT) + 0.009 * Math.sin(TAU * f * 2.0 * localT)) *
      Math.exp(-localT * 4.2);
    const sub = 0.020 * Math.sin(TAU * 55.0 * t) + 0.010 * Math.sin(TAU * 82.407 * t);
    return bell + sub;
  }
  // Default: 'dread'
  const chord = [55, 65.406, 82.407, 110.0, 123.47];
  let drone = 0;
  for (let p = 0; p < chord.length; p++) {
    const freq = chord[p] * (1 + 0.0012 * Math.sin(t * 0.23 + p));
    const weight = [0.026, 0.009, 0.015, 0.010, 0.005][p];
    drone += weight * Math.sin(TAU * freq * t + Math.sin(t * (0.17 + p * 0.07)) * 0.13);
  }
  const pulseBeat = 0.030 * envelope(t % 1.3, 0.03, 0.045) * Math.sin(TAU * 46 * t);
  const rise = 0.014 * Math.pow(progress, 2) * Math.sin(TAU * (42 + 24 * progress) * t);
  const breath = 0.010 * (rnd() * 2 - 1) * (1 + 0.22 * Math.sin(t * 0.73));
  return drone + pulseBeat + rise + breath;
}

function synthAmbienceSample(type, t, rnd) {
  switch (type) {
    case 'night-wind':
    case 'cold-night': {
      const sweep = 0.012 * Math.sin(TAU * (135 + 32 * Math.sin(t * 0.42)) * t);
      const air = 0.014 * (rnd() * 2 - 1) * (0.6 + 0.4 * Math.sin(t * 0.55));
      return sweep + air;
    }
    case 'crickets': {
      const cycle = t % 0.48;
      const env = envelope(cycle, 0.10, 0.055) + 0.7 * envelope(cycle, 0.22, 0.055);
      const pulse = 0.5 + 0.5 * Math.sin(TAU * 32 * t);
      return 0.012 * env * pulse * Math.sin(TAU * 4150 * t);
    }
    case 'room-tone':
    case 'room': {
      const hum = 0.008 * Math.sin(TAU * 60 * t) + 0.004 * Math.sin(TAU * 120 * t);
      const air = 0.004 * (rnd() * 2 - 1);
      return hum + air;
    }
    case 'rain': {
      const patter = 0.018 * (rnd() * 2 - 1) * (0.75 + 0.25 * Math.sin(t * 1.7));
      const drop = (t % 0.19) < 0.015 ? 0.012 * Math.exp(-(t % 0.19) * 180) * Math.sin(TAU * 1450 * t) : 0;
      return patter + drop;
    }
    case 'clock-tick-loop': {
      const beat = t % 0.5;
      const isTock = Math.floor(t * 2) % 2 === 1;
      const freq = isTock ? 940 : 1180;
      return beat < 0.08 ? 0.045 * Math.exp(-beat * 75) * Math.sin(TAU * freq * beat) : 0;
    }
    default:
      return 0;
  }
}

function synthSfxSample(type, d, rnd) {
  const exponential = Math.exp(-d * 10);
  switch (type) {
    case 'knock':
      return (0.26 * Math.sin(TAU * (91 - 10 * d) * d) + 0.12 * (rnd() * 2 - 1)) * Math.exp(-d * 34);
    case 'radio':
    case 'static':
      return (rnd() * 2 - 1) * 0.055 * envelope(d, 0.25, 0.25);
    case 'whisper':
    case 'breath':
      return (rnd() * 2 - 1) * 0.024 * Math.exp(-d * 3);
    case 'lowboom':
    case 'subbass':
      return 0.15 * Math.exp(-d * 3) * Math.sin(TAU * (52 - 15 * d) * d);
    case 'footstep':
      return 0.13 * Math.exp(-d * 25) * Math.sin(TAU * 71 * d);
    case 'rain':
      return (rnd() * 2 - 1) * 0.021 * Math.exp(-d * 0.8);
    case 'phone-buzz': {
      const envelope=Math.max(0,Math.sin(TAU*5.7*d)) * Math.exp(-d*4.7);
      return d<.65 ? envelope*(.19*Math.sin(TAU*118*d)+.047*Math.sin(TAU*236*d)) : 0;
    }
    case 'latch':
      return 0.20 * Math.exp(-d * 46) * (rnd() * 2 - 1) + 0.095 * Math.exp(-d * 14) * Math.sin(TAU * 980 * d);
    case 'heartbeat':
      return 0.16 * Math.exp(-d * 20) * Math.sin(TAU * 62 * d) + 0.08 * envelope(d, 0.19, 0.04) * Math.sin(TAU * 58 * d);
    case 'click':
    case 'tick':
      return 0.12 * Math.exp(-d * 65) * Math.sin(TAU * 1150 * d);
    case 'whoosh':
      return 0.11 * envelope(d, 0.2, 0.17) * (rnd() * 2 - 1);
    case 'impact':
      return exponential * (0.21 * Math.sin(TAU * (80 - 10 * d) * d) + 0.07 * (rnd() * 2 - 1));
    case 'sting':
    case 'stinger':
      return (
        Math.exp(-d * 4.5) *
        (0.08 * Math.sin(TAU * 311.13 * d) +
          0.08 * Math.sin(TAU * 329.63 * d) +
          0.07 * Math.sin(TAU * 466.16 * d) +
          0.06 * Math.sin(TAU * 622.25 * d))
      );
    case 'riser': {
      const ramp = Math.pow(Math.min(1, d / 1.1), 1.8);
      return ramp * (0.14 * Math.sin(TAU * (90 + 260 * d * d) * d) + 0.04 * (rnd() * 2 - 1));
    }
    case 'blink-swish':
      return (
        envelope(d, 0.06, 0.042) *
        (0.09 * Math.sin(TAU * Math.max(60, 240 - 900 * d) * d) + 0.05 * (rnd() * 2 - 1))
      );
    case 'glass-tap':
      return (
        Math.exp(-d * 28) *
        (0.11 * Math.sin(TAU * 2480 * d) + 0.06 * Math.sin(TAU * 3720 * d) + 0.04 * Math.exp(-d * 90) * (rnd() * 2 - 1))
      );
    default:
      return 0;
  }
}

export function synthOriginalAudio(dir, duration, cues = [], options = {}) {
  const n = Math.max(1, Math.floor(duration * RATE));
  const samples = new Float32Array(n);
  let state = 15129421;
  const rnd = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  const score = options.score || {};
  const mood = MUSIC_MOODS.includes(options.mood || score.mood) ? (options.mood || score.mood) : 'dread';
  const ambienceSpans = Array.isArray(options.ambienceSpans) ? options.ambienceSpans : [];
  const cueData = (cues || [])
    .map(c => ({ type: c.type, time: Number(c.time) }))
    .filter(c => Number.isFinite(c.time));

  // Data-driven score dynamics (defaulting to the-wrong-side cues when 60s film with cues and no override)
  const isLegacy60 = Math.abs(duration - 60) < 0.5 && cueData.length >= 15 && !options.score;
  const chimeWindows = Array.isArray(score.chimeWindows)
    ? score.chimeWindows
    : isLegacy60
    ? [{ start: 37, end: 56, freq: 329.6, gain: 0.004 }]
    : [];
  const silenceWindows = Array.isArray(score.silenceWindows)
    ? score.silenceWindows
    : isLegacy60
    ? [{ start: 56.8, end: 57.5, gain: 0.12 }]
    : [];
  const tailFade = Number.isFinite(Number(score.tailFadeSeconds)) ? Number(score.tailFadeSeconds) : 0.45;

  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const progress = t / Math.max(0.1, duration);
    let sound = synthMusicSample(mood, t, progress, rnd);

    for (const cw of chimeWindows) {
      if (t > cw.start && t < cw.end) {
        const freq = cw.freq || 329.6;
        const gain = cw.gain ?? 0.004;
        sound += gain * Math.sin(TAU * freq * t) * (0.5 + 0.5 * Math.sin(t * 0.46));
      }
    }

    for (const span of ambienceSpans) {
      if (t >= span.start && t <= span.end) {
        const fadeIn = Math.min(1, (t - span.start) / 0.08);
        const fadeOut = Math.min(1, (span.end - t) / 0.08);
        sound += fadeIn * fadeOut * synthAmbienceSample(span.type, t, rnd);
      }
    }

    for (const cue of cueData) {
      const d = t - cue.time;
      if (d < 0 || d > 1.3) continue;
      sound += synthSfxSample(cue.type, d, rnd);
    }

    for (const sw of silenceWindows) {
      if (t >= sw.start && t < sw.end) {
        sound *= sw.gain ?? 0.12;
      }
    }

    if (tailFade > 0 && t >= duration - tailFade) {
      sound *= Math.max(0, (duration - t) / tailFade);
    }
    samples[i] = Math.max(-0.85, Math.min(0.85, sound));
  }
  const file = path.join(dir, 'synth-original.wav');
  wav(file, samples);
  return file;
}

function parseLoudnormJson(stderrText) {
  if (!stderrText) return null;
  const matches = stderrText.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/g);
  if (!matches || !matches.length) return null;
  try {
    return JSON.parse(matches[matches.length - 1]);
  } catch {
    return null;
  }
}

export function mix(project, duration) {
  const shots = project?.manifest?.shots || [];
  const resolvedDuration =
    Number(duration) ||
    Number(project?.duration) ||
    Math.max(0.1, ...shots.map(s => (Number(s.start) || 0) + (Number(s.duration) || 0)));

  const out = path.join(project.out, 'final.mp4');
  const voice = path.join(project.dir, 'timeline', 'voice.wav');
  const voicePresent = fs.existsSync(voice) && fs.statSync(voice).size > 100;

  const cues = shots.flatMap(s => {
    const baseCues = (s.sfx || []).map(c => ({
      type: c.type || 'tick',
      time: (Number(s.start) || 0) + (Number(c.offset) || 0)
    }));
    const wordCues = (s.resolvedCues || s.cues || [])
      .filter(c => c && (c.action === 'sfx' || c.sfx) && Number.isFinite(Number(c.at ?? ((Number(s.start) || 0) + (Number(c.localTime) || 0)))))
      .map(c => ({
        type: String(c.sfx || c.type || 'tick'),
        time: Number.isFinite(Number(c.at)) ? Number(c.at) : (Number(s.start) || 0) + (Number(c.localTime) || 0)
      }));
    return [...baseCues, ...wordCues];
  });
  const ambienceSpans = shots
    .filter(s => s.ambience)
    .map(s => ({
      type: s.ambience,
      start: Number(s.start) || 0,
      end: (Number(s.start) || 0) + (Number(s.duration) || 0)
    }));
  const score = project?.config?.score || undefined;
  const mood = score?.mood || project?.config?.mood || 'dread';

  const bed = synthOriginalAudio(project.out, resolvedDuration, cues, {
    mood,
    ambienceSpans,
    score
  });

  const video = path.join(project.out, 'video_silent.mp4');
  if (!fs.existsSync(video)) throw new Error('Render silent video before mixing');

  // Build pre-loudnorm audio graph (ducking music bed under voice when voice is present)
  // Pad voice stream with silence up to resolvedDuration so sidechaincompress never stops early during the tail fade.
  const preMixChain = voicePresent
    ? `[1:a]volume=0.65[bed];[2:a]volume=1.25,apad=whole_dur=${resolvedDuration.toFixed(3)},asplit=2[vsc][vmix];[bed][vsc]sidechaincompress=threshold=0.012:ratio=9:attack=10:release=240[duck];[duck][vmix]amix=inputs=2:duration=first:normalize=0`
    : '[1:a]volume=1.0';

  // Pass 1: Measure input loudness statistics for two-pass loudnorm to -14 LUFS
  const pass1Args = ['-hide_banner', '-i', video, '-i', bed];
  if (voicePresent) pass1Args.push('-i', voice);
  pass1Args.push(
    '-t',
    String(resolvedDuration),
    '-filter_complex',
    `${preMixChain},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[out]`,
    '-map',
    '[out]',
    '-vn',
    '-f',
    'null',
    '-'
  );
  const pass1 = spawnSync('ffmpeg', pass1Args, {
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 4 * 1024 * 1024
  });
  const p1Stats = parseLoudnormJson(pass1.stderr || '');

  let loudnormFilter = 'loudnorm=I=-14:TP=-1.5:LRA=11';
  if (
    p1Stats &&
    Number.isFinite( parseFloat(p1Stats.input_i) ) &&
    Number.isFinite( parseFloat(p1Stats.input_tp) ) &&
    Number.isFinite( parseFloat(p1Stats.input_lra) ) &&
    Number.isFinite( parseFloat(p1Stats.input_thresh) ) &&
    Number.isFinite( parseFloat(p1Stats.target_offset) )
  ) {
    loudnormFilter =
      `loudnorm=I=-14:TP=-1.5:LRA=11` +
      `:measured_I=${p1Stats.input_i}` +
      `:measured_TP=${p1Stats.input_tp}` +
      `:measured_LRA=${p1Stats.input_lra}` +
      `:measured_thresh=${p1Stats.input_thresh}` +
      `:offset=${p1Stats.target_offset}` +
      `:linear=true`;
  }

  // Pass 2: Render final.mp4 with two-pass loudnorm
  const peakCeiling = project.config?.audio?.peakCeilingDb;
  const peakLimiter = Number.isFinite(peakCeiling) && peakCeiling >= -12 && peakCeiling <= -1
    ? `,aresample=192000,alimiter=limit=${(10 ** (peakCeiling / 20)).toFixed(6)}:level=0:latency=1`
    : '';
  const pass2Args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-i', bed];
  if (voicePresent) pass2Args.push('-i', voice);
  pass2Args.push(
    '-filter_complex',
    `${preMixChain},${loudnormFilter}${peakLimiter}[out]`,
    '-map',
    '0:v',
    '-map',
    '[out]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    String(RATE),
    '-t',
    String(resolvedDuration),
    '-movflags',
    '+faststart',
    out
  );
  invoke('ffmpeg', pass2Args, { timeout: 600000 });

  // Measure actual integrated loudness & true peak of final.mp4
  const measureRun = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-i',
      out,
      '-af',
      'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
      '-vn',
      '-f',
      'null',
      '-'
    ],
    { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 }
  );
  const measured = parseLoudnormJson(measureRun.stderr || '');
  const integratedLufs =
    measured && Number.isFinite(parseFloat(measured.input_i))
      ? Number(parseFloat(measured.input_i).toFixed(2))
      : null;
  const truePeak =
    measured && Number.isFinite(parseFloat(measured.input_tp))
      ? Number(parseFloat(measured.input_tp).toFixed(2))
      : null;
  const lra =
    measured && Number.isFinite(parseFloat(measured.input_lra))
      ? Number(parseFloat(measured.input_lra).toFixed(2))
      : null;

  const audioReport = {
    schema_version: 1,
    integrated_lufs: integratedLufs,
    true_peak: truePeak,
    lra,
    target_lufs: -14.0,
    voice_present: voicePresent,
    mood,
    sfx_count: cues.length,
    ambience_spans: ambienceSpans.length
  };
  const reportFile = path.join(project.out, 'audio-report.json');
  mkdir(project.out);
  fs.writeFileSync(reportFile, JSON.stringify(audioReport, null, 2) + '\n');

  return {
    file: out,
    voicePresent,
    integrated_lufs: integratedLufs,
    true_peak: truePeak,
    report: reportFile
  };
}
