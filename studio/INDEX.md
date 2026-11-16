# Studio index — search before writing code

The index is a mandatory durable API memory file. Engine functions live in studio/lib, commands in studio/cli, and projects contain only data.

| Component | Signature | Example |
|---|---|---|
| Seeded random | noise(seed) => RNG | noise(17)() |
| Timeline/easing | clamp(x), mix(a,b,t), ease(t), pulse(t,c,w) | ease(.5) |
| Palette | style(id) => colour system | style('midnight').accent |
| Camera | viewport(ctx,w,h,t,kind) | viewport(ctx,360,640,1,'push') |
| Primitive 3D | projection3D(x,y,z,theta,scale) | project cuboid without downloaded models |
| Original font | bitmapText(ctx,text,cx,y,pixel,color,maxWidth) | bitmapText(ctx,'NIGHT',180,280,7,'#fff') |
| Dynamic captions | caption(ctx,w,h,words,now,palette) | 1-2 words at 79% height |
| Avatar | drawCharacter(ctx,{x,y,scale,color,rig,expression,phase,pose,rim}) | rig='block', expression='scared' |
| Frame | drawStudioFrame(canvas,shot,config,seconds,words) | rendering browser callback |
| Shot validation | assertShot(shot) | validate before render |
| Project | loadProject('projects/<slug>') | {dir,manifest,config,duration} |
| Project code rule | enforceDataOnly() | returns violation list |
| Alignment | alignPhrases(script,durations,total,gap) | character-weight fallback |
| Voice | studio/cli/voice.py --project projects/<slug> | local Kokoro (optional) |
| Static contact sheet | sheet(project,quality) | one still per shot |
| Templates smoke | smoke() | one still per template, no video |
| Render | render(project,quality) | shot-hash cached frame captures |
| Original audio | synthOriginalAudio(dir,duration,cues) | generated oscillator score and SFX |
| Mix | mix(project,duration) | duck voice, normalize to -14 LUFS |
| Verify | verifyFilm(ref,project,quality) | codec, duration, captions |
| Promotion | studio.mjs promote --project projects/<slug> | update COST / STATUS |

## Available templates
- wide-establishing (params: set, seed; example: night building)
- window-view (params: girl:boolean; example: ghost appears and vanishes)
- character-medium (params: rig, expression, color; example: frightened witness)
- giant-face (params: rig, expression; example: scared close-up)
- insert-macro-clock (params: time; example: 11:59)
- data-card (params: text, value; example: digital fact card)
- 3d-orbit (params: camera, seed; example: rotating code-projected cuboid)
- title-card (params: text; example: title sting)

## Deterministic CLI (run from repository root)
- doctor — capability check, version fingerprint, environment.json
- smoke — static low-res frame per template, nonzero on failure
- check — reject unpromoted code in projects
- new-project --project projects/new --script 'Hello' --seconds 6 — data-only starter
- make-voice --project projects/new — local pinned Kokoro phrase generation
- align --project projects/new — save timeline/words.json
- sheet --project projects/new --quality draft — contact sheet, no movie
- render --project projects/new --quality standard — deterministic silent MP4
- mix --project projects/new — original audio final.mp4
- verify --project projects/new --quality standard — acceptance
- promote --project projects/new — durable cost/reuse/status ledger

No media generated during initial setup. When adding a template, update this index and add a one-frame smoke test.

| Durable promotion | promoteVideo(project,{tokens}) => report | copies approved original reusable assets, logs verified costs and lessons |
| Style grade registry | STYLE_GRADE (in lib/styles.mjs) | neutral/warm/cold grade data, original pixel font |

## Psychological-horror production extensions (2026-11-16)

| Component | Signature | Example |
|---|---|---|
| Reusable horror sets | HORROR_TEMPLATES in studio/lib/horror.mjs | 8 original Canvas2D scene types |
| intercom-macro | params:{display,signal} | 2:17 glowing analog intercom |
| empty-hallway | params:{figure,blur,light} | vanishing corridor with flickering bulb |
| door-close | params:{knocks,angle,smile} | shot with visualized knock waves |
| mirror-double | params:{emotion,double} | protagonist and independently animated double |
| bedroom-shadow | params:{knocks,light} | almost-open bedroom with silhouette |
| stairwell | params:{wet,figure} | wet stairwell with reflections |
| door-peephole | params:{figure} | wide-angle door watcher |
| keyhole-view | params:{figure,smile} | masked view into room |
| Timed speaker captions | alignDialogue({duration,lines}) => {words} | sentence-bound 1-2 word groups at absolute time |
| Timed multi-speaker TTS | python3 studio/cli/voice_scene.py --project projects/<slug> [--fallback] | SHA-pinned Kokoro / offline espeak, voice.wav |
| Original horror score | synthOriginalAudio(out,duration,cues) | original minor drone, percussion, knocks, static, footfalls |
| Browser montage | sheet(project,quality) | ALL shots joined in Canvas2D, deterministic approval SHA |
| Production contract | projects/the-wrong-side/approved-sheet.sha256 | must match visual contact sheet before rendering |
| 60s vertical render | render('projects/the-wrong-side','standard') | 720x1280,24fps,19 shots |

**Measured first film:** The Wrong Side of the Door. 19/19 templates, 60.00 seconds, Kokoro 19 spoken lines, 720x1280 24fps, 398.1s final frame rendering on GitHub CPU. Production workflow run 43873049143. New scripts should need NO engine code if these 16 templates cover their shots.
