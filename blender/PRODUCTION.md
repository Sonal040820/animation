# Blender studio — production contract

The cloud setup now includes technical 3D test renders, a licensed rigged mannequin, two verified CC0 anime avatar foundations, and a saved editable Blender library. No original Kai/Ren character customization or fight choreography has been produced in Blender. Existing HyperFrames films are preserved.

## Architecture
- **Blender:** reuseable rigs, existing model imports, keyframed animation, IK, camera, material shading, simulation and still-frame rendering.
- **HyperFrames:** optional motion graphics, title/caption finishing and existing audio work.
- **Kokoro/FFmpeg:** dialogue, sound, music, mixing and output mastering when film production is authorized.
- **GitHub:** source code, versioned schemas, metadata, CI and workflow dispatch — not a persistent GPU workstation.
- **Private store:** third-party models without redistribution rights, large blend files and rendered frame assets. Not connected by this setup; account authorization required.

## Shot format and physics
- World units: meters, Blender Z-up, right-handed.
- Default 24 FPS; frames are 1-indexed and inclusive; audio timestamp is (frame minus 1) divided by FPS.
- Each shot has scene asset ID, camera name/lens, frame range, action identifiers and sound cue IDs.
- Character skeleton bone mapping covers hips, torso, head, arms and legs, and is inspected before retargeting.
- Physically motivated staging requires planted feet, anticipation, force transfer, impact pose, reaction and recovery; rigid-body physics does not automatically choreograph martial arts.

## Asset and rigging policy
Consult the source catalog and asset registry. The import helper loads only rights-approved, integrity-checked local assets. Model raw redistribution and use in publicly shown video are different licenses. VRoid may restrict violence and commercial use. Technical assets are provisioned from pinned approved source revisions into gitignored runner folders. Models are not committed as raw third-party files; downloadable .blend and preview artifacts expire and can be regenerated.

## Automation
1. Blender environment workflow installs exact 4.5.16 LTS, checks SHA-256, Blender Python, native importers and contract tests, emitting diagnostic JSON. This workflow renders ZERO frames.
2. Blender render workflow is manual-only and has no push event; requires an existing approved, hash-checked .blend file already present in a trusted workspace. Absent approved assets it must refuse to render.
3. Future scenes may be rendered in CPU preview or final mode, with 240 frames maximum per manual job; assemble picture/audio after creative approval.
4. VRM/MToon extension 4.10.5 is **installed and verified**. Rigify and external GPUs remain optional and unconfigured.
5. A private object store/provider is intentionally not connected until the user selects one.

## Completion criteria for environment setup
Green GitHub CI now includes two real character-import pipelines, rendered previews, actual VRM humanoid bone mapping, and saved asset project artifacts. The remaining gates are original character art, authored combat animation, shot/audio integration, a persistent private asset store if needed, and optional GPU resources.

Sources: https://www.blender.org/download/LTS/ ; https://docs.blender.org/manual/en/4.5/advanced/command_line/arguments.html .
