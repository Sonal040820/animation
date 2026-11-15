---
name: blender-production-studio
description: Safely develop reusable, cinematic Blender animation workflows with cloud headless rendering and rights-checked assets.
---

# Blender production studio skill

Read the repository's blender/README.md and blender/PRODUCTION.md before any modifications.

## Installation contract
- Blender 4.5.16 LTS only, from official Blender distribution; sha256 checked by scripts/install_blender.sh.
- Supported baseline: Blender background Python, Cycles CPU, official glTF/OBJ/FBX/USD/Alembic operators.
- Verified optional anime avatar support: VRM extension 4.10.5 with MToon import/operator via install_vrm_extension.sh. The VRM extension comes from the official maintainer GitHub release and has a pinned SHA-256.
- Rigify is not assumed: the official extension listing has availability warnings. Use existing VRM humanoid rigs and studio.rig / Blender IK before attempting other rig downloads.

## Asset integrity
1. The source page and license of every imported model, animation and texture must be reviewed.
2. Never download assets implicitly from prompts or circumvent provider access restrictions.
3. Record original source, creator, license evidence, SHA-256, approved rights, commercial permissions, violent-use permissions, and source redistribution separately.
4. Do not commit third-party raw models to public GitHub without redistribution rights.
5. Use studio.contracts.approved_asset and studio.assets.import_registered_asset for assets already provisioned locally. No unverified HTTP imports.

## Film design, only AFTER user asks to create a film
- Work from approved SCREENPLAY and AUDIO_CUES manifest, then write shot manifests with frame IDs, 3D actors, approved asset IDs and lenses.
- Model/mesh data, armature rigs, reusable animation actions, environments and VFX must remain separate and shareable.
- For combat: establish axis, plant feet, enforce reachable IK targets, anticipate, transfer force, show clear contact, react and recover. Do not fake contact physics solely with flashing lights.
- Use realistic focal lengths, motivated lighting, protected silhouettes, controlled color contrast, timing held drawings vs fast action, scene continuity, and spatially explicit camera paths.
- Record source-model and retargeting limitations. IK is not full dynamics; stock mocap is not automatically matched two-person choreography.
- For camera: see studio.camera. For rigs: see studio.rig. For render profiles: see studio.render.
- Keep dialogue in the existing Kokoro/FFmpeg pipeline unless user explicitly approves a paid provider.

## Quality and delivery gates
- Begin with pure metadata tests and Blender doctor. This does not render content.
- Once a film is requested and assets exist, inspect actual frames, not just source code.
- Use manually dispatched Blender render, with authorized .blend asset ID; every asset file's SHA-256 must match.
- Timecode math: frame index starts at 1; time in seconds = (frame - 1)/fps; annotate all fight contacts.
- Only claim a film generated after GitHub workflow succeeds, frame outputs exist, and audio/video decode correctly.
- Do not start GPU resources, upload assets to external providers or make purchases without user authorization.

## Curated upstream references
- Blender CLI: https://docs.blender.org/manual/en/4.5/advanced/command_line/arguments.html
- Blender Python: https://docs.blender.org/api/4.5/
- Blender Rigify manual: https://docs.blender.org/manual/en/4.5/addons/rigging/rigify/
- VRM plugin automation: https://vrm-addon-for-blender.info/en-us/
- VRM official release: https://github.com/saturday06/VRM-Addon-for-Blender/releases/tag/v4.10.5
- Existing HyperFrames skills: https://github.com/heygen-com/hyperframes/blob/main/docs/guides/skills.mdx
- Source asset catalogs in blender/config/asset-sources.json.
