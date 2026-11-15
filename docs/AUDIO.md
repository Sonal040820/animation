# Sound pipeline

HyperFrames supports music, voice, SFX, captions, volume automation, fades, groups, and audio effects. Relevant upstream references:
- https://github.com/heygen-com/hyperframes/blob/main/docs/guides/voice-and-audio.mdx
- https://github.com/heygen-com/hyperframes/blob/main/skills/media-use/references/audio.md
- https://github.com/heygen-com/hyperframes/blob/main/skills/media-use/references/mixing.md

## Providers

1. **Narration**: default recommendation: Kokoro local via `npx hyperframes tts 'Text' -o assets/voice.wav` in a project context. CPU runtime/model downloads must be tested. Better voices may use HeyGen, Gemini, or ElevenLabs only when configured and approved.
2. **Music**: prefer licensed source files in `assets/`; use a hosted HeyGen catalog or music generation only with credentials and permission. MusicGen on the standard GitHub CPU runner is not guaranteed to complete efficiently.
3. **Effects**: use correctly licensed files (bundled/Openverse with attribution as required), timed to each visible action.
4. **Mix**: place ID-bearing `<audio>` elements on the timeline with `data-start`, `data-duration`, `data-volume` and fades. Duck music during speech using a volume automation lane, and apply a limiter for clipping protection.
5. **Delivery checks**: inspect rendered MP4 with ffprobe; listen for clipped dialogue, silent gaps, missing audio, abrupt cutoffs, and mistimed effects. Keep separate music/voice/effects exports where licenses permit.

**Important:** The repository is public. Never commit premium API keys, private voices, unlicensed audio, or credentials. GitHub Actions secrets are required for optional paid API access. Mere reference to a track in a prompt does not create the track.

No accounts, paid providers, speech models, or music models are currently configured or verified; the setup workflow checks the core environment only.
