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
| drawCharacterElite | drawCharacterElite(ctx,{x,y,scale,color,rig,expression,phase,pose,rim,wobble,rimPulse}) | expression='surprise' supported |
| three-particle-void | template: params:{} | Torus particle cloud, orbiting camera, pulsing starburst |
| three-night-city | template: params:{} | Low-poly night city, moon, orbiting camera |
| three-horror-room | template: params:{} | Flickering room, turning figure silhouette, camera shake |
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
- three-particle-void (params: {}; example: 3D torus particle cloud and pulsing starburst)
- three-night-city (params: {}; example: 3D perspective low-poly night city and moon)
- three-horror-room (params: {}; example: 3D flickering room with turning figure silhouette)

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

## Phase 1 upgrades (2026-11-16, branch `animationTwo`)
- `dialogue.json` v3 (`spoken` for TTS vs `display` for captions) + `normalizeDisplayText(spoken)` in `studio/lib/planner.mjs`.
- Shot `transition` (`cut`, `dip`, `flash`, `blink`) and `transitionDuration` in `studio/lib/templates.mjs` and `studio/lib/validate.mjs`.
- Structured `window-view` params (`girl: {visible, depth, x, scale}`, `narrator: {visible, x, scale, dim}`, `clock: {time, x}`), `groundDepthPosition(depth, opts)` in `studio/lib/scenery.mjs`, and placement bounds validation in `studio/lib/validate.mjs`.
- Word-anchored manifest `cues` (`{"at_word": "blinked", "action": "blink" | "pulse" | "flash" | "shake" | "clock-set" | "sfx"}`) resolved via `resolveShotCues` / `findWordTimestamp` in `studio/lib/project.mjs`.
- `measureMotion(file, shots, fps)` in `studio/lib/quality.mjs` (72x128 grayscale MAD per-shot and clip-mean gate) and `studio.mjs golden` regression command.

<!-- AUTO:BEGIN -->
## Auto-Generated Engine Reference (do not hand-edit inside AUTO markers)

### CLI Commands (`node studio/cli/studio.mjs <command>`)

| Command | Arguments | Summary |
|---|---|---|
| `explain` | `--project projects/<slug> --shot sNN [--at seconds]` | Print normalized recipe, measured cue anchors and optional sampled frame |
| `recipe-new` | `--preset window-view` | Print recipe skeleton plus parameter schemas/defaults and timing annotations |
| `doctor` | `[--force]` | Capability check, version fingerprint, writes studio/environment.json |
| `smoke` | `—` | Render one static low-res frame per template in parallel browser pool |
| `check` | `—` | Enforce data-only rule across studio projects (reject unpromoted code) |
| `plan` | `--project projects/<slug> [--force]` | Generate dialogue.json v2 and line-bound manifest.json from script.txt via planner-rules.json |
| `validate` | `--project projects/<slug>` | Validate manifest templates, params (TEMPLATE_META), camera, sfx/ambience, emotions, overlaps/gaps, captions |
| `index` | `[--check]` | Regenerate or check drift of AUTO section in studio/INDEX.md from live code |
| `new-project` | `--project projects/<slug> --script "..." [--seconds N]` | Create starter data-only project |
| `make-voice` | `--project projects/<slug>` | Synthesize expressive voice.wav and measured timeline/lines.json |
| `align` | `--project projects/<slug>` | Align 1-2 word sentence-bound captions into timeline/words.json (uses measured lines.json when present) |
| `sheet` | `--project projects/<slug> [--quality draft]` | Validate and render labelled contact sheet (shot id + template + time) |
| `render` | `--project projects/<slug> [--quality draft|preview|standard|high]` | Validate and render frames in parallel page pool with engine-hash cache and render-log.jsonl |
| `mix` | `--project projects/<slug>` | Synthesize original score/ambience/SFX, duck under voice, loudnorm to -14 LUFS, write audio-report.json |
| `verify` | `--project projects/<slug> [--quality standard] [--allow-silent]` | Probe final.mp4, verify voice/captions/loudness/black/freeze, write measured facts.json |
| `golden` | `[--project projects/golden-1159]` | Validate, render contact sheet, and check all Phase 1 golden acceptance criteria against measured artifacts |
| `promote` | `--project projects/<slug>` | Increment usage.json, learn rules into planner-rules.json, regenerate INDEX.md, log measured COST/LESSONS/STATUS |

### Library Module Exports (`studio/lib/*.mjs`)

