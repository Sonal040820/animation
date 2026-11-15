# Agent contract for this repository

This project uses HyperFrames 0.9.52 and the official upstream skill contract. Read these FIRST for every new film:
- https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes/SKILL.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-cli/SKILL.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-registry/SKILL.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/media-use/SKILL.md

Do not treat references as executable libraries. Prefer installing official skills using `npx hyperframes skills update` in an agent environment. The GitHub runners are ephemeral and cannot retain global skills between jobs. Do not claim to have a video rendered unless a workflow succeeds and the MP4 artifact is present.

## Video authoring rules

- Default user workflow: discuss story, scenes, format, and audio; only then author scene files in a new `projects/<slug>/` directory. No production content yet.
- Keep the composition editable: root `index.html`, sub-compositions under `compositions/`, media under `assets/`, an audio metadata/rights ledger, and `SPEC.md`.
- Read upstream format, sound, story, motion and vertical/3D references as needed. Timed elements use `class=clip`, `data-start` and `data-duration`; timelines must be paused/seekable and registered under `window.__timelines`.
- Prevent network-dependent visual runtime, non-deterministic animation, unapproved paid calls, and copyrighted unlicensed soundtracks.
- Prefer supplied/licensed audio assets. Voice: locally generated Kokoro is optional; premium media providers require account credentials and user authorization. Music generation via CPU-only GitHub runners is not assumed feasible.
- Check with HyperFrames `lint` and `check --json`, inspect snapshots, and render only after review or explicit request. Listen to finished audio and confirm synchronization and duration.

## CI contract

- `Environment setup` provisions FFmpeg, Node 22, HyperFrames CLI, browser, skills, and probes runtime dependencies.
- `Render video` is manually dispatched with the path to an existing project folder; it checks, renders to `renders/final.mp4`, verifies via ffprobe, and uploads an artifact.
- GitHub connection presently does not provide a direct generic workflow-dispatch action. Trigger from GitHub Actions UI unless an authorized compatible mechanism becomes available.
