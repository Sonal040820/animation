// Dependency-free 3D perspective scene builders rendered onto Canvas2D.
// Works directly in Chromium without bundlers or WebGL context conflicts.

function makeCamera(camPos, target, fovDeg, w, h) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
  const norm = v => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const fwd = norm(sub(target, camPos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const f = (h * 0.5) / Math.tan((fovDeg * Math.PI) / 360);
  return p => {
    const rel = sub(p, camPos);
    const z = dot(rel, fwd);
    if (z <= 0.15) return null;
    const x = dot(rel, right);
    const y = dot(rel, up);
    return { x: w * 0.5 + (x / z) * f, y: h * 0.5 - (y / z) * f, z };
  };
}

export function renderThreeFrame(canvas, builder, t) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.save();
  builder(ctx, t, w, h);
  ctx.restore();
}

export function buildParticleVoidScene(ctx, t, w, h) {
  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, w, h);
  const cam = [Math.sin(t * 0.3) * 4, 1.5, Math.cos(t * 0.3) * 4];
  const project = makeCamera(cam, [0, 0, 0], 70, w, h);

  // Torus of 1200 depth-sorted particles
  const pts = [];
  for (let i = 0; i < 1200; i++) {
    const theta = (i / 1200) * Math.PI * 2 + t * 0.15;
    const phi = Math.sin(i * 0.37 + t * 0.08) * 0.6;
    const r = 2.5 + Math.cos(i * 0.71 + t * 0.12) * 0.8;
    const px = r * Math.cos(theta) * Math.cos(phi);
    const py = r * Math.sin(phi) + Math.sin(i * 2.1 + t * 0.2) * 0.3;
    const pz = r * Math.sin(theta) * Math.cos(phi);
    const pr = project([px, py, pz]);
    if (pr) pts.push(pr);
  }
  pts.sort((a, b) => b.z - a.z);
  for (const p of pts) {
    const alpha = Math.max(0.08, Math.min(0.95, Math.exp(-p.z * 0.12)));
    const rad = Math.max(1, (14 / p.z) * (w / 720));
    ctx.fillStyle = `rgba(56,212,245,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central starburst
  const center = project([0, 0, 0]);
  if (center) {
    const pulse = (28 + Math.sin(t * 2.1) * 12) * (w / 720);
    const g = ctx.createRadialGradient(center.x, center.y, 1, center.x, center.y, pulse * 2.4);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, 'rgba(56,212,245,0.75)');
    g.addColorStop(1, 'rgba(2,4,8,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(center.x, center.y, pulse * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function buildNightCityScene(ctx, t, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#020810');
  sky.addColorStop(1, '#091526');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const orbitR = 14;
  const cam = [Math.sin(t * 0.18) * orbitR, 3.5 + Math.sin(t * 0.09) * 0.8, Math.cos(t * 0.18) * orbitR];
  const project = makeCamera(cam, [0, 4, 0], 55, w, h);

  // Moon in 3D space
  const moonP = project([-6, 11, -12]);
  if (moonP) {
    const mr = Math.max(16, (540 / moonP.z) * (w / 720));
    const mg = ctx.createRadialGradient(moonP.x, moonP.y, mr * 0.2, moonP.x, moonP.y, mr * 2.1);
    mg.addColorStop(0, '#d8c8b8');
    mg.addColorStop(0.45, 'rgba(216,200,184,0.32)');
    mg.addColorStop(1, 'rgba(2,8,16,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(moonP.x, moonP.y, mr * 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const heights = [9, 14, 7, 12, 11, 8, 15, 6, 10, 13];
  const xPos    = [-9, -6, -3,  0,  3,  6,  9, -7.5, 1.5, 7.5];
  const zPos    = [0, -1.5, 1.2, 0, -1.2, 1.0, -0.5, 2.2, -2.0, 1.8];
  const boxes = heights.map((bh, i) => {
    const cx = xPos[i], cz = zPos[i];
    const dist = Math.hypot(cx - cam[0], cz - cam[2]);
    return { bh, i, cx, cz, dist };
  }).sort((a, b) => b.dist - a.dist);

  for (const { bh, i, cx, cz } of boxes) {
    const hw = 0.85;
    const corners = [
      [cx - hw, 0, cz - hw], [cx + hw, 0, cz - hw], [cx + hw, 0, cz + hw], [cx - hw, 0, cz + hw],
      [cx - hw, bh, cz - hw], [cx + hw, bh, cz - hw], [cx + hw, bh, cz + hw], [cx - hw, bh, cz + hw]
    ].map(project);
    if (corners.some(c => !c)) continue;
    const faces = [
      { idx: [0, 1, 5, 4], color: '#0b1522' },
      { idx: [1, 2, 6, 5], color: '#101e30' },
      { idx: [2, 3, 7, 6], color: '#0d1824' },
      { idx: [3, 0, 4, 7], color: '#09111b' },
      { idx: [4, 5, 6, 7], color: '#16283d' }
    ];
    for (const f of faces) {
      ctx.fillStyle = f.color;
      ctx.strokeStyle = '#1b314b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(corners[f.idx[0]].x, corners[f.idx[0]].y);
      for (const k of f.idx.slice(1)) ctx.lineTo(corners[k].x, corners[k].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Emissive windows
    for (let wy = 1; wy < bh - 0.6; wy += 1.4) {
      if (Math.sin(i * 7.3 + wy * 3.1) > 0.1) {
        const wp = project([cx + hw + 0.02, wy, cz]);
        if (wp) {
          const Flicker = 0.75 + 0.25 * Math.sin(t * 2.4 + i + wy);
          ctx.fillStyle = Math.sin(i + wy) > 0 ? `rgba(255,208,128,${Flicker})` : `rgba(128,200,255,${Flicker})`;
          const sz = Math.max(2, (110 / wp.z) * (w / 720));
          ctx.fillRect(wp.x - sz * 0.4, wp.y - sz * 0.5, sz * 0.8, sz);
        }
      }
    }
  }
}

export function buildHorrorRoomScene(ctx, t, w, h) {
  ctx.fillStyle = '#020306';
  ctx.fillRect(0, 0, w, h);

  const shakeX = Math.sin(t * 13.7) * 0.04;
  const shakeY = Math.cos(t * 11.3) * 0.03;
  const cam = [shakeX, 1.6 + shakeY, 4.5];
  const project = makeCamera(cam, [0, 1.4, 0], 65, w, h);

  const flicker = 0.45 + Math.abs(Math.sin(t * 7.3 + Math.sin(t * 3.1) * 2)) * 0.55;
  const roomCorners = [
    [-4, 0, -3], [4, 0, -3], [4, 3, -3], [-4, 3, -3],
    [-4, 0, 4], [4, 0, 4], [4, 3, 4], [-4, 3, 4]
  ].map(project);

  if (roomCorners.slice(0, 4).every(Boolean)) {
    ctx.fillStyle = `rgba(14,22,32,${(0.65 * flicker).toFixed(3)})`;
    ctx.strokeStyle = `rgba(208,168,106,${(0.35 * flicker).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(roomCorners[0].x, roomCorners[0].y);
    ctx.lineTo(roomCorners[1].x, roomCorners[1].y);
    ctx.lineTo(roomCorners[2].x, roomCorners[2].y);
    ctx.lineTo(roomCorners[3].x, roomCorners[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Flickering ceiling bulb glow
  const lightP = project([0.5, 2.6, -0.5]);
  if (lightP) {
    const lr = (210 * flicker) * (w / 720);
    const lg = ctx.createRadialGradient(lightP.x, lightP.y, 2, lightP.x, lightP.y, lr);
    lg.addColorStop(0, `rgba(208,168,106,${(0.85 * flicker).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(2,3,6,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lightP.x, lightP.y, lr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Turning figure silhouette in corner
  const figureAngle = -Math.PI * 0.75 + Math.sin(t * 0.85) * 0.4;
  const figBase = project([-2.2, 0.9, -2.4]);
  const figHead = project([-2.2 + Math.sin(figureAngle) * 0.12, 1.65, -2.4 + Math.cos(figureAngle) * 0.12]);
  if (figBase && figHead) {
    const scale = (320 / figBase.z) * (w / 720);
    ctx.fillStyle = '#050910';
    ctx.strokeStyle = `rgba(94,192,232,${(0.35 * flicker).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(figBase.x - scale * 0.28, figBase.y - scale * 0.5, scale * 0.56, scale * 1.0, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(figHead.x, figHead.y, scale * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
