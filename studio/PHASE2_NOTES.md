# Phase 2 Notes — Concrete Quality-Limiting Observations

Measured baseline at end of Phase 1 (`projects/golden-1159`, `720x1280` @ 24fps, `10.573s`): `10/10` acceptance checks pass, clip mean motion `2.9205`, render time `460.9s`. Below are 5 concrete observations about what still limits visual and audio quality, deferred to Phase 2:

1. **Blurred-backdrop recomputation and static foreground lighting on `s02`/`s04`/`s05`/`s07`:**
   `drawBlurred()` currently re-renders and Gaussian-blurs the entire `720x1280` room interior on every single frame (costing ~2s/frame on CPU for `window-view`, `insert-macro-clock`, and `giant-face`). Furthermore, because the room interior behind `giant-face` and `insert-macro-clock` is mostly uniform dark wall (`#050b13`), dark shots (`s07` = `0.8024` MAD, `s02` = `0.9219` MAD) sit right near the `0.8` motion floor while `s05` (`9.68`) and `s06` (`10.13`) dominate the clip mean. Caching static blurred backdrop layers per `(seed, w, h)` and adding subtle parallax/light-shaft motion would simultaneously speed up rendering and give dark interior shots richer visual life.

2. **Caption timing uses character-weight estimation inside multi-word lines rather than true forced alignment:**
   While `lines.json` measures exact per-sentence WAV durations, word boundaries inside a multi-word line (e.g. `"I saw a little girl outside my window."` or `"I blinked."`) are still spread by alphanumeric character count (`alignMeasured`). Long silent vowels, dramatic pauses mid-sentence, or fast function words can drift `0.15–0.35s` from the spoken syllable onset. Lightweight energy/onset detection on each `line_NN.wav` (without downloading Whisper/Hugging Face models) would tighten word-cue (`at_word`) and caption sync.

3. **Two-frame/single-pass transitions lack true cross-dissolves and layered scene composition:**
   Current shots render independently in `drawStudioFrame` and only support `cut`, `dip`, `flash`, and `blink` overlays. Comparing `golden-1159` against `11_59.mp4`, smooth rack-focus pulls (`s02` window -> `s04` macro clock) and cross-fades between camera setups are missing because the compositor cannot blend frame `N` of shot `A` with shot `B`, nor share a persistent multi-layer world recipe across adjacent shots.

4. **Character articulation and secondary silhouette motion are still minimal:**
   In `s03` (`figure-exterior`), the girl stands near-static except for breathing and subtle hem sway; in `s02`, the blurred narrator in the foreground does not react (flinch/turn head) when the girl appears or vanishes; and in `s05` (`giant-face`), the head lacks subtle recoil, pupil dilation, or brow-raise easing synced to the blink recovery. Adding layered keyframeable rig channels (`headTilt`, `pupilScale`, `shoulderShift`) would make reactions feel directed rather than procedural idle loops.

5. **Procedural score and SFX lack dynamic per-shot ducking/riser tails across shot boundaries:**
   `synthOriginalAudio()` synthesizes SFX only within `[0, 1.3s]` after `cue.time` and applies a flat `sidechaincompress` across the entire music bed. A riser building from `s04` (`11:59`) into the `s06` (`12:01`) stinger, or cutting the music bed abruptly on `"I blinked."` / `"She was gone."`, currently requires hard-coded cue offsets rather than shot-boundary envelope recipes.
