"""Check VRM extension is importable and its operator exists (never import media)."""
import bpy
import json
import sys
from pathlib import Path
from importlib import util

ADDON = "bl_ext.user_default.vrm"
bpy.ops.preferences.addon_enable(module=ADDON)
is_present = util.find_spec(ADDON) is not None
if not is_present:
    raise RuntimeError("Pinned VRM extension module unavailable: " + ADDON)
try:
    bpy.ops.import_scene.vrm.get_rna_type()
except Exception as exc:
    raise RuntimeError("VRM importer not registered") from exc
status = {"status": "pass", "addon": ADDON, "importer": "vrm", "rendered_frames": 0, "imported_models": 0}
print("BLENDER_VRM_DIAGNOSTICS=" + json.dumps(status, sort_keys=True))
