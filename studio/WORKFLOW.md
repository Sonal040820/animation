# Original Short-Video Studio — Canonical Production Workflow

Every new film is **data-only** under `projects/<slug>/` (`script.txt`, `config.json`, `dialogue.json`, `manifest.json`, `timeline/*`). All reusable rendering, motion, character, scenery, audio, and alignment code lives in `studio/lib/` and `studio/cli/`.

---

## Exact Command Sequence for a New Video

Run all commands from the repository root (`C:\Users\hp\.gemini\antigravity\scratch\animation`). On Windows PowerShell, chain commands with `;` (not `&&`), and Python resolves via `process.env.PYTHON || (win32 ? 'python' : 'python3')`.

### 1. `doctor` — Verify Capabilities & Record Environment
```powershell
node studio/cli/studio.mjs doctor
```
Verifies Node, Python, FFmpeg, ffprobe, pinned Playwright Chromium, Canvas2D, and OffscreenCanvas; writes `studio/environment.json`.

### 2. `smoke` — Static Regression Check Across All Templates
```powershell
node studio/cli/studio.mjs smoke
```
Renders one low-resolution (`144x256`) frame per template into `studio/.cache/template-smoke/` using the parallel browser pool.

### 3. `plan` — Auto-Plan Dialogue v2 & Line-Bound Manifest from `script.txt`
```powershell
node studio/cli/studio.mjs plan --project projects/<slug>
```
Reads `projects/<slug>/script.txt` and generates:
- `projects/<slug>/dialogue.json` (schema v2: one line per sentence, emotion guessed by keyword rules in `studio/lib/planner-rules.json`).
- `projects/<slug>/manifest.json` (line-bound shots `line` / `lines` mapped via `studio/lib/planner-rules.json`).
- `projects/<slug>/timeline/plan-report.json` (records initial planned shots and any `needs_new_code` sentences that matched no rule).
- Never overwrites existing `dialogue.json` or `manifest.json` unless `--force` is passed.

### 4. Edit Data — Hand-Tune Story Beats in `dialogue.json` & `manifest.json`
Refine emotion presets, emphasis words, multi-line shot bindings (`"lines": ["l6", "l7"]`), camera moves (`CAMERA_MOVES`), template parameters (`TEMPLATE_META`), and SFX/ambience cues (`SFX_TYPES` / `AMBIENCE_TYPES`) in `projects/<slug>/` without adding any code to the project folder.

### 5. `validate` — Strict Schema, Parameter, Timing & Caption Validation
```powershell
node studio/cli/studio.mjs validate --project projects/<slug>
```
Checks templates (with `did-you-mean`), parameters against `TEMPLATE_META`, camera moves against `CAMERA_MOVES`, SFX/ambience against `SFX_TYPES`/`AMBIENCE_TYPES`, emotions against `voice-presets.json`, shot overlaps/gaps, shot duration warnings (`<0.5s` or `>4.0s`), and caption word counts (`<=2`). Exits non-zero on any error. Also runs automatically inside `sheet` and `render`.

### 6. `make-voice` — Synthesize Expressive Speech & Measured Line Spans
```powershell
node studio/cli/studio.mjs make-voice --project projects/<slug>
```
Synthesizes natural per-line speech using Kokoro ONNX (with line-level SHA caching in `studio/.cache/voice-lines/` and emotion DSP presets from `studio/lib/voice-presets.json`), laying lines sequentially and writing:
- `projects/<slug>/timeline/voice.wav`
- `projects/<slug>/timeline/lines.json` (strictly measured `start`, `end`, `spoken_seconds`, `voice_present`, `provider`)
- `projects/<slug>/timeline/voice-report.json`

### 7. `align` — Align 1–2 Word Captions Inside Measured Voice Spans
```powershell
node studio/cli/studio.mjs align --project projects/<slug>
```
When `timeline/lines.json` exists, runs `alignMeasured` (`method: "measured-line/character-weight"`) so 1–2 word sentence-bound caption groups lie strictly inside measured voice line spans in `projects/<slug>/timeline/words.json`.

### 8. `sheet` — Render Labelled Contact Sheet
```powershell
node studio/cli/studio.mjs sheet --project projects/<slug> --quality draft
```
Validates the project and renders one still per shot in parallel, assembling `studio/out/<slug>/contact-sheet.png` in Chromium Canvas2D with each tile labelled by `shot.id`, `shot.template`, and timestamp using `bitmapText`.

