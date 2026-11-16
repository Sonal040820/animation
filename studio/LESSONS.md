# Durable lessons (newest first)

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
