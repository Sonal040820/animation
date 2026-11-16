# Short-video studio status

Updated: 2026-11-16
State: SETUP ONLY, no new animation, test MP4, narration or creative contact sheet authorized.

## Created
- Original Canvas2D studio, styles, pixel font, stick/block avatars, eight templates and software 3D helper.
- Deterministic CLI, word alignment, original oscillator audio, quality checks and shot-hash frame cache.
- Pinned Playwright and optional Kokoro dependencies with official release checksum policy.
- Seven data-only shots for the supplied 10-second midnight-window story.
- Durable INDEX, LESSONS, COST, STATUS and automated contract tests.
- Separated from the existing Kai/Ren Blender pipeline; no reliance on Camber or on the unlicensed GrowKaz implementation.

## Actual setup acceptance
- Green runner setup: https://github.com/Sonal040820/animation/actions/runs/43867609302
- Verified Node 22.14.0, Python 3.12.7, Playwright 1.65.1, Chromium 159, FFmpeg/ffprobe 6.1.1; studio/environment.json and studio/package-lock.json committed by CI.
- Eight low-resolution static template images passed. Scared-brow expression corrected after visual review; final static smoke regression PASSED in run 43868905339.
- No creative project frames, test video or narration have been generated.

## Final setup acceptance
- GitHub Actions run: https://github.com/Sonal040820/animation/actions/runs/43868905339 (SUCCESS).
- Eight static 144x256 diagnostic PNGs rendered and visually inspected; no creative animation generated.
- Lockfile and environment fingerprint stored in GitHub main; future same-version doctor runs reuse the verified fingerprint.
- Per-video render time, narration performance and production MP4 are intentionally unmeasured and untested until first authorized video.

## Later (ONLY after authorization)
- Run local Kokoro voice / align, generate and visually inspect an actual contact sheet.
- Require approved contact-sheet hash before full render; render a playable draft first.
- Mix and verify final MP4; promote reusable assets/functions and update this ledger.
- Stop after 3 unsuccessful retries on any one issue; log decision in LESSONS.

## Resume order
Read STATUS, INDEX, LESSONS, COST. Check latest workflow logs before changing code. Preserve working renderer components; avoid unnecessary rewrites.

- 2026-11-16T13:20:10.562Z: the-wrong-side promoted with 100% template reuse, 398.1 seconds; First measured production run.
