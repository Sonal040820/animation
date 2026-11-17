# OVERCLOCKED

Visual revision: illustrated angular Julian close-ups with hair, facial planes, tired eyes, shirt collar and monitor highlights. Added visible server-rack lights, a shaped hand for Enter, layered skyline silhouettes, a spherical climate display, iris fibers and cleaner title lettering. The 50-second timing and original mixed soundtrack are retained. The prior cut is saved as studio/out/overclocked/previous-cut.mp4.

50-second vertical teaser, 720x1280 at 24fps. Final title is PROMETHEUS, as supplied. Minimal procedural illustration with a Three.js server corridor and folding molecule, Canvas human expressions, network transfer, city blackout, climate display, geometric AI eye and corneal code reflection.

Thirteen shots follow the supplied 0–8 / 8–22 / 22–38 / 38–50 structure. At 38 seconds the intentional black cut begins the heartbeat ending. The suburban tableau is intentionally still. A heartbeat sequence slows before regular mechanical ticks and the title impact. Final card fades to black.

Speech uses downloaded ElevenLabs takes for l1/l4/l5 and Kokoro fallback for l2/l3. The AI receives short delayed layers locally. Music uses the existing original tension synthesizer because the ElevenLabs music request was rejected by the shared free queue. Server ambience uses a downloaded ElevenLabs sample. Source IDs and generation failures are in PRODUCTION.json. Provider billing totals have not been independently reconciled.

Rebuild locally after source audio is present:

1. Run make-voice for fallback line WAVs if absent.
2. Run python studio/cli/import_voice.py projects/overclocked.
3. Run align, render --quality standard, mix, verify --quality standard through studio/cli/studio.mjs.

Imported audio paths are relative to the project. Keep original takes available for future renders. Captions use measured line boundaries with character-weighted word placement, so individual word timing is approximate.
