# Path A: minimal expressive animation

Choose **A** for the integrated Three.js + Canvas2D pipeline, **B** for HyperFrames, **C** for Blender. Path A is the default. Set `"pipeline":"A"` in config.json; the studio CLI rejects B/C. Old studio configs without this field remain A-compatible.

Three.js supplies simple dimensional sets, lighting, hinged objects and camera depth. Canvas2D supplies expressive humans, drawn props, captions and finishing. Both run in the same local player and export a single silent video. No Remotion or extra scene framework is needed. The old `three-*` templates in three-scene.mjs are legacy Canvas perspective drawings, not actual Three.js.

## First run (commands from repository root)

```powershell
npm ci --prefix studio
node studio/cli/studio.mjs doctor
node studio/cli/studio.mjs assets --query room
node studio/cli/studio.mjs asset-inspect --id sets/three-room
node studio/cli/studio.mjs asset-preview --id actions/notice-recoil --at 2.5
```

Use Node 22 and the Chromium/FFmpeg prerequisites described in the existing setup docs. Three.js is pinned in studio/package-lock.json and served locally. WebGL2 is required; software rendering is supported. A failed WebGL startup fails the player rather than silently skipping the stage.

## Author and verify

For requested sound production, read [AUDIO_WORKFLOW.md](AUDIO_WORKFLOW.md) for generated-take imports, local fallback, timing, mixing and reuse. The OVERCLOCKED project demonstrates this workflow.

```powershell
node studio/cli/studio.mjs new-project --project projects/my-film --script "A traveler notices a door opening." --seconds 6
node studio/cli/studio.mjs validate --project projects/my-film
node studio/cli/studio.mjs sheet --project projects/my-film --quality draft
node studio/cli/studio.mjs render --project projects/my-film --quality preview
node studio/cli/studio.mjs verify-visual --project projects/my-film --quality preview
```

The starter is a neutral staging scaffold: author the story beats in manifest.json. Use projects/path-a-visual-proof as the small reusable example. Art direction belongs in SPEC.md; only config/manifest/assets data belongs in projects. Outputs live in studio/out/<slug>/video_silent.mp4. For faster software capture on Windows set `$env:STUDIO_SOFTWARE_CANVAS='1'` before rendering.

## Reuse without guessing

`assets --query <term>` searches live sets, props, rigs, effects, styles, expressions, appearances and actions. `asset-inspect --id <kind/name>` reports source, parameter schema, defaults and example. `asset-preview` produces a PNG (use `--at` for action timing). Easings are inspect-only. This catalog covers registered procedural assets; it does not automatically import arbitrary images, models or files.

- Set: `{"preset":"three-room","params":{"openStart":1,"openDuration":1.2,"open":1}}`.
- Human: `{"id":"lead","rig":"silhouette","appearance":"traveler","pos":{"x":0.4,"depth":0.65},"action":"notice-recoil"}`.
- Looks: traveler, child, observer. Add shared identities in human.mjs. `color` customizes clothing when appearance is omitted; a named appearance owns its colors.
- Hand target: `"hand":[0.2,-0.55]`, relative to feet in actor-height units. Keyframe it for reaches. Two-bone IK clamps unreachable targets. Supported by silhouette; no finger rig or automatic prop attachment.
- Use `action` for preset keys or `keys` for custom timing, never both. Expression/pose blends start at the key time; numeric positions and hand targets interpolate toward the next key. Times are shot-relative.
- Placement: x is normalized screen width, depth 0 far to 1 near; keep feet above caption safe zone. Actors are screen-space overlays, not physical 3D humans. Hand contact with a 3D prop must be staged and inspected.

## Files to read only when needed

| Need | File |
|---|---|
| Recipe schema, validation and draw order | studio/lib/recipe.mjs |
| Three.js room/camera and resource ownership | studio/lib/three-stage.mjs |
| Human identities/actions and two-bone solver | studio/lib/human.mjs |
| Human drawing and expressions | studio/lib/characters.mjs |
| Asset discovery | studio/lib/assets.mjs |
| Browser capture/cache/export | studio/lib/runner.mjs |
| Existing template compatibility | studio/lib/presets.mjs |

Acceptance: the audience can read the focal object, action and reaction without audio. Review beginning, anticipation, contact/action, reaction and end. Holds are allowed; visual-check verifies media integrity, not comprehension. This is a small foundation, not a general 3D animation editor.
