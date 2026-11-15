# Operation

1. An AI agent reads `AGENTS.md` and the official HyperFrames skills. The user approves the scene and sound requirements before production.
2. Create `projects/<slug>/index.html`, scene sub-compositions and local media assets. Use the upstream HyperFrames project contract; keep assets rights documented.
3. Validate locally in the agent's execution environment or dispatch the GitHub `Render video` workflow with the project directory. The GitHub CI check runs before final rendering.
4. Visit GitHub → Actions → Render video → Run workflow, enter `projects/<slug>`, and download the `hyperframes-final-video` artifact once successful.
5. Inspect frames and audio; revise and rerun as necessary.

## Cloud-hosted limitations

- A repository contains **source**, not a persistent computer. GitHub Actions machines are temporary. npm and Chrome are installed at job start.
- GitHub Actions cannot automatically interpret arbitrary creative prompts or generate all media by itself. An AI authoring agent is required to produce the editable scene files.
- Without a HeyGen session or approved credentials there is no automatic hosted TTS/music generation. Free narration using Kokoro is available as an optional on-run step, but it has not been tested here.
- Workflow dispatch from this ChatGPT/GitHub integration is not exposed as a general operation, so manual trigger may be necessary.
- GitHub Artifacts expire; keep your final videos elsewhere for archival.