### 9. **LOOK** — Visual Inspection Before Movie Rendering
Inspect `studio/out/<slug>/contact-sheet.png` (and template smoke frames):
- Confirm scared expressions have raised **inner** brows (never angry-looking low inner brows).
- Confirm outlined vector captions are legible at 79% height within safe margins.
- Confirm character silhouettes, props (digital clock `11:59` / `12:01`), and backgrounds match the story beats.

### 10. `render` (draft) — Fast Playable Safety-Ladder Draft
```powershell
node studio/cli/studio.mjs render --project projects/<slug> --quality draft
```
Renders `270x480 @ 12fps` frames in parallel (`min(4, os.cpus)` pages) with engine-hash caching (`sha` of all `studio/lib/*.mjs` + `*.json`) and logs each shot to `studio/out/<slug>/render-log.jsonl`.

### 11. `render` (standard) — Full Production Frame Capture
```powershell
node studio/cli/studio.mjs render --project projects/<slug> --quality standard
```
Renders `720x1280 @ 24fps` frames into `studio/out/<slug>/video_silent.mp4` and writes `studio/out/<slug>/render-stats.json`.

### 12. `mix` — Synthesize Score, Ambience, SFX & Normalize Loudness
```powershell
node studio/cli/studio.mjs mix --project projects/<slug>
```
Synthesizes original score, per-shot ambience, and timed SFX cues, ducks score under `timeline/voice.wav`, normalizes to `-14 LUFS`, writes `studio/out/<slug>/final.mp4`, and records measured loudness in `studio/out/<slug>/audio-report.json`.

### 13. `verify` — Programmatic QA & Measured `facts.json`
```powershell
node studio/cli/studio.mjs verify --project projects/<slug> --quality standard
```
Probes `final.mp4` with `ffprobe` and `ffmpeg` (`blackdetect`, `freezedetect`):
- **Fails** if dialogue exists and `timeline/voice.wav` is missing or `voice_present` is false (unless `--allow-silent` is passed).
- **Fails** if any caption has `>2` words or lies outside its measured voice line span in `timeline/lines.json`.
- Writes strictly measured `studio/out/<slug>/facts.json` and `studio/out/<slug>/verification.json`.

### 14. `promote` — Durable Learning, Usage Tracking & Index Sync
```powershell
node studio/cli/studio.mjs promote --project projects/<slug>
```
Increments template counts in `studio/lib/usage.json`, appends newly learned `(line regex -> template)` rules into `studio/lib/planner-rules.json` (deduped), regenerates the `<!-- AUTO:BEGIN --> ... <!-- AUTO:END -->` reference in `studio/INDEX.md`, and appends measured metrics to `studio/COST.md`, `studio/LESSONS.md`, and `studio/STATUS.md`.

---

## Hard Rules Distilled from `studio/LESSONS.md`

1. **Data-Only Projects**: `projects/<slug>/` must never contain `.mjs`, `.js`, `.py`, `.html`, or `.css` files (`node studio/cli/studio.mjs check`).
2. **Engine-Hash Cache Invalidation**: Frame cache keys must include `engineHash()` over all `studio/lib/*.mjs` and `studio/lib/*.json` files so engine edits never reuse stale frames.
3. **Never Claim Unmeasured Facts**: Every number in `facts.json`, `verification.json`, `audio-report.json`, `lines.json`, and `COST.md` must come from actual `ffprobe`/`ffmpeg`/WAV measurements.
4. **Voice Presence Enforcement**: Never pass `verify` on a voiced/dialogue project when `timeline/voice.wav` is missing.
5. **Continuous Micro-Motion**: Every template must include continuous deterministic motion (clouds, dust, breathing, subtle camera drift) so `freezedetect` does not trigger on sustained holds.
6. **Helper Return Contracts**: Helpers in `studio/lib/` must return named objects (e.g. `{x, y, zoom, rotation, blur}`), never bare `[x, y]` arrays.
7. **Browser ESM Compatibility**: `studio/lib/*.mjs` is served directly to headless Chromium and imported by Node—use relative `./x.mjs` imports only (no bare npm specifiers) and never access `document`/`window` at module top-level.
8. **Three-Attempt Ceiling**: Never retry a failing approach more than 3 times; switch to a simpler deterministic fallback and log the symptom, cause, and fix in `studio/LESSONS.md`.
