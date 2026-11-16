# Original short-video studio (setup-only)

A code-authored 9:16 short-video pipeline with reproducible Chromium/Canvas2D rendering and FFmpeg, original pixel lettering, original stick/block figures, procedural sets and SFX. The previous Blender Kai/Ren system remains separate.

**No new animation has been generated.** This task only sets up the reusable system and a planned seven-shot horror example. The GrowKaz plugin was inspected but its third-party engine was NOT copied because no reuse license was established.

## Structure
- studio/lib/: pure geometry, original characters, reusable templates, time-aligned captions, rendering, original audio, media QA.
- studio/cli/: permanent stage commands; no per-project scripts.
- projects/<slug>/: data only (script.txt, config.json, manifest.json, timeline JSON/WAV and original assets).
- studio/INDEX.md, LESSONS.md, COST.md, STATUS.md: durable memory required at start and end of every future run.
- studio/out/: final and draft films/contact sheets; studio/.cache/: hashed shot-frame reuse.

## Pinned platform
- GitHub Actions ubuntu-24.04, Node 22.14.0, Playwright 1.65.1, Python 3.12.7.
- FFmpeg/Chromium actual runtime versions must be measured by doctor and written to studio/environment.json; no assumptions.
- Optional voice: kokoro-onnx 0.6.1, numpy 2.2.6 and soundfile 0.13.1. Kokoro model and voice files are fetched only when make-voice is invoked and SHA256 validated against official release.

## CLI (from repo root)
Node dependencies are installed inside studio using npm ci when package-lock exists. Download the matching Playwright Chromium once or set CHROMIUM_PATH to a verified installed browser.
- node studio/cli/studio.mjs doctor
- node studio/cli/studio.mjs smoke     (only eight static frames)
- node studio/cli/studio.mjs check     (fails for project-owned engine code)
- node studio/cli/studio.mjs new-project --project projects/demo --script 'Hello.' --seconds 6
- node studio/cli/studio.mjs make-voice --project projects/demo
- node studio/cli/studio.mjs align --project projects/demo
- node studio/cli/studio.mjs sheet --project projects/demo --quality draft
- node studio/cli/studio.mjs render --project projects/demo --quality standard
- node studio/cli/studio.mjs mix --project projects/demo
- node studio/cli/studio.mjs verify --project projects/demo --quality standard
- node studio/cli/studio.mjs promote --project projects/demo

The GitHub workflow is setup-only by default, with explicit manual inputs project_path and quality. A full movie must not start until a human has inspected the contact sheet and provided the matching hash.

## Current boundaries
A smoke test is a SINGLE still per template, not an animation. Code-drawn 2.5D orbit is not GPU 3D and does not claim physically accurate 3D lighting. Caption alignment by phrase duration is an approximation. Timing/performance are not claimed until measured on the actual GitHub runner.

## 60-second production extension
The studio now supports up to 90-second manifests and reusable timed multi-speaker dialogue. The original setup-only restriction applied to the original setup request, not to a subsequent explicit production authorization. Full film generation is separately gated by an inspected contact sheet.
