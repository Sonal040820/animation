# Short-video studio status

## Integrated Path A foundation — 2026-11-17

Path A now includes pinned Three.js 0.187.0 as a required local player dependency alongside Canvas2D. The shared `three-room` set provides dimensional staging and a timed door; new projects use it by default. Root routing and studio/START_HERE.md give agents one entry point. Live assets/asset-inspect/asset-preview commands cover registered assets, human appearances and actions. Silhouette humans support actor-relative hand targets with two-bone IK. B/C configs are rejected by the Path A CLI.

Measured: 39 tests pass, including legacy preset pixel equivalence and actual WebGL2 seek/resize/dispose checks. `projects/path-a-visual-proof` rendered 168 frames / 7 seconds at 432x768, 24fps; full decode and silent visual verification pass. Representative frames were inspected for opening door, expression change and arm bend. Preview dimensions corrected from odd-width 405x720 to encoder-compatible 432x768. This is a reusable foundation demonstration, not a completed new story or completion of the older Phase 2 acceptance work. Actors remain screen-space Canvas overlays; automatic 3D occlusion/contact and a general 3D human rig are not implemented. Sound remains deferred.

## Visual study — 2026-11-17

`projects/doorway-visual-study` adds a four-second, silent Canvas2D doorway proof: framed opening and threshold, perspective floor, opening-dependent cold light spill, warm practical, handle-following character hand and timed recoil. Uses the existing silhouette rig with an optional hand target. 34 tests pass, including legacy preset pixel equivalence. Draft render completed: 48 frames, 270x480 at 12fps, 6.441 measured rendering seconds. This study is separate from the unfinished Phase 2 film acceptance work.

Updated: 2026-11-16
State: PRODUCTION VERIFIED — first original 60-second film generated and delivered.

## Created
- Original Canvas2D studio, styles, pixel font, stick/block avatars, sixteen templates (eight initial + eight reusable horror) and software 3D helper.
- Deterministic CLI, word alignment, original oscillator audio, quality checks and shot-hash frame cache.
- Pinned Playwright and optional Kokoro dependencies with official release checksum policy.
- Seven data-only shots for the supplied 10-second midnight-window story.
- Durable INDEX, LESSONS, COST, STATUS and automated contract tests.
- Separated from the existing Kai/Ren Blender pipeline; no reliance on Camber or on the unlicensed GrowKaz implementation.

## Actual setup acceptance
- Green runner setup: https://github.com/Sonal040820/animation/actions/runs/43867609302
- Verified Node 22.14.0, Python 3.12.7, Playwright 1.65.1, Chromium 159, FFmpeg/ffprobe 6.1.1; studio/environment.json and studio/package-lock.json committed by CI.
- Eight low-resolution static template images passed. Scared-brow expression corrected after visual review; final static smoke regression PASSED in run 43868905339.
- This line records the initial setup acceptance; a film was subsequently produced under an explicit user request.

## Final setup acceptance
- GitHub Actions run: https://github.com/Sonal040820/animation/actions/runs/43868905339 (SUCCESS).
- Initial setup smoke rendered eight static 144x256 PNGs; 60s film production was separately authorized and completed later.
- Lockfile and environment fingerprint stored in GitHub main; future same-version doctor runs reuse the verified fingerprint.
- Production measurements are now available in COST.md and the completed film artifact.

## First production: The Wrong Side of the Door (verified)
- Full film workflow SUCCESS: https://github.com/Sonal040820/animation/actions/runs/43873049143
- Approved 19-image static sheet: SHA256 4883329936e9212f8c9531263efa6e8b34125134f9a10fc87399b1dde1917eba
- Final film: 60.000s; 720x1280; H.264 24fps video + AAC audio; 19 locally voiced dialogue/narration lines.
- Voice: Kokoro ONNX v0.6.1, int8; characters MARA / caller / DOUBLE. No cloud TTS and no downloaded music.
- Score and SFX original synthesized via studio/lib/audio.mjs; music ducked under voice, loudness normalized.
- Performance: 1439 captured frames; 398.1s of 720p shot rendering; 100% of shots from reusable studio templates; 0 cached shots for first run.
- QA: codec, duration, narration and caption constraints PASS. Freeze-detection raised a warning for a sustained nearly static visual hold; future videos should introduce nuanced continuous motion.
- Source project: projects/the-wrong-side/ — JSON and text DATA only; all reusable scene and voice code stays under studio/lib and studio/cli.
- Files delivered: final MP4, draft MP4, full screenplay, contact sheet, word timings, provider evidence, COST.md / LESSONS.md / STATUS.md.

## Next improvement
- Introduce sustained atmospheric micro-motion and subtle parallax in prolonged intercom and locked-off shots to avoid frozen-looking holds while preserving psychological tension.
- Keep all sixteen templates reusable and add new ones only when a story truly requires them.
- Reuse the pinned Kokoro model, shot hashes and verification commands to lower compute cost in the next film.

## Historical setup-only restriction (completed)

- Run local Kokoro voice / align, generate and visually inspect an actual contact sheet.
- Require approved contact-sheet hash before full render; render a playable draft first.
- Mix and verify final MP4; promote reusable assets/functions and update this ledger.
- Stop after 3 unsuccessful retries on any one issue; log decision in LESSONS.

## Resume order
Read STATUS, INDEX, LESSONS, COST. Check latest workflow logs before changing code. Preserve working renderer components; avoid unnecessary rewrites.

- 2026-11-16T13:20:10.562Z: the-wrong-side promoted with 100% template reuse, 398.1 seconds; First measured production run.

- 2026-11-16T15:23:11.819Z: midnight-horror-elite promoted with 100% template reuse, 186.0 seconds; Previous reuse 100% => 100%; render seconds 398.1 => 186.0.

- 2026-11-16T17:12:49.887Z: midnight-horror-elite promoted with 100% template reuse (67% auto (4/6) / 33% hand-edited), 581.1s, voice=kokoro-onnx-0.6.1-int8; First measured production run.

- 2026-11-16T18:29:37.920Z: golden-1159 promoted with 100% template reuse (100% auto (7/7) / 0% hand-edited), 460.9s, voice=kokoro-onnx-0.6.1-int8; First measured production run.