| Module | Exported Symbols |
|---|---|
| `studio/lib/audio.mjs` | `AMBIENCE_TYPES`, `MUSIC_MOODS`, `SFX_TYPES`, `mix`, `synthOriginalAudio` |
| `studio/lib/characters.mjs` | `EXPRESSIONS`, `avatarRigChoices`, `blendExpression`, `drawCharacter`, `drawCharacterElite`, `drawFigure`, `drawHead` |
| `studio/lib/core.mjs` | `STYLES`, `bitmapText`, `caption`, `clamp`, `drawBackground`, `ease`, `ellipse`, `measureVectorText`, `mix`, `noise`, `projection3D`, `pulse`, `rounded`, `spring`, `stroke`, `style`, `vectorText`, `viewport` |
| `studio/lib/declarative.mjs` | `declarationEntry`, `validateDeclaration` |
| `studio/lib/font.mjs` | `VECTOR_GLYPHS`, `measureVectorText`, `vectorText` |
| `studio/lib/horror.mjs` | `HORROR_TEMPLATES`, `bedroomShadow`, `doorClose`, `doorPeephole`, `emptyHallway`, `intercomMacro`, `keyholeView`, `mirrorDouble`, `stairwell` |
| `studio/lib/learning.mjs` | `CLI_COMMANDS`, `USAGE_FILE`, `buildAutoIndexSection`, `learnPlannerRules`, `promoteVideo`, `syncIndex`, `updateTemplateUsage` |
| `studio/lib/motion.mjs` | `CAMERA_MOVES`, `blinkAmount`, `breathe`, `cameraTransform`, `easeInOutCubic`, `easeOutBack`, `follow`, `smoothNoise`, `spring` |
| `studio/lib/planner.mjs` | `PLANNER_RULES_FILE`, `guessEmotion`, `loadPlannerRules`, `matchShotRule`, `normalizeDisplayText`, `planProject`, `planScript` |
| `studio/lib/presets.mjs` | `PRESETS`, `presetRecipe`, `recipeShot` |
| `studio/lib/project.mjs` | `PROJECTS`, `ROOT`, `STUDIO`, `enforceDataOnly`, `findWordTimestamp`, `loadProject`, `mkdir`, `projectPath`, `readJSON`, `resolveLineSource`, `resolveProjectShots`, `resolveShotCues`, `sha` |
| `studio/lib/props.mjs` | `drawDigitalClock` |
| `studio/lib/quality.mjs` | `measureMotion`, `verifyFilm` |
| `studio/lib/recipe.mjs` | `EASINGS`, `FX`, `PROPS`, `RECIPE_REGISTRIES`, `RIGS`, `SETS`, `drawRecipe`, `mergeRecipe`, `normalizeRecipe`, `resolveActor`, `resolveKeys`, `resolveRecipe`, `worldPosition` |
| `studio/lib/registry-promotion.mjs` | `countRecipeUsage`, `promoteRegistry` |
| `studio/lib/runner.mjs` | `browserExecutable`, `dimensions`, `engineHash`, `invoke`, `pythonExecutable`, `render`, `sheet`, `smoke`, `withBrowser`, `withBrowserPool` |
| `studio/lib/scenery.mjs` | `computeWindowLayout`, `drawAtmosphere`, `drawBlurred`, `drawNightExterior`, `drawRoomInterior`, `drawVignette`, `groundDepthPosition` |
| `studio/lib/styles.mjs` | `STYLES`, `STYLE_GRADE` |
| `studio/lib/template-meta.mjs` | `TEMPLATE_META`, `TRANSITION_VALUES` |
| `studio/lib/templates.mjs` | `TEMPLATE_META`, `TEMPLATE_NAMES`, `TRANSITIONS`, `assertShot`, `drawStudioFrame` |
| `studio/lib/three-scene.mjs` | `buildHorrorRoomScene`, `buildNightCityScene`, `buildParticleVoidScene`, `renderThreeFrame` |
| `studio/lib/timing.mjs` | `alignDialogue`, `alignMeasured`, `alignPhrases`, `phrases`, `saveWords`, `tokenize` |
| `studio/lib/validate.mjs` | `didYouMean`, `levenshtein`, `validateProject` |

### Template Registry (`TEMPLATE_META` & `usage.json`)

