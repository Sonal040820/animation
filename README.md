# AI Animation Studio

A GitHub-hosted, HyperFrames-based production workspace for **editable animation with dialogue, music, sound effects and MP4 delivery**. Creative scene production has not started.

## Status

- ✅ Repository configured with a pinned HyperFrames CLI (`0.9.52`), GitHub Actions environment probe, and manual MP4 rendering workflow.
- ✅ Instructions for AI agents and an audio production strategy are included.
- ⏳ Live GitHub Actions installation/render validation has not been confirmed. No test video has been rendered.
- ⏳ No paid media accounts, licensed music tracks, or voices have been configured.

## Run remotely (no local installation)

1. In **Actions → Environment setup → Run workflow**, run the environment probe. This installs Node 22, FFmpeg, browser, HyperFrames and the official agent skill pack on a temporary GitHub Actions runner and reports results.
2. When an approved animation project is committed under `projects/<slug>/`, run **Actions → Render video → Run workflow**, entering `projects/<slug>`.
3. Download the artifact named **hyperframes-final-video** from the completed run.

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
