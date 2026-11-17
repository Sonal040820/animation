# Durable lessons (newest first)

- 2026-11-17 / Doorway visual study: the first recipe story's isolated door prop read as floating. A shared hinge model now controls door geometry, moving handle, actor hand target and floor lighting. Establish the wall, threshold and floor before adding atmospheric effects. The current rig still uses a straight reaching arm; a bent elbow and articulated fingers remain visual limitations.

- 2026-11-16T18:29:37.918Z / golden-1159: verified 7 shots, 100% template reuse, 100% auto (7/7) / 0% hand-edited, 460.9 render seconds, 0 fully cached shots, voice=kokoro-onnx-0.6.1-int8; First measured production run.
- 2026-11-16 / golden-1159 `locator.screenshot` timeout: `node studio/cli/studio.mjs render --project projects/golden-1159 --quality standard` threw `locator.screenshot: Timeout 29985ms exceeded` ("waiting for element to be stable") under 4-page parallel CPU load. Root cause: Playwright DOM locator screenshot polls compositor stability. Fix: capture PNG directly via `document.getElementById('screen').toDataURL('image/png')` inside `page.evaluate` in `studio/lib/runner.mjs`. Render time dropped from 581.1s (`midnight-horror-elite`) to 460.9s (`golden-1159`).
- 2026-11-16 / golden-1159 `s07` low motion gate: `verify` caught `s07` (`window-view`, empty dark interior + `fadeOut`) at `0.7235` mean frame diff (`< 0.8` threshold). Root cause: 75% dark interior wall + fade-to-black attenuated 72x128 grayscale pixel deltas. Fix: strengthened `pull`/`push` zoom/pan range in `studio/lib/motion.mjs`, macro `cameraIntensity` (`1.55`), and `window-view` atmosphere dust/fog in `studio/lib/templates.mjs`, bringing `s07` to `0.8024` and whole-clip mean to `2.9205` (10/10 golden checks PASS).

- 2026-11-16T17:12:49.886Z / midnight-horror-elite: verified 6 shots, 100% template reuse, 67% auto (4/6) / 33% hand-edited, 581.1 render seconds, 0 fully cached shots, voice=kokoro-onnx-0.6.1-int8; First measured production run.

- 2026-11-16T15:23:11.817Z / midnight-horror-elite: verified 8 shots, 100% templates, 186.0 render seconds, 0 fully cached shots; Previous reuse 100% => 100%; render seconds 398.1 => 186.0. No unreported errors are assumed.

- 2026-11-16 / The Wrong Side of the Door: Complete 60.00s / 720x1280 / 24fps video built with 19 original reusable templates; source-only drama and 3 local Kokoro voices; 398.1s of measured final frame rendering. Verified H.264+AAC. QA warning: long repeated-frame section; likely low-motion shot, so add motion-rich lighting and micro-parallax in future without faking physics. Contact sheet was visually inspected and exact SHA locked before production.
- 2026-11-16 / Contact sheet FFmpeg tile symptom: 19 individual PNGs existed, but one combined montage showed only the first cell. Root cause: FFmpeg tile output with -frames:v 1. Fix: compose all images deterministically in the existing Chromium Canvas2D renderer, verify 19 visible tiles and SHA before approve. Kept original shot files unchanged.
- 2026-11-16 / 60s template registry check: new reusable templates were implemented but initial dispatcher and test still assumed eight templates. Fix: export HORROR_TEMPLATES into both dispatcher and template registry; assert uniqueness against actual list length, not a literal 8. CPU smoke and contract tests passed.
- 2026-11-16 / Contact sheet runner initially lacked FFmpeg executable even though static still capture worked. Fix: install ffmpeg for the standalone storyboard workflow, then remove FFmpeg dependency from contact-sheet assembly by using original Canvas2D.

- 2026-11-16T13:20:10.562Z / the-wrong-side: verified 19 shots, 100% templates, 398.1 render seconds, 0 fully cached shots; First measured production run. No unreported errors are assumed.

- 2026-11-16 / Static smoke visual inspection: Scared-face inner brows were lower than outer brows and resembled anger. Corrected to high inner brows plus eye highlights in studio/lib/characters.mjs; next template smoke serves as regression check.

- 2026-11-16 / npm ETARGET on setup run 43867172658: exact symptom 'No matching version found for playwright@1.65.2'; PyPI and npm are not a reliable shared version source. Fix: pin the official Microsoft Playwright GitHub release v1.65.1 instead; recheck on GH runner. First attempt of max three.

Record exact symptoms, commands, causes, fixes, measured times and tests; never retry a failing approach more than 3 times.

- 2026-11-16 / Setup-only scope: The final user instruction overrides the quoted test-video step. No animated video, voice, or creative contact sheet during setup.
- 2026-11-16 / Source ownership: GrowKaz_Stickman.plugin contains a third-party kit with no clearly granted reuse license. Its contents were inspected, but no code, audio, fonts, assets, or scripts were copied.
- Hugging Face access: Whisper downloads may fail. Prefer sentence-by-sentence Kokoro TTS, measure phrase WAV durations and allocate word timing by character count. This is a fallback, not true phoneme alignment.
- Kokoro ONNX: Use CPU, pinned releases and SHA256-checked model/voice files; do not rely on cloud Edge-TTS. If optional voice fails, preserve captions and original ambience while reporting missing speech.
- Chromium: Resolve the version pinned by Playwright; if missing, allow CHROMIUM_PATH pointing to pre-installed Chromium and verify Canvas2D before use. SwiftShader is the default Linux software GL route.
- Blender 5 changed action/compositor APIs and Cycles CPU could take around 43 seconds per frame. Default this studio to Chromium/Canvas2D, not Blender, for 6-30 second narration.
- Helper return signatures: Read INDEX.md. Camera shake helpers may return [x,y] rather than a number; unit-test any new helper.
- Captions: Group at sentence boundaries, never by a global fixed word count. Limit to 1-2 words per group.
- Expression: Scared eyes need raised brows, not angry slanted-low brows. Inspect one still before rendering a whole film.
- Retry ceiling: After 3 failed attempts, write symptom, command and reason here, then switch to a simpler path.

## New entry template
Date | Video | Exact failure symptom | Failed command | Root cause | Fix / fallback | Test | Measured cost.

## Path A integration lesson — 2026-11-17

Actual Three.js is now part of the shared player; legacy three-scene.mjs remains Canvas perspective drawing. Keep discovery attached to live registries and give agents a short routing document instead of requiring a repo-wide read. Prefer reusable pose/expression beats and simple stage geometry. Validate silent video independently of audio. H.264 yuv420p requires even dimensions: preview is now 432x768. Two-bone reach targets must be clamped and staged; Canvas actors do not automatically interact with or hide behind Three.js objects.
