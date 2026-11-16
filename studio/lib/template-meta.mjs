// Single source of truth for all shot templates, their tags, parameter schemas, and examples.
// Consumed by studio/lib/validate.mjs and studio/cli/studio.mjs index generator.

export const TRANSITION_VALUES = Object.freeze(['cut', 'dip', 'flash', 'blink']);

const EXPRESSION_VALUES = Object.freeze([
  'neutral', 'scared', 'terrified', 'surprise', 'suspicious',
  'sad', 'relieved', 'angry', 'blank-stare', 'happy'
]);

const RIG_VALUES = Object.freeze(['silhouette', 'block', 'stick']);
const POSE_VALUES = Object.freeze(['stand', 'walk', 'look', 'flinch', 'still', 'idle', 'run', 'fear']);
const VARIANT_VALUES = Object.freeze(['girl', 'boy', 'adult']);

export const TEMPLATE_META = Object.freeze({
  'wide-establishing': {
    summary: 'Wide exterior night shot with moonlit sky, drifting clouds, rolling hill, picket fence, bare tree, or apartment facade.',
    tags: ['exterior', 'establishing', 'night', 'moon', 'fence', 'atmosphere'],
    params: {
      scene: { type: 'enum', values: ['fence-moon', 'building', 'yard', 'night'], default: 'fence-moon' },
      set: { type: 'string', default: '' },
      text: { type: 'string', default: '' },
      moon: { type: 'boolean', default: true },
      clouds: { type: 'boolean', default: true },
      fence: { type: 'boolean', default: true },
      tree: { type: 'boolean', default: true },
      stars: { type: 'number', min: 0, max: 300, default: 80 },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { scene: 'fence-moon', moon: true, clouds: true, fence: true, tree: true }
  },
  'window-view': {
    summary: 'Interior or exterior 4-pane window view with red curtains, sill digital clock, optional girl outside, and blurred foreground narrator.',
    tags: ['interior', 'window', 'clock', 'silhouette', 'narrator', 'curtains'],
    params: {
      interior: { type: 'boolean', default: true },
      girl: { type: 'boolean', default: true },
      clock: { type: 'string', default: '11:59' },
      clockTime: { type: 'string', default: '11:59' },
      narrator: { type: 'boolean', default: false },
      curtains: { type: 'boolean', default: true },
      sill: { type: 'boolean', default: true },
      rain: { type: 'boolean', default: false },
      lightLevel: { type: 'number', min: 0, max: 2, default: 1 },
      expression: { type: 'enum', values: EXPRESSION_VALUES, default: 'blank-stare' },
      variant: { type: 'enum', values: VARIANT_VALUES, default: 'girl' },
      pose: { type: 'enum', values: POSE_VALUES, default: 'stand' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { interior: true, girl: true, clock: '11:59', narrator: true }
  },
  'character-medium': {
    summary: 'Medium character reaction shot supporting silhouette close-up head or full rig with blinks, expressions, and blurred room backdrop.',
    tags: ['character', 'reaction', 'medium', 'face', 'silhouette'],
    params: {
      rig: { type: 'enum', values: RIG_VALUES, default: 'block' },
      expression: { type: 'enum', values: EXPRESSION_VALUES, default: 'scared' },
      expressionTo: { type: 'enum', values: EXPRESSION_VALUES, default: 'scared' },
      expressionMix: { type: 'number', min: 0, max: 1, default: 0 },
      backdrop: { type: 'enum', values: ['room-blur', 'none', 'night'], default: 'none' },
      blinkAt: { type: 'array', itemType: 'number', default: [] },
      blink: { type: 'boolean', default: true },
      gaze: { type: 'object', default: { x: 0, y: 0 } },
      color: { type: 'string', default: '#c1486a' },
      wobble: { type: 'number', min: 0, max: 20, default: 4 },
      rimPulse: { type: 'boolean', default: true },
      variant: { type: 'enum', values: VARIANT_VALUES, default: 'adult' },
      pose: { type: 'enum', values: POSE_VALUES, default: 'stand' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { rig: 'silhouette', expression: 'scared', backdrop: 'room-blur' }
  },
  'giant-face': {
    summary: 'Extreme close-up head shot with expressive eyes, natural or forced blinks, rim-light arc, and optional blurred room backdrop.',
    tags: ['character', 'closeup', 'face', 'blink', 'reaction', 'silhouette'],
    params: {
      rig: { type: 'enum', values: RIG_VALUES, default: 'silhouette' },
      expression: { type: 'enum', values: EXPRESSION_VALUES, default: 'scared' },
      expressionTo: { type: 'enum', values: EXPRESSION_VALUES, default: 'surprise' },
      expressionMix: { type: 'number', min: 0, max: 1, default: 0 },
      backdrop: { type: 'enum', values: ['room-blur', 'none', 'night'], default: 'room-blur' },
      blinkAt: { type: 'array', itemType: 'number', default: [] },
      blink: { type: 'boolean', default: true },
      gaze: { type: 'object', default: { x: 0, y: 0 } },
      color: { type: 'string', default: '#c1486a' },
      headColor: { type: 'string', default: '#091624' },
      shirtColor: { type: 'string', default: '#347c92' },
      rimColor: { type: 'string', default: '#dd4b4b' },
      wobble: { type: 'number', min: 0, max: 20, default: 4 },
      rimPulse: { type: 'boolean', default: true },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { rig: 'silhouette', expression: 'surprise', backdrop: 'room-blur', blinkAt: [0.35] }
  },
  'insert-macro-clock': {
    summary: 'Macro clock insert shot supporting 7-segment red digital clock over blurred room backdrop or classic analog midnight dial.',
    tags: ['insert', 'macro', 'clock', 'digital', 'time', 'prop'],
    params: {
      time: { type: 'string', default: '11:59' },
      kind: { type: 'enum', values: ['digital', 'analog'], default: 'digital' },
      backdrop: { type: 'enum', values: ['room-blur', 'wall', 'none'], default: 'room-blur' },
      color: { type: 'string', default: '#ff4d4d' },
      glow: { type: 'number', min: 0, max: 2, default: 1 },
      ghost: { type: 'number', min: 0, max: 0.5, default: 0.12 },
      flicker: { type: 'number', min: 0, max: 1, default: 0 },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { time: '11:59', kind: 'digital', backdrop: 'room-blur' }
  },
  'figure-exterior': {
    summary: 'Silhouette figure standing or walking in the moonlit night yard in front of the picket fence and bare tree.',
    tags: ['exterior', 'figure', 'silhouette', 'girl', 'yard', 'stare'],
    params: {
      variant: { type: 'enum', values: VARIANT_VALUES, default: 'girl' },
      pose: { type: 'enum', values: POSE_VALUES, default: 'stand' },
      expression: { type: 'enum', values: EXPRESSION_VALUES, default: 'blank-stare' },
      expressionTo: { type: 'enum', values: EXPRESSION_VALUES, default: 'blank-stare' },
      expressionMix: { type: 'number', min: 0, max: 1, default: 0 },
      rig: { type: 'enum', values: RIG_VALUES, default: 'silhouette' },
      facing: { type: 'enum', values: ['left', 'right', 'front'], default: 'left' },
      gaze: { type: 'object', default: { x: 0, y: 0 } },
      walk: { type: 'boolean', default: false },
      moon: { type: 'boolean', default: true },
      clouds: { type: 'boolean', default: true },
      fence: { type: 'boolean', default: true },
      tree: { type: 'boolean', default: true },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { variant: 'girl', pose: 'stand', expression: 'blank-stare' }
  },
  'empty-yard': {
    summary: 'Empty moonlit night exterior yard with picket fence, bare tree, drifting clouds, and mist after a figure vanishes.',
    tags: ['exterior', 'empty', 'yard', 'vanish', 'gone', 'night'],
    params: {
      moon: { type: 'boolean', default: true },
      clouds: { type: 'boolean', default: true },
      fence: { type: 'boolean', default: true },
      tree: { type: 'boolean', default: true },
      stars: { type: 'number', min: 0, max: 300, default: 80 },
      clock: { type: 'string', default: '' },
      lightLevel: { type: 'number', min: 0, max: 2, default: 0.9 },
      text: { type: 'string', default: '' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { moon: true, clouds: true, fence: true, tree: true }
  },
  'data-card': {
    summary: 'Typographic data card displaying a title and highlighted value over atmospheric background.',
    tags: ['card', 'text', 'ui', 'data'],
    params: {
      text: { type: 'string', default: 'THE CLOCK' },
      value: { type: 'string', default: '11:59' },
      subtext: { type: 'string', default: '' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { text: 'THE CLOCK', value: '11:59' }
  },
  '3d-orbit': {
    summary: 'Wireframe and shaded 3D cube orbiting in perspective space.',
    tags: ['3d', 'geometric', 'orbit', 'abstract'],
    params: {
      speed: { type: 'number', min: 0.1, max: 5, default: 1 },
      scale: { type: 'number', min: 0.2, max: 3, default: 1 },
      camera: { type: 'string', default: 'orbit' },
      text: { type: 'string', default: '' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { speed: 1, scale: 1 }
  },
  'title-card': {
    summary: 'Bold emblem and title card with pulsing atmospheric halo.',
    tags: ['title', 'card', 'intro', 'emblem'],
    params: {
      text: { type: 'string', default: 'NIGHT' },
      subtitle: { type: 'string', default: '' },
      value: { type: 'string', default: '' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { text: 'NIGHT' }
  },
  'three-particle-void': {
    summary: '3D perspective particle torus orbiting a pulsing central starburst.',
    tags: ['3d', 'particles', 'void', 'abstract'],
    params: {
      text: { type: 'string', default: '' },
      speed: { type: 'number', min: 0.1, max: 5, default: 1 },
      intensity: { type: 'number', min: 0, max: 3, default: 1 },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { speed: 1 }
  },
  'three-night-city': {
    summary: '3D perspective night city skyline with orbiting camera, moon glow, and flickering emissive windows.',
    tags: ['3d', 'city', 'night', 'establishing', 'skyline'],
    params: {
      text: { type: 'string', default: '' },
      speed: { type: 'number', min: 0.1, max: 5, default: 1 },
      intensity: { type: 'number', min: 0, max: 3, default: 1 },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { text: 'NIGHT' }
  },
  'three-horror-room': {
    summary: '3D perspective dark room with flickering ceiling light and turning silhouette in the corner.',
    tags: ['3d', 'room', 'horror', 'interior', 'silhouette'],
    params: {
      text: { type: 'string', default: '' },
      speed: { type: 'number', min: 0.1, max: 5, default: 1 },
      intensity: { type: 'number', min: 0, max: 3, default: 1 },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { intensity: 1 }
  },
  'intercom-macro': {
    summary: 'Macro shot of an apartment wall intercom panel with LED indicator, speaker grille, and digital readout.',
    tags: ['horror', 'macro', 'intercom', 'prop', 'apartment'],
    params: {
      display: { type: 'string', default: '2:17' },
      signal: { type: 'boolean', default: true },
      text: { type: 'string', default: '' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { display: '2:17', signal: true }
  },
  'empty-hallway': {
    summary: 'One-point perspective apartment hallway with overhead bulb, doors, optional distant ghost figure, and light flicker.',
    tags: ['horror', 'hallway', 'corridor', 'interior', 'perspective'],
    params: {
      figure: { type: 'boolean', default: false },
      blur: { type: 'boolean', default: false },
      light: { type: 'enum', values: ['steady', 'flicker'], default: 'steady' },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { figure: true, blur: true }
  },
  'door-close': {
    summary: 'Close shot of a heavy apartment door with peephole, handle, optional knock shockwaves, and eerie seam smile.',
    tags: ['horror', 'door', 'knock', 'interior'],
    params: {
      knocks: { type: 'number', min: 0, max: 10, default: 0 },
      angle: { type: 'number', min: 0, max: 1, default: 0 },
      smile: { type: 'boolean', default: false },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { knocks: 3, angle: 0.05 }
  },
  'mirror-double': {
    summary: 'Framed bathroom/hall mirror reflection where the double jitters and its eyes glow out of sync.',
    tags: ['horror', 'mirror', 'reflection', 'double'],
    params: {
      emotion: { type: 'enum', values: EXPRESSION_VALUES, default: 'scared' },
      expression: { type: 'enum', values: EXPRESSION_VALUES, default: 'scared' },
      double: { type: 'boolean', default: true },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { emotion: 'scared', double: true }
  },
  'bedroom-shadow': {
    summary: 'Partially open bedroom door revealing a breathing shadow figure in the gap and flickering hallway light.',
    tags: ['horror', 'bedroom', 'door', 'shadow'],
    params: {
      knocks: { type: 'number', min: 0, max: 10, default: 0 },
      light: { type: 'enum', values: ['steady', 'flicker'], default: 'steady' },
      figure: { type: 'boolean', default: true },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { knocks: 3, light: 'flicker' }
  },
  'stairwell': {
    summary: 'Concrete stairwell descending into fog with handrails, wet step reflections, rain streaks, and optional figure.',
    tags: ['horror', 'stairwell', 'stairs', 'wet'],
    params: {
      wet: { type: 'boolean', default: true },
      figure: { type: 'boolean', default: false },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { wet: true, figure: true }
  },
  'door-peephole': {
    summary: 'Circular fisheye peephole view into the hallway outside the apartment door.',
    tags: ['horror', 'peephole', 'door', 'pov'],
    params: {
      figure: { type: 'boolean', default: true },
      smile: { type: 'boolean', default: false },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { figure: true }
  },
  'keyhole-view': {
    summary: 'Keyhole cutout POV looking through a lock at a figure standing on the other side.',
    tags: ['horror', 'keyhole', 'door', 'pov'],
    params: {
      figure: { type: 'boolean', default: true },
      smile: { type: 'boolean', default: false },
      seed: { type: 'number', min: 0, max: 999999, default: 1 }
    },
    example: { figure: true, smile: true }
  }
});
