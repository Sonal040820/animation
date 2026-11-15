# AI Animation Studio

A GitHub-hosted, HyperFrames-based production workspace for **editable animation with dialogue, music, sound effects and MP4 delivery**. Creative scene production has not started.

## Status

- ✅ Repository configured with a pinned HyperFrames CLI (`0.9.52`), GitHub Actions environment probe, and manual MP4 rendering workflow.
- ✅ Instructions for AI agents and an audio production strategy are included.
- ✅ GitHub-hosted environment validation succeeded, including installed HyperFrames skills, headless Chrome, Node 22 and FFmpeg.
- ✅ First end-to-end 12-second video successfully rendered with H.264 video and AAC audio: [STORM × ASH — successful Actions run](https://github.com/Sonal040820/animation/actions/runs/43734320264).
- ✅ Original instrumental score, dashes, impacts, charge and finisher sound effects are generated without a hosted media API.
- ⏳ Hosted premium voices, an AI music provider, a commercial sound library, and full hand-drawn-style anime character animation are not configured.

## Run remotely (no local installation)

1. The environment setup has already been verified; rerun **Actions → Environment setup** only when dependencies change.
2. Push changes to `projects/storm-vs-ash/`, its soundtrack generator, or the render workflow to automatically run the **Render video** workflow. For another committed project, manually dispatch **Render video** with that project's path.
3. From a successful run, download the artifact named **hyperframes-final-video**. Each job creates a new temporary runner and installs needed dependencies.

## How animations are authored

An AI coding agent reads [AGENTS.md](AGENTS.md) and the [official HyperFrames skills](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/skills.mdx) to author seekable HTML, GSAP/Three.js animation, compositions, sound timing and media assets. GitHub Actions **renders** committed projects but does not autonomously write new scenes from prompts.

Soundtrack: voice by Kokoro or an approved hosted voice API, licensed music or an authorized HeyGen catalog track, bundled/appropriately licensed sound effects, and HyperFrames audio mixing. See [audio details](docs/AUDIO.md) and [operating guide](docs/WORKFLOW.md).

## Dependencies and limits

- Node.js 22 or later, FFmpeg, headless Chromium (installed on runner)
- HyperFrames CLI version **0.9.52** in `package.json`
- The upstream core skill installer: `npx hyperframes skills update`
- Standard GitHub-hosted runners do not provide an assumed GPU. CPU-based video rendering is the baseline; large local audio/video models are not guaranteed practical.
- This is a **public repository**. Store API credentials in GitHub Actions secrets, never in commits. Avoid committing copyrighted or private media.
- We intentionally use `npm install --no-package-lock` until a lockfile can be generated in a network-connected environment. Transitive packages are therefore not fully pinned yet.

**No personal-computer software installation is required** for the hosted render workflow. Optional manual editing via the HyperFrames desktop app is separate.

Sources: [HyperFrames README](https://github.com/heygen-com/hyperframes), [skills guide](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/skills.mdx), [voice/music/sound](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/voice-and-audio.mdx).


## First film: STORM × ASH

The pilot film is in [projects/storm-vs-ash](projects/storm-vs-ash). It is a 12-second, 1080×1920, 30 fps neon cel-shaded anime-inspired rooftop duel between two original vector fighters. Action and camera animation are driven by a seekable GSAP timeline in the HyperFrames composition; the score and effects are synthesized deterministically by [scripts/generate-duel-audio.mjs](scripts/generate-duel-audio.mjs). No third-party audio files or commercial service credentials are required.

A full-resolution MP4 with H.264/AAC streams was generated, decoded, and validated in [successful render 43734320264](https://github.com/Sonal040820/animation/actions/runs/43734320264). Download **hyperframes-final-video** from the run's Artifacts section. This is a 2D-vector anime-inspired proof of concept, **not** full character-by-character traditional anime animation. The CI test verifies technical delivery; artistic review is a separate step.