| Template | Summary | Params Schema | Example | Used |
|---|---|---|---|---:|
| `wide-establishing` | Wide exterior night shot with moonlit sky, drifting clouds, rolling hill, picket fence, bare tree, or apartment facade. | `scene:enum(fence-moon|building|yard|night), set:string, text:string, moon:boolean, clouds:boolean, fence:boolean, tree:boolean, stars:number, seed:number` | `{"scene":"fence-moon","moon":true,"clouds":true,"fence":true,"tree":true}` | 3 |
| `window-view` | Interior or exterior 4-pane window view with red curtains, sill digital clock, depth-placed girl outside, and blurred foreground narrator. | `interior:boolean, girl:boolean|object, clock:string|object, clockTime:string, narrator:boolean|object, curtains:boolean, sill:boolean, rain:boolean, lightLevel:number, expression:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), variant:enum(girl|boy|adult), pose:enum(stand|walk|look|flinch|still|idle|run|fear), seed:number` | `{"interior":true,"girl":{"visible":true,"depth":0.78,"x":0.72,"scale":0.9},"clock":{"time":"11:59","x":0.275},"narrator":{"visible":true}}` | 4 |
| `character-medium` | Medium character reaction shot supporting silhouette close-up head or full rig with blinks, expressions, and blurred room backdrop. | `rig:enum(silhouette|block|stick), expression:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expressionTo:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expressionMix:number, backdrop:enum(room-blur|none|night), blinkAt:array, blink:boolean, gaze:object, color:string, wobble:number, rimPulse:boolean, variant:enum(girl|boy|adult), pose:enum(stand|walk|look|flinch|still|idle|run|fear), seed:number` | `{"rig":"silhouette","expression":"scared","backdrop":"room-blur"}` | 1 |
| `giant-face` | Extreme close-up head shot with expressive eyes, natural or forced blinks, rim-light arc, and optional blurred room backdrop. | `rig:enum(silhouette|block|stick), expression:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expressionTo:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expressionMix:number, backdrop:enum(room-blur|none|night), blinkAt:array, blink:boolean, gaze:object, color:string, headColor:string, shirtColor:string, rimColor:string, wobble:number, rimPulse:boolean, seed:number` | `{"rig":"silhouette","expression":"surprise","backdrop":"room-blur","blinkAt":[0.35]}` | 3 |
| `insert-macro-clock` | Macro clock insert shot supporting 7-segment red digital clock over blurred room backdrop or classic analog midnight dial. | `time:string, kind:enum(digital|analog), backdrop:enum(room-blur|wall|none), color:string, glow:number, ghost:number, flicker:number, seed:number` | `{"time":"11:59","kind":"digital","backdrop":"room-blur"}` | 3 |
| `figure-exterior` | Silhouette figure standing or walking in the moonlit night yard in front of the picket fence and bare tree. | `variant:enum(girl|boy|adult), pose:enum(stand|walk|look|flinch|still|idle|run|fear), expression:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expressionTo:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expressionMix:number, rig:enum(silhouette|block|stick), facing:enum(left|right|front), gaze:object, walk:boolean, moon:boolean, clouds:boolean, fence:boolean, tree:boolean, seed:number` | `{"variant":"girl","pose":"stand","expression":"blank-stare"}` | 2 |
| `empty-yard` | Empty moonlit night exterior yard with picket fence, bare tree, drifting clouds, and mist after a figure vanishes. | `moon:boolean, clouds:boolean, fence:boolean, tree:boolean, stars:number, clock:string, lightLevel:number, text:string, seed:number` | `{"moon":true,"clouds":true,"fence":true,"tree":true}` | 0 |
| `data-card` | Typographic data card displaying a title and highlighted value over atmospheric background. | `text:string, value:string, subtext:string, seed:number` | `{"text":"THE CLOCK","value":"11:59"}` | 0 |
| `3d-orbit` | Wireframe and shaded 3D cube orbiting in perspective space. | `speed:number, scale:number, camera:string, text:string, seed:number` | `{"speed":1,"scale":1}` | 0 |
| `title-card` | Bold emblem and title card with pulsing atmospheric halo. | `text:string, subtitle:string, value:string, seed:number` | `{"text":"NIGHT"}` | 0 |
| `three-particle-void` | 3D perspective particle torus orbiting a pulsing central starburst. | `text:string, speed:number, intensity:number, seed:number` | `{"speed":1}` | 0 |
| `three-night-city` | 3D perspective night city skyline with orbiting camera, moon glow, and flickering emissive windows. | `text:string, speed:number, intensity:number, seed:number` | `{"text":"NIGHT"}` | 0 |
| `three-horror-room` | 3D perspective dark room with flickering ceiling light and turning silhouette in the corner. | `text:string, speed:number, intensity:number, seed:number` | `{"intensity":1}` | 0 |
| `intercom-macro` | Macro shot of an apartment wall intercom panel with LED indicator, speaker grille, and digital readout. | `display:string, signal:boolean, text:string, seed:number` | `{"display":"2:17","signal":true}` | 4 |
| `empty-hallway` | One-point perspective apartment hallway with overhead bulb, doors, optional distant ghost figure, and light flicker. | `figure:boolean, blur:boolean, light:enum(steady|flicker), seed:number` | `{"figure":true,"blur":true}` | 2 |
| `door-close` | Close shot of a heavy apartment door with peephole, handle, optional knock shockwaves, and eerie seam smile. | `knocks:number, angle:number, smile:boolean, seed:number` | `{"knocks":3,"angle":0.05}` | 2 |
| `mirror-double` | Framed bathroom/hall mirror reflection where the double jitters and its eyes glow out of sync. | `emotion:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), expression:enum(neutral|scared|terrified|surprise|suspicious|sad|relieved|angry|blank-stare|happy), double:boolean, seed:number` | `{"emotion":"scared","double":true}` | 2 |
| `bedroom-shadow` | Partially open bedroom door revealing a breathing shadow figure in the gap and flickering hallway light. | `knocks:number, light:enum(steady|flicker), figure:boolean, seed:number` | `{"knocks":3,"light":"flicker"}` | 1 |
| `stairwell` | Concrete stairwell descending into fog with handrails, wet step reflections, rain streaks, and optional figure. | `wet:boolean, figure:boolean, seed:number` | `{"wet":true,"figure":true}` | 2 |
| `door-peephole` | Circular fisheye peephole view into the hallway outside the apartment door. | `figure:boolean, smile:boolean, seed:number` | `{"figure":true}` | 1 |
| `keyhole-view` | Keyhole cutout POV looking through a lock at a figure standing on the other side. | `figure:boolean, smile:boolean, seed:number` | `{"figure":true,"smile":true}` | 1 |

