# Agent contract for this repository

This project uses HyperFrames 0.9.52 and the official upstream skill contract. Read these FIRST for every new film:
- https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes/SKILL.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-cli/SKILL.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-registry/SKILL.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/media-use/SKILL.md

Do not treat references as executable libraries. Prefer installing official skills using `npx hyperframes skills update` in an agent environment. The GitHub runners are ephemeral and cannot retain global skills between jobs. Do not claim to have a video rendered unless a workflow succeeds and the MP4 artifact is present.

## Video authoring rules

- Default user workflow: discuss story, scenes, format, and audio; only then author scene files in a new `projects/<slug>/` directory. The repository contains original completed films, each kept in its own directory.
- Keep the composition editable: root `index.html`, sub-compositions under `compositions/`, media under `assets/`, an audio metadata/rights ledger, and `SPEC.md`.
- Read upstream format, sound, story, motion and vertical/3D references as needed. Timed elements use `class=clip`, `data-start` and `data-duration`; timelines must be paused/seekable and registered under `window.__timelines`.
- Prevent network-dependent visual runtime, non-deterministic animation, unapproved paid calls, and copyrighted unlicensed soundtracks.
- Prefer supplied/licensed audio assets. Voice: locally generated Kokoro is optional; premium media providers require account credentials and user authorization. Music generation via CPU-only GitHub runners is not assumed feasible.
- Check with HyperFrames `lint` and `check --json`, inspect snapshots, and render only after review or explicit request. Listen to finished audio and confirm synchronization and duration.

## CI contract

- `Environment setup` provisions FFmpeg, Node 22, HyperFrames CLI, browser, skills, and probes runtime dependencies.
- `Render video` can be dispatched with a project path or is automatically run for commits affecting existing film projects. It checks and snapshots, builds voice/music/SFX assets, renders and masters audio, verifies the MP4 via ffprobe/FFmpeg, and uploads a downloadable GitHub Actions artifact.
- GitHub connection presently does not provide a direct generic workflow-dispatch action. Trigger from GitHub Actions UI unless an authorized compatible mechanism becomes available.

## Elite Cut rules

- Film script and spoken lines are in `projects/storm-vs-ash-elite/SCREENPLAY.md`. Exact audio times and slots are `AUDIO_CUES.json`. Keep them synchronized with `index.html` when making edits.
- The cinematic score and Foley are reproducible originals from `scripts/generate-elite-audio.mjs`.
- The Kokoro ONNX Python helper generates voices without credentials; the Node postprocessor aligns/normalizes their reserved slots and records provenance. The GitHub runner downloads/cache model weights; no install on the user's workstation.
- The procedural character rig uses two-bone IK plus authored poses and parametric ballistic fragments. Avoid claims of simulated physical dynamics, cinematic photorealism or production-studio hand-drawn anime quality that the rendered frames do not demonstrate.
- Prefer running actual frame/audio inspection on the completed workflow artifacts, not judging from source code.
