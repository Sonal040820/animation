# Path A agent contract

Read START_HERE.md first. Path A uses a pinned local Three.js WebGL2 stage, Canvas2D characters/props/finishing, Chromium capture and FFmpeg export. There is no separate Three.js path or feature flag. The player requires both renderers; new projects start with the Three.js room. Existing 2D sets and close-up inserts remain supported.

Before adding an asset, search `assets`, inspect matching IDs and preview the best candidate. Adapt registered parameters or actor keys before writing a new renderer. Register reusable code in studio/lib, never under projects. Promote bounded declarative props/sets through the existing promote command. INDEX.md is generated discovery, not a mandatory full read.

Minimum read order: START_HERE.md → asset-inspect output → the data-only example → recipe.mjs only if the schema or capability needs extension. Read three-stage.mjs for stage changes and characters.mjs + human.mjs for human changes. Never inspect unrelated HyperFrames/Blender trees for Path A tasks.

Use minimal shapes, clear silhouette, one focal action per shot, anticipation → action → reaction, legible expressions and deliberate holds. Inspect at action boundaries, not only shot midpoints. Do not add motion solely to satisfy a score. Avoid extra graphics libraries, physics, photorealism, or postprocessing unless they solve a concrete readability problem.

All motion must be a pure function of shot-relative seconds. No wall clock, requestAnimationFrame, random runtime values, CDN, remote fonts or project JavaScript. Keep a single shared Three stage per canvas; dispose owned GPU resources when replacing it. Actors are Canvas overlays, not automatically occluded by 3D furniture; stage them in front, or explicitly author a separate foreground pass.

For visuals: validate → sheet → render → verify-visual → inspect frames/playback. Silent output is a valid deliverable. The technical check does not certify artistic quality. Keep sound generation and final audio verification out of this workflow until requested.

Run `npm test --prefix studio` after shared engine changes and `node studio/cli/studio.mjs index` after registry/CLI changes. Preserve compatibility tests for legacy projects. Report measured outcomes and any limits.
