# Original short-video studio — setup report

**Date:** 2026-11-16
**Repository:** Sonal040820/animation
**Run:** https://github.com/Sonal040820/animation/actions/runs/43868905339
**Result:** Setup/doctor/unit-tests/static-template-smoke successful.
**Media scope:** No narrated animation, creative project contact sheet or MP4 generated (explicit user instruction).

## Delivered
- studio/lib/: original Canvas2D graphics, deterministic math, code-only stick/block rigs, four style palettes, grade file, eight shot templates, 3D-like cuboid projection, original bitmap font, caption overlay, software renderer, cache, timing, oscillator SFX/music, media verification, durable promotion.
- studio/cli/: doctor, smoke, check, new-project, make-voice, align, sheet, render, mix, verify, promote. Deterministic stage calls, no renderer copies inside projects.
- studio/INDEX.md, LESSONS.md, COST.md, STATUS.md: stateful knowledge for future coding agents.
- studio/environment.json and package-lock.json: real runner probe and npm-resolved dependencies, committed by CI.
- projects/window-at-midnight/: exact provided script, 7-shot data manifest, style/camera/config data; NO rendered media.
- .github/workflows/original-short-video-studio.yml: default CPU-only setup; separately selected contact-sheet and hash-approved film stages with draft-first safety.
- Setup artifact includes the environment report and eight tiny static template diagnostics. No third-party character/model/audio/font assets.

## Proven toolchain from GitHub runner
| Test | Result |
|---|---|
| Node | 22.14.0 |
| Python | 3.12.7 |
| Playwright | 1.65.1, npm lockfile committed |
| Chromium | Google Chrome for Testing 159.0.8154.6 |
| FFmpeg / ffprobe | 6.1.1-3ubuntu5 |
| Canvas2D/OffscreenCanvas | Available |
| Contract tests + project-code check | Passed |
| Static template smoke (8 templates, 144x256) | Passed |
| GitHub CPU renderer | Installed and launched headless browser |
| Movie rendering + media mux + Kokoro narration | NOT RUN, because user explicitly requested setup only |

## Measured output and costs
- Still smoke outputs: 8 static PNGs. **No frames of the actual horror video.**
- Film shot count in planned project: 7 over 10.0 seconds.
- Project video render time: N/A (not rendered).
- Per-video template reuse percentage, actual CPU billing, model tokens: N/A until first complete video. COST.md correctly has no fabricated film row.
- Setup failure encountered: npm Playwright 1.65.2 ETARGET. Changed to published 1.65.1, logged in LESSONS, CI rerun passed.

## Known limits
1. End-to-end voice, alignment, frame cache, FFmpeg mux, media verification and cost-promotion have NOT been exercised with a complete video; do not claim a finished film.
2. A future user-approved contact sheet is mandatory before movie rendering. The default workflow does not synthesize voice/video.
3. The 3D-orbit template uses original 2.5D perspective drawing, not full physically based 3D.
4. Kokoro ONNX and its Apache-licensed model files are OPTIONAL and downloaded only for an authorized video; no voice performance metric exists yet.
5. The template smoke designs are modular functional bases, not finalized bespoke cinema artwork. Visual polish must be approved after storyboard review.
6. Existing storm-vs-ash legacy projects remain excluded from this new studio's data-only project-code rule, avoiding destructive migration.

## Next authorized video should need
- Only script.txt, manifest.json and config.json with template references; assets/ only when truly new original data is necessary.
- No new engine code for existing eight templates. New reusable templates belong in studio/lib, are indexed, and receive static smoke coverage.
- Future workflow: approve voice/phrase timings, inspect one still per shot, supply matching SHA, render draft MP4 first, then final MP4, verify, commit promoted assets and COST/LESSONS/STATUS updates.

## Third-party input
GrowKaz_Stickman.plugin was inspected as a ZIP of source/skills. No reuse license was found inside; the studio includes none of its code, fonts, audio or bundled examples. The implementation was independently authored.