### Recipe registries (generated from validation metadata)

| Registry | ID | Params and defaults | Example |
|---|---|---|---|
| sets | yard | {"seed":1,"moon":true,"clouds":true,"fence":true,"tree":true,"stars":80} | {} |
| sets | bedroom-window | {"seed":1,"curtains":true,"sill":true,"lightLevel":1} | {} |
| sets | room | {"lightLevel":1} | {} |
| sets | corridor | {"figure":false,"blur":false,"light":"cold"} | {} |
| sets | stairwell | {"wet":false,"figure":false} | {} |
| sets | void | {} | {} |
| sets | preset:wide-establishing | {} | {"scene":"fence-moon","moon":true,"clouds":true,"fence":true,"tree":true} |
| sets | preset:window-view | {} | {"interior":true,"girl":{"visible":true,"depth":0.78,"x":0.72,"scale":0.9},"clock":{"time":"11:59","x":0.275},"narrator":{"visible":true}} |
| sets | preset:character-medium | {} | {"rig":"silhouette","expression":"scared","backdrop":"room-blur"} |
| sets | preset:giant-face | {} | {"rig":"silhouette","expression":"surprise","backdrop":"room-blur","blinkAt":[0.35]} |
| sets | preset:insert-macro-clock | {} | {"time":"11:59","kind":"digital","backdrop":"room-blur"} |
| sets | preset:figure-exterior | {} | {"variant":"girl","pose":"stand","expression":"blank-stare"} |
| sets | preset:empty-yard | {} | {"moon":true,"clouds":true,"fence":true,"tree":true} |
| sets | preset:data-card | {} | {"text":"THE CLOCK","value":"11:59"} |
| sets | preset:title-card | {} | {"text":"NIGHT"} |
| sets | preset:intercom-macro | {} | {"display":"2:17","signal":true} |
| sets | preset:empty-hallway | {} | {"figure":true,"blur":true} |
| sets | preset:door-close | {} | {"knocks":3,"angle":0.05} |
| sets | preset:mirror-double | {} | {"emotion":"scared","double":true} |
| sets | preset:bedroom-shadow | {} | {"knocks":3,"light":"flicker"} |
| sets | preset:stairwell | {} | {"wet":true,"figure":true} |
| sets | preset:door-peephole | {} | {"figure":true} |
| sets | preset:keyhole-view | {} | {"figure":true,"smile":true} |
| props | clock | {"time":"11:59","color":"#ff4d4d","glow":1} | {"time":"3:00"} |
| props | moon | {"color":"#d8e4f0"} | {} |
| props | sill | {"color":"#354354"} | {} |
| props | door | {"color":"#263444","open":0} | {} |
| props | lamp | {"color":"#e9c584","on":true} | {} |
| props | window | {"color":"#8499af"} | {} |
| props | curtains | {"color":"#5d2330","open":0.7} | {} |
| props | fence | {"color":"#24364b"} | {} |
| props | tree | {"color":"#0c1826"} | {} |
| rigs | stick | {} | {"rig":"stick"} |
| rigs | block | {} | {"rig":"block"} |
| rigs | silhouette | {} | {"rig":"silhouette"} |
| fx | dust | {"amount":16,"seed":1} | {} |
| fx | fog | {"amount":0.1,"seed":1} | {} |
| fx | rain | {"amount":35,"seed":1} | {} |
| fx | vignette | {"amount":0.5} | {} |
| fx | flash | {"amount":0,"color":"#ffffff"} | {} |
| fx | glow | {"amount":0.15,"color":"#a9cee9"} | {} |
| easings | linear | {} | {} |
| easings | in | {} | {} |
| easings | out | {} | {} |
| easings | inOut | {} | {} |
| easings | hold | {} | {} |
<!-- AUTO:END -->
